#!/bin/bash
# Photo Service Troubleshooting Automation Template
# Generated from successful fix on 2025-08-26

set -euo pipefail

# Configuration
API_BASE_URL="${API_BASE_URL:-https://5470-inventory.fly.dev}"
WS_URL="${WS_URL:-wss://5470-inventory.fly.dev/ws}"
FLY_APP="${FLY_APP:-5470-inventory}"
BACKEND_DIR="${BACKEND_DIR:-/Users/patricksmith/candlefish-ai/5470_S_Highline_Circle/backend}"
FRONTEND_DIR="${FRONTEND_DIR:-/Users/patricksmith/candlefish-ai/5470_S_Highline_Circle/frontend}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Photo Service Troubleshooting Script"
echo "======================================="

# Step 1: Quick Diagnostic (5-minute check)
echo -e "\n${YELLOW}Step 1: Quick Diagnostic${NC}"
echo "------------------------"

# Check main API health
echo -n "✓ Checking main API health... "
HEALTH_STATUS=$(curl -s "${API_BASE_URL}/health" 2>/dev/null | jq -r '.status' || echo "offline")
if [[ "$HEALTH_STATUS" == "healthy" ]]; then
    echo -e "${GREEN}ONLINE${NC}"
else
    echo -e "${RED}OFFLINE${NC}"
    echo "  Main API is down. Check Fly.io status: fly status -a $FLY_APP"
fi

# Check photo service status
echo -n "✓ Checking photo service status... "
PHOTO_STATUS=$(curl -s "${API_BASE_URL}/api/v1/photos/status" 2>/dev/null | jq -r '.status' || echo "offline")
if [[ "$PHOTO_STATUS" == "operational" ]]; then
    echo -e "${GREEN}OPERATIONAL${NC}"
    curl -s "${API_BASE_URL}/api/v1/photos/status" 2>/dev/null | jq '.' || true
else
    echo -e "${RED}OFFLINE${NC}"
    ISSUE_FOUND="photo_endpoint_missing"
fi

# Check WebSocket connection
echo -n "✓ Testing WebSocket connection... "
WS_TEST=$(echo '{"type":"ping"}' | timeout 5 wscat -c "$WS_URL" 2>&1 || echo "failed")
if [[ "$WS_TEST" != *"failed"* ]] && [[ "$WS_TEST" != *"Error"* ]]; then
    echo -e "${GREEN}CONNECTED${NC}"
else
    echo -e "${RED}FAILED${NC}"
    ISSUE_FOUND="${ISSUE_FOUND:-websocket_failed}"
fi

# Check recent logs
echo -n "✓ Checking recent logs for errors... "
ERROR_COUNT=$(fly logs -a "$FLY_APP" --since 5m 2>/dev/null | grep -cE "(error|panic|fatal)" || echo "0")
if [[ "$ERROR_COUNT" -gt 0 ]]; then
    echo -e "${RED}$ERROR_COUNT errors found${NC}"
    echo "  Recent errors:"
    fly logs -a "$FLY_APP" --since 5m 2>/dev/null | grep -E "(error|panic|fatal)" | tail -5
else
    echo -e "${GREEN}No errors${NC}"
fi

# Step 2: Investigate based on findings
if [[ -n "${ISSUE_FOUND:-}" ]]; then
    echo -e "\n${YELLOW}Step 2: Investigating Issue: $ISSUE_FOUND${NC}"
    echo "----------------------------------------"
    
    case "$ISSUE_FOUND" in
        photo_endpoint_missing)
            echo "📋 Photo handler not initialized in backend"
            echo "   Checking main.go for PhotoHandler initialization..."
            
            if grep -q "PhotoHandler.*=.*handlers.NewPhotoHandler" "$BACKEND_DIR/main.go"; then
                echo -e "   ${GREEN}✓ PhotoHandler initialized${NC}"
            else
                echo -e "   ${RED}✗ PhotoHandler NOT initialized${NC}"
                echo "   Fix: Add initialization in main.go after 'h := handlers.New(db)'"
                echo "        photoHandler := handlers.NewPhotoHandler(h)"
                echo "        h.PhotoHandler = photoHandler"
            fi
            
            if grep -q "api.Get.*photos/status" "$BACKEND_DIR/main.go"; then
                echo -e "   ${GREEN}✓ Photo status endpoint registered${NC}"
            else
                echo -e "   ${RED}✗ Photo status endpoint NOT registered${NC}"
                echo "   Fix: Add route in main.go:"
                echo "        api.Get(\"/photos/status\", h.PhotoHandler.GetPhotoStatus)"
            fi
            ;;
            
        websocket_failed)
            echo "📋 WebSocket connection failed"
            echo "   Checking WebSocket route registration..."
            
            if grep -q "app.Get.*\"/ws\".*websocket.New" "$BACKEND_DIR/main.go"; then
                echo -e "   ${GREEN}✓ WebSocket route registered${NC}"
            else
                echo -e "   ${RED}✗ WebSocket route NOT registered${NC}"
                echo "   Fix: Add WebSocket handler in main.go:"
                echo "        app.Get(\"/ws\", websocket.New(h.PhotoHandler.HandleWebSocket))"
            fi
            ;;
    esac
fi

# Step 3: Apply fixes (if running with --fix flag)
if [[ "${1:-}" == "--fix" ]] && [[ -n "${ISSUE_FOUND:-}" ]]; then
    echo -e "\n${YELLOW}Step 3: Applying Fixes${NC}"
    echo "----------------------"
    
    echo "🔧 Applying automated fixes..."
    
    # Backup main.go
    cp "$BACKEND_DIR/main.go" "$BACKEND_DIR/main.go.backup"
    
    case "$ISSUE_FOUND" in
        photo_endpoint_missing)
            # Add PhotoHandler initialization if missing
            if ! grep -q "PhotoHandler.*=.*handlers.NewPhotoHandler" "$BACKEND_DIR/main.go"; then
                sed -i '' '/h := handlers.New(db)/a\
\
	// Initialize photo handler\
	photoHandler := handlers.NewPhotoHandler(h)\
	h.PhotoHandler = photoHandler' "$BACKEND_DIR/main.go"
                echo "   ✓ Added PhotoHandler initialization"
            fi
            
            # Add photo status endpoint if missing
            if ! grep -q "api.Get.*photos/status" "$BACKEND_DIR/main.go"; then
                sed -i '' '/api.Post("\/photos\/sessions"/i\
	// Photo status endpoint\
	api.Get("/photos/status", h.PhotoHandler.GetPhotoStatus)\
	' "$BACKEND_DIR/main.go"
                echo "   ✓ Added photo status endpoint"
            fi
            ;;
            
        websocket_failed)
            # Add WebSocket endpoint if missing
            if ! grep -q "app.Get.*\"/ws\".*websocket.New" "$BACKEND_DIR/main.go"; then
                sed -i '' '/app.Get("\/ws\/photos"/i\
	// Main WebSocket endpoint for frontend\
	app.Get("/ws", websocket.New(h.PhotoHandler.HandleWebSocket))\
	' "$BACKEND_DIR/main.go"
                echo "   ✓ Added WebSocket endpoint"
            fi
            ;;
    esac
    
    # Build and deploy
    echo "🚀 Building and deploying..."
    cd "$BACKEND_DIR"
    go build -o main .
    fly deploy --now
    
    echo "⏳ Waiting for deployment to complete..."
    sleep 15
fi

# Step 4: Validation
echo -e "\n${YELLOW}Step 4: Validation${NC}"
echo "-----------------"

echo "Running validation tests..."

# Test 1: Photo status endpoint
echo -n "✓ Photo status endpoint: "
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/api/v1/photos/status")
if [[ "$STATUS_CODE" == "200" ]]; then
    echo -e "${GREEN}PASS (200 OK)${NC}"
else
    echo -e "${RED}FAIL ($STATUS_CODE)${NC}"
fi

# Test 2: WebSocket connection
echo -n "✓ WebSocket connection: "
WS_RESULT=$(echo '{"type":"ping"}' | timeout 5 wscat -c "$WS_URL" 2>&1 || echo "failed")
if [[ "$WS_RESULT" != *"failed"* ]] && [[ "$WS_RESULT" != *"Error"* ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
fi

# Test 3: Frontend connection status
echo -n "✓ Frontend status check: "
if command -v node &> /dev/null; then
    node -e "
    const WebSocket = require('ws');
    const ws = new WebSocket('$WS_URL');
    ws.on('open', () => { console.log('CONNECTED'); process.exit(0); });
    ws.on('error', (e) => { console.log('ERROR:', e.message); process.exit(1); });
    setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 5000);
    " 2>/dev/null && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}FAIL${NC}"
else
    echo "SKIP (node not installed)"
fi

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo "📊 Troubleshooting Summary"
echo "========================================="
echo "Main API Status:     $HEALTH_STATUS"
echo "Photo Service:       $PHOTO_STATUS"
echo "WebSocket:           $(if [[ "$WS_TEST" != *"failed"* ]]; then echo "Connected"; else echo "Failed"; fi)"
echo "Error Count:         $ERROR_COUNT errors in last 5 minutes"

if [[ "$PHOTO_STATUS" == "operational" ]] && [[ "$WS_TEST" != *"failed"* ]]; then
    echo -e "\n${GREEN}✅ Photo service is fully operational!${NC}"
else
    echo -e "\n${RED}❌ Photo service has issues. Run with --fix flag to apply automated fixes.${NC}"
    echo "   Usage: $0 --fix"
fi

# Step 5: Monitoring
echo -e "\n${YELLOW}Step 5: Monitoring Setup${NC}"
echo "------------------------"
echo "To continuously monitor the photo service, run:"
echo "  watch -n 60 'curl -s ${API_BASE_URL}/api/v1/photos/status | jq'"
echo ""
echo "Or use the monitoring script:"
echo "  while true; do"
echo "    STATUS=\$(curl -s ${API_BASE_URL}/api/v1/photos/status | jq -r '.status')"
echo "    if [[ \"\$STATUS\" != \"operational\" ]]; then"
echo "      echo \"\$(date): Photo service down!\""
echo "      # Send alert here"
echo "    fi"
echo "    sleep 60"
echo "  done"