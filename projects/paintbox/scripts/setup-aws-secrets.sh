#!/bin/bash

# AWS Secrets Manager Setup Script for Paintbox Production
# This script creates and populates all secrets required for production deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"
SECRET_NAME="paintbox/${ENVIRONMENT}/secrets"
FLY_APP_NAME="${FLY_APP_NAME:-paintbox-app}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi

    # Check Fly CLI
    if ! command -v flyctl &> /dev/null; then
        log_error "Fly CLI is not installed. Please install it first."
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi

    # Check Fly.io login
    if ! flyctl auth whoami &> /dev/null; then
        log_error "Not logged in to Fly.io. Please run 'flyctl auth login' first."
        exit 1
    fi

    log_success "All prerequisites met"
}

# Generate secure passwords
generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Create or update secret in AWS Secrets Manager
create_or_update_secret() {
    local secret_value="$1"

    log_info "Creating/updating secret: $SECRET_NAME"

    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$AWS_REGION" &> /dev/null; then
        log_info "Secret exists, updating..."
        aws secretsmanager update-secret \
            --secret-id "$SECRET_NAME" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION" > /dev/null
        log_success "Secret updated successfully"
    else
        log_info "Creating new secret..."
        aws secretsmanager create-secret \
            --name "$SECRET_NAME" \
            --description "Paintbox application secrets for $ENVIRONMENT" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION" > /dev/null
        log_success "Secret created successfully"
    fi
}

# Get existing Fly.io secrets
get_fly_secrets() {
    log_info "Reading existing Fly.io secrets..."

    # Get current secrets from Fly.io (this will fail gracefully if secrets don't exist)
    local fly_secrets=""
    if flyctl secrets list --app "$FLY_APP_NAME" &> /dev/null; then
        fly_secrets=$(flyctl secrets list --app "$FLY_APP_NAME" --json 2>/dev/null || echo "[]")
    else
        fly_secrets="[]"
    fi

    echo "$fly_secrets"
}

# Set Fly.io secrets for AWS integration
set_fly_aws_secrets() {
    log_info "Setting AWS integration secrets in Fly.io..."

    # Set AWS region and secret name
    flyctl secrets set \
        AWS_REGION="$AWS_REGION" \
        AWS_SECRETS_MANAGER_SECRET_NAME="$SECRET_NAME" \
        SKIP_AWS_SECRETS="false" \
        --app "$FLY_APP_NAME"

    log_success "AWS integration secrets set in Fly.io"
}

# Main setup function
main() {
    log_info "Starting AWS Secrets Manager setup for Paintbox..."

    check_prerequisites

    # Generate secure credentials
    DB_PASSWORD=$(generate_password 32)
    REDIS_PASSWORD=$(generate_password 32)
    JWT_PRIVATE_KEY=$(openssl genpkey -algorithm RSA -pkcs8 -out /dev/stdout 2>/dev/null | base64 -w 0)
    JWT_PUBLIC_KEY=$(echo "$JWT_PRIVATE_KEY" | base64 -d | openssl pkey -pubout -outform PEM | base64 -w 0)
    ENCRYPTION_KEY=$(generate_password 32)
    ENCRYPTION_IV=$(generate_password 16)

    # Get Fly.io database and Redis endpoints
    log_info "Getting Fly.io service endpoints..."

    # For now, use placeholder values - these should be updated with actual Fly.io service endpoints
    DB_HOST="paintbox-prod-db.flycast"
    REDIS_HOST="paintbox-redis.flycast"

    # Construct secret JSON
    SECRET_JSON=$(cat << EOF
{
  "companyCam": {
    "apiToken": "${COMPANYCAM_API_TOKEN:-}",
    "webhookSecret": "${COMPANYCAM_WEBHOOK_SECRET:-$(generate_password 32)}"
  },
  "salesforce": {
    "clientId": "${SALESFORCE_CLIENT_ID:-}",
    "clientSecret": "${SALESFORCE_CLIENT_SECRET:-}",
    "username": "${SALESFORCE_USERNAME:-}",
    "password": "${SALESFORCE_PASSWORD:-}",
    "securityToken": "${SALESFORCE_SECURITY_TOKEN:-}",
    "instanceUrl": "${SALESFORCE_INSTANCE_URL:-https://login.salesforce.com}",
    "apiVersion": "v62.0"
  },
  "database": {
    "url": "postgresql://postgres:${DB_PASSWORD}@${DB_HOST}:5432/paintbox",
    "shadowUrl": "postgresql://postgres:${DB_PASSWORD}@${DB_HOST}:5432/paintbox_shadow"
  },
  "redis": {
    "url": "redis://default:${REDIS_PASSWORD}@${REDIS_HOST}:6379",
    "password": "${REDIS_PASSWORD}"
  },
  "sentry": {
    "dsn": "${SENTRY_DSN:-}"
  },
  "jwt": {
    "publicKey": "${JWT_PUBLIC_KEY}",
    "privateKey": "${JWT_PRIVATE_KEY}"
  },
  "encryption": {
    "key": "${ENCRYPTION_KEY}",
    "iv": "${ENCRYPTION_IV}"
  }
}
EOF
    )

    # Create/update the secret
    create_or_update_secret "$SECRET_JSON"

    # Set Fly.io secrets for AWS integration
    set_fly_aws_secrets

    # Display next steps
    echo
    log_success "AWS Secrets Manager setup completed!"
    echo
    log_info "Next steps:"
    echo "1. Update database password in Fly.io Postgres:"
    echo "   flyctl postgres connect --app paintbox-prod-db"
    echo "   ALTER USER postgres PASSWORD '$DB_PASSWORD';"
    echo
    echo "2. Update Redis password:"
    echo "   flyctl redis connect --app paintbox-redis"
    echo "   CONFIG SET requirepass $REDIS_PASSWORD"
    echo
    echo "3. Update your environment-specific secrets:"
    echo "   - Company Cam API token"
    echo "   - Salesforce credentials"
    echo "   - Sentry DSN"
    echo
    echo "4. Deploy your application:"
    echo "   flyctl deploy --app $FLY_APP_NAME"
    echo
    log_warning "Store these credentials securely:"
    echo "Database Password: $DB_PASSWORD"
    echo "Redis Password: $REDIS_PASSWORD"
    echo "Encryption Key: $ENCRYPTION_KEY"
}

# Run with error handling
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    trap 'log_error "Script failed at line $LINENO"' ERR
    main "$@"
fi
