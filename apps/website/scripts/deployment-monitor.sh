#!/bin/bash

# Deployment monitoring script for Candlefish AI website
# Monitors deployment status and performs post-deployment validation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/logs/deployment-monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Environment URLs
STAGING_URL="https://staging--candlefish-ai.netlify.app"
PRODUCTION_URL="https://candlefish.ai"

# Monitoring configuration
MAX_RETRIES=10
RETRY_INTERVAL=30
HEALTH_CHECK_TIMEOUT=30
PERFORMANCE_THRESHOLD=80

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Ensure logs directory exists
mkdir -p "${PROJECT_ROOT}/logs"

# Logging function
log() {
    echo -e "${TIMESTAMP} - $1" | tee -a "$LOG_FILE"
}

# Check if URL is accessible
check_url_accessibility() {
    local url="$1"
    local max_retries="${2:-5}"
    local retry_count=0

    log "${BLUE}Checking accessibility of ${url}${NC}"

    while [[ $retry_count -lt $max_retries ]]; do
        if curl -f -s --max-time "$HEALTH_CHECK_TIMEOUT" "$url" > /dev/null; then
            log "${GREEN}✓ ${url} is accessible${NC}"
            return 0
        else
            ((retry_count++))
            log "${YELLOW}⚠ Attempt ${retry_count}/${max_retries}: ${url} not accessible${NC}"

            if [[ $retry_count -lt $max_retries ]]; then
                sleep "$RETRY_INTERVAL"
            fi
        fi
    done

    log "${RED}✗ ${url} is not accessible after ${max_retries} attempts${NC}"
    return 1
}

# Check deployment status on Netlify
check_netlify_deployment() {
    local site_id="$1"
    local expected_commit="${2:-}"

    log "${BLUE}Checking Netlify deployment status${NC}"

    if ! command -v netlify &> /dev/null; then
        log "${YELLOW}⚠ Netlify CLI not available, skipping deployment status check${NC}"
        return 0
    fi

    local deployment_info
    if deployment_info=$(netlify api listSiteDeploys --site-id="$site_id" --data='{"per_page": 1}' 2>/dev/null); then
        local deploy_state
        local deploy_commit
        local deploy_url

        deploy_state=$(echo "$deployment_info" | jq -r '.[0].state' 2>/dev/null || echo "unknown")
        deploy_commit=$(echo "$deployment_info" | jq -r '.[0].commit_ref' 2>/dev/null || echo "unknown")
        deploy_url=$(echo "$deployment_info" | jq -r '.[0].deploy_ssl_url' 2>/dev/null || echo "unknown")

        log "${BLUE}Latest deployment state: ${deploy_state}${NC}"
        log "${BLUE}Latest deployment commit: ${deploy_commit}${NC}"
        log "${BLUE}Latest deployment URL: ${deploy_url}${NC}"

        if [[ "$deploy_state" == "ready" ]]; then
            log "${GREEN}✓ Deployment is ready${NC}"

            if [[ -n "$expected_commit" && "$deploy_commit" == "$expected_commit"* ]]; then
                log "${GREEN}✓ Deployment commit matches expected: ${expected_commit}${NC}"
            elif [[ -n "$expected_commit" ]]; then
                log "${YELLOW}⚠ Deployment commit (${deploy_commit}) doesn't match expected (${expected_commit})${NC}"
            fi

            return 0
        else
            log "${RED}✗ Deployment state: ${deploy_state}${NC}"
            return 1
        fi
    else
        log "${YELLOW}⚠ Could not retrieve deployment info${NC}"
        return 1
    fi
}

# Run comprehensive health checks
run_health_checks() {
    local url="$1"
    local check_name="$2"

    log "${PURPLE}Running comprehensive health checks for ${check_name}${NC}"

    # Run the health check script
    if "$SCRIPT_DIR/health-check.sh" "$url"; then
        log "${GREEN}✓ Health checks passed for ${check_name}${NC}"
        return 0
    else
        log "${RED}✗ Health checks failed for ${check_name}${NC}"
        return 1
    fi
}

# Run performance monitoring
run_performance_check() {
    local url="$1"
    local check_name="$2"

    log "${PURPLE}Running performance check for ${check_name}${NC}"

    if command -v node &> /dev/null && [[ -f "$SCRIPT_DIR/performance-monitor.js" ]]; then
        if node "$SCRIPT_DIR/performance-monitor.js" "$url"; then
            log "${GREEN}✓ Performance check passed for ${check_name}${NC}"
            return 0
        else
            log "${YELLOW}⚠ Performance check had issues for ${check_name}${NC}"
            return 1
        fi
    else
        log "${YELLOW}⚠ Performance monitoring not available${NC}"
        return 0
    fi
}

# Check for broken links
check_broken_links() {
    local url="$1"
    local check_name="$2"

    log "${BLUE}Checking for broken links on ${check_name}${NC}"

    # Simple broken link check using curl
    local main_page_content
    if main_page_content=$(curl -s "$url"); then
        # Extract internal links
        local internal_links
        internal_links=$(echo "$main_page_content" | grep -oP 'href="(/[^"]*)"' | sed 's/href="//;s/"//' | sort -u | head -10)

        local broken_count=0
        local total_count=0

        while IFS= read -r link; do
            if [[ -n "$link" && "$link" != "/" ]]; then
                ((total_count++))
                local full_url="${url}${link}"

                if ! curl -f -s --max-time 10 "$full_url" > /dev/null; then
                    log "${YELLOW}⚠ Broken link found: ${full_url}${NC}"
                    ((broken_count++))
                fi
            fi
        done <<< "$internal_links"

        if [[ $broken_count -eq 0 ]]; then
            log "${GREEN}✓ No broken links found (checked ${total_count} links)${NC}"
            return 0
        else
            log "${YELLOW}⚠ Found ${broken_count}/${total_count} broken links${NC}"
            return 1
        fi
    else
        log "${RED}✗ Could not fetch main page for link checking${NC}"
        return 1
    fi
}

# Monitor staging deployment
monitor_staging() {
    local commit_sha="${1:-}"

    log "${PURPLE}=== Monitoring Staging Deployment ===${NC}"

    local success=true

    # Check accessibility
    if ! check_url_accessibility "$STAGING_URL" "$MAX_RETRIES"; then
        success=false
    fi

    # Run health checks
    if ! run_health_checks "$STAGING_URL" "staging"; then
        success=false
    fi

    # Check for broken links
    if ! check_broken_links "$STAGING_URL" "staging"; then
        success=false
    fi

    # Run performance check
    if ! run_performance_check "$STAGING_URL" "staging"; then
        # Don't fail on performance issues in staging
        log "${YELLOW}⚠ Performance check had issues but continuing${NC}"
    fi

    if $success; then
        log "${GREEN}✓ Staging deployment monitoring completed successfully${NC}"
        return 0
    else
        log "${RED}✗ Staging deployment monitoring failed${NC}"
        return 1
    fi
}

# Monitor production deployment
monitor_production() {
    local commit_sha="${1:-}"

    log "${PURPLE}=== Monitoring Production Deployment ===${NC}"

    local success=true

    # Check accessibility
    if ! check_url_accessibility "$PRODUCTION_URL" "$MAX_RETRIES"; then
        success=false
    fi

    # Check Netlify deployment status
    if [[ -n "${NETLIFY_SITE_ID:-}" ]]; then
        if ! check_netlify_deployment "$NETLIFY_SITE_ID" "$commit_sha"; then
            success=false
        fi
    fi

    # Run health checks
    if ! run_health_checks "$PRODUCTION_URL" "production"; then
        success=false
    fi

    # Check for broken links
    if ! check_broken_links "$PRODUCTION_URL" "production"; then
        success=false
    fi

    # Run performance check
    if ! run_performance_check "$PRODUCTION_URL" "production"; then
        success=false
    fi

    if $success; then
        log "${GREEN}✓ Production deployment monitoring completed successfully${NC}"
        return 0
    else
        log "${RED}✗ Production deployment monitoring failed${NC}"
        return 1
    fi
}

# Send notification
send_notification() {
    local status="$1"
    local environment="$2"
    local message="$3"

    log "${BLUE}Sending ${status} notification for ${environment}${NC}"

    # Create notification file for external monitoring systems
    local notification_file="${PROJECT_ROOT}/logs/deployment-notification.json"
    local notification_data="{
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"environment\": \"${environment}\",
        \"status\": \"${status}\",
        \"message\": \"${message}\",
        \"commit\": \"${GITHUB_SHA:-unknown}\"
    }"

    echo "$notification_data" > "$notification_file"

    # Additional notification methods can be added here
    # e.g., Slack, email, webhooks, etc.
}

# Main monitoring function
main_monitor() {
    local environment="${1:-staging}"
    local commit_sha="${2:-}"

    log "${PURPLE}Starting deployment monitoring for ${environment}${NC}"
    log "Commit SHA: ${commit_sha:-unknown}"
    log "Timestamp: ${TIMESTAMP}"
    log "======================================="

    local success=false
    local message=""

    case "$environment" in
        "staging")
            if monitor_staging "$commit_sha"; then
                success=true
                message="Staging deployment monitoring completed successfully"
            else
                message="Staging deployment monitoring failed"
            fi
            ;;
        "production")
            if monitor_production "$commit_sha"; then
                success=true
                message="Production deployment monitoring completed successfully"
            else
                message="Production deployment monitoring failed"
            fi
            ;;
        *)
            log "${RED}Error: Unknown environment '${environment}'${NC}"
            exit 1
            ;;
    esac

    # Send notification
    if $success; then
        send_notification "success" "$environment" "$message"
        log "${GREEN}${message}${NC}"
    else
        send_notification "failure" "$environment" "$message"
        log "${RED}${message}${NC}"
        exit 1
    fi
}

# Script usage
usage() {
    echo "Usage: $0 [staging|production] [commit-sha]"
    echo "  environment: staging or production (default: staging)"
    echo "  commit-sha: Expected commit SHA for deployment verification"
    echo ""
    echo "Examples:"
    echo "  $0 staging                    # Monitor staging deployment"
    echo "  $0 production abc1234         # Monitor production with commit verification"
    echo "  $0 production \$GITHUB_SHA     # Monitor production with GitHub Actions commit"
}

# Main execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
        usage
        exit 0
    fi

    main_monitor "${1:-staging}" "${2:-}"
fi
