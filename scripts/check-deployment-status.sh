#!/bin/bash

# Quick Deployment Status Checker
# Polls GitHub Actions for the latest autonomous deployment status

echo "🔍 Checking Autonomous Deployment Status..."
echo "=========================================="

# Get the latest run
LATEST_RUN=$(gh run list --workflow autonomous-deployment.yml --limit 1 --json databaseId,status,conclusion,displayTitle,createdAt,updatedAt --jq '.[0]')

if [ -z "$LATEST_RUN" ]; then
    echo "❌ No deployment runs found"
    echo ""
    echo "To start deployment:"
    echo "1. Add AWS credentials to GitHub Secrets (see DEPLOYMENT_INSTRUCTIONS.md)"
    echo "2. Go to: https://github.com/candlefish-ai/candlefish-ai/actions/workflows/autonomous-deployment.yml"
    echo "3. Click 'Run workflow' with platform=all, mode=autonomous, use_max_tokens=true"
    exit 1
fi

# Parse run details
RUN_ID=$(echo "$LATEST_RUN" | jq -r '.databaseId')
STATUS=$(echo "$LATEST_RUN" | jq -r '.status')
CONCLUSION=$(echo "$LATEST_RUN" | jq -r '.conclusion // "pending"')
TITLE=$(echo "$LATEST_RUN" | jq -r '.displayTitle')
CREATED=$(echo "$LATEST_RUN" | jq -r '.createdAt')
UPDATED=$(echo "$LATEST_RUN" | jq -r '.updatedAt')

echo "📋 Latest Deployment Run"
echo "------------------------"
echo "Run ID: $RUN_ID"
echo "Title: $TITLE"
echo "Status: $STATUS"
echo "Conclusion: $CONCLUSION"
echo "Started: $CREATED"
echo "Updated: $UPDATED"
echo ""

# Check status and provide appropriate feedback
case "$STATUS" in
    "queued")
        echo "⏳ Deployment is queued and will start soon..."
        echo "Run: ./scripts/monitor-autonomous-deployment.sh"
        ;;
    "in_progress")
        echo "🚀 Deployment is currently running!"
        echo ""
        echo "Getting current job status..."
        gh run view "$RUN_ID" --json jobs --jq '.jobs[] | "  - \(.name): \(.status)"'
        echo ""
        echo "For real-time monitoring, run:"
        echo "./scripts/monitor-autonomous-deployment.sh"
        ;;
    "completed")
        case "$CONCLUSION" in
            "success")
                echo "✅ Deployment completed successfully!"
                echo ""
                echo "Platform Endpoints:"
                echo "  Web: https://prompt-engineering.netlify.app"
                echo "  API: https://api.prompt-engineering.candlefish.ai"
                echo ""
                echo "View full logs:"
                echo "gh run view $RUN_ID --log"
                ;;
            "failure")
                echo "❌ Deployment failed!"
                echo ""
                echo "Failed jobs:"
                gh run view "$RUN_ID" --json jobs --jq '.jobs[] | select(.conclusion == "failure") | "  - \(.name)"'
                echo ""
                echo "View error logs:"
                echo "gh run view $RUN_ID --log-failed"
                ;;
            "cancelled")
                echo "⚠️ Deployment was cancelled"
                ;;
            *)
                echo "❓ Unknown conclusion: $CONCLUSION"
                ;;
        esac
        ;;
    *)
        echo "❓ Unknown status: $STATUS"
        ;;
esac

echo ""
echo "=========================================="
echo "GitHub Actions Page:"
echo "https://github.com/candlefish-ai/candlefish-ai/actions/runs/$RUN_ID"