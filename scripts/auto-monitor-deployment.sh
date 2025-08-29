#!/bin/bash
set -euo pipefail

# Auto-monitoring script that detects when deployment is triggered

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         AUTO-MONITORING DEPLOYMENT TRIGGER                 ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo

# Get current latest run
INITIAL_RUN=$(gh run list --workflow="Autonomous Prompt Engineering Deployment" --limit 1 --json databaseId,status,conclusion 2>/dev/null | jq -r '.[0] | "\(.databaseId)|\(.status)|\(.conclusion // "running")"' || echo "0|none|none")
INITIAL_ID=$(echo "$INITIAL_RUN" | cut -d'|' -f1)

echo -e "${YELLOW}Current state:${NC}"
echo "  Run ID: $(echo "$INITIAL_RUN" | cut -d'|' -f1)"
echo "  Status: $(echo "$INITIAL_RUN" | cut -d'|' -f2)"
echo "  Result: $(echo "$INITIAL_RUN" | cut -d'|' -f3)"
echo

echo -e "${GREEN}Waiting for new deployment trigger...${NC}"
echo "(I'll detect when you trigger the workflow)"
echo

# Poll for changes
while true; do
    sleep 3
    
    CURRENT_RUN=$(gh run list --workflow="Autonomous Prompt Engineering Deployment" --limit 1 --json databaseId,status,conclusion 2>/dev/null | jq -r '.[0] | "\(.databaseId)|\(.status)|\(.conclusion // "running")"' || echo "0|none|none")
    CURRENT_ID=$(echo "$CURRENT_RUN" | cut -d'|' -f1)
    CURRENT_STATUS=$(echo "$CURRENT_RUN" | cut -d'|' -f2)
    
    # Check if run ID changed or status changed to in_progress
    if [[ "$CURRENT_ID" != "$INITIAL_ID" ]] || [[ "$CURRENT_STATUS" == "in_progress" && "$INITIAL_ID" == "$CURRENT_ID" ]]; then
        echo
        echo -e "${GREEN}🚀 DEPLOYMENT TRIGGERED!${NC}"
        echo "  Run ID: $CURRENT_ID"
        echo "  Status: $CURRENT_STATUS"
        echo
        echo "Starting real-time monitoring..."
        sleep 2
        
        # Switch to monitoring mode
        exec ./scripts/monitor-autonomous-deployment.sh watch
        break
    fi
    
    # Visual progress indicator
    echo -n "."
done