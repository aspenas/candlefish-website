#!/bin/bash
set -euo pipefail

# CLOS Analytics Production Deployment Script
# Comprehensive deployment with health checks, rollback capability, and monitoring

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default configuration
ENVIRONMENT="${ENVIRONMENT:-staging}"
AWS_REGION="${AWS_REGION:-us-east-1}"
NAMESPACE="clos-analytics"
TIMEOUT_SECONDS=600
DRY_RUN="${DRY_RUN:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
FORCE_DEPLOY="${FORCE_DEPLOY:-false}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy CLOS Analytics to Kubernetes with comprehensive health checks and rollback capability

OPTIONS:
    -e, --environment ENV           Environment (dev|staging|production) [default: staging]
    -r, --region REGION            AWS region [default: us-east-1]
    -n, --namespace NAMESPACE      Kubernetes namespace [default: clos-analytics]
    -t, --timeout SECONDS         Deployment timeout [default: 600]
    --image-tag TAG               Docker image tag to deploy [default: latest]
    --dry-run                     Show what would be deployed without making changes
    --skip-tests                  Skip pre-deployment tests
    --force                       Force deployment even if checks fail
    --rollback-on-failure         Automatically rollback on deployment failure
    -h, --help                    Show this help message

EXAMPLES:
    $0 --environment production --image-tag v1.2.3
    $0 --environment staging --dry-run
    $0 --environment dev --skip-tests --force

ENVIRONMENT VARIABLES:
    KUBECONFIG                    Path to kubeconfig file
    DOCKER_REGISTRY              Container registry URL [default: ghcr.io]
    IMAGE_TAG                     Docker image tag [default: latest]
    SLACK_WEBHOOK_URL             Slack webhook for notifications
    ROLLBACK_ON_FAILURE           Auto-rollback on failure [default: true]

EOF
}

# Parse command line arguments
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT_SECONDS="$2"
            shift 2
            ;;
        --image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        --rollback-on-failure)
            ROLLBACK_ON_FAILURE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or production."
    exit 1
fi

# Global variables for rollback
DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/tmp/clos-analytics-backup-$DEPLOYMENT_ID"
PREVIOUS_IMAGES=()

log_info "Starting CLOS Analytics deployment"
log_info "Environment: $ENVIRONMENT"
log_info "Image Tag: $IMAGE_TAG"
log_info "Namespace: $NAMESPACE"
log_info "Deployment ID: $DEPLOYMENT_ID"

# Check prerequisites
check_prerequisites() {
    log_info "Checking deployment prerequisites..."
    
    local missing_deps=()
    
    # Check required commands
    for cmd in kubectl aws terraform docker; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        return 1
    fi
    
    # Check Kubernetes connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        log_error "Please check your KUBECONFIG and cluster connectivity"
        return 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        return 1
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace '$NAMESPACE' does not exist"
        if [[ "$DRY_RUN" == "false" ]]; then
            log_info "Creating namespace: $NAMESPACE"
            kubectl create namespace "$NAMESPACE"
        fi
    fi
    
    log_success "All prerequisites met"
}

# Create deployment backup
create_backup() {
    log_info "Creating deployment backup..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would create backup in: $BACKUP_DIR"
        return
    fi
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup existing deployments
    local deployments=("clos-api" "clos-websocket" "clos-web-dashboard")
    
    for deployment in "${deployments[@]}"; do
        if kubectl get deployment "$deployment" -n "$NAMESPACE" &> /dev/null; then
            log_info "Backing up deployment: $deployment"
            kubectl get deployment "$deployment" -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/${deployment}-deployment.yaml"
            
            # Store current image for rollback
            local current_image
            current_image=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
            PREVIOUS_IMAGES+=("$deployment:$current_image")
            
            echo "$current_image" > "$BACKUP_DIR/${deployment}-image.txt"
        fi
    done
    
    # Backup services and configmaps
    kubectl get services,configmaps,secrets -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/resources.yaml"
    
    log_success "Backup created in: $BACKUP_DIR"
}

# Run pre-deployment tests
run_pre_deployment_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping pre-deployment tests"
        return 0
    fi
    
    log_info "Running pre-deployment tests..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would run pre-deployment tests"
        return 0
    fi
    
    # Test image availability
    local images=(
        "clos-web-dashboard:$IMAGE_TAG"
        "clos-api-server:$IMAGE_TAG"
        "clos-websocket-server:$IMAGE_TAG"
    )
    
    for image in "${images[@]}"; do
        local full_image="$DOCKER_REGISTRY/candlefish-ai/$image"
        log_info "Checking image availability: $full_image"
        
        if ! docker manifest inspect "$full_image" &> /dev/null; then
            log_error "Image not found: $full_image"
            if [[ "$FORCE_DEPLOY" != "true" ]]; then
                return 1
            else
                log_warning "Continuing despite missing image (--force specified)"
            fi
        fi
    done
    
    # Test database connectivity
    log_info "Testing database connectivity..."
    if ! kubectl run db-test --image=postgres:16-alpine --rm -i --restart=Never -n "$NAMESPACE" -- \
        psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        log_error "Database connectivity test failed"
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            return 1
        fi
    fi
    
    # Test Redis connectivity
    log_info "Testing Redis connectivity..."
    if ! kubectl run redis-test --image=redis:7-alpine --rm -i --restart=Never -n "$NAMESPACE" -- \
        redis-cli -u "$REDIS_URL" ping &> /dev/null; then
        log_error "Redis connectivity test failed"
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            return 1
        fi
    fi
    
    log_success "Pre-deployment tests passed"
}

# Update image tags in manifests
update_image_tags() {
    log_info "Updating image tags in manifests..."
    
    local manifest_dir="$PROJECT_ROOT/k8s/clos-analytics"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would update image tags to: $IMAGE_TAG"
        return
    fi
    
    # Create temporary directory for modified manifests
    local temp_dir="/tmp/clos-analytics-manifests-$DEPLOYMENT_ID"
    cp -r "$manifest_dir" "$temp_dir"
    
    # Update image references
    find "$temp_dir" -name "*.yaml" -exec sed -i "s|candlefish/clos-dashboard:latest|$DOCKER_REGISTRY/candlefish-ai/clos-web-dashboard:$IMAGE_TAG|g" {} \;
    find "$temp_dir" -name "*.yaml" -exec sed -i "s|candlefish/clos-api:latest|$DOCKER_REGISTRY/candlefish-ai/clos-api-server:$IMAGE_TAG|g" {} \;
    find "$temp_dir" -name "*.yaml" -exec sed -i "s|candlefish/clos-websocket:latest|$DOCKER_REGISTRY/candlefish-ai/clos-websocket-server:$IMAGE_TAG|g" {} \;
    
    echo "$temp_dir"
}

# Deploy to Kubernetes
deploy_to_kubernetes() {
    local manifest_dir="$1"
    
    log_info "Deploying to Kubernetes..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would deploy manifests from: $manifest_dir"
        return 0
    fi
    
    # Apply manifests in order
    local manifests=(
        "namespace.yaml"
        "rbac.yaml"
        "configmap.yaml"
        "secrets.yaml"
        "postgres.yaml"
        "redis.yaml"
        "api-server.yaml"
        "websocket-server.yaml"
        "web-dashboard.yaml"
        "ingress.yaml"
        "monitoring.yaml"
        "logging.yaml"
    )
    
    for manifest in "${manifests[@]}"; do
        local manifest_file="$manifest_dir/$manifest"
        if [[ -f "$manifest_file" ]]; then
            log_info "Applying manifest: $manifest"
            if ! kubectl apply -f "$manifest_file"; then
                log_error "Failed to apply manifest: $manifest"
                return 1
            fi
        else
            log_warning "Manifest not found: $manifest"
        fi
    done
    
    log_success "Kubernetes deployment completed"
}

# Wait for deployments to be ready
wait_for_deployments() {
    log_info "Waiting for deployments to be ready..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would wait for deployments to be ready"
        return 0
    fi
    
    local deployments=("clos-api" "clos-websocket" "clos-web-dashboard")
    
    for deployment in "${deployments[@]}"; do
        log_info "Waiting for deployment: $deployment"
        
        if ! kubectl wait --for=condition=available --timeout="${TIMEOUT_SECONDS}s" \
            "deployment/$deployment" -n "$NAMESPACE"; then
            log_error "Deployment $deployment failed to become ready within ${TIMEOUT_SECONDS}s"
            return 1
        fi
        
        log_success "Deployment $deployment is ready"
    done
    
    # Wait for pods to be ready
    log_info "Waiting for all pods to be ready..."
    if ! kubectl wait --for=condition=ready --timeout=300s \
        pods -l "app in (clos-api,clos-websocket,clos-web-dashboard)" -n "$NAMESPACE"; then
        log_error "Some pods failed to become ready"
        return 1
    fi
    
    log_success "All deployments and pods are ready"
}

# Run health checks
run_health_checks() {
    log_info "Running post-deployment health checks..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would run health checks"
        return 0
    fi
    
    # Test API health
    log_info "Testing API health endpoint..."
    if ! kubectl run health-check --image=curlimages/curl:latest --rm -i --restart=Never -n "$NAMESPACE" -- \
        curl -f --max-time 30 http://clos-api-service:8000/api/v1/health; then
        log_error "API health check failed"
        return 1
    fi
    
    # Test WebSocket health
    log_info "Testing WebSocket health endpoint..."
    if ! kubectl run health-check --image=curlimages/curl:latest --rm -i --restart=Never -n "$NAMESPACE" -- \
        curl -f --max-time 30 http://clos-websocket-service:8001/health; then
        log_error "WebSocket health check failed"
        return 1
    fi
    
    # Test Dashboard health
    log_info "Testing Dashboard health endpoint..."
    if ! kubectl run health-check --image=curlimages/curl:latest --rm -i --restart=Never -n "$NAMESPACE" -- \
        curl -f --max-time 30 http://clos-web-dashboard-service:3500/api/health; then
        log_error "Dashboard health check failed"
        return 1
    fi
    
    # Check pod status
    log_info "Checking pod status..."
    local failing_pods
    failing_pods=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running --no-headers | wc -l)
    
    if [[ "$failing_pods" -gt 0 ]]; then
        log_error "Found $failing_pods failing pods:"
        kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running
        return 1
    fi
    
    log_success "All health checks passed"
}

# Rollback deployment
rollback_deployment() {
    log_error "Rolling back deployment..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would rollback deployment"
        return
    fi
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_error "Backup directory not found: $BACKUP_DIR"
        log_error "Cannot perform automatic rollback"
        return 1
    fi
    
    # Restore previous images
    for entry in "${PREVIOUS_IMAGES[@]}"; do
        IFS=':' read -r deployment image <<< "$entry"
        log_info "Rolling back $deployment to image: $image"
        
        kubectl set image "deployment/$deployment" \
            "$deployment=$image" \
            -n "$NAMESPACE"
    done
    
    # Wait for rollback to complete
    log_info "Waiting for rollback to complete..."
    for deployment in "clos-api" "clos-websocket" "clos-web-dashboard"; do
        if kubectl get deployment "$deployment" -n "$NAMESPACE" &> /dev/null; then
            kubectl rollout status "deployment/$deployment" -n "$NAMESPACE" --timeout=300s
        fi
    done
    
    # Run health checks after rollback
    if run_health_checks; then
        log_success "Rollback completed successfully"
    else
        log_error "Rollback completed but health checks failed"
        log_error "Manual intervention may be required"
        return 1
    fi
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color
        case "$status" in
            "success") color="good" ;;
            "failure") color="danger" ;;
            "warning") color="warning" ;;
            *) color="#439FE0" ;;
        esac
        
        local payload=$(cat << EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "CLOS Analytics Deployment - $ENVIRONMENT",
            "fields": [
                {
                    "title": "Status",
                    "value": "$status",
                    "short": true
                },
                {
                    "title": "Environment",
                    "value": "$ENVIRONMENT",
                    "short": true
                },
                {
                    "title": "Image Tag",
                    "value": "$IMAGE_TAG",
                    "short": true
                },
                {
                    "title": "Deployment ID",
                    "value": "$DEPLOYMENT_ID",
                    "short": true
                },
                {
                    "title": "Message",
                    "value": "$message",
                    "short": false
                }
            ]
        }
    ]
}
EOF
)
        
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            "$SLACK_WEBHOOK_URL" &> /dev/null || true
    fi
}

# Cleanup temporary files
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf "/tmp/clos-analytics-manifests-$DEPLOYMENT_ID" 2>/dev/null || true
    if [[ "$DRY_RUN" == "false" && -d "$BACKUP_DIR" ]]; then
        log_info "Backup files preserved in: $BACKUP_DIR"
        log_info "Remove manually after confirming deployment success"
    fi
}

# Main deployment function
main() {
    local deployment_success=false
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Check prerequisites
    if ! check_prerequisites; then
        log_error "Prerequisites check failed"
        exit 1
    fi
    
    # Create backup
    create_backup
    
    # Run pre-deployment tests
    if ! run_pre_deployment_tests; then
        log_error "Pre-deployment tests failed"
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            send_notification "failure" "Pre-deployment tests failed"
            exit 1
        fi
    fi
    
    # Update image tags
    local manifest_dir
    manifest_dir=$(update_image_tags)
    
    # Deploy to Kubernetes
    if ! deploy_to_kubernetes "$manifest_dir"; then
        log_error "Kubernetes deployment failed"
        send_notification "failure" "Kubernetes deployment failed"
        
        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            rollback_deployment
        fi
        exit 1
    fi
    
    # Wait for deployments
    if ! wait_for_deployments; then
        log_error "Deployments failed to become ready"
        send_notification "failure" "Deployments failed to become ready"
        
        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            rollback_deployment
        fi
        exit 1
    fi
    
    # Run health checks
    if ! run_health_checks; then
        log_error "Health checks failed"
        send_notification "failure" "Post-deployment health checks failed"
        
        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            rollback_deployment
        fi
        exit 1
    fi
    
    deployment_success=true
    log_success "CLOS Analytics deployment completed successfully!"
    send_notification "success" "Deployment completed successfully"
    
    # Display deployment summary
    log_info "Deployment Summary:"
    log_info "- Environment: $ENVIRONMENT"
    log_info "- Image Tag: $IMAGE_TAG"
    log_info "- Deployment ID: $DEPLOYMENT_ID"
    log_info "- Namespace: $NAMESPACE"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_warning "Production deployment completed. Monitor the system closely."
        log_info "Dashboard: https://clos.candlefish.ai"
        log_info "Monitoring: https://monitoring.clos.candlefish.ai"
    else
        log_info "Dashboard: https://$ENVIRONMENT-clos.candlefish.ai"
    fi
}

# Run main function
main "$@"