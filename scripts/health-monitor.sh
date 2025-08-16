#!/bin/bash
# Health Monitoring Script for Production Services
set -euo pipefail

# Configuration
PAINTBOX_URL="https://paintbox-app.fly.dev"
TEMPORAL_URL="https://candlefish-temporal-platform.fly.dev"
MAX_RETRIES=3
RETRY_DELAY=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Health check function
check_health() {
    local service_name=$1
    local health_url=$2
    local retries=0
    
    log "Checking health of $service_name..."
    
    while [ $retries -lt $MAX_RETRIES ]; do
        # Make health check request
        response=$(curl -s -w "\n%{http_code}" "$health_url" 2>/dev/null || echo "000")
        http_code=$(echo "$response" | tail -1)
        body=$(echo "$response" | head -n -1)
        
        if [ "$http_code" == "200" ] || [ "$http_code" == "503" ]; then
            # Parse JSON response if available
            if [ -n "$body" ]; then
                status=$(echo "$body" | jq -r '.status' 2>/dev/null || echo "unknown")
                
                case $status in
                    healthy)
                        log "✅ $service_name is HEALTHY"
                        echo "$body" | jq '.' 2>/dev/null || echo "$body"
                        return 0
                        ;;
                    degraded)
                        warning "⚠️ $service_name is DEGRADED but operational"
                        echo "$body" | jq '.' 2>/dev/null || echo "$body"
                        return 0
                        ;;
                    unhealthy)
                        error "❌ $service_name is UNHEALTHY"
                        echo "$body" | jq '.' 2>/dev/null || echo "$body"
                        return 1
                        ;;
                    *)
                        info "Status: $status"
                        return 0
                        ;;
                esac
            else
                log "✅ $service_name responded with code $http_code"
                return 0
            fi
        else
            warning "Health check failed with code: $http_code (attempt $((retries + 1))/$MAX_RETRIES)"
            retries=$((retries + 1))
            
            if [ $retries -lt $MAX_RETRIES ]; then
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    error "❌ $service_name health check failed after $MAX_RETRIES attempts"
    return 1
}

# Check specific endpoints
check_endpoint() {
    local endpoint_name=$1
    local endpoint_url=$2
    local expected_code=${3:-200}
    
    log "Checking endpoint: $endpoint_name"
    
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint_url" 2>/dev/null || echo "000")
    
    if [ "$response_code" == "$expected_code" ]; then
        log "✅ $endpoint_name returned expected code: $response_code"
        return 0
    else
        error "❌ $endpoint_name returned $response_code (expected $expected_code)"
        return 1
    fi
}

# Performance check
check_performance() {
    local service_name=$1
    local test_url=$2
    
    log "Running performance check for $service_name..."
    
    # Measure response time
    response_time=$(curl -o /dev/null -s -w "%{time_total}" "$test_url" 2>/dev/null || echo "0")
    response_time_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "0")
    
    if (( $(echo "$response_time_ms < 1000" | bc -l 2>/dev/null || echo 0) )); then
        log "✅ Response time: ${response_time_ms}ms (Good)"
    elif (( $(echo "$response_time_ms < 3000" | bc -l 2>/dev/null || echo 0) )); then
        warning "⚠️ Response time: ${response_time_ms}ms (Slow)"
    else
        error "❌ Response time: ${response_time_ms}ms (Critical)"
    fi
}

# Main monitoring function
main() {
    log "🔍 Starting Health Monitoring..."
    echo ""
    
    local all_healthy=true
    
    # Check Paintbox health
    echo "════════════════════════════════════════════"
    echo "  PAINTBOX APPLICATION HEALTH"
    echo "════════════════════════════════════════════"
    
    if check_health "Paintbox" "$PAINTBOX_URL/api/health"; then
        # Check additional endpoints
        check_endpoint "Status API" "$PAINTBOX_URL/api/status" 200
        check_endpoint "Home Page" "$PAINTBOX_URL" 200
        check_performance "Paintbox" "$PAINTBOX_URL/api/health"
    else
        all_healthy=false
    fi
    
    echo ""
    
    # Check Temporal platform health
    echo "════════════════════════════════════════════"
    echo "  TEMPORAL PLATFORM HEALTH"
    echo "════════════════════════════════════════════"
    
    if check_health "Temporal Platform" "$TEMPORAL_URL/health"; then
        check_performance "Temporal" "$TEMPORAL_URL/health"
    else
        all_healthy=false
    fi
    
    echo ""
    
    # AWS Services Health
    echo "════════════════════════════════════════════"
    echo "  AWS SERVICES HEALTH"
    echo "════════════════════════════════════════════"
    
    # Check S3 access
    log "Checking S3 access..."
    if aws s3 ls 2>/dev/null | grep -q candlefish; then
        log "✅ S3 access confirmed"
    else
        warning "⚠️ S3 access issues"
    fi
    
    # Check CloudWatch alarms
    log "Checking CloudWatch alarms..."
    alarm_states=$(aws cloudwatch describe-alarms \
        --alarm-names CandlefishDailyCostSpike CandlefishHourlyCostSpike \
        --query 'MetricAlarms[].StateValue' \
        --output text 2>/dev/null || echo "UNKNOWN")
    
    if echo "$alarm_states" | grep -q "ALARM"; then
        error "❌ CloudWatch alarms triggered!"
    else
        log "✅ CloudWatch alarms OK: $alarm_states"
    fi
    
    echo ""
    
    # Summary
    echo "════════════════════════════════════════════"
    echo "  HEALTH MONITORING SUMMARY"
    echo "════════════════════════════════════════════"
    
    if [ "$all_healthy" = true ]; then
        log "✅ All services are healthy!"
        echo ""
        echo "Service URLs:"
        echo "• Paintbox: $PAINTBOX_URL"
        echo "• Temporal: $TEMPORAL_URL"
        echo "• Health Dashboard: $PAINTBOX_URL/api/health"
        echo "• Status Dashboard: $PAINTBOX_URL/api/status"
        exit 0
    else
        error "❌ Some services are unhealthy. Please check the logs above."
        exit 1
    fi
}

# Run continuous monitoring if --watch flag is provided
if [ "${1:-}" == "--watch" ]; then
    log "Starting continuous monitoring (Ctrl+C to stop)..."
    while true; do
        clear
        main
        echo ""
        echo "Refreshing in 30 seconds..."
        sleep 30
    done
else
    main
fi