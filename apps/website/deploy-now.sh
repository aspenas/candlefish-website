#!/bin/bash

echo "🚀 Deploying Candlefish.ai to Netlify"
echo "===================================="

# Clean up any previous attempts
rm -f site.zip deploy_id.txt

# Ensure we're in the right directory
cd /Users/patricksmith/candlefish-ai/apps/website

# Build if dist doesn't exist
if [ ! -d "dist" ]; then
    echo "Building project..."
    npm run build
fi

# Create a deployment using curl
echo "Creating deployment..."

# Use curl to upload directly to Netlify's drag and drop API
cd dist
zip -r ../deploy.zip .
cd ..

# Upload to Netlify's file upload endpoint
RESPONSE=$(curl -H "Content-Type: application/zip" \
  --data-binary "@deploy.zip" \
  https://api.netlify.com/api/v1/sites/ed200909-886f-47ca-950c-58727dca0b9c/deploys)

echo "Deployment response: $RESPONSE"

# Clean up
rm -f deploy.zip

echo "✅ Deployment submitted!"
echo "Check https://candlefish.ai in a moment"
