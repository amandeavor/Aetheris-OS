---
name: wayland-labwc-sfwbar
description: Configuration guidelines for the Labwc Wayland compositor and the lightweight sfwbar status panel for resource-constrained systems.
---

# Wayland, Labwc, and Sfwbar Interface Stack

This skill covers the configuration and optimization of the lightweight Wayland desktop shell, leveraging the `Labwc` stacking compositor and `sfwbar` panel.

## Labwc Compositor Configuration

Labwc is an stacking Wayland compositor based on `wlroots`. It reads Openbox-style XML files for configuration.

### 1. Theme Configuration (`~/.config/labwc/themerc-override`)
Specify window geometries and themes:

```xml
<!-- ~/.config/labwc/rc.xml snippet -->
<theme>
  <name>Nordic-Compact</name>
  <cornerRadius>8</cornerRadius>
  <keepBorder>yes</keepBorder>
</theme>
```

Key theme properties in `themerc`:
- `border.width`: Width of the active window outline (default: `1`).
- `padding.height`: Vertical caption padding.
- `window.active.border.color`: High-contrast accent color (e.g., `#6366F1`).
- `window.active.title.bg.color`: Titlebar background.

### 2. Output and VRR Configuration
Enable Variable Refresh Rate (VRR) by loading KMS parameters during boot:

```ini
# Add to kernel command line:
amdgpu.freesync_video=1
```

Inside `rc.xml`, adjust output management tags:

```xml
<outputs>
  <output name="DP-1">
    <vrr>yes</vrr>
    <tearing>yes</tearing> <!-- Lower input latency for gaming -->
  </output>
</outputs>
```

---

## Sfwbar Status Panel Setup

`sfwbar` (Sway Floating Window Bar) is a highly customizable Wayland status bar using Gtk3/CSS, demanding very low resources (<2MB VmRSS).

### 1. Replacing Heavy Services
Traditional notification widgets consume excessive memory. Replace them with native `sfwbar` layout modules:

```ini
# Memory footprints comparison:
NetworkManager Applet (~32MB) -> sfwbar Network Module (<2MB)
Blueman-applet (~28MB)        -> sfwbar Bluetooth Module (<1MB)
Pavucontrol (~45MB)           -> sfwbar ALSA Slider (<1.5MB)
```

### 2. Sfwbar Configuration Layout (`~/.config/sfwbar/sfwbar.config`)
Configure task widgets and panel elements:

```css
/* Styling the panel background */
window#sfwbar {
  background: rgba(14, 18, 26, 0.85); /* Glassmorphic transparency */
  border-top: 1px solid rgba(38, 50, 77, 0.5);
  font-family: "Nacelle Sans Variable", sans-serif;
  font-size: 11pt;
}

#taskbar button.active {
  background: #6366F1;
  border-radius: 4px;
}
```

---

## Compositor Real-Time Blur Optimizations

Traditional compositor blur (like KWin or Hyprland) runs multiple render passes (Gaussian/dual-filtering), which exhausts older GPUs and memory bandwidth.

- **Graceful Fallback**: If dedicated graphics acceleration is not detected (via `/dev/dri/card0`), disable blur and rounded corners inside `rc.xml` to save RAM.
- **Xray Blur Mode**: Instruct compositors to sample the background wallpaper once rather than performing multi-layer rendering under active windows.
