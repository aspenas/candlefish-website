#!/bin/bash

# Production Secrets Setup Script for Inventory Management System
# This script creates and manages secrets in AWS Secrets Manager and Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="inventory-production"
AWS_REGION="${AWS_REGION:-us-east-1}"
SECRET_PREFIX="candlefish/inventory-production"

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

generate_random_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

generate_jwt_keypair() {
    local temp_dir=$(mktemp -d)

    # Generate private key
    openssl genrsa -out "$temp_dir/private_key.pem" 2048

    # Generate public key
    openssl rsa -in "$temp_dir/private_key.pem" -pubout -out "$temp_dir/public_key.pem"

    # Read keys as base64 for storage
    local private_key=$(cat "$temp_dir/private_key.pem" | base64 -w 0)
    local public_key=$(cat "$temp_dir/public_key.pem" | base64 -w 0)

    # Cleanup
    rm -rf "$temp_dir"

    echo "{\"private_key\":\"$private_key\",\"public_key\":\"$public_key\"}"
}

create_database_secret() {
    log_info "Creating database secret..."

    local db_username="inventory_production"
    local db_password=$(generate_random_password)
    local db_host="postgres-service.inventory-production.svc.cluster.local"
    local db_port="5432"
    local db_name="inventory_production"
    local db_url="postgresql://${db_username}:${db_password}@${db_host}:${db_port}/${db_name}?sslmode=disable"

    local secret_value=$(cat <<EOF
{
  "username": "$db_username",
  "password": "$db_password",
  "host": "$db_host",
  "port": "$db_port",
  "database": "$db_name",
  "url": "$db_url"
}
EOF
)

    aws secretsmanager create-secret \
        --name "${SECRET_PREFIX}/database" \
        --description "PostgreSQL database credentials for inventory production" \
        --secret-string "$secret_value" \
        --region $AWS_REGION \
        --tags Key=Environment,Value=production Key=Service,Value=inventory Key=Type,Value=database \
        2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id "${SECRET_PREFIX}/database" \
        --secret-string "$secret_value" \
        --region $AWS_REGION

    log_success "Database secret created/updated in AWS Secrets Manager"
    echo "Database Username: $db_username"
}

create_redis_secret() {
    log_info "Creating Redis secret..."

    local redis_password=$(generate_random_password)
    local redis_host="redis-service.inventory-production.svc.cluster.local"
    local redis_port="6379"
    local redis_url="redis://:${redis_password}@${redis_host}:${redis_port}/0"

    local secret_value=$(cat <<EOF
{
  "password": "$redis_password",
  "host": "$redis_host",
  "port": "$redis_port",
  "url": "$redis_url"
}
EOF
)

    aws secretsmanager create-secret \
        --name "${SECRET_PREFIX}/redis" \
        --description "Redis credentials for inventory production" \
        --secret-string "$secret_value" \
        --region $AWS_REGION \
        --tags Key=Environment,Value=production Key=Service,Value=inventory Key=Type,Value=cache \
        2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id "${SECRET_PREFIX}/redis" \
        --secret-string "$secret_value" \
        --region $AWS_REGION

    log_success "Redis secret created/updated in AWS Secrets Manager"
}

create_s3_secret() {
    log_info "Creating S3 credentials secret..."

    # Note: In production, you should create a dedicated IAM user with minimal permissions
    local access_key_id="${AWS_ACCESS_KEY_ID:-placeholder}"
    local secret_access_key="${AWS_SECRET_ACCESS_KEY:-placeholder}"
    local bucket_name="candlefish-inventory-production"

    if [ "$access_key_id" = "placeholder" ] || [ "$secret_access_key" = "placeholder" ]; then
        log_warning "AWS credentials not provided. Creating placeholder secret."
        log_warning "You must manually update this secret with proper IAM user credentials."
    fi

    local secret_value=$(cat <<EOF
{
  "access_key_id": "$access_key_id",
  "secret_access_key": "$secret_access_key",
  "bucket_name": "$bucket_name",
  "region": "$AWS_REGION"
}
EOF
)

    aws secretsmanager create-secret \
        --name "${SECRET_PREFIX}/s3" \
        --description "S3 credentials for inventory production file storage" \
        --secret-string "$secret_value" \
        --region $AWS_REGION \
        --tags Key=Environment,Value=production Key=Service,Value=inventory Key=Type,Value=storage \
        2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id "${SECRET_PREFIX}/s3" \
        --secret-string "$secret_value" \
        --region $AWS_REGION

    log_success "S3 secret created/updated in AWS Secrets Manager"
}

create_auth_secret() {
    log_info "Creating authentication secrets..."

    local jwt_secret=$(openssl rand -base64 64)
    local jwt_keys=$(generate_jwt_keypair)

    local secret_value=$(cat <<EOF
{
  "jwt_secret": "$jwt_secret",
  "private_key": "$(echo $jwt_keys | jq -r '.private_key')",
  "public_key": "$(echo $jwt_keys | jq -r '.public_key')"
}
EOF
)

    aws secretsmanager create-secret \
        --name "${SECRET_PREFIX}/auth" \
        --description "Authentication secrets for inventory production" \
        --secret-string "$secret_value" \
        --region $AWS_REGION \
        --tags Key=Environment,Value=production Key=Service,Value=inventory Key=Type,Value=auth \
        2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id "${SECRET_PREFIX}/auth" \
        --secret-string "$secret_value" \
        --region $AWS_REGION

    log_success "Authentication secret created/updated in AWS Secrets Manager"
}

create_kong_secrets() {
    log_info "Creating Kong API Gateway secrets..."

    local internal_jwt_secret=$(openssl rand -base64 64)
    local mobile_jwt_secret=$(openssl rand -base64 64)

    local secret_value=$(cat <<EOF
{
  "internal_service_jwt": "$internal_jwt_secret",
  "mobile_app_jwt": "$mobile_jwt_secret"
}
EOF
)

    aws secretsmanager create-secret \
        --name "${SECRET_PREFIX}/kong" \
        --description "Kong API Gateway secrets for inventory production" \
        --secret-string "$secret_value" \
        --region $AWS_REGION \
        --tags Key=Environment,Value=production Key=Service,Value=inventory Key=Type,Value=gateway \
        2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id "${SECRET_PREFIX}/kong" \
        --secret-string "$secret_value" \
        --region $AWS_REGION

    log_success "Kong secret created/updated in AWS Secrets Manager"
}

create_monitoring_secrets() {
    log_info "Creating monitoring secrets..."

    local grafana_admin_user="admin"
    local grafana_admin_password=$(generate_random_password)

    local secret_value=$(cat <<EOF
{
  "grafana_admin_user": "$grafana_admin_user",
  "grafana_admin_password": "$grafana_admin_password"
}
EOF
)

    aws secretsmanager create-secret \
        --name "${SECRET_PREFIX}/monitoring" \
        --description "Monitoring secrets for inventory production" \
        --secret-string "$secret_value" \
        --region $AWS_REGION \
        --tags Key=Environment,Value=production Key=Service,Value=inventory Key=Type,Value=monitoring \
        2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id "${SECRET_PREFIX}/monitoring" \
        --secret-string "$secret_value" \
        --region $AWS_REGION

    log_success "Monitoring secret created/updated in AWS Secrets Manager"
    echo "Grafana admin username: $grafana_admin_user"
    echo "Grafana admin password: $grafana_admin_password"
}

install_external_secrets() {
    log_info "Installing External Secrets Operator..."

    # Check if External Secrets Operator is already installed
    if kubectl get namespace external-secrets >/dev/null 2>&1; then
        log_info "External Secrets Operator already installed"
    else
        # Install External Secrets Operator
        kubectl create namespace external-secrets

        helm repo add external-secrets https://charts.external-secrets.io
        helm repo update

        helm install external-secrets external-secrets/external-secrets \
            -n external-secrets \
            --set installCRDs=true \
            --wait

        log_success "External Secrets Operator installed"
    fi
}

create_aws_credentials_secret() {
    log_info "Creating AWS credentials secret for External Secrets..."

    # Create AWS credentials secret for External Secrets to access AWS Secrets Manager
    kubectl create secret generic awssm-secret \
        --from-literal=access-key="${AWS_ACCESS_KEY_ID}" \
        --from-literal=secret-access-key="${AWS_SECRET_ACCESS_KEY}" \
        -n $NAMESPACE \
        --dry-run=client -o yaml | kubectl apply -f -

    log_success "AWS credentials secret created in Kubernetes"
}

create_grafana_credentials_secret() {
    log_info "Creating Grafana credentials secret..."

    # Get Grafana credentials from AWS Secrets Manager
    local monitoring_secret=$(aws secretsmanager get-secret-value --secret-id "${SECRET_PREFIX}/monitoring" --region $AWS_REGION --query 'SecretString' --output text)
    local grafana_user=$(echo $monitoring_secret | jq -r '.grafana_admin_user')
    local grafana_password=$(echo $monitoring_secret | jq -r '.grafana_admin_password')

    # Create Grafana credentials secret in Kubernetes
    kubectl create secret generic grafana-credentials \
        --from-literal=admin-user="${grafana_user}" \
        --from-literal=admin-password="${grafana_password}" \
        -n $NAMESPACE \
        --dry-run=client -o yaml | kubectl apply -f -

    log_success "Grafana credentials secret created in Kubernetes"
}

verify_secrets() {
    log_info "Verifying secrets in AWS Secrets Manager..."

    local secrets=(
        "${SECRET_PREFIX}/database"
        "${SECRET_PREFIX}/redis"
        "${SECRET_PREFIX}/s3"
        "${SECRET_PREFIX}/auth"
        "${SECRET_PREFIX}/kong"
        "${SECRET_PREFIX}/monitoring"
    )

    for secret in "${secrets[@]}"; do
        if aws secretsmanager describe-secret --secret-id "$secret" --region $AWS_REGION >/dev/null 2>&1; then
            log_success "✓ $secret exists in AWS Secrets Manager"
        else
            log_error "✗ $secret not found in AWS Secrets Manager"
        fi
    done

    log_info "Verifying External Secret resources in Kubernetes..."

    if kubectl get externalsecret -n $NAMESPACE >/dev/null 2>&1; then
        kubectl get externalsecret -n $NAMESPACE
        log_success "External Secret resources found"
    else
        log_warning "No External Secret resources found (they will be created with the Kubernetes manifests)"
    fi
}

setup_secret_rotation() {
    log_info "Setting up secret rotation..."

    # Create a Lambda function for secret rotation (this would be a separate script)
    cat > /tmp/secret-rotation-schedule.json <<EOF
{
    "database": "rate(90 days)",
    "redis": "rate(90 days)",
    "auth": "rate(30 days)",
    "kong": "rate(90 days)",
    "s3": "rate(180 days)"
}
EOF

    log_info "Secret rotation schedule saved to /tmp/secret-rotation-schedule.json"
    log_warning "Automatic secret rotation requires additional setup (Lambda functions, etc.)"
    log_warning "Consider implementing automated rotation for production use"
}

display_summary() {
    log_info "=== Secrets Setup Summary ==="
    echo ""
    echo "The following secrets have been created in AWS Secrets Manager:"
    echo "  • ${SECRET_PREFIX}/database (PostgreSQL credentials)"
    echo "  • ${SECRET_PREFIX}/redis (Redis credentials)"
    echo "  • ${SECRET_PREFIX}/s3 (S3 storage credentials)"
    echo "  • ${SECRET_PREFIX}/auth (JWT and authentication secrets)"
    echo "  • ${SECRET_PREFIX}/kong (API Gateway secrets)"
    echo "  • ${SECRET_PREFIX}/monitoring (Grafana credentials)"
    echo ""
    echo "Next steps:"
    echo "  1. Apply the Kubernetes manifests that reference these secrets"
    echo "  2. Verify External Secrets are syncing properly"
    echo "  3. Test application connectivity with new secrets"
    echo "  4. Set up secret rotation automation (recommended)"
    echo ""
    echo "To check External Secret sync status:"
    echo "  kubectl get externalsecret -n $NAMESPACE"
    echo "  kubectl get secret -n $NAMESPACE"
    echo ""
}

main() {
    log_info "Starting production secrets setup for inventory management system..."
    log_info "AWS Region: $AWS_REGION"
    log_info "Namespace: $NAMESPACE"
    log_info "Secret Prefix: $SECRET_PREFIX"

    # Verify prerequisites
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is required but not installed"
        exit 1
    fi

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is required but not installed"
        exit 1
    fi

    if ! command -v helm &> /dev/null; then
        log_error "Helm is required but not installed"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi

    # Check Kubernetes connection
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    # Create namespace if it doesn't exist
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

    # Create all secrets
    create_database_secret
    create_redis_secret
    create_s3_secret
    create_auth_secret
    create_kong_secrets
    create_monitoring_secrets

    # Set up External Secrets
    install_external_secrets
    create_aws_credentials_secret
    create_grafana_credentials_secret

    # Verify everything
    verify_secrets

    # Setup rotation (informational)
    setup_secret_rotation

    # Display summary
    display_summary

    log_success "✅ Production secrets setup completed successfully!"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [--namespace NAMESPACE] [--region AWS_REGION]"
            echo "  --namespace: Kubernetes namespace (default: inventory-production)"
            echo "  --region: AWS region (default: us-east-1)"
            exit 0
            ;;
        *)
            log_error "Unknown parameter: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
