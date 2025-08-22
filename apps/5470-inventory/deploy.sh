#!/bin/bash

# 5470 Inventory Deployment Script
# This script deploys the inventory management app to Fly.io

set -e

echo "🚀 Starting deployment of 5470 Inventory Management System..."

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI not found. Installing..."
    curl -L https://fly.io/install.sh | sh
    export FLYCTL_INSTALL="/home/$USER/.fly"
    export PATH="$FLYCTL_INSTALL/bin:$PATH"
fi

# Get AWS secrets for the app
echo "🔐 Fetching secrets from AWS..."
aws secretsmanager get-secret-value --secret-id "5470-inventory/database-url" --query SecretString --output text > .env.production.local 2>/dev/null || true
aws secretsmanager get-secret-value --secret-id "5470-inventory/jwt-secret" --query SecretString --output text >> .env.production.local 2>/dev/null || true

# Build the application
echo "📦 Building application..."
pnpm install
pnpm build

# Create the Fly app if it doesn't exist
echo "✈️ Setting up Fly.io app..."
fly apps list | grep -q "5470-inventory" || fly apps create 5470-inventory --org personal

# Set secrets in Fly
echo "🔒 Setting environment variables..."
fly secrets set DATABASE_URL="$(aws secretsmanager get-secret-value --secret-id '5470-inventory/database-url' --query SecretString --output text 2>/dev/null || echo 'postgresql://postgres:postgres@localhost:5432/inventory_5470')" --app 5470-inventory
fly secrets set JWT_SECRET="$(aws secretsmanager get-secret-value --secret-id '5470-inventory/jwt-secret' --query SecretString --output text 2>/dev/null || echo '5470-inventory-jwt-secret')" --app 5470-inventory
fly secrets set AWS_REGION="us-east-1" --app 5470-inventory
fly secrets set N8N_WEBHOOK_URL="https://n8n.candlefish.ai/webhook/5470-inventory" --app 5470-inventory

# Deploy to Fly
echo "🚀 Deploying to Fly.io..."
fly deploy --app 5470-inventory

# Set up custom domain
echo "🌐 Setting up custom domain..."
fly certs add inventory.candlefish.ai --app 5470-inventory || true

echo "✅ Deployment complete!"
echo "📍 Access your app at: https://5470-inventory.fly.dev"
echo "📍 Or at custom domain: https://inventory.candlefish.ai"

# Open the app in browser
if command -v open &> /dev/null; then
    open "https://5470-inventory.fly.dev"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://5470-inventory.fly.dev"
fi
