#!/bin/bash

echo "=== Configuring Personal Domains on Netlify ==="

TOKEN=$(aws secretsmanager get-secret-value --secret-id "netlify/ibm-portfolio/auth-token" --query SecretString --output text | jq -r '.token')

# First, let's check the existing sites
echo -e "\n1. Checking existing personal sites..."
SITES=$(curl -s -H "Authorization: Bearer $TOKEN" "https://api.netlify.com/api/v1/sites" | jq -r '.[] | select(.name | contains("personal")) | {id: .id, name: .name, domain: .custom_domain, url: .default_domain}')

echo "$SITES" | jq '.'

# Update DNS instructions based on what we have
echo -e "\n=== DNS Configuration Required ==="
echo "Please configure these DNS records in Google Domains:"
echo ""
echo "For acupcake.shop:"
echo "  1. Go to https://domains.google.com"
echo "  2. Click on acupcake.shop"
echo "  3. Click on 'DNS' in the left menu"
echo "  4. Under 'Custom records', add:"
echo "     - Type: A | Name: @ | Data: 75.2.60.5 | TTL: 3600"
echo "     - Type: CNAME | Name: www | Data: personal-acupcake-shop.netlify.app | TTL: 3600"
echo ""
echo "For highline.work:"
echo "  1. Go to https://domains.google.com"
echo "  2. Click on highline.work"
echo "  3. Click on 'DNS' in the left menu"
echo "  4. Under 'Custom records', add:"
echo "     - Type: A | Name: @ | Data: 75.2.60.5 | TTL: 3600"
echo "     - Type: CNAME | Name: www | Data: personal-highline-work.netlify.app | TTL: 3600"
echo ""
echo "⚠️  IMPORTANT: Keep all MX records for email!"
echo ""
echo "=== Setting up Site Isolation ==="
echo "To prevent team members from accessing personal sites:"
echo ""
echo "1. Create a NEW Netlify team for Candlefish business:"
echo "   - Go to https://app.netlify.com/teams/new"
echo "   - Name it 'Candlefish Business'"
echo "   - Move all business sites to this team"
echo ""
echo "2. Keep personal sites in your personal account:"
echo "   - personal-acupcake-shop"
echo "   - personal-highline-work (to be created)"
echo ""
echo "3. When inviting Tyler, Aaron, and James:"
echo "   - Invite them ONLY to the 'Candlefish Business' team"
echo "   - They will NOT have access to your personal account sites"
echo ""
echo "=== Alternative: Use Netlify CLI locally ==="
echo "Since the CLI is having issues, you can also:"
echo "1. Go to https://app.netlify.com"
echo "2. Click 'Add new site' > 'Deploy manually'"
echo "3. Create site named 'personal-highline-work'"
echo "4. Add custom domain highline.work"
echo "5. Configure DNS as shown above"

# Check DNS propagation
echo -e "\n=== Current DNS Status ==="
echo "acupcake.shop:"
dig +short acupcake.shop A
dig +short www.acupcake.shop CNAME

echo -e "\nhighline.work:"
dig +short highline.work A
dig +short www.highline.work CNAME
