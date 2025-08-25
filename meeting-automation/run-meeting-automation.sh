#!/bin/bash

# Candlefish Meeting Automation Runner
# Uses patrick@candlefish.ai and Candlefish Zoom account

set -e

echo "🚀 Candlefish Meeting Automation System"
echo "========================================"
echo "Organizer: patrick@candlefish.ai"
echo "Zoom Account: Candlefish.ai"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  cd /Users/patricksmith/candlefish-ai/meeting-automation
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Load AWS credentials for Zoom and Read.ai
echo "🔐 Loading credentials from AWS Secrets Manager..."

# Export Zoom credentials
export CANDLEFISH_ZOOM_ACCOUNT_ID=$(aws secretsmanager get-secret-value \
  --secret-id zoom-api-credentials \
  --region us-east-1 \
  --query SecretString \
  --output text | jq -r '.account_id')

export CANDLEFISH_ZOOM_CLIENT_ID=$(aws secretsmanager get-secret-value \
  --secret-id zoom-api-credentials \
  --region us-east-1 \
  --query SecretString \
  --output text | jq -r '.client_id')

export CANDLEFISH_ZOOM_CLIENT_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id zoom-api-credentials \
  --region us-east-1 \
  --query SecretString \
  --output text | jq -r '.client_secret')

# Set AWS SES as email provider
export EMAIL_PROVIDER=ses
export AWS_REGION=us-east-1

echo "✅ Credentials loaded"
echo ""
echo "📅 Meeting Configuration:"
echo "  Title: Candlefish.ai × Retti — Working Session"
echo "  Date: August 29, 2025"
echo "  Time: 3:00 PM - 4:00 PM MDT"
echo "  Attendees: erusin@retti.com, katie@retti.com, jon@jdenver.com"
echo ""
echo "Starting automation..."
echo "----------------------------------------"

# Run the automation
node src/index.js

echo ""
echo "✅ Meeting automation complete!"
echo ""
echo "📧 Check the following files for details:"
echo "  • zoom_meeting.json - Zoom meeting details"
echo "  • read_ai_summary.json - Read.ai scheduling info"
echo "  • email_send.json - Email delivery confirmation"
echo "  • meeting_dispatch_summary.json - Complete summary"
echo "  • calendar/Candlefish-Meeting.ics - Calendar invite"