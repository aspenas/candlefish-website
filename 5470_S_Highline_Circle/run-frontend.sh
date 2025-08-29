#!/bin/bash

# Run the 5470 S Highline Circle Inventory Frontend

set -e

echo "🏠 Starting 5470 S Highline Circle Inventory Frontend..."

# Navigate to frontend directory
cd /Users/patricksmith/candlefish-ai/5470_S_Highline_Circle/frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
REACT_APP_API_URL=http://localhost:8080/api/v1
REACT_APP_WS_URL=ws://localhost:8080/ws
REACT_APP_ENABLE_VALUATION=true
EOF
fi

# Start the frontend
echo "🚀 Starting frontend on http://localhost:3000"
npm start