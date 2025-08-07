#!/bin/bash

# Quick deployment script for PromoterOS
# This script performs a minimal deployment without all checks

set -euo pipefail

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Configuration
SITE_ID="ef0d6f05-62ba-46dd-82ad-39afbaa267ae"
SITE_URL="https://promoteros.candlefish.ai"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  PromoterOS Quick Deployment"
echo "========================================"
echo ""
echo "Deploying from: $SCRIPT_DIR"

# Check for Netlify CLI
if ! command -v netlify &> /dev/null; then
    echo -e "${YELLOW}Installing Netlify CLI...${NC}"
    npm install -g netlify-cli
fi

# Deploy only PromoterOS files
echo -e "${GREEN}Deploying to Netlify...${NC}"
netlify deploy \
    --prod \
    --site "$SITE_ID" \
    --dir "$SCRIPT_DIR" \
    --functions "$SCRIPT_DIR/netlify/functions" \
    --message "Quick deployment: $(date +%Y%m%d-%H%M%S)"

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}Site is live at: $SITE_URL${NC}"
echo ""