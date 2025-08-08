#!/bin/bash

# Script to add custom domain to PromoterOS Netlify site
echo "🎵 Adding custom domain promoteros.candlefish.ai to PromoterOS site..."

# Get site ID
SITE_ID="ef0d6f05-62ba-46dd-82ad-39afbaa267ae"

echo "Site ID: $SITE_ID"
echo "Custom Domain: promoteros.candlefish.ai"

echo "✅ Current site configuration:"
netlify api getSite --data='{"site_id":"'$SITE_ID'"}' | jq '.custom_domain, .domain_aliases, .ssl_status'

echo ""
echo "📋 Manual Steps Required:"
echo "1. Go to: https://app.netlify.com/projects/promoteros/settings/domain"
echo "2. Click 'Add custom domain'"
echo "3. Enter: promoteros.candlefish.ai"
echo "4. Verify DNS is correctly configured"
echo "5. Wait for SSL certificate to be provisioned"

echo ""
echo "🔍 Current DNS status:"
echo "DNS Record: $(nslookup promoteros.candlefish.ai | grep 'canonical name')"

echo ""
echo "⚡ Testing direct Netlify URL:"
curl -I https://promoteros.netlify.app 2>/dev/null | head -1

echo ""
echo "❌ Testing custom domain (expected to fail until configured):"
curl -I https://promoteros.candlefish.ai 2>&1 | head -1

echo ""
echo "🏁 To complete setup:"
echo "1. Add the domain through Netlify web interface"
echo "2. Wait for SSL certificate provisioning (can take up to 24 hours)"
echo "3. Test with: curl -I https://promoteros.candlefish.ai"
