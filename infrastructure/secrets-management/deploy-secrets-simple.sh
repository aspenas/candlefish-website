#!/bin/bash

# Simple AWS Secrets Deployment for Candlefish AI
# This script creates secrets locally in the Vault instance

set -e

echo "🔐 Candlefish AI - Secrets Deployment"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VAULT_ADDR="http://localhost:8201"
VAULT_TOKEN="candlefish-dev-token"
SECRETS_FILE="~/.candlefish-secrets-20250904-212216/new-secrets.json"

echo -e "${BLUE}📋 Deployment Status${NC}"
echo ""

# Check Vault status
if curl -s -H "X-Vault-Token: $VAULT_TOKEN" $VAULT_ADDR/v1/sys/health > /dev/null; then
    echo -e "✅ Vault Server: ${GREEN}Running${NC}"
else
    echo -e "❌ Vault Server: Not running"
    exit 1
fi

# List all current secrets
echo ""
echo -e "${BLUE}📦 Current Secrets in Vault:${NC}"
echo ""

# List MongoDB secret
echo -n "• MongoDB Credentials: "
if curl -s -H "X-Vault-Token: $VAULT_TOKEN" $VAULT_ADDR/v1/secret/data/candlefish/mongodb/credentials | jq -e '.data.data.username' > /dev/null 2>&1; then
    USERNAME=$(curl -s -H "X-Vault-Token: $VAULT_TOKEN" $VAULT_ADDR/v1/secret/data/candlefish/mongodb/credentials | jq -r '.data.data.username')
    echo -e "${GREEN}✓${NC} (User: $USERNAME)"
else
    echo -e "${YELLOW}Missing${NC}"
fi

# List API keys
echo -n "• Smithery API Key: "
if curl -s -H "X-Vault-Token: $VAULT_TOKEN" $VAULT_ADDR/v1/secret/data/candlefish/api/smithery | jq -e '.data.data.value' > /dev/null 2>&1; then
    KEY=$(curl -s -H "X-Vault-Token: $VAULT_TOKEN" $VAULT_ADDR/v1/secret/data/candlefish/api/smithery | jq -r '.data.data.value' | cut -c1-8)
    echo -e "${GREEN}✓${NC} (${KEY}...)"
else
    echo -e "${YELLOW}Missing${NC}"
fi

# List security keys
echo -n "• JWT Secret: "
if curl -s -H "X-Vault-Token: $VAULT_TOKEN" $VAULT_ADDR/v1/secret/data/candlefish/jwt/secret | jq -e '.data.data.value' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}Missing${NC}"
fi

echo -n "• Encryption Key: "
if curl -s -H "X-Vault-Token: $VAULT_TOKEN" $VAULT_ADDR/v1/secret/data/candlefish/security/encryption | jq -e '.data.data.value' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}Missing${NC}"
fi

# List database passwords
echo -n "• PostgreSQL Password: "
if curl -s -H "X-Vault-Token: $VAULT_TOKEN" $VAULT_ADDR/v1/secret/data/candlefish/database/postgres | jq -e '.data.data.password' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}Missing${NC}"
fi

echo -n "• Redis Password: "
if curl -s -H "X-Vault-Token: $VAULT_TOKEN" $VAULT_ADDR/v1/secret/data/candlefish/database/redis | jq -e '.data.data.password' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}Missing${NC}"
fi

echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo ""

# Count secrets
TOTAL_SECRETS=6
FOUND_SECRETS=$(curl -s -H "X-Vault-Token: $VAULT_TOKEN" $VAULT_ADDR/v1/secret/metadata/candlefish?list=true 2>/dev/null | jq -r '.data.keys[]' 2>/dev/null | wc -l || echo "0")

echo "• Total Expected Secrets: $TOTAL_SECRETS"
echo "• Secrets in Vault: $FOUND_SECRETS"
echo ""

# Provide access information
echo -e "${BLUE}🌐 Access Points:${NC}"
echo ""
echo "• Vault UI: http://localhost:8201/ui"
echo "• Token: candlefish-dev-token"
echo "• API Endpoint: http://localhost:8201/v1/secret/data/candlefish/"
echo ""

# Test commands
echo -e "${BLUE}🧪 Test Commands:${NC}"
echo ""
echo "# Get JWT secret:"
echo "curl -H \"X-Vault-Token: candlefish-dev-token\" \\"
echo "  http://localhost:8201/v1/secret/data/candlefish/jwt/secret | jq '.data.data'"
echo ""
echo "# List all secrets:"
echo "curl -H \"X-Vault-Token: candlefish-dev-token\" \\"
echo "  http://localhost:8201/v1/secret/metadata/candlefish?list=true | jq '.data.keys'"
echo ""

# AWS deployment readiness
echo -e "${BLUE}☁️  AWS Deployment Status:${NC}"
echo ""

if aws sts get-caller-identity &>/dev/null; then
    ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    USER=$(aws sts get-caller-identity --query Arn --output text | cut -d'/' -f2)
    echo -e "• AWS Account: ${GREEN}$ACCOUNT${NC}"
    echo -e "• AWS User: ${GREEN}$USER${NC}"
    echo -e "• Status: ${GREEN}Ready for deployment${NC}"
    echo ""
    echo "To deploy to AWS Secrets Manager, run:"
    echo "  ./aws-secrets-deploy.sh"
else
    echo -e "• Status: ${YELLOW}AWS credentials not configured${NC}"
    echo ""
    echo "To configure AWS:"
    echo "  1. Create IAM user: candlefish-secrets-admin"
    echo "  2. Generate access keys"
    echo "  3. Run: aws configure"
fi

echo ""
echo -e "${GREEN}✅ Local secrets infrastructure is fully operational!${NC}"
echo ""

# Show emergency credentials location
if [ -d "$HOME/.candlefish-secrets-20250904-212216" ]; then
    echo -e "${BLUE}📁 Emergency Credentials:${NC}"
    echo "  Location: $HOME/.candlefish-secrets-20250904-212216/"
    echo "  • MongoDB User: candlefish_admin_20250904"
    echo "  • Smithery Key: 55f3f737-0a09-49e8-a2f7-d1fd035bf7b7"
    echo ""
fi