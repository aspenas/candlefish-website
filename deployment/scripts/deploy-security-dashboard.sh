#!/bin/bash
# Security Dashboard Deployment Script
# Automated deployment with rollback capabilities and health checks

set -euo pipefail

# ============================================================================
# Configuration and Constants
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"
NAMESPACE="security-dashboard"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DRY_RUN="${DRY_RUN:-false}"
SKIP_HEALTH_CHECK="${SKIP_HEALTH_CHECK:-false}"
TIMEOUT="${TIMEOUT:-600}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Deployment configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-681214184463}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
EKS_CLUSTER_NAME="${EKS_CLUSTER_NAME:-candlefish-production}"

# ============================================================================
# Utility Functions
# ============================================================================
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "$1 is not installed. Please install it first."
    fi
}

# Wait for deployment to be ready
wait_for_deployment() {
    local deployment=$1
    local timeout=${2:-300}
    
    log "Waiting for deployment $deployment to be ready (timeout: ${timeout}s)..."
    
    if kubectl rollout status deployment/$deployment -n $NAMESPACE --timeout=${timeout}s; then
        log "Deployment $deployment is ready"
        return 0
    else
        error "Deployment $deployment failed to become ready within ${timeout}s"
    fi
}

# Check service health
check_health() {
    local service=$1
    local port=$2
    local path=${3:-/health}
    
    log "Checking health of $service on port $port"
    
    # Port forward to check health
    kubectl port-forward service/$service $port:$port -n $NAMESPACE &
    local port_forward_pid=$!
    
    sleep 5
    
    local health_check_passed=false
    for i in {1..10}; do
        if curl -sf "http://localhost:$port$path" > /dev/null 2>&1; then
            log "Health check passed for $service"
            health_check_passed=true
            break
        else
            warn "Health check attempt $i/10 failed for $service, retrying..."
            sleep 5
        fi
    done
    
    # Clean up port forward
    kill $port_forward_pid 2>/dev/null || true
    
    if [ "$health_check_passed" = false ]; then
        error "Health check failed for $service after 10 attempts"
    fi
}

# ============================================================================
# Pre-deployment Checks
# ============================================================================
preflight_checks() {
    log "Running pre-flight checks..."
    
    # Check required commands
    check_command kubectl
    check_command docker
    check_command aws
    check_command helm
    
    # Check AWS credentials
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        error "AWS credentials not configured or expired"
    fi
    
    # Check kubectl context
    current_context=$(kubectl config current-context)
    if [[ "$current_context" != *"$EKS_CLUSTER_NAME"* ]]; then
        error "kubectl context is not set to the correct cluster. Current: $current_context"
    fi
    
    # Check namespace exists
    if ! kubectl get namespace $NAMESPACE > /dev/null 2>&1; then
        warn "Namespace $NAMESPACE does not exist, creating..."
        kubectl create namespace $NAMESPACE
    fi
    
    # Verify ECR access
    if ! aws ecr describe-repositories --region $AWS_REGION --repository-names security-dashboard-backend > /dev/null 2>&1; then
        warn "ECR repositories may not exist, this might be the first deployment"
    fi
    
    log "Pre-flight checks completed successfully"
}

# ============================================================================
# AWS Secrets Manager Integration
# ============================================================================
setup_secrets() {
    log "Setting up secrets from AWS Secrets Manager..."
    
    # Get secrets from AWS Secrets Manager
    local db_password
    local redis_password
    local jwt_secret
    local encryption_key
    local neo4j_password
    
    db_password=$(aws secretsmanager get-secret-value \
        --secret-id "candlefish/security-dashboard/postgres-password" \
        --region $AWS_REGION \
        --query 'SecretString' --output text 2>/dev/null || echo "")
    
    redis_password=$(aws secretsmanager get-secret-value \
        --secret-id "candlefish/security-dashboard/redis-password" \
        --region $AWS_REGION \
        --query 'SecretString' --output text 2>/dev/null || echo "")
    
    jwt_secret=$(aws secretsmanager get-secret-value \
        --secret-id "candlefish/security-dashboard/jwt-secret" \
        --region $AWS_REGION \
        --query 'SecretString' --output text 2>/dev/null || echo "")
    
    encryption_key=$(aws secretsmanager get-secret-value \
        --secret-id "candlefish/security-dashboard/encryption-key" \
        --region $AWS_REGION \
        --query 'SecretString' --output text 2>/dev/null || echo "")
    
    neo4j_password=$(aws secretsmanager get-secret-value \
        --secret-id "candlefish/security-dashboard/neo4j-password" \
        --region $AWS_REGION \
        --query 'SecretString' --output text 2>/dev/null || echo "")
    
    # Create or update Kubernetes secrets
    if [ -n "$db_password" ]; then
        kubectl create secret generic postgresql-credentials \
            --from-literal=postgres-password="$db_password" \
            --from-literal=security-app-password="$db_password" \
            -n $NAMESPACE \
            --dry-run=client -o yaml | kubectl apply -f -
        log "PostgreSQL credentials updated"
    else
        warn "PostgreSQL password not found in AWS Secrets Manager"
    fi
    
    if [ -n "$redis_password" ]; then
        kubectl create secret generic redis-credentials \
            --from-literal=redis-password="$redis_password" \
            -n $NAMESPACE \
            --dry-run=client -o yaml | kubectl apply -f -
        log "Redis credentials updated"
    else
        warn "Redis password not found in AWS Secrets Manager"
    fi
    
    if [ -n "$neo4j_password" ]; then
        kubectl create secret generic neo4j-credentials \
            --from-literal=neo4j-auth="neo4j/$neo4j_password" \
            -n $NAMESPACE \
            --dry-run=client -o yaml | kubectl apply -f -
        log "Neo4j credentials updated"
    else
        warn "Neo4j password not found in AWS Secrets Manager"
    fi
    
    # Application secrets
    if [ -n "$jwt_secret" ] && [ -n "$encryption_key" ]; then
        kubectl create secret generic security-dashboard-secrets \
            --from-literal=jwt-secret="$jwt_secret" \
            --from-literal=encryption-key="$encryption_key" \
            --from-literal=database-url="postgresql://security_user:$db_password@postgresql-timescale:5432/security_dashboard" \
            --from-literal=redis-url="redis://:$redis_password@redis:6379/0" \
            -n $NAMESPACE \
            --dry-run=client -o yaml | kubectl apply -f -
        log "Application secrets updated"
    else
        warn "JWT secret or encryption key not found in AWS Secrets Manager"
    fi
}

# ============================================================================
# Docker Image Management
# ============================================================================
build_and_push_images() {
    log "Building and pushing Docker images..."
    
    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION | \
        docker login --username AWS --password-stdin $ECR_REGISTRY
    
    # Build and push backend image
    log "Building backend image..."
    docker build -t $ECR_REGISTRY/security-dashboard-backend:$IMAGE_TAG \
        -f $PROJECT_ROOT/deployment/docker/Dockerfile.backend \
        $PROJECT_ROOT
    
    if [ "$DRY_RUN" = "false" ]; then
        docker push $ECR_REGISTRY/security-dashboard-backend:$IMAGE_TAG
        log "Backend image pushed successfully"
    else
        log "DRY RUN: Would push backend image"
    fi
    
    # Build and push frontend image
    log "Building frontend image..."
    docker build -t $ECR_REGISTRY/security-dashboard-frontend:$IMAGE_TAG \
        -f $PROJECT_ROOT/deployment/docker/Dockerfile.security-dashboard-frontend \
        $PROJECT_ROOT
    
    if [ "$DRY_RUN" = "false" ]; then
        docker push $ECR_REGISTRY/security-dashboard-frontend:$IMAGE_TAG
        log "Frontend image pushed successfully"
    else
        log "DRY RUN: Would push frontend image"
    fi
    
    # Build and push GraphQL gateway image
    log "Building GraphQL gateway image..."
    docker build -t $ECR_REGISTRY/security-dashboard-graphql:$IMAGE_TAG \
        -f $PROJECT_ROOT/deployment/docker/Dockerfile.graphql-gateway \
        $PROJECT_ROOT
    
    if [ "$DRY_RUN" = "false" ]; then
        docker push $ECR_REGISTRY/security-dashboard-graphql:$IMAGE_TAG
        log "GraphQL gateway image pushed successfully"
    else
        log "DRY RUN: Would push GraphQL gateway image"
    fi
}

# ============================================================================
# Kubernetes Deployment
# ============================================================================
deploy_infrastructure() {
    log "Deploying infrastructure components..."
    
    local k8s_dir="$PROJECT_ROOT/deployment/k8s/security-dashboard"
    
    # Apply manifests in order
    local manifests=(
        "00-namespace.yaml"
        "01-secrets.yaml"
        "02-configmaps.yaml"
        "03-storage.yaml"
        "09-postgresql-deployment.yaml"
        "10-redis-deployment.yaml"
        "11-neo4j-deployment.yaml"
    )
    
    for manifest in "${manifests[@]}"; do
        local file="$k8s_dir/$manifest"
        if [ -f "$file" ]; then
            log "Applying $manifest..."
            if [ "$DRY_RUN" = "false" ]; then
                # Replace placeholders
                envsubst < "$file" | kubectl apply -f -
            else
                log "DRY RUN: Would apply $manifest"
            fi
        else
            warn "Manifest $manifest not found, skipping"
        fi
    done
    
    # Wait for databases to be ready
    if [ "$DRY_RUN" = "false" ]; then
        wait_for_deployment "postgresql-timescale"
        wait_for_deployment "redis-cluster"
        wait_for_deployment "neo4j"
    fi
}

deploy_applications() {
    log "Deploying application components..."
    
    local k8s_dir="$PROJECT_ROOT/deployment/k8s/security-dashboard"
    
    # Apply application manifests
    local manifests=(
        "04-backend-deployment.yaml"
        "05-frontend-deployment.yaml"
        "06-kong-gateway.yaml"
        "07-ingress.yaml"
        "08-network-policies.yaml"
        "autoscaling.yaml"
    )
    
    for manifest in "${manifests[@]}"; do
        local file="$k8s_dir/$manifest"
        if [ -f "$file" ]; then
            log "Applying $manifest..."
            if [ "$DRY_RUN" = "false" ]; then
                # Replace placeholders
                envsubst < "$file" | kubectl apply -f -
            else
                log "DRY RUN: Would apply $manifest"
            fi
        else
            warn "Manifest $manifest not found, skipping"
        fi
    done
    
    # Wait for applications to be ready
    if [ "$DRY_RUN" = "false" ]; then
        wait_for_deployment "security-dashboard-backend"
        wait_for_deployment "security-dashboard-frontend"
        wait_for_deployment "kong-gateway"
    fi
}

# ============================================================================
# Monitoring Deployment
# ============================================================================
deploy_monitoring() {
    log "Deploying monitoring stack..."
    
    # Deploy Prometheus
    if command -v helm &> /dev/null; then
        log "Deploying Prometheus using Helm..."
        helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
        helm repo update
        
        if [ "$DRY_RUN" = "false" ]; then
            helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
                --namespace monitoring --create-namespace \
                --values $PROJECT_ROOT/deployment/monitoring/prometheus-values.yaml
        else
            log "DRY RUN: Would deploy Prometheus via Helm"
        fi
    else
        warn "Helm not found, skipping Prometheus deployment"
    fi
}

# ============================================================================
# Health Checks and Validation
# ============================================================================
run_health_checks() {
    if [ "$SKIP_HEALTH_CHECK" = "true" ]; then
        warn "Skipping health checks as requested"
        return 0
    fi
    
    log "Running comprehensive health checks..."
    
    # Check backend service
    check_health "security-dashboard-backend" 4000
    
    # Check frontend service
    check_health "security-dashboard-frontend" 3000
    
    # Check database connectivity
    log "Checking database connectivity..."
    kubectl exec -n $NAMESPACE deployment/postgresql-timescale -- \
        psql -U security_user -d security_dashboard -c "SELECT 1;" > /dev/null
    
    # Check Redis connectivity
    log "Checking Redis connectivity..."
    kubectl exec -n $NAMESPACE deployment/redis-cluster -- \
        redis-cli ping > /dev/null
    
    # Check Neo4j connectivity
    log "Checking Neo4j connectivity..."
    kubectl exec -n $NAMESPACE deployment/neo4j -- \
        cypher-shell -u neo4j -p "$neo4j_password" "RETURN 1;" > /dev/null || true
    
    log "All health checks passed successfully"
}

# ============================================================================
# Rollback Functions
# ============================================================================
create_rollback_point() {
    log "Creating rollback point..."
    
    local timestamp=$(date +"%Y%m%d%H%M%S")
    local rollback_file="$PROJECT_ROOT/deployment/rollbacks/rollback-$timestamp.yaml"
    
    mkdir -p "$(dirname "$rollback_file")"
    
    # Save current deployment state
    kubectl get deployments -n $NAMESPACE -o yaml > "$rollback_file"
    
    log "Rollback point saved to $rollback_file"
    echo "$rollback_file" > "$PROJECT_ROOT/deployment/rollbacks/latest-rollback.txt"
}

# ============================================================================
# Main Deployment Function
# ============================================================================
main() {
    log "Starting Security Dashboard deployment..."
    log "Environment: $DEPLOYMENT_ENV"
    log "Image Tag: $IMAGE_TAG"
    log "Dry Run: $DRY_RUN"
    
    # Set environment variables for envsubst
    export ECR_REGISTRY
    export IMAGE_TAG
    export AWS_REGION
    export DEPLOYMENT_ENV
    
    # Create rollback point before deployment
    if [ "$DRY_RUN" = "false" ]; then
        create_rollback_point
    fi
    
    # Execute deployment steps
    preflight_checks
    setup_secrets
    build_and_push_images
    deploy_infrastructure
    deploy_applications
    deploy_monitoring
    run_health_checks
    
    log "Deployment completed successfully!"
    log "Security Dashboard is now available at the configured ingress endpoints"
    
    # Display useful information
    log "Useful commands:"
    log "  kubectl get pods -n $NAMESPACE"
    log "  kubectl logs -f deployment/security-dashboard-backend -n $NAMESPACE"
    log "  kubectl port-forward service/security-dashboard-frontend 3000:3000 -n $NAMESPACE"
}

# ============================================================================
# Usage and Help
# ============================================================================
show_usage() {
    cat << EOF
Security Dashboard Deployment Script

Usage: $0 [OPTIONS]

Options:
    -e, --env ENV              Deployment environment (default: production)
    -t, --tag TAG             Docker image tag (default: latest)
    -d, --dry-run             Perform a dry run without actual deployment
    -s, --skip-health-checks  Skip health checks after deployment
    --timeout SECONDS         Deployment timeout in seconds (default: 600)
    -h, --help                Show this help message

Environment Variables:
    AWS_REGION                AWS region (default: us-east-1)
    AWS_ACCOUNT_ID            AWS account ID (default: 681214184463)
    EKS_CLUSTER_NAME          EKS cluster name (default: candlefish-production)
    DEPLOYMENT_ENV            Same as --env option
    IMAGE_TAG                 Same as --tag option
    DRY_RUN                   Same as --dry-run option
    SKIP_HEALTH_CHECK         Same as --skip-health-checks option
    TIMEOUT                   Same as --timeout option

Examples:
    # Deploy with default settings
    $0

    # Deploy with custom image tag
    $0 --tag v1.2.3

    # Perform a dry run
    $0 --dry-run

    # Deploy to staging environment
    $0 --env staging --tag latest

EOF
}

# ============================================================================
# Argument Parsing
# ============================================================================
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            DEPLOYMENT_ENV="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN="true"
            shift
            ;;
        -s|--skip-health-checks)
            SKIP_HEALTH_CHECK="true"
            shift
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# ============================================================================
# Signal Handling and Cleanup
# ============================================================================
cleanup() {
    log "Cleaning up..."
    # Kill any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
}

trap cleanup EXIT INT TERM

# ============================================================================
# Execute Main Function
# ============================================================================
main "$@"