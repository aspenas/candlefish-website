#!/bin/bash

# Candlefish AI Unified Deployment Script
# Comprehensive deployment automation with safety checks and rollback capabilities

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEPLOYMENT_DIR="${PROJECT_ROOT}/deployment"

# Default values
ENVIRONMENT="development"
DRY_RUN=false
FORCE=false
ROLLBACK=false
SKIP_TESTS=false
SKIP_SECURITY_SCAN=false
VERBOSE=false
HELM_TIMEOUT="15m"
KUBECTL_TIMEOUT="600s"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_verbose() {
    if [[ "${VERBOSE}" == "true" ]]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1" >&2
    fi
}

# Help function
show_help() {
    cat << EOF
Candlefish AI Unified Deployment Script

Usage: $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV       Target environment (development|staging|production) [default: development]
    -d, --dry-run              Show what would be deployed without making changes
    -f, --force                Force deployment even if validation fails
    -r, --rollback             Rollback to previous version
    -t, --skip-tests           Skip running tests before deployment
    -s, --skip-security-scan   Skip security scanning
    -v, --verbose              Enable verbose output
    -h, --help                 Show this help message

EXAMPLES:
    $0 -e development          # Deploy to development
    $0 -e production -d        # Dry run for production
    $0 -e staging -r           # Rollback staging environment
    $0 -e production -v        # Deploy to production with verbose output

ENVIRONMENT VARIABLES:
    AWS_REGION                 AWS region [default: us-west-2]
    KUBECONFIG                 Path to kubeconfig file
    HELM_DEBUG                 Enable Helm debug mode
    SLACK_WEBHOOK_URL          Slack webhook for notifications
EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -r|--rollback)
                ROLLBACK=true
                shift
                ;;
            -t|--skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -s|--skip-security-scan)
                SKIP_SECURITY_SCAN=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
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
}

# Validate environment
validate_environment() {
    case "${ENVIRONMENT}" in
        development|staging|production)
            log_info "Target environment: ${ENVIRONMENT}"
            ;;
        *)
            log_error "Invalid environment: ${ENVIRONMENT}. Must be development, staging, or production"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing_tools=()

    # Check required tools
    for tool in kubectl helm aws docker git; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install the missing tools and try again"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi

    # Check kubectl context
    local current_context
    current_context=$(kubectl config current-context 2>/dev/null || echo "")
    if [[ -z "$current_context" ]]; then
        log_error "No kubectl context configured"
        exit 1
    fi

    log_verbose "Current kubectl context: $current_context"

    # Verify cluster access
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot access Kubernetes cluster"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Run security scan
run_security_scan() {
    if [[ "${SKIP_SECURITY_SCAN}" == "true" ]]; then
        log_warning "Skipping security scan"
        return
    fi

    log_info "Running security scan..."

    # Check if Trivy is available
    if command -v trivy &> /dev/null; then
        log_verbose "Scanning Docker images with Trivy"

        # Scan key images
        local images=(
            "ghcr.io/candlefish-ai/website-frontend:latest"
            "ghcr.io/candlefish-ai/backend-api:latest"
            "ghcr.io/candlefish-ai/paintbox-service:latest"
        )

        for image in "${images[@]}"; do
            log_verbose "Scanning $image"
            if ! trivy image --severity HIGH,CRITICAL --quiet "$image"; then
                if [[ "${FORCE}" != "true" ]]; then
                    log_error "Security vulnerabilities found in $image. Use --force to proceed anyway"
                    exit 1
                fi
                log_warning "Security vulnerabilities found in $image, but proceeding due to --force flag"
            fi
        done
    else
        log_warning "Trivy not found, skipping container image security scan"
    fi

    # Run Kubernetes security checks
    if command -v kube-score &> /dev/null; then
        log_verbose "Running Kubernetes security checks with kube-score"
        if ! find "${DEPLOYMENT_DIR}/helm" -name "*.yaml" -exec kube-score score {} \; > /tmp/kube-score.out 2>&1; then
            if [[ "${FORCE}" != "true" ]]; then
                log_error "Kubernetes security issues found. Check /tmp/kube-score.out for details"
                exit 1
            fi
            log_warning "Kubernetes security issues found, but proceeding due to --force flag"
        fi
    fi

    log_success "Security scan completed"
}

# Run tests
run_tests() {
    if [[ "${SKIP_TESTS}" == "true" ]]; then
        log_warning "Skipping tests"
        return
    fi

    log_info "Running tests..."

    # Run unit tests
    if [[ -f "${PROJECT_ROOT}/package.json" ]]; then
        log_verbose "Running frontend tests"
        cd "${PROJECT_ROOT}"
        if ! npm test -- --passWithNoTests; then
            if [[ "${FORCE}" != "true" ]]; then
                log_error "Frontend tests failed. Use --force to proceed anyway"
                exit 1
            fi
            log_warning "Frontend tests failed, but proceeding due to --force flag"
        fi
    fi

    # Run backend tests
    if [[ -f "${PROJECT_ROOT}/apps/rtpm-api/requirements.txt" ]]; then
        log_verbose "Running backend tests"
        cd "${PROJECT_ROOT}/apps/rtpm-api"
        if command -v pytest &> /dev/null && [[ -f "pytest.ini" ]]; then
            if ! pytest --tb=short; then
                if [[ "${FORCE}" != "true" ]]; then
                    log_error "Backend tests failed. Use --force to proceed anyway"
                    exit 1
                fi
                log_warning "Backend tests failed, but proceeding due to --force flag"
            fi
        fi
    fi

    log_success "Tests completed"
}

# Setup namespace
setup_namespace() {
    local namespace="candlefish-${ENVIRONMENT}"

    log_info "Setting up namespace: $namespace"

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would create/ensure namespace: $namespace"
        return
    fi

    if ! kubectl get namespace "$namespace" &> /dev/null; then
        kubectl create namespace "$namespace"
        log_success "Created namespace: $namespace"
    else
        log_verbose "Namespace $namespace already exists"
    fi

    # Label namespace for monitoring and network policies
    kubectl label namespace "$namespace" \
        name="$namespace" \
        environment="$ENVIRONMENT" \
        managed-by=helm \
        --overwrite
}

# Deploy infrastructure (Terraform)
deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."

    local terraform_dir="${PROJECT_ROOT}/infrastructure/terraform"
    cd "$terraform_dir"

    # Initialize Terraform
    terraform init -input=false

    # Validate configuration
    if ! terraform validate; then
        log_error "Terraform validation failed"
        exit 1
    fi

    # Plan deployment
    local plan_file="/tmp/terraform-${ENVIRONMENT}.plan"
    terraform plan \
        -var="environment=${ENVIRONMENT}" \
        -out="$plan_file"

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Terraform plan completed. Would apply changes."
        return
    fi

    # Apply changes
    if [[ "${FORCE}" == "true" ]] || terraform apply -input=false "$plan_file"; then
        log_success "Infrastructure deployment completed"
    else
        log_error "Infrastructure deployment failed"
        exit 1
    fi
}

# Deploy application (Helm)
deploy_application() {
    log_info "Deploying application with Helm..."

    local helm_chart="${DEPLOYMENT_DIR}/helm/candlefish"
    local release_name="candlefish-${ENVIRONMENT}"
    local namespace="candlefish-${ENVIRONMENT}"
    local values_file="${helm_chart}/values-${ENVIRONMENT}.yaml"

    # Check if values file exists
    if [[ ! -f "$values_file" ]]; then
        log_error "Values file not found: $values_file"
        exit 1
    fi

    # Add Helm dependencies
    log_verbose "Adding Helm chart dependencies"
    cd "$helm_chart"
    helm dependency update

    # Lint Helm chart
    if ! helm lint . -f "$values_file"; then
        if [[ "${FORCE}" != "true" ]]; then
            log_error "Helm chart linting failed. Use --force to proceed anyway"
            exit 1
        fi
        log_warning "Helm chart linting failed, but proceeding due to --force flag"
    fi

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would deploy Helm chart:"
        helm upgrade --install "$release_name" . \
            --namespace "$namespace" \
            --values "$values_file" \
            --dry-run --debug
        return
    fi

    # Deploy with Helm
    helm upgrade --install "$release_name" . \
        --namespace "$namespace" \
        --create-namespace \
        --values "$values_file" \
        --timeout "$HELM_TIMEOUT" \
        --wait \
        --history-max 10

    if [[ $? -eq 0 ]]; then
        log_success "Application deployment completed"
    else
        log_error "Application deployment failed"
        exit 1
    fi
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."

    local namespace="candlefish-${ENVIRONMENT}"

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would run health checks"
        return
    fi

    # Wait for deployments to be ready
    log_verbose "Waiting for deployments to be ready..."

    local deployments=(
        "website"
        "backend-api"
        "analytics-dashboard"
        "paintbox-service"
        "brand-portal"
        "api-gateway"
    )

    for deployment in "${deployments[@]}"; do
        log_verbose "Checking deployment: $deployment"
        if kubectl rollout status "deployment/$deployment" -n "$namespace" --timeout="$KUBECTL_TIMEOUT"; then
            log_verbose "$deployment is ready"
        else
            log_error "$deployment failed to become ready"
            return 1
        fi
    done

    # Run application health checks
    log_verbose "Running application health checks..."

    # Get ingress endpoint
    local ingress_host
    ingress_host=$(kubectl get ingress -n "$namespace" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")

    if [[ -n "$ingress_host" ]]; then
        # Test main endpoints
        local endpoints=(
            "http://${ingress_host}/health"
            "http://${ingress_host}/api/health"
        )

        for endpoint in "${endpoints[@]}"; do
            log_verbose "Testing endpoint: $endpoint"
            if curl -f -s --max-time 30 "$endpoint" > /dev/null; then
                log_verbose "$endpoint is healthy"
            else
                log_warning "$endpoint health check failed"
            fi
        done
    else
        log_warning "Could not determine ingress endpoint for health checks"
    fi

    log_success "Health checks completed"
}

# Rollback deployment
rollback_deployment() {
    log_info "Rolling back deployment..."

    local release_name="candlefish-${ENVIRONMENT}"
    local namespace="candlefish-${ENVIRONMENT}"

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would rollback Helm release: $release_name"
        helm history "$release_name" -n "$namespace" || true
        return
    fi

    # Get current revision
    local current_revision
    current_revision=$(helm list -n "$namespace" -o json | jq -r ".[] | select(.name == \"$release_name\") | .revision")

    if [[ -z "$current_revision" || "$current_revision" == "null" ]]; then
        log_error "Cannot determine current revision for rollback"
        exit 1
    fi

    if [[ "$current_revision" -le 1 ]]; then
        log_error "Cannot rollback: no previous revision available"
        exit 1
    fi

    # Rollback to previous revision
    if helm rollback "$release_name" -n "$namespace" --wait --timeout "$HELM_TIMEOUT"; then
        log_success "Rollback completed"
    else
        log_error "Rollback failed"
        exit 1
    fi
}

# Send notification
send_notification() {
    local status=$1
    local message=$2

    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        local emoji="✅"

        if [[ "$status" == "failure" ]]; then
            color="danger"
            emoji="❌"
        elif [[ "$status" == "warning" ]]; then
            color="warning"
            emoji="⚠️"
        fi

        local payload=$(cat <<EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "$emoji Candlefish AI Deployment",
            "text": "$message",
            "fields": [
                {
                    "title": "Environment",
                    "value": "$ENVIRONMENT",
                    "short": true
                },
                {
                    "title": "Status",
                    "value": "$status",
                    "short": true
                }
            ],
            "ts": $(date +%s)
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

# Cleanup on exit
cleanup() {
    local exit_code=$?

    if [[ $exit_code -ne 0 ]]; then
        log_error "Deployment failed with exit code $exit_code"
        send_notification "failure" "Deployment to $ENVIRONMENT failed"
    fi

    # Cleanup temporary files
    rm -f /tmp/terraform-*.plan
    rm -f /tmp/kube-score.out
}

# Main execution
main() {
    # Setup trap for cleanup
    trap cleanup EXIT

    log_info "Starting Candlefish AI deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Dry run: $DRY_RUN"

    # Parse arguments
    parse_args "$@"

    # Validate environment
    validate_environment

    # Check prerequisites
    check_prerequisites

    # Handle rollback
    if [[ "${ROLLBACK}" == "true" ]]; then
        rollback_deployment
        send_notification "success" "Rollback to $ENVIRONMENT completed successfully"
        exit 0
    fi

    # Run security scan
    run_security_scan

    # Run tests
    run_tests

    # Setup namespace
    setup_namespace

    # Deploy infrastructure
    if [[ "$ENVIRONMENT" == "production" ]] || [[ "$ENVIRONMENT" == "staging" ]]; then
        deploy_infrastructure
    fi

    # Deploy application
    deploy_application

    # Run health checks
    run_health_checks

    log_success "Deployment completed successfully!"
    send_notification "success" "Deployment to $ENVIRONMENT completed successfully"
}

# Execute main function with all arguments
main "$@"
