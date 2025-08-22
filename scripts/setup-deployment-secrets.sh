#!/usr/bin/env bash
set -euo pipefail

# Setup all deployment secrets for GitHub from AWS Secrets Manager
# This script uses your existing AWS credentials and GitHub OAuth

echo "🔐 Setting up Candlefish AI Deployment Secrets"
echo "============================================="
echo ""

# Check prerequisites
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not installed. Install with: brew install gh"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not installed. Install with: brew install awscli"
    exit 1
fi

# Check GitHub auth
if ! gh auth status &> /dev/null; then
    echo "🔑 Authenticating with GitHub..."
    gh auth login
fi

# Repository
REPO="candlefish-ai/candlefish-ai"
echo "📦 Repository: $REPO"
echo ""

# Function to get secret from AWS
get_aws_secret() {
    local secret_name="$1"
    aws secretsmanager get-secret-value \
        --secret-id "$secret_name" \
        --query 'SecretString' \
        --output text 2>/dev/null || echo ""
}

# Function to get specific field from JSON secret
get_secret_field() {
    local secret_name="$1"
    local field="$2"
    local secret_json=$(get_aws_secret "$secret_name")
    if [ -n "$secret_json" ]; then
        echo "$secret_json" | jq -r ".${field} // empty" 2>/dev/null || echo ""
    fi
}

echo "📥 Fetching secrets from AWS Secrets Manager..."
echo ""

# ====================
# NETLIFY SECRETS
# ====================
echo "🌐 Setting up Netlify secrets..."

# Try multiple possible secret locations
NETLIFY_TOKEN=$(get_secret_field "candlefish/deployment/netlify" "auth_token")
if [ -z "$NETLIFY_TOKEN" ]; then
    NETLIFY_TOKEN=$(get_secret_field "netlify/auth" "token")
fi
if [ -z "$NETLIFY_TOKEN" ]; then
    NETLIFY_TOKEN=$(get_secret_field "candlefish/prod/netlify" "auth_token")
fi
if [ -z "$NETLIFY_TOKEN" ]; then
    # Check in environment-specific secrets
    NETLIFY_TOKEN=$(get_aws_secret "netlify/ibm-portfolio/auth-token")
fi

if [ -n "$NETLIFY_TOKEN" ]; then
    echo "  ✅ Found Netlify auth token"
    gh secret set NETLIFY_AUTH_TOKEN --repo "$REPO" --body "$NETLIFY_TOKEN"
    echo "  ✅ Set NETLIFY_AUTH_TOKEN"
else
    echo "  ⚠️  Netlify auth token not found in AWS"
fi

# Netlify Site IDs
PAINTBOX_SITE=$(get_secret_field "candlefish/deployment/netlify" "paintbox_site_id")
if [ -z "$PAINTBOX_SITE" ]; then
    PAINTBOX_SITE=$(get_secret_field "candlefish/prod/paintbox" "netlify_site_id")
fi
if [ -n "$PAINTBOX_SITE" ]; then
    gh secret set PAINTBOX_SITE_ID --repo "$REPO" --body "$PAINTBOX_SITE"
    echo "  ✅ Set PAINTBOX_SITE_ID"
else
    echo "  ⚠️  Paintbox site ID not found - will need manual setup"
fi

PROMOTEROS_SITE=$(get_secret_field "candlefish/deployment/netlify" "promoteros_site_id")
if [ -z "$PROMOTEROS_SITE" ]; then
    PROMOTEROS_SITE=$(get_secret_field "candlefish/prod/promoteros" "netlify_site_id")
fi
if [ -n "$PROMOTEROS_SITE" ]; then
    gh secret set PROMOTEROS_SITE_ID --repo "$REPO" --body "$PROMOTEROS_SITE"
    echo "  ✅ Set PROMOTEROS_SITE_ID"
else
    echo "  ⚠️  PromoterOS site ID not found - will need manual setup"
fi

CROWN_SITE=$(get_secret_field "candlefish/deployment/netlify" "crown_site_id")
if [ -z "$CROWN_SITE" ]; then
    CROWN_SITE=$(get_secret_field "candlefish/prod/crown-trophy" "netlify_site_id")
fi
if [ -n "$CROWN_SITE" ]; then
    gh secret set CROWN_SITE_ID --repo "$REPO" --body "$CROWN_SITE"
    echo "  ✅ Set CROWN_SITE_ID"
else
    echo "  ⚠️  Crown Trophy site ID not found - will need manual setup"
fi

echo ""

# ====================
# FLY.IO SECRETS
# ====================
echo "✈️  Setting up Fly.io secrets..."

FLY_TOKEN=$(get_secret_field "candlefish/deployment/flyio" "api_token")
if [ -z "$FLY_TOKEN" ]; then
    FLY_TOKEN=$(get_secret_field "flyio/api" "token")
fi
if [ -z "$FLY_TOKEN" ]; then
    FLY_TOKEN=$(get_secret_field "candlefish/prod/fly" "api_token")
fi

if [ -n "$FLY_TOKEN" ]; then
    gh secret set FLY_API_TOKEN --repo "$REPO" --body "$FLY_TOKEN"
    echo "  ✅ Set FLY_API_TOKEN"
else
    echo "  ⚠️  Fly.io API token not found in AWS"
fi

echo ""

# ====================
# GITHUB ENVIRONMENTS
# ====================
echo "🌍 Setting up GitHub Environments..."

# Create environments if they don't exist
echo "  Creating 'preview' environment..."
gh api -X PUT "repos/${REPO}/environments/preview" \
    -H "Accept: application/vnd.github+json" \
    -f wait_timer=0 \
    2>/dev/null || true

echo "  Creating 'production' environment..."
gh api -X PUT "repos/${REPO}/environments/production" \
    -H "Accept: application/vnd.github+json" \
    -f wait_timer=0 \
    -f deployment_branch_policy.protected_branches=true \
    -f deployment_branch_policy.custom_branch_policies=false \
    2>/dev/null || true

echo ""

# ====================
# ENVIRONMENT VARIABLES
# ====================
echo "🔧 Setting up Environment Variables..."

# AWS OIDC Role ARN
AWS_ROLE=$(get_secret_field "candlefish/deployment/aws" "github_actions_role_arn")
if [ -z "$AWS_ROLE" ]; then
    # Use default candlefish account role
    AWS_ROLE="arn:aws:iam::681214184463:role/github-actions"
fi

echo "  Setting AWS_ROLE_ARN for preview environment..."
gh variable set AWS_ROLE_ARN \
    --repo "$REPO" \
    --env preview \
    --body "${AWS_ROLE}-preview" 2>/dev/null || \
gh variable set AWS_ROLE_ARN \
    --repo "$REPO" \
    --env preview \
    --body "$AWS_ROLE"

echo "  Setting AWS_ROLE_ARN for production environment..."
gh variable set AWS_ROLE_ARN \
    --repo "$REPO" \
    --env production \
    --body "${AWS_ROLE}-prod" 2>/dev/null || \
gh variable set AWS_ROLE_ARN \
    --repo "$REPO" \
    --env production \
    --body "$AWS_ROLE"

# AWS Region
AWS_REGION="us-west-2"
echo "  Setting AWS_REGION for both environments..."
gh variable set AWS_REGION --repo "$REPO" --env preview --body "$AWS_REGION"
gh variable set AWS_REGION --repo "$REPO" --env production --body "$AWS_REGION"

echo ""
echo "  ✅ Environment variables configured"
echo ""

# ====================
# VERIFY SETUP
# ====================
echo "🔍 Verifying configuration..."
echo ""

echo "Repository Secrets:"
gh secret list --repo "$REPO" | head -10

echo ""
echo "Environment Variables (preview):"
gh variable list --repo "$REPO" --env preview 2>/dev/null || echo "  No variables set yet"

echo ""
echo "Environment Variables (production):"
gh variable list --repo "$REPO" --env production 2>/dev/null || echo "  No variables set yet"

echo ""
echo "============================================="
echo "✨ Deployment secrets setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. If any secrets were not found, create them manually:"
echo "     - Netlify: Get from https://app.netlify.com/user/applications"
echo "     - Fly.io: Run 'flyctl auth token'"
echo "  2. Verify AWS OIDC trust relationship is configured"
echo "  3. Test deployment with: gh workflow run deploy-monorepo.yml"
echo ""
echo "🚀 Ready to deploy!"
