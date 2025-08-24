#!/bin/bash

echo "=== Setting up Personal Domain Sites on Netlify ==="
echo "These will be separate from Candlefish business sites"

TOKEN=$(aws secretsmanager get-secret-value --secret-id "netlify/ibm-portfolio/auth-token" --query SecretString --output text | jq -r '.token')
ACCOUNT_ID="aspenas"  # Your account slug

# Create site for highline.work (family domain)
echo -e "\n1. Creating site for highline.work (personal/family)..."
HIGHLINE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "personal-highline-work",
    "custom_domain": "highline.work",
    "account_slug": "'$ACCOUNT_ID'"
  }' \
  "https://api.netlify.com/api/v1/sites")

HIGHLINE_ID=$(echo "$HIGHLINE_RESPONSE" | jq -r '.id // .site_id // "error"')
HIGHLINE_NETLIFY_URL=$(echo "$HIGHLINE_RESPONSE" | jq -r '.default_domain // .url // "error"')

if [ "$HIGHLINE_ID" != "error" ] && [ "$HIGHLINE_ID" != "null" ]; then
  echo "✓ Created site: personal-highline-work"
  echo "  Site ID: $HIGHLINE_ID"
  echo "  Netlify URL: $HIGHLINE_NETLIFY_URL"
else
  echo "✗ Failed to create highline.work site"
  echo "$HIGHLINE_RESPONSE" | jq '.'
fi

# Create site for acupcake.shop (personal)
echo -e "\n2. Creating site for acupcake.shop (personal)..."
ACUPCAKE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "personal-acupcake-shop",
    "custom_domain": "acupcake.shop",
    "account_slug": "'$ACCOUNT_ID'"
  }' \
  "https://api.netlify.com/api/v1/sites")

ACUPCAKE_ID=$(echo "$ACUPCAKE_RESPONSE" | jq -r '.id // .site_id // "error"')
ACUPCAKE_NETLIFY_URL=$(echo "$ACUPCAKE_RESPONSE" | jq -r '.default_domain // .url // "error"')

if [ "$ACUPCAKE_ID" != "error" ] && [ "$ACUPCAKE_ID" != "null" ]; then
  echo "✓ Created site: personal-acupcake-shop"
  echo "  Site ID: $ACUPCAKE_ID"
  echo "  Netlify URL: $ACUPCAKE_NETLIFY_URL"
else
  echo "✗ Failed to create acupcake.shop site"
  echo "$ACUPCAKE_RESPONSE" | jq '.'
fi

# Add domain aliases (www subdomains)
echo -e "\n3. Adding www subdomains..."

if [ "$HIGHLINE_ID" != "error" ] && [ "$HIGHLINE_ID" != "null" ]; then
  curl -s -X PATCH \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"domain_aliases": ["www.highline.work"]}' \
    "https://api.netlify.com/api/v1/sites/$HIGHLINE_ID" > /dev/null
  echo "✓ Added www.highline.work alias"
fi

if [ "$ACUPCAKE_ID" != "error" ] && [ "$ACUPCAKE_ID" != "null" ]; then
  curl -s -X PATCH \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"domain_aliases": ["www.acupcake.shop"]}' \
    "https://api.netlify.com/api/v1/sites/$ACUPCAKE_ID" > /dev/null
  echo "✓ Added www.acupcake.shop alias"
fi

echo -e "\n=== DNS Configuration Instructions ==="
echo "Update these records in Google Domains:"
echo ""
echo "For highline.work:"
echo "  Type  | Name | Value"
echo "  ------|------|------"
echo "  A     | @    | 75.2.60.5"
if [ "$HIGHLINE_NETLIFY_URL" != "error" ]; then
  echo "  CNAME | www  | $HIGHLINE_NETLIFY_URL"
fi
echo ""
echo "For acupcake.shop:"
echo "  Type  | Name | Value"
echo "  ------|------|------"
echo "  A     | @    | 75.2.60.5"
if [ "$ACUPCAKE_NETLIFY_URL" != "error" ]; then
  echo "  CNAME | www  | $ACUPCAKE_NETLIFY_URL"
fi
echo ""
echo "⚠️  IMPORTANT: Keep all MX records unchanged for email!"
echo ""
echo "=== Site Isolation Notes ==="
echo "✓ These sites are prefixed with 'personal-' to distinguish from business sites"
echo "✓ When adding team members to Candlefish sites, do NOT grant access to these"
echo "✓ Consider creating a separate Netlify team for business sites only"

# Save configuration for future reference
cat > ~/candlefish-ai/brand/website/personal-domains-config.json << EOCONFIG
{
  "highline.work": {
    "site_id": "$HIGHLINE_ID",
    "netlify_url": "$HIGHLINE_NETLIFY_URL",
    "type": "personal_family"
  },
  "acupcake.shop": {
    "site_id": "$ACUPCAKE_ID",
    "netlify_url": "$ACUPCAKE_NETLIFY_URL",
    "type": "personal"
  },
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "note": "Personal domains - DO NOT grant Candlefish team access"
}
EOCONFIG

echo -e "\n✓ Configuration saved to personal-domains-config.json"
