#!/bin/bash

# =============================================================================
# Google Cloud Project Migration Monitoring Script
# Monitors the migration progress and provides real-time status updates
# =============================================================================

set -e

# Configuration
PROJECT_ID="l0-candlefish"
APP_NAME="paintbox"
CHECK_INTERVAL=300  # 5 minutes

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Check application health
check_app_health() {
    local health_url="https://paintbox.fly.dev/api/health"
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$health_url" 2>/dev/null || echo "000")
    
    if [ "$status" = "200" ]; then
        echo "✅ Healthy"
    elif [ "$status" = "000" ]; then
        echo "❌ Unreachable"
    else
        echo "⚠️  Status: $status"
    fi
}

# Check authentication endpoints
check_auth_endpoints() {
    local endpoints=(
        "https://paintbox.fly.dev/api/auth/providers"
        "https://paintbox.fly.dev/api/auth/session"
    )
    
    local all_good=true
    for endpoint in "${endpoints[@]}"; do
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")
        local endpoint_name=$(basename "$endpoint")
        
        if [ "$status" = "200" ] || [ "$status" = "401" ]; then
            echo "  ✅ $endpoint_name: OK"
        else
            echo "  ❌ $endpoint_name: $status"
            all_good=false
        fi
    done
    
    if $all_good; then
        echo "true"
    else
        echo "false"
    fi
}

# Get migration metrics from application
get_migration_metrics() {
    local metrics_url="https://paintbox.fly.dev/api/admin/oauth-migration-status"
    local response=$(curl -s "$metrics_url" 2>/dev/null || echo "{}")
    
    if [ -n "$response" ] && [ "$response" != "{}" ]; then
        echo "$response" | jq '.' 2>/dev/null || echo "{}"
    else
        # Try to get from logs if endpoint not available
        fly logs -a "$APP_NAME" --json | tail -20 | grep "OAuth Migration Metrics" | tail -1 | cut -d':' -f2- || echo "{}"
    fi
}

# Check recent error logs
check_error_logs() {
    local error_count=$(fly logs -a "$APP_NAME" | tail -100 | grep -c "ERROR\|error" || echo "0")
    local auth_errors=$(fly logs -a "$APP_NAME" | tail -100 | grep -c "auth.*error\|oauth.*error" || echo "0")
    
    echo "Total errors: $error_count, Auth errors: $auth_errors"
}

# Get migration status from AWS
get_aws_migration_status() {
    local status=$(aws secretsmanager get-secret-value \
        --secret-id "paintbox/google-oauth-migration" \
        --query 'SecretString' --output text 2>/dev/null | jq -r '.migration_status' || echo "unknown")
    
    echo "$status"
}

# Monitor dashboard
show_dashboard() {
    clear
    echo "========================================="
    echo -e "${CYAN}GCP OAuth Migration Monitor${NC}"
    echo "========================================="
    echo -e "Time: $(date +'%Y-%m-%d %H:%M:%S')"
    echo -e "Project: ${YELLOW}$PROJECT_ID${NC}"
    echo -e "Application: ${YELLOW}$APP_NAME${NC}"
    echo ""
    
    # Migration Status
    local migration_status=$(get_aws_migration_status)
    echo -e "${BLUE}Migration Status:${NC}"
    case "$migration_status" in
        "in_progress")
            echo -e "  🔄 ${YELLOW}In Progress${NC}"
            ;;
        "completed")
            echo -e "  ✅ ${GREEN}Completed${NC}"
            ;;
        "rolled_back")
            echo -e "  ⏪ ${RED}Rolled Back${NC}"
            ;;
        *)
            echo -e "  ❓ ${CYAN}Unknown${NC}"
            ;;
    esac
    echo ""
    
    # Application Health
    echo -e "${BLUE}Application Health:${NC}"
    local health=$(check_app_health)
    echo -e "  Status: $health"
    echo ""
    
    # Authentication Endpoints
    echo -e "${BLUE}Authentication Endpoints:${NC}"
    check_auth_endpoints > /dev/null
    echo ""
    
    # Migration Metrics
    echo -e "${BLUE}OAuth Client Usage:${NC}"
    local metrics=$(get_migration_metrics)
    if [ "$metrics" != "{}" ] && [ -n "$metrics" ]; then
        local new_usage=$(echo "$metrics" | jq -r '.newClient.percentage // "0%"')
        local old_usage=$(echo "$metrics" | jq -r '.oldClient.percentage // "0%"')
        echo -e "  New Client: ${GREEN}$new_usage${NC}"
        echo -e "  Old Client: ${YELLOW}$old_usage${NC}"
    else
        echo "  Metrics not available"
    fi
    echo ""
    
    # Error Status
    echo -e "${BLUE}Error Status:${NC}"
    local errors=$(check_error_logs)
    echo "  $errors"
    echo ""
    
    # Live Logs Preview
    echo -e "${BLUE}Recent Activity:${NC}"
    fly logs -a "$APP_NAME" | tail -5 | sed 's/^/  /'
    echo ""
    echo "========================================="
    echo -e "${CYAN}Press Ctrl+C to exit${NC}"
    echo "========================================="
}

# Continuous monitoring loop
monitor_loop() {
    log "Starting migration monitoring..."
    info "Checking every $CHECK_INTERVAL seconds"
    
    while true; do
        show_dashboard
        sleep "$CHECK_INTERVAL"
    done
}

# Export monitoring data
export_monitoring_data() {
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local export_file="migration-monitor-$timestamp.json"
    
    log "Exporting monitoring data to $export_file..."
    
    local data=$(cat <<EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "project_id": "$PROJECT_ID",
    "application": "$APP_NAME",
    "migration_status": "$(get_aws_migration_status)",
    "health_check": "$(check_app_health)",
    "auth_endpoints": $(check_auth_endpoints),
    "metrics": $(get_migration_metrics),
    "errors": "$(check_error_logs)"
}
EOF
)
    
    echo "$data" | jq '.' > "$export_file"
    success "Monitoring data exported to $export_file"
}

# Alert on issues
check_alerts() {
    local health=$(check_app_health)
    local auth_errors=$(fly logs -a "$APP_NAME" | tail -100 | grep -c "auth.*error" || echo "0")
    
    if [[ "$health" == *"❌"* ]]; then
        error "ALERT: Application is unreachable!"
        return 1
    fi
    
    if [ "$auth_errors" -gt 10 ]; then
        warning "ALERT: High number of authentication errors detected ($auth_errors in last 100 logs)"
        return 1
    fi
    
    return 0
}

# Main execution
main() {
    case "${1:-monitor}" in
        monitor)
            monitor_loop
            ;;
        check)
            show_dashboard
            ;;
        export)
            export_monitoring_data
            ;;
        alerts)
            if check_alerts; then
                success "No alerts - system healthy"
            else
                error "Alerts detected - check system"
                exit 1
            fi
            ;;
        help)
            echo "Usage: $0 [monitor|check|export|alerts|help]"
            echo ""
            echo "Commands:"
            echo "  monitor  - Continuous monitoring (default)"
            echo "  check    - Single status check"
            echo "  export   - Export monitoring data to JSON"
            echo "  alerts   - Check for alert conditions"
            echo "  help     - Show this help message"
            ;;
        *)
            error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Trap Ctrl+C
trap 'echo ""; info "Monitoring stopped"; exit 0' INT

# Run main function
main "$@"