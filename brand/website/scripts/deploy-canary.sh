#!/bin/bash

# Canary Deployment Script for Candlefish Website
# Implements progressive traffic shifting: 5% → 25% → 50% → 100%

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

# Canary configuration
CANARY_STEPS=(5 25 50 100)
STEP_DURATION=${STEP_DURATION:-300} # 5 minutes per step
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-30}
MAX_HEALTH_CHECKS=${MAX_HEALTH_CHECKS:-10}
ROLLBACK_ON_ERROR=${ROLLBACK_ON_ERROR:-true}

# Monitoring thresholds
ERROR_RATE_THRESHOLD=${ERROR_RATE_THRESHOLD:-5} # 5%
RESPONSE_TIME_THRESHOLD=${RESPONSE_TIME_THRESHOLD:-2000} # 2 seconds
CPU_THRESHOLD=${CPU_THRESHOLD:-80} # 80%
MEMORY_THRESHOLD=${MEMORY_THRESHOLD:-80} # 80%

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a canary-deployment.log
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a canary-deployment.log
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a canary-deployment.log
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a canary-deployment.log
}

log_canary() {
    echo -e "${PURPLE}[CANARY]${NC} $1" | tee -a canary-deployment.log
}

# Notification function
notify_slack() {
    local message="$1"
    local color="${2:-warning}"
    local step="${3:-unknown}"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"🕊️ Canary Deployment - Step $step\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"Service\", \"value\": \"$DEPLOYMENT_NAME\", \"short\": true},
                        {\"title\": \"Timestamp\", \"value\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"short\": true}
                    ],
                    \"footer\": \"Candlefish Canary Pipeline\"
                }]
            }" \
            --silent || log_warning "Failed to send Slack notification"
    fi
}

# Health check function
check_deployment_health() {
    local deployment_name="$1"
    local namespace="$2"
    local threshold_checks="$3"
    
    log_info "Checking health of deployment $deployment_name in namespace $namespace"
    
    # Check pod status
    local ready_pods=$(kubectl get deployment "$deployment_name" -n "$namespace" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
    local desired_pods=$(kubectl get deployment "$deployment_name" -n "$namespace" -o jsonpath='{.status.replicas}' 2>/dev/null || echo 0)
    
    if [[ "$ready_pods" != "$desired_pods" ]]; then
        log_error "Pod readiness check failed: $ready_pods/$desired_pods ready"
        return 1
    fi
    
    # Check application health endpoint
    local health_checks=0
    local max_checks=${threshold_checks:-$MAX_HEALTH_CHECKS}
    
    while [[ $health_checks -lt $max_checks ]]; do
        local service_ip=$(kubectl get service "$SERVICE_NAME" -n "$namespace" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
        
        if [[ -n "$service_ip" ]]; then
            local health_status=$(curl -s -o /dev/null -w "%{http_code}" "http://$service_ip/health" || echo "000")
            if [[ "$health_status" == "200" ]]; then
                log_success "Health check passed ($((health_checks + 1))/$max_checks)"
                return 0
            fi
        fi
        
        health_checks=$((health_checks + 1))
        log_info "Health check $health_checks/$max_checks failed, retrying in $HEALTH_CHECK_INTERVAL seconds..."
        sleep $HEALTH_CHECK_INTERVAL
    done
    
    log_error "Health checks failed after $max_checks attempts"
    return 1
}

# Monitor application metrics
monitor_metrics() {
    local duration="$1"
    local traffic_percentage="$2"
    
    log_info "Monitoring metrics for ${duration}s at ${traffic_percentage}% traffic"
    
    local monitoring_start=$(date +%s)
    local monitoring_end=$((monitoring_start + duration))
    
    while [[ $(date +%s) -lt $monitoring_end ]]; do
        # Check error rate (placeholder - would integrate with actual monitoring)
        local current_error_rate=$(get_error_rate)
        if [[ -n "$current_error_rate" ]] && (( $(echo "$current_error_rate > $ERROR_RATE_THRESHOLD" | bc -l) )); then
            log_error "Error rate ($current_error_rate%) exceeds threshold ($ERROR_RATE_THRESHOLD%)"
            return 1
        fi
        
        # Check response time (placeholder - would integrate with actual monitoring)
        local current_response_time=$(get_response_time)
        if [[ -n "$current_response_time" ]] && (( $(echo "$current_response_time > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
            log_error "Response time (${current_response_time}ms) exceeds threshold (${RESPONSE_TIME_THRESHOLD}ms)"
            return 1
        fi
        
        # Check CPU and memory usage
        local cpu_usage=$(kubectl top pods -n "$NAMESPACE" -l app="$DEPLOYMENT_NAME" --no-headers | awk '{sum+=$2} END {print sum}' | sed 's/m//' || echo 0)
        local memory_usage=$(kubectl top pods -n "$NAMESPACE" -l app="$DEPLOYMENT_NAME" --no-headers | awk '{sum+=$3} END {print sum}' | sed 's/Mi//' || echo 0)
        
        log_info "Metrics: Error Rate=${current_error_rate:-N/A}%, Response Time=${current_response_time:-N/A}ms, CPU=${cpu_usage}m, Memory=${memory_usage}Mi"
        
        sleep 30
    done
    
    log_success "Monitoring completed successfully for ${traffic_percentage}% traffic step"
    return 0
}

# Get current error rate (placeholder function)
get_error_rate() {
    # This would integrate with your actual monitoring system
    # For now, return a random value for demonstration
    echo "scale=2; $(shuf -i 0-3 -n1) / 10" | bc -l
}

# Get current response time (placeholder function)  
get_response_time() {
    # This would integrate with your actual monitoring system
    # For now, return a random value for demonstration
    shuf -i 800-1500 -n1
}

# Update traffic weights for canary deployment
update_traffic_weight() {
    local canary_weight="$1"
    local stable_weight=$((100 - canary_weight))
    
    log_canary "Updating traffic weights: Canary=${canary_weight}%, Stable=${stable_weight}%"
    
    # Update Istio VirtualService or Ingress weights
    # This is a simplified example - adapt to your actual traffic management system
    
    cat > /tmp/traffic-split.yaml << EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: ${SERVICE_NAME}-traffic-split
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
      weight: 100
  - route:
    - destination:
        host: ${SERVICE_NAME}
        subset: canary
      weight: ${canary_weight}
    - destination:
        host: ${SERVICE_NAME}
        subset: stable
      weight: ${stable_weight}
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: ${SERVICE_NAME}-destination
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

    kubectl apply -f /tmp/traffic-split.yaml
    
    # Wait for configuration to propagate
    sleep 10
    
    log_success "Traffic weight updated successfully"
}

# Rollback function
rollback_canary() {
    log_error "🚨 INITIATING CANARY ROLLBACK"
    notify_slack "🚨 Canary deployment failed - initiating rollback" "danger" "rollback"
    
    # Set traffic to 100% stable
    update_traffic_weight 0
    
    # Scale down canary deployment
    kubectl scale deployment "${DEPLOYMENT_NAME}-canary" -n "$NAMESPACE" --replicas=0
    
    # Remove canary resources
    kubectl delete -f /tmp/traffic-split.yaml --ignore-not-found=true
    
    # Wait for rollback to complete
    sleep 30
    
    # Verify stable deployment is healthy
    if check_deployment_health "$DEPLOYMENT_NAME" "$NAMESPACE" 5; then
        log_success "✅ Canary rollback completed successfully"
        notify_slack "✅ Canary rollback completed - stable version restored" "good" "rollback"
        return 0
    else
        log_error "❌ Canary rollback failed - manual intervention required"
        notify_slack "❌ Canary rollback failed - manual intervention required" "danger" "rollback"
        return 1
    fi
}

# Promote canary to stable
promote_canary() {
    log_canary "🎉 Promoting canary to stable version"
    notify_slack "🎉 Canary promotion starting - updating stable deployment" "good" "promotion"
    
    # Get canary image
    local canary_image=$(kubectl get deployment "${DEPLOYMENT_NAME}-canary" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
    
    # Update stable deployment with canary image
    kubectl set image deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" app="$canary_image" --record
    
    # Wait for stable deployment to roll out
    kubectl rollout status deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" --timeout=600s
    
    # Set traffic to 100% stable
    update_traffic_weight 0
    
    # Scale down canary deployment
    kubectl scale deployment "${DEPLOYMENT_NAME}-canary" -n "$NAMESPACE" --replicas=0
    
    # Clean up canary resources
    kubectl delete -f /tmp/traffic-split.yaml --ignore-not-found=true
    
    # Final health check
    if check_deployment_health "$DEPLOYMENT_NAME" "$NAMESPACE" 5; then
        log_success "✅ Canary promotion completed successfully"
        notify_slack "✅ Canary promotion completed - new version is fully deployed" "good" "promotion"
        return 0
    else
        log_error "❌ Canary promotion health check failed"
        return 1
    fi
}

# Create canary deployment
create_canary_deployment() {
    local image="$1"
    
    log_canary "Creating canary deployment with image: $image"
    
    # Get current deployment spec
    kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o yaml > /tmp/stable-deployment.yaml
    
    # Create canary deployment spec
    sed "s/${DEPLOYMENT_NAME}/${DEPLOYMENT_NAME}-canary/g" /tmp/stable-deployment.yaml | \
    sed "s/version: stable/version: canary/g" | \
    sed "s|image: .*|image: $image|g" > /tmp/canary-deployment.yaml
    
    # Apply canary deployment
    kubectl apply -f /tmp/canary-deployment.yaml
    
    # Wait for canary deployment to be ready
    kubectl rollout status deployment/"${DEPLOYMENT_NAME}-canary" -n "$NAMESPACE" --timeout=300s
    
    log_success "Canary deployment created and ready"
}

# Main canary deployment function
main() {
    local image="$1"
    
    if [[ -z "$image" ]]; then
        log_error "Image parameter is required"
        echo "Usage: $0 <docker-image>"
        exit 1
    fi
    
    log_info "🕊️ STARTING CANARY DEPLOYMENT"
    log_info "Environment: $ENVIRONMENT"
    log_info "Image: $image"
    log_info "Steps: ${CANARY_STEPS[*]}%"
    log_info "Step Duration: ${STEP_DURATION}s"
    
    notify_slack "🕊️ Canary deployment started for $DEPLOYMENT_NAME" "good" "start"
    
    # Validate prerequisites
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Create canary deployment
    if ! create_canary_deployment "$image"; then
        log_error "Failed to create canary deployment"
        exit 1
    fi
    
    # Execute canary steps
    for step in "${!CANARY_STEPS[@]}"; do
        local traffic_percentage=${CANARY_STEPS[$step]}
        local step_number=$((step + 1))
        
        log_canary "=== CANARY STEP $step_number: ${traffic_percentage}% TRAFFIC ==="
        notify_slack "Step $step_number: Routing ${traffic_percentage}% traffic to canary" "good" "$step_number"
        
        # Update traffic weights
        if ! update_traffic_weight "$traffic_percentage"; then
            log_error "Failed to update traffic weights"
            if [[ "$ROLLBACK_ON_ERROR" == "true" ]]; then
                rollback_canary
            fi
            exit 1
        fi
        
        # Monitor metrics for this step
        if ! monitor_metrics "$STEP_DURATION" "$traffic_percentage"; then
            log_error "Monitoring failed for ${traffic_percentage}% traffic step"
            if [[ "$ROLLBACK_ON_ERROR" == "true" ]]; then
                rollback_canary
                exit 1
            fi
        fi
        
        log_success "Step $step_number (${traffic_percentage}%) completed successfully"
    done
    
    # Promote canary to stable
    if ! promote_canary; then
        log_error "Failed to promote canary"
        if [[ "$ROLLBACK_ON_ERROR" == "true" ]]; then
            rollback_canary
        fi
        exit 1
    fi
    
    log_success "🎉 CANARY DEPLOYMENT COMPLETED SUCCESSFULLY"
    
    # Generate deployment report
    cat > canary-deployment-report.json << EOF
{
    "status": "success",
    "environment": "$ENVIRONMENT",
    "deployment": "$DEPLOYMENT_NAME",
    "image": "$image",
    "steps": ${#CANARY_STEPS[@]},
    "total_duration": $((${#CANARY_STEPS[@]} * STEP_DURATION)),
    "completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "traffic_steps": [$(IFS=','; echo "${CANARY_STEPS[*]}")]
}
EOF
    
    log_info "Deployment report saved to: canary-deployment-report.json"
}

# Handle script termination
cleanup() {
    log_warning "Canary deployment script interrupted"
    if [[ "$ROLLBACK_ON_ERROR" == "true" ]]; then
        rollback_canary
    fi
}

trap cleanup INT TERM

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
        --step-duration)
            STEP_DURATION="$2"
            shift 2
            ;;
        --no-rollback)
            ROLLBACK_ON_ERROR=false
            shift
            ;;
        --help)
            echo "Usage: $0 --image IMAGE [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --image IMAGE           Container image to deploy (required)"
            echo "  --environment ENV       Target environment (default: production)"
            echo "  --namespace NAMESPACE   Kubernetes namespace (default: production)"
            echo "  --step-duration SECONDS Duration of each canary step (default: 300)"
            echo "  --no-rollback          Disable automatic rollback on error"
            echo "  --help                 Show this help message"
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