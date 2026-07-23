---
name: wine-proton-execguard
description: Wine and Proton optimization, Bottles prefix administration, bubblewrap sandbox configuration, and Exec Guard runtime enforcement.
---

# Windows App Compatibility & Security Sandbox (Exec Guard)

This skill covers optimizing Windows executable compatibility layers (Wine, Proton, Bottles) and managing the security boundary enforced by the Exec Guard wrapper.

## Translation & Compatibility Layer Tuning

To achieve peak performance for DX11 and DX12 games or software translating to Vulkan:

### 1. Optimization Environment Variables
Apply these settings prior to execution:

```bash
# Enable DLSS/Ray Reconstruction support
export PROTON_ENABLE_NGX_UPDATER=1
export DXVK_NVAPI_DRS_NGX_DLSS_SR_OVERRIDE=on
export DXVK_NVAPI_DRS_NGX_DLSS_FG_OVERRIDE=on

# Direct performance flags
export DXVK_HUD=0          # Suppress rendering overlays unless debugging
export PROTON_NO_ESYNC=0   # Maintain Eventfd synchronization
export PROTON_NO_FSYNC=0   # Enable Futex synchronization (kernel fast locks)
```

### 2. MIME Associations for one-click launch
Map `.exe` and `.msi` extensions to the Exec Guard warning wrapper:

```ini
# ~/.local/share/applications/mimeapps.list
[Default Applications]
application/x-ms-dos-executable=exec-guard.desktop
application/x-msi=exec-guard-msi.desktop
application/x-msdownload=exec-guard.desktop
```

---

## Exec Guard Security Sandbox Structure

Exec Guard prevents malicious Windows binaries from accessing the user’s home directory by verifying target hashes and sandboxing execution using `bubblewrap`.

### 1. Redirection Database Schema
Check if a native Linux package exists inside `/usr/share/exec-guard/app-db.json`:

```json
{
  "alternatives": {
    "winrar.exe": "peazip",
    "utorrent.exe": "transmission-gtk",
    "photoshop.exe": "gimp"
  }
}
```

### 2. Bubblewrap Sandboxing Command
When executing an untrusted binary, sandbox the wine environment:

```bash
bwrap \
  --ro-bind /usr /usr \
  --ro-bind /lib /lib \
  --ro-bind /lib64 /lib64 \
  --ro-bind /etc/alternatives /etc/alternatives \
  --ro-bind /usr/share/exec-guard /usr/share/exec-guard \
  --dir /tmp \
  --dir /var \
  --proc /proc \
  --dev /dev \
  --unshare-all \
  --share-net \
  --bind "$WINEPREFIX" "$WINEPREFIX" \
  --bind "$TARGET_DIR" "$TARGET_DIR" \
  wine "$TARGET_EXE"
```
*Note: This isolates ssh keys, local documents, and host sockets (`/run/user`) from the running process.*
