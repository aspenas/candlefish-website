#!/bin/bash

# =============================================================================
# Comprehensive Health Check Suite
# Validates deployment health across all services and domains
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/logs/health-check-$(date +%Y%m%d-%H%M%S).log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Health check configuration
TIMEOUT=30
RETRY_COUNT=3
RETRY_DELAY=5
ACCEPTABLE_RESPONSE_TIME=3.0

# Sites to check
declare -A PRODUCTION_SITES=(
    ["docs"]="https://docs.candlefish.ai"
    ["partners"]="https://partners.candlefish.ai"
    ["api"]="https://api.candlefish.ai"
)

declare -A STAGING_SITES=(
    ["docs"]="https://docs-staging.candlefish.ai"
    ["partners"]="https://partners-staging.candlefish.ai"
    ["api"]="https://api-staging.candlefish.ai"
)

# Environment selection
ENVIRONMENT="${1:-production}"
case "$ENVIRONMENT" in
    "production")
        declare -n SITES=PRODUCTION_SITES
        ;;
    "staging")
        declare -n SITES=STAGING_SITES
        ;;
    *)
        echo "Usage: $0 [production|staging]"
        exit 1
        ;;
esac

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "${BLUE}$*${NC}"; }
log_success() { log "SUCCESS" "${GREEN}$*${NC}"; }
log_warn() { log "WARN" "${YELLOW}$*${NC}"; }
log_error() { log "ERROR" "${RED}$*${NC}"; }

# Health check counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

increment_total() { ((TOTAL_CHECKS++)); }
increment_passed() { ((PASSED_CHECKS++)); }
increment_failed() { ((FAILED_CHECKS++)); }
increment_warning() { ((WARNING_CHECKS++)); }

# HTTP health check with retries
http_health_check() {
    local url="$1"
    local name="$2"
    local expected_status="${3:-200}"

    increment_total
    log_info "Checking HTTP health: $name ($url)"

    local attempts=0
    while [ $attempts -lt $RETRY_COUNT ]; do
        local start_time=$(date +%s.%3N)

        if response=$(curl -s -o /dev/null -w "%{http_code}:%{time_total}" \
                          --max-time "$TIMEOUT" \
                          --connect-timeout 10 \
                          "$url" 2>/dev/null); then

            local end_time=$(date +%s.%3N)
            local http_code="${response%:*}"
            local response_time="${response#*:}"

            if [ "$http_code" = "$expected_status" ]; then
                # Check response time
                if (( $(echo "$response_time < $ACCEPTABLE_RESPONSE_TIME" | bc -l 2>/dev/null || echo "0") )); then
                    log_success "✅ $name: HTTP $http_code (${response_time}s)"
                    increment_passed
                    return 0
                else
                    log_warn "⚠️ $name: HTTP $http_code but slow response (${response_time}s)"
                    increment_warning
                    return 0
                fi
            else
                log_error "❌ $name: HTTP $http_code (expected $expected_status)"
            fi
        else
            log_error "❌ $name: Connection failed (attempt $((attempts + 1))/$RETRY_COUNT)"
        fi

        attempts=$((attempts + 1))
        if [ $attempts -lt $RETRY_COUNT ]; then
            sleep $RETRY_DELAY
        fi
    done

    increment_failed
    return 1
}

# SSL certificate check
ssl_certificate_check() {
    local url="$1"
    local name="$2"

    increment_total
    log_info "Checking SSL certificate: $name"

    # Extract hostname from URL
    local hostname=$(echo "$url" | sed 's|https\?://||' | sed 's|/.*||')

    if cert_info=$(echo | openssl s_client -connect "${hostname}:443" -servername "$hostname" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null); then
        # Check if certificate is valid
        local not_after=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
        local expiry_date=$(date -d "$not_after" +%s 2>/dev/null || echo "0")
        local current_date=$(date +%s)
        local days_until_expiry=$(( (expiry_date - current_date) / 86400 ))

        if [ $days_until_expiry -gt 30 ]; then
            log_success "✅ $name: SSL certificate valid (expires in $days_until_expiry days)"
            increment_passed
        elif [ $days_until_expiry -gt 0 ]; then
            log_warn "⚠️ $name: SSL certificate expires soon ($days_until_expiry days)"
            increment_warning
        else
            log_error "❌ $name: SSL certificate expired"
            increment_failed
            return 1
        fi
    else
        log_error "❌ $name: SSL certificate check failed"
        increment_failed
        return 1
    fi
}

# DNS resolution check
dns_check() {
    local url="$1"
    local name="$2"

    increment_total
    log_info "Checking DNS resolution: $name"

    # Extract hostname from URL
    local hostname=$(echo "$url" | sed 's|https\?://||' | sed 's|/.*||')

    if nslookup "$hostname" >/dev/null 2>&1; then
        # Get IP addresses
        local ips=$(nslookup "$hostname" | grep -A 10 "Non-authoritative answer:" | grep "Address:" | awk '{print $2}' | tr '\n' ', ' | sed 's/,$//')
        log_success "✅ $name: DNS resolution successful ($ips)"
        increment_passed
    else
        log_error "❌ $name: DNS resolution failed"
        increment_failed
        return 1
    fi
}

# Content validation check
content_check() {
    local url="$1"
    local name="$2"
    local expected_content="${3:-Candlefish}"

    increment_total
    log_info "Checking content validity: $name"

    if content=$(curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null); then
        if echo "$content" | grep -q "$expected_content"; then
            log_success "✅ $name: Content validation passed"
            increment_passed
        else
            log_warn "⚠️ $name: Expected content '$expected_content' not found"
            increment_warning
        fi
    else
        log_error "❌ $name: Content check failed"
        increment_failed
        return 1
    fi
}

# Performance check
performance_check() {
    local url="$1"
    local name="$2"

    increment_total
    log_info "Running performance check: $name"

    # Run multiple requests and average the response time
    local total_time=0
    local successful_requests=0
    local requests=5

    for i in $(seq 1 $requests); do
        if response_time=$(curl -o /dev/null -s -w "%{time_total}" --max-time "$TIMEOUT" "$url" 2>/dev/null); then
            total_time=$(echo "$total_time + $response_time" | bc -l 2>/dev/null || echo "$total_time")
            successful_requests=$((successful_requests + 1))
        fi
    done

    if [ $successful_requests -gt 0 ]; then
        local avg_time=$(echo "scale=3; $total_time / $successful_requests" | bc -l 2>/dev/null || echo "0")

        if (( $(echo "$avg_time < 1.0" | bc -l 2>/dev/null || echo "0") )); then
            log_success "✅ $name: Performance excellent (avg: ${avg_time}s)"
            increment_passed
        elif (( $(echo "$avg_time < 2.0" | bc -l 2>/dev/null || echo "0") )); then
            log_success "✅ $name: Performance good (avg: ${avg_time}s)"
            increment_passed
        elif (( $(echo "$avg_time < 3.0" | bc -l 2>/dev/null || echo "0") )); then
            log_warn "⚠️ $name: Performance acceptable (avg: ${avg_time}s)"
            increment_warning
        else
            log_error "❌ $name: Performance poor (avg: ${avg_time}s)"
            increment_failed
            return 1
        fi
    else
        log_error "❌ $name: All performance test requests failed"
        increment_failed
        return 1
    fi
}

# Accessibility check (basic)
accessibility_check() {
    local url="$1"
    local name="$2"

    increment_total
    log_info "Running accessibility check: $name"

    if content=$(curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null); then
        local issues=0

        # Check for basic accessibility requirements
        if ! echo "$content" | grep -q "<title>"; then
            log_warn "⚠️ $name: Missing page title"
            issues=$((issues + 1))
        fi

        if ! echo "$content" | grep -q 'lang='; then
            log_warn "⚠️ $name: Missing language attribute"
            issues=$((issues + 1))
        fi

        # Check for alt attributes on images
        local img_count=$(echo "$content" | grep -c "<img" || echo "0")
        local alt_count=$(echo "$content" | grep -c 'alt=' || echo "0")

        if [ $img_count -gt 0 ] && [ $alt_count -lt $img_count ]; then
            log_warn "⚠️ $name: Some images missing alt attributes ($alt_count/$img_count)"
            issues=$((issues + 1))
        fi

        if [ $issues -eq 0 ]; then
            log_success "✅ $name: Basic accessibility checks passed"
            increment_passed
        else
            log_warn "⚠️ $name: $issues accessibility issues found"
            increment_warning
        fi
    else
        log_error "❌ $name: Accessibility check failed - cannot fetch content"
        increment_failed
        return 1
    fi
}

# Mobile responsiveness check
mobile_check() {
    local url="$1"
    local name="$2"

    increment_total
    log_info "Checking mobile responsiveness: $name"

    # Check for viewport meta tag and responsive indicators
    if content=$(curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null); then
        local responsive_indicators=0

        if echo "$content" | grep -q 'name="viewport"'; then
            responsive_indicators=$((responsive_indicators + 1))
        fi

        if echo "$content" | grep -q '@media'; then
            responsive_indicators=$((responsive_indicators + 1))
        fi

        if echo "$content" | grep -q 'responsive\|mobile'; then
            responsive_indicators=$((responsive_indicators + 1))
        fi

        if [ $responsive_indicators -ge 2 ]; then
            log_success "✅ $name: Mobile responsiveness indicators present"
            increment_passed
        elif [ $responsive_indicators -eq 1 ]; then
            log_warn "⚠️ $name: Limited mobile responsiveness indicators"
            increment_warning
        else
            log_warn "⚠️ $name: No mobile responsiveness indicators found"
            increment_warning
        fi
    else
        log_error "❌ $name: Mobile check failed - cannot fetch content"
        increment_failed
        return 1
    fi
}

# SEO check (basic)
seo_check() {
    local url="$1"
    local name="$2"

    increment_total
    log_info "Running basic SEO check: $name"

    if content=$(curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null); then
        local seo_score=0
        local max_score=5

        # Check for title tag
        if echo "$content" | grep -q "<title>.*</title>"; then
            seo_score=$((seo_score + 1))
        fi

        # Check for meta description
        if echo "$content" | grep -q 'name="description"'; then
            seo_score=$((seo_score + 1))
        fi

        # Check for meta keywords (optional but good)
        if echo "$content" | grep -q 'name="keywords"'; then
            seo_score=$((seo_score + 1))
        fi

        # Check for heading tags
        if echo "$content" | grep -q '<h[1-6]'; then
            seo_score=$((seo_score + 1))
        fi

        # Check for structured data
        if echo "$content" | grep -q 'application/ld+json\|schema.org'; then
            seo_score=$((seo_score + 1))
        fi

        local seo_percentage=$(( seo_score * 100 / max_score ))

        if [ $seo_score -eq $max_score ]; then
            log_success "✅ $name: SEO check excellent ($seo_percentage%)"
            increment_passed
        elif [ $seo_score -ge 3 ]; then
            log_success "✅ $name: SEO check good ($seo_percentage%)"
            increment_passed
        elif [ $seo_score -ge 1 ]; then
            log_warn "⚠️ $name: SEO check needs improvement ($seo_percentage%)"
            increment_warning
        else
            log_error "❌ $name: SEO check failed - no SEO elements found"
            increment_failed
            return 1
        fi
    else
        log_error "❌ $name: SEO check failed - cannot fetch content"
        increment_failed
        return 1
    fi
}

# Main health check orchestration
run_comprehensive_health_check() {
    log_info "Starting comprehensive health check for $ENVIRONMENT environment"
    log_info "Checking ${#SITES[@]} sites with multiple validation layers"

    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"

    # Reset counters
    TOTAL_CHECKS=0
    PASSED_CHECKS=0
    FAILED_CHECKS=0
    WARNING_CHECKS=0

    for site_name in "${!SITES[@]}"; do
        local site_url="${SITES[$site_name]}"

        log_info "============================================"
        log_info "Checking site: $site_name ($site_url)"
        log_info "============================================"

        # Core infrastructure checks
        dns_check "$site_url" "$site_name"
        ssl_certificate_check "$site_url" "$site_name"
        http_health_check "$site_url" "$site_name"

        # Content and functionality checks
        content_check "$site_url" "$site_name"
        performance_check "$site_url" "$site_name"

        # Quality checks
        accessibility_check "$site_url" "$site_name"
        mobile_check "$site_url" "$site_name"
        seo_check "$site_url" "$site_name"

        log_info "Site $site_name checks completed"
        echo ""
    done

    # Generate summary report
    generate_health_report
}

# Generate comprehensive health report
generate_health_report() {
    local success_rate=0
    if [ $TOTAL_CHECKS -gt 0 ]; then
        success_rate=$(( (PASSED_CHECKS + WARNING_CHECKS) * 100 / TOTAL_CHECKS ))
    fi

    echo ""
    echo "============================================================="
    echo "HEALTH CHECK SUMMARY - $(echo "$ENVIRONMENT" | tr '[:lower:]' '[:upper:]') ENVIRONMENT"
    echo "============================================================="
    echo "Timestamp: $(date)"
    echo "Environment: $ENVIRONMENT"
    echo "Sites Checked: ${#SITES[@]}"
    echo ""
    echo "RESULTS:"
    echo "  ✅ Passed:   $PASSED_CHECKS"
    echo "  ⚠️  Warnings: $WARNING_CHECKS"
    echo "  ❌ Failed:   $FAILED_CHECKS"
    echo "  📊 Total:    $TOTAL_CHECKS"
    echo ""
    echo "SUCCESS RATE: ${success_rate}%"
    echo ""

    # Determine overall status
    if [ $FAILED_CHECKS -eq 0 ]; then
        if [ $WARNING_CHECKS -eq 0 ]; then
            echo "OVERALL STATUS: 🟢 EXCELLENT - All checks passed"
            log_success "Health check completed successfully - no issues found"
        else
            echo "OVERALL STATUS: 🟡 GOOD - Minor issues detected"
            log_warn "Health check completed with $WARNING_CHECKS warnings"
        fi
    else
        echo "OVERALL STATUS: 🔴 CRITICAL - Issues require attention"
        log_error "Health check failed - $FAILED_CHECKS critical issues found"

        # List failed sites
        echo ""
        echo "ATTENTION REQUIRED:"
        echo "- $FAILED_CHECKS critical issues detected"
        echo "- Review logs at: $LOG_FILE"
        echo "- Consider emergency procedures if issues persist"
    fi

    echo "============================================================="

    # Generate JSON report for automation
    local json_report="{
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"environment\": \"$ENVIRONMENT\",
        \"sites_checked\": ${#SITES[@]},
        \"total_checks\": $TOTAL_CHECKS,
        \"passed_checks\": $PASSED_CHECKS,
        \"warning_checks\": $WARNING_CHECKS,
        \"failed_checks\": $FAILED_CHECKS,
        \"success_rate\": $success_rate,
        \"status\": \"$([ $FAILED_CHECKS -eq 0 ] && echo "healthy" || echo "unhealthy")\",
        \"log_file\": \"$LOG_FILE\"
    }"

    echo "$json_report" > "$PROJECT_ROOT/logs/health-check-report-$(date +%Y%m%d-%H%M%S).json"

    # Exit with appropriate code
    if [ $FAILED_CHECKS -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

# Quick health check (basic HTTP only)
quick_health_check() {
    log_info "Running quick health check for $ENVIRONMENT environment"

    TOTAL_CHECKS=0
    PASSED_CHECKS=0
    FAILED_CHECKS=0
    WARNING_CHECKS=0

    for site_name in "${!SITES[@]}"; do
        local site_url="${SITES[$site_name]}"
        http_health_check "$site_url" "$site_name"
    done

    local success_rate=$(( PASSED_CHECKS * 100 / TOTAL_CHECKS ))

    echo ""
    echo "Quick Health Check Results:"
    echo "  ✅ Passed: $PASSED_CHECKS/$TOTAL_CHECKS (${success_rate}%)"
    echo "  ❌ Failed: $FAILED_CHECKS"

    return $FAILED_CHECKS
}

# Main execution
main() {
    case "${2:-comprehensive}" in
        "comprehensive"|"full")
            run_comprehensive_health_check
            ;;
        "quick"|"basic")
            quick_health_check
            ;;
        *)
            echo "Usage: $0 [production|staging] [comprehensive|quick]"
            echo ""
            echo "Environments:"
            echo "  production - Check production sites"
            echo "  staging    - Check staging sites"
            echo ""
            echo "Check Types:"
            echo "  comprehensive - Full health, performance, accessibility, SEO checks (default)"
            echo "  quick        - Basic HTTP health checks only"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"
