# Aetheris OS Development Manifest & Master Checklist

This file tracks the implementation milestones, compiler targets, and configuration directories for the **Aetheris OS** project. Use this manifest to track progress across all development environments.

## 🏷️ System Metadata
- **Base OS Target:** Void Linux (glibc, rolling-release)
- **Target Architecture:** `x86_64-v3` / `x86_64-v4` (Clang-compiled, ThinLTO + AutoFDO)
- **Service Supervisor:** `runit`
- **Memory Ceiling:** Fluid visual desktop session on **1 GB RAM** (Idle VmRSS target: `< 213 MB`)

---

## 🗺️ Master Implementation Roadmap

Detailed technical steps, scripts, and build guidelines are stored in the following sub-plans:

1.  **[01_kernel_system.md](./01_kernel_system.md) — Kernel & Core Optimization**
    *   [x] Configure Void `xbps-src` for LLVM/Clang and compile-time optimization targets.
    *   [x] Patch kernel source with the BORE CPU scheduler.
    *   [x] Set up ZRAM memory swap runit service.
    *   [x] Deploy sysctl settings for mechanical storage protection.
    *   [x] Configure `nohang-desktop` PSI-based OOM parameters.

2.  **[02_desktop_environment.md](./02_desktop_environment.md) — Wayland Desktop Shell**
    *   [x] Configure `labwc` compositor (rounded corners, skipping taskbar).
    *   [x] Code GLES2 render fallback toggles.
    *   [x] Build `sfwbar` panel layouts and dynamic task widgets.
    *   [x] Tune spring-physics animation timing configurations.

3.  **[03_windows_compatibility.md](./03_windows_compatibility.md) — Wine & Exec Guard Sandbox**
    *   [x] Deploy `binfmt_misc` kernel registration rules.
    *   [x] Write `/usr/share/exec-guard/app_db.json` alternatives map.
    *   [x] Code `/usr/bin/exec-guard-wrapper` redirection script.
    *   [x] Write `/usr/bin/exec-guard-sandbox` Bubblewrap environment manager.

4.  **[04_driver_management.md](./04_driver_management.md) — rust-chwd Driver Auto-Setup**
    *   [x] Configure Cargo build profiles for `chwd_port`.
    *   [x] Write FFI interface to query the PCI bus from sysfs registers.
    *   [x] Implement background package extraction and runit service symlinking.
    *   [x] Establish the pre-compiled driver package compilation pipeline.

5.  **[05_predictive_preloading.md](./05_predictive_preloading.md) — VelocityMind Predictive Preloader**
    *   [x] Implement SQLite transition mapping logic in C.
    *   [x] Write the Discrete-Time Markov Chain probability lookup function.
    *   [x] Hook process window shifts and trigger `posix_fadvise` page cache warms.
    *   [x] Build compile script and service configurations.

6.  **[06_installer_app_store.md](./06_installer_app_store.md) — Tauri & Svelte Applications**
    *   [x] Build `VelocityInstall` (Tauri v2 + Svelte partition manager using `parted-rs`).
    *   [x] Implement LUKS2 Argon2id formats and systemd-cryptenroll TPM2 locks.
    *   [x] Build `VelocityStore` (Tauri v2 + Svelte app store with direct FFI to `libxbps` C API).
    *   [x] Implement Flatpak overrides INI editor.

7.  **[07_security_oobe.md](./07_security_oobe.md) — Security Hardening & First-Boot Setup**
    *   [x] Create AppArmor profiles for host isolation.
    *   [x] Deploy `nftables` default-drop workstation firewalls.
    *   [x] Set up UKI (Unified Kernel Image) signing script using custom MOKs.
    *   [x] Develop `VelocitySetup` OOBE wizard (GTK4 + Libadwaita).

---

## 🛠️ Global Packaging Command Center

To run builds and package deployment inside a Void development shell:

### 1. Compile all Local Binaries
```bash
# Compile chwd_port
cd chwd_port
cargo build --release

# Compile velocitymind daemon
cd ../velocitymind
make
```

### 2. Configure xbps-src
```bash
git clone --depth=1 https://github.com/void-linux/void-packages.git
cd void-packages
./xbps-src binary-bootstrap

# Symlink your custom template package
ln -s /C/Users/Admin/aetheris-os/srcpkgs/linux-aetheris srcpkgs/linux-aetheris

# Build the kernel package
./xbps-src pkg linux-aetheris
```
