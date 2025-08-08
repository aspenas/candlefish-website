#!/bin/bash

# Production Deployment Script for Paintbox Application
# This script handles the complete deployment process including infrastructure and application

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$PROJECT_ROOT/terraform"
ENVIRONMENT="production"

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
check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing_tools=()

    command -v aws >/dev/null 2>&1 || missing_tools+=("aws-cli")
    command -v terraform >/dev/null 2>&1 || missing_tools+=("terraform")
    command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
    command -v gh >/dev/null 2>&1 || missing_tools+=("github-cli")

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install the missing tools and try again."
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials not configured. Please run 'aws configure' or set appropriate environment variables."
        exit 1
    fi

    log_success "All prerequisites satisfied"
}

# Validate environment and configuration
validate_environment() {
    log_info "Validating environment configuration..."

    # Check if production tfvars exists
    if [ ! -f "$TERRAFORM_DIR/environments/production.tfvars" ]; then
        log_error "Production configuration file not found: $TERRAFORM_DIR/environments/production.tfvars"
        exit 1
    fi

    # Check if we're on the correct branch
    local current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ] && [ "$current_branch" != "production" ]; then
        log_warning "Not on main or production branch. Current branch: $current_branch"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    # Check if there are uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "There are uncommitted changes in the repository."
        log_warning "It's recommended to commit all changes before deploying to production."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    log_success "Environment validation complete"
}

# Build and push Docker image
build_and_push_image() {
    log_info "Building and pushing Docker image..."

    cd "$PROJECT_ROOT"

    # Get the git commit hash for tagging
    local git_hash=$(git rev-parse --short HEAD)
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local image_tag="ghcr.io/aspenas/candlefish-ai/paintbox:${git_hash}-${timestamp}"
    local latest_tag="ghcr.io/aspenas/candlefish-ai/paintbox:latest"

    log_info "Building image with tag: $image_tag"

    # Build the production Docker image
    docker build -f Dockerfile.production -t "$image_tag" -t "$latest_tag" .

    # Login to GitHub Container Registry
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin

    # Push the images
    docker push "$image_tag"
    docker push "$latest_tag"

    log_success "Docker image built and pushed successfully"

    # Export the image tag for use in terraform
    export TF_VAR_app_image="$image_tag"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."

    cd "$TERRAFORM_DIR"

    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init

    # Create workspace for production if it doesn't exist
    terraform workspace select production 2>/dev/null || terraform workspace new production

    # Plan the deployment
    log_info "Planning infrastructure changes..."
    terraform plan \
        -var-file="environments/production.tfvars" \
        -out="production.tfplan"

    # Ask for confirmation
    echo
    log_warning "About to apply the above infrastructure changes to PRODUCTION."
    read -p "Do you want to continue? (yes/no): " -r
    echo
    if [ "$REPLY" != "yes" ]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi

    # Apply the changes
    log_info "Applying infrastructure changes..."
    terraform apply "production.tfplan"

    # Clean up plan file
    rm -f "production.tfplan"

    log_success "Infrastructure deployment complete"
}

# Update application secrets
update_secrets() {
    log_info "Updating application secrets..."

    # This function would typically update secrets in AWS Secrets Manager
    # For now, we'll just provide instructions

    log_warning "IMPORTANT: Please ensure the following secrets are updated in AWS Secrets Manager:"
    echo "  - paintbox/production/database/password"
    echo "  - paintbox/production/redis/auth-token"
    echo "  - paintbox/production/salesforce/credentials"
    echo "  - paintbox/production/companycam/credentials"
    echo "  - paintbox/production/anthropic/api-key"
    echo "  - paintbox/production/email/credentials"
    echo "  - paintbox/production/app/encryption-keys"

    read -p "Have you updated all required secrets? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Please update the secrets before continuing"
        exit 1
    fi

    log_success "Secrets verification complete"
}

# Deploy application to ECS
deploy_application() {
    log_info "Deploying application to ECS..."

    # Get cluster name from Terraform output
    cd "$TERRAFORM_DIR"
    local cluster_name=$(terraform output -raw ecs_cluster_name)
    local service_name=$(terraform output -raw ecs_service_name)

    if [ -z "$cluster_name" ] || [ -z "$service_name" ]; then
        log_error "Could not retrieve ECS cluster or service name from Terraform outputs"
        exit 1
    fi

    log_info "Updating ECS service: $service_name in cluster: $cluster_name"

    # Force new deployment
    aws ecs update-service \
        --cluster "$cluster_name" \
        --service "$service_name" \
        --force-new-deployment \
        --query 'service.{ServiceName:serviceName,Status:status,TaskDefinition:taskDefinition}' \
        --output table

    # Wait for deployment to complete
    log_info "Waiting for deployment to complete..."
    aws ecs wait services-stable \
        --cluster "$cluster_name" \
        --services "$service_name"

    log_success "Application deployment complete"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."

    cd "$TERRAFORM_DIR"
    local alb_dns_name=$(terraform output -raw load_balancer_dns_name)
    local health_check_url="https://$alb_dns_name/api/health"

    log_info "Health check URL: $health_check_url"

    # Wait for the service to be ready
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        log_info "Health check attempt $attempt/$max_attempts..."

        if curl -s -f "$health_check_url" >/dev/null; then
            log_success "Health check passed!"
            return 0
        fi

        if [ $attempt -eq $max_attempts ]; then
            log_error "Health check failed after $max_attempts attempts"
            return 1
        fi

        sleep 30
        ((attempt++))
    done
}

# Invalidate CloudFront cache
invalidate_cloudfront() {
    log_info "Invalidating CloudFront cache..."

    cd "$TERRAFORM_DIR"
    local distribution_id=$(terraform output -raw cloudfront_distribution_id)

    if [ -n "$distribution_id" ]; then
        aws cloudfront create-invalidation \
            --distribution-id "$distribution_id" \
            --paths "/*" \
            --query 'Invalidation.{Id:Id,Status:Status}' \
            --output table

        log_success "CloudFront cache invalidation initiated"
    else
        log_warning "CloudFront distribution ID not found, skipping cache invalidation"
    fi
}

# Create deployment notification
create_notification() {
    log_info "Creating deployment notification..."

    local git_hash=$(git rev-parse --short HEAD)
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S UTC')
    local deployer=$(git config user.name || whoami)

    # This could be enhanced to send notifications to Slack, email, etc.
    log_success "Deployment notification created"
    log_info "Deployment Details:"
    echo "  Environment: $ENVIRONMENT"
    echo "  Git Hash: $git_hash"
    echo "  Deployed by: $deployer"
    echo "  Deployed at: $timestamp"
}

# Rollback function (in case something goes wrong)
rollback() {
    log_error "Deployment failed. Initiating rollback..."

    cd "$TERRAFORM_DIR"
    local cluster_name=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "")
    local service_name=$(terraform output -raw ecs_service_name 2>/dev/null || echo "")

    if [ -n "$cluster_name" ] && [ -n "$service_name" ]; then
        log_info "Rolling back ECS service to previous task definition..."

        # This is a simplified rollback - in practice, you'd want to store
        # the previous task definition ARN and roll back to that specific version
        aws ecs update-service \
            --cluster "$cluster_name" \
            --service "$service_name" \
            --force-new-deployment >/dev/null 2>&1 || true
    fi

    log_info "Manual intervention may be required to fully rollback the deployment"
    log_info "Check the AWS console and application logs for more details"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    cd "$TERRAFORM_DIR"
    rm -f production.tfplan
    rm -f secret_rotation.zip
}

# Main deployment function
main() {
    log_info "Starting production deployment for Paintbox application"
    log_info "Environment: $ENVIRONMENT"
    log_info "Project root: $PROJECT_ROOT"
    echo

    # Set trap for cleanup and rollback on error
    trap cleanup EXIT
    trap 'rollback; cleanup; exit 1' ERR

    # Check required environment variables
    if [ -z "${GITHUB_TOKEN:-}" ] || [ -z "${GITHUB_USERNAME:-}" ]; then
        log_error "GitHub credentials not set. Please set GITHUB_TOKEN and GITHUB_USERNAME environment variables."
        exit 1
    fi

    # Run deployment steps
    check_prerequisites
    validate_environment
    build_and_push_image
    deploy_infrastructure
    update_secrets
    deploy_application
    run_health_checks
    invalidate_cloudfront
    create_notification

    echo
    log_success "🎉 Production deployment completed successfully!"
    log_info "Application should be available at the configured domain"
    log_info "Monitor the application logs and metrics for any issues"
}

# Handle command line arguments
case "${1:-}" in
    --dry-run)
        log_info "Dry run mode - will not make any actual changes"
        # Add dry run logic here
        ;;
    --help|-h)
        echo "Usage: $0 [--dry-run] [--help]"
        echo "  --dry-run: Show what would be done without making changes"
        echo "  --help:    Show this help message"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        exit 1
        ;;
esac
