#!/bin/bash

# CLOS Production Orchestration Script
# Starts all services with NANDA autonomous control

set -e

echo "🚀 Starting CLOS Production Environment with NANDA Orchestration"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
export NODE_ENV=production
export POSTGRES_HOST=localhost
export POSTGRES_USER=patricksmith
export POSTGRES_PASSWORD=""
export POSTGRES_DB=clos_db
export REDIS_HOST=localhost
export REDIS_PASSWORD=""
export JWT_SECRET="your-secret-key-change-in-production"
export AUTONOMOUS_MODE=true
export DECISION_THRESHOLD=0.75

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service
wait_for_service() {
    local port=$1
    local name=$2
    local max_attempts=30
    local attempt=0
    
    echo -e "${YELLOW}Waiting for $name on port $port...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if check_port $port; then
            echo -e "${GREEN}✓ $name is ready on port $port${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗ $name failed to start on port $port${NC}"
    return 1
}

# Kill existing services
echo -e "${YELLOW}Stopping existing services...${NC}"
pkill -f "node.*3[0-9]{3}" || true
pkill -f "node.*4[0-9]{3}" || true
pkill -f "node.*5[0-9]{3}" || true
sleep 2

# Ensure PostgreSQL and Redis are running
echo -e "${BLUE}Checking infrastructure services...${NC}"

if ! check_port 5432; then
    echo -e "${YELLOW}PostgreSQL not running, starting...${NC}"
    brew services start postgresql@14 || pg_ctl -D /usr/local/var/postgres start || true
fi

if ! check_port 6379; then
    echo -e "${YELLOW}Redis not running, starting...${NC}"
    brew services start redis || redis-server --daemonize yes || true
fi

wait_for_service 5432 "PostgreSQL"
wait_for_service 6379 "Redis"

# Initialize database if needed
echo -e "${BLUE}Initializing database...${NC}"
if ! psql -h localhost -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1 FROM services LIMIT 1" &>/dev/null; then
    echo "Creating database schema..."
    psql -h localhost -U $POSTGRES_USER -d $POSTGRES_DB < /Users/patricksmith/candlefish-ai/clos/database/init/01-schema.sql
    psql -h localhost -U $POSTGRES_USER -d $POSTGRES_DB < /Users/patricksmith/candlefish-ai/clos/database/seed-active-services-v2.sql
fi

# Start NANDA Orchestrator (Core Decision-Making Agent)
echo -e "${BLUE}Starting NANDA Orchestrator...${NC}"
cd /Users/patricksmith/candlefish-ai/clos/nanda
npm install --silent
NANDA_PORT=5100 npx tsx orchestrator.ts > /tmp/nanda-orchestrator.log 2>&1 &
NANDA_PID=$!
echo "NANDA Orchestrator PID: $NANDA_PID"
wait_for_service 5100 "NANDA Orchestrator"

# Start Authentication Service
echo -e "${BLUE}Starting Authentication Service...${NC}"
cd /Users/patricksmith/candlefish-ai/clos/api-server
npx tsx server-auth.ts > /tmp/clos-auth.log 2>&1 &
AUTH_PID=$!
echo "Auth Service PID: $AUTH_PID"
wait_for_service 3501 "Authentication Service"

# Start CLOS Dashboard
echo -e "${BLUE}Starting CLOS Dashboard...${NC}"
cd /Users/patricksmith/candlefish-ai/clos/web-dashboard
npm run dev > /tmp/clos-dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo "Dashboard PID: $DASHBOARD_PID"
wait_for_service 3500 "CLOS Dashboard"

# Register services with NANDA
echo -e "${BLUE}Registering services with NANDA...${NC}"
sleep 2

# Generate UUIDs for services
AUTH_UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
DASHBOARD_UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')

# Register Auth Service
curl -X POST http://localhost:5100/register \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$AUTH_UUID\",
    \"name\": \"CLOS Authentication\",
    \"type\": \"auth\",
    \"port\": 3501,
    \"status\": \"running\",
    \"health_url\": \"http://localhost:3501/api/health\"
  }" || true

# Register Dashboard
curl -X POST http://localhost:5100/register \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$DASHBOARD_UUID\",
    \"name\": \"CLOS Dashboard\",
    \"type\": \"frontend\",
    \"port\": 3500,
    \"status\": \"running\",
    \"health_url\": \"http://localhost:3500/api/health\"
  }" || true

# Start additional services based on manifest
echo -e "${BLUE}Starting additional services...${NC}"

# Start NANDA API if exists
if [ -d "/Users/patricksmith/candlefish-ai/apps/nanda-api" ]; then
    echo "Starting NANDA API..."
    cd /Users/patricksmith/candlefish-ai/apps/nanda-api
    if [ -f "main.go" ]; then
        go run main.go > /tmp/nanda-api.log 2>&1 &
    elif [ -f "package.json" ]; then
        npm install --silent && npm start > /tmp/nanda-api.log 2>&1 &
    fi
fi

# Start GraphQL Federation if exists
if [ -d "/Users/patricksmith/candlefish-ai/graphql" ]; then
    echo "Starting GraphQL Federation..."
    cd /Users/patricksmith/candlefish-ai/graphql
    if [ -f "package.json" ]; then
        npm install --silent && PORT=4300 npm start > /tmp/graphql.log 2>&1 &
    fi
fi

# Create process management file
cat > /tmp/clos-production.pid << EOF
NANDA_PID=$NANDA_PID
AUTH_PID=$AUTH_PID
DASHBOARD_PID=$DASHBOARD_PID
EOF

echo ""
echo "=================================================="
echo -e "${GREEN}✅ CLOS Production Environment Started Successfully!${NC}"
echo ""
echo "Services Running:"
echo "  • NANDA Orchestrator: http://localhost:5100"
echo "  • CLOS Dashboard: http://localhost:3500"
echo "  • Auth Service: http://localhost:3501"
echo ""
echo "NANDA Mode: AUTONOMOUS"
echo "Decision Threshold: $DECISION_THRESHOLD"
echo ""
echo "Logs:"
echo "  • NANDA: tail -f /tmp/nanda-orchestrator.log"
echo "  • Auth: tail -f /tmp/clos-auth.log"
echo "  • Dashboard: tail -f /tmp/clos-dashboard.log"
echo ""
echo "To stop all services: ./stop-production.sh"
echo "To view NANDA decisions: curl http://localhost:5100/state"
echo ""
echo -e "${YELLOW}🤖 NANDA is now autonomously managing your services${NC}"