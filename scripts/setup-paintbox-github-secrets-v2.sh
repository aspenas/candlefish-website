#!/bin/bash

# Setup Paintbox GitHub Secrets from AWS Secrets Manager (v2)
# Uses actual available secrets

set -e

echo "🔐 Setting up Paintbox GitHub Secrets from AWS Secrets Manager (v2)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# GitHub repository
REPO="candlefish-ai"
OWNER="patricksmith" # Update if different

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

    if [ -z "$value" ] || [ "$value" == "null" ]; then
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

# Get the main Paintbox secrets bundle
echo -e "\n${YELLOW}Getting Paintbox main secrets...${NC}"
PAINTBOX_SECRETS=$(aws secretsmanager get-secret-value --secret-id "paintbox/secrets" --query 'SecretString' --output text 2>/dev/null || echo "{}")

# Parse Paintbox secrets if they exist
if [ "$PAINTBOX_SECRETS" != "{}" ] && [ -n "$PAINTBOX_SECRETS" ]; then
    echo -e "${GREEN}Found Paintbox secrets bundle${NC}"

    # Extract individual secrets
    DATABASE_URL=$(echo "$PAINTBOX_SECRETS" | jq -r '.DATABASE_URL // empty')
    REDIS_URL=$(echo "$PAINTBOX_SECRETS" | jq -r '.REDIS_URL // empty')
    JWT_SECRET=$(echo "$PAINTBOX_SECRETS" | jq -r '.JWT_SECRET // empty')
    NEXTAUTH_SECRET=$(echo "$PAINTBOX_SECRETS" | jq -r '.NEXTAUTH_SECRET // empty')

    set_github_secret "DATABASE_URL" "$DATABASE_URL"
    set_github_secret "REDIS_URL" "$REDIS_URL"
    set_github_secret "JWT_SECRET" "$JWT_SECRET"
    set_github_secret "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
fi

# Vercel Configuration
echo -e "\n${YELLOW}Setting Vercel secrets...${NC}"

VERCEL_TOKEN=$(get_aws_secret "mcp/vercel-token")
VERCEL_CONFIG=$(aws secretsmanager get-secret-value --secret-id "mcp/vercel-config-full" --query 'SecretString' --output text 2>/dev/null || echo "{}")

if [ "$VERCEL_CONFIG" != "{}" ]; then
    VERCEL_ORG_ID=$(echo "$VERCEL_CONFIG" | jq -r '.orgId // empty')
    VERCEL_PROJECT_ID=$(echo "$VERCEL_CONFIG" | jq -r '.projectId // empty')

    set_github_secret "VERCEL_TOKEN" "$VERCEL_TOKEN"
    set_github_secret "VERCEL_ORG_ID" "$VERCEL_ORG_ID"
    set_github_secret "VERCEL_PROJECT_ID_PAINTBOX" "$VERCEL_PROJECT_ID"
fi

# Netlify
echo -e "\n${YELLOW}Setting Netlify secrets...${NC}"

NETLIFY_AUTH_TOKEN=$(get_aws_secret "netlify-api-token")
set_github_secret "NETLIFY_AUTH_TOKEN" "$NETLIFY_AUTH_TOKEN"
# We'll need to create the site ID after first deployment
set_github_secret "NETLIFY_SITE_ID_PAINTBOX" "paintbox-app"

# Railway (for database/Redis if using)
echo -e "\n${YELLOW}Setting Railway secrets...${NC}"

RAILWAY_PROJECT_ID=$(get_aws_secret "paintbox/railway-project-id")
set_github_secret "RAILWAY_PROJECT_ID" "$RAILWAY_PROJECT_ID"

# Salesforce
echo -e "\n${YELLOW}Setting Salesforce secrets...${NC}"

# Try the sandbox credentials first
SF_SANDBOX=$(aws secretsmanager get-secret-value --secret-id "paintbox/salesforce/kindhome-bart-sandbox" --query 'SecretString' --output text 2>/dev/null || echo "{}")

if [ "$SF_SANDBOX" != "{}" ]; then
    SF_USERNAME=$(echo "$SF_SANDBOX" | jq -r '.username // empty')
    SF_PASSWORD=$(echo "$SF_SANDBOX" | jq -r '.password // empty')
    SF_SECURITY_TOKEN=$(echo "$SF_SANDBOX" | jq -r '.security_token // empty')
    SF_INSTANCE_URL=$(echo "$SF_SANDBOX" | jq -r '.instance_url // empty')

    set_github_secret "SALESFORCE_USERNAME" "$SF_USERNAME"
    set_github_secret "SALESFORCE_PASSWORD" "$SF_PASSWORD"
    set_github_secret "SALESFORCE_SECURITY_TOKEN" "$SF_SECURITY_TOKEN"
    set_github_secret "SALESFORCE_INSTANCE_URL" "$SF_INSTANCE_URL"
fi

# Connected App credentials
SF_APP=$(aws secretsmanager get-secret-value --secret-id "paintbox/salesforce/connected-app" --query 'SecretString' --output text 2>/dev/null || echo "{}")

if [ "$SF_APP" != "{}" ]; then
    SF_CLIENT_ID=$(echo "$SF_APP" | jq -r '.client_id // empty')
    SF_CLIENT_SECRET=$(echo "$SF_APP" | jq -r '.client_secret // empty')

    set_github_secret "SALESFORCE_CLIENT_ID" "$SF_CLIENT_ID"
    set_github_secret "SALESFORCE_CLIENT_SECRET" "$SF_CLIENT_SECRET"
fi

# Database and Redis from Candlefish (fallback)
echo -e "\n${YELLOW}Setting database/cache from Candlefish (if needed)...${NC}"

if [ -z "$DATABASE_URL" ]; then
    DATABASE_URL=$(get_aws_secret "candlefish/database-url")
    set_github_secret "DATABASE_URL" "$DATABASE_URL"
fi

if [ -z "$REDIS_URL" ]; then
    # Upstash Redis
    UPSTASH_URL=$(get_aws_secret "candlefish/upstash-redis-rest-url")
    UPSTASH_TOKEN=$(get_aws_secret "candlefish/upstash-redis-rest-token")

    if [ -n "$UPSTASH_URL" ] && [ -n "$UPSTASH_TOKEN" ]; then
        # Create Redis URL from Upstash credentials
        REDIS_URL="redis://:${UPSTASH_TOKEN}@${UPSTASH_URL#https://}"
        set_github_secret "REDIS_URL" "$UPSTASH_URL"
        set_github_secret "UPSTASH_REDIS_REST_URL" "$UPSTASH_URL"
        set_github_secret "UPSTASH_REDIS_REST_TOKEN" "$UPSTASH_TOKEN"
    fi
fi

# Test database/Redis (create from main if not exists)
echo -e "\n${YELLOW}Setting test environment secrets...${NC}"

if [ -n "$DATABASE_URL" ]; then
    TEST_DATABASE_URL="${DATABASE_URL/paintbox/paintbox_test}"
    set_github_secret "TEST_DATABASE_URL" "$TEST_DATABASE_URL"
fi

if [ -n "$REDIS_URL" ]; then
    TEST_REDIS_URL="${REDIS_URL%/*}/1"  # Use database 1 for tests
    set_github_secret "TEST_REDIS_URL" "$TEST_REDIS_URL"
fi

# AI Services
echo -e "\n${YELLOW}Setting AI service secrets...${NC}"

ANTHROPIC_API_KEY=$(get_aws_secret "candlefish/anthropic-api-key")
FIREWORKS_API_KEY=$(get_aws_secret "candlefish/fireworks-api-key")
set_github_secret "ANTHROPIC_API_KEY" "$ANTHROPIC_API_KEY"
set_github_secret "FIREWORKS_API_KEY" "$FIREWORKS_API_KEY"

# OpenAI from environment or AWS
OPENAI_API_KEY=$(get_aws_secret "ai-services/openai" "api_key")
if [ -z "$OPENAI_API_KEY" ]; then
    OPENAI_API_KEY=$(get_aws_secret "openai-api-key")
fi
set_github_secret "OPENAI_API_KEY" "$OPENAI_API_KEY"

# NextAuth
echo -e "\n${YELLOW}Setting NextAuth secrets...${NC}"

if [ -z "$NEXTAUTH_SECRET" ]; then
    NEXTAUTH_SECRET=$(get_aws_secret "candlefish/nextauth-secret")
    set_github_secret "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
fi

NEXTAUTH_URL="https://paintbox-app.fly.dev"
set_github_secret "NEXTAUTH_URL" "$NEXTAUTH_URL"

# Agent Platform URL (use localhost for now, will be updated when deployed)
echo -e "\n${YELLOW}Setting Agent Platform URL...${NC}"
set_github_secret "AGENT_PLATFORM_URL" "http://localhost:8080"

# Company Cam (placeholder - needs to be created)
echo -e "\n${YELLOW}Setting CompanyCam placeholder...${NC}"
set_github_secret "COMPANYCAM_API_KEY" "placeholder-needs-real-key"

# Sentry DSN (placeholder - needs project creation)
echo -e "\n${YELLOW}Setting Sentry placeholder...${NC}"
set_github_secret "SENTRY_DSN" "https://placeholder@sentry.io/paintbox"

# Fly.io API Token (needs to be created from Fly.io dashboard)
echo -e "\n${YELLOW}Setting Fly.io placeholder...${NC}"
set_github_secret "FLY_API_TOKEN" "placeholder-needs-fly-token"

# Staging API Key (generate one)
echo -e "\n${YELLOW}Generating staging API key...${NC}"
STAGING_API_KEY=$(openssl rand -hex 32)
set_github_secret "STAGING_API_KEY" "$STAGING_API_KEY"

# AWS credentials for the project
echo -e "\n${YELLOW}Setting AWS credentials...${NC}"
# These should come from your current AWS config
AWS_REGION="us-east-1"
set_github_secret "AWS_REGION" "$AWS_REGION"

echo -e "\n${GREEN}✅ GitHub secrets setup complete!${NC}"
echo -e "${YELLOW}📝 Note: Some secrets are placeholders and need to be updated:${NC}"
echo -e "   - FLY_API_TOKEN: Get from https://fly.io/user/personal_access_tokens"
echo -e "   - COMPANYCAM_API_KEY: Get from CompanyCam dashboard"
echo -e "   - SENTRY_DSN: Create project at https://sentry.io"
echo -e "   - AGENT_PLATFORM_URL: Update when agent platform is deployed"

# List all secrets (without values)
echo -e "\n${YELLOW}Current GitHub secrets:${NC}"
gh secret list --repo "$OWNER/$REPO" | head -30
