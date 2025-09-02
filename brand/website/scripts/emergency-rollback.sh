#!/bin/bash

# Emergency Rollback Script for Production Incidents
# Use this when a deployment fails and you need to quickly restore service

set -e

echo "🚨 EMERGENCY ROLLBACK PROCEDURE"
echo "================================"
echo ""
echo "This script will help you quickly rollback to a working state."
echo ""

# Check if we have a previous working commit
if [ -z "$1" ]; then
    echo "Usage: ./scripts/emergency-rollback.sh <commit-hash>"
    echo ""
    echo "Recent commits that might be stable:"
    git log --oneline -n 10
    echo ""
    echo "Recommended stable commit: 850d8983 (last known working)"
    exit 1
fi

TARGET_COMMIT=$1

echo "Rolling back to commit: $TARGET_COMMIT"
echo "This will:"
echo "  1. Reset to the target commit"
echo "  2. Force push to trigger Netlify rebuild"
echo ""
read -p "Are you sure? (y/N): " confirm

if [ "$confirm" != "y" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# Perform the rollback
echo "🔄 Rolling back..."
git reset --hard $TARGET_COMMIT

echo "📤 Force pushing to main..."
git push --force origin main

echo "✅ Rollback complete!"
echo ""
echo "Netlify should now rebuild with the rolled-back version."
echo "Monitor the deployment at: https://app.netlify.com/sites/candlefish-grotto/deploys"