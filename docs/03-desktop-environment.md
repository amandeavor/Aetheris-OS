# Lightweight & Aesthetic Desktop Environment

The user interface of a lightweight desktop environment must provide hardware-accelerated animations, rounded corners, and drop shadows while maintaining an idle memory footprint below 200 MB RAM.

The following diagram illustrates the target system idle memory allocation across all core desktop services:

```
┌─────────────────────────────────────────────────────────┐
│            System Idle Memory Allocation                │
│                   Target: < 200 MiB                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Compositor (labwc)                         ~50 MiB     │
│  ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                         │
│  Panel (sfwbar)                             ~12 MiB     │
│  ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                         │
│  Notification Daemon (mako)                  ~8 MiB     │
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                         │
│  Session Manager (greetd)                    ~4 MiB     │
│  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                         │
│  Wallpaper Renderer (swaybg)                 ~6 MiB     │
│  ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                         │
│  App Launcher (fuzzel)                       ~5 MiB     │
│  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                         │
│  Idle Manager (swayidle)                     ~3 MiB     │
│  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                         │
│  Polkit Agent (polkit-gnome)                ~15 MiB     │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                         │
│  D-Bus + XDG Portals                       ~10 MiB     │
│  █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                         │
│  Kernel + System Services (base)          ~100 MiB     │
│  ██████████████████████████████████████████████████░░░  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  TOTAL IDLE FOOTPRINT                     ~213 MiB     │
│  (Desktop services only: ~113 MiB)                      │
└─────────────────────────────────────────────────────────┘
```

---

## Rendering Pipelines and Wayland Compositors

Choosing the correct Wayland compositor is the single most impactful architectural decision for a lightweight desktop environment. The compositor owns the entire rendering pipeline — it controls window placement, animation timing, GPU buffer management, and visual effects like blur and rounded corners. A poor choice here cascades into every layer above it.

The following table compares viable compositor candidates across the dimensions that matter for a resource-constrained, visually refined desktop:

| Desktop Compositor | Base Library | Graphic Backend | Animation Engine | Idle VmRSS Footprint | Visual Aesthetics Capability |
|---|---|---|---|---|---|
| Hyprland | Custom / Aquamarine | OpenGL / Vulkan | Custom physics engine | ≈70 MB | High (rounded corners, shadows, real-time blur) |
| KWin on Wayland | Qt5 / Qt6 framework | OpenGL / Vulkan | Qt Quick / QML pipeline | ≈140 MB | High (KDE Plasma effects, blur, rounded corners) |
| Picom + Openbox | X11 core library | OpenGL / XRender | Basic frame fade | ≈25 MB | Moderate (requires compositing hacks, no native blur) |
| Sway / SwayFX | wlroots | GLES2 | Static / Basic CSS FX | ≈55 MB | Low to Moderate (SwayFX adds rounded corners) |
| Labwc | wlroots | GLES2 | Hardware-synced page flips | ≈50 MB | High (Openbox compatible themes, smooth scaling) |
| Niri | Smithay (Rust) | GLES3 | Spring-physics engine | ≈60 MB | High (optimized xray background blur, scroll layouts) |

### Why Electron and Flutter Are Unviable

Electron-based shells (such as those built on Chromium Embedded Framework) carry a baseline memory cost of 80–150 MB for the runtime alone, before any application logic is loaded. Each Electron window spawns multiple processes — a main process, a GPU process, and at least one renderer process — and these cannot share memory across applications. A desktop shell built on Electron would consume more RAM at idle than the entire target budget for all desktop services combined.

Flutter desktop embeddings suffer from a similar structural problem. The Flutter engine requires its own Skia-based rendering context, a Dart VM isolate, and a platform channel bridge. On Linux, the Flutter engine alone occupies 40–60 MB of resident memory, and it does not integrate with the native Wayland compositor's rendering pipeline. This means the compositor must composite the Flutter surface as an opaque texture, losing the ability to apply per-window effects like blur or rounded corners natively. Flutter also lacks mature support for Wayland protocols such as `wlr-layer-shell`, which is required for panels, overlays, and lock screens.

Both frameworks introduce a JavaScript or Dart garbage collector into the rendering hot path, creating unpredictable frame-time spikes that are incompatible with the 16.6 ms frame budget required for smooth 60 Hz animations.

### Why Labwc Is Optimal

Labwc emerges as the optimal compositor for a lightweight, aesthetically refined desktop for several reinforcing reasons:

1. **Openbox-compatible configuration model.** Labwc reads Openbox XML theme and rc.xml configuration files, providing a mature, well-documented declarative interface for window decorations, keybindings, and workspace behavior. This eliminates the need to invent a custom configuration format or write imperative scripts for basic window management.

2. **wlroots foundation.** By building on wlroots, labwc inherits battle-tested implementations of core Wayland protocols (`xdg-shell`, `wlr-layer-shell`, `xdg-decoration`, `wlr-output-management`) without reimplementing them. The wlroots library is maintained by the Sway project and is the most widely deployed Wayland compositor library in the Linux ecosystem.

3. **Minimal idle footprint.** At approximately 50 MB VmRSS, labwc sits between Picom + Openbox (25 MB, but X11-only and lacking native blur) and Sway (55 MB, but with limited aesthetic capability). It delivers high visual quality at a memory cost that leaves substantial headroom within the 200 MB budget.

4. **Hardware-synced page flips.** Labwc uses direct scanout and hardware page flips when possible, bypassing the GPU composition pipeline entirely for fullscreen applications. This reduces both power consumption and latency.

5. **Server-side decorations with theme support.** Unlike Sway, which delegates all decoration to the client, labwc draws server-side decorations with configurable corner radius, border width, and title bar styling. This ensures visual consistency across all applications, including legacy X11 applications running under XWayland.

The following labwc theme configuration establishes the baseline visual language for AetherisOS window decorations:

```xml
<theme>
  <name>Nordic-Compact</name>
  <cornerRadius>8</cornerRadius>
  <keepBorder>yes</keepBorder>
</theme>
```

This configuration applies an 8-pixel corner radius to all server-side decorated windows and retains a subtle border stroke for visual separation against complex wallpapers. The `Nordic-Compact` theme name references the project's custom Openbox-compatible theme, which defines title bar height, button geometry, and color values in a companion `themerc` file.

---

## Real-Time Blur Optimizations

Background blur is one of the most visually impactful effects a compositor can offer — it creates depth, separates layers, and gives translucent surfaces a polished, frosted-glass appearance. However, traditional implementations of blur are among the most GPU-expensive operations in a compositor's rendering pipeline.

### Traditional Multilayer Compositor Blur

In a conventional compositor blur pipeline, every frame requires the following steps:

1. Render all windows below the blurred surface into a framebuffer.
2. Copy the relevant region of that framebuffer into a texture.
3. Apply a multi-pass Gaussian blur kernel to that texture (typically two passes: horizontal and vertical).
4. Composite the blurred texture behind the translucent surface.
5. Composite the translucent surface on top.

This process must be repeated for every blurred surface, and the cost scales linearly with the number of overlapping blurred windows. On integrated GPUs — the primary target for a lightweight OS — this can consume 30–50% of the GPU's fragment shader capacity at 60 Hz.

```
Traditional Multilayer Blur (per frame)
┌─────────────────────────────────────────────────────┐
│  Step 1: Render ALL layers below blurred window     │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐         │
│  │ Wallpaper │ │ Window A  │ │ Window B  │         │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘         │
│        └──────────────┼──────────────┘               │
│                       ▼                              │
│         ┌─────────────────────────┐                  │
│         │  Composite into FBO     │                  │
│         │  (full resolution)      │                  │
│         └────────────┬────────────┘                  │
│                      ▼                               │
│         ┌─────────────────────────┐                  │
│         │  Copy region to texture │                  │
│         └────────────┬────────────┘                  │
│                      ▼                               │
│         ┌─────────────────────────┐                  │
│         │  Gaussian Blur Pass 1   │  ← Horizontal   │
│         │  (N×M texture samples)  │                  │
│         └────────────┬────────────┘                  │
│                      ▼                               │
│         ┌─────────────────────────┐                  │
│         │  Gaussian Blur Pass 2   │  ← Vertical     │
│         │  (N×M texture samples)  │                  │
│         └────────────┬────────────┘                  │
│                      ▼                               │
│         ┌─────────────────────────┐                  │
│         │  Composite blurred tex  │                  │
│         │  behind translucent win │                  │
│         └────────────┬────────────┘                  │
│                      ▼                               │
│         ┌─────────────────────────┐                  │
│         │  Composite translucent  │                  │
│         │  window on top          │                  │
│         └─────────────────────────┘                  │
│                                                      │
│  Cost: O(layers × blur_radius² × resolution)        │
│  GPU Load: 30-50% on iGPU at 1080p/60Hz             │
└─────────────────────────────────────────────────────┘
```

### Niri's Xray Blur Approach

Niri takes a fundamentally different approach called "xray blur." Instead of compositing all layers below the blurred window and then blurring the result, Niri blurs only the wallpaper texture and caches the result. The blurred surface then samples directly from this pre-blurred wallpaper cache, as if it could "see through" (xray) all intervening windows directly to the wallpaper behind.

This produces a visually similar effect — a frosted translucent surface with a soft, diffused background — but at a fraction of the computational cost:

1. The wallpaper blur is computed once and cached. It is only recomputed when the wallpaper changes or the output resolution changes.
2. Each blurred surface samples from the cached texture using a simple UV lookup, which costs almost nothing.
3. The cost does not scale with the number of windows or the number of blurred surfaces.

```
Niri Xray Blur (per frame)
┌─────────────────────────────────────────────────────┐
│  SETUP (once, or on wallpaper change):              │
│  ┌───────────┐                                      │
│  │ Wallpaper │                                      │
│  └─────┬─────┘                                      │
│        ▼                                            │
│  ┌─────────────────────────┐                        │
│  │  Gaussian Blur (cached) │  ← Computed ONCE       │
│  └────────────┬────────────┘                        │
│               ▼                                     │
│  ┌─────────────────────────┐                        │
│  │  Blurred Wallpaper Cache│  ← Stored in VRAM      │
│  └─────────────────────────┘                        │
│                                                      │
│  PER FRAME (rendering):                             │
│  ┌───────────┐                                      │
│  │ Wallpaper │  ← Render normally                   │
│  └─────┬─────┘                                      │
│        ▼                                            │
│  ┌───────────┐ ┌───────────┐                        │
│  │ Window A  │ │ Window B  │  ← Render normally     │
│  └─────┬─────┘ └─────┬─────┘                        │
│        └──────┬───────┘                              │
│               ▼                                     │
│  ┌─────────────────────────┐                        │
│  │  Translucent Window     │                        │
│  │  samples from CACHE     │  ← Simple UV lookup    │
│  │  (xray through layers)  │                        │
│  └─────────────────────────┘                        │
│                                                      │
│  Cost: O(1) per blurred surface per frame           │
│  GPU Load: <5% on iGPU at 1080p/60Hz               │
└─────────────────────────────────────────────────────┘
```

The tradeoff is visual accuracy: xray blur does not reflect the actual content of windows behind the blurred surface. A terminal window behind a blurred panel will not produce a diffused version of its text — the panel will always show a blurred version of the wallpaper. In practice, this tradeoff is invisible to most users and is the same approach used by iOS and macOS in many contexts where performance matters more than physical accuracy.

For AetherisOS, adopting the xray blur model (either through Niri directly or by implementing the same technique in the labwc rendering pipeline) ensures that blur effects remain visually premium without compromising the frame budget on integrated graphics hardware.

---

## Light-Weight Panel and Widget Integration

The desktop panel — the persistent bar displaying the clock, system tray, workspace indicators, and status widgets — is the second most memory-critical component after the compositor itself. Traditional panel implementations like XFCE4-panel, Waybar, or Polybar rely on external daemons for system information (NetworkManager, BlueZ applets, PulseAudio control GUIs), each of which carries its own memory footprint.

### Sfwbar: A Native Wayland Panel

Sfwbar (S* Floating Window Bar) is a highly configurable Wayland-native panel written in C that directly interfaces with system APIs instead of delegating to heavyweight daemon processes. It uses GTK3 for rendering but implements its own widget engine that can read system state from `/sys`, `/proc`, D-Bus interfaces, and ALSA directly, without requiring intermediary GUI daemons.

The key architectural advantage of sfwbar is that it replaces multiple standalone applet daemons with integrated, zero-overhead modules:

```
# Core Services Swapped for Native Sfwbar Modules
- NetworkManager (Daemon VmRSS: ~32 MiB) -> sfwbar Network Monitor (VmRSS: <2 MiB)
- Blueman-applet (Daemon VmRSS: ~28 MiB) -> sfwbar Bluetooth Trigger (VmRSS: <1 MiB)
- Pavucontrol (Daemon VmRSS: ~45 MiB)    -> sfwbar ALSA Mixer Integration (VmRSS: <1.5 MiB)
```

This consolidation eliminates approximately 100 MiB of daemon overhead at idle. The sfwbar panel itself, with all modules loaded, maintains a resident memory footprint of approximately 12 MiB — compared to Waybar at 18–25 MiB with equivalent functionality, or XFCE4-panel at 30–40 MiB.

Sfwbar's configuration language is declarative and supports conditional expressions, timers, and event-driven updates. Widgets only re-render when their underlying data source changes, eliminating the polling overhead common in bar implementations that shell out to scripts on a fixed interval. This event-driven model also reduces CPU wake-ups, contributing to lower power consumption on battery-powered devices.

For AetherisOS, sfwbar provides the optimal balance of visual customization, system integration depth, and memory efficiency. Its GTK3 rendering ensures that panel widgets inherit the system's GTK theme, maintaining visual consistency with GTK-based applications without requiring a separate theming pipeline.
