#!/bin/sh

# Health Check Script for Paintbox Container
# Usage: ./health-check.sh <url> <timeout> [retries]

set -e

# Default values
URL="${1:-http://localhost:8080/api/health}"
TIMEOUT="${2:-5}"
RETRIES="${3:-3}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "$(date '+%Y-%m-%d %H:%M:%S') [HEALTH] $*"; }
log_success() { echo -e "$(date '+%Y-%m-%d %H:%M:%S') [HEALTH] ${GREEN}$*${NC}"; }
log_warning() { echo -e "$(date '+%Y-%m-%d %H:%M:%S') [HEALTH] ${YELLOW}$*${NC}"; }
log_error() { echo -e "$(date '+%Y-%m-%d %H:%M:%S') [HEALTH] ${RED}$*${NC}"; }

# Health check function
check_health() {
    local attempt=1
    
    while [ $attempt -le $RETRIES ]; do
        log_info "Health check attempt $attempt/$RETRIES for $URL"
        
        # Perform the health check with timeout
        if curl -f -s --max-time "$TIMEOUT" "$URL" >/dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        else
            log_warning "Health check failed (attempt $attempt/$RETRIES)"
            if [ $attempt -lt $RETRIES ]; then
                sleep 2
            fi
            attempt=$((attempt + 1))
        fi
    done
    
    log_error "All health check attempts failed"
    return 1
}

# Additional system checks
system_checks() {
    # Check if port is listening
    if command -v netstat >/dev/null 2>&1; then
        local port=$(echo "$URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
        if [ ! -z "$port" ]; then
            if netstat -ln | grep ":$port " >/dev/null 2>&1; then
                log_info "Port $port is listening"
            else
                log_warning "Port $port is not listening"
                return 1
            fi
        fi
    fi
    
    # Check memory usage
    if [ -f /proc/meminfo ]; then
        local mem_available=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
        if [ "$mem_available" -lt 50000 ]; then  # Less than 50MB
            log_warning "Low memory available: ${mem_available}KB"
        fi
    fi
    
    # Check disk space
    local disk_usage=$(df /app | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 95 ]; then
        log_warning "Very low disk space: ${disk_usage}% used"
        return 1
    fi
    
    return 0
}

# Main execution
main() {
    log_info "Starting health check for Paintbox"
    log_info "URL: $URL, Timeout: ${TIMEOUT}s, Retries: $RETRIES"
    
    # Run system checks first
    if ! system_checks; then
        log_error "System checks failed"
        exit 1
    fi
    
    # Run application health check
    if check_health; then
        log_success "Health check completed successfully"
        exit 0
    else
        log_error "Health check failed"
        exit 1
    fi
}

# Run main function
main "$@"