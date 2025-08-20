#!/bin/bash

# Rollback Script for Candlefish Website
# Provides immediate rollback capabilities for emergency situations

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default values
ENVIRONMENT="${ENVIRONMENT:-production}"
NAMESPACE="${NAMESPACE:-$ENVIRONMENT}"
ROLLBACK_TYPE="${ROLLBACK_TYPE:-previous}"
FORCE_ROLLBACK="${FORCE_ROLLBACK:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

log_step() {
    echo -e "${CYAN}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Rollback state management
ROLLBACK_STATE_FILE="/tmp/candlefish-rollback-state.json"
ROLLBACK_LOG_FILE="/var/log/candlefish-rollback.log"

# Initialize rollback state
init_rollback_state() {
    local rollback_id=$(date +%s)
    
    cat > "$ROLLBACK_STATE_FILE" << EOF
{
  "rollback_id": "$rollback_id",
  "environment": "$ENVIRONMENT",
  "namespace": "$NAMESPACE",
  "rollback_type": "$ROLLBACK_TYPE",
  "started_at": "$(date -Iseconds)",
  "current_step": "initialization",
  "from_version": "",
  "to_version": "",
  "status": "in_progress"
}
EOF
    
    log_info "Rollback initialized with ID: $rollback_id"
}

# Update rollback state
update_rollback_state() {
    local key="$1"
    local value="$2"
    
    jq --arg key "$key" --arg value "$value" '.[$key] = $value' "$ROLLBACK_STATE_FILE" > "${ROLLBACK_STATE_FILE}.tmp" && \
    mv "${ROLLBACK_STATE_FILE}.tmp" "$ROLLBACK_STATE_FILE"
}

# Get rollback state
get_rollback_state() {
    local key="$1"
    jq -r --arg key "$key" '.[$key] // empty' "$ROLLBACK_STATE_FILE"
}

# Verify prerequisites
verify_prerequisites() {
    log_step "Verifying prerequisites for rollback..."
    
    # Check required tools
    local required_tools=("kubectl" "jq" "aws")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    # Check kubectl access
    if ! kubectl cluster-info &>/dev/null; then
        log_error "Cannot access Kubernetes cluster"
        exit 1
    fi
    
    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
        log_error "Namespace not found: $NAMESPACE"
        exit 1
    fi
    
    log_success "Prerequisites verified"
    update_rollback_state "current_step" "prerequisites_verified"
}

# Get current deployment status
get_current_deployment_status() {
    log_step "Analyzing current deployment status..."
    
    # Get current active version
    local current_version=$(kubectl get service candlefish-website-service \
        -n "$NAMESPACE" \
        -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "")
    
    if [[ -z "$current_version" ]]; then
        log_error "Cannot determine current active version"
        exit 1
    fi
    
    log_info "Current active version: $current_version"
    update_rollback_state "from_version" "$current_version"
    
    # List available deployments
    local deployments=($(kubectl get deployments \
        -n "$NAMESPACE" \
        -l "app=candlefish-website" \
        -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo ""))
    
    log_info "Available deployments: ${deployments[*]}"
    
    # Check deployment health
    local healthy_deployments=()
    for deployment in "${deployments[@]}"; do
        local ready_replicas=$(kubectl get deployment "$deployment" \
            -n "$NAMESPACE" \
            -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired_replicas=$(kubectl get deployment "$deployment" \
            -n "$NAMESPACE" \
            -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        
        if [[ "$ready_replicas" -eq "$desired_replicas" && "$desired_replicas" -gt 0 ]]; then
            healthy_deployments+=("$deployment")
            log_info "Healthy deployment: $deployment ($ready_replicas/$desired_replicas replicas)"
        else
            log_warning "Unhealthy deployment: $deployment ($ready_replicas/$desired_replicas replicas)"
        fi
    done
    
    if [[ ${#healthy_deployments[@]} -eq 0 ]]; then
        log_error "No healthy deployments found for rollback"
        exit 1
    fi
    
    echo "$current_version"
}

# Determine rollback target
determine_rollback_target() {
    local current_version="$1"
    local target_version=""
    
    log_step "Determining rollback target..."
    
    case "$ROLLBACK_TYPE" in
        "previous"|"toggle")
            # Switch to the other version
            if [[ "$current_version" == "blue" ]]; then
                target_version="green"
            elif [[ "$current_version" == "green" ]]; then
                target_version="blue"
            else
                log_error "Unknown current version: $current_version"
                exit 1
            fi
            ;;
        "blue")
            target_version="blue"
            ;;
        "green")
            target_version="green"
            ;;
        *)
            log_error "Unknown rollback type: $ROLLBACK_TYPE"
            exit 1
            ;;
    esac
    
    # Verify target deployment exists and is healthy
    local target_deployment="candlefish-website-$target_version"
    
    if ! kubectl get deployment "$target_deployment" -n "$NAMESPACE" &>/dev/null; then
        log_error "Target deployment not found: $target_deployment"
        
        if [[ "$FORCE_ROLLBACK" != "true" ]]; then
            log_error "Use --force to proceed with potentially unsafe rollback"
            exit 1
        else
            log_warning "Proceeding with forced rollback despite missing target deployment"
        fi
    fi
    
    # Check target deployment health
    local ready_replicas=$(kubectl get deployment "$target_deployment" \
        -n "$NAMESPACE" \
        -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local desired_replicas=$(kubectl get deployment "$target_deployment" \
        -n "$NAMESPACE" \
        -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [[ "$ready_replicas" -lt "$desired_replicas" ]]; then
        log_warning "Target deployment is not fully ready: $target_deployment ($ready_replicas/$desired_replicas)"
        
        if [[ "$FORCE_ROLLBACK" != "true" ]]; then
            log_error "Use --force to proceed with rollback to unhealthy deployment"
            exit 1
        else
            log_warning "Proceeding with forced rollback to potentially unhealthy deployment"
        fi
    fi
    
    log_info "Rollback target determined: $target_version"
    update_rollback_state "to_version" "$target_version"
    
    echo "$target_version"
}

# Perform pre-rollback health check
perform_pre_rollback_check() {
    local target_version="$1"
    
    log_step "Performing pre-rollback health check..."
    
    local target_deployment="candlefish-website-$target_version"
    
    # Scale up target deployment if it's scaled down
    local current_replicas=$(kubectl get deployment "$target_deployment" \
        -n "$NAMESPACE" \
        -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [[ "$current_replicas" -eq 0 ]]; then
        log_info "Target deployment is scaled down, scaling up..."
        kubectl scale deployment "$target_deployment" --replicas=3 -n "$NAMESPACE"
        
        # Wait for deployment to be ready
        if kubectl rollout status deployment "$target_deployment" \
            -n "$NAMESPACE" \
            --timeout=300s; then
            log_success "Target deployment scaled up and ready"
        else
            log_error "Failed to scale up target deployment"
            exit 1
        fi
    fi
    
    # Run health checks on target pods
    local pod_ips=($(kubectl get pods \
        -n "$NAMESPACE" \
        -l "app=candlefish-website,version=$target_version" \
        -o jsonpath='{.items[*].status.podIP}'))
    
    if [[ ${#pod_ips[@]} -eq 0 ]]; then
        log_error "No pods found for target version: $target_version"
        exit 1
    fi
    
    log_info "Testing ${#pod_ips[@]} pods for target version: $target_version"
    
    local healthy_pods=0
    for pod_ip in "${pod_ips[@]}"; do
        if curl -sf --connect-timeout 5 --max-time 10 "http://$pod_ip:3000/api/health" > /dev/null 2>&1; then
            ((healthy_pods++))
            log_info "Pod $pod_ip: HEALTHY"
        else
            log_warning "Pod $pod_ip: UNHEALTHY"
        fi
    done
    
    local health_percentage=$((healthy_pods * 100 / ${#pod_ips[@]}))
    log_info "Target deployment health: $health_percentage% ($healthy_pods/${#pod_ips[@]} pods)"
    
    if [[ $health_percentage -lt 70 ]]; then
        log_error "Target deployment health is below 70%"
        
        if [[ "$FORCE_ROLLBACK" != "true" ]]; then
            log_error "Use --force to proceed with rollback to unhealthy deployment"
            exit 1
        else
            log_warning "Proceeding with forced rollback despite poor health"
        fi
    fi
    
    log_success "Pre-rollback health check passed"
    update_rollback_state "current_step" "pre_rollback_check_passed"
}

# Execute rollback
execute_rollback() {
    local target_version="$1"
    local current_version="$2"
    
    log_step "Executing rollback to version: $target_version"
    
    # Record rollback start time
    update_rollback_state "current_step" "executing_rollback"
    
    # Switch service selector to target version
    log_info "Switching service selector to version: $target_version"
    kubectl patch service candlefish-website-service \
        -n "$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"version\":\"$target_version\"}}}"
    
    log_success "Service selector updated to version: $target_version"
    
    # Wait for DNS propagation and connections to settle
    log_info "Waiting for traffic to settle..."
    sleep 30
    
    # Verify rollback success
    verify_rollback_success "$target_version"
    
    update_rollback_state "current_step" "rollback_executed"
}

# Verify rollback success
verify_rollback_success() {
    local target_version="$1"
    
    log_step "Verifying rollback success..."
    
    # Check service selector
    local service_version=$(kubectl get service candlefish-website-service \
        -n "$NAMESPACE" \
        -o jsonpath='{.spec.selector.version}')
    
    if [[ "$service_version" != "$target_version" ]]; then
        log_error "Service selector verification failed. Expected: $target_version, Got: $service_version"
        return 1
    fi
    
    log_success "Service selector verified: $target_version"
    
    # Test external endpoint if available
    local external_endpoint=""
    
    # Try ingress first
    if kubectl get ingress candlefish-website-ingress -n "$NAMESPACE" &>/dev/null; then
        external_endpoint=$(kubectl get ingress candlefish-website-ingress \
            -n "$NAMESPACE" \
            -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    fi
    
    # Fall back to service
    if [[ -z "$external_endpoint" ]]; then
        external_endpoint=$(kubectl get service candlefish-website-service \
            -n "$NAMESPACE" \
            -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    fi
    
    if [[ -n "$external_endpoint" ]]; then
        log_info "Testing external endpoint: $external_endpoint"
        
        local success_count=0
        local total_attempts=5
        
        for attempt in $(seq 1 $total_attempts); do
            if curl -sf --connect-timeout 10 --max-time 30 "http://$external_endpoint/api/health" > /dev/null; then
                ((success_count++))
                log_info "External health check $attempt/$total_attempts: SUCCESS"
            else
                log_warning "External health check $attempt/$total_attempts: FAILED"
            fi
            
            [[ $attempt -lt $total_attempts ]] && sleep 10
        done
        
        local success_rate=$((success_count * 100 / total_attempts))
        
        if [[ $success_rate -ge 60 ]]; then
            log_success "External endpoint verification passed ($success_rate% success rate)"
        else
            log_warning "External endpoint verification marginal ($success_rate% success rate)"
        fi
    else
        log_warning "No external endpoint available for verification"
    fi
    
    update_rollback_state "current_step" "rollback_verified"
}

# Send rollback notification
send_rollback_notification() {
    local status=$(get_rollback_state 'status')
    local rollback_id=$(get_rollback_state 'rollback_id')
    local started_at=$(get_rollback_state 'started_at')
    local from_version=$(get_rollback_state 'from_version')
    local to_version=$(get_rollback_state 'to_version')
    
    local webhook_url="${SLACK_WEBHOOK_URL:-}"
    local duration=""
    
    if [[ -n "$started_at" ]]; then
        local start_time=$(date -d "$started_at" +%s)
        local end_time=$(date +%s)
        duration="$((end_time - start_time))s"
    fi
    
    local message=""
    local color=""
    
    case "$status" in
        "completed")
            message="✅ Rollback completed successfully!"
            color="good"
            ;;
        "failed")
            message="❌ Rollback failed!"
            color="danger"
            ;;
        *)
            message="ℹ️ Rollback status: $status"
            color=""
            ;;
    esac
    
    local notification_text="$message
Environment: $ENVIRONMENT
From: $from_version → To: $to_version
Duration: $duration
Rollback ID: $rollback_id"
    
    if [[ -n "$webhook_url" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$notification_text\", \"color\":\"$color\"}" \
            "$webhook_url" &>/dev/null || true
    fi
    
    log_info "Rollback notification sent"
}

# Cleanup function
cleanup() {
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        update_rollback_state "status" "completed"
        update_rollback_state "completed_at" "$(date -Iseconds)"
        log_success "Rollback completed successfully"
    else
        update_rollback_state "status" "failed"
        update_rollback_state "failed_at" "$(date -Iseconds)"
        log_error "Rollback failed with exit code: $exit_code"
    fi
    
    # Send notification
    send_rollback_notification
    
    exit $exit_code
}

# Set up signal handlers
trap cleanup EXIT
trap 'log_error "Rollback interrupted"; exit 130' INT TERM

# Main rollback function
main() {
    log_info "Starting rollback for Candlefish Website"
    log_info "Environment: $ENVIRONMENT"
    log_info "Namespace: $NAMESPACE"
    log_info "Rollback type: $ROLLBACK_TYPE"
    log_info "Force rollback: $FORCE_ROLLBACK"
    
    # Initialize rollback
    init_rollback_state
    
    # Confirm rollback if not forced
    if [[ "$FORCE_ROLLBACK" != "true" ]]; then
        echo ""
        log_warning "This will perform a rollback of the Candlefish Website deployment."
        log_warning "This action will switch traffic to a different version."
        echo ""
        read -p "Are you sure you want to proceed? (yes/no): " confirm
        
        if [[ "$confirm" != "yes" ]]; then
            log_info "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    # Execute rollback steps
    verify_prerequisites
    local current_version=$(get_current_deployment_status)
    local target_version=$(determine_rollback_target "$current_version")
    
    log_info "Rollback plan: $current_version → $target_version"
    
    perform_pre_rollback_check "$target_version"
    execute_rollback "$target_version" "$current_version"
    
    log_success "Rollback completed successfully!"
    log_info "Active version is now: $target_version"
    log_info "Previous version: $current_version"
}

# Script usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Emergency rollback script for Candlefish Website.

Options:
  -e, --environment ENV       Target environment (default: production)
  -n, --namespace NAMESPACE   Kubernetes namespace (default: same as environment)
  -t, --type TYPE            Rollback type: previous|toggle|blue|green (default: previous)
  -f, --force                Force rollback without confirmation or health checks
  -h, --help                 Show this help message

Rollback types:
  previous, toggle           Switch to the other version (blue ↔ green)
  blue                      Rollback to blue version specifically
  green                     Rollback to green version specifically

Environment variables:
  ENVIRONMENT               Target environment
  NAMESPACE                 Kubernetes namespace
  ROLLBACK_TYPE            Rollback type
  FORCE_ROLLBACK           Force rollback (true/false)
  SLACK_WEBHOOK_URL        Slack webhook for notifications

Examples:
  $0                                    # Interactive rollback to previous version
  $0 -f                                # Force rollback without confirmation
  $0 -e staging -t blue                # Rollback staging to blue version
  $0 -e production -t green -f         # Force rollback production to green

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            NAMESPACE="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -t|--type)
            ROLLBACK_TYPE="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_ROLLBACK="true"
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

# Validate rollback type
case "$ROLLBACK_TYPE" in
    "previous"|"toggle"|"blue"|"green")
        ;;
    *)
        log_error "Invalid rollback type: $ROLLBACK_TYPE"
        log_error "Valid types: previous, toggle, blue, green"
        exit 1
        ;;
esac

# Ensure log directory exists
mkdir -p "$(dirname "$ROLLBACK_LOG_FILE")" 2>/dev/null || true

# Log all output to file
exec > >(tee -a "$ROLLBACK_LOG_FILE")
exec 2>&1

# Run main rollback
main