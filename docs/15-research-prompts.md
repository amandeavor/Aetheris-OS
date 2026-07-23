# Original Research AI Prompts

These are the original prompts used during planning Aetheris OS.

## 1. System Optimization Research Prompt

```markdown
🔬 Research AI Prompt
You are an expert Linux distribution architect and systems researcher specialising in kernel optimisation, lightweight desktop environments, hardware compatibility, and Windows application compatibility layers. Your task is to deeply research and produce a comprehensive technical report on building a next-generation Linux distribution with the following goals:

Core Research Areas:

Kernel & System Optimisation — Research the most optimal Linux kernel configurations, patches (like Liquorix, Zen, or CachyOS kernels), CPU schedulers (BORE, TT, BMQ), and boot-time optimisations (systemd tweaks, initramfs slimming, zram/zswap tuning) that allow the OS to run smoothly on systems with as little as 1GB RAM. Include memory compression strategies, OOM handling, and swappiness tuning.
Lightweight but Aesthetic Desktop Environment — Research which compositor + DE combination (e.g. Hyprland, KWin on Wayland, Picom + Openbox, or a custom Electron/Flutter shell) can deliver macOS-level fluid animations, blur effects, rounded corners, and smooth transitions while consuming under 200MB RAM idle. Compare animation frameworks and GPU-accelerated rendering pipelines.
Windows App Compatibility — Research the current state of Wine, Proton, Bottles, and CrossOver. Investigate how distributions like Zorin OS and Nobara handle compatibility layers. Research Steam Deck's Proton implementation for lessons applicable to a general-purpose distro. Explore .exe file association and one-click Windows app execution feasibility.
Automatic Driver Detection & Management — Research how to build an intelligent driver manager that: auto-detects hardware on first boot, queries a driver database (like Ubuntu HWE, RPM Fusion, or a custom repo), installs the correct GPU/audio/input drivers silently, and handles Wi-Fi cards specifically. Enumerate the top 200 most common Wi-Fi chipsets and research pre-bundling their drivers (including Realtek RTL series, MediaTek MT series, Intel iwlwifi, Broadcom wl). Research DKMS vs pre-compiled module strategies.
Predictive App Preloading — Research preload, systemd-oomd, and ML-based prefetching approaches. Investigate how Android's app launch prediction and Windows SuperFetch/Prefetch work, and how similar behaviour can be implemented on Linux using usage pattern analysis (time-of-day, frequency, sequence modelling). Research lightweight on-device ML inference (e.g. ONNX Runtime, TensorFlow Lite) for habit learning.
Base Distribution Selection — Compare Arch, Debian, Void, Alpine, NixOS, and Gentoo as base systems. Evaluate each for package availability, init system flexibility, update model, and suitability for a curated consumer distro. Justify a final recommendation.
Performance Benchmarking Strategy — Research how to benchmark the distro against Ubuntu, Fedora, Linux Mint, and Windows 11 on identical 1GB and 4GB RAM hardware. Define metrics: boot time, RAM idle usage, app launch time, frame pacing during animations, and thermal performance.
Output Format: Produce a structured technical report with sections per research area, citing real tools, projects, kernel patches, and community resources. Include trade-off analysis, a recommended technology stack, and an implementation roadmap broken into phases.


```

## 2. Installer, App Store, Gaming, Security, and OOBE Research Prompt

```markdown
🔬 Master Research Prompt
You are a senior Linux distribution architect, UX engineer, and systems security researcher with deep expertise in Wayland compositing, package management, OS hardening, and user experience design. Your task is to produce an exhaustive, technically precise research report covering five critical subsystems of a next-generation lightweight Linux distribution. The distro targets systems with as little as 1GB RAM, uses Void Linux (glibc) as its base, runs the Labwc Wayland compositor, runit init system, and is designed to feel as polished and fluid as macOS while being faster than any mainstream distribution.

📦 Research Area 1: Installer Design
Research how to build a dead-simple, visually stunning, and hardware-resilient OS installer with the following goals:

Technical Research:

Compare existing Linux installer frameworks: Calamares, Anaconda, Jade-GUI (used by CachyOS), abRoot/Sysinstall (Vanilla OS), and custom Tauri/Rust-based installers. Evaluate each on: RAM consumption, UI rendering engine, customisability, support for Void Linux / xbps, and ability to run on 512MB RAM live environments.
Research partition layout strategies for modern installs: single-partition simple mode, Btrfs with subvolumes and automatic Snapper snapshots, LVM thin provisioning, and full disk encryption via LUKS2 with TPM2 auto-unlock.
Research live environment boot optimisation: how to get from USB boot to installer UI in under 20 seconds using zstd-compressed squashfs, overlayfs, and tmpfs-backed writes.
Investigate hardware compatibility probing during install: how to detect and warn about unsupported GPUs, missing WiFi firmware, and low disk space before committing to installation.
Research OEM mode installation: silent, unattended installs with pre-seeded user/locale/timezone configs for hardware vendors shipping the distro pre-installed.
UX Research:

Study the installer UX of elementary OS, Zorin OS, Pop!_OS, and macOS setup flows. Identify what makes them feel approachable to non-technical users.
Research progressive disclosure in installer design: how to show only what's necessary at each step while hiding advanced options behind expandable panels.
Research real-time installation feedback: animated progress indicators, live log streaming, estimated time remaining calculations, and error recovery flows.
How should the installer handle dual-boot scenarios with Windows 11, including safe partition resizing, GRUB/systemd-boot integration, and BitLocker detection warnings?
Output: Recommend a complete installer tech stack, UI framework, partition defaults, and step-by-step screen flow wireframe descriptions.

🏪 Research Area 2: App Store & Package Management UI
Research how to build an extremely lightweight, beautiful, and functional graphical software centre:

Technical Research:

Compare existing software centre implementations: GNOME Software (libadwaita), Discover (KDE/Qt), Pamac (Arch/GTK3), Bauh (multi-backend Python), and Flatpak-based stores. Evaluate RAM idle consumption, rendering engine, backend flexibility, and suitability for xbps + Flatpak dual-backend support.
Research building a custom app store in Tauri (Rust + WebView2/WebKitGTK). Evaluate whether a Tauri app can consume under 40MB RAM while providing smooth animations, search, screenshots, and one-click installs.
Research xbps backend integration: how to query installed packages, available updates, package metadata, and trigger installs/removals via xbps-install/xbps-remove with real-time stdout streaming into a UI progress bar.
Research Flatpak backend integration: querying Flathub metadata API, fetching app screenshots and descriptions, managing Flatpak permissions via Flatseal-style UI embedded directly in the store.
Research app ratings, reviews, and curation: how to pull GNOME Software's Open Source AppStream metadata, integrate ODRS (Open Desktop Ratings Service), and display curated "Featured Apps" sections without a proprietary backend.
Research delta updates: using xbps's built-in delta package support and Flatpak's OCI delta layers to minimise download sizes on slow or metered connections.
UX Research:

Study the app store UX of Apple App Store, elementary AppCenter, iOS App Library, and Steam. What visual patterns make discovery intuitive?
Research category browsing vs. search-first design: when do users browse vs. search, and how should the UI adapt?
Research one-click Windows app installation via Bottles/Proton surfaced directly inside the app store — how does Bottles handle this programmatically and how can it be embedded into a store UI?
Output: Recommend a complete app store tech stack, architecture diagram, UI layout descriptions for home/search/app detail/update screens, and backend API design.

🎮 Research Area 3: Wayland Gaming Optimisation
Research how to deliver the best possible gaming performance and compatibility on a Wayland-native Linux distribution:

Technical Research:

Research Variable Refresh Rate (VRR/FreeSync/G-Sync) support under Wayland: current state of VRR in wlroots-based compositors (labwc, Sway, Hyprland), DRM/KMS VRR kernel flags, per-monitor VRR toggle APIs, and tearing-free low-latency configurations.
Research HDR (High Dynamic Range) pipeline under Linux Wayland: current state of HDR in KMS, the color-management-v1 Wayland protocol, Mesa's HDR support, and how games output HDR via DXVK/VKD3D on Proton. What is the current maturity level and what workarounds exist?
Research input latency minimisation: Wayland's zero-copy direct scanout path, presentation-time protocol usage, disabling vsync for fullscreen exclusive apps, and using gamescope as a nested compositor for latency-critical games.
Research Gamescope deeply: its architecture as a nested Wayland compositor, how it implements FSR (FidelityFX Super Resolution) upscaling, integer scaling, HDR tonemapping, and per-game latency optimisation. How does it integrate with Steam and non-Steam games?
Research MangoHud and DXVK_HUD: how to ship a pre-configured MangoHud overlay as a system-wide default for performance monitoring, with a GUI toggle in the system tray.
Research CPU and GPU governor profiles for gaming: switching from schedutil to performance governor on game launch, using gamemode daemon (Feral Interactive), and latencyflex for frame pacing. How does gamemode interact with runit service management?
Research memory and hugepages optimisation for gaming: transparent hugepages (THP), vm.compaction_proactiveness, and per-game memory locking via LD_PRELOAD hooks.
Research controller support: state of SDL2/SDL3 gamepad handling under Wayland, udev rules for controller detection, and Steam Input's virtual controller layer.
Output: Recommend a complete gaming optimisation stack, default configurations, gamescope integration strategy, and a "Game Mode" feature design that auto-activates on game launch.

🔒 Research Area 4: Security Hardening
Research how to build a hardened, consumer-friendly Linux distribution that is secure by default without frustrating everyday users:

Technical Research:

Research Mandatory Access Control (MAC) options: compare AppArmor, SELinux (targeted policy), and Landlock (kernel 5.13+). Evaluate complexity, memory overhead, compatibility with Wayland/Wine/Flatpak, and suitability for a consumer distro where users install arbitrary software.
Research Flatpak sandboxing as the primary app isolation layer: how Flatpak uses bubblewrap + seccomp + portals (xdg-desktop-portal) to isolate apps. What are the current escape vectors and how are they mitigated?
Research kernel hardening parameters: sysctl hardening (restricting ptrace, disabling core dumps, restricting dmesg, kernel pointer hiding), kernel compile-time options (KASLR, SMEP, SMAP, stack protector strong, CFI), and how these interact with Wine/Proton workloads.
Research secure boot integration: how to implement signed UKI (Unified Kernel Images) with systemd-stub (or a runit equivalent), SBAT revocation, and MOK (Machine Owner Key) enrollment for custom kernels and DKMS modules.
Research network security defaults: nftables-based stateful firewall rules shipped by default, DNS-over-TLS via systemd-resolved or dnscrypt-proxy, MAC address randomisation for WiFi, and disabling unused network protocols (DCCP, SCTP, RDS).
Research supply chain security: xbps package signature verification, Flatpak verified publisher badges, reproducible builds, and how to implement a basic Software Bill of Materials (SBOM) for the distro's core packages.
Research automatic security updates: how to implement unattended security-only xbps updates without breaking the system, distinguishing security patches from feature updates using CVE metadata.
Research hardware security features: TPM2 integration for full disk encryption auto-unlock (via clevis/tang or systemd-cryptenroll), fwupd for firmware updates, and pluton/secure enclave compatibility.
UX Research:

How do macOS Gatekeeper, Windows SmartScreen, and ChromeOS verified boot communicate security decisions to non-technical users? What language and UI patterns reduce friction while maintaining protection?
Research permission prompts: designing a polkit/xdg-portal replacement that uses plain language ("This app wants to read your Documents folder") instead of technical jargon.
Output: Recommend a complete security stack, default hardening configurations, AppArmor profile strategy, permission prompt UI design, and a threat model covering the most realistic attack vectors for a consumer desktop.

🎨 Research Area 5: Branding & Out-of-Box Experience (OOBE)
Research how to design a first-boot setup wizard and cohesive brand identity that makes the distro feel premium and trustworthy:

Technical Research:

Compare existing OOBE implementations: GNOME Initial Setup, KDE Plasma Welcome, elementary OS Onboarding, Windows 11 OOBE, and macOS Setup Assistant. Evaluate architecture, memory footprint, Wayland compatibility, and step coverage.
Research building a custom OOBE in Tauri or a native GTK4/libadwaita app that runs as the first Wayland client on first boot, covering: language/locale selection, timezone/keyboard, user account creation, privacy settings, theme selection (light/dark), WiFi setup, and optional app bundle installation.
Research first-boot performance: how to ensure the OOBE launches in under 3 seconds on 1GB RAM systems, using pre-rendered assets, minimal dependencies, and lazy-loading of optional screens.
Research driver installation during OOBE: integrating the chwd driver manager into the setup wizard so WiFi and GPU drivers are silently installed in the background while the user completes setup steps.
Research data privacy onboarding: how to present telemetry opt-in/opt-out, explain what data (if any) is collected, and provide a clear privacy policy summary in plain language — modelled after Apple's privacy nutrition labels.
UX & Branding Research:

Research brand identity design for OS products: what visual language, logo design principles, typography choices, and colour palette strategies make an OS feel modern, trustworthy, and premium? Study macOS, elementary OS, Pop!_OS, and Ubuntu's brand evolution.
Research motion design in OOBE flows: how spring physics, entrance animations, and progress transitions guide user attention and reduce perceived wait times. Study Apple's OOBE animation timing curves.
Research dark/light mode theming architecture for GTK4, Qt6, and custom Wayland shell themes: how to implement a unified token-based design system (like Material You or Apple's Dynamic Colours) that propagates consistently across all UI surfaces.
Research default wallpaper and sound design: how default wallpapers communicate brand personality, and whether subtle ambient UI sounds (like macOS login chime) improve perceived quality.
Research accessibility in OOBE: screen reader support (Orca), high-contrast modes, large text scaling, and colour blindness accommodations that should be offered during first-boot setup.
Output: Recommend a complete OOBE tech stack, screen-by-screen flow with descriptions, brand identity guidelines (colours, typography, logo direction), animation timing specifications, and a theming architecture for the full system.

Global Output Requirements:
For all five research areas, structure your findings as follows:

Current State of the Art — what exists today, what works, what is broken
Recommended Technology Stack — specific tools, libraries, and frameworks with justification
Architecture Diagram — ASCII or structured diagram showing component relationships
Implementation Roadmap — phased milestones with dependencies noted
Trade-off Analysis — where performance, security, and UX goals conflict and how to resolve them
Open Research Questions — areas where no clear best practice exists yet and further investigation is needed
Cite real open-source projects, GitHub repositories, kernel documentation, Wayland protocol specs, and academic papers where applicable. Be technically precise — avoid vague generalisations. This report will directly inform the architecture of a real Linux distribution.

That prompt will squeeze out a deeply technical, production-grade research report across all five pillars simultaneously. Once the AI returns results, paste them back here and we'll synthesise everything into the complete master architecture document for the distro. 🚀


```

## 3. Brand Identity, Naming, and Visual Direction Research Prompt

```markdown
🔬 Brand Identity, Naming & Visual Direction Research Prompt
You are a senior brand identity designer, typographer, and visual systems architect with deep expertise in designing operating system brands, developer tools, and consumer technology products. You have studied the brand evolution of Apple macOS, elementary OS, Pop!_OS, Ubuntu, Fedora, Windows 11, and ChromeOS in exhaustive detail. Your task is to produce a comprehensive, technically precise brand identity research report for a new Linux distribution.

Distro Context:
This is a new Linux distribution — working title "VelocityOS" though the name is fully open to change and should be reconsidered as part of this research. It runs on as little as 1GB RAM, uses Void Linux as its base, targets both everyday consumers and power users, feels as fluid and premium as macOS, is faster than any mainstream distro, and has a sophisticated, cohesive design system. Its core personality traits are: fast, intelligent, elegant, precise, and trustworthy. No colour palette has been locked in — colour direction is part of what this research must determine from scratch.

🏷️ Research Area 1: Distro Naming
Research the science and strategy behind naming a consumer operating system:

Naming psychology: Research how OS names affect user perception, trust, and memorability. Study the naming strategies behind macOS (place-based), Ubuntu (philosophy-based), Fedora (hat metaphor), Pop!_OS (energetic/playful), elementary OS (simplicity signal), Zorin (futuristic/personal), and Manjaro (invented word). What patterns emerge for products that want to feel both powerful and approachable?
Name archetypes: Research the six naming archetypes — Descriptive, Evocative, Invented, Geographic, Person-based, and Metaphor-based — and which perform best for OS branding in terms of memorability, international appeal, and trademark defensibility.
Phonaesthetics and sound symbolism: Research how phoneme patterns shape brand perception subconsciously. Which consonant and vowel patterns signal speed (short, clipped), intelligence (Latin/Greek roots), elegance (soft flowing syllables), and precision (hard stops)? Analyse existing Linux distro names — Arch, Nix, Alpine, Aurora, Fedora, Asahi — through this phonaesthetic lens. What sounds should the new distro name use or avoid?
Name generation: Using all of the above research, generate a shortlist of 15 candidate names for this distro. For each name provide: the archetype it belongs to, phonaesthetic analysis, what personality traits it signals, potential trademark risk level (low/medium/high), and a one-line rationale. Draw from concepts related to motion, light, precision engineering, natural phenomena, classical mythology, astronomy, material science, and abstract elegance. Avoid anything that sounds like an existing major Linux distro or tech brand.
Final recommendation: From the 15 candidates, recommend the single strongest name with a full justification covering memorability, personality fit, international pronunciation ease, trademark risk, and domain/namespace viability.
Trademark and domain strategy: Research how to evaluate a name for trademark conflicts in the software/OS category (Nice Classification 9 and 42), check domain availability across .org, .io, .dev, and .com, and assess GitHub namespace availability. What naming patterns are safest for a globally distributed open source project?
🎨 Research Area 2: Colour Palette Design
Research how to design a colour system for an OS from scratch that feels premium, modern, and distinctive:

OS colour psychology: Research how colour choices shape user perception of operating systems. How does Ubuntu's orange signal warmth and community? How does Apple's use of desaturated neutrals with vibrant accent signals sophistication? How does elementary OS's blue signal calm trust? How does Pop!_OS's teal/orange combination signal energy and modernity? What colours are overused in the Linux space that should be avoided?
Colour theory for dark and light UI systems: Research how to design a dual-mode colour system (dark and light) that maintains perceptual consistency, appropriate contrast ratios (WCAG AA minimum, AAA preferred), and visual hierarchy across both modes. Research how Apple's Dynamic Colours, Material You's tonal palettes, and Windows 11's Fluent colour tokens handle this.
Accent colour research: Research which accent colour families are underrepresented in the current Linux/OS landscape and would make this distro visually distinctive. Consider: warm amber, deep violet, soft rose gold, muted sage green, burnt coral, iridescent/prismatic, and monochromatic approaches. For each, research the psychological associations, technical rendering challenges on low-bit-depth displays, and cultural connotations across global markets.
Full palette generation: Design a complete colour system from scratch consisting of: a dark mode background scale (5 steps from deepest to surface highlight), a light mode background scale (5 steps), a primary accent colour with 9 tonal steps (100–900), a semantic colour set (success, warning, error, info), and neutral greys (10 steps). For every colour provide the hex code, HSL values, and intended usage context. The palette must feel cohesive, premium, and unlike any existing major OS.
Gradient and material direction: Research how modern OS brands use gradients, glassmorphism, frosted glass, noise textures, and material metaphors in their visual language. What is the current state of the art and what direction would feel fresh in 2025–2026? Should this distro use flat colour, subtle gradients, or iridescent/prismatic materials?
✍️ Research Area 3: Typography System
Research how to build a typographic identity for an OS:

OS typography history and strategy: Research how Apple switched from Helvetica Neue to San Francisco, how Google designed Inter and Roboto for screen legibility, how Microsoft designed Segoe UI, and what lessons these transitions teach about designing type systems for operating systems.
Variable font technology: Research the current state of variable fonts for UI rendering on Linux under GTK4, Qt6, and Wayland. Which variable fonts render most crisply at 96dpi and 144dpi (HiDPI), and how does font hinting interact with Cairo/Pango rendering on low-resolution displays?
Font pairing strategy: Research how to pair a UI sans-serif with a monospace font for terminals and code, and optionally a display/heading font for marketing materials and the installer. What makes a pairing feel cohesive rather than disjointed?
Typeface shortlist and recommendation: Research and evaluate the following typefaces for suitability as the primary UI font: Inter, Geist, Nacelle, Outfit, Plus Jakarta Sans, Bricolage Grotesque, and DM Sans. For each evaluate: screen legibility at 11–13px, variable font support, open source licensing, Latin/Cyrillic/Greek coverage, and personality fit with the distro's traits. Recommend the strongest combination.
🔷 Research Area 4: Logo Design Direction
Research how to design a distinctive, scalable, and memorable OS logo:

OS logo design history: Research the design evolution of major OS logos — Apple's rainbow to monochrome shift, Ubuntu's circle of friends, elementary OS's "e", Fedora's infinity loop, Pop!_OS's exclamation mark system, and Arch Linux's geometric "A". What design principles made some of these iconic and others forgettable?
Logo geometry and symbolism: Research geometric forms that communicate speed, precision, and motion. Investigate: swoosh/arc forms, angular letterforms, abstract monograms, orbital rings, crystalline/faceted shapes, arrow derivatives, and waveforms. For each, research psychological associations, scalability at small sizes (16px favicon), and risk of resembling existing tech logos.
Logo construction principles: Research grid systems, golden ratio construction, optical spacing correction, and minimum size legibility for OS logos that must work at: 16×16px (favicon), 32×32px (taskbar), 256×256px (about screen), and large format (website hero, packaging).
Wordmark design: Research how OS products combine a logomark with a wordmark. When should they be stacked vs. horizontal? Research custom lettering vs. modified typefaces for wordmarks — what is the current industry standard approach for software brands?
Logo concept directions: Generate and describe 5 distinct logo concept directions for this distro. For each direction provide: the geometric concept, symbolic meaning, construction description, how it scales, colour application, and what personality it communicates. These should be genuinely distinct — not variations of the same idea.
Animation direction: Research how OS logos animate in modern brand systems — Apple's chime + fade, Windows' bloom animation, elementary's subtle pulse. Recommend an entrance animation concept for this distro's boot logo that fits its personality and can be rendered in under 16ms per frame on integrated graphics.
🌍 Research Area 5: Brand System & Identity Guidelines
Research how to build a complete, scalable brand system:

Design token architecture: Research how to build a design token system (like Figma's variables, Apple's semantic colours, or Material You tokens) that propagates from a single source of truth to GTK4 CSS, Qt6 QSS stylesheets, Labwc XML configs, and web/marketing assets simultaneously. What tooling exists (Style Dictionary, Theo, custom compilers) and what is the recommended architecture?
Icon system design: Research what icon style — filled, outlined, duotone, or illustrated — is most legible and aesthetically appropriate for a premium lightweight OS. Study the design systems behind: macOS Big Sur icons (3D skeuomorphic), elementary OS (flat + consistent metaphors), Fluent Icons (Microsoft), and Papirus (Linux community). Recommend an icon style and grid system.
Wallpaper design direction: Research how default wallpapers function as brand communication tools. Study how macOS wallpapers (geological formations, astronomy, abstract fluids) and elementary OS wallpapers communicate brand personality. Generate 5 wallpaper concept directions for this distro — describe each in enough detail that an artist could execute it. Each should work in both dark and light variants.
Marketing and web presence: Research what a minimal, high-conversion distro homepage should contain. Study the homepages of elementary OS, Pop!_OS, Fedora, and NixOS. What sections, copy patterns, and visual strategies drive downloads and community trust?
Voice and tone: Research how OS brands communicate in writing — error messages, onboarding copy, release notes, and marketing. Define a voice and tone guide for this distro: what words and phrases should always be used, what should be avoided, and what reading level should all copy target?
Global Output Requirements:
For every research area structure output as:

Current State of the Art — what exists, what works, what is overdone
Recommendations — specific, actionable, justified decisions
Examples and References — real projects, fonts, colours, hex codes, case studies
Trade-off Analysis — where aesthetic goals conflict with technical or accessibility constraints
Open Questions — where no clear best practice exists
Be exhaustively specific. Do not give vague creative direction — give precise hex codes, exact font names and weights, specific geometric construction descriptions, and concrete rationale rooted in design research. This report will directly inform the creation of a real operating system's brand identity.

Paste the output back here and we'll turn it into the complete brand bible — colour system, logo directions, name shortlist, type system, wallpaper concepts, the works. 🎨

```
