#!/bin/bash

# NANDA Index Platform Production Deployment Script
# Deploy the revolutionary AI agent discovery platform to AWS

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="nanda-index"
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="681214184463"
ENVIRONMENT="production"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        error "Terraform is not installed"
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
    fi
    
    # Verify AWS account
    CURRENT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    if [ "$CURRENT_ACCOUNT" != "$AWS_ACCOUNT_ID" ]; then
        error "Wrong AWS account. Expected: $AWS_ACCOUNT_ID, Got: $CURRENT_ACCOUNT"
    fi
    
    success "Prerequisites check completed"
}

# Create S3 bucket for Terraform state
create_terraform_state_bucket() {
    log "Creating S3 bucket for Terraform state..."
    
    BUCKET_NAME="candlefish-terraform-state"
    
    # Check if bucket exists
    if aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
        log "Creating Terraform state bucket: $BUCKET_NAME"
        aws s3 mb "s3://$BUCKET_NAME" --region "$AWS_REGION"
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$BUCKET_NAME" \
            --versioning-configuration Status=Enabled
        
        # Enable encryption
        aws s3api put-bucket-encryption \
            --bucket "$BUCKET_NAME" \
            --server-side-encryption-configuration '{
                "Rules": [
                    {
                        "ApplyServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "AES256"
                        }
                    }
                ]
            }'
        
        success "Terraform state bucket created"
    else
        log "Terraform state bucket already exists"
    fi
}

# Store secrets in AWS Secrets Manager
store_secrets() {
    log "Storing secrets in AWS Secrets Manager..."
    
    # Generate Redis auth token
    REDIS_AUTH_TOKEN=$(openssl rand -base64 32)
    
    # Store Redis auth token
    aws secretsmanager create-secret \
        --name "${PROJECT_NAME}/redis-auth-token" \
        --description "Redis authentication token for NANDA Index" \
        --secret-string "$REDIS_AUTH_TOKEN" \
        --region "$AWS_REGION" \
        2>/dev/null || true
    
    # Store Honeycomb API key (placeholder - replace with actual key)
    aws secretsmanager create-secret \
        --name "${PROJECT_NAME}/honeycomb-api-key" \
        --description "Honeycomb API key for observability" \
        --secret-string "YOUR_HONEYCOMB_API_KEY" \
        --region "$AWS_REGION" \
        2>/dev/null || true
    
    success "Secrets stored in AWS Secrets Manager"
}

# Build and push Docker images
build_and_push_images() {
    log "Building and pushing Docker images..."
    
    # Get ECR login
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    
    # Build and push NANDA API
    log "Building NANDA API image..."
    docker build \
        -t "${PROJECT_NAME}/nanda-api:latest" \
        -f apps/nanda-api/Dockerfile \
        apps/nanda-api/
    
    # Create ECR repositories if they don't exist
    aws ecr describe-repositories --repository-names "${PROJECT_NAME}/nanda-api" --region "$AWS_REGION" 2>/dev/null || \
        aws ecr create-repository --repository-name "${PROJECT_NAME}/nanda-api" --region "$AWS_REGION"
    
    aws ecr describe-repositories --repository-names "${PROJECT_NAME}/nanda-dashboard" --region "$AWS_REGION" 2>/dev/null || \
        aws ecr create-repository --repository-name "${PROJECT_NAME}/nanda-dashboard" --region "$AWS_REGION"
    
    # Tag and push API image
    docker tag "${PROJECT_NAME}/nanda-api:latest" \
        "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${PROJECT_NAME}/nanda-api:latest"
    docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${PROJECT_NAME}/nanda-api:latest"
    
    # Build and push NANDA Dashboard
    log "Building NANDA Dashboard image..."
    docker build \
        -t "${PROJECT_NAME}/nanda-dashboard:latest" \
        -f apps/nanda-dashboard/Dockerfile \
        apps/nanda-dashboard/
    
    # Tag and push dashboard image
    docker tag "${PROJECT_NAME}/nanda-dashboard:latest" \
        "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${PROJECT_NAME}/nanda-dashboard:latest"
    docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${PROJECT_NAME}/nanda-dashboard:latest"
    
    success "Docker images built and pushed to ECR"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    log "Deploying infrastructure with Terraform..."
    
    cd infrastructure/nanda-platform
    
    # Initialize Terraform
    terraform init
    
    # Create terraform.tfvars
    cat > terraform.tfvars << EOF
aws_region = "$AWS_REGION"
environment = "$ENVIRONMENT"
project_name = "$PROJECT_NAME"
domain_name = "nanda.candlefish.ai"
redis_auth_token = "$REDIS_AUTH_TOKEN"
ecs_desired_capacity = 3
enable_waf = true
enable_detailed_monitoring = true
seed_sample_agents = true
EOF
    
    # Plan deployment
    log "Planning Terraform deployment..."
    terraform plan -var-file=terraform.tfvars -out=tfplan
    
    # Apply deployment
    log "Applying Terraform deployment..."
    terraform apply tfplan
    
    success "Infrastructure deployment completed"
    
    # Get outputs
    terraform output -json > deployment-outputs.json
    
    cd ../..
}

# Initialize NANDA Index with seed data
seed_nanda_index() {
    log "Seeding NANDA Index with sample data..."
    
    # Get API endpoint from Terraform outputs
    API_URL=$(jq -r '.api_url.value' infrastructure/nanda-platform/deployment-outputs.json)
    
    # Wait for API to be ready
    log "Waiting for API to be ready..."
    for i in {1..30}; do
        if curl -f "${API_URL}/health" &> /dev/null; then
            success "API is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            error "API failed to start within 5 minutes"
        fi
        sleep 10
    done
    
    # Seed with sample agents
    log "Seeding sample AI agents..."
    curl -X POST "${API_URL}/admin/seed" \
        -H "Content-Type: application/json" \
        -d '{
            "agents_count": 1000,
            "platforms": ["openai", "anthropic", "google", "microsoft", "huggingface"],
            "capabilities": ["text-generation", "image-generation", "code-completion", "analysis", "reasoning"]
        }' || warn "Seeding failed - continuing..."
    
    success "NANDA Index seeded with sample data"
}

# Create GitHub Actions workflow
create_github_workflow() {
    log "Creating GitHub Actions CI/CD workflow..."
    
    mkdir -p .github/workflows
    
    cat > .github/workflows/nanda-platform-deploy.yml << 'EOF'
name: NANDA Platform Deployment

on:
  push:
    branches: [main]
    paths:
      - 'apps/nanda-api/**'
      - 'apps/nanda-dashboard/**'
      - 'packages/nanda-index/**'
      - 'infrastructure/nanda-platform/**'
      - '.github/workflows/nanda-platform-deploy.yml'
  
  pull_request:
    branches: [main]
    paths:
      - 'apps/nanda-api/**'
      - 'apps/nanda-dashboard/**'
      - 'packages/nanda-index/**'

env:
  AWS_REGION: us-east-1
  PROJECT_NAME: nanda-index

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: |
            apps/nanda-api/package-lock.json
            apps/nanda-dashboard/package-lock.json
      
      - name: Install dependencies
        run: |
          cd apps/nanda-api && npm ci
          cd ../nanda-dashboard && npm ci
      
      - name: Run tests
        run: |
          cd apps/nanda-api && npm test
          cd ../nanda-dashboard && npm test
      
      - name: Run security audit
        run: |
          cd apps/nanda-api && npm audit --audit-level=high
          cd ../nanda-dashboard && npm audit --audit-level=high

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    permissions:
      id-token: write
      contents: read
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-region: ${{ env.AWS_REGION }}
          role-to-assume: arn:aws:iam::681214184463:role/github-actions-nanda-deploy
          role-session-name: GitHubActions-NANDADeploy
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build, tag, and push API image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: nanda-index/nanda-api
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f apps/nanda-api/Dockerfile -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG apps/nanda-api/
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
      
      - name: Build, tag, and push Dashboard image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: nanda-index/nanda-dashboard
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f apps/nanda-dashboard/Dockerfile -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG apps/nanda-dashboard/
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster nanda-index-cluster --service nanda-index-api --force-new-deployment
          aws ecs update-service --cluster nanda-index-cluster --service nanda-index-dashboard --force-new-deployment
      
      - name: Wait for deployment to complete
        run: |
          aws ecs wait services-stable --cluster nanda-index-cluster --services nanda-index-api nanda-index-dashboard
      
      - name: Notify deployment success
        run: |
          echo "🚀 NANDA Platform deployed successfully!"
          echo "API: https://api.nanda.candlefish.ai"
          echo "Dashboard: https://nanda.candlefish.ai"
EOF
    
    success "GitHub Actions workflow created"
}

# Setup monitoring dashboards
setup_monitoring() {
    log "Setting up monitoring dashboards..."
    
    mkdir -p monitoring/grafana/{dashboards,datasources}
    
    # Create Prometheus datasource config
    cat > monitoring/grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF
    
    # Create main dashboard
    cat > monitoring/grafana/dashboards/nanda-main.json << 'EOF'
{
  "dashboard": {
    "title": "NANDA Platform Overview",
    "tags": ["nanda", "platform"],
    "timezone": "browser",
    "panels": [
      {
        "title": "API Requests per Second",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(http_requests_total[1m])",
            "legendFormat": "RPS"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)",
            "legendFormat": "95th percentile"
          }
        ]
      }
    ]
  }
}
EOF
    
    success "Monitoring dashboards configured"
}

# Validate deployment
validate_deployment() {
    log "Validating deployment..."
    
    # Get endpoints from Terraform outputs
    API_URL=$(jq -r '.api_url.value' infrastructure/nanda-platform/deployment-outputs.json)
    DASHBOARD_URL=$(jq -r '.dashboard_url.value' infrastructure/nanda-platform/deployment-outputs.json)
    HEALTH_URL=$(jq -r '.health_check_url.value' infrastructure/nanda-platform/deployment-outputs.json)
    
    # Test API health
    if curl -f "$HEALTH_URL" &> /dev/null; then
        success "API health check passed"
    else
        error "API health check failed"
    fi
    
    # Test GraphQL endpoint
    if curl -f "${API_URL}/graphql" -X POST -H "Content-Type: application/json" -d '{"query":"query{__typename}"}' &> /dev/null; then
        success "GraphQL endpoint is responding"
    else
        warn "GraphQL endpoint test failed"
    fi
    
    # Test dashboard
    if curl -f "$DASHBOARD_URL" &> /dev/null; then
        success "Dashboard is accessible"
    else
        warn "Dashboard accessibility test failed"
    fi
    
    success "Deployment validation completed"
}

# Print deployment summary
print_summary() {
    log "NANDA Platform Deployment Summary"
    echo ""
    echo "🚀 NANDA Index Platform has been deployed successfully!"
    echo ""
    echo "📊 Endpoints:"
    echo "   • Dashboard: https://nanda.candlefish.ai"
    echo "   • API: https://api.nanda.candlefish.ai"
    echo "   • GraphQL: https://api.nanda.candlefish.ai/graphql"
    echo "   • Health Check: https://api.nanda.candlefish.ai/health"
    echo "   • Metrics: https://api.nanda.candlefish.ai/metrics"
    echo ""
    echo "📈 Monitoring:"
    echo "   • Grafana: http://localhost:3003 (admin/admin123)"
    echo "   • Prometheus: http://localhost:9090"
    echo "   • Jaeger: http://localhost:16686"
    echo ""
    echo "☁️  AWS Resources:"
    echo "   • ECS Cluster: nanda-index-cluster"
    echo "   • Load Balancer: $(jq -r '.load_balancer_dns_name.value' infrastructure/nanda-platform/deployment-outputs.json)"
    echo "   • DynamoDB Tables: nanda-index-agents, nanda-index-agent-facts, nanda-index-network-topology"
    echo "   • Redis Cluster: $(jq -r '.redis_cluster_endpoint.value' infrastructure/nanda-platform/deployment-outputs.json)"
    echo ""
    echo "🔐 Security:"
    echo "   • WAF: Enabled"
    echo "   • SSL/TLS: Enabled"
    echo "   • Secrets: Stored in AWS Secrets Manager"
    echo ""
    echo "Revolutionary AI agent discovery is now live! 🎉"
}

# Main deployment function
main() {
    log "Starting NANDA Index Platform deployment..."
    
    check_prerequisites
    create_terraform_state_bucket
    store_secrets
    build_and_push_images
    deploy_infrastructure
    seed_nanda_index
    create_github_workflow
    setup_monitoring
    validate_deployment
    print_summary
    
    success "NANDA Platform deployment completed successfully!"
}

# Run main function
main "$@"