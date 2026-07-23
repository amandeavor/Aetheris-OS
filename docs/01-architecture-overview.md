# Architecture Overview

Master architecture synthesis for Aetheris OS, combining kernel, desktop, installer, OOBE, store, gaming, security, and brand decisions.

## 1. Installer — VelocityInstall

**Stack:** Tauri v2 + Svelte + Rust backend + WebKitGTK (cache stripped via `WEBKIT_CACHE_MODEL_DOCUMENT_VIEWER`) — total RAM under 40MB, runs fine on 512MB live environments.

### Key Decisions

- Calamares (250–450MB) and Anaconda (600MB peak) are completely ruled out
- Btrfs with `@root` / `@home` / `@snapshots` subvolumes for rollback support
- LUKS2 + TPM2 via `systemd-cryptenroll` bound to PCR 7 + PCR 15 — mitigates filesystem confusion attacks
- Clevis is broken on Void (bashisms fail under dash) — use `systemd-boot-efistub` instead
- Live USB boots via zstd squashfs + overlayfs + tmpfs — target: under 20 seconds to installer UI
- Windows dual-boot: `ntfsresize` for partition shrinking + BitLocker detection warning
- OEM silent mode via `/boot/autoinstall.toml` preseed file

### Screen Flow

1. Welcome + hardware warning (unsupported GPU / missing WiFi firmware)
2. Partition layout (Simple / Advanced / Encrypted toggle)
3. Dual-boot detection (Windows found → safe resize offer)
4. User + locale setup
5. Live installation with animated progress + log stream
6. Reboot

## 2. App Store — VelocityStore

**Stack:** Tauri v2 + Svelte + direct libxbps Rust FFI + Flatpak override parser — idle RAM under 35MB.

### Key Decisions

- GNOME Software (150MB), Discover (120MB), Bauh (110MB) all ruled out
- Svelte chosen over React/Vue — compiles to vanilla JS DOM ops, no virtual DOM overhead
- libxbps bound directly via Rust FFI — no subprocess forking, transactions stream progress via async Tauri channels
- Flatpak permissions managed via direct INI parser writing to `~/.local/share/flatpak/overrides/` — no Flatseal needed, it's built in
- AppStream metadata + ODRS reviews stored in local SQLite — search under 5ms
- Delta updates via xbps native delta + Flatpak OCI static deltas for metered connections
- Windows apps installable directly from store via Bottles CLI deep integration — one-click Wine prefix creation

### UI Layout

- **Home:** Featured curated grid + category rows (like elementary AppCenter)
- **Search:** Instant results as you type from SQLite index
- **App Detail:** Screenshots, description, ODRS rating, permission toggles, install button
- **Updates:** Delta size shown, one-click update all

## 3. Gaming — VelocityGame Mode

**Stack:** Labwc + nested Gamescope + ntsync + MangoHud + GameMode daemon under runit

### Key Decisions

- VRR via `amdgpu.freesync_video=1` kernel flag + `wlr-output-management` protocol toggle in Labwc `rc.xml`
- HDR: `color-management-v1` protocol merged into Wayland core but adoption incomplete — Gamescope bridges the gap via Vulkan Wide Color Gamut tonemapping
- Input latency: `tearing-control-v1` enables async page flips — drops latency to under 2ms (vs 16.7ms with vsync)
- ntsync kernel driver replaces slow wineserver socket queries with kernel-level fast mutexes — major FPS boost for Wine/Proton games
- GameMode runit service: sets CPU governor to `performance`, sets `compaction_proactiveness=0` to kill background memory compaction during gameplay
- Transparent Hugepages set to `always` on game launch, restored on exit
- `/usr/bin/gamemode-run` wrapper auto-spawns nested Gamescope with FSR + MangoHud
- System tray toggle: Low-latency mode (tearing allowed) vs Cinematic mode (vsync, smooth) — switchable per-app

## 4. Security — VelocityShield

**Stack:** AppArmor + hardened sysctl + nftables + signed UKI + TPM2 + Flatpak strict overrides + Phylax Polkit agent

### Key Decisions

- SELinux ruled out — 217 LSM hooks, up to 87% penalty on file open ops, 85MB+ RAM — completely impractical
- AppArmor chosen — 80 hooks, under 10MB overhead, human-readable path-centric profiles
- Landlock too immature for global desktop policy management
- Flatpak global overrides in `/var/lib/flatpak/overrides/global` block `~/.ssh`, `/sys`, host sockets by default
- Signed UKI (kernel + initramfs + bootloader stub in one EFI binary) — signed with custom MOK, prevents initramfs tampering
- nftables default-drop inbound firewall — only established/loopback/ICMP allowed
- `kernel.yama.ptrace_scope = 2` system-wide, but Steam/Proton get `cap_sys_ptrace` capability wrapper to avoid breaking debuggers
- Phylax Polkit Agent (GTK4 + Rust) — zeroizes password memory buffers immediately after use
- XBPS rejects unsigned repositories by default
- fwupd for firmware updates, MAC address randomisation for WiFi

### Hardened sysctl Defaults

- Restrict dmesg to root
- Hide kernel pointers
- Disable core dumps
- Strict ptrace limits
- Restrict unprivileged user namespaces

## 5. OOBE — VelocitySetup

**Stack:** Native GTK4 + Libadwaita (not Tauri — saves 29MB, lands at ~16MB total) running as sole fullscreen Wayland client on first boot under Labwc

### Key Decisions

- GNOME Initial Setup (90MB, 3.5s) and KDE Welcome (110MB, 4.1s) ruled out
- Custom GTK4 wizard launches in under 0.4 seconds on 1GB RAM
- chwd hardware detection runs in background during locale/account screens — WiFi + GPU drivers installed silently, no user interruption
- Background chwd throttled with `ionice -c 3` + `nice -n 19` so slow storage doesn't lag the UI
- Theme compiler writes to GTK4, Qt6, and Labwc configs simultaneously from one JSON token file

### 6-Screen Flow

1. **Welcome + Accessibility** — Orca screen reader, large text, colour blindness filters — available immediately before anything else
2. **Language / Keyboard / Timezone** — non-blocking geographic map widget
3. **WiFi Setup** — async network scan, card layout, password strength indicator
4. **Account Creation** — password zeroized from memory after use
5. **Privacy + Telemetry** — Apple-style privacy nutrition labels, prominent opt-out toggle
6. **Theme Selection + Done** — Light / Dark / Dynamic preview, instant live preview compiles tokens system-wide

### Brand Identity

- Dark base: `#0F172A` (deep slate)
- Light base: `#F1F5F9` (soft silver)
- Accent: `#2563EB` (electric cobalt) — *note: later replaced by Prismatic Ultraviolet palette*
- UI font: Inter — *note: later replaced by Nacelle*
- Terminal font: JetBrains Mono — *note: later replaced by Geist Mono*
- Animation: Spring physics — damping ratio ζ=0.8, natural frequency ωₙ=12 rad/s — fluid without overshoot

## Combined Roadmap

| Phase | Focus | Key Milestones |
|-------|-------|----------------|
| P1 | Kernel + Base | Void + runit + BORE kernel + ZRAM + chwd driver engine |
| P2 | Desktop Shell | Labwc + sfwbar + nohang + VelocityMind preloader |
| P3 | Installer | VelocityInstall (Tauri/Rust) + LUKS2/TPM2 + dual-boot |
| P4 | OOBE | VelocitySetup (GTK4) + background chwd + theme compiler |
| P5 | App Store | VelocityStore (Tauri/Svelte) + libxbps FFI + Flatpak |
| P6 | Gaming | ntsync + Gamescope + GameMode runit + VRR/HDR |
| P7 | Security | AppArmor profiles + signed UKI + nftables + Phylax |
| P8 | QA + Benchmarks | Phoronix suite on 1GB + 4GB hardware targets |
