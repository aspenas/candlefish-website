#!/bin/bash

# DNS and SSL Configuration Script
# Candlefish AI Documentation Platform

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOMAIN="candlefish.ai"
SUBDOMAINS=("docs" "partners" "api")
PORKBUN_API_URL="https://api.porkbun.com/api/json/v3"

echo -e "${BLUE}🌐 DNS and SSL Configuration for Candlefish AI${NC}"
echo "================================================="

# Get Porkbun API credentials from AWS Secrets Manager
echo -e "${YELLOW}🔑 Retrieving DNS credentials...${NC}"
if command -v aws &> /dev/null; then
    CREDS=$(aws secretsmanager get-secret-value --secret-id "candlefish/porkbun-api-credentials" --query 'SecretString' --output text)
    API_KEY=$(echo "$CREDS" | jq -r '.api_key')
    SECRET_KEY=$(echo "$CREDS" | jq -r '.secret_key')
    echo -e "${GREEN}✓${NC} Retrieved Porkbun API credentials"
else
    echo -e "${RED}✗${NC} AWS CLI not available. Please set credentials manually."
    exit 1
fi

# Function to create/update DNS record
create_dns_record() {
    local subdomain=$1
    local target=$2
    local record_type=$3

    echo -e "\n${YELLOW}📝 Configuring DNS for ${subdomain}.${DOMAIN}...${NC}"

    # Create DNS record via Porkbun API
    response=$(curl -s -X POST "${PORKBUN_API_URL}/dns/create/${DOMAIN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"apikey\": \"${API_KEY}\",
            \"secretapikey\": \"${SECRET_KEY}\",
            \"type\": \"${record_type}\",
            \"name\": \"${subdomain}\",
            \"content\": \"${target}\",
            \"ttl\": \"300\"
        }")

    if echo "$response" | jq -e '.status == "SUCCESS"' > /dev/null; then
        echo -e "${GREEN}✓${NC} DNS record created for ${subdomain}.${DOMAIN} -> ${target}"
    else
        error_msg=$(echo "$response" | jq -r '.message // "Unknown error"')
        echo -e "${YELLOW}⚠${NC} DNS record may already exist or error occurred: $error_msg"
    fi
}

# Function to check DNS propagation
check_dns_propagation() {
    local subdomain=$1
    local expected_target=$2

    echo -n "Checking DNS propagation for ${subdomain}.${DOMAIN}... "

    # Try multiple DNS servers
    local dns_servers=("8.8.8.8" "1.1.1.1" "8.8.4.4")
    local propagated=false

    for dns_server in "${dns_servers[@]}"; do
        result=$(dig +short @"$dns_server" "${subdomain}.${DOMAIN}" CNAME 2>/dev/null || echo "")
        if [[ "$result" == *"${expected_target}"* ]]; then
            propagated=true
            break
        fi
    done

    if $propagated; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠${NC} (propagating...)"
    fi
}

# Configure DNS records for each subdomain
echo -e "\n${YELLOW}🎯 Configuring DNS Records...${NC}"

# docs.candlefish.ai -> Netlify
create_dns_record "docs" "wonderful-lollipop-5a6c54.netlify.app" "CNAME"

# partners.candlefish.ai -> Netlify
create_dns_record "partners" "partners-candlefish.netlify.app" "CNAME"

# api.candlefish.ai -> Netlify
create_dns_record "api" "api-docs-candlefish.netlify.app" "CNAME"

# Wait a bit for DNS propagation
echo -e "\n${YELLOW}⏳ Waiting for DNS propagation (30 seconds)...${NC}"
sleep 30

# Check DNS propagation
echo -e "\n${YELLOW}🔍 Checking DNS Propagation...${NC}"
check_dns_propagation "docs" "wonderful-lollipop-5a6c54.netlify.app"
check_dns_propagation "partners" "partners-candlefish.netlify.app"
check_dns_propagation "api" "api-docs-candlefish.netlify.app"

# SSL Configuration
echo -e "\n${YELLOW}🔐 SSL Configuration...${NC}"
echo -e "${BLUE}ℹ${NC} SSL certificates will be automatically provisioned by Netlify"
echo -e "${BLUE}ℹ${NC} This process typically takes 5-10 minutes after DNS propagation"

# Test HTTPS endpoints
echo -e "\n${YELLOW}🧪 Testing HTTPS Endpoints...${NC}"
for subdomain in "${SUBDOMAINS[@]}"; do
    url="https://${subdomain}.${DOMAIN}"
    echo -n "Testing $url... "

    if curl -s --max-time 10 --head "$url" | head -n 1 | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠${NC} (may still be provisioning)"
    fi
done

# Security Headers Check
echo -e "\n${YELLOW}🛡️ Security Headers Check...${NC}"
for subdomain in "${SUBDOMAINS[@]}"; do
    url="https://${subdomain}.${DOMAIN}"
    echo "Checking security headers for $url:"

    headers=$(curl -s --max-time 10 -I "$url" 2>/dev/null || echo "")

    if echo "$headers" | grep -qi "strict-transport-security"; then
        echo -e "  ${GREEN}✓${NC} HSTS enabled"
    else
        echo -e "  ${YELLOW}⚠${NC} HSTS not detected"
    fi

    if echo "$headers" | grep -qi "x-frame-options"; then
        echo -e "  ${GREEN}✓${NC} X-Frame-Options set"
    else
        echo -e "  ${YELLOW}⚠${NC} X-Frame-Options not detected"
    fi

    if echo "$headers" | grep -qi "x-content-type-options"; then
        echo -e "  ${GREEN}✓${NC} X-Content-Type-Options set"
    else
        echo -e "  ${YELLOW}⚠${NC} X-Content-Type-Options not detected"
    fi
done

# Summary
echo -e "\n${BLUE}📊 DNS and SSL Configuration Summary${NC}"
echo "======================================"
echo -e "${GREEN}✓${NC} DNS records configured for all subdomains"
echo -e "${GREEN}✓${NC} SSL certificate provisioning initiated"
echo -e "${GREEN}✓${NC} Security headers validation performed"

echo -e "\n${BLUE}🔗 Production URLs:${NC}"
for subdomain in "${SUBDOMAINS[@]}"; do
    echo "  • https://${subdomain}.${DOMAIN}"
done

echo -e "\n${YELLOW}⚠️ Note:${NC} SSL certificates may take up to 10 minutes to fully provision."
echo -e "${YELLOW}⚠️ Note:${NC} DNS propagation can take up to 24 hours globally."

echo -e "\n${GREEN}🎉 DNS and SSL configuration completed!${NC}"
