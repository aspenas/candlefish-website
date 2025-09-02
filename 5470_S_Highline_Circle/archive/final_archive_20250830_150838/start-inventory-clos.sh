#!/bin/bash

# CLOS-Integrated Start Script for 5470 S Highline Circle Inventory System
# This script starts the inventory system with proper CLOS port allocations

set -e

echo "🏠 Starting 5470 S Highline Circle Inventory System (CLOS Mode)"
echo "================================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# CLOS Port Allocations
FRONTEND_PORT=3050  # Candlefish Frontend range (3000-3099)
API_PORT=4050       # API range (4000-4999)

# Check if CLOS integration script exists
CLOS_SCRIPT="/Users/patricksmith/candlefish-ai/5470_S_Highline_Circle/clos-integration.sh"
if [ -f "$CLOS_SCRIPT" ]; then
    echo -e "${GREEN}Using CLOS integration for proper port management${NC}"
    exec "$CLOS_SCRIPT" start
    exit 0
fi

# Fallback to manual CLOS-compliant startup
echo -e "${YELLOW}CLOS integration script not found, using manual startup with CLOS ports${NC}"

# Change to backend directory
cd /Users/patricksmith/candlefish-ai/5470_S_Highline_Circle

# Stop any existing services on CLOS ports
echo -e "${YELLOW}Checking for port conflicts...${NC}"
for port in $FRONTEND_PORT $API_PORT; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Stopping process on port $port...${NC}"
        kill -9 $(lsof -ti:$port) 2>/dev/null || true
    fi
done

# Create .env.clos if it doesn't exist
if [ ! -f .env.clos ]; then
    echo -e "${YELLOW}Creating CLOS environment configuration...${NC}"
    cat > .env.clos << EOF
# CLOS Port Configuration
VITE_PORT=$FRONTEND_PORT
API_PORT=$API_PORT
VITE_API_URL=http://localhost:$API_PORT
DATABASE_URL=sqlite://./data/inventory.db
ENABLE_VALUATION_SYSTEM=false
ENVIRONMENT=development
NODE_ENV=development
EOF
fi

# Load CLOS environment
export $(cat .env.clos | grep -v '^#' | xargs)

# Start the backend
echo -e "${YELLOW}Starting backend on CLOS port $API_PORT...${NC}"
if [ -f main.go ]; then
    PORT=$API_PORT go run main.go &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
else
    echo -e "${RED}Backend not found. Please ensure main.go exists.${NC}"
    exit 1
fi

# Wait for backend to start
echo -e "${YELLOW}Waiting for backend to start...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:$API_PORT/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is running on port $API_PORT!${NC}"
        break
    fi
    sleep 1
done

# Change to frontend directory
cd frontend

# Install dependencies if needed
if [ ! -d node_modules ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

# Start the frontend with CLOS port
echo -e "${GREEN}Starting frontend on CLOS port $FRONTEND_PORT...${NC}"
VITE_PORT=$FRONTEND_PORT npm run dev &
FRONTEND_PID=$!

# Wait a moment for services to stabilize
sleep 3

# Register with CLOS if available
CLOS_API="http://localhost:3500/api"
if curl -s "$CLOS_API/health" > /dev/null 2>&1; then
    echo -e "${BLUE}Registering services with CLOS dashboard...${NC}"
    
    # Register frontend
    curl -X POST "$CLOS_API/services" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"highline-inventory-frontend\",
            \"port\": $FRONTEND_PORT,
            \"project\": \"5470_S_Highline_Circle\",
            \"group\": \"candlefish-frontend\",
            \"status\": \"running\"
        }" 2>/dev/null || true
    
    # Register API
    curl -X POST "$CLOS_API/services" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"highline-inventory-api\",
            \"port\": $API_PORT,
            \"project\": \"5470_S_Highline_Circle\",
            \"group\": \"api\",
            \"status\": \"running\"
        }" 2>/dev/null || true
    
    echo -e "${GREEN}✓ Services registered with CLOS${NC}"
fi

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}🎉 Inventory System Started with CLOS Integration!${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo "📍 CLOS-Managed Access Points:"
echo "   • Frontend: http://localhost:$FRONTEND_PORT (CLOS Port)"
echo "   • Backend API: http://localhost:$API_PORT (CLOS Port)"
echo "   • Health Check: http://localhost:$API_PORT/health"
echo ""
echo "🎛️ CLOS Management:"
echo "   • Dashboard: http://localhost:3500"
echo "   • Port Range: Frontend 3000-3099, API 4000-4999"
echo "   • Service Group: candlefish-frontend"
echo ""
echo "📱 Features:"
echo "   • Dashboard - Overview of all inventory"
echo "   • Inventory - Browse and manage items"
echo "   • Photos - Upload and manage photos"
echo "   • Analytics - View insights and reports"
echo "   • Settings - Configure preferences"
echo ""
echo "⚠️  Note: Using CLOS ports to avoid conflicts"
echo "   Frontend: $FRONTEND_PORT (instead of 3000)"
echo "   API: $API_PORT (instead of 8080)"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for interrupt
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait