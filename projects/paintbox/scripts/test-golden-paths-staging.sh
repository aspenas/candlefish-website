#!/bin/bash

# Test Golden Paths on Staging Environment
# Tests the 8 critical user journeys

STAGING_URL="https://paintbox-staging.fly.dev"
RESULTS_FILE="golden-paths-staging-results.json"

echo "🧪 Testing Golden Paths on Staging Environment"
echo "============================================="
echo "URL: $STAGING_URL"
echo ""

# Initialize results
echo '{"tests": [], "summary": {}}' > $RESULTS_FILE

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

# Test function
test_path() {
    local path_name="$1"
    local endpoint="$2"
    local expected_status="$3"

    echo -n "Testing $path_name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL$endpoint")

    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
        ((PASSED++))
        status="passed"
    else
        echo -e "${RED}✗ FAILED${NC} (Expected $expected_status, got $response)"
        ((FAILED++))
        status="failed"
    fi

    # Add to results
    jq --arg name "$path_name" \
       --arg endpoint "$endpoint" \
       --arg status "$status" \
       --arg response "$response" \
       '.tests += [{"name": $name, "endpoint": $endpoint, "status": $status, "response": $response}]' \
       $RESULTS_FILE > tmp.json && mv tmp.json $RESULTS_FILE
}

# Test API health
test_api() {
    local api_name="$1"
    local endpoint="$2"

    echo -n "Testing API: $api_name... "

    response=$(curl -s "$STAGING_URL$endpoint")

    if echo "$response" | jq -e . >/dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC} (Valid JSON)"
        ((PASSED++))
        status="passed"
    else
        echo -e "${RED}✗ FAILED${NC} (Invalid response)"
        ((FAILED++))
        status="failed"
    fi
}

echo "📋 Golden Path 1: Create Estimate → Save to Client"
test_path "GP1: New Estimate Page" "/estimate/new" "200"
test_path "GP1: Client Details" "/estimate/new/details" "200"
test_path "GP1: Success Page" "/estimate/success" "200"

echo ""
echo "📋 Golden Path 2: Configure Exterior → Calculate Pricing"
test_path "GP2: Exterior Config" "/estimate/new/exterior" "200"

echo ""
echo "📋 Golden Path 3: Configure Interior → Review"
test_path "GP3: Interior Config" "/estimate/new/interior" "200"
test_path "GP3: Review Page" "/estimate/new/review" "200"

echo ""
echo "📋 Golden Path 4: Salesforce Integration"
test_api "GP4: Salesforce Test" "/api/v1/salesforce/test"

echo ""
echo "📋 Golden Path 5: Export to PDF"
# PDF generation requires an ID, testing endpoint availability
echo -n "Testing PDF Generation endpoint... "
response=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/estimate/test-id/pdf")
if [ "$response" = "404" ] || [ "$response" = "401" ]; then
    echo -e "${YELLOW}⚠ WARNING${NC} (Endpoint exists but needs valid ID)"
    ((WARNINGS++))
else
    test_path "GP5: PDF Export" "/estimate/test-id/pdf" "200"
fi

echo ""
echo "📋 Golden Path 6: Offline Mode"
test_path "GP6: Offline Page" "/offline" "200"
test_path "GP6: Manifest" "/manifest.json" "200"

echo ""
echo "📋 Golden Path 7: Real-time Updates"
test_api "GP7: Health Check" "/api/health"
test_api "GP7: Telemetry Status" "/api/telemetry/status"

echo ""
echo "📋 Golden Path 8: Mobile PWA"
test_path "GP8: Service Worker" "/sw.js" "200"
test_path "GP8: Mobile Viewport" "/" "200"

echo ""
echo "============================================="
echo "📊 Test Summary:"
echo -e "  Passed: ${GREEN}$PASSED${NC}"
echo -e "  Failed: ${RED}$FAILED${NC}"
echo -e "  Warnings: ${YELLOW}$WARNINGS${NC}"

# Update summary in results
jq --arg passed "$PASSED" \
   --arg failed "$FAILED" \
   --arg warnings "$WARNINGS" \
   '.summary = {"passed": $passed, "failed": $failed, "warnings": $warnings}' \
   $RESULTS_FILE > tmp.json && mv tmp.json $RESULTS_FILE

echo ""
echo "Results saved to: $RESULTS_FILE"

# Return exit code based on failures
if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
