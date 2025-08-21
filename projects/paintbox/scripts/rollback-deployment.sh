#!/bin/bash

##############################################################################
# Automated Rollback Script for Paintbox
# Handles emergency rollback when JWKS or other critical services fail
##############################################################################

set -euo pipefail

# Configuration
APP_NAME="paintbox"
APP_URL="https://${APP_NAME}.fly.dev"
ROLLBACK_TIMEOUT=300  # 5 minutes
VALIDATION_RETRIES=10
VALIDATION_DELAY=15
LOG_FILE="/tmp/rollback-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Rollback tracking
ROLLBACK_REASON=""
ROLLBACK_INITIATED_BY=""
ORIGINAL_VERSION=""
TARGET_VERSION=""

##############################################################################
# Logging Functions
##############################################################################

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}" | tee -a "$LOG_FILE"
}

##############################################################################
# Validation Functions
##############################################################################

check_jwks_health() {
    local url="$1"
    log "Checking JWKS endpoint health..."

    local response
    if response=$(curl -sf --max-time 10 "$url/.well-known/jwks.json" 2>/dev/null); then
        local keys_count
        keys_count=$(echo "$response" | jq -r '.keys | length' 2>/dev/null || echo "0")

        if [[ "$keys_count" -gt 0 ]]; then
            log_success "JWKS endpoint healthy with $keys_count key(s)"
            return 0
        else
            log_error "JWKS endpoint returns empty keys array"
            return 1
        fi
    else
        log_error "JWKS endpoint not accessible"
        return 1
    fi
}

check_app_health() {
    local url="$1"
    log "Checking application health..."

    # Basic connectivity
    if ! curl -sf --max-time 10 "$url" > /dev/null 2>&1; then
        log_error "Application not accessible"
        return 1
    fi

    # Health endpoint
    if ! curl -sf --max-time 10 "$url/api/health" > /dev/null 2>&1; then
        log_error "Health endpoint not responding"
        return 1
    fi

    # JWKS endpoint
    if ! check_jwks_health "$url"; then
        return 1
    fi

    log_success "Application health check passed"
    return 0
}

##############################################################################
# Rollback Decision Logic
##############################################################################

assess_rollback_necessity() {
    log "Assessing rollback necessity..."

    local failures=0
    local critical_failures=()

    # Test JWKS endpoint
    if ! check_jwks_health "$APP_URL"; then
        critical_failures+=("JWKS_ENDPOINT")
        ((failures++))
    fi

    # Test health endpoint
    if ! curl -sf --max-time 10 "$APP_URL/api/health" > /dev/null 2>&1; then
        critical_failures+=("HEALTH_ENDPOINT")
        ((failures++))
    fi

    # Test main application
    if ! curl -sf --max-time 10 "$APP_URL" > /dev/null 2>&1; then
        critical_failures+=("APP_ACCESSIBILITY")
        ((failures++))
    fi

    if [[ $failures -gt 0 ]]; then
        ROLLBACK_REASON="Critical failures: ${critical_failures[*]}"
        log_error "Rollback necessary: $ROLLBACK_REASON"
        return 0  # Rollback needed
    else
        log_success "No rollback necessary - application is healthy"
        return 1  # No rollback needed
    fi
}

##############################################################################
# Deployment History Management
##############################################################################

get_deployment_history() {
    log "Retrieving deployment history..."

    if ! command -v flyctl &> /dev/null; then
        log_error "flyctl not available"
        return 1
    fi

    local releases
    if ! releases=$(flyctl releases list --app "$APP_NAME" --json 2>/dev/null); then
        log_error "Failed to get deployment history"
        return 1
    fi

    echo "$releases" | jq -r '.[0:5] | .[] | "\(.Version)|\(.Status)|\(.CreatedAt)|\(.Description // "No description")"' | head -10
}

find_last_stable_version() {
    log "Finding last stable deployment version..."

    local releases
    if ! releases=$(flyctl releases list --app "$APP_NAME" --json 2>/dev/null); then
        log_error "Cannot retrieve release history"
        return 1
    fi

    # Get current version
    ORIGINAL_VERSION=$(echo "$releases" | jq -r '.[0].Version' 2>/dev/null || echo "unknown")
    log "Current version: $ORIGINAL_VERSION"

    # Find the most recent successful deployment (excluding current)
    local stable_version
    stable_version=$(echo "$releases" | jq -r '.[] | select(.Status == "complete" and .Version != "'$ORIGINAL_VERSION'") | .Version' | head -1 2>/dev/null || echo "")

    if [[ -n "$stable_version" ]]; then
        TARGET_VERSION="$stable_version"
        log_success "Found stable version to rollback to: $TARGET_VERSION"
        return 0
    else
        log_error "No stable version found for rollback"
        return 1
    fi
}

##############################################################################
# Rollback Execution
##############################################################################

execute_rollback() {
    log "Executing rollback to version $TARGET_VERSION..."

    # Create rollback record
    local rollback_record="/tmp/paintbox-rollback-$(date +%s).json"
    cat > "$rollback_record" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "app": "$APP_NAME",
    "original_version": "$ORIGINAL_VERSION",
    "target_version": "$TARGET_VERSION",
    "reason": "$ROLLBACK_REASON",
    "initiated_by": "$ROLLBACK_INITIATED_BY",
    "log_file": "$LOG_FILE"
}
EOF

    log "Rollback record: $rollback_record"

    # Execute rollback
    log "Deploying previous version: $TARGET_VERSION"

    if flyctl deploy \
        --app "$APP_NAME" \
        --image-label "v$TARGET_VERSION" \
        --strategy immediate \
        --wait-timeout "$ROLLBACK_TIMEOUT" \
        --verbose; then

        log_success "Rollback deployment completed"
    else
        log_error "Rollback deployment failed"
        return 1
    fi

    # Wait for rollback to stabilize
    log "Waiting for rollback to stabilize..."
    sleep 30

    return 0
}

validate_rollback() {
    log "Validating rollback success..."

    local retry_count=0
    while [[ $retry_count -lt $VALIDATION_RETRIES ]]; do
        if check_app_health "$APP_URL"; then
            log_success "Rollback validation successful"
            return 0
        fi

        ((retry_count++))
        if [[ $retry_count -lt $VALIDATION_RETRIES ]]; then
            log "Validation attempt $retry_count/$VALIDATION_RETRIES failed, retrying in ${VALIDATION_DELAY}s..."
            sleep $VALIDATION_DELAY
        fi
    done

    log_error "Rollback validation failed after $VALIDATION_RETRIES attempts"
    return 1
}

##############################################################################
# Notification System
##############################################################################

send_rollback_notification() {
    local status="$1"
    local message="$2"

    log "Sending rollback notification: $status"

    # Slack notification (if configured)
    if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
        local color="danger"
        case $status in
            "SUCCESS") color="good" ;;
            "WARNING") color="warning" ;;
        esac

        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"Paintbox Rollback: $status\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"App\", \"value\": \"$APP_NAME\", \"short\": true},
                        {\"title\": \"From Version\", \"value\": \"$ORIGINAL_VERSION\", \"short\": true},
                        {\"title\": \"To Version\", \"value\": \"$TARGET_VERSION\", \"short\": true},
                        {\"title\": \"Reason\", \"value\": \"$ROLLBACK_REASON\", \"short\": false},
                        {\"title\": \"Timestamp\", \"value\": \"$(date)\", \"short\": false}
                    ]
                }]
            }" \
            "$SLACK_WEBHOOK" || log_warning "Failed to send Slack notification"
    fi

    # Email notification (if configured)
    if [[ -n "${NOTIFICATION_EMAIL:-}" ]] && command -v mail &> /dev/null; then
        echo "Paintbox rollback $status: $message" | \
            mail -s "Paintbox Rollback Alert - $status" "$NOTIFICATION_EMAIL" || \
            log_warning "Failed to send email notification"
    fi
}

##############################################################################
# Emergency Operations
##############################################################################

emergency_rollback() {
    log "EMERGENCY ROLLBACK INITIATED"
    ROLLBACK_INITIATED_BY="EMERGENCY"

    # Skip health assessment in emergency mode
    ROLLBACK_REASON="Emergency rollback requested"

    if ! find_last_stable_version; then
        log_error "Cannot find stable version for emergency rollback"
        send_rollback_notification "FAILED" "Cannot find stable version for emergency rollback"
        return 1
    fi

    if execute_rollback && validate_rollback; then
        log_success "Emergency rollback completed successfully"
        send_rollback_notification "SUCCESS" "Emergency rollback completed successfully"
        return 0
    else
        log_error "Emergency rollback failed"
        send_rollback_notification "FAILED" "Emergency rollback failed - manual intervention required"
        return 1
    fi
}

##############################################################################
# Main Rollback Logic
##############################################################################

main() {
    log "=== Paintbox Automated Rollback System ==="
    log "Log file: $LOG_FILE"

    ROLLBACK_INITIATED_BY="AUTOMATED"

    # Check if rollback is necessary (unless in emergency mode)
    if [[ "${1:-}" != "--emergency" ]]; then
        if ! assess_rollback_necessity; then
            log_success "No rollback required - application is healthy"
            exit 0
        fi
    fi

    # Show deployment history for context
    log "Recent deployment history:"
    get_deployment_history || log_warning "Could not retrieve deployment history"

    # Find stable version to rollback to
    if ! find_last_stable_version; then
        log_error "Cannot proceed with rollback - no stable version found"
        send_rollback_notification "FAILED" "No stable version available for rollback"
        exit 1
    fi

    # Confirm rollback (in interactive mode)
    if [[ -t 0 ]] && [[ "${1:-}" != "--emergency" ]] && [[ "${FORCE_ROLLBACK:-}" != "true" ]]; then
        echo ""
        echo -e "${YELLOW}Rollback Confirmation${NC}"
        echo "Reason: $ROLLBACK_REASON"
        echo "Current Version: $ORIGINAL_VERSION"
        echo "Target Version: $TARGET_VERSION"
        echo ""
        read -p "Continue with rollback? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Rollback cancelled by user"
            exit 0
        fi
    fi

    # Execute rollback
    if execute_rollback; then
        if validate_rollback; then
            log_success "Rollback completed and validated successfully"
            send_rollback_notification "SUCCESS" "Rollback completed successfully from v$ORIGINAL_VERSION to v$TARGET_VERSION"

            # Generate rollback report
            generate_rollback_report

            exit 0
        else
            log_error "Rollback completed but validation failed"
            send_rollback_notification "WARNING" "Rollback completed but validation failed - manual verification required"
            exit 1
        fi
    else
        log_error "Rollback execution failed"
        send_rollback_notification "FAILED" "Rollback execution failed - manual intervention required"
        exit 1
    fi
}

generate_rollback_report() {
    log "Generating rollback report..."

    local report_file="/tmp/paintbox-rollback-report-$(date +%Y%m%d-%H%M%S).json"

    cat > "$report_file" << EOF
{
    "rollback_summary": {
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
        "app": "$APP_NAME",
        "success": true,
        "duration": "$(( $(date +%s) - $(date -d "$(head -1 "$LOG_FILE" | cut -d']' -f1 | tr -d '[')" +%s) ))s",
        "original_version": "$ORIGINAL_VERSION",
        "target_version": "$TARGET_VERSION",
        "reason": "$ROLLBACK_REASON",
        "initiated_by": "$ROLLBACK_INITIATED_BY"
    },
    "validation_results": {
        "app_accessible": $(check_app_health "$APP_URL" > /dev/null 2>&1 && echo "true" || echo "false"),
        "jwks_healthy": $(check_jwks_health "$APP_URL" > /dev/null 2>&1 && echo "true" || echo "false")
    },
    "log_file": "$LOG_FILE"
}
EOF

    log_success "Rollback report generated: $report_file"
}

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Automated rollback system for Paintbox deployment"
    echo ""
    echo "Options:"
    echo "  --emergency     Skip health checks and force immediate rollback"
    echo "  --force         Skip interactive confirmation"
    echo "  --check-only    Only assess if rollback is necessary"
    echo "  --help          Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  SLACK_WEBHOOK      Slack webhook URL for notifications"
    echo "  NOTIFICATION_EMAIL Email address for alerts"
    echo "  FORCE_ROLLBACK     Set to 'true' to skip confirmation"
    echo ""
}

# Parse arguments
case "${1:-}" in
    --emergency)
        emergency_rollback
        exit $?
        ;;
    --check-only)
        assess_rollback_necessity
        exit $?
        ;;
    --help)
        usage
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
