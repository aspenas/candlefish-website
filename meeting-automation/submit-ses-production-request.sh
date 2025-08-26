#!/bin/bash

# AWS SES Production Access Request Submission Script
# This script helps submit the production access request through AWS Support

echo "=========================================="
echo "AWS SES Production Access Request Process"
echo "=========================================="
echo ""

# Check current SES status
echo "Current SES Sandbox Status:"
echo "---------------------------"
aws ses get-send-quota --region us-east-1 | jq '.'
echo ""

echo "Verified Identities:"
echo "-------------------"
aws ses list-identities --region us-east-1 | jq '.'
echo ""

# Instructions for manual submission
cat << 'EOF'
========================================
SUBMISSION INSTRUCTIONS
========================================

Since AWS SES production access requests must be submitted through the AWS Support Center
or SES Console, please follow these steps:

OPTION 1: Via AWS Support Center (Recommended)
-----------------------------------------------
1. Open AWS Support Center:
   https://console.aws.amazon.com/support/home

2. Click "Create case"

3. Select:
   - Service: Amazon Simple Email Service (SES)
   - Category: Service Limit Increase
   - Limit Type: SES Sending Limits

4. Case Details:
   - Subject: "Production Access Request for Candlefish.ai - Transactional Meeting Emails"
   - Region: US East (N. Virginia)
   - Limit: SES Daily Sending Quota
   - New limit value: 50,000 (provides room for growth)

5. Copy and paste the content from: aws-ses-production-request.md

6. Attach any supporting documentation if available

7. Submit the case


OPTION 2: Via SES Console
--------------------------
1. Open SES Console:
   https://console.aws.amazon.com/ses/home?region=us-east-1

2. Navigate to "Account dashboard"

3. Look for "Request production access" button

4. Fill out the form with information from aws-ses-production-request.md


OPTION 3: Via AWS CLI (if available in your region)
----------------------------------------------------
EOF

# Try to create a support case via CLI (this may not work in all accounts)
echo ""
echo "Attempting to create support case via CLI..."
echo "============================================="

# Create the support case JSON
cat > ses-support-case.json << 'EOF'
{
  "subject": "Production Access Request for Candlefish.ai - Transactional Meeting Emails",
  "serviceCode": "amazon-ses",
  "severityCode": "low",
  "categoryCode": "service-limit-increase",
  "communicationBody": "Please see the attached detailed request for AWS SES production access. We are requesting to exit sandbox mode to send transactional meeting invitations to business professionals.\n\nCompany: Candlefish.ai\nUse Case: Business meeting scheduling and coordination\nVolume: 500-1000 emails per month\nDomain: candlefish.ai (verified with DKIM, SPF, DMARC)\n\nWe have implemented comprehensive bounce and complaint handling via SNS, and commit to maintaining best practices for email deliverability.",
  "ccEmailAddresses": ["patrick@candlefish.ai"],
  "language": "en"
}
EOF

# Try to submit via CLI
echo "Attempting to submit support case..."
aws support create-case --cli-input-json file://ses-support-case.json 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Support case created successfully!"
    echo "Check your email for case updates."
else
    echo ""
    echo "⚠️  Could not create support case via CLI."
    echo "This is normal if you don't have AWS Support API access."
    echo "Please use Option 1 or 2 above to submit manually."
fi

echo ""
echo "=========================================="
echo "IMPORTANT REMINDERS"
echo "=========================================="
echo "1. Response time is typically 24-48 hours"
echo "2. Be prepared to provide additional information if requested"
echo "3. Start with conservative limits and increase as needed"
echo "4. Monitor your metrics closely after approval"
echo ""
echo "Your request document is saved at:"
echo "  aws-ses-production-request.md"
echo ""
echo "Good luck with your application!"
