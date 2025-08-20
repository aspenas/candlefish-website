#!/bin/bash

echo "🔧 Google OAuth Redirect URI Fix Script"
echo "======================================="
echo

# Set variables
GOOGLE_CLIENT_ID="***REMOVED***"
CORRECT_REDIRECT_URI="https://paintbox.fly.dev/api/auth/callback/google"
APP_NAME="paintbox"

echo "Configuration:"
echo "- App: $APP_NAME"
echo "- Google Client ID: $GOOGLE_CLIENT_ID"
echo "- Correct Redirect URI: $CORRECT_REDIRECT_URI"
echo

# Step 1: Verify current Fly.io secrets
echo "1. Checking current Fly.io secrets..."
flyctl secrets list -a $APP_NAME | grep -E "(GOOGLE|NEXTAUTH)"
echo

# Step 2: Ensure NEXTAUTH_URL is correct
echo "2. Setting correct NEXTAUTH_URL..."
flyctl secrets set NEXTAUTH_URL=https://paintbox.fly.dev -a $APP_NAME
echo

# Step 3: Get Google Client Secret from AWS
echo "3. Retrieving Google Client Secret from AWS..."
GOOGLE_CLIENT_SECRET=$(aws secretsmanager get-secret-value --secret-id "candlefish/google-oauth-client-secret" --query SecretString --output text 2>/dev/null || echo "Not found in AWS")

if [[ "$GOOGLE_CLIENT_SECRET" == "Not found in AWS" ]]; then
    echo "   ⚠️  Google Client Secret not found in AWS Secrets Manager"
    echo "   Please manually set it with:"
    echo "   flyctl secrets set GOOGLE_CLIENT_SECRET=your_secret_here -a $APP_NAME"
else
    echo "   ✅ Found Google Client Secret, setting in Fly.io..."
    flyctl secrets set GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" -a $APP_NAME
fi
echo

# Step 4: Verify Google Client ID is set
echo "4. Setting Google Client ID..."
flyctl secrets set GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" -a $APP_NAME
echo

# Step 5: Test the configuration
echo "5. Testing OAuth configuration..."
sleep 10  # Wait for deployment

# Test health endpoint
echo "   Testing app health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://paintbox.fly.dev/api/health || echo "failed")
if [[ "$HEALTH_STATUS" == "200" ]]; then
    echo "   ✅ App health OK"
else
    echo "   ❌ App health failed: $HEALTH_STATUS"
fi

# Test OAuth initiation
echo "   Testing OAuth initiation..."
OAUTH_RESPONSE=$(curl -s -L -o /dev/null -w "%{http_code}|%{redirect_url}" "https://paintbox.fly.dev/api/auth/signin/google" 2>/dev/null || echo "failed|")
OAUTH_STATUS=$(echo "$OAUTH_RESPONSE" | cut -d'|' -f1)
OAUTH_LOCATION=$(echo "$OAUTH_RESPONSE" | cut -d'|' -f2)

if [[ "$OAUTH_STATUS" == "302" ]] && [[ "$OAUTH_LOCATION" == *"accounts.google.com"* ]]; then
    echo "   ✅ OAuth initiation successful"
    echo "   Google OAuth URL: ${OAUTH_LOCATION:0:80}..."
else
    echo "   ❌ OAuth initiation failed: $OAUTH_STATUS"
    if [[ -n "$OAUTH_LOCATION" ]]; then
        echo "   Redirect location: $OAUTH_LOCATION"
    fi
fi
echo

echo "📋 Next Steps:"
echo "=============="
echo "1. Verify in Google Cloud Console that the redirect URI is configured:"
echo "   - Go to: https://console.cloud.google.com/apis/credentials"
echo "   - Find OAuth Client ID: $GOOGLE_CLIENT_ID"
echo "   - Ensure these URIs are in 'Authorized redirect URIs':"
echo "     - $CORRECT_REDIRECT_URI"
echo
echo "2. If still getting redirect_uri_mismatch:"
echo "   - Check for typos in Google Cloud Console"
echo "   - Wait 5-10 minutes for propagation"
echo "   - Verify the exact error message in browser developer tools"
echo
echo "3. Test the fix:"
echo "   - Visit: https://paintbox.fly.dev/login"
echo "   - Click 'Sign in with Google'"
echo "   - Should redirect to Google OAuth page successfully"
echo
echo "✅ Configuration update complete!"