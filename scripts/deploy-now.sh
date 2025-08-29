#!/bin/bash
set -euo pipefail

# Deployment Script Using Infrastructure Token
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        AUTONOMOUS DEPLOYMENT WITH INFRASTRUCTURE TOKEN      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo

# Function to trigger deployment with token
trigger_with_token() {
    local TOKEN=$1
    echo -e "${YELLOW}Triggering deployment with Infrastructure token...${NC}"
    
    # Use curl to trigger the workflow directly
    RESPONSE=$(curl -X POST \
      -H "Authorization: token $TOKEN" \
      -H "Accept: application/vnd.github.v3+json" \
      -H "Content-Type: application/json" \
      https://api.github.com/repos/candlefish-ai/candlefish-ai/actions/workflows/autonomous-deploy-secure.yml/dispatches \
      -d '{"ref":"main","inputs":{"platform":"all"}}' \
      -s -w "\nHTTP_STATUS:%{http_code}" 2>&1)
    
    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    
    if [ "$HTTP_STATUS" = "204" ]; then
        echo -e "${GREEN}✅ Deployment triggered successfully!${NC}"
        echo
        echo "Waiting for workflow to start..."
        sleep 10
        
        # Get the latest run
        RUN_ID=$(gh run list --workflow="Autonomous Deploy Secure" --limit 1 --json databaseId --jq '.[0].databaseId')
        echo "Workflow started with Run ID: $RUN_ID"
        echo
        echo "View at: https://github.com/candlefish-ai/candlefish-ai/actions/runs/$RUN_ID"
        echo
        echo "Monitoring deployment..."
        gh run watch $RUN_ID || gh run view $RUN_ID
    else
        echo -e "${RED}Failed to trigger deployment (HTTP $HTTP_STATUS)${NC}"
        echo "$RESPONSE" | grep -v "HTTP_STATUS"
        return 1
    fi
}

# Check if token is in AWS Secrets Manager
echo -e "${YELLOW}Checking for Infrastructure token in AWS...${NC}"
INFRA_TOKEN=$(aws secretsmanager get-secret-value --secret-id "github/infrastructure-token" --query SecretString --output text 2>/dev/null || echo "")

if [ -n "$INFRA_TOKEN" ]; then
    echo -e "${GREEN}Found Infrastructure token in AWS Secrets Manager${NC}"
    trigger_with_token "$INFRA_TOKEN"
else
    echo -e "${YELLOW}Infrastructure token not found in AWS Secrets Manager${NC}"
    echo
    echo "To proceed, either:"
    echo
    echo "1. Store your token in AWS (recommended):"
    echo "   aws secretsmanager create-secret \\"
    echo "     --name 'github/infrastructure-token' \\"
    echo "     --secret-string 'YOUR_INFRASTRUCTURE_TOKEN'"
    echo "   Then run this script again"
    echo
    echo "2. Provide token directly:"
    echo "   export GITHUB_TOKEN='YOUR_INFRASTRUCTURE_TOKEN'"
    echo "   bash $0"
    echo
    echo "3. Use GitHub CLI:"
    echo "   gh auth logout"
    echo "   gh auth login (with Infrastructure token)"
    echo "   gh workflow run 'Autonomous Deploy Secure' -f platform=all"
    echo
    echo "4. Manual trigger (fastest):"
    echo "   https://github.com/candlefish-ai/candlefish-ai/actions/workflows/autonomous-deploy-secure.yml"
    
    # Check if token is in environment
    if [ -n "${GITHUB_TOKEN:-}" ]; then
        echo
        echo -e "${GREEN}Found GITHUB_TOKEN in environment, using it...${NC}"
        trigger_with_token "$GITHUB_TOKEN"
    fi
fi