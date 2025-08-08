#!/bin/bash
# Deploy RTPM applications to Fly.io
# This script fetches the API token from AWS Secrets Manager
#
# Token Management:
# - Token is stored in AWS Secrets Manager: fly-io/api-token
# - For GitHub Actions, the token is also stored as a GitHub secret: FLY_API_TOKEN
# - To update the token: aws secretsmanager update-secret --secret-id "fly-io/api-token" --secret-string "NEW_TOKEN"
# - To set GitHub secret: ./scripts/setup-fly-github-secret.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Fly.io deployment...${NC}"

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo -e "${YELLOW}flyctl not found. Installing...${NC}"
    curl -L https://fly.io/install.sh | sh
    export FLYCTL_INSTALL="/home/$USER/.fly"
    export PATH="$FLYCTL_INSTALL/bin:$PATH"
fi

# Fetch Fly.io API token from AWS Secrets Manager
echo -e "${YELLOW}Fetching Fly.io API token from AWS Secrets Manager...${NC}"
export FLY_API_TOKEN=$(aws secretsmanager get-secret-value \
    --secret-id "fly-io/api-token" \
    --region us-west-2 \
    --query SecretString \
    --output text)

if [ -z "$FLY_API_TOKEN" ]; then
    echo -e "${RED}Failed to fetch Fly.io API token from AWS Secrets Manager${NC}"
    exit 1
fi

echo -e "${GREEN}Successfully fetched API token${NC}"

# Parse command line arguments
DEPLOY_API=false
DEPLOY_DASHBOARD=false
DEPLOY_ALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --api)
            DEPLOY_API=true
            shift
            ;;
        --dashboard)
            DEPLOY_DASHBOARD=true
            shift
            ;;
        --all)
            DEPLOY_ALL=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --api        Deploy RTPM API only"
            echo "  --dashboard  Deploy RTPM Dashboard only"
            echo "  --all        Deploy both API and Dashboard"
            echo "  --help       Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# If no specific component selected, deploy all
if [ "$DEPLOY_API" = false ] && [ "$DEPLOY_DASHBOARD" = false ] && [ "$DEPLOY_ALL" = false ]; then
    DEPLOY_ALL=true
fi

# Function to deploy API
deploy_api() {
    echo -e "${YELLOW}Deploying RTPM API...${NC}"

    # Load secrets from AWS SSM and set Fly secrets
    APP="rtpm-api-candlefish"
    PARAMS=(DATABASE_URL REDIS_URL JWT_SECRET SECRET_KEY CORS_ORIGINS)

    echo "Loading secrets from AWS SSM..."
    for key in "${PARAMS[@]}"; do
        val=$(aws ssm get-parameter --name "/candlefish/prod/rtpm-api/${key}" --with-decryption --query Parameter.Value --output text 2>/dev/null || true)
        if [ -n "${val}" ] && [ "${val}" != "None" ]; then
            echo "Setting ${key}"
            echo "${key}=${val}" >> .fly.env.tmp
        fi
    done

    if [ -f .fly.env.tmp ]; then
        flyctl secrets set --app "$APP" $(cat .fly.env.tmp | xargs) || true
        rm -f .fly.env.tmp
    fi

    # Deploy the API
    cd "${SCRIPT_DIR}/fly/rtpm-api"
    flyctl deploy --remote-only --build-arg BUILDKIT_PROGRESS=plain
    cd - > /dev/null

    echo -e "${GREEN}RTPM API deployed successfully${NC}"
}

# Function to deploy Dashboard
deploy_dashboard() {
    echo -e "${YELLOW}Deploying RTPM Dashboard...${NC}"

    # Set Fly secrets for dashboard
    APP="rtpm-dashboard-candlefish"

    # Pull API host if stored in SSM
    API_HOST=$(aws ssm get-parameter --name "/candlefish/prod/rtpm-dashboard/API_HOST" --with-decryption --query Parameter.Value --output text 2>/dev/null || echo "api.candlefish.ai")

    flyctl secrets set --app "$APP" \
        VITE_API_URL="https://${API_HOST}" \
        VITE_WS_URL="wss://${API_HOST}" || true

    # Deploy the Dashboard
    cd "${SCRIPT_DIR}/fly/rtpm-dashboard"
    flyctl deploy --remote-only --build-arg BUILDKIT_PROGRESS=plain
    cd - > /dev/null

    echo -e "${GREEN}RTPM Dashboard deployed successfully${NC}"
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Deploy based on flags
if [ "$DEPLOY_ALL" = true ] || [ "$DEPLOY_API" = true ]; then
    deploy_api
fi

if [ "$DEPLOY_ALL" = true ] || [ "$DEPLOY_DASHBOARD" = true ]; then
    deploy_dashboard
fi

echo -e "${GREEN}Deployment complete!${NC}"

# Show deployment status
echo -e "${YELLOW}Checking deployment status...${NC}"
flyctl status --app rtpm-api-candlefish || true
flyctl status --app rtpm-dashboard-candlefish || true
