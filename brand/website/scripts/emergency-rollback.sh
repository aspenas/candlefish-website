#!/bin/bash

# Emergency Rollback Script for Candlefish Animation
# Provides immediate rollback capability for production issues

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
DOMAIN_NAME=${DOMAIN_NAME:-candlefish.ai}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Slack notification function
notify_slack() {
    local message="$1"
    local color="${2:-danger}"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"🚨 Candlefish Animation Emergency Rollback\",
                    \"text\": \"$message\",
                    \"footer\": \"Rollback executed at $(date)\",
                    \"ts\": $(date +%s)
                }]
            }" \
            --silent || log_warning "Failed to send Slack notification"
    fi
}

# Validate prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install AWS CLI."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid."
        exit 1
    fi
    
    # Check kubectl for Kubernetes deployments
    if command -v kubectl &> /dev/null; then
        log_info "kubectl found, will check Kubernetes deployments"
    else
        log_warning "kubectl not found, skipping Kubernetes rollback"
    fi
    
    log_success "Prerequisites validated"
}

# Get current deployment status
get_current_status() {
    log_info "Getting current deployment status..."
    
    # Check CloudFront distribution status
    DISTRIBUTION_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?Aliases.Items[0]=='$DOMAIN_NAME'].Id" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$DISTRIBUTION_ID" ]]; then
        CURRENT_STATUS=$(aws cloudfront get-distribution \
            --id "$DISTRIBUTION_ID" \
            --query 'Distribution.Status' \
            --output text)
        log_info "CloudFront distribution $DISTRIBUTION_ID status: $CURRENT_STATUS"
    fi
    
    # Check API Gateway deployment
    API_ID=$(aws apigateway get-rest-apis \
        --query "items[?name=='${ENVIRONMENT}-candlefish-animation-api'].id" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$API_ID" ]]; then
        log_info "Found API Gateway: $API_ID"
    fi
    
    # Check Kubernetes deployment status
    if command -v kubectl &> /dev/null; then
        if kubectl get deployment candlefish-website -n "$ENVIRONMENT" &> /dev/null; then
            K8S_STATUS=$(kubectl get deployment candlefish-website -n "$ENVIRONMENT" -o jsonpath='{.status.readyReplicas}')
            K8S_DESIRED=$(kubectl get deployment candlefish-website -n "$ENVIRONMENT" -o jsonpath='{.status.replicas}')
            log_info "Kubernetes deployment status: $K8S_STATUS/$K8S_DESIRED ready"
        fi
    fi
}

# Rollback CloudFront to previous distribution
rollback_cloudfront() {
    log_info "Rolling back CloudFront distribution..."
    
    if [[ -z "$DISTRIBUTION_ID" ]]; then
        log_warning "No CloudFront distribution found, skipping CloudFront rollback"
        return 0
    fi
    
    # Create invalidation to clear cache
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)
    
    log_info "Created CloudFront invalidation: $INVALIDATION_ID"
    
    # Wait for invalidation to complete (optional, for immediate effect)
    log_info "Waiting for CloudFront invalidation to complete..."
    aws cloudfront wait invalidation-completed \
        --distribution-id "$DISTRIBUTION_ID" \
        --id "$INVALIDATION_ID"
    
    log_success "CloudFront cache invalidated"
}

# Rollback Kubernetes deployment
rollback_kubernetes() {
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available, skipping Kubernetes rollback"
        return 0
    fi
    
    log_info "Rolling back Kubernetes deployment..."
    
    # Check if deployment exists
    if ! kubectl get deployment candlefish-website -n "$ENVIRONMENT" &> /dev/null; then
        log_warning "Kubernetes deployment not found, skipping Kubernetes rollback"
        return 0
    fi
    
    # Rollback to previous revision
    kubectl rollout undo deployment/candlefish-website -n "$ENVIRONMENT"
    
    # Wait for rollback to complete
    log_info "Waiting for Kubernetes rollback to complete..."
    kubectl rollout status deployment/candlefish-website -n "$ENVIRONMENT" --timeout=300s
    
    # Verify pods are healthy
    READY_PODS=$(kubectl get deployment candlefish-website -n "$ENVIRONMENT" -o jsonpath='{.status.readyReplicas}')
    DESIRED_PODS=$(kubectl get deployment candlefish-website -n "$ENVIRONMENT" -o jsonpath='{.status.replicas}')
    
    if [[ "$READY_PODS" == "$DESIRED_PODS" ]]; then
        log_success "Kubernetes deployment rolled back successfully ($READY_PODS/$DESIRED_PODS pods ready)"
    else
        log_error "Kubernetes rollback may have failed ($READY_PODS/$DESIRED_PODS pods ready)"
        return 1
    fi
}

# Rollback Lambda functions
rollback_lambda() {
    log_info "Rolling back Lambda functions..."
    
    FUNCTIONS=(
        "${ENVIRONMENT}-candlefish-analytics-processor"
        "${ENVIRONMENT}-candlefish-ab-config"
    )
    
    for FUNCTION_NAME in "${FUNCTIONS[@]}"; do
        # Check if function exists
        if aws lambda get-function --function-name "$FUNCTION_NAME" &> /dev/null; then
            # Get previous version
            PREVIOUS_VERSION=$(aws lambda list-versions-by-function \
                --function-name "$FUNCTION_NAME" \
                --query 'Versions[-2].Version' \
                --output text)
            
            if [[ "$PREVIOUS_VERSION" != "None" && "$PREVIOUS_VERSION" != "\$LATEST" ]]; then
                # Update alias to point to previous version
                aws lambda update-alias \
                    --function-name "$FUNCTION_NAME" \
                    --name "LIVE" \
                    --function-version "$PREVIOUS_VERSION" || true
                
                log_success "Rolled back Lambda function $FUNCTION_NAME to version $PREVIOUS_VERSION"
            else
                log_warning "No previous version found for Lambda function $FUNCTION_NAME"
            fi
        else
            log_warning "Lambda function $FUNCTION_NAME not found"
        fi
    done
}

# Verify rollback success
verify_rollback() {
    log_info "Verifying rollback success..."
    
    # Wait a moment for changes to propagate
    sleep 10
    
    # Check main site health
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN_NAME/health" || echo "000")
    
    if [[ "$HTTP_STATUS" == "200" ]]; then
        log_success "Main site health check passed (HTTP $HTTP_STATUS)"
    else
        log_error "Main site health check failed (HTTP $HTTP_STATUS)"
        return 1
    fi
    
    # Check candlefish animation specifically
    ANIMATION_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN_NAME/" || echo "000")
    
    if [[ "$ANIMATION_STATUS" == "200" ]]; then
        log_success "Candlefish animation page accessible (HTTP $ANIMATION_STATUS)"
    else
        log_warning "Candlefish animation page may have issues (HTTP $ANIMATION_STATUS)"
    fi
    
    # Check API endpoints
    if [[ -n "$API_ID" ]]; then
        API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/$ENVIRONMENT/health" || echo "000")
        if [[ "$API_STATUS" == "200" ]]; then
            log_success "API Gateway health check passed (HTTP $API_STATUS)"
        else
            log_warning "API Gateway may have issues (HTTP $API_STATUS)"
        fi
    fi
    
    return 0
}

# Create rollback report
create_rollback_report() {
    local success="$1"
    local report_file="rollback-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$report_file" << EOF
CANDLEFISH ANIMATION EMERGENCY ROLLBACK REPORT
================================================
Date: $(date)
Environment: $ENVIRONMENT
Domain: $DOMAIN_NAME
Status: $([ "$success" == "0" ] && echo "SUCCESS" || echo "FAILED")

INFRASTRUCTURE STATUS:
- CloudFront Distribution: $DISTRIBUTION_ID
- API Gateway: $API_ID
- Kubernetes Ready Pods: $READY_PODS/$DESIRED_PODS

ROLLBACK ACTIONS TAKEN:
- CloudFront cache invalidated
- Kubernetes deployment rolled back
- Lambda functions reverted to previous versions

VERIFICATION RESULTS:
- Main site status: $HTTP_STATUS
- Animation page status: $ANIMATION_STATUS
- API Gateway status: $API_STATUS

NEXT STEPS:
1. Monitor application metrics for 15-30 minutes
2. Review application logs for errors
3. Investigate root cause of original issue
4. Plan proper fix and redeployment
EOF

    log_info "Rollback report created: $report_file"
    echo "$report_file"
}

# Main rollback execution
main() {
    log_info "🚨 INITIATING EMERGENCY ROLLBACK FOR CANDLEFISH ANIMATION"
    log_warning "This will revert to the previous working version"
    
    # Confirmation prompt (skip in CI/automated scenarios)
    if [[ "${CI:-false}" != "true" && "${FORCE:-false}" != "true" ]]; then
        read -p "Are you sure you want to proceed with emergency rollback? (yes/NO): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    START_TIME=$(date +%s)
    
    notify_slack "🚨 Emergency rollback initiated for Candlefish Animation on $ENVIRONMENT environment"
    
    # Execute rollback steps
    validate_prerequisites
    get_current_status
    
    ROLLBACK_SUCCESS=true
    
    # Rollback in reverse order of deployment
    rollback_cloudfront || ROLLBACK_SUCCESS=false
    rollback_lambda || ROLLBACK_SUCCESS=false
    rollback_kubernetes || ROLLBACK_SUCCESS=false
    
    # Verify rollback
    if verify_rollback; then
        log_success "✅ Emergency rollback completed successfully"
        notify_slack "✅ Emergency rollback completed successfully. Site should be operational." "good"
    else
        log_error "❌ Rollback verification failed - manual intervention required"
        notify_slack "❌ Rollback completed but verification failed. Manual investigation required." "danger"
        ROLLBACK_SUCCESS=false
    fi
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    # Create report
    REPORT_FILE=$(create_rollback_report $([ "$ROLLBACK_SUCCESS" == "true" ] && echo "0" || echo "1"))
    
    log_info "Rollback duration: ${DURATION} seconds"
    log_info "Report saved to: $REPORT_FILE"
    
    if [[ "$ROLLBACK_SUCCESS" == "true" ]]; then
        log_success "🎉 Emergency rollback successful - monitor for stability"
        exit 0
    else
        log_error "💥 Emergency rollback encountered issues - check logs and report"
        exit 1
    fi
}

# Handle script termination
cleanup() {
    log_warning "Rollback script interrupted - system may be in inconsistent state"
    notify_slack "⚠️ Rollback script was interrupted - manual verification required" "warning"
}

trap cleanup INT TERM

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --domain)
            DOMAIN_NAME="$2"
            shift 2
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --environment ENV    Target environment (default: production)"
            echo "  --domain DOMAIN      Domain name (default: candlefish.ai)"
            echo "  --force              Skip confirmation prompt"
            echo "  --help               Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  AWS_REGION           AWS region (default: us-east-1)"
            echo "  SLACK_WEBHOOK_URL    Slack webhook for notifications"
            echo "  CI                   Set to 'true' to skip prompts in CI"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Execute main function
main