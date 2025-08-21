#!/bin/bash

# Immediate OAuth Fix Script
# This uses the Google OAuth2 credentials to fix the redirect URI issue

set -e

echo "🚀 Immediate OAuth Fix for Paintbox"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Ensure correct credentials are set in Fly.io
echo -e "${YELLOW}Step 1: Verifying OAuth Credentials${NC}"
echo "--------------------------------------"

CLIENT_ID="[REDACTED_GOOGLE_CLIENT_ID]"
CLIENT_SECRET="[REDACTED_GOOGLE_CLIENT_SECRET]"

# Check current settings
CURRENT_CLIENT_ID=$(fly secrets list --app paintbox | grep GOOGLE_CLIENT_ID | head -1 || echo "")

if [[ "$CURRENT_CLIENT_ID" == *"$CLIENT_ID"* ]]; then
    echo -e "${GREEN}✓ OAuth credentials already correct${NC}"
else
    echo "Updating OAuth credentials..."
    fly secrets set \
        GOOGLE_CLIENT_ID="$CLIENT_ID" \
        GOOGLE_CLIENT_SECRET="$CLIENT_SECRET" \
        --app paintbox

    echo -e "${GREEN}✓ OAuth credentials updated${NC}"
    echo "Waiting for app to restart..."
    sleep 10
fi

# Step 2: Verify the callback URL
echo ""
echo -e "${YELLOW}Step 2: Verifying Callback URL${NC}"
echo "--------------------------------"

CALLBACK_URL=$(curl -s https://paintbox.fly.dev/api/auth/providers | python3 -c "import sys, json; print(json.load(sys.stdin)['google']['callbackUrl'])" 2>/dev/null || echo "ERROR")

if [[ "$CALLBACK_URL" == "https://paintbox.fly.dev/api/auth/callback/google" ]]; then
    echo -e "${GREEN}✓ Callback URL correct: $CALLBACK_URL${NC}"
else
    echo -e "${RED}✗ Callback URL incorrect: $CALLBACK_URL${NC}"
    exit 1
fi

# Step 3: Create OAuth configuration file for Google Cloud Console
echo ""
echo -e "${YELLOW}Step 3: Creating OAuth Configuration${NC}"
echo "------------------------------------"

cat > /tmp/paintbox_oauth_config.json <<EOF
{
  "web": {
    "client_id": "$CLIENT_ID",
    "project_id": "l0-candlefish",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "$CLIENT_SECRET",
    "redirect_uris": [
      "https://paintbox.fly.dev/api/auth/callback/google",
      "https://paintbox.candlefish.ai/api/auth/callback/google",
      "http://localhost:3000/api/auth/callback/google"
    ],
    "javascript_origins": [
      "https://paintbox.fly.dev",
      "https://paintbox.candlefish.ai",
      "http://localhost:3000"
    ]
  }
}
EOF

echo -e "${GREEN}✓ Configuration file created at /tmp/paintbox_oauth_config.json${NC}"

# Step 4: Instructions for Google Cloud Console
echo ""
echo -e "${YELLOW}Step 4: MANUAL ACTION REQUIRED${NC}"
echo "==============================="
echo ""
echo -e "${RED}IMPORTANT: You must update Google Cloud Console manually:${NC}"
echo ""
echo "1. Open: https://console.cloud.google.com/apis/credentials?project=l0-candlefish"
echo ""
echo "2. Find OAuth 2.0 Client ID:"
echo "   $CLIENT_ID"
echo ""
echo "3. Click on it to edit"
echo ""
echo "4. In 'Authorized redirect URIs', add EXACTLY these URIs:"
echo "   • https://paintbox.fly.dev/api/auth/callback/google"
echo "   • https://paintbox.candlefish.ai/api/auth/callback/google"
echo "   • http://localhost:3000/api/auth/callback/google"
echo ""
echo "5. In 'Authorized JavaScript origins', add:"
echo "   • https://paintbox.fly.dev"
echo "   • https://paintbox.candlefish.ai"
echo "   • http://localhost:3000"
echo ""
echo "6. Click 'SAVE'"
echo ""
echo "7. Wait 2-3 minutes for changes to propagate"
echo ""

# Step 5: Test URL
echo -e "${YELLOW}Step 5: Test After Google Console Update${NC}"
echo "----------------------------------------"
echo ""
echo "After updating Google Cloud Console, test at:"
echo -e "${GREEN}https://paintbox.fly.dev/login${NC}"
echo ""
echo "Click 'Sign in with Google' and it should work!"
echo ""

# Optional: Try to open Google Cloud Console
echo -e "${YELLOW}Opening Google Cloud Console...${NC}"
open "https://console.cloud.google.com/apis/credentials/oauthclient/[REDACTED_CLIENT_ID]?project=l0-candlefish" 2>/dev/null || echo "Please open the URL manually"

echo ""
echo -e "${GREEN}===================================="
echo "Application Ready - Update Google Console!"
echo "====================================${NC}"
