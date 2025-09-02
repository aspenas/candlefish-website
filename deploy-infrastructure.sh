#!/bin/bash

# Candlefish AI Infrastructure Deployment
# Complete EKS + RDS + ElastiCache deployment script

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Candlefish AI Infrastructure Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configuration
ENVIRONMENT="production"
AWS_REGION="us-east-1"
PROJECT="candlefish"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Function to print status
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform not installed"
        exit 1
    fi
    TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version')
    print_success "Terraform $TERRAFORM_VERSION found"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not installed"
        exit 1
    fi
    print_success "AWS CLI found"
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        print_warning "jq not installed - some features may not work"
    else
        print_success "jq found"
    fi
}

# Check AWS credentials
check_aws_credentials() {
    print_status "Checking AWS credentials..."
    
    if aws sts get-caller-identity &> /dev/null; then
        ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
        print_success "AWS credentials valid (Account: $ACCOUNT_ID)"
        return 0
    else
        print_error "AWS credentials not configured or invalid"
        echo ""
        echo "Please configure AWS credentials using one of these methods:"
        echo "1. Run: aws configure"
        echo "2. Export environment variables:"
        echo "   export AWS_ACCESS_KEY_ID=your-key"
        echo "   export AWS_SECRET_ACCESS_KEY=your-secret"
        echo "3. Use AWS SSO: aws sso login"
        return 1
    fi
}

# Initialize Terraform
initialize_terraform() {
    print_status "Initializing Terraform..."
    
    cd infrastructure/terraform
    
    # Check if we should use S3 backend
    if [ "$USE_BACKEND" == "true" ]; then
        print_status "Creating S3 backend for state management..."
        
        # Create S3 bucket for state
        BUCKET_NAME="${PROJECT}-terraform-state"
        if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
            print_success "S3 bucket $BUCKET_NAME already exists"
        else
            aws s3api create-bucket \
                --bucket "$BUCKET_NAME" \
                --region "$AWS_REGION" \
                $([ "$AWS_REGION" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=$AWS_REGION")
            
            aws s3api put-bucket-versioning \
                --bucket "$BUCKET_NAME" \
                --versioning-configuration Status=Enabled
            
            print_success "Created S3 bucket $BUCKET_NAME"
        fi
        
        # Create DynamoDB table for locking
        TABLE_NAME="${PROJECT}-terraform-locks"
        if aws dynamodb describe-table --table-name "$TABLE_NAME" 2>/dev/null; then
            print_success "DynamoDB table $TABLE_NAME already exists"
        else
            aws dynamodb create-table \
                --table-name "$TABLE_NAME" \
                --attribute-definitions AttributeName=LockID,AttributeType=S \
                --key-schema AttributeName=LockID,KeyType=HASH \
                --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
                --region "$AWS_REGION"
            
            print_success "Created DynamoDB table $TABLE_NAME"
        fi
        
        terraform init
    else
        terraform init -backend=false
    fi
    
    print_success "Terraform initialized"
    cd - > /dev/null
}

# Run Terraform plan
run_terraform_plan() {
    print_status "Running Terraform plan..."
    
    cd infrastructure/terraform
    
    # Create plan file
    terraform plan -out=tfplan_${TIMESTAMP} | tee plan_output.txt
    
    # Extract resource counts
    if command -v jq &> /dev/null; then
        RESOURCES_TO_ADD=$(grep "Plan:" plan_output.txt | grep -oE "[0-9]+ to add" | grep -oE "[0-9]+" || echo "0")
        print_status "Resources to be created: $RESOURCES_TO_ADD"
    fi
    
    print_success "Terraform plan saved to tfplan_${TIMESTAMP}"
    cd - > /dev/null
}

# Apply Terraform configuration
apply_terraform() {
    print_status "Applying Terraform configuration..."
    
    cd infrastructure/terraform
    
    # Confirm deployment
    echo ""
    print_warning "This will create the following resources:"
    echo "  - VPC with public/private subnets"
    echo "  - EKS Kubernetes cluster"
    echo "  - RDS PostgreSQL (Multi-AZ)"
    echo "  - ElastiCache Redis cluster"
    echo "  - IAM roles and policies"
    echo "  - Security groups"
    echo ""
    echo "Estimated monthly cost: $800-1200"
    echo ""
    
    read -p "Do you want to proceed? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        print_warning "Deployment cancelled"
        exit 0
    fi
    
    # Apply in stages for better control
    print_status "Stage 1: Creating VPC and networking..."
    terraform apply -target=module.vpc -auto-approve
    
    print_status "Stage 2: Creating EKS cluster..."
    terraform apply -target=module.eks -auto-approve
    
    print_status "Stage 3: Creating RDS PostgreSQL..."
    terraform apply -target=aws_db_instance.postgresql -auto-approve
    
    print_status "Stage 4: Creating ElastiCache Redis..."
    terraform apply -target=aws_elasticache_replication_group.redis -auto-approve
    
    print_status "Stage 5: Applying remaining resources..."
    terraform apply -auto-approve
    
    print_success "Infrastructure deployed successfully!"
    cd - > /dev/null
}

# Get outputs
get_outputs() {
    print_status "Getting deployment outputs..."
    
    cd infrastructure/terraform
    
    # Save outputs
    terraform output -json > outputs_${TIMESTAMP}.json
    
    # Display key outputs
    echo ""
    echo -e "${GREEN}Deployment Outputs:${NC}"
    echo "======================================"
    
    if [ -f outputs_${TIMESTAMP}.json ]; then
        echo "EKS Cluster: $(terraform output -raw cluster_name 2>/dev/null || echo 'N/A')"
        echo "RDS Endpoint: $(terraform output -raw rds_endpoint 2>/dev/null || echo 'N/A')"
        echo "Redis Endpoint: $(terraform output -raw redis_endpoint 2>/dev/null || echo 'N/A')"
    fi
    
    cd - > /dev/null
}

# Validate deployment
validate_deployment() {
    print_status "Validating deployment..."
    
    # Check EKS cluster
    if aws eks describe-cluster --name "${PROJECT}-${ENVIRONMENT}" &> /dev/null; then
        print_success "EKS cluster is running"
    else
        print_warning "EKS cluster not found"
    fi
    
    # Check RDS
    if aws rds describe-db-instances --db-instance-identifier "${PROJECT}-postgres-${ENVIRONMENT}" &> /dev/null; then
        print_success "RDS PostgreSQL is running"
    else
        print_warning "RDS instance not found"
    fi
    
    # Check ElastiCache
    if aws elasticache describe-replication-groups --replication-group-id "${PROJECT}-redis-${ENVIRONMENT}" &> /dev/null; then
        print_success "ElastiCache Redis is running"
    else
        print_warning "Redis cluster not found"
    fi
}

# Generate deployment report
generate_report() {
    print_status "Generating deployment report..."
    
    cat > deployment_report_${TIMESTAMP}.md <<EOF
# Deployment Report - Candlefish AI Infrastructure
Date: $(date)
Environment: ${ENVIRONMENT}
Region: ${AWS_REGION}

## Resources Deployed

### Networking
- VPC: ${PROJECT}-vpc-${ENVIRONMENT}
- Subnets: 3 public, 3 private, 3 database

### Compute
- EKS Cluster: ${PROJECT}-${ENVIRONMENT}
- Node Groups: general (auto-scaling 1-20 nodes)

### Database
- RDS PostgreSQL: ${PROJECT}-postgres-${ENVIRONMENT}
- Instance Type: db.r6g.xlarge (Multi-AZ)
- Storage: 100GB GP3

### Caching
- ElastiCache Redis: ${PROJECT}-redis-${ENVIRONMENT}
- Node Type: cache.t3.medium
- Nodes: 2 (Multi-AZ)

## Outputs
See outputs_${TIMESTAMP}.json for complete details

## Next Steps
1. Configure kubectl to connect to EKS cluster
2. Deploy applications to Kubernetes
3. Configure monitoring and alerts
4. Set up CI/CD pipelines

## Cost Estimate
- Monthly: \$800-1200
- Daily: \$27-40
EOF
    
    print_success "Report saved to deployment_report_${TIMESTAMP}.md"
}

# Main execution
main() {
    echo "Deployment Configuration:"
    echo "  Environment: $ENVIRONMENT"
    echo "  Region: $AWS_REGION"
    echo "  Project: $PROJECT"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Check AWS credentials
    if ! check_aws_credentials; then
        print_error "Cannot proceed without valid AWS credentials"
        exit 1
    fi
    
    # Ask about backend
    read -p "Use S3 backend for state management? (recommended for production) (yes/no): " -r
    if [[ $REPLY =~ ^[Yy]es$ ]]; then
        USE_BACKEND="true"
    else
        USE_BACKEND="false"
        print_warning "Using local state file (not recommended for production)"
    fi
    
    # Initialize Terraform
    initialize_terraform
    
    # Run plan
    run_terraform_plan
    
    # Review plan
    echo ""
    print_status "Please review the plan above"
    read -p "Do you want to apply this plan? (yes/no): " -r
    if [[ $REPLY =~ ^[Yy]es$ ]]; then
        apply_terraform
        get_outputs
        validate_deployment
        generate_report
        
        echo ""
        print_success "Deployment complete!"
        echo ""
        echo "Important next steps:"
        echo "1. Configure kubectl: aws eks update-kubeconfig --name ${PROJECT}-${ENVIRONMENT}"
        echo "2. Deploy applications to the cluster"
        echo "3. Set up monitoring dashboards"
        echo "4. Configure backup policies"
    else
        print_warning "Deployment cancelled"
    fi
}

# Handle script arguments
case "${1:-}" in
    destroy)
        print_warning "DESTROYING ALL INFRASTRUCTURE"
        read -p "Type 'destroy' to confirm: " -r
        if [[ $REPLY == "destroy" ]]; then
            cd infrastructure/terraform
            terraform destroy -auto-approve
            print_success "Infrastructure destroyed"
        fi
        ;;
    plan)
        check_prerequisites
        check_aws_credentials
        initialize_terraform
        run_terraform_plan
        ;;
    validate)
        check_aws_credentials
        validate_deployment
        ;;
    *)
        main
        ;;
esac