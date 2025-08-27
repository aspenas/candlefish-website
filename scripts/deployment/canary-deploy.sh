#!/bin/bash

# Advanced Canary Deployment Script
# Automated canary deployment with comprehensive validation and rollback

set -euo pipefail

# ============================================================================
# Configuration and Constants
# ============================================================================

NAMESPACE="security-dashboard"
CLUSTER_NAME="security-dashboard-eks"
AWS_REGION="us-east-1"
ECR_REGISTRY="681214184463.dkr.ecr.us-east-1.amazonaws.com"

# Canary deployment configuration
CANARY_TIMEOUT="1800"  # 30 minutes
VALIDATION_INTERVAL="30"  # 30 seconds
METRICS_COLLECTION_DURATION="300"  # 5 minutes per stage

# Performance thresholds
MAX_ERROR_RATE="0.01"        # 1%
MAX_P95_RESPONSE_TIME="0.5"  # 500ms
MAX_P99_RESPONSE_TIME="1.0"  # 1s
MIN_SUCCESS_RATE="0.995"     # 99.5%

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_stage() {
    echo -e "${PURPLE}[STAGE]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# ============================================================================
# Utility Functions
# ============================================================================

# Check prerequisites
check_prerequisites() {
    local missing_tools=()
    
    command -v kubectl >/dev/null 2>&1 || missing_tools+=("kubectl")
    command -v aws >/dev/null 2>&1 || missing_tools+=("aws")
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")
    command -v curl >/dev/null 2>&1 || missing_tools+=("curl")
    
    # Check for Argo Rollouts kubectl plugin
    if ! kubectl argo rollouts version >/dev/null 2>&1; then
        missing_tools+=("kubectl-argo-rollouts")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Install missing tools:"
        echo "  kubectl: https://kubernetes.io/docs/tasks/tools/"
        echo "  aws: https://aws.amazon.com/cli/"
        echo "  jq: https://stedolan.github.io/jq/"
        echo "  argo-rollouts: kubectl create namespace argo-rollouts && kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml"
        exit 1
    fi
    
    log_success "All prerequisites are installed"
}

# Setup cluster connectivity
setup_cluster() {
    log_info "Setting up cluster connectivity..."
    
    # Update kubeconfig
    aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER_NAME" >/dev/null 2>&1 || {
        log_error "Failed to update kubeconfig for cluster: $CLUSTER_NAME"
        exit 1
    }
    
    # Verify cluster connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Verify namespace exists
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log_error "Namespace '$NAMESPACE' does not exist"
        exit 1
    fi
    
    log_success "Cluster connectivity established"
}

# Get current deployment status
get_rollout_status() {
    local rollout_name="$1"
    
    kubectl argo rollouts get rollout "$rollout_name" -n "$NAMESPACE" -o json 2>/dev/null | \
        jq -r '.status.phase // "Unknown"'
}

# Query Prometheus metrics
query_prometheus() {
    local query="$1"
    local prometheus_url="http://security-dashboard-monitoring-prometheus:9090"
    
    kubectl run prometheus-query --rm -i --restart=Never \
        --image=curlimages/curl:latest -n "$NAMESPACE" -- \
        curl -s "$prometheus_url/api/v1/query?query=$(echo "$query" | jq -sRr @uri)" 2>/dev/null | \
        jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0"
}

# Validate metrics against thresholds
validate_metrics() {
    local service_name="$1"
    local stage="$2"
    
    log_info "Validating metrics for $service_name (stage: $stage)..."
    
    # Get success rate
    local success_rate_query="sum(rate(http_requests_total{service=\"$service_name\",status!~\"5..\"}[5m])) / sum(rate(http_requests_total{service=\"$service_name\"}[5m]))"
    local success_rate
    success_rate=$(query_prometheus "$success_rate_query")
    
    # Get error rate
    local error_rate_query="sum(rate(http_requests_total{service=\"$service_name\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{service=\"$service_name\"}[5m]))"
    local error_rate
    error_rate=$(query_prometheus "$error_rate_query")
    
    # Get P95 response time
    local p95_query="histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service=\"$service_name\"}[5m])) by (le))"
    local p95_response_time
    p95_response_time=$(query_prometheus "$p95_query")
    
    # Get P99 response time
    local p99_query="histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{service=\"$service_name\"}[5m])) by (le))"
    local p99_response_time
    p99_response_time=$(query_prometheus "$p99_query")
    
    # Display metrics
    echo "📊 Performance Metrics:"
    echo "   Success Rate: $(printf "%.3f" "$success_rate") (threshold: $MIN_SUCCESS_RATE)"
    echo "   Error Rate: $(printf "%.4f" "$error_rate") (threshold: $MAX_ERROR_RATE)"
    echo "   P95 Response Time: $(printf "%.3f" "$p95_response_time")s (threshold: ${MAX_P95_RESPONSE_TIME}s)"
    echo "   P99 Response Time: $(printf "%.3f" "$p99_response_time")s (threshold: ${MAX_P99_RESPONSE_TIME}s)"
    
    # Validate thresholds
    local validation_failed=false
    
    if (( $(echo "$success_rate < $MIN_SUCCESS_RATE" | bc -l) )); then
        log_error "❌ Success rate validation failed: $success_rate < $MIN_SUCCESS_RATE"
        validation_failed=true
    fi
    
    if (( $(echo "$error_rate > $MAX_ERROR_RATE" | bc -l) )); then
        log_error "❌ Error rate validation failed: $error_rate > $MAX_ERROR_RATE"
        validation_failed=true
    fi
    
    if (( $(echo "$p95_response_time > $MAX_P95_RESPONSE_TIME" | bc -l) )); then
        log_error "❌ P95 response time validation failed: $p95_response_time > $MAX_P95_RESPONSE_TIME"
        validation_failed=true
    fi
    
    if (( $(echo "$p99_response_time > $MAX_P99_RESPONSE_TIME" | bc -l) )); then
        log_error "❌ P99 response time validation failed: $p99_response_time > $MAX_P99_RESPONSE_TIME"
        validation_failed=true
    fi
    
    if [ "$validation_failed" = true ]; then
        return 1
    fi
    
    log_success "✅ All metric validations passed for stage: $stage"
    return 0
}

# Monitor canary deployment stage
monitor_stage() {
    local rollout_name="$1"
    local stage="$2"
    local traffic_weight="$3"
    local duration="$4"
    
    log_stage "🚀 Monitoring canary stage: $stage ($traffic_weight% traffic) for ${duration}s"
    
    local end_time=$(($(date +%s) + duration))
    local validation_count=0
    local successful_validations=0
    local required_validations=$((duration / VALIDATION_INTERVAL))
    
    while [ $(date +%s) -lt $end_time ]; do
        # Get rollout status
        local status
        status=$(get_rollout_status "$rollout_name")
        
        if [ "$status" = "Aborted" ] || [ "$status" = "Failed" ]; then
            log_error "Rollout failed with status: $status"
            return 1
        fi
        
        # Validate metrics every VALIDATION_INTERVAL
        if [ $((validation_count % VALIDATION_INTERVAL)) -eq 0 ]; then
            if validate_metrics "$rollout_name-canary" "$stage"; then
                ((successful_validations++))
            else
                log_warning "Metric validation failed (attempt $((validation_count / VALIDATION_INTERVAL + 1)))"
                
                # If we have too many failures, abort
                local failure_rate=$((100 - (successful_validations * 100 / (validation_count / VALIDATION_INTERVAL + 1))))
                if [ "$failure_rate" -gt 30 ]; then  # Allow 30% failure rate
                    log_error "Too many metric validation failures ($failure_rate%). Aborting canary."
                    return 1
                fi
            fi
        fi
        
        # Progress indicator
        local elapsed=$(($(date +%s) - (end_time - duration)))
        local progress=$((elapsed * 100 / duration))
        printf "\r⏳ Stage progress: %d%% (%ds/%ds) - Status: %s" "$progress" "$elapsed" "$duration" "$status"
        
        sleep 1
        ((validation_count++))
    done
    
    echo  # New line after progress indicator
    
    # Final validation
    local success_rate=$((successful_validations * 100 / (validation_count / VALIDATION_INTERVAL)))
    log_info "Stage $stage completed: $successful_validations/$((validation_count / VALIDATION_INTERVAL)) validations passed ($success_rate%)"
    
    if [ "$success_rate" -lt 70 ]; then  # Require 70% success rate
        log_error "Stage validation failed: success rate $success_rate% < 70%"
        return 1
    fi
    
    log_success "✅ Stage $stage completed successfully"
    return 0
}

# Abort canary deployment
abort_canary() {
    local rollout_name="$1"
    local reason="$2"
    
    log_error "🛑 Aborting canary deployment: $reason"
    
    # Abort the rollout
    kubectl argo rollouts abort rollout "$rollout_name" -n "$NAMESPACE" || {
        log_error "Failed to abort rollout"
    }
    
    # Wait for abort to complete
    log_info "Waiting for rollout abort to complete..."
    kubectl argo rollouts status rollout "$rollout_name" -n "$NAMESPACE" --timeout 300s || {
        log_warning "Timeout waiting for abort to complete"
    }
    
    # Send alert
    send_alert "CANARY_ABORTED" "Canary deployment aborted: $reason" "critical"
    
    log_error "Canary deployment aborted. System rolled back to stable version."
}

# Send alert notification
send_alert() {
    local alert_type="$1"
    local message="$2"
    local severity="${3:-warning}"
    
    # Send to Slack if webhook is configured
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        local color="warning"
        [ "$severity" = "critical" ] && color="danger"
        [ "$severity" = "success" ] && color="good"
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 $alert_type\n$message\", \"color\":\"$color\"}" \
            "$SLACK_WEBHOOK" >/dev/null 2>&1 || true
    fi
    
    # Send to PagerDuty if routing key is configured
    if [ -n "${PAGERDUTY_ROUTING_KEY:-}" ] && [ "$severity" = "critical" ]; then
        curl -X POST https://events.pagerduty.com/v2/enqueue \
            -H "Content-Type: application/json" \
            -d "{
                \"routing_key\": \"$PAGERDUTY_ROUTING_KEY\",
                \"event_action\": \"trigger\",
                \"dedup_key\": \"canary-deployment-$(date +%Y%m%d-%H%M%S)\",
                \"payload\": {
                    \"summary\": \"$alert_type: $message\",
                    \"severity\": \"error\",
                    \"source\": \"Canary Deployment\",
                    \"component\": \"security-dashboard\"
                }
            }" >/dev/null 2>&1 || true
    fi
}

# ============================================================================
# Main Canary Deployment Functions
# ============================================================================

# Start canary deployment
start_canary() {
    local rollout_name="$1"
    local image_tag="$2"
    
    log_stage "🚀 Starting canary deployment for $rollout_name with image tag: $image_tag"
    
    # Update rollout with new image
    kubectl argo rollouts set image "$rollout_name" \
        "$rollout_name"="$ECR_REGISTRY/security-dashboard-$rollout_name:$image_tag" \
        -n "$NAMESPACE" || {
        log_error "Failed to update rollout image"
        return 1
    }
    
    log_success "Canary deployment started"
    send_alert "CANARY_STARTED" "Canary deployment started for $rollout_name ($image_tag)" "info"
    
    # Wait for canary pods to be ready
    log_info "Waiting for canary pods to be ready..."
    if ! kubectl wait --for=condition=ready pod \
        -l "app=$rollout_name,rollouts-pod-template-hash" \
        -n "$NAMESPACE" --timeout=300s; then
        log_error "Canary pods failed to become ready"
        abort_canary "$rollout_name" "Canary pods not ready"
        return 1
    fi
    
    log_success "Canary pods are ready"
}

# Execute canary stages
execute_canary_stages() {
    local rollout_name="$1"
    
    # Stage 1: 5% traffic
    log_stage "Stage 1: 5% Canary Traffic"
    if ! monitor_stage "$rollout_name" "stage-1" "5" "$METRICS_COLLECTION_DURATION"; then
        abort_canary "$rollout_name" "Stage 1 validation failed"
        return 1
    fi
    
    # Promote to next stage
    kubectl argo rollouts promote "$rollout_name" -n "$NAMESPACE" || {
        log_error "Failed to promote to stage 2"
        return 1
    }
    
    # Stage 2: 15% traffic
    log_stage "Stage 2: 15% Canary Traffic"
    if ! monitor_stage "$rollout_name" "stage-2" "15" "$METRICS_COLLECTION_DURATION"; then
        abort_canary "$rollout_name" "Stage 2 validation failed"
        return 1
    fi
    
    # Promote to next stage
    kubectl argo rollouts promote "$rollout_name" -n "$NAMESPACE" || {
        log_error "Failed to promote to stage 3"
        return 1
    }
    
    # Stage 3: 50% traffic - Extended monitoring
    log_stage "Stage 3: 50% Canary Traffic (Extended Monitoring)"
    if ! monitor_stage "$rollout_name" "stage-3" "50" "$((METRICS_COLLECTION_DURATION * 2))"; then
        abort_canary "$rollout_name" "Stage 3 validation failed"
        return 1
    fi
    
    # Final promotion to 100%
    log_stage "Final Stage: Promoting to 100% Traffic"
    kubectl argo rollouts promote "$rollout_name" -n "$NAMESPACE" || {
        log_error "Failed to promote to 100%"
        return 1
    }
    
    # Monitor full deployment
    if ! monitor_stage "$rollout_name" "final" "100" "$METRICS_COLLECTION_DURATION"; then
        abort_canary "$rollout_name" "Final stage validation failed"
        return 1
    fi
    
    log_success "🎉 Canary deployment completed successfully!"
    send_alert "CANARY_SUCCESS" "Canary deployment completed successfully for $rollout_name" "success"
}

# Post-deployment validation
post_deployment_validation() {
    local rollout_name="$1"
    
    log_stage "Running post-deployment validation..."
    
    # Check rollout status
    local status
    status=$(get_rollout_status "$rollout_name")
    if [ "$status" != "Healthy" ]; then
        log_error "Rollout is not healthy: $status"
        return 1
    fi
    
    # Validate all pods are running
    local ready_pods
    ready_pods=$(kubectl get pods -l "app=$rollout_name" -n "$NAMESPACE" \
        -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | \
        grep -c "True" || echo "0")
    
    local total_pods
    total_pods=$(kubectl get pods -l "app=$rollout_name" -n "$NAMESPACE" --no-headers | wc -l)
    
    if [ "$ready_pods" -ne "$total_pods" ]; then
        log_error "Not all pods are ready: $ready_pods/$total_pods"
        return 1
    fi
    
    # Run smoke tests
    log_info "Running smoke tests..."
    if ! kubectl run smoke-test --rm -i --restart=Never \
        --image=curlimages/curl:latest -n "$NAMESPACE" -- \
        curl -f "http://$rollout_name:4000/health"; then
        log_error "Smoke test failed"
        return 1
    fi
    
    # Final metrics validation
    if ! validate_metrics "$rollout_name" "post-deployment"; then
        log_error "Post-deployment metrics validation failed"
        return 1
    fi
    
    log_success "✅ Post-deployment validation passed"
    return 0
}

# ============================================================================
# Main Script Logic
# ============================================================================

show_usage() {
    cat << EOF
Advanced Canary Deployment Script

Usage: $0 [OPTIONS] ROLLOUT_NAME IMAGE_TAG

Arguments:
  ROLLOUT_NAME    Name of the rollout to deploy (e.g., backend, frontend)
  IMAGE_TAG       Docker image tag to deploy

Options:
  -n, --namespace NAMESPACE    Kubernetes namespace (default: security-dashboard)
  -c, --cluster CLUSTER        EKS cluster name (default: security-dashboard-eks)
  -r, --region REGION          AWS region (default: us-east-1)
  -t, --timeout TIMEOUT        Canary timeout in seconds (default: 1800)
  -s, --skip-validation       Skip post-deployment validation
  -f, --force                 Force deployment without confirmation
  -v, --verbose               Enable verbose logging
  -h, --help                  Show this help message

Environment Variables:
  SLACK_WEBHOOK              Slack webhook URL for notifications
  PAGERDUTY_ROUTING_KEY     PagerDuty routing key for critical alerts
  AWS_PROFILE               AWS profile to use

Examples:
  $0 backend v1.2.3
  $0 --namespace staging frontend v2.1.0
  $0 --force --skip-validation backend latest

Canary Stages:
  1. Deploy with 5% traffic (5 min validation)
  2. Increase to 15% traffic (5 min validation)
  3. Increase to 50% traffic (10 min validation)
  4. Promote to 100% traffic (5 min validation)
  5. Post-deployment validation

Each stage includes comprehensive metrics validation:
- Success rate ≥ 99.5%
- Error rate ≤ 1%
- P95 response time ≤ 500ms
- P99 response time ≤ 1s

EOF
}

main() {
    # Default values
    local rollout_name=""
    local image_tag=""
    local skip_validation=false
    local force_deploy=false
    local verbose=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -c|--cluster)
                CLUSTER_NAME="$2"
                shift 2
                ;;
            -r|--region)
                AWS_REGION="$2"
                shift 2
                ;;
            -t|--timeout)
                CANARY_TIMEOUT="$2"
                shift 2
                ;;
            -s|--skip-validation)
                skip_validation=true
                shift
                ;;
            -f|--force)
                force_deploy=true
                shift
                ;;
            -v|--verbose)
                verbose=true
                set -x
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            -*)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                if [ -z "$rollout_name" ]; then
                    rollout_name="$1"
                elif [ -z "$image_tag" ]; then
                    image_tag="$1"
                else
                    log_error "Too many arguments"
                    show_usage
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # Validate required arguments
    if [ -z "$rollout_name" ] || [ -z "$image_tag" ]; then
        log_error "Missing required arguments: ROLLOUT_NAME and IMAGE_TAG"
        show_usage
        exit 1
    fi
    
    # Show deployment summary
    echo "🚀 Security Dashboard Canary Deployment"
    echo "=========================================="
    echo "Rollout Name: $rollout_name"
    echo "Image Tag: $image_tag"
    echo "Namespace: $NAMESPACE"
    echo "Cluster: $CLUSTER_NAME"
    echo "Region: $AWS_REGION"
    echo "Timeout: $CANARY_TIMEOUT seconds"
    echo "Skip Validation: $skip_validation"
    echo "Force Deploy: $force_deploy"
    echo "=========================================="
    
    # Confirmation (unless forced)
    if [ "$force_deploy" = false ]; then
        echo
        read -p "Proceed with canary deployment? (yes/no): " -r
        if [[ ! $REPLY =~ ^yes$ ]]; then
            log_info "Deployment cancelled by user"
            exit 0
        fi
    fi
    
    echo
    log_info "Starting canary deployment process..."
    
    # Check prerequisites and setup
    check_prerequisites
    setup_cluster
    
    # Verify rollout exists
    if ! kubectl get rollout "$rollout_name" -n "$NAMESPACE" >/dev/null 2>&1; then
        log_error "Rollout '$rollout_name' not found in namespace '$NAMESPACE'"
        exit 1
    fi
    
    # Start canary deployment
    if ! start_canary "$rollout_name" "$image_tag"; then
        exit 1
    fi
    
    # Execute canary stages with timeout
    local start_time=$(date +%s)
    local end_time=$((start_time + CANARY_TIMEOUT))
    
    if ! timeout "$CANARY_TIMEOUT" execute_canary_stages "$rollout_name"; then
        if [ $(date +%s) -ge $end_time ]; then
            abort_canary "$rollout_name" "Deployment timeout ($CANARY_TIMEOUT seconds)"
        fi
        exit 1
    fi
    
    # Post-deployment validation
    if [ "$skip_validation" = false ]; then
        if ! post_deployment_validation "$rollout_name"; then
            log_error "Post-deployment validation failed"
            exit 1
        fi
    else
        log_warning "Skipping post-deployment validation"
    fi
    
    # Success summary
    local total_time=$(($(date +%s) - start_time))
    echo
    log_success "🎉 Canary deployment completed successfully!"
    echo "📊 Deployment Summary:"
    echo "   Rollout: $rollout_name"
    echo "   Image: $ECR_REGISTRY/security-dashboard-$rollout_name:$image_tag"
    echo "   Total Time: ${total_time}s ($(date -d@$total_time -u +%H:%M:%S))"
    echo "   Namespace: $NAMESPACE"
    echo "   Cluster: $CLUSTER_NAME"
    echo
    echo "🔍 Monitoring:"
    echo "   Grafana: https://grafana.security.candlefish.ai"
    echo "   Prometheus: https://prometheus.security.candlefish.ai"
    echo "   Logs: kubectl logs -l app=$rollout_name -n $NAMESPACE -f"
    echo
    echo "🛠️  Management:"
    echo "   Status: kubectl argo rollouts get rollout $rollout_name -n $NAMESPACE"
    echo "   Rollback: ./rollback-procedures.sh partial-rollback $rollout_name"
    
    log_success "Canary deployment process completed successfully!"
}

# Handle script interruption
trap 'log_error "Deployment interrupted. Run rollback if needed: ./rollback-procedures.sh partial-rollback $rollout_name"; exit 1' INT TERM

# Run main function with all arguments
main "$@"