#!/bin/bash

# Configure DNS for partners.candlefish.ai with Porkbun and Netlify

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Configuring DNS for partners.candlefish.ai${NC}"

# Get credentials from AWS Secrets Manager
echo "Fetching credentials from AWS Secrets Manager..."
PORKBUN_CREDS=$(aws secretsmanager get-secret-value --secret-id "candlefish/porkbun-api-credentials" --query SecretString --output text)
API_KEY=$(echo $PORKBUN_CREDS | jq -r '.api_key')
SECRET_KEY=$(echo $PORKBUN_CREDS | jq -r '.secret_key')

NETLIFY_TOKEN=$(aws secretsmanager get-secret-value --secret-id "netlify/ibm-portfolio/auth-token" --query SecretString --output text | jq -r '.token')

# Check if partners site exists on Netlify
echo -e "${YELLOW}Checking Netlify site configuration...${NC}"
SITE_ID="candlefish-partners"
NETLIFY_SITE="${SITE_ID}.netlify.app"

# First, check if DNS record exists
echo "Checking existing DNS records..."
CHECK_DNS=$(curl -s -X POST "https://api.porkbun.com/api/json/v3/dns/retrieve/candlefish.ai" \
  -H "Content-Type: application/json" \
  -d "{
    \"apikey\": \"$API_KEY\",
    \"secretapikey\": \"$SECRET_KEY\"
  }")

# Check if partners CNAME exists
if echo "$CHECK_DNS" | jq -e '.records[] | select(.name == "partners" and .type == "CNAME")' > /dev/null 2>&1; then
    echo -e "${YELLOW}CNAME record for partners.candlefish.ai already exists${NC}"

    # Get the record ID to update it
    RECORD_ID=$(echo "$CHECK_DNS" | jq -r '.records[] | select(.name == "partners" and .type == "CNAME") | .id')

    echo "Updating existing CNAME record (ID: $RECORD_ID)..."
    UPDATE_RESPONSE=$(curl -s -X POST "https://api.porkbun.com/api/json/v3/dns/edit/candlefish.ai/$RECORD_ID" \
      -H "Content-Type: application/json" \
      -d "{
        \"apikey\": \"$API_KEY\",
        \"secretapikey\": \"$SECRET_KEY\",
        \"type\": \"CNAME\",
        \"name\": \"partners\",
        \"content\": \"$NETLIFY_SITE\",
        \"ttl\": \"300\"
      }")

    if echo "$UPDATE_RESPONSE" | jq -e '.status == "SUCCESS"' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ CNAME record updated successfully${NC}"
    else
        echo -e "${RED}Failed to update CNAME record${NC}"
        echo "$UPDATE_RESPONSE" | jq '.'
    fi
else
    echo "Creating new CNAME record..."
    CREATE_RESPONSE=$(curl -s -X POST "https://api.porkbun.com/api/json/v3/dns/create/candlefish.ai" \
      -H "Content-Type: application/json" \
      -d "{
        \"apikey\": \"$API_KEY\",
        \"secretapikey\": \"$SECRET_KEY\",
        \"type\": \"CNAME\",
        \"name\": \"partners\",
        \"content\": \"$NETLIFY_SITE\",
        \"ttl\": \"300\"
      }")

    if echo "$CREATE_RESPONSE" | jq -e '.status == "SUCCESS"' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ CNAME record created successfully${NC}"
    else
        echo -e "${RED}Failed to create CNAME record${NC}"
        echo "$CREATE_RESPONSE" | jq '.'
        exit 1
    fi
fi

# Configure custom domain in Netlify
echo -e "${YELLOW}Configuring custom domain in Netlify...${NC}"

# Get site details
SITE_DETAILS=$(curl -s -H "Authorization: Bearer $NETLIFY_TOKEN" \
  "https://api.netlify.com/api/v1/sites?name=$SITE_ID")

if [ "$(echo "$SITE_DETAILS" | jq '. | length')" -eq "0" ]; then
    echo -e "${YELLOW}Site $SITE_ID not found, checking by custom domain...${NC}"
    # Try to find by custom domain
    ALL_SITES=$(curl -s -H "Authorization: Bearer $NETLIFY_TOKEN" \
      "https://api.netlify.com/api/v1/sites")

    SITE_INFO=$(echo "$ALL_SITES" | jq -r ".[] | select(.custom_domain == \"partners.candlefish.ai\" or .name == \"$SITE_ID\")")

    if [ -z "$SITE_INFO" ]; then
        echo -e "${RED}No Netlify site found for partners.candlefish.ai${NC}"
        echo "Please create the site on Netlify first or check the site name"
    else
        ACTUAL_SITE_ID=$(echo "$SITE_INFO" | jq -r '.id')
        echo "Found site with ID: $ACTUAL_SITE_ID"

        # Add custom domain
        curl -s -X PUT "https://api.netlify.com/api/v1/sites/$ACTUAL_SITE_ID" \
          -H "Authorization: Bearer $NETLIFY_TOKEN" \
          -H "Content-Type: application/json" \
          -d "{\"custom_domain\": \"partners.candlefish.ai\"}" > /dev/null

        echo -e "${GREEN}✓ Custom domain configured in Netlify${NC}"
    fi
else
    ACTUAL_SITE_ID=$(echo "$SITE_DETAILS" | jq -r '.[0].id')

    # Add custom domain
    curl -s -X PUT "https://api.netlify.com/api/v1/sites/$ACTUAL_SITE_ID" \
      -H "Authorization: Bearer $NETLIFY_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"custom_domain\": \"partners.candlefish.ai\"}" > /dev/null

    echo -e "${GREEN}✓ Custom domain configured in Netlify${NC}"
fi

# Verify DNS propagation
echo -e "${YELLOW}Waiting for DNS propagation...${NC}"
echo "This may take a few minutes. Checking DNS resolution..."

for i in {1..10}; do
    if dig +short partners.candlefish.ai CNAME @8.8.8.8 | grep -q "netlify"; then
        echo -e "${GREEN}✓ DNS is propagating${NC}"
        break
    else
        echo "Attempt $i/10: DNS not yet propagated, waiting 30 seconds..."
        sleep 30
    fi
done

# Final verification
echo -e "${GREEN}Configuration complete!${NC}"
echo ""
echo "DNS Status:"
dig +short partners.candlefish.ai CNAME @8.8.8.8
echo ""
echo "Next steps:"
echo "1. Wait 5-10 minutes for full DNS propagation"
echo "2. Netlify will automatically provision SSL certificate"
echo "3. Access the site at https://partners.candlefish.ai"
echo ""
echo "To check SSL status:"
echo "curl -I https://partners.candlefish.ai"
