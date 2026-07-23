# Aetheris OS

<p align="center">
  <strong>A high-performance, ultra-lightweight Linux distribution engineered for low-latency desktop workflows, gaming, and uncompromising security.</strong>
</p>

---

## ⚡ Overview

**Aetheris OS** is an independent, Void-based Linux distribution optimized from the ground up for minimal resource usage, instantaneous boot times, and modern Wayland desktop experiences. Built without heavy legacy system daemons, Aetheris OS combines custom Rust & C daemons with a refined Wayland stack to deliver sub-40MB idle RAM usage while remaining feature-complete.

---

## Key Architecture & Core Technologies

### 🚀 Custom Linux Kernel & System Layer (`linux-aetheris`)
* **BORE CPU Scheduler**: Task-burst-oriented scheduler tuned for low UI latency during heavy background compilation or rendering workloads.
* **ntsync Fast Mutexes**: In-kernel fast synchronisation support replacing traditional Wine/Proton socket IPC for substantial gaming FPS increases.
* **ZRAM & Memory Management**: Dynamic ZRAM compression alongside `nohang` OOM prevention and systemd-less `runit` init supervision.
* **`VelocityMind` Preloader**: C-based predictive background daemon (`velocitymind`) that dynamically pre-caches high-frequency application binaries into RAM.

### 🎨 Desktop Environment & Design System
* **Compositor**: Labwc Wayland compositor with custom `tearing-control-v1` low-latency page flipping and VRR/FreeSync integration.
* **Status Panel**: Custom `sfwbar` status bar with GTK4/Qt6 styling parity.
* **Design Dictionary**: System-wide design token compiler (`style-dictionary`) generating matching palettes for GTK4, Qt6 (via qss), and Labwc window borders.

### ⚙️ Driver Management (`chwd_port`)
* **Automated Hardware Profiling**: Rust-based PCI scanning engine for automated setup of proprietary NVIDIA open modules, AMD GPU firmware, and Broadcom/Realtek wireless drivers without manual intervention.

### 📦 Application Ecosystem & Tools
* **VelocityInstall**: Tauri v2 + Svelte 5 + Rust installer supporting LUKS2/TPM2 bound encryption, Btrfs subvolume schemes (`@root`, `@home`), and Windows dual-boot safe resizing.
* **VelocityStore**: Native app store powered by direct Rust FFI bindings to `libxbps`, native Flatpak permission controls, and one-click Wine/Proton prefix management via Bottles CLI.
* **VelocitySetup**: GTK4 + Libadwaita zero-overhead first-boot wizard.

### 🛡️ Security & Exec Guard (`VelocityShield`)
* **AppArmor Hardening**: Modern path-centric profiles restricting untrusted application access to `~/.ssh`, hardware sockets, and system paths.
* **Exec Guard**: Userland application sandboxing daemon enforcing runtime policies on external executables and installers.
* **Signed UKI & TPM2**: Unified Kernel Image binary layout with custom MOK signing and TPM2 PCR binding.

---

## 📂 Repository Structure

```
.
├── chwd_port/            # Rust hardware detection & driver installer engine
├── config/               # Wayland (Labwc), sfwbar, GTK4, Qt6, mako configs
├── dev-plan/             # Comprehensive technical design blueprints & audits
├── docs/                 # Architectural specifications and subsystem guides
├── etc/                  # Kernel cmdline, runit daemons, sysctl, AppArmor rules
├── scripts/              # Repository key setup and utility scripts
├── srcpkgs/              # Custom Void XBPS package build templates
├── style-dictionary/     # Cross-toolkit theme token generator
├── themes/               # Window manager and desktop themes
├── usr/                  # Custom binaries, UKI signers, Exec Guard wrappers
├── velocityinstall/      # Tauri v2 + Svelte 5 distribution installer UI
├── velocitymind/         # C-based predictive memory preloader daemon
├── velocitysetup/        # GTK4 first-boot configuration wizard
├── velocitystore/        # Native XBPS/Flatpak App Store frontend
└── build-iso.sh          # ISO image generation script
```

---

## 🛠️ Building & Installation

### Requirements
* Void Linux build environment (or chroot container with `xbps-src`)
* `mksquashfs`, `xorriso`, `grub-mkrescue` or `systemd-boot` tools for ISO generation
* Rust toolchain (`cargo`, `rustc`) & Node.js (for Tauri apps and style dictionary compilation)

### Build Steps

1. **Compile Theme Tokens**:
   ```bash
   cd style-dictionary
   node build.js
   ```

2. **Build Native Utilities**:
   ```bash
   cd velocitymind && make
   cd ../chwd_port && cargo build --release
   ```

3. **Generate Live ISO**:
   ```bash
   ./build-iso.sh
   ```

---

## 📄 License

This distribution repository is open-source under the MIT License unless explicitly specified in individual component directories.
