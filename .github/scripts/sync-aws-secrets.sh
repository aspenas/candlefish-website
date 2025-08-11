#!/bin/bash

# AWS Secrets Manager to GitHub Secrets Sync Script
# This script syncs secrets from AWS Secrets Manager to GitHub Secrets

set -euo pipefail

# Configuration
AWS_REGION="${AWS_REGION:-us-west-2}"
GITHUB_OWNER="${GITHUB_OWNER:-aspenas}"
GITHUB_REPO="${GITHUB_REPO:-candlefish-ai}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check required tools
check_requirements() {
    local missing_tools=()

    if ! command -v aws &> /dev/null; then
        missing_tools+=("aws-cli")
    fi

    if ! command -v gh &> /dev/null; then
        missing_tools+=("gh")
    fi

    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi

    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Please install missing tools and try again"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured properly"
        exit 1
    fi

    # Check GitHub authentication
    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI not authenticated. Run 'gh auth login'"
        exit 1
    fi
}

# Secret mappings (AWS Secret Name -> GitHub Secret Name)
declare -A SECRET_MAPPINGS=(
    ["candlefish/netlify"]="NETLIFY_AUTH_TOKEN"
    ["candlefish/netlify-site-id"]="NETLIFY_SITE_ID"
    ["candlefish/vercel"]="VERCEL_TOKEN"
    ["candlefish/vercel-org-id"]="VERCEL_ORG_ID"
    ["candlefish/vercel-project-id"]="VERCEL_PROJECT_ID"
    ["candlefish/expo-token"]="EXPO_TOKEN"
    ["candlefish/fly-api-token"]="FLY_API_TOKEN"
    ["candlefish/datadog-api"]="DATADOG_API_KEY"
    ["candlefish/datadog-app-key"]="DATADOG_APP_KEY"
    ["candlefish/slack-webhook"]="SLACK_WEBHOOK_URL"
    ["candlefish/anthropic-api-key"]="ANTHROPIC_API_KEY"
    ["candlefish/openai-api-key"]="OPENAI_API_KEY"
    ["candlefish/together-api-key"]="TOGETHER_API_KEY"
    ["candlefish/fireworks-api-key"]="FIREWORKS_API_KEY"
    ["candlefish/aws-access-key-id"]="AWS_ACCESS_KEY_ID"
    ["candlefish/aws-secret-access-key"]="AWS_SECRET_ACCESS_KEY"
    ["candlefish/github-pat"]="GH_PAT"
    ["candlefish/npm-token"]="NPM_TOKEN"
    ["candlefish/docker-hub-token"]="DOCKER_HUB_TOKEN"
    ["candlefish/sentry-auth-token"]="SENTRY_AUTH_TOKEN"
    ["candlefish/firebase-service-account"]="FIREBASE_SERVICE_ACCOUNT"
)

# Get secret from AWS Secrets Manager
get_aws_secret() {
    local secret_name=$1
    aws secretsmanager get-secret-value \
        --region "$AWS_REGION" \
        --secret-id "$secret_name" \
        --query 'SecretString' \
        --output text 2>/dev/null || echo ""
}

# Set GitHub secret
set_github_secret() {
    local secret_name=$1
    local secret_value=$2

    echo -n "$secret_value" | gh secret set "$secret_name" \
        --repo "$GITHUB_OWNER/$GITHUB_REPO" \
        2>/dev/null
}

# Sync all secrets
sync_secrets() {
    local success_count=0
    local failure_count=0
    local skip_count=0

    log_info "Starting secret synchronization..."
    log_info "Source: AWS Secrets Manager (Region: $AWS_REGION)"
    log_info "Target: GitHub Repository ($GITHUB_OWNER/$GITHUB_REPO)"
    echo

    for aws_secret in "${!SECRET_MAPPINGS[@]}"; do
        # Get GitHub secret name from mapping
        local github_secret_name
        github_secret_name="${SECRET_MAPPINGS[$aws_secret]}"

        echo -n "Syncing $aws_secret -> $github_secret_name... "

        # Get secret from AWS
        local secret_value=$(get_aws_secret "$aws_secret")

        if [ -z "$secret_value" ]; then
            log_warn "SKIPPED (not found in AWS)"
            ((skip_count++))
            continue
        fi

        # Set secret in GitHub
        if set_github_secret "$github_secret_name" "$secret_value"; then
            log_info "SUCCESS"
            ((success_count++))
        else
            log_error "FAILED"
            ((failure_count++))
        fi
    done

    echo
    log_info "Synchronization complete!"
    log_info "Results: $success_count succeeded, $failure_count failed, $skip_count skipped"

    if [ $failure_count -gt 0 ]; then
        exit 1
    fi
}

# Verify sync (list GitHub secrets)
verify_sync() {
    log_info "Verifying GitHub secrets..."
    gh secret list --repo "$GITHUB_OWNER/$GITHUB_REPO"
}

# Main execution
main() {
    log_info "AWS Secrets Manager to GitHub Secrets Sync"
    log_info "=========================================="
    echo

    # Check requirements
    check_requirements

    # Parse arguments
    case "${1:-sync}" in
        sync)
            sync_secrets
            ;;
        verify)
            verify_sync
            ;;
        *)
            log_error "Usage: $0 [sync|verify]"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
