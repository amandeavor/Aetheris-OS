# Wayland Gaming Optimisation — VelocityGame Mode

## Current State of the Art

Wayland gaming performance has advanced significantly, yet achieving stable, low-latency rendering on diverse display hardware requires careful manual configuration.

**Variable Refresh Rate (VRR):** In wlroots-based compositors like Labwc, VRR support relies on direct configurations in the compositor's layout configuration (`rc.xml`) or programmatic control via the `wlr-output-management-unstable-v1` protocol. System-level VRR requires enabling appropriate DRM/KMS flags in the kernel boot command line (such as `amdgpu.freesync_video=1`).

**High Dynamic Range (HDR):** The `color-management-v1` protocol has been merged into Wayland core, but widespread application adoption is incomplete. Gamescope bridges this gap by acting as a micro-compositor. It handles HDR color-space translation and tonemapping, outputting HDR formats to the display via Vulkan's Wide Color Gamut extensions.

**Latency Minimization:** Standard Wayland desktop composition uses double or triple buffering, adding up to 16.7 milliseconds of input delay at 60Hz. Under modern compositors, this delay is bypassed using the `tearing-control-v1` protocol. This allows games to request asynchronous page-flips (`presentation_hint = async`), presenting finished frames instantly with minimal latency.

**System Daemons and Priorities:** GameMode (developed by Feral Interactive) dynamically adjusts CPU governors, GPU clocks, and process scheduling priorities. However, running these optimizations under a non-systemd init system like runit requires writing custom scripts to manage process states without systemd-slice variables.

The table below summarizes the technical capabilities of modern Linux gaming compositing paths:

| Optimization Layer | Compositor Path | Input Latency Impact | HDR Color Support | Resolution Upscaling Mechanism |
|---|---|---|---|---|
| Standard Desktop | Native Labwc (V-Sync Enforced) | High (+16.7ms at 60Hz) | No (SDR sRGB Clamped) | None (Bilinear display stretch) |
| Asynchronous Tearing | Labwc + `tearing-control-v1` | Extremely Low (<2ms) | No | None |
| Nested Gamescope | Gamescope nested in Labwc | Low (+4ms compositor hop) | Yes (via Vulkan HDR layers) | AMD FSR / Integer Scaling |
| Direct Scanout | Labwc (Fullscreen Bypass) | Extremely Low (<2ms) | No | None |

## Recommended Technology Stack

The performance pipeline is engineered to deliver zero-overhead, bare-metal gaming speeds on modern and legacy GPUs.

**Display Compositor: Labwc.** It acts as a lightweight, stacked Wayland compositor built on wlroots, keeping memory usage minimal.

**Micro-Compositor: Gamescope.** This micro-compositor runs games in a dedicated, isolated buffer. This allows it to enforce precise frame pacing, AMD FSR upscaling, and native HDR output.

**Synchronization Engine:** The fast `ntsync` kernel driver, which implements Windows NT synchronization primitives. It is enabled on pre-6.14 kernels via the `ntsync-kernel-dkms` package. This replaces slow userspace wineserver socket queries with kernel-level fast mutex locks, reducing context switches and boosting frame rates.

**Performance Monitoring: MangoHud.** MangoHud is deployed as a pre-configured, system-wide HUD with a toggle option in the system tray.

**Scheduling Supervisor: GameMode daemon.** This is integrated with Void Linux's runit init system via a custom service directory.

To register and supervise the GameMode daemon under runit, the system deploys a custom service directory at `/etc/sv/gamemoded/run`:

```bash
#!/bin/sh
exec 2>&1
# Enforce the high-performance CPU governor on launch
echo "performance" > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
# Disable proactive memory compaction to prevent in-game latency spikes
echo 0 > /proc/sys/vm/compaction_proactiveness
# Supervise the execution of gamemoded in foreground
exec gamemoded -f
```

## Architecture Diagram

```
+---------------------------------------------------------------------------------+
|                                WAYLAND GAME RUNTIME                             |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  |                              VULKAN CLIENT (GAME)                         |  |
|  |  +---------------------+  +-------------------------+  +---------------+  |  |
|  |  | Game Render Loop    |  | SDL3 / Steam Input      |  | MangoHud      |  |  |
|  |  | (Vulkan API)        |  | (Direct Input Polling)  |  | Overlay       |  |  |
|  |  +----------+----------+  +------------+------------+  +-------+-------+  |  |
|  +-------------|--------------------------|-----------------------|----------+  |
|                | KMS Framebuffer          | Input Event           | Render      |
|                | Submission               v (evdev)               | Hook        |
|                v                                                  |             |
|  +-------------+--------------------------------------------------v----------+  |
|  |                       NESTED GAMESCOPE MICRO-COMPOSITOR                   |  |
|  |  +---------------------+  +-------------------------+  +---------------+  |  |
|  |  | FSR Scaling Engine  |  | Frame-Pacing Queue      |  | HDR Map       |  |  |
|  |  +----------+----------+  +------------+------------+  +---------------+  |  |
|  +-------------|--------------------------|----------------------------------+  |
|                | wl_surface (with tearing-v1)                                   |
|                v                                                                |
|  +-------------+-------------------------------------------------------------+  |
|  |                             HOST COMPOSITOR (LABWC)                       |  |
|  |  +---------------------------------------------------------------------+  |  |
|  |  | wlroots backend (Direct Scanout / DRM Lease Interfaces)             |  |  |
|  |  +---------------------------------------------------------------------+  |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
```

## Implementation Roadmap

**Phase 1: Out-of-tree ntsync Compilation and DKMS Setup (Milestone 1)**
Package the `ntsync` kernel module as a DKMS package for the system. Write configuration files to `/etc/modules-load.d/ntsync.conf` to automatically load the module on boot.

**Phase 2: Labwc Configuration for VRR and Direct Scanout (Milestone 2)**
Update the Labwc `rc.xml` configuration to support adaptive synchronization on compatible monitors. Enable direct scanout hooks inside the compositor layout engine, allowing full-screen games to bypass desktop compositing entirely.

**Phase 3: Dual-Compositor Gamescope Setup (Milestone 3)**
Set up a system-wide wrapper script (`/usr/bin/gamemode-run`) that automatically parses local configuration environments, spawns nested Gamescope containers, and initializes the customized MangoHud performance overlay.

**Phase 4: GameMode Runit Tuning and Memory Locking (Milestone 4)**
Configure the GameMode daemon to trigger transparent hugepages (THP) adjustments (`always` mode) on game startup. Adjust the maximum locked memory limits (`limits.conf`) to allow games to pin critical assets directly into physical RAM using `mlockall`.

## Trade-off Analysis

While enabling asynchronous page flips via `tearing-control-v1` significantly reduces input latency, it introduces visible horizontal screen tearing. This trade-off is highly beneficial for competitive shooters, but undesirable for cinematic games. The distribution resolves this by exposing a user-configurable profile panel in the system tray, allowing users to toggle tearing-free presentation or low-latency modes per-application.

Transparent hugepages (THP) also present a key trade-off: they reduce page table overhead for heavy memory applications, but can cause latency spikes ("hiccups") during background memory compaction on low-memory systems. To resolve this, the GameMode startup sequence dynamically sets `/proc/sys/vm/compaction_proactiveness` to `0` during game execution, halting background compaction routines and restoring original values on game termination.

## Open Research Questions

Further research is needed to determine how to cleanly manage Wayland explicit sync protocols (`linux-dmabuf-v1` and explicit synchronization options) inside legacy AMD/Nvidia driver stacks without causing composition stalls or thread lockups during rapid fullscreen switches.
