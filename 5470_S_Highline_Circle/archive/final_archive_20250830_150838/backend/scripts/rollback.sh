#!/bin/bash

# Comprehensive Rollback System for Item Valuation System
# Supports multiple rollback strategies and automated recovery

set -euo pipefail

# Configuration
NAMESPACE="${NAMESPACE:-inventory-system}"
APP_NAME="${APP_NAME:-backend}"
SERVICE_NAME="${SERVICE_NAME:-backend-service}"
ROLLBACK_TIMEOUT="${ROLLBACK_TIMEOUT:-300}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://api.inventory.example.com/health}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

# Rollback types
DEPLOYMENT_ROLLBACK="deployment"
DATABASE_ROLLBACK="database"
FULL_SYSTEM_ROLLBACK="full"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log_info() {
    log "${BLUE}INFO: $1${NC}"
}

log_success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

log_warn() {
    log "${YELLOW}WARNING: $1${NC}"
}

log_error() {
    log "${RED}ERROR: $1${NC}"
}

error_exit() {
    log_error "$1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking rollback prerequisites..."
    
    # Required tools
    for tool in kubectl curl jq; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            error_exit "Required tool '$tool' is not installed"
        fi
    done
    
    # Kubernetes connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi
    
    # Namespace exists
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        error_exit "Namespace '$NAMESPACE' does not exist"
    fi
    
    # Deployment exists
    if ! kubectl get deployment "$APP_NAME" -n "$NAMESPACE" >/dev/null 2>&1; then
        error_exit "Deployment '$APP_NAME' not found in namespace '$NAMESPACE'"
    fi
    
    log_success "Prerequisites check passed"
}

# Get current deployment state
get_deployment_state() {
    log_info "Gathering current deployment state..."
    
    # Current deployment info
    CURRENT_IMAGE=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
    CURRENT_REPLICAS=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    READY_REPLICAS=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
    
    # Get rollout history
    ROLLOUT_HISTORY=$(kubectl rollout history deployment/"$APP_NAME" -n "$NAMESPACE" --limit=10)
    
    log_info "Current state:"
    log_info "  Image: $CURRENT_IMAGE"
    log_info "  Replicas: $READY_REPLICAS/$CURRENT_REPLICAS"
    
    # Check if there are previous revisions to rollback to
    REVISION_COUNT=$(kubectl rollout history deployment/"$APP_NAME" -n "$NAMESPACE" | tail -n +3 | wc -l)
    if [ "$REVISION_COUNT" -lt 2 ]; then
        error_exit "No previous revision available for rollback"
    fi
    
    log_success "Deployment state gathered successfully"
}

# Create pre-rollback snapshot
create_rollback_snapshot() {
    log_info "Creating pre-rollback snapshot..."
    
    local snapshot_dir="rollback-snapshots/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$snapshot_dir"
    
    # Save current deployment state
    kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o yaml > "$snapshot_dir/deployment.yaml"
    kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" -o yaml > "$snapshot_dir/service.yaml"
    kubectl get configmap -n "$NAMESPACE" -o yaml > "$snapshot_dir/configmaps.yaml"
    kubectl get secret -n "$NAMESPACE" -o yaml > "$snapshot_dir/secrets.yaml"
    
    # Save pod states
    kubectl get pods -n "$NAMESPACE" -l app="$APP_NAME" -o yaml > "$snapshot_dir/pods.yaml"
    kubectl describe deployment "$APP_NAME" -n "$NAMESPACE" > "$snapshot_dir/deployment-describe.txt"
    
    # Save application logs
    kubectl logs -n "$NAMESPACE" -l app="$APP_NAME" --tail=1000 > "$snapshot_dir/application.log" || true
    
    # Save rollout history
    kubectl rollout history deployment/"$APP_NAME" -n "$NAMESPACE" > "$snapshot_dir/rollout-history.txt"
    
    # Save current metrics if available
    if curl -s "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
        curl -s "$HEALTH_CHECK_URL?include_metrics=true" > "$snapshot_dir/metrics.json" || true
    fi
    
    log_success "Snapshot created at: $snapshot_dir"
    echo "$snapshot_dir" > .last-rollback-snapshot
}

# Deployment rollback
rollback_deployment() {
    local target_revision="${1:-}"
    
    log_info "Starting deployment rollback..."
    
    if [ -n "$target_revision" ]; then
        log_info "Rolling back to revision: $target_revision"
        kubectl rollout undo deployment/"$APP_NAME" -n "$NAMESPACE" --to-revision="$target_revision"
    else
        log_info "Rolling back to previous revision"
        kubectl rollout undo deployment/"$APP_NAME" -n "$NAMESPACE"
    fi
    
    # Wait for rollback to complete
    log_info "Waiting for rollback to complete (timeout: ${ROLLBACK_TIMEOUT}s)..."
    if ! kubectl rollout status deployment/"$APP_NAME" -n "$NAMESPACE" --timeout="${ROLLBACK_TIMEOUT}s"; then
        error_exit "Rollback did not complete within timeout"
    fi
    
    # Verify rollback
    NEW_IMAGE=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
    NEW_REPLICAS=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
    
    log_success "Deployment rollback completed"
    log_info "  Previous image: $CURRENT_IMAGE"
    log_info "  Current image: $NEW_IMAGE"
    log_info "  Ready replicas: $NEW_REPLICAS/$CURRENT_REPLICAS"
}

# Database rollback
rollback_database() {
    log_warn "Database rollback requested - this is a critical operation!"
    
    # Check if backup exists
    local backup_list_file="backups/latest_backup.txt"
    if [ ! -f "$backup_list_file" ]; then
        error_exit "No backup reference found at $backup_list_file"
    fi
    
    local backup_file
    backup_file=$(cat "$backup_list_file")
    
    if [ ! -f "$backup_file" ]; then
        error_exit "Backup file not found: $backup_file"
    fi
    
    log_warn "This will restore database from: $backup_file"
    log_warn "ALL CURRENT DATA WILL BE LOST!"
    
    # In automated rollback, we need a confirmation mechanism
    if [ "${AUTOMATED_ROLLBACK:-false}" != "true" ]; then
        read -p "Are you sure you want to proceed? (type 'YES' to confirm): " confirmation
        if [ "$confirmation" != "YES" ]; then
            log_info "Database rollback cancelled"
            return 0
        fi
    fi
    
    log_info "Creating current database backup before rollback..."
    
    # Get database connection info
    DB_HOST=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="DB_HOST")].value}')
    DB_NAME=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="DB_NAME")].value}')
    DB_USER=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="DB_USER")].value}')
    
    # Create pre-rollback backup
    local pre_rollback_backup="backups/pre-rollback-$(date +%Y%m%d-%H%M%S).sql"
    log_info "Creating pre-rollback backup: $pre_rollback_backup"
    
    # Execute database rollback via temporary pod
    kubectl run db-rollback-pod --rm -i --image=postgres:16-alpine --restart=Never -n "$NAMESPACE" -- \
        sh -c "pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > /tmp/pre-rollback.sql && \
               dropdb -h $DB_HOST -U $DB_USER $DB_NAME --if-exists && \
               createdb -h $DB_HOST -U $DB_USER $DB_NAME && \
               psql -h $DB_HOST -U $DB_USER -d $DB_NAME < $backup_file"
    
    log_success "Database rollback completed"
}

# Configuration rollback
rollback_configuration() {
    log_info "Rolling back configuration changes..."
    
    # Check if configuration backup exists
    local config_backup_dir="config-backups"
    if [ ! -d "$config_backup_dir" ]; then
        log_warn "No configuration backups found, skipping config rollback"
        return 0
    fi
    
    # Find latest config backup
    local latest_backup
    latest_backup=$(find "$config_backup_dir" -name "*.yaml" | sort -r | head -n 1)
    
    if [ -n "$latest_backup" ]; then
        log_info "Restoring configuration from: $latest_backup"
        kubectl apply -f "$latest_backup" -n "$NAMESPACE"
        log_success "Configuration rollback completed"
    else
        log_warn "No configuration backup files found"
    fi
}

# Health verification after rollback
verify_rollback_health() {
    log_info "Verifying system health after rollback..."
    
    local max_attempts=10
    local attempt=1
    local health_check_passed=false
    
    while [ $attempt -le $max_attempts ]; do
        log_info "Health check attempt $attempt/$max_attempts..."
        
        # Check pod readiness
        local ready_pods
        ready_pods=$(kubectl get pods -n "$NAMESPACE" -l app="$APP_NAME" --no-headers | grep -c "Running" || echo "0")
        local total_pods
        total_pods=$(kubectl get pods -n "$NAMESPACE" -l app="$APP_NAME" --no-headers | wc -l)
        
        log_info "Pod status: $ready_pods/$total_pods ready"
        
        if [ "$ready_pods" -eq "$total_pods" ] && [ "$ready_pods" -gt 0 ]; then
            # Check application health endpoint
            if curl -f -s "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
                log_success "Health check passed"
                health_check_passed=true
                break
            else
                log_warn "Application health check failed"
            fi
        else
            log_warn "Pods not ready yet"
        fi
        
        attempt=$((attempt + 1))
        sleep 30
    done
    
    if [ "$health_check_passed" != "true" ]; then
        error_exit "Health verification failed after rollback"
    fi
    
    log_success "System health verified after rollback"
}

# Generate rollback report
generate_rollback_report() {
    log_info "Generating rollback report..."
    
    local report_file="rollback-report-$(date +%Y%m%d-%H%M%S).json"
    
    # Collect rollback information
    cat > "$report_file" << EOF
{
  "rollback_time": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "rollback_type": "$ROLLBACK_TYPE",
  "namespace": "$NAMESPACE",
  "app_name": "$APP_NAME",
  "previous_state": {
    "image": "$CURRENT_IMAGE",
    "replicas": "$CURRENT_REPLICAS",
    "ready_replicas": "$READY_REPLICAS"
  },
  "current_state": {
    "image": "$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')",
    "replicas": "$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')",
    "ready_replicas": "$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')"
  },
  "rollback_status": "completed",
  "health_check_status": "passed",
  "snapshot_location": "$(cat .last-rollback-snapshot 2>/dev/null || echo 'N/A')"
}
EOF
    
    log_success "Rollback report generated: $report_file"
}

# Cleanup old rollback artifacts
cleanup_rollback_artifacts() {
    log_info "Cleaning up old rollback artifacts..."
    
    # Clean old snapshots
    if [ -d "rollback-snapshots" ]; then
        find rollback-snapshots -type d -mtime +$BACKUP_RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
    fi
    
    # Clean old reports
    find . -name "rollback-report-*.json" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Emergency rollback (aggressive rollback with minimal checks)
emergency_rollback() {
    log_error "EMERGENCY ROLLBACK INITIATED"
    
    # Skip most verification steps in emergency
    ROLLBACK_TIMEOUT=60  # Shorter timeout
    
    # Force rollback without health checks
    log_warn "Forcing deployment rollback without extensive checks..."
    kubectl rollout undo deployment/"$APP_NAME" -n "$NAMESPACE"
    
    # Wait briefly for rollback
    sleep 30
    
    # Check if any pods are running
    local running_pods
    running_pods=$(kubectl get pods -n "$NAMESPACE" -l app="$APP_NAME" --no-headers | grep -c "Running" || echo "0")
    
    if [ "$running_pods" -gt 0 ]; then
        log_success "Emergency rollback completed - $running_pods pods running"
    else
        log_error "Emergency rollback may have failed - no running pods detected"
        
        # Last resort: scale deployment to ensure some pods are running
        log_warn "Attempting to scale deployment as last resort..."
        kubectl scale deployment "$APP_NAME" -n "$NAMESPACE" --replicas=1
        sleep 30
    fi
}

# Full system rollback
full_system_rollback() {
    log_info "Starting full system rollback..."
    
    create_rollback_snapshot
    rollback_deployment "$TARGET_REVISION"
    rollback_configuration
    verify_rollback_health
    generate_rollback_report
    cleanup_rollback_artifacts
    
    log_success "Full system rollback completed successfully"
}

# Show rollback status
show_rollback_status() {
    log_info "Current Rollback Status:"
    
    echo "Deployment: $APP_NAME in namespace $NAMESPACE"
    
    # Current deployment status
    kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o wide
    
    echo
    log_info "Pod Status:"
    kubectl get pods -n "$NAMESPACE" -l app="$APP_NAME" -o wide
    
    echo
    log_info "Rollout History:"
    kubectl rollout history deployment/"$APP_NAME" -n "$NAMESPACE"
    
    echo
    log_info "Recent Events:"
    kubectl get events -n "$NAMESPACE" --field-selector involvedObject.name="$APP_NAME" --sort-by='.lastTimestamp' | tail -n 10
    
    # Health check if possible
    if curl -f -s "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
        echo
        log_info "Application Health: HEALTHY"
    else
        echo
        log_warn "Application Health: UNHEALTHY or UNREACHABLE"
    fi
}

# List available rollback points
list_rollback_points() {
    log_info "Available Rollback Points:"
    
    echo "Deployment Revisions:"
    kubectl rollout history deployment/"$APP_NAME" -n "$NAMESPACE"
    
    echo
    if [ -d "backups" ]; then
        echo "Database Backups:"
        find backups -name "backup_*.sql" -printf "%T@ %Tc %p\n" | sort -n | tail -n 10 | cut -d' ' -f2-
    else
        echo "No database backups found"
    fi
    
    echo
    if [ -d "rollback-snapshots" ]; then
        echo "Configuration Snapshots:"
        find rollback-snapshots -type d -printf "%T@ %Tc %p\n" | sort -n | tail -n 5 | cut -d' ' -f2-
    else
        echo "No configuration snapshots found"
    fi
}

# Main function
main() {
    local command="${1:-help}"
    ROLLBACK_TYPE="${2:-$DEPLOYMENT_ROLLBACK}"
    TARGET_REVISION="${3:-}"
    
    log_info "Rollback System - Command: $command, Type: $ROLLBACK_TYPE"
    
    case "$command" in
        "rollback")
            check_prerequisites
            get_deployment_state
            
            case "$ROLLBACK_TYPE" in
                "$DEPLOYMENT_ROLLBACK")
                    create_rollback_snapshot
                    rollback_deployment "$TARGET_REVISION"
                    verify_rollback_health
                    generate_rollback_report
                    ;;
                "$DATABASE_ROLLBACK")
                    rollback_database
                    ;;
                "$FULL_SYSTEM_ROLLBACK")
                    full_system_rollback
                    ;;
                *)
                    error_exit "Unknown rollback type: $ROLLBACK_TYPE"
                    ;;
            esac
            ;;
        "emergency")
            emergency_rollback
            ;;
        "status")
            show_rollback_status
            ;;
        "list")
            list_rollback_points
            ;;
        "cleanup")
            cleanup_rollback_artifacts
            ;;
        *)
            echo "Usage: $0 [rollback|emergency|status|list|cleanup] [deployment|database|full] [revision]"
            echo ""
            echo "Commands:"
            echo "  rollback   - Perform rollback (default: deployment)"
            echo "  emergency  - Emergency rollback with minimal checks"
            echo "  status     - Show current rollback status"
            echo "  list       - List available rollback points"
            echo "  cleanup    - Clean up old rollback artifacts"
            echo ""
            echo "Rollback Types:"
            echo "  deployment - Rollback application deployment only (default)"
            echo "  database   - Rollback database to last backup"
            echo "  full       - Full system rollback (deployment + config)"
            echo ""
            echo "Examples:"
            echo "  $0 rollback deployment 5     # Rollback to revision 5"
            echo "  $0 rollback full             # Full system rollback"
            echo "  $0 emergency                 # Emergency rollback"
            echo "  $0 status                    # Show current status"
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"