#!/bin/bash

echo "🚀 Deploying Paintbox to Cloudflare Pages"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Installing Cloudflare Wrangler..."
    npm install -g wrangler
fi

# Build the app
echo "Building application..."
NODE_OPTIONS="--max-old-space-size=8192" npm run build

# Deploy to Cloudflare Pages
echo "Deploying to Cloudflare Pages..."
wrangler pages deploy .next --project-name=paintbox --compatibility-date=2024-01-01

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Go to https://dash.cloudflare.com/pages"
echo "2. Find your 'paintbox' project"
echo "3. Configure custom domain: paintbox.candlefish.ai"
echo "4. Add environment variables in the Cloudflare dashboard"
