# Sub-Plan 02: Wayland Desktop Shell & UI Configurations

This plan details the configuration guidelines for the `labwc` compositor, `sfwbar` panel stylesheet, rounded corners, shadows, and GLES2 GPU fallback routines.

---

## 1. labwc Compositor Configurations

### Window manager overrides (`~/.config/labwc/rc.xml`):
- Enforces the `Prismatic-Obsidian` window decoration theme.
- Specifies a standard window corner radius of `8px` (soft squircle-like layout).
- Enforces window borders to remain active (`keepBorder = yes`).
- Allocates `Nacelle Variable` as the title font (size 10).
- Skips showing `sfwbar` layout boundaries on task panels.

### Variable Refresh Rate (VRR) Outputs:
```xml
<outputs>
  <output name="DP-1">
    <vrr>yes</vrr>
    <tearing>yes</tearing> <!-- Lower input latency during fullscreen gaming -->
  </output>
</outputs>
```

### Stacking Border Color Parameters (`/usr/share/themes/Prismatic-Obsidian/window-manager/themerc`):
```ini
window.active.title.bg.color: #080A0F
window.active.border.color: #6366F1
window.inactive.border.color: #1a1e2a
window.active.title.text.color: #F4F6F9
border.width: 1
padding.width: 4
```

---

## 2. sfwbar Status Panel Styling

Sfwbar replaces heavy desktop applets (NetworkManager panel, Blueman, Pavucontrol) with native modules to keep memory usage under 12MB.

### Stylesheet Configurations (`~/.config/sfwbar/sfwbar.css`):
```css
#layout {
  background-color: #080A0F;
  border-top: 1px solid #6366F1;
  font-family: "Nacelle Variable", sans-serif;
  font-size: 13px;
  color: #F4F6F9;
}

#task-active {
  background-image: linear-gradient(to right, #6366F1, #4F46E5);
  border-radius: 4px;
  padding: 2px 6px;
  font-weight: bold;
}

#clock {
  font-family: "Geist Mono", monospace;
  font-weight: 500;
  color: #6366F1;
}
```

---

## 3. Real-Time Blur Optimization & Fallbacks

- **Hardware Check:** On system startup, the window manager initialization wrapper script queries `/dev/dri/card0` to check for active GPU acceleration.
- **Graceful Fallback:** If no GPU device is detected (indicating a software rasterizer fallback or older legacy framebuffers), a shell script automatically swaps `~/.config/labwc/rc.xml` with a fallback configuration that disables rounded corners and window shadow rendering, reducing CPU compositor load to zero.
- **Xray Blur Mode:** Configures compositor shaders to sample background wallpapers only once, avoiding multi-layer redraw calculations when windows are dragged or animated.
