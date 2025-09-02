#!/bin/bash

# CLOS-Compliant Startup for 5470 S Highline Circle Inventory
# Uses proper port allocations: Frontend 3050, Backend 4050

set -e

echo "🏠 Starting 5470 S Highline Circle Inventory (CLOS-Compliant)"
echo "============================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kill any existing processes on our ports
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
lsof -ti:3050 | xargs kill -9 2>/dev/null || true
lsof -ti:4050 | xargs kill -9 2>/dev/null || true

# Backend setup
cd /Users/patricksmith/candlefish-ai/5470_S_Highline_Circle/backend

# Create .env with CLOS ports
cat > .env << EOF
PORT=4050
DATABASE_URL=sqlite://./inventory.db
ENABLE_VALUATION_SYSTEM=false
ENVIRONMENT=development
EOF

# Build and start backend
echo -e "${YELLOW}Starting backend on port 4050...${NC}"
go run main.go &
BACKEND_PID=$!

# Wait for backend
sleep 3

# Frontend setup
cd ../frontend

# Update environment for CLOS ports
cat > .env << EOF
VITE_PORT=3050
VITE_API_URL=http://localhost:4050/api/v1
VITE_WS_URL=ws://localhost:4050/ws
EOF

# Start frontend on CLOS port
echo -e "${YELLOW}Starting frontend on port 3050...${NC}"
PORT=3050 npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}✅ Inventory System Running (CLOS-Compliant)${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "📍 Access Points:"
echo "   • Frontend: http://localhost:3050"
echo "   • Backend API: http://localhost:4050"
echo "   • CLOS Dashboard: http://localhost:3500"
echo ""
echo "The system is now running on CLOS-compliant ports!"
echo "Press Ctrl+C to stop all services"
echo ""

# Trap and wait
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait