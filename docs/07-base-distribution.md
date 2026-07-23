# Base Distribution Comparative Evaluation

Selecting the correct base distribution determines the init system, package management architecture, stability profile, and overall system memory footprint.

## Distribution Comparison

| Distribution Option | Core Init System | System C Library | Package Manager | Rolling or Point Release | Package Accessibility |
|---|---|---|---|---|---|
| Arch Linux | systemd | glibc | pacman | Rolling Release | High (official repos and the AUR) |
| Debian GNU/Linux | systemd | glibc | apt | Point Release | High (official repos) |
| Void Linux | runit | glibc or musl | xbps | Rolling Release | Moderate (expanding official repositories) |
| Alpine Linux | OpenRC | musl | apk | Rolling Release | Low (lacks proprietary/desktop applications) |
| NixOS | systemd | glibc | nix | Declarative / Channel | High (Nixpkg registry) |
| Gentoo Linux | OpenRC or systemd | glibc or musl | portage | Source-compiled | High (compiles packages from source) |

## Critique of Candidate Systems

- **Debian GNU/Linux**: While stable, Debian's conservative update cycle makes it difficult to package modern Wayland compositors and Proton compatibility layers. Debian's standard systemd init stack also introduces unnecessary memory overhead on 1 GB RAM systems.

- **Alpine Linux**: Although Alpine's musl libc and apk package manager yield an extremely lightweight footprint, it is incompatible with major desktop software. Wine, Proton, and proprietary driver stacks require glibc, making Alpine unsuitable for a consumer-facing distribution.

- **NixOS / Gentoo Linux**: These distributions offer excellent flexibility but are poorly suited for mainstream users. Gentoo's source-compilation model stalls low-spec systems during updates, while NixOS's declarative configuration model presents a steep learning curve.

- **Arch Linux**: Arch offers up-to-date packages and optimized third-party repositories (such as CachyOS). However, systemd's memory footprint and the risk of rolling-release breakages require ongoing developer maintenance.

## Justification for the Recommended Base: Void Linux (glibc Edition)

Void Linux (glibc edition) is the ideal base for this distribution. It combines the compatibility of the GNU C Library (glibc) with the fast, simple runit init system, bypassing systemd's memory overhead entirely.

### runit Init System

runit manages system services using simple, readable shell scripts located in `/etc/sv`. This design operates with minimal CPU and memory overhead, requiring less than 2 MB of system memory at runtime.

### xbps Package Manager

Void's native package manager, xbps (X Binary Package System), is fast, lightweight, and supports clean custom repository integration. It allows developers to configure signed custom repositories easily.

#### Generating a Repository Signing Key

```bash
openssl genrsa -des3 -out custom_repo_privkey.pem 4096
```

#### Building and Indexing Packages

Packages are compiled using Void's xbps-src build system, which builds applications in clean, isolated chroot environments. After compilation, packages are added to a local directory and indexed using xbps-rindex:

```bash
xbps-rindex -a /var/www/html/repo/*.xbps
xbps-rindex --sign --signedby 'Architect <architect@distro.org>' --privkey custom_repo_privkey.pem /var/www/html/repo/
```

#### Registering the Custom Repository

Users can register this signed, remote repository by adding a single configuration file:

```ini
# /etc/xbps.d/custom-repo.conf
repository=https://distro.org/repo
```

This combination of runit, glibc, and signed xbps package delivery makes Void Linux the perfect foundation for a highly responsive, low-resource operating system.
