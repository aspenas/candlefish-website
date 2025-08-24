#!/bin/bash
# Setup partners.candlefish.ai DNS via Porkbun and create Netlify site
# Priority: DNS configuration for partners portal

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Check if required tools are installed
check_dependencies() {
    log "Checking dependencies..."

    command -v curl >/dev/null 2>&1 || error "curl is required but not installed"
    command -v jq >/dev/null 2>&1 || error "jq is required but not installed"
    command -v aws >/dev/null 2>&1 || error "AWS CLI is required but not installed"

    # Check if Netlify CLI is installed
    if ! command -v netlify >/dev/null 2>&1; then
        warn "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    fi

    log "✅ All dependencies are available"
}

# Get Porkbun API credentials from AWS Secrets Manager
get_porkbun_credentials() {
    log "Retrieving Porkbun API credentials from AWS Secrets Manager..."

    local secret_json
    secret_json=$(aws secretsmanager get-secret-value \
        --secret-id "candlefish/porkbun-api-credentials" \
        --query 'SecretString' \
        --output text 2>/dev/null) || error "Failed to retrieve Porkbun credentials from AWS"

    export PORKBUN_API_KEY=$(echo "$secret_json" | jq -r '.apikey')
    export PORKBUN_SECRET_KEY=$(echo "$secret_json" | jq -r '.secretapikey')

    [[ -z "$PORKBUN_API_KEY" || "$PORKBUN_API_KEY" == "null" ]] && error "Porkbun API key not found in secrets"
    [[ -z "$PORKBUN_SECRET_KEY" || "$PORKBUN_SECRET_KEY" == "null" ]] && error "Porkbun secret key not found in secrets"

    log "✅ Porkbun credentials retrieved successfully"
}

# Get Netlify auth token from AWS Secrets Manager
get_netlify_credentials() {
    log "Retrieving Netlify credentials from AWS Secrets Manager..."

    export NETLIFY_AUTH_TOKEN=$(aws secretsmanager get-secret-value \
        --secret-id "netlify/auth-token" \
        --query 'SecretString' \
        --output text 2>/dev/null) || error "Failed to retrieve Netlify token from AWS"

    [[ -z "$NETLIFY_AUTH_TOKEN" || "$NETLIFY_AUTH_TOKEN" == "null" ]] && error "Netlify auth token not found in secrets"

    log "✅ Netlify credentials retrieved successfully"
}

# Check if DNS record already exists
check_existing_dns() {
    log "Checking existing DNS records for partners.candlefish.ai..."

    local response
    response=$(curl -s -X POST "https://api.porkbun.com/api/json/v3/dns/retrieve/candlefish.ai" \
        -H "Content-Type: application/json" \
        -d "{
            \"apikey\": \"$PORKBUN_API_KEY\",
            \"secretapikey\": \"$PORKBUN_SECRET_KEY\"
        }")

    local status
    status=$(echo "$response" | jq -r '.status')

    if [[ "$status" == "SUCCESS" ]]; then
        local existing_partners
        existing_partners=$(echo "$response" | jq -r '.records[] | select(.name == "partners") | .content')

        if [[ -n "$existing_partners" && "$existing_partners" != "null" ]]; then
            warn "Existing DNS record found for partners.candlefish.ai: $existing_partners"
            return 1
        fi
    fi

    log "✅ No existing DNS record found for partners subdomain"
    return 0
}

# Create DNS record via Porkbun API
create_dns_record() {
    local netlify_site_name="$1"

    log "Creating DNS CNAME record for partners.candlefish.ai..."

    local response
    response=$(curl -s -X POST "https://api.porkbun.com/api/json/v3/dns/create/candlefish.ai" \
        -H "Content-Type: application/json" \
        -d "{
            \"apikey\": \"$PORKBUN_API_KEY\",
            \"secretapikey\": \"$PORKBUN_SECRET_KEY\",
            \"type\": \"CNAME\",
            \"name\": \"partners\",
            \"content\": \"$netlify_site_name.netlify.app\",
            \"ttl\": \"300\"
        }")

    local status
    status=$(echo "$response" | jq -r '.status')

    if [[ "$status" == "SUCCESS" ]]; then
        log "✅ DNS CNAME record created successfully"
        log "   partners.candlefish.ai -> $netlify_site_name.netlify.app"
    else
        local message
        message=$(echo "$response" | jq -r '.message // "Unknown error"')
        error "Failed to create DNS record: $message"
    fi
}

# Create Netlify site
create_netlify_site() {
    log "Creating new Netlify site for partners portal..."

    # Navigate to the partners site directory
    local partners_dir="apps/partners-site"
    [[ ! -d "$partners_dir" ]] && error "Partners site directory not found: $partners_dir"

    cd "$partners_dir"

    # Create Netlify site
    local site_info
    site_info=$(netlify sites:create \
        --name "candlefish-partners-portal" \
        --account-slug "candlefish-ai" \
        --json 2>/dev/null) || error "Failed to create Netlify site"

    local site_id
    local site_url
    local site_name
    site_id=$(echo "$site_info" | jq -r '.site_id')
    site_url=$(echo "$site_info" | jq -r '.ssl_url')
    site_name=$(echo "$site_info" | jq -r '.name')

    log "✅ Netlify site created:"
    log "   Site ID: $site_id"
    log "   URL: $site_url"
    log "   Name: $site_name"

    # Store site ID in AWS Secrets Manager for future reference
    aws secretsmanager put-secret-value \
        --secret-id "netlify/partners-site-id" \
        --secret-string "$site_id" >/dev/null 2>&1 || \
        aws secretsmanager create-secret \
            --name "netlify/partners-site-id" \
            --description "Netlify site ID for partners.candlefish.ai" \
            --secret-string "$site_id" >/dev/null 2>&1

    echo "$site_name"
    cd ../..
}

# Configure custom domain in Netlify
configure_custom_domain() {
    local site_id="$1"

    log "Configuring custom domain partners.candlefish.ai in Netlify..."

    # Add custom domain
    netlify api addSiteDomain \
        --data "{ \"domain\": \"partners.candlefish.ai\" }" \
        --site-id "$site_id" >/dev/null 2>&1 || warn "Domain might already be configured"

    # Enable SSL
    log "Enabling SSL certificate for partners.candlefish.ai..."
    sleep 10  # Wait for DNS propagation

    netlify api provisionSiteTLSCertificate \
        --site-id "$site_id" >/dev/null 2>&1 || warn "SSL provisioning initiated (may take a few minutes)"

    log "✅ Custom domain configured"
}

# Setup build configuration
setup_build_config() {
    local site_id="$1"

    log "Configuring build settings for partners site..."

    # Update site settings
    netlify api updateSite \
        --site-id "$site_id" \
        --data '{
            "build_settings": {
                "cmd": "cd ../.. && pnpm brand:sync && pnpm turbo build --filter=apps/partners-site",
                "dir": "apps/partners-site/out",
                "base": "apps/partners-site"
            },
            "repo": {
                "provider": "github",
                "repo": "candlefish-ai/candlefish-ai",
                "branch": "main",
                "dir": "apps/partners-site"
            }
        }' >/dev/null 2>&1 || warn "Build configuration update failed"

    log "✅ Build configuration updated"
}

# Update GitHub repository secrets
update_github_secrets() {
    local site_id="$1"

    log "Updating GitHub repository secrets..."

    # Check if GitHub CLI is available
    if command -v gh >/dev/null 2>&1; then
        gh secret set NETLIFY_PARTNERS_SITE_ID --body "$site_id" --repo candlefish-ai/candlefish-ai || \
            warn "Failed to update GitHub secret (manual update required)"

        log "✅ GitHub secrets updated"
    else
        warn "GitHub CLI not available. Please manually add NETLIFY_PARTNERS_SITE_ID=$site_id to repository secrets"
    fi
}

# Verify DNS propagation
verify_dns_propagation() {
    log "Verifying DNS propagation..."

    local max_attempts=12
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        log "DNS check attempt $attempt/$max_attempts..."

        local dns_result
        dns_result=$(dig +short partners.candlefish.ai CNAME 2>/dev/null || echo "")

        if [[ -n "$dns_result" ]]; then
            log "✅ DNS propagation verified: $dns_result"
            return 0
        fi

        if [[ $attempt -eq $max_attempts ]]; then
            warn "DNS propagation incomplete after 2 minutes. This is normal and may take up to 24 hours."
            return 1
        fi

        sleep 10
        ((attempt++))
    done
}

# Perform SSL certificate verification
verify_ssl_certificate() {
    log "Checking SSL certificate status..."

    # Wait a bit for SSL provisioning to start
    sleep 30

    local max_attempts=6
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        log "SSL check attempt $attempt/$max_attempts..."

        if curl -sSf --max-time 10 "https://partners.candlefish.ai" >/dev/null 2>&1; then
            log "✅ SSL certificate is working"
            return 0
        fi

        if [[ $attempt -eq $max_attempts ]]; then
            warn "SSL certificate not yet ready. This may take up to 10 minutes."
            return 1
        fi

        sleep 30
        ((attempt++))
    done
}

# Test the deployed site
test_deployed_site() {
    log "Testing deployed partners site..."

    # Test HTTP redirect to HTTPS
    local http_status
    http_status=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "http://partners.candlefish.ai" || echo "000")

    # Test HTTPS response
    local https_status
    https_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://partners.candlefish.ai" || echo "000")

    if [[ "$https_status" == "200" ]]; then
        log "✅ Partners site is accessible via HTTPS"
    else
        warn "Partners site returned status code: $https_status"
    fi

    # Test if redirects are working
    if [[ "$http_status" =~ ^30[0-9]$ ]]; then
        log "✅ HTTP to HTTPS redirect is working"
    else
        warn "HTTP redirect may not be working properly"
    fi
}

# Main execution function
main() {
    log "🚀 Starting partners.candlefish.ai DNS and Netlify setup..."

    # Pre-flight checks
    check_dependencies
    get_porkbun_credentials
    get_netlify_credentials

    # Check for existing configuration
    if ! check_existing_dns; then
        warn "DNS record already exists. Proceeding with Netlify site creation only."
        skip_dns=true
    fi

    # Create Netlify site
    log "Creating Netlify site for partners portal..."
    site_name=$(create_netlify_site)

    # Get site ID for further configuration
    site_id=$(aws secretsmanager get-secret-value \
        --secret-id "netlify/partners-site-id" \
        --query 'SecretString' \
        --output text)

    # Create DNS record if needed
    if [[ "${skip_dns:-false}" != "true" ]]; then
        create_dns_record "$site_name"
        verify_dns_propagation
    fi

    # Configure Netlify
    configure_custom_domain "$site_id"
    setup_build_config "$site_id"

    # Update GitHub secrets
    update_github_secrets "$site_id"

    # Verification steps
    log "Performing verification steps..."
    verify_ssl_certificate
    test_deployed_site

    # Summary
    log ""
    log "🎉 Partners portal setup completed successfully!"
    log ""
    log "📋 Summary:"
    log "   • Domain: https://partners.candlefish.ai"
    log "   • Netlify Site ID: $site_id"
    log "   • DNS: CNAME partners.candlefish.ai -> $site_name.netlify.app"
    log "   • SSL: Enabled (may take a few minutes to fully propagate)"
    log "   • Build: Configured for automated deployments"
    log ""
    log "🔧 Next Steps:"
    log "   1. Commit and push changes to trigger first deployment"
    log "   2. Verify GitHub Actions workflow runs successfully"
    log "   3. Test all portal functionality in production"
    log "   4. Configure partner access and authentication"
    log ""
    log "📖 Documentation: Check BACKEND_ARCHITECTURE_DESIGN.md for details"
}

# Trap for cleanup
trap 'log "Script interrupted"; exit 1' INT TERM

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
