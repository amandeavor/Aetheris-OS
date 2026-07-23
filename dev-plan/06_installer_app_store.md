# Sub-Plan 06: Tauri & Svelte Applications Architecture

This plan covers the design, FFI interfaces, and database configurations for the `VelocityInstall` and `VelocityStore` applications.

---

## 1. VelocityInstall (OS Installer)

### Core Technologies:
- **UI:** Svelte compiled to vanilla JS DOM manipulations, running inside Tauri v2 WebKitGTK.
- **Cache Optimization:** Sets `WEBKIT_CACHE_MODEL_DOCUMENT_VIEWER` to disable speculative caching, dropping memory usage below 30 MB.
- **Partitioning FFI:** Rust FFI bindings to `libparted` (via `parted-rs`) to configure partition maps programmatically.
- **Volume layout options:** Btrfs with subvolume sets (`@root`, `@home`, `@snapshots`, `@log`, `@cache`) mounted with `compress=zstd:1`.
- **LUKS2 + TPM2:** Binds key files to TPM2 registers PCR 7 and PCR 15 using `systemd-cryptenroll`.

### Automated Installation:
- Detects `/boot/autoinstall.toml` on boot. If present, parses parameters and executes automated partitioning, package extraction, and kernel signing silently.

---

## 2. VelocityStore (Graphical Software Center)

### Core Technologies:
- **UI:** Svelte + Tauri v2. Peak memory footprint under 35 MB.
- **xbps FFI Interface:** Direct Rust-to-C FFI bindings to Void's native `libxbps` library. Allows querying repository databases, resolving package dependencies, and tracking download transactions directly in memory without spawning slow subprocess shells.
- **Flatpak Permission Manager:** A custom Rust INI parser that reads and updates override configurations in `~/.local/share/flatpak/overrides/` and `/var/lib/flatpak/overrides/`, rendering clean access toggles.
- **Curation Index:** Offline, compressed SQLite database containing AppStream metadata and Open Desktop Ratings Service (ODRS) reviews.

### FFI Progress Streaming:
Uses async channels to stream download progress from the libxbps transaction loop back to the Svelte progress bar.
