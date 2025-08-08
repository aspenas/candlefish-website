#!/bin/bash

echo "🚀 Manual deployment script for Candlefish website"
echo "================================================"

# Ensure we're in the correct directory
cd "$(dirname "$0")"

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy to Netlify
echo "🚀 Deploying to Netlify..."
netlify deploy --prod --dir=dist --site=ed200909-886f-47ca-950c-58727dca0b9c

echo "✅ Deployment complete!"
echo "Visit https://candlefish.ai to see your site"
