#!/bin/bash

# Alert Integration Script for Paintbox
# Integrates with health monitoring and dependency checking to send alerts

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ALERT_LOG="$PROJECT_ROOT/logs/alerts.log"
HEALTH_CHECK_SCRIPT="$SCRIPT_DIR/dependency-health-check.sh"

# Ensure logs directory exists
mkdir -p "$PROJECT_ROOT/logs"

# Log alert function
log_alert() {
    local level="$1"
    local component="$2"
    local message="$3"
    local timestamp=$(date -Iseconds)

    echo "[$timestamp] [$level] $component: $message" >> "$ALERT_LOG"

    case "$level" in
        "CRITICAL"|"ERROR")
            print_error "$component: $message"
            ;;
        "WARNING")
            print_warning "$component: $message"
            ;;
        *)
            print_status "$component: $message"
            ;;
    esac
}

# Send Slack alert
send_slack_alert() {
    local level="$1"
    local title="$2"
    local message="$3"
    local component="${4:-system}"

    if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
        print_warning "SLACK_WEBHOOK_URL not configured, skipping Slack alert"
        return 0
    fi

    local color="good"
    case "$level" in
        "CRITICAL") color="danger" ;;
        "ERROR") color="danger" ;;
        "WARNING") color="warning" ;;
    esac

    local emoji=":information_source:"
    case "$level" in
        "CRITICAL") emoji=":rotating_light:" ;;
        "ERROR") emoji=":x:" ;;
        "WARNING") emoji=":warning:" ;;
    esac

    local payload=$(cat << EOF
{
    "channel": "#paintbox-alerts",
    "username": "Paintbox Monitor",
    "icon_emoji": "$emoji",
    "attachments": [
        {
            "color": "$color",
            "title": "$title",
            "text": "$message",
            "fields": [
                {
                    "title": "Level",
                    "value": "$level",
                    "short": true
                },
                {
                    "title": "Component",
                    "value": "$component",
                    "short": true
                },
                {
                    "title": "Environment",
                    "value": "${NODE_ENV:-development}",
                    "short": true
                },
                {
                    "title": "Time",
                    "value": "$(date)",
                    "short": true
                }
            ],
            "footer": "Paintbox Alert System",
            "ts": $(date +%s)
        }
    ]
}
EOF
)

    if curl -X POST -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK_URL" >/dev/null 2>&1; then
        print_success "Slack alert sent successfully"
    else
        print_error "Failed to send Slack alert"
    fi
}

# Send email alert
send_email_alert() {
    local level="$1"
    local title="$2"
    local message="$3"
    local component="${4:-system}"

    if [ -z "${ALERT_EMAIL_TO:-}" ]; then
        print_warning "ALERT_EMAIL_TO not configured, skipping email alert"
        return 0
    fi

    local subject="[$level] Paintbox Alert: $title"
    local body="
Alert Details:
- Level: $level
- Component: $component
- Environment: ${NODE_ENV:-development}
- Time: $(date)

Message:
$message

---
Paintbox Alert System
"

    # Simple email using mail command (if available)
    if command -v mail >/dev/null 2>&1; then
        echo "$body" | mail -s "$subject" "$ALERT_EMAIL_TO"
        print_success "Email alert sent to $ALERT_EMAIL_TO"
    else
        print_warning "Mail command not available, skipping email alert"
        log_alert "INFO" "email" "Would have sent: $subject"
    fi
}

# Send webhook alert
send_webhook_alert() {
    local level="$1"
    local title="$2"
    local message="$3"
    local component="${4:-system}"

    if [ -z "${CUSTOM_WEBHOOK_URL:-}" ]; then
        return 0
    fi

    local payload=$(cat << EOF
{
    "alert": {
        "level": "$level",
        "title": "$title",
        "message": "$message",
        "component": "$component",
        "environment": "${NODE_ENV:-development}",
        "timestamp": "$(date -Iseconds)",
        "source": "paintbox-alert-integration"
    }
}
EOF
)

    local auth_header=""
    if [ -n "${CUSTOM_WEBHOOK_AUTH:-}" ]; then
        auth_header="-H \"Authorization: $CUSTOM_WEBHOOK_AUTH\""
    fi

    if eval curl -X POST -H 'Content-Type: application/json' \
        $auth_header \
        --data "'$payload'" \
        "$CUSTOM_WEBHOOK_URL" >/dev/null 2>&1; then
        print_success "Webhook alert sent successfully"
    else
        print_error "Failed to send webhook alert"
    fi
}

# Send alert to all configured channels
send_alert() {
    local level="$1"
    local title="$2"
    local message="$3"
    local component="${4:-system}"

    log_alert "$level" "$component" "$message"

    # Only send external alerts for WARNING and above
    case "$level" in
        "CRITICAL"|"ERROR"|"WARNING")
            send_slack_alert "$level" "$title" "$message" "$component"

            # Send email only for CRITICAL and ERROR
            case "$level" in
                "CRITICAL"|"ERROR")
                    send_email_alert "$level" "$title" "$message" "$component"
                    ;;
            esac

            send_webhook_alert "$level" "$title" "$message" "$component"
            ;;
    esac
}

# Check dependency health and send alerts
check_dependency_health() {
    print_status "Checking dependency health..."

    if [ ! -f "$HEALTH_CHECK_SCRIPT" ]; then
        send_alert "ERROR" "Dependency health check script missing" \
                   "Health check script not found at $HEALTH_CHECK_SCRIPT" \
                   "dependency-checker"
        return 1
    fi

    # Run health check and capture output
    local temp_report=$(mktemp)
    if "$HEALTH_CHECK_SCRIPT" check > "$temp_report" 2>&1; then
        print_success "Dependency health check passed"

        # Check if there's a recent report
        local report_dir="$PROJECT_ROOT/reports/dependency-health"
        if [ -d "$report_dir" ]; then
            local latest_report=$(find "$report_dir" -name "dependency-health-*.json" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)

            if [ -n "$latest_report" ] && [ -f "$latest_report" ]; then
                local health_score=$(jq -r '.health_score // 0' "$latest_report" 2>/dev/null || echo "0")
                local total_vulnerabilities=$(jq -r '.security_audit.metadata.vulnerabilities.total // 0' "$latest_report" 2>/dev/null || echo "0")
                local critical_vulnerabilities=$(jq -r '.security_audit.metadata.vulnerabilities.critical // 0' "$latest_report" 2>/dev/null || echo "0")

                # Alert based on health score
                if [ "$health_score" -lt 50 ]; then
                    send_alert "CRITICAL" "Poor dependency health score" \
                               "Dependency health score is $health_score/100. Immediate attention required." \
                               "dependencies"
                elif [ "$health_score" -lt 70 ]; then
                    send_alert "WARNING" "Low dependency health score" \
                               "Dependency health score is $health_score/100. Consider updating dependencies." \
                               "dependencies"
                fi

                # Alert on critical vulnerabilities
                if [ "$critical_vulnerabilities" -gt 0 ]; then
                    send_alert "CRITICAL" "Critical security vulnerabilities found" \
                               "Found $critical_vulnerabilities critical vulnerabilities in dependencies. Update immediately." \
                               "security"
                elif [ "$total_vulnerabilities" -gt 0 ]; then
                    send_alert "WARNING" "Security vulnerabilities found" \
                               "Found $total_vulnerabilities total vulnerabilities in dependencies." \
                               "security"
                fi

                print_success "Dependency health analysis completed (Score: $health_score/100)"
            fi
        fi
    else
        local error_output=$(cat "$temp_report")
        send_alert "ERROR" "Dependency health check failed" \
                   "Health check script failed with errors: $error_output" \
                   "dependency-checker"
    fi

    rm -f "$temp_report"
}

# Check service health
check_service_health() {
    print_status "Checking service health..."

    # Check if main application is responding
    local app_url="${HEALTH_CHECK_URL:-http://localhost:3000/api/health}"

    if curl -f -s "$app_url" >/dev/null; then
        print_success "Main application health check passed"

        # Get detailed health status
        local health_response=$(curl -s "$app_url" 2>/dev/null || echo '{}')
        local overall_status=$(echo "$health_response" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
        local unhealthy_services=$(echo "$health_response" | jq -r '.summary.unhealthy // 0' 2>/dev/null || echo "0")

        case "$overall_status" in
            "unhealthy")
                send_alert "CRITICAL" "Application health check failed" \
                           "Overall application status is unhealthy. $unhealthy_services services are down." \
                           "application"
                ;;
            "degraded")
                send_alert "WARNING" "Application performance degraded" \
                           "Application status is degraded. $unhealthy_services services may be experiencing issues." \
                           "application"
                ;;
        esac
    else
        send_alert "CRITICAL" "Application is not responding" \
                   "Health check endpoint $app_url is not responding. Service may be down." \
                   "application"
    fi
}

# Check system resources
check_system_resources() {
    print_status "Checking system resources..."

    # Check memory usage
    if command -v free >/dev/null 2>&1; then
        local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')

        if [ "$memory_usage" -gt 90 ]; then
            send_alert "CRITICAL" "Critical memory usage" \
                       "Memory usage is at $memory_usage%. System may become unstable." \
                       "system"
        elif [ "$memory_usage" -gt 80 ]; then
            send_alert "WARNING" "High memory usage" \
                       "Memory usage is at $memory_usage%. Consider scaling or optimization." \
                       "system"
        fi
    fi

    # Check disk usage
    if command -v df >/dev/null 2>&1; then
        local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

        if [ "$disk_usage" -gt 90 ]; then
            send_alert "CRITICAL" "Critical disk usage" \
                       "Disk usage is at $disk_usage%. Running out of storage space." \
                       "system"
        elif [ "$disk_usage" -gt 80 ]; then
            send_alert "WARNING" "High disk usage" \
                       "Disk usage is at $disk_usage%. Consider cleanup or expansion." \
                       "system"
        fi
    fi
}

# Test alert system
test_alerts() {
    print_status "Testing alert system..."

    send_alert "INFO" "Alert system test" \
               "This is a test alert to verify the alert system is working correctly." \
               "alert-system"

    print_success "Test alert sent"
}

# Main monitoring function
run_monitoring() {
    print_status "Starting comprehensive monitoring check..."

    local start_time=$(date +%s)

    # Run all checks
    check_dependency_health
    check_service_health
    check_system_resources

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    print_success "Monitoring check completed in ${duration}s"

    # Send summary if there were any issues
    local alert_count=$(grep -c "$(date '+%Y-%m-%d')" "$ALERT_LOG" 2>/dev/null || echo "0")
    if [ "$alert_count" -gt 0 ]; then
        print_warning "Generated $alert_count alerts today"
    fi
}

# Show recent alerts
show_recent_alerts() {
    print_status "Recent alerts:"

    if [ -f "$ALERT_LOG" ]; then
        tail -20 "$ALERT_LOG" | while IFS= read -r line; do
            if [[ "$line" == *"[CRITICAL]"* ]] || [[ "$line" == *"[ERROR]"* ]]; then
                print_error "$line"
            elif [[ "$line" == *"[WARNING]"* ]]; then
                print_warning "$line"
            else
                print_status "$line"
            fi
        done
    else
        print_status "No alerts found"
    fi
}

# Clear old alerts
cleanup_alerts() {
    print_status "Cleaning up old alerts..."

    if [ -f "$ALERT_LOG" ]; then
        # Keep only last 1000 lines
        tail -1000 "$ALERT_LOG" > "$ALERT_LOG.tmp"
        mv "$ALERT_LOG.tmp" "$ALERT_LOG"

        print_success "Alert log cleaned up"
    fi
}

# Show usage
show_usage() {
    cat << EOF
Alert Integration Script for Paintbox

Usage: $0 [COMMAND]

Commands:
    monitor          - Run comprehensive monitoring check (default)
    dependency       - Check dependency health only
    service          - Check service health only
    system           - Check system resources only
    test             - Send test alert
    alerts           - Show recent alerts
    cleanup          - Clean up old alerts
    help             - Show this help

Environment Variables:
    SLACK_WEBHOOK_URL      - Slack webhook URL for alerts
    ALERT_EMAIL_TO         - Email address for critical alerts
    CUSTOM_WEBHOOK_URL     - Custom webhook for alerts
    CUSTOM_WEBHOOK_AUTH    - Authorization header for webhook
    HEALTH_CHECK_URL       - Application health check URL
    NODE_ENV               - Environment (development/staging/production)

Examples:
    $0 monitor         # Run all checks
    $0 test           # Send test alert
    $0 alerts         # Show recent alerts
EOF
}

# Main execution
main() {
    local command="${1:-monitor}"

    case "$command" in
        "monitor")
            run_monitoring
            ;;
        "dependency")
            check_dependency_health
            ;;
        "service")
            check_service_health
            ;;
        "system")
            check_system_resources
            ;;
        "test")
            test_alerts
            ;;
        "alerts")
            show_recent_alerts
            ;;
        "cleanup")
            cleanup_alerts
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
