#!/bin/bash
# Deploy Candlefish Slack Workspace Manager to Fly.io

set -e

echo "======================================"
echo "Deploying Candlefish Slack Bot to Fly.io"
echo "======================================"

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "Installing Fly.io CLI..."
    curl -L https://fly.io/install.sh | sh
    export FLYCTL_INSTALL="/home/$USER/.fly"
    export PATH="$FLYCTL_INSTALL/bin:$PATH"
fi

# Check if logged in to Fly.io
if ! flyctl auth whoami &> /dev/null; then
    echo "Please log in to Fly.io:"
    flyctl auth login
fi

# Create app if it doesn't exist
if ! flyctl apps list | grep -q "candlefish-slack-bot"; then
    echo "Creating Fly.io app..."
    flyctl apps create candlefish-slack-bot --org personal
else
    echo "App already exists"
fi

# Set secrets from AWS Secrets Manager
echo "Setting secrets from AWS..."

# Get credentials from AWS
SLACK_CREDS=$(aws secretsmanager get-secret-value \
    --secret-id slack-workspace-manager \
    --region us-west-2 \
    --query SecretString \
    --output text)

# Extract individual values
CLIENT_ID=$(echo $SLACK_CREDS | jq -r .client_id)
CLIENT_SECRET=$(echo $SLACK_CREDS | jq -r .client_secret)
SIGNING_SECRET=$(echo $SLACK_CREDS | jq -r .signing_secret)

# Set Fly.io secrets
flyctl secrets set \
    SLACK_CLIENT_ID="$CLIENT_ID" \
    SLACK_CLIENT_SECRET="$CLIENT_SECRET" \
    SLACK_SIGNING_SECRET="$SIGNING_SECRET" \
    AWS_REGION="us-west-2" \
    --app candlefish-slack-bot

# Get other service tokens if available
if [ -n "$GITHUB_TOKEN" ]; then
    flyctl secrets set GITHUB_TOKEN="$GITHUB_TOKEN" --app candlefish-slack-bot
fi

if [ -n "$VERCEL_TOKEN" ]; then
    flyctl secrets set VERCEL_TOKEN="$VERCEL_TOKEN" --app candlefish-slack-bot
fi

if [ -n "$NETLIFY_TOKEN" ]; then
    flyctl secrets set NETLIFY_TOKEN="$NETLIFY_TOKEN" --app candlefish-slack-bot
fi

if [ -n "$FLY_API_TOKEN" ]; then
    flyctl secrets set FLY_API_TOKEN="$FLY_API_TOKEN" --app candlefish-slack-bot
fi

# Deploy the app
echo "Deploying to Fly.io..."
flyctl deploy --app candlefish-slack-bot

# Scale the app
echo "Scaling app..."
flyctl scale count 1 --app candlefish-slack-bot

# Show status
echo ""
echo "======================================"
echo "Deployment Complete!"
echo "======================================"
flyctl status --app candlefish-slack-bot

# Get the app URL
APP_URL=$(flyctl info --app candlefish-slack-bot -j | jq -r .Hostname)
echo ""
echo "Your Slack bot is running at: https://$APP_URL"
echo ""
echo "Next steps:"
echo "1. Add the bot to your Slack workspace"
echo "2. Configure OAuth redirect URL: https://$APP_URL/slack/oauth_redirect"
echo "3. Enable Socket Mode in Slack app settings"
echo "4. Update the bot token in AWS Secrets Manager"
echo ""
echo "Bot commands:"
echo "  !help - Show all commands"
echo "  !status [service] - Check service status"
echo "  !deploy [service] [env] - Deploy a service"
echo ""
echo "Admin users: patrick@candlefish.ai, tyler@candlefish.ai, aaron@candlefish.ai"
