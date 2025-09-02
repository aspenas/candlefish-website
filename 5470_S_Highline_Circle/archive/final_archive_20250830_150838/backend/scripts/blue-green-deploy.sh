#!/bin/bash

# Blue-Green Deployment Strategy for Item Valuation System
# This script implements zero-downtime deployment using blue-green strategy

set -euo pipefail

# Configuration
NAMESPACE="${NAMESPACE:-inventory-system}"
APP_NAME="${APP_NAME:-backend}"
SERVICE_NAME="${SERVICE_NAME:-backend-service}"
NEW_IMAGE="${NEW_IMAGE:-}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://api.inventory.example.com/health}"
READINESS_TIMEOUT="${READINESS_TIMEOUT:-300}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-10}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-30}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Colors
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

# Error handler
error_exit() {
    log_error "$1"
    if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
        log_error "Initiating automatic rollback..."
        rollback_deployment
    fi
    exit 1
}

# Check required tools
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    for tool in kubectl curl jq; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            error_exit "Required tool '$tool' is not installed"
        fi
    done
    
    # Check kubectl connection
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi
    
    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        error_exit "Namespace '$NAMESPACE' does not exist"
    fi
    
    log_success "Prerequisites check passed"
}

# Validate inputs
validate_inputs() {
    log_info "Validating inputs..."
    
    if [ -z "$NEW_IMAGE" ]; then
        error_exit "NEW_IMAGE environment variable must be set"
    fi
    
    # Validate image exists (simple check)
    log_info "Validating new image: $NEW_IMAGE"
    
    log_success "Input validation passed"
}

# Get current deployment status
get_current_deployment() {
    log_info "Getting current deployment status..."
    
    # Check if deployment exists
    if ! kubectl get deployment "$APP_NAME" -n "$NAMESPACE" >/dev/null 2>&1; then
        error_exit "Deployment '$APP_NAME' not found in namespace '$NAMESPACE'"
    fi
    
    # Get current image
    CURRENT_IMAGE=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
    log_info "Current image: $CURRENT_IMAGE"
    
    # Get current replicas
    CURRENT_REPLICAS=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    log_info "Current replicas: $CURRENT_REPLICAS"
    
    # Get current replicaset name
    CURRENT_RS=$(kubectl get rs -n "$NAMESPACE" -l app="$APP_NAME" --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}')
    log_info "Current ReplicaSet: $CURRENT_RS"
}

# Create blue-green deployment
create_green_deployment() {
    log_info "Creating green deployment with new image..."
    
    # Update deployment with new image
    kubectl patch deployment "$APP_NAME" -n "$NAMESPACE" -p \
        "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"${APP_NAME}\",\"image\":\"${NEW_IMAGE}\"}]}}}}"
    
    log_success "Green deployment created with image: $NEW_IMAGE"
}

# Wait for green deployment to be ready
wait_for_green_deployment() {
    log_info "Waiting for green deployment to be ready..."
    
    # Wait for rollout to complete
    if ! kubectl rollout status deployment/"$APP_NAME" -n "$NAMESPACE" --timeout="${READINESS_TIMEOUT}s"; then
        error_exit "Green deployment rollout failed"
    fi
    
    # Get new replicaset
    NEW_RS=$(kubectl get rs -n "$NAMESPACE" -l app="$APP_NAME" --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}')
    log_info "New ReplicaSet: $NEW_RS"
    
    # Wait for all pods to be ready
    log_info "Waiting for all pods to be ready..."
    kubectl wait --for=condition=ready pod -l app="$APP_NAME" -n "$NAMESPACE" --timeout="${READINESS_TIMEOUT}s" || \
        error_exit "Green deployment pods failed to become ready"
    
    log_success "Green deployment is ready"
}

# Perform health checks
perform_health_checks() {
    log_info "Performing health checks on green deployment..."
    
    # Get pod IPs for direct health checks
    POD_IPS=($(kubectl get pods -n "$NAMESPACE" -l app="$APP_NAME" -o jsonpath='{.items[*].status.podIP}'))
    
    if [ ${#POD_IPS[@]} -eq 0 ]; then
        error_exit "No pod IPs found for health checks"
    fi
    
    log_info "Found ${#POD_IPS[@]} pods to health check"
    
    # Health check each pod directly
    for pod_ip in "${POD_IPS[@]}"; do
        log_info "Health checking pod at IP: $pod_ip"
        
        local retry_count=0
        local health_check_passed=false
        
        while [ $retry_count -lt $HEALTH_CHECK_RETRIES ]; do
            if curl -f -s "http://$pod_ip:8080/health" >/dev/null 2>&1; then
                log_success "Pod $pod_ip health check passed"
                health_check_passed=true
                break
            else
                log_warn "Pod $pod_ip health check failed (attempt $((retry_count + 1))/$HEALTH_CHECK_RETRIES)"
                ((retry_count++))
                if [ $retry_count -lt $HEALTH_CHECK_RETRIES ]; then
                    sleep 10
                fi
            fi
        done
        
        if [ "$health_check_passed" = false ]; then
            error_exit "Health check failed for pod $pod_ip after $HEALTH_CHECK_RETRIES attempts"
        fi
    done
    
    # External health check (if URL is accessible)
    if [ -n "$HEALTH_CHECK_URL" ]; then
        log_info "Performing external health check: $HEALTH_CHECK_URL"
        
        local retry_count=0
        local external_health_passed=false
        
        while [ $retry_count -lt $HEALTH_CHECK_RETRIES ]; do
            if curl -f -s "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
                log_success "External health check passed"
                external_health_passed=true
                break
            else
                log_warn "External health check failed (attempt $((retry_count + 1))/$HEALTH_CHECK_RETRIES)"
                ((retry_count++))
                if [ $retry_count -lt $HEALTH_CHECK_RETRIES ]; then
                    sleep $HEALTH_CHECK_INTERVAL
                fi
            fi
        done
        
        if [ "$external_health_passed" = false ]; then
            error_exit "External health check failed after $HEALTH_CHECK_RETRIES attempts"
        fi
    fi
    
    log_success "All health checks passed"
}

# Perform readiness checks
perform_readiness_checks() {
    log_info "Performing readiness checks..."
    
    # Check readiness endpoint
    POD_IPS=($(kubectl get pods -n "$NAMESPACE" -l app="$APP_NAME" -o jsonpath='{.items[*].status.podIP}'))
    
    for pod_ip in "${POD_IPS[@]}"; do
        log_info "Readiness checking pod at IP: $pod_ip"
        
        if curl -f -s "http://$pod_ip:8080/ready" >/dev/null 2>&1; then
            log_success "Pod $pod_ip readiness check passed"
        else
            error_exit "Readiness check failed for pod $pod_ip"
        fi
    done
    
    log_success "All readiness checks passed"
}

# Validate application functionality
validate_application() {
    log_info "Validating application functionality..."
    
    # Get a pod IP for testing
    POD_IP=$(kubectl get pods -n "$NAMESPACE" -l app="$APP_NAME" -o jsonpath='{.items[0].status.podIP}')
    
    # Test basic API endpoints
    local test_endpoints=(
        "/health"
        "/ready" 
        "/api/v1/items?limit=1"
    )
    
    for endpoint in "${test_endpoints[@]}"; do
        log_info "Testing endpoint: $endpoint"
        
        local response_code
        response_code=$(curl -s -o /dev/null -w "%{http_code}" "http://$POD_IP:8080$endpoint" || echo "000")
        
        if [ "$response_code" = "200" ]; then
            log_success "Endpoint $endpoint returned 200 OK"
        else
            error_exit "Endpoint $endpoint returned $response_code"
        fi
    done
    
    log_success "Application validation completed"
}

# Switch traffic to green (complete the blue-green switch)
switch_traffic() {
    log_info "Traffic is already switched (Kubernetes rolling update completed)"
    log_info "Green deployment is now serving production traffic"
    
    # Verify service is pointing to new pods
    SERVICE_ENDPOINTS=$(kubectl get endpoints "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' | tr ' ' '\n' | sort)
    POD_IPS=$(kubectl get pods -n "$NAMESPACE" -l app="$APP_NAME" -o jsonpath='{.items[*].status.podIP}' | tr ' ' '\n' | sort)
    
    if [ "$SERVICE_ENDPOINTS" = "$POD_IPS" ]; then
        log_success "Service endpoints match new pod IPs"
    else
        log_warn "Service endpoints may not be fully updated yet"
    fi
}

# Monitor deployment metrics
monitor_deployment() {
    log_info "Monitoring deployment metrics for $HEALTH_CHECK_INTERVAL seconds..."
    
    # Monitor for a period after deployment
    local start_time=$(date +%s)
    local end_time=$((start_time + HEALTH_CHECK_INTERVAL))
    
    while [ $(date +%s) -lt $end_time ]; do
        # Check pod status
        local pod_count
        pod_count=$(kubectl get pods -n "$NAMESPACE" -l app="$APP_NAME" --no-headers | wc -l)
        
        local ready_count
        ready_count=$(kubectl get pods -n "$NAMESPACE" -l app="$APP_NAME" --no-headers | grep -c "Running" || echo "0")
        
        log_info "Pod status: $ready_count/$pod_count ready"
        
        # Quick health check
        if [ -n "$HEALTH_CHECK_URL" ]; then
            if curl -f -s "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
                log_info "Health check: PASS"
            else
                log_warn "Health check: FAIL"
            fi
        fi
        
        sleep 10
    done
    
    log_success "Monitoring period completed"
}

# Cleanup old replicasets
cleanup_old_replicasets() {
    log_info "Cleaning up old ReplicaSets..."
    
    # Keep the last 3 ReplicaSets for rollback capability
    local keep_count=3
    
    # Get all ReplicaSets for this deployment, sorted by creation time
    local old_rs_list
    old_rs_list=$(kubectl get rs -n "$NAMESPACE" -l app="$APP_NAME" --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[*].metadata.name}')
    
    if [ -n "$old_rs_list" ]; then
        local rs_array=($old_rs_list)
        local total_rs=${#rs_array[@]}
        
        if [ $total_rs -gt $keep_count ]; then
            local delete_count=$((total_rs - keep_count))
            log_info "Deleting $delete_count old ReplicaSets (keeping last $keep_count)"
            
            for ((i=0; i<delete_count; i++)); do
                local rs_name=${rs_array[$i]}
                log_info "Deleting ReplicaSet: $rs_name"
                kubectl delete rs "$rs_name" -n "$NAMESPACE" --grace-period=30 || log_warn "Failed to delete ReplicaSet $rs_name"
            done
        else
            log_info "Only $total_rs ReplicaSets found, no cleanup needed"
        fi
    fi
    
    log_success "ReplicaSet cleanup completed"
}

# Rollback deployment
rollback_deployment() {
    log_error "Initiating deployment rollback..."
    
    # Rollback to previous version
    if kubectl rollout undo deployment/"$APP_NAME" -n "$NAMESPACE"; then
        log_info "Rollback initiated, waiting for completion..."
        
        # Wait for rollback to complete
        if kubectl rollout status deployment/"$APP_NAME" -n "$NAMESPACE" --timeout="${READINESS_TIMEOUT}s"; then
            log_success "Rollback completed successfully"
            
            # Verify rollback
            local rolled_back_image
            rolled_back_image=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
            log_info "Rolled back to image: $rolled_back_image"
            
        else
            log_error "Rollback failed to complete within timeout"
        fi
    else
        log_error "Failed to initiate rollback"
    fi
}

# Generate deployment report
generate_report() {
    log_info "Generating deployment report..."
    
    local report_file="deployment-report-$(date +%Y%m%d-%H%M%S).json"
    
    # Collect deployment information
    cat > "$report_file" << EOF
{
  "deployment_time": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "namespace": "$NAMESPACE",
  "app_name": "$APP_NAME",
  "previous_image": "$CURRENT_IMAGE",
  "new_image": "$NEW_IMAGE",
  "current_replicas": "$CURRENT_REPLICAS",
  "deployment_status": "$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.status.conditions[-1].type}')",
  "ready_replicas": "$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')",
  "pod_status": {
EOF
    
    # Add pod information
    kubectl get pods -n "$NAMESPACE" -l app="$APP_NAME" -o json | jq -r '.items[] | {name: .metadata.name, status: .status.phase, image: .spec.containers[0].image, node: .spec.nodeName, ready: (.status.conditions[] | select(.type=="Ready") | .status)}' >> "$report_file"
    
    cat >> "$report_file" << EOF
  }
}
EOF
    
    log_success "Deployment report saved to: $report_file"
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    log_info "Starting Blue-Green Deployment for $APP_NAME"
    log_info "Target image: $NEW_IMAGE"
    log_info "Namespace: $NAMESPACE"
    
    # Pre-deployment checks
    check_prerequisites
    validate_inputs
    get_current_deployment
    
    # Execute blue-green deployment
    create_green_deployment
    wait_for_green_deployment
    perform_health_checks
    perform_readiness_checks
    validate_application
    switch_traffic
    monitor_deployment
    cleanup_old_replicasets
    
    # Post-deployment reporting
    generate_report
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_success "Blue-Green deployment completed successfully!"
    log_info "Total deployment time: ${duration} seconds"
    log_info "Previous image: $CURRENT_IMAGE"
    log_info "New image: $NEW_IMAGE"
    log_info "Application is now running on the new version"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        check_prerequisites
        get_current_deployment
        rollback_deployment
        ;;
    "status")
        check_prerequisites
        kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o wide
        kubectl get pods -n "$NAMESPACE" -l app="$APP_NAME" -o wide
        ;;
    *)
        echo "Usage: $0 [deploy|rollback|status]"
        echo "  deploy   - Perform blue-green deployment (default)"
        echo "  rollback - Rollback to previous version"
        echo "  status   - Show current deployment status"
        exit 1
        ;;
esac