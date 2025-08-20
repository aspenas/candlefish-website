#!/bin/bash

# Deployment Script for Paintbox with AWS Secrets Manager Integration
# This script ensures proper AWS configuration before deploying to Fly.io

set -e

echo "============================================================"
echo "Paintbox Deployment with AWS Secrets Manager Integration"
echo "============================================================"
echo ""

# Configuration
APP_NAME="paintbox"
AWS_REGION="${AWS_REGION:-us-east-1}"
FLY_REGION="${FLY_REGION:-sjc}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v flyctl &> /dev/null; then
    echo -e "${RED}Error: flyctl is not installed${NC}"
    echo "Install it from: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites installed${NC}"
echo ""

# Check Fly.io authentication
echo "Checking Fly.io authentication..."
if ! flyctl auth whoami > /dev/null 2>&1; then
    echo -e "${YELLOW}Not logged in to Fly.io. Logging in...${NC}"
    flyctl auth login
fi
echo -e "${GREEN}✓ Authenticated with Fly.io${NC}"
echo ""

# Check AWS credentials
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✓ Connected to AWS Account: $ACCOUNT_ID${NC}"
echo ""

# Test AWS Secrets Manager access
echo "Testing AWS Secrets Manager access..."
if aws secretsmanager get-secret-value --secret-id "paintbox/production/jwt/public-keys" --region "$AWS_REGION" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Can access JWT public keys in Secrets Manager${NC}"
else
    echo -e "${RED}✗ Cannot access JWT public keys in Secrets Manager${NC}"
    echo -e "${YELLOW}Run ./scripts/fix-aws-iam-permissions.sh to fix IAM permissions${NC}"
    exit 1
fi
echo ""

# Check if app exists
echo "Checking Fly.io app status..."
if flyctl status -a "$APP_NAME" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ App '$APP_NAME' exists${NC}"
    
    # Get current app info
    echo ""
    echo "Current app status:"
    flyctl status -a "$APP_NAME" --json | jq -r '.Status'
else
    echo -e "${YELLOW}App '$APP_NAME' does not exist. Creating...${NC}"
    flyctl apps create "$APP_NAME" --org personal
    echo -e "${GREEN}✓ App created${NC}"
fi
echo ""

# Update Fly.io secrets
echo "Updating Fly.io secrets..."
echo -e "${BLUE}Getting AWS credentials for Fly.io deployment...${NC}"

# Check if we need to update AWS credentials
echo "Current Fly.io secrets:"
flyctl secrets list -a "$APP_NAME" | grep AWS || true
echo ""

echo -e "${YELLOW}Do you want to update AWS credentials in Fly.io? (y/n)${NC}"
read -r UPDATE_CREDS

if [[ "$UPDATE_CREDS" == "y" || "$UPDATE_CREDS" == "Y" ]]; then
    echo "Enter AWS Access Key ID for Fly.io:"
    read -r AWS_ACCESS_KEY_ID
    
    echo "Enter AWS Secret Access Key for Fly.io:"
    read -rs AWS_SECRET_ACCESS_KEY
    echo ""
    
    echo "Setting AWS credentials in Fly.io..."
    flyctl secrets set -a "$APP_NAME" \
        AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
        AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
        AWS_REGION="$AWS_REGION" \
        AUTO_INIT_SECRETS="true"
    
    echo -e "${GREEN}✓ AWS credentials updated${NC}"
else
    echo "Keeping existing AWS credentials"
    
    # Ensure AUTO_INIT_SECRETS is set
    flyctl secrets set -a "$APP_NAME" AUTO_INIT_SECRETS="true" > /dev/null 2>&1 || true
fi
echo ""

# Set other required environment variables
echo "Setting additional environment variables..."
flyctl secrets set -a "$APP_NAME" \
    NODE_ENV="production" \
    NEXTAUTH_URL="https://$APP_NAME.fly.dev" \
    NEXTAUTH_URL_INTERNAL="http://localhost:8080" > /dev/null 2>&1 || true

echo -e "${GREEN}✓ Environment variables configured${NC}"
echo ""

# Build the application
echo "Building application..."
echo -e "${BLUE}Running production build...${NC}"

# Install dependencies
npm install

# Build Next.js app
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo ""

# Update fly.toml to use the correct configuration
echo "Updating fly.toml configuration..."
cat > fly.toml <<EOF
app = "$APP_NAME"
primary_region = "$FLY_REGION"

[build]
  dockerfile = "Dockerfile.fly"

[env]
  NODE_ENV = "production"
  PORT = "8080"
  AUTO_INIT_SECRETS = "true"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[http_service.checks]]
  grace_period = "30s"
  interval = "30s"
  method = "GET"
  timeout = "10s"
  path = "/api/health"

[[http_service.checks]]
  grace_period = "30s"
  interval = "60s"
  method = "GET"
  timeout = "10s"
  path = "/.well-known/jwks.json"

[[vm]]
  size = "shared-cpu-1x"
  memory = "1gb"
EOF

echo -e "${GREEN}✓ fly.toml updated${NC}"
echo ""

# Create optimized Dockerfile if it doesn't exist
if [ ! -f "Dockerfile.fly" ]; then
    echo "Creating optimized Dockerfile..."
    cat > Dockerfile.fly <<'EOF'
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* ./
RUN npm ci --only=production && \
    npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy AWS Secrets initialization script
COPY --from=builder /app/lib/startup/initialize-aws-secrets.ts ./lib/startup/

USER nextjs

EXPOSE 8080

# Start the application with AWS secrets initialization
CMD ["node", "server.js"]
EOF
    echo -e "${GREEN}✓ Dockerfile.fly created${NC}"
fi
echo ""

# Deploy to Fly.io
echo "Deploying to Fly.io..."
echo -e "${BLUE}Starting deployment...${NC}"

flyctl deploy -a "$APP_NAME" --strategy rolling

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment successful!${NC}"
else
    echo -e "${RED}✗ Deployment failed${NC}"
    echo "Check logs with: flyctl logs -a $APP_NAME"
    exit 1
fi
echo ""

# Verify deployment
echo "Verifying deployment..."
echo ""

# Check app status
echo "App status:"
flyctl status -a "$APP_NAME"
echo ""

# Test JWKS endpoint
echo "Testing JWKS endpoint..."
JWKS_URL="https://$APP_NAME.fly.dev/.well-known/jwks.json"
echo "URL: $JWKS_URL"

RESPONSE=$(curl -s -w "\n%{http_code}" "$JWKS_URL")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ JWKS endpoint is working (HTTP 200)${NC}"
    
    # Check if keys are present
    KEY_COUNT=$(echo "$BODY" | jq '.keys | length')
    if [ "$KEY_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ JWKS contains $KEY_COUNT key(s)${NC}"
        echo ""
        echo "JWKS Response:"
        echo "$BODY" | jq '.'
    else
        echo -e "${RED}✗ JWKS returns empty keys array${NC}"
        echo "Response: $BODY"
    fi
else
    echo -e "${RED}✗ JWKS endpoint returned HTTP $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_URL="https://$APP_NAME.fly.dev/api/health"
HEALTH_RESPONSE=$(curl -s "$HEALTH_URL")
echo "Health check response:"
echo "$HEALTH_RESPONSE" | jq '.' || echo "$HEALTH_RESPONSE"
echo ""

# Show logs
echo "Recent logs:"
flyctl logs -a "$APP_NAME" --limit 20
echo ""

echo "============================================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "============================================================"
echo ""
echo "Application URL: https://$APP_NAME.fly.dev"
echo "JWKS Endpoint: https://$APP_NAME.fly.dev/.well-known/jwks.json"
echo ""
echo "Useful commands:"
echo "  View logs:       flyctl logs -a $APP_NAME"
echo "  SSH to app:      flyctl ssh console -a $APP_NAME"
echo "  Check status:    flyctl status -a $APP_NAME"
echo "  Open in browser: flyctl open -a $APP_NAME"
echo ""

# Cleanup sensitive files
if [ -f "/tmp/paintbox-fly-credentials.txt" ]; then
    echo -e "${YELLOW}Note: Remember to delete /tmp/paintbox-fly-credentials.txt${NC}"
fi