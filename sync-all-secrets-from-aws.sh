#!/bin/bash

# Sync all secrets from AWS Secrets Manager to GitHub
# This script automatically fetches and sets GitHub secrets from AWS

set -e

echo "🔄 Syncing Secrets from AWS Secrets Manager to GitHub"
echo "======================================================"
echo ""

# Function to get secret from AWS and set in GitHub
sync_secret() {
    local aws_secret_name=$1
    local github_secret_name=$2
    local description=$3
    
    echo "📦 Syncing $github_secret_name..."
    
    # Try to get secret from AWS
    secret_value=$(aws secretsmanager get-secret-value \
        --secret-id "$aws_secret_name" \
        --query SecretString \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$secret_value" ]; then
        echo "$secret_value" | gh secret set "$github_secret_name"
        echo "✅ $github_secret_name synced from AWS"
    else
        echo "⚠️  $github_secret_name not found in AWS Secrets Manager (tried: $aws_secret_name)"
    fi
}

# Check for required tools
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

# Check GitHub auth
if ! gh auth status &> /dev/null; then
    echo "❌ GitHub CLI not authenticated. Please run 'gh auth login' first."
    exit 1
fi

echo "🔍 Fetching secrets from AWS Secrets Manager..."
echo ""

# Core secrets for CI/CD
sync_secret "candlefish/codecov-token" "CODECOV_TOKEN" "Code coverage reporting"
sync_secret "candlefish/snyk-token" "SNYK_TOKEN" "Security vulnerability scanning"
sync_secret "candlefish/slack-webhook" "SLACK_WEBHOOK" "Slack notifications"
sync_secret "candlefish/nvd-api-key" "NVD_API_KEY" "Vulnerability database access"

# AWS credentials (might already exist)
sync_secret "candlefish/aws-access-key" "AWS_ACCESS_KEY_ID" "AWS access"
sync_secret "candlefish/aws-secret-key" "AWS_SECRET_ACCESS_KEY" "AWS secret"

# Deployment platform tokens
sync_secret "candlefish/vercel-token" "VERCEL_TOKEN" "Vercel deployments"
sync_secret "candlefish/netlify-token" "NETLIFY_AUTH_TOKEN" "Netlify deployments"
sync_secret "candlefish/fly-token" "FLY_API_TOKEN" "Fly.io deployments"
sync_secret "candlefish/render-token" "RENDER_API_KEY" "Render deployments"
sync_secret "candlefish/expo-token" "EXPO_TOKEN" "Expo deployments"

# Monitoring and analytics
sync_secret "candlefish/datadog-api-key" "DATADOG_API_KEY" "Datadog monitoring"
sync_secret "candlefish/datadog-app-key" "DATADOG_APP_KEY" "Datadog app key"
sync_secret "candlefish/sentry-dsn" "SENTRY_DSN" "Sentry error tracking"
sync_secret "candlefish/logrocket-id" "LOGROCKET_APP_ID" "LogRocket session replay"

# API keys
sync_secret "candlefish/anthropic-api-key" "ANTHROPIC_API_KEY" "Claude API"
sync_secret "candlefish/openai-api-key" "OPENAI_API_KEY" "OpenAI API"
sync_secret "candlefish/github-token" "GH_TOKEN" "GitHub API access"

# Database and cache
sync_secret "candlefish/database-url" "DATABASE_URL" "Database connection"
sync_secret "candlefish/redis-url" "REDIS_URL" "Redis cache"

# Third-party integrations
sync_secret "candlefish/salesforce-client-id" "SALESFORCE_CLIENT_ID" "Salesforce OAuth"
sync_secret "candlefish/salesforce-client-secret" "SALESFORCE_CLIENT_SECRET" "Salesforce secret"
sync_secret "candlefish/companycam-api-token" "COMPANYCAM_API_TOKEN" "CompanyCam API"
sync_secret "candlefish/figma-token" "FIGMA_ACCESS_TOKEN" "Figma API access"

# Build optimization
sync_secret "candlefish/turbo-token" "TURBO_TOKEN" "Turborepo remote cache"
sync_secret "candlefish/turbo-team" "TURBO_TEAM" "Turborepo team"

echo ""
echo "📋 Current GitHub Secrets:"
echo "--------------------------"
gh secret list

echo ""
echo "✨ Secret sync complete!"
echo ""
echo "Next steps:"
echo "1. Trigger workflow re-run: gh workflow run monorepo-ci.yml"
echo "2. Check PR status: gh pr checks"
echo "3. Monitor workflows: gh run list --limit 10"
echo ""
echo "Note: Some secrets may need to be created in AWS Secrets Manager first."
echo "Use: aws secretsmanager create-secret --name 'candlefish/secret-name' --secret-string 'value'"