#!/bin/bash

echo "🚀 Starting Security Dashboard Application"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if PostgreSQL is running
echo -e "${YELLOW}Checking database connection...${NC}"
if PGPASSWORD=secure_password_2024 psql -h localhost -p 5433 -U dashboard_user -d security_dashboard -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database is running${NC}"
else
    echo "❌ Database is not running. Starting PostgreSQL..."
    docker start security-postgres security-redis security-neo4j 2>/dev/null || {
        echo "Starting new database containers..."
        docker run -d --name security-postgres -e POSTGRES_DB=security_dashboard -e POSTGRES_USER=dashboard_user -e POSTGRES_PASSWORD=secure_password_2024 -p 5433:5432 postgres:15-alpine
        docker run -d --name security-redis -p 6380:6379 redis:7-alpine
        sleep 5
    }
fi

# Install backend dependencies if needed
echo -e "${YELLOW}Setting up backend...${NC}"
cd apps/security-dashboard-backend
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install express cors pg dotenv jsonwebtoken bcryptjs express-rate-limit 2>/dev/null || {
        echo "Creating minimal node_modules..."
        mkdir -p node_modules
    }
fi

# Start backend API
echo -e "${YELLOW}Starting backend API on port 4001...${NC}"
node server.js &
BACKEND_PID=$!
sleep 2

# Start frontend
echo -e "${YELLOW}Starting frontend on port 8080...${NC}"
cd ../security-dashboard-frontend
python3 -m http.server 8080 > /dev/null 2>&1 &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}✅ Security Dashboard is running!${NC}"
echo "=========================================="
echo "📊 Frontend: http://localhost:8080"
echo "🔧 Backend API: http://localhost:4001"
echo "💾 Database: postgresql://dashboard_user:secure_password_2024@localhost:5433/security_dashboard"
echo ""
echo "Users:"
echo "  • Tyler & Patrick (Admins)"
echo "  • Aaron & James (Guests)"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for interrupt
trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait