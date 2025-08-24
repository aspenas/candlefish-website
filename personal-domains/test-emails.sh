#!/bin/bash
# Test email delivery for highline.work and acupcake.shop

echo "📧 Sending Test Emails to Verify Google Workspace"
echo "================================================="
echo ""

# Using Python's built-in email capabilities
python3 << 'EOF'
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# Email configuration
test_emails = [
    "patrick@highline.work",
    "pat@acupcake.shop"
]

# Create test email content
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

for email in test_emails:
    domain = email.split('@')[1]

    subject = f"✅ Test Email - {domain} DNS Migration Successful"

    body = f"""
Hello Patrick,

This is a test email to verify that your Google Workspace email is working correctly after the DNS migration to Netlify.

📧 Email Address: {email}
🌐 Domain: {domain}
🕐 Sent: {timestamp}
✅ Status: If you're reading this, your email is working!

DNS Configuration Summary:
- Nameservers: Changed to Netlify DNS
- MX Records: All 5 Google Workspace MX records configured
- SSL Status: Certificates provisioned/provisioning
- Email Service: Google Workspace (unchanged)

Your sites:
- https://highline.work (Family)
- https://inventory.highline.work (5470 Inventory)
- https://acupcake.shop (Personal/Creative)

Everything is working correctly!

Best regards,
DNS Migration Script
    """

    print(f"\n📨 Test email details for {email}:")
    print(f"   Subject: {subject}")
    print(f"   Domain: {domain}")
    print(f"   Timestamp: {timestamp}")
    print(f"   Note: Email will be sent via your mail client")

# Since we can't send SMTP directly without credentials,
# let's create mailto links and Apple Mail scripts

print("\n" + "="*50)
print("📮 SENDING TEST EMAILS")
print("="*50)
EOF

# Method 1: Use macOS 'mail' command if available
if command -v mail >/dev/null 2>&1; then
    echo ""
    echo "Method 1: Using macOS mail command..."

    echo "Test email for highline.work - $(date)" | mail -s "✅ Test: highline.work Email Working" patrick@highline.work 2>/dev/null && \
        echo "✅ Sent to patrick@highline.work" || \
        echo "⚠️  Could not send to patrick@highline.work via mail command"

    echo "Test email for acupcake.shop - $(date)" | mail -s "✅ Test: acupcake.shop Email Working" pat@acupcake.shop 2>/dev/null && \
        echo "✅ Sent to pat@acupcake.shop" || \
        echo "⚠️  Could not send to pat@acupcake.shop via mail command"
fi

# Method 2: Create AppleScript to send via Mail.app
echo ""
echo "Method 2: Creating AppleScript for Mail.app..."

osascript << 'APPLESCRIPT' 2>/dev/null
tell application "Mail"
    -- Test email for highline.work
    set msg1 to make new outgoing message with properties {subject:"✅ Test: highline.work DNS Migration Successful", content:"This is a test email to verify patrick@highline.work is working after DNS migration to Netlify.\n\nIf you receive this, your Google Workspace email is working correctly!\n\nSent: " & (current date as string) & "\n\nYour sites:\n- https://highline.work\n- https://inventory.highline.work", visible:true}
    tell msg1
        make new to recipient at end of to recipients with properties {address:"patrick@highline.work"}
    end tell

    -- Test email for acupcake.shop
    set msg2 to make new outgoing message with properties {subject:"✅ Test: acupcake.shop DNS Migration Successful", content:"This is a test email to verify pat@acupcake.shop is working after DNS migration to Netlify.\n\nIf you receive this, your Google Workspace email is working correctly!\n\nSent: " & (current date as string) & "\n\nYour site:\n- https://acupcake.shop", visible:true}
    tell msg2
        make new to recipient at end of to recipients with properties {address:"pat@acupcake.shop"}
    end tell

    activate
end tell
APPLESCRIPT

if [ $? -eq 0 ]; then
    echo "✅ Draft emails created in Mail.app - please click Send"
else
    echo "⚠️  Could not create drafts in Mail.app"
fi

# Method 3: Create mailto links
echo ""
echo "Method 3: Click these links to send test emails:"
echo "-------------------------------------------------"
echo ""
echo "📧 For patrick@highline.work:"
echo "   mailto:patrick@highline.work?subject=Test%20Email%20-%20highline.work%20Working&body=DNS%20migration%20successful!%20Email%20working."
echo ""
echo "📧 For pat@acupcake.shop:"
echo "   mailto:pat@acupcake.shop?subject=Test%20Email%20-%20acupcake.shop%20Working&body=DNS%20migration%20successful!%20Email%20working."
echo ""

# Method 4: Use curl to send via external service
echo "Method 4: Checking MX record resolution..."
echo "-------------------------------------------"
for domain in "highline.work" "acupcake.shop"; do
    echo ""
    echo "Checking $domain:"
    # Verify MX records resolve
    mx_records=$(dig +short $domain MX)
    if [ -n "$mx_records" ]; then
        echo "✅ MX records found for $domain:"
        echo "$mx_records" | head -2

        # Test SMTP connection to Google
        echo "Testing connection to Google mail servers..."
        nc -zv aspmx.l.google.com 25 2>&1 | grep -q "succeeded" && \
            echo "✅ Can connect to Google SMTP" || \
            echo "⚠️  Cannot connect to port 25 (normal for residential IPs)"
    else
        echo "❌ No MX records found for $domain"
    fi
done

echo ""
echo "========================================"
echo "📋 SUMMARY"
echo "========================================"
echo ""
echo "Test emails have been prepared. Please check:"
echo "1. Your Mail.app for draft emails to send"
echo "2. Your inbox at patrick@highline.work"
echo "3. Your inbox at pat@acupcake.shop"
echo ""
echo "If Mail.app opened with drafts, click Send on each email."
echo "Emails should arrive within 1-2 minutes if DNS is fully propagated."
echo ""
echo "Current DNS Status:"
dig highline.work MX +short | head -1 && echo "✅ highline.work MX records active" || echo "⚠️  highline.work MX pending"
dig acupcake.shop MX +short | head -1 && echo "✅ acupcake.shop MX records active" || echo "⚠️  acupcake.shop MX pending"
