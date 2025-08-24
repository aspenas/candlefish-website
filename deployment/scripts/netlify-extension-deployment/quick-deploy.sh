#!/bin/bash

# ======================================================================
# Quick Netlify Extensions Deployment
# Fast deployment script for immediate setup
# ======================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

# Site configurations with their Netlify site IDs
declare -A SITES=(
    ["candlefish.ai"]="candlefish-main"
    ["staging.candlefish.ai"]="candlefish-staging"
    ["paintbox.candlefish.ai"]="candlefish-paintbox"
    ["inventory.candlefish.ai"]="candlefish-inventory"
    ["promoteros.candlefish.ai"]="candlefish-promoteros"
    ["claude.candlefish.ai"]="candlefish-claude"
    ["dashboard.candlefish.ai"]="candlefish-dashboard"
    ["ibm.candlefish.ai"]="candlefish-ibm"
)

# Quick setup for a single site
quick_setup_site() {
    local domain="$1"
    local site_name="${SITES[$domain]}"

    log_info "Quick setup for ${domain} (${site_name})..."

    # Install essential plugins using Netlify CLI
    log_info "Installing essential plugins..."

    # Use npm to install plugins directly to the site
    netlify link --name "${site_name}" 2>/dev/null || true

    # Core performance and optimization plugins
    local plugins=(
        "@netlify/plugin-lighthouse"
        "@netlify/plugin-nextjs"
        "netlify-plugin-cache-nextjs"
        "netlify-plugin-image-optim"
    )

    for plugin in "${plugins[@]}"; do
        log_info "  Installing ${plugin}..."
        netlify plugins:install "${plugin}" 2>/dev/null || log_warning "  ${plugin} may already be installed"
    done

    # Set essential environment variables
    log_info "Setting environment variables..."
    netlify env:set NODE_VERSION "18" --scope builds 2>/dev/null || true
    netlify env:set NEXT_PUBLIC_SITE_URL "https://${domain}" --scope builds 2>/dev/null || true

    log_success "Quick setup complete for ${domain}"
}

# Deploy using Netlify API
deploy_with_api() {
    local domain="$1"
    local site_name="${SITES[$domain]}"

    log_info "Deploying via Netlify API for ${domain}..."

    # Get Netlify auth token
    local auth_token=$(netlify api:getToken 2>/dev/null || echo "")

    if [ -z "$auth_token" ]; then
        log_warning "Not logged in to Netlify. Please run: netlify login"
        return 1
    fi

    # Create build hooks for continuous deployment
    curl -X POST \
        -H "Authorization: Bearer ${auth_token}" \
        "https://api.netlify.com/api/v1/sites/${site_name}/build_hooks" \
        -d '{"title": "Quick Deploy Hook", "branch": "main"}' \
        2>/dev/null | jq -r '.url' || true

    log_success "API deployment configured for ${domain}"
}

# Main quick deployment
main() {
    echo ""
    log_info "======================================"
    log_info "Quick Netlify Extensions Deployment"
    log_info "======================================"
    echo ""

    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        log_warning "Installing Netlify CLI..."
        npm install -g netlify-cli
    fi

    # Check if logged in
    if ! netlify status &> /dev/null; then
        log_info "Please log in to Netlify:"
        netlify login
    fi

    # Priority sites for immediate deployment
    local priority_sites=(
        "candlefish.ai"
        "dashboard.candlefish.ai"
        "staging.candlefish.ai"
    )

    log_info "Deploying to priority sites first..."
    echo ""

    for site in "${priority_sites[@]}"; do
        if [[ -v SITES["$site"] ]]; then
            quick_setup_site "$site"
            deploy_with_api "$site"
            echo ""
        fi
    done

    log_info "Priority sites deployed!"
    echo ""

    # Ask if user wants to deploy to remaining sites
    read -p "Deploy to remaining sites? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for site in "${!SITES[@]}"; do
            # Skip if already deployed
            if [[ " ${priority_sites[@]} " =~ " ${site} " ]]; then
                continue
            fi

            quick_setup_site "$site"
            deploy_with_api "$site"
            echo ""
        done
    fi

    echo ""
    log_success "Quick deployment complete!"
    log_info "Next steps:"
    log_info "1. Verify deployments at https://app.netlify.com"
    log_info "2. Check site performance with Lighthouse"
    log_info "3. Monitor build logs for any issues"
    log_info "4. Run full deployment for advanced features: ./deploy-extensions.sh"
}

# Run main
main "$@"
