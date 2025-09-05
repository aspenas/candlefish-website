#!/usr/bin/env bash

# Quick Security Check for Mobile Apps
# Simple test to verify secret detection

set -euo pipefail

APP_PATH="/Users/patricksmith/candlefish-ai/apps/mobile-security-dashboard"

echo "🔍 Checking for hardcoded secrets in mobile-security-dashboard..."

# Check .env.production file specifically
if [[ -f "$APP_PATH/.env.production" ]]; then
    echo ""
    echo "Found .env.production file. Checking for secrets..."
    
    # Look for Firebase API key pattern
    if grep -q "FIREBASE_API_KEY=.*AIzaSy" "$APP_PATH/.env.production"; then
        echo "❌ Found hardcoded Firebase API key!"
    fi
    
    # Look for FCM server key
    if grep -q "FCM_SERVER_KEY=.*AAAA" "$APP_PATH/.env.production"; then
        echo "❌ Found hardcoded FCM server key!"
    fi
    
    # Look for Sentry DSN
    if grep -q "SENTRY_DSN=.*https://.*@sentry" "$APP_PATH/.env.production"; then
        echo "❌ Found hardcoded Sentry DSN!"
    fi
    
    # Look for Mixpanel token
    if grep -q "MIXPANEL_TOKEN=.*[a-zA-Z0-9]" "$APP_PATH/.env.production"; then
        echo "❌ Found hardcoded Mixpanel token!"
    fi
fi

# Check if secure version exists
if [[ -f "$APP_PATH/.env.production.secure" ]]; then
    echo "✅ Secure environment template found"
else
    echo "⚠️  No secure environment template found"
fi

# Check for mobile secrets manager
if [[ -f "$APP_PATH/src/services/mobile-secrets-manager.ts" ]]; then
    echo "✅ Mobile secrets manager service found"
else
    echo "⚠️  Mobile secrets manager service missing"
fi

# Check for enhanced secure storage
if [[ -f "$APP_PATH/src/utils/secure-storage-enhanced.ts" ]]; then
    echo "✅ Enhanced secure storage found"
else
    echo "⚠️  Enhanced secure storage missing"
fi

echo ""
echo "🎯 Security check complete!"