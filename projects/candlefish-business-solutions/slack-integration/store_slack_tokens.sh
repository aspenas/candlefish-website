#!/bin/bash
# Store Slack Admin Bot Tokens in AWS Secrets Manager
# Usage: ./store_slack_tokens.sh

set -e

echo "==================================="
echo "Slack Admin Bot Token Storage Setup"
echo "==================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to validate token format
validate_token() {
    local token=$1
    local prefix=$2
    local name=$3

    if [[ ! "$token" =~ ^${prefix} ]]; then
        echo -e "${RED}❌ Invalid ${name}. Should start with '${prefix}'${NC}"
        return 1
    fi
    echo -e "${GREEN}✅ Valid ${name} format${NC}"
    return 0
}

# Prompt for tokens
echo ""
echo "Please enter the following tokens from your Slack App configuration:"
echo "(Find these at: https://api.slack.com/apps/YOUR_APP_ID)"
echo ""

read -p "Bot User OAuth Token (xoxb-...): " BOT_TOKEN
validate_token "$BOT_TOKEN" "xoxb-" "Bot Token"

read -p "App-Level Token (xapp-...): " APP_TOKEN
validate_token "$APP_TOKEN" "xapp-" "App Token"

read -p "Client ID: " CLIENT_ID
read -p "Client Secret: " CLIENT_SECRET
read -p "Signing Secret: " SIGNING_SECRET
read -p "Verification Token: " VERIFICATION_TOKEN
read -p "Workspace ID (optional): " WORKSPACE_ID

# Set defaults
WORKSPACE_NAME="${WORKSPACE_NAME:-candlefish.ai}"
CREATED_DATE=$(date +%Y-%m-%d)

# Create JSON payload
echo ""
echo "Creating secret JSON..."

cat > /tmp/slack-admin-bot.json << EOF
{
  "bot_token": "${BOT_TOKEN}",
  "app_token": "${APP_TOKEN}",
  "client_id": "${CLIENT_ID}",
  "client_secret": "${CLIENT_SECRET}",
  "signing_secret": "${SIGNING_SECRET}",
  "verification_token": "${VERIFICATION_TOKEN}",
  "workspace_id": "${WORKSPACE_ID}",
  "workspace_name": "${WORKSPACE_NAME}",
  "permissions": "admin",
  "created_date": "${CREATED_DATE}",
  "app_name": "Candlefish Admin Agent"
}
EOF

echo -e "${GREEN}✅ JSON created${NC}"

# Check if secret already exists
echo ""
echo "Checking for existing secret..."
if aws secretsmanager describe-secret --secret-id slack-admin-bot-tokens --region us-west-2 &>/dev/null; then
    echo -e "${YELLOW}⚠️  Secret already exists. Updating...${NC}"
    aws secretsmanager update-secret \
        --secret-id slack-admin-bot-tokens \
        --secret-string file:///tmp/slack-admin-bot.json \
        --region us-west-2
    echo -e "${GREEN}✅ Secret updated successfully${NC}"
else
    echo "Creating new secret..."
    aws secretsmanager create-secret \
        --name slack-admin-bot-tokens \
        --description "Slack Admin Bot with full workspace permissions for autonomous agent" \
        --secret-string file:///tmp/slack-admin-bot.json \
        --region us-west-2 \
        --tags Key=Project,Value=Candlefish Key=Component,Value=SlackIntegration Key=Environment,Value=Production
    echo -e "${GREEN}✅ Secret created successfully${NC}"
fi

# Clean up
rm -f /tmp/slack-admin-bot.json
echo -e "${GREEN}✅ Temporary files cleaned up${NC}"

# Verify storage
echo ""
echo "Verifying secret storage..."
if aws secretsmanager get-secret-value --secret-id slack-admin-bot-tokens --region us-west-2 --query SecretString --output text | jq -e '.bot_token' &>/dev/null; then
    echo -e "${GREEN}✅ Secret verified successfully${NC}"
    echo ""
    echo "Secret ARN:"
    aws secretsmanager describe-secret --secret-id slack-admin-bot-tokens --region us-west-2 --query ARN --output text
else
    echo -e "${RED}❌ Failed to verify secret${NC}"
    exit 1
fi

echo ""
echo "==================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Run the test script: python3 test_slack_admin.py"
echo "2. Configure CloudWatch monitoring"
echo "3. Set up token rotation (90 days)"
echo ""
echo "To retrieve tokens in your code:"
echo "  aws secretsmanager get-secret-value --secret-id slack-admin-bot-tokens --region us-west-2"
echo ""
