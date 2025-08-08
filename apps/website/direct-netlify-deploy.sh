#!/bin/bash

# Direct deployment to Netlify using API
SITE_ID="9650bb87-e619-4fdf-9b9b-7ff2eae31ba6"
DIR="./dist"

echo "Deploying directly to claude.candlefish.ai..."

# Create deployment zip
cd dist
zip -r ../deploy.zip .
cd ..

# Get auth token
AUTH_TOKEN=$(netlify api getAccessToken --data {} 2>/dev/null | jq -r '.access_token' || echo $NETLIFY_AUTH_TOKEN)

if [ -z "$AUTH_TOKEN" ]; then
    echo "Getting auth token from netlify CLI..."
    AUTH_TOKEN=$(cat ~/.config/netlify/config.json | jq -r '.userId' 2>/dev/null)
fi

# Create deploy using API
echo "Creating deployment..."
DEPLOY_ID=$(curl -s -X POST \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/zip" \
    --data-binary "@deploy.zip" \
    "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys" | jq -r '.id')

if [ ! -z "$DEPLOY_ID" ] && [ "$DEPLOY_ID" != "null" ]; then
    echo "Deployment created with ID: $DEPLOY_ID"
    echo "Deployment URL: https://claude.candlefish.ai"
    echo "Admin URL: https://app.netlify.com/sites/claude-resources-candlefish/deploys/$DEPLOY_ID"
else
    echo "Failed to create deployment. Using fallback method..."
    # Fallback: Use netlify CLI with absolute path
    netlify api createSiteDeploy --data "{\"site_id\":\"$SITE_ID\"}"
fi

rm deploy.zip
