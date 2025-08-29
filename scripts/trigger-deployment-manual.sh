#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     AUTONOMOUS DEPLOYMENT - MANUAL TRIGGER REQUIRED        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo

echo -e "${YELLOW}⚠️  GitHub CLI lacks workflow permissions. Manual trigger required.${NC}"
echo

echo -e "${GREEN}✅ AWS Credentials Status:${NC}"
echo "   You mentioned adding AWS_ACCESS_KEY_IDValue and AWS_SECRET_ACCESS_KEYValue"
echo "   The workflow needs these exact names (without 'Value' suffix):"
echo

echo -e "${CYAN}📋 Required GitHub Secrets:${NC}"
echo "   • AWS_ACCESS_KEY_ID"
echo "   • AWS_SECRET_ACCESS_KEY"
echo

echo -e "${YELLOW}🔧 Quick Fix Instructions:${NC}"
echo "1. Open: https://github.com/candlefish-ai/candlefish-ai/settings/secrets/actions"
echo
echo "2. Update secret names (remove 'Value' suffix if present):"
echo "   - AWS_ACCESS_KEY_ID (not AWS_ACCESS_KEY_IDValue)"
echo "   - AWS_SECRET_ACCESS_KEY (not AWS_SECRET_ACCESS_KEYValue)"
echo
echo "3. Trigger deployment:"
echo "   ${BLUE}https://github.com/candlefish-ai/candlefish-ai/actions/workflows/184638683${NC}"
echo
echo "4. Click 'Run workflow' with:"
echo "   - Platform: ${GREEN}all${NC}"
echo "   - Deployment mode: ${GREEN}autonomous${NC}"
echo "   - Use maximum tokens: ${GREEN}✓ checked${NC}"
echo

echo -e "${CYAN}📊 Once triggered, monitor with:${NC}"
echo "   ./scripts/monitor-autonomous-deployment.sh watch"
echo

# Check if we can detect the workflow status
echo -e "${YELLOW}🔍 Checking current workflow status...${NC}"
LATEST_RUN=$(gh run list --workflow="Autonomous Prompt Engineering Deployment" --limit 1 --json status,conclusion,createdAt 2>/dev/null | jq -r '.[0] | "\(.createdAt | split("T")[0]) - \(.status) - \(.conclusion // "in progress")"' || echo "Unable to fetch")
echo "   Latest run: $LATEST_RUN"
echo

# Try alternative trigger method
echo -e "${YELLOW}📱 Alternative: Trigger via GitHub Mobile App${NC}"
echo "   1. Open GitHub mobile app"
echo "   2. Navigate to Actions tab"
echo "   3. Select 'Autonomous Prompt Engineering Deployment'"
echo "   4. Tap 'Run workflow' with same parameters"
echo

echo -e "${GREEN}Press Enter to open GitHub Actions page in browser...${NC}"
read -r

# Try to open browser
if command -v open &>/dev/null; then
    open "https://github.com/candlefish-ai/candlefish-ai/actions/workflows/184638683"
elif command -v xdg-open &>/dev/null; then
    xdg-open "https://github.com/candlefish-ai/candlefish-ai/actions/workflows/184638683"
fi

echo
echo -e "${CYAN}Waiting for deployment trigger...${NC}"
echo "Once triggered, this script will auto-detect and start monitoring."
echo

# Poll for new deployment
INITIAL_RUN_ID=$(gh run list --workflow="Autonomous Prompt Engineering Deployment" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || echo "0")

while true; do
    sleep 5
    CURRENT_RUN_ID=$(gh run list --workflow="Autonomous Prompt Engineering Deployment" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || echo "0")
    
    if [ "$CURRENT_RUN_ID" != "$INITIAL_RUN_ID" ] && [ "$CURRENT_RUN_ID" != "0" ]; then
        echo -e "${GREEN}✅ New deployment detected! Run ID: $CURRENT_RUN_ID${NC}"
        echo "Starting real-time monitoring..."
        sleep 2
        exec ./scripts/monitor-autonomous-deployment.sh watch
        break
    fi
    
    echo -n "."
done