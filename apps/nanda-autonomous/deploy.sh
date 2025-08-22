#!/bin/bash

# NANDA Autonomous Agent Deployment Script
# Deploys the remote autonomous commit system to Fly.io

set -e

echo "🚀 Deploying NANDA Autonomous Agent to Fly.io..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the nanda-autonomous directory.${NC}"
    exit 1
fi

# Check if Fly CLI is installed
if ! command -v flyctl &> /dev/null; then
    echo -e "${RED}Error: Fly CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://fly.io/docs/getting-started/installing-flyctl/"
    exit 1
fi

# Create the app if it doesn't exist
echo "📱 Creating Fly.io app..."
if ! flyctl apps list | grep -q "nanda-autonomous"; then
    flyctl apps create nanda-autonomous || true
else
    echo -e "${YELLOW}App already exists, skipping creation${NC}"
fi

# Set secrets from AWS Secrets Manager
echo "🔐 Setting secrets..."

# Get GitHub token from AWS Secrets Manager
GITHUB_TOKEN=$(aws secretsmanager get-secret-value \
    --secret-id "github/personal-access-token" \
    --query 'SecretString' \
    --output text 2>/dev/null || echo "")

if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${YELLOW}Warning: Could not retrieve GitHub token from AWS Secrets Manager${NC}"
    echo "Please set it manually with: flyctl secrets set GITHUB_TOKEN=<your-token>"
else
    flyctl secrets set GITHUB_TOKEN="$GITHUB_TOKEN" --app nanda-autonomous
    echo -e "${GREEN}✓ GitHub token set${NC}"
fi

# Set AWS credentials for DynamoDB access
AWS_ACCESS_KEY=$(aws configure get aws_access_key_id)
AWS_SECRET_KEY=$(aws configure get aws_secret_access_key)

if [ -n "$AWS_ACCESS_KEY" ] && [ -n "$AWS_SECRET_KEY" ]; then
    flyctl secrets set \
        AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY" \
        AWS_SECRET_ACCESS_KEY="$AWS_SECRET_KEY" \
        --app nanda-autonomous
    echo -e "${GREEN}✓ AWS credentials set${NC}"
else
    echo -e "${YELLOW}Warning: AWS credentials not found${NC}"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Deploy to Fly.io
echo "🚀 Deploying to Fly.io..."
flyctl deploy --app nanda-autonomous

# Check deployment status
echo "🔍 Checking deployment status..."
flyctl status --app nanda-autonomous

# Get the app URL
APP_URL=$(flyctl info --app nanda-autonomous -j | jq -r '.Hostname')
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📊 NANDA Autonomous Agent is now running at:"
echo "   https://$APP_URL"
echo ""
echo "🔗 Endpoints:"
echo "   Health: https://$APP_URL/health"
echo "   Status: https://$APP_URL/status"
echo "   Trigger: POST https://$APP_URL/trigger"
echo ""
echo "📝 View logs:"
echo "   flyctl logs --app nanda-autonomous"
echo ""
echo "🤖 The agent will automatically:"
echo "   - Check for changes every 5 minutes"
echo "   - Create autonomous commits via GitHub API"
echo "   - Generate pull requests for review"
echo "   - Self-optimize and evolve"
echo ""
echo "🎉 NANDA is now fully autonomous in the cloud!"