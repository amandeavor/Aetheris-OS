# Component status

This page records what can be validated today. It intentionally separates source-code presence from production readiness.

| Component | What exists | Current limitations | Safe validation |
| --- | --- | --- | --- |
| `chwd_port` | sysfs PCI and USB scanning, TOML profiles, profile selection, package/service application | Linux and libxbps specific; matching needs fixture coverage; applying profiles changes the host | `cargo fmt --manifest-path chwd_port/Cargo.toml -- --check` and `cargo check --manifest-path chwd_port/Cargo.toml` |
| `velocitymind` | SQLite transition storage, probability lookup, page-cache warming, focus-event hook | benchmark evidence and long-running behavior need validation | `make -C velocitymind` on Linux with SQLite headers |
| `velocityinstall` | Tauri backend, partition operations, Svelte interface fragments | no complete frontend build manifest; destructive paths need isolation and failure tests | source review only; use disposable block devices for future integration tests |
| `velocitystore` | XBPS FFI, Flatpak overrides, AppStream parsing, Svelte interface fragments | no complete frontend build manifest; system integration is not validated | source review only on non-Void hosts |
| `velocitysetup` | GTK/Libadwaita setup flow and NetworkManager interaction | Linux desktop dependencies and end-to-end first-boot flow are not automated | formatting plus compile checks on a prepared Void Linux host |
| system overlay | runit services, security profiles, desktop configuration, helper scripts | files are not yet exercised as a coherent image | syntax and policy-specific review before installation |
| `srcpkgs` | custom package and kernel templates | not continuously validated against current `void-packages` | build only inside a disposable `xbps-src` environment |

## Updating this page

When a pull request changes a component's maturity, dependencies, or validation path, update this table in the same pull request. Avoid words such as “complete,” “secure,” or “supported” unless the repository contains evidence for that claim.
