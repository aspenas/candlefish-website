#!/bin/sh
# Production health check script for Paintbox application
# Performs comprehensive health checks including dependencies

set -e

# Configuration
APP_PORT=${PORT:-8080}
APP_HOST=${HOSTNAME:-localhost}
TIMEOUT=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [HEALTHCHECK] $1"
}

# Error handling
handle_error() {
    log "${RED}Health check failed: $1${NC}"
    exit 1
}

# Success handling
handle_success() {
    log "${GREEN}Health check passed: $1${NC}"
}

# Warning handling
handle_warning() {
    log "${YELLOW}Health check warning: $1${NC}"
}

# Check if application is responding
check_app_health() {
    log "Checking application health on ${APP_HOST}:${APP_PORT}"
    
    # Basic connectivity check
    if ! curl -f -s --max-time ${TIMEOUT} "http://${APP_HOST}:${APP_PORT}/api/health" > /dev/null; then
        handle_error "Application health endpoint not responding"
    fi
    
    # Detailed health check with response validation
    HEALTH_RESPONSE=$(curl -s --max-time ${TIMEOUT} "http://${APP_HOST}:${APP_PORT}/api/health" 2>/dev/null || echo "")
    
    if [ -z "$HEALTH_RESPONSE" ]; then
        handle_error "Empty health response from application"
    fi
    
    # Check if response contains expected health indicators
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"' || echo "$HEALTH_RESPONSE" | grep -q '"healthy":true'; then
        handle_success "Application health endpoint responding correctly"
    else
        handle_error "Application health response indicates unhealthy state: $HEALTH_RESPONSE"
    fi
}

# Check database connectivity (if health endpoint includes DB check)
check_database_health() {
    log "Checking database connectivity"
    
    DB_HEALTH=$(curl -s --max-time ${TIMEOUT} "http://${APP_HOST}:${APP_PORT}/api/health/database" 2>/dev/null || echo "")
    
    if [ -n "$DB_HEALTH" ]; then
        if echo "$DB_HEALTH" | grep -q '"status":"healthy"' || echo "$DB_HEALTH" | grep -q '"connected":true'; then
            handle_success "Database connectivity check passed"
        else
            handle_warning "Database connectivity issues detected: $DB_HEALTH"
        fi
    else
        handle_warning "Database health endpoint not available"
    fi
}

# Check Redis connectivity (if health endpoint includes Redis check)
check_redis_health() {
    log "Checking Redis connectivity"
    
    REDIS_HEALTH=$(curl -s --max-time ${TIMEOUT} "http://${APP_HOST}:${APP_PORT}/api/health/cache" 2>/dev/null || echo "")
    
    if [ -n "$REDIS_HEALTH" ]; then
        if echo "$REDIS_HEALTH" | grep -q '"status":"healthy"' || echo "$REDIS_HEALTH" | grep -q '"connected":true'; then
            handle_success "Redis connectivity check passed"
        else
            handle_warning "Redis connectivity issues detected: $REDIS_HEALTH"
        fi
    else
        handle_warning "Redis health endpoint not available"
    fi
}

# Check application performance metrics
check_performance_metrics() {
    log "Checking application performance metrics"
    
    # Measure response time
    RESPONSE_TIME=$(curl -w '%{time_total}' -s -o /dev/null --max-time ${TIMEOUT} "http://${APP_HOST}:${APP_PORT}/api/health" 2>/dev/null || echo "999")
    
    # Convert to milliseconds for easier comparison
    RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc -l 2>/dev/null || echo "999000")
    RESPONSE_TIME_MS_INT=$(printf "%.0f" "$RESPONSE_TIME_MS")
    
    if [ "$RESPONSE_TIME_MS_INT" -lt 2000 ]; then
        handle_success "Response time acceptable: ${RESPONSE_TIME_MS_INT}ms"
    elif [ "$RESPONSE_TIME_MS_INT" -lt 5000 ]; then
        handle_warning "Response time elevated: ${RESPONSE_TIME_MS_INT}ms"
    else
        handle_error "Response time too high: ${RESPONSE_TIME_MS_INT}ms"
    fi
}

# Check disk space
check_disk_space() {
    log "Checking disk space"
    
    # Check available disk space (%)
    DISK_USAGE=$(df /app 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ -n "$DISK_USAGE" ]; then
        if [ "$DISK_USAGE" -lt 80 ]; then
            handle_success "Disk usage acceptable: ${DISK_USAGE}%"
        elif [ "$DISK_USAGE" -lt 90 ]; then
            handle_warning "Disk usage high: ${DISK_USAGE}%"
        else
            handle_error "Disk usage critical: ${DISK_USAGE}%"
        fi
    else
        handle_warning "Could not determine disk usage"
    fi
}

# Check memory usage
check_memory_usage() {
    log "Checking memory usage"
    
    # Get memory info from /proc/meminfo if available
    if [ -r /proc/meminfo ]; then
        TOTAL_MEM=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
        AVAIL_MEM=$(awk '/MemAvailable/ {print $2}' /proc/meminfo)
        
        if [ -n "$TOTAL_MEM" ] && [ -n "$AVAIL_MEM" ] && [ "$TOTAL_MEM" -gt 0 ]; then
            USED_PERCENT=$(echo "scale=0; (($TOTAL_MEM - $AVAIL_MEM) * 100) / $TOTAL_MEM" | bc -l)
            
            if [ "$USED_PERCENT" -lt 80 ]; then
                handle_success "Memory usage acceptable: ${USED_PERCENT}%"
            elif [ "$USED_PERCENT" -lt 90 ]; then
                handle_warning "Memory usage high: ${USED_PERCENT}%"
            else
                handle_error "Memory usage critical: ${USED_PERCENT}%"
            fi
        else
            handle_warning "Could not calculate memory usage"
        fi
    else
        handle_warning "Memory information not available"
    fi
}

# Main health check execution
main() {
    log "Starting comprehensive health check"
    
    # Core application checks (critical)
    check_app_health
    
    # Performance checks (critical)
    check_performance_metrics
    
    # Resource checks (warnings only)
    check_disk_space
    check_memory_usage
    
    # Dependency checks (warnings only)
    check_database_health
    check_redis_health
    
    log "${GREEN}All health checks completed successfully${NC}"
    exit 0
}

# Trap signals for graceful exit
trap 'handle_error "Health check interrupted"' INT TERM

# Execute main function
main "$@"