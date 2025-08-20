#!/bin/bash

# Blue-Green Deployment Script for Candlefish Website
# Implements zero-downtime deployments with automatic rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default values
ENVIRONMENT="${ENVIRONMENT:-production}"
NAMESPACE="${NAMESPACE:-$ENVIRONMENT}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
ECR_REPOSITORY="${ECR_REPOSITORY:-}"
TIMEOUT="${TIMEOUT:-600}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

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

# Deployment state management
DEPLOYMENT_STATE_FILE="/tmp/candlefish-deployment-state.json"
DEPLOYMENT_LOG_FILE="/var/log/candlefish-deployment.log"

# Initialize deployment state
init_deployment_state() {
    local deployment_id=$(date +%s)
    
    cat > "$DEPLOYMENT_STATE_FILE" << EOF
{
  "deployment_id": "$deployment_id",
  "environment": "$ENVIRONMENT",
  "namespace": "$NAMESPACE",
  "image_tag": "$IMAGE_TAG",
  "started_at": "$(date -Iseconds)",
  "current_step": "initialization",
  "active_version": "",
  "target_version": "",
  "previous_version": "",
  "rollback_data": {},
  "status": "in_progress"
}
EOF
    
    log_info "Deployment initialized with ID: $deployment_id"
}

# Update deployment state
update_deployment_state() {
    local key="$1"
    local value="$2"
    
    jq --arg key "$key" --arg value "$value" '.[$key] = $value' "$DEPLOYMENT_STATE_FILE" > "${DEPLOYMENT_STATE_FILE}.tmp" && \
    mv "${DEPLOYMENT_STATE_FILE}.tmp" "$DEPLOYMENT_STATE_FILE"
}

# Get current deployment state
get_deployment_state() {
    local key="$1"
    jq -r --arg key "$key" '.[$key] // empty' "$DEPLOYMENT_STATE_FILE"
}

# Cleanup function
cleanup() {
    local exit_code=$?
    
    if [[ $exit_code -ne 0 ]]; then
        log_error "Deployment failed with exit code: $exit_code"
        update_deployment_state "status" "failed"
        update_deployment_state "failed_at" "$(date -Iseconds)"
        
        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            log_warning "Attempting automatic rollback..."
            rollback_deployment || log_error "Rollback failed"
        fi
    fi
    
    # Send deployment notification
    send_deployment_notification
    
    exit $exit_code
}

# Set up signal handlers
trap cleanup EXIT
trap 'log_error "Deployment interrupted"; exit 130' INT TERM

# Verify prerequisites
verify_prerequisites() {
    log_step "Verifying prerequisites..."
    
    # Check required tools
    local required_tools=("kubectl" "jq" "aws" "curl")
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
    
    # Verify ECR repository
    if [[ -z "$ECR_REPOSITORY" ]]; then
        log_error "ECR_REPOSITORY environment variable is required"
        exit 1
    fi
    
    # Check if image exists
    if ! aws ecr describe-images --repository-name "$(basename "$ECR_REPOSITORY")" --image-ids imageTag="$IMAGE_TAG" &>/dev/null; then
        log_error "Image not found: $ECR_REPOSITORY:$IMAGE_TAG"
        exit 1
    fi
    
    log_success "Prerequisites verified"
    update_deployment_state "current_step" "prerequisites_verified"
}

# Determine current active version
get_current_active_version() {
    local current_version=$(kubectl get service candlefish-website-service \
        -n "$NAMESPACE" \
        -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "")
    
    if [[ -z "$current_version" ]]; then
        # No service exists, default to blue
        current_version="blue"
        log_info "No existing service found, defaulting to blue version"
    fi
    
    echo "$current_version"
}

# Determine target version for deployment
get_target_version() {
    local current_version="$1"
    
    if [[ "$current_version" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Store rollback data
store_rollback_data() {
    local active_version="$1"
    
    log_info "Storing rollback data for version: $active_version"
    
    # Get current deployment configuration
    local deployment_name="candlefish-website-$active_version"
    local current_image=""
    local current_replicas=""
    
    if kubectl get deployment "$deployment_name" -n "$NAMESPACE" &>/dev/null; then
        current_image=$(kubectl get deployment "$deployment_name" \
            -n "$NAMESPACE" \
            -o jsonpath='{.spec.template.spec.containers[0].image}')
        current_replicas=$(kubectl get deployment "$deployment_name" \
            -n "$NAMESPACE" \
            -o jsonpath='{.spec.replicas}')
    fi
    
    # Store rollback data in deployment state
    local rollback_data=$(jq -n \
        --arg version "$active_version" \
        --arg image "$current_image" \
        --arg replicas "$current_replicas" \
        '{
            version: $version,
            image: $image,
            replicas: $replicas,
            timestamp: now | strftime("%Y-%m-%dT%H:%M:%SZ")
        }')
    
    jq --argjson rollback_data "$rollback_data" '.rollback_data = $rollback_data' \
        "$DEPLOYMENT_STATE_FILE" > "${DEPLOYMENT_STATE_FILE}.tmp" && \
    mv "${DEPLOYMENT_STATE_FILE}.tmp" "$DEPLOYMENT_STATE_FILE"
    
    log_success "Rollback data stored"
}

# Deploy new version
deploy_new_version() {
    local target_version="$1"
    local full_image="$ECR_REPOSITORY:$IMAGE_TAG"
    
    log_step "Deploying new version: $target_version"
    log_info "Image: $full_image"
    
    # Prepare deployment manifest
    local deployment_manifest=$(sed \
        -e "s/VERSION_PLACEHOLDER/$target_version/g" \
        -e "s|IMAGE_TAG_PLACEHOLDER|$IMAGE_TAG|g" \
        "$PROJECT_ROOT/k8s/deployment.yaml")
    
    # Replace ECR repository placeholder
    deployment_manifest=$(echo "$deployment_manifest" | sed "s|\${ECR_REGISTRY}/candlefish-website|$ECR_REPOSITORY|g")
    
    # Apply deployment
    echo "$deployment_manifest" | kubectl apply -n "$NAMESPACE" -f -
    
    log_info "Deployment manifest applied for version: $target_version"
    update_deployment_state "current_step" "deployment_applied"
    
    # Wait for deployment to be ready
    local deployment_name="candlefish-website-$target_version"
    
    log_info "Waiting for deployment to be ready..."
    if kubectl rollout status deployment "$deployment_name" \
        -n "$NAMESPACE" \
        --timeout="${TIMEOUT}s"; then
        log_success "Deployment $deployment_name is ready"
    else
        log_error "Deployment $deployment_name failed to become ready within ${TIMEOUT}s"
        return 1
    fi
    
    update_deployment_state "current_step" "deployment_ready"
}

# Run health checks on the new deployment
run_health_checks() {
    local target_version="$1"
    
    log_step "Running health checks on version: $target_version"
    
    # Get pod IPs for the new version
    local pod_ips=($(kubectl get pods \
        -n "$NAMESPACE" \
        -l "app=candlefish-website,version=$target_version" \
        -o jsonpath='{.items[*].status.podIP}'))
    
    if [[ ${#pod_ips[@]} -eq 0 ]]; then
        log_error "No pods found for version: $target_version"
        return 1
    fi
    
    log_info "Found ${#pod_ips[@]} pods for health checks"
    
    # Health check parameters
    local health_endpoint="/api/health"
    local max_attempts=30
    local attempt_interval=10
    local successful_checks=0
    local required_success_rate=80
    
    for attempt in $(seq 1 $max_attempts); do
        log_info "Health check attempt $attempt/$max_attempts"
        local current_success=0
        
        for pod_ip in "${pod_ips[@]}"; do
            local health_url="http://$pod_ip:3000$health_endpoint"
            
            if curl -sf --connect-timeout 5 --max-time 10 "$health_url" > /dev/null 2>&1; then
                ((current_success++))
            fi
        done
        
        local success_rate=$((current_success * 100 / ${#pod_ips[@]}))
        log_info "Health check success rate: $success_rate% ($current_success/${#pod_ips[@]})"
        
        if [[ $success_rate -ge $required_success_rate ]]; then
            ((successful_checks++))
            
            # Require 3 consecutive successful checks
            if [[ $successful_checks -ge 3 ]]; then
                log_success "Health checks passed for version: $target_version"
                update_deployment_state "current_step" "health_checks_passed"
                return 0
            fi
        else
            successful_checks=0
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log_info "Waiting ${attempt_interval}s before next health check..."
            sleep $attempt_interval
        fi
    done
    
    log_error "Health checks failed for version: $target_version"
    return 1
}

# Switch traffic to new version
switch_traffic() {
    local target_version="$1"
    
    log_step "Switching traffic to version: $target_version"
    
    # Update service selector to point to new version
    kubectl patch service candlefish-website-service \
        -n "$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"version\":\"$target_version\"}}}"
    
    log_success "Traffic switched to version: $target_version"
    update_deployment_state "current_step" "traffic_switched"
    
    # Wait for traffic to stabilize
    log_info "Waiting for traffic to stabilize..."
    sleep 30
    
    # Verify traffic switch with external health check
    verify_traffic_switch "$target_version"
}

# Verify traffic switch
verify_traffic_switch() {
    local target_version="$1"
    
    log_info "Verifying traffic switch to version: $target_version"
    
    # Get service endpoint
    local service_endpoint=""
    local ingress_endpoint=""
    
    # Try to get ingress endpoint first
    if kubectl get ingress candlefish-website-ingress -n "$NAMESPACE" &>/dev/null; then
        ingress_endpoint=$(kubectl get ingress candlefish-website-ingress \
            -n "$NAMESPACE" \
            -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    fi
    
    # Fall back to service endpoint
    if [[ -z "$ingress_endpoint" ]]; then
        service_endpoint=$(kubectl get service candlefish-website-service \
            -n "$NAMESPACE" \
            -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    fi
    
    local test_endpoint="${ingress_endpoint:-$service_endpoint}"
    
    if [[ -z "$test_endpoint" ]]; then
        log_warning "Cannot determine external endpoint for verification"
        return 0
    fi
    
    log_info "Testing endpoint: $test_endpoint"
    
    # Test external endpoint
    local max_attempts=10
    local success_count=0
    
    for attempt in $(seq 1 $max_attempts); do
        if curl -sf --connect-timeout 10 --max-time 30 "http://$test_endpoint/api/health" > /dev/null; then
            ((success_count++))
            log_info "External health check $attempt/$max_attempts: SUCCESS"
        else
            log_warning "External health check $attempt/$max_attempts: FAILED"
        fi
        
        [[ $attempt -lt $max_attempts ]] && sleep 5
    done
    
    local success_rate=$((success_count * 100 / max_attempts))
    
    if [[ $success_rate -ge 70 ]]; then
        log_success "Traffic switch verification passed ($success_rate% success rate)"
        update_deployment_state "current_step" "traffic_verified"
        return 0
    else
        log_error "Traffic switch verification failed ($success_rate% success rate)"
        return 1
    fi
}

# Clean up old version
cleanup_old_version() {
    local old_version="$1"
    
    log_step "Cleaning up old version: $old_version"
    
    # Wait before cleanup to ensure stability
    log_info "Waiting 2 minutes before cleanup to ensure stability..."
    sleep 120
    
    # Scale down old deployment
    local old_deployment="candlefish-website-$old_version"
    
    if kubectl get deployment "$old_deployment" -n "$NAMESPACE" &>/dev/null; then
        log_info "Scaling down old deployment: $old_deployment"
        kubectl scale deployment "$old_deployment" --replicas=0 -n "$NAMESPACE"
        
        # Wait for pods to terminate
        kubectl wait --for=delete pods \
            -l "app=candlefish-website,version=$old_version" \
            -n "$NAMESPACE" \
            --timeout=300s || true
        
        # Delete old deployment after successful traffic switch
        if [[ "$(get_deployment_state 'current_step')" == "traffic_verified" ]]; then
            kubectl delete deployment "$old_deployment" -n "$NAMESPACE" --ignore-not-found=true
            log_success "Old deployment deleted: $old_deployment"
        else
            log_warning "Keeping old deployment for potential rollback: $old_deployment"
        fi
    else
        log_info "Old deployment not found: $old_deployment"
    fi
    
    update_deployment_state "current_step" "cleanup_completed"
}

# Rollback deployment
rollback_deployment() {
    log_step "Starting rollback procedure..."
    
    local rollback_data=$(get_deployment_state 'rollback_data')
    
    if [[ -z "$rollback_data" || "$rollback_data" == "null" ]]; then
        log_error "No rollback data available"
        return 1
    fi
    
    local rollback_version=$(echo "$rollback_data" | jq -r '.version')
    local rollback_image=$(echo "$rollback_data" | jq -r '.image')
    
    if [[ -z "$rollback_version" || "$rollback_version" == "null" ]]; then
        log_error "Invalid rollback data"
        return 1
    fi
    
    log_info "Rolling back to version: $rollback_version"
    log_info "Rollback image: $rollback_image"
    
    # Switch service back to previous version
    kubectl patch service candlefish-website-service \
        -n "$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"version\":\"$rollback_version\"}}}"
    
    log_success "Service rolled back to version: $rollback_version"
    
    # Verify rollback
    sleep 30
    if verify_traffic_switch "$rollback_version"; then
        log_success "Rollback completed successfully"
        update_deployment_state "status" "rolled_back"
        update_deployment_state "rolled_back_at" "$(date -Iseconds)"
        return 0
    else
        log_error "Rollback verification failed"
        return 1
    fi
}

# Send deployment notification
send_deployment_notification() {
    local status=$(get_deployment_state 'status')
    local deployment_id=$(get_deployment_state 'deployment_id')
    local started_at=$(get_deployment_state 'started_at')
    local target_version=$(get_deployment_state 'target_version')
    
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
            message="✅ Deployment completed successfully!"
            color="good"
            ;;
        "failed")
            message="❌ Deployment failed!"
            color="danger"
            ;;
        "rolled_back")
            message="⚠️ Deployment rolled back!"
            color="warning"
            ;;
        *)
            message="ℹ️ Deployment status: $status"
            color=""
            ;;
    esac
    
    local notification_text="$message
Environment: $ENVIRONMENT
Version: $target_version
Image: $ECR_REPOSITORY:$IMAGE_TAG
Duration: $duration
Deployment ID: $deployment_id"
    
    if [[ -n "$webhook_url" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$notification_text\", \"color\":\"$color\"}" \
            "$webhook_url" &>/dev/null || true
    fi
    
    log_info "Deployment notification sent"
}

# Main deployment function
main() {
    log_info "Starting blue-green deployment for Candlefish Website"
    log_info "Environment: $ENVIRONMENT"
    log_info "Namespace: $NAMESPACE"
    log_info "Image: $ECR_REPOSITORY:$IMAGE_TAG"
    
    # Initialize deployment
    init_deployment_state
    
    # Run deployment steps
    verify_prerequisites
    
    # Determine deployment versions
    local active_version=$(get_current_active_version)
    local target_version=$(get_target_version "$active_version")
    
    log_info "Active version: $active_version"
    log_info "Target version: $target_version"
    
    # Update deployment state
    update_deployment_state "active_version" "$active_version"
    update_deployment_state "target_version" "$target_version"
    update_deployment_state "previous_version" "$active_version"
    
    # Store rollback data
    store_rollback_data "$active_version"
    
    # Deploy new version
    deploy_new_version "$target_version"
    
    # Run health checks
    run_health_checks "$target_version"
    
    # Switch traffic
    switch_traffic "$target_version"
    
    # Clean up old version
    cleanup_old_version "$active_version"
    
    # Mark deployment as completed
    update_deployment_state "status" "completed"
    update_deployment_state "completed_at" "$(date -Iseconds)"
    
    log_success "Blue-green deployment completed successfully!"
    log_info "Active version is now: $target_version"
}

# Script usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Blue-green deployment script for Candlefish Website.

Options:
  -e, --environment ENV       Target environment (default: production)
  -n, --namespace NAMESPACE   Kubernetes namespace (default: same as environment)
  -t, --tag TAG              Image tag to deploy (default: latest)
  -r, --repository REPO      ECR repository URL
  --timeout SECONDS          Deployment timeout in seconds (default: 600)
  --health-timeout SECONDS   Health check timeout in seconds (default: 300)
  --no-rollback             Disable automatic rollback on failure
  -h, --help                Show this help message

Environment variables:
  ENVIRONMENT               Target environment
  NAMESPACE                 Kubernetes namespace
  IMAGE_TAG                 Image tag to deploy
  ECR_REPOSITORY           ECR repository URL
  TIMEOUT                  Deployment timeout
  HEALTH_CHECK_TIMEOUT     Health check timeout
  ROLLBACK_ON_FAILURE      Enable/disable automatic rollback (default: true)
  SLACK_WEBHOOK_URL        Slack webhook for notifications

Examples:
  $0                                              # Deploy latest to production
  $0 -e staging -t v1.2.3                       # Deploy v1.2.3 to staging
  $0 -r 123456789012.dkr.ecr.us-east-1.amazonaws.com/candlefish-website -t v1.0.0

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
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -r|--repository)
            ECR_REPOSITORY="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --health-timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        --no-rollback)
            ROLLBACK_ON_FAILURE="false"
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

# Validate required parameters
if [[ -z "$ECR_REPOSITORY" ]]; then
    log_error "ECR repository is required. Use -r/--repository or set ECR_REPOSITORY environment variable."
    exit 1
fi

# Ensure log directory exists
mkdir -p "$(dirname "$DEPLOYMENT_LOG_FILE")" 2>/dev/null || true

# Log all output to file
exec > >(tee -a "$DEPLOYMENT_LOG_FILE")
exec 2>&1

# Run main deployment
main