#!/bin/bash

# Claude Configuration System - Infrastructure Deployment Script
# This script automates the deployment of the complete AWS infrastructure

set -euo pipefail  # Exit on error, undefined variables, and pipe failures

# Configuration
PROJECT_NAME="claude-config"
TERRAFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${TERRAFORM_DIR}/deploy-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="${TERRAFORM_DIR}/backups/$(date +%Y%m%d-%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "${LOG_FILE}"
}

# Colored output functions
info() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "${LOG_FILE}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "${LOG_FILE}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "${LOG_FILE}"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "${LOG_FILE}"
}

# Function to check if required tools are installed
check_prerequisites() {
    info "Checking prerequisites..."
    
    local tools=("terraform" "aws" "jq")
    local missing_tools=()
    
    for tool in "${tools[@]}"; do
        if ! command -v "${tool}" &> /dev/null; then
            missing_tools+=("${tool}")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "Missing required tools: ${missing_tools[*]}"
        echo
        echo "Please install the missing tools:"
        echo "- Terraform: https://www.terraform.io/downloads.html"
        echo "- AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        echo "- jq: https://stedolan.github.io/jq/download/"
        exit 1
    fi
    
    success "All prerequisites are installed"
}

# Function to validate terraform.tfvars file
validate_tfvars() {
    info "Validating terraform.tfvars..."
    
    if [[ ! -f "${TERRAFORM_DIR}/terraform.tfvars" ]]; then
        error "terraform.tfvars not found!"
        echo
        echo "Please create terraform.tfvars from terraform.tfvars.example:"
        echo "  cp terraform.tfvars.example terraform.tfvars"
        echo "  # Edit terraform.tfvars with your actual values"
        exit 1
    fi
    
    # Check for placeholder values that need to be changed
    local placeholders=("CHANGE_ME" "AKIAZ5G4HRQHXCTDSXNI")
    for placeholder in "${placeholders[@]}"; do
        if grep -q "${placeholder}" "${TERRAFORM_DIR}/terraform.tfvars"; then
            error "Found placeholder values in terraform.tfvars"
            echo
            echo "Please update terraform.tfvars with actual values:"
            grep -n "${placeholder}" "${TERRAFORM_DIR}/terraform.tfvars"
            exit 1
        fi
    done
    
    success "terraform.tfvars validation passed"
}

# Function to check AWS credentials
check_aws_credentials() {
    info "Checking AWS credentials..."
    
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured or invalid"
        echo
        echo "Please configure AWS credentials using one of:"
        echo "  aws configure"
        echo "  export AWS_ACCESS_KEY_ID=your_key"
        echo "  export AWS_SECRET_ACCESS_KEY=your_secret"
        exit 1
    fi
    
    local account_id
    account_id=$(aws sts get-caller-identity --query 'Account' --output text)
    success "AWS credentials validated for account: ${account_id}"
}

# Function to create S3 backend bucket if it doesn't exist
setup_terraform_backend() {
    info "Setting up Terraform backend..."
    
    local bucket_name="candlefish-terraform-state"
    local dynamodb_table="candlefish-terraform-locks"
    local region="us-east-1"
    
    # Check if bucket exists
    if ! aws s3api head-bucket --bucket "${bucket_name}" 2>/dev/null; then
        info "Creating S3 bucket for Terraform state: ${bucket_name}"
        aws s3api create-bucket --bucket "${bucket_name}" --region "${region}"
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "${bucket_name}" \
            --versioning-configuration Status=Enabled
        
        # Enable server-side encryption
        aws s3api put-bucket-encryption \
            --bucket "${bucket_name}" \
            --server-side-encryption-configuration '{
                "Rules": [{
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }]
            }'
        
        # Block public access
        aws s3api put-public-access-block \
            --bucket "${bucket_name}" \
            --public-access-block-configuration \
            BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
        
        success "S3 bucket created and configured"
    else
        info "S3 bucket already exists: ${bucket_name}"
    fi
    
    # Check if DynamoDB table exists
    if ! aws dynamodb describe-table --table-name "${dynamodb_table}" --region "${region}" &>/dev/null; then
        info "Creating DynamoDB table for Terraform locks: ${dynamodb_table}"
        aws dynamodb create-table \
            --table-name "${dynamodb_table}" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
            --region "${region}"
        
        # Wait for table to be active
        aws dynamodb wait table-exists --table-name "${dynamodb_table}" --region "${region}"
        success "DynamoDB table created"
    else
        info "DynamoDB table already exists: ${dynamodb_table}"
    fi
}

# Function to create backup of current state
create_backup() {
    if [[ -f "${TERRAFORM_DIR}/terraform.tfstate" ]] || [[ -d "${TERRAFORM_DIR}/.terraform" ]]; then
        info "Creating backup of current Terraform state..."
        mkdir -p "${BACKUP_DIR}"
        
        if [[ -f "${TERRAFORM_DIR}/terraform.tfstate" ]]; then
            cp "${TERRAFORM_DIR}/terraform.tfstate" "${BACKUP_DIR}/"
        fi
        
        if [[ -f "${TERRAFORM_DIR}/terraform.tfstate.backup" ]]; then
            cp "${TERRAFORM_DIR}/terraform.tfstate.backup" "${BACKUP_DIR}/"
        fi
        
        if [[ -d "${TERRAFORM_DIR}/.terraform" ]]; then
            cp -r "${TERRAFORM_DIR}/.terraform" "${BACKUP_DIR}/"
        fi
        
        success "Backup created at: ${BACKUP_DIR}"
    fi
}

# Function to initialize Terraform
terraform_init() {
    info "Initializing Terraform..."
    cd "${TERRAFORM_DIR}"
    
    terraform init -upgrade
    success "Terraform initialization completed"
}

# Function to validate Terraform configuration
terraform_validate() {
    info "Validating Terraform configuration..."
    cd "${TERRAFORM_DIR}"
    
    terraform validate
    success "Terraform validation passed"
}

# Function to plan Terraform deployment
terraform_plan() {
    info "Creating Terraform plan..."
    cd "${TERRAFORM_DIR}"
    
    local plan_file="${TERRAFORM_DIR}/terraform.plan"
    terraform plan -out="${plan_file}" -detailed-exitcode
    local plan_exit_code=$?
    
    case ${plan_exit_code} in
        0)
            info "No changes detected"
            return 0
            ;;
        1)
            error "Terraform plan failed"
            exit 1
            ;;
        2)
            success "Terraform plan created with changes"
            return 2
            ;;
        *)
            error "Unexpected terraform plan exit code: ${plan_exit_code}"
            exit 1
            ;;
    esac
}

# Function to apply Terraform changes
terraform_apply() {
    info "Applying Terraform changes..."
    cd "${TERRAFORM_DIR}"
    
    local plan_file="${TERRAFORM_DIR}/terraform.plan"
    
    if [[ ! -f "${plan_file}" ]]; then
        error "Plan file not found. Please run plan first."
        exit 1
    fi
    
    terraform apply "${plan_file}"
    local apply_exit_code=$?
    
    # Clean up plan file
    rm -f "${plan_file}"
    
    if [[ ${apply_exit_code} -eq 0 ]]; then
        success "Terraform apply completed successfully"
    else
        error "Terraform apply failed with exit code: ${apply_exit_code}"
        exit 1
    fi
}

# Function to show terraform outputs
show_outputs() {
    info "Displaying Terraform outputs..."
    cd "${TERRAFORM_DIR}"
    
    terraform output -json > "${TERRAFORM_DIR}/outputs.json"
    
    echo
    echo "=== DEPLOYMENT SUMMARY ==="
    echo "Application URL: $(terraform output -raw domain_name 2>/dev/null || echo 'Not available')"
    echo "ALB DNS Name: $(terraform output -raw alb_dns_name 2>/dev/null || echo 'Not available')"
    echo "CloudFront URL: $(terraform output -raw cloudfront_distribution_domain_name 2>/dev/null || echo 'Not available')"
    echo "Dashboard URL: $(terraform output -raw cloudfront_distribution_domain_name 2>/dev/null || echo 'Not available')"
    echo
    echo "Estimated Monthly Cost: \$360-650 (see outputs for breakdown)"
    echo
    echo "Outputs saved to: ${TERRAFORM_DIR}/outputs.json"
}

# Function to run post-deployment checks
post_deployment_checks() {
    info "Running post-deployment checks..."
    cd "${TERRAFORM_DIR}"
    
    # Check if key resources are created
    local checks=(
        "aws_ecs_cluster.main"
        "aws_lb.main"
        "aws_db_instance.main"
        "aws_elasticache_replication_group.main"
    )
    
    for resource in "${checks[@]}"; do
        if terraform state show "${resource}" &>/dev/null; then
            success "Resource exists: ${resource}"
        else
            warning "Resource not found: ${resource}"
        fi
    done
    
    # Test ALB health
    local alb_dns
    alb_dns=$(terraform output -raw alb_dns_name 2>/dev/null)
    if [[ -n "${alb_dns}" ]]; then
        info "Testing ALB health endpoint..."
        if curl -s --connect-timeout 10 "https://${alb_dns}/health" > /dev/null; then
            success "ALB health check passed"
        else
            warning "ALB health check failed (this is expected if services are not deployed yet)"
        fi
    fi
}

# Function to display next steps
show_next_steps() {
    echo
    echo "=== NEXT STEPS ==="
    echo "1. Create ECR repositories for your services:"
    echo "   aws ecr create-repository --repository-name claude-config-api"
    echo "   aws ecr create-repository --repository-name claude-config-analytics"
    echo "   aws ecr create-repository --repository-name claude-config-router"
    echo "   aws ecr create-repository --repository-name claude-config-monitor"
    echo
    echo "2. Build and push Docker images:"
    echo "   docker build -t claude-config-api ."
    echo "   docker tag claude-config-api:latest \${ECR_URI}/claude-config-api:latest"
    echo "   docker push \${ECR_URI}/claude-config-api:latest"
    echo
    echo "3. Update Secrets Manager with actual values:"
    echo "   aws secretsmanager update-secret --secret-id ${PROJECT_NAME}-claude_api_key --secret-string 'your-actual-api-key'"
    echo
    echo "4. Configure monitoring alerts:"
    echo "   - Update SNS topic subscription with your email"
    echo "   - Review CloudWatch alarms and adjust thresholds"
    echo
    echo "5. Set up CI/CD pipeline for automated deployments"
    echo
    echo "6. Configure backup and disaster recovery procedures"
    echo
    echo "For detailed information, see the outputs.json file and Terraform documentation."
}

# Function to handle cleanup on script exit
cleanup() {
    local exit_code=$?
    if [[ ${exit_code} -ne 0 ]]; then
        error "Script failed with exit code: ${exit_code}"
        echo
        echo "Troubleshooting tips:"
        echo "1. Check the log file: ${LOG_FILE}"
        echo "2. Review Terraform error messages above"
        echo "3. Verify AWS permissions and quotas"
        echo "4. Check terraform.tfvars for correct values"
        echo
        echo "To retry deployment:"
        echo "  cd ${TERRAFORM_DIR}"
        echo "  terraform plan"
        echo "  terraform apply"
    fi
}

# Main deployment function
deploy() {
    local action="${1:-apply}"
    
    info "Starting ${PROJECT_NAME} infrastructure deployment..."
    info "Action: ${action}"
    info "Directory: ${TERRAFORM_DIR}"
    info "Log file: ${LOG_FILE}"
    
    case "${action}" in
        "init")
            check_prerequisites
            validate_tfvars
            check_aws_credentials
            setup_terraform_backend
            terraform_init
            ;;
        "plan")
            check_prerequisites
            validate_tfvars
            check_aws_credentials
            terraform_init
            terraform_validate
            terraform_plan
            ;;
        "apply")
            check_prerequisites
            validate_tfvars
            check_aws_credentials
            setup_terraform_backend
            create_backup
            terraform_init
            terraform_validate
            local plan_result
            terraform_plan
            plan_result=$?
            if [[ ${plan_result} -eq 2 ]]; then
                echo
                warning "Terraform detected changes that will be applied."
                echo "Please review the plan above carefully."
                echo
                read -p "Do you want to proceed with applying these changes? (y/N): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    info "Deployment cancelled by user"
                    exit 0
                fi
                terraform_apply
                show_outputs
                post_deployment_checks
                show_next_steps
            else
                info "No changes to apply"
            fi
            ;;
        "destroy")
            error "Destroy action not implemented in this script for safety"
            echo "To destroy resources, run manually:"
            echo "  cd ${TERRAFORM_DIR}"
            echo "  terraform destroy"
            exit 1
            ;;
        "validate")
            check_prerequisites
            validate_tfvars
            terraform_validate
            ;;
        *)
            error "Unknown action: ${action}"
            echo "Usage: $0 [init|plan|apply|validate]"
            exit 1
            ;;
    esac
    
    success "Deployment completed successfully!"
}

# Script usage information
usage() {
    echo "Claude Configuration System - Infrastructure Deployment Script"
    echo
    echo "Usage: $0 [ACTION]"
    echo
    echo "Actions:"
    echo "  init      Initialize Terraform and set up backend"
    echo "  plan      Create and show Terraform plan"
    echo "  apply     Apply Terraform changes (default)"
    echo "  validate  Validate Terraform configuration"
    echo
    echo "Examples:"
    echo "  $0                # Apply changes (same as 'apply')"
    echo "  $0 plan          # Show what would be changed"
    echo "  $0 init          # Initialize Terraform"
    echo "  $0 validate      # Validate configuration"
    echo
    echo "Prerequisites:"
    echo "  - Terraform >= 1.0"
    echo "  - AWS CLI configured"
    echo "  - jq for JSON processing"
    echo "  - terraform.tfvars file with your configuration"
    echo
    echo "For more information, see the README.md file."
}

# Set up signal handlers
trap cleanup EXIT
trap 'echo "Interrupted"; exit 1' INT TERM

# Main script execution
main() {
    # Change to script directory
    cd "${TERRAFORM_DIR}"
    
    # Handle command line arguments
    case "${1:-}" in
        "-h"|"--help"|"help")
            usage
            exit 0
            ;;
        *)
            deploy "${1:-apply}"
            ;;
    esac
}

# Run main function with all arguments
main "$@"