#!/bin/bash

# Blue-Green Deployment Script for Netlify Extension Management System
# This script manages zero-downtime deployments using blue-green strategy

set -euo pipefail

# Configuration
NAMESPACE="netlify-extension-production"
APP_NAME="netlify-extension"
TIMEOUT=300
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_DELAY=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Blue-Green Deployment Script for Netlify Extension Management System

Usage: $0 [OPTIONS]

Options:
    --api-image IMAGE           API container image
    --frontend-image IMAGE      Frontend container image
    --ml-image IMAGE           ML service container image
    --monitor-image IMAGE      Monitor service container image
    --config-image IMAGE       Config service container image
    --namespace NAMESPACE      Kubernetes namespace (default: netlify-extension-production)
    --timeout TIMEOUT         Deployment timeout in seconds (default: 300)
    --dry-run                  Show what would be done without executing
    --rollback                 Rollback to previous version
    --help                     Show this help message

Example:
    $0 --api-image ghcr.io/candlefish-enterprise/netlify-extension-api:v1.2.0 \\
       --frontend-image ghcr.io/candlefish-enterprise/netlify-extension-frontend:v1.2.0 \\
       --ml-image ghcr.io/candlefish-enterprise/netlify-extension-ml:v1.2.0 \\
       --monitor-image ghcr.io/candlefish-enterprise/netlify-extension-monitor:v1.2.0 \\
       --config-image ghcr.io/candlefish-enterprise/netlify-extension-config:v1.2.0

EOF
}

# Parse command line arguments
API_IMAGE=""
FRONTEND_IMAGE=""
ML_IMAGE=""
MONITOR_IMAGE=""
CONFIG_IMAGE=""
DRY_RUN=false
ROLLBACK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --api-image)
            API_IMAGE="$2"
            shift 2
            ;;
        --frontend-image)
            FRONTEND_IMAGE="$2"
            shift 2
            ;;
        --ml-image)
            ML_IMAGE="$2"
            shift 2
            ;;
        --monitor-image)
            MONITOR_IMAGE="$2"
            shift 2
            ;;
        --config-image)
            CONFIG_IMAGE="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ "$ROLLBACK" = false ]; then
    if [[ -z "$API_IMAGE" || -z "$FRONTEND_IMAGE" || -z "$ML_IMAGE" || -z "$MONITOR_IMAGE" || -z "$CONFIG_IMAGE" ]]; then
        error "All image parameters are required for deployment"
        show_help
        exit 1
    fi
fi

# Check kubectl access
check_kubectl() {
    log "Checking kubectl access to namespace: $NAMESPACE"
    if ! kubectl auth can-i get deployments --namespace="$NAMESPACE" >/dev/null 2>&1; then
        error "No access to Kubernetes namespace: $NAMESPACE"
        exit 1
    fi
    success "Kubectl access confirmed"
}

# Get current environment (blue or green)
get_current_environment() {
    local current_label
    current_label=$(kubectl get service ${APP_NAME}-service -n "$NAMESPACE" -o jsonpath='{.spec.selector.environment}' 2>/dev/null || echo "blue")
    echo "$current_label"
}

# Get target environment (opposite of current)
get_target_environment() {
    local current=$1
    if [ "$current" = "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Deploy to target environment
deploy_to_environment() {
    local env=$1
    local suffix="-$env"

    log "Deploying to $env environment..."

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would deploy with images:"
        log "  API: $API_IMAGE"
        log "  Frontend: $FRONTEND_IMAGE"
        log "  ML: $ML_IMAGE"
        log "  Monitor: $MONITOR_IMAGE"
        log "  Config: $CONFIG_IMAGE"
        return 0
    fi

    # Update deployment images
    kubectl patch deployment ${APP_NAME}-api$suffix -n "$NAMESPACE" \
        -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"api\",\"image\":\"$API_IMAGE\"}]}}}}"

    kubectl patch deployment ${APP_NAME}-frontend$suffix -n "$NAMESPACE" \
        -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"frontend\",\"image\":\"$FRONTEND_IMAGE\"}]}}}}"

    kubectl patch deployment ${APP_NAME}-ml$suffix -n "$NAMESPACE" \
        -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"ml\",\"image\":\"$ML_IMAGE\"}]}}}}"

    kubectl patch deployment ${APP_NAME}-monitor$suffix -n "$NAMESPACE" \
        -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"monitor\",\"image\":\"$MONITOR_IMAGE\"}]}}}}"

    kubectl patch deployment ${APP_NAME}-config$suffix -n "$NAMESPACE" \
        -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"config\",\"image\":\"$CONFIG_IMAGE\"}]}}}}"

    log "Waiting for $env environment deployments to be ready..."
    kubectl rollout status deployment ${APP_NAME}-api$suffix -n "$NAMESPACE" --timeout=${TIMEOUT}s
    kubectl rollout status deployment ${APP_NAME}-frontend$suffix -n "$NAMESPACE" --timeout=${TIMEOUT}s
    kubectl rollout status deployment ${APP_NAME}-ml$suffix -n "$NAMESPACE" --timeout=${TIMEOUT}s
    kubectl rollout status deployment ${APP_NAME}-monitor$suffix -n "$NAMESPACE" --timeout=${TIMEOUT}s
    kubectl rollout status deployment ${APP_NAME}-config$suffix -n "$NAMESPACE" --timeout=${TIMEOUT}s

    success "$env environment deployment completed"
}

# Health check function
health_check() {
    local env=$1
    local suffix="-$env"
    local retries=0

    log "Performing health checks on $env environment..."

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would perform health checks on $env environment"
        return 0
    fi

    # Get service endpoints
    local api_endpoint
    local frontend_endpoint

    api_endpoint=$(kubectl get service ${APP_NAME}-api$suffix -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')
    frontend_endpoint=$(kubectl get service ${APP_NAME}-frontend$suffix -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')

    while [ $retries -lt $HEALTH_CHECK_RETRIES ]; do
        log "Health check attempt $((retries + 1))/$HEALTH_CHECK_RETRIES"

        # Check API health
        if kubectl run health-check-api-$env --rm -i --restart=Never --image=curlimages/curl -- \
            curl -f -s "http://$api_endpoint:3001/health" >/dev/null 2>&1; then
            log "API health check passed"
        else
            warn "API health check failed"
            ((retries++))
            sleep $HEALTH_CHECK_DELAY
            continue
        fi

        # Check Frontend health
        if kubectl run health-check-frontend-$env --rm -i --restart=Never --image=curlimages/curl -- \
            curl -f -s "http://$frontend_endpoint:80/health" >/dev/null 2>&1; then
            log "Frontend health check passed"
        else
            warn "Frontend health check failed"
            ((retries++))
            sleep $HEALTH_CHECK_DELAY
            continue
        fi

        success "All health checks passed for $env environment"
        return 0
    done

    error "Health checks failed after $HEALTH_CHECK_RETRIES attempts"
    return 1
}

# Switch traffic to target environment
switch_traffic() {
    local target_env=$1

    log "Switching traffic to $target_env environment..."

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would switch traffic to $target_env environment"
        return 0
    fi

    # Update service selectors to point to target environment
    kubectl patch service ${APP_NAME}-service -n "$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"environment\":\"$target_env\"}}}"

    kubectl patch service ${APP_NAME}-api-service -n "$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"environment\":\"$target_env\"}}}"

    kubectl patch service ${APP_NAME}-frontend-service -n "$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"environment\":\"$target_env\"}}}"

    kubectl patch service ${APP_NAME}-ml-service -n "$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"environment\":\"$target_env\"}}}"

    kubectl patch service ${APP_NAME}-monitor-service -n "$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"environment\":\"$target_env\"}}}"

    kubectl patch service ${APP_NAME}-config-service -n "$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"environment\":\"$target_env\"}}}"

    success "Traffic switched to $target_env environment"
}

# Create backup of current state
create_backup() {
    local current_env=$1
    local backup_file="backup-$(date +%Y%m%d-%H%M%S).yaml"

    log "Creating backup of current state..."

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would create backup: $backup_file"
        return 0
    fi

    kubectl get deployments,services -n "$NAMESPACE" -l environment="$current_env" -o yaml > "$backup_file"
    success "Backup created: $backup_file"
}

# Rollback function
perform_rollback() {
    local current_env
    current_env=$(get_current_environment)
    local previous_env
    previous_env=$(get_target_environment "$current_env")

    log "Rolling back from $current_env to $previous_env environment..."

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would rollback to $previous_env environment"
        return 0
    fi

    # Switch traffic back
    switch_traffic "$previous_env"

    # Verify rollback
    if health_check "$previous_env"; then
        success "Rollback completed successfully"
    else
        error "Rollback health checks failed"
        exit 1
    fi
}

# Main deployment function
main() {
    log "Starting blue-green deployment for Netlify Extension Management System"

    # Check prerequisites
    check_kubectl

    # Handle rollback
    if [ "$ROLLBACK" = true ]; then
        perform_rollback
        exit 0
    fi

    # Get current and target environments
    local current_env
    current_env=$(get_current_environment)
    local target_env
    target_env=$(get_target_environment "$current_env")

    log "Current environment: $current_env"
    log "Target environment: $target_env"

    # Create backup
    create_backup "$current_env"

    # Deploy to target environment
    if ! deploy_to_environment "$target_env"; then
        error "Deployment to $target_env failed"
        exit 1
    fi

    # Perform health checks
    if ! health_check "$target_env"; then
        error "Health checks failed for $target_env environment"
        log "Deployment aborted. Current environment ($current_env) remains active."
        exit 1
    fi

    # Switch traffic
    switch_traffic "$target_env"

    # Final health check after traffic switch
    log "Performing final health checks after traffic switch..."
    sleep 10  # Allow some time for traffic to flow

    if ! health_check "$target_env"; then
        error "Final health checks failed. Rolling back..."
        switch_traffic "$current_env"
        exit 1
    fi

    success "Blue-green deployment completed successfully!"
    log "Active environment: $target_env"
    log "Standby environment: $current_env"

    # Optional: Scale down old environment after successful deployment
    warn "Remember to scale down the standby environment ($current_env) if desired"
}

# Trap errors and cleanup
cleanup() {
    if [ $? -ne 0 ]; then
        error "Deployment failed. Check logs above for details."
    fi
}

trap cleanup EXIT

# Run main function
main "$@"
