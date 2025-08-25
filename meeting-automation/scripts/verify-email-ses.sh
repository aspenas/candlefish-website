#!/bin/bash

# Script to verify an email address in AWS SES for immediate sending
# Usage: ./verify-email-ses.sh email@example.com

EMAIL="$1"

if [ -z "$EMAIL" ]; then
    echo "Usage: $0 <email-address>"
    echo "Example: $0 partner@example.com"
    exit 1
fi

echo "Verifying email address: $EMAIL"
aws ses verify-email-identity --email-address "$EMAIL" --region us-east-1

echo ""
echo "Verification email sent to $EMAIL"
echo "The recipient must click the verification link in their email before you can send to them."
echo ""
echo "To check verification status:"
echo "aws ses get-identity-verification-attributes --identities $EMAIL --region us-east-1"