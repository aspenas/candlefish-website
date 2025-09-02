#!/bin/bash
set -euo pipefail

# CLOS Analytics Rollback Script
# Emergency rollback with comprehensive safety checks and monitoring

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default configuration
ENVIRONMENT="${ENVIRONMENT:-staging}"
NAMESPACE="clos-analytics"
ROLLBACK_TARGET=""
REASON=""
DRY_RUN="${DRY_RUN:-false}"
EMERGENCY_MODE="${EMERGENCY_MODE:-false}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Emergency rollback for CLOS Analytics deployment

OPTIONS:
    -e, --environment ENV           Environment (dev|staging|production)
    -n, --namespace NAMESPACE       Kubernetes namespace [default: clos-analytics]
    -t, --target TARGET            Rollback target (revision|image-tag|backup-id)
    -r, --reason REASON            Reason for rollback (required)
    --dry-run                      Show what would be rolled back
    --emergency                    Skip safety checks (USE WITH CAUTION)
    -h, --help                     Show this help message

ROLLBACK TARGETS:
    --to-revision N                Rollback to specific revision number
    --to-image TAG                 Rollback to specific image tag
    --to-backup ID                 Rollback to specific backup
    --to-previous                  Rollback to immediately previous version

EXAMPLES:
    $0 --environment production --to-previous --reason "Critical bug in v1.2.3"
    $0 --environment staging --to-revision 5 --reason "Testing rollback procedure"
    $0 --environment production --to-image v1.2.2 --reason "Emergency: data corruption"
    $0 --dry-run --to-previous --reason "Testing rollback"

EMERGENCY MODE:
    Use --emergency flag to skip interactive confirmations and safety checks.
    This should only be used in critical situations where immediate rollback is required.

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --to-revision)
            ROLLBACK_TARGET="revision:$2"
            shift 2
            ;;
        --to-image)
            ROLLBACK_TARGET="image:$2"
            shift 2
            ;;
        --to-backup)
            ROLLBACK_TARGET="backup:$2"
            shift 2
            ;;
        --to-previous)
            ROLLBACK_TARGET="previous"
            shift
            ;;
        -r|--reason)
            REASON="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --emergency)
            EMERGENCY_MODE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate inputs
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or production."
    exit 1
fi

if [[ -z "$ROLLBACK_TARGET" ]]; then
    log_error "Rollback target is required. Use --to-previous, --to-revision, --to-image, or --to-backup."
    exit 1
fi

if [[ -z "$REASON" ]]; then
    log_error "Rollback reason is required. Use --reason to specify why you're rolling back."
    exit 1
fi

ROLLBACK_ID="rollback-$(date +%Y%m%d-%H%M%S)"

log_info "Initiating CLOS Analytics rollback"
log_info "Environment: $ENVIRONMENT"
log_info "Target: $ROLLBACK_TARGET"
log_info "Reason: $REASON"
log_info "Rollback ID: $ROLLBACK_ID"

# Check prerequisites
check_prerequisites() {
    log_info "Checking rollback prerequisites..."
    
    # Check kubectl connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        return 1
    fi
    
    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace '$NAMESPACE' does not exist"
        return 1
    fi
    
    # Check if deployments exist
    local deployments=("clos-api" "clos-websocket" "clos-web-dashboard")
    local missing_deployments=()
    
    for deployment in "${deployments[@]}"; do
        if ! kubectl get deployment "$deployment" -n "$NAMESPACE" &> /dev/null; then
            missing_deployments+=("$deployment")
        fi
    done
    
    if [[ ${#missing_deployments[@]} -gt 0 ]]; then
        log_warning "Some deployments not found: ${missing_deployments[*]}"
        if [[ "$EMERGENCY_MODE" != "true" ]]; then
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Rollback cancelled by user"
                exit 0
            fi
        fi
    fi
    
    log_success "Prerequisites check completed"
}

# Get current deployment state
get_current_state() {
    log_info "Getting current deployment state..."
    
    local deployments=("clos-api" "clos-websocket" "clos-web-dashboard")
    
    echo "Current deployment state:" > "/tmp/pre-rollback-state-$ROLLBACK_ID.log"
    
    for deployment in "${deployments[@]}"; do
        if kubectl get deployment "$deployment" -n "$NAMESPACE" &> /dev/null; then
            log_info "Current state of $deployment:"
            
            # Get current image
            local current_image
            current_image=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
            echo "  Image: $current_image"
            echo "$deployment current image: $current_image" >> "/tmp/pre-rollback-state-$ROLLBACK_ID.log"
            
            # Get current revision
            local current_revision
            current_revision=$(kubectl rollout history deployment/"$deployment" -n "$NAMESPACE" | tail -1 | awk '{print $1}')
            echo "  Revision: $current_revision"
            echo "$deployment current revision: $current_revision" >> "/tmp/pre-rollback-state-$ROLLBACK_ID.log"
            
            # Get replica count
            local replicas
            replicas=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
            echo "  Replicas: $replicas"
            echo "$deployment replicas: $replicas" >> "/tmp/pre-rollback-state-$ROLLBACK_ID.log"
        fi
    done
    
    # Get pod status
    echo "Pod status:" >> "/tmp/pre-rollback-state-$ROLLBACK_ID.log"
    kubectl get pods -n "$NAMESPACE" >> "/tmp/pre-rollback-state-$ROLLBACK_ID.log"
    
    log_success "Current state captured"
}

# Confirm rollback
confirm_rollback() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Rollback confirmation skipped"
        return
    fi
    
    if [[ "$EMERGENCY_MODE" == "true" ]]; then
        log_warning "Emergency mode enabled - skipping confirmation"
        return
    fi
    
    log_warning "You are about to rollback CLOS Analytics in $ENVIRONMENT environment"
    log_warning "Target: $ROLLBACK_TARGET"
    log_warning "Reason: $REASON"
    log_warning ""
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_error "WARNING: This is a PRODUCTION environment!"
        log_error "This rollback will affect live users and data."
        log_error ""
    fi
    
    read -p "Are you absolutely sure you want to proceed? Type 'YES' to continue: " -r
    if [[ "$REPLY" != "YES" ]]; then
        log_info "Rollback cancelled by user"
        exit 0
    fi
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_warning "Final confirmation for production environment"
        read -p "Confirm production rollback by typing the environment name: " -r
        if [[ "$REPLY" != "production" ]]; then
            log_info "Production rollback cancelled"
            exit 0
        fi
    fi
    
    log_info "Rollback confirmed by user"
}

# Execute rollback
execute_rollback() {
    log_info "Executing rollback..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would execute rollback with target: $ROLLBACK_TARGET"
        return 0
    fi
    
    local deployments=("clos-api" "clos-websocket" "clos-web-dashboard")
    local rollback_success=true
    
    case "$ROLLBACK_TARGET" in
        revision:*)
            local target_revision="${ROLLBACK_TARGET#revision:}"
            log_info "Rolling back to revision: $target_revision"
            
            for deployment in "${deployments[@]}"; do
                if kubectl get deployment "$deployment" -n "$NAMESPACE" &> /dev/null; then
                    log_info "Rolling back $deployment to revision $target_revision"
                    if ! kubectl rollout undo deployment/"$deployment" -n "$NAMESPACE" --to-revision="$target_revision"; then
                        log_error "Failed to rollback $deployment"
                        rollback_success=false
                    fi
                fi
            done
            ;;
            
        image:*)
            local target_image="${ROLLBACK_TARGET#image:}"
            log_info "Rolling back to image: $target_image"
            
            for deployment in "${deployments[@]}"; do
                if kubectl get deployment "$deployment" -n "$NAMESPACE" &> /dev/null; then
                    log_info "Setting $deployment image to $target_image"
                    local container_name="$deployment"
                    if ! kubectl set image deployment/"$deployment" "$container_name"="$target_image" -n "$NAMESPACE"; then
                        log_error "Failed to set image for $deployment"
                        rollback_success=false
                    fi
                fi
            done
            ;;
            
        backup:*)
            local backup_id="${ROLLBACK_TARGET#backup:}"
            log_info "Rolling back to backup: $backup_id"
            
            local backup_dir="/tmp/clos-analytics-backup-$backup_id"
            if [[ ! -d "$backup_dir" ]]; then
                log_error "Backup directory not found: $backup_dir"
                return 1
            fi
            
            for deployment in "${deployments[@]}"; do
                local backup_file="$backup_dir/${deployment}-deployment.yaml"
                if [[ -f "$backup_file" ]]; then
                    log_info "Restoring $deployment from backup"
                    if ! kubectl apply -f "$backup_file"; then
                        log_error "Failed to restore $deployment from backup"
                        rollback_success=false
                    fi
                fi
            done
            ;;
            
        previous)
            log_info "Rolling back to previous version"
            
            for deployment in "${deployments[@]}"; do
                if kubectl get deployment "$deployment" -n "$NAMESPACE" &> /dev/null; then
                    log_info "Rolling back $deployment to previous version"
                    if ! kubectl rollout undo deployment/"$deployment" -n "$NAMESPACE"; then
                        log_error "Failed to rollback $deployment"
                        rollback_success=false
                    fi
                fi
            done
            ;;
            
        *)
            log_error "Unknown rollback target: $ROLLBACK_TARGET"
            return 1
            ;;
    esac
    
    if [[ "$rollback_success" != "true" ]]; then
        log_error "Some rollback operations failed"
        return 1
    fi
    
    log_success "Rollback execution completed"
}

# Wait for rollback to complete
wait_for_rollback() {
    log_info "Waiting for rollback to complete..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would wait for rollback completion"
        return 0
    fi
    
    local deployments=("clos-api" "clos-websocket" "clos-web-dashboard")
    local timeout=300
    
    for deployment in "${deployments[@]}"; do
        if kubectl get deployment "$deployment" -n "$NAMESPACE" &> /dev/null; then
            log_info "Waiting for $deployment rollback to complete..."
            
            if ! kubectl rollout status deployment/"$deployment" -n "$NAMESPACE" --timeout="${timeout}s"; then
                log_error "$deployment rollback failed to complete within ${timeout}s"
                return 1
            fi
            
            log_success "$deployment rollback completed"
        fi
    done
    
    # Wait for pods to be ready
    log_info "Waiting for pods to be ready after rollback..."
    if ! kubectl wait --for=condition=ready --timeout=300s \
        pods -l "app in (clos-api,clos-websocket,clos-web-dashboard)" -n "$NAMESPACE"; then
        log_warning "Some pods are not ready after rollback"
        kubectl get pods -n "$NAMESPACE"
    fi
    
    log_success "Rollback completion verified"
}

# Verify rollback
verify_rollback() {
    log_info "Verifying rollback success..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would verify rollback success"
        return 0
    fi
    
    # Check pod status
    local failing_pods
    failing_pods=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running --no-headers | wc -l)
    
    if [[ "$failing_pods" -gt 0 ]]; then
        log_warning "Found $failing_pods failing pods after rollback:"
        kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running
    else
        log_success "All pods are running after rollback"
    fi
    
    # Basic health checks
    log_info "Running basic health checks..."
    
    # Test API health
    if kubectl run health-check --image=curlimages/curl:latest --rm -i --restart=Never -n "$NAMESPACE" -- \
        curl -f --max-time 10 http://clos-api-service:8000/api/v1/health &> /dev/null; then
        log_success "API health check passed"
    else
        log_warning "API health check failed"
    fi
    
    # Test WebSocket health
    if kubectl run health-check --image=curlimages/curl:latest --rm -i --restart=Never -n "$NAMESPACE" -- \
        curl -f --max-time 10 http://clos-websocket-service:8001/health &> /dev/null; then
        log_success "WebSocket health check passed"
    else
        log_warning "WebSocket health check failed"
    fi
    
    # Test Dashboard health
    if kubectl run health-check --image=curlimages/curl:latest --rm -i --restart=Never -n "$NAMESPACE" -- \
        curl -f --max-time 10 http://clos-web-dashboard-service:3500/api/health &> /dev/null; then
        log_success "Dashboard health check passed"
    else
        log_warning "Dashboard health check failed"
    fi
    
    log_info "Rollback verification completed"
}

# Generate rollback report
generate_report() {
    local report_file="/tmp/rollback-report-$ROLLBACK_ID.md"
    
    log_info "Generating rollback report: $report_file"
    
    cat > "$report_file" << EOF
# CLOS Analytics Rollback Report

## Rollback Details
- **Rollback ID**: $ROLLBACK_ID
- **Environment**: $ENVIRONMENT
- **Timestamp**: $(date)
- **Initiated by**: $(whoami)
- **Target**: $ROLLBACK_TARGET
- **Reason**: $REASON

## Pre-Rollback State
\`\`\`
$(cat "/tmp/pre-rollback-state-$ROLLBACK_ID.log" 2>/dev/null || echo "Pre-rollback state not captured")
\`\`\`

## Post-Rollback State
\`\`\`
$(kubectl get deployments,pods -n "$NAMESPACE" 2>/dev/null || echo "Failed to get post-rollback state")
\`\`\`

## Pod Status
\`\`\`
$(kubectl get pods -n "$NAMESPACE" -o wide 2>/dev/null || echo "Failed to get pod status")
\`\`\`

## Events (Last 30 minutes)
\`\`\`
$(kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' | tail -20 2>/dev/null || echo "Failed to get events")
\`\`\`

## Next Steps
- Monitor application stability for the next 24 hours
- Review logs for any issues
- Plan permanent fix for the original issue
- Consider implementing additional safeguards

## Contact
- Rollback performed by: $(whoami)
- Date: $(date)
- Environment: $ENVIRONMENT

EOF

    log_success "Rollback report generated: $report_file"
}

# Send notifications
send_notification() {
    local status="$1"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color
        case "$status" in
            "success") color="good" ;;
            "failure") color="danger" ;;
            *) color="warning" ;;
        esac
        
        local payload=$(cat << EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "CLOS Analytics Rollback - $ENVIRONMENT",
            "fields": [
                {
                    "title": "Status",
                    "value": "$status",
                    "short": true
                },
                {
                    "title": "Environment",
                    "value": "$ENVIRONMENT",
                    "short": true
                },
                {
                    "title": "Target",
                    "value": "$ROLLBACK_TARGET",
                    "short": true
                },
                {
                    "title": "Rollback ID",
                    "value": "$ROLLBACK_ID",
                    "short": true
                },
                {
                    "title": "Reason",
                    "value": "$REASON",
                    "short": false
                }
            ]
        }
    ]
}
EOF
)
        
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            "$SLACK_WEBHOOK_URL" &> /dev/null || true
    fi
}

# Main rollback function
main() {
    local rollback_success=false
    
    # Check prerequisites
    if ! check_prerequisites; then
        log_error "Prerequisites check failed"
        exit 1
    fi
    
    # Get current state
    get_current_state
    
    # Confirm rollback
    confirm_rollback
    
    # Execute rollback
    if ! execute_rollback; then
        log_error "Rollback execution failed"
        send_notification "failure"
        exit 1
    fi
    
    # Wait for completion
    if ! wait_for_rollback; then
        log_error "Rollback did not complete successfully"
        send_notification "failure"
        exit 1
    fi
    
    # Verify rollback
    verify_rollback
    
    # Generate report
    generate_report
    
    rollback_success=true
    log_success "CLOS Analytics rollback completed successfully!"
    send_notification "success"
    
    # Display summary
    log_info "Rollback Summary:"
    log_info "- Environment: $ENVIRONMENT"
    log_info "- Target: $ROLLBACK_TARGET"
    log_info "- Reason: $REASON"
    log_info "- Rollback ID: $ROLLBACK_ID"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_warning "Production rollback completed. Monitor the system closely."
        log_warning "Review the rollback report and plan a permanent fix."
    fi
    
    log_info "Next steps:"
    log_info "1. Monitor application stability"
    log_info "2. Review logs for any issues"
    log_info "3. Plan permanent fix for the original issue"
    log_info "4. Update incident documentation"
}

# Run main function
main "$@"