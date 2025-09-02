#!/bin/bash
# DNS diagnostics script for candlefish.ai infrastructure

set -euo pipefail

# Configuration
DOMAIN="${DOMAIN:-candlefish.ai}"
SUBDOMAINS=("api" "analytics" "router" "monitor" "config")
NAMESERVERS=("8.8.8.8" "1.1.1.1" "208.67.222.222" "9.9.9.9")

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# DNS lookup with timeout
dns_lookup() {
    local hostname="$1"
    local record_type="${2:-A}"
    local nameserver="${3:-}"
    
    local dig_cmd="dig +short +timeout=5"
    
    if [[ -n "$nameserver" ]]; then
        dig_cmd="$dig_cmd @$nameserver"
    fi
    
    dig_cmd="$dig_cmd $hostname $record_type"
    
    eval "$dig_cmd" 2>/dev/null || echo "TIMEOUT"
}

# Check DNS resolution
check_dns_resolution() {
    info "Checking DNS resolution for $DOMAIN and subdomains..."
    
    local failed_lookups=()
    
    # Check root domain
    echo "Checking $DOMAIN:"
    for ns in "${NAMESERVERS[@]}"; do
        local result=$(dns_lookup "$DOMAIN" "A" "$ns")
        if [[ "$result" == "TIMEOUT" || -z "$result" ]]; then
            echo "  ✗ $ns: FAILED"
            failed_lookups+=("$DOMAIN@$ns")
        else
            echo "  ✓ $ns: $result"
        fi
    done
    echo
    
    # Check subdomains
    for subdomain in "${SUBDOMAINS[@]}"; do
        local fqdn="${subdomain}.${DOMAIN}"
        echo "Checking $fqdn:"
        
        for ns in "${NAMESERVERS[@]}"; do
            local result=$(dns_lookup "$fqdn" "A" "$ns")
            if [[ "$result" == "TIMEOUT" || -z "$result" ]]; then
                echo "  ✗ $ns: FAILED"
                failed_lookups+=("$fqdn@$ns")
            else
                echo "  ✓ $ns: $result"
            fi
        done
        echo
    done
    
    if [[ ${#failed_lookups[@]} -gt 0 ]]; then
        warn "Failed DNS lookups: ${#failed_lookups[@]}"
        for lookup in "${failed_lookups[@]}"; do
            echo "  - $lookup"
        done
    else
        log "All DNS lookups successful"
    fi
}

# Check SSL certificates
check_ssl_certificates() {
    info "Checking SSL certificates..."
    
    local failed_ssl=()
    
    for subdomain in "${SUBDOMAINS[@]}"; do
        local fqdn="${subdomain}.${DOMAIN}"
        echo "Checking SSL for $fqdn:"
        
        if command_exists openssl; then
            local cert_info=$(timeout 10 openssl s_client -connect "$fqdn:443" \
                -servername "$fqdn" -verify_return_error < /dev/null 2>/dev/null | \
                openssl x509 -noout -dates -subject -issuer 2>/dev/null || echo "FAILED")
            
            if [[ "$cert_info" == "FAILED" ]]; then
                echo "  ✗ SSL certificate check failed"
                failed_ssl+=("$fqdn")
            else
                echo "  ✓ SSL certificate valid"
                echo "    $(echo "$cert_info" | grep "notAfter" | cut -d= -f2-)"
            fi
        else
            # Fallback to curl
            if curl -s -I "https://$fqdn" >/dev/null 2>&1; then
                echo "  ✓ HTTPS accessible"
            else
                echo "  ✗ HTTPS not accessible"
                failed_ssl+=("$fqdn")
            fi
        fi
        echo
    done
    
    if [[ ${#failed_ssl[@]} -gt 0 ]]; then
        warn "SSL certificate issues: ${#failed_ssl[@]}"
        for ssl in "${failed_ssl[@]}"; do
            echo "  - $ssl"
        done
    else
        log "All SSL certificates valid"
    fi
}

# Check HTTP/HTTPS connectivity
check_http_connectivity() {
    info "Checking HTTP/HTTPS connectivity..."
    
    local failed_http=()
    local failed_https=()
    
    for subdomain in "${SUBDOMAINS[@]}"; do
        local fqdn="${subdomain}.${DOMAIN}"
        echo "Checking connectivity for $fqdn:"
        
        # Check HTTP (should redirect to HTTPS)
        local http_status=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "http://$fqdn/health" 2>/dev/null || echo "000")
        if [[ "$http_status" =~ ^(200|301|302)$ ]]; then
            echo "  ✓ HTTP: $http_status"
        else
            echo "  ✗ HTTP: $http_status"
            failed_http+=("$fqdn")
        fi
        
        # Check HTTPS
        local https_status=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "https://$fqdn/health" 2>/dev/null || echo "000")
        if [[ "$https_status" == "200" ]]; then
            echo "  ✓ HTTPS: $https_status"
        else
            echo "  ✗ HTTPS: $https_status"
            failed_https+=("$fqdn")
        fi
        echo
    done
    
    if [[ ${#failed_http[@]} -gt 0 ]]; then
        warn "HTTP connectivity issues: ${#failed_http[@]}"
    fi
    
    if [[ ${#failed_https[@]} -gt 0 ]]; then
        warn "HTTPS connectivity issues: ${#failed_https[@]}"
    fi
    
    if [[ ${#failed_http[@]} -eq 0 && ${#failed_https[@]} -eq 0 ]]; then
        log "All HTTP/HTTPS connectivity tests passed"
    fi
}

# Check response times
check_response_times() {
    info "Checking response times..."
    
    for subdomain in "${SUBDOMAINS[@]}"; do
        local fqdn="${subdomain}.${DOMAIN}"
        echo "Response times for $fqdn:"
        
        local times=()
        for i in {1..3}; do
            local time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "https://$fqdn/health" 2>/dev/null || echo "timeout")
            times+=("$time")
        done
        
        local avg_time=0
        local valid_times=0
        for time in "${times[@]}"; do
            if [[ "$time" != "timeout" ]]; then
                avg_time=$(echo "$avg_time + $time" | bc -l 2>/dev/null || echo "0")
                valid_times=$((valid_times + 1))
            fi
        done
        
        if [[ $valid_times -gt 0 ]]; then
            avg_time=$(echo "scale=3; $avg_time / $valid_times" | bc -l 2>/dev/null || echo "0")
            echo "  Average: ${avg_time}s"
            
            if (( $(echo "$avg_time > 2.0" | bc -l 2>/dev/null || echo "0") )); then
                warn "High response time for $fqdn: ${avg_time}s"
            fi
        else
            echo "  ✗ All requests timed out"
        fi
        echo
    done
}

# Check Route53 configuration
check_route53_config() {
    if ! command_exists aws; then
        warn "AWS CLI not available. Skipping Route53 checks."
        return 0
    fi
    
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        warn "AWS credentials not configured. Skipping Route53 checks."
        return 0
    fi
    
    info "Checking Route53 configuration..."
    
    # Get hosted zone ID
    local zone_id=$(aws route53 list-hosted-zones-by-name \
        --dns-name "$DOMAIN" \
        --query "HostedZones[0].Id" \
        --output text 2>/dev/null | sed 's|/hostedzone/||' || echo "")
    
    if [[ -z "$zone_id" || "$zone_id" == "None" ]]; then
        error "Route53 hosted zone for $DOMAIN not found"
        return 1
    fi
    
    log "Found hosted zone: $zone_id"
    
    # Check DNS records
    local records=$(aws route53 list-resource-record-sets \
        --hosted-zone-id "$zone_id" \
        --query "ResourceRecordSets[?contains(Name, '$DOMAIN')].[Name, Type, TTL, ResourceRecords[0].Value]" \
        --output table 2>/dev/null || echo "")
    
    if [[ -n "$records" ]]; then
        echo "Route53 DNS records:"
        echo "$records"
    else
        warn "No DNS records found in Route53"
    fi
    echo
}

# Generate comprehensive report
generate_report() {
    local report_file="dns-diagnostic-report-$(date +%Y%m%d-%H%M%S).txt"
    
    info "Generating comprehensive diagnostic report..."
    
    {
        echo "=== Candlefish AI DNS Diagnostic Report ==="
        echo "Generated: $(date)"
        echo "Domain: $DOMAIN"
        echo ""
        
        echo "=== DNS Resolution Test ==="
        check_dns_resolution 2>&1
        echo ""
        
        echo "=== SSL Certificate Test ==="
        check_ssl_certificates 2>&1
        echo ""
        
        echo "=== HTTP/HTTPS Connectivity Test ==="
        check_http_connectivity 2>&1
        echo ""
        
        echo "=== Response Time Test ==="
        check_response_times 2>&1
        echo ""
        
        echo "=== Route53 Configuration ==="
        check_route53_config 2>&1
        echo ""
        
        echo "=== System Information ==="
        echo "OS: $(uname -s) $(uname -r)"
        echo "Date: $(date)"
        echo "User: $(whoami)"
        echo "Working Directory: $(pwd)"
        echo ""
        
        echo "=== Available Tools ==="
        for tool in dig curl openssl aws nslookup host; do
            if command_exists "$tool"; then
                echo "✓ $tool: $(which "$tool")"
            else
                echo "✗ $tool: not available"
            fi
        done
    } > "$report_file"
    
    log "Diagnostic report saved to: $report_file"
    echo
    cat "$report_file"
}

# Quick health check
quick_health_check() {
    info "Running quick health check..."
    
    local failed_checks=0
    
    for subdomain in "${SUBDOMAINS[@]}"; do
        local fqdn="${subdomain}.${DOMAIN}"
        local url="https://$fqdn/health"
        
        if curl -s -f --max-time 5 "$url" >/dev/null 2>&1; then
            echo "✓ $fqdn"
        else
            echo "✗ $fqdn"
            failed_checks=$((failed_checks + 1))
        fi
    done
    
    echo
    if [[ $failed_checks -eq 0 ]]; then
        log "All services are healthy"
        exit 0
    else
        error "$failed_checks services are unhealthy"
        exit 1
    fi
}

# Main function
main() {
    local action="${1:-full}"
    
    case "$action" in
        "dns")
            check_dns_resolution
            ;;
        "ssl")
            check_ssl_certificates
            ;;
        "http")
            check_http_connectivity
            ;;
        "timing")
            check_response_times
            ;;
        "route53")
            check_route53_config
            ;;
        "quick")
            quick_health_check
            ;;
        "report")
            generate_report
            ;;
        "full")
            check_dns_resolution
            check_ssl_certificates
            check_http_connectivity
            check_response_times
            check_route53_config
            ;;
        *)
            cat << EOF
Usage: $0 <action>

Actions:
  dns      - Check DNS resolution
  ssl      - Check SSL certificates
  http     - Check HTTP/HTTPS connectivity
  timing   - Check response times
  route53  - Check Route53 configuration (requires AWS CLI)
  quick    - Quick health check (exit codes for monitoring)
  report   - Generate comprehensive report
  full     - Run all checks (default)

Environment Variables:
  DOMAIN     - Domain to check (default: candlefish.ai)

Examples:
  $0 quick           # Quick health check for monitoring
  $0 dns             # DNS resolution only
  $0 report          # Generate full diagnostic report
EOF
            exit 1
            ;;
    esac
}

# Run with all arguments
main "$@"