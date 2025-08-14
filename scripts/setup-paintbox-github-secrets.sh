#!/bin/bash

# Setup Paintbox GitHub Secrets from AWS Secrets Manager
# This script retrieves secrets from AWS and sets them in GitHub

set -e

echo "🔐 Setting up Paintbox GitHub Secrets from AWS Secrets Manager..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# GitHub repository
REPO="candlefish-ai"
OWNER="candlefish-ai" # Updated to use organization

# Function to get secret from AWS
get_aws_secret() {
    local secret_name=$1
    local json_key=$2

    if [ -z "$json_key" ]; then
        # Plain text secret
        aws secretsmanager get-secret-value \
            --secret-id "$secret_name" \
            --query 'SecretString' \
            --output text 2>/dev/null || echo ""
    else
        # JSON secret - extract specific key
        aws secretsmanager get-secret-value \
            --secret-id "$secret_name" \
            --query 'SecretString' \
            --output text 2>/dev/null | jq -r ".$json_key" 2>/dev/null || echo ""
    fi
}

# Function to set GitHub secret
set_github_secret() {
    local name=$1
    local value=$2

    if [ -z "$value" ]; then
        echo -e "${YELLOW}⚠️  Skipping $name (no value found)${NC}"
        return
    fi

    echo "$value" | gh secret set "$name" --repo "$OWNER/$REPO" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Set $name${NC}"
    else
        echo -e "${RED}❌ Failed to set $name${NC}"
    fi
}

echo "📦 Retrieving secrets from AWS Secrets Manager..."

# Deployment Platform Secrets
echo -e "\n${YELLOW}Setting deployment platform secrets...${NC}"

# Fly.io
FLY_API_TOKEN=$(get_aws_secret "paintbox/fly" "api_token")
set_github_secret "FLY_API_TOKEN" "$FLY_API_TOKEN"

# Vercel
VERCEL_TOKEN=$(get_aws_secret "paintbox/vercel" "token")
VERCEL_ORG_ID=$(get_aws_secret "paintbox/vercel" "org_id")
VERCEL_PROJECT_ID=$(get_aws_secret "paintbox/vercel" "project_id")
set_github_secret "VERCEL_TOKEN" "$VERCEL_TOKEN"
set_github_secret "VERCEL_ORG_ID" "$VERCEL_ORG_ID"
set_github_secret "VERCEL_PROJECT_ID_PAINTBOX" "$VERCEL_PROJECT_ID"

# Netlify
NETLIFY_AUTH_TOKEN=$(get_aws_secret "paintbox/netlify" "auth_token")
NETLIFY_SITE_ID=$(get_aws_secret "paintbox/netlify" "site_id")
set_github_secret "NETLIFY_AUTH_TOKEN" "$NETLIFY_AUTH_TOKEN"
set_github_secret "NETLIFY_SITE_ID_PAINTBOX" "$NETLIFY_SITE_ID"

# Database Secrets
echo -e "\n${YELLOW}Setting database secrets...${NC}"

DATABASE_URL=$(get_aws_secret "paintbox/database" "url")
TEST_DATABASE_URL=$(get_aws_secret "paintbox/database" "test_url")
set_github_secret "DATABASE_URL" "$DATABASE_URL"
set_github_secret "TEST_DATABASE_URL" "$TEST_DATABASE_URL"

# If test URL doesn't exist, use main with different database name
if [ -z "$TEST_DATABASE_URL" ] && [ -n "$DATABASE_URL" ]; then
    TEST_DATABASE_URL="${DATABASE_URL/paintbox/paintbox_test}"
    set_github_secret "TEST_DATABASE_URL" "$TEST_DATABASE_URL"
fi

# Redis/Cache Secrets
echo -e "\n${YELLOW}Setting Redis cache secrets...${NC}"

REDIS_URL=$(get_aws_secret "paintbox/redis" "url")
TEST_REDIS_URL=$(get_aws_secret "paintbox/redis" "test_url")
set_github_secret "REDIS_URL" "$REDIS_URL"
set_github_secret "TEST_REDIS_URL" "$TEST_REDIS_URL"

# If test Redis doesn't exist, use main with different database number
if [ -z "$TEST_REDIS_URL" ] && [ -n "$REDIS_URL" ]; then
    TEST_REDIS_URL="${REDIS_URL%/*}/1"  # Use database 1 for tests
    set_github_secret "TEST_REDIS_URL" "$TEST_REDIS_URL"
fi

# Integration Secrets
echo -e "\n${YELLOW}Setting integration secrets...${NC}"

# Agent Platform
AGENT_PLATFORM_URL=$(get_aws_secret "candlefish/agent-platform" "url")
set_github_secret "AGENT_PLATFORM_URL" "$AGENT_PLATFORM_URL"

# Salesforce
SALESFORCE_CLIENT_ID=$(get_aws_secret "paintbox/salesforce" "client_id")
SALESFORCE_CLIENT_SECRET=$(get_aws_secret "paintbox/salesforce" "client_secret")
SALESFORCE_USERNAME=$(get_aws_secret "paintbox/salesforce" "username")
SALESFORCE_PASSWORD=$(get_aws_secret "paintbox/salesforce" "password")
SALESFORCE_SECURITY_TOKEN=$(get_aws_secret "paintbox/salesforce" "security_token")

set_github_secret "SALESFORCE_CLIENT_ID" "$SALESFORCE_CLIENT_ID"
set_github_secret "SALESFORCE_CLIENT_SECRET" "$SALESFORCE_CLIENT_SECRET"
set_github_secret "SALESFORCE_USERNAME" "$SALESFORCE_USERNAME"
set_github_secret "SALESFORCE_PASSWORD" "$SALESFORCE_PASSWORD"
set_github_secret "SALESFORCE_SECURITY_TOKEN" "$SALESFORCE_SECURITY_TOKEN"

# CompanyCam
COMPANYCAM_API_KEY=$(get_aws_secret "paintbox/companycam" "api_key")
set_github_secret "COMPANYCAM_API_KEY" "$COMPANYCAM_API_KEY"

# Monitoring Secrets
echo -e "\n${YELLOW}Setting monitoring secrets...${NC}"

SENTRY_DSN=$(get_aws_secret "paintbox/sentry" "dsn")
set_github_secret "SENTRY_DSN" "$SENTRY_DSN"

# API Keys
echo -e "\n${YELLOW}Setting API keys...${NC}"

STAGING_API_KEY=$(get_aws_secret "paintbox/api" "staging_key")
set_github_secret "STAGING_API_KEY" "$STAGING_API_KEY"

# AWS Credentials (for S3, etc.)
echo -e "\n${YELLOW}Setting AWS credentials...${NC}"

AWS_ACCESS_KEY_ID=$(get_aws_secret "paintbox/aws" "access_key_id")
AWS_SECRET_ACCESS_KEY=$(get_aws_secret "paintbox/aws" "secret_access_key")
set_github_secret "AWS_ACCESS_KEY_ID" "$AWS_ACCESS_KEY_ID"
set_github_secret "AWS_SECRET_ACCESS_KEY" "$AWS_SECRET_ACCESS_KEY"

# JWT Keys
echo -e "\n${YELLOW}Setting JWT keys...${NC}"

JWT_PUBLIC_KEY=$(get_aws_secret "paintbox/jwt" "public_key")
JWT_PRIVATE_KEY=$(get_aws_secret "paintbox/jwt" "private_key")
set_github_secret "JWT_PUBLIC_KEY" "$JWT_PUBLIC_KEY"
set_github_secret "JWT_PRIVATE_KEY" "$JWT_PRIVATE_KEY"

# SendGrid (if using for emails)
echo -e "\n${YELLOW}Setting email service secrets...${NC}"

SENDGRID_API_KEY=$(get_aws_secret "paintbox/sendgrid" "api_key")
set_github_secret "SENDGRID_API_KEY" "$SENDGRID_API_KEY"

# OpenAI/Anthropic (for AI features)
echo -e "\n${YELLOW}Setting AI service secrets...${NC}"

OPENAI_API_KEY=$(get_aws_secret "ai-services/openai" "api_key")
ANTHROPIC_API_KEY=$(get_aws_secret "ai-services/anthropic" "api_key")
set_github_secret "OPENAI_API_KEY" "$OPENAI_API_KEY"
set_github_secret "ANTHROPIC_API_KEY" "$ANTHROPIC_API_KEY"

echo -e "\n${GREEN}✅ GitHub secrets setup complete!${NC}"
echo -e "${YELLOW}📝 Note: Some secrets might not exist in AWS and were skipped.${NC}"
echo -e "${YELLOW}   Please create them in AWS Secrets Manager if needed.${NC}"

# List all secrets (without values)
echo -e "\n${YELLOW}Current GitHub secrets:${NC}"
gh secret list --repo "$OWNER/$REPO"
