#!/bin/bash

SITE_ID="9650bb87-e619-4fdf-9b9b-7ff2eae31ba6"

# Create a zip of the dist directory
echo "Creating deployment package..."
cd dist
zip -qr ../site-deploy.zip .
cd ..

# Get the token from environment or config
AUTH_TOKEN="${NETLIFY_AUTH_TOKEN}"
if [ -z "$AUTH_TOKEN" ]; then
    # Try to get from netlify CLI
    AUTH_TOKEN=$(netlify api getAccessToken --data {} 2>/dev/null | jq -r '.access_token' 2>/dev/null || echo "")
fi

if [ -z "$AUTH_TOKEN" ]; then
    echo "Please set NETLIFY_AUTH_TOKEN environment variable"
    echo "You can get a token from: https://app.netlify.com/user/applications/personal"
    exit 1
fi

echo "Deploying to Netlify..."
RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/zip" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    --data-binary "@site-deploy.zip" \
    "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys")

DEPLOY_ID=$(echo $RESPONSE | jq -r '.id' 2>/dev/null)
ERROR=$(echo $RESPONSE | jq -r '.error' 2>/dev/null)

if [ "$ERROR" != "null" ] && [ ! -z "$ERROR" ]; then
    echo "Error: $ERROR"
    echo "Full response: $RESPONSE"
    exit 1
fi

if [ "$DEPLOY_ID" != "null" ] && [ ! -z "$DEPLOY_ID" ]; then
    echo "✅ Deployment successful!"
    echo "Deploy ID: $DEPLOY_ID"
    echo "Site URL: https://claude.candlefish.ai"
    echo "Deploy URL: https://app.netlify.com/sites/claude-resources-candlefish/deploys/$DEPLOY_ID"
else
    echo "Deployment may have failed. Response:"
    echo $RESPONSE
fi

# Clean up
rm -f site-deploy.zip
