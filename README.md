# Aetheris OS

**A focused, experimental desktop system built on Void Linux.**

[![Quality checks](https://github.com/amandeavor/Aetheris-OS/actions/workflows/quality.yml/badge.svg)](https://github.com/amandeavor/Aetheris-OS/actions/workflows/quality.yml)
[![GitHub stars](https://img.shields.io/github/stars/amandeavor/Aetheris-OS?style=flat&label=stars)](https://github.com/amandeavor/Aetheris-OS/stargazers)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-2f81f7)](CONTRIBUTING.md)

Aetheris OS explores what a responsive, hardware-aware Linux desktop can look like when the installer, driver setup, software center, first-boot experience, and system defaults are designed together.

> [!IMPORTANT]
> Aetheris is in the prototype stage. The repository contains working components, system configuration, package templates, and design documentation, but there is no public ISO release yet. It is not ready to replace a daily-use operating system.

## Why Aetheris

Most desktop distributions assemble mature upstream components. Aetheris keeps that foundation, using Void Linux and runit, while experimenting in the integration layers where desktop usability is often won or lost:

- automatic PCI and USB driver-profile selection;
- a graphical installer and first-boot setup flow;
- one interface for XBPS and Flatpak software;
- conservative memory pressure handling and application preloading;
- Wayland desktop defaults for Labwc and sfwbar;
- explicit security profiles and Windows-application isolation.

## Components

| Component | Purpose | Stack | Maturity |
| --- | --- | --- | --- |
| `chwd_port` | Match detected hardware against driver profiles and apply packages or services | Rust | Prototype |
| `velocitymind` | Learn application transitions and warm likely binaries into the page cache | C, SQLite | Prototype |
| `velocityinstall` | Graphical installation and partitioning flow | Rust, Tauri, Svelte | Early prototype |
| `velocitystore` | XBPS and Flatpak software management | Rust, Tauri, Svelte | Early prototype |
| `velocitysetup` | First-boot account, network, privacy, and accessibility setup | Rust, GTK4, Libadwaita | Early prototype |
| `srcpkgs` | Void package templates for Aetheris components and kernel experiments | XBPS | Experimental |
| `config`, `etc`, `usr` | Desktop, service, security, and system overlay | Shell, system config | Experimental |

See the [component status](docs/component-status.md) for known limitations and validation commands.

## Try a component

The safest starting point is the hardware-profile utility. `cargo check` does not modify the host:

```bash
git clone https://github.com/amandeavor/Aetheris-OS.git
cd Aetheris-OS
cargo check --manifest-path chwd_port/Cargo.toml
```

On a Linux development host with SQLite headers installed, the preloader daemon can be compiled independently:

```bash
make -C velocitymind
```

The full `build-iso.sh` path is intended for an isolated Void Linux build environment. It downloads upstream sources, compiles packages, uses `sudo`, and creates a disposable build workspace. Read the script before running it.

## Contribute

You do not need operating-system experience to start. Documentation, test fixtures, hardware profiles, accessibility review, Rust error handling, and build reproducibility are all useful contributions.

1. Read [CONTRIBUTING.md](CONTRIBUTING.md).
2. Pick an issue labeled [`good first issue`](https://github.com/amandeavor/Aetheris-OS/labels/good%20first%20issue) or [`help wanted`](https://github.com/amandeavor/Aetheris-OS/labels/help%20wanted).
3. Comment on the issue before starting so work is not duplicated.
4. Open a focused pull request with the validation you performed.

Contributors who want to take long-term ownership of a component can follow the path in [GOVERNANCE.md](GOVERNANCE.md). Maintainer nominations are based on sustained, reviewed work, not follower counts or commit volume.

## Direction

The immediate goal is a reproducible developer preview, not a long feature list. Current priorities are:

- make each component independently buildable and testable;
- replace placeholder or unsafe system operations with validated implementations;
- document a reproducible Void Linux build environment;
- test hardware matching with fixtures before it touches a live system;
- publish the first signed developer-preview artifact.

The detailed sequence and contribution-sized projects live in [ROADMAP.md](ROADMAP.md).

## Documentation

- [Architecture overview](docs/01-architecture-overview.md)
- [Component status](docs/component-status.md)
- [Security model](docs/11-security.md)
- [Benchmarking approach](docs/14-benchmarking.md)
- [Technical debt register](TECHNICAL_DEBT.md)

## Community and security

Use [GitHub Discussions](https://github.com/amandeavor/Aetheris-OS/discussions) for design questions and ideas. Use issues for confirmed work. Please read the [Code of Conduct](CODE_OF_CONDUCT.md), and report vulnerabilities through the private process in [SECURITY.md](SECURITY.md).

If this direction is useful to you, star the repository to follow its progress and help other Linux contributors discover it.

## License status

A repository-level open-source license has not yet been selected. Until one is added, the code remains under its authors' default copyright and should not be redistributed. Resolving the license is a release blocker tracked in the roadmap.
