#!/bin/bash

# CLOS Real-time Monitoring Dashboard
# Provides continuous monitoring of CLOS services

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
CLOS_ROOT="/Users/patricksmith/candlefish-ai/clos"
REFRESH_INTERVAL=5  # seconds

# Clear screen and move cursor to top
clear_screen() {
    printf '\033[2J\033[H'
}

# Get container status
get_container_status() {
    local container=$1
    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        echo "${GREEN}●${NC} Running"
    else
        echo "${RED}●${NC} Stopped"
    fi
}

# Get container CPU usage
get_container_cpu() {
    local container=$1
    docker stats --no-stream --format "{{.CPUPerc}}" "$container" 2>/dev/null || echo "N/A"
}

# Get container memory usage
get_container_memory() {
    local container=$1
    docker stats --no-stream --format "{{.MemUsage}}" "$container" 2>/dev/null || echo "N/A"
}

# Check port availability
check_port() {
    local port=$1
    if lsof -i ":$port" >/dev/null 2>&1; then
        echo "${GREEN}In Use${NC}"
    else
        echo "${YELLOW}Free${NC}"
    fi
}

# Get service health
get_service_health() {
    local service=$1
    local port=$2
    local endpoint=${3:-/}
    
    if curl -sf "http://localhost:${port}${endpoint}" >/dev/null 2>&1; then
        echo "${GREEN}Healthy${NC}"
    else
        echo "${RED}Unhealthy${NC}"
    fi
}

# Main monitoring loop
monitor_loop() {
    while true; do
        clear_screen
        
        # Header
        echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${CYAN}║${NC}${BOLD}              CLOS - Candlefish Localhost Orchestration System         ${NC}${CYAN}║${NC}"
        echo -e "${CYAN}╠════════════════════════════════════════════════════════════════════════╣${NC}"
        echo -e "${CYAN}║${NC} $(date '+%Y-%m-%d %H:%M:%S') | Refresh: ${REFRESH_INTERVAL}s | Press Ctrl+C to exit              ${CYAN}║${NC}"
        echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════════╝${NC}"
        
        # Core Services
        echo -e "\n${BLUE}${BOLD}Core Infrastructure Services:${NC}"
        echo -e "┌─────────────────┬──────────────┬──────────┬────────────┬──────────────┐"
        echo -e "│ Service         │ Status       │ CPU      │ Memory     │ Health       │"
        echo -e "├─────────────────┼──────────────┼──────────┼────────────┼──────────────┤"
        
        # PostgreSQL
        printf "│ %-15s │ %-12s │ %-8s │ %-10s │ %-12s │\n" \
            "PostgreSQL" \
            "$(get_container_status clos-postgres)" \
            "$(get_container_cpu clos-postgres)" \
            "$(get_container_memory clos-postgres | awk '{print $1}')" \
            "$(get_service_health postgres 5432)"
        
        # Redis
        printf "│ %-15s │ %-12s │ %-8s │ %-10s │ %-12s │\n" \
            "Redis" \
            "$(get_container_status clos-redis)" \
            "$(get_container_cpu clos-redis)" \
            "$(get_container_memory clos-redis | awk '{print $1}')" \
            "$(get_service_health redis 6379)"
        
        # Caddy
        printf "│ %-15s │ %-12s │ %-8s │ %-10s │ %-12s │\n" \
            "Caddy" \
            "$(get_container_status clos-caddy)" \
            "$(get_container_cpu clos-caddy)" \
            "$(get_container_memory clos-caddy | awk '{print $1}')" \
            "$(get_service_health caddy 2019 /config/)"
        
        echo -e "└─────────────────┴──────────────┴──────────┴────────────┴──────────────┘"
        
        # Port Allocations
        echo -e "\n${BLUE}${BOLD}Port Allocations:${NC}"
        echo -e "┌──────────────────────────┬──────┬──────────┐"
        echo -e "│ Service                  │ Port │ Status   │"
        echo -e "├──────────────────────────┼──────┼──────────┤"
        
        declare -A port_map=(
            ["PostgreSQL"]=5432
            ["Redis"]=6379
            ["Caddy HTTP"]=80
            ["Caddy HTTPS"]=443
            ["Caddy Admin"]=2019
            ["Candlefish Web"]=3000
            ["Security Dashboard"]=3100
            ["PKB UI"]=8501
            ["Candlefish API"]=4000
            ["Security API"]=4100
        )
        
        for service in "${!port_map[@]}"; do
            printf "│ %-24s │ %4d │ %-8s │\n" \
                "$service" \
                "${port_map[$service]}" \
                "$(check_port ${port_map[$service]})"
        done
        
        echo -e "└──────────────────────────┴──────┴──────────┘"
        
        # Local Domains
        echo -e "\n${BLUE}${BOLD}Local Domain Routing:${NC}"
        echo -e "┌─────────────────────────┬─────────────────────────┬──────────┐"
        echo -e "│ Domain                  │ Routes To               │ Status   │"
        echo -e "├─────────────────────────┼─────────────────────────┼──────────┤"
        
        declare -A domain_map=(
            ["security.local"]="localhost:3100"
            ["pkb.local"]="localhost:8501"
            ["candlefish.local"]="localhost:3000"
            ["grafana.local"]="localhost:3001"
            ["prometheus.local"]="localhost:9090"
        )
        
        for domain in "${!domain_map[@]}"; do
            # Check if domain resolves
            if grep -q "$domain" /etc/hosts 2>/dev/null; then
                status="${GREEN}Active${NC}"
            else
                status="${YELLOW}Not in hosts${NC}"
            fi
            printf "│ %-23s │ %-23s │ %-8s │\n" \
                "$domain" \
                "${domain_map[$domain]}" \
                "$status"
        done
        
        echo -e "└─────────────────────────┴─────────────────────────┴──────────┘"
        
        # System Resources
        echo -e "\n${BLUE}${BOLD}System Resources:${NC}"
        echo -e "┌─────────────────────────────────────────────────────────────┐"
        
        # Docker stats
        DOCKER_INFO=$(docker system df --format "table {{.Type}}\t{{.Total}}\t{{.Active}}\t{{.Size}}")
        echo "$DOCKER_INFO" | while IFS= read -r line; do
            printf "│ %-59s │\n" "$line"
        done
        
        echo -e "└─────────────────────────────────────────────────────────────┘"
        
        # Quick Commands
        echo -e "\n${MAGENTA}${BOLD}Quick Commands:${NC}"
        echo -e "  ${CYAN}clos status${NC}     - Show service status"
        echo -e "  ${CYAN}clos up all${NC}     - Start all services"
        echo -e "  ${CYAN}clos logs -f${NC}    - Follow logs"
        echo -e "  ${CYAN}clos health${NC}     - Check health"
        
        # Sleep before refresh
        sleep $REFRESH_INTERVAL
    done
}

# Trap Ctrl+C to clean exit
trap 'echo -e "\n${GREEN}Monitoring stopped.${NC}"; exit 0' INT

# Check dependencies
if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
    exit 1
fi

# Start monitoring
echo -e "${GREEN}Starting CLOS monitoring dashboard...${NC}"
sleep 1
monitor_loop