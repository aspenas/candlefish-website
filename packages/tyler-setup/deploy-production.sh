#!/bin/bash

# Tyler Setup Platform - Production Deployment Script
# Complete zero-downtime deployment with blue-green strategy
# Version: 2.0.0

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="tyler-setup"
AWS_REGION="us-east-1"
DOMAIN_NAME="setup.candlefish.ai"
API_DOMAIN_NAME="api.setup.candlefish.ai"
ENVIRONMENT="production"

# Deployment settings
TERRAFORM_DIR="infrastructure/terraform"
BACKEND_DIR="backend-production"
FRONTEND_DIR="frontend"
LAMBDA_DIR="lambda"

# Health check settings
HEALTH_CHECK_TIMEOUT=300
HEALTH_CHECK_INTERVAL=10
MAX_ROLLBACK_ATTEMPTS=3

# Logging
LOG_FILE="deployment-$(date +%Y%m%d-%H%M%S).log"
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

# Trap for cleanup
cleanup() {
    local exit_code=$?
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"

    # Kill background processes
    jobs -p | xargs -r kill 2>/dev/null || true

    if [ $exit_code -ne 0 ]; then
        echo -e "${RED}❌ Deployment failed. Check logs: $LOG_FILE${NC}"
        echo -e "${YELLOW}💡 Run rollback if needed: ./deploy-production.sh --rollback${NC}"
    fi

    exit $exit_code
}

trap cleanup EXIT INT TERM

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "\n${BLUE}🔵 $1${NC}"
    echo "----------------------------------------"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites"

    local missing_tools=()

    # Check required tools
    command -v aws >/dev/null 2>&1 || missing_tools+=("aws-cli")
    command -v terraform >/dev/null 2>&1 || missing_tools+=("terraform")
    command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
    command -v node >/dev/null 2>&1 || missing_tools+=("node")
    command -v npm >/dev/null 2>&1 || missing_tools+=("npm")
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")
    command -v curl >/dev/null 2>&1 || missing_tools+=("curl")

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Install missing tools and try again"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials not configured"
        log_info "Run: aws configure"
        exit 1
    fi

    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon not running"
        log_info "Start Docker and try again"
        exit 1
    fi

    # Check Node.js version
    node_version=$(node --version | sed 's/v//')
    required_version="18.0.0"
    if ! printf '%s\n%s\n' "$required_version" "$node_version" | sort -V -C; then
        log_error "Node.js version $node_version < $required_version"
        exit 1
    fi

    # Check Terraform version
    tf_version=$(terraform version -json | jq -r '.terraform_version')
    required_tf_version="1.5.0"
    if ! printf '%s\n%s\n' "$required_tf_version" "$tf_version" | sort -V -C; then
        log_error "Terraform version $tf_version < $required_tf_version"
        exit 1
    fi

    log_success "All prerequisites satisfied"
}

# Validate environment
validate_environment() {
    log_step "Validating environment configuration"

    # Check if secrets exist
    local required_secrets=(
        "$PROJECT_NAME/auth/jwt-secret"
        "$PROJECT_NAME/claude/api-key"
        "$PROJECT_NAME/database/connection-url"
        "$PROJECT_NAME/redis/connection-url"
    )

    for secret in "${required_secrets[@]}"; do
        if aws secretsmanager describe-secret --secret-id "$secret" --region "$AWS_REGION" >/dev/null 2>&1; then
            log_success "Secret exists: $secret"
        else
            log_warning "Secret missing: $secret (will be created during deployment)"
        fi
    done

    # Validate domain ownership
    if dig +short "$DOMAIN_NAME" >/dev/null 2>&1; then
        log_success "Domain $DOMAIN_NAME resolves"
    else
        log_warning "Domain $DOMAIN_NAME does not resolve yet"
    fi

    log_success "Environment validation complete"
}

# Deploy infrastructure
deploy_infrastructure() {
    log_step "Deploying infrastructure with Terraform"

    cd "$TERRAFORM_DIR"

    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init -upgrade

    # Create workspace if it doesn't exist
    terraform workspace select "$ENVIRONMENT" 2>/dev/null || terraform workspace new "$ENVIRONMENT"

    # Plan deployment
    log_info "Planning infrastructure changes..."
    terraform plan \
        -var="project_name=$PROJECT_NAME" \
        -var="environment=$ENVIRONMENT" \
        -var="aws_region=$AWS_REGION" \
        -var="domain_name=$DOMAIN_NAME" \
        -var="api_domain_name=$API_DOMAIN_NAME" \
        -out=tfplan

    # Apply changes
    log_info "Applying infrastructure changes..."
    terraform apply tfplan

    # Extract outputs
    ALB_DNS_NAME=$(terraform output -raw alb_dns_name)
    ECR_REPOSITORY_URL=$(terraform output -raw ecr_repository_url)
    CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_distribution_domain_name)

    export ALB_DNS_NAME ECR_REPOSITORY_URL CLOUDFRONT_DOMAIN

    cd - >/dev/null
    log_success "Infrastructure deployed successfully"
}

# Build and push Docker image
build_and_push_image() {
    log_step "Building and pushing Docker image"

    # Login to ECR
    log_info "Logging into ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REPOSITORY_URL"

    # Build image
    log_info "Building Docker image..."
    IMAGE_TAG="$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"
    docker build -f "$BACKEND_DIR/Dockerfile" -t "$PROJECT_NAME:$IMAGE_TAG" .

    # Tag for ECR
    docker tag "$PROJECT_NAME:$IMAGE_TAG" "$ECR_REPOSITORY_URL:$IMAGE_TAG"
    docker tag "$PROJECT_NAME:$IMAGE_TAG" "$ECR_REPOSITORY_URL:latest"

    # Push to ECR
    log_info "Pushing image to ECR..."
    docker push "$ECR_REPOSITORY_URL:$IMAGE_TAG"
    docker push "$ECR_REPOSITORY_URL:latest"

    export IMAGE_TAG
    log_success "Docker image built and pushed: $IMAGE_TAG"
}

# Deploy Lambda functions
deploy_lambda_functions() {
    log_step "Deploying Lambda functions"

    # Package and deploy each Lambda function
    local lambda_functions=("graphql-gateway" "auth-service" "websocket-service")

    for func in "${lambda_functions[@]}"; do
        log_info "Deploying Lambda function: $func"

        cd "$LAMBDA_DIR/$func"

        # Install dependencies
        npm ci --only=production

        # Create deployment package
        zip -r "../$func.zip" . -x "*.test.js" "test/**" "*.md"

        # Deploy or update function
        if aws lambda get-function --function-name "$PROJECT_NAME-$func" --region "$AWS_REGION" >/dev/null 2>&1; then
            aws lambda update-function-code \
                --function-name "$PROJECT_NAME-$func" \
                --zip-file "fileb://../$func.zip" \
                --region "$AWS_REGION"
        else
            # Create function (this would need more configuration)
            log_warning "Lambda function $func does not exist. Skipping for now."
        fi

        cd - >/dev/null
    done

    log_success "Lambda functions deployed"
}

# Update secrets with production values
update_secrets() {
    log_step "Updating production secrets"

    # Update Claude API key (from environment or prompt)
    if [ -n "${CLAUDE_API_KEY:-}" ]; then
        log_info "Updating Claude API key from environment"
        aws secretsmanager update-secret \
            --secret-id "$PROJECT_NAME/claude/api-key" \
            --secret-string "{\"api_key\":\"$CLAUDE_API_KEY\",\"model\":\"claude-3-5-sonnet-20241022\",\"max_tokens\":4096,\"rate_limit\":\"2000000\"}" \
            --region "$AWS_REGION"
    else
        log_warning "CLAUDE_API_KEY not set. Update manually after deployment."
    fi

    # Update OAuth configuration if provided
    if [ -n "${GOOGLE_CLIENT_ID:-}" ] && [ -n "${GOOGLE_CLIENT_SECRET:-}" ]; then
        log_info "Updating OAuth configuration"
        aws secretsmanager update-secret \
            --secret-id "$PROJECT_NAME/auth/oauth-config" \
            --secret-string "{\"google_client_id\":\"$GOOGLE_CLIENT_ID\",\"google_client_secret\":\"$GOOGLE_CLIENT_SECRET\",\"microsoft_client_id\":\"${MICROSOFT_CLIENT_ID:-}\",\"microsoft_client_secret\":\"${MICROSOFT_CLIENT_SECRET:-}\",\"redirect_uri\":\"https://$DOMAIN_NAME/auth/callback\"}" \
            --region "$AWS_REGION"
    fi

    log_success "Secrets updated"
}

# Blue-Green deployment
deploy_blue_green() {
    log_step "Executing blue-green deployment"

    # Get current and target environments
    local current_env="blue"
    local target_env="green"

    # Check which environment is currently active
    local listener_arn=$(aws elbv2 describe-listeners \
        --load-balancer-arn $(aws elbv2 describe-load-balancers --names "$PROJECT_NAME-alb" --query 'LoadBalancers[0].LoadBalancerArn' --output text) \
        --query 'Listeners[?Port==`443`].ListenerArn' --output text \
        --region "$AWS_REGION")

    local current_target_group=$(aws elbv2 describe-listeners \
        --listener-arns "$listener_arn" \
        --query 'Listeners[0].DefaultActions[0].TargetGroupArn' --output text \
        --region "$AWS_REGION")

    if [[ "$current_target_group" == *"green"* ]]; then
        current_env="green"
        target_env="blue"
    fi

    log_info "Current environment: $current_env, Target environment: $target_env"

    # Deploy to target environment
    log_info "Deploying to $target_env environment..."
    deploy_to_environment "$target_env"

    # Health check target environment
    log_info "Running health checks on $target_env environment..."
    if health_check_environment "$target_env"; then
        # Switch traffic
        log_info "Switching traffic to $target_env environment..."
        switch_traffic "$target_env"

        # Monitor for issues
        log_info "Monitoring new deployment..."
        if monitor_deployment 300; then
            # Scale down old environment
            log_info "Scaling down $current_env environment..."
            scale_down_environment "$current_env"
            log_success "Blue-green deployment completed successfully"
        else
            log_error "Issues detected in new deployment. Rolling back..."
            rollback_deployment "$current_env"
            return 1
        fi
    else
        log_error "Health checks failed on $target_env environment"
        return 1
    fi
}

# Deploy to specific environment (blue or green)
deploy_to_environment() {
    local env=$1

    # Get task definition
    local task_def_arn=$(aws ecs describe-task-definition \
        --task-definition "$PROJECT_NAME-app" \
        --region "$AWS_REGION" \
        --query 'taskDefinition.taskDefinitionArn' --output text)

    # Update task definition with new image
    local new_task_def=$(aws ecs describe-task-definition \
        --task-definition "$PROJECT_NAME-app" \
        --region "$AWS_REGION" \
        --query 'taskDefinition' | \
        jq --arg image "$ECR_REPOSITORY_URL:$IMAGE_TAG" \
        '.containerDefinitions[0].image = $image | del(.taskDefinitionArn) | del(.revision) | del(.status) | del(.requiresAttributes) | del(.placementConstraints) | del(.compatibilities) | del(.registeredAt) | del(.registeredBy)')

    # Register new task definition
    local new_task_def_arn=$(aws ecs register-task-definition \
        --region "$AWS_REGION" \
        --cli-input-json "$new_task_def" \
        --query 'taskDefinition.taskDefinitionArn' --output text)

    # Update or create service
    if aws ecs describe-services \
        --cluster "$PROJECT_NAME-cluster" \
        --services "$PROJECT_NAME-$env" \
        --region "$AWS_REGION" \
        --query 'services[0].serviceName' --output text | grep -q "$PROJECT_NAME-$env"; then

        # Update existing service
        aws ecs update-service \
            --cluster "$PROJECT_NAME-cluster" \
            --service "$PROJECT_NAME-$env" \
            --task-definition "$new_task_def_arn" \
            --region "$AWS_REGION" >/dev/null
    else
        # Create new service (this is simplified - would need full service definition)
        log_warning "Service $PROJECT_NAME-$env does not exist. Manual creation required."
        return 1
    fi

    # Wait for deployment to stabilize
    log_info "Waiting for $env service to stabilize..."
    aws ecs wait services-stable \
        --cluster "$PROJECT_NAME-cluster" \
        --services "$PROJECT_NAME-$env" \
        --region "$AWS_REGION"
}

# Health check environment
health_check_environment() {
    local env=$1
    local target_group_name="$PROJECT_NAME-$env-tg"

    # Get target group ARN
    local target_group_arn=$(aws elbv2 describe-target-groups \
        --names "$target_group_name" \
        --query 'TargetGroups[0].TargetGroupArn' --output text \
        --region "$AWS_REGION")

    # Check target health
    local attempts=0
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / HEALTH_CHECK_INTERVAL))

    while [ $attempts -lt $max_attempts ]; do
        local healthy_count=$(aws elbv2 describe-target-health \
            --target-group-arn "$target_group_arn" \
            --region "$AWS_REGION" \
            --query 'TargetHealthDescriptions[?TargetHealth.State==`healthy`] | length(@)')

        if [ "$healthy_count" -ge 2 ]; then
            log_success "$env environment is healthy ($healthy_count targets)"
            return 0
        fi

        log_info "Waiting for $env environment to be healthy... ($attempts/$max_attempts)"
        sleep $HEALTH_CHECK_INTERVAL
        ((attempts++))
    done

    log_error "$env environment failed health check"
    return 1
}

# Switch traffic between environments
switch_traffic() {
    local target_env=$1
    local target_group_arn=$(aws elbv2 describe-target-groups \
        --names "$PROJECT_NAME-$target_env-tg" \
        --query 'TargetGroups[0].TargetGroupArn' --output text \
        --region "$AWS_REGION")

    local listener_arn=$(aws elbv2 describe-listeners \
        --load-balancer-arn $(aws elbv2 describe-load-balancers --names "$PROJECT_NAME-alb" --query 'LoadBalancers[0].LoadBalancerArn' --output text) \
        --query 'Listeners[?Port==`443`].ListenerArn' --output text \
        --region "$AWS_REGION")

    aws elbv2 modify-listener \
        --listener-arn "$listener_arn" \
        --default-actions Type=forward,TargetGroupArn="$target_group_arn" \
        --region "$AWS_REGION" >/dev/null

    log_success "Traffic switched to $target_env environment"
}

# Monitor deployment for issues
monitor_deployment() {
    local duration=$1
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))

    while [ $(date +%s) -lt $end_time ]; do
        # Check error rate
        local error_count=$(aws logs filter-log-events \
            --log-group-name "/ecs/$PROJECT_NAME" \
            --start-time $(date -d '5 minutes ago' +%s)000 \
            --filter-pattern "ERROR" \
            --query 'events | length(@)' \
            --region "$AWS_REGION" 2>/dev/null || echo "0")

        if [ "$error_count" -gt 10 ]; then
            log_error "High error count detected: $error_count"
            return 1
        fi

        # Check response times (would need more sophisticated monitoring)
        log_info "Monitoring... Errors: $error_count ($(date +%H:%M:%S))"
        sleep 30
    done

    log_success "Monitoring completed successfully"
    return 0
}

# Scale down environment
scale_down_environment() {
    local env=$1

    aws ecs update-service \
        --cluster "$PROJECT_NAME-cluster" \
        --service "$PROJECT_NAME-$env" \
        --desired-count 0 \
        --region "$AWS_REGION" >/dev/null

    log_success "$env environment scaled down"
}

# Rollback deployment
rollback_deployment() {
    local stable_env=$1

    log_warning "Rolling back to $stable_env environment"

    # Switch traffic back
    switch_traffic "$stable_env"

    # Scale down failed environment
    local failed_env="blue"
    if [ "$stable_env" = "blue" ]; then
        failed_env="green"
    fi

    scale_down_environment "$failed_env"

    log_success "Rollback completed to $stable_env environment"
}

# Deploy frontend
deploy_frontend() {
    log_step "Deploying frontend"

    cd "$FRONTEND_DIR"

    # Install dependencies
    log_info "Installing frontend dependencies..."
    npm ci

    # Build frontend
    log_info "Building frontend..."
    VITE_API_URL="https://$API_DOMAIN_NAME" \
    VITE_GRAPHQL_URL="https://$API_DOMAIN_NAME/graphql" \
    VITE_WS_URL="wss://$API_DOMAIN_NAME:8080" \
    VITE_ENVIRONMENT="$ENVIRONMENT" \
    npm run build

    # Deploy to S3
    log_info "Deploying to S3..."
    local bucket_name=$(aws s3api list-buckets \
        --query "Buckets[?contains(Name, \`$PROJECT_NAME-frontend\`)].Name" \
        --output text)

    aws s3 sync dist/ "s3://$bucket_name" --delete --region "$AWS_REGION"

    # Invalidate CloudFront
    log_info "Invalidating CloudFront cache..."
    local distribution_id=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?contains(Comment, \`$PROJECT_NAME\`)].Id" \
        --output text)

    aws cloudfront create-invalidation \
        --distribution-id "$distribution_id" \
        --paths "/*" \
        --region "$AWS_REGION" >/dev/null

    cd - >/dev/null
    log_success "Frontend deployed successfully"
}

# Run post-deployment validation
validate_deployment() {
    log_step "Running post-deployment validation"

    # Test endpoints
    local endpoints=(
        "https://$DOMAIN_NAME"
        "https://$API_DOMAIN_NAME/health"
        "https://$API_DOMAIN_NAME/graphql"
    )

    for endpoint in "${endpoints[@]}"; do
        log_info "Testing endpoint: $endpoint"
        if curl -f -s -o /dev/null -w "%{http_code}" "$endpoint" | grep -q "200"; then
            log_success "✓ $endpoint is responding"
        else
            log_error "✗ $endpoint is not responding"
            return 1
        fi
    done

    # Test GraphQL query
    log_info "Testing GraphQL query..."
    local gql_response=$(curl -s -X POST -H "Content-Type: application/json" \
        -d '{"query":"query{__typename}"}' \
        "https://$API_DOMAIN_NAME/graphql")

    if echo "$gql_response" | jq -e '.data.__typename' >/dev/null 2>&1; then
        log_success "✓ GraphQL endpoint is working"
    else
        log_error "✗ GraphQL endpoint is not working"
        return 1
    fi

    log_success "All validation tests passed"
}

# Display deployment summary
show_deployment_summary() {
    log_step "Deployment Summary"

    echo -e "${GREEN}🎉 Tyler Setup Platform deployed successfully!${NC}\n"

    echo -e "${BLUE}📋 Deployment Details:${NC}"
    echo "  • Environment: $ENVIRONMENT"
    echo "  • Image Tag: $IMAGE_TAG"
    echo "  • Deployment Time: $(date)"
    echo "  • Log File: $LOG_FILE"
    echo

    echo -e "${BLUE}🌐 Application URLs:${NC}"
    echo "  • Frontend: https://$DOMAIN_NAME"
    echo "  • API: https://$API_DOMAIN_NAME"
    echo "  • GraphQL: https://$API_DOMAIN_NAME/graphql"
    echo "  • Health Check: https://$API_DOMAIN_NAME/health"
    echo

    echo -e "${BLUE}🔧 Infrastructure:${NC}"
    echo "  • Load Balancer: $ALB_DNS_NAME"
    echo "  • CloudFront: $CLOUDFRONT_DOMAIN"
    echo "  • ECR Repository: $ECR_REPOSITORY_URL"
    echo

    echo -e "${BLUE}📊 Monitoring:${NC}"
    echo "  • CloudWatch Dashboard: https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=$PROJECT_NAME-dashboard"
    echo "  • Application Logs: https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/\$252Fecs\$252F$PROJECT_NAME"
    echo

    echo -e "${YELLOW}⚠️  Next Steps:${NC}"
    echo "  1. Update DNS nameservers if this is the first deployment"
    echo "  2. Update Claude API key if not set: CLAUDE_API_KEY=xxx ./deploy-production.sh"
    echo "  3. Configure OAuth credentials in AWS Secrets Manager"
    echo "  4. Test all functionality thoroughly"
    echo "  5. Set up monitoring alerts"
    echo

    echo -e "${BLUE}📚 Resources:${NC}"
    echo "  • Deployment Runbook: ./DEPLOYMENT_RUNBOOK.md"
    echo "  • Architecture Docs: ./docs/architecture.md"
    echo "  • Troubleshooting: ./docs/troubleshooting.md"
}

# Quick rollback function
quick_rollback() {
    log_step "Executing quick rollback"

    # Determine current active environment
    local listener_arn=$(aws elbv2 describe-listeners \
        --load-balancer-arn $(aws elbv2 describe-load-balancers --names "$PROJECT_NAME-alb" --query 'LoadBalancers[0].LoadBalancerArn' --output text) \
        --query 'Listeners[?Port==`443`].ListenerArn' --output text \
        --region "$AWS_REGION")

    local current_target_group=$(aws elbv2 describe-listeners \
        --listener-arns "$listener_arn" \
        --query 'Listeners[0].DefaultActions[0].TargetGroupArn' --output text \
        --region "$AWS_REGION")

    local rollback_env="blue"
    if [[ "$current_target_group" == *"blue"* ]]; then
        rollback_env="green"
    fi

    log_warning "Rolling back from current environment to $rollback_env"

    # Check if rollback environment has healthy targets
    local target_group_arn=$(aws elbv2 describe-target-groups \
        --names "$PROJECT_NAME-$rollback_env-tg" \
        --query 'TargetGroups[0].TargetGroupArn' --output text \
        --region "$AWS_REGION")

    local healthy_count=$(aws elbv2 describe-target-health \
        --target-group-arn "$target_group_arn" \
        --region "$AWS_REGION" \
        --query 'TargetHealthDescriptions[?TargetHealth.State==`healthy`] | length(@)')

    if [ "$healthy_count" -eq 0 ]; then
        log_error "No healthy targets in $rollback_env environment. Cannot rollback."
        log_info "You may need to manually scale up the $rollback_env service first."
        return 1
    fi

    # Execute rollback
    switch_traffic "$rollback_env"
    log_success "Rollback completed successfully to $rollback_env environment"
}

# Main deployment function
main() {
    local start_time=$(date +%s)

    echo -e "${BLUE}🚀 Tyler Setup Platform - Production Deployment${NC}"
    echo -e "${BLUE}===============================================${NC}\n"

    # Parse command line arguments
    case "${1:-deploy}" in
        "deploy"|"")
            check_prerequisites
            validate_environment
            deploy_infrastructure
            update_secrets
            build_and_push_image
            deploy_lambda_functions
            deploy_blue_green
            deploy_frontend
            validate_deployment
            show_deployment_summary
            ;;
        "--rollback"|"rollback")
            log_warning "Executing emergency rollback..."
            quick_rollback
            ;;
        "--validate"|"validate")
            validate_deployment
            ;;
        "--help"|"help"|"-h")
            echo "Usage: $0 [deploy|rollback|validate|help]"
            echo ""
            echo "Commands:"
            echo "  deploy    - Full production deployment (default)"
            echo "  rollback  - Emergency rollback to previous environment"
            echo "  validate  - Run post-deployment validation only"
            echo "  help      - Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  CLAUDE_API_KEY          - Claude API key (required)"
            echo "  GOOGLE_CLIENT_ID        - Google OAuth client ID"
            echo "  GOOGLE_CLIENT_SECRET    - Google OAuth client secret"
            echo "  MICROSOFT_CLIENT_ID     - Microsoft OAuth client ID"
            echo "  MICROSOFT_CLIENT_SECRET - Microsoft OAuth client secret"
            exit 0
            ;;
        *)
            log_error "Unknown command: $1"
            log_info "Run '$0 help' for usage information"
            exit 1
            ;;
    esac

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    log_success "Total deployment time: ${duration} seconds"
}

# Run main function with all arguments
main "$@"
