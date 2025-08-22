#!/bin/bash
# Script to retrieve Resend API key from AWS Secrets Manager

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Retrieving Resend API key from AWS Secrets Manager...${NC}"

# Get the secret
API_KEY=$(aws secretsmanager get-secret-value \
  --secret-id "candlefish/resend/api-key" \
  --query SecretString \
  --output text \
  --region us-east-1 | jq -r '.api_key')

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ API Key retrieved successfully${NC}"
  echo ""
  echo "RESEND_API_KEY=$API_KEY"
  echo ""
  echo "To set in Netlify:"
  echo "netlify env:set RESEND_API_KEY \"$API_KEY\""
else
  echo "Failed to retrieve API key from AWS Secrets Manager"
  exit 1
fi
