#!/bin/bash
# Paintbox Deployment Rollback Script
# Safely rolls back to the previous working version

set -euo pipefail

# Configuration
APP_NAME="${APP_NAME:-paintbox-app}"
DRY_RUN="${DRY_RUN:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check prerequisites
check_prerequisites() {
    if ! command -v flyctl &> /dev/null; then
        log_error "flyctl is not installed"
        exit 1
    fi

    if [ -z "${FLY_API_TOKEN:-}" ]; then
        log_warn "FLY_API_TOKEN not set, using local authentication"
    fi
}

# Get current deployment info
get_current_deployment() {
    log_info "Getting current deployment information..."

    local current_info
    current_info=$(flyctl status --app "$APP_NAME" --json 2>/dev/null || echo "{}")

    if [ "$current_info" = "{}" ]; then
        log_error "Failed to get current deployment status"
        exit 1
    fi

    local current_version
    current_version=$(echo "$current_info" | jq -r '.DeploymentStatus.Version' 2>/dev/null || echo "unknown")

    log_info "Current deployment version: $current_version"
    echo "$current_version"
}

# Get release history
get_release_history() {
    log_info "Fetching release history..."

    local releases
    releases=$(flyctl releases list --app "$APP_NAME" --json 2>/dev/null || echo "[]")

    if [ "$releases" = "[]" ]; then
        log_error "No release history found"
        exit 1
    fi

    echo "$releases"
}

# Find the last stable release
find_stable_release() {
    local releases="$1"
    local current_version="$2"

    log_info "Finding last stable release..."

    # Get releases that are complete and not the current one
    local stable_release
    stable_release=$(echo "$releases" | jq -r --arg current "$current_version" '
        .[] |
        select(.Status == "complete" and .Version != $current) |
        .Version
    ' | head -1)

    if [ -z "$stable_release" ]; then
        log_error "No stable release found for rollback"
        exit 1
    fi

    log_info "Found stable release: v$stable_release"
    echo "$stable_release"
}

# Perform health check
health_check() {
    local endpoint="${1:-https://$APP_NAME.fly.dev/api/health}"
    local max_attempts=10
    local attempt=0

    log_info "Performing health check on $endpoint"

    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "$endpoint" > /dev/null 2>&1; then
            log_info "Health check passed"
            return 0
        fi

        attempt=$((attempt + 1))
        log_warn "Health check attempt $attempt failed, retrying..."
        sleep 5
    done

    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Backup current state
backup_current_state() {
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="rollback_backup_$timestamp"

    log_info "Creating backup of current state in $backup_dir"

    mkdir -p "$backup_dir"

    # Save current deployment info
    flyctl status --app "$APP_NAME" --json > "$backup_dir/status.json" 2>/dev/null || true
    flyctl releases list --app "$APP_NAME" --json > "$backup_dir/releases.json" 2>/dev/null || true

    # Save recent logs
    flyctl logs --app "$APP_NAME" --lines 1000 > "$backup_dir/logs.txt" 2>/dev/null || true

    log_info "Backup created in $backup_dir"
    echo "$backup_dir"
}

# Perform rollback
perform_rollback() {
    local target_version="$1"

    if [ "$DRY_RUN" = "true" ]; then
        log_info "DRY RUN: Would rollback to version v$target_version"
        return 0
    fi

    log_warn "Rolling back to version v$target_version..."

    # Perform the rollback
    if flyctl deploy --app "$APP_NAME" --image-label "v$target_version"; then
        log_info "Rollback command executed successfully"
    else
        log_error "Rollback command failed"
        exit 1
    fi

    # Wait for deployment to complete
    log_info "Waiting for rollback to complete..."
    sleep 30

    # Verify the rollback
    if health_check; then
        log_info "Rollback successful and health check passed"
        return 0
    else
        log_error "Rollback completed but health check failed"
        return 1
    fi
}

# Generate rollback report
generate_report() {
    local backup_dir="$1"
    local target_version="$2"
    local success="$3"

    local report_file="rollback_report_$(date +%Y%m%d_%H%M%S).md"

    cat > "$report_file" << EOF
# Paintbox Deployment Rollback Report

**Date**: $(date)
**App**: $APP_NAME
**Target Version**: v$target_version
**Status**: $([ "$success" = "true" ] && echo "SUCCESS" || echo "FAILED")
**Backup Location**: $backup_dir

## Rollback Details

### Pre-rollback State
- Deployment was experiencing issues
- Health checks were failing

### Actions Taken
1. Backed up current state
2. Identified stable version: v$target_version
3. Executed rollback
4. Performed health checks

### Post-rollback State
$([ "$success" = "true" ] && echo "- Application is healthy" || echo "- Application may still have issues")
$([ "$success" = "true" ] && echo "- All health checks passing" || echo "- Health checks may be failing")

## Recommendations

$(if [ "$success" = "true" ]; then
    echo "1. Monitor application for next 30 minutes"
    echo "2. Review logs from failed deployment"
    echo "3. Fix issues before next deployment"
else
    echo "1. URGENT: Manual intervention required"
    echo "2. Check application logs"
    echo "3. Consider reverting to an earlier version"
    echo "4. Contact DevOps team if needed"
fi)

## Commands for Investigation

\`\`\`bash
# View current status
flyctl status --app $APP_NAME

# View recent logs
flyctl logs --app $APP_NAME --lines 500

# View release history
flyctl releases list --app $APP_NAME

# Monitor metrics
flyctl metrics show --app $APP_NAME
\`\`\`
EOF

    log_info "Report generated: $report_file"
    cat "$report_file"
}

# Main function
main() {
    log_info "Starting Paintbox deployment rollback process"

    # Check prerequisites
    check_prerequisites

    # Get current deployment info
    current_version=$(get_current_deployment)

    # Get release history
    releases=$(get_release_history)

    # Find target version for rollback
    target_version=$(find_stable_release "$releases" "$current_version")

    # Create backup
    backup_dir=$(backup_current_state)

    # Confirm rollback
    if [ "$DRY_RUN" != "true" ]; then
        echo -e "\n${YELLOW}WARNING: About to rollback from v$current_version to v$target_version${NC}"
        echo -n "Do you want to proceed? (yes/no): "
        read -r confirmation

        if [ "$confirmation" != "yes" ]; then
            log_info "Rollback cancelled by user"
            exit 0
        fi
    fi

    # Perform rollback
    if perform_rollback "$target_version"; then
        log_info "Rollback completed successfully"
        generate_report "$backup_dir" "$target_version" "true"
        exit 0
    else
        log_error "Rollback failed or incomplete"
        generate_report "$backup_dir" "$target_version" "false"
        exit 1
    fi
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --app)
            APP_NAME="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dry-run          Simulate rollback without making changes"
            echo "  --app NAME         Specify app name (default: paintbox-app)"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main
