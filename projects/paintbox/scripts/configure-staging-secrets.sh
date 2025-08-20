#!/bin/bash
set -e

echo "🔐 Configuring staging secrets for Paintbox..."

# Get existing Salesforce credentials
SALESFORCE_CREDS=$(aws secretsmanager get-secret-value --secret-id "paintbox/salesforce" --query SecretString --output text 2>/dev/null || echo "{}")

# Get existing CompanyCam credentials
COMPANYCAM_CREDS=$(aws secretsmanager get-secret-value --secret-id "paintbox/companycam" --query SecretString --output text 2>/dev/null || echo "{}")

# Get JWT secret
JWT_SECRET=$(aws secretsmanager get-secret-value --secret-id "paintbox/jwt-secret" --query SecretString --output text 2>/dev/null || echo "{}")

# Create staging configuration
cat > /tmp/paintbox-staging-config.json << EOJSON
{
  "NODE_ENV": "staging",
  "NEXT_PUBLIC_API_URL": "https://paintbox.fly.dev",
  "SALESFORCE_CLIENT_ID": $(echo "$SALESFORCE_CREDS" | jq -r '.client_id // empty' | jq -Rs .),
  "SALESFORCE_CLIENT_SECRET": $(echo "$SALESFORCE_CREDS" | jq -r '.client_secret // empty' | jq -Rs .),
  "SALESFORCE_USERNAME": $(echo "$SALESFORCE_CREDS" | jq -r '.username // empty' | jq -Rs .),
  "SALESFORCE_PASSWORD": $(echo "$SALESFORCE_CREDS" | jq -r '.password // empty' | jq -Rs .),
  "SALESFORCE_SECURITY_TOKEN": $(echo "$SALESFORCE_CREDS" | jq -r '.security_token // empty' | jq -Rs .),
  "SALESFORCE_INSTANCE_URL": "https://test.salesforce.com",
  "COMPANYCAM_API_KEY": $(echo "$COMPANYCAM_CREDS" | jq -r '.api_key // empty' | jq -Rs .),
  "COMPANYCAM_SECRET_KEY": $(echo "$COMPANYCAM_CREDS" | jq -r '.secret_key // empty' | jq -Rs .),
  "JWT_SECRET": $(echo "$JWT_SECRET" | jq -Rs .),
  "DATABASE_URL": "postgresql://paintbox:paintbox@localhost:5432/paintbox_staging",
  "REDIS_URL": "redis://localhost:6379",
  "SENTRY_DSN": "",
  "MONITORING_ENABLED": "true",
  "RATE_LIMIT_ENABLED": "true"
}
EOJSON

# Create or update staging secret
echo "📤 Uploading staging configuration to AWS Secrets Manager..."
aws secretsmanager create-secret \
  --name "paintbox/staging/config" \
  --description "Paintbox staging environment configuration" \
  --secret-string file:///tmp/paintbox-staging-config.json 2>/dev/null || \
aws secretsmanager update-secret \
  --secret-id "paintbox/staging/config" \
  --secret-string file:///tmp/paintbox-staging-config.json

# Create Fly.io secrets file
echo "🚀 Creating Fly.io secrets configuration..."
cat > /tmp/fly-secrets.sh << 'EOSH'
#!/bin/bash
# Set secrets in Fly.io
CONFIG=$(aws secretsmanager get-secret-value --secret-id "paintbox/staging/config" --query SecretString --output text)

echo "$CONFIG" | jq -r 'to_entries[] | "fly secrets set \(.key)=\"\(.value)\" --app paintbox"' | while read cmd; do
  echo "Setting: $(echo $cmd | cut -d' ' -f4 | cut -d'=' -f1)"
  eval "$cmd" 2>/dev/null || true
done
EOSH

chmod +x /tmp/fly-secrets.sh

echo "✅ Staging secrets configuration created successfully!"
echo ""
echo "To apply secrets to Fly.io, run:"
echo "  /tmp/fly-secrets.sh"
echo ""
echo "Secret stored at: paintbox/staging/config"

# Clean up sensitive file
rm -f /tmp/paintbox-staging-config.json
