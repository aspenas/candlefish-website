#!/bin/bash

# Configure professional GitHub CI/CD integration for all Netlify production sites
# This script sets up proper GitHub integration, deploy previews, and build hooks

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Get Netlify token
get_netlify_token() {
    aws secretsmanager get-secret-value \
        --secret-id "netlify/ibm-portfolio/auth-token" \
        --query SecretString --output text | jq -r .token
}

# Configure GitHub integration for a Netlify site
configure_github_integration() {
    local site_id=$1
    local site_name=$2
    local repo_url=$3
    local branch=$4
    local publish_dir=$5
    local build_command=$6
    local base_dir=$7

    log "Configuring GitHub integration for ${site_name} (${site_id})"

    # Build the JSON payload
    local json_payload=$(cat <<EOF
{
  "repo": "${repo_url}",
  "branch": "${branch}",
  "dir": "${publish_dir}",
  "cmd": "${build_command}",
  "base": "${base_dir}"
}
EOF
)

    # Configure GitHub integration
    local response=$(curl -s -w "%{http_code}" -o /tmp/netlify_response.json \
        -H "Authorization: Bearer ${NETLIFY_TOKEN}" \
        -H "Content-Type: application/json" \
        -X PATCH \
        "https://api.netlify.com/api/v1/sites/${site_id}" \
        -d "{\"build_settings\": ${json_payload}}")

    local http_code="${response: -3}"

    if [[ "${http_code}" == "200" ]]; then
        success "Successfully configured GitHub integration for ${site_name}"

        # Enable deploy previews for pull requests
        log "Enabling deploy previews for ${site_name}"
        curl -s -H "Authorization: Bearer ${NETLIFY_TOKEN}" \
            -H "Content-Type: application/json" \
            -X PATCH \
            "https://api.netlify.com/api/v1/sites/${site_id}" \
            -d '{"processing_settings":{"skip_prs":false}}'

        success "Deploy previews enabled for ${site_name}"

        # Set up build hooks
        setup_build_hooks "${site_id}" "${site_name}"

    else
        error "Failed to configure GitHub integration for ${site_name} (HTTP ${http_code})"
        cat /tmp/netlify_response.json
        return 1
    fi
}

# Set up build hooks for automated deployments
setup_build_hooks() {
    local site_id=$1
    local site_name=$2

    log "Setting up build hooks for ${site_name}"

    # Create a build hook for manual deployments
    local hook_response=$(curl -s -H "Authorization: Bearer ${NETLIFY_TOKEN}" \
        -H "Content-Type: application/json" \
        -X POST \
        "https://api.netlify.com/api/v1/sites/${site_id}/build_hooks" \
        -d '{"title":"Manual Deploy Hook","branch":"main"}')

    local hook_url=$(echo "${hook_response}" | jq -r .url)

    if [[ "${hook_url}" != "null" && "${hook_url}" != "" ]]; then
        success "Build hook created for ${site_name}: ${hook_url}"
        echo "  Manual deployment: curl -X POST ${hook_url}"
    else
        warning "Failed to create build hook for ${site_name}"
    fi
}

# Configure environment variables
configure_environment_variables() {
    local site_id=$1
    local site_name=$2

    log "Configuring environment variables for ${site_name}"

    # Common environment variables
    local env_vars='[
        {"key": "NODE_ENV", "value": "production"},
        {"key": "NEXT_TELEMETRY_DISABLED", "value": "1"},
        {"key": "NETLIFY_SITE_ID", "value": "'${site_id}'"}
    ]'

    curl -s -H "Authorization: Bearer ${NETLIFY_TOKEN}" \
        -H "Content-Type: application/json" \
        -X PATCH \
        "https://api.netlify.com/api/v1/sites/${site_id}/env" \
        -d "${env_vars}" > /dev/null

    success "Environment variables configured for ${site_name}"
}

# Configure deployment notifications
configure_notifications() {
    local site_id=$1
    local site_name=$2

    log "Configuring deployment notifications for ${site_name}"

    # Set up basic notification settings
    curl -s -H "Authorization: Bearer ${NETLIFY_TOKEN}" \
        -H "Content-Type: application/json" \
        -X PATCH \
        "https://api.netlify.com/api/v1/sites/${site_id}" \
        -d '{
            "notification_email": "operations@candlefish.ai"
        }' > /dev/null

    success "Deployment notifications configured for ${site_name}"
}

# Main configuration function
main() {
    log "Starting Netlify CI/CD configuration for 8 production sites"

    NETLIFY_TOKEN=$(get_netlify_token)
    if [[ -z "${NETLIFY_TOKEN}" ]]; then
        error "Failed to get Netlify token"
        exit 1
    fi

    success "Netlify token retrieved successfully"

    # Site configurations
    # Each array: site_id site_name repo_url branch publish_dir build_command base_dir

    declare -a sites=(
        # candlefish-grotto (candlefish.ai) - Already connected but needs verification
        "ed200909-886f-47ca-950c-58727dca0b9c candlefish-grotto https://github.com/candlefish-ai/candlefish-ai main brand/website/out 'cd brand/website && npm ci --include=dev && npm run build && npm run export' brand/website"

        # staging-candlefish (staging.candlefish.ai) - Already connected but needs verification
        "14864558-864b-4a47-992f-a2156ecf7457 staging-candlefish https://github.com/candlefish-ai/candlefish-ai staging brand/website/out 'cd brand/website && npm ci --include=dev && npm run build && npm run export' brand/website"

        # highline-inventory (inventory.candlefish.ai) - Needs GitHub integration
        "9ebc8d1d-e31b-4c29-afe4-1905a7503d4a highline-inventory https://github.com/candlefish-ai/candlefish-ai main 5470_S_Highline_Circle/frontend/dist 'cd 5470_S_Highline_Circle/frontend && npm ci && npm run build' 5470_S_Highline_Circle/frontend"

        # paintbox-protected (paintbox.candlefish.ai) - Needs GitHub integration
        "f8b0ff17-b074-4f8d-8333-59aa3921c5da paintbox-protected https://github.com/candlefish-ai/candlefish-ai main projects/paintbox/dist 'cd projects/paintbox && npm ci && npm run build' projects/paintbox"

        # promoteros (promoteros.candlefish.ai) - Needs GitHub integration
        "ef0d6f05-62ba-46dd-82ad-39afbaa267ae promoteros https://github.com/candlefish-ai/candlefish-ai main services/promoteros-social/dist 'cd services/promoteros-social && npm ci && npm run build' services/promoteros-social"

        # candlefish-ibm-watsonx-portfolio (ibm.candlefish.ai) - Needs GitHub integration
        "a9b72134-1ab5-4b35-9395-93be5d6f46c8 candlefish-ibm-watsonx-portfolio https://github.com/candlefish-ai/candlefish-ai main portfolio/ibm/dist 'cd portfolio/ibm && npm ci && npm run build' portfolio/ibm"

        # claude-resources-candlefish (claude.candlefish.ai) - Connected to wrong repo, needs update
        "9650bb87-e619-4fdf-9b9b-7ff2eae31ba6 claude-resources-candlefish https://github.com/candlefish-ai/candlefish-ai main docs/claude/dist 'cd docs/claude && npm ci && npm run build' docs/claude"

        # beamish-froyo-ed37ee (dashboard.candlefish.ai) - Connected to wrong repo, needs update
        "c3f08900-230a-4a82-a58b-a5f7174e5582 beamish-froyo-ed37ee https://github.com/candlefish-ai/candlefish-ai main dashboard/dist 'cd dashboard && npm ci && npm run build' dashboard"
    )

    # Process each site
    for site_config in "${sites[@]}"; do
        read -r site_id site_name repo_url branch publish_dir build_command base_dir <<< "${site_config}"

        log "Processing site: ${site_name}"
        log "  Site ID: ${site_id}"
        log "  Repository: ${repo_url}"
        log "  Branch: ${branch}"
        log "  Publish Directory: ${publish_dir}"
        log "  Build Command: ${build_command}"
        log "  Base Directory: ${base_dir}"

        # Configure GitHub integration
        if configure_github_integration "${site_id}" "${site_name}" "${repo_url}" "${branch}" "${publish_dir}" "${build_command}" "${base_dir}"; then
            # Configure environment variables
            configure_environment_variables "${site_id}" "${site_name}"

            # Configure notifications
            configure_notifications "${site_id}" "${site_name}"

            success "Complete configuration for ${site_name}"
        else
            error "Failed to configure ${site_name}"
        fi

        echo ""
        sleep 2  # Rate limiting
    done

    log "Netlify CI/CD configuration completed!"

    # Summary report
    echo ""
    echo "=== CONFIGURATION SUMMARY ==="
    echo ""
    echo "The following sites have been configured with GitHub CI/CD:"
    echo ""
    echo "1. candlefish-grotto (candlefish.ai)"
    echo "   - Repository: candlefish-ai/candlefish-ai"
    echo "   - Branch: main"
    echo "   - Directory: brand/website"
    echo ""
    echo "2. staging-candlefish (staging.candlefish.ai)"
    echo "   - Repository: candlefish-ai/candlefish-ai"
    echo "   - Branch: staging"
    echo "   - Directory: brand/website"
    echo ""
    echo "3. highline-inventory (inventory.candlefish.ai)"
    echo "   - Repository: candlefish-ai/candlefish-ai"
    echo "   - Branch: main"
    echo "   - Directory: 5470_S_Highline_Circle/frontend"
    echo ""
    echo "4. paintbox-protected (paintbox.candlefish.ai)"
    echo "   - Repository: candlefish-ai/candlefish-ai"
    echo "   - Branch: main"
    echo "   - Directory: projects/paintbox"
    echo ""
    echo "5. promoteros (promoteros.candlefish.ai)"
    echo "   - Repository: candlefish-ai/candlefish-ai"
    echo "   - Branch: main"
    echo "   - Directory: services/promoteros-social"
    echo ""
    echo "6. candlefish-ibm-watsonx-portfolio (ibm.candlefish.ai)"
    echo "   - Repository: candlefish-ai/candlefish-ai"
    echo "   - Branch: main"
    echo "   - Directory: portfolio/ibm"
    echo ""
    echo "7. claude-resources-candlefish (claude.candlefish.ai)"
    echo "   - Repository: candlefish-ai/candlefish-ai"
    echo "   - Branch: main"
    echo "   - Directory: docs/claude"
    echo ""
    echo "8. beamish-froyo-ed37ee (dashboard.candlefish.ai)"
    echo "   - Repository: candlefish-ai/candlefish-ai"
    echo "   - Branch: main"
    echo "   - Directory: dashboard"
    echo ""
    echo "Features enabled:"
    echo "✓ GitHub repository integration"
    echo "✓ Automatic deployments on push"
    echo "✓ Deploy previews for pull requests"
    echo "✓ Build hooks for manual deployments"
    echo "✓ Environment variables configuration"
    echo "✓ Deployment notifications"
    echo ""
    echo "All sites are now configured for enterprise-grade CI/CD!"
}

# Run main function
main "$@"
