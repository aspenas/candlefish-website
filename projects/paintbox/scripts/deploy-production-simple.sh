#!/bin/bash

# Simple production deployment script
set -e

APP_NAME="paintbox"
HEALTH_URL="https://${APP_NAME}.fly.dev/api/health"
JWKS_URL="https://${APP_NAME}.fly.dev/.well-known/jwks.json"

# Colors for output
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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    if ! command -v fly &> /dev/null; then
        error "fly CLI not found"
        exit 1
    fi

    if ! fly auth whoami &> /dev/null; then
        error "Not logged into Fly.io"
        exit 1
    fi

    log "Prerequisites OK"
}

# Deploy application
deploy() {
    log "Starting deployment..."

    if fly deploy --app "$APP_NAME" --strategy rolling; then
        log "Deployment initiated successfully"
    else
        error "Deployment failed"
        exit 1
    fi
}

# Wait for health check
wait_for_health() {
    log "Waiting for health check..."
    local attempts=0
    local max_attempts=30

    while [ $attempts -lt $max_attempts ]; do
        if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
            log "Health check passed"
            return 0
        fi

        attempts=$((attempts + 1))
        warn "Health check attempt $attempts/$max_attempts failed, retrying..."
        sleep 10
    done

    error "Health check failed after $max_attempts attempts"
    return 1
}

# Verify JWKS endpoint
verify_jwks() {
    log "Verifying JWKS endpoint..."

    if response=$(curl -sf "$JWKS_URL" 2>/dev/null); then
        if echo "$response" | grep -q '"keys"'; then
            log "JWKS endpoint verified"
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

# Main deployment
main() {
    log "Starting production deployment"

    check_prerequisites
    deploy

    if wait_for_health && verify_jwks; then
        log "Deployment completed successfully!"
        log "App URL: https://$APP_NAME.fly.dev"
        log "Health: $HEALTH_URL"
        log "JWKS: $JWKS_URL"
    else
        error "Deployment verification failed"
        exit 1
    fi
}

main "$@"
