// File: velocitymind/daemon.c
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <time.h>
#include <pthread.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <sys/fanotify.h>
#include <sqlite3.h>

#define DB_PATH "/var/lib/velocitymind/history.db"
#define SOCKET_PATH "/tmp/velocitymind.sock"

sqlite3 *db;
char prev_app[256] = "";
char current_app[256] = "";
pthread_mutex_t app_mutex = PTHREAD_MUTEX_INITIALIZER;

// Globally cached prepared statements for efficiency
sqlite3_stmt *stmt_insert_v1 = NULL;
sqlite3_stmt *stmt_insert_v2 = NULL;
sqlite3_stmt *stmt_query_v1 = NULL;
sqlite3_stmt *stmt_query_v2 = NULL;
sqlite3_stmt *stmt_count_libs = NULL;
sqlite3_stmt *stmt_insert_lib = NULL;
sqlite3_stmt *stmt_query_libs = NULL;

// Identify the current temporal bin based on system time
int get_current_temporal_bin() {
    time_t raw_time;
    struct tm *time_info;
    time(&raw_time);
    time_info = localtime(&raw_time);
    int hour = time_info->tm_hour;
    if (hour >= 6 && hour < 12) return 0;  // Morning
    if (hour >= 12 && hour < 18) return 1; // Afternoon
    if (hour >= 18 && hour < 24) return 2; // Evening
    return 3;                              // Night
}

// Request the kernel to pre-cache the predicted application binary/libraries
void trigger_cache_prefetch(const char *binary_path) {
    int fd = open(binary_path, O_RDONLY | O_NONBLOCK);
    if (fd < 0) return;

    struct stat file_info;
    if (fstat(fd, &file_info) == 0) {
        // Populate the page cache with the binary contents
        posix_fadvise(fd, 0, file_info.st_size, POSIX_FADV_WILLNEED);
    }
    close(fd);
}

// Initialize the SQLite database schema and pre-compile statements
void initialize_database() {
    // Ensure parent directory exists
    struct stat st = {0};
    if (stat("/var/lib/velocitymind", &st) == -1) {
        mkdir("/var/lib/velocitymind", 0755);
    }

    int rc = sqlite3_open(DB_PATH, &db);
    if (rc != SQLITE_OK) {
        rc = sqlite3_open("history.db", &db);
        if (rc != SQLITE_OK) {
            exit(1);
        }
    }
    const char *sql_create =
        "CREATE TABLE IF NOT EXISTS transitions ("
        "  from_app TEXT,"
        "  to_app TEXT,"
        "  time_bin INTEGER,"
        "  transition_count INTEGER,"
        "  PRIMARY KEY (from_app, to_app, time_bin)"
        ");"
        "CREATE TABLE IF NOT EXISTS transitions_v2 ("
        "  from_app_2 TEXT,"
        "  from_app_1 TEXT,"
        "  to_app TEXT,"
        "  time_bin INTEGER,"
        "  transition_count INTEGER,"
        "  PRIMARY KEY (from_app_2, from_app_1, to_app, time_bin)"
        ");"
        "CREATE TABLE IF NOT EXISTS applications ("
        "  app_name TEXT PRIMARY KEY,"
        "  binary_path TEXT"
        ");"
        "CREATE TABLE IF NOT EXISTS app_libraries ("
        "  app_name TEXT,"
        "  library_path TEXT,"
        "  rank INTEGER,"
        "  PRIMARY KEY (app_name, library_path)"
        ");";
    sqlite3_exec(db, sql_create, NULL, NULL, NULL);

    // Pre-compile SQL statements once for efficiency
    sqlite3_prepare_v2(db, "INSERT INTO transitions (from_app, to_app, time_bin, transition_count) VALUES (?, ?, ?, 1) ON CONFLICT(from_app, to_app, time_bin) DO UPDATE SET transition_count = transition_count + 1;", -1, &stmt_insert_v1, NULL);
    sqlite3_prepare_v2(db, "INSERT INTO transitions_v2 (from_app_2, from_app_1, to_app, time_bin, transition_count) VALUES (?, ?, ?, ?, 1) ON CONFLICT(from_app_2, from_app_1, to_app, time_bin) DO UPDATE SET transition_count = transition_count + 1;", -1, &stmt_insert_v2, NULL);
    sqlite3_prepare_v2(db, "SELECT to_app, binary_path FROM transitions JOIN applications ON transitions.to_app = applications.app_name WHERE from_app = ? AND time_bin = ? ORDER BY transition_count DESC LIMIT 1;", -1, &stmt_query_v1, NULL);
    sqlite3_prepare_v2(db, "SELECT to_app, binary_path FROM transitions_v2 JOIN applications ON transitions_v2.to_app = applications.app_name WHERE from_app_2 = ? AND from_app_1 = ? AND time_bin = ? ORDER BY transition_count DESC LIMIT 1;", -1, &stmt_query_v2, NULL);
    sqlite3_prepare_v2(db, "SELECT COUNT(*) FROM app_libraries WHERE app_name = ?;", -1, &stmt_count_libs, NULL);
    sqlite3_prepare_v2(db, "INSERT OR IGNORE INTO app_libraries (app_name, library_path, rank) VALUES (?, ?, ?);", -1, &stmt_insert_lib, NULL);
    sqlite3_prepare_v2(db, "SELECT library_path FROM app_libraries WHERE app_name = ? ORDER BY rank ASC LIMIT 5;", -1, &stmt_query_libs, NULL);
}

// Clean up prepared statements
void finalize_statements() {
    if (stmt_insert_v1) sqlite3_finalize(stmt_insert_v1);
    if (stmt_insert_v2) sqlite3_finalize(stmt_insert_v2);
    if (stmt_query_v1) sqlite3_finalize(stmt_query_v1);
    if (stmt_query_v2) sqlite3_finalize(stmt_query_v2);
    if (stmt_count_libs) sqlite3_finalize(stmt_count_libs);
    if (stmt_insert_lib) sqlite3_finalize(stmt_insert_lib);
    if (stmt_query_libs) sqlite3_finalize(stmt_query_libs);
}

// Log loaded shared library for an application
void log_library_access(const char *app, const char *library_path) {
    int count = 0;

    if (stmt_count_libs) {
        sqlite3_reset(stmt_count_libs);
        sqlite3_bind_text(stmt_count_libs, 1, app, -1, SQLITE_STATIC);
        if (sqlite3_step(stmt_count_libs) == SQLITE_ROW) {
            count = sqlite3_column_int(stmt_count_libs, 0);
        }
    }

    // Limit to top 5 libraries per app
    if (count < 5 && stmt_insert_lib) {
        sqlite3_reset(stmt_insert_lib);
        sqlite3_bind_text(stmt_insert_lib, 1, app, -1, SQLITE_STATIC);
        sqlite3_bind_text(stmt_insert_lib, 2, library_path, -1, SQLITE_STATIC);
        sqlite3_bind_int(stmt_insert_lib, 3, count + 1);
        sqlite3_step(stmt_insert_lib);
    }
}

// Background thread monitoring library accesses via fanotify
void *library_monitor_thread(void *arg) {
    int fan_fd = fanotify_init(FAN_CLASS_NOTIF, O_RDONLY);
    if (fan_fd < 0) {
        perror("fanotify_init failed, library monitor disabled");
        return NULL;
    }

    // Monitor /usr/lib where DSOs are stored
    if (fanotify_mark(fan_fd, FAN_MARK_ADD, FAN_ACCESS | FAN_OPEN | FAN_EVENT_ON_CHILD, AT_FDCWD, "/usr/lib") < 0) {
        perror("fanotify_mark failed");
        close(fan_fd);
        return NULL;
    }

    char buf[4096];
    while (1) {
        int len = read(fan_fd, buf, sizeof(buf));
        if (len <= 0) continue;

        struct fanotify_event_metadata *metadata = (struct fanotify_event_metadata *)buf;
        while (FAN_EVENT_OK(metadata, len)) {
            if (metadata->fd >= 0) {
                char fd_path[128];
                char file_path[1024];
                sprintf(fd_path, "/proc/self/fd/%d", metadata->fd);
                int path_len = readlink(fd_path, file_path, sizeof(file_path) - 1);
                if (path_len > 0) {
                    file_path[path_len] = '\0';

                    // Check if it's a shared library (.so)
                    if (strstr(file_path, ".so") != NULL) {
                        char comm_path[128];
                        char comm[256];
                        sprintf(comm_path, "/proc/%d/comm", metadata->pid);
                        int comm_fd = open(comm_path, O_RDONLY);
                        if (comm_fd >= 0) {
                            int comm_len = read(comm_fd, comm, sizeof(comm) - 1);
                            if (comm_len > 0) {
                                comm[comm_len] = '\0';
                                char *nl = strchr(comm, '\n');
                                if (nl) *nl = '\0';

                                pthread_mutex_lock(&app_mutex);
                                if (strlen(current_app) > 0 && strcmp(comm, current_app) == 0) {
                                    log_library_access(current_app, file_path);
                                }
                                pthread_mutex_unlock(&app_mutex);
                            }
                            close(comm_fd);
                        }
                    }
                }
                close(metadata->fd);
            }
            metadata = FAN_EVENT_NEXT(metadata, len);
        }
    }

    close(fan_fd);
    return NULL;
}

// Predict and prefetch the next logical application & its shared libraries
void predict_and_prefetch(const char *p2, const char *p1, int time_bin) {
    char predicted_app[256] = "";
    char binary_path[512] = "";
    int found = 0;

    // 1. Try Second-Order Markov Chain match
    if (strlen(p2) > 0 && strlen(p1) > 0 && stmt_query_v2) {
        sqlite3_reset(stmt_query_v2);
        sqlite3_bind_text(stmt_query_v2, 1, p2, -1, SQLITE_STATIC);
        sqlite3_bind_text(stmt_query_v2, 2, p1, -1, SQLITE_STATIC);
        sqlite3_bind_int(stmt_query_v2, 3, time_bin);

        if (sqlite3_step(stmt_query_v2) == SQLITE_ROW) {
            strncpy(predicted_app, (const char *)sqlite3_column_text(stmt_query_v2, 0), sizeof(predicted_app) - 1);
            strncpy(binary_path, (const char *)sqlite3_column_text(stmt_query_v2, 1), sizeof(binary_path) - 1);
            found = 1;
        }
    }

    // 2. Fallback to First-Order Markov Chain match
    if (!found && strlen(p1) > 0 && stmt_query_v1) {
        sqlite3_reset(stmt_query_v1);
        sqlite3_bind_text(stmt_query_v1, 1, p1, -1, SQLITE_STATIC);
        sqlite3_bind_int(stmt_query_v1, 2, time_bin);

        if (sqlite3_step(stmt_query_v1) == SQLITE_ROW) {
            strncpy(predicted_app, (const char *)sqlite3_column_text(stmt_query_v1, 0), sizeof(predicted_app) - 1);
            strncpy(binary_path, (const char *)sqlite3_column_text(stmt_query_v1, 1), sizeof(binary_path) - 1);
            found = 1;
        }
    }

    // 3. Trigger prefetching for target binary and its top 5 libraries
    if (found) {
        printf("VelocityMind: Prefetching predicted app: %s (%s)\n", predicted_app, binary_path);
        trigger_cache_prefetch(binary_path);

        // Query and prefetch libraries
        if (stmt_query_libs) {
            sqlite3_reset(stmt_query_libs);
            sqlite3_bind_text(stmt_query_libs, 1, predicted_app, -1, SQLITE_STATIC);
            while (sqlite3_step(stmt_query_libs) == SQLITE_ROW) {
                const char *lib_path = (const char *)sqlite3_column_text(stmt_query_libs, 0);
                trigger_cache_prefetch(lib_path);
            }
        }
    }
}

// Log transition and run predictions
void log_transition(const char *new_app) {
    int active_bin = get_current_temporal_bin();

    pthread_mutex_lock(&app_mutex);
    if (strlen(current_app) > 0 && strcmp(current_app, new_app) != 0) {
        // Log Second-Order transition
        if (strlen(prev_app) > 0 && stmt_insert_v2) {
            sqlite3_reset(stmt_insert_v2);
            sqlite3_bind_text(stmt_insert_v2, 1, prev_app, -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt_insert_v2, 2, current_app, -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt_insert_v2, 3, new_app, -1, SQLITE_STATIC);
            sqlite3_bind_int(stmt_insert_v2, 4, active_bin);
            sqlite3_step(stmt_insert_v2);
        }

        // Log First-Order fallback transition
        if (stmt_insert_v1) {
            sqlite3_reset(stmt_insert_v1);
            sqlite3_bind_text(stmt_insert_v1, 1, current_app, -1, SQLITE_STATIC);
            sqlite3_bind_text(stmt_insert_v1, 2, new_app, -1, SQLITE_STATIC);
            sqlite3_bind_int(stmt_insert_v1, 3, active_bin);
            sqlite3_step(stmt_insert_v1);
        }

        strncpy(prev_app, current_app, sizeof(prev_app) - 1);
    }

    strncpy(current_app, new_app, sizeof(current_app) - 1);
    predict_and_prefetch(prev_app, current_app, active_bin);
    pthread_mutex_unlock(&app_mutex);
}

void run_socket_listener() {
    int server_fd, client_fd;
    struct sockaddr_un addr;
    char buffer[256];

    // Create Unix domain socket
    server_fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("Failed to create socket");
        exit(1);
    }

    // Bind socket
    memset(&addr, 0, sizeof(struct sockaddr_un));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, SOCKET_PATH, sizeof(addr.sun_path) - 1);
    unlink(SOCKET_PATH);

    if (bind(server_fd, (struct sockaddr *)&addr, sizeof(struct sockaddr_un)) < 0) {
        perror("Failed to bind socket");
        close(server_fd);
        exit(1);
    }

    // Listen on socket
    if (listen(server_fd, 5) < 0) {
        perror("Failed to listen on socket");
        close(server_fd);
        exit(1);
    }

    chmod(SOCKET_PATH, 0666);

    printf("VelocityMind listening on socket: %s\n", SOCKET_PATH);

    // Main loop accepting client connections
    while (1) {
        client_fd = accept(server_fd, NULL, NULL);
        if (client_fd < 0) {
            continue;
        }

        struct timeval timeout;
        timeout.tv_sec = 1;
        timeout.tv_usec = 0;
        setsockopt(client_fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));

        memset(buffer, 0, sizeof(buffer));
        int bytes_read = read(client_fd, buffer, sizeof(buffer) - 1);
        if (bytes_read > 0) {
            char *trimmed = buffer;
            while (*trimmed == ' ' || *trimmed == '\t' || *trimmed == '\n' || *trimmed == '\r') {
                trimmed++;
            }
            int len = strlen(trimmed);
            while (len > 0 && (trimmed[len - 1] == '\n' || trimmed[len - 1] == '\r' || trimmed[len - 1] == ' ' || trimmed[len - 1] == '\t')) {
                trimmed[len - 1] = '\0';
                len--;
            }

            if (strlen(trimmed) > 0) {
                log_transition(trimmed);
            }
        }
        close(client_fd);
    }

    close(server_fd);
    unlink(SOCKET_PATH);
}

int main() {
    initialize_database();

    pthread_t monitor_tid;
    pthread_create(&monitor_tid, NULL, library_monitor_thread, NULL);
    pthread_detach(monitor_tid);

    run_socket_listener();

    finalize_statements();
    sqlite3_close(db);
    return 0;
}
