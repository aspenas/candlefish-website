#!/bin/bash

# Emergency Local Secret Generation Script
# This generates all new secrets locally until AWS access is restored

set -e

echo "🚨 EMERGENCY SECRET ROTATION - LOCAL GENERATION"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Create secrets directory
SECRETS_DIR="$HOME/.candlefish-secrets-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

echo -e "${CYAN}📁 Creating secure secrets in: $SECRETS_DIR${NC}"
echo ""

# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to generate UUID
generate_uuid() {
    python3 -c "import uuid; print(str(uuid.uuid4()))"
}

# Generate all new secrets
echo -e "${YELLOW}🔐 Generating new secure credentials...${NC}"
echo ""

# AWS Credentials (placeholder - needs manual creation)
NEW_AWS_ACCESS_KEY="AKIA_PLACEHOLDER_$(date +%s)"
NEW_AWS_SECRET_KEY="$(generate_password)"

# MongoDB Credentials
MONGO_USERNAME="candlefish_admin_$(date +%Y%m%d)"
MONGO_PASSWORD="$(generate_password)"
MONGO_URI="mongodb+srv://${MONGO_USERNAME}:${MONGO_PASSWORD}@cluster0.mongodb.net/?retryWrites=true&w=majority"

# API Keys
SMITHERY_API_KEY="$(generate_uuid)"
GOOGLE_API_KEY="AIza_PLACEHOLDER_$(generate_password | cut -c1-20)"
JWT_SECRET="$(generate_password)"
ENCRYPTION_KEY="$(generate_password)"

# PostgreSQL
POSTGRES_PASSWORD="$(generate_password)"
REDIS_PASSWORD="$(generate_password)"

# Save to JSON file
cat > "$SECRETS_DIR/new-secrets.json" <<EOF
{
  "aws": {
    "access_key_id": "${NEW_AWS_ACCESS_KEY}",
    "secret_access_key": "${NEW_AWS_SECRET_KEY}",
    "note": "AWS keys are placeholders - create real ones in IAM console"
  },
  "mongodb": {
    "username": "${MONGO_USERNAME}",
    "password": "${MONGO_PASSWORD}",
    "uri": "${MONGO_URI}"
  },
  "api_keys": {
    "smithery": "${SMITHERY_API_KEY}",
    "google": "${GOOGLE_API_KEY}",
    "anthropic": "PLACEHOLDER - get from Anthropic console"
  },
  "security": {
    "jwt_secret": "${JWT_SECRET}",
    "encryption_key": "${ENCRYPTION_KEY}"
  },
  "databases": {
    "postgres_password": "${POSTGRES_PASSWORD}",
    "redis_password": "${REDIS_PASSWORD}"
  },
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

# Create .env file with new secrets
cat > "$SECRETS_DIR/.env.new" <<EOF
# Generated $(date)
# EMERGENCY ROTATION - Use these after updating external services

# AWS (create new IAM user and replace)
AWS_ACCESS_KEY_ID=${NEW_AWS_ACCESS_KEY}
AWS_SECRET_ACCESS_KEY=${NEW_AWS_SECRET_KEY}
AWS_DEFAULT_REGION=us-east-1

# MongoDB
MONGODB_URI=${MONGO_URI}
MONGODB_USERNAME=${MONGO_USERNAME}
MONGODB_PASSWORD=${MONGO_PASSWORD}

# API Keys
SMITHERY_API_KEY=${SMITHERY_API_KEY}
GOOGLE_API_KEY=${GOOGLE_API_KEY}
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY_HERE

# Security
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Databases
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
EOF

# Create AWS CLI commands for when access is restored
cat > "$SECRETS_DIR/aws-commands.sh" <<'AWSCMD'
#!/bin/bash

# Run these commands when you have valid AWS credentials

echo "Creating secrets in AWS Secrets Manager..."

# MongoDB
aws secretsmanager create-secret \
  --name candlefish/mongodb/credentials \
  --secret-string "{\"username\":\"${MONGO_USERNAME}\",\"password\":\"${MONGO_PASSWORD}\",\"uri\":\"${MONGO_URI}\"}" \
  --region us-east-1 || \
aws secretsmanager update-secret \
  --secret-id candlefish/mongodb/credentials \
  --secret-string "{\"username\":\"${MONGO_USERNAME}\",\"password\":\"${MONGO_PASSWORD}\",\"uri\":\"${MONGO_URI}\"}" \
  --region us-east-1

# Smithery
aws secretsmanager create-secret \
  --name candlefish/api/smithery \
  --secret-string "{\"api_key\":\"${SMITHERY_API_KEY}\"}" \
  --region us-east-1 || \
aws secretsmanager update-secret \
  --secret-id candlefish/api/smithery \
  --secret-string "{\"api_key\":\"${SMITHERY_API_KEY}\"}" \
  --region us-east-1

# JWT
aws secretsmanager create-secret \
  --name candlefish/auth/jwt \
  --secret-string "{\"secret\":\"${JWT_SECRET}\"}" \
  --region us-east-1 || \
aws secretsmanager update-secret \
  --secret-id candlefish/auth/jwt \
  --secret-string "{\"secret\":\"${JWT_SECRET}\"}" \
  --region us-east-1

# Encryption
aws secretsmanager create-secret \
  --name candlefish/security/encryption \
  --secret-string "{\"key\":\"${ENCRYPTION_KEY}\"}" \
  --region us-east-1 || \
aws secretsmanager update-secret \
  --secret-id candlefish/security/encryption \
  --secret-string "{\"key\":\"${ENCRYPTION_KEY}\"}" \
  --region us-east-1

echo "✅ Secrets created/updated in AWS"
AWSCMD

chmod +x "$SECRETS_DIR/aws-commands.sh"

# Create instructions
cat > "$SECRETS_DIR/INSTRUCTIONS.md" <<EOF
# Emergency Secret Rotation Instructions

Generated: $(date)
Location: $SECRETS_DIR

## 🚨 IMMEDIATE ACTIONS REQUIRED

### 1. AWS IAM Console
1. Log into AWS Console: https://console.aws.amazon.com/
2. Navigate to IAM > Users
3. Create new user: candlefish-secrets-admin
4. Attach policy: SecretsManagerFullAccess
5. Create access key
6. Replace placeholders in .env.new with real AWS keys

### 2. MongoDB Atlas
1. Log into MongoDB Atlas
2. Database Access > Add New Database User
3. Username: ${MONGO_USERNAME}
4. Password: ${MONGO_PASSWORD}
5. Delete old user: mihirsheth2911

### 3. Google Cloud Console
1. APIs & Services > Credentials
2. Delete old key: AIzaSyBGHmF2vC4R8tX9pQ6jK3nM7wE1sA5yZ2B
3. Create new API key
4. Update .env.new with real Google API key

### 4. Execute AWS Commands
\`\`\`bash
# After getting valid AWS credentials
export AWS_ACCESS_KEY_ID=your_new_key
export AWS_SECRET_ACCESS_KEY=your_new_secret
cd $SECRETS_DIR
./aws-commands.sh
\`\`\`

### 5. Update Applications
Copy .env.new to your application:
\`\`\`bash
cp $SECRETS_DIR/.env.new /Users/patricksmith/candlefish-ai/.env
\`\`\`

## 📋 Credentials to Disable

- AWS: AKIAZ5G4HRQHZIBGMDNM
- MongoDB: mihirsheth2911
- Google: AIzaSyBGHmF2vC4R8tX9pQ6jK3nM7wE1sA5yZ2B
- Smithery: bfcb8cec-9d56-4957-8156-bced0bfca532

## 🔐 New Credentials Summary

| Service | Value |
|---------|-------|
| MongoDB Username | ${MONGO_USERNAME} |
| MongoDB Password | ${MONGO_PASSWORD} |
| Smithery API Key | ${SMITHERY_API_KEY} |
| JWT Secret | [Stored in file] |
| Encryption Key | [Stored in file] |

Keep this directory secure until rotation is complete!
EOF

echo -e "${GREEN}✅ New secrets generated successfully!${NC}"
echo ""
echo -e "${CYAN}📁 Secrets saved to: $SECRETS_DIR${NC}"
echo ""
echo "Contents:"
ls -la "$SECRETS_DIR"
echo ""
echo -e "${YELLOW}⚠️  NEXT STEPS:${NC}"
echo "1. Read instructions: cat $SECRETS_DIR/INSTRUCTIONS.md"
echo "2. View new secrets: cat $SECRETS_DIR/new-secrets.json"
echo "3. Get .env file: cat $SECRETS_DIR/.env.new"
echo ""
echo -e "${RED}🚨 CRITICAL: Update all external services immediately!${NC}"