#!/bin/bash

# JWT Complete Example - Sign and Verify
# This script demonstrates the complete JWT workflow

echo "🔐 JWT Infrastructure Demo"
echo "=========================="
echo ""

# Check for required tools
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "❌ jq is required but not installed"
    exit 1
fi

# Set up paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SIGN_SCRIPT="$SCRIPT_DIR/sign-jwt.js"
VERIFY_SCRIPT="$SCRIPT_DIR/verify-jwt.js"

# Check scripts exist
if [ ! -f "$SIGN_SCRIPT" ]; then
    echo "❌ Missing sign-jwt.js script"
    exit 1
fi

if [ ! -f "$VERIFY_SCRIPT" ]; then
    echo "❌ Missing verify-jwt.js script"
    exit 1
fi

echo "📝 Step 1: Create a payload"
echo "----------------------------"
PAYLOAD=$(cat <<EOF
{
  "sub": "user-$(date +%s)",
  "name": "Demo User",
  "email": "demo@example.com",
  "role": "user",
  "permissions": ["read", "write"],
  "department": "Engineering"
}
EOF
)

echo "Payload:"
echo "$PAYLOAD" | jq '.'
echo ""

echo "✍️  Step 2: Sign the JWT"
echo "------------------------"
echo "Using private key from AWS Secrets Manager..."
echo ""

# Unset AWS_PROFILE to avoid credential conflicts
unset AWS_PROFILE

# Sign the JWT
TOKEN=$(node "$SIGN_SCRIPT" --payload "$PAYLOAD" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ Failed to sign JWT"
    echo "Make sure AWS credentials are configured"
    exit 1
fi

echo "Generated Token:"
echo "$TOKEN"
echo ""

# Decode the token header and payload for display
echo "📄 Token Structure:"
echo "-------------------"
HEADER=$(echo "$TOKEN" | cut -d. -f1 | base64 -d 2>/dev/null || echo "$TOKEN" | cut -d. -f1 | base64 -D)
PAYLOAD_DECODED=$(echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null || echo "$TOKEN" | cut -d. -f2 | base64 -D)

echo "Header:"
echo "$HEADER" | jq '.'
echo ""
echo "Payload:"
echo "$PAYLOAD_DECODED" | jq '.'
echo ""

echo "🔍 Step 3: Verify the JWT"
echo "-------------------------"
echo "Using JWKS endpoint: https://paintbox.fly.dev/.well-known/jwks.json"
echo ""

# Verify the token
VERIFIED=$(echo "$TOKEN" | node "$VERIFY_SCRIPT" 2>&1)
VERIFY_EXIT_CODE=$?

if [ $VERIFY_EXIT_CODE -eq 0 ]; then
    echo "✅ Token verified successfully!"
    echo ""
    echo "Verified Claims:"
    echo "$VERIFIED" | head -n 20 | jq '.'
else
    echo "❌ Token verification failed!"
    echo "$VERIFIED"
    exit 1
fi

echo ""
echo "🎯 Step 4: Test with curl"
echo "-------------------------"
echo "You can use this token in API requests:"
echo ""
echo "curl -H \"Authorization: Bearer $TOKEN\" https://api.example.com/protected"
echo ""

echo "📊 Summary"
echo "----------"
echo "• Token algorithm: RS256"
echo "• Key ID: $(echo "$HEADER" | jq -r '.kid')"
echo "• Issuer: paintbox.fly.dev"
echo "• JWKS URL: https://paintbox.fly.dev/.well-known/jwks.json"
echo "• Token length: ${#TOKEN} characters"
echo ""

echo "🔗 Useful Links"
echo "---------------"
echo "• Verify online: https://jwt.io"
echo "• JWKS endpoint: https://paintbox.fly.dev/.well-known/jwks.json"
echo "• AWS Secrets: https://console.aws.amazon.com/secretsmanager"
echo ""

echo "✅ JWT infrastructure is working correctly!"