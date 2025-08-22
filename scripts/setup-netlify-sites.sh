#!/usr/bin/env bash
set -euo pipefail

# Setup Netlify sites and get their IDs using the Netlify API

echo "🌐 Setting up Netlify Sites for Candlefish AI"
echo "============================================="
echo ""

REPO="candlefish-ai/candlefish-ai"

# Get Netlify auth token from AWS
echo "🔑 Getting Netlify auth token from AWS..."
TOKEN_JSON=$(aws secretsmanager get-secret-value \
    --secret-id "netlify/ibm-portfolio/auth-token" \
    --query 'SecretString' \
    --output text 2>/dev/null)

# Extract token from JSON
NETLIFY_TOKEN=$(echo "$TOKEN_JSON" | jq -r '.token // empty')
if [ -z "$NETLIFY_TOKEN" ]; then
    # Token extraction failed
    echo "❌ Could not extract token from AWS secret"
    exit 1
fi

if [ -z "$NETLIFY_TOKEN" ]; then
    echo "❌ Could not get Netlify auth token from AWS"
    exit 1
fi

echo "  ✅ Got Netlify auth token"
echo ""

# Function to get or create Netlify site
get_or_create_site() {
    local SITE_NAME="$1"
    local DISPLAY_NAME="$2"

    echo "📦 Processing $DISPLAY_NAME..."

    # First, check if site exists
    echo "  Checking if site exists..."
    EXISTING_SITE=$(curl -s -H "Authorization: Bearer $NETLIFY_TOKEN" \
        "https://api.netlify.com/api/v1/sites" | \
        jq -r ".[] | select(.name == \"$SITE_NAME\") | .id" | head -1)

    if [ -n "$EXISTING_SITE" ]; then
        echo "  ✅ Found existing site: $EXISTING_SITE"
        return 0
    fi

    # If not found by exact name, try to find by custom domain
    EXISTING_SITE=$(curl -s -H "Authorization: Bearer $NETLIFY_TOKEN" \
        "https://api.netlify.com/api/v1/sites" | \
        jq -r ".[] | select(.custom_domain == \"$SITE_NAME.candlefish.ai\") | .id" | head -1)

    if [ -n "$EXISTING_SITE" ]; then
        echo "  ✅ Found existing site by domain: $EXISTING_SITE"
        return 0
    fi

    # Create new site if it doesn't exist
    echo "  Creating new site..."
    RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer $NETLIFY_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$SITE_NAME\",
            \"custom_domain\": \"$SITE_NAME.candlefish.ai\",
            \"force_ssl\": true
        }" \
        "https://api.netlify.com/api/v1/sites")

    EXISTING_SITE=$(echo "$RESPONSE" | jq -r '.id')

    if [ "$EXISTING_SITE" != "null" ] && [ -n "$EXISTING_SITE" ]; then
        echo "  ✅ Created new site: $EXISTING_SITE"
    else
        echo "  ⚠️  Could not create site. It might already exist with a different name."
        # Try to find any site with the name in it
        EXISTING_SITE=$(curl -s -H "Authorization: Bearer $NETLIFY_TOKEN" \
            "https://api.netlify.com/api/v1/sites" | \
            jq -r ".[] | select(.name | contains(\"$SITE_NAME\")) | .id" | head -1)

        if [ -n "$EXISTING_SITE" ]; then
            echo "  ✅ Found similar site: $EXISTING_SITE"
        fi
    fi
}

# Get all existing sites first
echo "📋 Listing all existing Netlify sites..."
echo ""
curl -s -H "Authorization: Bearer $NETLIFY_TOKEN" \
    "https://api.netlify.com/api/v1/sites" | \
    jq -r '.[] | "\(.name) - \(.id)"' | head -20
echo ""

# Process each site
echo "🔍 Finding or creating sites..."
echo ""

# Paintbox
get_or_create_site "paintbox" "Paintbox"
PAINTBOX_SITE_ID="$EXISTING_SITE"

# PromoterOS
get_or_create_site "promoteros" "PromoterOS"
PROMOTEROS_SITE_ID="$EXISTING_SITE"

# Crown Trophy
get_or_create_site "crown-trophy" "Crown Trophy"
CROWN_SITE_ID="$EXISTING_SITE"

echo ""
echo "💾 Saving site IDs to GitHub Secrets..."

# Update GitHub secrets with actual site IDs
if [ -n "$PAINTBOX_SITE_ID" ] && [ "$PAINTBOX_SITE_ID" != "null" ]; then
    gh secret set PAINTBOX_SITE_ID --repo "$REPO" --body "$PAINTBOX_SITE_ID"
    echo "  ✅ Set PAINTBOX_SITE_ID: $PAINTBOX_SITE_ID"
else
    echo "  ⚠️  Could not set PAINTBOX_SITE_ID"
fi

if [ -n "$PROMOTEROS_SITE_ID" ] && [ "$PROMOTEROS_SITE_ID" != "null" ]; then
    gh secret set PROMOTEROS_SITE_ID --repo "$REPO" --body "$PROMOTEROS_SITE_ID"
    echo "  ✅ Set PROMOTEROS_SITE_ID: $PROMOTEROS_SITE_ID"
else
    echo "  ⚠️  Could not set PROMOTEROS_SITE_ID"
fi

if [ -n "$CROWN_SITE_ID" ] && [ "$CROWN_SITE_ID" != "null" ]; then
    gh secret set CROWN_SITE_ID --repo "$REPO" --body "$CROWN_SITE_ID"
    echo "  ✅ Set CROWN_SITE_ID: $CROWN_SITE_ID"
else
    echo "  ⚠️  Could not set CROWN_SITE_ID"
fi

echo ""
echo "============================================="
echo "✨ Netlify sites configuration complete!"
echo ""
echo "📝 Site Summary:"
echo "  Paintbox:    ${PAINTBOX_SITE_ID:-Not set}"
echo "  PromoterOS:  ${PROMOTEROS_SITE_ID:-Not set}"
echo "  Crown Trophy: ${CROWN_SITE_ID:-Not set}"
echo ""
echo "🔍 Verify secrets:"
echo "  gh secret list --repo $REPO | grep SITE_ID"
echo ""
echo "🚀 Ready to deploy to Netlify!"
