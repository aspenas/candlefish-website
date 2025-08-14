#!/bin/bash
# Canary Deployment Script for Paintbox
# Implements gradual traffic shift with monitoring and automatic rollback

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NAMESPACE="${NAMESPACE:-paintbox-production}"
APP_NAME="paintbox-app"
SERVICE_NAME="paintbox-service"
NEW_IMAGE="$1"
CANARY_PERCENTAGE="${CANARY_PERCENTAGE:-10}"
PROMOTION_DELAY="${PROMOTION_DELAY:-300}"  # 5 minutes
MONITORING_INTERVAL="${MONITORING_INTERVAL:-30}"
ERROR_THRESHOLD="${ERROR_THRESHOLD:-5}"     # 5% error rate threshold
LATENCY_THRESHOLD="${LATENCY_THRESHOLD:-1000}"  # 1000ms latency threshold

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# State tracking
CANARY_DEPLOYMENT=""
STABLE_DEPLOYMENT=""
ROLLBACK_TRIGGERED=false
PROMOTION_STAGES=(10 25 50 75 100)

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

# Error handling
handle_error() {
    log_error "Canary deployment failed: $1"
    if [ "$ROLLBACK_TRIGGERED" = false ]; then
        rollback_canary
    fi
    exit 1
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary resources..."
    
    # Remove temporary manifests
    rm -f "${PROJECT_ROOT}/k8s/temp-canary-*.yaml" || true
    
    # Remove temporary services
    kubectl delete service "${SERVICE_NAME}-canary" -n "$NAMESPACE" 2>/dev/null || true
    kubectl delete service "${SERVICE_NAME}-stable" -n "$NAMESPACE" 2>/dev/null || true
    
    log_info "Cleanup completed"
}

trap cleanup EXIT
trap 'handle_error "Script interrupted"' INT TERM

# Validation functions
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    if [ -z "$NEW_IMAGE" ]; then
        handle_error "Usage: $0 <new-image-tag>"
    fi
    
    if ! kubectl cluster-info >/dev/null 2>&1; then
        handle_error "Cannot connect to Kubernetes cluster"
    fi
    
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        handle_error "Namespace $NAMESPACE does not exist"
    fi
    
    if ! kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" >/dev/null 2>&1; then
        handle_error "Service $SERVICE_NAME does not exist"
    fi
    
    # Check if Istio is available for traffic splitting
    if ! kubectl get crd virtualservices.networking.istio.io >/dev/null 2>&1; then
        log_warning "Istio not detected, using weighted services approach"
    fi
    
    log_success "Prerequisites validated"
}

# Get current deployment
get_current_deployment() {
    kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o name 2>/dev/null || echo ""
}

# Create canary deployment
create_canary_deployment() {
    local canary_image="$1"
    
    log_step "Creating canary deployment with image: $canary_image"
    
    # Get current deployment spec
    if ! kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o yaml > "${PROJECT_ROOT}/k8s/temp-canary-base.yaml"; then
        handle_error "Failed to get current deployment spec"
    fi
    
    # Create canary deployment manifest
    cat "${PROJECT_ROOT}/k8s/temp-canary-base.yaml" | \
    sed -e "s/name: ${APP_NAME}/name: ${APP_NAME}-canary/g" \
        -e "s/app: ${APP_NAME}/app: ${APP_NAME}/g" \
        -e "/labels:/a\\      version: canary" \
        -e "/template:/,/spec:/{/labels:/a\\        version: canary" -e "}" \
        -e "s|image: .*|image: ${canary_image}|g" \
        -e "/replicas:/c\\  replicas: 1" > "${PROJECT_ROOT}/k8s/temp-canary-deployment.yaml"
    
    # Apply canary deployment
    kubectl apply -f "${PROJECT_ROOT}/k8s/temp-canary-deployment.yaml"
    
    # Wait for canary deployment to be ready
    log_info "Waiting for canary deployment to be ready..."
    if ! kubectl rollout status deployment "${APP_NAME}-canary" -n "$NAMESPACE" --timeout=600s; then
        handle_error "Canary deployment failed to become ready"
    fi
    
    CANARY_DEPLOYMENT="${APP_NAME}-canary"
    log_success "Canary deployment created and ready"
}

# Update stable deployment labels
prepare_stable_deployment() {
    log_step "Preparing stable deployment"
    
    # Add version label to stable deployment
    kubectl patch deployment "$APP_NAME" -n "$NAMESPACE" --type='merge' -p='{"spec":{"template":{"metadata":{"labels":{"version":"stable"}}}}}'
    kubectl patch deployment "$APP_NAME" -n "$NAMESPACE" --type='merge' -p='{"metadata":{"labels":{"version":"stable"}}}'
    
    STABLE_DEPLOYMENT="$APP_NAME"
    log_success "Stable deployment prepared"
}

# Create traffic splitting configuration
setup_traffic_splitting() {
    local canary_weight="$1"
    local stable_weight=$((100 - canary_weight))
    
    log_step "Setting up traffic splitting: ${stable_weight}% stable, ${canary_weight}% canary"
    
    # Check if Istio is available
    if kubectl get crd virtualservices.networking.istio.io >/dev/null 2>&1; then
        setup_istio_traffic_splitting "$canary_weight" "$stable_weight"
    else
        setup_weighted_services "$canary_weight" "$stable_weight"
    fi
}

# Setup Istio-based traffic splitting
setup_istio_traffic_splitting() {
    local canary_weight="$1"
    local stable_weight="$2"
    
    # Create destination rule
    cat > "${PROJECT_ROOT}/k8s/temp-canary-destinationrule.yaml" << EOF
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ${APP_NAME}
  namespace: ${NAMESPACE}
spec:
  host: ${SERVICE_NAME}
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary
EOF
    
    # Create virtual service
    cat > "${PROJECT_ROOT}/k8s/temp-canary-virtualservice.yaml" << EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ${APP_NAME}
  namespace: ${NAMESPACE}
spec:
  hosts:
  - ${SERVICE_NAME}
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: ${SERVICE_NAME}
        subset: canary
  - route:
    - destination:
        host: ${SERVICE_NAME}
        subset: stable
      weight: ${stable_weight}
    - destination:
        host: ${SERVICE_NAME}
        subset: canary
      weight: ${canary_weight}
EOF
    
    kubectl apply -f "${PROJECT_ROOT}/k8s/temp-canary-destinationrule.yaml"
    kubectl apply -f "${PROJECT_ROOT}/k8s/temp-canary-virtualservice.yaml"
    
    log_success "Istio traffic splitting configured"
}

# Setup weighted services approach
setup_weighted_services() {
    local canary_weight="$1"
    local stable_weight="$2"
    
    # Calculate replica counts based on weights
    local total_replicas
    total_replicas=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    
    local canary_replicas=$(( (total_replicas * canary_weight + 50) / 100 ))
    local stable_replicas=$(( total_replicas - canary_replicas ))
    
    # Ensure at least 1 replica for canary
    if [ "$canary_replicas" -eq 0 ]; then
        canary_replicas=1
        stable_replicas=$((total_replicas - 1))
    fi
    
    log_info "Scaling deployments: ${stable_replicas} stable, ${canary_replicas} canary"
    
    # Scale deployments
    kubectl scale deployment "$STABLE_DEPLOYMENT" --replicas="$stable_replicas" -n "$NAMESPACE"
    kubectl scale deployment "$CANARY_DEPLOYMENT" --replicas="$canary_replicas" -n "$NAMESPACE"
    
    # Wait for scaling to complete
    kubectl rollout status deployment "$STABLE_DEPLOYMENT" -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment "$CANARY_DEPLOYMENT" -n "$NAMESPACE" --timeout=300s
    
    log_success "Weighted services configured"
}

# Monitor canary deployment
monitor_canary_deployment() {
    local duration="$1"
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    
    log_step "Monitoring canary deployment for ${duration} seconds"
    
    while [ "$(date +%s)" -lt "$end_time" ]; do
        # Check error rates
        if ! check_error_rates; then
            handle_error "Error rate threshold exceeded"
        fi
        
        # Check latency
        if ! check_latency; then
            handle_error "Latency threshold exceeded"
        fi
        
        # Check deployment health
        if ! check_deployment_health; then
            handle_error "Deployment health check failed"
        fi
        
        log_info "Monitoring: $(( ($(date +%s) - start_time) )) / ${duration} seconds elapsed"
        sleep "$MONITORING_INTERVAL"
    done
    
    log_success "Monitoring period completed successfully"
}

# Check error rates
check_error_rates() {
    log_info "Checking error rates..."
    
    # Get error metrics from pods
    local canary_pods
    canary_pods=$(kubectl get pods -n "$NAMESPACE" -l "app=${APP_NAME},version=canary" -o jsonpath='{.items[*].metadata.name}')
    
    local total_requests=0
    local error_requests=0
    
    for pod in $canary_pods; do
        # Simple health check - in production, you'd use proper metrics
        if ! kubectl exec "$pod" -n "$NAMESPACE" -- curl -f -s http://localhost:8080/api/health >/dev/null 2>&1; then
            error_requests=$((error_requests + 1))
        fi
        total_requests=$((total_requests + 1))
    done
    
    if [ "$total_requests" -gt 0 ]; then
        local error_rate=$(( (error_requests * 100) / total_requests ))
        log_info "Error rate: ${error_rate}% (${error_requests}/${total_requests})"
        
        if [ "$error_rate" -gt "$ERROR_THRESHOLD" ]; then
            log_error "Error rate ${error_rate}% exceeds threshold ${ERROR_THRESHOLD}%"
            return 1
        fi
    fi
    
    return 0
}

# Check latency
check_latency() {
    log_info "Checking latency..."
    
    # Get canary service endpoint
    local canary_service_ip
    canary_service_ip=$(kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')
    
    # Create test pod if it doesn't exist
    if ! kubectl get pod paintbox-latency-test -n "$NAMESPACE" >/dev/null 2>&1; then
        kubectl run paintbox-latency-test -n "$NAMESPACE" --image=curlimages/curl:latest --restart=Never -- sleep 3600
        kubectl wait --for=condition=Ready pod/paintbox-latency-test -n "$NAMESPACE" --timeout=60s
    fi
    
    # Measure latency
    local latency
    latency=$(kubectl exec paintbox-latency-test -n "$NAMESPACE" -- \
        curl -w '%{time_total}' -s -o /dev/null "http://${canary_service_ip}/api/health" 2>/dev/null || echo "999")
    
    local latency_ms=$(echo "$latency * 1000" | bc -l 2>/dev/null || echo "999000")
    local latency_int=$(printf "%.0f" "$latency_ms")
    
    log_info "Average latency: ${latency_int}ms"
    
    if [ "$latency_int" -gt "$LATENCY_THRESHOLD" ]; then
        log_error "Latency ${latency_int}ms exceeds threshold ${LATENCY_THRESHOLD}ms"
        return 1
    fi
    
    return 0
}

# Check deployment health
check_deployment_health() {
    # Check canary deployment status
    local canary_ready
    canary_ready=$(kubectl get deployment "$CANARY_DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    
    local canary_desired
    canary_desired=$(kubectl get deployment "$CANARY_DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    
    if [ "$canary_ready" -ne "$canary_desired" ]; then
        log_error "Canary deployment not healthy: ${canary_ready}/${canary_desired} replicas ready"
        return 1
    fi
    
    # Check stable deployment status
    local stable_ready
    stable_ready=$(kubectl get deployment "$STABLE_DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    
    local stable_desired
    stable_desired=$(kubectl get deployment "$STABLE_DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    
    if [ "$stable_ready" -ne "$stable_desired" ]; then
        log_error "Stable deployment not healthy: ${stable_ready}/${stable_desired} replicas ready"
        return 1
    fi
    
    return 0
}

# Promote canary deployment
promote_canary() {
    log_step "Promoting canary deployment to full traffic"
    
    # Update main deployment with canary image
    local canary_image
    canary_image=$(kubectl get deployment "$CANARY_DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
    
    kubectl set image deployment/"$STABLE_DEPLOYMENT" "*=$canary_image" -n "$NAMESPACE"
    
    # Wait for rollout to complete
    kubectl rollout status deployment/"$STABLE_DEPLOYMENT" -n "$NAMESPACE" --timeout=600s
    
    # Remove canary deployment and traffic splitting
    cleanup_canary_resources
    
    log_success "Canary promotion completed successfully"
}

# Rollback canary deployment
rollback_canary() {
    if [ "$ROLLBACK_TRIGGERED" = true ]; then
        log_warning "Rollback already triggered"
        return
    fi
    
    ROLLBACK_TRIGGERED=true
    log_step "Rolling back canary deployment"
    
    # Remove traffic splitting immediately
    if kubectl get virtualservice "$APP_NAME" -n "$NAMESPACE" >/dev/null 2>&1; then
        kubectl delete virtualservice "$APP_NAME" -n "$NAMESPACE" || true
        kubectl delete destinationrule "$APP_NAME" -n "$NAMESPACE" || true
    fi
    
    # Scale canary to 0
    if [ -n "$CANARY_DEPLOYMENT" ]; then
        kubectl scale deployment "$CANARY_DEPLOYMENT" --replicas=0 -n "$NAMESPACE" || true
    fi
    
    # Restore stable deployment to full capacity
    if [ -n "$STABLE_DEPLOYMENT" ]; then
        local original_replicas=3  # Default, should be configurable
        kubectl scale deployment "$STABLE_DEPLOYMENT" --replicas="$original_replicas" -n "$NAMESPACE"
        kubectl rollout status deployment/"$STABLE_DEPLOYMENT" -n "$NAMESPACE" --timeout=300s
    fi
    
    cleanup_canary_resources
    
    log_success "Rollback completed"
}

# Cleanup canary resources
cleanup_canary_resources() {
    log_info "Cleaning up canary resources..."
    
    # Remove canary deployment
    if [ -n "$CANARY_DEPLOYMENT" ]; then
        kubectl delete deployment "$CANARY_DEPLOYMENT" -n "$NAMESPACE" 2>/dev/null || true
    fi
    
    # Remove Istio resources
    kubectl delete virtualservice "$APP_NAME" -n "$NAMESPACE" 2>/dev/null || true
    kubectl delete destinationrule "$APP_NAME" -n "$NAMESPACE" 2>/dev/null || true
    
    # Remove test pod
    kubectl delete pod paintbox-latency-test -n "$NAMESPACE" 2>/dev/null || true
    
    # Remove temporary manifests
    rm -f "${PROJECT_ROOT}/k8s/temp-canary-"*.yaml || true
    
    log_info "Canary resources cleaned up"
}

# Run smoke tests
run_smoke_tests() {
    log_step "Running smoke tests on canary deployment"
    
    # Create test pod
    kubectl run paintbox-smoke-test -n "$NAMESPACE" --image=curlimages/curl:latest --restart=Never -- sleep 300
    kubectl wait --for=condition=Ready pod/paintbox-smoke-test -n "$NAMESPACE" --timeout=60s
    
    local service_url="http://${SERVICE_NAME}.${NAMESPACE}.svc.cluster.local"
    
    # Test health endpoint
    log_info "Testing health endpoint"
    kubectl exec paintbox-smoke-test -n "$NAMESPACE" -- curl -f "$service_url/api/health"
    
    # Test API endpoints
    log_info "Testing API endpoints"
    kubectl exec paintbox-smoke-test -n "$NAMESPACE" -- curl -f "$service_url/api/v1/companycam/health"
    kubectl exec paintbox-smoke-test -n "$NAMESPACE" -- curl -f "$service_url/api/v1/salesforce/health"
    
    # Cleanup test pod
    kubectl delete pod paintbox-smoke-test -n "$NAMESPACE" || true
    
    log_success "Smoke tests passed"
}

# Main canary deployment function
perform_canary_deployment() {
    local new_image="$1"
    
    log_step "Starting canary deployment with image: $new_image"
    
    # Prepare stable deployment
    prepare_stable_deployment
    
    # Create canary deployment
    create_canary_deployment "$new_image"
    
    # Run smoke tests
    run_smoke_tests
    
    # Progressive traffic shifting
    for stage in "${PROMOTION_STAGES[@]}"; do
        log_step "Promoting canary to ${stage}% traffic"
        
        # Setup traffic splitting
        setup_traffic_splitting "$stage"
        
        # Wait for traffic to stabilize
        sleep 30
        
        # Monitor deployment
        monitor_canary_deployment "$PROMOTION_DELAY"
        
        if [ "$stage" -eq 100 ]; then
            # Final promotion
            promote_canary
            break
        else
            log_success "Stage ${stage}% completed successfully"
        fi
    done
    
    log_success "Canary deployment completed successfully"
}

# Help function
show_help() {
    cat << EOF
Canary Deployment Script for Paintbox

USAGE:
    $0 [OPTIONS] <IMAGE_TAG>

ARGUMENTS:
    IMAGE_TAG                   Docker image tag to deploy

OPTIONS:
    -p, --percentage PERCENT    Initial canary percentage (default: 10)
    -d, --delay SECONDS        Promotion delay in seconds (default: 300)
    -e, --error-threshold PCT  Error rate threshold percentage (default: 5)
    -l, --latency-threshold MS Latency threshold in milliseconds (default: 1000)
    -i, --interval SECONDS     Monitoring interval (default: 30)
    --rollback                 Trigger immediate rollback
    -h, --help                 Show this help message

EXAMPLES:
    $0 v1.2.3
    $0 --percentage 20 --delay 600 v1.2.3
    $0 --rollback

ENVIRONMENT VARIABLES:
    NAMESPACE                  Kubernetes namespace (default: paintbox-production)
    CANARY_PERCENTAGE         Initial canary percentage
    PROMOTION_DELAY           Promotion delay in seconds
    ERROR_THRESHOLD           Error rate threshold percentage
    LATENCY_THRESHOLD         Latency threshold in milliseconds
    MONITORING_INTERVAL       Monitoring interval in seconds

EOF
}

# Command line argument parsing
TRIGGER_ROLLBACK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--percentage)
            CANARY_PERCENTAGE="$2"
            shift 2
            ;;
        -d|--delay)
            PROMOTION_DELAY="$2"
            shift 2
            ;;
        -e|--error-threshold)
            ERROR_THRESHOLD="$2"
            shift 2
            ;;
        -l|--latency-threshold)
            LATENCY_THRESHOLD="$2"
            shift 2
            ;;
        -i|--interval)
            MONITORING_INTERVAL="$2"
            shift 2
            ;;
        --rollback)
            TRIGGER_ROLLBACK=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
        *)
            if [ -z "$NEW_IMAGE" ]; then
                NEW_IMAGE="$1"
            else
                log_error "Multiple image tags provided"
                show_help
                exit 1
            fi
            shift
            ;;
    esac
done

# Main execution
main() {
    log_info "=== Starting Canary Deployment ==="
    log_info "Namespace: $NAMESPACE"
    log_info "Initial canary percentage: $CANARY_PERCENTAGE%"
    log_info "Promotion delay: $PROMOTION_DELAY seconds"
    log_info "Error threshold: $ERROR_THRESHOLD%"
    log_info "Latency threshold: $LATENCY_THRESHOLD ms"
    
    validate_prerequisites
    
    if [ "$TRIGGER_ROLLBACK" = true ]; then
        rollback_canary
        exit 0
    fi
    
    if [ -z "$NEW_IMAGE" ]; then
        log_error "Image tag is required"
        show_help
        exit 1
    fi
    
    log_info "New image: $NEW_IMAGE"
    
    perform_canary_deployment "$NEW_IMAGE"
    
    log_success "=== Canary Deployment Completed Successfully ==="
}

# Check if script is being sourced or executed
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi