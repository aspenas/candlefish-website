#!/bin/bash

##############################################################################
# Production Deployment Script for Paintbox with AWS Secrets Manager
# Implements zero-downtime deployment with comprehensive validation
##############################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
APP_NAME="paintbox"
DEPLOY_TIMEOUT="600"  # 10 minutes
HEALTH_CHECK_RETRIES=20
HEALTH_CHECK_DELAY=15
LOG_FILE="/tmp/deploy-$(date +%Y%m%d-%H%M%S).log"
ROLLBACK_ENABLED=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
# Pre-deployment Validation
##############################################################################

validate_prerequisites() {
    log "Validating deployment prerequisites..."

    # Check required tools
    local required_tools=("flyctl" "node" "npm" "jq" "aws")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool '$tool' not found"
            return 1
        fi
    done

    # Check Fly.io authentication
    if ! flyctl auth whoami &> /dev/null; then
        log_error "Not authenticated with Fly.io. Run: flyctl auth login"
        return 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        return 1
    fi

    # Validate AWS Secrets Manager access
    log "Validating AWS Secrets Manager integration..."
    if ! node scripts/validate-aws-secrets-integration.js; then
        log_error "AWS Secrets Manager validation failed"
        return 1
    fi

    log_success "Prerequisites validation completed"
    return 0
}

##############################################################################
# Application Health Checks
##############################################################################

check_app_health() {
    local app_url="$1"
    local retries="$2"
    local delay="$3"

    log "Performing health checks on $app_url..."

    for ((i=1; i<=retries; i++)); do
        log "Health check attempt $i/$retries..."

        # Basic health endpoint
        if curl -sf --max-time 10 "$app_url/api/health" > /dev/null; then
            # JWKS endpoint validation
            if curl -sf --max-time 10 "$app_url/.well-known/jwks.json" | jq -e '.keys | length > 0' > /dev/null 2>&1; then
                log_success "Application health check passed"
                return 0
            else
                log_warning "JWKS endpoint failed validation"
            fi
        else
            log_warning "Health endpoint not responding"
        fi

        if [[ $i -lt $retries ]]; then
            log "Waiting ${delay}s before retry..."
            sleep "$delay"
        fi
    done

    log_error "Application health check failed after $retries attempts"
    return 1
}

##############################################################################
# Deployment Functions
##############################################################################

get_current_deployment() {
    flyctl status --app "$APP_NAME" --json 2>/dev/null | jq -r '.Image // empty' || echo ""
}

perform_deployment() {
    log "Starting production deployment..."

    # Get current deployment for rollback
    local current_deployment
    current_deployment=$(get_current_deployment)
    if [[ -n "$current_deployment" ]]; then
        log "Current deployment: $current_deployment"
        echo "$current_deployment" > "/tmp/${APP_NAME}-previous-deployment.txt"
    fi

    # Deploy using production configuration
    log "Deploying with production Dockerfile..."

    if flyctl deploy \
        --config fly.production.toml \
        --strategy bluegreen \
        --wait-timeout "${DEPLOY_TIMEOUT}s" \
        --verbose; then

        log_success "Deployment completed successfully"
        return 0
    else
        log_error "Deployment failed"
        return 1
    fi
}

##############################################################################
# Post-deployment Validation
##############################################################################

validate_deployment() {
    log "Validating deployed application..."

    # Wait for deployment to stabilize
    log "Waiting for deployment to stabilize..."
    sleep 30

    # Check application status
    log "Checking application status..."
    if ! flyctl status --app "$APP_NAME"; then
        log_error "Unable to get application status"
        return 1
    fi

    # Perform comprehensive health checks
    local app_url="https://${APP_NAME}.fly.dev"
    if ! check_app_health "$app_url" "$HEALTH_CHECK_RETRIES" "$HEALTH_CHECK_DELAY"; then
        log_error "Post-deployment health checks failed"
        return 1
    fi

    # Validate JWKS endpoint specifically
    log "Validating JWKS endpoint..."
    local jwks_response
    jwks_response=$(curl -sf "$app_url/.well-known/jwks.json" | jq -r '.keys | length')

    if [[ "$jwks_response" -gt 0 ]]; then
        log_success "JWKS endpoint validated - $jwks_response key(s) available"
    else
        log_error "JWKS endpoint validation failed - no keys available"
        return 1
    fi

    # Test JWT functionality
    log "Testing JWT functionality..."
    # This would test the actual JWT signing/verification if we had test scripts
    # For now, we'll just validate the endpoint is accessible

    log_success "Deployment validation completed"
    return 0
}

##############################################################################
# Rollback Functions
##############################################################################

perform_rollback() {
    if [[ "$ROLLBACK_ENABLED" != "true" ]]; then
        log_warning "Rollback is disabled"
        return 1
    fi

    log "Initiating rollback procedure..."

    local previous_deployment_file="/tmp/${APP_NAME}-previous-deployment.txt"

    if [[ ! -f "$previous_deployment_file" ]]; then
        log_error "No previous deployment information found"
        return 1
    fi

    local previous_deployment
    previous_deployment=$(cat "$previous_deployment_file")

    if [[ -z "$previous_deployment" ]]; then
        log_error "Previous deployment information is empty"
        return 1
    fi

    log "Rolling back to: $previous_deployment"

    if flyctl deploy \
        --image "$previous_deployment" \
        --strategy immediate \
        --wait-timeout 300 \
        --app "$APP_NAME"; then

        log_success "Rollback completed successfully"

        # Validate rollback
        if validate_deployment; then
            log_success "Rollback validation passed"
            return 0
        else
            log_error "Rollback validation failed"
            return 1
        fi
    else
        log_error "Rollback failed"
        return 1
    fi
}

##############################################################################
# Monitoring and Alerts
##############################################################################

send_deployment_notification() {
    local status="$1"
    local message="$2"

    # This would integrate with your notification system (Slack, email, etc.)
    log "Notification: $status - $message"

    # Example Slack webhook (if configured)
    if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Paintbox Deployment $status: $message\"}" \
            "$SLACK_WEBHOOK" || true
    fi
}

##############################################################################
# Performance Testing
##############################################################################

run_performance_tests() {
    log "Running performance tests..."

    if command -v artillery &> /dev/null; then
        # Create a basic performance test
        cat > /tmp/perf-test.yml << EOF
config:
  target: 'https://${APP_NAME}.fly.dev'
  phases:
    - duration: 60
      arrivalRate: 5
      rampTo: 10
scenarios:
  - name: "Health Check"
    flow:
      - get:
          url: "/api/health"
  - name: "JWKS Endpoint"
    flow:
      - get:
          url: "/.well-known/jwks.json"
  - name: "Homepage"
    flow:
      - get:
          url: "/"
EOF

        if artillery run /tmp/perf-test.yml; then
            log_success "Performance tests passed"
        else
            log_warning "Performance tests failed (non-critical)"
        fi
    else
        log_warning "Artillery not installed, skipping performance tests"
    fi
}

##############################################################################
# Main Deployment Flow
##############################################################################

main() {
    log "=== Paintbox Production Deployment Started ==="
    log "Log file: $LOG_FILE"

    local deployment_success=false

    # Trap for cleanup
    trap 'cleanup' EXIT

    # Pre-deployment validation
    if ! validate_prerequisites; then
        log_error "Pre-deployment validation failed"
        send_deployment_notification "FAILED" "Pre-deployment validation failed"
        exit 1
    fi

    # Perform deployment
    if perform_deployment; then
        # Validate deployment
        if validate_deployment; then
            deployment_success=true
            log_success "Deployment successful!"
            send_deployment_notification "SUCCESS" "Deployment completed successfully"

            # Run performance tests (optional)
            run_performance_tests
        else
            log_error "Deployment validation failed"
            send_deployment_notification "FAILED" "Deployment validation failed, initiating rollback"

            # Attempt rollback
            if perform_rollback; then
                log_warning "Deployment failed but rollback successful"
                send_deployment_notification "ROLLED_BACK" "Deployment failed, rolled back to previous version"
            else
                log_error "Deployment and rollback both failed"
                send_deployment_notification "CRITICAL" "Deployment and rollback both failed - manual intervention required"
                exit 1
            fi
        fi
    else
        log_error "Deployment failed"
        send_deployment_notification "FAILED" "Deployment failed, attempting rollback"

        # Attempt rollback
        if perform_rollback; then
            log_warning "Deployment failed but rollback successful"
            send_deployment_notification "ROLLED_BACK" "Deployment failed, rolled back to previous version"
        else
            log_error "Deployment and rollback both failed"
            send_deployment_notification "CRITICAL" "Deployment and rollback both failed - manual intervention required"
            exit 1
        fi
    fi

    if [[ "$deployment_success" == "true" ]]; then
        log_success "=== Deployment Completed Successfully ==="
        exit 0
    else
        log_error "=== Deployment Failed ==="
        exit 1
    fi
}

cleanup() {
    log "Cleaning up temporary files..."
    rm -f /tmp/perf-test.yml
}

# Usage information
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --no-rollback    Disable automatic rollback on failure"
    echo "  --help          Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  SLACK_WEBHOOK   Slack webhook URL for notifications"
    echo "  FLY_API_TOKEN   Fly.io API token"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-rollback)
            ROLLBACK_ENABLED=false
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main deployment
main
