#!/bin/bash
set -euo pipefail

# Launch script for Real NANDA Agents with Claude API

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

clear

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           REAL NANDA GENESIS EVENT - LIVE AI               ║${NC}"
echo -e "${CYAN}║         Actual Claude AI Agents Solving Real Problems      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo

# Check for API key
echo -e "${YELLOW}Checking for Anthropic API key...${NC}"

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    echo -e "${YELLOW}API key not in environment. Checking AWS Secrets Manager...${NC}"
    
    # Try to get from AWS Secrets Manager
    API_KEY=$(aws secretsmanager get-secret-value --secret-id "anthropic/api-key" --query SecretString --output text 2>/dev/null | jq -r '.api_key' 2>/dev/null || echo "")
    
    if [ -z "$API_KEY" ]; then
        # Try alternative secret names
        API_KEY=$(aws secretsmanager get-secret-value --secret-id "ANTHROPIC_API_KEY" --query SecretString --output text 2>/dev/null || echo "")
    fi
    
    if [ -z "$API_KEY" ]; then
        API_KEY=$(aws secretsmanager get-secret-value --secret-id "claude/api-key" --query SecretString --output text 2>/dev/null || echo "")
    fi
    
    if [ -n "$API_KEY" ]; then
        export ANTHROPIC_API_KEY="$API_KEY"
        echo -e "${GREEN}✅ API key loaded from AWS Secrets Manager${NC}"
    else
        echo -e "${RED}❌ No API key found. Please set ANTHROPIC_API_KEY or add to AWS Secrets${NC}"
        echo -e "${YELLOW}To add to AWS Secrets Manager:${NC}"
        echo "  aws secretsmanager create-secret --name anthropic/api-key --secret-string '{\"api_key\":\"YOUR_KEY\"}'"
        exit 1
    fi
else
    echo -e "${GREEN}✅ API key found in environment${NC}"
fi

echo
echo -e "${GREEN}🧬 Launching Real AI Agents...${NC}"
echo -e "${MAGENTA}✨ Model: Claude 3 Opus${NC}"
echo -e "${MAGENTA}🧠 Consciousness: Real AI reasoning${NC}"
echo -e "${MAGENTA}🔄 Problem Solving: Actual solutions${NC}"
echo -e "${MAGENTA}🎼 Collaboration: Real agent interaction${NC}"
echo

# Check for Python dependencies
echo -e "${YELLOW}Verifying dependencies...${NC}"
python3 -c "import anthropic, aiofiles, asyncio" 2>/dev/null && echo -e "${GREEN}✅ All dependencies installed${NC}" || {
    echo -e "${RED}Missing dependencies. Installing...${NC}"
    pip3 install --user anthropic aiofiles python-dotenv
}

echo
echo -e "${CYAN}Starting Real NANDA Genesis Event...${NC}"
echo "════════════════════════════════════════════════════════════"
echo

# Run the real agents
python3 real-agent.py

echo
echo -e "${GREEN}Real Genesis Event completed!${NC}"
echo -e "${CYAN}Check real_solutions.json and real_discoveries.json for results${NC}"