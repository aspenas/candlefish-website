#!/bin/bash
# Security Validation Script - Validates all security remediations
# Run after implementing security fixes to ensure they're working correctly

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VALIDATION_REPORT="/tmp/security-validation-$(date +%Y%m%d-%H%M%S).json"
FAILED_CHECKS=0
TOTAL_CHECKS=0

echo -e "${BLUE}🔍 SECURITY VALIDATION SUITE${NC}"
echo "================================"
echo "Timestamp: $(date)"
echo "Report: $VALIDATION_REPORT"
echo ""

# Initialize report
cat > "$VALIDATION_REPORT" << EOF
{
  "validation_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platform": "candlefish-ai",
  "checks": [],
  "summary": {}
}
EOF

# Function to log validation results
log_check() {
    local check_name=$1
    local status=$2
    local details=$3

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [[ "$status" == "PASS" ]]; then
        echo -e "${GREEN}✅ $check_name: PASSED${NC}"
    else
        echo -e "${RED}❌ $check_name: FAILED${NC}"
        echo "   Details: $details"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi

    # Update JSON report
    jq --arg name "$check_name" \
       --arg status "$status" \
       --arg details "$details" \
       '.checks += [{
           "name": $name,
           "status": $status,
           "details": $details,
           "timestamp": now | todate
       }]' "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && \
    mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"
}

echo -e "${YELLOW}1. Validating Secrets Migration...${NC}"
echo "-----------------------------------"

# Check AWS Secrets Manager
check_aws_secrets() {
    echo "Checking AWS Secrets Manager configuration..."

    # Check if secrets exist
    if aws secretsmanager list-secrets --region us-east-1 | grep -q "candlefish"; then
        log_check "AWS Secrets Manager" "PASS" "Secrets migrated successfully"
    else
        log_check "AWS Secrets Manager" "FAIL" "No secrets found in AWS Secrets Manager"
    fi

    # Check KMS key
    if aws kms describe-key --key-id alias/candlefish-secrets --region us-east-1 &>/dev/null; then
        log_check "KMS Encryption Key" "PASS" "Encryption key configured"
    else
        log_check "KMS Encryption Key" "FAIL" "KMS key not found"
    fi

    # Check rotation configuration
    local rotating_secrets=$(aws secretsmanager list-secrets --region us-east-1 \
        --query "SecretList[?RotationEnabled==\`true\`] | length(@)" --output text)

    if [[ "$rotating_secrets" -gt 0 ]]; then
        log_check "Secret Rotation" "PASS" "$rotating_secrets secrets with rotation enabled"
    else
        log_check "Secret Rotation" "FAIL" "No secrets have rotation enabled"
    fi
}

# Check for hardcoded secrets
check_hardcoded_secrets() {
    echo "Scanning for hardcoded secrets..."

    local secrets_found=0
    local scan_patterns=(
        'password.*=.*["\047][^"\047]+["\047]'
        'api[_-]?key.*=.*["\047][^"\047]+["\047]'
        'AWS_SECRET_ACCESS_KEY'
        'GITHUB_TOKEN'
    )

    for pattern in "${scan_patterns[@]}"; do
        if find . -type f -name "*.env*" -print0 | xargs -0 grep -l "$pattern" 2>/dev/null | grep -v node_modules | head -1; then
            secrets_found=$((secrets_found + 1))
        fi
    done

    if [[ $secrets_found -eq 0 ]]; then
        log_check "Hardcoded Secrets" "PASS" "No hardcoded secrets found"
    else
        log_check "Hardcoded Secrets" "FAIL" "$secrets_found patterns of hardcoded secrets detected"
    fi
}

check_aws_secrets
check_hardcoded_secrets

echo ""
echo -e "${YELLOW}2. Validating JWT Security...${NC}"
echo "------------------------------"

# Check JWT implementation
check_jwt_security() {
    echo "Validating JWT configuration..."

    # Check if RS256 is being used
    if grep -r "algorithm.*RS256" packages/auth/ &>/dev/null; then
        log_check "JWT Algorithm" "PASS" "Using RS256 (asymmetric)"
    else
        log_check "JWT Algorithm" "FAIL" "Not using RS256"
    fi

    # Check for token expiration
    if grep -r "ACCESS_TOKEN_TTL.*=.*15.*\*.*60" packages/auth/ &>/dev/null; then
        log_check "Token Expiration" "PASS" "15-minute access token TTL"
    else
        log_check "Token Expiration" "FAIL" "Token expiration not properly configured"
    fi

    # Check for refresh token implementation
    if grep -r "generateRefreshToken" packages/auth/ &>/dev/null; then
        log_check "Refresh Tokens" "PASS" "Refresh token mechanism implemented"
    else
        log_check "Refresh Tokens" "FAIL" "No refresh token implementation found"
    fi

    # Check Redis for revocation
    if redis-cli ping &>/dev/null; then
        if redis-cli keys "jwt:revoked:*" | head -1 &>/dev/null; then
            log_check "Token Revocation" "PASS" "Redis revocation list configured"
        else
            log_check "Token Revocation" "WARN" "Redis running but no revocation entries"
        fi
    else
        log_check "Token Revocation" "FAIL" "Redis not accessible for token revocation"
    fi
}

check_jwt_security

echo ""
echo -e "${YELLOW}3. Validating GraphQL Security...${NC}"
echo "----------------------------------"

# Check GraphQL hardening
check_graphql_security() {
    echo "Checking GraphQL security configuration..."

    # Check introspection
    if grep -r "introspection.*false" api/graphql/ &>/dev/null; then
        log_check "GraphQL Introspection" "PASS" "Introspection disabled in production"
    else
        log_check "GraphQL Introspection" "FAIL" "Introspection not disabled"
    fi

    # Check depth limiting
    if grep -r "depthLimit" api/graphql/ &>/dev/null; then
        log_check "Query Depth Limiting" "PASS" "Depth limiting configured"
    else
        log_check "Query Depth Limiting" "FAIL" "No depth limiting found"
    fi

    # Check complexity analysis
    if grep -r "costAnalysis\|complexity" api/graphql/ &>/dev/null; then
        log_check "Query Complexity" "PASS" "Complexity analysis configured"
    else
        log_check "Query Complexity" "FAIL" "No complexity analysis found"
    fi

    # Check rate limiting
    if grep -r "RateLimiter" api/graphql/ &>/dev/null; then
        log_check "GraphQL Rate Limiting" "PASS" "Rate limiting implemented"
    else
        log_check "GraphQL Rate Limiting" "FAIL" "No rate limiting found"
    fi
}

check_graphql_security

echo ""
echo -e "${YELLOW}4. Validating Kubernetes Security...${NC}"
echo "-------------------------------------"

# Check Kubernetes security
check_kubernetes_security() {
    echo "Checking Kubernetes security configuration..."

    if command -v kubectl &>/dev/null; then
        # Check for Sealed Secrets controller
        if kubectl get deployment -n sealed-secrets sealed-secrets-controller &>/dev/null; then
            log_check "Sealed Secrets" "PASS" "Sealed Secrets controller deployed"
        else
            log_check "Sealed Secrets" "FAIL" "Sealed Secrets controller not found"
        fi

        # Check for plain text secrets
        local plain_secrets=$(kubectl get secrets --all-namespaces -o json | \
            jq -r '.items[] | select(.type != "kubernetes.io/service-account-token") | .metadata.name' | wc -l)

        if [[ $plain_secrets -eq 0 ]]; then
            log_check "Plain Text Secrets" "PASS" "No plain text secrets in cluster"
        else
            log_check "Plain Text Secrets" "WARN" "$plain_secrets non-service-account secrets found"
        fi

        # Check RBAC
        if kubectl get clusterrolebindings | grep -q "sealed-secrets"; then
            log_check "RBAC Configuration" "PASS" "RBAC configured for sealed secrets"
        else
            log_check "RBAC Configuration" "FAIL" "RBAC not properly configured"
        fi

        # Check Network Policies
        if kubectl get networkpolicies --all-namespaces | grep -q "sealed-secrets"; then
            log_check "Network Policies" "PASS" "Network policies configured"
        else
            log_check "Network Policies" "WARN" "No network policies found"
        fi
    else
        log_check "Kubernetes Access" "SKIP" "kubectl not available"
    fi
}

check_kubernetes_security

echo ""
echo -e "${YELLOW}5. Validating Security Headers...${NC}"
echo "----------------------------------"

# Check security headers on live sites
check_security_headers() {
    echo "Checking security headers on production sites..."

    local sites=("docs.candlefish.ai" "api.candlefish.ai")

    for site in "${sites[@]}"; do
        if curl -sI "https://$site" &>/dev/null; then
            local headers=$(curl -sI "https://$site")

            # Check for critical security headers
            local has_hsts=$(echo "$headers" | grep -i "strict-transport-security")
            local has_csp=$(echo "$headers" | grep -i "content-security-policy")
            local has_xfo=$(echo "$headers" | grep -i "x-frame-options")
            local has_xcto=$(echo "$headers" | grep -i "x-content-type-options")

            local missing=0
            [[ -z "$has_hsts" ]] && missing=$((missing + 1))
            [[ -z "$has_csp" ]] && missing=$((missing + 1))
            [[ -z "$has_xfo" ]] && missing=$((missing + 1))
            [[ -z "$has_xcto" ]] && missing=$((missing + 1))

            if [[ $missing -eq 0 ]]; then
                log_check "Security Headers ($site)" "PASS" "All critical headers present"
            else
                log_check "Security Headers ($site)" "FAIL" "$missing critical headers missing"
            fi
        else
            log_check "Security Headers ($site)" "SKIP" "Site not accessible"
        fi
    done
}

check_security_headers

echo ""
echo -e "${YELLOW}6. Validating Dependencies...${NC}"
echo "------------------------------"

# Check for vulnerable dependencies
check_dependencies() {
    echo "Scanning for vulnerable dependencies..."

    if command -v npm &>/dev/null; then
        local npm_vulns=$(npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities.total' || echo "0")

        if [[ $npm_vulns -eq 0 ]]; then
            log_check "NPM Dependencies" "PASS" "No vulnerabilities found"
        else
            local critical=$(npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities.critical' || echo "0")
            local high=$(npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities.high' || echo "0")

            if [[ $critical -gt 0 ]]; then
                log_check "NPM Dependencies" "FAIL" "$critical critical vulnerabilities"
            elif [[ $high -gt 0 ]]; then
                log_check "NPM Dependencies" "WARN" "$high high vulnerabilities"
            else
                log_check "NPM Dependencies" "WARN" "$npm_vulns total vulnerabilities"
            fi
        fi
    else
        log_check "NPM Dependencies" "SKIP" "npm not available"
    fi
}

check_dependencies

# Generate summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                 VALIDATION SUMMARY                      ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

PASSED_CHECKS=$((TOTAL_CHECKS - FAILED_CHECKS))
PASS_RATE=$(echo "scale=1; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc)

echo -e "Total Checks: ${YELLOW}$TOTAL_CHECKS${NC}"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
echo -e "Pass Rate: ${YELLOW}${PASS_RATE}%${NC}"

# Update report with summary
jq --arg total "$TOTAL_CHECKS" \
   --arg passed "$PASSED_CHECKS" \
   --arg failed "$FAILED_CHECKS" \
   --arg rate "$PASS_RATE" \
   '.summary = {
       "total_checks": ($total | tonumber),
       "passed": ($passed | tonumber),
       "failed": ($failed | tonumber),
       "pass_rate": ($rate | tonumber)
   }' "$VALIDATION_REPORT" > "$VALIDATION_REPORT.tmp" && \
mv "$VALIDATION_REPORT.tmp" "$VALIDATION_REPORT"

echo ""
echo -e "Full report: ${YELLOW}$VALIDATION_REPORT${NC}"

if [[ $FAILED_CHECKS -gt 0 ]]; then
    echo ""
    echo -e "${RED}⚠️  VALIDATION FAILED - $FAILED_CHECKS checks did not pass${NC}"
    echo "Please review the failed checks and remediate before proceeding."
    exit 1
else
    echo ""
    echo -e "${GREEN}✅ ALL SECURITY VALIDATIONS PASSED${NC}"
    echo "Security remediations have been successfully validated."
    exit 0
fi
