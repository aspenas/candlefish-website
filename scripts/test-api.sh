#!/bin/bash

# Candlefish.ai API Testing Script

# Configuration
BASE_URL="https://api.candlefish.ai/v1"
TEST_EMAIL="john.doe@candlefish.ai"
TEST_PASSWORD="SecurePassword123!"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to run tests
run_test() {
    local description="$1"
    local command="$2"

    echo -e "\n=== Testing: $description ==="
    eval "$command"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Test Passed${NC}"
    else
        echo -e "${RED}✗ Test Failed${NC}"
    fi
}

# Authentication Test
run_test "User Login" \
    "curl -s -X POST $BASE_URL/auth/login \
    -H 'Content-Type: application/json' \
    -d '{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}' \
    | jq '.token != null'"

# User Profile Test (requires token from previous login)
run_test "Get User Profile" \
    "TOKEN=\$(curl -s -X POST $BASE_URL/auth/login \
    -H 'Content-Type: application/json' \
    -d '{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}' \
    | jq -r '.token') && \
    curl -s -X GET $BASE_URL/users/profile \
    -H \"Authorization: Bearer \$TOKEN\" \
    | jq '.email == \"$TEST_EMAIL\"'"

# Contractors List Test (admin access)
run_test "List Contractors" \
    "TOKEN=\$(curl -s -X POST $BASE_URL/auth/login \
    -H 'Content-Type: application/json' \
    -d '{\"email\":\"admin@candlefish.ai\",\"password\":\"AdminPassword123!\"}' \
    | jq -r '.token') && \
    curl -s -X GET '$BASE_URL/contractors/list?status=active' \
    -H \"Authorization: Bearer \$TOKEN\" \
    | jq '.contractors | length > 0'"

# Secrets Access Test
run_test "Request Secret Access" \
    "TOKEN=\$(curl -s -X POST $BASE_URL/auth/login \
    -H 'Content-Type: application/json' \
    -d '{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}' \
    | jq -r '.token') && \
    curl -s -X POST $BASE_URL/secrets/access \
    -H 'Content-Type: application/json' \
    -H \"Authorization: Bearer \$TOKEN\" \
    -d '{\"secretName\":\"test-secret\",\"duration\":15}' \
    | jq '.tempToken != null'"

# Audit Logs Test (admin only)
run_test "Retrieve Audit Logs" \
    "TOKEN=\$(curl -s -X POST $BASE_URL/auth/login \
    -H 'Content-Type: application/json' \
    -d '{\"email\":\"admin@candlefish.ai\",\"password\":\"AdminPassword123!\"}' \
    | jq -r '.token') && \
    curl -s -X GET '$BASE_URL/audit/logs?page=1&pageSize=50' \
    -H \"Authorization: Bearer \$TOKEN\" \
    | jq '.logs | length > 0'"

echo -e "\n${GREEN}=== All API Tests Completed ===${NC}"
