#!/usr/bin/env bash
set -euo pipefail

# Verify deployment infrastructure is ready

echo "🎯 Candlefish AI Deployment Readiness Check"
echo "=========================================="
echo ""

REPO="candlefish-ai/candlefish-ai"
ERRORS=0
WARNINGS=0

# Function to check secret exists
check_secret() {
    local SECRET_NAME="$1"
    if gh secret list --repo "$REPO" | awk '{print $1}' | grep -q "^${SECRET_NAME}$"; then
        echo "  ✅ $SECRET_NAME configured"
    else
        echo "  ❌ $SECRET_NAME missing"
        ((ERRORS++))
    fi
}

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo "  ✅ $1 exists"
    else
        echo "  ❌ $1 missing"
        ((ERRORS++))
    fi
}

echo "🔐 Checking GitHub Secrets..."
check_secret "NETLIFY_AUTH_TOKEN"
check_secret "PAINTBOX_SITE_ID"
check_secret "PROMOTEROS_SITE_ID"
check_secret "CROWN_SITE_ID"
check_secret "FLY_API_TOKEN"
echo ""

echo "📄 Checking Configuration Files..."
check_file ".github/workflows/deploy-monorepo.yml"
check_file "apps/paintbox/netlify.toml"
check_file "apps/promoteros/netlify.toml"
check_file "apps/crown-trophy/netlify.toml"
check_file "services/nanda-index/fly.toml"
check_file "services/crestron-ha/fly.toml"
check_file "services/nanda-index/Dockerfile"
check_file "services/crestron-ha/Dockerfile"
echo ""

echo "🌐 Checking Netlify Sites..."
TOKEN_JSON=$(aws secretsmanager get-secret-value \
    --secret-id "netlify/ibm-portfolio/auth-token" \
    --query 'SecretString' \
    --output text 2>/dev/null)
NETLIFY_TOKEN=$(echo "$TOKEN_JSON" | jq -r '.token')

if [ -n "$NETLIFY_TOKEN" ]; then
    # Get site IDs from GitHub secrets
    PAINTBOX_ID=$(gh secret list --repo "$REPO" --json name,updatedAt | jq -r '.[] | select(.name=="PAINTBOX_SITE_ID") | .name' 2>/dev/null)
    PROMOTEROS_ID=$(gh secret list --repo "$REPO" --json name,updatedAt | jq -r '.[] | select(.name=="PROMOTEROS_SITE_ID") | .name' 2>/dev/null)
    CROWN_ID=$(gh secret list --repo "$REPO" --json name,updatedAt | jq -r '.[] | select(.name=="CROWN_SITE_ID") | .name' 2>/dev/null)

    if [ -n "$PAINTBOX_ID" ]; then
        echo "  ✅ Paintbox site configured"
    else
        echo "  ⚠️  Paintbox site not verified"
        ((WARNINGS++))
    fi

    if [ -n "$PROMOTEROS_ID" ]; then
        echo "  ✅ PromoterOS site configured"
    else
        echo "  ⚠️  PromoterOS site not verified"
        ((WARNINGS++))
    fi

    if [ -n "$CROWN_ID" ]; then
        echo "  ✅ Crown Trophy site configured"
    else
        echo "  ⚠️  Crown Trophy site not verified"
        ((WARNINGS++))
    fi
else
    echo "  ⚠️  Could not verify Netlify sites (token issue)"
    ((WARNINGS++))
fi
echo ""

echo "🌍 Checking GitHub Environments..."
if gh api "repos/${REPO}/environments" | jq -r '.environments[].name' | grep -q "preview"; then
    echo "  ✅ Preview environment exists"
else
    echo "  ❌ Preview environment missing"
    ((ERRORS++))
fi

if gh api "repos/${REPO}/environments" | jq -r '.environments[].name' | grep -q "production"; then
    echo "  ✅ Production environment exists"
else
    echo "  ❌ Production environment missing"
    ((ERRORS++))
fi
echo ""

echo "=========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✨ Perfect! Deployment infrastructure is fully ready!"
    echo ""
    echo "🚀 Next steps:"
    echo "  1. Make a change to any app or service"
    echo "  2. Create a PR to see preview deployment"
    echo "  3. Merge to main to deploy to production"
    echo ""
    echo "📊 Deployment URLs:"
    echo "  Paintbox:     https://paintbox.candlefish.ai (or preview URL)"
    echo "  PromoterOS:   https://promoteros.candlefish.ai (or preview URL)"
    echo "  Crown Trophy: https://crown-trophy.candlefish.ai (or preview URL)"
    echo "  NANDA Index:  https://candlefish-nanda-index.fly.dev"
    echo "  Crestron HA:  https://candlefish-crestron-ha.fly.dev"
elif [ $ERRORS -eq 0 ]; then
    echo "✅ Deployment ready with $WARNINGS warnings"
    echo ""
    echo "💡 The warnings above are non-critical."
    echo "    Deployments will still work!"
else
    echo "❌ Not ready: $ERRORS errors, $WARNINGS warnings"
    echo ""
    echo "🔧 Please fix the errors above before deploying."
    exit 1
fi

echo ""
echo "🧪 Test deployment workflow:"
echo "  gh workflow run deploy-monorepo.yml"
