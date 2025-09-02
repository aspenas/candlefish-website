#!/bin/bash

# Deployment Verification Script
# Checks if candlefish.ai is responding after deployment

echo "🔍 Verifying Candlefish.ai deployment..."
echo "========================================="
echo ""

# Function to check site status
check_site() {
    local url=$1
    local response=$(curl -s -o /dev/null -w "%{http_code}" -L "$url")
    echo "$response"
}

# Main site check
echo "Checking main site: https://candlefish.ai"
MAIN_STATUS=$(check_site "https://candlefish.ai")

if [ "$MAIN_STATUS" == "200" ]; then
    echo "✅ Main site is UP (HTTP $MAIN_STATUS)"
else
    echo "❌ Main site is DOWN or degraded (HTTP $MAIN_STATUS)"
fi

# Check key pages
echo ""
echo "Checking key pages..."

declare -a PAGES=(
    "/"
    "/assessment/"
    "/workshop-notes/"
    "/atelier/"
    "/agents/"
)

FAILED=0
for page in "${PAGES[@]}"; do
    STATUS=$(check_site "https://candlefish.ai$page")
    if [ "$STATUS" == "200" ]; then
        echo "  ✅ $page - OK"
    else
        echo "  ❌ $page - FAILED (HTTP $STATUS)"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "========================================="
if [ $FAILED -eq 0 ] && [ "$MAIN_STATUS" == "200" ]; then
    echo "🎉 DEPLOYMENT SUCCESSFUL - All checks passed!"
    exit 0
else
    echo "⚠️  DEPLOYMENT ISSUES DETECTED"
    echo "Failed checks: $FAILED"
    if [ "$MAIN_STATUS" != "200" ]; then
        echo "Main site is not responding correctly"
    fi
    exit 1
fi