#!/bin/bash

# Production Health Check Script for Inventory Management System
# This script performs comprehensive health checks after deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="inventory-production"
MAX_RETRIES=10
RETRY_DELAY=30
HEALTH_CHECK_TIMEOUT=10

# Health check endpoints
API_ENDPOINT="https://api.inventory.candlefish.ai"
FRONTEND_ENDPOINT="https://inventory.candlefish.ai"

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
    touch /tmp/health_check_failed
}

wait_for_rollout() {
    local rollout_name=$1
    log_info "Waiting for rollout $rollout_name to complete..."

    kubectl argo rollouts wait $rollout_name -n $NAMESPACE --timeout=600s
    if [ $? -eq 0 ]; then
        log_success "Rollout $rollout_name completed successfully"
    else
        log_error "Rollout $rollout_name failed or timed out"
        return 1
    fi
}

check_pod_status() {
    log_info "Checking pod status..."

    # Check if all pods are running
    local not_ready_pods=$(kubectl get pods -n $NAMESPACE --no-headers | grep -v Running | grep -v Completed || true)

    if [ -z "$not_ready_pods" ]; then
        log_success "All pods are running"
    else
        log_error "Some pods are not running:"
        echo "$not_ready_pods"
        return 1
    fi

    # Check pod readiness
    local unready_pods=$(kubectl get pods -n $NAMESPACE --no-headers | awk '$2 !~ /^([0-9]+)\/\1$/ {print $1}' || true)

    if [ -z "$unready_pods" ]; then
        log_success "All pods are ready"
    else
        log_error "Some pods are not ready:"
        echo "$unready_pods"
        return 1
    fi
}

check_services() {
    log_info "Checking service endpoints..."

    local services=("inventory-backend-active" "inventory-frontend-active" "postgres-service" "redis-service")

    for service in "${services[@]}"; do
        local endpoints=$(kubectl get endpoints $service -n $NAMESPACE -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null || echo "")

        if [ -n "$endpoints" ]; then
            log_success "Service $service has endpoints: $endpoints"
        else
            log_error "Service $service has no endpoints"
            return 1
        fi
    done
}

check_database_connectivity() {
    log_info "Checking database connectivity..."

    local db_status=$(kubectl exec -n $NAMESPACE deployment/postgres -- pg_isready -U postgres 2>/dev/null || echo "failed")

    if [[ $db_status == *"accepting connections"* ]]; then
        log_success "Database is accepting connections"
    else
        log_error "Database connectivity check failed"
        return 1
    fi

    # Check database performance
    local active_connections=$(kubectl exec -n $NAMESPACE deployment/postgres -- psql -U postgres -d inventory_production -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ' || echo "0")

    if [ "$active_connections" -lt 50 ]; then
        log_success "Database has $active_connections active connections (healthy)"
    else
        log_warning "Database has $active_connections active connections (monitor closely)"
    fi
}

check_redis_connectivity() {
    log_info "Checking Redis connectivity..."

    local redis_status=$(kubectl exec -n $NAMESPACE deployment/redis -- redis-cli ping 2>/dev/null || echo "failed")

    if [ "$redis_status" = "PONG" ]; then
        log_success "Redis is responding to ping"
    else
        log_error "Redis connectivity check failed"
        return 1
    fi

    # Check Redis memory usage
    local memory_usage=$(kubectl exec -n $NAMESPACE deployment/redis -- redis-cli info memory | grep used_memory_human: | cut -d: -f2 | tr -d '\r' || echo "unknown")
    log_info "Redis memory usage: $memory_usage"
}

check_api_health() {
    log_info "Checking API health endpoint..."

    local retry_count=0
    while [ $retry_count -lt $MAX_RETRIES ]; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $HEALTH_CHECK_TIMEOUT "$API_ENDPOINT/health" || echo "000")

        if [ "$response" = "200" ]; then
            log_success "API health endpoint returned 200"

            # Check API response time
            local response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time $HEALTH_CHECK_TIMEOUT "$API_ENDPOINT/health" || echo "timeout")
            if (( $(echo "$response_time < 2.0" | bc -l) )); then
                log_success "API response time: ${response_time}s (good)"
            else
                log_warning "API response time: ${response_time}s (slow)"
            fi

            return 0
        else
            log_warning "API health check attempt $((retry_count + 1))/$MAX_RETRIES failed (HTTP $response)"
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $MAX_RETRIES ]; then
                sleep $RETRY_DELAY
            fi
        fi
    done

    log_error "API health endpoint failed after $MAX_RETRIES attempts"
    return 1
}

check_frontend_health() {
    log_info "Checking frontend availability..."

    local retry_count=0
    while [ $retry_count -lt $MAX_RETRIES ]; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $HEALTH_CHECK_TIMEOUT "$FRONTEND_ENDPOINT/health" || echo "000")

        if [ "$response" = "200" ]; then
            log_success "Frontend health endpoint returned 200"
            return 0
        else
            log_warning "Frontend health check attempt $((retry_count + 1))/$MAX_RETRIES failed (HTTP $response)"
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $MAX_RETRIES ]; then
                sleep $RETRY_DELAY
            fi
        fi
    done

    log_error "Frontend health endpoint failed after $MAX_RETRIES attempts"
    return 1
}

check_api_functionality() {
    log_info "Testing API functionality..."

    # Test basic API endpoints
    local endpoints=("/api/v1/health" "/api/v1/analytics/summary")

    for endpoint in "${endpoints[@]}"; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $HEALTH_CHECK_TIMEOUT "$API_ENDPOINT$endpoint" || echo "000")

        if [ "$response" = "200" ] || [ "$response" = "401" ]; then  # 401 is acceptable for protected endpoints
            log_success "API endpoint $endpoint is responding (HTTP $response)"
        else
            log_error "API endpoint $endpoint failed (HTTP $response)"
            return 1
        fi
    done
}

check_websocket_functionality() {
    log_info "Testing WebSocket connectivity..."

    # Use a simple WebSocket test
    local ws_test=$(timeout 10 python3 -c "
import asyncio
import websockets
import ssl

async def test_websocket():
    try:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        uri = 'wss://api.inventory.candlefish.ai/ws/photos'
        async with websockets.connect(uri, ssl=ssl_context, timeout=5):
            print('WebSocket connection successful')
            return True
    except Exception as e:
        print(f'WebSocket connection failed: {e}')
        return False

asyncio.run(test_websocket())
" 2>/dev/null || echo "WebSocket test failed")

    if [[ $ws_test == *"successful"* ]]; then
        log_success "WebSocket connection test passed"
    else
        log_warning "WebSocket connection test failed (this may be expected if authentication is required)"
    fi
}

check_resource_usage() {
    log_info "Checking resource usage..."

    # Check CPU usage
    local cpu_usage=$(kubectl top pods -n $NAMESPACE --no-headers | awk '{sum+=$2} END {print sum/NR}' || echo "0")
    log_info "Average CPU usage: ${cpu_usage}m"

    # Check memory usage
    local memory_usage=$(kubectl top pods -n $NAMESPACE --no-headers | awk '{sum+=$3} END {print sum/NR}' || echo "0")
    log_info "Average memory usage: ${memory_usage}Mi"

    # Check if any pods are using too much memory
    local high_memory_pods=$(kubectl top pods -n $NAMESPACE --no-headers | awk '$3 > 400 {print $1}' || true)
    if [ -n "$high_memory_pods" ]; then
        log_warning "Pods with high memory usage (>400Mi):"
        echo "$high_memory_pods"
    fi
}

check_monitoring() {
    log_info "Checking monitoring stack..."

    # Check if Prometheus is running
    local prometheus_status=$(kubectl get pods -n $NAMESPACE -l app=prometheus -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "NotFound")

    if [ "$prometheus_status" = "Running" ]; then
        log_success "Prometheus is running"

        # Test Prometheus endpoint
        local prom_response=$(kubectl exec -n $NAMESPACE deployment/prometheus -- wget -q -O- http://localhost:9090/-/healthy 2>/dev/null || echo "failed")
        if [ "$prom_response" = "Prometheus is Healthy." ]; then
            log_success "Prometheus health check passed"
        else
            log_warning "Prometheus health check failed"
        fi
    else
        log_warning "Prometheus is not running (status: $prometheus_status)"
    fi

    # Check if Grafana is running
    local grafana_status=$(kubectl get pods -n $NAMESPACE -l app=grafana -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "NotFound")

    if [ "$grafana_status" = "Running" ]; then
        log_success "Grafana is running"
    else
        log_warning "Grafana is not running (status: $grafana_status)"
    fi
}

check_security() {
    log_info "Checking security configurations..."

    # Check if pods are running as non-root
    local root_pods=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.spec.securityContext.runAsUser}{"\n"}{end}' | grep " 0$" || true)

    if [ -z "$root_pods" ]; then
        log_success "No pods running as root user"
    else
        log_warning "Some pods may be running as root:"
        echo "$root_pods"
    fi

    # Check for read-only root filesystem
    local rw_pods=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{range .spec.containers[*]}{$.metadata.name}{" "}{.securityContext.readOnlyRootFilesystem}{"\n"}{end}{end}' | grep " false$" || true)

    if [ -z "$rw_pods" ]; then
        log_success "All containers have read-only root filesystem"
    else
        log_info "Some containers have writable root filesystem (may be expected):"
        echo "$rw_pods"
    fi
}

generate_health_report() {
    log_info "Generating health check report..."

    local report_file="/tmp/health_check_report_$(date +%Y%m%d_%H%M%S).json"

    kubectl get pods -n $NAMESPACE -o json > "$report_file.pods"
    kubectl get services -n $NAMESPACE -o json > "$report_file.services"
    kubectl get rollouts -n $NAMESPACE -o json > "$report_file.rollouts"

    # Create summary report
    cat > "$report_file" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "namespace": "$NAMESPACE",
  "health_check_passed": $([ ! -f /tmp/health_check_failed ] && echo "true" || echo "false"),
  "components": {
    "database": "$(kubectl get pods -n $NAMESPACE -l app=postgres -o jsonpath='{.items[0].status.phase}')",
    "redis": "$(kubectl get pods -n $NAMESPACE -l app=redis -o jsonpath='{.items[0].status.phase}')",
    "backend": "$(kubectl get pods -n $NAMESPACE -l app=inventory-backend -o jsonpath='{.items[0].status.phase}')",
    "frontend": "$(kubectl get pods -n $NAMESPACE -l app=inventory-frontend -o jsonpath='{.items[0].status.phase}')"
  },
  "urls_tested": [
    "$API_ENDPOINT/health",
    "$FRONTEND_ENDPOINT/health"
  ]
}
EOF

    log_info "Health report saved to: $report_file"
}

main() {
    log_info "Starting production health checks for inventory management system..."
    log_info "Namespace: $NAMESPACE"
    log_info "Timestamp: $(date)"

    # Remove any existing failure marker
    rm -f /tmp/health_check_failed

    # Comprehensive health checks
    check_pod_status || true
    check_services || true
    check_database_connectivity || true
    check_redis_connectivity || true

    # Wait a bit for services to fully stabilize
    log_info "Waiting 30 seconds for services to stabilize..."
    sleep 30

    check_api_health || true
    check_frontend_health || true
    check_api_functionality || true
    check_websocket_functionality || true
    check_resource_usage || true
    check_monitoring || true
    check_security || true

    # Generate final report
    generate_health_report

    # Final status
    if [ -f /tmp/health_check_failed ]; then
        log_error "❌ Health checks FAILED - Some components are not healthy"
        log_error "Review the errors above and consider rolling back the deployment"
        exit 1
    else
        log_success "✅ All health checks PASSED - Deployment is healthy"
        log_success "System is ready for production traffic"
        exit 0
    fi
}

# Run main function
main "$@"
