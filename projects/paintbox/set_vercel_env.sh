#\!/bin/bash

# Get secrets from AWS
SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id paintbox/secrets --query SecretString --output text)

# CompanyCam
echo "$SECRET_JSON" | jq -r '.companyCam.apiToken' | vercel env add COMPANYCAM_API_TOKEN production --force
echo "$SECRET_JSON" | jq -r '.companyCam.webhookSecret' | vercel env add COMPANYCAM_WEBHOOK_SECRET production --force
echo "$SECRET_JSON" | jq -r '.companyCam.companyId' | vercel env add COMPANYCAM_COMPANY_ID production --force

# Salesforce
echo "$SECRET_JSON" | jq -r '.salesforce.clientId' | vercel env add SALESFORCE_CLIENT_ID production --force
echo "$SECRET_JSON" | jq -r '.salesforce.clientSecret' | vercel env add SALESFORCE_CLIENT_SECRET production --force
echo "$SECRET_JSON" | jq -r '.salesforce.username' | vercel env add SALESFORCE_USERNAME production --force
echo "$SECRET_JSON" | jq -r '.salesforce.password' | vercel env add SALESFORCE_PASSWORD production --force
echo "$SECRET_JSON" | jq -r '.salesforce.securityToken' | vercel env add SALESFORCE_SECURITY_TOKEN production --force
echo "$SECRET_JSON" | jq -r '.salesforce.loginUrl' | vercel env add SALESFORCE_LOGIN_URL production --force
echo "$SECRET_JSON" | jq -r '.salesforce.webhookSecret' | vercel env add SALESFORCE_WEBHOOK_SECRET production --force

# Redis
echo "$SECRET_JSON" | jq -r '.redis.url' | vercel env add REDIS_URL production --force

# Encryption
echo "$SECRET_JSON" | jq -r '.encryption.secretKey' | vercel env add ENCRYPTION_KEY production --force

# Sentry
echo "$SECRET_JSON" | jq -r '.sentry.dsn' | vercel env add SENTRY_DSN production --force

# Next Auth
echo "$SECRET_JSON" | jq -r '.encryption.jwtSecret' | vercel env add NEXTAUTH_SECRET production --force
echo "https://paintbox.vercel.app" | vercel env add NEXTAUTH_URL production --force

# API URL
echo "https://paintbox.vercel.app" | vercel env add NEXT_PUBLIC_API_URL production --force

echo "All environment variables set successfully\!"
