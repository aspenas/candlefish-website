#!/bin/bash

# ==========================================
# Candlefish AI - Emergency Rollback Script
# ==========================================
#
# This script provides immediate rollback capabilities for production deployments
# Implements zero-downtime rollback with comprehensive validation

set -euo pipefail

# Configuration
ENVIRONMENT="production"
NAMESPACE="netlify-extension-production"
TIMEOUT=120
FORCE_ROLLBACK=false
BACKUP_RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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
Emergency Rollback Script for Netlify Extension Management System

Usage: $0 [ENVIRONMENT] [OPTIONS]

Environments:
    staging                Staging environment
    production             Production environment (default)

Options:
    --namespace NAMESPACE  Kubernetes namespace
    --timeout TIMEOUT     Rollback timeout in seconds (default: 120)
    --force               Force rollback without confirmation
    --to-revision REV     Rollback to specific revision number
    --service SERVICE     Rollback specific service only (api|frontend|ml|monitor|config)
    --list-revisions      List available revisions and exit
    --dry-run             Show what would be done without executing
    --help                Show this help message

Examples:
    $0 production                          # Interactive rollback of all services
    $0 staging --service api --force      # Force rollback API service in staging
    $0 production --to-revision 5         # Rollback to revision 5
    $0 production --list-revisions        # Show available rollback revisions

EOF
}

# Parse arguments
SPECIFIC_SERVICE=""
TARGET_REVISION=""
LIST_REVISIONS=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        staging|production)
            ENVIRONMENT="$1"
            NAMESPACE="netlify-extension-$1"
            shift
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --force)
            FORCE_ROLLBACK=true
            shift
            ;;
        --to-revision)
            TARGET_REVISION="$2"
            shift 2
            ;;
        --service)
            SPECIFIC_SERVICE="$2"
            shift 2
            ;;
        --list-revisions)
            LIST_REVISIONS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
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

# Check kubectl access
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed or not in PATH"
        exit 1
    fi

    if ! kubectl auth can-i get deployments --namespace="$NAMESPACE" >/dev/null 2>&1; then
        error "No access to Kubernetes namespace: $NAMESPACE"
        exit 1
    fi

    log "kubectl access confirmed for namespace: $NAMESPACE"
}

# List available revisions
list_revisions() {
    local service=$1
    local deployment_name="netlify-${service}"

    if [ "$ENVIRONMENT" != "production" ]; then
        deployment_name="${deployment_name}-${ENVIRONMENT}"
    fi

    log "Available revisions for $service:"
    kubectl rollout history deployment "$deployment_name" -n "$NAMESPACE" --revision-history-limit=10
}

# List all service revisions
list_all_revisions() {
    local services=("api" "frontend" "ml" "monitor" "config")

    log "Listing available revisions for all services in $ENVIRONMENT environment:"
    echo ""

    for service in "${services[@]}"; do
        if [ -n "$SPECIFIC_SERVICE" ] && [ "$SPECIFIC_SERVICE" != "$service" ]; then
            continue
        fi
        list_revisions "$service"
        echo ""
    done
}

# Get current deployment status
get_deployment_status() {
    local service=$1
    local deployment_name="netlify-${service}"

    if [ "$ENVIRONMENT" != "production" ]; then
        deployment_name="${deployment_name}-${ENVIRONMENT}"
    fi

    local current_revision
    current_revision=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" \
        -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}' 2>/dev/null || echo "unknown")

    local ready_replicas
    ready_replicas=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" \
        -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")

    local desired_replicas
    desired_replicas=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" \
        -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")

    local image
    image=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" \
        -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "unknown")

    echo "Service: $service"
    echo "  Current Revision: $current_revision"
    echo "  Ready/Desired: $ready_replicas/$desired_replicas"
    echo "  Current Image: $image"
}

# Create rollback backup
create_rollback_backup() {
    local backup_dir="rollback-backups"
    local backup_file="$backup_dir/pre-rollback-$(date +%Y%m%d-%H%M%S).yaml"

    log "Creating pre-rollback backup..."

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would create backup: $backup_file"
        return 0
    fi

    # Create backup directory
    mkdir -p "$backup_dir"

    # Backup current deployments
    kubectl get deployments -n "$NAMESPACE" -l "app.kubernetes.io/name=netlify-extension" -o yaml > "$backup_file"

    success "Pre-rollback backup created: $backup_file"

    # Clean up old backups
    find "$backup_dir" -name "pre-rollback-*.yaml" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
}

# Perform rollback for a specific service
rollback_service() {
    local service=$1
    local deployment_name="netlify-${service}"

    if [ "$ENVIRONMENT" != "production" ]; then
        deployment_name="${deployment_name}-${ENVIRONMENT}"
    fi

    log "Rolling back $service service..."

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would rollback $service service"
        if [ -n "$TARGET_REVISION" ]; then
            log "[DRY RUN] Would rollback to revision: $TARGET_REVISION"
        else
            log "[DRY RUN] Would rollback to previous revision"
        fi
        return 0
    fi

    # Perform rollback
    if [ -n "$TARGET_REVISION" ]; then
        kubectl rollout undo deployment "$deployment_name" -n "$NAMESPACE" --to-revision="$TARGET_REVISION"
        log "Rolling back $service to revision $TARGET_REVISION..."
    else
        kubectl rollout undo deployment "$deployment_name" -n "$NAMESPACE"
        log "Rolling back $service to previous revision..."
    fi

    # Wait for rollback to complete
    log "Waiting for $service rollback to complete..."
    if kubectl rollout status deployment "$deployment_name" -n "$NAMESPACE" --timeout="${TIMEOUT}s"; then
        success "$service rollback completed successfully"
        return 0
    else
        error "$service rollback failed or timed out"
        return 1
    fi
}

# Perform health check after rollback
post_rollback_health_check() {
    local service=$1

    log "Performing post-rollback health check for $service..."

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would perform health check for $service"
        return 0
    fi

    # Use the health check script if available
    local health_check_script="$(dirname "$0")/health-check.sh"
    if [ -f "$health_check_script" ]; then
        if bash "$health_check_script" "$ENVIRONMENT" --service "$service" --timeout 30; then
            success "$service post-rollback health check passed"
            return 0
        else
            error "$service post-rollback health check failed"
            return 1
        fi
    else
        warn "Health check script not found, skipping health check"
        return 0
    fi
}

# Get user confirmation
get_confirmation() {
    if [ "$FORCE_ROLLBACK" = true ]; then
        return 0
    fi

    echo ""
    warn "You are about to perform an emergency rollback in the $ENVIRONMENT environment."

    if [ -n "$SPECIFIC_SERVICE" ]; then
        warn "This will rollback the $SPECIFIC_SERVICE service only."
    else
        warn "This will rollback ALL services in the Netlify Extension Management System."
    fi

    if [ -n "$TARGET_REVISION" ]; then
        warn "Target revision: $TARGET_REVISION"
    else
        warn "Target: Previous revision (automatic)"
    fi

    echo ""
    read -p "Are you sure you want to proceed? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Rollback cancelled by user"
        exit 0
    fi
}

# Send notification
send_notification() {
    local status=$1
    local message=$2

    # Send Slack notification if webhook URL is available
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local emoji="🔄"
        if [ "$status" = "success" ]; then
            emoji="✅"
        elif [ "$status" = "failure" ]; then
            emoji="❌"
        fi

        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{
                \"text\": \"$emoji Emergency Rollback - $message\",
                \"blocks\": [
                    {
                        \"type\": \"section\",
                        \"text\": {
                            \"type\": \"mrkdwn\",
                            \"text\": \"*Emergency Rollback - Netlify Extension Management System*\n$emoji Status: $status\n📝 Message: $message\n🌍 Environment: $ENVIRONMENT\n⏰ Time: $(date)\"
                        }
                    }
                ]
            }" >/dev/null 2>&1 || warn "Failed to send Slack notification"
    fi
}

# Main rollback function
main() {
    log "Emergency Rollback Script for Netlify Extension Management System"
    log "Environment: $ENVIRONMENT"
    log "Namespace: $NAMESPACE"

    # Check prerequisites
    check_kubectl

    # Handle list revisions request
    if [ "$LIST_REVISIONS" = true ]; then
        list_all_revisions
        exit 0
    fi

    # Show current status
    log "Current deployment status:"
    echo ""

    local services=("api" "frontend" "ml" "monitor" "config")
    if [ -n "$SPECIFIC_SERVICE" ]; then
        services=("$SPECIFIC_SERVICE")
    fi

    for service in "${services[@]}"; do
        get_deployment_status "$service"
        echo ""
    done

    # Get confirmation
    get_confirmation

    # Create backup
    create_rollback_backup

    # Perform rollback
    local failed_services=()
    local successful_services=()

    send_notification "started" "Emergency rollback initiated"

    for service in "${services[@]}"; do
        if rollback_service "$service"; then
            if post_rollback_health_check "$service"; then
                successful_services+=("$service")
                success "$service rollback completed and healthy"
            else
                failed_services+=("$service")
                error "$service rollback completed but health check failed"
            fi
        else
            failed_services+=("$service")
            error "$service rollback failed"
        fi
    done

    # Summary
    echo ""
    log "Emergency rollback summary:"

    if [ ${#successful_services[@]} -gt 0 ]; then
        success "Successfully rolled back services: ${successful_services[*]}"
    fi

    if [ ${#failed_services[@]} -gt 0 ]; then
        error "Failed to rollback services: ${failed_services[*]}"
        send_notification "failure" "Rollback failed for services: ${failed_services[*]}"

        # Show current status for failed services
        echo ""
        log "Current status of failed services:"
        for service in "${failed_services[@]}"; do
            get_deployment_status "$service"
        done

        exit 1
    fi

    success "Emergency rollback completed successfully!"
    send_notification "success" "Emergency rollback completed successfully for: ${successful_services[*]}"

    # Show final status
    echo ""
    log "Final deployment status:"
    for service in "${services[@]}"; do
        get_deployment_status "$service"
    done

    exit 0
}

# Trap signals for cleanup
cleanup() {
    if [ $? -ne 0 ]; then
        error "Emergency rollback failed. Check logs above for details."
        send_notification "failure" "Emergency rollback script encountered an error"
    fi
}

trap cleanup EXIT

# Run main function
main "$@"
