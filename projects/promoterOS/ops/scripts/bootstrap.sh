#!/usr/bin/env bash

# PromoterOS Bootstrap Script
# This script sets up the complete infrastructure and deploys PromoterOS to AWS

set -euo pipefail

# Configuration
export AWS_REGION="${AWS_REGION:-us-east-1}"
export AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-681214184463}"
export ENVIRONMENT="${ENVIRONMENT:-dev}"
export PROJECT_NAME="promoteros"
export TERRAFORM_VERSION="1.5.0"
export KUBECTL_VERSION="1.28.0"
export HELM_VERSION="3.13.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install it first."
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please configure AWS CLI."
        exit 1
    fi

    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        log_warn "Terraform not found. Installing..."
        install_terraform
    fi

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_warn "kubectl not found. Installing..."
        install_kubectl
    fi

    # Check Helm
    if ! command -v helm &> /dev/null; then
        log_warn "Helm not found. Installing..."
        install_helm
    fi

    log_info "All prerequisites satisfied!"
}

# Install Terraform
install_terraform() {
    log_info "Installing Terraform ${TERRAFORM_VERSION}..."
    curl -LO "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
    unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip
    sudo mv terraform /usr/local/bin/
    rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip
    log_info "Terraform installed successfully!"
}

# Install kubectl
install_kubectl() {
    log_info "Installing kubectl ${KUBECTL_VERSION}..."
    curl -LO "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
    chmod +x kubectl
    sudo mv kubectl /usr/local/bin/
    log_info "kubectl installed successfully!"
}

# Install Helm
install_helm() {
    log_info "Installing Helm ${HELM_VERSION}..."
    curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
    chmod 700 get_helm.sh
    ./get_helm.sh --version v${HELM_VERSION}
    rm get_helm.sh
    log_info "Helm installed successfully!"
}

# Create S3 bucket for Terraform state
create_state_bucket() {
    local bucket_name="${PROJECT_NAME}-terraform-state"

    log_info "Creating S3 bucket for Terraform state: ${bucket_name}..."

    if aws s3api head-bucket --bucket "${bucket_name}" 2>/dev/null; then
        log_warn "Bucket ${bucket_name} already exists"
    else
        aws s3api create-bucket \
            --bucket "${bucket_name}" \
            --region "${AWS_REGION}" \
            --create-bucket-configuration LocationConstraint="${AWS_REGION}"

        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "${bucket_name}" \
            --versioning-configuration Status=Enabled

        # Enable encryption
        aws s3api put-bucket-encryption \
            --bucket "${bucket_name}" \
            --server-side-encryption-configuration '{
                "Rules": [{
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }]
            }'

        log_info "S3 bucket created successfully!"
    fi
}

# Create DynamoDB table for Terraform locks
create_lock_table() {
    local table_name="${PROJECT_NAME}-terraform-locks"

    log_info "Creating DynamoDB table for Terraform locks: ${table_name}..."

    if aws dynamodb describe-table --table-name "${table_name}" &>/dev/null; then
        log_warn "Table ${table_name} already exists"
    else
        aws dynamodb create-table \
            --table-name "${table_name}" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region "${AWS_REGION}"

        log_info "DynamoDB table created successfully!"
    fi
}

# Initialize Terraform
init_terraform() {
    log_info "Initializing Terraform..."

    cd terraform/environments/${ENVIRONMENT}

    # Create backend config
    cat > backend.tf <<EOF
terraform {
  backend "s3" {
    bucket         = "${PROJECT_NAME}-terraform-state"
    key            = "${ENVIRONMENT}/terraform.tfstate"
    region         = "${AWS_REGION}"
    dynamodb_table = "${PROJECT_NAME}-terraform-locks"
    encrypt        = true
  }
}
EOF

    terraform init
    log_info "Terraform initialized successfully!"
}

# Apply Terraform infrastructure
apply_terraform() {
    log_info "Applying Terraform configuration for ${ENVIRONMENT}..."

    cd terraform/environments/${ENVIRONMENT}

    # Plan first
    terraform plan -out=tfplan

    # Ask for confirmation
    read -p "Do you want to apply this plan? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        log_warn "Terraform apply cancelled"
        return
    fi

    # Apply
    terraform apply tfplan

    # Save outputs
    terraform output -json > outputs.json

    log_info "Terraform applied successfully!"
}

# Update kubeconfig for EKS
update_kubeconfig() {
    log_info "Updating kubeconfig for EKS cluster..."

    local cluster_name="${PROJECT_NAME}-eks-${ENVIRONMENT}"

    aws eks update-kubeconfig \
        --region "${AWS_REGION}" \
        --name "${cluster_name}"

    # Verify connection
    kubectl cluster-info

    log_info "kubeconfig updated successfully!"
}

# Install Istio service mesh
install_istio() {
    log_info "Installing Istio service mesh..."

    # Download Istio
    curl -L https://istio.io/downloadIstio | sh -
    cd istio-*
    export PATH=$PWD/bin:$PATH

    # Install Istio
    istioctl install --set profile=production -y

    # Enable injection for namespaces
    kubectl label namespace promoteros-api istio-injection=enabled
    kubectl label namespace promoteros-scrapers istio-injection=enabled
    kubectl label namespace promoteros-ml istio-injection=enabled
    kubectl label namespace promoteros-realtime istio-injection=enabled

    cd ..
    log_info "Istio installed successfully!"
}

# Install cert-manager
install_cert_manager() {
    log_info "Installing cert-manager..."

    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

    # Wait for cert-manager to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager
    kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-webhook -n cert-manager
    kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-cainjector -n cert-manager

    log_info "cert-manager installed successfully!"
}

# Deploy PromoterOS with Helm
deploy_promoteros() {
    log_info "Deploying PromoterOS with Helm..."

    # Add Helm repositories
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update

    # Create namespaces
    kubectl apply -f k8s/base/namespaces/namespaces.yaml

    # Install PromoterOS
    helm upgrade --install promoteros ./helm/charts/promoteros \
        --namespace promoteros-${ENVIRONMENT} \
        --create-namespace \
        --values helm/values/${ENVIRONMENT}.yaml \
        --wait \
        --timeout 15m

    log_info "PromoterOS deployed successfully!"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    # Get database credentials from Terraform output
    local db_host=$(terraform output -raw -state=terraform/environments/${ENVIRONMENT}/terraform.tfstate rds_endpoint)
    local db_password=$(aws secretsmanager get-secret-value --secret-id promoteros/rds/master-password --query SecretString --output text | jq -r .password)

    # Run migrations
    DATABASE_URL="postgresql://promoteros_app:${db_password}@${db_host}/promoteros" \
        migrate -path db/migrations -database "$DATABASE_URL" up

    log_info "Database migrations completed!"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring stack..."

    # Deploy Prometheus
    helm upgrade --install prometheus prometheus-community/prometheus \
        --namespace promoteros-monitoring \
        --create-namespace \
        --values helm/values/prometheus.yaml \
        --wait

    # Deploy Grafana
    helm upgrade --install grafana grafana/grafana \
        --namespace promoteros-monitoring \
        --values helm/values/grafana.yaml \
        --wait

    # Get Grafana admin password
    local grafana_password=$(kubectl get secret --namespace promoteros-monitoring grafana -o jsonpath="{.data.admin-password}" | base64 --decode)

    log_info "Grafana admin password: ${grafana_password}"
    log_info "Monitoring stack deployed successfully!"
}

# Run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."

    # Get ALB endpoint
    local alb_endpoint=$(kubectl get ingress -n promoteros-${ENVIRONMENT} api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

    # Health check
    if curl -f "http://${alb_endpoint}/health/live"; then
        log_info "Health check passed!"
    else
        log_error "Health check failed!"
        return 1
    fi

    # API test
    if curl -f "http://${alb_endpoint}/api/v1/artists"; then
        log_info "API test passed!"
    else
        log_error "API test failed!"
        return 1
    fi

    log_info "All smoke tests passed!"
}

# Print summary
print_summary() {
    log_info "========================================="
    log_info "PromoterOS Deployment Complete!"
    log_info "========================================="
    log_info "Environment: ${ENVIRONMENT}"
    log_info "AWS Region: ${AWS_REGION}"
    log_info "AWS Account: ${AWS_ACCOUNT_ID}"
    log_info ""
    log_info "Access URLs:"

    local alb_endpoint=$(kubectl get ingress -n promoteros-${ENVIRONMENT} api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    log_info "API Gateway: https://${alb_endpoint}"

    local grafana_endpoint=$(kubectl get ingress -n promoteros-monitoring grafana -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    log_info "Grafana: https://${grafana_endpoint}"

    log_info ""
    log_info "Next steps:"
    log_info "1. Configure DNS records to point to the ALB"
    log_info "2. Set up SSL certificates"
    log_info "3. Configure external secrets"
    log_info "4. Run integration tests"
    log_info "========================================="
}

# Main execution
main() {
    log_info "Starting PromoterOS bootstrap for environment: ${ENVIRONMENT}"

    # Phase 1: Prerequisites
    check_prerequisites

    # Phase 2: Terraform Backend
    create_state_bucket
    create_lock_table

    # Phase 3: Infrastructure
    init_terraform
    apply_terraform

    # Phase 4: Kubernetes Setup
    update_kubeconfig
    install_istio
    install_cert_manager

    # Phase 5: Application Deployment
    deploy_promoteros
    run_migrations

    # Phase 6: Monitoring
    setup_monitoring

    # Phase 7: Validation
    run_smoke_tests

    # Phase 8: Summary
    print_summary

    log_info "Bootstrap completed successfully!"
}

# Run main function
main "$@"
