#!/bin/bash

# Deploy Security Fixes for Tyler Setup
# This script deploys the critical security fixes to production

set -e

echo "🔒 Deploying Critical Security Fixes..."
echo "=================================="

# Check current directory
if [ ! -f "serverless.yml" ]; then
    echo "❌ Error: Must run from serverless-lean directory"
    exit 1
fi

# Verify AWS credentials
echo "✅ Checking AWS credentials..."
aws sts get-caller-identity > /dev/null 2>&1 || {
    echo "❌ Error: AWS credentials not configured"
    exit 1
}

# Run tests first
echo "🧪 Running security tests..."
if [ -f "test-auth-fix.js" ]; then
    node test-auth-fix.js || {
        echo "❌ Error: Security tests failed"
        exit 1
    }
fi

# Deploy to production
echo "🚀 Deploying to production..."
serverless deploy --stage prod --verbose

# Verify deployment
echo "✅ Verifying deployment..."
API_URL=$(serverless info --stage prod --verbose | grep "endpoint:" | head -1 | awk '{print $2}')

if [ -z "$API_URL" ]; then
    echo "❌ Error: Could not determine API URL"
    exit 1
fi

# Test health endpoint
echo "🏥 Testing health endpoint..."
curl -s "${API_URL}/health" | grep -q "healthy" && echo "✅ Health check passed" || {
    echo "❌ Error: Health check failed"
    exit 1
}

echo ""
echo "=================================="
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "=================================="
echo ""
echo "⚠️  CRITICAL POST-DEPLOYMENT STEPS:"
echo "1. Force password reset for all existing users"
echo "2. Rotate JWT secrets in AWS Secrets Manager:"
echo "   aws secretsmanager rotate-secret --secret-id candlefish-employee-setup-lean-prod/jwt-secret"
echo "3. Test new user creation and login flow"
echo "4. Monitor CloudWatch logs for any errors"
echo ""
echo "📊 Deployment Info:"
echo "API Endpoint: ${API_URL}"
echo "Stage: prod"
echo "Region: ${AWS_REGION:-us-east-1}"
echo ""
echo "🔒 Security Fixes Applied:"
echo "✅ Argon2 password hashing implemented"
echo "✅ Hardcoded JWT secrets removed"
echo "✅ S3 bucket security hardened"
echo ""
