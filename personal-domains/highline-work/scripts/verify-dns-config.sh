#!/bin/bash

# DNS Configuration Verification Script for Highline Domains
# Run this script after configuring DNS in Squarespace

echo "🔍 Verifying DNS Configuration for Highline Domains"
echo "=================================================="
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check A record
check_a_record() {
    local domain=$1
    local expected_ip=$2

    echo -n "Checking A record for $domain... "

    actual_ip=$(dig +short $domain A)

    if [ "$actual_ip" = "$expected_ip" ]; then
        echo -e "${GREEN}✓ Correct${NC} ($actual_ip)"
        return 0
    elif [ -z "$actual_ip" ]; then
        echo -e "${RED}✗ No A record found${NC}"
        return 1
    else
        echo -e "${RED}✗ Wrong IP${NC} (Expected: $expected_ip, Got: $actual_ip)"
        return 1
    fi
}

# Function to check CNAME record
check_cname_record() {
    local subdomain=$1
    local expected_target=$2

    echo -n "Checking CNAME record for $subdomain... "

    actual_target=$(dig +short $subdomain CNAME)

    if [[ "$actual_target" == "$expected_target"* ]]; then
        echo -e "${GREEN}✓ Correct${NC} ($actual_target)"
        return 0
    elif [ -z "$actual_target" ]; then
        echo -e "${RED}✗ No CNAME record found${NC}"
        return 1
    else
        echo -e "${RED}✗ Wrong target${NC} (Expected: $expected_target, Got: $actual_target)"
        return 1
    fi
}

# Function to check HTTPS connectivity
check_https() {
    local domain=$1

    echo -n "Checking HTTPS connectivity for $domain... "

    if curl -s -I --max-time 10 "https://$domain" | head -n 1 | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓ HTTPS working${NC}"
        return 0
    else
        echo -e "${RED}✗ HTTPS not working${NC}"
        return 1
    fi
}

# Function to check SSL certificate
check_ssl_cert() {
    local domain=$1

    echo -n "Checking SSL certificate for $domain... "

    if timeout 10 openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | openssl x509 -noout -subject 2>/dev/null | grep -q "CN.*$domain"; then
        echo -e "${GREEN}✓ Valid SSL certificate${NC}"
        return 0
    else
        echo -e "${RED}✗ SSL certificate issue${NC}"
        return 1
    fi
}

echo "1. DNS Record Verification"
echo "------------------------"

# Check highline.work A record
check_a_record "highline.work" "75.2.60.5"

# Check inventory.highline.work CNAME
check_cname_record "inventory.highline.work" "highline-inventory.netlify.app"

# Check www.highline.work CNAME (optional)
check_cname_record "www.highline.work" "highline-work.netlify.app"

# Check acupcake.shop A record
check_a_record "acupcake.shop" "75.2.60.5"

echo
echo "2. HTTPS Connectivity Check"
echo "---------------------------"

# Check HTTPS for all domains
check_https "highline.work"
check_https "inventory.highline.work"
check_https "www.highline.work"
check_https "acupcake.shop"

echo
echo "3. SSL Certificate Verification"
echo "-------------------------------"

# Check SSL certificates
check_ssl_cert "highline.work"
check_ssl_cert "inventory.highline.work"

echo
echo "4. DNS Propagation Check (Multiple Servers)"
echo "-------------------------------------------"

dns_servers=("8.8.8.8" "1.1.1.1" "208.67.222.222")

for server in "${dns_servers[@]}"; do
    echo "Checking via $server:"
    echo -n "  highline.work: "
    dig @$server +short highline.work A || echo "No response"
    echo -n "  inventory.highline.work: "
    dig @$server +short inventory.highline.work CNAME || echo "No response"
    echo
done

echo "5. Netlify Site Status"
echo "---------------------"

# Check if we have netlify CLI token to verify site status
if command -v netlify &> /dev/null && [ -f ~/.netlify/config.json ]; then
    echo "Checking Netlify site status..."
    netlify status
else
    echo -e "${YELLOW}⚠ Netlify CLI not configured. Manual check recommended.${NC}"
    echo "Visit: https://app.netlify.com/sites/highline-work/settings/domain"
    echo "Visit: https://app.netlify.com/sites/highline-inventory/settings/domain"
fi

echo
echo "🎯 Verification Complete!"
echo "========================"
echo
echo "If any checks failed:"
echo "1. Wait 5-10 minutes for DNS propagation"
echo "2. Re-run this script: ./verify-dns-config.sh"
echo "3. Check Squarespace DNS settings if issues persist"
echo "4. Verify Netlify custom domain configuration"
echo
echo "For manual verification:"
echo "• Squarespace: https://account.squarespace.com/domains"
echo "• Netlify: https://app.netlify.com/sites/highline-work/settings/domain"
