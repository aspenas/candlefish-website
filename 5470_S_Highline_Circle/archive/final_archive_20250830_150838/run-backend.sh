#!/bin/bash

# Run the 5470 S Highline Circle Inventory Backend

set -e

echo "🏠 Starting 5470 S Highline Circle Inventory Backend..."

# Navigate to backend directory
cd /Users/patricksmith/candlefish-ai/5470_S_Highline_Circle/backend

# Check if .env file exists, create if not
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
PORT=8080
DATABASE_URL=postgres://highline:highline123@localhost:5432/highline_inventory
REDIS_URL=redis://localhost:6379
ENABLE_VALUATION_SYSTEM=true
JWT_SECRET=your-secret-key-here-$(date +%s)
ENVIRONMENT=development
EOF
fi

# Check if Go modules are installed
if [ ! -d "vendor" ] && [ ! -f "go.sum" ]; then
    echo "📦 Installing Go dependencies..."
    go mod download
fi

# Build the backend
echo "🔨 Building backend..."
go build -o main .

# Run database migrations if postgres is running
if pg_isready -h localhost -p 5432 2>/dev/null; then
    echo "🗄️ Running database migrations..."
    ./migrate.sh || true
fi

# Start the backend
echo "🚀 Starting backend server on http://localhost:8080"
echo "📊 API Documentation: http://localhost:8080/swagger"
echo "❤️  Health check: http://localhost:8080/health"
echo ""
./main