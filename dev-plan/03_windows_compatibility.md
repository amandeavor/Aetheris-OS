# Sub-Plan 03: Windows Application Compatibility & Security Sandbox

This plan covers binfmt_misc kernel integration, the native redirection database schema, and the secure execution boundaries wrapper using Bubblewrap.

---

## 1. MIME and binfmt_misc Kernel Integrations

### MIME Database Registration (`~/.local/share/applications/mimeapps.list`):
```ini
[Default Applications]
application/x-ms-dos-executable=exec-guard.desktop
application/x-msi=exec-guard-msi.desktop
application/x-msdownload=exec-guard.desktop
```

### binfmt_misc System Registration (`/etc/binfmt.d/win-exec.conf`):
```ini
:AetherisWin:M::MZ::/usr/bin/exec-guard-wrapper:PF
```
*(The `P` flag preserves argv[0], and `F` loads the interpreter binary early on boot, allowing it to execute within sandboxes or namespaces).*

---

## 2. Redirection Database Schema

Location: `/usr/share/exec-guard/app_db.json`
Matches known installer executables (like WinRAR or Photoshop) and alerts users about native, highly optimized Linux package alternatives.

```json
{
  "apps": [
    {
      "name": "Adobe Photoshop",
      "executables": ["photoshop.exe", "photoshop_setup.exe"],
      "alternative_source": "flatpak",
      "alternative_package": "org.gimp.GIMP",
      "message": "Aetheris OS recommended alternative: GIMP (native, highly optimized image editor)."
    },
    {
      "name": "uTorrent",
      "executables": ["utorrent.exe", "utorrent_installer.exe"],
      "alternative_source": "xbps",
      "alternative_package": "transmission-gtk",
      "message": "Aetheris OS recommended alternative: Transmission (native, lightweight torrent client)."
    }
  ]
}
```

---

## 3. Execution Redirection Wrapper Script

Location: `/usr/bin/exec-guard-wrapper`
- Resolves the absolute path of the target executable.
- Queries `app_db.json` via `jq`.
- If a native match is found, displays a custom graphical notification prompting the user to install the Linux alternative.
- If the user declines the alternative or no match is found, forwards the application execution target to the Bubblewrap sandbox environment.

---

## 4. Hardened Bubblewrap Sandbox Execution

Location: `/usr/bin/exec-guard-sandbox`
Prevents container-escape vulnerabilities (such as CVE-2026-48831) by isolating execution parameters.

### Confinement Commands:
```bash
# Isolate execution within a hardened Bubblewrap container
exec bwrap \
    --unshare-all \
    --share-net \
    --die-with-parent \
    --new-session \
    --hostname "aetheris-sandbox" \
    --ro-bind /usr /usr \
    --ro-bind /bin /bin \
    --ro-bind /lib /lib \
    --ro-bind /lib64 /lib64 \
    --ro-bind /etc/resolv.conf /etc/resolv.conf \
    --ro-bind /etc/fonts /etc/fonts \
    --ro-bind /etc/alternatives /etc/alternatives \
    --ro-bind /usr/share/wine /usr/share/wine \
    --ro-bind /usr/share/icons /usr/share/icons \
    --dev /dev \
    --proc /proc \
    --tmpfs /tmp \
    --tmpfs /run \
    --tmpfs "$HOME" \
    --bind "$SANDBOX_HOME" "$HOME" \
    --ro-bind "$TARGET_BIN" "$HOME/target_app.exe" \
    --ro-bind-try "$XDG_RUNTIME_DIR/wayland-0" "$XDG_RUNTIME_DIR/wayland-0" \
    --setenv HOME "$HOME" \
    --setenv PATH "/usr/bin:/bin" \
    --setenv WAYLAND_DISPLAY "wayland-0" \
    --setenv WINEDEBUG "-all" \
    --chdir "$HOME" \
    /usr/bin/wine "$HOME/target_app.exe"
```
*(Locks down SSH keys, local host files, and the user's home directory from the running Wine prefix).*
