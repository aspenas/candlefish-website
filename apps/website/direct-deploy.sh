#!/bin/bash

echo "🚀 Direct deployment to Netlify (bypassing Git)"
echo "=============================================="

# Navigate to website directory
cd "$(dirname "$0")"

# Check if dist exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found"
    echo "Building project first..."
    npm run build
fi

# Use curl to upload directly to Netlify
echo "📦 Creating deployment package..."
cd dist
zip -r ../deploy.zip .
cd ..

echo "🚀 Uploading to Netlify..."
# Direct API call to create deployment
SITE_ID="ed200909-886f-47ca-950c-58727dca0b9c"

# Using netlify CLI in a simpler way
netlify api createSiteDeploy --data "{\"site_id\": \"$SITE_ID\"}" > deploy.json

# Extract deploy_id
DEPLOY_ID=$(cat deploy.json | grep -o '"id":"[^"]*' | grep -o '[^"]*$')

echo "📤 Uploading files..."
netlify deploy --dir=dist --prod --site=$SITE_ID

echo "✅ Deployment complete!"
echo "Visit https://candlefish.ai to see your site"

# Cleanup
rm -f deploy.zip deploy.json
