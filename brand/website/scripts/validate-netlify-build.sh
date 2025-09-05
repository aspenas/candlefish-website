#!/bin/bash

# Netlify Build Validation Script
# This script simulates the CI environment to help debug build issues

set -e

echo "🔧 Netlify Build Validation"
echo "=========================="

# Check Node.js version
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from brand/website directory."
    exit 1
fi

echo ""
echo "📦 Installing dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci --legacy-peer-deps
else
    npm install --legacy-peer-deps
fi

echo ""
echo "🔍 Verifying Next.js installation..."
npx next --version

echo ""
echo "📁 Setting up CI environment..."
export NODE_ENV=production
export SKIP_MOCK_REFRESH=true
export STATIC_EXPORT=true
export CI=true

# Create mock data directory and files
mkdir -p mock
echo '{"projects":[]}' > mock/workshop.json
echo '{"capacity":0.85,"activity":[]}' > mock/systemActivity.json  
echo '{"franchises":[],"links":[],"status":"ACTIVE"}' > mock/franchises.json

echo ""
echo "🏗️ Building static export..."
chmod +x scripts/static-export.sh

# Try the export
if npm run export; then
    echo "✅ Static export successful"
else
    echo "⚠️  Static export failed, trying direct build..."
    rm -rf .next out
    npx next build
fi

echo ""
echo "📊 Checking build output..."
if [ -d "out" ]; then
    echo "✅ Static export found in 'out' directory"
    echo "Files: $(find out -type f | wc -l)"
    ls -la out/ | head -10
elif [ -d ".next" ]; then
    echo "✅ Next.js build found in '.next' directory"
    ls -la .next/ | head -10
else
    echo "❌ No build output found"
    exit 1
fi

echo ""
echo "✨ Build validation completed successfully!"
echo "🚀 Ready for Netlify deployment!"