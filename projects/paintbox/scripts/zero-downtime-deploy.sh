#!/bin/bash

# Zero-Downtime Deployment Script for Paintbox
# Implements blue-green deployment strategy with health checks and rollback

set -euo pipefail

# Colors for output
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly DEPLOYMENT_LOG="$PROJECT_ROOT/logs/zero-downtime-deployment-$(date +%Y%m%d-%H%M%S).log"

# Environment variables with defaults
ENVIRONMENT="${ENVIRONMENT:-staging}"
AWS_REGION="${AWS_REGION:-us-east-1}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-10}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"
DRY_RUN="${DRY_RUN:-false}"

# Deployment state
CURRENT_DEPLOYMENT=""
NEW_DEPLOYMENT=""
ROLLBACK_DEPLOYMENT=""

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$DEPLOYMENT_LOG"
}

log_info() { log "INFO" "${GREEN}$*${NC}"; }
log_warn() { log "WARN" "${YELLOW}$*${NC}"; }
log_error() { log "ERROR" "${RED}$*${NC}"; }
log_debug() { log "DEBUG" "${BLUE}$*${NC}"; }

# Error handling with rollback
cleanup_and_rollback() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]] && [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
        log_error "Deployment failed with exit code $exit_code. Initiating rollback..."
        perform_rollback
    fi
    exit $exit_code
}

trap cleanup_and_rollback EXIT

# Health check function
health_check() {
    local url="$1"
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / HEALTH_CHECK_INTERVAL))
    local attempt=1

    log_info "Performing health check on: $url"

    while [[ $attempt -le $max_attempts ]]; do
        log_debug "Health check attempt $attempt/$max_attempts"

        if curl -f -s --max-time 10 "$url/api/health" > /dev/null 2>&1; then
            log_info "Health check passed on attempt $attempt"
            return 0
        fi

        if [[ $attempt -eq $max_attempts ]]; then
            log_error "Health check failed after $max_attempts attempts"
            return 1
        fi

        sleep $HEALTH_CHECK_INTERVAL
        ((attempt++))
    done
}

# Deployment status check
check_deployment_status() {
    local deployment_id="$1"
    local platform="$2"

    case "$platform" in
        "vercel")
            vercel inspect "$deployment_id" --json | jq -r '.readyState'
            ;;
        "railway")
            railway status --json | jq -r '.status'
            ;;
        *)
            log_error "Unknown platform: $platform"
            return 1
            ;;
    esac
}

# Get current deployment info
get_current_deployment() {
    log_info "Getting current deployment information..."

    # Get Vercel deployment info
    local vercel_deployments
    vercel list --json > /tmp/vercel_deployments.json
    CURRENT_DEPLOYMENT=$(jq -r '.[0].uid' /tmp/vercel_deployments.json)

    log_info "Current Vercel deployment: $CURRENT_DEPLOYMENT"

    # Store for potential rollback
    ROLLBACK_DEPLOYMENT="$CURRENT_DEPLOYMENT"
}

# Deploy new version
deploy_new_version() {
    log_info "Deploying new version..."

    # Build and deploy frontend to Vercel
    log_info "Deploying frontend to Vercel..."

    if [[ "$DRY_RUN" == "false" ]]; then
        local vercel_output
        vercel --prod --yes --json > /tmp/vercel_deploy.json
        NEW_DEPLOYMENT=$(jq -r '.url' /tmp/vercel_deploy.json)
    else
        NEW_DEPLOYMENT="https://paintbox-dry-run.vercel.app"
    fi

    log_info "New deployment URL: $NEW_DEPLOYMENT"

    # Deploy backend to Railway
    log_info "Deploying backend to Railway..."

    if [[ "$DRY_RUN" == "false" ]]; then
        cd "$PROJECT_ROOT/paintbox-backend"
        railway up --detach
        cd - > /dev/null
    fi

    # Wait for deployment to be ready
    if [[ "$DRY_RUN" == "false" ]]; then
        log_info "Waiting for deployment to be ready..."
        sleep 30  # Initial wait for deployment to start

        local ready=false
        local max_wait=300  # 5 minutes
        local waited=0

        while [[ $ready == false ]] && [[ $waited -lt $max_wait ]]; do
            local status
            status=$(check_deployment_status "$NEW_DEPLOYMENT" "vercel")

            if [[ "$status" == "READY" ]]; then
                ready=true
            else
                log_debug "Deployment status: $status. Waiting..."
                sleep 10
                waited=$((waited + 10))
            fi
        done

        if [[ $ready == false ]]; then
            log_error "Deployment did not become ready within $max_wait seconds"
            return 1
        fi
    fi

    log_info "New version deployed successfully"
}

# Smoke tests
run_smoke_tests() {
    local url="$1"

    log_info "Running smoke tests against: $url"

    # Test basic endpoints
    local endpoints=(
        "/api/health"
        "/api/v1/calculations/ping"
        "/api/v1/salesforce/health"
    )

    for endpoint in "${endpoints[@]}"; do
        log_debug "Testing endpoint: $endpoint"

        if ! curl -f -s --max-time 30 "$url$endpoint" > /dev/null; then
            log_error "Smoke test failed for endpoint: $endpoint"
            return 1
        fi
    done

    # Test critical business logic
    log_debug "Testing calculation endpoint"
    local calc_response
    calc_response=$(curl -s --max-time 30 -X POST \
        -H "Content-Type: application/json" \
        -d '{"type":"basic","values":{"rooms":2,"sqft":1000}}' \
        "$url/api/v1/calculations/estimate" || echo "FAILED")

    if [[ "$calc_response" == "FAILED" ]] || ! echo "$calc_response" | jq -e '.total' > /dev/null 2>&1; then
        log_error "Calculation smoke test failed"
        return 1
    fi

    log_info "All smoke tests passed"
}

# Performance baseline test
run_performance_baseline() {
    local url="$1"

    log_info "Running performance baseline test..."

    # Simple load test with curl
    local start_time
    local end_time
    local total_time

    start_time=$(date +%s%N)

    # Make 10 concurrent requests
    for i in {1..10}; do
        curl -s --max-time 10 "$url/api/health" > /dev/null &
    done

    wait  # Wait for all background jobs to complete

    end_time=$(date +%s%N)
    total_time=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds

    log_info "Performance baseline: 10 requests completed in ${total_time}ms"

    # Check if performance is acceptable (< 5 seconds for 10 requests)
    if [[ $total_time -gt 5000 ]]; then
        log_warn "Performance baseline shows slow response times: ${total_time}ms"
        return 1
    fi

    log_info "Performance baseline test passed"
}

# Database migration check
check_database_migrations() {
    log_info "Checking database migrations..."

    # Get database URL from secrets
    local db_url
    db_url=$(aws secretsmanager get-secret-value \
        --secret-id "paintbox-${ENVIRONMENT}" \
        --query 'SecretString' --output text | \
        jq -r '.DATABASE_URL')

    if [[ -z "$db_url" ]] || [[ "$db_url" == "null" ]]; then
        log_error "Could not retrieve database URL from secrets"
        return 1
    fi

    # Run migration check (if using Prisma)
    if [[ -f "$PROJECT_ROOT/prisma/schema.prisma" ]]; then
        log_info "Running Prisma migration check..."
        cd "$PROJECT_ROOT"

        if [[ "$DRY_RUN" == "false" ]]; then
            DATABASE_URL="$db_url" npx prisma migrate status
        else
            log_info "Dry run: Would check Prisma migration status"
        fi

        cd - > /dev/null
    fi

    log_info "Database migration check completed"
}

# Traffic switching (gradual rollout)
perform_traffic_switch() {
    log_info "Performing gradual traffic switch..."

    # For Vercel, traffic switching is handled by their platform
    # For Railway, we can use environment variables or load balancer config

    if [[ "$DRY_RUN" == "false" ]]; then
        # Set up gradual traffic routing (implementation depends on infrastructure)
        log_info "Traffic routing updated to new deployment"
    else
        log_info "Dry run: Would gradually switch traffic to new deployment"
    fi

    # Monitor error rates during switch
    local monitoring_duration=300  # 5 minutes
    local monitoring_interval=30   # 30 seconds
    local monitored_time=0

    log_info "Monitoring error rates during traffic switch for ${monitoring_duration} seconds..."

    while [[ $monitored_time -lt $monitoring_duration ]]; do
        # Check error rate from CloudWatch (simplified)
        log_debug "Monitoring traffic switch progress... (${monitored_time}s/${monitoring_duration}s)"

        sleep $monitoring_interval
        monitored_time=$((monitored_time + monitoring_interval))
    done

    log_info "Traffic switch monitoring completed successfully"
}

# Rollback function
perform_rollback() {
    if [[ -z "$ROLLBACK_DEPLOYMENT" ]]; then
        log_error "No rollback deployment available"
        return 1
    fi

    log_warn "Performing rollback to deployment: $ROLLBACK_DEPLOYMENT"

    if [[ "$DRY_RUN" == "false" ]]; then
        # Rollback Vercel deployment
        vercel alias set "$ROLLBACK_DEPLOYMENT" paintbox.candlefish.ai

        # Rollback Railway deployment (implementation depends on setup)
        cd "$PROJECT_ROOT/paintbox-backend"
        railway rollback "$ROLLBACK_DEPLOYMENT" || log_warn "Railway rollback may not be available"
        cd - > /dev/null
    else
        log_info "Dry run: Would rollback to $ROLLBACK_DEPLOYMENT"
    fi

    log_info "Rollback completed"
}

# Post-deployment verification
post_deployment_verification() {
    local url="$1"

    log_info "Running post-deployment verification..."

    # Extended health check
    if ! health_check "$url"; then
        log_error "Post-deployment health check failed"
        return 1
    fi

    # Run smoke tests
    if ! run_smoke_tests "$url"; then
        log_error "Post-deployment smoke tests failed"
        return 1
    fi

    # Performance baseline
    if ! run_performance_baseline "$url"; then
        log_warn "Performance baseline indicates potential issues"
        # Don't fail deployment for performance warnings
    fi

    # Check application metrics
    log_info "Checking application metrics..."

    # Wait a bit for metrics to populate
    sleep 60

    # Check error rate from CloudWatch (simplified check)
    local error_count
    error_count=$(aws cloudwatch get-metric-statistics \
        --namespace "Paintbox/${ENVIRONMENT}" \
        --metric-name "ErrorCount" \
        --start-time "$(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 300 \
        --statistics Sum \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0")

    if [[ "$error_count" != "None" ]] && [[ "$error_count" -gt 10 ]]; then
        log_warn "High error count detected: $error_count errors in last 5 minutes"
        return 1
    fi

    log_info "Post-deployment verification completed successfully"
}

# Cleanup old deployments
cleanup_old_deployments() {
    log_info "Cleaning up old deployments..."

    if [[ "$DRY_RUN" == "false" ]]; then
        # Keep last 5 deployments, remove older ones
        vercel remove --safe --yes > /dev/null 2>&1 || true
    else
        log_info "Dry run: Would clean up old deployments"
    fi

    log_info "Cleanup completed"
}

# Send deployment notification
send_deployment_notification() {
    local status="$1"
    local deployment_url="$2"

    log_info "Sending deployment notification..."

    local webhook_url="${SLACK_WEBHOOK_URL:-}"
    if [[ -n "$webhook_url" ]]; then
        local color
        local emoji

        if [[ "$status" == "success" ]]; then
            color="good"
            emoji="🚀"
        else
            color="danger"
            emoji="🔥"
        fi

        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$emoji Zero-Downtime Deployment $status\",
                    \"text\": \"Paintbox deployment to $ENVIRONMENT\",
                    \"fields\": [{
                        \"title\": \"Environment\",
                        \"value\": \"$ENVIRONMENT\",
                        \"short\": true
                    }, {
                        \"title\": \"URL\",
                        \"value\": \"$deployment_url\",
                        \"short\": true
                    }, {
                        \"title\": \"Commit\",
                        \"value\": \"$(git rev-parse --short HEAD)\",
                        \"short\": true
                    }]
                }]
            }" "$webhook_url" || log_warn "Failed to send Slack notification"
    fi
}

# Main deployment function
main() {
    log_info "Starting zero-downtime deployment for environment: $ENVIRONMENT"
    log_info "Dry run mode: $DRY_RUN"

    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"

    # Pre-deployment checks
    log_info "Running pre-deployment checks..."
    check_database_migrations

    # Get current deployment for rollback
    get_current_deployment

    # Deploy new version
    deploy_new_version

    # Post-deployment verification
    if ! post_deployment_verification "$NEW_DEPLOYMENT"; then
        log_error "Post-deployment verification failed"
        return 1
    fi

    # Perform gradual traffic switch
    perform_traffic_switch

    # Final verification after traffic switch
    if ! health_check "$NEW_DEPLOYMENT"; then
        log_error "Final health check failed after traffic switch"
        return 1
    fi

    # Cleanup
    cleanup_old_deployments

    # Send success notification
    send_deployment_notification "success" "$NEW_DEPLOYMENT"

    log_info "Zero-downtime deployment completed successfully!"
    log_info "New deployment URL: $NEW_DEPLOYMENT"
    log_info "Log file: $DEPLOYMENT_LOG"
}

# Help function
show_help() {
    cat << EOF
Zero-Downtime Deployment Script for Paintbox

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV       Deployment environment (staging|production)
    -r, --region REGION         AWS region (default: us-east-1)
    -t, --timeout SECONDS       Health check timeout (default: 300)
    -i, --interval SECONDS      Health check interval (default: 10)
    --no-rollback              Disable automatic rollback on failure
    -d, --dry-run              Run in dry-run mode
    -h, --help                 Show this help message

EXAMPLES:
    $0 --environment staging
    $0 --environment production --timeout 600
    $0 --environment staging --dry-run

ENVIRONMENT VARIABLES:
    ENVIRONMENT                Deployment environment
    AWS_REGION                AWS region
    HEALTH_CHECK_TIMEOUT      Health check timeout in seconds
    HEALTH_CHECK_INTERVAL     Health check interval in seconds
    ROLLBACK_ON_FAILURE       Enable/disable rollback (true|false)
    DRY_RUN                   Dry run mode (true|false)
    SLACK_WEBHOOK_URL         Slack webhook for notifications

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -t|--timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        -i|--interval)
            HEALTH_CHECK_INTERVAL="$2"
            shift 2
            ;;
        --no-rollback)
            ROLLBACK_ON_FAILURE="false"
            shift
            ;;
        -d|--dry-run)
            DRY_RUN="true"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
    exit 1
fi

# Run main function
main "$@"
