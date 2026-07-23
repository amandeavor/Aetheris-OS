# Why Snap Packages are Excluded from Aetheris OS

Aetheris OS is optimized for extremely fast, low-memory performance on resource-constrained hardware (with a 1 GB RAM target). To achieve these design goals, several default Linux systems have been replaced or restructured. This document outlines the technical and philosophical reasons why Canonical's Snap package system is excluded from Aetheris OS, and outlines the supported alternatives.

---

## 1. Technical Incompatibilities

### Systemd Dependency
The Snap daemon (`snapd`) relies on a hard dependency on `systemd` for service activation, socket management, and cgroup control. Aetheris OS uses **runit** as its init system. Runit requires less than 2 MiB of system memory at idle, whereas systemd requires 35–40 MiB. Bringing in the systemd dependency chain to support `snapd` would violate the primary memory footprint goals of the operating system.

### Storage and Loop Mount Overhead
Each Snap package is packaged as a compressed `squashfs` filesystem that is dynamically mounted on a loop device during system boot or application launch. Managing dozens of loop devices introduces:
- **Boot Latency:** Slower boot times due to sequential mounting of multiple filesystem images.
- **Memory Overhead:** CPU and memory overhead for keeping multiple loop mounts active in kernel space.
- **Disk I/O stalls:** Significant performance degradation on systems with legacy mechanical hard drives (HDDs) or slow eMMC storage.

---

## 2. Security and Confinement Conflicts

### AppArmor Rule Contention
Aetheris OS utilizes AppArmor with strict, human-readable profiles (such as those for Flatpak, Steam, and Firefox) to restrict application permissions. `snapd` attempts to dynamically generate and enforce its own AppArmor security profiles. This auto-generation conflicts with the custom global sandbox overrides and local user namespace restrictions (like the AppArmor 4.0 userns allowlist) defined on Aetheris OS.

### System Directory Intrusion
Snaps require a hardcoded symbolic link at `/snap` to route execution binaries. This violates the clean FHS (Filesystem Hierarchy Standard) structure of Aetheris OS.

---

## 3. Autonomy and Update Philosophy

### Closed-Source Central Store
The Snap client connects exclusively to Canonical's proprietary backend store. It does not support third-party repositories or self-hosted package registries. Aetheris OS is committed to fully open-source, decentralised package distribution.

### Forced Updates
Snap enforces automatic, scheduled background updates that cannot be permanently disabled by the user. On resource-constrained systems or metered connections, unexpected background downloads and installations can saturate disk I/O, increase RAM consumption, and disrupt system responsiveness.

---

## 4. Supported Alternatives

Aetheris OS provides three optimized packaging models to fulfill all software needs:

1. **Native XBPS Packages:** Compiled for `x86_64-v3` or `x86_64-v4` using LLVM/Clang with ThinLTO. These run with zero overhead and interface directly with the lightweight, memory-mapped `libxbps` API.
2. **Flatpak:** Sandboxed container applications running under `bubblewrap` that respect Aetheris OS's global security overrides (e.g. denying home folder and SSH key access by default). Flatpak works natively without systemd.
3. **AppImage:** Standalone, portable execution binaries that require no system daemon or mount overhead.
