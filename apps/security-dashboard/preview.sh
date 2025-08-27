#!/bin/bash

# Security Dashboard Local Preview Script
echo "🚀 Starting Security Dashboard Preview..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

# Build the frontend
echo -e "${BLUE}🔨 Building security dashboard...${NC}"
npm run build

# Start preview server
echo -e "${GREEN}✅ Starting preview server on port 5173...${NC}"
echo -e "${GREEN}🌐 Opening http://localhost:5173 in Safari...${NC}"

# Open in Safari after a short delay
(sleep 2 && open -a Safari http://localhost:5173) &

# Start the dev server
npm run preview