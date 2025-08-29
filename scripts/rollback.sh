#!/bin/bash
# Emergency Rollback Script for Candlefish Operational Maturity Map
# Fast rollback capabilities with comprehensive safety checks

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
NAMESPACE="${NAMESPACE:-production}"
SERVICE_NAME="${SERVICE_NAME:-candlefish-website}"
ROLLBACK_TO="${ROLLBACK_TO:-}"
DRY_RUN="${DRY_RUN:-false}"
FORCE="${FORCE:-false}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Slack notification function
send_slack_notification() {
    local message="$1"
    local color="${2:-good}"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\", \"color\":\"$color\"}" \
            "$SLACK_WEBHOOK_URL" &>/dev/null || log_warning "Failed to send Slack notification"
    fi
}

# Validate prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check required tools
    local required_tools=("kubectl" "jq" "curl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed or not in PATH"
            exit 1
        fi
    done
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "kubectl cannot connect to cluster"
        exit 1
    fi
    
    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    
    log_success "Prerequisites validation completed"
}

# Get current deployment information
get_deployment_info() {
    log_info "Gathering current deployment information..."
    
    # Get service selector
    local current_selector
    current_selector=$(kubectl get service "${SERVICE_NAME}-service" -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "")
    
    if [[ -z "$current_selector" ]]; then
        log_error "No version selector found on service ${SERVICE_NAME}-service"
        return 1
    fi
    
    echo "$current_selector"
}

# Get available versions
get_available_versions() {
    log_info "Finding available versions..."
    
    local versions=()
    
    # Check for blue deployment
    if kubectl get deployment "${SERVICE_NAME}-blue" -n "$NAMESPACE" &> /dev/null; then
        versions+=("blue")
    fi
    
    # Check for green deployment
    if kubectl get deployment "${SERVICE_NAME}-green" -n "$NAMESPACE" &> /dev/null; then
        versions+=("green")
    fi
    
    if [[ ${#versions[@]} -eq 0 ]]; then
        log_error "No deployments found for service $SERVICE_NAME"
        return 1
    fi
    
    echo "${versions[@]}"
}

# Get deployment history and details
show_deployment_history() {
    log_info "=== Deployment History ==="
    
    local versions
    read -ra versions <<< "$(get_available_versions)"
    
    for version in "${versions[@]}"; do
        local deployment_name="${SERVICE_NAME}-${version}"
        
        echo -e "\n${BLUE}Version: $version${NC}"
        echo "Deployment: $deployment_name"
        
        # Get deployment creation time
        local creation_time
        creation_time=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o jsonpath='{.metadata.creationTimestamp}' 2>/dev/null || echo "Unknown")
        echo "Created: $creation_time"
        
        # Get image tag
        local image
        image=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "Unknown")
        echo "Image: $image"
        
        # Get replica status
        local replicas_desired replicas_ready
        replicas_desired=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        replicas_ready=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        echo "Replicas: $replicas_ready/$replicas_desired ready"
        
        # Check if this is the active version
        local current_version
        current_version=$(get_deployment_info)
        if [[ "$version" == "$current_version" ]]; then
            echo -e "${GREEN}Status: ACTIVE (receiving traffic)${NC}"
        else
            echo -e "${YELLOW}Status: INACTIVE${NC}"
        fi
    done
    
    echo -e "\n=== Current Service Configuration ==="
    kubectl get service "${SERVICE_NAME}-service" -n "$NAMESPACE" -o yaml | grep -A 5 "selector:"
}

# Validate rollback target
validate_rollback_target() {
    local target_version="$1"
    local deployment_name="${SERVICE_NAME}-${target_version}"
    
    log_info "Validating rollback target: $target_version"
    
    # Check if deployment exists
    if ! kubectl get deployment "$deployment_name" -n "$NAMESPACE" &> /dev/null; then
        log_error "Target deployment $deployment_name does not exist"
        return 1
    fi
    
    # Check if deployment is ready
    local replicas_desired replicas_ready
    replicas_desired=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    replicas_ready=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' || echo "0")
    
    if [[ "$replicas_ready" != "$replicas_desired" ]] || [[ "$replicas_ready" == "0" ]]; then
        log_warning "Target deployment is not fully ready ($replicas_ready/$replicas_desired replicas)"
        
        if [[ "$FORCE" != "true" ]]; then
            log_error "Use --force to rollback to a deployment that's not fully ready"
            return 1
        fi
    fi
    
    # Check if target is already active
    local current_version
    current_version=$(get_deployment_info)
    
    if [[ "$target_version" == "$current_version" ]]; then
        log_warning "Target version $target_version is already active"
        
        if [[ "$FORCE" != "true" ]]; then
            log_error "Use --force to proceed anyway"
            return 1
        fi
    fi
    
    log_success "Rollback target validation completed"
    return 0
}

# Perform health check on target deployment
health_check_target() {
    local target_version="$1"
    local deployment_name="${SERVICE_NAME}-${target_version}"
    
    log_info "Performing health checks on target version: $target_version"
    
    # Get a pod from the target deployment
    local pod_name
    pod_name=$(kubectl get pods -l app="$SERVICE_NAME",version="$target_version" -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$pod_name" ]]; then
        log_error "No pods found for target version $target_version"
        return 1
    fi
    
    # Check pod status
    local pod_status
    pod_status=$(kubectl get pod "$pod_name" -n "$NAMESPACE" -o jsonpath='{.status.phase}')
    
    if [[ "$pod_status" != "Running" ]]; then
        log_error "Target pod is not running (status: $pod_status)"
        return 1
    fi
    
    # Port forward to test the target version
    log_info "Testing target version via port forward..."
    local port_forward_pid
    kubectl port-forward "$pod_name" 8081:3000 -n "$NAMESPACE" &
    port_forward_pid=$!
    
    # Cleanup function for port forward
    cleanup_port_forward() {
        if [[ -n "${port_forward_pid:-}" ]]; then
            kill "$port_forward_pid" 2>/dev/null || true
            wait "$port_forward_pid" 2>/dev/null || true
        fi
    }
    trap cleanup_port_forward RETURN
    
    # Wait for port forward to be ready
    sleep 5
    
    # Perform health check
    local health_attempts=3
    local success_count=0
    
    for ((i=1; i<=health_attempts; i++)); do
        log_info "Health check attempt $i/$health_attempts..."
        
        if curl -f -s "http://localhost:8081/api/health" > /dev/null; then
            ((success_count++))
            log_success "Health check $i passed"
        else
            log_warning "Health check $i failed"
        fi
        
        if [[ $i -lt $health_attempts ]]; then
            sleep 10
        fi
    done
    
    if [[ $success_count -gt 0 ]]; then
        log_success "Health checks passed ($success_count/$health_attempts successful)"
        return 0
    else
        log_error "All health checks failed"
        return 1
    fi
}

# Create backup of current configuration
create_backup() {
    local current_version="$1"
    local backup_dir="/tmp/rollback-backup-$(date +%Y%m%d-%H%M%S)"
    
    log_info "Creating backup of current configuration..."
    
    mkdir -p "$backup_dir"
    
    # Backup service configuration
    kubectl get service "${SERVICE_NAME}-service" -n "$NAMESPACE" -o yaml > "$backup_dir/service.yaml"
    
    # Backup deployment configuration
    if [[ -n "$current_version" ]]; then
        kubectl get deployment "${SERVICE_NAME}-${current_version}" -n "$NAMESPACE" -o yaml > "$backup_dir/deployment-${current_version}.yaml"
    fi
    
    # Backup HPA if exists
    if kubectl get hpa "${SERVICE_NAME}-hpa" -n "$NAMESPACE" &> /dev/null; then
        kubectl get hpa "${SERVICE_NAME}-hpa" -n "$NAMESPACE" -o yaml > "$backup_dir/hpa.yaml"
    fi
    
    echo "$backup_dir" > "/tmp/last-rollback-backup"
    log_success "Backup created at: $backup_dir"
}

# Perform the actual rollback
perform_rollback() {
    local target_version="$1"
    local current_version="$2"
    
    log_info "Performing rollback from $current_version to $target_version..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would switch service selector to version: $target_version"
        return 0
    fi
    
    # Create backup first
    create_backup "$current_version"
    
    # Switch service selector
    log_info "Switching service selector to $target_version..."
    kubectl patch service "${SERVICE_NAME}-service" -n "$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"version\":\"$target_version\"}}}"
    
    # Wait for change to propagate
    sleep 10
    
    # Verify the switch
    local new_selector
    new_selector=$(kubectl get service "${SERVICE_NAME}-service" -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}')
    
    if [[ "$new_selector" == "$target_version" ]]; then
        log_success "Service selector successfully updated to $target_version"
    else
        log_error "Service selector update failed. Expected: $target_version, Got: $new_selector"
        return 1
    fi
    
    return 0
}

# Verify rollback success
verify_rollback() {
    local target_version="$1"
    
    log_info "Verifying rollback success..."
    
    # Wait for load balancer to update
    sleep 30
    
    # Test production endpoint
    local prod_url="https://candlefish.ai"
    local verification_attempts=5
    local success_count=0
    
    for ((i=1; i<=verification_attempts; i++)); do
        log_info "Production verification attempt $i/$verification_attempts..."
        
        local health_status
        health_status=$(curl -s -o /dev/null -w "%{http_code}" "$prod_url/api/health" || echo "000")
        
        if [[ "$health_status" == "200" ]]; then
            ((success_count++))
            log_success "Production verification $i passed (HTTP $health_status)"
        else
            log_warning "Production verification $i failed (HTTP $health_status)"
        fi
        
        sleep 10
    done
    
    if [[ $success_count -ge 3 ]]; then
        log_success "Rollback verification passed ($success_count/$verification_attempts successful)"
        return 0
    else
        log_error "Rollback verification failed ($success_count/$verification_attempts successful)"
        return 1
    fi
}

# Interactive rollback selection
interactive_rollback() {
    log_info "=== Interactive Rollback ==="
    
    show_deployment_history
    
    echo -e "\n${YELLOW}Available versions for rollback:${NC}"
    local versions
    read -ra versions <<< "$(get_available_versions)"
    local current_version
    current_version=$(get_deployment_info)
    
    local options=()
    for version in "${versions[@]}"; do
        if [[ "$version" != "$current_version" ]]; then
            options+=("$version")
        fi
    done
    
    if [[ ${#options[@]} -eq 0 ]]; then
        log_error "No alternative versions available for rollback"
        exit 1
    fi
    
    for i in "${!options[@]}"; do
        echo "$((i+1)). ${options[$i]}"
    done
    
    echo -n -e "\n${YELLOW}Select version to rollback to (1-${#options[@]}): ${NC}"
    read -r selection
    
    if [[ "$selection" =~ ^[0-9]+$ ]] && [[ "$selection" -ge 1 ]] && [[ "$selection" -le ${#options[@]} ]]; then
        local selected_version="${options[$((selection-1))]}"
        echo -e "\n${GREEN}Selected version: $selected_version${NC}"
        
        echo -n -e "${YELLOW}Proceed with rollback? (y/N): ${NC}"
        read -r confirmation
        
        if [[ "$confirmation" =~ ^[Yy]$ ]]; then
            ROLLBACK_TO="$selected_version"
        else
            log_info "Rollback cancelled by user"
            exit 0
        fi
    else
        log_error "Invalid selection"
        exit 1
    fi
}

# Main rollback function
main() {
    local start_time
    start_time=$(date +%s)
    
    log_info "Starting rollback process for $SERVICE_NAME"
    send_slack_notification "🔄 Starting rollback process for $SERVICE_NAME" "warning"
    
    # Validate prerequisites
    validate_prerequisites
    
    # Get current deployment info
    local current_version
    current_version=$(get_deployment_info)
    
    if [[ -z "$current_version" ]]; then
        log_error "Cannot determine current active version"
        exit 1
    fi
    
    log_info "Current active version: $current_version"
    
    # Determine target version
    if [[ -z "$ROLLBACK_TO" ]]; then
        if [[ "${INTERACTIVE:-false}" == "true" ]]; then
            interactive_rollback
        else
            # Auto-determine rollback target (switch to the other version)
            local versions
            read -ra versions <<< "$(get_available_versions)"
            
            for version in "${versions[@]}"; do
                if [[ "$version" != "$current_version" ]]; then
                    ROLLBACK_TO="$version"
                    break
                fi
            done
            
            if [[ -z "$ROLLBACK_TO" ]]; then
                log_error "No alternative version found for automatic rollback"
                exit 1
            fi
        fi
    fi
    
    log_info "Rollback target version: $ROLLBACK_TO"
    
    # Validate rollback target
    if ! validate_rollback_target "$ROLLBACK_TO"; then
        exit 1
    fi
    
    # Health check target
    if ! health_check_target "$ROLLBACK_TO"; then
        log_error "Health check failed for target version"
        if [[ "$FORCE" != "true" ]]; then
            log_error "Use --force to proceed anyway"
            exit 1
        fi
        log_warning "Proceeding with rollback despite health check failure (--force used)"
    fi
    
    # Perform rollback
    if ! perform_rollback "$ROLLBACK_TO" "$current_version"; then
        log_error "Rollback operation failed"
        send_slack_notification "❌ Rollback failed for $SERVICE_NAME" "danger"
        exit 1
    fi
    
    # Verify rollback
    if ! verify_rollback "$ROLLBACK_TO"; then
        log_error "Rollback verification failed"
        send_slack_notification "❌ Rollback verification failed for $SERVICE_NAME" "danger"
        exit 1
    fi
    
    # Calculate rollback time
    local end_time
    end_time=$(date +%s)
    local rollback_time=$((end_time - start_time))
    
    log_success "Rollback completed successfully!"
    log_info "Rollback time: ${rollback_time}s"
    log_info "Active version changed: $current_version → $ROLLBACK_TO"
    
    send_slack_notification "✅ Rollback completed successfully for $SERVICE_NAME: $current_version → $ROLLBACK_TO (${rollback_time}s)" "good"
}

# Show help
show_help() {
    cat << EOF
Emergency Rollback Script for Candlefish Operational Maturity Map

Usage: $0 [OPTIONS]

Options:
    -s, --service SERVICE_NAME      Service name to rollback (default: candlefish-website)
    -n, --namespace NAMESPACE       Kubernetes namespace (default: production)
    -t, --to VERSION               Target version to rollback to (blue/green)
    -i, --interactive              Interactive version selection
    --dry-run                      Show what would be done without making changes
    --force                        Force rollback even if target is not ready
    --history                      Show deployment history and exit
    -h, --help                     Show this help message

Environment Variables:
    NAMESPACE                      Kubernetes namespace
    SERVICE_NAME                   Service name to rollback
    ROLLBACK_TO                    Target version
    DRY_RUN                        Set to 'true' for dry run
    FORCE                          Set to 'true' to force rollback
    SLACK_WEBHOOK_URL             Slack webhook URL for notifications

Examples:
    # Interactive rollback
    $0 --interactive

    # Rollback to specific version
    $0 --to blue --service candlefish-website

    # Show deployment history
    $0 --history

    # Dry run rollback
    $0 --dry-run --to green

    # Force rollback to unhealthy version
    $0 --force --to blue

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--service)
            SERVICE_NAME="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -t|--to)
            ROLLBACK_TO="$2"
            shift 2
            ;;
        -i|--interactive)
            INTERACTIVE="true"
            shift
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --force)
            FORCE="true"
            shift
            ;;
        --history)
            validate_prerequisites
            show_deployment_history
            exit 0
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main "$@"