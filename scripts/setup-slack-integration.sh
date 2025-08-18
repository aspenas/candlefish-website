#!/bin/bash

# Candlefish AI - Slack Integration Setup
# This script properly configures Slack OAuth with all required scopes

set -e

echo "🔧 Setting up Slack Integration for Candlefish AI"
echo "================================================"
echo ""

# Check for required tools
command -v jq >/dev/null 2>&1 || { echo "Installing jq..."; brew install jq; }
command -v curl >/dev/null 2>&1 || { echo "curl is required but not installed. Aborting."; exit 1; }

# Get current Slack credentials from AWS
echo "📥 Fetching current Slack credentials from AWS..."
CURRENT_CREDS=$(aws secretsmanager get-secret-value --secret-id candlefish/slack/oauth --query SecretString --output text)

CLIENT_ID=$(echo $CURRENT_CREDS | jq -r '.client_id')
CLIENT_SECRET=$(echo $CURRENT_CREDS | jq -r '.client_secret')
SIGNING_SECRET=$(echo $CURRENT_CREDS | jq -r '.signing_secret')

echo "Current Client ID: $CLIENT_ID"
echo ""

# Required scopes for full functionality
REQUIRED_SCOPES="chat:write,im:write,im:read,im:history,users:read,users:read.email,channels:read,channels:write,groups:read,groups:write,mpim:read,mpim:write"

echo "📋 Required Slack OAuth Scopes:"
echo "  - chat:write (send messages)"
echo "  - im:write (send DMs)"
echo "  - im:read (read DM channels)"
echo "  - im:history (read DM history)"
echo "  - users:read (find users)"
echo "  - users:read.email (get user emails)"
echo "  - channels:read (list channels)"
echo "  - groups:read (list private channels)"
echo ""

# Generate OAuth URL
REDIRECT_URI="https://candlefish.ai/slack/oauth/callback"
OAUTH_URL="https://slack.com/oauth/v2/authorize?client_id=${CLIENT_ID}&scope=${REQUIRED_SCOPES}&redirect_uri=${REDIRECT_URI}"

echo "🔐 OAuth Authorization URL:"
echo ""
echo "$OAUTH_URL"
echo ""
echo "Steps to authorize:"
echo "1. Click the link above (or copy/paste to browser)"
echo "2. Select the Candlefish workspace"
echo "3. Review and approve the permissions"
echo "4. Copy the 'code' parameter from the redirect URL"
echo ""

read -p "Enter the authorization code from the redirect URL: " AUTH_CODE

if [ -z "$AUTH_CODE" ]; then
    echo "❌ No authorization code provided"
    exit 1
fi

echo ""
echo "🔄 Exchanging code for access token..."

# Exchange code for token
TOKEN_RESPONSE=$(curl -s -X POST "https://slack.com/api/oauth.v2.access" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=${CLIENT_ID}" \
    -d "client_secret=${CLIENT_SECRET}" \
    -d "code=${AUTH_CODE}" \
    -d "redirect_uri=${REDIRECT_URI}")

# Check if successful
if echo "$TOKEN_RESPONSE" | jq -e '.ok' > /dev/null; then
    BOT_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
    TEAM_ID=$(echo "$TOKEN_RESPONSE" | jq -r '.team.id')
    TEAM_NAME=$(echo "$TOKEN_RESPONSE" | jq -r '.team.name')
    BOT_USER_ID=$(echo "$TOKEN_RESPONSE" | jq -r '.bot_user_id')
    AUTHED_USER=$(echo "$TOKEN_RESPONSE" | jq -r '.authed_user.id')
    
    echo "✅ Successfully authenticated!"
    echo "  Team: $TEAM_NAME ($TEAM_ID)"
    echo "  Bot User ID: $BOT_USER_ID"
    echo "  Authorized User: $AUTHED_USER"
    echo ""
    
    # Update AWS Secrets Manager
    echo "📝 Updating AWS Secrets Manager..."
    
    NEW_SECRET=$(jq -n \
        --arg ci "$CLIENT_ID" \
        --arg cs "$CLIENT_SECRET" \
        --arg ss "$SIGNING_SECRET" \
        --arg bt "$BOT_TOKEN" \
        --arg ti "$TEAM_ID" \
        --arg tn "$TEAM_NAME" \
        --arg bu "$BOT_USER_ID" \
        --arg au "$AUTHED_USER" \
        '{
            client_id: $ci,
            client_secret: $cs,
            signing_secret: $ss,
            bot_token: $bt,
            team_id: $ti,
            team_name: $tn,
            bot_user_id: $bu,
            authed_user: $au
        }')
    
    aws secretsmanager update-secret \
        --secret-id candlefish/slack/oauth \
        --secret-string "$NEW_SECRET"
    
    echo "✅ AWS Secrets updated successfully!"
    echo ""
    
    # Test the new token
    echo "🧪 Testing new token..."
    TEST_RESPONSE=$(curl -s -X POST "https://slack.com/api/auth.test" \
        -H "Authorization: Bearer $BOT_TOKEN")
    
    if echo "$TEST_RESPONSE" | jq -e '.ok' > /dev/null; then
        echo "✅ Token is valid and working!"
        echo ""
        
        # Create Slack integration script
        cat > ~/.claude/slack-dm.sh << EOF
#!/bin/bash

# Send Slack DM
# Usage: slack-dm <username> <message>

BOT_TOKEN="$BOT_TOKEN"

USERNAME="\$1"
shift
MESSAGE="\$*"

if [ -z "\$USERNAME" ] || [ -z "\$MESSAGE" ]; then
    echo "Usage: slack-dm <username> <message>"
    exit 1
fi

# Find user ID
USER_ID=\$(curl -s -X GET "https://slack.com/api/users.list" \\
    -H "Authorization: Bearer \$BOT_TOKEN" | \\
    jq -r ".members[] | select(.name == \"\$USERNAME\" or .real_name | test(\"\$USERNAME\"; \"i\")) | .id" | head -1)

if [ -z "\$USER_ID" ]; then
    echo "User not found: \$USERNAME"
    exit 1
fi

# Open DM channel
CHANNEL_ID=\$(curl -s -X POST "https://slack.com/api/conversations.open" \\
    -H "Authorization: Bearer \$BOT_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d "{\"users\": \"\$USER_ID\"}" | \\
    jq -r '.channel.id')

if [ -z "\$CHANNEL_ID" ]; then
    echo "Failed to open DM channel"
    exit 1
fi

# Send message
RESULT=\$(curl -s -X POST "https://slack.com/api/chat.postMessage" \\
    -H "Authorization: Bearer \$BOT_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d "{\"channel\": \"\$CHANNEL_ID\", \"text\": \"\$MESSAGE\"}")

if echo "\$RESULT" | jq -e '.ok' > /dev/null; then
    echo "✅ Message sent successfully!"
else
    echo "❌ Failed to send message"
    echo "\$RESULT" | jq -r '.error'
fi
EOF
        
        chmod +x ~/.claude/slack-dm.sh
        
        echo "📬 Slack DM command installed!"
        echo "Usage: ~/.claude/slack-dm.sh <username> <message>"
        echo ""
        echo "Example:"
        echo "  ~/.claude/slack-dm.sh tyler 'Hey! Your agents are ready!'"
        echo ""
        
    else
        echo "❌ Token test failed:"
        echo "$TEST_RESPONSE" | jq '.'
    fi
    
else
    echo "❌ Failed to exchange code for token:"
    echo "$TOKEN_RESPONSE" | jq '.'
    exit 1
fi

echo "🎉 Slack integration setup complete!"