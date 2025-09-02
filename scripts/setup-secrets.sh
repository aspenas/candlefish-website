#!/bin/bash
set -euo pipefail

# CLOS Analytics Secrets Management Setup
# This script sets up AWS Secrets Manager and Kubernetes secrets for the analytics dashboard

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT="${ENVIRONMENT:-staging}"
AWS_REGION="${AWS_REGION:-us-east-1}"
NAMESPACE="clos-analytics"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Generate secure passwords
generate_password() {
    local length=${1:-32}
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Generate JWT secret
generate_jwt_secret() {
    openssl rand -hex 32
}

# Check if AWS secret exists
aws_secret_exists() {
    local secret_name="$1"
    aws secretsmanager describe-secret --secret-id "$secret_name" --region "$AWS_REGION" &>/dev/null
}

# Create or update AWS secret
create_aws_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local description="$3"
    
    if aws_secret_exists "$secret_name"; then
        log_info "Updating existing AWS secret: $secret_name"
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION"
    else
        log_info "Creating AWS secret: $secret_name"
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --description "$description" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION"
    fi
    
    # Add tags
    aws secretsmanager tag-resource \
        --secret-id "$secret_name" \
        --tags '[
            {"Key":"Environment","Value":"'$ENVIRONMENT'"},
            {"Key":"Project","Value":"clos-analytics"},
            {"Key":"ManagedBy","Value":"deployment-script"},
            {"Key":"CreatedAt","Value":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}
        ]' \
        --region "$AWS_REGION" || true
}

# Setup AWS Secrets Manager
setup_aws_secrets() {
    log_info "Setting up AWS Secrets Manager secrets for CLOS Analytics..."
    
    # Generate credentials
    DB_PASSWORD=$(generate_password 20)
    REDIS_PASSWORD=$(generate_password 16)
    JWT_SECRET=$(generate_jwt_secret)
    NEXTAUTH_SECRET=$(generate_jwt_secret)
    GRAFANA_ADMIN_PASSWORD=$(generate_password 16)
    
    # Database secret
    DB_SECRET=$(cat << EOF
{
  "username": "clos_admin",
  "password": "$DB_PASSWORD",
  "engine": "postgres",
  "host": "placeholder-will-be-updated-by-terraform",
  "port": 5432,
  "dbname": "clos_analytics"
}
EOF
)
    
    create_aws_secret \
        "clos-analytics/$ENVIRONMENT/database" \
        "$DB_SECRET" \
        "Database credentials for CLOS Analytics $ENVIRONMENT environment"
    
    # Redis secret
    REDIS_SECRET=$(cat << EOF
{
  "endpoint": "placeholder-will-be-updated-by-terraform",
  "port": 6379,
  "auth_token": "$REDIS_PASSWORD"
}
EOF
)
    
    create_aws_secret \
        "clos-analytics/$ENVIRONMENT/redis" \
        "$REDIS_SECRET" \
        "Redis credentials for CLOS Analytics $ENVIRONMENT environment"
    
    # Application secrets
    APP_SECRET=$(cat << EOF
{
  "jwt_secret": "$JWT_SECRET",
  "nextauth_secret": "$NEXTAUTH_SECRET",
  "nextauth_url": "https://$([[ "$ENVIRONMENT" == "production" ]] && echo "" || echo "$ENVIRONMENT-")clos.candlefish.ai"
}
EOF
)
    
    create_aws_secret \
        "clos-analytics/$ENVIRONMENT/application" \
        "$APP_SECRET" \
        "Application secrets for CLOS Analytics $ENVIRONMENT environment"
    
    # Monitoring secrets
    MONITORING_SECRET=$(cat << EOF
{
  "grafana_admin_password": "$GRAFANA_ADMIN_PASSWORD"
}
EOF
)
    
    create_aws_secret \
        "clos-analytics/$ENVIRONMENT/monitoring" \
        "$MONITORING_SECRET" \
        "Monitoring credentials for CLOS Analytics $ENVIRONMENT environment"
    
    log_success "AWS Secrets Manager setup completed"
}

# Main execution
main() {
    log_info "Starting CLOS Analytics secrets setup for environment: $ENVIRONMENT"
    
    # Check dependencies
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v openssl &> /dev/null; then
        log_error "OpenSSL is not installed. Please install it first."
        exit 1
    fi
    
    setup_aws_secrets
    
    log_success "CLOS Analytics secrets setup completed successfully!"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_warning "IMPORTANT: This is a production environment."
        log_warning "- Review all secrets and configurations before deployment"
        log_warning "- Ensure proper access controls are in place"
        log_warning "- Monitor for any security alerts"
    fi
    
    log_info "Next steps:"
    log_info "1. Run Terraform to create infrastructure"
    log_info "2. Update secrets with actual resource endpoints"
    log_info "3. Deploy Kubernetes manifests"
    log_info "4. Verify the application is running correctly"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "  -e, --environment ENV    Environment (dev|staging|production)"
            echo "  -r, --region REGION      AWS region (default: us-east-1)"
            echo "  -h, --help               Show this help"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or production."
    exit 1
fi

# Run main function
main "$@"
