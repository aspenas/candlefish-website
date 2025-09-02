#!/bin/bash

# Secrets Management Script for Item Valuation System
# Manages secrets across AWS Secrets Manager and Kubernetes

set -euo pipefail

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
NAMESPACE="${NAMESPACE:-inventory-system}"
ENVIRONMENT="${ENVIRONMENT:-production}"
SECRET_PREFIX="${ENVIRONMENT}/inventory"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log_info() {
    log "${BLUE}INFO: $1${NC}"
}

log_success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

log_warn() {
    log "${YELLOW}WARNING: $1${NC}"
}

log_error() {
    log "${RED}ERROR: $1${NC}"
}

error_exit() {
    log_error "$1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Required tools
    for tool in aws kubectl jq openssl; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            error_exit "Required tool '$tool' is not installed"
        fi
    done
    
    # AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        error_exit "AWS credentials not configured or invalid"
    fi
    
    # Kubernetes connection
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi
    
    # Namespace exists
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log_warn "Namespace '$NAMESPACE' does not exist, creating..."
        kubectl create namespace "$NAMESPACE"
    fi
    
    log_success "Prerequisites check passed"
}

# Generate secure random password
generate_password() {
    local length="${1:-32}"
    openssl rand -base64 48 | tr -d "=+/" | cut -c1-${length}
}

# Generate JWT secret
generate_jwt_secret() {
    openssl rand -hex 64
}

# Create or update AWS secret
create_aws_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local description="${3:-Secret for $secret_name}"
    
    log_info "Creating/updating AWS secret: $secret_name"
    
    local full_secret_name="${SECRET_PREFIX}/${secret_name}"
    
    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id "$full_secret_name" >/dev/null 2>&1; then
        log_info "Updating existing secret: $full_secret_name"
        aws secretsmanager update-secret \
            --secret-id "$full_secret_name" \
            --secret-string "$secret_value" \
            --description "$description"
    else
        log_info "Creating new secret: $full_secret_name"
        aws secretsmanager create-secret \
            --name "$full_secret_name" \
            --secret-string "$secret_value" \
            --description "$description" \
            --kms-key-id "alias/inventory-secrets-key"
    fi
    
    log_success "AWS secret $secret_name created/updated"
}

# Initialize database secrets
init_database_secrets() {
    log_info "Initializing database secrets..."
    
    local db_password
    db_password=$(generate_password 32)
    
    local db_secret
    db_secret=$(cat <<EOF
{
  "username": "postgres",
  "password": "$db_password",
  "engine": "postgresql",
  "host": "postgres-service.${NAMESPACE}.svc.cluster.local",
  "port": "5432",
  "database": "inventory_${ENVIRONMENT}"
}
EOF
)
    
    create_aws_secret "database" "$db_secret" "Database credentials for inventory system"
    
    log_success "Database secrets initialized"
}

# Initialize Redis secrets
init_redis_secrets() {
    log_info "Initializing Redis secrets..."
    
    local redis_password
    redis_password=$(generate_password 32)
    
    local redis_secret
    redis_secret=$(cat <<EOF
{
  "password": "$redis_password",
  "host": "redis-service.${NAMESPACE}.svc.cluster.local",
  "port": "6379"
}
EOF
)
    
    create_aws_secret "redis" "$redis_secret" "Redis credentials for inventory system"
    
    log_success "Redis secrets initialized"
}

# Initialize JWT secrets
init_jwt_secrets() {
    log_info "Initializing JWT secrets..."
    
    local jwt_secret
    jwt_secret=$(generate_jwt_secret)
    
    local jwt_config
    jwt_config=$(cat <<EOF
{
  "secret": "$jwt_secret",
  "issuer": "inventory.example.com",
  "expiration": "24h",
  "algorithm": "HS256"
}
EOF
)
    
    create_aws_secret "jwt" "$jwt_config" "JWT configuration for inventory system"
    
    log_success "JWT secrets initialized"
}

# Initialize SMTP secrets
init_smtp_secrets() {
    log_info "Initializing SMTP secrets..."
    
    log_warn "SMTP credentials need to be manually configured"
    log_info "Please update the following secret with actual SMTP credentials:"
    log_info "aws secretsmanager put-secret-value --secret-id '${SECRET_PREFIX}/smtp' --secret-string '{\"username\":\"your-smtp-user\",\"password\":\"your-smtp-password\",\"host\":\"smtp.example.com\",\"port\":\"587\"}'"
    
    # Create placeholder
    local smtp_secret
    smtp_secret=$(cat <<EOF
{
  "username": "REPLACE_WITH_ACTUAL_USERNAME",
  "password": "REPLACE_WITH_ACTUAL_PASSWORD", 
  "host": "email-smtp.us-east-1.amazonaws.com",
  "port": "587"
}
EOF
)
    
    create_aws_secret "smtp" "$smtp_secret" "SMTP credentials for inventory system"
    
    log_warn "Remember to update SMTP credentials with actual values"
}

# Initialize S3 secrets
init_s3_secrets() {
    log_info "Initializing S3 secrets..."
    
    log_warn "S3 credentials should use IAM roles when possible"
    
    local s3_secret
    s3_secret=$(cat <<EOF
{
  "bucket": "inventory-${ENVIRONMENT}-uploads",
  "region": "${AWS_REGION}",
  "access-key-id": "USE_IAM_ROLES_INSTEAD",
  "secret-access-key": "USE_IAM_ROLES_INSTEAD"
}
EOF
)
    
    create_aws_secret "s3" "$s3_secret" "S3 configuration for inventory system"
    
    log_info "S3 secrets initialized (configure IAM roles for actual access)"
}

# Initialize monitoring secrets
init_monitoring_secrets() {
    log_info "Initializing monitoring secrets..."
    
    local monitoring_secret
    monitoring_secret=$(cat <<EOF
{
  "datadog-api-key": "REPLACE_WITH_ACTUAL_DATADOG_KEY",
  "slack-webhook": "REPLACE_WITH_ACTUAL_SLACK_WEBHOOK",
  "pagerduty-token": "REPLACE_WITH_ACTUAL_PAGERDUTY_TOKEN"
}
EOF
)
    
    create_aws_secret "monitoring" "$monitoring_secret" "Monitoring service credentials"
    
    log_warn "Remember to update monitoring credentials with actual values"
}

# Initialize external API secrets
init_external_api_secrets() {
    log_info "Initializing external API secrets..."
    
    local external_apis_secret
    external_apis_secret=$(cat <<EOF
{
  "stripe-secret": "REPLACE_WITH_ACTUAL_STRIPE_SECRET",
  "sendgrid-api-key": "REPLACE_WITH_ACTUAL_SENDGRID_KEY",
  "twilio-auth-token": "REPLACE_WITH_ACTUAL_TWILIO_TOKEN"
}
EOF
)
    
    create_aws_secret "external-apis" "$external_apis_secret" "External API credentials"
    
    log_warn "Remember to update external API credentials with actual values"
}

# List all secrets
list_secrets() {
    log_info "Listing all secrets in AWS Secrets Manager..."
    
    echo "AWS Secrets Manager secrets:"
    aws secretsmanager list-secrets \
        --filters Key=name,Values="${SECRET_PREFIX}/" \
        --query 'SecretList[].{Name:Name,Description:Description,LastChanged:LastChangedDate}' \
        --output table
    
    echo
    log_info "Kubernetes secrets in namespace $NAMESPACE:"
    kubectl get secrets -n "$NAMESPACE" -o custom-columns=NAME:.metadata.name,TYPE:.type,AGE:.metadata.creationTimestamp
}

# Get secret value
get_secret() {
    local secret_name="$1"
    local key="${2:-}"
    
    local full_secret_name="${SECRET_PREFIX}/${secret_name}"
    
    log_info "Retrieving secret: $secret_name"
    
    local secret_value
    secret_value=$(aws secretsmanager get-secret-value \
        --secret-id "$full_secret_name" \
        --query 'SecretString' \
        --output text)
    
    if [ -n "$key" ]; then
        echo "$secret_value" | jq -r ".$key"
    else
        echo "$secret_value" | jq .
    fi
}

# Rotate secret
rotate_secret() {
    local secret_name="$1"
    
    log_info "Rotating secret: $secret_name"
    
    case "$secret_name" in
        "database")
            local new_password
            new_password=$(generate_password 32)
            local current_secret
            current_secret=$(get_secret "database")
            local new_secret
            new_secret=$(echo "$current_secret" | jq --arg pass "$new_password" '.password = $pass')
            create_aws_secret "database" "$new_secret" "Database credentials (rotated)"
            log_warn "Database password rotated. You need to update the database user password manually!"
            ;;
        "jwt")
            local new_jwt_secret
            new_jwt_secret=$(generate_jwt_secret)
            local current_secret
            current_secret=$(get_secret "jwt")
            local new_secret
            new_secret=$(echo "$current_secret" | jq --arg secret "$new_jwt_secret" '.secret = $secret')
            create_aws_secret "jwt" "$new_secret" "JWT configuration (rotated)"
            log_warn "JWT secret rotated. All existing tokens will be invalidated!"
            ;;
        "redis")
            local new_password
            new_password=$(generate_password 32)
            local current_secret
            current_secret=$(get_secret "redis")
            local new_secret
            new_secret=$(echo "$current_secret" | jq --arg pass "$new_password" '.password = $pass')
            create_aws_secret "redis" "$new_secret" "Redis credentials (rotated)"
            log_warn "Redis password rotated. You need to update the Redis configuration!"
            ;;
        *)
            log_error "Rotation not supported for secret: $secret_name"
            return 1
            ;;
    esac
    
    log_success "Secret $secret_name rotated successfully"
}

# Sync secrets to Kubernetes
sync_secrets_to_k8s() {
    log_info "Syncing secrets from AWS Secrets Manager to Kubernetes..."
    
    # This assumes External Secrets Operator is installed
    log_info "Triggering External Secrets Operator refresh..."
    
    # Force refresh of ExternalSecrets
    kubectl annotate externalsecret database-credentials force-sync="$(date +%s)" -n "$NAMESPACE" --overwrite || true
    kubectl annotate externalsecret application-secrets force-sync="$(date +%s)" -n "$NAMESPACE" --overwrite || true
    
    # Wait a moment for sync
    sleep 10
    
    # Verify secrets exist in Kubernetes
    local k8s_secrets=("database-secret" "application-secret")
    
    for secret in "${k8s_secrets[@]}"; do
        if kubectl get secret "$secret" -n "$NAMESPACE" >/dev/null 2>&1; then
            log_success "Kubernetes secret $secret exists"
        else
            log_warn "Kubernetes secret $secret not found"
        fi
    done
}

# Backup secrets
backup_secrets() {
    log_info "Creating secrets backup..."
    
    local backup_dir="secrets-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup AWS secrets (metadata only, not values)
    aws secretsmanager list-secrets \
        --filters Key=name,Values="${SECRET_PREFIX}/" \
        --query 'SecretList[].{Name:Name,Description:Description}' \
        --output json > "$backup_dir/aws-secrets-list.json"
    
    # Backup Kubernetes secret manifests
    kubectl get secrets -n "$NAMESPACE" -o yaml > "$backup_dir/k8s-secrets.yaml" || true
    
    # Create backup inventory
    cat > "$backup_dir/backup-info.json" << EOF
{
  "backup_time": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "environment": "$ENVIRONMENT",
  "namespace": "$NAMESPACE",
  "aws_region": "$AWS_REGION",
  "secret_prefix": "$SECRET_PREFIX"
}
EOF
    
    log_success "Secrets backup created in: $backup_dir"
}

# Check secret health
check_secret_health() {
    log_info "Checking secret health..."
    
    local issues=0
    
    # Check AWS secrets exist
    local expected_secrets=("database" "redis" "jwt" "smtp" "s3" "monitoring" "external-apis")
    
    for secret in "${expected_secrets[@]}"; do
        local full_secret_name="${SECRET_PREFIX}/${secret}"
        if aws secretsmanager describe-secret --secret-id "$full_secret_name" >/dev/null 2>&1; then
            log_success "AWS secret $secret exists"
        else
            log_error "AWS secret $secret missing"
            ((issues++))
        fi
    done
    
    # Check Kubernetes secrets
    local k8s_secrets=("database-secret" "application-secret")
    
    for secret in "${k8s_secrets[@]}"; do
        if kubectl get secret "$secret" -n "$NAMESPACE" >/dev/null 2>&1; then
            log_success "Kubernetes secret $secret exists"
            
            # Check if secret is not empty
            local key_count
            key_count=$(kubectl get secret "$secret" -n "$NAMESPACE" -o json | jq '.data | length')
            if [ "$key_count" -gt 0 ]; then
                log_success "Kubernetes secret $secret has $key_count keys"
            else
                log_error "Kubernetes secret $secret is empty"
                ((issues++))
            fi
        else
            log_error "Kubernetes secret $secret missing"
            ((issues++))
        fi
    done
    
    # Check External Secrets Operator
    if kubectl get externalsecrets -n "$NAMESPACE" >/dev/null 2>&1; then
        log_success "External Secrets Operator is configured"
        
        # Check sync status
        local external_secrets
        external_secrets=$(kubectl get externalsecrets -n "$NAMESPACE" -o json | jq -r '.items[].metadata.name')
        
        for es in $external_secrets; do
            local status
            status=$(kubectl get externalsecret "$es" -n "$NAMESPACE" -o json | jq -r '.status.conditions[0].status // "Unknown"')
            if [ "$status" = "True" ]; then
                log_success "ExternalSecret $es is synced"
            else
                log_error "ExternalSecret $es sync failed"
                ((issues++))
            fi
        done
    else
        log_warn "External Secrets Operator not found"
    fi
    
    if [ $issues -eq 0 ]; then
        log_success "All secret health checks passed"
    else
        log_error "Found $issues secret health issues"
        return 1
    fi
}

# Main function
main() {
    local command="${1:-help}"
    
    case "$command" in
        "init")
            check_prerequisites
            log_info "Initializing all secrets..."
            init_database_secrets
            init_redis_secrets
            init_jwt_secrets
            init_smtp_secrets
            init_s3_secrets
            init_monitoring_secrets
            init_external_api_secrets
            log_success "All secrets initialized"
            ;;
        "list")
            check_prerequisites
            list_secrets
            ;;
        "get")
            local secret_name="${2:-}"
            local key="${3:-}"
            if [ -z "$secret_name" ]; then
                error_exit "Secret name required. Usage: $0 get <secret-name> [key]"
            fi
            check_prerequisites
            get_secret "$secret_name" "$key"
            ;;
        "rotate")
            local secret_name="${2:-}"
            if [ -z "$secret_name" ]; then
                error_exit "Secret name required. Usage: $0 rotate <secret-name>"
            fi
            check_prerequisites
            rotate_secret "$secret_name"
            ;;
        "sync")
            check_prerequisites
            sync_secrets_to_k8s
            ;;
        "backup")
            check_prerequisites
            backup_secrets
            ;;
        "health")
            check_prerequisites
            check_secret_health
            ;;
        *)
            echo "Usage: $0 [init|list|get|rotate|sync|backup|health]"
            echo ""
            echo "Commands:"
            echo "  init              - Initialize all secrets with generated values"
            echo "  list              - List all secrets"
            echo "  get <name> [key]  - Get secret value (optionally specific key)"
            echo "  rotate <name>     - Rotate secret (database, jwt, redis)"
            echo "  sync              - Sync AWS secrets to Kubernetes"
            echo "  backup            - Create secrets backup"
            echo "  health            - Check secret health status"
            echo ""
            echo "Examples:"
            echo "  $0 init                    # Initialize all secrets"
            echo "  $0 get database password   # Get database password"
            echo "  $0 rotate jwt             # Rotate JWT secret"
            echo "  $0 health                 # Check all secrets"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"