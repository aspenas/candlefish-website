#!/bin/bash

# CLOS Integration Script for 5470 S Highline Circle Inventory System
# This script registers and manages the inventory system with CLOS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# CLOS Configuration
CLOS_DASHBOARD_URL="http://localhost:3500"
CLOS_API_URL="http://localhost:3500/api"
CLOS_BIN_PATH="/Users/patricksmith/candlefish-ai/clos/clos"

# Service Configuration
SERVICE_NAME="highline-inventory"
PROJECT_NAME="5470_S_Highline_Circle"
FRONTEND_PORT=3050
API_PORT=4050
REDIS_PORT=6350

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
CLOS_CONFIG_FILE="$PROJECT_ROOT/.env.clos"

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to stop running services
stop_services() {
    echo -e "${YELLOW}Stopping existing inventory services...${NC}"
    
    # Stop any processes on our CLOS ports
    for port in $FRONTEND_PORT $API_PORT $REDIS_PORT; do
        if check_port $port; then
            echo -e "${YELLOW}Stopping service on port $port...${NC}"
            pid=$(lsof -ti:$port)
            if [ ! -z "$pid" ]; then
                kill -9 $pid 2>/dev/null || true
            fi
        fi
    done
    
    # Kill any existing inventory processes
    pkill -f "highline-inventory" 2>/dev/null || true
    pkill -f "vite.*3050" 2>/dev/null || true
    pkill -f "main.*4050" 2>/dev/null || true
    
    echo -e "${GREEN}Services stopped${NC}"
}

# Function to register with CLOS
register_with_clos() {
    echo -e "${BLUE}Registering services with CLOS...${NC}"
    
    # Check if CLOS is running
    if ! curl -s "$CLOS_DASHBOARD_URL" > /dev/null 2>&1; then
        echo -e "${YELLOW}CLOS dashboard not running. Starting CLOS...${NC}"
        if [ -f "$CLOS_BIN_PATH" ]; then
            cd "$(dirname "$CLOS_BIN_PATH")"
            ./clos dashboard &
            sleep 3
        else
            echo -e "${RED}CLOS binary not found at $CLOS_BIN_PATH${NC}"
            echo -e "${YELLOW}Please install CLOS first:${NC}"
            echo "  cd /Users/patricksmith/candlefish-ai/clos"
            echo "  make build"
            echo "  ./clos init"
            return 1
        fi
    fi
    
    # Register services via API
    echo -e "${BLUE}Registering highline-inventory-frontend on port $FRONTEND_PORT${NC}"
    curl -X POST "$CLOS_API_URL/services" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"highline-inventory-frontend\",
            \"port\": $FRONTEND_PORT,
            \"project\": \"$PROJECT_NAME\",
            \"group\": \"candlefish-frontend\",
            \"type\": \"frontend\",
            \"status\": \"starting\",
            \"health_endpoint\": \"http://localhost:$FRONTEND_PORT/health\"
        }" 2>/dev/null || true
    
    echo -e "${BLUE}Registering highline-inventory-api on port $API_PORT${NC}"
    curl -X POST "$CLOS_API_URL/services" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"highline-inventory-api\",
            \"port\": $API_PORT,
            \"project\": \"$PROJECT_NAME\",
            \"group\": \"api\",
            \"type\": \"backend\",
            \"status\": \"starting\",
            \"health_endpoint\": \"http://localhost:$API_PORT/health\"
        }" 2>/dev/null || true
    
    echo -e "${GREEN}Services registered with CLOS${NC}"
}

# Function to start services with CLOS configuration
start_with_clos() {
    echo -e "${BLUE}Starting inventory system with CLOS configuration...${NC}"
    
    # Load CLOS environment
    if [ -f "$CLOS_CONFIG_FILE" ]; then
        export $(cat "$CLOS_CONFIG_FILE" | grep -v '^#' | xargs)
    fi
    
    # Start backend API
    echo -e "${BLUE}Starting backend API on port $API_PORT...${NC}"
    cd "$PROJECT_ROOT"
    PORT=$API_PORT go run main.go &
    API_PID=$!
    
    # Wait for API to start
    sleep 3
    
    # Start frontend
    echo -e "${BLUE}Starting frontend on port $FRONTEND_PORT...${NC}"
    cd "$FRONTEND_DIR"
    VITE_PORT=$FRONTEND_PORT VITE_API_URL=http://localhost:$API_PORT npm run dev &
    FRONTEND_PID=$!
    
    # Update service status in CLOS
    sleep 5
    curl -X PATCH "$CLOS_API_URL/services/highline-inventory-frontend" \
        -H "Content-Type: application/json" \
        -d '{"status": "running"}' 2>/dev/null || true
    
    curl -X PATCH "$CLOS_API_URL/services/highline-inventory-api" \
        -H "Content-Type: application/json" \
        -d '{"status": "running"}' 2>/dev/null || true
    
    echo -e "${GREEN}✅ Inventory system started with CLOS integration${NC}"
    echo -e "${GREEN}Frontend: http://localhost:$FRONTEND_PORT${NC}"
    echo -e "${GREEN}API: http://localhost:$API_PORT${NC}"
    echo -e "${GREEN}CLOS Dashboard: $CLOS_DASHBOARD_URL${NC}"
}

# Function to start with Docker Compose
start_docker() {
    echo -e "${BLUE}Starting inventory system with Docker Compose...${NC}"
    
    cd /Users/patricksmith/candlefish-ai/clos
    docker-compose -f deployment/services/highline-inventory.yml up -d
    
    echo -e "${GREEN}✅ Inventory system started with Docker${NC}"
    echo -e "${GREEN}Frontend: http://localhost:$FRONTEND_PORT${NC}"
    echo -e "${GREEN}API: http://localhost:$API_PORT${NC}"
}

# Function to check service health
check_health() {
    echo -e "${BLUE}Checking service health...${NC}"
    
    # Check frontend
    if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is healthy${NC}"
    else
        echo -e "${RED}❌ Frontend is not responding${NC}"
    fi
    
    # Check API
    if curl -s "http://localhost:$API_PORT/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API is healthy${NC}"
    else
        echo -e "${RED}❌ API is not responding${NC}"
    fi
    
    # Check CLOS registration
    if curl -s "$CLOS_API_URL/services" | grep -q "highline-inventory"; then
        echo -e "${GREEN}✅ Services registered in CLOS${NC}"
    else
        echo -e "${YELLOW}⚠️ Services not found in CLOS registry${NC}"
    fi
}

# Function to show status
show_status() {
    echo -e "${BLUE}=== CLOS Integration Status ===${NC}"
    echo -e "${BLUE}Service: $SERVICE_NAME${NC}"
    echo -e "${BLUE}Project: $PROJECT_NAME${NC}"
    echo -e "${BLUE}Ports:${NC}"
    echo -e "  Frontend: $FRONTEND_PORT (CLOS range: 3000-3099)"
    echo -e "  API: $API_PORT (CLOS range: 4000-4999)"
    echo -e "  Redis: $REDIS_PORT"
    echo ""
    check_health
}

# Main script logic
case "${1:-}" in
    start)
        stop_services
        register_with_clos
        start_with_clos
        ;;
    docker)
        stop_services
        register_with_clos
        start_docker
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        register_with_clos
        start_with_clos
        ;;
    status)
        show_status
        ;;
    register)
        register_with_clos
        ;;
    health)
        check_health
        ;;
    *)
        echo "CLOS Integration Script for Highline Inventory System"
        echo ""
        echo "Usage: $0 {start|docker|stop|restart|status|register|health}"
        echo ""
        echo "Commands:"
        echo "  start    - Start services locally with CLOS configuration"
        echo "  docker   - Start services using Docker Compose"
        echo "  stop     - Stop all inventory services"
        echo "  restart  - Restart services with CLOS"
        echo "  status   - Show current status and health"
        echo "  register - Register services with CLOS only"
        echo "  health   - Check service health"
        echo ""
        echo "CLOS Port Allocations:"
        echo "  Frontend: 3050 (Candlefish Frontend range: 3000-3099)"
        echo "  API: 4050 (API range: 4000-4999)"
        echo "  Redis: 6350"
        exit 1
        ;;
esac