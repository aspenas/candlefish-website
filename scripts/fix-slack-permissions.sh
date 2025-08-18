#!/bin/bash

# Fix Slack Bot Permissions for Candlefish
# This script updates the existing Candlefish bot with proper DM permissions

echo "🔧 Fixing Candlefish Slack Bot Permissions"
echo "==========================================="
echo ""
echo "Bot URL: https://app.slack.com/apps-manage/T098GV2NYRK/integrations/profile/A098NL87USE/permissions"
echo ""

# Get current credentials
echo "📥 Getting current Slack credentials from AWS..."
CURRENT_CREDS=$(aws secretsmanager get-secret-value --secret-id candlefish/slack/oauth --query SecretString --output text)

CLIENT_ID=$(echo $CURRENT_CREDS | jq -r '.client_id')
echo "Client ID: $CLIENT_ID"
echo ""

echo "📋 Required Steps:"
echo ""
echo "1. Go to: https://api.slack.com/apps"
echo "2. Find the 'Candlefish Bot' app (App ID: A098NL87USE)"
echo "3. Click on 'OAuth & Permissions' in the left sidebar"
echo "4. Under 'Scopes' → 'Bot Token Scopes', add these if missing:"
echo "   ✓ chat:write"
echo "   ✓ im:write      ← CRITICAL for DMs"
echo "   ✓ im:read       ← CRITICAL for DMs"
echo "   ✓ im:history"
echo "   ✓ users:read"
echo "   ✓ users:read.email"
echo ""
echo "5. Click 'reinstall your app' at the top of the page"
echo "6. Authorize the updated permissions"
echo "7. Copy the new Bot User OAuth Token (starts with xoxb-)"
echo ""

read -p "Enter the new Bot User OAuth Token: " NEW_TOKEN

if [ -z "$NEW_TOKEN" ]; then
    echo "❌ No token provided"
    exit 1
fi

# Test the new token
echo ""
echo "🧪 Testing new token..."
TEST_RESPONSE=$(curl -s -X POST "https://slack.com/api/auth.test" \
    -H "Authorization: Bearer $NEW_TOKEN")

if echo "$TEST_RESPONSE" | jq -e '.ok' > /dev/null; then
    echo "✅ Token is valid!"
    
    TEAM_NAME=$(echo "$TEST_RESPONSE" | jq -r '.team')
    USER_NAME=$(echo "$TEST_RESPONSE" | jq -r '.user')
    BOT_ID=$(echo "$TEST_RESPONSE" | jq -r '.bot_id // .user_id')
    
    echo "  Team: $TEAM_NAME"
    echo "  Bot: $USER_NAME"
    echo ""
    
    # Update AWS Secrets
    echo "📝 Updating AWS Secrets Manager..."
    
    SIGNING_SECRET=$(echo $CURRENT_CREDS | jq -r '.signing_secret')
    CLIENT_SECRET=$(echo $CURRENT_CREDS | jq -r '.client_secret')
    
    NEW_SECRET=$(jq -n \
        --arg ci "$CLIENT_ID" \
        --arg cs "$CLIENT_SECRET" \
        --arg ss "$SIGNING_SECRET" \
        --arg bt "$NEW_TOKEN" \
        --arg bi "$BOT_ID" \
        '{
            client_id: $ci,
            client_secret: $cs,
            signing_secret: $ss,
            bot_token: $bt,
            bot_id: $bi
        }')
    
    aws secretsmanager update-secret \
        --secret-id candlefish/slack/oauth \
        --secret-string "$NEW_SECRET"
    
    echo "✅ AWS Secrets updated!"
    echo ""
    
    # Create send-slack-dm script
    cat > ~/.claude/send-slack-dm.py << 'EOF'
#!/usr/bin/env python3

import sys
import json
import requests
import os

def send_slack_dm(username, message):
    # Get token from AWS or environment
    import subprocess
    result = subprocess.run(
        ["aws", "secretsmanager", "get-secret-value", "--secret-id", "candlefish/slack/oauth", "--query", "SecretString", "--output", "text"],
        capture_output=True, text=True
    )
    
    if result.returncode != 0:
        print(f"❌ Failed to get Slack token from AWS: {result.stderr}")
        return False
    
    secret = json.loads(result.stdout)
    token = secret.get('bot_token')
    
    if not token:
        print("❌ No bot_token found in AWS secrets")
        return False
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Find user
    users_resp = requests.get("https://slack.com/api/users.list", headers=headers)
    if not users_resp.json().get('ok'):
        print(f"❌ Failed to get users: {users_resp.json().get('error')}")
        return False
    
    user_id = None
    for user in users_resp.json().get('members', []):
        if username.lower() in user.get('name', '').lower() or username.lower() in user.get('real_name', '').lower():
            user_id = user.get('id')
            print(f"Found user: {user.get('real_name')} ({user.get('id')})")
            break
    
    if not user_id:
        print(f"❌ User not found: {username}")
        return False
    
    # Open DM channel
    dm_resp = requests.post(
        "https://slack.com/api/conversations.open",
        headers=headers,
        json={"users": user_id}
    )
    
    if not dm_resp.json().get('ok'):
        print(f"❌ Failed to open DM: {dm_resp.json().get('error')}")
        return False
    
    channel_id = dm_resp.json().get('channel', {}).get('id')
    
    # Send message
    msg_resp = requests.post(
        "https://slack.com/api/chat.postMessage",
        headers=headers,
        json={"channel": channel_id, "text": message}
    )
    
    if msg_resp.json().get('ok'):
        print(f"✅ Message sent to {username}!")
        return True
    else:
        print(f"❌ Failed to send message: {msg_resp.json().get('error')}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: send-slack-dm.py <username> <message>")
        sys.exit(1)
    
    username = sys.argv[1]
    message = " ".join(sys.argv[2:])
    
    if send_slack_dm(username, message):
        sys.exit(0)
    else:
        sys.exit(1)
EOF
    
    chmod +x ~/.claude/send-slack-dm.py
    
    echo "✅ Slack DM script created at ~/.claude/send-slack-dm.py"
    echo ""
    echo "Testing DM capability..."
    
    # Test sending a DM
    python3 ~/.claude/send-slack-dm.py tyler "🎉 Slack integration fixed! Your @agent setup instructions are coming next."
    
else
    echo "❌ Token test failed:"
    echo "$TEST_RESPONSE" | jq '.'
    exit 1
fi

echo ""
echo "🎉 Slack bot permissions fixed!"
echo ""
echo "Usage:"
echo "  python3 ~/.claude/send-slack-dm.py <username> <message>"
echo ""
echo "Example:"
echo "  python3 ~/.claude/send-slack-dm.py tyler 'Your agents are ready!'"