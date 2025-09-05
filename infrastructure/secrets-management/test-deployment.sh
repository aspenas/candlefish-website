#!/bin/bash

# Candlefish AI - AWS Secrets Manager Deployment Test
# Verifies that secrets are properly deployed and accessible

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"
FAILED_TESTS=0
PASSED_TESTS=0

echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}     AWS Secrets Manager - Deployment Verification${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Function to test a secret
test_secret() {
    local secret_name=$1
    local secret_full_path="candlefish/$ENVIRONMENT/$secret_name"
    
    echo -n "Testing $secret_name... "
    
    if aws secretsmanager get-secret-value \
        --secret-id "$secret_full_path" \
        --region "$REGION" \
        --query 'SecretString' \
        --output text &> /dev/null; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAILED_TESTS++))
    fi
}

# Check AWS credentials
echo -e "${CYAN}Checking AWS credentials...${NC}"
if aws sts get-caller-identity &> /dev/null; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✓ AWS Account: $ACCOUNT_ID${NC}"
else
    echo -e "${RED}✗ AWS credentials not configured${NC}"
    echo "Please run: aws configure"
    exit 1
fi

echo ""
echo -e "${CYAN}Testing deployed secrets...${NC}"
echo "Region: $REGION"
echo "Environment: $ENVIRONMENT"
echo ""

# Test each secret
test_secret "mongodb/credentials"
test_secret "api/smithery"
test_secret "api/google"
test_secret "security/jwt"
test_secret "security/encryption"
test_secret "database/postgres"
test_secret "database/redis"

echo ""
echo -e "${CYAN}Testing KMS key...${NC}"
KMS_ALIAS="alias/candlefish-secrets-$ENVIRONMENT"
if aws kms describe-key --key-id "$KMS_ALIAS" --region "$REGION" &> /dev/null; then
    echo -e "${GREEN}✓ KMS key exists: $KMS_ALIAS${NC}"
    ((PASSED_TESTS++))
    
    # Check if rotation is enabled
    if aws kms get-key-rotation-status --key-id "$KMS_ALIAS" --region "$REGION" \
        --query 'KeyRotationEnabled' --output text | grep -q "true"; then
        echo -e "${GREEN}✓ KMS key rotation enabled${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${YELLOW}⚠ KMS key rotation not enabled${NC}"
    fi
else
    echo -e "${RED}✗ KMS key not found${NC}"
    ((FAILED_TESTS++))
fi

echo ""
echo -e "${CYAN}Testing IAM resources...${NC}"
IAM_USER="candlefish-secrets-admin"
if aws iam get-user --user-name "$IAM_USER" &> /dev/null; then
    echo -e "${GREEN}✓ IAM user exists: $IAM_USER${NC}"
    ((PASSED_TESTS++))
else
    echo -e "${YELLOW}⚠ IAM user not found: $IAM_USER${NC}"
fi

echo ""
echo -e "${CYAN}Testing CloudWatch monitoring...${NC}"
if aws cloudwatch describe-alarms \
    --alarm-names "candlefish-secret-rotation-failed" \
    --region "$REGION" &> /dev/null; then
    echo -e "${GREEN}✓ CloudWatch alarms configured${NC}"
    ((PASSED_TESTS++))
else
    echo -e "${YELLOW}⚠ CloudWatch alarms not configured${NC}"
fi

echo ""
echo -e "${CYAN}Testing secret retrieval with JSON parsing...${NC}"
JWT_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id "candlefish/$ENVIRONMENT/security/jwt" \
    --region "$REGION" \
    --query 'SecretString' \
    --output text 2>/dev/null | jq -r '.secret' 2>/dev/null || echo "")

if [[ -n "$JWT_SECRET" ]]; then
    echo -e "${GREEN}✓ Successfully retrieved and parsed JWT secret${NC}"
    echo "  Secret length: ${#JWT_SECRET} characters"
    ((PASSED_TESTS++))
else
    echo -e "${RED}✗ Failed to retrieve or parse JWT secret${NC}"
    ((FAILED_TESTS++))
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                    Test Results${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [[ $FAILED_TESTS -eq 0 ]]; then
    echo -e "${GREEN}✓ All tests passed! Deployment successful.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed. Please review deployment.${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Ensure AWS credentials are configured: aws configure"
    echo "2. Check the correct region: export AWS_REGION=$REGION"
    echo "3. Verify deployment was completed: ./DEPLOY_NOW.sh"
    echo "4. Check CloudWatch logs for errors"
    exit 1
fi