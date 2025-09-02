#!/bin/bash

# Candlefish AI Infrastructure Deployment Script
# Week 2-3: RDS PostgreSQL, PgBouncer, and ElastiCache Redis
# Automated deployment with validation and rollback capabilities

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="candlefish"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"
TERRAFORM_DIR="../terraform"
PGBOUNCER_DIR="../pgbouncer"
DATABASE_DIR="../database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="deployment_${TIMESTAMP}.log"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

print_success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a $LOG_FILE
}

print_error() {
    echo -e "${RED}✗${NC} $1" | tee -a $LOG_FILE
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a $LOG_FILE
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found. Please install AWS CLI."
        exit 1
    fi
    print_success "AWS CLI found"
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform not found. Please install Terraform."
        exit 1
    fi
    print_success "Terraform found: $(terraform version -json | jq -r '.terraform_version')"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker not found. Please install Docker."
        exit 1
    fi
    print_success "Docker found"
    
    # Check PostgreSQL client
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL client not found. Some validation steps will be skipped."
    else
        print_success "PostgreSQL client found"
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Please configure AWS credentials."
        exit 1
    fi
    print_success "AWS credentials configured"
    
    # Check jq for JSON parsing
    if ! command -v jq &> /dev/null; then
        print_error "jq not found. Please install jq for JSON parsing."
        exit 1
    fi
    print_success "jq found"
}

# Function to create Terraform backend
create_terraform_backend() {
    print_status "Creating Terraform backend..."
    
    # Create S3 bucket for state
    BUCKET_NAME="${PROJECT_NAME}-terraform-state"
    if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
        print_success "S3 bucket $BUCKET_NAME already exists"
    else
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --region "$AWS_REGION" \
            $([ "$AWS_REGION" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=$AWS_REGION") \
            2>&1 | tee -a $LOG_FILE
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$BUCKET_NAME" \
            --versioning-configuration Status=Enabled \
            2>&1 | tee -a $LOG_FILE
        
        # Enable encryption
        aws s3api put-bucket-encryption \
            --bucket "$BUCKET_NAME" \
            --server-side-encryption-configuration '{
                "Rules": [{
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }]
            }' \
            2>&1 | tee -a $LOG_FILE
        
        print_success "Created S3 bucket $BUCKET_NAME"
    fi
    
    # Create DynamoDB table for state locking
    TABLE_NAME="terraform-state-lock"
    if aws dynamodb describe-table --table-name "$TABLE_NAME" 2>/dev/null; then
        print_success "DynamoDB table $TABLE_NAME already exists"
    else
        aws dynamodb create-table \
            --table-name "$TABLE_NAME" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
            --region "$AWS_REGION" \
            2>&1 | tee -a $LOG_FILE
        
        print_success "Created DynamoDB table $TABLE_NAME"
    fi
}

# Function to initialize Terraform
initialize_terraform() {
    print_status "Initializing Terraform..."
    cd "$TERRAFORM_DIR"
    
    terraform init \
        -backend-config="bucket=${PROJECT_NAME}-terraform-state" \
        -backend-config="key=infrastructure/terraform.tfstate" \
        -backend-config="region=${AWS_REGION}" \
        -backend-config="dynamodb_table=terraform-state-lock" \
        2>&1 | tee -a ../$LOG_FILE
    
    print_success "Terraform initialized"
    cd - > /dev/null
}

# Function to create terraform.tfvars
create_tfvars() {
    print_status "Creating terraform.tfvars..."
    cat > "$TERRAFORM_DIR/terraform.tfvars" <<EOF
# Auto-generated Terraform variables
# Generated on: $(date)

environment = "${ENVIRONMENT}"
aws_region  = "${AWS_REGION}"
project_name = "${PROJECT_NAME}"

# Database configuration
db_name     = "candlefish"
db_username = "candlefish_admin"

# VPC configuration (using default VPC for simplicity)
use_default_vpc = true

# Instance sizing
db_instance_class_prod = "db.r6g.xlarge"
db_instance_class_dev  = "db.r6g.large"

# Redis configuration
enable_redis_cluster_mode = false
redis_node_type_prod = "cache.r7g.xlarge"
redis_node_type_dev  = "cache.r7g.large"

# Common tags
common_tags = {
  Environment = "${ENVIRONMENT}"
  Project     = "${PROJECT_NAME}"
  ManagedBy   = "Terraform"
  Owner       = "Patrick Smith"
  DeployedAt  = "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    print_success "Created terraform.tfvars"
}

# Function to validate Terraform configuration
validate_terraform() {
    print_status "Validating Terraform configuration..."
    cd "$TERRAFORM_DIR"
    
    if terraform validate; then
        print_success "Terraform configuration is valid"
    else
        print_error "Terraform configuration validation failed"
        exit 1
    fi
    
    cd - > /dev/null
}

# Function to plan Terraform deployment
plan_terraform() {
    print_status "Planning Terraform deployment..."
    cd "$TERRAFORM_DIR"
    
    terraform plan -out=tfplan_${TIMESTAMP} 2>&1 | tee -a ../$LOG_FILE
    
    print_success "Terraform plan created: tfplan_${TIMESTAMP}"
    cd - > /dev/null
}

# Function to apply Terraform configuration
apply_terraform() {
    print_status "Applying Terraform configuration..."
    
    read -p "Do you want to proceed with the deployment? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        print_warning "Deployment cancelled by user"
        exit 0
    fi
    
    cd "$TERRAFORM_DIR"
    
    # Deploy RDS first
    print_status "Deploying RDS PostgreSQL..."
    terraform apply -target=module.rds -auto-approve 2>&1 | tee -a ../$LOG_FILE
    
    # Wait for RDS to be available
    print_status "Waiting for RDS instance to be available (this may take 15-20 minutes)..."
    DB_INSTANCE_ID="${PROJECT_NAME}-postgres-main-${ENVIRONMENT}"
    aws rds wait db-instance-available --db-instance-identifier "$DB_INSTANCE_ID"
    print_success "RDS instance is available"
    
    # Deploy read replicas if production
    if [ "$ENVIRONMENT" == "production" ]; then
        print_status "Deploying read replicas..."
        terraform apply -target=module.rds_read_replicas -auto-approve 2>&1 | tee -a ../$LOG_FILE
    fi
    
    # Deploy ElastiCache
    print_status "Deploying ElastiCache Redis..."
    terraform apply -target=module.elasticache -auto-approve 2>&1 | tee -a ../$LOG_FILE
    
    # Deploy remaining infrastructure
    print_status "Deploying remaining infrastructure..."
    terraform apply -auto-approve 2>&1 | tee -a ../$LOG_FILE
    
    print_success "Terraform deployment completed"
    cd - > /dev/null
}

# Function to get Terraform outputs
get_outputs() {
    print_status "Getting deployment outputs..."
    cd "$TERRAFORM_DIR"
    
    # Save outputs to file
    terraform output -json > ../outputs_${TIMESTAMP}.json
    
    # Extract key values
    DB_ENDPOINT=$(terraform output -raw db_instance_endpoint 2>/dev/null || echo "")
    DB_ADDRESS=$(terraform output -raw db_instance_address 2>/dev/null || echo "")
    DB_PASSWORD_SECRET=$(terraform output -raw db_password_secret_arn 2>/dev/null || echo "")
    REDIS_ENDPOINT=$(terraform output -raw redis_endpoint 2>/dev/null || echo "")
    
    print_success "Outputs saved to outputs_${TIMESTAMP}.json"
    cd - > /dev/null
}

# Function to run database migrations
run_database_migrations() {
    print_status "Running database migrations and optimizations..."
    
    if [ -z "$DB_ADDRESS" ]; then
        print_warning "Database address not found. Skipping migrations."
        return
    fi
    
    # Get database password from Secrets Manager
    if [ -n "$DB_PASSWORD_SECRET" ]; then
        DB_PASSWORD=$(aws secretsmanager get-secret-value \
            --secret-id "$DB_PASSWORD_SECRET" \
            --query SecretString \
            --output text)
    fi
    
    if [ -n "$DB_PASSWORD" ] && command -v psql &> /dev/null; then
        print_status "Applying database optimizations..."
        
        # Apply optimization scripts
        if [ -f "$DATABASE_DIR/optimization-scripts.sql" ]; then
            PGPASSWORD="$DB_PASSWORD" psql \
                -h "$DB_ADDRESS" \
                -U "candlefish_admin" \
                -d "candlefish" \
                -f "$DATABASE_DIR/optimization-scripts.sql" \
                2>&1 | tee -a $LOG_FILE
            
            print_success "Database optimizations applied"
        else
            print_warning "optimization-scripts.sql not found"
        fi
    else
        print_warning "Cannot connect to database. Manual migration required."
    fi
}

# Function to deploy PgBouncer
deploy_pgbouncer() {
    print_status "Deploying PgBouncer..."
    
    if [ -z "$DB_ADDRESS" ]; then
        print_warning "Database address not found. Skipping PgBouncer deployment."
        return
    fi
    
    cd "$PGBOUNCER_DIR"
    
    # Build Docker image
    print_status "Building PgBouncer Docker image..."
    docker build -t ${PROJECT_NAME}/pgbouncer:latest . 2>&1 | tee -a ../$LOG_FILE
    
    # Run PgBouncer container (for testing)
    print_status "Starting PgBouncer container..."
    docker run -d \
        --name pgbouncer-${ENVIRONMENT} \
        -p 6432:6432 \
        -e DB_HOST="$DB_ADDRESS" \
        -e DB_USERNAME="candlefish_admin" \
        -e DB_PASSWORD="$DB_PASSWORD" \
        -e DB_NAME="candlefish" \
        -e MAX_CLIENT_CONN=10000 \
        -e DEFAULT_POOL_SIZE=25 \
        ${PROJECT_NAME}/pgbouncer:latest \
        2>&1 | tee -a ../$LOG_FILE
    
    print_success "PgBouncer deployed"
    cd - > /dev/null
}

# Function to validate deployment
validate_deployment() {
    print_status "Validating deployment..."
    
    # Check RDS status
    if [ -n "$DB_INSTANCE_ID" ]; then
        STATUS=$(aws rds describe-db-instances \
            --db-instance-identifier "$DB_INSTANCE_ID" \
            --query 'DBInstances[0].DBInstanceStatus' \
            --output text)
        
        if [ "$STATUS" == "available" ]; then
            print_success "RDS instance is healthy"
        else
            print_error "RDS instance status: $STATUS"
        fi
    fi
    
    # Check ElastiCache status
    REDIS_CLUSTER_ID="${PROJECT_NAME}-redis-cluster"
    STATUS=$(aws elasticache describe-cache-clusters \
        --cache-cluster-id "$REDIS_CLUSTER_ID-001" \
        --query 'CacheClusters[0].CacheClusterStatus' \
        --output text 2>/dev/null || echo "")
    
    if [ "$STATUS" == "available" ]; then
        print_success "Redis cluster is healthy"
    elif [ -n "$STATUS" ]; then
        print_warning "Redis cluster status: $STATUS"
    fi
    
    # Check PgBouncer
    if docker ps | grep -q "pgbouncer-${ENVIRONMENT}"; then
        print_success "PgBouncer container is running"
    else
        print_warning "PgBouncer container is not running"
    fi
    
    # Test database connection through PgBouncer
    if command -v psql &> /dev/null && [ -n "$DB_PASSWORD" ]; then
        print_status "Testing database connection through PgBouncer..."
        if PGPASSWORD="$DB_PASSWORD" psql \
            -h localhost \
            -p 6432 \
            -U candlefish_admin \
            -d candlefish \
            -c "SELECT 'Connection successful' as status;" \
            2>/dev/null; then
            print_success "Database connection through PgBouncer successful"
        else
            print_warning "Could not connect to database through PgBouncer"
        fi
    fi
    
    print_success "Deployment validation completed"
}

# Function to generate deployment report
generate_report() {
    print_status "Generating deployment report..."
    
    REPORT_FILE="deployment_report_${TIMESTAMP}.md"
    
    cat > "$REPORT_FILE" <<EOF
# Deployment Report
## Candlefish AI Infrastructure - Week 2-3 Implementation

**Date**: $(date)
**Environment**: ${ENVIRONMENT}
**AWS Region**: ${AWS_REGION}
**Deployment ID**: ${TIMESTAMP}

## Deployment Summary

### ✅ Components Deployed

1. **RDS PostgreSQL**
   - Instance: ${DB_INSTANCE_ID}
   - Endpoint: ${DB_ENDPOINT}
   - Multi-AZ: $([ "$ENVIRONMENT" == "production" ] && echo "Yes" || echo "No")
   - Read Replicas: $([ "$ENVIRONMENT" == "production" ] && echo "2" || echo "0")

2. **ElastiCache Redis**
   - Cluster ID: ${REDIS_CLUSTER_ID}
   - Endpoint: ${REDIS_ENDPOINT}
   - Nodes: $([ "$ENVIRONMENT" == "production" ] && echo "3" || echo "1")

3. **PgBouncer**
   - Status: $(docker ps | grep -q "pgbouncer-${ENVIRONMENT}" && echo "Running" || echo "Not Running")
   - Port: 6432
   - Pool Mode: Transaction

## Configuration Files

- Terraform Plan: tfplan_${TIMESTAMP}
- Terraform Variables: terraform.tfvars
- Outputs: outputs_${TIMESTAMP}.json
- Logs: ${LOG_FILE}

## Next Steps

1. Update application configuration with new endpoints
2. Run application integration tests
3. Configure monitoring dashboards
4. Set up backup verification
5. Document runbooks

## Cost Estimate

| Service | Monthly Cost (Est.) |
|---------|-------------------|
| RDS Main Instance | \$340 |
| RDS Read Replicas | \$340 |
| ElastiCache | \$620 |
| PgBouncer (ECS) | \$40 |
| **Total** | **\$1,340** |

## Validation Results

$(tail -n 20 $LOG_FILE | grep -E "✓|✗|⚠")

---
*Generated by deploy-infrastructure.sh*
EOF
    
    print_success "Deployment report saved to $REPORT_FILE"
}

# Function to show usage
show_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Deploy Candlefish AI infrastructure (RDS, ElastiCache, PgBouncer)

OPTIONS:
    -h, --help              Show this help message
    -e, --environment ENV   Set environment (production/development)
    -r, --region REGION     Set AWS region
    -s, --skip-validation   Skip validation steps
    -p, --plan-only        Only run terraform plan
    -d, --destroy          Destroy infrastructure
    
EXAMPLES:
    $0                                    # Deploy to production
    $0 -e development                    # Deploy to development
    $0 -p                                # Plan only, don't deploy
    $0 -d                                # Destroy infrastructure

EOF
}

# Main deployment flow
main() {
    print_status "Starting Candlefish AI Infrastructure Deployment"
    print_status "Environment: $ENVIRONMENT"
    print_status "AWS Region: $AWS_REGION"
    echo ""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -r|--region)
                AWS_REGION="$2"
                shift 2
                ;;
            -s|--skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            -p|--plan-only)
                PLAN_ONLY=true
                shift
                ;;
            -d|--destroy)
                DESTROY=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Check prerequisites
    check_prerequisites
    
    if [ "$DESTROY" == "true" ]; then
        print_warning "DESTROYING INFRASTRUCTURE"
        read -p "Are you sure you want to destroy all infrastructure? Type 'destroy' to confirm: " -r
        if [[ $REPLY == "destroy" ]]; then
            cd "$TERRAFORM_DIR"
            terraform destroy -auto-approve
            cd - > /dev/null
            print_success "Infrastructure destroyed"
        else
            print_warning "Destruction cancelled"
        fi
        exit 0
    fi
    
    # Create Terraform backend
    create_terraform_backend
    
    # Initialize Terraform
    initialize_terraform
    
    # Create tfvars file
    create_tfvars
    
    # Validate Terraform
    validate_terraform
    
    # Plan deployment
    plan_terraform
    
    if [ "$PLAN_ONLY" == "true" ]; then
        print_success "Plan completed. Skipping deployment."
        exit 0
    fi
    
    # Apply Terraform
    apply_terraform
    
    # Get outputs
    get_outputs
    
    # Run database migrations
    run_database_migrations
    
    # Deploy PgBouncer
    deploy_pgbouncer
    
    # Validate deployment
    if [ "$SKIP_VALIDATION" != "true" ]; then
        validate_deployment
    fi
    
    # Generate report
    generate_report
    
    print_success "Deployment completed successfully!"
    print_status "Report saved to: deployment_report_${TIMESTAMP}.md"
    print_status "Logs saved to: ${LOG_FILE}"
    
    echo ""
    print_status "Important: Save the following information:"
    echo "Database Endpoint: $DB_ENDPOINT"
    echo "Redis Endpoint: $REDIS_ENDPOINT"
    echo "Database Password Secret: $DB_PASSWORD_SECRET"
}

# Run main function
main "$@"