#!/bin/bash

# Simple production monitoring script
set -e

APP_NAME="paintbox"
HEALTH_URL="https://${APP_NAME}.fly.dev/api/health"
JWKS_URL="https://${APP_NAME}.fly.dev/.well-known/jwks.json"
CHECK_INTERVAL=30

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check health endpoint
check_health() {
    local url=$1
    local timeout=${2:-10}

    if curl -sf --max-time "$timeout" "$url" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check JWKS endpoint
check_jwks() {
    if response=$(curl -sf --max-time 10 "$JWKS_URL" 2>/dev/null); then
        if echo "$response" | grep -q '"keys"'; then
            log "JWKS endpoint OK"
            return 0
        else
            error "JWKS endpoint returned invalid response"
            return 1
        fi
    else
        error "JWKS endpoint not accessible"
        return 1
    fi
}

# Monitor loop
monitor() {
    log "Starting monitoring for $APP_NAME"
    log "Health URL: $HEALTH_URL"
    log "JWKS URL: $JWKS_URL"
    log "Check interval: ${CHECK_INTERVAL}s"

    while true; do
        echo ""
        log "Running health checks..."

        if check_health "$HEALTH_URL"; then
            log "Health check passed"
        else
            error "Health check failed"
        fi

        if check_jwks; then
            log "JWKS check passed"
        else
            error "JWKS check failed"
        fi

        # Check machine status
        if fly machine list --app "$APP_NAME" > /dev/null 2>&1; then
            log "Machine status OK"
        else
            warn "Could not check machine status"
        fi

        log "Waiting ${CHECK_INTERVAL}s until next check..."
        sleep $CHECK_INTERVAL
    done
}

# Cleanup on exit
cleanup() {
    log "Monitoring stopped"
    exit 0
}

trap cleanup INT TERM

# Main execution
monitor
