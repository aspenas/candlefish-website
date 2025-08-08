#!/bin/bash

# Update Railway ALLOWED_ORIGINS environment variable
echo "🚂 Updating Railway ALLOWED_ORIGINS..."
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Railway project details
PROJECT_ID="ec24a77a-9159-44a3-b836-f2ead267c23d"
NEW_ALLOWED_ORIGINS="https://paintbox.candlefish.ai,https://paintbox-app.netlify.app,http://localhost:3000"

echo -e "${YELLOW}⚠️  Manual Update Required${NC}"
echo ""
echo "Since Railway CLI requires interactive mode, please update manually:"
echo ""
echo -e "${BLUE}1. Go to your Railway dashboard:${NC}"
echo "   https://railway.app/project/${PROJECT_ID}/settings/variables"
echo ""
echo -e "${BLUE}2. Update ALLOWED_ORIGINS to:${NC}"
echo "   ${NEW_ALLOWED_ORIGINS}"
echo ""
echo -e "${BLUE}3. The deployment will automatically restart${NC}"
echo ""
echo -e "${GREEN}✅ Current Configuration:${NC}"
echo "   - Frontend: https://paintbox.candlefish.ai (Netlify)"
echo "   - Backend: https://paintbox-api-production.up.railway.app (Railway)"
echo ""
echo -e "${YELLOW}Note: All other variables (Salesforce, CompanyCam) are already set correctly!${NC}"
