#!/bin/bash

# ======================================================================
# Netlify Configuration Deployment Script
# Deploy netlify.toml configurations to enable extensions
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
REPO_ROOT="/Users/patricksmith/candlefish-ai"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${SCRIPT_DIR}/logs/config_deployment_${TIMESTAMP}.log"

# Ensure log directory exists
mkdir -p "${SCRIPT_DIR}/logs"

# Logging functions
log_info() { echo -e "${BLUE}ℹ${NC} $1" | tee -a "${LOG_FILE}"; }
log_success() { echo -e "${GREEN}✓${NC} $1" | tee -a "${LOG_FILE}"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1" | tee -a "${LOG_FILE}"; }
log_error() { echo -e "${RED}✗${NC} $1" | tee -a "${LOG_FILE}"; }

# Site configurations
declare -a SITES=(
    "candlefish.ai:brand/website"
    "staging.candlefish.ai:brand/website"
    "paintbox.candlefish.ai:projects/paintbox"
    "inventory.candlefish.ai:5470_S_Highline_Circle/frontend"
    "promoteros.candlefish.ai:services/promoteros-social"
    "claude.candlefish.ai:docs/claude"
    "dashboard.candlefish.ai:dashboard"
    "ibm.candlefish.ai:portfolio/ibm"
)

# Create netlify.toml for a site
create_netlify_config() {
    local site_domain="$1"
    local site_path="$2"
    local config_file="${REPO_ROOT}/${site_path}/netlify.toml"
    
    log_info "Creating netlify.toml for ${site_domain}..."
    
    # Create directory if it doesn't exist
    mkdir -p "$(dirname "${config_file}")"
    
    # Generate netlify.toml content
    cat > "${config_file}" << 'EOF'
# Netlify Configuration with Extensions
# Generated: ${TIMESTAMP}

[build]
  command = "npm run build"
  publish = ".next"
  
[build.environment]
  NODE_VERSION = "18"
  NEXT_TELEMETRY_DISABLED = "1"

# Performance Monitoring
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

# Next.js Optimization
[[plugins]]
  package = "@netlify/plugin-nextjs"

# Build Caching
[[plugins]]
  package = "netlify-plugin-cache-nextjs"

# Image Optimization
[[plugins]]
  package = "netlify-plugin-image-optim"

# SEO
[[plugins]]
  package = "netlify-plugin-submit-sitemap"
  [plugins.inputs]
    baseUrl = "https://${site_domain}"
    sitemapPath = "/sitemap.xml"

# HTML Minification
[[plugins]]
  package = "netlify-plugin-minify-html"
  [plugins.inputs.minifierOptions]
    removeComments = true
    collapseWhitespace = true
    minifyCSS = true
    minifyJS = true

# 404 Prevention
[[plugins]]
  package = "netlify-plugin-no-more-404"
  [plugins.inputs]
    on404 = "error"
    cacheKey = "404-plugin-cache"

# Bundle Environment Variables
[[plugins]]
  package = "netlify-plugin-bundle-env"

# Security Headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.candlefish.ai"

# Cache Control
[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/images/*"
  [headers.values]
    Cache-Control = "public, max-age=86400, must-revalidate"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Edge Functions (if applicable)
[[edge_functions]]
  path = "/api/edge/*"
  function = "api-edge"

# Redirects
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
  force = true

# Performance optimizations
[functions]
  node_bundler = "esbuild"
  
EOF

    # Replace variables in the config
    sed -i.bak "s/\${TIMESTAMP}/${TIMESTAMP}/g" "${config_file}"
    sed -i.bak "s/\${site_domain}/${site_domain}/g" "${config_file}"
    rm "${config_file}.bak"
    
    log_success "Created ${config_file}"
}

# Commit and push changes
commit_and_push() {
    log_info "Committing configuration changes..."
    
    cd "${REPO_ROOT}"
    
    # Check if there are changes
    if git diff --quiet && git diff --staged --quiet; then
        log_warning "No changes to commit"
        return 0
    fi
    
    # Add all netlify.toml files
    git add -A "**/netlify.toml"
    
    # Create commit
    git commit -m "Add Netlify extension configurations for all sites

- Performance monitoring with Lighthouse
- Build optimization and caching
- Image optimization
- Security headers
- SEO improvements

🤖 Generated with deploy-netlify-configs.sh"
    
    log_success "Changes committed"
    
    # Ask before pushing
    read -p "Push changes to GitHub? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin main
        log_success "Changes pushed to GitHub"
    else
        log_info "Changes not pushed. You can push manually with: git push origin main"
    fi
}

# Main function
main() {
    log_info "====================================="
    log_info "Netlify Configuration Deployment"
    log_info "====================================="
    echo
    
    # Create configurations for each site
    for site_config in "${SITES[@]}"; do
        IFS=':' read -r domain path <<< "${site_config}"
        create_netlify_config "${domain}" "${path}"
    done
    
    echo
    log_success "All configurations created!"
    echo
    
    # Commit and push
    commit_and_push
    
    echo
    log_info "Next steps:"
    log_info "1. Wait for GitHub to trigger Netlify builds (~2-5 minutes)"
    log_info "2. Check build logs at: https://app.netlify.com"
    log_info "3. Verify extensions are active in the build output"
    echo
    log_success "Deployment complete! Log saved to: ${LOG_FILE}"
}

# Run main function
main "$@"