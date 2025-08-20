#!/bin/bash
set -e

# Staging Monitoring Script for Paintbox
# Purpose: Monitor staging deployment for 24-48 hours
# Date: January 19, 2025

STAGING_URL="https://paintbox.fly.dev"
REPORT_FILE="monitoring-report-$(date +%Y%m%d-%H%M%S).json"
ALERT_THRESHOLD_ERROR_RATE=1.0  # 1% error rate threshold
ALERT_THRESHOLD_MEMORY=2048     # 2GB memory threshold
ALERT_THRESHOLD_RESPONSE_TIME=500  # 500ms response time threshold

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Starting Staging Environment Monitoring"
echo "================================================"
echo "URL: $STAGING_URL"
echo "Duration: 24-48 hours"
echo "Report: $REPORT_FILE"
echo "================================================"

# Function to check health endpoint
check_health() {
    echo -e "\n${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} Checking health endpoint..."
    
    HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$STAGING_URL/api/health" 2>/dev/null || echo "000")
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
    BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Health check passed${NC}"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        echo -e "${RED}❌ Health check failed (HTTP $HTTP_CODE)${NC}"
        echo "$BODY"
    fi
    
    # Parse health metrics
    if [ "$HTTP_CODE" = "200" ] && command -v jq &> /dev/null; then
        MEMORY=$(echo "$BODY" | jq -r '.metrics.memory.heapUsed // 0' 2>/dev/null)
        if [ "$MEMORY" != "0" ]; then
            MEMORY_MB=$((MEMORY / 1048576))
            if [ "$MEMORY_MB" -gt "$ALERT_THRESHOLD_MEMORY" ]; then
                echo -e "${RED}⚠️  Memory usage high: ${MEMORY_MB}MB > ${ALERT_THRESHOLD_MEMORY}MB${NC}"
            else
                echo -e "${GREEN}✓ Memory usage OK: ${MEMORY_MB}MB${NC}"
            fi
        fi
    fi
}

# Function to test API endpoints
test_endpoints() {
    echo -e "\n${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} Testing API endpoints..."
    
    ENDPOINTS=(
        "/api/health"
        "/api/.well-known/jwks.json"
        "/api/metrics"
        "/api/v1/salesforce/test"
        "/api/v1/companycam/test"
    )
    
    for endpoint in "${ENDPOINTS[@]}"; do
        START_TIME=$(date +%s%N)
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL$endpoint" 2>/dev/null || echo "000")
        END_TIME=$(date +%s%N)
        RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
        
        if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
            echo -e "  ${GREEN}✓${NC} $endpoint: ${GREEN}$HTTP_CODE${NC} (${RESPONSE_TIME}ms)"
        elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
            echo -e "  ${YELLOW}⚠${NC} $endpoint: ${YELLOW}$HTTP_CODE${NC} (auth required) (${RESPONSE_TIME}ms)"
        else
            echo -e "  ${RED}✗${NC} $endpoint: ${RED}$HTTP_CODE${NC} (${RESPONSE_TIME}ms)"
        fi
        
        if [ "$RESPONSE_TIME" -gt "$ALERT_THRESHOLD_RESPONSE_TIME" ]; then
            echo -e "    ${YELLOW}⚠️  Slow response: ${RESPONSE_TIME}ms > ${ALERT_THRESHOLD_RESPONSE_TIME}ms${NC}"
        fi
    done
}

# Function to check Fly.io metrics
check_fly_metrics() {
    echo -e "\n${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} Checking Fly.io metrics..."
    
    if command -v fly &> /dev/null; then
        echo -e "${GREEN}Machine Status:${NC}"
        fly status --app paintbox 2>/dev/null | grep -E "^\s+[a-f0-9]+" || echo "No machines found"
        
        echo -e "\n${GREEN}Recent Logs (errors/warnings):${NC}"
        fly logs --app paintbox -n 20 2>/dev/null | grep -E "(ERROR|WARN|error|warning)" | tail -5 || echo "No recent errors"
    else
        echo -e "${YELLOW}⚠ Fly CLI not installed, skipping Fly.io metrics${NC}"
    fi
}

# Function to generate monitoring report
generate_report() {
    echo -e "\n${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} Generating monitoring report..."
    
    cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "staging_url": "$STAGING_URL",
  "status": "monitoring",
  "checks_performed": {
    "health": true,
    "endpoints": true,
    "fly_metrics": true
  },
  "next_check": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    
    echo -e "${GREEN}✅ Report saved to: $REPORT_FILE${NC}"
}

# Function to run continuous monitoring
continuous_monitor() {
    local duration_hours=${1:-24}
    local check_interval=${2:-300}  # 5 minutes default
    
    echo -e "\n${GREEN}Starting continuous monitoring for $duration_hours hours${NC}"
    echo "Check interval: $check_interval seconds"
    echo "Press Ctrl+C to stop monitoring"
    
    local end_time=$(($(date +%s) + duration_hours * 3600))
    local check_count=0
    
    while [ $(date +%s) -lt $end_time ]; do
        check_count=$((check_count + 1))
        echo -e "\n${YELLOW}═══════════════════════════════════════════════════${NC}"
        echo -e "${YELLOW}Check #$check_count - $(date '+%Y-%m-%d %H:%M:%S')${NC}"
        echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
        
        check_health
        test_endpoints
        check_fly_metrics
        generate_report
        
        remaining=$((end_time - $(date +%s)))
        remaining_hours=$((remaining / 3600))
        remaining_minutes=$(((remaining % 3600) / 60))
        
        echo -e "\n${GREEN}Next check in $check_interval seconds...${NC}"
        echo -e "${GREEN}Monitoring remaining: ${remaining_hours}h ${remaining_minutes}m${NC}"
        
        sleep $check_interval
    done
    
    echo -e "\n${GREEN}✅ Monitoring complete after $duration_hours hours${NC}"
}

# Main execution
main() {
    case "${1:-}" in
        "continuous")
            continuous_monitor "${2:-24}" "${3:-300}"
            ;;
        "once")
            check_health
            test_endpoints
            check_fly_metrics
            generate_report
            ;;
        "health")
            check_health
            ;;
        "endpoints")
            test_endpoints
            ;;
        "fly")
            check_fly_metrics
            ;;
        *)
            echo "Usage: $0 {continuous [hours] [interval]|once|health|endpoints|fly}"
            echo ""
            echo "Examples:"
            echo "  $0 continuous 24 300    # Monitor for 24 hours, check every 5 minutes"
            echo "  $0 continuous 48 600    # Monitor for 48 hours, check every 10 minutes"
            echo "  $0 once                 # Run all checks once"
            echo "  $0 health              # Check health endpoint only"
            echo ""
            echo "Starting default: continuous monitoring for 24 hours..."
            continuous_monitor 24 300
            ;;
    esac
}

# Run main function
main "$@"