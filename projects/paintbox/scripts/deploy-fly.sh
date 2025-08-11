#!/bin/bash

# Fly.io Deployment Script for Paintbox
set -e

echo "🚀 Starting Paintbox deployment to Fly.io..."

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed. Please install it first."
    exit 1
fi

# Application name
APP_NAME="paintbox-app"
ORG_NAME="candlefish-ai"

echo "📦 Building application locally..."
npm run build || exit 1

echo "🔧 Creating deployment package..."
# Create a temporary directory for deployment
DEPLOY_DIR=$(mktemp -d)
echo "Using temp directory: $DEPLOY_DIR"

# Copy essential files only
cp -r .next/standalone/* "$DEPLOY_DIR/"
cp -r .next/static "$DEPLOY_DIR/.next/"
cp -r public "$DEPLOY_DIR/" 2>/dev/null || true
cp -r scripts "$DEPLOY_DIR/" 2>/dev/null || true
cp Dockerfile.fly.simple "$DEPLOY_DIR/Dockerfile.fly.simple"
cp fly.toml "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp package-lock.json "$DEPLOY_DIR/"

# Create a minimal .dockerignore
cat > "$DEPLOY_DIR/.dockerignore" << EOF
node_modules/
.git/
.github/
.env*
*.log
*.md
docs/
__tests__/
coverage/
.vscode/
.idea/
deployment-ready/
EOF

echo "🚀 Deploying to Fly.io..."
cd "$DEPLOY_DIR"
flyctl deploy --app "$APP_NAME" --remote-only --strategy immediate

# Cleanup
cd - > /dev/null
rm -rf "$DEPLOY_DIR"

echo "✅ Deployment complete!"
echo "🌐 Your app is available at: https://${APP_NAME}.fly.dev"
echo ""
echo "📊 View logs: flyctl logs -a ${APP_NAME}"
echo "📈 View status: flyctl status -a ${APP_NAME}"
echo "🔧 SSH into app: flyctl ssh console -a ${APP_NAME}"
