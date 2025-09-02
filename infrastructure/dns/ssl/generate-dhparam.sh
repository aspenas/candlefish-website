#!/bin/bash
# Generate Diffie-Hellman parameters for SSL

set -euo pipefail

# Configuration
DH_PARAM_FILE="/etc/ssl/certs/dhparam.pem"
DH_BITS=2048

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root"
fi

# Check if dhparam file already exists
if [[ -f "$DH_PARAM_FILE" ]]; then
    warn "DH parameters file already exists at $DH_PARAM_FILE"
    read -p "Do you want to regenerate it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Skipping DH parameters generation"
        exit 0
    fi
fi

# Create directory if it doesn't exist
mkdir -p "$(dirname "$DH_PARAM_FILE")"

log "Generating Diffie-Hellman parameters with $DH_BITS bits..."
log "This may take several minutes..."

# Generate DH parameters
openssl dhparam -out "$DH_PARAM_FILE" "$DH_BITS" || error "Failed to generate DH parameters"

# Set proper permissions
chmod 644 "$DH_PARAM_FILE"

log "DH parameters generated successfully at $DH_PARAM_FILE"

# Verify the generated file
if openssl dhparam -in "$DH_PARAM_FILE" -check -noout; then
    log "DH parameters verification successful"
else
    error "DH parameters verification failed"
fi

log "SSL DH parameters setup complete!"