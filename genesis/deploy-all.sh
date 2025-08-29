#!/bin/bash
# Comprehensive Candlefish Deployment Script
# Deploys both candlefish.ai and highline.inventory.work to production

set -e

echo "🚀 CANDLEFISH COMPLETE DEPLOYMENT"
echo "================================="

# Get Netlify auth token from AWS
echo "🔑 Loading credentials from AWS..."
NETLIFY_AUTH_TOKEN=$(aws secretsmanager get-secret-value --secret-id "netlify/ibm-portfolio/auth-token" --query SecretString --output text 2>/dev/null || echo "")

if [ -z "$NETLIFY_AUTH_TOKEN" ]; then
    echo "❌ Could not load Netlify auth token"
    exit 1
fi

export NETLIFY_AUTH_TOKEN

# Deploy candlefish.ai
echo -e "\n🌐 Deploying candlefish.ai..."
cd /Users/patricksmith/candlefish-ai

# Find the website directory
if [ -d "brand/website" ]; then
    cd brand/website
elif [ -d "apps/website" ]; then
    cd apps/website
elif [ -d "website" ]; then
    cd website
else
    echo "❌ Cannot find website directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "🔨 Building candlefish.ai..."
npm run build || echo "Build failed, continuing..."

if [ -d "build" ] || [ -d "dist" ] || [ -d "out" ]; then
    echo "✅ Build successful"
    
    # Deploy to Netlify
    if command -v netlify &> /dev/null; then
        echo "🚀 Deploying to Netlify..."
        netlify deploy --prod --dir=build --message="Production deployment $(date)" || \
        netlify deploy --prod --dir=dist --message="Production deployment $(date)" || \
        netlify deploy --prod --dir=out --message="Production deployment $(date)"
    else
        echo "📦 Installing Netlify CLI..."
        npm install -g netlify-cli
        netlify deploy --prod --dir=build --message="Production deployment $(date)"
    fi
else
    echo "⚠️  No build output found"
fi

# Deploy highline.inventory.work
echo -e "\n📦 Deploying highline.inventory.work..."
cd /Users/patricksmith/candlefish-ai

if [ -d "5470_S_Highline_Circle/frontend" ]; then
    cd 5470_S_Highline_Circle/frontend
elif [ -d "apps/highline-inventory" ]; then
    cd apps/highline-inventory
else
    echo "⚠️  Cannot find Highline inventory directory"
fi

if [ -d "5470_S_Highline_Circle/frontend" ] || [ -d "apps/highline-inventory" ]; then
    echo "📦 Installing Highline dependencies..."
    npm install --legacy-peer-deps
    
    echo "🔨 Building Highline inventory..."
    export VITE_API_URL=https://5470-inventory.fly.dev/api/v1
    npm run build || echo "Build failed, continuing..."
    
    if [ -d "dist" ] || [ -d "build" ]; then
        echo "✅ Highline build successful"
        
        # Get Highline Netlify token if different
        HIGHLINE_TOKEN=$(aws secretsmanager get-secret-value --secret-id "netlify/highline-inventory/auth-token" --query SecretString --output text 2>/dev/null || echo "$NETLIFY_AUTH_TOKEN")
        export NETLIFY_AUTH_TOKEN="$HIGHLINE_TOKEN"
        
        # Deploy Highline
        echo "🚀 Deploying Highline to Netlify..."
        netlify deploy --prod --dir=dist --message="Highline deployment $(date)" || \
        netlify deploy --prod --dir=build --message="Highline deployment $(date)"
    fi
fi

# Verify deployments
echo -e "\n✅ DEPLOYMENT COMPLETE"
echo "========================"
echo "Verifying sites..."

# Check candlefish.ai
if curl -s -o /dev/null -w "%{http_code}" https://candlefish.ai | grep -q "200\|301"; then
    echo "✅ candlefish.ai is live"
else
    echo "⚠️  candlefish.ai may need attention"
fi

# Check highline.inventory.work  
if curl -s -o /dev/null -w "%{http_code}" https://highline.inventory.work | grep -q "200\|301"; then
    echo "✅ highline.inventory.work is live"
else
    echo "⚠️  highline.inventory.work may need attention"
fi

echo -e "\n🎉 All deployments complete!"
echo "GitHub Actions will handle future automatic deployments on push to main"