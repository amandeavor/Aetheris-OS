# Installer Design — VelocityInstall

## Current State of the Art

Modern Linux installers fall into two broad camps: heavyweight frameworks designed for enterprise distributions (Anaconda, Calamares) and lightweight native tools that sacrifice UX for minimal footprint. VelocityInstall targets a third path — web-quality UI with native performance and a RAM ceiling below 40 MB.

### Installer Comparison

| Installer | Toolkit | Peak RAM | Partition Editor | Encryption | Scriptable | Notes |
|---|---|---|---|---|---|---|
| **Calamares** | Qt5 / KPMcore | 250–450 MB | KPMcore (C++) | LUKS1 only, no TPM | YAML modules | Modular but heavy; QtWebEngine alone pulls ~120 MB |
| **Anaconda** | GTK 4 / Blivet | 600 MB peak | Blivet (Python) | LUKS2 + Clevis | Kickstart files | Full-featured but absurd memory footprint; Python GI overhead |
| **Jade-GUI** | GTK 4 / libhelium | ~80 MB | Manual shell calls | Basic LUKS1 | None | Crystal Linux project; limited hardware probing, no TPM |
| **abRoot / Sysinstall** | TUI / CLI | ~15 MB | Direct fdisk/sfdisk | None | Shell scripts | Vanilla Void / Alpine style; no GUI, no encryption wizard |
| **Tauri / Rust** | WebKitGTK + Svelte | **< 40 MB** | Rust + libparted FFI | LUKS2 + TPM2 | TOML preseed | VelocityInstall target — web UI quality at native cost |

Calamares and Anaconda are completely ruled out for Aetheris OS. Calamares drags in the entire Qt5 runtime including QtWebEngine (~120 MB alone), pushing peak memory to 250–450 MB depending on module configuration. Anaconda is worse — Blivet's Python storage stack combined with GTK 4 introspection bindings regularly peaks at 600 MB, making it unusable in a 512 MB live environment. Jade-GUI is closer to the target but lacks TPM2 support and relies on fragile shell calls for partitioning rather than a proper library binding.

### Partition Layout Strategies

#### EXT4 Simple Layout

The simplest supported configuration. A single GPT partition table with:

- **ESP** (`/boot/efi`) — 512 MB, FAT32
- **Root** (`/`) — remaining space, EXT4
- **Swap** — sized to RAM or 4 GB minimum, as a partition (not a file, to avoid btrfs CoW overhead on swapfiles)

This layout is offered as the default for users who select "Simple" in the partition screen. No subvolume management, no snapshots, no rollback. Suitable for low-disk or single-purpose machines.

#### Btrfs with Subvolumes + Snapper

The recommended layout for full system rollback support:

- **ESP** (`/boot/efi`) — 512 MB, FAT32
- **Btrfs pool** — remaining disk, with the following subvolumes:
  - `@root` → mounted at `/`
  - `@home` → mounted at `/home`
  - `@snapshots` → mounted at `/.snapshots`
  - `@log` → mounted at `/var/log` (excluded from snapshots to prevent log pollution in rollbacks)
  - `@cache` → mounted at `/var/cache` (excluded from snapshots)
- **Swap partition** — separate partition, not a swapfile (Btrfs swapfiles require `nocow` attribute and cannot span multiple devices)

Snapper is configured automatically at first boot with the following policy:

- **Timeline snapshots**: hourly, keeping 5 hourly / 3 daily / 1 weekly
- **Pre/post snapshots**: triggered by `xbps-install` and `xbps-remove` transactions via a custom Snapper plugin
- Rollback is performed via `snapper rollback` which swaps the `@root` subvolume pointer, followed by a reboot

Mount options for all Btrfs subvolumes: `compress=zstd:1,noatime,ssd` (the `ssd` flag is auto-detected and omitted on rotational drives).

#### LUKS2 + TPM2 — Challenges on Void Linux

Full-disk encryption uses LUKS2 with Argon2id as the key derivation function. The primary challenge is TPM2 auto-unlock on Void Linux, which lacks systemd by default.

**Clevis is broken on Void.** Clevis (the standard Tang/TPM2 client for auto-unlock) relies on bash-specific syntax throughout its scripts. Void's default shell is `dash`, and Clevis scripts fail with syntax errors under dash due to:

- `[[ ]]` double-bracket conditionals (bash-only)
- Process substitution `<()` syntax
- `declare -A` associative arrays
- Various bashisms in `clevis-luks-bind` and `clevis-decrypt-tpm2`

Patching Clevis for POSIX compliance is possible but creates a permanent maintenance fork. This is not sustainable.

**Missing `DRACUT_SYSTEMD`.** Even if Clevis were fixed, the dracut module `clevis-pin-tpm2` expects `DRACUT_SYSTEMD=1` to be set, which enables the `systemd-cryptsetup` generator in the initramfs. On Void (which uses runit, not systemd), this variable is unset. The dracut module falls back to a manual `cryptsetup open` call that does not know how to contact the TPM2 device via `tpm2-tools`.

**The bypass: `systemd-cryptenroll` + `systemd-boot-efistub`.** Aetheris OS resolves this by using a targeted subset of systemd tooling without adopting systemd as the init system:

1. **`systemd-cryptenroll`** is used at install time (and only at install time) to bind a LUKS2 token to the TPM2 chip. It writes a `systemd-tpm2` token directly into the LUKS2 header JSON metadata. This token stores the PCR policy, the public portion of the sealing key, and the encrypted blob.

2. **`systemd-cryptsetup`** is included in the dracut initramfs (via the `systemd-cryptsetup` dracut module) to perform auto-unlock at boot. This reads the LUKS2 token, contacts the TPM2 via `libtss2`, evaluates the PCR policy, and unseals the volume key — all without Clevis.

3. **`systemd-boot` EFI stub** (or a Unified Kernel Image built by dracut) is used as the bootloader. This ensures the boot chain is measured into PCR registers before the initramfs runs, which is required for the TPM2 policy to validate.

4. After the root filesystem is unlocked and mounted, **runit takes over as PID 1**. No systemd services run. The only systemd components present are the cryptsetup generator in the initramfs and the boot stub — both execute before runit starts.

This approach gives Aetheris OS full LUKS2 + TPM2 auto-unlock without adopting systemd as the service manager.

## Recommended Technology Stack

| Component | Technology | Rationale |
|---|---|---|
| **UI Framework** | Tauri v2 + WebKitGTK | Single WebKitGTK process, no Chromium. Set `WEBKIT_CACHE_MODEL_DOCUMENT_VIEWER` to disable speculative caching — drops idle memory from ~90 MB to under 30 MB. Svelte frontend compiles to vanilla DOM operations, no virtual DOM overhead. |
| **Frontend** | Svelte (compiled) | Zero-runtime framework. Compiles components to imperative DOM mutations. Bundle size under 50 KB gzipped for the entire installer UI. |
| **Partitioning Engine** | Rust + libparted FFI | Direct Rust bindings to `libparted` via `parted-rs` crate. No subprocess forking (`parted` CLI is never called). Supports GPT, MBR, resize, alignment, and filesystem creation. |
| **Encryption** | systemd-cryptenroll + TPM2 | Binds LUKS2 volumes to TPM2 PCR 7 (Secure Boot state) + PCR 15 (custom initramfs measurement). Argon2id KDF for passphrase fallback. |
| **Bootloader** | systemd-boot EFI stub or UKI via dracut | EFI stub for standard installs. Unified Kernel Image (UKI) for locked-down Secure Boot configurations — kernel + initramfs + cmdline + OS release signed as a single PE binary. |
| **Hardware Probing** | libpci bindings + TOML driver profiles | Rust bindings to `libpci` enumerate PCI devices at install time. Each device is matched against TOML driver profile files in `/usr/share/aetheris/drivers/` to determine required firmware packages, kernel modules, and known issues. |
| **Configuration** | TOML | All installer configuration, preseed files, and driver profiles use TOML. No YAML (avoids the Norway problem), no JSON (no comments). |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LIVE USB SYSTEM                              │
│                                                                     │
│  ┌───────────────┐    IPC (Tauri)    ┌────────────────────────────┐ │
│  │ TAURI FRONTEND │◄────────────────►│     TAURI BACKEND (Rust)   │ │
│  │   (Svelte)     │                  │                            │ │
│  │                │                  │  ┌──────────────────────┐  │ │
│  │  ┌───────────┐ │                  │  │  Partitioning Engine │  │ │
│  │  │ Welcome   │ │                  │  │  (libparted FFI)     │  │ │
│  │  ├───────────┤ │                  │  ├──────────────────────┤  │ │
│  │  │ Partition │ │   Tauri Commands │  │  Encryption Manager  │  │ │
│  │  │ Layout    │ │◄────────────────►│  │  (systemd-cryptenroll│  │ │
│  │  ├───────────┤ │                  │  │   + LUKS2 API)       │  │ │
│  │  │ Dual-Boot │ │                  │  ├──────────────────────┤  │ │
│  │  │ Detection │ │                  │  │  Hardware Prober     │  │ │
│  │  ├───────────┤ │   Event Stream   │  │  (libpci + TOML      │  │ │
│  │  │ User +    │ │◄────────────────►│  │   driver profiles)   │  │ │
│  │  │ Locale    │ │                  │  ├──────────────────────┤  │ │
│  │  ├───────────┤ │                  │  │  Install Executor    │  │ │
│  │  │ Progress  │ │                  │  │  (xbps-install,      │  │ │
│  │  │ + Logs    │ │                  │  │   file copy, chroot  │  │ │
│  │  ├───────────┤ │                  │  │   configuration)     │  │ │
│  │  │ Reboot    │ │                  │  ├──────────────────────┤  │ │
│  │  └───────────┘ │                  │  │  Preseed Parser      │  │ │
│  │                │                  │  │  (/boot/autoinstall   │  │ │
│  │  WebKitGTK     │                  │  │        .toml)        │  │ │
│  │  CACHE_MODEL=  │                  │  └──────────────────────┘  │ │
│  │  DOCUMENT_     │                  │                            │ │
│  │  VIEWER        │                  │  Total Backend RAM: <10 MB │ │
│  └───────────────┘                  └────────────────────────────┘ │
│         │                                        │                  │
│         │            Total RAM: < 40 MB          │                  │
│         └────────────────────────────────────────┘                  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  TARGET SYSTEM DISK STRATEGIES               │   │
│  │                                                              │   │
│  │  Strategy A: EXT4 Simple                                     │   │
│  │  ┌──────┐ ┌────────────────────────────┐ ┌──────┐           │   │
│  │  │ ESP  │ │       / (EXT4)             │ │ swap │           │   │
│  │  │512 MB│ │                            │ │      │           │   │
│  │  └──────┘ └────────────────────────────┘ └──────┘           │   │
│  │                                                              │   │
│  │  Strategy B: Btrfs + Subvolumes + Snapper                    │   │
│  │  ┌──────┐ ┌────────────────────────────────────┐ ┌──────┐   │   │
│  │  │ ESP  │ │  Btrfs pool                        │ │ swap │   │   │
│  │  │512 MB│ │  @root → /                         │ │      │   │   │
│  │  │      │ │  @home → /home                     │ │      │   │   │
│  │  │      │ │  @snapshots → /.snapshots          │ │      │   │   │
│  │  │      │ │  @log → /var/log                   │ │      │   │   │
│  │  │      │ │  @cache → /var/cache               │ │      │   │   │
│  │  └──────┘ └────────────────────────────────────┘ └──────┘   │   │
│  │                                                              │   │
│  │  Strategy C: LUKS2 + TPM2 (wraps Strategy A or B)           │   │
│  │  ┌──────┐ ┌────────────────────────────────────┐ ┌──────┐   │   │
│  │  │ ESP  │ │  LUKS2 container                   │ │ swap │   │   │
│  │  │512 MB│ │  ┌──────────────────────────────┐  │ │(enc) │   │   │
│  │  │(un-  │ │  │  EXT4 or Btrfs pool          │  │ │      │   │   │
│  │  │ enc) │ │  │  (same layouts as above)     │  │ │      │   │   │
│  │  │      │ │  └──────────────────────────────┘  │ │      │   │   │
│  │  │      │ │  Token: systemd-tpm2              │ │      │   │   │
│  │  │      │ │  PCR: 7 (SecureBoot) + 15 (initrd)│ │      │   │   │
│  │  └──────┘ └────────────────────────────────────┘ └──────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Roadmap

### Phase 1 — Rapid Live Boot

**Goal:** Boot from USB to installer UI in under 20 seconds.

| Component | Implementation |
|---|---|
| **Filesystem image** | zstd-compressed squashfs (`mksquashfs -comp zstd -Xcompression-level 19`). Zstd decompression is 3–5× faster than xz at comparable ratios. |
| **Overlay stack** | `overlayfs` with squashfs as the read-only lower layer, tmpfs as the upper layer. All live-session writes go to RAM and are discarded on reboot. |
| **tmpfs sizing** | Upper layer capped at 256 MB by default. Increased to 50% of RAM on systems with > 2 GB. |
| **Boot sequence** | GRUB/systemd-boot → kernel + initramfs (dracut, zstd-compressed) → mount squashfs → mount overlayfs → start runit → launch Tauri installer |
| **Target metric** | Cold boot to "Welcome" screen in ≤ 20 seconds on NVMe, ≤ 35 seconds on USB 2.0 flash drive. |

Kernel command line includes `quiet splash` and a lightweight Plymouth theme (or direct KMS framebuffer) to mask early boot.

### Phase 2 — Partitioning, LUKS2, TPM2 Enrolment

**Goal:** Reliable disk setup including dual-boot with Windows.

| Component | Implementation |
|---|---|
| **Partition creation** | Rust libparted FFI — create GPT table, ESP, root, swap. Alignment enforced to 1 MiB boundaries. |
| **Filesystem formatting** | Direct `mkfs.ext4` / `mkfs.btrfs` / `mkfs.vfat` calls from Rust via `Command::new()` with output captured and streamed to the frontend progress panel. |
| **LUKS2 setup** | `cryptsetup luksFormat --type luks2 --pbkdf argon2id` with tuned memory/iteration parameters for the target hardware class. |
| **TPM2 enrolment** | `systemd-cryptenroll --tpm2-device=auto --tpm2-pcrs=7+15` binds the volume key to the current Secure Boot and initramfs state. |
| **Windows dual-boot** | `ntfsresize` shrinks the existing Windows NTFS partition. Before resizing, the installer checks for BitLocker encryption via `manage-bde -status` parsing (or direct NTFS metadata inspection). If BitLocker is active, the installer displays a warning and blocks the resize — shrinking a BitLocker volume without prior suspension corrupts it. |
| **Partition map UI** | Visual block diagram rendered in the Svelte frontend. Drag handles for resize. Color-coded by filesystem type. Real-time size validation (minimum 20 GB for Aetheris root, minimum 40 GB for Windows to remain functional). |

### Phase 3 — Hardware Probing + Firmware Warnings

**Goal:** Detect hardware issues before installation begins and surface actionable warnings.

| Component | Implementation |
|---|---|
| **PCI enumeration** | Rust `libpci` bindings scan all PCI devices. Each device's vendor:product ID is matched against TOML driver profiles in `/usr/share/aetheris/drivers/`. |
| **GPU detection** | Identify NVIDIA (proprietary driver required), AMD (amdgpu, firmware blobs), Intel (i915, GuC/HuC firmware). Display warning if the detected GPU has no available driver in the live image. |
| **WiFi/BT firmware** | Check for missing firmware blobs (e.g., `iwlwifi`, `ath11k`, `brcmfmac`). If the WiFi adapter requires firmware not present on the live image, warn the user and offer an Ethernet fallback or USB firmware loading. |
| **UEFI Secure Boot** | Detect Secure Boot state via `efivarfs`. If Secure Boot is enabled and the installed kernel is unsigned, warn about boot failure. Offer to configure `sbctl` or disable Secure Boot guidance. |
| **Display warnings** | Full-screen modal in the installer UI with a severity-coded list: 🔴 Critical (will prevent boot), 🟡 Warning (degraded experience), 🟢 Info (optimal driver available). User can proceed with acknowledged warnings. |

Driver profile TOML format example:

```toml
[device]
vendor = "10de"        # NVIDIA
product_range = "2200-22ff"  # RTX 30xx series
driver = "nvidia"
packages = ["nvidia", "nvidia-libs-32bit"]
firmware = []
notes = "Requires proprietary driver. Nouveau lacks reclocking."
severity = "critical"
```

### Phase 4 — Unattended Install via `/boot/autoinstall.toml`

**Goal:** OEM and enterprise deployments with zero user interaction.

The installer checks for `/boot/autoinstall.toml` (or `autoinstall.toml` on the root of the live USB) at launch. If found, it skips the GUI entirely and executes a fully automated installation.

Preseed file format:

```toml
[install]
mode = "unattended"
target_disk = "/dev/sda"            # or "auto" for largest disk
partition_strategy = "btrfs"        # "ext4-simple" | "btrfs" | "btrfs-encrypted"
encryption = true
encryption_passphrase = ""          # empty = TPM2-only, no passphrase fallback
locale = "en_US.UTF-8"
timezone = "America/New_York"
keyboard = "us"

[user]
username = "aetheris"
fullname = "Aetheris User"
password_hash = "$6$rounds=10000$..."   # SHA-512 hash
groups = ["wheel", "video", "audio", "input"]
autologin = true

[packages]
additional = ["firefox", "thunderbird", "libreoffice"]
remove = []

[network]
hostname = "aetheris-workstation"
# DHCP by default; static config optional

[oem]
branding = "AetherisOS"
hide_manufacturer = false
first_boot_oobe = true              # launch OOBE wizard on first user login
```

The preseed parser validates all fields before beginning installation. Invalid configurations produce a JSON error report written to `/tmp/autoinstall-error.json` and the installer halts with a TUI error screen (no GUI required for error display).

## Trade-off Analysis

### Filesystem Confusion Attack and PCR 15 Mitigation

**The attack:** A filesystem confusion attack occurs when an adversary replaces the initramfs on the unencrypted ESP with a modified version. The modified initramfs contains a patched `cryptsetup` that intercepts the LUKS passphrase, stores it (e.g., in an unused disk sector or via network exfiltration), and then proceeds with normal boot. The user sees a normal boot sequence and does not detect the compromise.

If TPM2 auto-unlock is bound only to **PCR 7** (Secure Boot policy), this attack succeeds because:

- PCR 7 measures the Secure Boot keys and the first-stage bootloader
- PCR 7 does **not** measure the initramfs contents
- A modified initramfs passes PCR 7 validation as long as the bootloader and Secure Boot state are unchanged
- The TPM2 unseals the volume key to the compromised initramfs, which now has access to the decrypted root filesystem

**The mitigation — PCR 15:** Aetheris OS binds TPM2 auto-unlock to both PCR 7 **and** PCR 15.

- **PCR 15** is a "user-defined" PCR that dracut extends with a measurement of the initramfs image during early boot
- When dracut builds a Unified Kernel Image (UKI), the initramfs hash is embedded in the `.initrd` PE section, and the entire UKI is measured into PCR 15
- If an attacker replaces the initramfs, the PCR 15 value at boot time will not match the PCR 15 value sealed in the TPM2 policy
- The TPM2 refuses to unseal the volume key → the system falls back to passphrase prompt → the user knows something is wrong

**Residual risk:** PCR 15 mitigation requires Secure Boot to be enabled (otherwise the attacker can replace the entire UKI, including the measurement code). It also requires that the UKI is signed with a key enrolled in the UEFI firmware. Without both, the attack surface reverts to PCR 7 only.

**Trade-off:** Binding to PCR 15 means that any kernel or initramfs update changes the PCR 15 value, which invalidates the TPM2 seal. After every kernel update, `systemd-cryptenroll` must re-enroll the TPM2 token with the new PCR values. VelocityInstall configures a dracut post-install hook that automatically runs `systemd-cryptenroll --wipe-slot=tpm2 --tpm2-device=auto --tpm2-pcrs=7+15` after every kernel installation. If this hook fails (e.g., during a power loss mid-update), the user must enter their LUKS passphrase manually at next boot — the system is not bricked, only degraded to manual unlock.

## Open Research Questions

### Secure UEFI Boot Variable Signing in Non-systemd Live Environments

The core unresolved question: **how to safely write signed UEFI boot variables from a live environment that does not run systemd as PID 1.**

The specific challenges:

1. **`bootctl install`** (from systemd-boot) expects systemd to be the active init system. On the Void-based live USB (runit as PID 1), `bootctl` may fail or produce incorrect EFI variable entries because it queries `systemd-logind` for the boot ID and active ESP mount.

2. **`sbctl`** (Secure Boot key manager) can generate and enroll custom Secure Boot keys, but signing UKIs requires that the signing key be stored securely. In a live environment, the signing key exists in tmpfs (RAM-backed) and is lost on reboot. For OEM scenarios, the key must be pre-provisioned on the live USB — this creates a key distribution problem.

3. **`efibootmgr`** can write boot entries directly to UEFI NVRAM, but it does not handle signing. The signed UKI must be placed on the ESP with the correct path, and the NVRAM entry must point to it. If Secure Boot is enforced and the UKI signature does not chain to a trusted key, the system will not boot.

4. **Non-systemd initramfs measurement:** Dracut on Void does not include the `systemd-pcrphase` module, which is responsible for extending PCR 11/15 at defined boot phases. Without this module, PCR 15 contains only the UEFI firmware's default measurements, not the initramfs-specific extensions. A custom dracut module must be written to replicate this measurement using `tpm2-tools` directly (via `tpm2_pcrextend`).

Current status: Phase 2 of the roadmap uses `systemd-cryptenroll` and `systemd-boot` as standalone binaries (not as systemd services). This works for the encryption and bootloader setup. The open question is whether the UEFI variable writing and Secure Boot signing can be fully automated without pulling in additional systemd runtime dependencies. If not, the live USB may need a minimal `systemd-boot-efistub` environment that runs only during the installation phase and is never used as PID 1.

This question blocks full Secure Boot automation for Phase 4 (unattended install). Manual Secure Boot key enrollment via UEFI firmware setup remains the fallback.
