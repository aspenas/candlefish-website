#!/bin/bash

##############################################################################
# Comprehensive Post-Deployment Validation Script for Paintbox
# Validates JWKS endpoint, AWS integration, and application functionality
##############################################################################

set -euo pipefail

# Configuration
APP_NAME="paintbox"
APP_URL="https://${APP_NAME}.fly.dev"
VALIDATION_TIMEOUT=300  # 5 minutes
MAX_RETRIES=10
RETRY_DELAY=15

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Validation results
VALIDATION_RESULTS=()
CRITICAL_FAILURES=0
WARNING_COUNT=0

##############################################################################
# Logging Functions
##############################################################################

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}"
    ((WARNING_COUNT++))
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"
    ((CRITICAL_FAILURES++))
}

add_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"

    VALIDATION_RESULTS+=("$test_name|$status|$message")
}

##############################################################################
# Core Validation Functions
##############################################################################

validate_app_accessibility() {
    log "Validating application accessibility..."

    local retry_count=0
    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        if curl -sf --max-time 10 "$APP_URL" > /dev/null; then
            log_success "Application is accessible"
            add_result "App Accessibility" "PASS" "Application responds to requests"
            return 0
        fi

        ((retry_count++))
        if [[ $retry_count -lt $MAX_RETRIES ]]; then
            log "Retry $retry_count/$MAX_RETRIES - waiting ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
    done

    log_error "Application is not accessible after $MAX_RETRIES attempts"
    add_result "App Accessibility" "FAIL" "Application not responding"
    return 1
}

validate_health_endpoint() {
    log "Validating health endpoint..."

    local response
    if response=$(curl -sf --max-time 10 "$APP_URL/api/health"); then
        # Try to parse as JSON
        if echo "$response" | jq . > /dev/null 2>&1; then
            local status
            status=$(echo "$response" | jq -r '.status // "unknown"')
            if [[ "$status" == "healthy" || "$status" == "ok" ]]; then
                log_success "Health endpoint reports healthy status"
                add_result "Health Endpoint" "PASS" "Status: $status"
            else
                log_warning "Health endpoint reports non-healthy status: $status"
                add_result "Health Endpoint" "WARN" "Status: $status"
            fi
        else
            log_success "Health endpoint is responding (non-JSON response)"
            add_result "Health Endpoint" "PASS" "Endpoint responding"
        fi
        return 0
    else
        log_error "Health endpoint is not responding"
        add_result "Health Endpoint" "FAIL" "Endpoint not responding"
        return 1
    fi
}

validate_jwks_endpoint() {
    log "Validating JWKS endpoint..."

    local jwks_url="$APP_URL/.well-known/jwks.json"
    local response

    if response=$(curl -sf --max-time 10 "$jwks_url"); then
        # Validate JSON structure
        if ! echo "$response" | jq . > /dev/null 2>&1; then
            log_error "JWKS endpoint returns invalid JSON"
            add_result "JWKS Format" "FAIL" "Invalid JSON response"
            return 1
        fi

        # Check for keys array
        local keys_count
        keys_count=$(echo "$response" | jq -r '.keys | length')

        if [[ "$keys_count" -gt 0 ]]; then
            log_success "JWKS endpoint has $keys_count key(s)"
            add_result "JWKS Keys" "PASS" "$keys_count key(s) available"

            # Validate key structure
            local first_key_valid
            first_key_valid=$(echo "$response" | jq -r '.keys[0] | has("kty") and has("kid") and has("n") and has("e")')

            if [[ "$first_key_valid" == "true" ]]; then
                local key_id
                key_id=$(echo "$response" | jq -r '.keys[0].kid')
                log_success "Key structure is valid (Key ID: $key_id)"
                add_result "JWKS Structure" "PASS" "Valid RSA key structure"
            else
                log_error "Key structure is invalid"
                add_result "JWKS Structure" "FAIL" "Missing required fields"
                return 1
            fi
        else
            log_error "JWKS endpoint has no keys"
            add_result "JWKS Keys" "FAIL" "Empty keys array"
            return 1
        fi

        # Check cache headers
        local cache_header
        cache_header=$(curl -sf -I "$jwks_url" | grep -i "cache-control" | cut -d: -f2 | xargs || echo "")
        if [[ -n "$cache_header" ]]; then
            log_success "JWKS has proper cache headers: $cache_header"
            add_result "JWKS Caching" "PASS" "Cache-Control: $cache_header"
        else
            log_warning "JWKS missing cache headers"
            add_result "JWKS Caching" "WARN" "No cache-control header"
        fi

        return 0
    else
        log_error "JWKS endpoint is not accessible"
        add_result "JWKS Endpoint" "FAIL" "Endpoint not accessible"
        return 1
    fi
}

validate_cors_headers() {
    log "Validating CORS headers on JWKS endpoint..."

    local jwks_url="$APP_URL/.well-known/jwks.json"
    local cors_header

    cors_header=$(curl -sf -I "$jwks_url" | grep -i "access-control-allow-origin" | cut -d: -f2 | xargs || echo "")

    if [[ -n "$cors_header" ]]; then
        log_success "CORS headers present: $cors_header"
        add_result "CORS Headers" "PASS" "Access-Control-Allow-Origin: $cors_header"
    else
        log_warning "CORS headers missing from JWKS endpoint"
        add_result "CORS Headers" "WARN" "Missing CORS headers"
    fi
}

validate_ssl_certificate() {
    log "Validating SSL certificate..."

    local hostname
    hostname=$(echo "$APP_URL" | sed 's|https\?://||' | sed 's|/.*||')

    if echo | openssl s_client -connect "$hostname:443" -servername "$hostname" 2>/dev/null | openssl x509 -noout -text | grep -q "Subject:"; then
        local cert_expiry
        cert_expiry=$(echo | openssl s_client -connect "$hostname:443" -servername "$hostname" 2>/dev/null | openssl x509 -noout -dates | grep "notAfter" | cut -d= -f2 || echo "unknown")

        log_success "SSL certificate is valid (expires: $cert_expiry)"
        add_result "SSL Certificate" "PASS" "Valid certificate"
    else
        log_error "SSL certificate validation failed"
        add_result "SSL Certificate" "FAIL" "Certificate issues"
        return 1
    fi
}

validate_response_times() {
    log "Validating response times..."

    local endpoints=("/" "/api/health" "/.well-known/jwks.json")
    local total_time=0
    local endpoint_count=0

    for endpoint in "${endpoints[@]}"; do
        local response_time
        response_time=$(curl -sf -w "%{time_total}" -o /dev/null "$APP_URL$endpoint" 2>/dev/null || echo "999")

        if [[ $(echo "$response_time < 2.0" | bc -l) -eq 1 ]]; then
            log_success "$endpoint responds in ${response_time}s"
        else
            log_warning "$endpoint slow response: ${response_time}s"
        fi

        total_time=$(echo "$total_time + $response_time" | bc -l)
        ((endpoint_count++))
    done

    local avg_time
    avg_time=$(echo "scale=3; $total_time / $endpoint_count" | bc -l)

    if [[ $(echo "$avg_time < 1.0" | bc -l) -eq 1 ]]; then
        log_success "Average response time: ${avg_time}s"
        add_result "Response Times" "PASS" "Average: ${avg_time}s"
    else
        log_warning "Average response time slow: ${avg_time}s"
        add_result "Response Times" "WARN" "Average: ${avg_time}s"
    fi
}

validate_security_headers() {
    log "Validating security headers..."

    local security_headers=("x-frame-options" "x-content-type-options" "x-xss-protection")
    local missing_headers=()

    for header in "${security_headers[@]}"; do
        if curl -sf -I "$APP_URL" | grep -qi "$header"; then
            local value
            value=$(curl -sf -I "$APP_URL" | grep -i "$header" | cut -d: -f2 | xargs)
            log_success "Security header present: $header: $value"
        else
            missing_headers+=("$header")
        fi
    done

    if [[ ${#missing_headers[@]} -eq 0 ]]; then
        add_result "Security Headers" "PASS" "All security headers present"
    else
        log_warning "Missing security headers: ${missing_headers[*]}"
        add_result "Security Headers" "WARN" "Missing: ${missing_headers[*]}"
    fi
}

validate_fly_deployment_status() {
    log "Validating Fly.io deployment status..."

    if command -v flyctl &> /dev/null; then
        if flyctl status --app "$APP_NAME" > /dev/null 2>&1; then
            local machine_count
            machine_count=$(flyctl status --app "$APP_NAME" --json | jq -r '.Machines | length' 2>/dev/null || echo "0")

            local healthy_count
            healthy_count=$(flyctl status --app "$APP_NAME" --json | jq -r '.Machines | map(select(.state == "started")) | length' 2>/dev/null || echo "0")

            if [[ "$healthy_count" -gt 0 ]]; then
                log_success "Fly.io deployment: $healthy_count/$machine_count machines healthy"
                add_result "Fly Deployment" "PASS" "$healthy_count/$machine_count machines healthy"
            else
                log_error "Fly.io deployment: no healthy machines"
                add_result "Fly Deployment" "FAIL" "No healthy machines"
                return 1
            fi
        else
            log_warning "Cannot check Fly.io status (authentication issues?)"
            add_result "Fly Deployment" "WARN" "Cannot check status"
        fi
    else
        log_warning "flyctl not available, skipping Fly.io deployment check"
        add_result "Fly Deployment" "SKIP" "flyctl not available"
    fi
}

##############################################################################
# Load Testing
##############################################################################

run_basic_load_test() {
    log "Running basic load test..."

    if command -v ab &> /dev/null; then
        # Run Apache Bench with 50 requests, 5 concurrent
        local ab_result
        if ab_result=$(ab -n 50 -c 5 "$APP_URL/" 2>&1); then
            local requests_per_second
            requests_per_second=$(echo "$ab_result" | grep "Requests per second" | awk '{print $4}' || echo "0")

            if [[ $(echo "$requests_per_second > 10" | bc -l) -eq 1 ]]; then
                log_success "Load test passed: ${requests_per_second} req/sec"
                add_result "Load Test" "PASS" "${requests_per_second} req/sec"
            else
                log_warning "Load test performance: ${requests_per_second} req/sec"
                add_result "Load Test" "WARN" "${requests_per_second} req/sec"
            fi
        else
            log_warning "Load test failed to complete"
            add_result "Load Test" "WARN" "Test failed"
        fi
    else
        log "Apache Bench (ab) not available, skipping load test"
        add_result "Load Test" "SKIP" "ab not available"
    fi
}

##############################################################################
# Report Generation
##############################################################################

generate_validation_report() {
    log "Generating validation report..."

    echo ""
    echo "=================================="
    echo "  DEPLOYMENT VALIDATION REPORT"
    echo "=================================="
    echo "Application: $APP_NAME"
    echo "URL: $APP_URL"
    echo "Validation Time: $(date)"
    echo ""

    printf "%-20s %-10s %s\n" "TEST" "STATUS" "MESSAGE"
    echo "--------------------------------------------------"

    for result in "${VALIDATION_RESULTS[@]}"; do
        IFS='|' read -r test_name status message <<< "$result"

        case $status in
            "PASS") status_colored="${GREEN}PASS${NC}" ;;
            "WARN") status_colored="${YELLOW}WARN${NC}" ;;
            "FAIL") status_colored="${RED}FAIL${NC}" ;;
            "SKIP") status_colored="${BLUE}SKIP${NC}" ;;
            *) status_colored="$status" ;;
        esac

        printf "%-20s %-20s %s\n" "$test_name" "$status_colored" "$message"
    done

    echo ""
    echo "Summary:"
    echo "  Critical Failures: $CRITICAL_FAILURES"
    echo "  Warnings: $WARNING_COUNT"
    echo "  Total Tests: ${#VALIDATION_RESULTS[@]}"

    if [[ $CRITICAL_FAILURES -eq 0 ]]; then
        echo -e "\n${GREEN}✓ DEPLOYMENT VALIDATION PASSED${NC}"
        if [[ $WARNING_COUNT -gt 0 ]]; then
            echo -e "${YELLOW}⚠ Note: $WARNING_COUNT warning(s) found${NC}"
        fi
        return 0
    else
        echo -e "\n${RED}✗ DEPLOYMENT VALIDATION FAILED${NC}"
        echo -e "${RED}Critical issues must be resolved before production use${NC}"
        return 1
    fi
}

##############################################################################
# Main Validation Flow
##############################################################################

main() {
    log "Starting comprehensive deployment validation for $APP_NAME"
    log "Target URL: $APP_URL"

    # Core functionality tests
    validate_app_accessibility
    validate_health_endpoint
    validate_jwks_endpoint
    validate_cors_headers

    # Performance and security tests
    validate_ssl_certificate
    validate_response_times
    validate_security_headers

    # Infrastructure tests
    validate_fly_deployment_status

    # Load testing
    run_basic_load_test

    # Generate final report
    if ! generate_validation_report; then
        exit 1
    fi

    log_success "Deployment validation completed successfully"
}

# Help function
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Comprehensive deployment validation for Paintbox"
    echo ""
    echo "Options:"
    echo "  --app-url URL    Override application URL (default: https://paintbox.fly.dev)"
    echo "  --help          Show this help message"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --app-url)
            APP_URL="$2"
            shift 2
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run validation
main
