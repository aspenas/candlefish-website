#!/bin/bash

# ======================================================================
# Netlify Extensions Deployment Script
# Deploy and configure Netlify plugins across all Candlefish sites
# ======================================================================

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${SCRIPT_DIR}/configs"
LOGS_DIR="${SCRIPT_DIR}/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOGS_DIR}/deployment_${TIMESTAMP}.log"

# Ensure required directories exist
mkdir -p "${LOGS_DIR}"
mkdir -p "${CONFIG_DIR}"

# Sites configuration - using arrays for compatibility with bash 3.2
SITE_DOMAINS=(
    "candlefish.ai"
    "staging.candlefish.ai"
    "paintbox.candlefish.ai"
    "inventory.candlefish.ai"
    "promoteros.candlefish.ai"
    "claude.candlefish.ai"
    "dashboard.candlefish.ai"
    "ibm.candlefish.ai"
)

SITE_IDS=(
    "candlefish-grotto"
    "staging-candlefish"
    "paintbox-protected"
    "highline-inventory"
    "promoteros"
    "claude-resources-candlefish"
    "beamish-froyo-ed37ee"
    "candlefish-ibm-watsonx-portfolio"
)

# Recommended plugins for all sites
CORE_PLUGINS=(
    "@netlify/plugin-lighthouse"
    "@netlify/plugin-nextjs"
    "netlify-plugin-cache-nextjs"
    "netlify-plugin-submit-sitemap"
    "@sentry/netlify-build-plugin"
    "netlify-plugin-image-optim"
    "netlify-plugin-minify-html"
    "netlify-plugin-no-more-404"
    "netlify-plugin-bundle-env"
)

# Performance plugins
PERFORMANCE_PLUGINS=(
    "netlify-plugin-checklinks"
    "netlify-plugin-inline-critical-css"
    "netlify-plugin-precompress"
    "netlify-plugin-hashfiles"
)

# Security plugins
SECURITY_PLUGINS=(
    "netlify-plugin-csp-generator"
    "netlify-plugin-security-headers"
    "netlify-plugin-subresource-integrity"
)

# Logging functions
log() {
    echo -e "${1}" | tee -a "${LOG_FILE}"
}

log_success() {
    log "${GREEN}✓${NC} $1"
}

log_error() {
    log "${RED}✗${NC} $1"
}

log_warning() {
    log "${YELLOW}⚠${NC} $1"
}

log_info() {
    log "${BLUE}ℹ${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        log_error "Netlify CLI is not installed. Install it with: npm install -g netlify-cli"
        exit 1
    fi

    # Check if logged in to Netlify
    if ! netlify status &> /dev/null; then
        log_warning "Not logged in to Netlify. Running 'netlify login'..."
        netlify login
    fi

    # Check if jq is installed for JSON parsing
    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed. Installing..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install jq
        else
            sudo apt-get update && sudo apt-get install -y jq
        fi
    fi

    log_success "Prerequisites check complete"
}

# Get site ID from site name
get_site_id() {
    local site_name="$1"
    netlify api listSites | jq -r ".[] | select(.name == \"${site_name}\") | .id" 2>/dev/null
}

# Deploy plugins to a specific site
deploy_plugins_to_site() {
    local site_domain="$1"
    
    # Find the corresponding site name
    local site_name=""
    for i in "${!SITE_DOMAINS[@]}"; do
        if [[ "${SITE_DOMAINS[$i]}" == "$site_domain" ]]; then
            site_name="${SITE_IDS[$i]}"
            break
        fi
    done

    log_info "Processing site: ${site_domain} (${site_name})"

    # Get site ID
    local site_id=$(get_site_id "${site_name}")

    if [ -z "$site_id" ]; then
        log_error "Could not find site ID for ${site_name}"
        return 1
    fi

    log_info "Site ID: ${site_id}"

    # Link to the site
    log_info "Linking to site..."
    cd "${SCRIPT_DIR}"
    netlify link --id "${site_id}" 2>/dev/null || true

    # Install core plugins
    log_info "Installing core plugins..."
    for plugin in "${CORE_PLUGINS[@]}"; do
        log_info "  Installing ${plugin}..."
        if netlify plugins:install "${plugin}" 2>>"${LOG_FILE}"; then
            log_success "  Installed ${plugin}"
        else
            log_warning "  Failed to install ${plugin} (may already be installed)"
        fi
    done

    # Install performance plugins for production sites
    if [[ "$site_domain" == "candlefish.ai" ]] || [[ "$site_domain" == "dashboard.candlefish.ai" ]]; then
        log_info "Installing performance plugins..."
        for plugin in "${PERFORMANCE_PLUGINS[@]}"; do
            log_info "  Installing ${plugin}..."
            if netlify plugins:install "${plugin}" 2>>"${LOG_FILE}"; then
                log_success "  Installed ${plugin}"
            else
                log_warning "  Failed to install ${plugin}"
            fi
        done
    fi

    # Install security plugins for all sites
    log_info "Installing security plugins..."
    for plugin in "${SECURITY_PLUGINS[@]}"; do
        log_info "  Installing ${plugin}..."
        if netlify plugins:install "${plugin}" 2>>"${LOG_FILE}"; then
            log_success "  Installed ${plugin}"
        else
            log_warning "  Failed to install ${plugin}"
        fi
    done

    # Configure environment variables
    configure_site_env "${site_id}" "${site_domain}"

    # Deploy Edge Functions if needed
    deploy_edge_functions "${site_id}" "${site_domain}"

    # Configure build settings
    configure_build_settings "${site_id}" "${site_domain}"

    log_success "Completed deployment for ${site_domain}"
    echo ""
}

# Configure environment variables for a site
configure_site_env() {
    local site_id="$1"
    local site_domain="$2"

    log_info "Configuring environment variables for ${site_domain}..."

    # Common environment variables
    netlify env:set NODE_VERSION "18" --scope builds
    netlify env:set NEXT_PUBLIC_SITE_URL "https://${site_domain}" --scope builds
    netlify env:set NEXT_PUBLIC_API_URL "https://api.candlefish.ai" --scope builds

    # Site-specific configurations
    case "$site_domain" in
        "candlefish.ai")
            netlify env:set NEXT_PUBLIC_ENV "production" --scope builds
            netlify env:set NEXT_PUBLIC_ENABLE_ANALYTICS "true" --scope builds
            netlify env:set NEXT_PUBLIC_ENABLE_MONITORING "true" --scope builds
            ;;
        "staging.candlefish.ai")
            netlify env:set NEXT_PUBLIC_ENV "staging" --scope builds
            netlify env:set NEXT_PUBLIC_ENABLE_DEBUG "true" --scope builds
            ;;
        "dashboard.candlefish.ai")
            netlify env:set NEXT_PUBLIC_DASHBOARD "true" --scope builds
            netlify env:set NEXT_PUBLIC_ENABLE_WEBSOCKET "true" --scope builds
            ;;
        *)
            netlify env:set NEXT_PUBLIC_ENV "production" --scope builds
            ;;
    esac

    # Sentry configuration (if using Sentry plugin)
    if [[ " ${CORE_PLUGINS[@]} " =~ " @sentry/netlify-build-plugin " ]]; then
        netlify env:set SENTRY_ORG "candlefish" --scope builds
        netlify env:set SENTRY_PROJECT "${site_domain//./-}" --scope builds
        netlify env:set SENTRY_ENVIRONMENT "${site_domain}" --scope builds
    fi

    log_success "Environment variables configured"
}

# Deploy Edge Functions
deploy_edge_functions() {
    local site_id="$1"
    local site_domain="$2"

    log_info "Deploying Edge Functions for ${site_domain}..."

    # Check if edge functions directory exists
    local edge_functions_dir="${SCRIPT_DIR}/edge-functions/${site_domain}"

    if [ -d "${edge_functions_dir}" ]; then
        log_info "Found Edge Functions for ${site_domain}"

        # Copy edge functions to netlify directory
        mkdir -p "netlify/edge-functions"
        cp -r "${edge_functions_dir}"/* "netlify/edge-functions/" 2>/dev/null || true

        # Deploy
        if netlify deploy --prod --dir=. --functions=netlify/edge-functions 2>>"${LOG_FILE}"; then
            log_success "Edge Functions deployed"
        else
            log_warning "Failed to deploy Edge Functions"
        fi

        # Clean up
        rm -rf "netlify/edge-functions"
    else
        log_info "No Edge Functions found for ${site_domain}"
    fi
}

# Configure build settings
configure_build_settings() {
    local site_id="$1"
    local site_domain="$2"

    log_info "Configuring build settings for ${site_domain}..."

    # Update build settings via API
    local build_settings=$(cat <<EOF
{
  "build_settings": {
    "skip_prs": false,
    "concurrent_builds": 3,
    "build_image": "focal",
    "node_version": "18"
  }
}
EOF
)

    # Apply build settings
    curl -X PATCH \
        -H "Authorization: Bearer $(netlify api:getToken)" \
        -H "Content-Type: application/json" \
        -d "${build_settings}" \
        "https://api.netlify.com/api/v1/sites/${site_id}" \
        2>>"${LOG_FILE}" | jq '.' >>"${LOG_FILE}"

    log_success "Build settings configured"
}

# Generate site-specific configuration
generate_site_config() {
    local site_domain="$1"
    local config_file="${CONFIG_DIR}/${site_domain}.toml"

    log_info "Generating configuration for ${site_domain}..."

    cat > "${config_file}" <<EOF
# Netlify configuration for ${site_domain}
# Generated: $(date)

[build]
  command = "npm run build"
  publish = ".next"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"
  NEXT_TELEMETRY_DISABLED = "1"

# Core plugins
[[plugins]]
  package = "@netlify/plugin-lighthouse"
  [plugins.inputs]
    audits = [
      { url = "/", name = "Homepage" }
    ]
    [plugins.inputs.thresholds]
      performance = 0.8
      accessibility = 0.9
      best-practices = 0.9
      seo = 0.9

[[plugins]]
  package = "@netlify/plugin-nextjs"

[[plugins]]
  package = "netlify-plugin-cache-nextjs"

[[plugins]]
  package = "netlify-plugin-submit-sitemap"
  [plugins.inputs]
    baseUrl = "https://${site_domain}"
    sitemapPath = "/sitemap.xml"

[[plugins]]
  package = "@sentry/netlify-build-plugin"
  [plugins.inputs]
    sentryOrg = "candlefish"
    sentryProject = "${site_domain//./-}"

# Performance optimization
[[plugins]]
  package = "netlify-plugin-image-optim"

[[plugins]]
  package = "netlify-plugin-minify-html"
  [plugins.inputs]
    minifierOptions = { removeComments = true, collapseWhitespace = true }

# Security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"

# Cache control
[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/images/*"
  [headers.values]
    Cache-Control = "public, max-age=86400"

# Redirects
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

# Edge Functions (if applicable)
[[edge_functions]]
  path = "/api/edge/*"
  function = "api-edge"

EOF

    log_success "Configuration generated: ${config_file}"
}

# Deploy all sites
deploy_all_sites() {
    log_info "Starting deployment to all sites..."
    log_info "Timestamp: $(date)"
    echo ""

    local success_count=0
    local failure_count=0

    for i in "${!SITE_DOMAINS[@]}"; do
        local site_domain="${SITE_DOMAINS[$i]}"
        if deploy_plugins_to_site "${site_domain}"; then
            ((success_count++))
            generate_site_config "${site_domain}"
        else
            ((failure_count++))
            log_error "Failed to deploy to ${site_domain}"
        fi

        # Add delay to avoid rate limiting
        sleep 2
    done

    echo ""
    log_info "Deployment Summary:"
    log_success "Successfully deployed to ${success_count} sites"

    if [ $failure_count -gt 0 ]; then
        log_error "Failed to deploy to ${failure_count} sites"
    fi

    log_info "Log file: ${LOG_FILE}"
}

# Main execution
main() {
    log_info "==================================="
    log_info "Netlify Extensions Deployment Tool"
    log_info "==================================="
    echo ""

    # Check prerequisites
    check_prerequisites

    # Parse command line arguments
    if [ $# -eq 0 ]; then
        # Deploy to all sites
        deploy_all_sites
    else
        # Deploy to specific site
        local site_domain="$1"
        local found=0
        for i in "${!SITE_DOMAINS[@]}"; do
            if [[ "${SITE_DOMAINS[$i]}" == "$site_domain" ]]; then
                found=1
                break
            fi
        done
        
        if [[ $found -eq 1 ]]; then
            deploy_plugins_to_site "${site_domain}"
            generate_site_config "${site_domain}"
        else
            log_error "Unknown site: ${site_domain}"
            log_info "Available sites:"
            for site in "${SITE_DOMAINS[@]}"; do
                echo "  - ${site}"
            done
            exit 1
        fi
    fi

    log_success "Deployment script completed!"
}

# Run main function
main "$@"
