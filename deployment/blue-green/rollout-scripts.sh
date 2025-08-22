#!/bin/bash
# Blue-Green Deployment Scripts for RTPM
# Automated deployment, testing, and rollback procedures

set -euo pipefail

# Configuration
NAMESPACE="rtpm-system"
APP_NAME="rtpm-api"
ROLLOUT_NAME="rtpm-api-rollout"
FRONTEND_ROLLOUT_NAME="rtpm-frontend-rollout"
KUBECTL="kubectl"
ARGO_ROLLOUTS="kubectl argo rollouts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi

    # Check Argo Rollouts plugin
    if ! kubectl argo rollouts version &> /dev/null; then
        log_error "Argo Rollouts kubectl plugin is not installed"
        log_info "Install with: curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64"
        exit 1
    fi

    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    # Check namespace
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Deploy new version (Blue-Green)
deploy_new_version() {
    local image_tag="$1"

    log_info "Starting blue-green deployment for image tag: $image_tag"

    # Update the rollout with new image
    log_info "Updating rollout with new image..."
    $ARGO_ROLLOUTS set image "$ROLLOUT_NAME" -n "$NAMESPACE" \
        api="681214184463.dkr.ecr.us-east-1.amazonaws.com/rtpm-api:$image_tag"

    # Wait for rollout to start
    log_info "Waiting for rollout to start..."
    $ARGO_ROLLOUTS get rollout "$ROLLOUT_NAME" -n "$NAMESPACE" --watch &
    WATCH_PID=$!

    # Wait for the green environment to be ready
    log_info "Waiting for green environment to be ready..."
    timeout 600 bash -c "
        while true; do
            status=\$($ARGO_ROLLOUTS get rollout '$ROLLOUT_NAME' -n '$NAMESPACE' -o jsonpath='{.status.phase}')
            if [[ \"\$status\" == \"Paused\" ]]; then
                break
            fi
            sleep 10
        done
    "

    kill $WATCH_PID 2>/dev/null || true

    log_success "Green environment is ready for testing"
}

# Run pre-promotion tests
run_pre_promotion_tests() {
    log_info "Running pre-promotion analysis..."

    # Get the preview service endpoint
    local preview_service="rtpm-api-service-preview"

    log_info "Running health checks..."
    if ! run_health_check "$preview_service"; then
        log_error "Health check failed"
        return 1
    fi

    log_info "Running load tests..."
    if ! run_load_test "$preview_service"; then
        log_error "Load test failed"
        return 1
    fi

    log_info "Running integration tests..."
    if ! run_integration_test "$preview_service"; then
        log_error "Integration test failed"
        return 1
    fi

    log_success "All pre-promotion tests passed"
    return 0
}

# Health check function
run_health_check() {
    local service_name="$1"
    local endpoint="http://$service_name.$NAMESPACE.svc.cluster.local:8000/health"

    # Run health check pod
    kubectl run health-check-$(date +%s) \
        --image=curlimages/curl:8.4.0 \
        --rm -i --restart=Never \
        --namespace="$NAMESPACE" \
        --timeout=60s \
        -- curl -f "$endpoint"
}

# Load test function
run_load_test() {
    local service_name="$1"

    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: load-test-$(date +%s)
  namespace: $NAMESPACE
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      containers:
      - name: k6
        image: loadimpact/k6:latest
        command: ["/bin/sh"]
        args:
        - -c
        - |
          cat <<'TEST_EOF' > /tmp/test.js
          import http from 'k6/http';
          import { check, sleep } from 'k6';

          export let options = {
            stages: [
              { duration: '30s', target: 10 },
              { duration: '1m', target: 20 },
              { duration: '30s', target: 0 },
            ],
            thresholds: {
              http_req_duration: ['p(95)<1000'],
              http_req_failed: ['rate<0.1'],
            },
          };

          export default function () {
            let response = http.get('http://$service_name.$NAMESPACE.svc.cluster.local:8000/health');
            check(response, {
              'status is 200': (r) => r.status === 200,
            });
            sleep(1);
          }
          TEST_EOF
          k6 run /tmp/test.js
      restartPolicy: Never
EOF

    # Wait for job to complete
    local job_name=$(kubectl get jobs -n "$NAMESPACE" --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}')
    kubectl wait --for=condition=complete job/"$job_name" -n "$NAMESPACE" --timeout=300s

    # Check if job succeeded
    local job_status=$(kubectl get job "$job_name" -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}')
    if [[ "$job_status" == "True" ]]; then
        return 0
    else
        return 1
    fi
}

# Integration test function
run_integration_test() {
    local service_name="$1"

    kubectl run integration-test-$(date +%s) \
        --image=curlimages/curl:8.4.0 \
        --rm -i --restart=Never \
        --namespace="$NAMESPACE" \
        --timeout=120s \
        -- /bin/sh -c "
            set -e
            echo 'Testing health endpoint...'
            curl -f http://$service_name.$NAMESPACE.svc.cluster.local:8000/health

            echo 'Testing metrics endpoint...'
            curl -f http://$service_name.$NAMESPACE.svc.cluster.local:8000/metrics

            echo 'Testing API endpoints...'
            curl -f -X GET http://$service_name.$NAMESPACE.svc.cluster.local:8000/api/v1/agents

            echo 'All tests passed!'
        "
}

# Promote deployment
promote_deployment() {
    log_info "Promoting deployment to active environment..."

    $ARGO_ROLLOUTS promote "$ROLLOUT_NAME" -n "$NAMESPACE"

    # Wait for promotion to complete
    log_info "Waiting for promotion to complete..."
    $ARGO_ROLLOUTS get rollout "$ROLLOUT_NAME" -n "$NAMESPACE" --watch &
    WATCH_PID=$!

    timeout 300 bash -c "
        while true; do
            status=\$($ARGO_ROLLOUTS get rollout '$ROLLOUT_NAME' -n '$NAMESPACE' -o jsonpath='{.status.phase}')
            if [[ \"\$status\" == \"Healthy\" ]]; then
                break
            fi
            sleep 10
        done
    "

    kill $WATCH_PID 2>/dev/null || true

    log_success "Deployment promoted successfully"
}

# Run post-promotion analysis
run_post_promotion_analysis() {
    log_info "Running post-promotion analysis..."

    # Monitor for 5 minutes
    local end_time=$(($(date +%s) + 300))

    while [[ $(date +%s) -lt $end_time ]]; do
        # Check error rate
        local error_rate=$(kubectl exec -n monitoring deployment/prometheus -- \
            promtool query instant \
            'sum(rate(http_requests_total{job="rtpm-api",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="rtpm-api"}[5m])) * 100' \
            2>/dev/null | grep -o '[0-9.]*' | head -1 || echo "0")

        if (( $(echo "$error_rate > 5" | bc -l) )); then
            log_error "High error rate detected: $error_rate%"
            return 1
        fi

        log_info "Error rate: $error_rate% (threshold: 5%)"
        sleep 30
    done

    log_success "Post-promotion analysis passed"
    return 0
}

# Rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."

    $ARGO_ROLLOUTS abort "$ROLLOUT_NAME" -n "$NAMESPACE"
    $ARGO_ROLLOUTS undo "$ROLLOUT_NAME" -n "$NAMESPACE"

    # Wait for rollback to complete
    log_info "Waiting for rollback to complete..."
    timeout 300 bash -c "
        while true; do
            status=\$($ARGO_ROLLOUTS get rollout '$ROLLOUT_NAME' -n '$NAMESPACE' -o jsonpath='{.status.phase}')
            if [[ \"\$status\" == \"Healthy\" ]]; then
                break
            fi
            sleep 10
        done
    "

    log_success "Rollback completed"
}

# Get deployment status
get_deployment_status() {
    log_info "Current deployment status:"
    $ARGO_ROLLOUTS get rollout "$ROLLOUT_NAME" -n "$NAMESPACE"

    log_info "Rollout history:"
    $ARGO_ROLLOUTS history "$ROLLOUT_NAME" -n "$NAMESPACE"
}

# Main deployment function
main_deploy() {
    local image_tag="$1"

    check_prerequisites

    log_info "Starting blue-green deployment for RTPM API"
    log_info "Image tag: $image_tag"

    # Deploy new version
    deploy_new_version "$image_tag"

    # Run tests
    if run_pre_promotion_tests; then
        # Promote if tests pass
        promote_deployment

        # Run post-promotion analysis
        if ! run_post_promotion_analysis; then
            log_error "Post-promotion analysis failed, rolling back..."
            rollback_deployment
            exit 1
        fi

        log_success "Blue-green deployment completed successfully!"
    else
        log_error "Pre-promotion tests failed, aborting deployment"
        rollback_deployment
        exit 1
    fi
}

# Canary deployment for gradual rollout
canary_deploy() {
    local image_tag="$1"

    log_info "Starting canary deployment for image tag: $image_tag"

    # Switch to canary strategy temporarily
    kubectl patch rollout "$ROLLOUT_NAME" -n "$NAMESPACE" --type='merge' -p='
    {
      "spec": {
        "strategy": {
          "canary": {
            "steps": [
              {"setWeight": 10},
              {"pause": {"duration": "2m"}},
              {"setWeight": 25},
              {"pause": {"duration": "2m"}},
              {"setWeight": 50},
              {"pause": {"duration": "2m"}},
              {"setWeight": 75},
              {"pause": {"duration": "2m"}}
            ]
          }
        }
      }
    }'

    # Update image
    $ARGO_ROLLOUTS set image "$ROLLOUT_NAME" -n "$NAMESPACE" \
        api="681214184463.dkr.ecr.us-east-1.amazonaws.com/rtpm-api:$image_tag"

    log_info "Canary deployment started. Use 'promote' or 'abort' commands to control."
}

# Emergency rollback
emergency_rollback() {
    log_warning "Performing emergency rollback..."

    $ARGO_ROLLOUTS abort "$ROLLOUT_NAME" -n "$NAMESPACE" || true
    $ARGO_ROLLOUTS undo "$ROLLOUT_NAME" -n "$NAMESPACE"

    # Force immediate rollback
    kubectl patch rollout "$ROLLOUT_NAME" -n "$NAMESPACE" --type='merge' -p='
    {
      "spec": {
        "strategy": {
          "blueGreen": {
            "scaleDownDelaySeconds": 0,
            "autoPromotionEnabled": false
          }
        }
      }
    }'

    log_success "Emergency rollback initiated"
}

# Help function
show_help() {
    cat << EOF
RTPM Blue-Green Deployment Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    deploy <image_tag>      Deploy new version using blue-green strategy
    canary <image_tag>      Deploy new version using canary strategy
    promote                 Promote current deployment
    rollback               Rollback to previous version
    emergency-rollback     Emergency rollback (immediate)
    status                 Show current deployment status
    abort                  Abort current deployment
    help                   Show this help message

Examples:
    $0 deploy v1.2.3
    $0 canary v1.2.4-rc1
    $0 promote
    $0 rollback
    $0 status

Environment Variables:
    NAMESPACE              Kubernetes namespace (default: rtpm-system)
    ROLLOUT_NAME          Argo Rollout name (default: rtpm-api-rollout)

EOF
}

# Main script logic
case "${1:-}" in
    deploy)
        if [[ -z "${2:-}" ]]; then
            log_error "Image tag is required for deploy command"
            show_help
            exit 1
        fi
        main_deploy "$2"
        ;;
    canary)
        if [[ -z "${2:-}" ]]; then
            log_error "Image tag is required for canary command"
            show_help
            exit 1
        fi
        canary_deploy "$2"
        ;;
    promote)
        check_prerequisites
        promote_deployment
        ;;
    rollback)
        check_prerequisites
        rollback_deployment
        ;;
    emergency-rollback)
        emergency_rollback
        ;;
    status)
        check_prerequisites
        get_deployment_status
        ;;
    abort)
        check_prerequisites
        $ARGO_ROLLOUTS abort "$ROLLOUT_NAME" -n "$NAMESPACE"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: ${1:-}"
        show_help
        exit 1
        ;;
esac
