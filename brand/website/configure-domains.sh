#!/bin/bash

# Get Netlify token
TOKEN=$(aws secretsmanager get-secret-value --secret-id "netlify/ibm-portfolio/auth-token" --query SecretString --output text | jq -r '.token')

echo "=== Configuring Custom Domains for Netlify Sites ==="

# For highline.work -> highline-inventory site
HIGHLINE_SITE_ID="9ebc8d1d-e31b-4c29-afe4-1905a7503d4a"

echo "1. Adding highline.work to highline-inventory site..."
# Update site with custom domain
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"custom_domain": "highline.work", "domain_aliases": ["www.highline.work"]}' \
  "https://api.netlify.com/api/v1/sites/$HIGHLINE_SITE_ID" | jq '.custom_domain'

# For acupcake.shop -> need to create or assign to a site
echo -e "\n2. Creating new site for acupcake.shop..."
CREATE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "acupcake-shop", "custom_domain": "acupcake.shop"}' \
  "https://api.netlify.com/api/v1/accounts/candlefish/sites")

ACUPCAKE_SITE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.site_id // .id')
echo "Created site with ID: $ACUPCAKE_SITE_ID"

# Configure DNS instructions
echo -e "\n=== DNS Configuration Required ==="
echo "Please update DNS records in Google Domains:"
echo ""
echo "For highline.work:"
echo "  - A record: @ -> 75.2.60.5"
echo "  - CNAME record: www -> highline-inventory.netlify.app"
echo ""
echo "For acupcake.shop:"
echo "  - A record: @ -> 75.2.60.5"
echo "  - CNAME record: www -> acupcake-shop.netlify.app"
echo ""
echo "Keep all MX records unchanged for email delivery."
