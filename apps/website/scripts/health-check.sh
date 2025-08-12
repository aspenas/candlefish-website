#!/bin/bash

# Health check script for Candlefish AI website
# Performs comprehensive health checks including performance, security, and functionality

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/logs/health-check.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory if it doesn't exist
mkdir -p "${PROJECT_ROOT}/logs"

# Logging function
log() {
    echo -e "${TIMESTAMP} - $1" | tee -a "$LOG_FILE"
}

# Health check functions
check_basic_health() {
    log "${BLUE}Checking basic health...${NC}"
    
    local url="${1:-http://localhost:3000}"
    local response_code
    
    if response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url"); then
        if [[ "$response_code" == "200" ]]; then
            log "${GREEN}✓ Basic health check passed (${response_code})${NC}"
            return 0
        else
            log "${RED}✗ Basic health check failed (${response_code})${NC}"
            return 1
        fi
    else
        log "${RED}✗ Basic health check failed (connection error)${NC}"
        return 1
    fi
}

check_performance() {
    log "${BLUE}Checking performance metrics...${NC}"
    
    local url="${1:-http://localhost:3000}"
    local response_time
    local content_size
    
    # Get response time and content size
    if curl_output=$(curl -s -o /dev/null -w "%{time_total}:%{size_download}" "$url"); then
        response_time=$(echo "$curl_output" | cut -d: -f1)
        content_size=$(echo "$curl_output" | cut -d: -f2)
        
        # Check response time (should be under 2 seconds)
        if (( $(echo "$response_time < 2" | bc -l) )); then
            log "${GREEN}✓ Response time OK (${response_time}s)${NC}"
        else
            log "${YELLOW}⚠ Response time slow (${response_time}s)${NC}"
        fi
        
        # Check content size (basic sanity check)
        if [[ "$content_size" -gt 1000 ]]; then
            log "${GREEN}✓ Content size OK (${content_size} bytes)${NC}"
        else
            log "${YELLOW}⚠ Content size seems small (${content_size} bytes)${NC}"
        fi
        
        return 0
    else
        log "${RED}✗ Performance check failed${NC}"
        return 1
    fi
}

check_security_headers() {
    log "${BLUE}Checking security headers...${NC}"
    
    local url="${1:-http://localhost:3000}"
    local headers
    local security_score=0
    local total_checks=5
    
    if headers=$(curl -s -I "$url"); then
        # Check for security headers
        if echo "$headers" | grep -qi "x-content-type-options: nosniff"; then
            log "${GREEN}✓ X-Content-Type-Options header present${NC}"
            ((security_score++))
        else
            log "${YELLOW}⚠ X-Content-Type-Options header missing${NC}"
        fi
        
        if echo "$headers" | grep -qi "x-frame-options"; then
            log "${GREEN}✓ X-Frame-Options header present${NC}"
            ((security_score++))
        else
            log "${YELLOW}⚠ X-Frame-Options header missing${NC}"
        fi
        
        if echo "$headers" | grep -qi "content-security-policy"; then
            log "${GREEN}✓ Content-Security-Policy header present${NC}"
            ((security_score++))
        else
            log "${YELLOW}⚠ Content-Security-Policy header missing${NC}"
        fi
        
        if echo "$headers" | grep -qi "referrer-policy"; then
            log "${GREEN}✓ Referrer-Policy header present${NC}"
            ((security_score++))
        else
            log "${YELLOW}⚠ Referrer-Policy header missing${NC}"
        fi
        
        if echo "$headers" | grep -qi "permissions-policy"; then
            log "${GREEN}✓ Permissions-Policy header present${NC}"
            ((security_score++))
        else
            log "${YELLOW}⚠ Permissions-Policy header missing${NC}"
        fi
        
        log "${BLUE}Security score: ${security_score}/${total_checks}${NC}"
        
        if [[ "$security_score" -ge 4 ]]; then
            return 0
        else
            return 1
        fi
    else
        log "${RED}✗ Security headers check failed${NC}"
        return 1
    fi
}

check_ssl_certificate() {
    log "${BLUE}Checking SSL certificate...${NC}"
    
    local url="${1:-https://candlefish.ai}"
    
    # Skip SSL check for localhost
    if [[ "$url" == *"localhost"* ]]; then
        log "${BLUE}Skipping SSL check for localhost${NC}"
        return 0
    fi
    
    local domain
    domain=$(echo "$url" | sed 's|https\?://||' | cut -d/ -f1)
    
    if openssl s_client -connect "${domain}:443" -servername "$domain" </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
        local expiry_date
        expiry_date=$(openssl s_client -connect "${domain}:443" -servername "$domain" </dev/null 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        
        if [[ -n "$expiry_date" ]]; then
            log "${GREEN}✓ SSL certificate valid (expires: ${expiry_date})${NC}"
            return 0
        else
            log "${YELLOW}⚠ Could not determine SSL expiry${NC}"
            return 1
        fi
    else
        log "${RED}✗ SSL certificate check failed${NC}"
        return 1
    fi
}

check_service_worker() {
    log "${BLUE}Checking service worker...${NC}"
    
    local url="${1:-http://localhost:3000}"
    local sw_url="${url}/service-worker.js"
    
    if curl -s -f "$sw_url" > /dev/null; then
        log "${GREEN}✓ Service worker accessible${NC}"
        return 0
    else
        log "${YELLOW}⚠ Service worker not accessible${NC}"
        return 1
    fi
}

check_manifest() {
    log "${BLUE}Checking web app manifest...${NC}"
    
    local url="${1:-http://localhost:3000}"
    local manifest_url="${url}/manifest.json"
    
    if manifest_content=$(curl -s -f "$manifest_url"); then
        # Basic validation of manifest content
        if echo "$manifest_content" | jq . > /dev/null 2>&1; then
            log "${GREEN}✓ Web app manifest valid${NC}"
            return 0
        else
            log "${YELLOW}⚠ Web app manifest invalid JSON${NC}"
            return 1
        fi
    else
        log "${YELLOW}⚠ Web app manifest not accessible${NC}"
        return 1
    fi
}

check_lighthouse_score() {
    log "${BLUE}Running Lighthouse performance check...${NC}"
    
    local url="${1:-http://localhost:3000}"
    
    # Check if lighthouse is available
    if ! command -v lighthouse &> /dev/null; then
        log "${YELLOW}⚠ Lighthouse not installed, skipping performance audit${NC}"
        return 0
    fi
    
    local lighthouse_output
    lighthouse_output=$(lighthouse "$url" --only-categories=performance --output=json --quiet 2>/dev/null || echo "")
    
    if [[ -n "$lighthouse_output" ]]; then
        local performance_score
        performance_score=$(echo "$lighthouse_output" | jq -r '.categories.performance.score * 100' 2>/dev/null || echo "0")
        
        if [[ "$performance_score" -ge 80 ]]; then
            log "${GREEN}✓ Lighthouse performance score: ${performance_score}/100${NC}"
            return 0
        else
            log "${YELLOW}⚠ Lighthouse performance score: ${performance_score}/100 (below 80)${NC}"
            return 1
        fi
    else
        log "${YELLOW}⚠ Lighthouse check failed${NC}"
        return 1
    fi
}

# Main health check function
run_health_check() {
    local url="${1:-http://localhost:3000}"
    local exit_code=0
    
    log "${BLUE}Starting health check for: ${url}${NC}"
    log "======================================="
    
    # Run all health checks
    check_basic_health "$url" || exit_code=1
    check_performance "$url" || exit_code=1
    check_security_headers "$url" || exit_code=1
    check_ssl_certificate "$url" || exit_code=1
    check_service_worker "$url" || exit_code=1
    check_manifest "$url" || exit_code=1
    check_lighthouse_score "$url" || exit_code=1
    
    log "======================================="
    
    if [[ "$exit_code" -eq 0 ]]; then
        log "${GREEN}✓ All health checks passed${NC}"
    else
        log "${YELLOW}⚠ Some health checks failed or had warnings${NC}"
    fi
    
    return $exit_code
}

# Script usage
usage() {
    echo "Usage: $0 [URL]"
    echo "  URL: The URL to check (default: http://localhost:3000)"
    echo "Examples:"
    echo "  $0                                    # Check localhost:3000"
    echo "  $0 https://candlefish.ai             # Check production site"
    echo "  $0 http://localhost:8080             # Check specific port"
}

# Main execution
main() {
    local url="${1:-http://localhost:3000}"
    
    if [[ "$url" == "-h" ]] || [[ "$url" == "--help" ]]; then
        usage
        exit 0
    fi
    
    # Validate URL format
    if [[ ! "$url" =~ ^https?:// ]]; then
        log "${RED}Error: Invalid URL format. Must start with http:// or https://${NC}"
        usage
        exit 1
    fi
    
    run_health_check "$url"
}

# Run main function with all arguments
main "$@"