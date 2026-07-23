# Sub-Plan 04: Intelligent Driver Autoconfiguration Engine

This plan covers porting CachyOS's Rust-based `chwd` (CachyOS Hardware Detection) engine to Void Linux, PCI sysfs registers scanning, and dynamic service installation.

---

## 1. Rust PCI Scanning Engine

The scanner interacts directly with system sysfs pathways, avoiding external dependency overhead.

### Target registers inside `/sys/bus/pci/devices/`:
- **vendor:** Enforces manufacturer matching (e.g. `10de` for Nvidia, `1002` for AMD).
- **device:** Resolves specific chipset generation IDs.
- **class:** Maps function types (e.g. `0300` for primary graphics, `0302` for 3D render cards).

### Code Architecture (`chwd_port/src/pci_scan.rs`):
- Iterates over directory entries.
- Truncates standard hexadecimal identifiers (e.g., removing `0x` prefixes).
- Extracts the first 4 digits of the class register to identify standard device classes.

---

## 2. Package Installer & Runit Symlinking

The installation logic applies hardware-matched profiles directly to the system.

### Executing Package Transaction:
- Rust issues direct commands to `xbps-install -S -y <packages>` to register graphics libraries and firmware modules.

### Activating runit Services:
- Instead of using systemd's `systemctl enable` bindings, the engine creates symbolic linkages between `/etc/sv/` and `/var/service/`:
  ```rust
  let sv_path = format!("/etc/sv/{}", service);
  let run_path = format!("/var/service/{}", service);
  std::os::unix::fs::symlink(&sv_path, &run_path);
  ```

---

## 3. Pre-Compiled Kernel Module Packaging Strategy

Compiling drivers (such as `nvidia-open` or Broadcom `wl`) locally on low-end systems can crash the compiler due to RAM exhaustion.

### Mitigation Pipeline:
1. **Pre-compilation:** Compile dynamic kernel modules against target kernel headers on Aetheris build servers.
2. **Packaging:** Generate binary `.xbps` packages (e.g., `linux-aetheris-nvidia-open`).
3. **Delivery:** The installer downloads and installs matching binary packages directly, bypassing DKMS compilation completely.
4. **DKMS Fallback:** Retain DKMS compile packages strictly for custom user-compiled kernels.
