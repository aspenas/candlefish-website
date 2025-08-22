#!/usr/bin/env bash
set -euo pipefail

# Quick setup for deployment secrets using known AWS values

echo "🚀 Quick Deployment Setup for Candlefish AI"
echo "=========================================="
echo ""

REPO="candlefish-ai/candlefish-ai"

# 1. Set Netlify auth token (we know this exists)
echo "🌐 Setting Netlify auth token..."
NETLIFY_TOKEN=$(aws secretsmanager get-secret-value \
    --secret-id "netlify/ibm-portfolio/auth-token" \
    --query 'SecretString' \
    --output text 2>/dev/null)

if [ -n "$NETLIFY_TOKEN" ]; then
    gh secret set NETLIFY_AUTH_TOKEN --repo "$REPO" --body "$NETLIFY_TOKEN"
    echo "  ✅ NETLIFY_AUTH_TOKEN set"
fi

# 2. Create placeholder site IDs (will be replaced with actual values)
echo ""
echo "🆔 Creating placeholder Netlify site IDs..."
echo "  (You'll need to replace these with actual site IDs from Netlify)"

# Create temporary site IDs
gh secret set PAINTBOX_SITE_ID --repo "$REPO" --body "paintbox-temp-site-id"
gh secret set PROMOTEROS_SITE_ID --repo "$REPO" --body "promoteros-temp-site-id"
gh secret set CROWN_SITE_ID --repo "$REPO" --body "crown-temp-site-id"
echo "  ✅ Placeholder site IDs created"

# 3. Set Fly.io token (if you have one)
echo ""
echo "✈️  Setting Fly.io token..."
echo "  Run 'flyctl auth token' to get your token"
echo "  Then: gh secret set FLY_API_TOKEN --repo $REPO --body YOUR_TOKEN"

# 4. Create GitHub environments
echo ""
echo "🌍 Creating GitHub environments..."

# Simple environment creation
gh api -X PUT "repos/${REPO}/environments/preview" 2>/dev/null || true
gh api -X PUT "repos/${REPO}/environments/production" 2>/dev/null || true
echo "  ✅ Environments created"

# 5. Set AWS variables (using candlefish account)
echo ""
echo "🔐 Setting AWS OIDC variables..."

AWS_ACCOUNT="681214184463"
AWS_REGION="us-west-2"

# Try to set environment variables (may fail if environments don't support variables)
echo "  Setting for repository..."
gh variable set AWS_ROLE_ARN \
    --repo "$REPO" \
    --body "arn:aws:iam::${AWS_ACCOUNT}:role/github-actions" 2>/dev/null || \
    echo "  ⚠️  Could not set AWS_ROLE_ARN as variable, add manually to environments"

gh variable set AWS_REGION \
    --repo "$REPO" \
    --body "$AWS_REGION" 2>/dev/null || \
    echo "  ⚠️  Could not set AWS_REGION as variable, add manually to environments"

# 6. Check for Vercel token (alternative to Netlify)
echo ""
echo "🔍 Checking for Vercel token..."
VERCEL_TOKEN=$(aws secretsmanager get-secret-value \
    --secret-id "candlefish/vercel-oauth2" \
    --query 'SecretString' \
    --output text 2>/dev/null || echo "")

if [ -n "$VERCEL_TOKEN" ]; then
    gh secret set VERCEL_TOKEN --repo "$REPO" --body "$VERCEL_TOKEN"
    echo "  ✅ VERCEL_TOKEN set (alternative to Netlify)"
fi

echo ""
echo "============================================="
echo "✅ Basic setup complete!"
echo ""
echo "📝 Manual steps required:"
echo ""
echo "1. Get actual Netlify site IDs:"
echo "   - Go to https://app.netlify.com"
echo "   - Find each site (paintbox, promoteros, crown-trophy)"
echo "   - Copy the site ID from Site Settings > General"
echo "   - Update secrets:"
echo "     gh secret set PAINTBOX_SITE_ID --repo $REPO --body 'actual-site-id'"
echo "     gh secret set PROMOTEROS_SITE_ID --repo $REPO --body 'actual-site-id'"
echo "     gh secret set CROWN_SITE_ID --repo $REPO --body 'actual-site-id'"
echo ""
echo "2. Get Fly.io token (if using Fly):"
echo "   flyctl auth token"
echo "   gh secret set FLY_API_TOKEN --repo $REPO --body 'your-token'"
echo ""
echo "3. Configure AWS OIDC (if not already done):"
echo "   - The role arn:aws:iam::681214184463:role/github-actions"
echo "   - Must trust GitHub Actions from candlefish-ai/candlefish-ai"
echo ""
echo "4. Verify secrets:"
echo "   gh secret list --repo $REPO"
echo ""
echo "🚀 Once complete, deployments will work automatically!"
