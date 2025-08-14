#\!/bin/bash

# Set Fly.io secrets from AWS Secrets Manager
echo "Setting Fly.io secrets..."

# Get secrets from AWS
aws secretsmanager get-secret-value --secret-id paintbox/prod/all --region us-east-1 --query SecretString --output text > /tmp/secrets.json

# Parse and set each secret
flyctl secrets set -a paintbox-app \
  COMPANYCAM_API_KEY="$(jq -r '.COMPANYCAM_API_KEY' /tmp/secrets.json)" \
  COMPANYCAM_SECRET_KEY="$(jq -r '.COMPANYCAM_SECRET_KEY' /tmp/secrets.json)" \
  SALESFORCE_CLIENT_ID="$(jq -r '.SALESFORCE_CLIENT_ID' /tmp/secrets.json)" \
  SALESFORCE_CLIENT_SECRET="$(jq -r '.SALESFORCE_CLIENT_SECRET' /tmp/secrets.json)" \
  SALESFORCE_USERNAME="$(jq -r '.SALESFORCE_USERNAME' /tmp/secrets.json)" \
  SALESFORCE_PASSWORD="$(jq -r '.SALESFORCE_PASSWORD' /tmp/secrets.json)" \
  SALESFORCE_SECURITY_TOKEN="$(jq -r '.SALESFORCE_SECURITY_TOKEN' /tmp/secrets.json)" \
  DATABASE_URL="$(jq -r '.DATABASE_URL' /tmp/secrets.json)" \
  REDIS_URL="$(jq -r '.REDIS_URL' /tmp/secrets.json)" \
  NEXTAUTH_SECRET="$(jq -r '.NEXTAUTH_SECRET' /tmp/secrets.json)" \
  JWT_SECRET="$(jq -r '.JWT_SECRET' /tmp/secrets.json)" \
  ENCRYPTION_KEY="$(jq -r '.ENCRYPTION_KEY' /tmp/secrets.json)" \
  NEXTAUTH_URL="https://paintbox-app.fly.dev"

# Clean up
rm /tmp/secrets.json

echo "Secrets configured successfully\!"
