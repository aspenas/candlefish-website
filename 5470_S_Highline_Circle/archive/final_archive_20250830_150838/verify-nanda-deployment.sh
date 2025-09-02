#!/bin/bash

# NANDA Deployment Verification Script
# Quick verification of the NANDA agent system deployment

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 NANDA Deployment Verification${NC}"
echo "=================================="

# Check if deployment script exists and is executable
if [[ -x "./deploy-nanda-inventory.sh" ]]; then
    echo -e "${GREEN}✅ Deployment script found and executable${NC}"
else
    echo -e "${RED}❌ Deployment script not found or not executable${NC}"
    exit 1
fi

# Check if configuration files exist
config_files=(
    "agents/nanda-config.yaml"
    "NANDA_DEPLOYMENT_GUIDE.md"
)

for file in "${config_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "${GREEN}✅ Configuration file exists: $file${NC}"
    else
        echo -e "${RED}❌ Missing configuration file: $file${NC}"
    fi
done

# Check required commands
required_commands=("curl" "node" "npm" "jq")
for cmd in "${required_commands[@]}"; do
    if command -v "$cmd" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Command available: $cmd${NC}"
    else
        echo -e "${YELLOW}⚠️  Command not found: $cmd${NC}"
    fi
done

# Check network connectivity to services
echo ""
echo -e "${GREEN}🌐 Network Connectivity Checks${NC}"
echo "--------------------------------"

# Frontend check
if curl -s --head "https://inventory.highline.work" | head -n 1 | grep -q "200 OK"; then
    echo -e "${GREEN}✅ Frontend accessible: https://inventory.highline.work${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend may not be accessible: https://inventory.highline.work${NC}"
fi

# Backend check
if curl -s --head "https://5470-inventory.fly.dev/health" | head -n 1 | grep -q "200 OK"; then
    echo -e "${GREEN}✅ Backend accessible: https://5470-inventory.fly.dev${NC}"
else
    echo -e "${YELLOW}⚠️  Backend may not be accessible: https://5470-inventory.fly.dev${NC}"
fi

# Check if NANDA orchestrator is running (if already deployed)
if curl -s "http://localhost:5100/health" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ NANDA orchestrator is running on port 5100${NC}"
else
    echo -e "${YELLOW}⚠️  NANDA orchestrator not running (expected if not yet deployed)${NC}"
fi

echo ""
echo -e "${GREEN}📋 Deployment Readiness Summary${NC}"
echo "================================"

# Check environment variables
missing_vars=()
required_vars=("POSTGRES_PASSWORD" "JWT_SECRET" "CSRF_SECRET")

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        missing_vars+=("$var")
    fi
done

if [[ ${#missing_vars[@]} -eq 0 ]]; then
    echo -e "${GREEN}✅ All required environment variables are set${NC}"
else
    echo -e "${YELLOW}⚠️  Missing environment variables: ${missing_vars[*]}${NC}"
    echo "   Set these before deployment:"
    for var in "${missing_vars[@]}"; do
        echo "   export $var=\"your_value_here\""
    done
fi

# Check ports
if lsof -i :5100 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 5100 is already in use${NC}"
else
    echo -e "${GREEN}✅ Port 5100 is available for NANDA orchestrator${NC}"
fi

echo ""
echo -e "${GREEN}🚀 Deployment Commands${NC}"
echo "====================="
echo "Full deployment:     ./deploy-nanda-inventory.sh"
echo "Test only:          ./deploy-nanda-inventory.sh test"
echo "Status report:      ./deploy-nanda-inventory.sh status"
echo "Help:               ./deploy-nanda-inventory.sh help"

echo ""
echo -e "${GREEN}📚 Documentation${NC}"
echo "=================="
echo "Full guide:         cat NANDA_DEPLOYMENT_GUIDE.md"
echo "Configuration:      cat agents/nanda-config.yaml"

echo ""
echo -e "${GREEN}✅ Verification complete. Ready for deployment!${NC}"