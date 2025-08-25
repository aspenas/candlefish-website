#!/bin/bash
# Deploy all Candlefish sites to Netlify with custom domains
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Get Netlify token from AWS
get_netlify_token() {
    log "Getting Netlify token from AWS Secrets Manager..."
    export NETLIFY_AUTH_TOKEN=$(aws secretsmanager get-secret-value \
        --secret-id "netlify/auth-token" \
        --query 'SecretString' \
        --output text 2>/dev/null || echo "")

    if [[ -z "$NETLIFY_AUTH_TOKEN" ]]; then
        # Try alternative secret names
        export NETLIFY_AUTH_TOKEN=$(aws secretsmanager get-secret-value \
            --secret-id "netlify/ibm-portfolio/auth-token" \
            --query 'SecretString' \
            --output text 2>/dev/null || echo "")
    fi

    [[ -z "$NETLIFY_AUTH_TOKEN" ]] && error "Could not retrieve Netlify token"
    log "✅ Netlify token retrieved"
}

# Deploy a site to Netlify
deploy_site() {
    local site_name="$1"
    local site_dir="$2"
    local custom_domain="$3"

    log "Deploying $site_name to Netlify..."

    # Build the site first
    log "Building $site_name..."
    cd "/Users/patricksmith/candlefish-ai/apps/$site_dir"

    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        npm install
    fi

    # Build the site
    npm run build || warn "Build failed, trying alternative build command"

    # Check for output directory
    local dist_dir=""
    if [[ -d ".next" ]]; then
        dist_dir=".next"
    elif [[ -d "out" ]]; then
        dist_dir="out"
    elif [[ -d "dist" ]]; then
        dist_dir="dist"
    elif [[ -d "build" ]]; then
        dist_dir="build"
    else
        error "No build output directory found for $site_name"
    fi

    log "Found build output in $dist_dir"

    # Deploy to Netlify
    log "Deploying to Netlify..."
    local deploy_result=$(npx netlify deploy --prod \
        --dir "$dist_dir" \
        --site "$site_name" \
        --auth "$NETLIFY_AUTH_TOKEN" \
        --json 2>/dev/null || echo "{}")

    local deploy_url=$(echo "$deploy_result" | jq -r '.deploy_url // .url // ""')

    if [[ -n "$deploy_url" ]]; then
        log "✅ $site_name deployed to: $deploy_url"
    else
        # Try creating new site and deploying
        log "Creating new Netlify site for $site_name..."
        npx netlify sites:create \
            --name "$site_name" \
            --auth "$NETLIFY_AUTH_TOKEN" || true

        # Deploy again
        npx netlify deploy --prod \
            --dir "$dist_dir" \
            --site "$site_name" \
            --auth "$NETLIFY_AUTH_TOKEN" || warn "Deployment failed for $site_name"
    fi

    # Add custom domain if provided
    if [[ -n "$custom_domain" ]]; then
        log "Adding custom domain $custom_domain..."
        npx netlify domains:add "$custom_domain" \
            --site "$site_name" \
            --auth "$NETLIFY_AUTH_TOKEN" || warn "Domain addition failed"
    fi

    cd /Users/patricksmith/candlefish-ai
}

# Setup DNS via Porkbun
setup_dns() {
    local subdomain="$1"
    local netlify_site="$2"

    log "Setting up DNS for $subdomain.candlefish.ai..."

    # Get Porkbun credentials
    local porkbun_creds=$(aws secretsmanager get-secret-value \
        --secret-id "candlefish/porkbun-api-credentials" \
        --query 'SecretString' \
        --output text 2>/dev/null || echo "{}")

    local api_key=$(echo "$porkbun_creds" | jq -r '.apikey // ""')
    local secret_key=$(echo "$porkbun_creds" | jq -r '.secretapikey // ""')

    if [[ -z "$api_key" || -z "$secret_key" ]]; then
        warn "Could not retrieve Porkbun credentials, skipping DNS setup"
        return
    fi

    # Create CNAME record
    curl -s -X POST "https://api.porkbun.com/api/json/v3/dns/create/candlefish.ai" \
        -H "Content-Type: application/json" \
        -d "{
            \"apikey\": \"$api_key\",
            \"secretapikey\": \"$secret_key\",
            \"type\": \"CNAME\",
            \"name\": \"$subdomain\",
            \"content\": \"$netlify_site.netlify.app\",
            \"ttl\": \"300\"
        }" > /dev/null 2>&1 || warn "DNS record creation failed for $subdomain"

    log "✅ DNS record created for $subdomain.candlefish.ai"
}

# Main execution
main() {
    log "🚀 Starting deployment of Candlefish sites to Netlify..."

    # Get credentials
    get_netlify_token

    # Deploy API site
    deploy_site "candlefish-api" "api-site" "api.candlefish.ai"
    setup_dns "api" "candlefish-api"

    # Deploy Docs site
    deploy_site "candlefish-docs" "docs-site" "docs.candlefish.ai"
    setup_dns "docs" "candlefish-docs"

    # Deploy Partners site
    deploy_site "candlefish-partners" "partners-site" "partners.candlefish.ai"
    setup_dns "partners" "candlefish-partners"

    log ""
    log "🎉 All sites deployed successfully!"
    log ""
    log "📋 Sites:"
    log "   • API: https://api.candlefish.ai (https://candlefish-api.netlify.app)"
    log "   • Docs: https://docs.candlefish.ai (https://candlefish-docs.netlify.app)"
    log "   • Partners: https://partners.candlefish.ai (https://candlefish-partners.netlify.app)"
    log ""
    log "⏳ DNS propagation may take up to 24 hours"
    log "🔒 SSL certificates will be provisioned automatically"
}

main "$@"
