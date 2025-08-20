#!/bin/bash

# AWS IAM Permission Fix Script for Paintbox Fly.io Deployment
# This script creates/updates IAM policies to grant proper Secrets Manager access

set -e

echo "=================================================="
echo "AWS IAM Permissions Fix for Paintbox"
echo "=================================================="

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
IAM_USER_NAME="paintbox-fly-user"
POLICY_NAME="PaintboxSecretsManagerAccess"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "Configuration:"
echo "  Region: $AWS_REGION"
echo "  IAM User: $IAM_USER_NAME"
echo "  Policy Name: $POLICY_NAME"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check AWS credentials
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}Error: AWS credentials not configured or invalid${NC}"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✓ Connected to AWS Account: $ACCOUNT_ID${NC}"
echo ""

# Create IAM policy document
cat > /tmp/paintbox-secrets-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowSecretsManagerRead",
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret",
                "secretsmanager:ListSecrets"
            ],
            "Resource": [
                "arn:aws:secretsmanager:*:${ACCOUNT_ID}:secret:paintbox/*"
            ]
        },
        {
            "Sid": "AllowListAllSecrets",
            "Effect": "Allow",
            "Action": [
                "secretsmanager:ListSecrets"
            ],
            "Resource": "*"
        }
    ]
}
EOF

echo "IAM Policy Document created:"
cat /tmp/paintbox-secrets-policy.json
echo ""

# Check if user exists
echo "Checking if IAM user exists..."
if aws iam get-user --user-name "$IAM_USER_NAME" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ IAM user '$IAM_USER_NAME' exists${NC}"
else
    echo -e "${YELLOW}Creating IAM user '$IAM_USER_NAME'...${NC}"
    aws iam create-user --user-name "$IAM_USER_NAME"
    echo -e "${GREEN}✓ IAM user created${NC}"
fi
echo ""

# Check if policy exists and update/create it
echo "Checking IAM policy..."
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"

if aws iam get-policy --policy-arn "$POLICY_ARN" > /dev/null 2>&1; then
    echo -e "${YELLOW}Policy exists, creating new version...${NC}"
    
    # Get current policy versions
    VERSIONS=$(aws iam list-policy-versions --policy-arn "$POLICY_ARN" --query 'Versions[?!IsDefaultVersion].VersionId' --output text)
    
    # Delete old versions if there are 5 (max allowed)
    VERSION_COUNT=$(echo "$VERSIONS" | wc -w)
    if [ "$VERSION_COUNT" -ge 4 ]; then
        OLDEST_VERSION=$(echo "$VERSIONS" | awk '{print $1}')
        echo "Deleting old policy version: $OLDEST_VERSION"
        aws iam delete-policy-version --policy-arn "$POLICY_ARN" --version-id "$OLDEST_VERSION"
    fi
    
    # Create new policy version
    aws iam create-policy-version \
        --policy-arn "$POLICY_ARN" \
        --policy-document file:///tmp/paintbox-secrets-policy.json \
        --set-as-default
    echo -e "${GREEN}✓ Policy updated with new version${NC}"
else
    echo -e "${YELLOW}Creating new IAM policy...${NC}"
    aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document file:///tmp/paintbox-secrets-policy.json \
        --description "Allows Paintbox application to read secrets from AWS Secrets Manager"
    echo -e "${GREEN}✓ Policy created${NC}"
fi
echo ""

# Attach policy to user
echo "Attaching policy to user..."
aws iam attach-user-policy \
    --user-name "$IAM_USER_NAME" \
    --policy-arn "$POLICY_ARN"
echo -e "${GREEN}✓ Policy attached to user${NC}"
echo ""

# List current access keys
echo "Current access keys for user:"
aws iam list-access-keys --user-name "$IAM_USER_NAME" --output table
echo ""

# Offer to create new access keys
echo -e "${YELLOW}Do you want to create new access keys for Fly.io? (y/n)${NC}"
read -r CREATE_KEYS

if [[ "$CREATE_KEYS" == "y" || "$CREATE_KEYS" == "Y" ]]; then
    echo "Creating new access keys..."
    
    # Create new access key
    KEY_OUTPUT=$(aws iam create-access-key --user-name "$IAM_USER_NAME")
    
    ACCESS_KEY_ID=$(echo "$KEY_OUTPUT" | jq -r '.AccessKey.AccessKeyId')
    SECRET_ACCESS_KEY=$(echo "$KEY_OUTPUT" | jq -r '.AccessKey.SecretAccessKey')
    
    echo ""
    echo -e "${GREEN}✓ New access keys created${NC}"
    echo ""
    echo "=================================================="
    echo "NEW AWS CREDENTIALS FOR FLY.IO"
    echo "=================================================="
    echo ""
    echo "Add these to your Fly.io secrets:"
    echo ""
    echo "flyctl secrets set -a paintbox \\"
    echo "  AWS_ACCESS_KEY_ID=\"$ACCESS_KEY_ID\" \\"
    echo "  AWS_SECRET_ACCESS_KEY=\"$SECRET_ACCESS_KEY\" \\"
    echo "  AWS_REGION=\"$AWS_REGION\""
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Save these credentials securely!${NC}"
    echo -e "${YELLOW}The secret access key will not be shown again.${NC}"
    echo ""
    
    # Save to a temporary file
    cat > /tmp/paintbox-fly-credentials.txt <<EOF
AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY
AWS_REGION=$AWS_REGION

# To set in Fly.io:
flyctl secrets set -a paintbox \\
  AWS_ACCESS_KEY_ID="$ACCESS_KEY_ID" \\
  AWS_SECRET_ACCESS_KEY="$SECRET_ACCESS_KEY" \\
  AWS_REGION="$AWS_REGION"
EOF
    
    echo "Credentials also saved to: /tmp/paintbox-fly-credentials.txt"
    echo "(Delete this file after updating Fly.io)"
else
    echo "Skipping access key creation."
    echo ""
    echo "To update Fly.io with existing credentials, run:"
    echo ""
    echo "flyctl secrets set -a paintbox \\"
    echo "  AWS_ACCESS_KEY_ID=\"YOUR_ACCESS_KEY\" \\"
    echo "  AWS_SECRET_ACCESS_KEY=\"YOUR_SECRET_KEY\" \\"
    echo "  AWS_REGION=\"$AWS_REGION\""
fi

echo ""
echo "=================================================="
echo "Testing Permissions"
echo "=================================================="

# Test secret access
echo "Testing access to paintbox secrets..."
if aws secretsmanager get-secret-value --secret-id "paintbox/production/jwt/public-keys" --region "$AWS_REGION" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Can access paintbox/production/jwt/public-keys${NC}"
else
    echo -e "${RED}✗ Cannot access paintbox/production/jwt/public-keys${NC}"
    echo "  Check that the secret exists and permissions are correct"
fi

# Clean up
rm -f /tmp/paintbox-secrets-policy.json

echo ""
echo "=================================================="
echo -e "${GREEN}IAM configuration complete!${NC}"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Update Fly.io secrets with the AWS credentials"
echo "2. Redeploy the application: flyctl deploy -a paintbox"
echo "3. Test the JWKS endpoint: curl https://paintbox.fly.dev/.well-known/jwks.json"
echo ""