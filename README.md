# Aetheris OS

An experimental Void Linux-based system project with custom desktop configuration, packaging, and supporting utilities.

## Status

This repository is under active development. It contains source code, package templates, configuration, and technical design documents, but does not provide a published ISO release. Review the code and build script before attempting a local build.

## What is in this repository

- `chwd_port/`: a Rust utility for PCI-based hardware detection and driver-profile installation.
- `velocitymind/`: a C daemon for preloading selected application binaries.
- `velocityinstall/`: a Tauri and Svelte installer interface with a Rust backend.
- `velocitystore/`: a Tauri and Svelte software-center interface with Rust integrations for XBPS and Flatpak.
- `velocitysetup/`: a Rust and GTK-based first-boot setup utility.
- `srcpkgs/`: custom Void XBPS package templates, including a kernel package.
- `config/`, `etc/`, `themes/`, and `usr/`: desktop, system, theme, and helper-script configuration.
- `docs/`: architecture notes, subsystem documentation, benchmarking notes, and design material.

## Build environment

The `build-iso.sh` script is intended for a Linux host. It checks for Git, mtools, QEMU, GRUB, `parted-devel`, SQLite development files, `pkg-config`, GCC, Make, and Cargo. During a full run it also clones the Void Linux `void-packages` and `void-mklive` repositories, compiles local components and package templates, and invokes `sudo` to create an ISO.

Run the script only after reviewing it and preparing a suitable Linux build environment:

```bash
./build-iso.sh
```

## Working on individual components

Some components can be built independently from their own directories. For example:

```bash
cd chwd_port
cargo build --release

cd ../velocitymind
make
```

The Tauri-based components have their own Rust manifests under `velocityinstall/src-tauri/` and `velocitystore/src-tauri/`.

## Documentation

Start with [the architecture overview](docs/01-architecture-overview.md). The `docs/` directory separates system, desktop, driver-management, installer, app-store, security, and benchmarking material.

## License

No repository-level license file is currently included. Contact the maintainer before reusing code from this repository.
