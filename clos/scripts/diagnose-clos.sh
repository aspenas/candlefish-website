#!/bin/bash

# CLOS Diagnostic Script
# Deep diagnostic analysis of CLOS system issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}     CLOS System Diagnostics${NC}"
echo -e "${CYAN}======================================${NC}"

CLOS_ROOT="/Users/patricksmith/candlefish-ai/clos"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE="$CLOS_ROOT/diagnostics_$TIMESTAMP.txt"

# Redirect output to both console and file
exec > >(tee -a "$REPORT_FILE")
exec 2>&1

echo -e "\n${BLUE}System Information:${NC}"
echo "Date: $(date)"
echo "Hostname: $(hostname)"
echo "OS: $(uname -a)"
echo "Docker Version: $(docker --version 2>/dev/null || echo 'Docker not found')"
echo "Docker Compose Version: $(docker-compose --version 2>/dev/null || echo 'Docker Compose not found')"

echo -e "\n${BLUE}CLOS Installation Check:${NC}"
if [ -f "$CLOS_ROOT/clos" ]; then
    echo -e "CLOS binary: ${GREEN}Found${NC}"
    echo "Location: $CLOS_ROOT/clos"
    echo "Permissions: $(ls -la $CLOS_ROOT/clos)"
else
    echo -e "CLOS binary: ${RED}Not found${NC}"
fi

echo -e "\n${BLUE}Docker Status:${NC}"
if docker info >/dev/null 2>&1; then
    echo -e "Docker daemon: ${GREEN}Running${NC}"
    echo "Containers: $(docker ps -q | wc -l) running"
    echo "Images: $(docker images -q | wc -l) total"
    echo "Networks: $(docker network ls -q | wc -l) total"
else
    echo -e "Docker daemon: ${RED}Not running${NC}"
    echo "Please start Docker Desktop or Docker daemon"
fi

echo -e "\n${BLUE}CLOS Containers Status:${NC}"
for container in clos-postgres clos-redis clos-caddy; do
    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        echo -e "$container: ${GREEN}Running${NC}"
        echo "  Status: $(docker ps --filter "name=${container}" --format "{{.Status}}")"
        echo "  Ports: $(docker ps --filter "name=${container}" --format "{{.Ports}}")"
    else
        echo -e "$container: ${RED}Not running${NC}"
        # Check if container exists but stopped
        if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
            echo "  Container exists but is stopped"
            echo "  Last status: $(docker ps -a --filter "name=${container}" --format "{{.Status}}")"
        fi
    fi
done

echo -e "\n${BLUE}Network Configuration:${NC}"
if docker network ls | grep -q "clos-network"; then
    echo -e "CLOS network: ${GREEN}Exists${NC}"
    echo "Network details:"
    docker network inspect clos-network --format '  Driver: {{.Driver}}'
    docker network inspect clos-network --format '  Subnet: {{range .IPAM.Config}}{{.Subnet}}{{end}}'
else
    echo -e "CLOS network: ${RED}Not found${NC}"
fi

echo -e "\n${BLUE}Port Availability Check:${NC}"
PORTS=(80 443 2019 3000 3100 3200 4000 4100 5432 6379 8080 8501 8787 9090)
for port in "${PORTS[@]}"; do
    if lsof -i ":$port" >/dev/null 2>&1; then
        process=$(lsof -i ":$port" | grep LISTEN | head -1)
        if echo "$process" | grep -q "clos-"; then
            echo -e "Port $port: ${GREEN}Used by CLOS${NC}"
        else
            echo -e "Port $port: ${YELLOW}Used by other process${NC}"
            echo "  Process: $(echo $process | awk '{print $1, $2, $9}')"
        fi
    else
        echo -e "Port $port: ${GREEN}Available${NC}"
    fi
done

echo -e "\n${BLUE}Registry Database Check:${NC}"
if [ -f "$CLOS_ROOT/.clos/registry.db" ]; then
    echo -e "Registry database: ${GREEN}Exists${NC}"
    echo "Size: $(ls -lh $CLOS_ROOT/.clos/registry.db | awk '{print $5}')"
    echo "Modified: $(ls -la $CLOS_ROOT/.clos/registry.db | awk '{print $6, $7, $8}')"
    
    # Check if we can query it
    if command -v sqlite3 >/dev/null 2>&1; then
        echo "Service count: $(sqlite3 $CLOS_ROOT/.clos/registry.db "SELECT COUNT(*) FROM services;" 2>/dev/null || echo "Unable to query")"
    fi
else
    echo -e "Registry database: ${RED}Not found${NC}"
fi

echo -e "\n${BLUE}Configuration Files:${NC}"
CONFIG_FILES=(
    "$CLOS_ROOT/.clos/config.yaml"
    "$CLOS_ROOT/deployment/docker-compose.essential.yml"
    "$CLOS_ROOT/deployment/caddy/Caddyfile.simple"
)

for config in "${CONFIG_FILES[@]}"; do
    if [ -f "$config" ]; then
        echo -e "$(basename $config): ${GREEN}Found${NC}"
    else
        echo -e "$(basename $config): ${RED}Missing${NC}"
    fi
done

echo -e "\n${BLUE}Docker Compose Services:${NC}"
if [ -f "$CLOS_ROOT/deployment/docker-compose.essential.yml" ]; then
    cd "$CLOS_ROOT"
    docker-compose -f deployment/docker-compose.essential.yml ps
fi

echo -e "\n${BLUE}Recent Docker Logs:${NC}"
for container in clos-postgres clos-redis clos-caddy; do
    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        echo -e "\n${CYAN}$container logs (last 10 lines):${NC}"
        docker logs --tail 10 "$container" 2>&1 || echo "Unable to get logs"
    fi
done

echo -e "\n${BLUE}Shell Integration Check:${NC}"
if declare -f clos_status >/dev/null 2>&1; then
    echo -e "Shell functions: ${GREEN}Loaded${NC}"
    echo "Available functions: clos_status, clos_up, clos_down, clos_logs, etc."
else
    echo -e "Shell functions: ${YELLOW}Not loaded${NC}"
    echo "Add 'source $CLOS_ROOT/scripts/shell-integration.sh' to your ~/.zshrc"
fi

echo -e "\n${BLUE}Recommendations:${NC}"
RECOMMENDATIONS=()

if ! docker info >/dev/null 2>&1; then
    RECOMMENDATIONS+=("Start Docker daemon")
fi

if ! docker ps | grep -q "clos-postgres"; then
    RECOMMENDATIONS+=("Start PostgreSQL: docker-compose -f $CLOS_ROOT/deployment/docker-compose.essential.yml up -d postgres")
fi

if ! docker ps | grep -q "clos-redis"; then
    RECOMMENDATIONS+=("Start Redis: docker-compose -f $CLOS_ROOT/deployment/docker-compose.essential.yml up -d redis")
fi

if ! docker ps | grep -q "clos-caddy"; then
    RECOMMENDATIONS+=("Start Caddy: docker-compose -f $CLOS_ROOT/deployment/docker-compose.essential.yml up -d caddy")
fi

if [ ${#RECOMMENDATIONS[@]} -eq 0 ]; then
    echo -e "${GREEN}System appears to be healthy!${NC}"
else
    echo -e "${YELLOW}Issues detected:${NC}"
    for rec in "${RECOMMENDATIONS[@]}"; do
        echo "  - $rec"
    done
fi

echo -e "\n${BLUE}======================================${NC}"
echo -e "${GREEN}Diagnostic report saved to: $REPORT_FILE${NC}"
echo -e "${BLUE}======================================${NC}"