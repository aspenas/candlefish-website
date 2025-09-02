#!/bin/bash
# DNS deployment script for candlefish.ai infrastructure

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
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

# Load environment variables
load_env() {
    if [[ -f "$ENV_FILE" ]]; then
        set -a
        source "$ENV_FILE"
        set +a
        log "Environment loaded from $ENV_FILE"
    else
        warn "No .env file found. Using environment variables."
    fi
}

# Validate required environment variables
validate_env() {
    local required_vars=("DOMAIN" "AWS_REGION")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error "Missing required environment variables: ${missing_vars[*]}"
    fi
}

# Check prerequisites
check_prerequisites() {
    local tools=("aws" "terraform" "docker" "docker-compose")
    local missing_tools=()
    
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "Missing required tools: ${missing_tools[*]}"
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured or invalid"
    fi
    
    log "Prerequisites check passed"
}

# Deploy Route53 DNS with Terraform
deploy_route53() {
    info "Deploying Route53 DNS configuration..."
    
    cd "$PROJECT_ROOT/route53"
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -out=tfplan \
        -var="vpc_id=${VPC_ID:-vpc-12345}" \
        -var="public_subnet_ids=${PUBLIC_SUBNET_IDS:-[\"subnet-123\",\"subnet-456\"]}"
    
    # Apply if approved
    if [[ "${AUTO_APPROVE:-false}" == "true" ]]; then
        terraform apply -auto-approve tfplan
    else
        echo -n "Apply Terraform plan? (y/N): "
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            terraform apply tfplan
        else
            info "Terraform deployment cancelled"
            return 0
        fi
    fi
    
    # Get outputs
    ALB_DNS_NAME=$(terraform output -raw alb_dns_name)
    ZONE_ID=$(terraform output -raw zone_id)
    CERTIFICATE_ARN=$(terraform output -raw certificate_arn)
    
    log "Route53 DNS deployed successfully"
    info "ALB DNS: $ALB_DNS_NAME"
    info "Zone ID: $ZONE_ID"
    info "Certificate ARN: $CERTIFICATE_ARN"
}

# Setup Cloudflare as backup
setup_cloudflare() {
    if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
        warn "Cloudflare API token not found. Skipping Cloudflare setup."
        return 0
    fi
    
    info "Setting up Cloudflare as backup DNS..."
    
    cd "$PROJECT_ROOT/cloudflare"
    
    terraform init
    terraform plan -out=cfplan \
        -var="cloudflare_api_token=$CLOUDFLARE_API_TOKEN" \
        -var="origin_ip=${ORIGIN_IP:-$ALB_DNS_NAME}"
    
    if [[ "${AUTO_APPROVE:-false}" == "true" ]]; then
        terraform apply -auto-approve cfplan
    else
        echo -n "Apply Cloudflare configuration? (y/N): "
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            terraform apply cfplan
        fi
    fi
    
    log "Cloudflare backup DNS configured"
}

# Deploy SSL certificates
deploy_ssl() {
    info "Setting up SSL certificates..."
    
    # Generate DH parameters if not exists
    if [[ ! -f "$PROJECT_ROOT/ssl/dhparam.pem" ]]; then
        log "Generating DH parameters..."
        "$PROJECT_ROOT/ssl/generate-dhparam.sh"
    fi
    
    # Setup Let's Encrypt certificates
    if [[ "${SKIP_SSL:-false}" != "true" ]]; then
        log "Setting up Let's Encrypt certificates..."
        "$PROJECT_ROOT/ssl/certbot-config.sh" setup
    else
        info "Skipping SSL setup (SKIP_SSL=true)"
    fi
}

# Deploy Docker infrastructure
deploy_docker() {
    info "Deploying Docker infrastructure..."
    
    cd "$PROJECT_ROOT"
    
    # Pull latest images
    docker-compose pull
    
    # Deploy services
    docker-compose up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    local timeout=300
    local elapsed=0
    
    while [[ $elapsed -lt $timeout ]]; do
        if docker-compose ps | grep -q "unhealthy\|starting"; then
            sleep 10
            elapsed=$((elapsed + 10))
        else
            break
        fi
    done
    
    if [[ $elapsed -ge $timeout ]]; then
        error "Services failed to become healthy within ${timeout}s"
    fi
    
    log "Docker infrastructure deployed successfully"
}

# Test deployment
test_deployment() {
    info "Testing deployment..."
    
    local services=("api" "analytics" "router" "monitor" "config")
    local failed_tests=()
    
    for service in "${services[@]}"; do
        local url="https://${service}.${DOMAIN}/health"
        if curl -s -f "$url" > /dev/null; then
            log "✓ $service is responding"
        else
            warn "✗ $service is not responding"
            failed_tests+=("$service")
        fi
    done
    
    if [[ ${#failed_tests[@]} -gt 0 ]]; then
        error "Failed tests: ${failed_tests[*]}"
    fi
    
    log "All deployment tests passed!"
}

# Generate deployment report
generate_report() {
    info "Generating deployment report..."
    
    local report_file="$PROJECT_ROOT/deployment-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$report_file" << EOF
Candlefish AI DNS Infrastructure Deployment Report
Generated: $(date)

Domain: ${DOMAIN}
Environment: ${NODE_ENV:-production}

DNS Configuration:
- Route53 Zone ID: ${ZONE_ID:-N/A}
- ALB DNS Name: ${ALB_DNS_NAME:-N/A}
- Certificate ARN: ${CERTIFICATE_ARN:-N/A}

Services:
- API: https://api.${DOMAIN}
- Analytics: https://analytics.${DOMAIN}
- Router: https://router.${DOMAIN}
- Monitor: https://monitor.${DOMAIN}
- Config: https://config.${DOMAIN}

Docker Services:
$(docker-compose ps)

SSL Certificates:
$(sudo ls -la /etc/letsencrypt/live/${DOMAIN}/ 2>/dev/null || echo "No certificates found")

Health Status:
$(for service in api analytics router monitor config; do
    url="https://${service}.${DOMAIN}/health"
    if curl -s -f "$url" > /dev/null; then
        echo "✓ $service: OK"
    else
        echo "✗ $service: FAIL"
    fi
done)
EOF
    
    log "Deployment report saved to: $report_file"
}

# Cleanup on error
cleanup() {
    warn "Deployment failed. Cleaning up..."
    # Add cleanup logic here if needed
}

# Main deployment function
main() {
    local action="${1:-full}"
    
    trap cleanup ERR
    
    log "Starting candlefish.ai DNS infrastructure deployment"
    log "Action: $action"
    
    load_env
    validate_env
    check_prerequisites
    
    case "$action" in
        "dns")
            deploy_route53
            ;;
        "cloudflare")
            setup_cloudflare
            ;;
        "ssl")
            deploy_ssl
            ;;
        "docker")
            deploy_docker
            ;;
        "test")
            test_deployment
            ;;
        "full")
            deploy_route53
            setup_cloudflare
            deploy_ssl
            deploy_docker
            test_deployment
            generate_report
            ;;
        *)
            echo "Usage: $0 {dns|cloudflare|ssl|docker|test|full}"
            echo "  dns        - Deploy Route53 DNS only"
            echo "  cloudflare - Setup Cloudflare backup"
            echo "  ssl        - Deploy SSL certificates"
            echo "  docker     - Deploy Docker services"
            echo "  test       - Test deployment"
            echo "  full       - Full deployment (default)"
            exit 1
            ;;
    esac
    
    log "Deployment completed successfully!"
}

# Run main function with all arguments
main "$@"