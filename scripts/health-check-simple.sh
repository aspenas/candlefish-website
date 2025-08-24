#!/bin/bash

# Simple Health Check Script
# Candlefish AI Documentation Platform

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Sites to check
SITES=(
    "https://docs.candlefish.ai"
    "https://partners.candlefish.ai"
    "https://api.candlefish.ai"
)

echo -e "${BLUE}🏥 Health Check Suite - Candlefish AI Documentation Platform${NC}"
echo "=============================================================="

# Function to check site health
check_site_health() {
    local url=$1
    local site_name=$(echo "$url" | cut -d'/' -f3)

    echo -e "\n${YELLOW}🔍 Checking $site_name...${NC}"

    # HTTP Status Check
    echo -n "  HTTP Status: "
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")

    if [[ "$status" =~ ^(200|301|302)$ ]]; then
        echo -e "${GREEN}✓ $status${NC}"
    else
        echo -e "${RED}✗ $status${NC}"
        return 1
    fi

    # Response Time Check
    echo -n "  Response Time: "
    response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$url" || echo "timeout")

    if [[ "$response_time" != "timeout" ]]; then
        if (( $(echo "$response_time < 3.0" | bc -l) )); then
            echo -e "${GREEN}✓ ${response_time}s${NC}"
        else
            echo -e "${YELLOW}⚠ ${response_time}s (slow)${NC}"
        fi
    else
        echo -e "${RED}✗ timeout${NC}"
        return 1
    fi

    # SSL Certificate Check
    echo -n "  SSL Certificate: "
    if curl -s --max-time 10 "$url" >/dev/null 2>&1; then
        ssl_info=$(curl -s --max-time 5 -I "$url" 2>/dev/null | grep -i "strict-transport-security" || echo "")
        if [[ -n "$ssl_info" ]]; then
            echo -e "${GREEN}✓ Valid with HSTS${NC}"
        else
            echo -e "${YELLOW}⚠ Valid (no HSTS)${NC}"
        fi
    else
        echo -e "${RED}✗ Invalid or unreachable${NC}"
        return 1
    fi

    # Content Check (basic)
    echo -n "  Content Check: "
    content=$(curl -s --max-time 10 "$url" | head -c 1000)

    if echo "$content" | grep -qi "candlefish\|documentation\|api\|partners"; then
        echo -e "${GREEN}✓ Content looks good${NC}"
    else
        echo -e "${YELLOW}⚠ Unexpected content${NC}"
    fi

    return 0
}

# Main health check loop
echo -e "${YELLOW}Starting health checks...${NC}"
failed_checks=0
total_checks=0

for site in "${SITES[@]}"; do
    total_checks=$((total_checks + 1))

    if ! check_site_health "$site"; then
        failed_checks=$((failed_checks + 1))
    fi

    sleep 2  # Brief pause between checks
done

# Summary
echo -e "\n${BLUE}📊 Health Check Summary${NC}"
echo "========================"

successful_checks=$((total_checks - failed_checks))
echo -e "Total Sites Checked: $total_checks"
echo -e "${GREEN}✓ Successful: $successful_checks${NC}"

if [[ $failed_checks -gt 0 ]]; then
    echo -e "${RED}✗ Failed: $failed_checks${NC}"
    echo -e "\n${YELLOW}⚠️ Some health checks failed. Please investigate.${NC}"
else
    echo -e "${RED}✗ Failed: $failed_checks${NC}"
    echo -e "\n${GREEN}🎉 All health checks passed!${NC}"
fi

# Additional monitoring checks
echo -e "\n${YELLOW}🔧 Additional Monitoring Status...${NC}"

# GitHub Actions status
echo -n "GitHub Actions: "
if curl -s --max-time 5 "https://api.github.com/repos/candlefish-ai/candlefish-ai/actions/runs?status=in_progress" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ API accessible${NC}"
else
    echo -e "${YELLOW}⚠ API may be limited${NC}"
fi

# AWS connectivity
echo -n "AWS Connectivity: "
if aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Connected${NC}"
else
    echo -e "${RED}✗ Connection failed${NC}"
fi

echo -e "\n${BLUE}🔗 Production URLs Status:${NC}"
for site in "${SITES[@]}"; do
    echo "  • $site"
done

echo -e "\n${GREEN}Health check completed at $(date)${NC}"
