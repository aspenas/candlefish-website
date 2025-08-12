#!/bin/bash
# Paintbox Deployment Monitoring Script
# Monitors Fly.io deployment health and performance

set -euo pipefail

# Configuration
APP_NAME="${APP_NAME:-paintbox-app}"
HEALTH_ENDPOINT="${HEALTH_ENDPOINT:-https://paintbox-app.fly.dev/api/health}"
MONITOR_DURATION="${MONITOR_DURATION:-300}" # 5 minutes default
CHECK_INTERVAL="${CHECK_INTERVAL:-30}" # 30 seconds between checks
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Send notification to Slack
send_slack_notification() {
    local message="$1"
    local color="${2:-#36a64f}"

    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"Paintbox Deployment Monitor\",
                    \"text\": \"$message\",
                    \"timestamp\": $(date +%s)
                }]
            }" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

# Check health endpoint
check_health() {
    local response
    local http_code

    response=$(curl -s -w "\n%{http_code}" "$HEALTH_ENDPOINT" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Check Fly.io machine status
check_fly_status() {
    if ! command -v flyctl &> /dev/null; then
        log_warn "flyctl not installed, skipping Fly.io status check"
        return 0
    fi

    local status
    status=$(flyctl status --app "$APP_NAME" --json 2>/dev/null || echo "{}")

    # Check if any machines are unhealthy
    local unhealthy
    unhealthy=$(echo "$status" | jq -r '.Machines[] | select(.state != "started") | .id' 2>/dev/null || echo "")

    if [ -n "$unhealthy" ]; then
        log_warn "Unhealthy machines detected: $unhealthy"
        return 1
    fi

    return 0
}

# Monitor memory usage
check_memory() {
    if ! command -v flyctl &> /dev/null; then
        return 0
    fi

    local metrics
    metrics=$(flyctl metrics show --app "$APP_NAME" --range 5m 2>/dev/null || echo "{}")

    # Parse memory usage (this is simplified, actual parsing depends on flyctl output format)
    local memory_usage
    memory_usage=$(echo "$metrics" | grep -i memory | awk '{print $NF}' | head -1)

    if [ -n "$memory_usage" ]; then
        log_info "Memory usage: $memory_usage"
    fi
}

# Monitor response times
check_response_time() {
    local start_time
    local end_time
    local response_time

    start_time=$(date +%s%N)
    if curl -s -o /dev/null "$HEALTH_ENDPOINT"; then
        end_time=$(date +%s%N)
        response_time=$(( (end_time - start_time) / 1000000 ))

        if [ "$response_time" -gt 5000 ]; then
            log_warn "Slow response time: ${response_time}ms"
        else
            log_info "Response time: ${response_time}ms"
        fi
    fi
}

# Check application logs for errors
check_logs() {
    if ! command -v flyctl &> /dev/null; then
        return 0
    fi

    local error_count
    error_count=$(flyctl logs --app "$APP_NAME" --lines 100 2>/dev/null | grep -ci "error" || echo "0")

    if [ "$error_count" -gt 10 ]; then
        log_warn "High error rate detected: $error_count errors in last 100 lines"
        return 1
    fi

    return 0
}

# Main monitoring loop
main() {
    log_info "Starting Paintbox deployment monitoring"
    log_info "App: $APP_NAME"
    log_info "Duration: ${MONITOR_DURATION}s"
    log_info "Check interval: ${CHECK_INTERVAL}s"

    local start_time
    local current_time
    local health_failures=0
    local total_checks=0

    start_time=$(date +%s)

    # Initial notification
    send_slack_notification "Deployment monitoring started for $APP_NAME" "#36a64f"

    while true; do
        current_time=$(date +%s)
        elapsed=$((current_time - start_time))

        if [ "$elapsed" -ge "$MONITOR_DURATION" ]; then
            break
        fi

        total_checks=$((total_checks + 1))
        log_info "Check #$total_checks (${elapsed}s elapsed)"

        # Perform health checks
        if check_health; then
            log_info "Health check: PASS"
        else
            log_error "Health check: FAIL"
            health_failures=$((health_failures + 1))

            if [ "$health_failures" -gt 3 ]; then
                log_error "Too many health check failures ($health_failures)"
                send_slack_notification "⚠️ Health check failures detected for $APP_NAME" "#ff0000"
            fi
        fi

        # Check Fly.io status
        if ! check_fly_status; then
            log_warn "Fly.io machine status check failed"
        fi

        # Check memory usage
        check_memory

        # Check response times
        check_response_time

        # Check logs for errors
        if ! check_logs; then
            log_warn "Error rate check failed"
        fi

        # Sleep before next check
        sleep "$CHECK_INTERVAL"
    done

    # Final summary
    local success_rate
    if [ "$total_checks" -gt 0 ]; then
        success_rate=$(( (total_checks - health_failures) * 100 / total_checks ))
    else
        success_rate=0
    fi

    log_info "Monitoring complete"
    log_info "Total checks: $total_checks"
    log_info "Health failures: $health_failures"
    log_info "Success rate: ${success_rate}%"

    # Send final notification
    if [ "$success_rate" -ge 95 ]; then
        send_slack_notification "✅ Monitoring complete. Success rate: ${success_rate}%" "#36a64f"
        exit 0
    elif [ "$success_rate" -ge 80 ]; then
        send_slack_notification "⚠️ Monitoring complete with warnings. Success rate: ${success_rate}%" "#ff9900"
        exit 0
    else
        send_slack_notification "❌ Monitoring detected issues. Success rate: ${success_rate}%" "#ff0000"
        exit 1
    fi
}

# Handle script interruption
trap 'log_info "Monitoring interrupted"; exit 130' INT TERM

# Run main function
main "$@"
