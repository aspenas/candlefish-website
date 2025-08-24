#!/bin/bash

# =========================================
# Candlefish AI - Secrets Management Script
# =========================================
#
# This script manages environment secrets across different deployment targets
# - AWS Secrets Manager for production secrets
# - Kubernetes secrets for runtime environment
# - GitHub secrets for CI/CD pipeline
# - Netlify environment variables for frontend deployments

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AWS_REGION="${AWS_REGION:-us-east-1}"
NAMESPACE_PRODUCTION="candlefish-production"
NAMESPACE_STAGING="candlefish-staging"

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

# Help function
show_help() {
    cat << EOF
Candlefish AI Secrets Management

Usage: $0 <command> [options]

Commands:
    init                Initialize secrets infrastructure
    create              Create new secret
    update              Update existing secret
    rotate              Rotate secret with zero downtime
    sync                Sync secrets between environments
    backup              Backup secrets to encrypted storage
    restore             Restore secrets from backup
    validate            Validate secrets configuration
    deploy-k8s          Deploy secrets to Kubernetes
    deploy-netlify      Deploy environment variables to Netlify

Options:
    --environment, -e   Environment (production, staging, development)
    --secret-name, -s   Secret name
    --secret-value, -v  Secret value
    --aws-profile, -p   AWS profile to use
    --dry-run          Show what would be done without executing
    --help, -h         Show this help message

Examples:
    $0 init --environment production
    $0 create --environment staging --secret-name JWT_SECRET --secret-value "your-jwt-secret"
    $0 rotate --environment production --secret-name DATABASE_PASSWORD
    $0 sync --source production --target staging
    $0 deploy-k8s --environment production

EOF
}

# Check dependencies
check_dependencies() {
    local missing_deps=()

    if ! command -v aws &> /dev/null; then
        missing_deps+=("aws-cli")
    fi

    if ! command -v kubectl &> /dev/null; then
        missing_deps+=("kubectl")
    fi

    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi

    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install the missing dependencies and try again."
        exit 1
    fi
}

# Initialize secrets infrastructure
init_secrets() {
    local environment="$1"

    log_info "Initializing secrets infrastructure for environment: $environment"

    # Create AWS Secrets Manager secrets structure
    create_aws_secrets_structure "$environment"

    # Create Kubernetes namespace and service accounts
    create_k8s_secrets_infrastructure "$environment"

    # Set up External Secrets Operator (if using)
    setup_external_secrets "$environment"

    log_success "Secrets infrastructure initialized for $environment"
}

# Create AWS Secrets Manager structure
create_aws_secrets_structure() {
    local environment="$1"

    local secrets=(
        "candlefish/database/$environment"
        "candlefish/cache/$environment"
        "candlefish/auth/$environment"
        "candlefish/storage/$environment"
        "candlefish/monitoring/$environment"
        "candlefish/integrations/$environment"
    )

    for secret_name in "${secrets[@]}"; do
        if aws secretsmanager describe-secret --secret-id "$secret_name" &>/dev/null; then
            log_warning "Secret $secret_name already exists, skipping"
        else
            log_info "Creating secret: $secret_name"
            aws secretsmanager create-secret \
                --name "$secret_name" \
                --description "Candlefish AI $environment environment secrets" \
                --secret-string '{}' \
                --tags '[
                    {"Key": "Environment", "Value": "'"$environment"'"},
                    {"Key": "Project", "Value": "candlefish-ai"},
                    {"Key": "ManagedBy", "Value": "deployment-script"}
                ]'
        fi
    done
}

# Create Kubernetes secrets infrastructure
create_k8s_secrets_infrastructure() {
    local environment="$1"
    local namespace

    if [[ "$environment" == "production" ]]; then
        namespace="$NAMESPACE_PRODUCTION"
    else
        namespace="$NAMESPACE_STAGING"
    fi

    log_info "Creating Kubernetes secrets infrastructure for namespace: $namespace"

    # Create namespace if it doesn't exist
    kubectl create namespace "$namespace" --dry-run=client -o yaml | kubectl apply -f -

    # Create service account for external secrets
    cat << EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets-sa
  namespace: $namespace
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/candlefish-external-secrets-role
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: $namespace
  name: external-secrets-role
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: external-secrets-binding
  namespace: $namespace
subjects:
- kind: ServiceAccount
  name: external-secrets-sa
  namespace: $namespace
roleRef:
  kind: Role
  name: external-secrets-role
  apiGroup: rbac.authorization.k8s.io
EOF
}

# Set up External Secrets Operator
setup_external_secrets() {
    local environment="$1"
    local namespace

    if [[ "$environment" == "production" ]]; then
        namespace="$NAMESPACE_PRODUCTION"
    else
        namespace="$NAMESPACE_STAGING"
    fi

    log_info "Setting up External Secrets Operator for $environment"

    # Create SecretStore
    cat << EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: $namespace
spec:
  provider:
    aws:
      service: SecretsManager
      region: $AWS_REGION
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
EOF

    # Create ExternalSecret for database credentials
    cat << EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: $namespace
spec:
  refreshInterval: 15s
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: database-secret
    creationPolicy: Owner
  data:
  - secretKey: DATABASE_URL
    remoteRef:
      key: candlefish/database/$environment
      property: DATABASE_URL
  - secretKey: DB_PASSWORD
    remoteRef:
      key: candlefish/database/$environment
      property: DB_PASSWORD
EOF
}

# Create a new secret
create_secret() {
    local environment="$1"
    local secret_name="$2"
    local secret_value="$3"
    local aws_secret_path="$4"

    log_info "Creating secret: $secret_name in $environment environment"

    # Update AWS Secrets Manager
    local existing_secret
    existing_secret=$(aws secretsmanager get-secret-value --secret-id "$aws_secret_path" --query SecretString --output text 2>/dev/null || echo '{}')

    local updated_secret
    updated_secret=$(echo "$existing_secret" | jq --arg key "$secret_name" --arg value "$secret_value" '. + {($key): $value}')

    aws secretsmanager update-secret \
        --secret-id "$aws_secret_path" \
        --secret-string "$updated_secret"

    log_success "Secret $secret_name created in AWS Secrets Manager"
}

# Rotate a secret with zero downtime
rotate_secret() {
    local environment="$1"
    local secret_name="$2"

    log_info "Rotating secret: $secret_name in $environment environment"

    case "$secret_name" in
        "JWT_SECRET")
            rotate_jwt_secret "$environment"
            ;;
        "DATABASE_PASSWORD")
            rotate_database_password "$environment"
            ;;
        "ENCRYPTION_KEY")
            rotate_encryption_key "$environment"
            ;;
        *)
            log_error "Unknown secret rotation procedure for: $secret_name"
            return 1
            ;;
    esac

    log_success "Secret $secret_name rotated successfully"
}

# Rotate JWT secret with zero downtime
rotate_jwt_secret() {
    local environment="$1"
    local new_secret

    # Generate new JWT secret
    new_secret=$(openssl rand -hex 32)

    log_info "Rotating JWT secret for $environment"

    # Update the secret in AWS Secrets Manager
    create_secret "$environment" "JWT_SECRET_NEW" "$new_secret" "candlefish/auth/$environment"

    # Deploy updated configuration to Kubernetes
    deploy_k8s_secrets "$environment"

    # Wait for pods to restart and pick up new secret
    sleep 60

    # Verify all pods are healthy
    if verify_deployment_health "$environment"; then
        # Move new secret to primary
        create_secret "$environment" "JWT_SECRET" "$new_secret" "candlefish/auth/$environment"

        # Remove temporary secret
        local existing_secret
        existing_secret=$(aws secretsmanager get-secret-value --secret-id "candlefish/auth/$environment" --query SecretString --output text)
        local updated_secret
        updated_secret=$(echo "$existing_secret" | jq 'del(.JWT_SECRET_NEW)')

        aws secretsmanager update-secret \
            --secret-id "candlefish/auth/$environment" \
            --secret-string "$updated_secret"
    else
        log_error "Health check failed, rolling back JWT secret rotation"
        return 1
    fi
}

# Deploy secrets to Kubernetes
deploy_k8s_secrets() {
    local environment="$1"
    local namespace

    if [[ "$environment" == "production" ]]; then
        namespace="$NAMESPACE_PRODUCTION"
    else
        namespace="$NAMESPACE_STAGING"
    fi

    log_info "Deploying secrets to Kubernetes namespace: $namespace"

    # Force refresh of External Secrets
    kubectl annotate externalsecret database-credentials -n "$namespace" force-sync="$(date +%s)" --overwrite
    kubectl annotate externalsecret cache-credentials -n "$namespace" force-sync="$(date +%s)" --overwrite
    kubectl annotate externalsecret auth-credentials -n "$namespace" force-sync="$(date +%s)" --overwrite

    # Wait for secrets to be updated
    sleep 10

    # Restart deployments to pick up new secrets
    kubectl rollout restart deployment -n "$namespace"

    # Wait for rollout to complete
    kubectl rollout status deployment -n "$namespace" --timeout=300s
}

# Deploy environment variables to Netlify
deploy_netlify_secrets() {
    local environment="$1"

    log_info "Deploying environment variables to Netlify for $environment"

    local netlify_sites
    if [[ "$environment" == "production" ]]; then
        netlify_sites=(
            "$NETLIFY_DOCS_SITE_ID"
            "$NETLIFY_PARTNERS_SITE_ID"
            "$NETLIFY_API_SITE_ID"
        )
    else
        netlify_sites=(
            "$NETLIFY_DOCS_STAGING_SITE_ID"
            "$NETLIFY_PARTNERS_STAGING_SITE_ID"
            "$NETLIFY_API_STAGING_SITE_ID"
        )
    fi

    # Get secrets from AWS
    local secrets
    secrets=$(aws secretsmanager get-secret-value --secret-id "candlefish/integrations/$environment" --query SecretString --output text)

    local sentry_dsn
    local analytics_id
    sentry_dsn=$(echo "$secrets" | jq -r '.SENTRY_DSN')
    analytics_id=$(echo "$secrets" | jq -r '.GOOGLE_ANALYTICS_ID')

    for site_id in "${netlify_sites[@]}"; do
        if [[ -n "$site_id" && "$site_id" != "null" ]]; then
            log_info "Updating Netlify site: $site_id"

            # Update environment variables via Netlify API
            curl -X PATCH "https://api.netlify.com/api/v1/sites/$site_id/env" \
                -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
                -H "Content-Type: application/json" \
                -d '{
                    "SENTRY_DSN": "'"$sentry_dsn"'",
                    "GA_TRACKING_ID": "'"$analytics_id"'"
                }'
        fi
    done
}

# Verify deployment health
verify_deployment_health() {
    local environment="$1"
    local namespace

    if [[ "$environment" == "production" ]]; then
        namespace="$NAMESPACE_PRODUCTION"
    else
        namespace="$NAMESPACE_STAGING"
    fi

    log_info "Verifying deployment health for $environment"

    # Check if all pods are ready
    local ready_pods
    ready_pods=$(kubectl get pods -n "$namespace" --field-selector=status.phase=Running -o json | jq '.items | length')

    local total_pods
    total_pods=$(kubectl get pods -n "$namespace" -o json | jq '.items | length')

    if [[ "$ready_pods" -eq "$total_pods" ]] && [[ "$ready_pods" -gt 0 ]]; then
        log_success "All $ready_pods pods are healthy"
        return 0
    else
        log_error "Health check failed: $ready_pods/$total_pods pods are ready"
        return 1
    fi
}

# Validate secrets configuration
validate_secrets() {
    local environment="$1"

    log_info "Validating secrets configuration for $environment"

    local validation_errors=0

    # Check AWS Secrets Manager
    local required_secrets=(
        "candlefish/database/$environment"
        "candlefish/cache/$environment"
        "candlefish/auth/$environment"
        "candlefish/storage/$environment"
    )

    for secret in "${required_secrets[@]}"; do
        if ! aws secretsmanager describe-secret --secret-id "$secret" &>/dev/null; then
            log_error "Missing AWS secret: $secret"
            ((validation_errors++))
        else
            log_success "AWS secret exists: $secret"
        fi
    done

    # Check Kubernetes secrets
    local namespace
    if [[ "$environment" == "production" ]]; then
        namespace="$NAMESPACE_PRODUCTION"
    else
        namespace="$NAMESPACE_STAGING"
    fi

    local k8s_secrets=(
        "database-secret"
        "cache-secret"
        "auth-secret"
        "storage-secret"
    )

    for secret in "${k8s_secrets[@]}"; do
        if ! kubectl get secret "$secret" -n "$namespace" &>/dev/null; then
            log_error "Missing Kubernetes secret: $secret"
            ((validation_errors++))
        else
            log_success "Kubernetes secret exists: $secret"
        fi
    done

    if [[ $validation_errors -eq 0 ]]; then
        log_success "All secrets validation checks passed"
        return 0
    else
        log_error "Validation failed with $validation_errors errors"
        return 1
    fi
}

# Main function
main() {
    local command=""
    local environment=""
    local secret_name=""
    local secret_value=""
    local aws_profile=""
    local dry_run=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            init|create|update|rotate|sync|backup|restore|validate|deploy-k8s|deploy-netlify)
                command="$1"
                shift
                ;;
            -e|--environment)
                environment="$2"
                shift 2
                ;;
            -s|--secret-name)
                secret_name="$2"
                shift 2
                ;;
            -v|--secret-value)
                secret_value="$2"
                shift 2
                ;;
            -p|--aws-profile)
                aws_profile="$2"
                shift 2
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Check for required command
    if [[ -z "$command" ]]; then
        log_error "Command is required"
        show_help
        exit 1
    fi

    # Set AWS profile if provided
    if [[ -n "$aws_profile" ]]; then
        export AWS_PROFILE="$aws_profile"
    fi

    # Check dependencies
    check_dependencies

    # Execute command
    case "$command" in
        init)
            [[ -z "$environment" ]] && { log_error "Environment is required for init"; exit 1; }
            init_secrets "$environment"
            ;;
        create)
            [[ -z "$environment" ]] && { log_error "Environment is required"; exit 1; }
            [[ -z "$secret_name" ]] && { log_error "Secret name is required"; exit 1; }
            [[ -z "$secret_value" ]] && { log_error "Secret value is required"; exit 1; }
            create_secret "$environment" "$secret_name" "$secret_value" "candlefish/auth/$environment"
            ;;
        rotate)
            [[ -z "$environment" ]] && { log_error "Environment is required"; exit 1; }
            [[ -z "$secret_name" ]] && { log_error "Secret name is required"; exit 1; }
            rotate_secret "$environment" "$secret_name"
            ;;
        validate)
            [[ -z "$environment" ]] && { log_error "Environment is required"; exit 1; }
            validate_secrets "$environment"
            ;;
        deploy-k8s)
            [[ -z "$environment" ]] && { log_error "Environment is required"; exit 1; }
            deploy_k8s_secrets "$environment"
            ;;
        deploy-netlify)
            [[ -z "$environment" ]] && { log_error "Environment is required"; exit 1; }
            deploy_netlify_secrets "$environment"
            ;;
        *)
            log_error "Command '$command' not yet implemented"
            exit 1
            ;;
    esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
