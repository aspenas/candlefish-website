#!/bin/bash
# Blue-Green Deployment Script for Security Dashboard
# Zero-downtime deployment with automatic health checks and rollback

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
NAMESPACE="security-dashboard"
ROLLOUT_NAME="security-dashboard-backend-rollout"
TIMEOUT="${TIMEOUT:-600}"
AUTO_PROMOTE="${AUTO_PROMOTE:-false}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check required tools
    for tool in kubectl argo; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is not installed. Please install it first."
        fi
    done
    
    # Check if Argo Rollouts controller is running
    if ! kubectl get deployment argo-rollouts-controller -n argo-rollouts &>/dev/null; then
        error "Argo Rollouts controller is not installed. Please install it first."
    fi
    
    # Check if rollout exists
    if ! kubectl get rollout "$ROLLOUT_NAME" -n "$NAMESPACE" &>/dev/null; then
        warn "Rollout $ROLLOUT_NAME does not exist. Creating from manifest..."
        kubectl apply -f "$PROJECT_ROOT/deployment/blue-green/blue-green-security-dashboard.yaml"
    fi
    
    log "Prerequisites check completed"
}

# Get current rollout status
get_rollout_status() {
    kubectl argo rollouts get rollout "$ROLLOUT_NAME" -n "$NAMESPACE" -o json 2>/dev/null || echo "{}"
}

# Wait for rollout to be ready
wait_for_rollout() {
    local timeout=${1:-$TIMEOUT}
    log "Waiting for rollout to complete (timeout: ${timeout}s)..."
    
    if kubectl argo rollouts status "$ROLLOUT_NAME" -n "$NAMESPACE" --timeout "${timeout}s"; then
        log "Rollout completed successfully"
    else
        error "Rollout failed or timed out"
    fi
}

# Run health checks on preview environment
run_health_checks() {
    log "Running health checks on preview environment..."
    
    local preview_service="security-dashboard-backend-preview"
    local health_endpoint="/health"
    local ready_endpoint="/ready"
    
    # Port forward to preview service
    log "Setting up port forward to preview service..."
    kubectl port-forward service/"$preview_service" 8080:4000 -n "$NAMESPACE" &
    local port_forward_pid=$!
    
    # Wait for port forward to establish
    sleep 5
    
    # Health check function
    check_endpoint() {
        local endpoint=$1
        local expected_status=${2:-200}
        
        for i in {1..10}; do
            if curl -sf -o /dev/null -w "%{http_code}" "http://localhost:8080$endpoint" | grep -q "$expected_status"; then
                log "Health check passed for $endpoint"
                return 0
            else
                warn "Health check attempt $i/10 failed for $endpoint, retrying..."
                sleep 10
            fi
        done
        return 1
    }
    
    # Run health checks
    local health_passed=true
    
    if ! check_endpoint "$health_endpoint"; then
        error "Health check failed for $health_endpoint"
        health_passed=false
    fi
    
    if ! check_endpoint "$ready_endpoint"; then
        error "Readiness check failed for $ready_endpoint"
        health_passed=false
    fi
    
    # Cleanup port forward
    kill $port_forward_pid 2>/dev/null || true
    
    if [ "$health_passed" = false ]; then
        error "Health checks failed"
    fi
    
    log "All health checks passed"
}

# Run integration tests on preview environment
run_integration_tests() {
    log "Running integration tests on preview environment..."
    
    local test_script="$PROJECT_ROOT/__tests__/integration/preview-environment-tests.js"
    
    if [ -f "$test_script" ]; then
        if node "$test_script"; then
            log "Integration tests passed"
        else
            error "Integration tests failed"
        fi
    else
        warn "Integration test script not found, skipping..."
    fi
}

# Get deployment metrics
get_metrics() {
    log "Collecting deployment metrics..."
    
    # Get rollout information
    local status=$(get_rollout_status)
    local current_replica_set=$(echo "$status" | jq -r '.status.currentPodHash // "unknown"')
    local stable_replica_set=$(echo "$status" | jq -r '.status.stableRS // "unknown"')
    local desired_replicas=$(echo "$status" | jq -r '.spec.replicas // 0')
    local ready_replicas=$(echo "$status" | jq -r '.status.readyReplicas // 0')
    
    info "Current ReplicaSet: $current_replica_set"
    info "Stable ReplicaSet: $stable_replica_set"
    info "Desired Replicas: $desired_replicas"
    info "Ready Replicas: $ready_replicas"
    
    # Get Prometheus metrics if available
    if command -v curl &> /dev/null; then
        local prometheus_url="http://prometheus.monitoring.svc.cluster.local:9090"
        local query="up{job=\"security-dashboard-backend\"}"
        
        # Try to get metrics via port-forward
        kubectl port-forward service/prometheus 9090:9090 -n monitoring &>/dev/null &
        local prom_pid=$!
        sleep 2
        
        if curl -sf "$prometheus_url/api/v1/query?query=$query" &>/dev/null; then
            local up_instances=$(curl -s "$prometheus_url/api/v1/query?query=$query" | jq '.data.result | length')
            info "Prometheus reports $up_instances healthy instances"
        fi
        
        kill $prom_pid 2>/dev/null || true
    fi
}

# Promote deployment
promote_deployment() {
    log "Promoting deployment to active environment..."
    
    if kubectl argo rollouts promote "$ROLLOUT_NAME" -n "$NAMESPACE"; then
        log "Deployment promoted successfully"
        wait_for_rollout
    else
        error "Failed to promote deployment"
    fi
}

# Rollback deployment
rollback_deployment() {
    log "Rolling back deployment..."
    
    # Abort current rollout
    log "Aborting current rollout..."
    kubectl argo rollouts abort "$ROLLOUT_NAME" -n "$NAMESPACE" || true
    
    # Perform rollback
    log "Rolling back to previous stable version..."
    if kubectl argo rollouts undo "$ROLLOUT_NAME" -n "$NAMESPACE"; then
        log "Rollback initiated successfully"
        wait_for_rollout
    else
        error "Failed to initiate rollback"
    fi
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        local emoji="✅"
        
        if [[ "$status" == "failure" ]]; then
            color="danger"
            emoji="❌"
        elif [[ "$status" == "warning" ]]; then
            color="warning"
            emoji="⚠️"
        fi
        
        local payload=$(cat <<EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "$emoji Security Dashboard Blue-Green Deployment",
            "text": "$message",
            "fields": [
                {
                    "title": "Environment",
                    "value": "production",
                    "short": true
                },
                {
                    "title": "Status",
                    "value": "$status",
                    "short": true
                }
            ],
            "ts": $(date +%s)
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

# Main deployment function
deploy() {
    local image_tag=${1:-latest}
    
    log "Starting blue-green deployment of Security Dashboard"
    log "Image tag: $image_tag"
    
    # Update image in rollout
    log "Updating image in rollout..."
    kubectl argo rollouts set image "$ROLLOUT_NAME" \
        backend="681214184463.dkr.ecr.us-east-1.amazonaws.com/security-dashboard-backend:$image_tag" \
        -n "$NAMESPACE"
    
    # Wait for rollout to start
    log "Waiting for rollout to start..."
    sleep 10
    
    # Wait for preview environment to be ready
    wait_for_rollout "$HEALTH_CHECK_TIMEOUT"
    
    # Run health checks
    run_health_checks
    
    # Run integration tests
    run_integration_tests
    
    # Get metrics
    get_metrics
    
    # Promote or wait for manual promotion
    if [ "$AUTO_PROMOTE" = "true" ]; then
        log "Auto-promotion enabled, promoting deployment..."
        promote_deployment
        send_notification "success" "Blue-green deployment completed successfully with auto-promotion"
    else
        log "Auto-promotion disabled. Run the following command to promote:"
        log "kubectl argo rollouts promote $ROLLOUT_NAME -n $NAMESPACE"
        send_notification "warning" "Blue-green deployment ready for manual promotion"
    fi
}

# Show usage
show_usage() {
    cat <<EOF
Blue-Green Deployment Script for Security Dashboard

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    deploy [IMAGE_TAG]      Deploy new version (default: latest)
    promote                 Promote current preview to active
    rollback                Rollback to previous stable version
    status                  Show current rollout status
    health                  Run health checks on preview
    abort                   Abort current rollout

Options:
    --auto-promote          Automatically promote after health checks pass
    --timeout SECONDS       Deployment timeout (default: 600)
    --namespace NAMESPACE   Kubernetes namespace (default: security-dashboard)
    -h, --help              Show this help

Environment Variables:
    AUTO_PROMOTE            Same as --auto-promote
    TIMEOUT                 Same as --timeout
    HEALTH_CHECK_TIMEOUT    Health check timeout (default: 300)
    SLACK_WEBHOOK_URL       Slack webhook for notifications

Examples:
    $0 deploy v1.2.3                    # Deploy specific version
    $0 deploy --auto-promote             # Deploy with auto-promotion
    $0 promote                           # Manually promote deployment
    $0 rollback                          # Rollback deployment
    $0 status                            # Check status

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        deploy)
            command="deploy"
            image_tag=${2:-latest}
            shift 1
            if [[ $# -gt 0 && ! $2 =~ ^-- ]]; then
                shift 1
            fi
            ;;
        promote)
            command="promote"
            shift
            ;;
        rollback)
            command="rollback"
            shift
            ;;
        status)
            command="status"
            shift
            ;;
        health)
            command="health"
            shift
            ;;
        abort)
            command="abort"
            shift
            ;;
        --auto-promote)
            AUTO_PROMOTE="true"
            shift
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Execute command
case ${command:-help} in
    deploy)
        check_prerequisites
        deploy "$image_tag"
        ;;
    promote)
        promote_deployment
        ;;
    rollback)
        rollback_deployment
        ;;
    status)
        kubectl argo rollouts get rollout "$ROLLOUT_NAME" -n "$NAMESPACE"
        get_metrics
        ;;
    health)
        run_health_checks
        ;;
    abort)
        kubectl argo rollouts abort "$ROLLOUT_NAME" -n "$NAMESPACE"
        ;;
    *)
        show_usage
        exit 1
        ;;
esac