# Intelligent Driver Management & Auto-Detection Engine

To deliver a plug-and-play experience on diverse hardware configurations, the operating system must auto-detect hardware and configure drivers silently on first boot. Users should never encounter a "no WiFi" or "no GPU acceleration" situation after installation — the system must ship with comprehensive driver profiles and a deterministic resolution pipeline that matches detected hardware to the correct kernel module, firmware blob, and userspace package set.

---

## PCI Device Scanning and Driver Profiles

The driver detection engine is built around **chwd** (CachyOS Hardware Detection), a Rust-based hardware profiling tool modeled after the battle-tested `mhwd` utility from Manjaro but rewritten for modern maintainability and performance. At its core, chwd performs a structured PCI bus scan, reads device class codes, vendor IDs, and device IDs from sysfs, then matches them against a library of declarative TOML driver profiles.

Each driver profile is a self-contained TOML file that declares everything needed to install and configure a particular hardware driver stack. Profiles live under `/usr/share/chwd/profiles/pci/` and follow a strict schema:

```toml
# /usr/share/chwd/profiles/pci/graphic_drivers.toml

[nvidia-open-dkms]
desc = 'Open source kernel-mode NVIDIA drivers'
priority = 10
class_ids = ["0300", "0302"]
vendor_ids = ["10de"]
device_ids = "*"
device_name_pattern = '(AD)\w+'
packages = "nvidia-open-dkms nvidia-utils egl-wayland"
pre_install = """
cat << 'EOF' > /etc/mkinitcpio.conf.d/10-chwd.conf
MODULES+=(nvidia nvidia_modeset nvidia_uvm nvidia_drm)
EOF
"""
```

### Multi-Tier Resolution Pipeline

When chwd runs — either during installation or on first boot — it executes a multi-tier pipeline to resolve the correct driver profile for each detected PCI device:

1. **Class ID Identification** — The engine reads the PCI class code (e.g., `0300` for VGA-compatible controller, `0302` for 3D controller) from each device's sysfs entry. This determines the *category* of driver profiles to evaluate. A device with class `0300` triggers evaluation against all graphics driver profiles; a device with class `0280` triggers evaluation against wireless network profiles.

2. **Vendor Filtering** — Within the matched class category, profiles are filtered by vendor ID. NVIDIA devices (`10de`) are matched against NVIDIA-specific profiles, AMD devices (`1002`) against Mesa/AMDGPU profiles, and Intel devices (`8086`) against Intel graphics profiles. This prevents cross-vendor mismatches entirely.

3. **Device ID Resolution** — The final tier matches the specific device ID (or device name pattern via regex) against the profile's `device_ids` or `device_name_pattern` fields. A wildcard `"*"` matches all devices from that vendor within the class, while specific device ID lists or regex patterns enable fine-grained targeting — for example, restricting a profile to only Ada Lovelace generation GPUs via the `(AD)\w+` pattern.

The profile with the highest `priority` value among all matching candidates is selected. The engine then installs the declared `packages`, executes any `pre_install` or `post_install` hooks, and regenerates the initramfs if kernel modules were added.

---

## Hybrid Graphics & PRIME Logic

Modern laptops frequently ship with hybrid graphics configurations — an integrated GPU (Intel or AMD) for power efficiency and a discrete NVIDIA GPU for performance workloads. Handling this correctly requires detecting the chassis type, loading the appropriate PRIME render offload profiles, and applying vendor-specific workarounds.

### Chassis Detection

chwd determines whether the system is a laptop by reading the DMI chassis type from sysfs:

```bash
chwd_chassis=$(cat /sys/class/dmi/id/chassis_type)
```

Chassis type values **8** (Portable), **9** (Laptop), **10** (Notebook), and **11** (Hand Held) all indicate a mobile form factor. When a laptop chassis is detected and both an integrated and discrete GPU are present on the PCI bus, chwd activates its hybrid graphics logic and loads `.prime` profile variants instead of standalone discrete GPU profiles.

### PRIME Render Offload and Switcheroo

The `.prime` profiles configure the NVIDIA discrete GPU for on-demand render offload rather than exclusive rendering. This involves:

- Installing `switcheroo-control`, the D-Bus service that exposes GPU switching capabilities to the desktop environment and allows applications to request rendering on the discrete GPU via the `DRI_PRIME` or `__NV_PRIME_RENDER_OFFLOAD` environment variables.
- Configuring the integrated GPU as the primary display output and the discrete GPU as an offload-only renderer.
- Ensuring the discrete GPU can enter power-saving states (RTD3 — Run Time D3) when not actively rendering.

### NVIDIA RTD3 Workaround

A known issue with NVIDIA's EGL implementation causes rendering corruption when the discrete GPU wakes from RTD3 power-saving state on certain hybrid configurations. The workaround forces Mesa's EGL implementation for the integrated GPU to take priority, ensuring that desktop compositor EGL contexts never accidentally bind to the NVIDIA EGL vendor library:

```bash
# /usr/lib/systemd/user-environment-generators/20-nvidia-rtd3-workaround
#!/usr/bin/env sh
if [ -n "$(lspci -d '10de:*:0302')" ]; then
    echo "__EGL_VENDOR_LIBRARY_FILENAMES=/usr/share/glvnd/egl_vendor.d/50_mesa.json"
fi
```

This systemd user environment generator runs at session startup. It checks whether an NVIDIA 3D controller (class `0302`, the typical classification for the discrete GPU in hybrid configurations) is present. If found, it sets `__EGL_VENDOR_LIBRARY_FILENAMES` to explicitly point at Mesa's EGL vendor JSON, preventing the compositor from inadvertently using NVIDIA's EGL library and triggering the RTD3 wake corruption.

---

## Comprehensive Wireless Network Driver Strategy

WiFi hardware is one of the most fragmented driver landscapes in Linux. The system must ship with driver coverage spanning Intel, Realtek, MediaTek, and Broadcom chipsets — covering both modern WiFi 6E/7 hardware and legacy cards still found in older machines.

The following table documents the complete WiFi chipset coverage matrix:

| Chipset Family | Manufacturer | Core Kernel Module | Firmware Dependencies | Packaging Source / Method |
|---|---|---|---|---|
| AX210 / BE200 | Intel Corporation | `iwlwifi` | `iwlwifi-ty-a0-gf-a0.ucode` | Mainline; packaged inside `linux-firmware-intel` |
| 3945ABG / 4965AGN | Intel Corporation | `iwlegacy` | `iwl3945.ucode` / `iwl4965.ucode` | Mainline; legacy firmware collection |
| RTL8821CE / RTL8822CE | Realtek Semiconductor | `rtw88` | `rtw8821c_fw.bin` / `rtw8822c_fw.bin` | Mainline; pre-compiled kernel module |
| RTL8852AE / RTL8922AE | Realtek Semiconductor | `rtw89` | `rtw8852a_fw.bin` / `rtw8922a_fw.bin` | Mainline; packaged in `linux-firmware-realtek` |
| RTL8812AU | Realtek Semiconductor | `rtl8812au-dkms` | None (proprietary binary monolithic) | Out-of-tree; built via DKMS on first-boot |
| MT7921 / MT7925 | MediaTek Corporation | `mt76` | `mt7921_fw.bin` / `mt7925_fw.bin` | Mainline; packaged inside `linux-firmware-mediatek` |
| BCM43602 / BCM43455 | Broadcom Corporation | `brcmfmac` | `brcmfmac43602-pcie.bin` | Mainline; firmware redistributable binary package |
| BCM43142 / BCM4360 | Broadcom Corporation | `wl` | Bound inside proprietary driver module | Out-of-tree; built via DKMS using `broadcom-wl` |

The majority of modern chipsets (Intel `iwlwifi`, Realtek `rtw88`/`rtw89`, MediaTek `mt76`, Broadcom `brcmfmac`) have mainline kernel support and only require the correct firmware blob to be present in `/lib/firmware/`. These firmware files are split into vendor-specific packages (`linux-firmware-intel`, `linux-firmware-realtek`, `linux-firmware-mediatek`) to avoid shipping the entire 800MB+ `linux-firmware` collection.

Out-of-tree drivers — specifically Realtek `rtl8812au-dkms` for older USB WiFi adapters and Broadcom `wl` for legacy Broadcom chips without open-source firmware — require DKMS compilation against the running kernel. These are handled as fallback cases when mainline drivers are unavailable for the detected hardware.

---

## Pre-Compiled Kernel Modules vs. DKMS

DKMS (Dynamic Kernel Module Support) is the traditional mechanism for building out-of-tree kernel modules. When a new kernel is installed, DKMS recompiles every registered module against the new kernel headers. While functional, this approach has significant drawbacks on low-resource machines:

- **Compilation time** — On systems with limited CPU and memory (2-core, 4GB RAM configurations common in budget laptops), DKMS compilation of complex modules like `nvidia-open-dkms` can stall for **up to 30 minutes** during kernel updates or first boot. This creates an unacceptable user experience where the system appears frozen or the boot process hangs with no visible progress.
- **Build dependencies** — DKMS requires a full compiler toolchain (`gcc`, `make`, kernel headers) to be installed on the target system, bloating the base installation and increasing attack surface.
- **Failure modes** — DKMS builds can fail silently due to missing headers, incompatible compiler versions, or module source issues, leaving the user without a working driver after a kernel update.

The preferred strategy is **pre-compiled binary kernel modules** that are built in CI alongside each kernel package release. For NVIDIA drivers, this takes the form of packages like `linux-cachyos-nvidia-open` — a pre-compiled NVIDIA open kernel module package that is version-locked to a specific kernel release. When the kernel is updated, the corresponding pre-compiled module package is updated in the repository simultaneously, eliminating the need for on-device compilation entirely.

DKMS is retained as a **fallback mechanism** for:

- Users running custom-compiled kernels where pre-compiled modules are unavailable.
- Niche out-of-tree drivers (e.g., `rtl8812au-dkms`, `broadcom-wl-dkms`) where the user base is too small to justify pre-compiled packaging for every kernel variant.
- Development and testing scenarios where developers need to build modules against modified kernel sources.

The chwd profile system handles this transparently — profiles for common hardware (NVIDIA GPUs) reference the pre-compiled package by default, while profiles for niche hardware reference the DKMS variant. The user never needs to make this decision manually.
