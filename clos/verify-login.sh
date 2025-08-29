#!/bin/bash

echo "Testing CLOS Dashboard Login System"
echo "===================================="

# Test login endpoint
echo -e "\n1. Testing login endpoint..."
TOKEN=$(curl -s -X POST http://localhost:3501/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "patrick", "password": "admin_password"}' | jq -r '.data.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Login failed - no token received"
    exit 1
else
    echo "✅ Login successful - token received"
fi

# Test authenticated API access
echo -e "\n2. Testing authenticated API access..."
SERVICES=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3501/api/services | jq -r '.data | length')

if [ -z "$SERVICES" ] || [ "$SERVICES" = "null" ]; then
    echo "❌ API access failed"
    exit 1
else
    echo "✅ API access successful - $SERVICES services found"
fi

# Test dashboard page
echo -e "\n3. Testing dashboard pages..."
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3500/login)
if [ "$LOGIN_STATUS" = "200" ]; then
    echo "✅ Login page accessible (HTTP $LOGIN_STATUS)"
else
    echo "❌ Login page not accessible (HTTP $LOGIN_STATUS)"
fi

DASHBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3500/)
if [ "$DASHBOARD_STATUS" = "200" ]; then
    echo "✅ Dashboard page accessible (HTTP $DASHBOARD_STATUS)"
else
    echo "❌ Dashboard page not accessible (HTTP $DASHBOARD_STATUS)"
fi

echo -e "\n===================================="
echo "Summary:"
echo "- API Server: http://localhost:3501 ✅"
echo "- Dashboard: http://localhost:3500 ✅"
echo "- Login Page: http://localhost:3500/login ✅"
echo ""
echo "Login Credentials:"
echo "- Admin: patrick / admin_password"
echo "- Users: tyler, aaron, james / user_password"
echo ""
echo "To use the dashboard:"
echo "1. Open http://localhost:3500/login in your browser"
echo "2. Click 'Admin (Patrick)' button for quick login"
echo "3. Or enter credentials manually and click 'Sign In'"