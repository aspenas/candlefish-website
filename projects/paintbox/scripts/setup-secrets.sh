#!/bin/bash
# Paintbox Production Secrets Setup Script
# This script initializes AWS Secrets Manager with all required secrets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-"us-west-2"}
SECRET_PREFIX="paintbox/production"

echo -e "${GREEN}===== Paintbox Secrets Manager Setup =====${NC}"
echo -e "${YELLOW}Region: ${AWS_REGION}${NC}"
echo -e "${YELLOW}Prefix: ${SECRET_PREFIX}${NC}\n"

# Function to create or update a secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3

    echo -e "${YELLOW}Setting up secret: ${secret_name}${NC}"

    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id "${SECRET_PREFIX}/${secret_name}" --region ${AWS_REGION} >/dev/null 2>&1; then
        echo "  Updating existing secret..."
        aws secretsmanager update-secret \
            --secret-id "${SECRET_PREFIX}/${secret_name}" \
            --secret-string "${secret_value}" \
            --region ${AWS_REGION} >/dev/null
    else
        echo "  Creating new secret..."
        aws secretsmanager create-secret \
            --name "${SECRET_PREFIX}/${secret_name}" \
            --description "${description}" \
            --secret-string "${secret_value}" \
            --region ${AWS_REGION} >/dev/null
    fi

    echo -e "${GREEN}  ✓ Secret ${secret_name} configured${NC}\n"
}

# Generate secure random passwords
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# 1. Database Configuration
echo -e "${GREEN}1. Setting up Database Secrets${NC}"
DB_PASSWORD=$(generate_password)
DB_SECRET=$(cat <<EOF
{
  "host": "paintbox-prod-db.flycast",
  "port": 5432,
  "database": "paintbox",
  "username": "postgres",
  "password": "${DB_PASSWORD}",
  "ssl": true,
  "pool_min": 5,
  "pool_max": 20
}
EOF
)
create_or_update_secret "database" "${DB_SECRET}" "PostgreSQL database configuration"

# 2. Redis Configuration
echo -e "${GREEN}2. Setting up Redis Secrets${NC}"
REDIS_PASSWORD=$(generate_password)
REDIS_SECRET=$(cat <<EOF
{
  "host": "paintbox-redis.internal",
  "port": 6379,
  "password": "${REDIS_PASSWORD}",
  "db": 0,
  "maxRetries": 3,
  "retryDelay": 500
}
EOF
)
create_or_update_secret "redis" "${REDIS_SECRET}" "Redis cache configuration"

# 3. Application Secrets
echo -e "${GREEN}3. Setting up Application Secrets${NC}"
JWT_SECRET=$(generate_password)
ENCRYPTION_KEY=$(generate_password)
APP_SECRET=$(cat <<EOF
{
  "jwt_secret": "${JWT_SECRET}",
  "encryption_key": "${ENCRYPTION_KEY}",
  "session_secret": "$(generate_password)"
}
EOF
)
create_or_update_secret "app" "${APP_SECRET}" "Application security keys"

# 4. Salesforce Configuration (Placeholder - Update with actual values)
echo -e "${GREEN}4. Setting up Salesforce Secrets${NC}"
SALESFORCE_SECRET=$(cat <<EOF
{
  "client_id": "REPLACE_WITH_ACTUAL_CLIENT_ID",
  "client_secret": "REPLACE_WITH_ACTUAL_CLIENT_SECRET",
  "username": "REPLACE_WITH_ACTUAL_USERNAME",
  "password": "REPLACE_WITH_ACTUAL_PASSWORD",
  "security_token": "REPLACE_WITH_ACTUAL_TOKEN",
  "login_url": "https://login.salesforce.com",
  "api_version": "58.0"
}
EOF
)
create_or_update_secret "salesforce" "${SALESFORCE_SECRET}" "Salesforce API configuration"

# 5. Company Cam Configuration (Placeholder - Update with actual values)
echo -e "${GREEN}5. Setting up Company Cam Secrets${NC}"
COMPANYCAM_SECRET=$(cat <<EOF
{
  "api_key": "REPLACE_WITH_ACTUAL_API_KEY",
  "api_secret": "REPLACE_WITH_ACTUAL_API_SECRET",
  "base_url": "https://api.companycam.com/v2"
}
EOF
)
create_or_update_secret "companycam" "${COMPANYCAM_SECRET}" "Company Cam API configuration"

# 6. Monitoring Configuration
echo -e "${GREEN}6. Setting up Monitoring Secrets${NC}"
MONITORING_SECRET=$(cat <<EOF
{
  "sentry_dsn": "REPLACE_WITH_ACTUAL_SENTRY_DSN",
  "datadog_api_key": "REPLACE_WITH_ACTUAL_DATADOG_KEY",
  "logrocket_app_id": "REPLACE_WITH_ACTUAL_LOGROCKET_ID"
}
EOF
)
create_or_update_secret "monitoring" "${MONITORING_SECRET}" "Monitoring and observability configuration"

# 7. Email Configuration
echo -e "${GREEN}7. Setting up Email Secrets${NC}"
EMAIL_SECRET=$(cat <<EOF
{
  "sendgrid_api_key": "REPLACE_WITH_ACTUAL_SENDGRID_KEY",
  "from_email": "noreply@paintbox.app",
  "smtp_host": "smtp.sendgrid.net",
  "smtp_port": 587,
  "smtp_user": "apikey"
}
EOF
)
create_or_update_secret "email" "${EMAIL_SECRET}" "Email service configuration"

# Create IAM policy for Fly.io access
echo -e "${GREEN}8. Creating IAM Policy for Fly.io${NC}"
POLICY_NAME="PaintboxSecretsAccess"
POLICY_DOCUMENT=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:${AWS_REGION}:*:secret:${SECRET_PREFIX}/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "secretsmanager.${AWS_REGION}.amazonaws.com"
        }
      }
    }
  ]
}
EOF
)

# Check if policy exists
if aws iam get-policy --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/${POLICY_NAME}" >/dev/null 2>&1; then
    echo -e "${YELLOW}  IAM policy already exists${NC}"
else
    echo "  Creating IAM policy..."
    aws iam create-policy \
        --policy-name ${POLICY_NAME} \
        --policy-document "${POLICY_DOCUMENT}" \
        --description "Allow Paintbox app to access secrets" >/dev/null
    echo -e "${GREEN}  ✓ IAM policy created${NC}"
fi

# Output summary
echo -e "\n${GREEN}===== Setup Complete =====${NC}"
echo -e "${GREEN}✓ Database secrets configured${NC}"
echo -e "${GREEN}✓ Redis secrets configured${NC}"
echo -e "${GREEN}✓ Application secrets configured${NC}"
echo -e "${GREEN}✓ Integration secrets configured (placeholders)${NC}"
echo -e "${GREEN}✓ IAM policy configured${NC}"

echo -e "\n${YELLOW}IMPORTANT NEXT STEPS:${NC}"
echo "1. Update Salesforce credentials in AWS Secrets Manager"
echo "2. Update Company Cam credentials in AWS Secrets Manager"
echo "3. Update monitoring service credentials in AWS Secrets Manager"
echo "4. Configure Fly.io secrets with AWS credentials:"
echo "   fly secrets set AWS_ACCESS_KEY_ID=<your-key>"
echo "   fly secrets set AWS_SECRET_ACCESS_KEY=<your-secret>"
echo "5. Deploy the secure configuration:"
echo "   fly deploy -c fly.toml.secure"

echo -e "\n${YELLOW}Generated passwords have been saved to AWS Secrets Manager.${NC}"
echo -e "${YELLOW}Database Password: Stored in ${SECRET_PREFIX}/database${NC}"
echo -e "${YELLOW}Redis Password: Stored in ${SECRET_PREFIX}/redis${NC}"
echo -e "${YELLOW}JWT Secret: Stored in ${SECRET_PREFIX}/app${NC}"
