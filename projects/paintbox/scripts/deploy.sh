#!/bin/bash
# Complete deployment script for System Analyzer
# This script orchestrates the entire deployment process

set -euo pipefail

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
NAMESPACE="${NAMESPACE:-system-analyzer}"
AWS_REGION="${AWS_REGION:-us-east-1}"
DRY_RUN="${DRY_RUN:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"
DEPLOYMENT_TIMEOUT="${DEPLOYMENT_TIMEOUT:-600}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_section() {
    echo -e "${PURPLE}[SECTION]${NC} $1" >&2
    echo -e "${PURPLE}=====================================\n${NC}" >&2
}

# Check prerequisites
check_prerequisites() {
    log_section "Checking Prerequisites"

    local missing_tools=()

    # Check required tools
    command -v kubectl >/dev/null 2>&1 || missing_tools+=("kubectl")
    command -v helm >/dev/null 2>&1 || missing_tools+=("helm")
    command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
    command -v aws >/dev/null 2>&1 || missing_tools+=("aws-cli")
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")

    if [[ ${#missing_tools[@]} -ne 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi

    # Check Kubernetes connection
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials not configured"
        exit 1
    fi

    # Check Docker registry access
    if ! docker info >/dev/null 2>&1; then
        log_error "Cannot connect to Docker daemon"
        exit 1
    fi

    log_success "All prerequisites met"
}

# Create namespace if not exists
create_namespace() {
    log_section "Setting Up Namespace"

    if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log_info "Namespace $NAMESPACE already exists"
    else
        log_info "Creating namespace: $NAMESPACE"
        if [[ "$DRY_RUN" == "false" ]]; then
            kubectl apply -f k8s/namespace.yaml
        fi
    fi

    # Set default namespace for kubectl
    kubectl config set-context --current --namespace="$NAMESPACE"
    log_success "Namespace configured"
}

# Deploy secrets and configuration
deploy_secrets() {
    log_section "Deploying Secrets and Configuration"

    log_info "Applying External Secrets configuration..."
    if [[ "$DRY_RUN" == "false" ]]; then
        kubectl apply -f k8s/secrets.yaml

        # Wait for secrets to be synced
        log_info "Waiting for secrets to sync..."
        local retries=30
        while [[ $retries -gt 0 ]]; do
            if kubectl get secret database-credentials >/dev/null 2>&1 && \
               kubectl get secret redis-credentials >/dev/null 2>&1 && \
               kubectl get secret api-secrets >/dev/null 2>&1; then
                break
            fi
            sleep 10
            ((retries--))
        done

        if [[ $retries -eq 0 ]]; then
            log_error "Timeout waiting for secrets to sync"
            exit 1
        fi
    fi

    log_info "Applying ConfigMaps..."
    if [[ "$DRY_RUN" == "false" ]]; then
        kubectl apply -f k8s/configmap.yaml
    fi

    log_success "Secrets and configuration deployed"
}

# Deploy database components
deploy_database() {
    log_section "Deploying Database Components"

    log_info "Deploying PostgreSQL and Redis..."
    if [[ "$DRY_RUN" == "false" ]]; then
        kubectl apply -f k8s/database.yaml

        # Wait for database to be ready
        log_info "Waiting for database to be ready..."
        kubectl wait --for=condition=ready pod -l app=postgres --timeout=${DEPLOYMENT_TIMEOUT}s
        kubectl wait --for=condition=ready pod -l app=redis --timeout=${DEPLOYMENT_TIMEOUT}s
    fi

    log_success "Database components deployed"
}

# Run database migrations
run_migrations() {
    log_section "Running Database Migrations"

    if [[ "$SKIP_BACKUP" == "false" ]]; then
        log_info "Creating backup before migration..."
        if [[ "$DRY_RUN" == "false" ]]; then
            # Create manual backup job
            kubectl create job db-backup-pre-migration-$(date +%s) \
                --from=cronjob/db-backup >/dev/null 2>&1 || true
        fi
    fi

    log_info "Running database migrations..."
    if [[ "$DRY_RUN" == "false" ]]; then
        kubectl apply -f k8s/jobs.yaml

        # Wait for migration to complete
        kubectl wait --for=condition=complete job/db-migrate --timeout=${DEPLOYMENT_TIMEOUT}s

        # Check migration logs
        local migration_pod
        migration_pod=$(kubectl get pod -l job-name=db-migrate -o jsonpath='{.items[0].metadata.name}')

        if kubectl logs "$migration_pod" | grep -q "ERROR"; then
            log_error "Database migration failed. Check logs:"
            kubectl logs "$migration_pod"
            exit 1
        fi
    fi

    log_success "Database migrations completed"
}

# Deploy backend services
deploy_backend() {
    log_section "Deploying Backend Services"

    log_info "Deploying Backend API..."
    if [[ "$DRY_RUN" == "false" ]]; then
        kubectl apply -f k8s/backend.yaml
        kubectl wait --for=condition=available deployment/backend-api --timeout=${DEPLOYMENT_TIMEOUT}s
    fi

    log_info "Deploying GraphQL Server..."
    if [[ "$DRY_RUN" == "false" ]]; then
        kubectl apply -f k8s/graphql.yaml
        kubectl wait --for=condition=available deployment/graphql-server --timeout=${DEPLOYMENT_TIMEOUT}s
    fi

    # Verify backend health
    if [[ "$DRY_RUN" == "false" ]]; then
        log_info "Verifying backend health..."
        sleep 30  # Allow time for services to start

        # Check backend API
        if ! kubectl exec deployment/backend-api -- curl -f localhost:8000/health >/dev/null 2>&1; then
            log_error "Backend API health check failed"
            exit 1
        fi

        # Check GraphQL server
        if ! kubectl exec deployment/graphql-server -- curl -f localhost:4000/health >/dev/null 2>&1; then
            log_error "GraphQL server health check failed"
            exit 1
        fi
    fi

    log_success "Backend services deployed and healthy"
}

# Deploy frontend
deploy_frontend() {
    log_section "Deploying Frontend"

    log_info "Deploying Next.js frontend..."
    if [[ "$DRY_RUN" == "false" ]]; then
        kubectl apply -f k8s/frontend.yaml
        kubectl wait --for=condition=available deployment/frontend --timeout=${DEPLOYMENT_TIMEOUT}s
    fi

    log_success "Frontend deployed"
}

# Deploy ingress and networking
deploy_networking() {
    log_section "Deploying Networking and Ingress"

    log_info "Deploying ingress resources..."
    if [[ "$DRY_RUN" == "false" ]]; then
        kubectl apply -f k8s/ingress.yaml

        # Wait for ingress to get an IP
        log_info "Waiting for load balancer IP..."
        local retries=60
        while [[ $retries -gt 0 ]]; do
            if kubectl get ingress system-analyzer-ingress -o jsonpath='{.status.loadBalancer.ingress[0]}' 2>/dev/null | grep -q .; then
                break
            fi
            sleep 10
            ((retries--))
        done

        if [[ $retries -eq 0 ]]; then
            log_warning "Timeout waiting for load balancer IP"
        else
            local lb_ip
            lb_ip=$(kubectl get ingress system-analyzer-ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
            log_info "Load balancer IP: $lb_ip"
        fi
    fi

    log_success "Networking deployed"
}

# Deploy monitoring stack
deploy_monitoring() {
    log_section "Deploying Monitoring Stack"

    log_info "Deploying monitoring components..."
    if [[ "$DRY_RUN" == "false" ]]; then
        kubectl apply -f k8s/monitoring.yaml

        # Wait for monitoring services
        kubectl wait --for=condition=available deployment/prometheus -n monitoring --timeout=${DEPLOYMENT_TIMEOUT}s
        kubectl wait --for=condition=available deployment/grafana -n monitoring --timeout=${DEPLOYMENT_TIMEOUT}s
    fi

    log_success "Monitoring stack deployed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping tests as requested"
        return
    fi

    log_section "Running Post-Deployment Tests"

    log_info "Running smoke tests..."
    if [[ "$DRY_RUN" == "false" ]]; then
        # Wait a bit for services to stabilize
        sleep 60

        # Run health check tests
        ./scripts/health-check.sh || {
            log_error "Health check tests failed"
            exit 1
        }

        # Run basic functionality tests
        npm run test:smoke -- --env="$ENVIRONMENT" || {
            log_error "Smoke tests failed"
            exit 1
        }
    fi

    log_success "Tests completed successfully"
}

# Verify deployment
verify_deployment() {
    log_section "Verifying Deployment"

    log_info "Checking all deployments..."
    if [[ "$DRY_RUN" == "false" ]]; then
        # Check all deployments are ready
        kubectl get deployments -o wide

        # Check all pods are running
        kubectl get pods -o wide

        # Check services
        kubectl get services -o wide

        # Check ingress
        kubectl get ingress -o wide

        # Get URLs
        log_info "Application URLs:"
        local domain
        domain=$(kubectl get ingress system-analyzer-ingress -o jsonpath='{.spec.rules[0].host}')
        echo "  - Main Application: https://$domain"
        echo "  - API Endpoint: https://$domain/api"
        echo "  - GraphQL Endpoint: https://$domain/graphql"

        # Check monitoring URLs
        local grafana_port
        grafana_port=$(kubectl get service grafana-service -n monitoring -o jsonpath='{.spec.ports[0].port}')
        echo "  - Grafana: http://localhost:$grafana_port (use port-forward)"
    fi

    log_success "Deployment verification completed"
}

# Setup port forwarding for local access
setup_port_forwarding() {
    log_section "Setting Up Port Forwarding"

    log_info "Creating port-forward commands for local development..."

    cat > port-forward.sh << 'EOF'
#!/bin/bash
# Port forwarding script for local development access

echo "Setting up port forwarding..."

# Grafana
kubectl port-forward service/grafana-service 3001:3000 -n monitoring &
echo "Grafana: http://localhost:3001 (admin/admin123)"

# Prometheus
kubectl port-forward service/prometheus-service 9090:9090 -n monitoring &
echo "Prometheus: http://localhost:9090"

# Backend API (direct access)
kubectl port-forward service/backend-api-service 8000:8000 -n system-analyzer &
echo "Backend API: http://localhost:8000"

# GraphQL Server (direct access)
kubectl port-forward service/graphql-service 4000:4000 -n system-analyzer &
echo "GraphQL Server: http://localhost:4000"

echo ""
echo "Port forwarding active. Press Ctrl+C to stop all forwards."
wait
EOF

    chmod +x port-forward.sh
    log_success "Port forwarding script created: ./port-forward.sh"
}

# Cleanup old resources
cleanup() {
    log_section "Cleaning Up Old Resources"

    if [[ "$DRY_RUN" == "false" ]]; then
        # Clean up old completed jobs
        kubectl delete jobs --field-selector=status.successful=1 || true

        # Clean up old replicasets
        kubectl delete replicasets --all || true

        # Clean up old pods
        kubectl delete pods --field-selector=status.phase=Succeeded || true
    fi

    log_success "Cleanup completed"
}

# Show deployment summary
show_summary() {
    log_section "Deployment Summary"

    local end_time
    end_time=$(date)

    log_success "Deployment completed successfully!"
    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Namespace: $NAMESPACE"
    echo "Completed at: $end_time"
    echo ""

    if [[ "$DRY_RUN" == "false" ]]; then
        echo "Next steps:"
        echo "1. Run ./port-forward.sh to access monitoring dashboards"
        echo "2. Check application health at the main URL"
        echo "3. Monitor system performance for the first 24 hours"
        echo "4. Update DNS records if not using LoadBalancer"
        echo "5. Configure monitoring alerts"
        echo ""
        echo "Useful commands:"
        echo "  kubectl get all -n $NAMESPACE"
        echo "  kubectl logs -f deployment/backend-api -n $NAMESPACE"
        echo "  kubectl describe ingress system-analyzer-ingress -n $NAMESPACE"
    fi
}

# Main deployment function
main() {
    local start_time
    start_time=$(date)

    log_info "Starting System Analyzer deployment..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Namespace: $NAMESPACE"
    log_info "Dry Run: $DRY_RUN"
    log_info "Started at: $start_time"
    echo ""

    # Deployment phases
    check_prerequisites
    create_namespace
    deploy_secrets
    deploy_database
    run_migrations
    deploy_backend
    deploy_frontend
    deploy_networking
    deploy_monitoring
    run_tests
    verify_deployment
    setup_port_forwarding
    cleanup
    show_summary
}

# Signal handling
cleanup_on_exit() {
    log_warning "Deployment interrupted"
    exit 1
}

trap cleanup_on_exit INT TERM

# Help function
show_help() {
    cat << EOF
System Analyzer Deployment Script

Usage: $0 [OPTIONS]

Options:
    --environment ENV      Deployment environment (default: production)
    --namespace NS         Kubernetes namespace (default: system-analyzer)
    --aws-region REGION    AWS region (default: us-east-1)
    --dry-run             Show what would be done without executing
    --skip-tests          Skip post-deployment tests
    --skip-backup         Skip pre-migration backup
    --timeout SECONDS     Deployment timeout (default: 600)
    --help                Show this help message

Examples:
    $0                                    # Deploy to production
    $0 --environment staging             # Deploy to staging
    $0 --dry-run                         # Show deployment plan
    $0 --skip-tests --timeout 300        # Deploy without tests

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --aws-region)
            AWS_REGION="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --skip-tests)
            SKIP_TESTS="true"
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP="true"
            shift
            ;;
        --timeout)
            DEPLOYMENT_TIMEOUT="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
case "$ENVIRONMENT" in
    staging|production)
        ;;
    *)
        log_error "Invalid environment: $ENVIRONMENT (must be staging or production)"
        exit 1
        ;;
esac

# Run main deployment
main
