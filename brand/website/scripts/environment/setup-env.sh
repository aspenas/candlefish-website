#!/bin/bash

# Environment Setup Script for Candlefish Website
# Configures environment variables and secrets for different deployment environments

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default values
ENVIRONMENT="${ENVIRONMENT:-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="${CLUSTER_NAME:-${ENVIRONMENT}-candlefish-website}"

# Colors for output
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

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    # Check for required tools
    local required_tools=("aws" "kubectl" "jq" "base64")
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_deps+=("$tool")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install the missing tools and try again."
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

# Verify AWS credentials and access
verify_aws_access() {
    log_info "Verifying AWS access..."
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        log_error "AWS credentials not configured or invalid"
        log_info "Please run 'aws configure' or set AWS environment variables"
        exit 1
    fi
    
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local user_info=$(aws sts get-caller-identity --query Arn --output text)
    
    log_success "AWS access verified - Account: $account_id, User: $user_info"
}

# Configure kubectl for EKS cluster
setup_kubectl() {
    log_info "Setting up kubectl for EKS cluster: $CLUSTER_NAME"
    
    # Update kubeconfig
    if aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER_NAME" &>/dev/null; then
        log_success "kubectl configured for cluster: $CLUSTER_NAME"
    else
        log_error "Failed to configure kubectl for cluster: $CLUSTER_NAME"
        log_info "Make sure the cluster exists and you have access to it"
        exit 1
    fi
    
    # Verify cluster access
    if kubectl cluster-info &>/dev/null; then
        log_success "Cluster access verified"
    else
        log_error "Cannot access Kubernetes cluster"
        exit 1
    fi
}

# Create namespace if it doesn't exist
setup_namespace() {
    local namespace="$ENVIRONMENT"
    
    log_info "Setting up namespace: $namespace"
    
    if kubectl get namespace "$namespace" &>/dev/null; then
        log_info "Namespace $namespace already exists"
    else
        kubectl create namespace "$namespace"
        log_success "Created namespace: $namespace"
    fi
    
    # Label namespace
    kubectl label namespace "$namespace" \
        app.kubernetes.io/name=candlefish-website \
        app.kubernetes.io/component=namespace \
        environment="$ENVIRONMENT" \
        --overwrite
    
    log_success "Namespace $namespace configured"
}

# Generate environment configuration file
generate_env_config() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    log_info "Generating environment configuration: $env_file"
    
    # Get infrastructure outputs from Terraform
    local terraform_dir="$PROJECT_ROOT/terraform"
    local outputs=""
    
    if [ -d "$terraform_dir" ]; then
        cd "$terraform_dir"
        if terraform output &>/dev/null; then
            outputs=$(terraform output -json)
        fi
        cd - >/dev/null
    fi
    
    # Extract values from Terraform outputs
    local cluster_endpoint=""
    local ecr_repository=""
    local rds_endpoint=""
    local redis_endpoint=""
    
    if [ -n "$outputs" ]; then
        cluster_endpoint=$(echo "$outputs" | jq -r '.cluster_endpoint.value // ""')
        ecr_repository=$(echo "$outputs" | jq -r '.ecr_repository_url.value // ""')
        rds_endpoint=$(echo "$outputs" | jq -r '.rds_endpoint.value // ""')
        redis_endpoint=$(echo "$outputs" | jq -r '.redis_primary_endpoint.value // ""')
    fi
    
    # Generate .env file
    cat > "$env_file" << EOF
# Candlefish Website Environment Configuration
# Environment: $ENVIRONMENT
# Generated: $(date -Iseconds)

# Application
NODE_ENV=$ENVIRONMENT
PORT=3000
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1

# AWS Configuration
AWS_REGION=$AWS_REGION
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")

# Kubernetes
K8S_CLUSTER_NAME=$CLUSTER_NAME
K8S_NAMESPACE=$ENVIRONMENT

# Infrastructure
CLUSTER_ENDPOINT=${cluster_endpoint}
ECR_REPOSITORY=${ecr_repository}
RDS_ENDPOINT=${rds_endpoint}
REDIS_ENDPOINT=${redis_endpoint}

# Secrets (managed by AWS Secrets Manager)
SECRET_ARN=arn:aws:secretsmanager:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo ""):secret:$ENVIRONMENT/candlefish-website/app-secrets

# Monitoring
PROMETHEUS_URL=http://prometheus.$ENVIRONMENT.svc.cluster.local:9090
GRAFANA_URL=http://grafana.$ENVIRONMENT.svc.cluster.local:3000

# CDN and Domain
DOMAIN_NAME=${DOMAIN_NAME:-candlefish.ai}
CDN_URL=${CDN_URL:-https://candlefish.ai}

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_SENTRY=true
ENABLE_METRICS=true

# Development/Staging specific
$(if [ "$ENVIRONMENT" != "production" ]; then
cat << DEV_EOF
DEBUG=true
LOG_LEVEL=debug
ENABLE_DEBUG_ROUTES=true
DEV_EOF
fi)

# Production specific
$(if [ "$ENVIRONMENT" = "production" ]; then
cat << PROD_EOF
DEBUG=false
LOG_LEVEL=info
ENABLE_DEBUG_ROUTES=false
PROD_EOF
fi)
EOF
    
    log_success "Environment configuration generated: $env_file"
}

# Create Kubernetes secrets from AWS Secrets Manager
setup_kubernetes_secrets() {
    local namespace="$ENVIRONMENT"
    local secret_name="app-secrets"
    local aws_secret_name="$ENVIRONMENT/candlefish-website/app-secrets"
    
    log_info "Setting up Kubernetes secrets from AWS Secrets Manager"
    
    # Check if AWS secret exists
    if ! aws secretsmanager describe-secret --secret-id "$aws_secret_name" &>/dev/null; then
        log_warning "AWS secret not found: $aws_secret_name"
        log_info "Creating placeholder secret..."
        
        # Create placeholder secret
        local secret_value='{
            "DATABASE_URL": "postgresql://user:pass@localhost:5432/candlefish",
            "REDIS_URL": "redis://localhost:6379",
            "JWT_SECRET": "'$(openssl rand -base64 32)'"
        }'
        
        aws secretsmanager create-secret \
            --name "$aws_secret_name" \
            --description "Application secrets for Candlefish website ($ENVIRONMENT)" \
            --secret-string "$secret_value" >/dev/null
        
        log_success "Created AWS secret: $aws_secret_name"
    fi
    
    # Get secret values
    local secret_json=$(aws secretsmanager get-secret-value \
        --secret-id "$aws_secret_name" \
        --query SecretString \
        --output text)
    
    # Extract individual values
    local database_url=$(echo "$secret_json" | jq -r '.DATABASE_URL')
    local redis_url=$(echo "$secret_json" | jq -r '.REDIS_URL')
    local jwt_secret=$(echo "$secret_json" | jq -r '.JWT_SECRET')
    
    # Create or update Kubernetes secret
    kubectl create secret generic "$secret_name" \
        --namespace="$namespace" \
        --from-literal=database-url="$database_url" \
        --from-literal=redis-url="$redis_url" \
        --from-literal=jwt-secret="$jwt_secret" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "Kubernetes secret configured: $secret_name"
}

# Install or update External Secrets Operator
setup_external_secrets() {
    log_info "Setting up External Secrets Operator..."
    
    # Check if External Secrets Operator is installed
    if ! kubectl get crd externalsecrets.external-secrets.io &>/dev/null; then
        log_info "Installing External Secrets Operator..."
        
        # Add Helm repository and install
        helm repo add external-secrets https://charts.external-secrets.io 2>/dev/null || true
        helm repo update
        
        helm upgrade --install external-secrets \
            external-secrets/external-secrets \
            --namespace external-secrets-system \
            --create-namespace \
            --set installCRDs=true \
            --wait
        
        log_success "External Secrets Operator installed"
    else
        log_info "External Secrets Operator already installed"
    fi
}

# Create service account with IRSA (IAM Roles for Service Accounts)
setup_service_account() {
    local namespace="$ENVIRONMENT"
    local service_account="candlefish-website-sa"
    local role_name="$ENVIRONMENT-candlefish-website-irsa-role"
    
    log_info "Setting up service account with IRSA..."
    
    # Get OIDC issuer URL
    local oidc_issuer=$(aws eks describe-cluster \
        --name "$CLUSTER_NAME" \
        --query "cluster.identity.oidc.issuer" \
        --output text | sed 's|https://||')
    
    # Create trust policy
    local trust_policy=$(cat << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):oidc-provider/$oidc_issuer"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "$oidc_issuer:sub": "system:serviceaccount:$namespace:$service_account",
          "$oidc_issuer:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF
)
    
    # Create IAM role if it doesn't exist
    if ! aws iam get-role --role-name "$role_name" &>/dev/null; then
        aws iam create-role \
            --role-name "$role_name" \
            --assume-role-policy-document "$trust_policy" >/dev/null
        
        log_success "Created IAM role: $role_name"
    else
        log_info "IAM role already exists: $role_name"
    fi
    
    # Attach policies
    local policies=(
        "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
        "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/$ENVIRONMENT-candlefish-website-secrets"
    )
    
    for policy in "${policies[@]}"; do
        aws iam attach-role-policy \
            --role-name "$role_name" \
            --policy-arn "$policy" 2>/dev/null || true
    done
    
    # Get role ARN
    local role_arn=$(aws iam get-role \
        --role-name "$role_name" \
        --query Role.Arn \
        --output text)
    
    # Create or update service account
    kubectl create serviceaccount "$service_account" \
        --namespace="$namespace" \
        --dry-run=client -o yaml | \
    kubectl annotate --local -f - \
        eks.amazonaws.com/role-arn="$role_arn" \
        -o yaml | \
    kubectl apply -f -
    
    log_success "Service account configured: $service_account"
}

# Validate the setup
validate_setup() {
    log_info "Validating setup..."
    
    local namespace="$ENVIRONMENT"
    local errors=0
    
    # Check namespace
    if ! kubectl get namespace "$namespace" &>/dev/null; then
        log_error "Namespace not found: $namespace"
        ((errors++))
    fi
    
    # Check secrets
    if ! kubectl get secret app-secrets -n "$namespace" &>/dev/null; then
        log_error "App secrets not found in namespace: $namespace"
        ((errors++))
    fi
    
    # Check service account
    if ! kubectl get serviceaccount candlefish-website-sa -n "$namespace" &>/dev/null; then
        log_error "Service account not found in namespace: $namespace"
        ((errors++))
    fi
    
    # Check External Secrets Operator
    if ! kubectl get pods -n external-secrets-system -l app.kubernetes.io/name=external-secrets &>/dev/null; then
        log_error "External Secrets Operator not running"
        ((errors++))
    fi
    
    if [ $errors -eq 0 ]; then
        log_success "Setup validation passed"
    else
        log_error "Setup validation failed with $errors errors"
        exit 1
    fi
}

# Print summary
print_summary() {
    log_info "Setup Summary"
    echo "=============="
    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "AWS Region: $AWS_REGION"
    echo "Cluster: $CLUSTER_NAME"
    echo "Namespace: $ENVIRONMENT"
    echo ""
    echo "Configuration files:"
    echo "  - .env.$ENVIRONMENT"
    echo ""
    echo "Kubernetes resources:"
    echo "  - Namespace: $ENVIRONMENT"
    echo "  - Secret: app-secrets"
    echo "  - ServiceAccount: candlefish-website-sa"
    echo ""
    log_success "Environment setup completed successfully!"
    echo ""
    log_info "Next steps:"
    echo "1. Deploy the application: ./scripts/deployment/deploy.sh"
    echo "2. Check status: kubectl get pods -n $ENVIRONMENT"
    echo "3. View logs: kubectl logs -f -l app=candlefish-website -n $ENVIRONMENT"
}

# Main function
main() {
    log_info "Starting environment setup for: $ENVIRONMENT"
    
    check_dependencies
    verify_aws_access
    setup_kubectl
    setup_namespace
    generate_env_config
    setup_external_secrets
    setup_service_account
    setup_kubernetes_secrets
    validate_setup
    print_summary
}

# Script usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Setup environment configuration for Candlefish Website deployment.

Options:
  -e, --environment ENV    Target environment (default: production)
  -r, --region REGION      AWS region (default: us-east-1)
  -c, --cluster CLUSTER    EKS cluster name (default: ENV-candlefish-website)
  -h, --help              Show this help message

Environment variables:
  ENVIRONMENT    Target environment
  AWS_REGION     AWS region
  CLUSTER_NAME   EKS cluster name
  DOMAIN_NAME    Domain name for the website

Examples:
  $0                                    # Setup production environment
  $0 -e staging                         # Setup staging environment
  $0 -e development -r us-west-2        # Setup development in us-west-2

EOF
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
        -c|--cluster)
            CLUSTER_NAME="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Update cluster name with environment if not explicitly set
if [[ "$CLUSTER_NAME" == *"ENV"* ]]; then
    CLUSTER_NAME="${CLUSTER_NAME/ENV/$ENVIRONMENT}"
fi

# Run main function
main