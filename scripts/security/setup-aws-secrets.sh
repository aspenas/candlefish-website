#!/bin/bash

# AWS Secrets Manager Setup Script
# This script creates and configures secrets in AWS Secrets Manager

set -e

echo "🔐 Setting up AWS Secrets Manager for Candlefish AI..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
        exit 1
    fi
}

# Function to check AWS credentials
check_aws_credentials() {
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}AWS credentials not configured. Please configure AWS CLI.${NC}"
        exit 1
    fi
}

# Function to create or update a secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id "$secret_name" &> /dev/null; then
        echo -e "${YELLOW}Updating existing secret: $secret_name${NC}"
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --description "$description"
    else
        echo -e "${GREEN}Creating new secret: $secret_name${NC}"
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --description "$description" \
            --secret-string "$secret_value"
    fi
}

# Function to generate a random password
generate_password() {
    openssl rand -base64 32
}

# Main execution
check_aws_cli
check_aws_credentials

echo "📝 Creating/Updating AWS Secrets..."

# AWS Credentials (for Terraform)
echo "Enter new AWS Access Key ID (or press Enter to skip):"
read -r AWS_ACCESS_KEY
if [ -n "$AWS_ACCESS_KEY" ]; then
    echo "Enter new AWS Secret Access Key:"
    read -rs AWS_SECRET_KEY
    
    create_or_update_secret \
        "candlefish/aws/credentials" \
        "{\"access_key_id\":\"$AWS_ACCESS_KEY\",\"secret_access_key\":\"$AWS_SECRET_KEY\"}" \
        "AWS credentials for Candlefish infrastructure"
fi

# MongoDB Credentials
echo -e "\n${YELLOW}Generating new MongoDB password...${NC}"
MONGO_PASSWORD=$(generate_password)
echo "Enter MongoDB username (default: candlefish_admin):"
read -r MONGO_USER
MONGO_USER=${MONGO_USER:-candlefish_admin}

create_or_update_secret \
    "candlefish/mongodb/credentials" \
    "{\"username\":\"$MONGO_USER\",\"password\":\"$MONGO_PASSWORD\",\"uri\":\"mongodb+srv://$MONGO_USER:$MONGO_PASSWORD@cluster0.mongodb.net/?retryWrites=true&w=majority\"}" \
    "MongoDB Atlas credentials for Candlefish"

# API Keys
echo -e "\n${YELLOW}Setting up API keys...${NC}"

# Anthropic API Key
echo "Enter Anthropic API Key (or press Enter to skip):"
read -rs ANTHROPIC_KEY
if [ -n "$ANTHROPIC_KEY" ]; then
    create_or_update_secret \
        "candlefish/api/anthropic" \
        "{\"api_key\":\"$ANTHROPIC_KEY\"}" \
        "Anthropic Claude API key"
fi

# Google API Key
echo "Enter Google API Key (or press Enter to generate placeholder):"
read -rs GOOGLE_KEY
if [ -n "$GOOGLE_KEY" ]; then
    create_or_update_secret \
        "candlefish/api/google" \
        "{\"api_key\":\"$GOOGLE_KEY\"}" \
        "Google API key for Firebase services"
fi

# Smithery API Key
echo -e "\n${YELLOW}Generating new Smithery API key...${NC}"
SMITHERY_KEY=$(uuidgen | tr '[:upper:]' '[:lower:]')
create_or_update_secret \
    "candlefish/api/smithery" \
    "{\"api_key\":\"$SMITHERY_KEY\"}" \
    "Smithery API key"

# JWT Secret
echo -e "\n${YELLOW}Generating JWT secret...${NC}"
JWT_SECRET=$(generate_password)
create_or_update_secret \
    "candlefish/auth/jwt" \
    "{\"secret\":\"$JWT_SECRET\"}" \
    "JWT signing secret"

# Encryption Key
echo -e "\n${YELLOW}Generating encryption key...${NC}"
ENCRYPTION_KEY=$(generate_password)
create_or_update_secret \
    "candlefish/security/encryption" \
    "{\"key\":\"$ENCRYPTION_KEY\"}" \
    "Data encryption key"

echo -e "\n${GREEN}✅ Secrets successfully created/updated in AWS Secrets Manager!${NC}"

# Output summary
echo -e "\n📋 Secret ARNs created:"
aws secretsmanager list-secrets --query "SecretList[?contains(Name, 'candlefish/')].{Name:Name, ARN:ARN}" --output table

echo -e "\n${YELLOW}⚠️  Important: Save the generated passwords securely!${NC}"
echo "MongoDB Password: $MONGO_PASSWORD"
echo "Smithery API Key: $SMITHERY_KEY"
echo "JWT Secret: [stored in AWS Secrets Manager]"
echo "Encryption Key: [stored in AWS Secrets Manager]"

echo -e "\n${GREEN}Next steps:${NC}"
echo "1. Update your applications to use AWS Secrets Manager SDK"
echo "2. Remove any hardcoded credentials from your codebase"
echo "3. Rotate these secrets regularly (recommended: every 90 days)"
echo "4. Set up automatic rotation if possible"