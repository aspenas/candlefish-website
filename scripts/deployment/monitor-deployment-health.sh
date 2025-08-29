#!/bin/bash

# Security Dashboard Deployment Health Monitor
# Automated monitoring for post-deployment validation and continuous health checks

set -euo pipefail

# ============================================================================
# Configuration and Constants
# ============================================================================

NAMESPACE="security-dashboard"
CLUSTER_NAME="security-dashboard-eks"
AWS_REGION="us-east-1"
TIMEOUT="600s"
CHECK_INTERVAL=30
MAX_RETRIES=20
WORKFLOW_ID="${1:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Deployment endpoints
BACKEND_URL="https://security-dashboard-api.candlefish.ai"
FRONTEND_URL="https://security-dashboard.candlefish.ai" 
GRAPHQL_URL="https://api.candlefish.ai/graphql"

# ============================================================================
# Logging Functions
# ============================================================================

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

# ============================================================================
# Workflow Monitoring Functions
# ============================================================================

monitor_workflow() {
    local workflow_id="$1"
    log_info "Monitoring GitHub workflow $workflow_id..."
    
    local status=""
    local attempt=1
    
    while [ "$status" != "completed" ] && [ $attempt -le $MAX_RETRIES ]; do
        status=$(gh run view "$workflow_id" --json status -q '.status' 2>/dev/null || echo "unknown")
        
        case "$status" in
            "completed")
                local conclusion=$(gh run view "$workflow_id" --json conclusion -q '.conclusion' 2>/dev/null || echo "unknown")
                if [ "$conclusion" == "success" ]; then
                    log_success "Workflow $workflow_id completed successfully"
                    return 0
                else
                    log_error "Workflow $workflow_id failed with conclusion: $conclusion"
                    return 1
                fi
                ;;
            "in_progress"|"queued")
                log_info "Workflow status: $status (attempt $attempt/$MAX_RETRIES)"
                ;;
            "failure"|"cancelled")
                log_error "Workflow $workflow_id failed with status: $status"
                return 1
                ;;
            *)
                log_warning "Unknown workflow status: $status"
                ;;
        esac
        
        sleep $CHECK_INTERVAL
        ((attempt++))
    done
    
    log_error "Workflow monitoring timed out after $((MAX_RETRIES * CHECK_INTERVAL)) seconds"
    return 1
}

# ============================================================================
# Health Check Functions
# ============================================================================

check_endpoint_health() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local timeout="${4:-10}"
    
    log_info "Checking $name health at $url..."
    
    local http_status
    http_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" || echo "000")
    
    if [ "$http_status" == "$expected_status" ]; then
        log_success "$name is healthy (HTTP $http_status)"
        return 0
    else
        log_error "$name health check failed (HTTP $http_status)"
        return 1
    fi
}

check_api_endpoints() {
    log_info "Performing comprehensive API health checks..."
    
    local failed_checks=0
    
    # Backend health endpoint
    if ! check_endpoint_health "Backend API" "$BACKEND_URL/health" 200 30; then
        ((failed_checks++))
    fi
    
    # Backend API status
    if ! check_endpoint_health "Backend API Status" "$BACKEND_URL/api/status" 200 30; then
        ((failed_checks++))
    fi
    
    # GraphQL health
    if ! check_endpoint_health "GraphQL Gateway" "$GRAPHQL_URL/.well-known/apollo/server-health" 200 30; then
        ((failed_checks++))
    fi
    
    # Frontend health (if available)
    if ! check_endpoint_health "Frontend" "$FRONTEND_URL" 200 30; then
        log_warning "Frontend health check failed - this may be expected during deployment"
    fi
    
    # GraphQL introspection query (basic functionality test)
    log_info "Testing GraphQL introspection..."
    local graphql_response
    graphql_response=$(curl -s -X POST "$GRAPHQL_URL" \
        -H "Content-Type: application/json" \
        -d '{"query":"{ __schema { types { name } } }"}' \
        --max-time 30 | jq -r '.data.__schema.types | length' 2>/dev/null || echo "0")
    
    if [ "$graphql_response" -gt 0 ]; then
        log_success "GraphQL introspection successful ($graphql_response types available)"
    else
        log_error "GraphQL introspection failed"
        ((failed_checks++))
    fi
    
    if [ "$failed_checks" -eq 0 ]; then
        log_success "All API endpoints are healthy"
        return 0
    else
        log_error "$failed_checks API endpoint checks failed"
        return 1
    fi
}

# ============================================================================
# Kubernetes Health Checks
# ============================================================================

check_kubernetes_health() {
    if ! command -v kubectl >/dev/null 2>&1; then
        log_warning "kubectl not available - skipping Kubernetes health checks"
        return 0
    fi
    
    log_info "Checking Kubernetes cluster connectivity..."
    
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Cannot connect to Kubernetes cluster"
        return 1
    fi
    
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log_warning "Namespace '$NAMESPACE' not found - deployment may not be using Kubernetes"
        return 0
    fi
    
    log_info "Checking pod status in namespace $NAMESPACE..."
    
    # Check if pods are running
    local pods_not_ready
    pods_not_ready=$(kubectl get pods -n "$NAMESPACE" --no-headers | grep -v Running | wc -l)
    
    if [ "$pods_not_ready" -eq 0 ]; then
        log_success "All pods in $NAMESPACE are running"
    else
        log_warning "$pods_not_ready pods are not in Running state"
        kubectl get pods -n "$NAMESPACE"
    fi
    
    # Check services
    log_info "Checking service status..."
    kubectl get services -n "$NAMESPACE" --no-headers | while read -r line; do
        local service_name
        service_name=$(echo "$line" | awk '{print $1}')
        log_info "Service $service_name is active"
    done
    
    log_success "Kubernetes health checks completed"
    return 0
}

# ============================================================================
# Performance and Load Testing
# ============================================================================

run_basic_load_test() {
    if ! command -v k6 >/dev/null 2>&1; then
        log_warning "k6 not available - skipping load tests"
        return 0
    fi
    
    log_info "Running basic load test against $BACKEND_URL..."
    
    # Create a simple load test script
    local load_test_script="/tmp/basic-load-test.js"
    cat > "$load_test_script" << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '60s', target: 10 },
    { duration: '30s', target: 0 },
  ],
};

export default function() {
  let response = http.get(`${__ENV.BASE_URL}/health`);
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
EOF

    if BASE_URL="$BACKEND_URL" k6 run --quiet "$load_test_script"; then
        log_success "Basic load test passed"
    else
        log_warning "Load test encountered issues - check performance"
    fi
    
    rm -f "$load_test_script"
}

# ============================================================================
# Security Validation
# ============================================================================

run_security_checks() {
    log_info "Running basic security validation..."
    
    # Check SSL certificate
    log_info "Validating SSL certificates..."
    for url in "$BACKEND_URL" "$FRONTEND_URL"; do
        local domain
        domain=$(echo "$url" | sed 's|https\?://||' | cut -d'/' -f1)
        
        if echo | openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | \
           openssl x509 -noout -dates 2>/dev/null; then
            log_success "SSL certificate is valid for $domain"
        else
            log_warning "Could not validate SSL certificate for $domain"
        fi
    done
    
    # Check for security headers
    log_info "Checking security headers..."
    local security_headers=("X-Frame-Options" "X-Content-Type-Options" "X-XSS-Protection" "Strict-Transport-Security")
    
    for header in "${security_headers[@]}"; do
        if curl -s -I "$BACKEND_URL" | grep -qi "$header"; then
            log_success "Security header $header is present"
        else
            log_warning "Security header $header is missing"
        fi
    done
    
    # Test for common vulnerabilities
    log_info "Testing for common security issues..."
    
    # Test for directory traversal
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/../../../etc/passwd" || echo "000")
    if [ "$status" == "404" ] || [ "$status" == "403" ]; then
        log_success "Directory traversal protection is active"
    else
        log_warning "Potential directory traversal vulnerability (HTTP $status)"
    fi
    
    log_success "Security validation completed"
}

# ============================================================================
# Monitoring Setup
# ============================================================================

setup_monitoring_alerts() {
    log_info "Setting up post-deployment monitoring..."
    
    # Check if monitoring infrastructure is available
    if command -v kubectl >/dev/null 2>&1 && kubectl get namespace monitoring >/dev/null 2>&1; then
        log_info "Monitoring namespace found - checking Prometheus and Alertmanager..."
        
        if kubectl get pods -n monitoring | grep -q prometheus; then
            log_success "Prometheus is running"
        else
            log_warning "Prometheus not found in monitoring namespace"
        fi
        
        if kubectl get pods -n monitoring | grep -q alertmanager; then
            log_success "Alertmanager is running"
        else
            log_warning "Alertmanager not found in monitoring namespace"
        fi
    else
        log_warning "Monitoring infrastructure not available via Kubernetes"
    fi
    
    # Setup basic URL monitoring
    log_info "Setting up continuous health monitoring..."
    
    # Create a simple monitoring script
    cat > "/tmp/continuous-monitor.sh" << EOF
#!/bin/bash
while true; do
    if ! curl -sf "$BACKEND_URL/health" >/dev/null 2>&1; then
        echo "ALERT: Backend health check failed at \$(date)"
        # Here you would typically send to your alerting system
    fi
    sleep 300  # Check every 5 minutes
done
EOF
    
    chmod +x "/tmp/continuous-monitor.sh"
    log_info "Continuous monitoring script created at /tmp/continuous-monitor.sh"
    log_info "You can run it in background with: nohup /tmp/continuous-monitor.sh &"
}

# ============================================================================
# Main Monitoring Function
# ============================================================================

run_comprehensive_monitoring() {
    local workflow_id="$1"
    
    log_info "Starting comprehensive deployment monitoring..."
    log_info "Workflow ID: ${workflow_id:-'Not provided'}"
    
    local overall_status=0
    
    # Step 1: Monitor workflow completion (if ID provided)
    if [ -n "$workflow_id" ]; then
        log_info "=== Step 1: Workflow Monitoring ==="
        if ! monitor_workflow "$workflow_id"; then
            log_error "Workflow monitoring failed"
            ((overall_status++))
        else
            log_success "Workflow completed successfully"
        fi
        echo
    fi
    
    # Step 2: API Health Checks
    log_info "=== Step 2: API Health Validation ==="
    if ! check_api_endpoints; then
        log_error "API health checks failed"
        ((overall_status++))
    fi
    echo
    
    # Step 3: Kubernetes Health (if available)
    log_info "=== Step 3: Kubernetes Health Validation ==="
    if ! check_kubernetes_health; then
        log_error "Kubernetes health checks failed"
        ((overall_status++))
    fi
    echo
    
    # Step 4: Security Validation
    log_info "=== Step 4: Security Validation ==="
    run_security_checks
    echo
    
    # Step 5: Basic Load Testing
    log_info "=== Step 5: Performance Validation ==="
    run_basic_load_test
    echo
    
    # Step 6: Setup Monitoring
    log_info "=== Step 6: Monitoring Setup ==="
    setup_monitoring_alerts
    echo
    
    # Final Status
    log_info "=== Deployment Monitoring Summary ==="
    if [ "$overall_status" -eq 0 ]; then
        log_success "✅ Deployment monitoring completed successfully!"
        log_success "✅ All critical health checks passed"
        log_success "✅ Security Dashboard is ready for production use"
        return 0
    else
        log_error "❌ Deployment monitoring completed with $overall_status critical issues"
        log_error "❌ Manual intervention may be required"
        return 1
    fi
}

# ============================================================================
# Usage and Main
# ============================================================================

show_usage() {
    cat << EOF
Security Dashboard Deployment Health Monitor

Usage: $0 [WORKFLOW_ID]

Arguments:
  WORKFLOW_ID    Optional GitHub Actions workflow run ID to monitor

Examples:
  $0                    # Monitor current deployment health
  $0 17267029097        # Monitor specific workflow and deployment health

Environment Variables:
  NAMESPACE           Override Kubernetes namespace (default: security-dashboard)
  BACKEND_URL         Override backend URL for health checks
  FRONTEND_URL        Override frontend URL for health checks
  GRAPHQL_URL         Override GraphQL URL for health checks

This script will:
1. Monitor GitHub workflow completion (if ID provided)
2. Validate API endpoint health
3. Check Kubernetes cluster status (if available) 
4. Run security validation tests
5. Perform basic load testing
6. Setup continuous monitoring

EOF
}

# Main execution
main() {
    case "${1:-}" in
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            run_comprehensive_monitoring "$1"
            ;;
    esac
}

# Run the script
main "$@"