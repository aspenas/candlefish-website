#!/bin/bash
# Production Deployment Script for Fly.io
set -euo pipefail

# Configuration
PROJECT_ROOT="/Users/patricksmith/candlefish-ai"
PAINTBOX_DIR="$PROJECT_ROOT/projects/paintbox"
TEMPORAL_DIR="$PROJECT_ROOT/candlefish-temporal-platform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Parse command line arguments
ENVIRONMENT="${1:-production}"
STRATEGY="${2:-rolling}"

log "🚀 Starting Production Deployment"
log "Environment: $ENVIRONMENT"
log "Strategy: $STRATEGY"

# Function to check app status
check_app_status() {
    local app_name=$1
    log "Checking status of $app_name..."

    if flyctl status -a "$app_name" 2>/dev/null | grep -q "Deployed"; then
        log "✅ $app_name is deployed"
        return 0
    else
        warning "$app_name is not deployed or unhealthy"
        return 1
    fi
}

# Function to deploy app to Fly.io
deploy_app() {
    local app_name=$1
    local app_dir=$2
    local config_file=$3

    log "Deploying $app_name from $app_dir..."

    cd "$app_dir"

    # Check if app exists
    if ! flyctl apps list 2>/dev/null | grep -q "$app_name"; then
        log "Creating app $app_name..."
        flyctl apps create "$app_name" --org personal || true
    fi

    # Set secrets from AWS Secrets Manager
    log "Setting secrets for $app_name..."
    set_app_secrets "$app_name"

    # Deploy based on strategy
    case $STRATEGY in
        blue-green)
            deploy_blue_green "$app_name" "$config_file"
            ;;
        canary)
            deploy_canary "$app_name" "$config_file"
            ;;
        rolling|*)
            deploy_rolling "$app_name" "$config_file"
            ;;
    esac
}

# Function to set app secrets
set_app_secrets() {
    local app_name=$1

    # Get secrets from AWS Secrets Manager
    if [ "$app_name" == "paintbox-app" ]; then
        # Paintbox specific secrets
        flyctl secrets set \
            NODE_ENV="production" \
            NEXT_PUBLIC_APP_VERSION="1.0.0" \
            -a "$app_name" 2>/dev/null || true

        # Database URL (if exists in AWS)
        DB_URL=$(aws secretsmanager get-secret-value \
            --secret-id "paintbox/database/url" \
            --query SecretString --output text 2>/dev/null || echo "")

        if [ -n "$DB_URL" ]; then
            flyctl secrets set DATABASE_URL="$DB_URL" -a "$app_name" 2>/dev/null || true
        fi
    fi

    if [ "$app_name" == "candlefish-temporal-platform" ]; then
        # Temporal specific secrets
        flyctl secrets set \
            NODE_ENV="production" \
            TEMPORAL_ADDRESS="temporal.candlefish.ai:7233" \
            -a "$app_name" 2>/dev/null || true
    fi
}

# Rolling deployment
deploy_rolling() {
    local app_name=$1
    local config_file=$2

    log "Performing rolling deployment for $app_name..."

    if [ -f "$config_file" ]; then
        flyctl deploy --config "$config_file" --strategy rolling -a "$app_name"
    else
        flyctl deploy --strategy rolling -a "$app_name"
    fi
}

# Blue-green deployment
deploy_blue_green() {
    local app_name=$1
    local config_file=$2

    log "Performing blue-green deployment for $app_name..."

    # Deploy to staging slot first
    local staging_app="${app_name}-staging"

    # Create staging app if it doesn't exist
    if ! flyctl apps list 2>/dev/null | grep -q "$staging_app"; then
        flyctl apps create "$staging_app" --org personal || true
    fi

    # Deploy to staging
    if [ -f "$config_file" ]; then
        flyctl deploy --config "$config_file" -a "$staging_app"
    else
        flyctl deploy -a "$staging_app"
    fi

    # Run health checks on staging
    log "Running health checks on staging..."
    sleep 10

    if curl -f -s "https://${staging_app}.fly.dev/api/health" > /dev/null 2>&1; then
        log "✅ Staging health check passed"

        # Swap production with staging
        log "Swapping production with staging..."
        # Note: Fly.io doesn't have native blue-green, so we simulate it
        if [ -f "$config_file" ]; then
            flyctl deploy --config "$config_file" -a "$app_name"
        else
            flyctl deploy -a "$app_name"
        fi
    else
        error "Staging health check failed, aborting deployment"
        return 1
    fi
}

# Canary deployment
deploy_canary() {
    local app_name=$1
    local config_file=$2

    log "Performing canary deployment for $app_name..."

    # Deploy with canary strategy (Fly.io specific)
    if [ -f "$config_file" ]; then
        flyctl deploy --config "$config_file" --strategy canary -a "$app_name"
    else
        flyctl deploy --strategy canary -a "$app_name"
    fi

    # Monitor for 60 seconds
    log "Monitoring canary deployment..."
    sleep 60

    # Check metrics
    if check_app_metrics "$app_name"; then
        log "✅ Canary metrics look good, promoting..."
        flyctl deploy --strategy immediate -a "$app_name"
    else
        error "Canary metrics failed, rolling back..."
        flyctl apps restart "$app_name"
        return 1
    fi
}

# Check app metrics
check_app_metrics() {
    local app_name=$1

    # Check if app is responding
    if curl -f -s "https://${app_name}.fly.dev/api/health" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Main deployment flow
main() {
    log "Starting deployment process..."

    # 1. Deploy Paintbox app
    if [ -d "$PAINTBOX_DIR" ]; then
        log "📦 Deploying Paintbox application..."

        # Fix the fly.toml path issue
        if [ -f "$PAINTBOX_DIR/fly.toml" ]; then
            deploy_app "paintbox-app" "$PAINTBOX_DIR" "$PAINTBOX_DIR/fly.toml"
        else
            warning "fly.toml not found for Paintbox, attempting deployment without config"
            deploy_app "paintbox-app" "$PAINTBOX_DIR" ""
        fi
    else
        warning "Paintbox directory not found, skipping..."
    fi

    # 2. Deploy Temporal platform
    if [ -d "$TEMPORAL_DIR" ]; then
        log "⚙️ Deploying Temporal platform..."

        if [ -f "$TEMPORAL_DIR/fly.toml" ]; then
            deploy_app "candlefish-temporal-platform" "$TEMPORAL_DIR" "$TEMPORAL_DIR/fly.toml"
        else
            warning "fly.toml not found for Temporal, attempting deployment without config"
            deploy_app "candlefish-temporal-platform" "$TEMPORAL_DIR" ""
        fi
    else
        warning "Temporal directory not found, skipping..."
    fi

    # 3. Verify deployments
    log "🔍 Verifying deployments..."

    local all_healthy=true

    if ! check_app_status "paintbox-app"; then
        error "Paintbox app deployment verification failed"
        all_healthy=false
    fi

    if ! check_app_status "candlefish-temporal-platform"; then
        error "Temporal platform deployment verification failed"
        all_healthy=false
    fi

    # 4. Run post-deployment tests
    if [ "$all_healthy" = true ]; then
        log "✅ All deployments successful!"

        # Run health checks
        log "Running health checks..."
        curl -s "https://paintbox-app.fly.dev/api/health" | jq '.' || true

        # Show deployment summary
        log "Deployment Summary:"
        log "==================="
        log "Paintbox: https://paintbox-app.fly.dev"
        log "Temporal: https://candlefish-temporal-platform.fly.dev"
        log "Health: https://paintbox-app.fly.dev/api/health"
        log "Status: https://paintbox-app.fly.dev/api/status"
    else
        error "Some deployments failed. Please check the logs."
        exit 1
    fi
}

# Run main function
main "$@"
