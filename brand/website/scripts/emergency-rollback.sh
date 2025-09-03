#!/bin/bash
# Emergency Rollback Script for Bioluminescent Candlefish Animation
# Provides rapid rollback capabilities for production deployments

set -e

# Configuration
NAMESPACE="${NAMESPACE:-production}"
APP_NAME="candlefish-website"
KUBECONFIG="${KUBECONFIG:-${HOME}/.kube/config}"
ROLLBACK_TIMEOUT="${ROLLBACK_TIMEOUT:-600}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-5}"
HEALTH_CHECK_DELAY="${HEALTH_CHECK_DELAY:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace '$NAMESPACE' does not exist"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Function to get current deployment status
get_deployment_status() {
    local deployment_name="$1"
    kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' 2>/dev/null || echo "Unknown"
}

# Function to get revision history
get_revision_history() {
    log_info "Getting deployment revision history..."
    
    # Get deployment history
    kubectl rollout history deployment "$APP_NAME" -n "$NAMESPACE"
    
    # Get current revision
    local current_revision
    current_revision=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')
    
    echo "Current revision: $current_revision"
    
    # Calculate previous revision
    local previous_revision
    previous_revision=$((current_revision - 1))
    
    if [ "$previous_revision" -lt 1 ]; then
        log_error "No previous revision available for rollback"
        exit 1
    fi
    
    echo "$previous_revision"
}

# Function to perform blue-green rollback
perform_blue_green_rollback() {
    log_info "Performing blue-green rollback..."
    
    # Determine current and target colors
    local current_color
    current_color=$(kubectl get service "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "blue")
    
    local target_color
    if [ "$current_color" = "blue" ]; then
        target_color="green"
    else
        target_color="blue"
    fi
    
    log_info "Current color: $current_color, rolling back to: $target_color"
    
    # Check if target environment exists and is healthy
    if ! kubectl get deployment "$APP_NAME-$target_color" -n "$NAMESPACE" &> /dev/null; then
        log_error "Target deployment $APP_NAME-$target_color does not exist"
        exit 1
    fi
    
    # Scale up the target environment if it's scaled down
    local target_replicas
    target_replicas=$(kubectl get deployment "$APP_NAME-$target_color" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    
    if [ "$target_replicas" -eq 0 ]; then
        log_info "Scaling up target environment..."
        kubectl scale deployment "$APP_NAME-$target_color" --replicas=3 -n "$NAMESPACE"
        
        # Wait for rollout to complete
        kubectl rollout status deployment "$APP_NAME-$target_color" -n "$NAMESPACE" --timeout="${ROLLBACK_TIMEOUT}s"
    fi
    
    # Health check on target environment
    log_info "Performing health check on target environment..."
    perform_health_check "$target_color"
    
    # Switch traffic to target environment
    log_info "Switching traffic to $target_color environment..."
    kubectl patch service "$APP_NAME" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"color\":\"$target_color\"}}}"
    
    # Wait for traffic switch to propagate
    sleep 10
    
    # Perform final health check
    perform_health_check
    
    # Scale down the original environment
    log_info "Scaling down original environment..."
    kubectl scale deployment "$APP_NAME-$current_color" --replicas=0 -n "$NAMESPACE"
    
    log_info "Blue-green rollback completed successfully"
}

# Function to perform standard rollback
perform_standard_rollback() {
    local previous_revision="$1"
    
    log_info "Performing rollback to revision $previous_revision..."
    
    # Record rollback start time
    kubectl annotate deployment "$APP_NAME" rollback.candlefish.ai/started-at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" -n "$NAMESPACE" --overwrite
    
    # Perform rollback
    kubectl rollout undo deployment "$APP_NAME" --to-revision="$previous_revision" -n "$NAMESPACE"
    
    # Wait for rollback to complete
    log_info "Waiting for rollback to complete..."
    kubectl rollout status deployment "$APP_NAME" -n "$NAMESPACE" --timeout="${ROLLBACK_TIMEOUT}s"
    
    # Record rollback completion
    kubectl annotate deployment "$APP_NAME" rollback.candlefish.ai/completed-at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" -n "$NAMESPACE" --overwrite
    
    log_info "Standard rollback completed successfully"
}

# Function to perform health checks
perform_health_check() {
    local color_suffix="${1:-}"
    local service_name="$APP_NAME"
    
    if [ -n "$color_suffix" ]; then
        service_name="$APP_NAME-$color_suffix"
    fi
    
    log_info "Performing health check on $service_name..."
    
    for i in $(seq 1 "$HEALTH_CHECK_RETRIES"); do
        log_info "Health check attempt $i/$HEALTH_CHECK_RETRIES"
        
        # Check if pods are ready
        local ready_pods
        ready_pods=$(kubectl get pods -l app="$APP_NAME" -l color="$color_suffix" -n "$NAMESPACE" -o jsonpath='{.items[*].status.containerStatuses[*].ready}' 2>/dev/null || echo "")
        
        if [[ "$ready_pods" == *"false"* ]] || [ -z "$ready_pods" ]; then
            log_warn "Pods not ready yet, waiting..."
            sleep "$HEALTH_CHECK_DELAY"
            continue
        fi
        
        # Perform application health check
        local service_ip
        service_ip=$(kubectl get svc "$service_name" -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}' 2>/dev/null)
        
        if [ -n "$service_ip" ]; then
            if kubectl run health-check-"$(date +%s)" --rm -i --restart=Never --image=curlimages/curl -- curl -f -m 10 "http://$service_ip/api/health" &> /dev/null; then
                log_info "Health check passed"
                return 0
            else
                log_warn "Application health check failed, retrying..."
            fi
        else
            log_warn "Could not get service IP, retrying..."
        fi
        
        sleep "$HEALTH_CHECK_DELAY"
    done
    
    log_error "Health check failed after $HEALTH_CHECK_RETRIES attempts"
    return 1
}

# Function to send notifications
send_notification() {
    local status="$1"
    local message="$2"
    
    # Send Slack notification if webhook is configured
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 ROLLBACK $status: $message\"}" \
            &> /dev/null || log_warn "Failed to send Slack notification"
    fi
    
    # Log to CloudWatch if AWS CLI is available
    if command -v aws &> /dev/null; then
        aws logs put-log-events \
            --log-group-name "/aws/eks/production-candlefish-website/application" \
            --log-stream-name "rollback-$(date +%Y%m%d)" \
            --log-events timestamp="$(date +%s)000",message="ROLLBACK $status: $message" \
            &> /dev/null || log_warn "Failed to send CloudWatch log"
    fi
}

# Function to create rollback report
create_rollback_report() {
    local status="$1"
    local start_time="$2"
    local end_time="$3"
    
    local report_file="/tmp/rollback-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
    "rollback_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$NAMESPACE",
    "application": "$APP_NAME",
    "status": "$status",
    "duration_seconds": $((end_time - start_time)),
    "kubectl_version": "$(kubectl version --client --short 2>/dev/null | grep 'Client Version' | cut -d' ' -f3 || echo 'unknown')",
    "cluster_info": {
        "server": "$(kubectl config view --minify -o jsonpath='{.clusters[].cluster.server}' 2>/dev/null || echo 'unknown')",
        "context": "$(kubectl config current-context 2>/dev/null || echo 'unknown')"
    },
    "deployment_info": {
        "current_revision": "$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}' 2>/dev/null || echo 'unknown')",
        "ready_replicas": "$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 'unknown')",
        "available_replicas": "$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.status.availableReplicas}' 2>/dev/null || echo 'unknown')"
    }
}
EOF

    log_info "Rollback report created: $report_file"
    cat "$report_file"
}

# Main execution function
main() {
    local start_time
    start_time=$(date +%s)
    
    log_info "Starting emergency rollback for $APP_NAME in $NAMESPACE namespace"
    
    # Check prerequisites
    check_prerequisites
    
    # Get deployment strategy (check for blue-green setup)
    local has_blue_green=false
    if kubectl get deployment "$APP_NAME-blue" -n "$NAMESPACE" &> /dev/null && \
       kubectl get deployment "$APP_NAME-green" -n "$NAMESPACE" &> /dev/null; then
        has_blue_green=true
    fi
    
    # Perform appropriate rollback strategy
    if [ "$has_blue_green" = true ]; then
        log_info "Blue-green deployment detected, performing blue-green rollback"
        perform_blue_green_rollback
    else
        log_info "Standard deployment detected, performing standard rollback"
        previous_revision=$(get_revision_history)
        perform_standard_rollback "$previous_revision"
    fi
    
    # Final health check
    if perform_health_check; then
        local end_time
        end_time=$(date +%s)
        
        log_info "Emergency rollback completed successfully in $((end_time - start_time)) seconds"
        send_notification "SUCCESS" "Emergency rollback completed for $APP_NAME"
        create_rollback_report "SUCCESS" "$start_time" "$end_time"
        exit 0
    else
        local end_time
        end_time=$(date +%s)
        
        log_error "Emergency rollback failed health check"
        send_notification "FAILED" "Emergency rollback failed health check for $APP_NAME"
        create_rollback_report "FAILED" "$start_time" "$end_time"
        exit 1
    fi
}

# Handle script interruption
cleanup() {
    log_warn "Script interrupted, cleaning up..."
    exit 130
}

trap cleanup INT TERM

# Validate arguments and run
if [ "$#" -gt 0 ]; then
    case "$1" in
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --help, -h          Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  NAMESPACE           Kubernetes namespace (default: production)"
            echo "  ROLLBACK_TIMEOUT    Timeout in seconds (default: 600)"
            echo "  HEALTH_CHECK_RETRIES Number of health check attempts (default: 5)"
            echo "  HEALTH_CHECK_DELAY  Delay between health checks (default: 30)"
            echo "  SLACK_WEBHOOK_URL   Slack webhook for notifications"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
fi

# Run main function
main "$@"