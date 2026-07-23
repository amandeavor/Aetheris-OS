#!/bin/bash
# File: scripts/setup-repo-keys.sh
# Set up RSA keypairs for Void Linux XBPS package index repository signing.

set -eo pipefail

KEY_DIR="keys"
PRIV_KEY="$KEY_DIR/aetheris-repo-privkey.pem"
PUB_KEY="$KEY_DIR/aetheris-repo-pubkey.pem"
REPO_DIR="build_workspace/aetheris-repo"

echo "=== Aetheris OS Repository Signing Setup ==="

# 1. Ensure keys directory exists
mkdir -p "$KEY_DIR"
chmod 700 "$KEY_DIR"

# 2. Add gitignore rule for the private key
if [ -f ".gitignore" ]; then
    if ! grep -q "aetheris-repo-privkey.pem" .gitignore; then
        echo "keys/*privkey.pem" >> .gitignore
        echo "Added private key ignore rule to .gitignore."
    fi
else
    echo "keys/*privkey.pem" > .gitignore
    echo "Created .gitignore with private key ignore rule."
fi

# 3. Generate keypair if not present
if [ ! -f "$PRIV_KEY" ]; then
    echo "Generating 4096-bit RSA private key..."
    openssl genrsa -des3 -out "$PRIV_KEY" 4096
    chmod 600 "$PRIV_KEY"

    echo "Extracting RSA public key certificate..."
    openssl rsa -in "$PRIV_KEY" -pubout -out "$PUB_KEY"
    echo "Keys generated successfully."
else
    echo "Using existing repository keypair."
fi

# 4. Sign XBPS repository index if repository exists
if [ -d "$REPO_DIR" ]; then
    echo "Signing XBPS repository index inside: $REPO_DIR..."

    # Sign repository index using xbps-rindex
    if command -v xbps-rindex >/dev/null 2>&1; then
        xbps-rindex --sign \
            --signedby "Aetheris OS <packages@aetheris.org>" \
            --privkey "$PRIV_KEY" \
            "$REPO_DIR"
        echo "Local repository signed successfully."
    else
        echo "Warning: xbps-rindex not found on host. Repository signature skipped."
    fi
else
    echo "Repository directory $REPO_DIR not found. Skipping signature."
fi

echo ""
echo "=========================================================="
echo "INSTRUCTIONS TO TRUST REPOSITORY KEY:"
echo "Copy the public key file to target system:"
echo "  sudo cp keys/aetheris-repo-pubkey.pem /var/db/xbps/keys/packages@aetheris.org.pem"
echo "Register custom repository:"
echo "  sudo xbps-install --repository=http://repo.aetheris-os.org/current -S"
echo "=========================================================="
