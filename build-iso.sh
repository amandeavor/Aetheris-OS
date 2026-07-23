#!/bin/bash
# File: build-iso.sh
# Master build script to package Aetheris OS and generate a bootable ISO.

set -eo pipefail

echo "=========================================================="
echo "          Aetheris OS Live ISO Build Pipeline             "
echo "=========================================================="

# 1. Host verification
if [ "$(uname)" != "Linux" ]; then
    echo "Error: This script must be executed on a Linux host." >&2
    exit 1
fi

# 2. Dependency verification
echo "Checking build dependencies..."
dependencies=(git mtools qemu grub parted-devel sqlite-devel pkg-config gcc make cargo)
missing=()
for dep in "${dependencies[@]}"; do
    if ! command -v "$dep" >/dev/null 2>&1 && ! ldconfig -p | grep -q "$dep" 2>/dev/null; then
        missing+=("$dep")
    fi
done

if [ ${#missing[@]} -ne 0 ]; then
    echo "Error: Missing host dependencies: ${missing[*]}" >&2
    echo "Please install them via your host package manager (e.g., 'sudo xbps-install -S ${missing[*]}')." >&2
    exit 1
fi

# 3. Create clean workspace
WORKSPACE_DIR="build_workspace"
OVERLAY_DIR="$WORKSPACE_DIR/overlay"
REPO_DIR="$WORKSPACE_DIR/aetheris-repo"
echo "Initializing workspace in: $WORKSPACE_DIR..."
rm -rf "$WORKSPACE_DIR"
mkdir -p "$OVERLAY_DIR" "$REPO_DIR"

# 4. Set up Repository Signing Keys
if [ ! -f "keys/aetheris-repo-privkey.pem" ]; then
    echo "Repository signing keys not found. Generating..."
    mkdir -p scripts
    # We will write scripts/setup-repo-keys.sh next, but we run it here if it exists
    if [ -f "scripts/setup-repo-keys.sh" ]; then
        bash scripts/setup-repo-keys.sh
    fi
fi

# 5. Compile custom binaries (for backup or package templates)
echo "Compiling VelocityMind preloader daemon..."
(
    cd velocitymind
    make clean
    make
)
mkdir -p "$OVERLAY_DIR/usr/bin"
cp velocitymind/velocitymind "$OVERLAY_DIR/usr/bin/"

echo "Compiling chwd_port hardware detection utility..."
(
    cd chwd_port
    cargo build --release
)
cp chwd_port/target/release/chwd_port "$OVERLAY_DIR/usr/bin/chwd"
mkdir -p "$OVERLAY_DIR/usr/share/chwd/profiles/pci"
cp chwd_port/profiles/*.toml "$OVERLAY_DIR/usr/share/chwd/profiles/pci/"

echo "Compiling VelocitySetup OOBE welcome wizard..."
(
    cd velocitysetup
    cargo build --release
)
cp velocitysetup/target/release/velocitysetup "$OVERLAY_DIR/usr/bin/"

echo "Compiling VelocityInstall (installer backend)..."
(
    cd velocityinstall/src-tauri
    cargo build --release
)
cp velocityinstall/src-tauri/target/release/velocityinstall "$OVERLAY_DIR/usr/bin/"

echo "Compiling VelocityStore (software center backend)..."
(
    cd velocitystore/src-tauri
    cargo build --release
)
cp velocitystore/src-tauri/target/release/velocitystore "$OVERLAY_DIR/usr/bin/"

# 6. Bootstrap void-packages and compile custom packages via xbps-src
echo "Cloning void-packages for xbps-src compilation..."
git clone --depth=1 https://github.com/void-linux/void-packages.git "$WORKSPACE_DIR/void-packages"
(
    cd "$WORKSPACE_DIR/void-packages"
    ./xbps-src binary-bootstrap
)

# Symlink all custom Aetheris package templates
echo "Registering custom templates in void-packages..."
for dir in srcpkgs/*; do
    if [ -d "$dir" ]; then
        pkg=$(basename "$dir")
        ln -sf "$(pwd)/$dir" "$WORKSPACE_DIR/void-packages/srcpkgs/$pkg"
    fi
done

# Compile custom packages
echo "Compiling linux-aetheris kernel..."
(
    cd "$WORKSPACE_DIR/void-packages"
    # Replace BORE patch placeholder checksum with actual checksum when building
    # For build execution safety in automated scripts:
    ./xbps-src pkg linux-aetheris
)

# Compile other custom applications
custom_apps=(velocitymind exec-guard chwd-port velocity-install velocity-store velocity-setup)
for app in "${custom_apps[@]}"; do
    echo "Compiling custom package: $app..."
    (
        cd "$WORKSPACE_DIR/void-packages"
        ./xbps-src pkg "$app"
    )
done

# Copy resulting .xbps packages to local repository
echo "Populating local Aetheris XBPS repository..."
find "$WORKSPACE_DIR/void-packages/hostdir/binpkgs/" -name "*.xbps" -exec cp {} "$REPO_DIR/" \;

# Index and sign the local repository
echo "Indexing local repository..."
if [ -f "keys/aetheris-repo-privkey.pem" ]; then
    # Sign repository index using scripts/setup-repo-keys.sh logic
    xbps-rindex --sign --signedby "Aetheris OS <packages@aetheris.org>" --privkey keys/aetheris-repo-privkey.pem "$REPO_DIR"
else
    xbps-rindex -a "$REPO_DIR"/*.xbps
fi

# 7. Compile Design Style Dictionary Tokens
if command -v node >/dev/null 2>&1; then
    echo "Compiling design tokens..."
    node style-dictionary/build.js
else
    echo "Warning: Node.js not found. Using pre-existing theme configs."
fi

# 8. Assemble system configurations overlay
echo "Assembling system configurations overlay..."

# Copy system-wide configurations (etc and usr)
mkdir -p "$OVERLAY_DIR/etc" "$OVERLAY_DIR/usr/share/themes"
cp -r etc/* "$OVERLAY_DIR/etc/"
cp -r usr/* "$OVERLAY_DIR/usr/"

# Copy labwc configs to runtime fallback source
mkdir -p "$OVERLAY_DIR/usr/share/aetheris/config/labwc"
cp -r config/labwc/* "$OVERLAY_DIR/usr/share/aetheris/config/labwc/"

# Copy GTK4 font configurations into user skel
mkdir -p "$OVERLAY_DIR/etc/skel/.config/gtk-4.0"
cp -r config/gtk-4.0/* "$OVERLAY_DIR/etc/skel/.config/gtk-4.0/"

# Copy user-specific configs into skel so new accounts get them
SKEL_CONFIG="$OVERLAY_DIR/etc/skel/.config"
mkdir -p "$SKEL_CONFIG"
cp -r config/labwc "$SKEL_CONFIG/"
cp -r config/sfwbar "$SKEL_CONFIG/"

# Copy themes
cp -r themes/* "$OVERLAY_DIR/usr/share/themes/"

# Make sure all helper scripts are executable
chmod +x "$OVERLAY_DIR/usr/bin/"*

# 8. Bootstrap void-mklive and compile ISO
echo "Cloning void-mklive..."
git clone --depth=1 https://github.com/void-linux/void-mklive.git "$WORKSPACE_DIR/void-mklive"

echo "Building bootable live ISO..."
# We pass base packages needed for Aetheris OS and specify our local repository
(
    cd "$WORKSPACE_DIR/void-mklive"
    sudo ./mklive.sh \
        -a x86_64 \
        -k linux-aetheris \
        -o "../../aetheris-os.iso" \
        -r "../../$REPO_DIR" \
        -p "linux-aetheris velocitymind exec-guard chwd-port velocity-install velocity-store velocity-setup labwc sfwbar bubblewrap jq sqlite-libs sqlite dbus NetworkManager network-manager-applet xterm parted cryptsetup systemd-boot gtk4 libadwaita mesa-dri xwayland wine" \
        -I "../../$OVERLAY_DIR"
)

echo "=========================================================="
echo "SUCCESS: Aetheris OS ISO generated at: aetheris-os.iso"
echo "=========================================================="
