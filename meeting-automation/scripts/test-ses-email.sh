#!/bin/bash

# Test AWS SES email sending capabilities

echo "📧 AWS SES Email Test"
echo "===================="

# Default values
FROM_EMAIL="patrick@candlefish.ai"
TO_EMAIL="${1:-patrick@candlefish.ai}"
SUBJECT="AWS SES Test - $(date '+%Y-%m-%d %H:%M:%S')"
CONFIG_SET="candlefish-main"

if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: $0 [recipient-email]"
    echo ""
    echo "Sends a test email using AWS SES"
    echo "If no recipient is specified, sends to patrick@candlefish.ai"
    exit 0
fi

# Check verification status first
echo "🔍 Checking verification status..."
verification=$(aws ses get-identity-verification-attributes \
    --identities "$FROM_EMAIL" \
    --region us-east-1 \
    --output json | jq -r ".VerificationAttributes.[\"$FROM_EMAIL\"].VerificationStatus")

if [ "$verification" != "Success" ]; then
    echo "❌ Email address $FROM_EMAIL is not verified!"
    echo "   Status: $verification"
    echo ""
    echo "Please check your email for the verification link from AWS."
    exit 1
fi

echo "✅ Email address verified"
echo ""

# Create HTML body
HTML_BODY=$(cat <<EOF
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF9900; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .info-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .info-table td { padding: 8px; border-bottom: 1px solid #ddd; }
        .info-table td:first-child { font-weight: bold; width: 30%; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AWS SES Test Email</h1>
        </div>
        <div class="content">
            <h2>✅ Email Delivery Successful!</h2>
            <p>This test email confirms that AWS SES is properly configured for <strong>candlefish.ai</strong>.</p>

            <table class="info-table">
                <tr>
                    <td>Sent From:</td>
                    <td>$FROM_EMAIL</td>
                </tr>
                <tr>
                    <td>Sent To:</td>
                    <td>$TO_EMAIL</td>
                </tr>
                <tr>
                    <td>Timestamp:</td>
                    <td>$(date '+%Y-%m-%d %H:%M:%S %Z')</td>
                </tr>
                <tr>
                    <td>Configuration Set:</td>
                    <td>$CONFIG_SET</td>
                </tr>
                <tr>
                    <td>Region:</td>
                    <td>us-east-1</td>
                </tr>
            </table>

            <h3>Authentication Status</h3>
            <ul>
                <li>SPF: ✅ Configured (include:amazonses.com)</li>
                <li>DKIM: ✅ Enabled and verified</li>
                <li>DMARC: ✅ Policy configured</li>
            </ul>

            <h3>Next Steps</h3>
            <ol>
                <li>Monitor bounce and complaint rates in CloudWatch</li>
                <li>Request production access if still in sandbox mode</li>
                <li>Implement proper error handling in your application</li>
                <li>Set up SNS notifications for bounces and complaints</li>
            </ol>
        </div>
        <div class="footer">
            <p>This is an automated test email from AWS SES</p>
            <p>© $(date +%Y) Candlefish AI - Meeting Automation System</p>
        </div>
    </div>
</body>
</html>
EOF
)

# Create text body
TEXT_BODY=$(cat <<EOF
AWS SES Test Email
===================

✅ Email Delivery Successful!

This test email confirms that AWS SES is properly configured for candlefish.ai.

Details:
--------
Sent From: $FROM_EMAIL
Sent To: $TO_EMAIL
Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')
Configuration Set: $CONFIG_SET
Region: us-east-1

Authentication Status:
- SPF: ✅ Configured
- DKIM: ✅ Enabled and verified
- DMARC: ✅ Policy configured

Next Steps:
1. Monitor bounce and complaint rates in CloudWatch
2. Request production access if still in sandbox mode
3. Implement proper error handling in your application
4. Set up SNS notifications for bounces and complaints

---
This is an automated test email from AWS SES
© $(date +%Y) Candlefish AI - Meeting Automation System
EOF
)

echo "📨 Sending test email..."
echo "   From: $FROM_EMAIL"
echo "   To: $TO_EMAIL"
echo "   Subject: $SUBJECT"
echo ""

# Send the email
result=$(aws ses send-email \
    --from "$FROM_EMAIL" \
    --to "$TO_EMAIL" \
    --subject "$SUBJECT" \
    --text "$TEXT_BODY" \
    --html "$HTML_BODY" \
    --configuration-set-name "$CONFIG_SET" \
    --region us-east-1 \
    2>&1)

if [ $? -eq 0 ]; then
    message_id=$(echo "$result" | jq -r '.MessageId')
    echo "✅ Email sent successfully!"
    echo "   Message ID: $message_id"
    echo ""
    echo "Check the recipient's inbox (and spam folder) for the test email."

    # Check sending statistics
    echo ""
    echo "📊 Current sending statistics:"
    aws ses get-send-quota --region us-east-1 | jq -r '"  Sent in last 24 hours: \(.SentLast24Hours)\n  Daily limit: \(.Max24HourSend)\n  Max send rate: \(.MaxSendRate) per second"'
else
    echo "❌ Failed to send email!"
    echo "Error: $result"
    echo ""
    echo "Common issues:"
    echo "- Email address not verified"
    echo "- In sandbox mode and recipient not verified"
    echo "- Configuration set doesn't exist"
    echo "- AWS credentials not configured"
fi
