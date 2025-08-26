#!/bin/bash

# Check AWS SES verification status and provide guidance

echo "🔍 AWS SES Status Check for candlefish.ai"
echo "=========================================="
echo ""

# Check domain and email verification
echo "📧 Verification Status:"
aws ses get-identity-verification-attributes \
    --identities candlefish.ai patrick@candlefish.ai \
    --region us-east-1 \
    --output json | jq -r '.VerificationAttributes | to_entries[] | "  \(.key): \(.value.VerificationStatus)"'

echo ""

# Check DKIM status
echo "🔐 DKIM Status:"
aws ses get-identity-dkim-attributes \
    --identities candlefish.ai \
    --region us-east-1 \
    --output json | jq -r '.DkimAttributes.["candlefish.ai"] | "  Enabled: \(.DkimEnabled)\n  Status: \(.DkimVerificationStatus)"'

echo ""

# Check sending quota (sandbox status)
echo "📊 Sending Quota (Sandbox Status):"
quota=$(aws ses get-send-quota --region us-east-1 --output json)
max_24hr=$(echo "$quota" | jq -r '.Max24HourSend')
max_rate=$(echo "$quota" | jq -r '.MaxSendRate')
sent_24hr=$(echo "$quota" | jq -r '.SentLast24Hours')

echo "  Daily limit: $max_24hr emails"
echo "  Send rate: $max_rate per second"
echo "  Sent today: $sent_24hr"

if [ "$max_24hr" = "200" ]; then
    echo "  ⚠️  Status: SANDBOX MODE"
else
    echo "  ✅ Status: PRODUCTION MODE"
fi

echo ""

# Check DNS records
echo "🌐 DNS Record Status:"
echo -n "  Domain verification TXT: "
if dig TXT _amazonses.candlefish.ai @8.8.8.8 +short | grep -q "liicSomu"; then
    echo "✅ Present"
else
    echo "❌ Missing or not propagated"
fi

echo -n "  SPF record: "
if dig TXT candlefish.ai @8.8.8.8 +short | grep -q "spf1"; then
    echo "✅ Present"
else
    echo "❌ Missing"
fi

echo -n "  DMARC record: "
if dig TXT _dmarc.candlefish.ai @8.8.8.8 +short | grep -q "DMARC1"; then
    echo "✅ Present"
else
    echo "❌ Missing"
fi

echo -n "  DKIM record (sample): "
if dig CNAME 6gdr23zgrmihk4albjcz3dmezm732rcl._domainkey.candlefish.ai @8.8.8.8 +short | grep -q "dkim.amazonses.com"; then
    echo "✅ Present"
else
    echo "❌ Missing or not propagated"
fi

echo ""
echo "=========================================="

# Check if everything is verified
domain_status=$(aws ses get-identity-verification-attributes --identities candlefish.ai --region us-east-1 --output json | jq -r '.VerificationAttributes.["candlefish.ai"].VerificationStatus')
email_status=$(aws ses get-identity-verification-attributes --identities patrick@candlefish.ai --region us-east-1 --output json | jq -r '.VerificationAttributes.["patrick@candlefish.ai"].VerificationStatus')
dkim_status=$(aws ses get-identity-dkim-attributes --identities candlefish.ai --region us-east-1 --output json | jq -r '.DkimAttributes.["candlefish.ai"].DkimVerificationStatus')

if [ "$domain_status" = "Success" ] && [ "$email_status" = "Success" ]; then
    echo "✅ Domain and email are VERIFIED!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Test sending an email:"
    echo "   aws ses send-email \\"
    echo "     --from patrick@candlefish.ai \\"
    echo "     --to patrick@candlefish.ai \\"
    echo "     --subject 'SES Test' \\"
    echo "     --text 'This is a test email from AWS SES' \\"
    echo "     --region us-east-1"
    echo ""
    if [ "$max_24hr" = "200" ]; then
        echo "2. Request production access to exit sandbox mode:"
        echo "   Go to: https://console.aws.amazon.com/ses/home?region=us-east-1#/account"
        echo "   Click 'Request production access'"
        echo "   Use the template in: docs/ses-production-request.md"
    else
        echo "2. You're in production mode! You can send to any email address."
    fi
elif [ "$email_status" = "Pending" ]; then
    echo "⏳ Email verification pending..."
    echo "Please check your email (patrick@candlefish.ai) for the verification link from AWS."
    echo "Click the link to verify the email address."
else
    echo "⏳ Verification still pending..."
    echo "DNS records may take 5-15 minutes to propagate."
    echo "Run this script again in a few minutes."
fi

echo ""
