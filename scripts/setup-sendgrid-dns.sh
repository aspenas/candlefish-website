#!/bin/bash

# SendGrid DNS Setup for candlefish.ai via Porkbun API
# This script adds the required DNS records for SendGrid email authentication

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}SendGrid DNS Setup for candlefish.ai${NC}"
echo "======================================="

# Domain configuration
DOMAIN="candlefish.ai"

# Get Porkbun API credentials from AWS Secrets Manager
echo -e "${YELLOW}Fetching Porkbun API credentials...${NC}"
PORKBUN_CREDS=$(aws secretsmanager get-secret-value --secret-id porkbun/api-credentials --query SecretString --output text)
PORKBUN_API_KEY=$(echo $PORKBUN_CREDS | jq -r '.api_key')
PORKBUN_SECRET_KEY=$(echo $PORKBUN_CREDS | jq -r '.secret_key')

if [ -z "$PORKBUN_API_KEY" ] || [ -z "$PORKBUN_SECRET_KEY" ]; then
    echo -e "${RED}Error: Could not retrieve Porkbun API credentials from AWS Secrets Manager${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API credentials retrieved${NC}"

# Porkbun API endpoint (updated to use api.porkbun.com)
API_BASE="https://api.porkbun.com/api/json/v3/dns"

# Function to create DNS record
create_dns_record() {
    local type=$1
    local name=$2
    local content=$3
    local ttl=${4:-600}

    # Handle subdomain vs root domain
    if [ "$name" == "@" ] || [ "$name" == "$DOMAIN" ]; then
        subdomain=""
    else
        # Remove the domain from the full hostname to get just the subdomain
        subdomain="${name%."${DOMAIN}"}"
        subdomain="${subdomain%.www."${DOMAIN}"}"
    fi

    echo -e "${YELLOW}Creating $type record: $name -> $content${NC}"

    response=$(curl -s -X POST "${API_BASE}/create/${DOMAIN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"apikey\": \"${PORKBUN_API_KEY}\",
            \"secretapikey\": \"${PORKBUN_SECRET_KEY}\",
            \"type\": \"${type}\",
            \"name\": \"${subdomain}\",
            \"content\": \"${content}\",
            \"ttl\": \"${ttl}\"
        }")

    status=$(echo $response | jq -r '.status')

    if [ "$status" == "SUCCESS" ]; then
        echo -e "${GREEN}✓ $type record created successfully${NC}"
    else
        message=$(echo $response | jq -r '.message // "Unknown error"')
        echo -e "${RED}✗ Failed to create $type record: $message${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Function to check if record exists
check_record_exists() {
    local type=$1
    local name=$2

    response=$(curl -s -X POST "${API_BASE}/retrieve/${DOMAIN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"apikey\": \"${PORKBUN_API_KEY}\",
            \"secretapikey\": \"${PORKBUN_SECRET_KEY}\"
        }")

    # Check if the record already exists
    if [ "$name" == "@" ] || [ "$name" == "$DOMAIN" ]; then
        check_name=""
    else
        check_name="${name%."${DOMAIN}"}"
        check_name="${check_name%.www."${DOMAIN}"}"
    fi

    exists=$(echo $response | jq -r ".records[] | select(.type == \"${type}\" and .name == \"${check_name}\") | .id" | head -1)

    if [ -n "$exists" ]; then
        return 0
    else
        return 1
    fi
}

echo ""
echo -e "${GREEN}Adding SendGrid DNS Records${NC}"
echo "============================="

# Array of DNS records to create
declare -a records=(
    "CNAME|url8641.www.candlefish.ai|sendgrid.net"
    "CNAME|55107103.www.candlefish.ai|sendgrid.net"
    "CNAME|em5699.www.candlefish.ai|u55107103.wl104.sendgrid.net"
    "CNAME|s1._domainkey.www.candlefish.ai|s1.domainkey.u55107103.wl104.sendgrid.net"
    "CNAME|s2._domainkey.www.candlefish.ai|s2.domainkey.u55107103.wl104.sendgrid.net"
    "TXT|_dmarc.www.candlefish.ai|v=DMARC1; p=quarantine; rua=mailto:reports@candlefish.ai;"
)

# Process each record
failed_records=0
for record in "${records[@]}"; do
    IFS='|' read -r type name content <<< "$record"

    # Check if record already exists
    if check_record_exists "$type" "$name"; then
        echo -e "${YELLOW}⚠ $type record for $name already exists, skipping...${NC}"
    else
        if ! create_dns_record "$type" "$name" "$content"; then
            ((failed_records++))
        fi
    fi

    # Small delay to avoid rate limiting
    sleep 1
done

echo ""
echo "======================================"

if [ $failed_records -eq 0 ]; then
    echo -e "${GREEN}✓ All DNS records processed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. DNS propagation may take up to 48 hours"
    echo "2. You can verify DNS records at: https://porkbun.com/account/domainsSpeedy/${DOMAIN}"
    echo "3. Check SendGrid domain authentication status in your SendGrid account"
    echo "4. Use 'dig' or 'nslookup' to verify individual records:"
    echo "   Example: dig CNAME url8641.www.candlefish.ai"
else
    echo -e "${RED}✗ Some records failed to create. Please check the errors above.${NC}"
    exit 1
fi

# Optional: Verify DNS records with dig
echo ""
echo -e "${YELLOW}Would you like to verify the DNS records now? (y/n)${NC}"
read -r verify

if [[ "$verify" =~ ^[Yy]$ ]]; then
    echo ""
    echo "Verifying DNS records (may not show immediately due to propagation delay):"
    echo "==========================================================================="

    for record in "${records[@]}"; do
        IFS='|' read -r type name content <<< "$record"
        echo ""
        echo "Checking $type record for $name:"
        if [ "$type" == "TXT" ]; then
            dig +short TXT "$name" @8.8.8.8
        else
            dig +short "$type" "$name" @8.8.8.8
        fi
    done
fi

echo ""
echo -e "${GREEN}Script completed!${NC}"
