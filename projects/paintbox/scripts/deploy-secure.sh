#!/bin/bash
# Secure Deployment Script for Paintbox Production
# This script handles the complete secure deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="paintbox-app"
AWS_REGION=${AWS_REGION:-"us-west-2"}
ENVIRONMENT=${1:-"production"}

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Paintbox Secure Deployment Script              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed${NC}"
        exit 1
    fi
}

# Function to check AWS credentials
check_aws_credentials() {
    echo -e "${YELLOW}Checking AWS credentials...${NC}"
    if aws sts get-caller-identity &> /dev/null; then
        echo -e "${GREEN}✅ AWS credentials valid${NC}"
        AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
        echo -e "${GREEN}   Account: ${AWS_ACCOUNT}${NC}"
    else
        echo -e "${RED}❌ AWS credentials not configured${NC}"
        echo "Please run: aws configure"
        exit 1
    fi
}

# Function to check Fly.io authentication
check_fly_auth() {
    echo -e "${YELLOW}Checking Fly.io authentication...${NC}"
    if fly auth whoami &> /dev/null; then
        FLY_USER=$(fly auth whoami)
        echo -e "${GREEN}✅ Fly.io authenticated as: ${FLY_USER}${NC}"
    else
        echo -e "${RED}❌ Not authenticated with Fly.io${NC}"
        echo "Please run: fly auth login"
        exit 1
    fi
}

# Pre-deployment checks
echo -e "${BLUE}═══ Pre-Deployment Checks ═══${NC}"
echo ""

# Check required tools
echo -e "${YELLOW}Checking required tools...${NC}"
check_command "aws"
check_command "fly"
check_command "docker"
check_command "jq"
check_command "git"
echo -e "${GREEN}✅ All required tools installed${NC}"
echo ""

# Check authentication
check_aws_credentials
echo ""
check_fly_auth
echo ""

# Check git status
echo -e "${YELLOW}Checking git status...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Working directory clean${NC}"
fi
echo ""

# Run tests
echo -e "${BLUE}═══ Running Tests ═══${NC}"
echo ""
echo -e "${YELLOW}Running test suite...${NC}"
if npm test -- --passWithNoTests; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed${NC}"
    read -p "Deploy anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi
echo ""

# Setup secrets if needed
echo -e "${BLUE}═══ Secrets Management ═══${NC}"
echo ""
echo -e "${YELLOW}Checking AWS Secrets Manager...${NC}"

# Check if secrets exist
if aws secretsmanager describe-secret --secret-id "paintbox/production/database" --region ${AWS_REGION} &> /dev/null; then
    echo -e "${GREEN}✅ Secrets already configured in AWS${NC}"
else
    echo -e "${YELLOW}⚠️  Secrets not found in AWS Secrets Manager${NC}"
    read -p "Setup secrets now? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo -e "${YELLOW}Setting up secrets...${NC}"
        ./scripts/setup-secrets.sh
    fi
fi

# Sync AWS credentials to Fly.io
echo ""
echo -e "${YELLOW}Checking Fly.io AWS credentials...${NC}"
if fly secrets list | grep -q AWS_ACCESS_KEY_ID; then
    echo -e "${GREEN}✅ AWS credentials already in Fly.io${NC}"
else
    echo -e "${YELLOW}⚠️  AWS credentials not found in Fly.io${NC}"
    read -p "Setup AWS credentials in Fly.io? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo -e "${YELLOW}Please enter AWS credentials for Fly.io:${NC}"
        read -p "AWS Access Key ID: " AWS_KEY
        read -sp "AWS Secret Access Key: " AWS_SECRET
        echo
        fly secrets set \
            AWS_ACCESS_KEY_ID="${AWS_KEY}" \
            AWS_SECRET_ACCESS_KEY="${AWS_SECRET}" \
            AWS_REGION="${AWS_REGION}" \
            AWS_SECRETS_PREFIX="paintbox/production"
        echo -e "${GREEN}✅ AWS credentials configured in Fly.io${NC}"
    fi
fi
echo ""

# Build and deploy
echo -e "${BLUE}═══ Building & Deploying ═══${NC}"
echo ""

# Create deployment tag
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
GIT_SHA=$(git rev-parse --short HEAD)
DEPLOY_TAG="deploy-${TIMESTAMP}-${GIT_SHA}"

echo -e "${YELLOW}Creating deployment tag: ${DEPLOY_TAG}${NC}"
git tag -a ${DEPLOY_TAG} -m "Deployment ${TIMESTAMP}"

# Build Docker image
echo ""
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -f Dockerfile.fly.optimized -t ${APP_NAME}:${DEPLOY_TAG} .
echo -e "${GREEN}✅ Docker image built${NC}"

# Deploy to Fly.io
echo ""
echo -e "${YELLOW}Deploying to Fly.io (${ENVIRONMENT})...${NC}"
if [ "$ENVIRONMENT" = "staging" ]; then
    fly deploy -c fly.staging.toml --app ${APP_NAME}-staging --strategy bluegreen
else
    fly deploy -c fly.toml.secure --app ${APP_NAME} --strategy bluegreen
fi

# Verify deployment
echo ""
echo -e "${BLUE}═══ Post-Deployment Verification ═══${NC}"
echo ""

# Wait for health check
echo -e "${YELLOW}Waiting for application to be healthy...${NC}"
sleep 10

# Check health endpoint
APP_URL="https://${APP_NAME}.fly.dev"
if [ "$ENVIRONMENT" = "staging" ]; then
    APP_URL="https://${APP_NAME}-staging.fly.dev"
fi

echo -e "${YELLOW}Checking health endpoint...${NC}"
if curl -f "${APP_URL}/api/health" &> /dev/null; then
    echo -e "${GREEN}✅ Application is healthy${NC}"
    HEALTH_RESPONSE=$(curl -s "${APP_URL}/api/health")
    echo -e "${GREEN}   Response: ${HEALTH_RESPONSE}${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo -e "${YELLOW}Rolling back deployment...${NC}"
    fly deploy --image ${APP_NAME}:previous --strategy immediate
    exit 1
fi

# Check application status
echo ""
echo -e "${YELLOW}Application status:${NC}"
fly status --app ${APP_NAME}

# Check recent logs for errors
echo ""
echo -e "${YELLOW}Checking recent logs for errors...${NC}"
ERROR_COUNT=$(fly logs --app ${APP_NAME} -n 100 | grep -c ERROR || true)
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found ${ERROR_COUNT} errors in recent logs${NC}"
    echo "View logs with: fly logs --app ${APP_NAME}"
else
    echo -e "${GREEN}✅ No errors in recent logs${NC}"
fi

# Performance check
echo ""
echo -e "${YELLOW}Running performance check...${NC}"
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "${APP_URL}")
echo -e "${GREEN}✅ Homepage response time: ${RESPONSE_TIME}s${NC}"

# Summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                 Deployment Complete! 🎉                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Application URL: ${APP_URL}${NC}"
echo -e "${GREEN}✅ Health Check: ${APP_URL}/api/health${NC}"
echo -e "${GREEN}✅ Metrics: ${APP_URL}/metrics${NC}"
echo -e "${GREEN}✅ Deployment Tag: ${DEPLOY_TAG}${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  View logs:        fly logs --app ${APP_NAME}"
echo "  SSH to instance:  fly ssh console --app ${APP_NAME}"
echo "  Check status:     fly status --app ${APP_NAME}"
echo "  Scale app:        fly scale count 3 --app ${APP_NAME}"
echo "  Rollback:         fly deploy --image ${APP_NAME}:previous"
echo ""

# Push deployment tag to git
echo -e "${YELLOW}Pushing deployment tag to git...${NC}"
git push origin ${DEPLOY_TAG}
echo -e "${GREEN}✅ Deployment tag pushed${NC}"

# Monitoring reminder
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Monitor the application for the next 15 minutes${NC}"
echo -e "${YELLOW}   Watch for any errors or performance issues${NC}"
echo -e "${YELLOW}   Dashboard: https://fly.io/apps/${APP_NAME}/monitoring${NC}"

exit 0
