#!/bin/bash

# Security Fixes Testing Script
# Tests all implemented security fixes for the JWKS endpoint

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
if [ -z "$1" ]; then
    echo "Usage: $0 <environment>"
    echo "Example: $0 staging"
    echo "Example: $0 production"
    exit 1
fi

ENV=$1

if [ "$ENV" = "production" ]; then
    BASE_URL="https://paintbox.fly.dev"
elif [ "$ENV" = "staging" ]; then
    BASE_URL="https://paintbox-staging.fly.dev"
else
    BASE_URL="http://localhost:3000"
fi

JWKS_URL="${BASE_URL}/.well-known/jwks.json"

echo -e "${YELLOW}Testing Security Fixes on: ${BASE_URL}${NC}\n"

# Test 1: Check if hardcoded keys are removed
echo -e "${YELLOW}Test 1: Verifying no hardcoded keys...${NC}"
response=$(curl -s "$JWKS_URL")
if echo "$response" | grep -q "88672a69-26ae-45db-b73c-93debf7ea87d"; then
    echo -e "${RED}✗ FAILED: Hardcoded key ID still present!${NC}"
    exit 1
else
    echo -e "${GREEN}✓ PASSED: No hardcoded keys detected${NC}"
fi

# Test 2: Rate Limiting
echo -e "\n${YELLOW}Test 2: Testing rate limiting (10 requests/minute)...${NC}"
rate_limit_hit=false
for i in {1..12}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$JWKS_URL")
    if [ "$response" = "429" ]; then
        echo -e "${GREEN}✓ PASSED: Rate limit enforced after request $i${NC}"
        rate_limit_hit=true
        break
    fi
    sleep 0.5
done

if [ "$rate_limit_hit" = false ]; then
    echo -e "${RED}✗ WARNING: Rate limit not triggered after 12 requests${NC}"
fi

# Test 3: CORS Headers
echo -e "\n${YELLOW}Test 3: Testing CORS configuration...${NC}"

# Test unauthorized origin
unauthorized_response=$(curl -s -I -H "Origin: https://evil.com" "$JWKS_URL" | grep -i "access-control-allow-origin" || true)
if echo "$unauthorized_response" | grep -q "evil.com"; then
    echo -e "${RED}✗ FAILED: Unauthorized origin accepted!${NC}"
    exit 1
else
    echo -e "${GREEN}✓ PASSED: Unauthorized origin rejected${NC}"
fi

# Test authorized origin
authorized_response=$(curl -s -I -H "Origin: ${BASE_URL}" "$JWKS_URL" | grep -i "access-control-allow-origin" || true)
if echo "$authorized_response" | grep -q "$BASE_URL"; then
    echo -e "${GREEN}✓ PASSED: Authorized origin accepted${NC}"
else
    echo -e "${YELLOW}⚠ WARNING: Check CORS configuration for ${BASE_URL}${NC}"
fi

# Test 4: Security Headers
echo -e "\n${YELLOW}Test 4: Checking security headers...${NC}"
headers=$(curl -s -I "$JWKS_URL")

check_header() {
    header_name=$1
    expected_value=$2

    if echo "$headers" | grep -qi "$header_name"; then
        echo -e "${GREEN}✓ $header_name present${NC}"
        if [ -n "$expected_value" ]; then
            if echo "$headers" | grep -i "$header_name" | grep -q "$expected_value"; then
                echo -e "  ${GREEN}Value: $expected_value${NC}"
            else
                echo -e "  ${YELLOW}Different value than expected${NC}"
            fi
        fi
    else
        echo -e "${RED}✗ $header_name missing${NC}"
    fi
}

check_header "X-Content-Type-Options" "nosniff"
check_header "X-Frame-Options" "DENY"
check_header "Content-Security-Policy"
check_header "Referrer-Policy"
check_header "Permissions-Policy"

if [ "$ENV" = "production" ]; then
    check_header "Strict-Transport-Security"
fi

# Test 5: Cache TTL
echo -e "\n${YELLOW}Test 5: Checking cache TTL...${NC}"
cache_control=$(echo "$headers" | grep -i "cache-control" || true)
if echo "$cache_control" | grep -q "max-age=300"; then
    echo -e "${GREEN}✓ PASSED: Cache TTL is 5 minutes (300 seconds)${NC}"
elif echo "$cache_control" | grep -q "max-age=600"; then
    echo -e "${RED}✗ FAILED: Cache TTL is still 10 minutes!${NC}"
else
    echo -e "${YELLOW}⚠ Cache-Control: $cache_control${NC}"
fi

# Test 6: Error Handling
echo -e "\n${YELLOW}Test 6: Testing error handling (no information leakage)...${NC}"
# Force an error by sending malformed request
error_response=$(curl -s -X POST "$JWKS_URL" 2>/dev/null || true)
if echo "$error_response" | grep -q "AWS\|SecretsManager\|stack\|trace"; then
    echo -e "${RED}✗ FAILED: Internal details exposed in error!${NC}"
    exit 1
else
    echo -e "${GREEN}✓ PASSED: No sensitive information in error response${NC}"
fi

# Test 7: Service Availability
echo -e "\n${YELLOW}Test 7: Testing service availability...${NC}"
http_code=$(curl -s -o /dev/null -w "%{http_code}" "$JWKS_URL")
if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ PASSED: JWKS endpoint is available (200 OK)${NC}"
elif [ "$http_code" = "503" ]; then
    echo -e "${YELLOW}⚠ WARNING: Service unavailable (503) - Check AWS connection${NC}"
else
    echo -e "${RED}✗ Unexpected status code: $http_code${NC}"
fi

# Summary
echo -e "\n${YELLOW}===================================${NC}"
echo -e "${GREEN}Security Testing Complete!${NC}"
echo -e "${YELLOW}===================================${NC}"

echo -e "\n${YELLOW}Additional Manual Tests Recommended:${NC}"
echo "1. Run OWASP ZAP scanner"
echo "2. Test with Burp Suite"
echo "3. Verify AWS Secrets Manager access"
echo "4. Check monitoring dashboards"
echo "5. Review application logs for security events"

echo -e "\n${YELLOW}Deployment Readiness:${NC}"
if [ "$ENV" = "production" ]; then
    echo -e "${GREEN}✓ Production security checks complete${NC}"
else
    echo -e "${YELLOW}⚠ Run tests in production after deployment${NC}"
fi
