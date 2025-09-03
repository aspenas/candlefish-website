#!/bin/bash
# Deployment Verification Script for Bioluminescent Candlefish Animation
# Comprehensive post-deployment validation and health checks

set -e

# Configuration
NAMESPACE="${NAMESPACE:-production}"
APP_NAME="candlefish-website"
DOMAIN="${DOMAIN:-candlefish.ai}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
ANIMATION_TEST_TIMEOUT="${ANIMATION_TEST_TIMEOUT:-60}"
PERFORMANCE_THRESHOLD_MS="${PERFORMANCE_THRESHOLD_MS:-2000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

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

log_test() {
    echo -e "${BLUE}[TEST]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Test result functions
test_passed() {
    local test_name="$1"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
    log_info "✅ $test_name - PASSED"
}

test_failed() {
    local test_name="$1"
    local error_message="${2:-No details provided}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
    log_error "❌ $test_name - FAILED: $error_message"
}

# Function to check Kubernetes cluster connectivity
check_cluster_connectivity() {
    log_test "Checking Kubernetes cluster connectivity"
    
    if kubectl cluster-info &> /dev/null; then
        test_passed "Kubernetes cluster connectivity"
    else
        test_failed "Kubernetes cluster connectivity" "Cannot connect to cluster"
        return 1
    fi
}

# Function to verify deployment status
verify_deployment_status() {
    log_test "Verifying deployment status"
    
    # Check if deployment exists
    if ! kubectl get deployment "$APP_NAME" -n "$NAMESPACE" &> /dev/null; then
        test_failed "Deployment existence" "Deployment $APP_NAME not found in namespace $NAMESPACE"
        return 1
    fi
    
    # Check deployment status
    local available_replicas
    available_replicas=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.status.availableReplicas}' 2>/dev/null || echo "0")
    
    local desired_replicas
    desired_replicas=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [ "$available_replicas" -eq "$desired_replicas" ] && [ "$available_replicas" -gt 0 ]; then
        test_passed "Deployment replica status ($available_replicas/$desired_replicas)"
    else
        test_failed "Deployment replica status" "Available: $available_replicas, Desired: $desired_replicas"
        return 1
    fi
    
    # Check if pods are running
    local running_pods
    running_pods=$(kubectl get pods -l app="$APP_NAME" -n "$NAMESPACE" --field-selector=status.phase=Running -o name | wc -l)
    
    if [ "$running_pods" -ge 1 ]; then
        test_passed "Pod status ($running_pods pods running)"
    else
        test_failed "Pod status" "No running pods found"
        return 1
    fi
}

# Function to test service connectivity
test_service_connectivity() {
    log_test "Testing service connectivity"
    
    # Check if service exists
    if ! kubectl get service "$APP_NAME" -n "$NAMESPACE" &> /dev/null; then
        test_failed "Service existence" "Service $APP_NAME not found"
        return 1
    fi
    
    # Get service cluster IP
    local cluster_ip
    cluster_ip=$(kubectl get service "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}' 2>/dev/null)
    
    if [ -n "$cluster_ip" ] && [ "$cluster_ip" != "None" ]; then
        test_passed "Service cluster IP assignment ($cluster_ip)"
    else
        test_failed "Service cluster IP assignment" "No valid cluster IP found"
        return 1
    fi
    
    # Test internal connectivity
    if kubectl run connectivity-test-"$(date +%s)" --rm -i --restart=Never --image=curlimages/curl --timeout=30s -- curl -f -m 10 "http://$cluster_ip:3000/api/health" &> /dev/null; then
        test_passed "Internal service connectivity"
    else
        test_failed "Internal service connectivity" "Cannot reach service internally"
    fi
}

# Function to test external accessibility
test_external_accessibility() {
    log_test "Testing external accessibility"
    
    # Test main domain
    if curl -f -s -m 10 "https://$DOMAIN" > /dev/null; then
        test_passed "External HTTPS accessibility"
    else
        test_failed "External HTTPS accessibility" "Cannot reach https://$DOMAIN"
    fi
    
    # Test health endpoint
    if curl -f -s -m 10 "https://$DOMAIN/api/health" > /dev/null; then
        test_passed "Health endpoint accessibility"
    else
        test_failed "Health endpoint accessibility" "Cannot reach health endpoint"
    fi
    
    # Test HTTP to HTTPS redirect
    local redirect_status
    redirect_status=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "http://$DOMAIN" || echo "000")
    
    if [ "$redirect_status" = "301" ] || [ "$redirect_status" = "302" ]; then
        test_passed "HTTP to HTTPS redirect ($redirect_status)"
    else
        test_failed "HTTP to HTTPS redirect" "Got status $redirect_status instead of 301/302"
    fi
}

# Function to test bioluminescent animation functionality
test_animation_functionality() {
    log_test "Testing bioluminescent animation functionality"
    
    # Test animation status endpoint
    local animation_response
    animation_response=$(curl -s -m "$ANIMATION_TEST_TIMEOUT" "https://$DOMAIN/api/animation/status" 2>/dev/null || echo "")
    
    if [ -n "$animation_response" ]; then
        # Check if response contains expected animation data
        if echo "$animation_response" | grep -q "particles\|webgl\|status"; then
            test_passed "Animation status endpoint"
        else
            test_failed "Animation status endpoint" "Invalid response format"
        fi
    else
        test_failed "Animation status endpoint" "No response received"
    fi
    
    # Test WebSocket endpoint for animation
    if command -v wscat &> /dev/null; then
        local ws_test_result
        ws_test_result=$(timeout 10 wscat -c "wss://$DOMAIN/ws" -x '{"type":"ping"}' 2>/dev/null || echo "failed")
        
        if [ "$ws_test_result" != "failed" ]; then
            test_passed "WebSocket connectivity"
        else
            test_failed "WebSocket connectivity" "WebSocket connection failed"
        fi
    else
        log_warn "wscat not available, skipping WebSocket test"
    fi
    
    # Test animation assets loading
    local animation_js
    animation_js=$(curl -s -I -m 10 "https://$DOMAIN/_next/static/js" | grep -i "200\|cache" | head -1)
    
    if [ -n "$animation_js" ]; then
        test_passed "Animation assets accessibility"
    else
        test_failed "Animation assets accessibility" "Cannot access static assets"
    fi
}

# Function to test performance metrics
test_performance_metrics() {
    log_test "Testing performance metrics"
    
    # Test page load time
    local start_time
    start_time=$(date +%s%3N)
    
    if curl -s -m 30 "https://$DOMAIN" > /dev/null; then
        local end_time
        end_time=$(date +%s%3N)
        local load_time
        load_time=$((end_time - start_time))
        
        if [ "$load_time" -lt "$PERFORMANCE_THRESHOLD_MS" ]; then
            test_passed "Page load performance (${load_time}ms < ${PERFORMANCE_THRESHOLD_MS}ms)"
        else
            test_failed "Page load performance" "Load time ${load_time}ms exceeds threshold ${PERFORMANCE_THRESHOLD_MS}ms"
        fi
    else
        test_failed "Page load test" "Could not load page for performance test"
    fi
    
    # Test API response time
    start_time=$(date +%s%3N)
    
    if curl -s -m 10 "https://$DOMAIN/api/health" > /dev/null; then
        end_time=$(date +%s%3N)
        local api_time
        api_time=$((end_time - start_time))
        
        if [ "$api_time" -lt 1000 ]; then  # 1 second threshold for API
            test_passed "API response time (${api_time}ms < 1000ms)"
        else
            test_failed "API response time" "Response time ${api_time}ms exceeds 1000ms threshold"
        fi
    else
        test_failed "API response test" "Could not reach API for performance test"
    fi
}

# Function to test SSL certificate
test_ssl_certificate() {
    log_test "Testing SSL certificate"
    
    # Check SSL certificate validity
    local ssl_check
    ssl_check=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "failed")
    
    if [ "$ssl_check" != "failed" ]; then
        # Check expiration date
        local not_after
        not_after=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        
        if [ -n "$not_after" ]; then
            local expiry_timestamp
            expiry_timestamp=$(date -d "$not_after" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$not_after" +%s 2>/dev/null)
            local current_timestamp
            current_timestamp=$(date +%s)
            local days_until_expiry
            days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
            
            if [ "$days_until_expiry" -gt 30 ]; then
                test_passed "SSL certificate validity ($days_until_expiry days remaining)"
            else
                test_failed "SSL certificate validity" "Certificate expires in $days_until_expiry days"
            fi
        else
            test_failed "SSL certificate validity" "Could not parse expiration date"
        fi
    else
        test_failed "SSL certificate validity" "Could not retrieve certificate"
    fi
}

# Function to generate verification report
generate_report() {
    local report_file="/tmp/deployment-verification-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
    "verification_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$NAMESPACE",
    "application": "$APP_NAME",
    "domain": "$DOMAIN",
    "test_summary": {
        "total_tests": $TOTAL_TESTS,
        "passed_tests": $PASSED_TESTS,
        "failed_tests": $FAILED_TESTS,
        "success_rate": "$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%"
    },
    "deployment_info": {
        "kubectl_context": "$(kubectl config current-context 2>/dev/null || echo 'unknown')",
        "cluster_server": "$(kubectl config view --minify -o jsonpath='{.clusters[].cluster.server}' 2>/dev/null || echo 'unknown')",
        "app_revision": "$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}' 2>/dev/null || echo 'unknown')",
        "ready_replicas": "$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 'unknown')"
    },
    "verification_status": "$([ $FAILED_TESTS -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
}
EOF

    log_info "Verification report generated: $report_file"
    cat "$report_file"
}

# Main execution function
main() {
    local start_time
    start_time=$(date +%s)
    
    log_info "🔍 Starting deployment verification for $APP_NAME"
    log_info "Environment: $NAMESPACE"
    log_info "Domain: $DOMAIN"
    echo ""
    
    # Run all verification tests
    check_cluster_connectivity
    verify_deployment_status
    test_service_connectivity
    test_external_accessibility
    test_animation_functionality
    test_performance_metrics
    test_ssl_certificate
    
    # Calculate results
    local end_time
    end_time=$(date +%s)
    local duration
    duration=$((end_time - start_time))
    
    echo ""
    log_info "📊 Verification Summary"
    log_info "======================="
    log_info "Total tests: $TOTAL_TESTS"
    log_info "Passed: $PASSED_TESTS"
    log_info "Failed: $FAILED_TESTS"
    log_info "Duration: ${duration}s"
    
    local success_rate
    success_rate=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
    log_info "Success rate: ${success_rate}%"
    
    # Generate report
    generate_report
    
    # Final result
    if [ $FAILED_TESTS -eq 0 ]; then
        log_info "✅ All verification tests passed!"
        exit 0
    else
        log_error "❌ $FAILED_TESTS verification test(s) failed!"
        exit 1
    fi
}

# Handle script interruption
cleanup() {
    log_warn "Verification interrupted, cleaning up..."
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
            echo "  --help, -h                  Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  NAMESPACE                   Kubernetes namespace (default: production)"
            echo "  DOMAIN                      Domain to test (default: candlefish.ai)"
            echo "  HEALTH_CHECK_TIMEOUT        Health check timeout (default: 300s)"
            echo "  ANIMATION_TEST_TIMEOUT      Animation test timeout (default: 60s)"
            echo "  PERFORMANCE_THRESHOLD_MS    Performance threshold in ms (default: 2000)"
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