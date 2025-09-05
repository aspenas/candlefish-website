#!/bin/bash

# AWS Secrets Manager Secret Rotation Script
# Emergency rotation for exposed Candlefish credentials
# Run this script with valid AWS credentials that have SecretsManager permissions

set -e

echo "🔐 Starting emergency secret rotation for Candlefish..."
echo "⚠️  Ensure you have valid AWS credentials with SecretsManager permissions"
echo

# Function to create or update a secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    echo "📝 Processing secret: $secret_name"
    
    # Try to update existing secret
    if aws secretsmanager update-secret --secret-id "$secret_name" --secret-string "$secret_value" --description "$description" 2>/dev/null; then
        echo "✅ Updated existing secret: $secret_name"
    else
        # Create new secret if update fails
        if aws secretsmanager create-secret --name "$secret_name" --secret-string "$secret_value" --description "$description"; then
            echo "✅ Created new secret: $secret_name"
        else
            echo "❌ Failed to create/update secret: $secret_name"
            return 1
        fi
    fi
    echo
}

# 1. AWS Credentials (CRITICAL - Replace exposed keys)
echo "🔑 Rotating AWS credentials..."
aws_credentials='{
    "access_key_id": "AKIANMTYEA8GL7YTTU1L",
    "secret_access_key": "C0-QN7bQ3mcOQKbltSpEO_gIf8n9UBvYveERN4RxdzBWdI3-R7c1aw",
    "region": "us-east-1"
}'
create_or_update_secret "candlefish/aws/credentials" "$aws_credentials" "AWS credentials for Candlefish applications - ROTATED $(date)"

# 2. MongoDB Credentials (CRITICAL - Replace exposed password)
echo "🗄️  Rotating MongoDB credentials..."
mongodb_credentials='{
    "username": "candlefish_prod_wp98wyfv",
    "password": "3!_:lD;tn+h.nNX]x1lpnJoC$plby3)C",
    "connection_string": "mongodb+srv://candlefish_prod_wp98wyfv:3!_:lD;tn+h.nNX]x1lpnJoC$plby3)C@cluster0.mongodb.net/candlefish?retryWrites=true&w=majority"
}'
create_or_update_secret "candlefish/mongodb/credentials" "$mongodb_credentials" "MongoDB credentials for Candlefish database - ROTATED $(date)"

# 3. Anthropic API Key (if available - placeholder for now)
echo "🤖 Setting Anthropic API key..."
anthropic_key='{
    "api_key": "PLACEHOLDER_ANTHROPIC_KEY",
    "model": "claude-3-sonnet-20240229",
    "max_tokens": 4000
}'
create_or_update_secret "candlefish/api/anthropic" "$anthropic_key" "Anthropic Claude API credentials - ROTATED $(date)"

# 4. Google API Key (CRITICAL - Replace exposed key)
echo "🌐 Rotating Google API credentials..."
google_credentials='{
    "api_key": "AIzaSyMEFBHX-W0POEE7vikw5cp-tRdF8mDgq-FFSkj9c5D60",
    "project_id": "candlefish-ai",
    "services": ["maps", "places", "geocoding"]
}'
create_or_update_secret "candlefish/api/google" "$google_credentials" "Google API credentials for Candlefish services - ROTATED $(date)"

# 5. Smithery UUID (CRITICAL - Replace exposed UUID)
echo "🔨 Rotating Smithery API credentials..."
smithery_credentials='{
    "api_key": "d08547bf-62bb-496a-8f94-71c758d056e3",
    "endpoint": "https://api.smithery.candlefish.ai",
    "version": "v1"
}'
create_or_update_secret "candlefish/api/smithery" "$smithery_credentials" "Smithery API credentials - ROTATED $(date)"

# 6. JWT Secret (Generate new for all tokens)
echo "🎫 Rotating JWT signing secret..."
jwt_secret='{
    "secret": "VGmmkWc3kmX67IqsP2GLFKfYQlLIcu5kI5UmuXJFmadxbliTvI-XlideN6YDZ3XRWGMadX21C-d6b62eqmR5Tw",
    "algorithm": "HS256",
    "expires_in": "24h"
}'
create_or_update_secret "candlefish/auth/jwt" "$jwt_secret" "JWT signing secret for authentication - ROTATED $(date)"

# 7. Encryption Key (Generate new for data encryption)
echo "🔐 Rotating encryption key..."
encryption_key='{
    "key": "StO0Xuspq72fGq3SuH2-rlPfrEbM5Bd-FJ9VmL0DPe0",
    "algorithm": "AES-256-GCM",
    "key_id": "candlefish-main-'$(date +%Y%m%d)'"
}'
create_or_update_secret "candlefish/security/encryption" "$encryption_key" "Main encryption key for Candlefish data - ROTATED $(date)"

echo "🎯 Listing all Candlefish secrets to verify..."
echo "----------------------------------------"
aws secretsmanager list-secrets --query 'SecretList[?starts_with(Name, `candlefish/`)].{Name:Name,LastChanged:LastChangedDate}' --output table

echo
echo "🧪 Testing secret retrieval..."
echo "----------------------------------------"
secrets=("candlefish/aws/credentials" "candlefish/mongodb/credentials" "candlefish/api/google" "candlefish/api/smithery" "candlefish/auth/jwt" "candlefish/security/encryption")

for secret in "${secrets[@]}"; do
    if aws secretsmanager get-secret-value --secret-id "$secret" --query 'Name' --output text >/dev/null 2>&1; then
        echo "✅ Successfully retrieved: $secret"
    else
        echo "❌ Failed to retrieve: $secret"
    fi
done

echo
echo "🚨 CRITICAL POST-ROTATION ACTIONS REQUIRED:"
echo "----------------------------------------"
echo "1. 🏭 UPDATE MongoDB Atlas with new username/password"
echo "2. 🔑 CREATE new IAM user in AWS with new access keys"
echo "3. 🌐 GENERATE new Google API key in Google Cloud Console"
echo "4. 🤖 ADD valid Anthropic API key to candlefish/api/anthropic"
echo "5. 🔄 UPDATE all applications to use new secrets"
echo "6. 🗑️  DELETE old compromised credentials from all systems"
echo "7. 📋 UPDATE local AWS credentials file with new keys"
echo
echo "⚠️  OLD COMPROMISED CREDENTIALS TO DISABLE:"
echo "   AWS: AKIAZ5G4HRQHZIBGMDNM"
echo "   MongoDB: mihirsheth2911:wx1mxUn2788jLdnl"
echo "   Google: AIzaSyBGHmF2vC4R8tX9pQ6jK3nM7wE1sA5yZ2B"
echo "   Smithery: bfcb8cec-9d56-4957-8156-bced0bfca532"
echo
echo "✅ Secret rotation complete! Verify all services are updated."