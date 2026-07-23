# Aetheris OS Codebase Audit & Gap Analysis

**Date:** June 19, 2026  
**Status:** In Progress (Ultracode Mode)  
**Goal:** Identify missing components, implementation gaps, and compile issues across all 7 Sub-Plans.

---

## 📊 Summary of Implementation Status

| Sub-Plan | Focus | Status | Present Files / Components | Missing Components / Gaps |
|---|---|---|---|---|
| **01** | Kernel & Core | **Mostly Complete** | `srcpkgs/linux-aetheris/template`<br>`etc/sv/zram-init/run` & `finish`<br>`etc/sysctl.d/99-aetheris-memory.conf`<br>`etc/nohang/nohang-desktop.conf` | Checkboxes in manifest are unchecked. |
| **02** | Desktop Shell | **Partially Complete** | `config/labwc/rc.xml` (basic)<br>`themes/Prismatic-Obsidian/window-manager/themerc`<br>`config/sfwbar/sfwbar.css` | 1. `<outputs>` section with VRR/tearing in `rc.xml` is missing.<br>2. GPU acceleration startup wrapper and `rc.xml` fallback logic are missing.<br>3. `sfwbar.config` layout configuration is missing.<br>4. Spring-physics animation timing configurations are missing. |
| **03** | Windows Comp. | **Partially Complete** | `etc/binfmt.d/win-exec.conf`<br>`usr/share/exec-guard/app_db.json`<br>`usr/bin/exec-guard-wrapper`<br>`usr/bin/exec-guard-sandbox` | 1. `exec-guard.desktop` and `exec-guard-msi.desktop` files are missing.<br>2. MIME registry config (`~/.local/share/applications/mimeapps.list`) is missing. |
| **04** | Driver Mgmt. | **Incomplete / Stub** | `chwd_port` Rust project shell (pci_scan, install_engine) | 1. `main.rs` doesn't match profiles to PCI devices or trigger installations.<br>2. Profile definition files (e.g. `graphic_drivers.toml`) are missing.<br>3. TOML parser (`toml` crate) is missing from `Cargo.toml`. |
| **05** | Preloading | **Incomplete / Stub** | `velocitymind` daemon shell (SQLite DB & prefetch function) | 1. The window focus socket/Wayland monitoring hook is a mock sleep loop.<br>2. Missing system startup service scripts for velocitymind. |
| **06** | Tauri Apps | **Missing** | None | 1. `VelocityInstall` Tauri v2 + Svelte partition manager is entirely missing.<br>2. `VelocityStore` Tauri v2 + Svelte app store with libxbps FFI is entirely missing. |
| **07** | Security & OOBE| **Missing** | None | 1. AppArmor profiles are missing.<br>2. `/etc/nftables.conf` firewall is missing.<br>3. Unified Kernel Image (UKI) signing script is missing.<br>4. `VelocitySetup` OOBE wizard (GTK4 + Libadwaita) is entirely missing. |

---

## 🛠️ Detailed Action Items & Resolution Plan

### Sub-Plan 02: Desktop Environment Gaps
1. **Update `config/labwc/rc.xml`**: Include the `<outputs>` section for VRR/tearing.
2. **Create GPU acceleration wrapper script (`usr/bin/labwc-wrapper`)**:
   - Query `/dev/dri/card0`.
   - Swap `rc.xml` with a fallback configuration (`config/labwc/rc-fallback.xml` that disables corner radius and shadows) if no GPU is detected.
3. **Create `config/sfwbar/sfwbar.config`**:
   - Define status bar modules (clock, active tasks, system trays).
   - Integrate clock and taskbar modules.

### Sub-Plan 03: Windows Compatibility Gaps
1. **Create desktop files**:
   - `/usr/share/applications/exec-guard.desktop` (executes `/usr/bin/exec-guard-wrapper`)
   - `/usr/share/applications/exec-guard-msi.desktop`
2. **Create mimeapps.list configuration**:
   - Put MIME registrations inside `/etc/xdg/mimeapps.list` or user profiles.

### Sub-Plan 04: Intelligent Driver Autoconfiguration Engine
1. **Enhance `Cargo.toml`**: Add dependencies for TOML parsing (`serde`, `toml`, `regex`).
2. **Implement Profile Schema & Parser**:
   - Write a module to parse driver profiles in `/usr/share/chwd/profiles/pci/*.toml`.
   - Implement regex matching for vendor, device, and class.
3. **Connect Main to Resolution Pipeline**:
   - Scan PCI bus.
   - For each device, find the highest priority matching profile.
   - Run `apply_profile` with packages and services.
4. **Create default profiles**:
   - NVIDIA open driver profile (`graphic_drivers.toml`).
   - WiFi driver profiles.

### Sub-Plan 05: Predictive App Preloading (VelocityMind)
1. **Implement Wayland/Labwc focus hook**:
   - Use labwc IPC or read active window titles from standard output of `sfwbar` or `swaymsg`/similar.
   - Or establish a Unix socket listener in `velocitymind` so that Wayland shell scripts (running as window listeners) can send transition events.
2. **Create service script**: Write `etc/sv/velocitymind/run` runit service script.

### Sub-Plan 06: Tauri & Svelte Applications
1. **Tauri v2 Project Structure**:
   - Initialize Svelte frontend and Tauri v2 backend for `VelocityInstall` and `VelocityStore`.
2. **Libxbps FFI binding in Rust**:
   - Bind libxbps C API to Rust commands.
3. **Flatpak Overrides editor**:
   - Implement INI parser in Rust for Flatpak overrides.

### Sub-Plan 07: Security Hardening & OOBE
1. **Create nftables firewall**: Write `/etc/nftables.conf`.
2. **AppArmor Profiles**: Write profiles for Web browsers/PDF viewers.
3. **UKI Signing script**: Write `/usr/bin/aetheris-uki-sign`.
4. **VelocitySetup OOBE wizard**: Initial GTK4 + Libadwaita code.
