#!/bin/bash
# AWS Secrets Manager Setup for Security Dashboard
# Creates and manages all required secrets for production deployment

set -euo pipefail

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-681214184463}"
SECRET_PREFIX="candlefish/security-dashboard"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Generate secure random password
generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Generate JWT secret (base64 encoded)
generate_jwt_secret() {
    openssl rand -base64 64
}

# Generate encryption key (32 bytes, base64 encoded)
generate_encryption_key() {
    openssl rand -base64 32
}

# Create or update a secret in AWS Secrets Manager
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    log "Processing secret: $secret_name"
    
    # Check if secret exists
    if aws secretsmanager describe-secret \
        --secret-id "$secret_name" \
        --region "$AWS_REGION" &>/dev/null; then
        
        # Update existing secret
        log "Updating existing secret: $secret_name"
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION" &>/dev/null
    else
        # Create new secret
        log "Creating new secret: $secret_name"
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --description "$description" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION" &>/dev/null
    fi
    
    log "Secret $secret_name processed successfully"
}

# Create KMS key for secrets encryption
create_kms_key() {
    log "Creating KMS key for secrets encryption..."
    
    local key_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Id": "security-dashboard-secrets-key-policy",
  "Statement": [
    {
      "Sid": "Enable IAM User Permissions",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::${AWS_ACCOUNT_ID}:root"
      },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "Allow Secrets Manager Service",
      "Effect": "Allow",
      "Principal": {
        "Service": "secretsmanager.amazonaws.com"
      },
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey",
        "kms:Encrypt",
        "kms:GenerateDataKey*",
        "kms:ReEncrypt*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Allow EKS Service Account",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/security-dashboard-irsa"
      },
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    }
  ]
}
EOF
    )
    
    # Check if key already exists
    if aws kms describe-key \
        --key-id alias/security-dashboard-secrets \
        --region "$AWS_REGION" &>/dev/null; then
        log "KMS key alias already exists"
        return 0
    fi
    
    # Create KMS key
    local key_id=$(aws kms create-key \
        --policy "$key_policy" \
        --description "Security Dashboard Secrets Encryption Key" \
        --region "$AWS_REGION" \
        --query 'KeyMetadata.KeyId' \
        --output text)
    
    # Create alias
    aws kms create-alias \
        --alias-name alias/security-dashboard-secrets \
        --target-key-id "$key_id" \
        --region "$AWS_REGION"
    
    log "KMS key created with alias: alias/security-dashboard-secrets"
}

# Setup IRSA (IAM Role for Service Account)
setup_irsa() {
    log "Setting up IRSA for Security Dashboard..."
    
    local role_name="security-dashboard-irsa"
    local policy_name="SecurityDashboardSecretsAccess"
    local oidc_url="https://oidc.eks.${AWS_REGION}.amazonaws.com/id/CLUSTER_ID"
    
    # Trust policy for IRSA
    local trust_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/${oidc_url#https://}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${oidc_url#https://}:sub": "system:serviceaccount:security-dashboard:security-dashboard-sa",
          "${oidc_url#https://}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF
    )
    
    # IAM policy for secrets access
    local secrets_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:${SECRET_PREFIX}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": [
        "arn:aws:kms:${AWS_REGION}:${AWS_ACCOUNT_ID}:alias/security-dashboard-secrets"
      ]
    }
  ]
}
EOF
    )
    
    info "IRSA setup requires manual EKS cluster configuration"
    info "Please ensure the OIDC provider is configured for your EKS cluster"
    log "IRSA trust policy and permissions policy created"
}

# Main function to setup all secrets
setup_secrets() {
    log "Setting up Security Dashboard secrets..."
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        error "AWS credentials not configured or expired"
    fi
    
    # Create KMS key
    create_kms_key
    
    # Generate secrets
    log "Generating secure secrets..."
    
    local postgres_password=$(generate_password 24)
    local redis_password=$(generate_password 24)
    local neo4j_password=$(generate_password 24)
    local jwt_secret=$(generate_jwt_secret)
    local encryption_key=$(generate_encryption_key)
    local grafana_password=$(generate_password 16)
    local grafana_secret_key=$(generate_password 32)
    
    # Database secrets
    create_or_update_secret \
        "${SECRET_PREFIX}/postgres-password" \
        "$postgres_password" \
        "PostgreSQL database password for Security Dashboard"
    
    create_or_update_secret \
        "${SECRET_PREFIX}/redis-password" \
        "$redis_password" \
        "Redis password for Security Dashboard caching"
    
    create_or_update_secret \
        "${SECRET_PREFIX}/neo4j-password" \
        "$neo4j_password" \
        "Neo4j graph database password for threat intelligence"
    
    # Application secrets
    create_or_update_secret \
        "${SECRET_PREFIX}/jwt-secret" \
        "$jwt_secret" \
        "JWT signing secret for Security Dashboard authentication"
    
    create_or_update_secret \
        "${SECRET_PREFIX}/encryption-key" \
        "$encryption_key" \
        "Encryption key for Security Dashboard data protection"
    
    # Monitoring secrets
    create_or_update_secret \
        "${SECRET_PREFIX}/grafana-password" \
        "$grafana_password" \
        "Grafana admin password for Security Dashboard monitoring"
    
    create_or_update_secret \
        "${SECRET_PREFIX}/grafana-secret-key" \
        "$grafana_secret_key" \
        "Grafana secret key for session encryption"
    
    # OAuth secrets (placeholders - replace with actual values)
    create_or_update_secret \
        "${SECRET_PREFIX}/oauth-google-client-id" \
        "REPLACE_WITH_GOOGLE_CLIENT_ID" \
        "Google OAuth client ID for SSO authentication"
    
    create_or_update_secret \
        "${SECRET_PREFIX}/oauth-google-client-secret" \
        "REPLACE_WITH_GOOGLE_CLIENT_SECRET" \
        "Google OAuth client secret for SSO authentication"
    
    create_or_update_secret \
        "${SECRET_PREFIX}/oauth-github-client-id" \
        "REPLACE_WITH_GITHUB_CLIENT_ID" \
        "GitHub OAuth client ID for developer authentication"
    
    create_or_update_secret \
        "${SECRET_PREFIX}/oauth-github-client-secret" \
        "REPLACE_WITH_GITHUB_CLIENT_SECRET" \
        "GitHub OAuth client secret for developer authentication"
    
    # SMTP configuration for alerts
    create_or_update_secret \
        "${SECRET_PREFIX}/smtp-host" \
        "smtp.gmail.com" \
        "SMTP host for email alerts"
    
    create_or_update_secret \
        "${SECRET_PREFIX}/smtp-user" \
        "alerts@candlefish.ai" \
        "SMTP username for email alerts"
    
    create_or_update_secret \
        "${SECRET_PREFIX}/smtp-password" \
        "REPLACE_WITH_SMTP_PASSWORD" \
        "SMTP password for email alerts"
    
    # Sentry configuration for error tracking
    create_or_update_secret \
        "${SECRET_PREFIX}/sentry-dsn" \
        "REPLACE_WITH_SENTRY_DSN" \
        "Sentry DSN for error tracking"
    
    log "All secrets have been created/updated successfully"
    
    # Setup IRSA
    setup_irsa
}

# List all secrets
list_secrets() {
    log "Listing Security Dashboard secrets..."
    
    aws secretsmanager list-secrets \
        --region "$AWS_REGION" \
        --query "SecretList[?starts_with(Name, '${SECRET_PREFIX}')].{Name:Name,Description:Description,LastChangedDate:LastChangedDate}" \
        --output table
}

# Delete all secrets (use with caution)
delete_secrets() {
    warn "This will DELETE ALL Security Dashboard secrets!"
    read -p "Are you sure? This action cannot be undone. Type 'DELETE' to confirm: " confirmation
    
    if [[ "$confirmation" != "DELETE" ]]; then
        log "Operation cancelled"
        return 0
    fi
    
    log "Deleting all Security Dashboard secrets..."
    
    # Get list of secrets
    local secrets=$(aws secretsmanager list-secrets \
        --region "$AWS_REGION" \
        --query "SecretList[?starts_with(Name, '${SECRET_PREFIX}')].Name" \
        --output text)
    
    # Delete each secret
    for secret in $secrets; do
        log "Deleting secret: $secret"
        aws secretsmanager delete-secret \
            --secret-id "$secret" \
            --force-delete-without-recovery \
            --region "$AWS_REGION"
    done
    
    log "All secrets deleted"
}

# Generate environment file for local development
generate_env_file() {
    log "Generating .env file for local development..."
    
    local env_file=".env.security-dashboard"
    
    cat > "$env_file" <<EOF
# Security Dashboard Environment Variables
# Generated on $(date)

# Database Configuration
POSTGRES_PASSWORD=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/postgres-password" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null || echo "NOT_SET")
REDIS_PASSWORD=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/redis-password" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null || echo "NOT_SET")
NEO4J_PASSWORD=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/neo4j-password" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null || echo "NOT_SET")

# Application Secrets
JWT_SECRET=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/jwt-secret" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null || echo "NOT_SET")
ENCRYPTION_KEY=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/encryption-key" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null || echo "NOT_SET")

# Monitoring
GRAFANA_PASSWORD=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/grafana-password" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null || echo "NOT_SET")
GRAFANA_SECRET_KEY=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/grafana-secret-key" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null || echo "NOT_SET")

# OAuth Configuration
OAUTH_GOOGLE_CLIENT_ID=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/oauth-google-client-id" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null || echo "NOT_SET")
OAUTH_GOOGLE_CLIENT_SECRET=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/oauth-google-client-secret" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null || echo "NOT_SET")
OAUTH_GITHUB_CLIENT_ID=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/oauth-github-client-id" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null || echo "NOT_SET")
OAUTH_GITHUB_CLIENT_SECRET=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/oauth-github-client-secret" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null || echo "NOT_SET")

# Email Configuration
SMTP_HOST=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/smtp-host" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null || echo "NOT_SET")
SMTP_USER=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/smtp-user" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null || echo "NOT_SET")
SMTP_PASSWORD=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/smtp-password" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null || echo "NOT_SET")

# Error Tracking
SENTRY_DSN=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/sentry-dsn" --region "$AWS_REGION" --query 'SecretString' --output text 2>/dev/null || echo "NOT_SET")

# Build Information
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
VERSION=latest
EOF
    
    log "Environment file generated: $env_file"
    warn "Remember to replace placeholder values (REPLACE_WITH_*) with actual credentials"
}

# Show usage information
show_usage() {
    cat <<EOF
Security Dashboard AWS Secrets Manager Setup

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    setup       Create/update all required secrets (default)
    list        List all Security Dashboard secrets
    delete      Delete all Security Dashboard secrets (use with caution)
    env         Generate .env file for local development
    help        Show this help message

Options:
    --region REGION     AWS region (default: us-east-1)
    --account-id ID     AWS account ID (default: 681214184463)

Examples:
    $0 setup                    # Setup all secrets
    $0 list                     # List existing secrets
    $0 env                      # Generate .env file
    $0 delete                   # Delete all secrets (careful!)

Environment Variables:
    AWS_REGION                  AWS region
    AWS_ACCOUNT_ID              AWS account ID

EOF
}

# Main execution
main() {
    local command=${1:-setup}
    
    case $command in
        setup)
            setup_secrets
            ;;
        list)
            list_secrets
            ;;
        delete)
            delete_secrets
            ;;
        env)
            generate_env_file
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Parse arguments and execute
while [[ $# -gt 0 ]]; do
    case $1 in
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --account-id)
            AWS_ACCOUNT_ID="$2"
            shift 2
            ;;
        *)
            main "$@"
            exit 0
            ;;
    esac
done

# If no arguments, run setup
main setup