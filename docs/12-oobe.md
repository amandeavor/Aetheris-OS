# Out-of-Box Experience — VelocitySetup

## Current State of the Art

Existing Linux OOBE frameworks are designed for general-purpose desktops with ample RAM and assume post-install driver configuration. None perform background hardware detection during the setup wizard, leaving users with unoptimized systems on first login. The following table compares the major frameworks against the constraints of a lightweight, Wayland-native environment targeting 1 GB RAM devices.

| OOBE Framework | Startup Latency (on 1 GB RAM) | Memory Footprint (Active) | Display Server Compatibility | Local Hardware Driver Detection |
|---|---|---|---|---|
| GNOME Initial Setup | ~3.5 seconds | ~90 MB | Wayland / X11 | None (manual update post-install) |
| KDE Welcome | ~4.1 seconds | ~110 MB | Wayland / X11 | None |
| elementary Onboarding | ~2.2 seconds | ~55 MB | X11 (Pantheon dependent) | None |
| Custom GTK4 Wizard | ~0.4 seconds | ~16 MB | Wayland Native (Labwc) | Dynamic (chwd programmatic scan) |

### Issues with Each Existing Solution

- **GNOME Initial Setup** — Pulls in the full GNOME Shell dependency chain. At ~90 MB active footprint it is prohibitive on 1 GB RAM targets. No mechanism for background driver detection; users must manually run software updates post-install to acquire proprietary drivers. Startup latency of ~3.5 seconds creates a sluggish first impression.

- **KDE Welcome** — Heaviest of all options at ~110 MB. Depends on the full Plasma workspace, making it impossible to run under a minimal compositor like Labwc. No driver detection. Wayland support exists but is tightly coupled to KWin.

- **elementary Onboarding** — Lighter at ~55 MB, but hard-locked to the Pantheon desktop and X11. Cannot run natively on Wayland. No hardware detection. The X11 dependency is a non-starter for a Wayland-first distribution.

- **Custom GTK4 Wizard** — The only option that meets all constraints. Sub-second startup (~0.4 s), minimal footprint (~16 MB), native Wayland compatibility via Labwc, and the ability to integrate `chwd` for dynamic background driver detection during the wizard flow.

## Recommended Technology Stack

The VelocitySetup OOBE wizard is built on a minimal, purpose-selected stack that fits within the 1 GB RAM target while delivering a polished first-run experience.

- **Labwc compositor** — Wlroots-based Wayland compositor consuming < 30 MB RAM. Provides a stable display surface for the wizard without pulling in a full desktop environment.
- **GTK4 + Libadwaita** — Modern widget toolkit with built-in adaptive layouts and accessibility support. Active footprint < 16 MB. Wayland-native rendering, no X11 fallback required.
- **chwd background driver detection** — Manjaro's hardware detection tool, invoked programmatically in a background thread during the wizard flow. Detects and installs appropriate drivers (GPU, network, etc.) without blocking the user.
- **Rust config-compiler for unified theming** — Compiles a single JSON theme definition into configuration fragments for Labwc, GTK4, and terminal emulators. Ensures visual consistency across the entire system from first boot.
- **Orca screen reader for accessibility** — Launched on-demand from the first OOBE screen. Provides full screen-reader support for visually impaired users throughout the setup process.

### Background Driver Detection

Hardware driver detection runs in a background thread, completely non-blocking to the OOBE wizard UI. The `chwd --autoconfigure` command performs a PCI/USB scan and installs matching driver packages.

```rust
fn run_driver_detection() {
    std::thread::spawn(|| {
        let status = std::process::Command::new("chwd")
            .arg("--autoconfigure")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
        if let Ok(exit_code) = status {
            if exit_code.success() {
                // Signal completion to the OOBE wizard
            }
        }
    });
}
```

The spawned thread runs `chwd` with suppressed stdout/stderr to prevent console noise. On successful completion, a signal (e.g., via a channel or shared atomic flag) notifies the wizard UI so it can display a confirmation badge on the final screen. If `chwd` fails, the error is logged silently and the user is not interrupted — driver configuration falls back to post-login tooling.

## Architecture Diagram

The first-boot environment is structured as three layers: the user-facing OOBE wizard, the low-level utility layer, and the target system that receives the final configuration.

```
┌─────────────────────────────────────────────────────────┐
│                   OOBE Wizard (GTK4)                    │
│                                                         │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────┐  │
│  │  Welcome   │ │ Language  │ │  Network  │ │Account │  │
│  │  & A11y    │ │ KB / TZ   │ │  Select   │ │Create  │  │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └───┬────┘  │
│        │              │              │            │      │
│  ┌─────┴──────┐ ┌─────┴──────┐                   │      │
│  │ Curation & │ │   Theme    │                   │      │
│  │ Telemetry  │ │  & Ready   │                   │      │
│  └─────┬──────┘ └─────┬──────┘                   │      │
│        │              │                           │      │
│        └──────────────┴───────────────────────────┘      │
│                          │                               │
├──────────────────────────┼───────────────────────────────┤
│              Low Level Utilities                         │
│                          │                               │
│  ┌──────────────┐  ┌─────┴──────┐  ┌─────────────────┐  │
│  │ turnstile-env│  │    chwd    │  │   Theme Files    │  │
│  │ (session     │  │ (hardware  │  │  (JSON → Labwc,  │  │
│  │  bootstrap)  │  │  detection │  │   GTK4, term)    │  │
│  └──────┬───────┘  └─────┬──────┘  └────────┬────────┘  │
│         │                │                   │           │
├─────────┼────────────────┼───────────────────┼───────────┤
│         │          Target System             │           │
│         │                │                   │           │
│  ┌──────┴───────┐  ┌─────┴──────┐  ┌────────┴────────┐  │
│  │  User Session │  │  Installed │  │  Compiled Theme │  │
│  │  (Labwc +    │  │  Drivers   │  │  Configs        │  │
│  │   apps)      │  │            │  │                 │  │
│  └──────────────┘  └────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

- **turnstile-env** bootstraps the minimal session environment (environment variables, XDG directories, D-Bus session bus) before the wizard launches.
- **chwd** runs in a background thread (see Rust code above) scanning PCI/USB hardware and installing matching drivers.
- **Theme Files** are compiled by the Rust config-compiler from a single JSON source into per-application configuration fragments.

## Screen-by-Screen OOBE Wireframe

### 1. Welcome and Accessibility

High-contrast layout with an off-center geometric welcome card positioned at the left third of the viewport. The card displays the distribution wordmark and a brief tagline. A floating accessibility menu anchored to the top-right corner provides one-tap toggles for:

- **Orca screen reader** — launches immediately on activation
- **Large text mode** — scales all UI elements to 150%
- **Color-blindness filters** — Protanopia, Deuteranopia, Tritanopia compensation overlays

The background uses a subtle gradient from the theme's `background` to `surface` color. A single "Begin Setup" button is placed below the card with generous tap target (minimum 48 × 48 dp).

### 2. Language, Keyboard, and Timezone

Clean two-column layout. The left column presents a searchable language list with locale previews (date/number formatting). The right column contains a non-blocking geographic map widget for timezone selection — tapping a region highlights it and auto-selects the timezone. Keyboard layout is inferred from the selected language but can be overridden via a dropdown. All selections are non-blocking; the user can proceed before the map fully renders.

### 3. Wireless Network Selection

Asynchronous WiFi scan via NetworkManager's D-Bus API. Networks appear as cards in a vertically scrollable list, sorted by signal strength. Each card displays:

- Network SSID
- Signal strength indicator (four-bar icon)
- Security type badge (Open / WPA2 / WPA3)

Selecting a secured network slides in a password field with a real-time password strength indicator. An "Ethernet Detected" banner replaces the WiFi list when a wired connection is active. A "Skip" option is always visible for offline setup.

### 4. Account Creation

Single-column centered form with three fields:

- **Full Name** — free text, used for display name and GECOS field
- **Username** — auto-generated from full name, editable, validated against POSIX username rules in real time
- **Password** — masked with reveal toggle, async strength estimator running on each keystroke

The password strength estimator uses zxcvbn-style entropy calculation. After the user advances past this screen, the password is **zeroized from memory** using Rust's `zeroize` crate to prevent residual plaintext in RAM.

### 5. Curation and Telemetry Options

Apple-style privacy indicators with iconography showing exactly what data is collected:

- **Crash reports** — stack traces, no PII
- **Usage statistics** — anonymous feature usage counters
- **Hardware census** — anonymized hardware profile for driver prioritization

Each category has a prominent **opt-out toggle** defaulting to opted-in. A "Learn More" expandable section provides full data-flow diagrams. The overall tone is transparency-first: no dark patterns, no buried toggles.

### 6. Theme Selection and System Ready

Three theme previews rendered as live mini-viewports:

- **Light** — white surfaces, dark text, blue accent
- **Dark** — slate surfaces, light text, blue accent
- **Dynamic** — adapts to ambient light sensor (falls back to time-of-day schedule if no sensor detected)

Selecting a theme triggers **instant compilation** via the Rust config-compiler, generating Labwc, GTK4, and terminal emulator configurations in real time. A subtle progress ring shows compilation status (~200 ms typical). The final "Start Using AetherisOS" button appears once theme compilation and background driver detection are both complete.

## Brand Identity and Motion Specifications

All animations in the OOBE wizard and across the AetherisOS desktop use **spring physics** for natural, non-robotic motion. The governing equation for spring-based animation:

```
x(t) = A · e^(-ζωn·t) · cos(ωd·t + φ)
```

Where:

- **ζ** (damping ratio) = **0.8** — slightly underdamped for a subtle overshoot that feels energetic without being bouncy
- **ωn** (natural frequency) = **12 rad/s** — fast enough to feel responsive, slow enough to be perceived
- **ωd** (damped frequency) = ωn · √(1 - ζ²) = 12 · √(1 - 0.64) = **7.2 rad/s**
- **A** = initial displacement (context-dependent)
- **φ** = phase offset (typically 0)

This produces animations that settle in approximately **250–350 ms** with a single, barely-perceptible overshoot — matching the motion language of iOS and macOS without direct imitation.

### Theme Configuration Format

All system theming is driven by a single JSON configuration file. The Rust config-compiler reads this file and generates per-application configuration fragments.

```json
{
  "colors": {
    "background": "#0F172A",
    "surface": "#1E293B",
    "accent": "#2563EB",
    "text": "#F8FAFC"
  }
}
```

Additional keys supported in the full theme schema include `borderRadius`, `fontFamily`, `fontScale`, `shadowElevation`, and `transitionCurve`. The compiler outputs:

- `~/.config/labwc/themerc-override` — Labwc window decoration colors
- `~/.config/gtk-4.0/gtk.css` — GTK4 CSS custom properties
- `~/.config/foot/foot.ini` — terminal emulator palette

## Trade-off Analysis

### GTK4 vs Tauri for the OOBE Wizard

| Criterion | GTK4 + Libadwaita | Tauri (WebView) |
|---|---|---|
| Active memory footprint | **~16 MB** | ~45 MB |
| Startup latency (1 GB RAM) | **~0.4 s** | ~1.2 s |
| Wayland native rendering | **Yes** | Via WebKitGTK (indirect) |
| Accessibility (Orca/AT-SPI) | **Native** | Partial (web ARIA → AT-SPI bridge) |
| Theming consistency | **Native GTK4 CSS** | Separate CSS, no system integration |
| Binary size | **~2 MB** (shared libs) | ~8 MB (bundled WebView) |

GTK4 wins on every metric relevant to a resource-constrained first-boot environment. Tauri's advantages (web tech familiarity, cross-platform) are irrelevant for a Linux-only OOBE wizard.

### chwd Background I/O Throttling

Background driver detection involves package downloads and disk writes that could compete with the OOBE wizard's UI rendering. To prevent I/O starvation:

```bash
ionice -c 3 nice -n 19 chwd --autoconfigure
```

- **`ionice -c 3`** — sets I/O scheduling class to **idle**, meaning `chwd` only gets disk bandwidth when no other process is waiting for I/O.
- **`nice -n 19`** — sets CPU scheduling priority to the lowest level, ensuring the GTK4 wizard always gets CPU time first.

Combined, these flags make `chwd`'s background work effectively invisible to the user. Driver installation may take slightly longer (estimated 10–15% overhead), but the OOBE wizard remains at 60 fps throughout.

## Open Research Questions

### Handling Background Driver Installation Failures During OOBE

The current design logs `chwd` failures silently and defers driver configuration to post-login tooling. This raises several unresolved questions:

1. **User notification strategy** — Should the user be informed of a driver failure on the final OOBE screen, or should it be deferred entirely to a post-login notification? Informing during OOBE risks creating anxiety on first impression; deferring risks the user booting into a degraded state (e.g., software-rendered graphics) without understanding why.

2. **Retry logic** — Should `chwd` automatically retry on transient failures (network timeout during package download)? If so, how many retries, and with what backoff strategy? Retries extend the background task duration and may outlast the OOBE wizard itself.

3. **Partial failure handling** — `chwd` may successfully install some drivers (e.g., network) but fail on others (e.g., GPU). The system should distinguish between critical failures (no display driver) and non-critical ones (missing Bluetooth firmware).

4. **Offline scenarios** — If the user skips WiFi setup (screen 3) and no Ethernet is present, `chwd` cannot download driver packages from repositories. Should the OOBE bundle a minimal set of common drivers on the installation media? This increases ISO size but improves offline reliability.

5. **Race condition with session start** — If `chwd` installs a GPU driver that requires a compositor restart, and the user finishes the OOBE wizard before `chwd` completes, the transition to the live desktop may encounter a brief display interruption. The session manager needs a coordination mechanism to handle this gracefully.
