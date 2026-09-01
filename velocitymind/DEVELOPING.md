# VelocityMind local development (safe mode)

> [!WARNING]
> Current socket behavior is intentionally **not** the target security model.  
> `velocitymind/daemon.c` currently binds `/tmp/velocitymind.sock` and applies mode `0666`, which means other local users could write focus events.  
> Do **not** expose this socket across users or treat it as hardened. Follow the redesign tracked in [amandeavor/Aetheris-OS#17](https://github.com/amandeavor/Aetheris-OS/issues/17).

## Required dependencies

- `gcc` (C compiler)
- `make`
- SQLite development headers/libraries (`sqlite3.h` and `libsqlite3`)

For optional manual hook validation:

- `socat` **or** `nc` with UNIX socket support (used by `usr/bin/velocitymind-focus-hook`)

## What each part does today

- **Daemon (`velocitymind/daemon.c`)**
  - Listens on UNIX socket `/tmp/velocitymind.sock`
  - Stores application transitions in SQLite (`/var/lib/velocitymind/history.db`, fallback `./history.db` if `/var/lib/velocitymind` is not writable)
  - Predicts likely next app and triggers page-cache prefetch for binaries and learned libraries
- **Database**
  - `transitions`: first-order transition counts (`from_app -> to_app`) by time bin
  - `transitions_v2`: second-order transition counts (`from_app_2, from_app_1 -> to_app`) by time bin
  - `applications`, `app_libraries`: binary paths and top-ranked shared libraries
- **Focus hook (`usr/bin/velocitymind-focus-hook`)**
  - Waits for `/tmp/velocitymind.sock`
  - Watches compositor/window events
  - Sends one plain app identifier per socket connection

## Current event message format (from code)

The daemon currently accepts a plain text payload (not JSON):

- Max read size: 255 bytes (`char buffer[256]`, NUL-terminated)
- Leading/trailing spaces, tabs, `\r`, `\n` are trimmed
- Empty payloads are ignored
- Non-empty trimmed payload is treated as the application name and passed to `log_transition()`

Equivalent example payloads accepted by current code:

- `firefox\n`
- `  org.gnome.Nautilus  \r\n`

## Local build and non-installing validation

These commands compile and validate locally without installing a runit service.

```bash
# From repository root:
make -C velocitymind clean all

# Run daemon briefly (auto-stop after 8 seconds):
timeout 8s ./velocitymind/velocitymind &

# Wait until socket exists, then send sample focus events:
while [ ! -S /tmp/velocitymind.sock ]; do sleep 0.2; done
python3 - <<'PY'
import socket
for app in (b"firefox\n", b"foot\n", b"firefox\n"):
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.connect("/tmp/velocitymind.sock")
    s.sendall(app)
    s.close()
PY

# If the daemon used local fallback DB, inspect transitions:
python3 - <<'PY'
import os, sqlite3
db_path = "history.db"
if os.path.exists(db_path):
    con = sqlite3.connect(db_path)
    rows = con.execute(
        "SELECT from_app, to_app, time_bin, transition_count FROM transitions ORDER BY transition_count DESC"
    ).fetchall()
    print(rows)
    con.close()
else:
    print("history.db not present in current directory (daemon may have used /var/lib/velocitymind/history.db).")
PY
```

## Cleanup after local testing

```bash
# Remove local build output:
make -C velocitymind clean

# Remove local fallback database created in repository root:
rm -f ./history.db

# Remove daemon socket (if still present):
rm -f /tmp/velocitymind.sock
```

If you intentionally ran the daemon with privileges and wrote to `/var/lib/velocitymind/history.db`, remove that file separately in your test environment when no longer needed.
