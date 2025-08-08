#!/bin/bash

# Render.com build script
echo "🚀 Building Paintbox for Render deployment"

# Set Node options for build
export NODE_OPTIONS="--max-old-space-size=8192"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build the application
echo "🔨 Building application..."
npm run build

echo "✅ Build complete!"
