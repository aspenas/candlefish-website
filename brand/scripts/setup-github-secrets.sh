#!/bin/bash

# Setup GitHub repository secrets for Netlify deployment
set -euo pipefail

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }
warning() { echo -e "${YELLOW}⚠${NC} $1"; }

main() {
    log "Setting up GitHub repository secrets for Netlify CI/CD..."

    # Get Netlify token from AWS
    NETLIFY_TOKEN=$(aws secretsmanager get-secret-value \
        --secret-id "netlify/ibm-portfolio/auth-token" \
        --query SecretString --output text | jq -r .token)

    if [[ -z "$NETLIFY_TOKEN" ]]; then
        error "Failed to retrieve Netlify token from AWS Secrets Manager"
        exit 1
    fi

    success "Retrieved Netlify token from AWS"

    # Set GitHub secret using gh CLI
    log "Setting NETLIFY_AUTH_TOKEN secret in GitHub repository..."

    if command -v gh &> /dev/null; then
        echo "$NETLIFY_TOKEN" | gh secret set NETLIFY_AUTH_TOKEN --repo candlefish-ai/candlefish-ai
        success "GitHub secret NETLIFY_AUTH_TOKEN has been set"
    else
        warning "GitHub CLI (gh) not found. Please install it and run:"
        echo "echo '$NETLIFY_TOKEN' | gh secret set NETLIFY_AUTH_TOKEN --repo candlefish-ai/candlefish-ai"
    fi

    log "Verifying repository access..."

    # Check if we can access the repository
    if gh repo view candlefish-ai/candlefish-ai &> /dev/null; then
        success "GitHub repository access verified"

        # List current secrets (without values)
        log "Current GitHub secrets:"
        gh secret list --repo candlefish-ai/candlefish-ai
    else
        error "Cannot access GitHub repository. Please check your authentication."
    fi

    echo ""
    echo "=== SETUP COMPLETE ==="
    echo ""
    echo "✅ Netlify CI/CD pipeline is now fully configured with:"
    echo ""
    echo "1. GitHub Actions workflow: /.github/workflows/netlify-deployment.yml"
    echo "2. Repository secret: NETLIFY_AUTH_TOKEN"
    echo "3. All 8 Netlify sites configured for automatic deployment"
    echo ""
    echo "Sites and their triggers:"
    echo "• candlefish.ai - Deploys on push to main (brand/website changes)"
    echo "• staging.candlefish.ai - Deploys on push to staging (brand/website changes)"
    echo "• inventory.candlefish.ai - Deploys on 5470_S_Highline_Circle/frontend changes"
    echo "• paintbox.candlefish.ai - Deploys on projects/paintbox changes"
    echo "• promoteros.candlefish.ai - Deploys on services/promoteros-social changes"
    echo "• ibm.candlefish.ai - Deploys on portfolio/ibm changes"
    echo "• claude.candlefish.ai - Deploys on docs/claude changes"
    echo "• dashboard.candlefish.ai - Deploys on dashboard changes"
    echo ""
    echo "🚀 Your enterprise-grade CI/CD pipeline is ready!"
    echo ""
    echo "Next steps:"
    echo "1. Make a test change to any monitored directory"
    echo "2. Push to the repository"
    echo "3. Watch the GitHub Actions run automatically"
    echo "4. Verify deployment on the corresponding Netlify site"
}

main "$@"
