#!/bin/bash

# Setup AWS Secrets Manager for Candlefish
# This script helps create and manage secrets securely

set -e

echo "Setting up AWS Secrets Manager..."

# Function to create or update a secret
create_secret() {
    local name=$1
    local value=$2
    local description=$3

    if aws secretsmanager describe-secret --secret-id "$name" 2>/dev/null; then
        echo "Updating secret: $name"
        aws secretsmanager update-secret \
            --secret-id "$name" \
            --secret-string "$value" \
            --description "$description"
    else
        echo "Creating secret: $name"
        aws secretsmanager create-secret \
            --name "$name" \
            --description "$description" \
            --secret-string "$value"
    fi
}

# Example usage (DO NOT COMMIT ACTUAL VALUES)
# create_secret "candlefish/paintbox/database-url" "postgres://..." "Paintbox database connection"
# create_secret "candlefish/paintbox/jwt-secret" "..." "JWT signing secret"
# create_secret "candlefish/paintbox/salesforce-client-id" "..." "Salesforce OAuth client ID"

echo "Secrets setup complete!"
echo "Remember to:"
echo "1. Never commit actual secret values"
echo "2. Use AWS IAM roles for authentication"
echo "3. Rotate secrets regularly"
echo "4. Monitor secret access in CloudTrail"
