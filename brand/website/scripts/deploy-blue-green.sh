#!/bin/bash

# Blue-Green Deployment Script for Candlefish Website
# Implements zero-downtime deployment with instant rollback capability

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
EKS_CLUSTER_NAME=${EKS_CLUSTER_NAME:-production-candlefish-website}
NAMESPACE=${NAMESPACE:-production}
DEPLOYMENT_NAME=${DEPLOYMENT_NAME:-candlefish-website}
SERVICE_NAME=${SERVICE_NAME:-candlefish-website}

# Blue-Green specific configuration
WARM_UP_TIME=${WARM_UP_TIME:-120} # 2 minutes for green environment to warm up
VALIDATION_TESTS=${VALIDATION_TESTS:-true}
AUTO_PROMOTE=${AUTO_PROMOTE:-true}
KEEP_BLUE_TIME=${KEEP_BLUE_TIME:-600} # Keep blue environment for 10 minutes after promotion

# Health check configuration
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-15}
MAX_HEALTH_CHECKS=${MAX_HEALTH_CHECKS:-20}
SMOKE_TEST_TIMEOUT=${SMOKE_TEST_TIMEOUT:-180}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a blue-green-deployment.log
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a blue-green-deployment.log
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a blue-green-deployment.log
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a blue-green-deployment.log
}

log_blue() {
    echo -e "${BLUE}[BLUE]${NC} $1" | tee -a blue-green-deployment.log
}

log_green() {
    echo -e "${GREEN}[GREEN]${NC} $1" | tee -a blue-green-deployment.log
}

# Notification function
notify_slack() {
    local message="$1"
    local color="${2:-good}"
    local stage="${3:-deployment}"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"🔵🟢 Blue-Green Deployment - $stage\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"Service\", \"value\": \"$DEPLOYMENT_NAME\", \"short\": true},
                        {\"title\": \"Stage\", \"value\": \"$stage\", \"short\": true},
                        {\"title\": \"Timestamp\", \"value\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"short\": true}
                    ],
                    \"footer\": \"Candlefish Blue-Green Pipeline\"
                }]
            }" \
            --silent || log_warning "Failed to send Slack notification"
    fi
}

# Get current active deployment (blue or green)
get_active_deployment() {
    local current_selector=$(kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "")
    
    if [[ "$current_selector" == "blue" ]]; then
        echo "blue"
    elif [[ "$current_selector" == "green" ]]; then
        echo "green"
    else
        # Default to blue if no version selector found
        echo "blue"
    fi
}

# Get inactive deployment (opposite of active)
get_inactive_deployment() {
    local active=$(get_active_deployment)
    if [[ "$active" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Health check for specific deployment
check_deployment_health() {
    local deployment_version="$1"
    local namespace="$2"
    local max_attempts="${3:-$MAX_HEALTH_CHECKS}"
    
    local deployment_name="${DEPLOYMENT_NAME}-${deployment_version}"
    log_info "Checking health of $deployment_name deployment"
    
    # Check if deployment exists
    if ! kubectl get deployment "$deployment_name" -n "$namespace" &>/dev/null; then
        log_error "Deployment $deployment_name does not exist"
        return 1
    fi
    
    # Wait for deployment to be ready
    log_info "Waiting for deployment $deployment_name to be ready..."
    if ! kubectl rollout status deployment/"$deployment_name" -n "$namespace" --timeout=300s; then
        log_error "Deployment $deployment_name failed to become ready"
        return 1
    fi
    
    # Check pod readiness
    local ready_pods=$(kubectl get deployment "$deployment_name" -n "$namespace" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
    local desired_pods=$(kubectl get deployment "$deployment_name" -n "$namespace" -o jsonpath='{.status.replicas}' 2>/dev/null || echo 0)
    
    if [[ "$ready_pods" != "$desired_pods" ]] || [[ "$ready_pods" == "0" ]]; then
        log_error "Pod readiness check failed for $deployment_name: $ready_pods/$desired_pods ready"
        return 1
    fi
    
    log_success "Deployment $deployment_name is healthy ($ready_pods/$desired_pods pods ready)"
    return 0
}

# Internal health check for green deployment
check_green_health_internal() {
    local deployment_version="$1"
    local max_attempts="${2:-$MAX_HEALTH_CHECKS}"
    
    local deployment_name="${DEPLOYMENT_NAME}-${deployment_version}"
    local attempts=0
    
    log_info "Performing internal health checks for $deployment_name"
    
    while [[ $attempts -lt $max_attempts ]]; do
        # Get pod IP for direct health check
        local pod_name=$(kubectl get pods -n "$NAMESPACE" -l app="$DEPLOYMENT_NAME",version="$deployment_version" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
        
        if [[ -n "$pod_name" ]]; then
            local pod_ip=$(kubectl get pod "$pod_name" -n "$NAMESPACE" -o jsonpath='{.status.podIP}' 2>/dev/null || echo "")
            
            if [[ -n "$pod_ip" ]]; then
                # Port-forward for internal testing
                kubectl port-forward -n "$NAMESPACE" "pod/$pod_name" 8080:3000 &
                local port_forward_pid=$!
                sleep 5
                
                # Test health endpoint
                local health_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/health" 2>/dev/null || echo "000")
                
                # Kill port-forward
                kill $port_forward_pid 2>/dev/null || true
                
                if [[ "$health_status" == "200" ]]; then
                    log_success "Internal health check passed for $deployment_name (attempt $((attempts + 1)))"
                    return 0
                fi
            fi
        fi
        
        attempts=$((attempts + 1))
        log_info "Internal health check attempt $attempts/$max_attempts failed, retrying in $HEALTH_CHECK_INTERVAL seconds..."
        sleep $HEALTH_CHECK_INTERVAL
    done
    
    log_error "Internal health checks failed for $deployment_name after $max_attempts attempts"
    return 1
}

# Run smoke tests against green deployment
run_smoke_tests() {
    local deployment_version="$1"
    
    log_info "Running smoke tests against $deployment_version deployment"
    
    # Get a pod from the green deployment for testing
    local pod_name=$(kubectl get pods -n "$NAMESPACE" -l app="$DEPLOYMENT_NAME",version="$deployment_version" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$pod_name" ]]; then
        log_error "No pods found for $deployment_version deployment"
        return 1
    fi
    
    # Set up port forwarding for testing
    kubectl port-forward -n "$NAMESPACE" "pod/$pod_name" 9000:3000 &
    local port_forward_pid=$!
    
    # Wait for port forward to establish
    sleep 10
    
    # Test suite
    local tests_passed=0
    local total_tests=5
    
    # Test 1: Health endpoint
    log_info "Smoke test 1/5: Health endpoint"
    if curl -f -s "http://localhost:9000/health" >/dev/null 2>&1; then
        log_success "✅ Health endpoint test passed"
        tests_passed=$((tests_passed + 1))
    else
        log_error "❌ Health endpoint test failed"
    fi
    
    # Test 2: Main page
    log_info "Smoke test 2/5: Main page"
    if curl -f -s "http://localhost:9000/" >/dev/null 2>&1; then
        log_success "✅ Main page test passed"
        tests_passed=$((tests_passed + 1))
    else
        log_error "❌ Main page test failed"
    fi
    
    # Test 3: API health
    log_info "Smoke test 3/5: API health"
    if curl -f -s "http://localhost:9000/api/health" >/dev/null 2>&1; then
        log_success "✅ API health test passed"
        tests_passed=$((tests_passed + 1))
    else
        log_error "❌ API health test failed"
    fi
    
    # Test 4: Static assets
    log_info "Smoke test 4/5: Static assets"
    if curl -f -s "http://localhost:9000/favicon.ico" >/dev/null 2>&1; then
        log_success "✅ Static assets test passed"
        tests_passed=$((tests_passed + 1))
    else
        log_error "❌ Static assets test failed"
    fi
    
    # Test 5: Response time test
    log_info "Smoke test 5/5: Response time"
    local response_time=$(curl -o /dev/null -s -w '%{time_total}\n' "http://localhost:9000/" || echo "999")
    if (( $(echo "$response_time < 3.0" | bc -l) )); then
        log_success "✅ Response time test passed (${response_time}s)"
        tests_passed=$((tests_passed + 1))
    else
        log_error "❌ Response time test failed (${response_time}s > 3.0s)"
    fi
    
    # Clean up port forward
    kill $port_forward_pid 2>/dev/null || true
    
    # Evaluate results
    local pass_percentage=$(( (tests_passed * 100) / total_tests ))
    log_info "Smoke tests completed: $tests_passed/$total_tests passed (${pass_percentage}%)"
    
    if [[ $tests_passed -ge 4 ]]; then # Allow 1 test to fail
        log_success "Smoke tests passed with acceptable threshold"
        return 0
    else
        log_error "Smoke tests failed - insufficient passing tests"
        return 1
    fi
}

# Deploy to green environment
deploy_green_environment() {
    local image="$1"
    local active_deployment=$(get_active_deployment)
    local inactive_deployment=$(get_inactive_deployment)
    
    log_green "Deploying to $inactive_deployment environment with image: $image"
    notify_slack "Deploying new version to $inactive_deployment environment" "good" "green-deploy"
    
    # Create or update green deployment
    local green_deployment_name="${DEPLOYMENT_NAME}-${inactive_deployment}"
    
    # Check if green deployment exists
    if kubectl get deployment "$green_deployment_name" -n "$NAMESPACE" &>/dev/null; then
        log_info "Updating existing $inactive_deployment deployment"
        kubectl set image deployment/"$green_deployment_name" -n "$NAMESPACE" app="$image" --record
    else
        log_info "Creating new $inactive_deployment deployment"
        
        # Get current deployment spec and modify it
        kubectl get deployment "${DEPLOYMENT_NAME}-${active_deployment}" -n "$NAMESPACE" -o yaml | \
        sed "s/${DEPLOYMENT_NAME}-${active_deployment}/${green_deployment_name}/g" | \
        sed "s/version: ${active_deployment}/version: ${inactive_deployment}/g" | \
        sed "s|image: .*|image: $image|g" | \
        kubectl apply -f -
    fi
    
    # Wait for green deployment to be ready
    log_info "Waiting for $inactive_deployment environment to be ready..."
    if ! check_deployment_health "$inactive_deployment" "$NAMESPACE"; then
        log_error "Green environment deployment failed"
        return 1
    fi
    
    # Warm up period
    log_info "Warming up $inactive_deployment environment for ${WARM_UP_TIME} seconds..."
    sleep "$WARM_UP_TIME"
    
    # Internal health checks
    if ! check_green_health_internal "$inactive_deployment"; then
        log_error "Green environment internal health checks failed"
        return 1
    fi
    
    log_success "Green environment deployed and healthy"
    return 0
}

# Switch traffic from blue to green
switch_traffic() {
    local active_deployment=$(get_active_deployment)
    local inactive_deployment=$(get_inactive_deployment)
    
    log_info "Switching traffic from $active_deployment to $inactive_deployment"
    notify_slack "Switching traffic from $active_deployment to $inactive_deployment environment" "good" "traffic-switch"
    
    # Update service selector to point to green deployment
    kubectl patch service "$SERVICE_NAME" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"version\":\"$inactive_deployment\"}}}"
    
    # Wait for service update to propagate
    log_info "Waiting for service update to propagate..."
    sleep 30
    
    # Verify service is pointing to correct deployment
    local current_selector=$(kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}')
    if [[ "$current_selector" == "$inactive_deployment" ]]; then
        log_success "Traffic successfully switched to $inactive_deployment environment"
        return 0
    else
        log_error "Traffic switch failed - service still pointing to $current_selector"
        return 1
    fi
}

# Rollback to blue environment
rollback_to_blue() {
    log_error "🚨 INITIATING BLUE-GREEN ROLLBACK"
    notify_slack "🚨 Blue-Green rollback initiated - switching back to stable environment" "danger" "rollback"
    
    local active_deployment=$(get_active_deployment)
    local stable_deployment
    
    # Determine stable deployment (opposite of current active)
    if [[ "$active_deployment" == "green" ]]; then
        stable_deployment="blue"
    else
        stable_deployment="green"
    fi
    
    log_info "Rolling back from $active_deployment to $stable_deployment"
    
    # Switch service back to stable deployment
    kubectl patch service "$SERVICE_NAME" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"version\":\"$stable_deployment\"}}}"
    
    # Wait for rollback to complete
    sleep 30
    
    # Verify rollback
    local current_selector=$(kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}')
    if [[ "$current_selector" == "$stable_deployment" ]]; then
        log_success "✅ Rollback completed successfully - traffic restored to $stable_deployment"
        notify_slack "✅ Rollback completed - service restored to $stable_deployment environment" "good" "rollback"
        
        # Optional: Scale down failed deployment
        local failed_deployment="${DEPLOYMENT_NAME}-${active_deployment}"
        kubectl scale deployment "$failed_deployment" -n "$NAMESPACE" --replicas=0
        
        return 0
    else
        log_error "❌ Rollback failed - manual intervention required"
        notify_slack "❌ Rollback failed - manual intervention required" "danger" "rollback"
        return 1
    fi
}

# Clean up old blue environment
cleanup_old_environment() {
    local old_deployment="$1"
    
    log_info "Cleaning up old $old_deployment environment"
    
    # Scale down old deployment
    local old_deployment_name="${DEPLOYMENT_NAME}-${old_deployment}"
    kubectl scale deployment "$old_deployment_name" -n "$NAMESPACE" --replicas=0
    
    log_success "Old $old_deployment environment scaled down"
    
    # Optionally delete the deployment (uncomment if desired)
    # kubectl delete deployment "$old_deployment_name" -n "$NAMESPACE"
    # log_success "Old $old_deployment environment deleted"
}

# Validate deployment prerequisites
validate_prerequisites() {
    log_info "Validating deployment prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found"
        return 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        return 1
    fi
    
    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace $NAMESPACE does not exist"
        return 1
    fi
    
    # Check if service exists
    if ! kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" &> /dev/null; then
        log_error "Service $SERVICE_NAME does not exist in namespace $NAMESPACE"
        return 1
    fi
    
    log_success "Prerequisites validated"
    return 0
}

# Main blue-green deployment function
main() {
    local image="$1"
    
    if [[ -z "$image" ]]; then
        log_error "Image parameter is required"
        echo "Usage: $0 <docker-image>"
        exit 1
    fi
    
    local deployment_start_time=$(date +%s)
    
    log_info "🔵🟢 STARTING BLUE-GREEN DEPLOYMENT"
    log_info "Environment: $ENVIRONMENT"
    log_info "Image: $image"
    log_info "Namespace: $NAMESPACE"
    log_info "Service: $SERVICE_NAME"
    
    # Determine current state
    local active_deployment=$(get_active_deployment)
    local inactive_deployment=$(get_inactive_deployment)
    
    log_info "Current active deployment: $active_deployment"
    log_info "Deploying to inactive environment: $inactive_deployment"
    
    notify_slack "🔵🟢 Blue-Green deployment started - deploying to $inactive_deployment environment" "good" "start"
    
    # Validate prerequisites
    if ! validate_prerequisites; then
        log_error "Prerequisites validation failed"
        exit 1
    fi
    
    # Deploy to green environment
    if ! deploy_green_environment "$image"; then
        log_error "Green environment deployment failed"
        notify_slack "❌ Green environment deployment failed" "danger" "deploy-failed"
        exit 1
    fi
    
    # Run validation tests
    if [[ "$VALIDATION_TESTS" == "true" ]]; then
        log_info "Running validation tests against $inactive_deployment environment..."
        
        if ! run_smoke_tests "$inactive_deployment"; then
            log_error "Smoke tests failed for $inactive_deployment environment"
            if [[ "$AUTO_PROMOTE" == "false" ]]; then
                log_info "Auto-promotion disabled - manual intervention required"
                exit 1
            else
                log_info "Auto-rollback enabled - cleaning up failed deployment"
                cleanup_old_environment "$inactive_deployment"
                exit 1
            fi
        fi
        
        log_success "Validation tests passed for $inactive_deployment environment"
    fi
    
    # Switch traffic
    if [[ "$AUTO_PROMOTE" == "true" ]]; then
        log_info "Auto-promotion enabled - switching traffic..."
        
        if ! switch_traffic; then
            log_error "Traffic switch failed"
            rollback_to_blue
            exit 1
        fi
        
        # Wait and monitor the new environment
        log_info "Monitoring new environment for stability..."
        sleep 60
        
        # Final health check after traffic switch
        local new_active=$(get_active_deployment)
        if ! check_deployment_health "$new_active" "$NAMESPACE" 5; then
            log_error "Post-switch health check failed"
            rollback_to_blue
            exit 1
        fi
        
        log_success "Traffic switch completed successfully"
        
        # Schedule cleanup of old environment
        if [[ "$KEEP_BLUE_TIME" -gt 0 ]]; then
            log_info "Keeping old $active_deployment environment for ${KEEP_BLUE_TIME} seconds..."
            (
                sleep "$KEEP_BLUE_TIME"
                cleanup_old_environment "$active_deployment"
            ) &
        else
            cleanup_old_environment "$active_deployment"
        fi
        
    else
        log_info "Auto-promotion disabled - manual traffic switch required"
        log_info "To switch traffic manually, run:"
        log_info "kubectl patch service $SERVICE_NAME -n $NAMESPACE -p '{\"spec\":{\"selector\":{\"version\":\"$inactive_deployment\"}}}'"
    fi
    
    local deployment_end_time=$(date +%s)
    local deployment_duration=$((deployment_end_time - deployment_start_time))
    
    log_success "🎉 BLUE-GREEN DEPLOYMENT COMPLETED SUCCESSFULLY"
    log_info "Deployment duration: ${deployment_duration} seconds"
    
    # Generate deployment report
    cat > blue-green-deployment-report.json << EOF
{
    "status": "success",
    "environment": "$ENVIRONMENT",
    "deployment_strategy": "blue-green",
    "service": "$SERVICE_NAME",
    "image": "$image",
    "previous_active": "$active_deployment",
    "new_active": "$inactive_deployment",
    "auto_promotion": $AUTO_PROMOTE,
    "validation_tests": $VALIDATION_TESTS,
    "deployment_duration": $deployment_duration,
    "completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    log_info "Deployment report saved to: blue-green-deployment-report.json"
    
    notify_slack "🎉 Blue-Green deployment completed successfully in ${deployment_duration}s" "good" "complete"
}

# Handle script termination
cleanup_on_exit() {
    log_warning "Blue-Green deployment script interrupted"
    notify_slack "⚠️ Blue-Green deployment interrupted - system may be in transitional state" "warning" "interrupted"
}

trap cleanup_on_exit INT TERM

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --image)
            IMAGE="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --warm-up-time)
            WARM_UP_TIME="$2"
            shift 2
            ;;
        --no-validation)
            VALIDATION_TESTS=false
            shift
            ;;
        --manual-promotion)
            AUTO_PROMOTE=false
            shift
            ;;
        --keep-blue-time)
            KEEP_BLUE_TIME="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 --image IMAGE [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --image IMAGE              Container image to deploy (required)"
            echo "  --environment ENV          Target environment (default: production)"
            echo "  --namespace NAMESPACE      Kubernetes namespace (default: production)"
            echo "  --warm-up-time SECONDS     Green environment warm-up time (default: 120)"
            echo "  --no-validation           Skip validation tests"
            echo "  --manual-promotion        Require manual traffic promotion"
            echo "  --keep-blue-time SECONDS  Time to keep blue environment (default: 600)"
            echo "  --help                    Show this help message"
            exit 0
            ;;
        *)
            if [[ -z "$IMAGE" ]]; then
                IMAGE="$1"
            else
                log_error "Unknown option: $1"
                exit 1
            fi
            shift
            ;;
    esac
done

# Execute main function
main "${IMAGE:-$1}"