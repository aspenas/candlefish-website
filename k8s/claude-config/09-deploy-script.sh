#!/bin/bash

# Claude Config System - Kubernetes Deployment Script
# This script deploys the Claude Config System to AWS EKS

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="claude-config"
CLUSTER_NAME="${EKS_CLUSTER_NAME:-candlefish-eks}"
REGION="${AWS_REGION:-us-east-1}"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"

# Function to print colored messages
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

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        log_info "Attempting to update kubeconfig..."
        aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$REGION"
    fi
    
    log_success "Prerequisites check passed"
}

# Function to validate manifests
validate_manifests() {
    log_info "Validating Kubernetes manifests..."
    
    for file in *.yaml; do
        if [ -f "$file" ]; then
            kubectl apply --dry-run=client -f "$file" > /dev/null 2>&1 || {
                log_error "Validation failed for $file"
                exit 1
            }
            log_success "Validated: $file"
        fi
    done
}

# Function to update secrets with actual values
update_secrets() {
    log_info "Updating secrets with actual values..."
    
    # Get JWT secret from AWS Secrets Manager
    JWT_SECRET=$(aws secretsmanager get-secret-value \
        --secret-id candlefish/jwt-secret \
        --region "$REGION" \
        --query SecretString \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$JWT_SECRET" ]; then
        log_warning "JWT secret not found in AWS Secrets Manager, using default"
        JWT_SECRET="default-jwt-secret-change-in-production"
    fi
    
    # Update the secrets file
    sed -i.bak "s/your-shared-jwt-secret-here/$JWT_SECRET/g" 02-configmaps-secrets.yaml
    
    # Get ACM certificate ARN for ALB
    CERT_ARN=$(aws acm list-certificates \
        --region "$REGION" \
        --query "CertificateSummaryList[?DomainName=='*.candlefish.ai'].CertificateArn | [0]" \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$CERT_ARN" ]; then
        sed -i.bak "s|arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID|$CERT_ARN|g" 04-services-ingress.yaml
        log_success "Updated ACM certificate ARN"
    else
        log_warning "ACM certificate not found, update manually in 04-services-ingress.yaml"
    fi
}

# Function to deploy manifests
deploy_manifests() {
    log_info "Deploying Claude Config System to Kubernetes..."
    
    # Define deployment order
    declare -a files=(
        "01-namespace-rbac.yaml"
        "02-configmaps-secrets.yaml"
        "03-deployments.yaml"
        "04-services-ingress.yaml"
        "05-hpa-autoscaling.yaml"
        "06-network-policies.yaml"
        "07-pod-disruption-budgets.yaml"
        "08-monitoring.yaml"
    )
    
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            log_info "Applying $file..."
            kubectl apply -f "$file"
            
            # Wait a bit between deployments to avoid race conditions
            if [[ "$file" == *"deployments"* ]]; then
                sleep 5
            fi
        else
            log_warning "File not found: $file"
        fi
    done
    
    log_success "All manifests deployed successfully"
}

# Function to wait for deployments to be ready
wait_for_deployments() {
    log_info "Waiting for deployments to be ready..."
    
    declare -a services=(
        "config-service"
        "gateway-service"
        "sync-service"
        "metrics-service"
        "auth-service"
    )
    
    for service in "${services[@]}"; do
        log_info "Waiting for $service..."
        kubectl rollout status deployment/"$service" -n "$NAMESPACE" --timeout=300s || {
            log_error "Deployment $service failed to become ready"
            kubectl describe deployment "$service" -n "$NAMESPACE"
            exit 1
        }
        log_success "$service is ready"
    done
}

# Function to verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check pods
    log_info "Checking pod status..."
    kubectl get pods -n "$NAMESPACE" -o wide
    
    # Check services
    log_info "Checking services..."
    kubectl get svc -n "$NAMESPACE"
    
    # Check ingress
    log_info "Checking ingress..."
    kubectl get ingress -n "$NAMESPACE"
    
    # Get ALB URL
    ALB_URL=$(kubectl get ingress claude-config-ingress -n "$NAMESPACE" \
        -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    
    if [ -n "$ALB_URL" ]; then
        log_success "ALB URL: http://$ALB_URL"
        log_info "Waiting for ALB to be healthy (this may take a few minutes)..."
        sleep 30
        
        # Test health endpoint
        if curl -f "http://$ALB_URL/health" &> /dev/null; then
            log_success "Health check passed!"
        else
            log_warning "Health check failed, ALB may still be provisioning"
        fi
    else
        log_warning "ALB URL not yet available, check again in a few minutes"
    fi
    
    # Show HPA status
    log_info "HPA status:"
    kubectl get hpa -n "$NAMESPACE"
    
    # Show PDB status
    log_info "PodDisruptionBudget status:"
    kubectl get pdb -n "$NAMESPACE"
}

# Function to create port-forward for testing
setup_port_forward() {
    log_info "Setting up port-forward for local testing..."
    
    log_info "You can access the services locally using:"
    echo "  kubectl port-forward -n $NAMESPACE svc/gateway-service 8080:8080"
    echo "  Then access: http://localhost:8080"
}

# Function to rollback deployment
rollback() {
    log_warning "Rolling back deployment..."
    
    declare -a files=(
        "08-monitoring.yaml"
        "07-pod-disruption-budgets.yaml"
        "06-network-policies.yaml"
        "05-hpa-autoscaling.yaml"
        "04-services-ingress.yaml"
        "03-deployments.yaml"
        "02-configmaps-secrets.yaml"
        "01-namespace-rbac.yaml"
    )
    
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            kubectl delete -f "$file" --ignore-not-found=true
        fi
    done
    
    log_success "Rollback completed"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [COMMAND]

Commands:
    deploy      Deploy Claude Config System to Kubernetes
    verify      Verify the deployment status
    rollback    Remove the deployment
    help        Show this help message

Environment Variables:
    EKS_CLUSTER_NAME    Name of the EKS cluster (default: candlefish-eks)
    AWS_REGION          AWS region (default: us-east-1)
    DEPLOYMENT_ENV      Deployment environment (default: production)

Examples:
    $0 deploy
    EKS_CLUSTER_NAME=my-cluster $0 deploy
    $0 verify
    $0 rollback
EOF
}

# Main execution
main() {
    case "${1:-deploy}" in
        deploy)
            check_prerequisites
            validate_manifests
            update_secrets
            deploy_manifests
            wait_for_deployments
            verify_deployment
            setup_port_forward
            log_success "Deployment completed successfully!"
            ;;
        verify)
            verify_deployment
            ;;
        rollback)
            rollback
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            log_error "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"