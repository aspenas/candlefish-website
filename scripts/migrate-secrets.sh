#!/bin/bash

# GitHub Secrets Migration Script
# Migrates secrets from personal account to organization

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SOURCE_USER="aspenas"
TARGET_ORG="${1:-candlefish}"

echo "🔐 GitHub Secrets Migration"
echo "═══════════════════════════"
echo ""

# Required secrets for Candlefish
SECRETS=(
    "ANTHROPIC_API_KEY"
    "OPENAI_API_KEY"
    "VERCEL_TOKEN"
    "NETLIFY_AUTH_TOKEN"
    "FLY_API_TOKEN"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "DATABASE_URL"
    "NEXTAUTH_SECRET"
    "UPSTASH_REDIS_REST_URL"
    "UPSTASH_REDIS_REST_TOKEN"
    "SLACK_BOT_TOKEN"
    "SLACK_WEBHOOK_URL"
    "SENDGRID_API_KEY"
    "GITHUB_TOKEN"
)

echo -e "${YELLOW}Fetching secrets from AWS Secrets Manager...${NC}"
echo ""

# Function to get secret from AWS
get_aws_secret() {
    local secret_name=$1
    aws secretsmanager get-secret-value --secret-id "$secret_name" --query 'SecretString' --output text 2>/dev/null || echo ""
}

# Function to set GitHub secret
set_github_secret() {
    local name=$1
    local value=$2

    if [ -z "$value" ]; then
        echo -e "  ${YELLOW}⚠ $name - Not found in AWS${NC}"
        return 1
    fi

    echo -n "  Setting $name... "

    # Set organization secret
    echo "$value" | gh secret set "$name" --org "$TARGET_ORG" 2>/dev/null && \
        echo -e "${GREEN}✓${NC}" || \
        echo -e "${RED}✗${NC}"
}

# Map AWS secret names to GitHub secret names
echo -e "${BLUE}Migrating secrets to $TARGET_ORG organization...${NC}"
echo ""

# Anthropic
value=$(get_aws_secret "candlefish/anthropic-api-key" | jq -r '.' 2>/dev/null || \
        get_aws_secret "candlefish-ai/anthropic/api-key" | jq -r '.' 2>/dev/null || \
        get_aws_secret "claude-api-key" | jq -r '.' 2>/dev/null)
set_github_secret "ANTHROPIC_API_KEY" "$value"

# OpenAI
value=$(get_aws_secret "openai/api-key" | jq -r '.' 2>/dev/null || \
        get_aws_secret "openai-api-key" | jq -r '.' 2>/dev/null)
set_github_secret "OPENAI_API_KEY" "$value"

# Vercel
value=$(get_aws_secret "vercel/token" | jq -r '.' 2>/dev/null || \
        get_aws_secret "vercel-token" | jq -r '.' 2>/dev/null)
set_github_secret "VERCEL_TOKEN" "$value"

# Netlify
value=$(get_aws_secret "netlify/auth-token" | jq -r '.' 2>/dev/null || \
        get_aws_secret "netlify-token" | jq -r '.' 2>/dev/null)
set_github_secret "NETLIFY_AUTH_TOKEN" "$value"

# Fly.io
value=$(get_aws_secret "fly/api-token" | jq -r '.' 2>/dev/null || \
        get_aws_secret "fly-api-token" | jq -r '.' 2>/dev/null)
set_github_secret "FLY_API_TOKEN" "$value"

# AWS Credentials
value=$(get_aws_secret "aws/access-key-id" | jq -r '.' 2>/dev/null)
set_github_secret "AWS_ACCESS_KEY_ID" "$value"

value=$(get_aws_secret "aws/secret-access-key" | jq -r '.' 2>/dev/null)
set_github_secret "AWS_SECRET_ACCESS_KEY" "$value"

# Database
value=$(get_aws_secret "candlefish/database-url" | jq -r '.' 2>/dev/null)
set_github_secret "DATABASE_URL" "$value"

# NextAuth
value=$(get_aws_secret "candlefish/nextauth-secret" | jq -r '.' 2>/dev/null)
set_github_secret "NEXTAUTH_SECRET" "$value"

# Upstash Redis
value=$(get_aws_secret "candlefish/upstash-redis-rest-url" | jq -r '.' 2>/dev/null)
set_github_secret "UPSTASH_REDIS_REST_URL" "$value"

value=$(get_aws_secret "candlefish/upstash-redis-rest-token" | jq -r '.' 2>/dev/null)
set_github_secret "UPSTASH_REDIS_REST_TOKEN" "$value"

# Slack
value=$(get_aws_secret "candlefish/slack/bot-token" | jq -r '.' 2>/dev/null)
set_github_secret "SLACK_BOT_TOKEN" "$value"

value=$(get_aws_secret "candlefish/slack/webhook-url" | jq -r '.' 2>/dev/null)
set_github_secret "SLACK_WEBHOOK_URL" "$value"

# SendGrid
value=$(get_aws_secret "sendgrid/api-key" | jq -r '.' 2>/dev/null)
set_github_secret "SENDGRID_API_KEY" "$value"

# GitHub Token (for workflows)
value=$(get_aws_secret "github-token" | jq -r '.' 2>/dev/null)
set_github_secret "GITHUB_TOKEN" "$value"

echo ""
echo -e "${GREEN}✓ Secrets migration complete!${NC}"
echo ""
echo "View secrets at: https://github.com/organizations/$TARGET_ORG/settings/secrets"
echo ""
echo -e "${YELLOW}Note:${NC} Some secrets may need manual configuration:"
echo "  • Environment-specific variables"
echo "  • Repository-specific deploy keys"
echo "  • Third-party webhook secrets"
