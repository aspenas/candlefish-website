#!/bin/bash

# Await Deployment Trigger Script
# Monitors for new deployment runs and automatically starts monitoring

echo "🔄 Waiting for Autonomous Deployment to be triggered..."
echo "======================================================="
echo ""
echo "Instructions:"
echo "1. Go to GitHub Settings and add AWS credentials as secrets"
echo "2. Navigate to Actions and trigger the workflow"
echo "3. This script will automatically detect and monitor the deployment"
echo ""
echo "Checking every 30 seconds for new runs..."
echo ""

# Get the ID of the last known run
LAST_RUN_ID=$(gh run list --workflow autonomous-deployment.yml --limit 1 --json databaseId --jq '.[0].databaseId // 0')
echo "Last known run ID: ${LAST_RUN_ID}"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Monitor loop
while true; do
    # Check for new runs
    CURRENT_RUN=$(gh run list --workflow autonomous-deployment.yml --limit 1 --json databaseId,status,displayTitle,createdAt --jq '.[0]')
    
    if [ -z "$CURRENT_RUN" ]; then
        echo -ne "\r⏳ $(date +%H:%M:%S) - No runs found yet..."
        sleep 30
        continue
    fi
    
    CURRENT_RUN_ID=$(echo "$CURRENT_RUN" | jq -r '.databaseId')
    CURRENT_STATUS=$(echo "$CURRENT_RUN" | jq -r '.status')
    CURRENT_TITLE=$(echo "$CURRENT_RUN" | jq -r '.displayTitle')
    
    # Check if this is a new run
    if [ "$CURRENT_RUN_ID" != "$LAST_RUN_ID" ]; then
        echo -e "\n${GREEN}🚀 New deployment detected!${NC}"
        echo "Run ID: $CURRENT_RUN_ID"
        echo "Title: $CURRENT_TITLE"
        echo "Status: $CURRENT_STATUS"
        echo ""
        
        # Update last known run
        LAST_RUN_ID=$CURRENT_RUN_ID
        
        # If the run is active, start monitoring
        if [ "$CURRENT_STATUS" == "in_progress" ] || [ "$CURRENT_STATUS" == "queued" ]; then
            echo -e "${YELLOW}Starting automatic monitoring...${NC}"
            echo ""
            
            # Launch the monitoring script
            if [ -f "./scripts/monitor-autonomous-deployment.sh" ]; then
                exec ./scripts/monitor-autonomous-deployment.sh
            else
                echo -e "${RED}Error: Monitoring script not found!${NC}"
                echo "Falling back to basic monitoring..."
                
                # Basic monitoring loop
                while true; do
                    STATUS=$(gh run view "$CURRENT_RUN_ID" --json status --jq '.status')
                    CONCLUSION=$(gh run view "$CURRENT_RUN_ID" --json conclusion --jq '.conclusion // "pending"')
                    
                    echo -ne "\rStatus: $STATUS | Conclusion: $CONCLUSION | $(date +%H:%M:%S)"
                    
                    if [ "$STATUS" == "completed" ]; then
                        echo ""
                        if [ "$CONCLUSION" == "success" ]; then
                            echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
                        else
                            echo -e "${RED}❌ Deployment failed with conclusion: $CONCLUSION${NC}"
                        fi
                        break
                    fi
                    
                    sleep 10
                done
            fi
        fi
    else
        # Same run, check if status changed
        if [ "$CURRENT_STATUS" == "completed" ]; then
            echo -ne "\r$(date +%H:%M:%S) - Last run completed. Waiting for new deployment..."
        else
            echo -ne "\r$(date +%H:%M:%S) - Current run still: $CURRENT_STATUS"
        fi
    fi
    
    sleep 30
done