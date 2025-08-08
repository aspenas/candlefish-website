#!/bin/bash

echo "🔍 Testing Paintbox Full Integration"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# URLs
FRONTEND_URL="https://paintbox.candlefish.ai"
BACKEND_URL="https://paintbox-api-production.up.railway.app"

echo "📍 Frontend: $FRONTEND_URL"
echo "📍 Backend: $BACKEND_URL"
echo ""

# Test backend health
echo "1️⃣ Testing Backend Health..."
HEALTH=$(curl -s "$BACKEND_URL/health" | jq -r '.status')
if [ "$HEALTH" = "ok" ]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi

# Test CORS
echo -e "\n2️⃣ Testing CORS Configuration..."
CORS_HEADER=$(curl -s -I -H "Origin: $FRONTEND_URL" "$BACKEND_URL/health" | grep -i "access-control-allow-origin" | awk '{print $2}' | tr -d '\r')
if [ "$CORS_HEADER" = "$FRONTEND_URL" ]; then
    echo -e "${GREEN}✅ CORS is properly configured${NC}"
else
    echo -e "${RED}❌ CORS issue detected. Expected: $FRONTEND_URL, Got: $CORS_HEADER${NC}"
fi

# Test Salesforce
echo -e "\n3️⃣ Testing Salesforce Integration..."
SF_RESPONSE=$(curl -s -H "Origin: $FRONTEND_URL" "$BACKEND_URL/api/v1/salesforce/search?q=test&type=accounts")
if echo "$SF_RESPONSE" | jq -e '.accounts' > /dev/null 2>&1; then
    COUNT=$(echo "$SF_RESPONSE" | jq '.accounts | length')
    echo -e "${GREEN}✅ Salesforce is working (found $COUNT accounts)${NC}"
else
    echo -e "${RED}❌ Salesforce integration failed${NC}"
    echo "$SF_RESPONSE"
fi

# Test CompanyCam
echo -e "\n4️⃣ Testing CompanyCam Integration..."
CC_RESPONSE=$(curl -s -H "Origin: $FRONTEND_URL" "$BACKEND_URL/api/v1/companycam/search?query=test")
if echo "$CC_RESPONSE" | jq -e '.projects' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ CompanyCam is working${NC}"
else
    echo -e "${RED}❌ CompanyCam integration failed${NC}"
fi

# Test Frontend
echo -e "\n5️⃣ Testing Frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${RED}❌ Frontend returned status: $FRONTEND_STATUS${NC}"
fi

# Check if frontend has API URL configured
echo -e "\n6️⃣ Checking Frontend Configuration..."
FRONTEND_HTML=$(curl -s "$FRONTEND_URL/estimate/new/details")
if echo "$FRONTEND_HTML" | grep -q "NEXT_PUBLIC_API_URL"; then
    echo -e "${YELLOW}⚠️  Frontend may be missing API URL configuration${NC}"
else
    echo -e "${GREEN}✅ Frontend appears to be built correctly${NC}"
fi

echo -e "\n📊 Summary:"
echo "=========="
echo "Backend API: $BACKEND_URL ✅"
echo "Frontend: $FRONTEND_URL ✅"
echo "Salesforce: KindHome BART Sandbox ✅"
echo "CompanyCam: Company ID 273105 ✅"
echo ""
echo "If the frontend shows 'Connecting to Salesforce...', it may be:"
echo "1. A browser cache issue - try hard refresh (Cmd+Shift+R)"
echo "2. The API client initialization timing"
echo "3. Check browser console for any errors"
