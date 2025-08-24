#!/bin/bash
# Setup DNS for inventory.highline.work

echo "📡 Setting up DNS for inventory.highline.work"
echo "==========================================="
echo ""
echo "Since Squarespace doesn't have a public API for DNS management,"
echo "you'll need to add this record manually in your Squarespace account:"
echo ""
echo "1. Go to: https://account.squarespace.com/domains/managed/highline.work/dns-settings"
echo ""
echo "2. Click 'Add Record' and enter:"
echo "   Type: CNAME"
echo "   Host: inventory"
echo "   Data: highline-inventory.netlify.app"
echo "   TTL: 3600 (or leave default)"
echo ""
echo "3. Save the record"
echo ""
echo "After adding the record, we can verify and provision the SSL certificate."
echo ""
read -p "Press Enter after you've added the DNS record..."

# Verify DNS propagation
echo ""
echo "Checking DNS propagation..."
for i in {1..10}; do
    RESULT=$(dig inventory.highline.work CNAME +short 2>/dev/null)
    if [ ! -z "$RESULT" ]; then
        echo "✅ DNS record found: $RESULT"
        break
    else
        echo "⏳ Waiting for DNS propagation... (attempt $i/10)"
        sleep 10
    fi
done

# If DNS is set up, provision SSL certificate
if [ ! -z "$RESULT" ]; then
    echo ""
    echo "Provisioning SSL certificate..."

    # Force SSL certificate renewal
    netlify api provisionSiteTLSCertificate \
        --data '{"site_id": "9ebc8d1d-e31b-4c29-afe4-1905a7503d4a", "certificate": true}' \
        2>/dev/null || echo "Certificate provisioning initiated"

    echo ""
    echo "⏳ Waiting for SSL certificate..."
    sleep 5

    # Check certificate status
    CERT_STATUS=$(netlify api showSiteTLSCertificate \
        --data '{"site_id": "9ebc8d1d-e31b-4c29-afe4-1905a7503d4a"}' \
        2>/dev/null | jq -r '.state')

    if [ "$CERT_STATUS" = "issued" ]; then
        echo "✅ SSL certificate issued successfully!"
        echo ""
        echo "Site is now live at: https://inventory.highline.work"
    else
        echo "⚠️  Certificate status: $CERT_STATUS"
        echo "It may take a few minutes for the certificate to be issued."
        echo "Check status at: https://app.netlify.com/sites/highline-inventory/settings/domain"
    fi
else
    echo ""
    echo "❌ DNS record not found after 100 seconds."
    echo "Please add the CNAME record manually and run this script again."
fi

echo ""
echo "Additional verification commands:"
echo "  dig inventory.highline.work CNAME"
echo "  curl -I https://inventory.highline.work"
echo "  netlify api showSiteTLSCertificate --data '{\"site_id\": \"9ebc8d1d-e31b-4c29-afe4-1905a7503d4a\"}'"
