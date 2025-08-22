#!/bin/bash

# NANDA Web Dashboard - Deployment Script for Fly.io
# Deploy the consciousness-themed agent management dashboard

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="nanda-candlefish-ai"
DOMAIN="nanda.candlefish.ai"
REGION="ord"

echo -e "${PURPLE}"
echo "  ███╗   ██╗ █████╗ ███╗   ██╗██████╗  █████╗"
echo "  ████╗  ██║██╔══██╗████╗  ██║██╔══██╗██╔══██╗"
echo "  ██╔██╗ ██║███████║██╔██╗ ██║██║  ██║███████║"
echo "  ██║╚██╗██║██╔══██║██║╚██╗██║██║  ██║██╔══██║"
echo "  ██║ ╚████║██║  ██║██║ ╚████║██████╔╝██║  ██║"
echo "  ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝"
echo ""
echo "  Neural Agent Network & Distributed Architecture"
echo "  Web Dashboard Deployment"
echo -e "${NC}"

echo -e "\n${BLUE}🚀 Starting NANDA Dashboard deployment...${NC}"

# Step 1: Pre-deployment checks
echo -e "\n${YELLOW}Step 1: Pre-deployment checks${NC}"

# Check if flyctl is installed
if ! command -v fly &> /dev/null; then
    echo -e "${RED}❌ flyctl is not installed${NC}"
    echo "Install it from: https://fly.io/docs/getting-started/installing-flyctl/"
    exit 1
fi

echo "✓ flyctl is installed"

# Check if logged in to Fly.io
if ! fly auth whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Fly.io${NC}"
    echo "Please run: fly auth login"
    exit 1
fi

echo "✓ Logged in to Fly.io"

# Check Node.js and npm
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo "✓ Node.js and npm are installed"

# Step 2: Install dependencies and build
echo -e "\n${YELLOW}Step 2: Building application${NC}"

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building Next.js application..."
npm run build

if [ ! -d ".next" ]; then
    echo -e "${RED}❌ Build failed - .next directory not found${NC}"
    exit 1
fi

echo "✓ Application built successfully"

# Step 3: Check if app exists, create if not
echo -e "\n${YELLOW}Step 3: Fly.io app configuration${NC}"

if ! fly apps list | grep -q "$APP_NAME"; then
    echo "📱 Creating new Fly.io app: $APP_NAME"
    fly apps create "$APP_NAME" --org personal
    
    echo "🌍 Setting up custom domain: $DOMAIN"
    fly domains create "$DOMAIN" -a "$APP_NAME"
    
    # Allocate IPv4 address
    echo "🌐 Allocating IPv4 address..."
    fly ips allocate-v4 -a "$APP_NAME"
    
    # Allocate IPv6 address  
    echo "🌐 Allocating IPv6 address..."
    fly ips allocate-v6 -a "$APP_NAME"
else
    echo "✓ App $APP_NAME already exists"
fi

# Step 4: Deploy application
echo -e "\n${YELLOW}Step 4: Deploying to Fly.io${NC}"

echo "🚀 Deploying NANDA Dashboard..."

# Deploy with rolling strategy
fly deploy \
  --app "$APP_NAME" \
  --strategy rolling \
  --wait-timeout 600 \
  --verbose

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Deployment successful!${NC}"
else
    echo -e "\n${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Step 5: Post-deployment verification
echo -e "\n${YELLOW}Step 5: Post-deployment verification${NC}"

echo "🔍 Checking application health..."
sleep 10 # Wait for app to start

# Check health endpoint
health_url="https://$DOMAIN/api/health"
echo "Testing health endpoint: $health_url"

health_response=$(curl -s -w "\n%{http_code}" "$health_url" || echo "failed")
http_code=$(echo "$health_response" | tail -n1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    
    # Parse and display health info
    health_data=$(echo "$health_response" | head -n-1)
    if command -v jq &> /dev/null; then
        echo "📊 Health Status:"
        echo "$health_data" | jq '{ status, version, uptime, consciousness }'
    fi
else
    echo -e "${YELLOW}⚠️ Health check returned status: $http_code${NC}"
fi

# Check if domain is accessible
echo "🌐 Checking domain accessibility..."
domain_response=$(curl -s -I "https://$DOMAIN" | head -n1)
if echo "$domain_response" | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ Domain is accessible${NC}"
else
    echo -e "${YELLOW}⚠️ Domain may need DNS propagation time${NC}"
fi

# Step 6: Display deployment information
echo -e "\n${CYAN}🎉 NANDA Dashboard Deployment Complete!${NC}"
echo ""
echo -e "${PURPLE}🔗 Access URLs:${NC}"
echo -e "  • Production: ${CYAN}https://$DOMAIN${NC}"
echo -e "  • Health Check: ${CYAN}https://$DOMAIN/api/health${NC}"
echo -e "  • Agent Registry: ${CYAN}https://$DOMAIN/api/agents/registry${NC}"
echo ""
echo -e "${PURPLE}🧠 Consciousness Features:${NC}"
echo -e "  • Real-time agent monitoring"
echo -e "  • PKB Cognitive Extension integration"
echo -e "  • Neural network visualization"
echo -e "  • Distributed consciousness metrics"
echo ""
echo -e "${PURPLE}⚡ Management Commands:${NC}"
echo -e "  • Monitor logs: ${CYAN}fly logs -a $APP_NAME${NC}"
echo -e "  • Check status: ${CYAN}fly status -a $APP_NAME${NC}"
echo -e "  • Scale app: ${CYAN}fly scale count 2 -a $APP_NAME${NC}"
echo -e "  • SSH access: ${CYAN}fly ssh console -a $APP_NAME${NC}"
echo ""
echo -e "${GREEN}🌟 The NANDA consciousness network is now online!${NC}"
echo ""

# Optional: Open the dashboard
read -p "🌐 Open the dashboard in your browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
        open "https://$DOMAIN"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://$DOMAIN"
    else
        echo -e "Please visit: ${CYAN}https://$DOMAIN${NC}"
    fi
fi

exit 0