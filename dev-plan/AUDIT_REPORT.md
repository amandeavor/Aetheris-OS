# Aetheris OS Codebase Audit & Gap Analysis

**Original date:** June 19, 2026
**Last reconciled:** 2026-09-01
**Status:** Reconciled with current tree (closes #14)
**Goal:** Track source-presence and known gaps across all 7 Sub-Plans.

> **How to read this file.** This document records whether a sub-plan's spec'd files exist in the repository, plus any known gaps. **Source presence does not imply built, tested, or release-ready.** For runtime/build/test evidence, see [`docs/component-status.md`](../docs/component-status.md), which records the four-tier status (`exists / builds / tested / release-ready`) per component with safe validation paths.

---

## 📊 Summary of Implementation Status

| Sub-Plan | Focus | Status | Present Files / Components | Known Gaps |
|---|---|---|---|---|
| **01** | Kernel & Core | **Source present** | `srcpkgs/linux-aetheris/template`<br>`etc/sv/zram-init/run` & `finish`<br>`etc/sysctl.d/99-aetheris-memory.conf`<br>`etc/nohang/nohang-desktop.conf` | None surfaced by this audit. Build validation: see `docs/component-status.md` row "system overlay". |
| **02** | Desktop Shell | **Source present**, with one **Gap** | `config/labwc/rc.xml` (incl. `<outputs>`/VRR)<br>`config/labwc/rc-fallback.xml`<br>`usr/bin/labwc-wrapper`<br>`config/sfwbar/sfwbar.config`<br>`themes/Prismatic-Obsidian/window-manager/themerc`<br>`config/sfwbar/sfwbar.css` | **Gap**: spring-physics animation timing configurations not found across `.css/.xml/.theme/.lua/.json/.scss`. Implementation issue to be opened after this audit merges. |
| **03** | Windows Comp. | **Source present** | `etc/binfmt.d/win-exec.conf`<br>`usr/share/exec-guard/app_db.json`<br>`usr/bin/exec-guard-wrapper`<br>`usr/bin/exec-guard-sandbox`<br>`usr/share/applications/exec-guard.desktop`<br>`usr/share/applications/exec-guard-msi.desktop`<br>`etc/xdg/mimeapps.list` | — |
| **04** | Driver Mgmt. | **Source present** | `chwd_port/` Rust project (sysfs PCI + USB scan, TOML profiles, chassis detection)<br>`chwd_port/profiles/graphic_drivers.toml`<br>`chwd_port/profiles/wifi_drivers.toml`<br>`chwd_port/src/main.rs` (chassis detect, profile dispatch)<br>`chwd_port/Cargo.toml` (`toml`, `serde` deps) | Runtime match-and-apply validation: see `docs/component-status.md` row `chwd_port`. Matching needs fixture coverage; profile application changes the host. |
| **05** | Preloading | **Source present** | `velocitymind/daemon.c` (SQLite, fanotify, `/tmp/velocitymind.sock`)<br>`etc/sv/velocitymind/run` (runit service) | Benchmark and long-running evidence: see `docs/component-status.md` row `velocitymind`. No concrete gap from this audit. |
| **06** | Tauri Apps | **Source present** | `velocityinstall/` (Tauri v2 + Svelte partition manager, `parted-rs`)<br>`velocitystore/` (Tauri v2 + Svelte app store, libxbps FFI) | Frontend build manifests + destructive-path isolation: see `docs/component-status.md` rows `velocityinstall` / `velocitystore`. No concrete gap from this audit. |
| **07** | Security & OOBE | **Source present** | `etc/apparmor.d/*` (6 profiles: firefox, flatpak, networkmanager, pipewire, steam-aetheris, transmission-gtk)<br>`etc/nftables.conf`<br>`usr/bin/aetheris-uki-sign`<br>`velocitysetup/src/main.rs` (GTK4 + Libadwaita OOBE) | End-to-end first-boot flow: see `docs/component-status.md` row `velocitysetup`. No concrete gap from this audit. |

---

## 🛠️ Tracked Gaps & Resolution Plan

### Sub-Plan 02: Desktop Environment — Spring-Physics Animation Timing
The original Jun 2026 audit called for spring-physics animation timing configurations. A repo-wide search (`grep -rEln 'spring|stiffness|damping'` across `.css/.xml/.theme/.lua/.json/.scss`) returned no matches. An implementation issue will be opened once this audit merges.

### Items previously listed as "Missing / Incomplete" that now exist
The following items were marked missing in the original Jun 2026 audit and have since been added to the repository. They are now reflected under **Source present** above.

- **Sub-Plan 02**: `<outputs>`/VRR block in `config/labwc/rc.xml`; `usr/bin/labwc-wrapper`; `config/labwc/rc-fallback.xml`; `config/sfwbar/sfwbar.config`.
- **Sub-Plan 03**: `usr/share/applications/exec-guard.desktop`; `usr/share/applications/exec-guard-msi.desktop`; `etc/xdg/mimeapps.list`.
- **Sub-Plan 04**: `chwd_port/profiles/graphic_drivers.toml`; `chwd_port/profiles/wifi_drivers.toml`; `toml` and `serde` deps in `Cargo.toml`; profile selection pipeline in `main.rs`.
- **Sub-Plan 05**: `etc/sv/velocitymind/run`; Unix-socket and fanotify wiring in `velocitymind/daemon.c`.
- **Sub-Plan 06**: `velocityinstall/` and `velocitystore/` projects.
- **Sub-Plan 07**: six AppArmor profiles in `etc/apparmor.d/`; `etc/nftables.conf`; `usr/bin/aetheris-uki-sign`; `velocitysetup/src/main.rs`.

---

## See also

- [`dev-plan/DEVELOPMENT_MANIFEST.md`](./DEVELOPMENT_MANIFEST.md) — sub-plan delivery tracking, using the same source-presence semantics.
- [`docs/component-status.md`](../docs/component-status.md) — runtime/build/test/release validation status with safe validation paths.
