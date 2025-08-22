#!/bin/bash

# Candlefish.ai NANDA Agent Network Deployment Script
# Deploy to production at https://nanda.candlefish.ai

set -e

echo "================================================"
echo "🚀 CANDLEFISH NANDA NETWORK DEPLOYMENT"
echo "================================================"

# Configuration
DOCKER_REGISTRY="candlefish"
NAMESPACE="nanda-agents"
DOMAIN="nanda.candlefish.ai"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required but not installed.${NC}" >&2; exit 1; }
    command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}kubectl is required but not installed.${NC}" >&2; exit 1; }
    
    echo -e "${GREEN}✓ All prerequisites met${NC}"
}

# Build Docker images
build_images() {
    echo -e "${YELLOW}Building Docker images...${NC}"
    
    # Build base image
    docker build -f Dockerfile.base -t ${DOCKER_REGISTRY}/nanda-base:latest .
    
    # Build agent images
    for agent in orchestrator pkb paintbox clark intelligence; do
        echo "Building ${agent} agent..."
        docker build -f Dockerfile.${agent} -t ${DOCKER_REGISTRY}/nanda-${agent}:latest .
    done
    
    echo -e "${GREEN}✓ Docker images built${NC}"
}

# Push images to registry
push_images() {
    echo -e "${YELLOW}Pushing images to registry...${NC}"
    
    for agent in base orchestrator pkb paintbox clark intelligence; do
        docker push ${DOCKER_REGISTRY}/nanda-${agent}:latest
    done
    
    echo -e "${GREEN}✓ Images pushed to registry${NC}"
}

# Deploy to Kubernetes
deploy_kubernetes() {
    echo -e "${YELLOW}Deploying to Kubernetes...${NC}"
    
    # Create namespace if not exists
    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    
    # Create secrets from AWS Secrets Manager
    create_secrets
    
    # Apply Kubernetes manifests
    kubectl apply -f k8s/deployment.yaml
    
    # Wait for deployments
    echo "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s \
        deployment/orchestrator deployment/pkb-agent deployment/paintbox-agent \
        deployment/clark-scraper-agent deployment/intelligence-agent \
        -n ${NAMESPACE}
    
    echo -e "${GREEN}✓ Kubernetes deployment complete${NC}"
}

# Create secrets from AWS
create_secrets() {
    echo "Creating Kubernetes secrets..."
    
    # Get secrets from AWS
    SALESFORCE_CLIENT_ID=$(aws secretsmanager get-secret-value --secret-id candlefish/salesforce/client-id --query SecretString --output text 2>/dev/null || echo "")
    SALESFORCE_CLIENT_SECRET=$(aws secretsmanager get-secret-value --secret-id candlefish/salesforce/client-secret --query SecretString --output text 2>/dev/null || echo "")
    COMPANYCAM_API_KEY=$(aws secretsmanager get-secret-value --secret-id candlefish/companycam/api-key --query SecretString --output text 2>/dev/null || echo "")
    CLARK_COUNTY_API_KEY=$(aws secretsmanager get-secret-value --secret-id candlefish/clark-county/api-key --query SecretString --output text 2>/dev/null || echo "")
    
    # Create Paintbox secrets
    kubectl create secret generic paintbox-secrets \
        --from-literal=SALESFORCE_CLIENT_ID="${SALESFORCE_CLIENT_ID}" \
        --from-literal=SALESFORCE_CLIENT_SECRET="${SALESFORCE_CLIENT_SECRET}" \
        --from-literal=COMPANYCAM_API_KEY="${COMPANYCAM_API_KEY}" \
        -n ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    
    # Create Clark County secrets
    kubectl create secret generic clark-secrets \
        --from-literal=CLARK_COUNTY_API_KEY="${CLARK_COUNTY_API_KEY}" \
        -n ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
}

# Setup SSL certificate
setup_ssl() {
    echo -e "${YELLOW}Setting up SSL certificate...${NC}"
    
    # Install cert-manager if not present
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
    
    # Wait for cert-manager
    kubectl wait --for=condition=available --timeout=300s \
        deployment/cert-manager deployment/cert-manager-webhook deployment/cert-manager-cainjector \
        -n cert-manager
    
    # Create certificate issuer
    cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@candlefish.ai
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
    
    echo -e "${GREEN}✓ SSL certificate configured${NC}"
}

# Deploy with Docker Compose (for local/staging)
deploy_docker_compose() {
    echo -e "${YELLOW}Deploying with Docker Compose...${NC}"
    
    docker-compose up -d
    
    echo -e "${GREEN}✓ Docker Compose deployment complete${NC}"
    echo "Services available at:"
    echo "  - Orchestrator: http://localhost:7010"
    echo "  - Dashboard: http://localhost:7010/dashboard"
    echo "  - Grafana: http://localhost:3006"
    echo "  - Consul UI: http://localhost:8500"
}

# Health check
health_check() {
    echo -e "${YELLOW}Performing health checks...${NC}"
    
    if [ "$1" == "kubernetes" ]; then
        # Get ingress IP
        INGRESS_IP=$(kubectl get ingress nanda-ingress -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
        BASE_URL="https://${DOMAIN}"
    else
        BASE_URL="http://localhost:7010"
    fi
    
    # Check orchestrator health
    if curl -s "${BASE_URL}/health" | grep -q "healthy"; then
        echo -e "${GREEN}✓ Orchestrator is healthy${NC}"
    else
        echo -e "${RED}✗ Orchestrator health check failed${NC}"
    fi
    
    # Check agent discovery
    AGENTS=$(curl -s "${BASE_URL}/agents" | grep -o '"id"' | wc -l)
    echo -e "${GREEN}✓ ${AGENTS} agents registered${NC}"
}

# Main deployment flow
main() {
    echo "Deployment target: $1"
    
    check_prerequisites
    
    case "$1" in
        "production")
            build_images
            push_images
            deploy_kubernetes
            setup_ssl
            health_check kubernetes
            echo -e "${GREEN}✅ Production deployment complete!${NC}"
            echo "Access your NANDA network at: https://${DOMAIN}"
            ;;
        "staging")
            build_images
            deploy_docker_compose
            health_check local
            echo -e "${GREEN}✅ Staging deployment complete!${NC}"
            ;;
        "local")
            deploy_docker_compose
            health_check local
            echo -e "${GREEN}✅ Local deployment complete!${NC}"
            ;;
        *)
            echo "Usage: $0 {production|staging|local}"
            exit 1
            ;;
    esac
    
    echo ""
    echo "================================================"
    echo "📊 Next Steps:"
    echo "  1. Monitor agents: https://${DOMAIN}/dashboard"
    echo "  2. View metrics: https://${DOMAIN}:3006 (Grafana)"
    echo "  3. Check logs: kubectl logs -n ${NAMESPACE} -l nanda-agent=true"
    echo "  4. Scale agents: kubectl scale deployment <agent> --replicas=N -n ${NAMESPACE}"
    echo "================================================"
}

# Run main function with argument
main "${1:-local}"