#!/bin/bash

# Security Dashboard Deployment Validation Script
# Tests frontend deployment for performance, functionality, and security

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
BASE_URL="https://staging.security-dashboard.io"
TIMEOUT=30
VERBOSE=false
PERFORMANCE_BUDGET=500 # ms
BUNDLE_SIZE_LIMIT=500 # KB

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNING_TESTS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

log_test() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[TEST]${NC} $1"
    fi
}

# Help function
show_help() {
    cat << EOF
Security Dashboard Deployment Validation Script

Usage: $0 [OPTIONS]

Options:
    -u, --url URL           Base URL to test [default: staging.security-dashboard.io]
    -t, --timeout SECONDS   Request timeout [default: 30]
    -p, --performance MS    Performance budget in milliseconds [default: 500]
    -s, --size-limit KB     Bundle size limit in KB [default: 500]
    -v, --verbose          Verbose output
    -h, --help             Show this help message

Examples:
    $0 --url https://staging.security-dashboard.io
    $0 -u https://security-dashboard.io -p 300 -s 400
    $0 --verbose

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -p|--performance)
            PERFORMANCE_BUDGET="$2"
            shift 2
            ;;
        -s|--size-limit)
            BUNDLE_SIZE_LIMIT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

log_info "🚀 Starting deployment validation for: $BASE_URL"
log_info "Performance budget: ${PERFORMANCE_BUDGET}ms"
log_info "Bundle size limit: ${BUNDLE_SIZE_LIMIT}KB"

# Test 1: Basic connectivity
test_connectivity() {
    log_test "Testing basic connectivity..."
    
    if curl -sSf --max-time "$TIMEOUT" "$BASE_URL" >/dev/null 2>&1; then
        log_success "Site is accessible"
    else
        log_error "Site is not accessible"
        return 1
    fi
}

# Test 2: HTTPS and security headers
test_security_headers() {
    log_test "Testing security headers..."
    
    local headers
    headers=$(curl -sI --max-time "$TIMEOUT" "$BASE_URL" 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        log_error "Could not fetch headers"
        return 1
    fi
    
    # Check for HTTPS
    if echo "$headers" | grep -q "HTTP/2 200"; then
        log_success "Using HTTP/2"
    elif echo "$headers" | grep -q "HTTP/1.1 200"; then
        log_warning "Using HTTP/1.1 (consider HTTP/2)"
    else
        log_error "Invalid HTTP response"
    fi
    
    # Security headers checks
    local security_headers=(
        "strict-transport-security"
        "x-content-type-options"
        "x-frame-options"
        "content-security-policy"
    )
    
    for header in "${security_headers[@]}"; do
        if echo "$headers" | grep -qi "$header"; then
            log_success "Security header present: $header"
        else
            log_warning "Missing security header: $header"
        fi
    done
}

# Test 3: Performance metrics
test_performance() {
    log_test "Testing performance metrics..."
    
    local start_time
    start_time=$(date +%s%3N)
    
    local response
    response=$(curl -s --max-time "$TIMEOUT" -w "%{time_total},%{time_connect},%{time_starttransfer},%{size_download}" "$BASE_URL" -o /dev/null)
    
    if [[ $? -ne 0 ]]; then
        log_error "Performance test failed"
        return 1
    fi
    
    IFS=',' read -r time_total time_connect time_starttransfer size_download <<< "$response"
    
    # Convert to milliseconds
    local total_ms
    total_ms=$(echo "$time_total * 1000" | bc -l | cut -d. -f1)
    
    local connect_ms
    connect_ms=$(echo "$time_connect * 1000" | bc -l | cut -d. -f1)
    
    local ttfb_ms
    ttfb_ms=$(echo "$time_starttransfer * 1000" | bc -l | cut -d. -f1)
    
    if [[ $total_ms -le $PERFORMANCE_BUDGET ]]; then
        log_success "Page load time: ${total_ms}ms (under budget: ${PERFORMANCE_BUDGET}ms)"
    else
        log_warning "Page load time: ${total_ms}ms (over budget: ${PERFORMANCE_BUDGET}ms)"
    fi
    
    if [[ $ttfb_ms -le 200 ]]; then
        log_success "Time to first byte: ${ttfb_ms}ms"
    else
        log_warning "Time to first byte: ${ttfb_ms}ms (>200ms)"
    fi
    
    log_info "Connect time: ${connect_ms}ms"
    log_info "Downloaded: $((size_download / 1024))KB"
}

# Test 4: Bundle size analysis
test_bundle_size() {
    log_test "Testing bundle sizes..."
    
    local main_page
    main_page=$(curl -s --max-time "$TIMEOUT" "$BASE_URL")
    
    if [[ $? -ne 0 ]]; then
        log_error "Could not fetch main page for bundle analysis"
        return 1
    fi
    
    # Extract script and stylesheet URLs
    local scripts
    scripts=$(echo "$main_page" | grep -oE 'src="[^"]*\.js"' | sed 's/src="//g' | sed 's/"//g')
    
    local styles
    styles=$(echo "$main_page" | grep -oE 'href="[^"]*\.css"' | sed 's/href="//g' | sed 's/"//g')
    
    local total_js_size=0
    local total_css_size=0
    
    # Test JavaScript bundles
    while IFS= read -r script; do
        if [[ -n "$script" ]]; then
            local url
            if [[ "$script" == /* ]]; then
                url="${BASE_URL}${script}"
            else
                url="$script"
            fi
            
            local size
            size=$(curl -sI --max-time "$TIMEOUT" "$url" | grep -i content-length | awk '{print $2}' | tr -d '\r\n')
            
            if [[ -n "$size" ]]; then
                local size_kb=$((size / 1024))
                total_js_size=$((total_js_size + size_kb))
                
                if [[ $size_kb -le 200 ]]; then
                    log_success "JS bundle size: ${size_kb}KB - $(basename "$script")"
                else
                    log_warning "Large JS bundle: ${size_kb}KB - $(basename "$script")"
                fi
            fi
        fi
    done <<< "$scripts"
    
    # Test CSS bundles
    while IFS= read -r style; do
        if [[ -n "$style" ]]; then
            local url
            if [[ "$style" == /* ]]; then
                url="${BASE_URL}${style}"
            else
                url="$style"
            fi
            
            local size
            size=$(curl -sI --max-time "$TIMEOUT" "$url" | grep -i content-length | awk '{print $2}' | tr -d '\r\n')
            
            if [[ -n "$size" ]]; then
                local size_kb=$((size / 1024))
                total_css_size=$((total_css_size + size_kb))
                
                if [[ $size_kb -le 100 ]]; then
                    log_success "CSS bundle size: ${size_kb}KB - $(basename "$style")"
                else
                    log_warning "Large CSS bundle: ${size_kb}KB - $(basename "$style")"
                fi
            fi
        fi
    done <<< "$styles"
    
    local total_size=$((total_js_size + total_css_size))
    
    if [[ $total_size -le $BUNDLE_SIZE_LIMIT ]]; then
        log_success "Total bundle size: ${total_size}KB (under limit: ${BUNDLE_SIZE_LIMIT}KB)"
    else
        log_warning "Total bundle size: ${total_size}KB (over limit: ${BUNDLE_SIZE_LIMIT}KB)"
    fi
}

# Test 5: Resource availability
test_resources() {
    log_test "Testing critical resources..."
    
    local main_page
    main_page=$(curl -s --max-time "$TIMEOUT" "$BASE_URL")
    
    # Test favicon
    if curl -sSf --max-time 10 "$BASE_URL/favicon.ico" >/dev/null 2>&1; then
        log_success "Favicon accessible"
    else
        log_warning "Favicon not found"
    fi
    
    # Test manifest
    if echo "$main_page" | grep -q 'manifest.webmanifest'; then
        if curl -sSf --max-time 10 "$BASE_URL/manifest.webmanifest" >/dev/null 2>&1; then
            log_success "PWA manifest accessible"
        else
            log_warning "PWA manifest declared but not accessible"
        fi
    fi
    
    # Test service worker
    if curl -sSf --max-time 10 "$BASE_URL/sw.js" >/dev/null 2>&1; then
        log_success "Service worker accessible"
    else
        log_warning "Service worker not found"
    fi
}

# Test 6: Content validation
test_content() {
    log_test "Testing page content..."
    
    local main_page
    main_page=$(curl -s --max-time "$TIMEOUT" "$BASE_URL")
    
    if [[ $? -ne 0 ]]; then
        log_error "Could not fetch page content"
        return 1
    fi
    
    # Check for essential elements
    if echo "$main_page" | grep -q '<title>'; then
        log_success "Page has title"
    else
        log_error "Page missing title"
    fi
    
    if echo "$main_page" | grep -q 'Security Dashboard'; then
        log_success "Page contains expected content"
    else
        log_warning "Page may not contain expected content"
    fi
    
    # Check for React app root
    if echo "$main_page" | grep -q 'id="root"'; then
        log_success "React app root element found"
    else
        log_error "React app root element not found"
    fi
    
    # Check for error indicators
    if echo "$main_page" | grep -qi 'error\|exception\|not found'; then
        log_warning "Page may contain error content"
    fi
}

# Test 7: API endpoints (if available)
test_api_endpoints() {
    log_test "Testing API endpoints..."
    
    local api_base="${BASE_URL/security-dashboard.io/api.security-dashboard.io}"
    
    # Test GraphQL endpoint
    local graphql_url="$api_base/graphql"
    
    if curl -sSf --max-time 10 "$graphql_url" -H "Content-Type: application/json" -d '{"query": "{ __schema { types { name } } }"}' >/dev/null 2>&1; then
        log_success "GraphQL API accessible"
    else
        log_warning "GraphQL API not accessible (may be CORS protected)"
    fi
}

# Test 8: Mobile responsiveness
test_responsive() {
    log_test "Testing mobile responsiveness..."
    
    local mobile_headers="User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
    local mobile_page
    mobile_page=$(curl -s --max-time "$TIMEOUT" -H "$mobile_headers" "$BASE_URL")
    
    if [[ $? -eq 0 ]]; then
        if echo "$mobile_page" | grep -q 'viewport'; then
            log_success "Mobile viewport meta tag found"
        else
            log_warning "Mobile viewport meta tag missing"
        fi
        
        log_success "Site loads on mobile user agent"
    else
        log_error "Site failed to load with mobile user agent"
    fi
}

# Run all tests
main() {
    echo "╭─ Security Dashboard Deployment Validation"
    echo "├─ URL: $BASE_URL"
    echo "├─ Timeout: ${TIMEOUT}s"
    echo "├─ Performance Budget: ${PERFORMANCE_BUDGET}ms"
    echo "╰─ Bundle Size Limit: ${BUNDLE_SIZE_LIMIT}KB"
    echo
    
    test_connectivity || exit 1
    test_security_headers
    test_performance
    test_bundle_size
    test_resources
    test_content
    test_api_endpoints
    test_responsive
    
    echo
    echo "╭─ Validation Results Summary"
    echo "├─ ✅ Passed: $PASSED_TESTS"
    echo "├─ ⚠️  Warnings: $WARNING_TESTS"
    echo "╰─ ❌ Failed: $FAILED_TESTS"
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo
        log_success "🎉 Deployment validation completed successfully!"
        
        if [[ $WARNING_TESTS -gt 0 ]]; then
            log_warning "Consider addressing warnings for optimal performance"
        fi
        
        exit 0
    else
        echo
        log_error "💥 Deployment validation failed with $FAILED_TESTS critical issues"
        exit 1
    fi
}

# Check dependencies
if ! command -v curl >/dev/null 2>&1; then
    log_error "curl is required but not installed"
    exit 1
fi

if ! command -v bc >/dev/null 2>&1; then
    log_error "bc is required but not installed"
    exit 1
fi

main "$@"