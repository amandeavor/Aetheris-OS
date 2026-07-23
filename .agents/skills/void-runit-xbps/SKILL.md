---
name: void-runit-xbps
description: Void Linux base distribution administration, runit process supervision, and xbps/xbps-src package management expertise.
---

# Void Linux Base System & Process Supervision

This skill provides comprehensive instructions for administering Void Linux, managing system services under the `runit` init system, and executing package transactions or source builds using `xbps` and `xbps-src`.

## Runit Service Supervision

Void Linux uses `runit` for process supervision. Every service is a directory containing a shell script named `run` and optional helper files.

### 1. Creating a Service Template
To register a new service, create a directory in `/etc/sv/` and populate the `run` script:

```bash
#!/bin/sh
# /etc/sv/my-service/run
exec 2>&1 # Redirect stderr to stdout for logger
export MY_ENV_VAR="value"

# Execute process in foreground (do NOT daemonize/fork)
exec my-binary --flags
```

### 2. Service Management Commands
To manage services, create a symbolic link into `/var/service/`:

```bash
# Enable and start service
ln -s /etc/sv/my-service /var/service/

# Control state via sv
sv start my-service
sv stop my-service
sv restart my-service
sv status my-service

# Disable service (remove symlink)
rm /var/service/my-service
```

### 3. Adding a Logger
Create a `log` subdirectory in the service directory to supervise log capture:

```bash
# /etc/sv/my-service/log/run
#!/bin/sh
exec vlogger -t my-service
```

---

## XBPS Package Management

`xbps` (X Binary Package System) is Void's native package manager.

### 1. Common Commands

| Command | Action |
|---------|--------|
| `xbps-install -S` | Synchronize repository databases |
| `xbps-install -Su` | Perform a system upgrade |
| `xbps-install -S <pkg>` | Install a package |
| `xbps-remove -R <pkg>` | Remove a package and its unused dependencies |
| `xbps-query -Rs <query>` | Search remote repositories for packages |
| `xbps-query -l` | List all locally installed packages |
| `xbps-query -p <property> <pkg>` | Query specific properties of a package |

### 2. Configuring Custom Repositories
Custom repositories can be registered in `/etc/xbps.d/`:

```ini
# /etc/xbps.d/custom-repo.conf
repository=https://distro.org/repo
```

To sign custom repositories (required for client validation):

```bash
# Generate private key
openssl genrsa -des3 -out custom_repo_privkey.pem 4096

# Index and sign repo directory
xbps-rindex -a /var/www/html/repo/*.xbps
xbps-rindex --sign --signedby 'Architect <architect@distro.org>' --privkey custom_repo_privkey.pem /var/www/html/repo/
```

---

## xbps-src Source Compilation

`xbps-src` compiles source packages in clean chroot environments.

### 1. Setup Environment
```bash
git clone --depth=1 https://github.com/void-linux/void-packages.git
cd void-packages
./xbps-src binary-bootstrap
```

### 2. Compiling Packages
```bash
# Compile a package
./xbps-src pkg <package-name>

# Install the locally compiled package
xbps-install --repositoryhostonly --repository=hostdir/binpkgs <package-name>
```
