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

# Create platform credentials if they don't exist
create_platform_credentials() {
    log_info "Checking and creating platform credentials..."

    # Anthropic API Key (we know this exists)
    local anthropic_key=$(get_aws_secret "candlefish/anthropic-api-key")
    if [ -n "$anthropic_key" ]; then
        set_github_secret "ANTHROPIC_API_KEY" "$anthropic_key"
        log_info "✅ Set ANTHROPIC_API_KEY"
    fi

    # Check for other AI keys that might exist under different names
    for prefix in "eaia" "finance-ai" "clark-county"; do
        local key=$(get_aws_secret "${prefix}-anthropic-api-key" 2>/dev/null || get_aws_secret "${prefix}/anthropic-api-key" 2>/dev/null || echo "")
        if [ -n "$key" ]; then
            log_info "Found Anthropic key under ${prefix}"
        fi
    done

    # Figma token
    local figma_token=$(get_aws_secret "candlefish/brand/figma/api_token")
    if [ -n "$figma_token" ]; then
        set_github_secret "FIGMA_TOKEN" "$figma_token"
        log_info "✅ Set FIGMA_TOKEN"
    fi
}

# Set up Netlify
setup_netlify() {
    log_info "Setting up Netlify credentials..."

    # Check if netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        log_info "Installing Netlify CLI..."
        npm install -g netlify-cli
    fi

    # Try to get existing token or create placeholder
    local token=$(get_aws_secret "candlefish/netlify" || echo "")
    if [ -z "$token" ]; then
        log_warn "Netlify token not found in AWS. Creating placeholder..."
        token=""
        # Store placeholder in AWS for future use
        aws secretsmanager create-secret \
            --name "candlefish/netlify" \
            --secret-string "$token" \
            --region "$AWS_REGION" 2>/dev/null || true
    fi

    set_github_secret "NETLIFY_AUTH_TOKEN" "$token"
    set_github_secret "NETLIFY_SITE_ID" "candlefish-ai"
    log_info "✅ Netlify credentials configured"
}

# Set up Vercel
setup_vercel() {
    log_info "Setting up Vercel credentials..."

    # Check if vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        log_info "Installing Vercel CLI..."
        npm install -g vercel
    fi

    # Try to get existing token or create placeholder
    local token=$(get_aws_secret "candlefish/vercel" || echo "")
    if [ -z "$token" ]; then
        log_warn "Vercel token not found. Creating placeholder..."
        token=""
        aws secretsmanager create-secret \
            --name "candlefish/vercel" \
            --secret-string "$token" \
            --region "$AWS_REGION" 2>/dev/null || true
    fi

    set_github_secret "VERCEL_TOKEN" "$token"
    set_github_secret "VERCEL_ORG_ID" "team_candlefish"
    set_github_secret "VERCEL_PROJECT_ID" "prj_candlefish"
    log_info "✅ Vercel credentials configured"
}

# Set up Expo
setup_expo() {
    log_info "Setting up Expo EAS credentials..."

    # Check if eas CLI is installed
    if ! command -v eas &> /dev/null; then
        log_info "Installing EAS CLI..."
        npm install -g eas-cli
    fi

    local token=$(get_aws_secret "candlefish/expo-token" || echo "")
    if [ -z "$token" ]; then
        log_warn "Expo token not found. Creating placeholder..."
        token=""
        aws secretsmanager create-secret \
            --name "candlefish/expo-token" \
            --secret-string "$token" \
            --region "$AWS_REGION" 2>/dev/null || true
    fi

    set_github_secret "EXPO_TOKEN" "$token"
    log_info "✅ Expo credentials configured"
}

# Set up Fly.io
setup_fly() {
    log_info "Setting up Fly.io credentials..."

    # Check if flyctl is installed
    if ! command -v flyctl &> /dev/null && ! command -v fly &> /dev/null; then
        log_info "Installing Fly CLI..."
        curl -L https://fly.io/install.sh | sh || true
    fi

    local token=$(get_aws_secret "candlefish/fly-api-token" || echo "")
    if [ -z "$token" ]; then
        log_warn "Fly.io token not found. Creating placeholder..."
        token=""
        aws secretsmanager create-secret \
            --name "candlefish/fly-api-token" \
            --secret-string "$token" \
            --region "$AWS_REGION" 2>/dev/null || true
    fi

    set_github_secret "FLY_API_TOKEN" "$token"
    log_info "✅ Fly.io credentials configured"
}

# Set up Datadog
setup_datadog() {
    log_info "Setting up Datadog integration..."

    local api_key=$(get_aws_secret "candlefish/datadog-api" || echo "")
    local app_key=$(get_aws_secret "candlefish/datadog-app-key" || echo "")

    if [ -z "$api_key" ]; then
        log_warn "Datadog API key not found. Creating placeholder..."
        api_key=""
        aws secretsmanager create-secret \
            --name "candlefish/datadog-api" \
            --secret-string "$api_key" \
            --region "$AWS_REGION" 2>/dev/null || true
    fi

    if [ -z "$app_key" ]; then
        app_key="PLACEHOLDER_DATADOG_APP_KEY"
        aws secretsmanager create-secret \
            --name "candlefish/datadog-app-key" \
            --secret-string "$app_key" \
            --region "$AWS_REGION" 2>/dev/null || true
    fi

    set_github_secret "DATADOG_API_KEY" "$api_key"
    set_github_secret "DATADOG_APP_KEY" "$app_key"
    log_info "✅ Datadog credentials configured"
}

# Set up Slack
setup_slack() {
    log_info "Setting up Slack webhook..."

    local webhook=$(get_aws_secret "candlefish/slack-webhook" || echo "")
    if [ -z "$webhook" ]; then
        log_warn "Slack webhook not found. Creating placeholder..."
        webhook="https://hooks.slack.com/services/PLACEHOLDER/WEBHOOK/URL"
        aws secretsmanager create-secret \
            --name "candlefish/slack-webhook" \
            --secret-string "$webhook" \
            --region "$AWS_REGION" 2>/dev/null || true
    fi

    set_github_secret "SLACK_WEBHOOK_URL" "$webhook"
    log_info "✅ Slack webhook configured"
}

# Main execution
main() {
    log_info "AWS Secrets Manager to GitHub Secrets Sync"
    log_info "=========================================="
    echo

    # Check requirements
    check_requirements

    # Create/sync all platform credentials
    create_platform_credentials
    setup_netlify
    setup_vercel
    setup_expo
    setup_fly
    setup_datadog
    setup_slack

    echo
    log_info "✅ All platform credentials have been configured!"
    log_info "Note: Placeholder values were created for missing secrets."
    log_info "Update them in AWS Secrets Manager when you have real credentials."

    # List all GitHub secrets
    echo
    log_info "Current GitHub Secrets:"
    gh secret list --repo "$GITHUB_OWNER/$GITHUB_REPO"
}

# Run main function
main "$@"
