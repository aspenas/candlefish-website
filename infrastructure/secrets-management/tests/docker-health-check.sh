#!/bin/bash

# Docker Container Health Check Suite
# Tests Docker containers and Kubernetes resources for secrets management

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

FAILED_TESTS=0
PASSED_TESTS=0
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

test_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    if [[ "$status" == "PASS" ]]; then
        echo -e "${GREEN}✓ $test_name: $message${NC}"
        ((PASSED_TESTS++))
    elif [[ "$status" == "FAIL" ]]; then
        echo -e "${RED}✗ $test_name: $message${NC}"
        ((FAILED_TESTS++))
    elif [[ "$status" == "WARN" ]]; then
        echo -e "${YELLOW}⚠ $test_name: $message${NC}"
    else
        echo -e "${BLUE}ℹ $test_name: $message${NC}"
    fi
}

echo -e "${CYAN}Docker and Container Health Check Suite${NC}"
echo -e "${CYAN}=====================================${NC}"
echo ""

# Test 1: Docker availability
echo -e "${BLUE}=== Docker Environment Tests ===${NC}"

if command -v docker &> /dev/null; then
    test_result "DOCKER_INSTALLED" "PASS" "Docker is installed"
    
    # Check Docker daemon
    if docker info &> /dev/null; then
        test_result "DOCKER_DAEMON" "PASS" "Docker daemon is running"
        
        # Get Docker version
        DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
        test_result "DOCKER_VERSION" "PASS" "Docker version: $DOCKER_VERSION"
        
        # Check Docker system resources
        DOCKER_INFO=$(docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}" 2>/dev/null || echo "")
        if [[ -n "$DOCKER_INFO" ]]; then
            test_result "DOCKER_RESOURCES" "PASS" "Docker system resources accessible"
        else
            test_result "DOCKER_RESOURCES" "WARN" "Cannot access Docker system resources"
        fi
    else
        test_result "DOCKER_DAEMON" "FAIL" "Docker daemon is not running"
    fi
else
    test_result "DOCKER_INSTALLED" "FAIL" "Docker is not installed"
fi

# Test 2: Docker Compose
if command -v docker-compose &> /dev/null; then
    test_result "DOCKER_COMPOSE" "PASS" "Docker Compose is installed"
    
    COMPOSE_VERSION=$(docker-compose version --short 2>/dev/null || echo "unknown")
    test_result "DOCKER_COMPOSE_VERSION" "PASS" "Docker Compose version: $COMPOSE_VERSION"
else
    test_result "DOCKER_COMPOSE" "WARN" "Docker Compose not installed"
fi

echo ""

# Test 3: Secrets-related containers
echo -e "${BLUE}=== Container Detection Tests ===${NC}"

if command -v docker &> /dev/null && docker info &> /dev/null; then
    # Look for running containers
    RUNNING_CONTAINERS=$(docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" 2>/dev/null || echo "")
    if [[ -n "$RUNNING_CONTAINERS" ]]; then
        test_result "CONTAINERS_RUNNING" "PASS" "Found running containers"
        
        # Look for secrets-related containers
        SECRETS_CONTAINERS=$(docker ps --format "{{.Names}}" | grep -iE "(vault|secret|kms|hsm)" 2>/dev/null || echo "")
        if [[ -n "$SECRETS_CONTAINERS" ]]; then
            test_result "SECRETS_CONTAINERS" "PASS" "Found secrets-related containers: $SECRETS_CONTAINERS"
            
            # Test health of secrets containers
            for container in $SECRETS_CONTAINERS; do
                HEALTH=$(docker inspect "$container" --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' 2>/dev/null || echo "unknown")
                STATUS=$(docker inspect "$container" --format='{{.State.Status}}' 2>/dev/null || echo "unknown")
                
                if [[ "$STATUS" == "running" ]]; then
                    test_result "CONTAINER_${container}_STATUS" "PASS" "Container is running"
                    
                    if [[ "$HEALTH" == "healthy" ]]; then
                        test_result "CONTAINER_${container}_HEALTH" "PASS" "Container is healthy"
                    elif [[ "$HEALTH" == "no-health" ]]; then
                        test_result "CONTAINER_${container}_HEALTH" "INFO" "No health check configured"
                    else
                        test_result "CONTAINER_${container}_HEALTH" "WARN" "Health status: $HEALTH"
                    fi
                else
                    test_result "CONTAINER_${container}_STATUS" "FAIL" "Container not running: $STATUS"
                fi
            done
        else
            test_result "SECRETS_CONTAINERS" "INFO" "No secrets-related containers found"
        fi
        
        # Look for candlefish containers
        CANDLEFISH_CONTAINERS=$(docker ps --format "{{.Names}}" | grep -i candlefish 2>/dev/null || echo "")
        if [[ -n "$CANDLEFISH_CONTAINERS" ]]; then
            test_result "CANDLEFISH_CONTAINERS" "PASS" "Found Candlefish containers: $CANDLEFISH_CONTAINERS"
        else
            test_result "CANDLEFISH_CONTAINERS" "INFO" "No Candlefish containers found"
        fi
    else
        test_result "CONTAINERS_RUNNING" "INFO" "No running containers found"
    fi
    
    # Check for stopped containers that might be relevant
    STOPPED_CONTAINERS=$(docker ps -a --filter "status=exited" --format "{{.Names}}" | grep -iE "(vault|secret|candlefish)" 2>/dev/null || echo "")
    if [[ -n "$STOPPED_CONTAINERS" ]]; then
        test_result "STOPPED_CONTAINERS" "WARN" "Found stopped secrets containers: $STOPPED_CONTAINERS"
    fi
else
    test_result "CONTAINER_CHECK" "FAIL" "Cannot check containers - Docker not available"
fi

echo ""

# Test 4: Docker Compose files
echo -e "${BLUE}=== Docker Compose Configuration Tests ===${NC}"

COMPOSE_FILES=("docker-compose.yml" "docker-compose.local.yml" "docker-compose.production.yml")
for compose_file in "${COMPOSE_FILES[@]}"; do
    COMPOSE_PATH="$BASE_DIR/$compose_file"
    if [[ -f "$COMPOSE_PATH" ]]; then
        test_result "COMPOSE_FILE_${compose_file}" "PASS" "Found $compose_file"
        
        # Validate compose file
        if command -v docker-compose &> /dev/null; then
            if docker-compose -f "$COMPOSE_PATH" config &> /dev/null; then
                test_result "COMPOSE_VALID_${compose_file}" "PASS" "Docker Compose file is valid"
                
                # Check for secrets services
                SERVICES=$(docker-compose -f "$COMPOSE_PATH" config --services 2>/dev/null || echo "")
                if echo "$SERVICES" | grep -qiE "(vault|secret)"; then
                    test_result "COMPOSE_SECRETS_${compose_file}" "PASS" "Contains secrets services"
                else
                    test_result "COMPOSE_SECRETS_${compose_file}" "INFO" "No secrets services found"
                fi
                
                # Check for environment files
                if grep -q "env_file\|\.env" "$COMPOSE_PATH" 2>/dev/null; then
                    test_result "COMPOSE_ENV_${compose_file}" "PASS" "Environment configuration present"
                else
                    test_result "COMPOSE_ENV_${compose_file}" "INFO" "No environment files referenced"
                fi
                
                # Check for volumes (important for persistence)
                if grep -q "volumes:" "$COMPOSE_PATH" 2>/dev/null; then
                    test_result "COMPOSE_VOLUMES_${compose_file}" "PASS" "Volume configuration present"
                else
                    test_result "COMPOSE_VOLUMES_${compose_file}" "WARN" "No volume configuration found"
                fi
                
            else
                test_result "COMPOSE_VALID_${compose_file}" "FAIL" "Docker Compose file has syntax errors"
            fi
        else
            test_result "COMPOSE_VALIDATION_${compose_file}" "WARN" "Cannot validate (docker-compose not available)"
        fi
    else
        test_result "COMPOSE_FILE_${compose_file}" "INFO" "$compose_file not found"
    fi
done

echo ""

# Test 5: Kubernetes resources
echo -e "${BLUE}=== Kubernetes Resources Tests ===${NC}"

if command -v kubectl &> /dev/null; then
    test_result "KUBECTL_AVAILABLE" "PASS" "kubectl is installed"
    
    # Check cluster connectivity
    if kubectl cluster-info &> /dev/null; then
        test_result "KUBERNETES_CLUSTER" "PASS" "Kubernetes cluster is accessible"
        
        CONTEXT=$(kubectl config current-context 2>/dev/null || echo "unknown")
        test_result "KUBERNETES_CONTEXT" "PASS" "Current context: $CONTEXT"
        
        # Look for secrets
        SECRETS=$(kubectl get secrets --all-namespaces -o name 2>/dev/null | grep -i candlefish || echo "")
        if [[ -n "$SECRETS" ]]; then
            test_result "KUBERNETES_SECRETS" "PASS" "Found Kubernetes secrets"
            
            # Count secrets
            SECRET_COUNT=$(echo "$SECRETS" | wc -l)
            test_result "KUBERNETES_SECRET_COUNT" "PASS" "Found $SECRET_COUNT Candlefish secrets"
        else
            test_result "KUBERNETES_SECRETS" "INFO" "No Candlefish secrets found in Kubernetes"
        fi
        
        # Look for sealed secrets
        if kubectl get crd sealedsecrets.bitnami.com &> /dev/null; then
            test_result "SEALED_SECRETS_CRD" "PASS" "Sealed Secrets CRD is installed"
            
            SEALED_SECRETS=$(kubectl get sealedsecrets --all-namespaces 2>/dev/null | wc -l)
            if [[ $SEALED_SECRETS -gt 1 ]]; then  # More than header line
                test_result "SEALED_SECRETS_COUNT" "PASS" "Found $((SEALED_SECRETS-1)) sealed secrets"
            else
                test_result "SEALED_SECRETS_COUNT" "INFO" "No sealed secrets found"
            fi
        else
            test_result "SEALED_SECRETS_CRD" "INFO" "Sealed Secrets not installed"
        fi
        
        # Look for vault pods
        VAULT_PODS=$(kubectl get pods --all-namespaces -o name 2>/dev/null | grep -i vault || echo "")
        if [[ -n "$VAULT_PODS" ]]; then
            test_result "VAULT_PODS" "PASS" "Found Vault pods in Kubernetes"
            
            # Check vault pod status
            for pod in $VAULT_PODS; do
                POD_NAME=$(echo "$pod" | cut -d'/' -f2)
                STATUS=$(kubectl get "$pod" -o jsonpath='{.status.phase}' 2>/dev/null || echo "unknown")
                if [[ "$STATUS" == "Running" ]]; then
                    test_result "VAULT_POD_${POD_NAME}_STATUS" "PASS" "Vault pod is running"
                else
                    test_result "VAULT_POD_${POD_NAME}_STATUS" "FAIL" "Vault pod status: $STATUS"
                fi
            done
        else
            test_result "VAULT_PODS" "INFO" "No Vault pods found in Kubernetes"
        fi
        
        # Check for config maps
        CONFIGMAPS=$(kubectl get configmaps --all-namespaces -o name 2>/dev/null | grep -i candlefish || echo "")
        if [[ -n "$CONFIGMAPS" ]]; then
            test_result "KUBERNETES_CONFIGMAPS" "PASS" "Found Candlefish ConfigMaps"
        else
            test_result "KUBERNETES_CONFIGMAPS" "INFO" "No Candlefish ConfigMaps found"
        fi
        
    else
        test_result "KUBERNETES_CLUSTER" "INFO" "Kubernetes cluster not accessible"
    fi
else
    test_result "KUBECTL_AVAILABLE" "INFO" "kubectl not installed"
fi

echo ""

# Test 6: Container networking
echo -e "${BLUE}=== Container Networking Tests ===${NC}"

if command -v docker &> /dev/null && docker info &> /dev/null; then
    # Check Docker networks
    NETWORKS=$(docker network ls --format "{{.Name}}" 2>/dev/null || echo "")
    if [[ -n "$NETWORKS" ]]; then
        test_result "DOCKER_NETWORKS" "PASS" "Docker networks available: $(echo "$NETWORKS" | tr '\n' ' ')"
        
        # Look for custom networks
        CUSTOM_NETWORKS=$(docker network ls --filter "driver=bridge" --format "{{.Name}}" | grep -v bridge || echo "")
        if [[ -n "$CUSTOM_NETWORKS" ]]; then
            test_result "CUSTOM_NETWORKS" "PASS" "Custom networks found: $CUSTOM_NETWORKS"
        else
            test_result "CUSTOM_NETWORKS" "INFO" "No custom networks found"
        fi
    else
        test_result "DOCKER_NETWORKS" "FAIL" "Cannot access Docker networks"
    fi
    
    # Test port accessibility for common secrets services
    COMMON_PORTS=("8200:vault" "5432:postgresql" "6379:redis" "27017:mongodb")
    for port_service in "${COMMON_PORTS[@]}"; do
        IFS=':' read -r port service <<< "$port_service"
        if nc -z localhost "$port" 2>/dev/null; then
            test_result "PORT_${port}_${service}" "PASS" "$service listening on port $port"
        else
            test_result "PORT_${port}_${service}" "INFO" "$service not listening on port $port"
        fi
    done
fi

echo ""

# Summary
echo -e "${CYAN}=== Container Health Summary ===${NC}"
echo -e "Tests Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Tests Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [[ $FAILED_TESTS -eq 0 ]]; then
    echo -e "${GREEN}✓ All container health checks passed!${NC}"
    exit 0
elif [[ $FAILED_TESTS -le 2 ]]; then
    echo -e "${YELLOW}⚠ Minor issues found in container setup.${NC}"
    exit 1
else
    echo -e "${RED}✗ Significant container health issues found.${NC}"
    echo ""
    echo "Common troubleshooting steps:"
    echo "1. Ensure Docker daemon is running: sudo systemctl start docker"
    echo "2. Check container logs: docker logs <container-name>"
    echo "3. Verify compose files: docker-compose config"
    echo "4. Check Kubernetes cluster: kubectl cluster-info"
    exit 2
fi