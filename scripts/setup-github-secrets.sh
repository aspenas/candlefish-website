#!/bin/bash

# GitHub Secrets Setup Script
# This script helps configure all required GitHub secrets for the workflow automation

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if gh CLI is installed
check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        print_status "$RED" "❌ GitHub CLI (gh) is not installed"
        echo "Please install it from: https://cli.github.com/"
        exit 1
    fi
    print_status "$GREEN" "✅ GitHub CLI is installed"
}

# Function to check if logged in to GitHub
check_gh_auth() {
    if ! gh auth status &> /dev/null; then
        print_status "$YELLOW" "⚠️  Not logged in to GitHub"
        echo "Please run: gh auth login"
        exit 1
    fi
    print_status "$GREEN" "✅ Authenticated with GitHub"
}

# Function to get AWS credentials from AWS Secrets Manager
get_aws_secret() {
    local secret_name=$1
    aws secretsmanager get-secret-value \
        --secret-id "$secret_name" \
        --query 'SecretString' \
        --output text 2>/dev/null || echo ""
}

# Function to set GitHub secret
set_github_secret() {
    local secret_name=$1
    local secret_value=$2
    local repo=${3:-"candlefish-ai/candlefish-ai"}
    
    if [ -z "$secret_value" ]; then
        print_status "$YELLOW" "⚠️  Skipping $secret_name (no value provided)"
        return
    fi
    
    echo "$secret_value" | gh secret set "$secret_name" --repo "$repo"
    print_status "$GREEN" "✅ Set secret: $secret_name"
}

# Main setup function
setup_secrets() {
    print_status "$BLUE" "🔧 Setting up GitHub Secrets for Workflow Automation"
    echo ""
    
    # Check prerequisites
    check_gh_cli
    check_gh_auth
    
    # Get repository
    REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "candlefish-ai/candlefish-ai")
    print_status "$BLUE" "📦 Repository: $REPO"
    echo ""
    
    # AWS Credentials
    print_status "$YELLOW" "Setting up AWS credentials..."
    
    # Try to get from AWS Secrets Manager first
    AWS_CREDS=$(get_aws_secret "github/aws-credentials")
    if [ -n "$AWS_CREDS" ]; then
        AWS_ACCESS_KEY=$(echo "$AWS_CREDS" | jq -r '.access_key_id')
        AWS_SECRET_KEY=$(echo "$AWS_CREDS" | jq -r '.secret_access_key')
        AWS_ROLE_ARN=$(echo "$AWS_CREDS" | jq -r '.role_arn')
        AWS_PROD_ROLE_ARN=$(echo "$AWS_CREDS" | jq -r '.prod_role_arn')
    else
        # Prompt for AWS credentials
        read -p "Enter AWS Access Key ID: " AWS_ACCESS_KEY
        read -sp "Enter AWS Secret Access Key: " AWS_SECRET_KEY
        echo ""
        read -p "Enter AWS Role ARN: " AWS_ROLE_ARN
        read -p "Enter AWS Production Role ARN: " AWS_PROD_ROLE_ARN
    fi
    
    set_github_secret "AWS_ACCESS_KEY_ID" "$AWS_ACCESS_KEY" "$REPO"
    set_github_secret "AWS_SECRET_ACCESS_KEY" "$AWS_SECRET_KEY" "$REPO"
    set_github_secret "AWS_ROLE_ARN" "$AWS_ROLE_ARN" "$REPO"
    set_github_secret "AWS_PROD_ROLE_ARN" "$AWS_PROD_ROLE_ARN" "$REPO"
    
    # Docker Hub credentials
    print_status "$YELLOW" "Setting up Docker Hub credentials..."
    DOCKER_CREDS=$(get_aws_secret "docker/credentials")
    if [ -n "$DOCKER_CREDS" ]; then
        DOCKER_USERNAME=$(echo "$DOCKER_CREDS" | jq -r '.username')
        DOCKER_PASSWORD=$(echo "$DOCKER_CREDS" | jq -r '.password')
    else
        read -p "Enter Docker Hub username (or press Enter to skip): " DOCKER_USERNAME
        if [ -n "$DOCKER_USERNAME" ]; then
            read -sp "Enter Docker Hub password: " DOCKER_PASSWORD
            echo ""
        fi
    fi
    
    set_github_secret "DOCKER_USERNAME" "$DOCKER_USERNAME" "$REPO"
    set_github_secret "DOCKER_PASSWORD" "$DOCKER_PASSWORD" "$REPO"
    
    # NPM Token
    print_status "$YELLOW" "Setting up NPM token..."
    NPM_TOKEN=$(get_aws_secret "npm/token")
    if [ -z "$NPM_TOKEN" ]; then
        read -p "Enter NPM token (or press Enter to skip): " NPM_TOKEN
    fi
    set_github_secret "NPM_TOKEN" "$NPM_TOKEN" "$REPO"
    
    # Semantic Release Token
    print_status "$YELLOW" "Setting up Semantic Release token..."
    print_status "$BLUE" "Creating a GitHub Personal Access Token with 'repo' scope..."
    echo "Visit: https://github.com/settings/tokens/new?scopes=repo"
    read -sp "Enter GitHub Personal Access Token for Semantic Release: " SEMANTIC_RELEASE_TOKEN
    echo ""
    set_github_secret "SEMANTIC_RELEASE_TOKEN" "$SEMANTIC_RELEASE_TOKEN" "$REPO"
    
    # Monitoring tokens
    print_status "$YELLOW" "Setting up monitoring tokens..."
    
    # Slack Webhook
    SLACK_WEBHOOK=$(get_aws_secret "slack/webhook-url")
    if [ -z "$SLACK_WEBHOOK" ]; then
        read -p "Enter Slack Webhook URL (or press Enter to skip): " SLACK_WEBHOOK
    fi
    set_github_secret "SLACK_WEBHOOK" "$SLACK_WEBHOOK" "$REPO"
    
    # Datadog
    DATADOG_CREDS=$(get_aws_secret "datadog/credentials")
    if [ -n "$DATADOG_CREDS" ]; then
        DATADOG_API_KEY=$(echo "$DATADOG_CREDS" | jq -r '.api_key')
        DATADOG_APP_KEY=$(echo "$DATADOG_CREDS" | jq -r '.app_key')
    else
        read -p "Enter Datadog API Key (or press Enter to skip): " DATADOG_API_KEY
        read -p "Enter Datadog App Key (or press Enter to skip): " DATADOG_APP_KEY
    fi
    set_github_secret "DATADOG_API_KEY" "$DATADOG_API_KEY" "$REPO"
    set_github_secret "DATADOG_APP_KEY" "$DATADOG_APP_KEY" "$REPO"
    
    # Security scanning tokens
    print_status "$YELLOW" "Setting up security scanning tokens..."
    
    # Snyk
    SNYK_TOKEN=$(get_aws_secret "snyk/token")
    if [ -z "$SNYK_TOKEN" ]; then
        echo "Get your Snyk token from: https://app.snyk.io/account"
        read -p "Enter Snyk token (or press Enter to skip): " SNYK_TOKEN
    fi
    set_github_secret "SNYK_TOKEN" "$SNYK_TOKEN" "$REPO"
    
    # SonarCloud
    SONAR_TOKEN=$(get_aws_secret "sonarcloud/token")
    if [ -z "$SONAR_TOKEN" ]; then
        echo "Get your SonarCloud token from: https://sonarcloud.io/account/security"
        read -p "Enter SonarCloud token (or press Enter to skip): " SONAR_TOKEN
    fi
    set_github_secret "SONAR_TOKEN" "$SONAR_TOKEN" "$REPO"
    
    # Codecov
    CODECOV_TOKEN=$(get_aws_secret "codecov/token")
    if [ -z "$CODECOV_TOKEN" ]; then
        read -p "Enter Codecov token (or press Enter to skip): " CODECOV_TOKEN
    fi
    set_github_secret "CODECOV_TOKEN" "$CODECOV_TOKEN" "$REPO"
    
    # Infrastructure secrets
    print_status "$YELLOW" "Setting up infrastructure secrets..."
    
    # Terraform State Bucket
    read -p "Enter Terraform state bucket name: " TF_STATE_BUCKET
    set_github_secret "TF_STATE_BUCKET" "$TF_STATE_BUCKET" "$REPO"
    
    # CloudFront Distribution ID
    read -p "Enter CloudFront Distribution ID (or press Enter to skip): " CLOUDFRONT_DISTRIBUTION_ID
    set_github_secret "CLOUDFRONT_DISTRIBUTION_ID" "$CLOUDFRONT_DISTRIBUTION_ID" "$REPO"
    
    # Grafana Admin Password
    GRAFANA_PASSWORD=$(openssl rand -base64 32)
    print_status "$BLUE" "Generated Grafana admin password: $GRAFANA_PASSWORD"
    set_github_secret "GRAFANA_ADMIN_PASSWORD" "$GRAFANA_PASSWORD" "$REPO"
    
    # Test secrets
    print_status "$YELLOW" "Setting up test environment secrets..."
    
    # Test Database URL
    read -p "Enter test database URL (or press Enter to skip): " TEST_DATABASE_URL
    set_github_secret "TEST_DATABASE_URL" "$TEST_DATABASE_URL" "$REPO"
    
    # Test API Key
    TEST_API_KEY=$(openssl rand -hex 32)
    print_status "$BLUE" "Generated test API key: $TEST_API_KEY"
    set_github_secret "TEST_API_KEY" "$TEST_API_KEY" "$REPO"
    
    # Cypress Dashboard
    read -p "Enter Cypress Record Key (or press Enter to skip): " CYPRESS_RECORD_KEY
    set_github_secret "CYPRESS_RECORD_KEY" "$CYPRESS_RECORD_KEY" "$REPO"
    
    echo ""
    print_status "$GREEN" "✅ GitHub Secrets setup complete!"
    echo ""
    print_status "$BLUE" "📋 Summary of configured secrets:"
    gh secret list --repo "$REPO"
}

# Show usage
show_usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup    - Set up all GitHub secrets"
    echo "  list     - List current secrets"
    echo "  verify   - Verify required secrets are set"
    echo "  help     - Show this help message"
}

# Verify secrets are set
verify_secrets() {
    print_status "$BLUE" "🔍 Verifying GitHub Secrets..."
    
    REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "candlefish-ai/candlefish-ai")
    
    # List of required secrets
    REQUIRED_SECRETS=(
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "AWS_ROLE_ARN"
        "SEMANTIC_RELEASE_TOKEN"
    )
    
    # List of optional but recommended secrets
    OPTIONAL_SECRETS=(
        "AWS_PROD_ROLE_ARN"
        "DOCKER_USERNAME"
        "DOCKER_PASSWORD"
        "NPM_TOKEN"
        "SLACK_WEBHOOK"
        "SNYK_TOKEN"
        "SONAR_TOKEN"
        "CODECOV_TOKEN"
        "DATADOG_API_KEY"
        "GRAFANA_ADMIN_PASSWORD"
    )
    
    # Get list of existing secrets
    EXISTING_SECRETS=$(gh secret list --repo "$REPO" --json name -q '.[].name' 2>/dev/null || echo "")
    
    echo ""
    print_status "$YELLOW" "Required secrets:"
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if echo "$EXISTING_SECRETS" | grep -q "^$secret$"; then
            print_status "$GREEN" "  ✅ $secret"
        else
            print_status "$RED" "  ❌ $secret (MISSING)"
        fi
    done
    
    echo ""
    print_status "$YELLOW" "Optional secrets:"
    for secret in "${OPTIONAL_SECRETS[@]}"; do
        if echo "$EXISTING_SECRETS" | grep -q "^$secret$"; then
            print_status "$GREEN" "  ✅ $secret"
        else
            print_status "$YELLOW" "  ⚠️  $secret (not set)"
        fi
    done
}

# Main script
case "${1:-help}" in
    setup)
        setup_secrets
        ;;
    list)
        REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "candlefish-ai/candlefish-ai")
        gh secret list --repo "$REPO"
        ;;
    verify)
        verify_secrets
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_status "$RED" "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac