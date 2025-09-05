#!/bin/bash

# Vault Connectivity Test Suite
# Tests HashiCorp Vault connectivity and functionality

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-}"
FAILED_TESTS=0
PASSED_TESTS=0

echo -e "${BLUE}Testing Vault connectivity at: $VAULT_ADDR${NC}"
echo ""

test_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    if [[ "$status" == "PASS" ]]; then
        echo -e "${GREEN}✓ $test_name: $message${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗ $test_name: $message${NC}"
        ((FAILED_TESTS++))
    fi
}

# Test 1: Basic connectivity
echo "Testing basic connectivity..."
if curl -s --connect-timeout 10 "$VAULT_ADDR/v1/sys/health" > /dev/null; then
    test_result "CONNECTIVITY" "PASS" "Can reach Vault server"
else
    test_result "CONNECTIVITY" "FAIL" "Cannot reach Vault server"
    exit 1
fi

# Test 2: Health check
echo "Testing health status..."
HEALTH_RESPONSE=$(curl -s "$VAULT_ADDR/v1/sys/health" || echo '{}')
SEALED=$(echo "$HEALTH_RESPONSE" | jq -r '.sealed // "unknown"')
STANDBY=$(echo "$HEALTH_RESPONSE" | jq -r '.standby // "unknown"')

if [[ "$SEALED" == "false" ]]; then
    test_result "VAULT_SEALED" "PASS" "Vault is unsealed"
else
    test_result "VAULT_SEALED" "FAIL" "Vault is sealed or status unknown"
fi

if [[ "$STANDBY" == "false" ]]; then
    test_result "VAULT_STANDBY" "PASS" "Vault is active (not standby)"
elif [[ "$STANDBY" == "true" ]]; then
    test_result "VAULT_STANDBY" "PASS" "Vault is in standby mode"
else
    test_result "VAULT_STANDBY" "FAIL" "Cannot determine Vault standby status"
fi

# Test 3: Authentication (if token provided)
if [[ -n "$VAULT_TOKEN" ]]; then
    echo "Testing authentication..."
    if curl -s -H "X-Vault-Token: $VAULT_TOKEN" "$VAULT_ADDR/v1/auth/token/lookup-self" > /dev/null; then
        test_result "AUTHENTICATION" "PASS" "Token authentication successful"
        
        # Get token info
        TOKEN_INFO=$(curl -s -H "X-Vault-Token: $VAULT_TOKEN" "$VAULT_ADDR/v1/auth/token/lookup-self")
        TTL=$(echo "$TOKEN_INFO" | jq -r '.data.ttl // "unknown"')
        RENEWABLE=$(echo "$TOKEN_INFO" | jq -r '.data.renewable // "unknown"')
        
        echo "  Token TTL: $TTL seconds"
        echo "  Token renewable: $RENEWABLE"
        
        if [[ "$TTL" != "0" ]] && [[ "$TTL" != "unknown" ]]; then
            test_result "TOKEN_TTL" "PASS" "Token has valid TTL: $TTL seconds"
        else
            test_result "TOKEN_TTL" "FAIL" "Token TTL is invalid or unknown"
        fi
    else
        test_result "AUTHENTICATION" "FAIL" "Token authentication failed"
    fi
    
    # Test 4: Policies
    echo "Testing policies..."
    POLICIES=$(curl -s -H "X-Vault-Token: $VAULT_TOKEN" "$VAULT_ADDR/v1/sys/policies/acl" | jq -r '.data.keys[]' 2>/dev/null || echo "")
    if [[ -n "$POLICIES" ]]; then
        test_result "POLICIES" "PASS" "Found policies: $(echo "$POLICIES" | tr '\n' ' ')"
    else
        test_result "POLICIES" "FAIL" "No policies found or cannot access policies"
    fi
    
    # Test 5: Secret engines
    echo "Testing secret engines..."
    ENGINES=$(curl -s -H "X-Vault-Token: $VAULT_TOKEN" "$VAULT_ADDR/v1/sys/mounts" | jq -r '.data | keys[]' 2>/dev/null || echo "")
    if [[ -n "$ENGINES" ]]; then
        test_result "SECRET_ENGINES" "PASS" "Found secret engines: $(echo "$ENGINES" | tr '\n' ' ')"
        
        # Check for KV v2 engine (common for secrets)
        if echo "$ENGINES" | grep -q "secret/"; then
            test_result "KV_ENGINE" "PASS" "KV secret engine is available"
        else
            test_result "KV_ENGINE" "FAIL" "KV secret engine not found"
        fi
    else
        test_result "SECRET_ENGINES" "FAIL" "Cannot access secret engines"
    fi
    
    # Test 6: Transit engine (if available)
    if echo "$ENGINES" | grep -q "transit/"; then
        echo "Testing transit engine..."
        # Try to list transit keys
        TRANSIT_KEYS=$(curl -s -H "X-Vault-Token: $VAULT_TOKEN" "$VAULT_ADDR/v1/transit/keys" | jq -r '.data.keys[]' 2>/dev/null || echo "")
        if [[ -n "$TRANSIT_KEYS" ]]; then
            test_result "TRANSIT_KEYS" "PASS" "Transit keys available: $(echo "$TRANSIT_KEYS" | tr '\n' ' ')"
        else
            test_result "TRANSIT_KEYS" "FAIL" "No transit keys found"
        fi
    fi
    
    # Test 7: PKI engine (if available)
    if echo "$ENGINES" | grep -q "pki"; then
        echo "Testing PKI engine..."
        PKI_ROLES=$(curl -s -H "X-Vault-Token: $VAULT_TOKEN" "$VAULT_ADDR/v1/pki/roles" | jq -r '.data.keys[]' 2>/dev/null || echo "")
        if [[ -n "$PKI_ROLES" ]]; then
            test_result "PKI_ROLES" "PASS" "PKI roles available: $(echo "$PKI_ROLES" | tr '\n' ' ')"
        else
            test_result "PKI_ROLES" "FAIL" "No PKI roles found"
        fi
    fi
    
else
    echo -e "${YELLOW}Skipping authentication tests (VAULT_TOKEN not provided)${NC}"
fi

# Test 8: Performance test
echo "Testing performance..."
START_TIME=$(date +%s%3N)
curl -s "$VAULT_ADDR/v1/sys/health" > /dev/null
END_TIME=$(date +%s%3N)
RESPONSE_TIME=$((END_TIME - START_TIME))

if [[ $RESPONSE_TIME -lt 1000 ]]; then
    test_result "PERFORMANCE" "PASS" "Response time: ${RESPONSE_TIME}ms (good)"
elif [[ $RESPONSE_TIME -lt 5000 ]]; then
    test_result "PERFORMANCE" "PASS" "Response time: ${RESPONSE_TIME}ms (acceptable)"
else
    test_result "PERFORMANCE" "FAIL" "Response time: ${RESPONSE_TIME}ms (slow)"
fi

# Summary
echo ""
echo -e "${BLUE}=== Vault Test Summary ===${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [[ $FAILED_TESTS -eq 0 ]]; then
    echo -e "${GREEN}All Vault tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some Vault tests failed. Please review the configuration.${NC}"
    exit 1
fi