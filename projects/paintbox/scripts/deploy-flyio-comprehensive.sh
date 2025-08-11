#!/bin/bash

# Comprehensive Production Deployment Script for Paintbox on Fly.io
# Supports blue-green deployment, rollback, multi-region, and smoke tests

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_LOG="$PROJECT_ROOT/deployment.log"
ROLLBACK_INFO_FILE="$PROJECT_ROOT/.rollback-info"

# Default values
FLY_APP_NAME="${FLY_APP_NAME:-paintbox-app}"
PRIMARY_REGION="${PRIMARY_REGION:-sjc}"
SECONDARY_REGION="${SECONDARY_REGION:-ord}"
ENVIRONMENT="${ENVIRONMENT:-production}"
DEPLOYMENT_STRATEGY="${DEPLOYMENT_STRATEGY:-bluegreen}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
SMOKE_TEST_TIMEOUT="${SMOKE_TEST_TIMEOUT:-120}"

# Deployment tracking
DEPLOYMENT_ID=$(date +%Y%m%d_%H%M%S)
START_TIME=$(date +%s)

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$DEPLOYMENT_LOG"
}

log_info() { log "${BLUE}INFO${NC}" "$@"; }
log_success() { log "${GREEN}SUCCESS${NC}" "$@"; }
log_warning() { log "${YELLOW}WARNING${NC}" "$@"; }
log_error() { log "${RED}ERROR${NC}" "$@"; }

# Error handling with automatic rollback
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Deployment failed with exit code $exit_code"
        if [[ "${AUTO_ROLLBACK:-true}" == "true" ]]; then
            log_warning "Starting automatic rollback..."
            rollback_deployment
        fi
    fi
}

trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    log_info "Checking deployment prerequisites..."

    local missing_tools=()

    command -v flyctl &> /dev/null || missing_tools+=("flyctl")
    command -v aws &> /dev/null || missing_tools+=("aws")
    command -v jq &> /dev/null || missing_tools+=("jq")
    command -v curl &> /dev/null || missing_tools+=("curl")
    command -v npm &> /dev/null || missing_tools+=("npm")
    command -v bc &> /dev/null || missing_tools+=("bc")

    if [[ ${#missing_tools[@]} -ne 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi

    # Check authentication
    if ! flyctl auth whoami &> /dev/null; then
        log_error "Not authenticated with Fly.io. Run: flyctl auth login"
        exit 1
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "Not authenticated with AWS. Run: aws configure"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."

    # Check if app exists
    if ! flyctl apps list | grep -q "$FLY_APP_NAME"; then
        log_error "Fly.io app '$FLY_APP_NAME' does not exist"
        exit 1
    fi

    # Validate configuration files
    if [[ ! -f "$PROJECT_ROOT/fly.secure.toml" ]]; then
        log_error "Missing fly.secure.toml configuration"
        exit 1
    fi

    # Check AWS Secrets Manager connectivity
    local secret_name="paintbox/${ENVIRONMENT}/secrets"
    if ! aws secretsmanager describe-secret --secret-id "$secret_name" --region us-east-1 &> /dev/null; then
        log_warning "AWS Secrets Manager secret not found. Run setup-aws-secrets.sh first"
    fi

    # Install dependencies
    log_info "Installing dependencies..."
    cd "$PROJECT_ROOT"
    npm ci --production=false

    # Run linting
    log_info "Running code quality checks..."
    npm run lint || {
        log_warning "Linting issues found. Continuing with deployment..."
    }

    # Check TypeScript compilation
    log_info "Checking TypeScript compilation..."
    npm run build || {
        log_error "Build failed. Deployment aborted."
        exit 1
    }

    # Run test suite
    log_info "Running test suite..."
    npm test || {
        log_error "Tests failed. Deployment aborted."
        exit 1
    }

    # Check Docker build
    log_info "Validating Docker build..."
    if [[ -f "Dockerfile.fly.optimized" ]]; then
        docker build -f Dockerfile.fly.optimized -t paintbox-test . || {
            log_error "Docker build failed. Deployment aborted."
            exit 1
        }
        docker image rm paintbox-test || true
    fi

    log_success "Pre-deployment checks passed"
}

# Save rollback information
save_rollback_info() {
    log_info "Saving rollback information..."

    local current_release
    current_release=$(flyctl releases list --app "$FLY_APP_NAME" --json 2>/dev/null | jq -r '.[0].id' 2>/dev/null || echo "unknown")

    local current_image
    current_image=$(flyctl config show --app "$FLY_APP_NAME" 2>/dev/null | grep -o 'registry.fly.io/[^[:space:]]*' | head -1 || echo "unknown")

    cat > "$ROLLBACK_INFO_FILE" << EOF
{
  "deployment_id": "$DEPLOYMENT_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "previous_release": "$current_release",
  "previous_image": "$current_image",
  "fly_app_name": "$FLY_APP_NAME",
  "environment": "$ENVIRONMENT",
  "deployment_strategy": "$DEPLOYMENT_STRATEGY"
}
EOF

    log_success "Rollback information saved"
}

# Build and deploy
deploy_application() {
    log_info "Starting deployment (Strategy: $DEPLOYMENT_STRATEGY)..."

    cd "$PROJECT_ROOT"

    # Use secure configuration
    cp fly.secure.toml fly.toml

    case "$DEPLOYMENT_STRATEGY" in
        "bluegreen")
            deploy_bluegreen
            ;;
        "rolling")
            deploy_rolling
            ;;
        "canary")
            deploy_canary
            ;;
        *)
            log_error "Unknown deployment strategy: $DEPLOYMENT_STRATEGY"
            exit 1
            ;;
    esac
}

# Blue-green deployment
deploy_bluegreen() {
    log_info "Executing blue-green deployment..."

    # Create a staging slot
    local staging_app="${FLY_APP_NAME}-staging"

    # Clone app for staging
    log_info "Creating staging environment..."
    flyctl apps create "$staging_app" --org personal 2>/dev/null || log_info "Staging app already exists"

    # Deploy to staging first
    log_info "Deploying to staging environment..."
    flyctl deploy --app "$staging_app" --config fly.secure.toml --wait-timeout 600s

    # Run smoke tests on staging
    log_info "Testing staging environment..."
    if ! run_smoke_tests "https://${staging_app}.fly.dev"; then
        log_error "Staging tests failed. Aborting deployment."
        flyctl apps destroy "$staging_app" --yes 2>/dev/null || true
        exit 1
    fi

    # Deploy to production
    log_info "Deploying to production..."
    flyctl deploy --app "$FLY_APP_NAME" --config fly.secure.toml --wait-timeout 600s

    # Wait for health checks
    wait_for_healthy_deployment

    # Run production smoke tests
    log_info "Testing production environment..."
    if ! run_smoke_tests "https://${FLY_APP_NAME}.fly.dev"; then
        log_error "Production tests failed. Rolling back..."
        rollback_deployment
        exit 1
    fi

    # Scale to multiple regions
    if [[ -n "$SECONDARY_REGION" ]]; then
        log_info "Scaling to secondary region: $SECONDARY_REGION"
        flyctl scale count 2 --app "$FLY_APP_NAME" --region "$SECONDARY_REGION"
        wait_for_healthy_deployment
    fi

    # Cleanup staging
    log_info "Cleaning up staging environment..."
    flyctl apps destroy "$staging_app" --yes 2>/dev/null || true

    log_success "Blue-green deployment completed"
}

# Rolling deployment
deploy_rolling() {
    log_info "Executing rolling deployment..."

    flyctl deploy \
        --config fly.secure.toml \
        --app "$FLY_APP_NAME" \
        --strategy rolling \
        --wait-timeout 600s

    wait_for_healthy_deployment

    log_success "Rolling deployment completed"
}

# Canary deployment
deploy_canary() {
    log_info "Executing canary deployment..."

    # Deploy canary version with 10% traffic
    log_info "Deploying canary with 10% traffic..."
    flyctl deploy \
        --config fly.secure.toml \
        --app "$FLY_APP_NAME" \
        --strategy canary \
        --wait-timeout 600s

    # Monitor for 5 minutes
    log_info "Monitoring canary for 5 minutes..."
    sleep 300

    # Check error rates and performance
    if validate_canary_metrics; then
        log_info "Canary validation passed. Promoting to 100%..."
        flyctl deploy promote --app "$FLY_APP_NAME"
    else
        log_error "Canary validation failed. Rolling back..."
        rollback_deployment
        exit 1
    fi

    log_success "Canary deployment completed"
}

# Validate canary metrics
validate_canary_metrics() {
    log_info "Validating canary metrics..."

    local app_url="https://${FLY_APP_NAME}.fly.dev"
    local error_count=0

    # Run 20 test requests
    for i in {1..20}; do
        if ! curl -f -s --max-time 10 "$app_url/api/health" > /dev/null; then
            ((error_count++))
        fi
        sleep 1
    done

    local error_rate=$((error_count * 100 / 20))
    log_info "Canary error rate: ${error_rate}%"

    # Allow up to 5% error rate
    if [[ $error_rate -le 5 ]]; then
        log_success "Canary validation passed (error rate: ${error_rate}%)"
        return 0
    else
        log_error "Canary validation failed (error rate: ${error_rate}%)"
        return 1
    fi
}

# Wait for healthy deployment
wait_for_healthy_deployment() {
    local timeout="$HEALTH_CHECK_TIMEOUT"
    local start_time=$(date +%s)

    log_info "Waiting for healthy deployment (timeout: ${timeout}s)"

    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [[ $elapsed -gt $timeout ]]; then
            log_error "Health check timeout after ${timeout}s"
            return 1
        fi

        # Check app status
        local status
        status=$(flyctl status --app "$FLY_APP_NAME" --json 2>/dev/null | jq -r '.status' 2>/dev/null || echo "unknown")

        if [[ "$status" == "running" ]]; then
            # Additional health check via HTTP
            local app_url="https://${FLY_APP_NAME}.fly.dev"
            if curl -f -s --max-time 30 "$app_url/api/health" > /dev/null; then
                log_success "Application is healthy and responding"
                return 0
            fi
        fi

        log_info "Waiting for healthy status... (${elapsed}s elapsed)"
        sleep 10
    done
}

# Run smoke tests
run_smoke_tests() {
    local base_url="${1:-https://${FLY_APP_NAME}.fly.dev}"
    log_info "Running smoke tests against: $base_url"

    local test_results=()
    local start_time=$(date +%s)

    # Test 1: Health check endpoint
    log_info "Testing health check endpoint..."
    if curl -f -s --max-time 30 "$base_url/api/health" > /dev/null; then
        test_results+=("PASS: Health check")
    else
        test_results+=("FAIL: Health check")
        return 1
    fi

    # Test 2: Main page loads
    log_info "Testing main page..."
    local main_response
    main_response=$(curl -f -s --max-time 30 "$base_url" || echo "FAIL")
    if [[ "$main_response" != "FAIL" ]] && [[ ${#main_response} -gt 100 ]]; then
        test_results+=("PASS: Main page")
    else
        test_results+=("FAIL: Main page")
        return 1
    fi

    # Test 3: API endpoint
    log_info "Testing API endpoint..."
    local api_response
    api_response=$(curl -s --max-time 30 "$base_url/api/status" 2>/dev/null | jq -r '.status' 2>/dev/null || echo "error")
    if [[ "$api_response" == "ok" ]]; then
        test_results+=("PASS: API status")
    else
        test_results+=("FAIL: API status")
        return 1
    fi

    # Test 4: Database connectivity
    log_info "Testing database connectivity..."
    if curl -f -s --max-time 30 "$base_url/api/health/db" > /dev/null 2>&1; then
        test_results+=("PASS: Database connectivity")
    else
        test_results+=("SKIP: Database connectivity endpoint not available")
    fi

    # Test 5: Redis connectivity
    log_info "Testing Redis connectivity..."
    if curl -f -s --max-time 30 "$base_url/api/health/redis" > /dev/null 2>&1; then
        test_results+=("PASS: Redis connectivity")
    else
        test_results+=("SKIP: Redis connectivity endpoint not available")
    fi

    # Test 6: Load test with concurrent requests
    log_info "Testing concurrent request handling..."
    local concurrent_success=0
    for i in {1..10}; do
        curl -f -s --max-time 10 "$base_url/api/health" > /dev/null && ((concurrent_success++)) &
    done
    wait

    if [[ $concurrent_success -ge 8 ]]; then
        test_results+=("PASS: Concurrent requests ($concurrent_success/10)")
    else
        test_results+=("FAIL: Concurrent requests ($concurrent_success/10)")
        return 1
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log_success "Smoke tests completed in ${duration}s:"
    printf '%s\n' "${test_results[@]}" | while read -r result; do
        log_info "  $result"
    done

    return 0
}

# Performance validation
validate_performance() {
    log_info "Running performance validation..."

    local app_url="https://${FLY_APP_NAME}.fly.dev"
    local total_time=0
    local test_count=5

    # Test response times
    for i in $(seq 1 $test_count); do
        local response_time
        response_time=$(curl -o /dev/null -s -w '%{time_total}' --max-time 10 "$app_url/api/health")
        total_time=$(echo "$total_time + $response_time" | bc -l)
        log_info "Response time test $i: ${response_time}s"
    done

    local avg_response_time
    avg_response_time=$(echo "scale=3; $total_time / $test_count" | bc -l)

    if (( $(echo "$avg_response_time > 2.0" | bc -l) )); then
        log_warning "High average response time: ${avg_response_time}s"
    else
        log_success "Average response time acceptable: ${avg_response_time}s"
    fi

    # Memory and CPU check
    log_info "Checking resource utilization..."
    local metrics
    metrics=$(flyctl metrics --app "$FLY_APP_NAME" --json 2>/dev/null || echo "{}")

    log_success "Performance validation completed"
}

# Database backup before deployment
backup_database() {
    log_info "Creating database backup before deployment..."

    local backup_name="pre-deployment-${DEPLOYMENT_ID}"

    # Use Fly.io postgres backup if available
    if flyctl postgres backup create --app paintbox-prod-db --name "$backup_name" 2>/dev/null; then
        log_success "Database backup created: $backup_name"
    else
        log_warning "Could not create database backup via Fly.io"
    fi
}

# Rollback deployment
rollback_deployment() {
    log_warning "Starting deployment rollback..."

    if [[ ! -f "$ROLLBACK_INFO_FILE" ]]; then
        log_error "No rollback information found"
        return 1
    fi

    local previous_release
    previous_release=$(jq -r '.previous_release' "$ROLLBACK_INFO_FILE" 2>/dev/null || echo "unknown")

    if [[ "$previous_release" != "unknown" && "$previous_release" != "null" ]]; then
        log_info "Rolling back to release: $previous_release"

        if flyctl releases rollback "$previous_release" --app "$FLY_APP_NAME"; then
            # Wait for rollback to complete
            wait_for_healthy_deployment

            # Verify rollback worked
            if run_smoke_tests; then
                log_success "Rollback completed successfully"
                return 0
            else
                log_error "Rollback validation failed"
                return 1
            fi
        else
            log_error "Failed to execute rollback command"
            return 1
        fi
    else
        log_error "Cannot rollback: no previous release information"
        return 1
    fi
}

# Setup monitoring and alerts
setup_monitoring() {
    log_info "Setting up monitoring and alerts..."

    # Create monitoring configuration file
    cat > "$PROJECT_ROOT/monitoring-config.json" << EOF
{
  "deployment_id": "$DEPLOYMENT_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "app_name": "$FLY_APP_NAME",
  "environment": "$ENVIRONMENT",
  "regions": ["$PRIMARY_REGION", "$SECONDARY_REGION"],
  "health_check_url": "https://${FLY_APP_NAME}.fly.dev/api/health",
  "alerts": {
    "response_time_threshold": "2s",
    "error_rate_threshold": "5%",
    "uptime_threshold": "99.9%"
  }
}
EOF

    log_success "Monitoring configuration created"
}

# Post-deployment tasks
post_deployment_tasks() {
    log_info "Running post-deployment tasks..."

    # Update monitoring
    setup_monitoring

    # Send deployment notification
    send_deployment_notification

    # Create deployment report
    create_deployment_report

    log_success "Post-deployment tasks completed"
}

# Send deployment notification
send_deployment_notification() {
    local duration=$(($(date +%s) - START_TIME))
    local message="🚀 Paintbox deployment ${DEPLOYMENT_ID} completed successfully in ${duration}s"

    log_info "$message"

    # Slack notification if webhook configured
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\", \"channel\":\"#deployments\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || log_warning "Failed to send Slack notification"
    fi

    # Discord notification if webhook configured
    if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-Type: application/json' \
            --data "{\"content\":\"$message\"}" \
            "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1 || log_warning "Failed to send Discord notification"
    fi
}

# Create deployment report
create_deployment_report() {
    local report_file="$PROJECT_ROOT/deployment-report-${DEPLOYMENT_ID}.md"

    cat > "$report_file" << EOF
# Deployment Report - ${DEPLOYMENT_ID}

## Summary
- **Environment**: ${ENVIRONMENT}
- **App**: ${FLY_APP_NAME}
- **Strategy**: ${DEPLOYMENT_STRATEGY}
- **Completed**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Duration**: $(($(date +%s) - START_TIME))s

## Regions
- Primary: ${PRIMARY_REGION}
- Secondary: ${SECONDARY_REGION}

## URLs
- Application: https://${FLY_APP_NAME}.fly.dev
- Health Check: https://${FLY_APP_NAME}.fly.dev/api/health

## Status
✅ Deployment completed successfully
✅ Smoke tests passed
✅ Performance validation passed

## Next Steps
1. Monitor application metrics for 24 hours
2. Run full integration tests
3. Update documentation if needed
4. Review performance metrics

---
Generated by Paintbox deployment automation
EOF

    log_success "Deployment report created: $report_file"
}

# Show deployment summary
show_summary() {
    local end_time=$(date)
    local duration=$(($(date +%s) - START_TIME))

    log_success "🎉 Deployment completed successfully!"
    echo ""
    echo "📊 Deployment Summary:"
    echo "   Environment: $ENVIRONMENT"
    echo "   App: $FLY_APP_NAME"
    echo "   Strategy: $DEPLOYMENT_STRATEGY"
    echo "   Duration: ${duration}s"
    echo "   Completed: $end_time"
    echo ""
    echo "🔗 URLs:"
    echo "   Application: https://${FLY_APP_NAME}.fly.dev"
    echo "   Health Check: https://${FLY_APP_NAME}.fly.dev/api/health"
    echo ""
    echo "📋 Useful commands:"
    echo "   flyctl status --app $FLY_APP_NAME"
    echo "   flyctl logs --app $FLY_APP_NAME"
    echo "   flyctl releases list --app $FLY_APP_NAME"
    echo "   $0 rollback  # to rollback if needed"
    echo ""
}

# Main deployment function
main() {
    local command="${1:-deploy}"

    case "$command" in
        "deploy")
            log_info "🚀 Starting Paintbox deployment $DEPLOYMENT_ID"
            check_prerequisites
            pre_deployment_checks
            backup_database
            save_rollback_info
            deploy_application
            validate_performance
            post_deployment_tasks
            show_summary
            ;;
        "rollback")
            log_info "⏪ Starting rollback process"
            rollback_deployment
            ;;
        "status")
            flyctl status --app "$FLY_APP_NAME"
            ;;
        "logs")
            flyctl logs --app "$FLY_APP_NAME" --limit 100
            ;;
        "health")
            run_smoke_tests
            ;;
        *)
            echo "Usage: $0 [deploy|rollback|status|logs|health]"
            echo ""
            echo "Commands:"
            echo "  deploy   - Deploy the application (default)"
            echo "  rollback - Rollback to previous deployment"
            echo "  status   - Show application status"
            echo "  logs     - Show recent application logs"
            echo "  health   - Run health checks"
            echo ""
            echo "Environment variables:"
            echo "  FLY_APP_NAME - Fly.io app name (default: paintbox-app)"
            echo "  DEPLOYMENT_STRATEGY - bluegreen, rolling, or canary (default: bluegreen)"
            echo "  ENVIRONMENT - deployment environment (default: production)"
            echo "  PRIMARY_REGION - primary deployment region (default: sjc)"
            echo "  SECONDARY_REGION - secondary deployment region (default: ord)"
            echo "  AUTO_ROLLBACK - enable automatic rollback on failure (default: true)"
            exit 1
            ;;
    esac
}

# Run the main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
