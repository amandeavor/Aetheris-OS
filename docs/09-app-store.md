# App Store — VelocityStore

## Current State of the Art

Standard graphical package managers are too resource-heavy for older systems with limited memory.

- **GNOME Software:** Runs a persistent background daemon via libadwaita and PackageKit. It consumes over 150MB of idle RAM, making it impractical for lightweight systems.
- **KDE Discover:** Pulls in extensive Qt and KIO libraries, adding significant dependency weight and startup latency to non-KDE environments.
- **Pamac:** Tailored specifically for Arch Linux's ALPM library. It lacks clean native wrappers to hook into Void's glibc-based XBPS package manager.
- **Bauh:** Written in Python, Bauh suffers from slow UI transitions and high startup times, degrading the user experience on older dual-core processors.
- **Flatpak-based Stores:** While they provide clean container isolation, they lack programmatic hooks to easily query and manage system-level host packages.

The table below compares these graphical package managers across performance and architectural metrics:

| Package Manager UI | Idle RAM Footprint | Rendering Engine | Dual-Backend Support (Native + Flatpak) | DB Search Performance (Lower is better) |
|---|---|---|---|---|
| GNOME Software | ~150MB | GTK4 / libadwaita | Yes (via heavy PackageKit plugin) | Moderate (prone to DB lockups) |
| KDE Discover | ~120MB | Qt6 / Kirigami | Yes (via KIO and PackageKit) | Moderate |
| Pamac | ~80MB | GTK3 / Vala | Limited (highly ALPM dependent) | Fast |
| Bauh | ~110MB | Qt5 / Python | Yes | Slow (high process spawning overhead) |
| **Tauri App Store** | **~35MB** | **WebKitGTK / Svelte** | **Yes (Programmatic libxbps + Flatpak)** | **Extremely Fast (native Rust indexing)** |

On the package delivery front, standard installations often download entire package files for minor updates, wasting bandwidth on metered or slow connections. While XBPS natively supports delta package compilation, it lacks a graphical frontend to manage this process.

Additionally, managing Flatpak application permissions typically requires users to install separate utilities like Flatseal. Integrating these permissions directly into the primary application interface remains an unaddressed design gap in the lightweight desktop space.

---

## Recommended Technology Stack

The application store leverages a lightweight, custom-built dual-backend architecture.

- **UI Core:** Tauri v2 paired with Svelte. Svelte compiles directly to highly optimized, vanilla JavaScript DOM manipulations. This avoids the overhead of a virtual DOM, keeping the UI rendering layer's memory usage under 40MB.
- **XBPS Interface:** A custom Rust binding wrapper compiled directly against the C-based API of libxbps. This programmatic binding allows the app store to query local package states, resolve transaction dependencies, and trigger package actions directly in memory. This avoids the need to fork slow shell subprocesses.
- **Flatpak Engine:** A direct file-system parser built in Rust. It reads and writes to Flatpak override files located at `~/.local/share/flatpak/overrides/` and `/var/lib/flatpak/overrides/`. This allows users to manage application permissions (such as toggling X11, Wayland, and folder access) directly within the store interface.
- **Curation Database:** An offline, compressed SQLite database generated periodically from Flathub AppStream metadata and Open Source AppStream repositories.
- **App Reviews:** Direct client integrations with the Open Desktop Ratings Service (ODRS) API over HTTPS.

To retrieve and display real-time transaction updates in the Svelte frontend, the Rust backend streams stdout logs from libxbps using async channels:

```rust
// Stream transaction progress directly to the frontend webview
#[tauri::command]
async fn execute_xbps_install(
    window: tauri::Window, 
    pkg_name: String
) -> Result<(), String> {
    let (tx, mut rx) = tauri::async_runtime::channel(100);
    // Bind to the libxbps transaction loop in a background thread
    std::thread::spawn(move || {
        libxbps::run_transaction(&pkg_name, |progress| {
            let _ = tx.blocking_send(progress);
        });
    });
    // Stream progress percentage directly to the webview
    while let Some(progress) = rx.recv().await {
        window.emit("install-progress", progress).map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

---

## Architecture Diagram

```
+---------------------------------------------------------------------------------+
|                                TAURI GRAPHICAL STORE                            |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  |                             SVELTE FRONTEND                               |  |
|  |  +----------------------+  +-------------------------+  +--------------+  |  |
|  |  | Featured Curation    |  | Permission Toggles      |  | Progress Bar |  |  |
|  |  | Grid                 |  | (Flatseal-style)        |  | Display      |  |  |
|  |  +----------+-----------+  +------------+------------+  +-------^------+  |  |
|  +-------------|---------------------------|-----------------------|---------+  |
|                | App Info Request          | Permission Change     | Progress   |
|                v (Asynchronous IPC)        v                       | Streaming  |
|  +-------------+---------------------------+-----------------------+---------+  |
|  |                            TAURI BACKEND (RUST)                           |  |
|  |  +----------------------+  +-------------------------+  +--------------+  |  |
|  |  | Local SQLite Cache   |  | Direct INI Overrides    |  | libxbps C    |  |  |
|  |  | (AppStream / ODRS)   |  | Parser                  |  | Connector    |  |  |
|  |  +----------+-----------+  +------------+------------+  +-------+------+  |  |
|  +-------------|---------------------------|-----------------------|---------+  |
|                |                           |                       |             |
|                v                           v                       v             |
|  +-------------+---------------------------+-----------------------+---------+  |
|  |                              SYSTEM ENGINES                               |  |
|  |  +----------------------+  +-------------------------+  +--------------+  |  |
|  |  | ODRS Remote API      |  | /var/lib/flatpak/       |  | Host XBPS DB |  |  |
|  |  | (HTTPS JSON Client)  |  | (overrides/ directory)  |  | (/var/db/)   |  |  |
|  |  +----------------------+  +-------------------------+  +--------------+  |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
```

---

## Implementation Roadmap

**Phase 1: Local AppStream and SQLite Indexing (Milestone 1)**
Develop the SQLite database schema to store AppStream metadata. Create an asynchronous Rust parser that reads local AppStream XML files on startup and updates the SQLite database. This ensures search queries run in under 5 milliseconds.

**Phase 2: FFI Integration with libxbps (Milestone 2)**
Write the C-to-Rust foreign function interface (FFI) bindings for libxbps. Implement transaction safety checks to automatically warn the user if a package installation would conflict with existing system libraries.

**Phase 3: Direct Flatpak Override Management (Milestone 3)**
Develop a Rust-based parser to read and write to Flatpak override configurations. Map these parameters to clean toggles in Svelte, allowing users to inspect and adjust sandbox permissions before launching an application.

**Phase 4: Curation, Delta Updates, and Bottles Integration (Milestone 4)**
Implement background checking for XBPS delta packages and Flatpak/OSTree static deltas to minimize download bandwidth on metered networks. Establish a deep integration with Bottles CLI environments, allowing users to initiate single-click Wine prefixes and launch Windows executables directly from the store UI.

---

## Trade-off Analysis

Designing a custom app store in Svelte and Tauri provides exceptional speed and a lightweight memory footprint, but it lacks the plug-and-play plugin ecosystems found in larger store managers.

Additionally, rendering dynamic content within WebKitGTK can lead to memory leaks if garbage collection is not managed properly. To resolve this, the store restricts memory leaks by loading application views in a single-page app (SPA) environment. This setup avoids full browser reloads and actively destroys DOM reference nodes when views are changed, preventing memory fragmentation on 1GB RAM systems.

---

## Open Research Questions

Further exploration is needed to develop a robust, distributed P2P local caching model for LAN environments. This would allow machines running the distribution on a local network to discover and pull common Flatpak runtimes and XBPS updates directly from neighboring peers without duplicate WAN downlinks.
