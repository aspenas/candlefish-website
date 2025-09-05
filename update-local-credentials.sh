#!/bin/bash

# Local Credentials Update Script
# Run this AFTER the AWS rotation is complete and you have valid new AWS credentials

set -e

echo "🔧 Updating local AWS credentials..."
echo "⚠️  This will replace your current AWS credentials file"
echo

# Backup existing credentials
cp ~/.aws/credentials ~/.aws/credentials.backup.$(date +%Y%m%d_%H%M%S)
echo "📋 Backed up existing credentials to ~/.aws/credentials.backup.$(date +%Y%m%d_%H%M%S)"

# Create new credentials file with rotated values
cat > ~/.aws/credentials << 'EOF'
[default]
aws_access_key_id = AKIANMTYEA8GL7YTTU1L
aws_secret_access_key = C0-QN7bQ3mcOQKbltSpEO_gIf8n9UBvYveERN4RxdzBWdI3-R7c1aw
region = us-east-1

[candlefish]
aws_access_key_id = AKIANMTYEA8GL7YTTU1L
aws_secret_access_key = C0-QN7bQ3mcOQKbltSpEO_gIf8n9UBvYveERN4RxdzBWdI3-R7c1aw
region = us-east-1

[candlefish-prod]
aws_access_key_id = AKIANMTYEA8GL7YTTU1L
aws_secret_access_key = C0-QN7bQ3mcOQKbltSpEO_gIf8n9UBvYveERN4RxdzBWdI3-R7c1aw
region = us-east-1
EOF

echo "✅ Updated local AWS credentials with new keys"
echo
echo "🧪 Testing new credentials..."
if aws sts get-caller-identity; then
    echo "✅ New AWS credentials are working!"
else
    echo "❌ New credentials failed. Restoring backup..."
    cp ~/.aws/credentials.backup.$(date +%Y%m%d_%H%M%S) ~/.aws/credentials
fi

echo
echo "🔍 Next steps:"
echo "1. Verify AWS access with: aws sts get-caller-identity"
echo "2. Test Secrets Manager access with: aws secretsmanager list-secrets"
echo "3. Update applications to use the new secrets from AWS Secrets Manager"