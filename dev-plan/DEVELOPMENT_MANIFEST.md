# Aetheris OS Development Manifest & Master Checklist

This file tracks the implementation milestones, compiler targets, and configuration directories for the **Aetheris OS** project. The sub-plan status words below describe **source presence only** — they mean the spec'd files exist in the repository. They do **not** mean built, tested, or release-ready. For the four-tier status model (`exists / builds / tested / release-ready`) and safe validation paths, see [`docs/component-status.md`](../docs/component-status.md). The runtime audit, with file-level evidence and known gaps, lives in [`dev-plan/AUDIT_REPORT.md`](./AUDIT_REPORT.md).

> Avoid words such as "complete," "secure," or "supported" here unless the repository contains validation evidence for that claim.

## 🏷️ System Metadata
- **Base OS Target:** Void Linux (glibc, rolling-release)
- **Target Architecture:** `x86_64-v3` / `x86_64-v4` (Clang-compiled, ThinLTO + AutoFDO)
- **Service Supervisor:** `runit`
- **Memory Ceiling:** Fluid visual desktop session on **1 GB RAM** (Idle VmRSS target: `< 213 MB`)

---

## 🗺️ Master Implementation Roadmap

Detailed technical steps, scripts, and build guidelines are stored in the following sub-plans:

1.  **[01_kernel_system.md](./01_kernel_system.md) — Kernel & Core Optimization** — **Source present**
    *   [x] Configure Void `xbps-src` for LLVM/Clang and compile-time optimization targets.
    *   [x] Patch kernel source with the BORE CPU scheduler.
    *   [x] Set up ZRAM memory swap runit service.
    *   [x] Deploy sysctl settings for mechanical storage protection.
    *   [x] Configure `nohang-desktop` PSI-based OOM parameters.

2.  **[02_desktop_environment.md](./02_desktop_environment.md) — Wayland Desktop Shell** — **Source present**, with one **Gap** (spring-physics animation timing)
    *   [x] Configure `labwc` compositor (rounded corners, skipping taskbar).
    *   [x] Code GLES2 render fallback toggles.
    *   [x] Build `sfwbar` panel layouts and dynamic task widgets.
    *   [ ] **Gap:** Tune spring-physics animation timing configurations. A repo-wide grep across `.css/.xml/.theme/.lua/.json/.scss` for `spring|stiffness|damping` returned no matches. Implementation issue to be opened after this audit merges (see `AUDIT_REPORT.md`).

3.  **[03_windows_compatibility.md](./03_windows_compatibility.md) — Wine & Exec Guard Sandbox** — **Source present**
    *   [x] Deploy `binfmt_misc` kernel registration rules.
    *   [x] Write `/usr/share/exec-guard/app_db.json` alternatives map.
    *   [x] Code `/usr/bin/exec-guard-wrapper` redirection script.
    *   [x] Write `/usr/bin/exec-guard-sandbox` Bubblewrap environment manager.

4.  **[04_driver_management.md](./04_driver_management.md) — rust-chwd Driver Auto-Setup** — **Source present**, runtime match-and-apply validation pending (see `docs/component-status.md`)
    *   [x] Configure Cargo build profiles for `chwd_port`.
    *   [x] Write FFI interface to query the PCI bus from sysfs registers.
    *   [x] Implement background package extraction and runit service symlinking.
    *   [x] Establish the pre-compiled driver package compilation pipeline.

5.  **[05_predictive_preloading.md](./05_predictive_preloading.md) — VelocityMind Predictive Preloader** — **Source present**, benchmark and long-running evidence pending (see `docs/component-status.md`)
    *   [x] Implement SQLite transition mapping logic in C.
    *   [x] Write the Discrete-Time Markov Chain probability lookup function.
    *   [x] Hook process window shifts and trigger `posix_fadvise` page cache warms.
    *   [x] Build compile script and service configurations.

6.  **[06_installer_app_store.md](./06_installer_app_store.md) — Tauri & Svelte Applications** — **Source present**, frontend build and destructive-path validation pending (see `docs/component-status.md`)
    *   [x] Build `VelocityInstall` (Tauri v2 + Svelte partition manager using `parted-rs`).
    *   [x] Implement LUKS2 Argon2id formats and systemd-cryptenroll TPM2 locks.
    *   [x] Build `VelocityStore` (Tauri v2 + Svelte app store with direct FFI to `libxbps` C API).
    *   [x] Implement Flatpak overrides INI editor.

7.  **[07_security_oobe.md](./07_security_oobe.md) — Security Hardening & First-Boot Setup** — **Source present**, end-to-end first-boot flow not yet automated (see `docs/component-status.md`)
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
