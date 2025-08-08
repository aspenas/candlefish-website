#!/bin/bash

# Deploy script for Candlefish website
echo "🚀 Deploying Candlefish website to Netlify..."

# Ensure we're in the website directory
cd "$(dirname "$0")"

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found. Please run 'pnpm build' first."
    exit 1
fi

# Deploy using Netlify CLI with specific site ID
netlify deploy --prod --dir=dist --site=ed200909-886f-47ca-950c-58727dca0b9c

echo "✅ Deployment complete!"
