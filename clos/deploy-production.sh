#!/bin/bash

# =====================================================
# CLOS Dashboard Production Deployment Script
# Enterprise-grade deployment with comprehensive checks
# =====================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
DEPLOY_REGION=${AWS_REGION:-us-east-1}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOYMENT_ID="deploy_${TIMESTAMP}"

# Logging
LOG_DIR="./logs/deployments"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/${DEPLOYMENT_ID}.log"

# Function to log messages
log() {
    echo -e "${2:-$NC}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..." "$BLUE"
    
    # Check required tools
    local tools=("docker" "docker-compose" "aws" "psql" "redis-cli" "npm" "pnpm")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log "ERROR: $tool is not installed" "$RED"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log "ERROR: AWS credentials not configured" "$RED"
        exit 1
    fi
    
    # Check environment variables
    local required_vars=("JWT_SECRET" "POSTGRES_PASSWORD" "REDIS_PASSWORD" "ENCRYPTION_KEY")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            log "ERROR: Required environment variable $var is not set" "$RED"
            exit 1
        fi
    done
    
    log "Prerequisites check passed" "$GREEN"
}

# Function to run tests
run_tests() {
    log "Running tests..." "$BLUE"
    
    cd clos/web-dashboard
    
    # Install dependencies
    pnpm install --frozen-lockfile
    
    # Run type checking
    log "Running TypeScript type check..." "$YELLOW"
    pnpm run type-check || {
        log "ERROR: TypeScript type check failed" "$RED"
        exit 1
    }
    
    # Run linting
    log "Running ESLint..." "$YELLOW"
    pnpm run lint || {
        log "ERROR: Linting failed" "$RED"
        exit 1
    }
    
    # Run unit tests
    log "Running unit tests..." "$YELLOW"
    pnpm test --passWithNoTests || {
        log "ERROR: Unit tests failed" "$RED"
        exit 1
    }
    
    cd ../..
    log "All tests passed" "$GREEN"
}

# Function to build Docker images
build_images() {
    log "Building Docker images..." "$BLUE"
    
    # Build web dashboard
    log "Building web dashboard image..." "$YELLOW"
    docker build \
        -t candlefish/clos-dashboard:${DEPLOYMENT_ID} \
        -t candlefish/clos-dashboard:latest \
        -f clos/web-dashboard/Dockerfile \
        --build-arg NODE_ENV=production \
        --build-arg NEXT_PUBLIC_API_URL=https://api.candlefish.ai \
        clos/web-dashboard
    
    # Build API server
    log "Building API server image..." "$YELLOW"
    docker build \
        -t candlefish/clos-api:${DEPLOYMENT_ID} \
        -t candlefish/clos-api:latest \
        -f clos/api-server/Dockerfile \
        --build-arg NODE_ENV=production \
        clos/api-server
    
    log "Docker images built successfully" "$GREEN"
}

# Function to run database migrations
run_migrations() {
    log "Running database migrations..." "$BLUE"
    
    # Connect to production database
    PGPASSWORD="${POSTGRES_PASSWORD}" psql \
        -h "${POSTGRES_HOST}" \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        -f clos/database/migrations/001_auth_tables.sql \
        >> "$LOG_FILE" 2>&1
    
    log "Database migrations completed" "$GREEN"
}

# Function to deploy to AWS
deploy_to_aws() {
    log "Deploying to AWS..." "$BLUE"
    
    # Push images to ECR
    log "Pushing images to ECR..." "$YELLOW"
    aws ecr get-login-password --region ${DEPLOY_REGION} | \
        docker login --username AWS --password-stdin \
        ${AWS_ACCOUNT_ID}.dkr.ecr.${DEPLOY_REGION}.amazonaws.com
    
    docker tag candlefish/clos-dashboard:${DEPLOYMENT_ID} \
        ${AWS_ACCOUNT_ID}.dkr.ecr.${DEPLOY_REGION}.amazonaws.com/clos-dashboard:${DEPLOYMENT_ID}
    
    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${DEPLOY_REGION}.amazonaws.com/clos-dashboard:${DEPLOYMENT_ID}
    
    # Update ECS service
    log "Updating ECS service..." "$YELLOW"
    aws ecs update-service \
        --cluster clos-production \
        --service clos-dashboard \
        --force-new-deployment \
        --desired-count 3 \
        --region ${DEPLOY_REGION}
    
    # Wait for deployment to stabilize
    log "Waiting for deployment to stabilize..." "$YELLOW"
    aws ecs wait services-stable \
        --cluster clos-production \
        --services clos-dashboard \
        --region ${DEPLOY_REGION}
    
    log "AWS deployment completed" "$GREEN"
}

# Function to update CDN
update_cdn() {
    log "Updating CloudFront distribution..." "$BLUE"
    
    # Invalidate CloudFront cache
    aws cloudfront create-invalidation \
        --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
        --paths "/*" \
        --region ${DEPLOY_REGION}
    
    log "CDN cache invalidated" "$GREEN"
}

# Function to run health checks
run_health_checks() {
    log "Running health checks..." "$BLUE"
    
    local max_attempts=30
    local attempt=0
    local health_url="https://dashboard.candlefish.ai/api/health"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "$health_url" > /dev/null; then
            log "Health check passed" "$GREEN"
            return 0
        fi
        
        attempt=$((attempt + 1))
        log "Health check attempt $attempt/$max_attempts..." "$YELLOW"
        sleep 10
    done
    
    log "ERROR: Health checks failed" "$RED"
    return 1
}

# Function to rollback deployment
rollback() {
    log "Rolling back deployment..." "$RED"
    
    # Revert ECS service to previous task definition
    aws ecs update-service \
        --cluster clos-production \
        --service clos-dashboard \
        --task-definition clos-dashboard:$((CURRENT_REVISION - 1)) \
        --region ${DEPLOY_REGION}
    
    log "Rollback initiated" "$YELLOW"
}

# Function to send deployment notification
send_notification() {
    local status=$1
    local message=$2
    
    # Send to Slack
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"CLOS Dashboard Deployment ${status}\",
                \"attachments\": [{
                    \"color\": \"$([ "$status" = "SUCCESS" ] && echo "good" || echo "danger")\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"${ENVIRONMENT}\", \"short\": true},
                        {\"title\": \"Deployment ID\", \"value\": \"${DEPLOYMENT_ID}\", \"short\": true},
                        {\"title\": \"Message\", \"value\": \"${message}\", \"short\": false}
                    ]
                }]
            }" 2>/dev/null || true
    fi
    
    # Log to CloudWatch
    aws logs put-log-events \
        --log-group-name /aws/clos/deployments \
        --log-stream-name ${DEPLOYMENT_ID} \
        --log-events timestamp=$(date +%s000),message="${status}: ${message}" \
        2>/dev/null || true
}

# Main deployment flow
main() {
    log "Starting CLOS Dashboard deployment to ${ENVIRONMENT}" "$BLUE"
    log "Deployment ID: ${DEPLOYMENT_ID}" "$BLUE"
    
    # Pre-deployment checks
    check_prerequisites
    
    # Run tests
    run_tests
    
    # Build and tag images
    build_images
    
    # Database migrations
    run_migrations
    
    # Deploy to AWS
    deploy_to_aws
    
    # Update CDN
    update_cdn
    
    # Health checks
    if run_health_checks; then
        log "Deployment successful!" "$GREEN"
        send_notification "SUCCESS" "Deployment ${DEPLOYMENT_ID} completed successfully"
        
        # Create deployment tag
        git tag -a "deploy-${DEPLOYMENT_ID}" -m "Production deployment ${DEPLOYMENT_ID}"
        git push origin "deploy-${DEPLOYMENT_ID}"
    else
        log "Deployment failed, initiating rollback..." "$RED"
        rollback
        send_notification "FAILED" "Deployment ${DEPLOYMENT_ID} failed and was rolled back"
        exit 1
    fi
    
    # Cleanup old images
    log "Cleaning up old Docker images..." "$YELLOW"
    docker image prune -f --filter "until=24h"
    
    log "Deployment process completed" "$GREEN"
}

# Trap errors and cleanup
trap 'log "Deployment script failed at line $LINENO" "$RED"; send_notification "ERROR" "Deployment script error at line $LINENO"; exit 1' ERR

# Run main deployment
main "$@"