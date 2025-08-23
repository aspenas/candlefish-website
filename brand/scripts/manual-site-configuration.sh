#!/bin/bash

# Manual configuration for individual Netlify sites
set -euo pipefail

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

NETLIFY_TOKEN=$(aws secretsmanager get-secret-value --secret-id "netlify/ibm-portfolio/auth-token" --query SecretString --output text | jq -r .token)

configure_site() {
    local site_id=$1
    local site_name=$2
    local repo_url=$3
    local branch=$4
    local base_dir=$5
    local build_cmd=$6
    local publish_dir=$7

    log "Configuring ${site_name}..."

    # Connect to GitHub repository
    local response=$(curl -s -w "%{http_code}" -o /tmp/netlify_config.json \
        -X PATCH \
        -H "Authorization: Bearer $NETLIFY_TOKEN" \
        -H "Content-Type: application/json" \
        "https://api.netlify.com/api/v1/sites/${site_id}" \
        -d "{
            \"build_settings\": {
                \"repo\": \"${repo_url}\",
                \"branch\": \"${branch}\",
                \"base\": \"${base_dir}\",
                \"cmd\": \"${build_cmd}\",
                \"dir\": \"${publish_dir}\"
            }
        }")

    local http_code="${response: -3}"

    if [[ "${http_code}" == "200" ]]; then
        success "${site_name} configured successfully"

        # Enable deploy previews
        curl -s -X PATCH \
            -H "Authorization: Bearer $NETLIFY_TOKEN" \
            -H "Content-Type: application/json" \
            "https://api.netlify.com/api/v1/sites/${site_id}" \
            -d '{"processing_settings": {"skip_prs": false}}' > /dev/null

        success "${site_name} deploy previews enabled"
    else
        error "${site_name} configuration failed (HTTP ${http_code})"
        cat /tmp/netlify_config.json
    fi
}

main() {
    log "Starting manual configuration of Netlify sites..."

    # 1. highline-inventory (inventory.candlefish.ai)
    configure_site \
        "9ebc8d1d-e31b-4c29-afe4-1905a7503d4a" \
        "highline-inventory" \
        "https://github.com/candlefish-ai/candlefish-ai" \
        "main" \
        "5470_S_Highline_Circle/frontend" \
        "npm ci && npm run build" \
        "5470_S_Highline_Circle/frontend/dist"

    # 2. paintbox-protected (paintbox.candlefish.ai)
    configure_site \
        "f8b0ff17-b074-4f8d-8333-59aa3921c5da" \
        "paintbox-protected" \
        "https://github.com/candlefish-ai/candlefish-ai" \
        "main" \
        "projects/paintbox" \
        "npm ci && npm run build" \
        "projects/paintbox/dist"

    # 3. promoteros (promoteros.candlefish.ai)
    configure_site \
        "ef0d6f05-62ba-46dd-82ad-39afbaa267ae" \
        "promoteros" \
        "https://github.com/candlefish-ai/candlefish-ai" \
        "main" \
        "services/promoteros-social" \
        "npm ci && npm run build" \
        "services/promoteros-social/dist"

    # 4. candlefish-ibm-watsonx-portfolio (ibm.candlefish.ai)
    configure_site \
        "a9b72134-1ab5-4b35-9395-93be5d6f46c8" \
        "candlefish-ibm-watsonx-portfolio" \
        "https://github.com/candlefish-ai/candlefish-ai" \
        "main" \
        "portfolio/ibm" \
        "npm ci && npm run build" \
        "portfolio/ibm/dist"

    # 5. Fix claude-resources-candlefish repo
    configure_site \
        "9650bb87-e619-4fdf-9b9b-7ff2eae31ba6" \
        "claude-resources-candlefish" \
        "https://github.com/candlefish-ai/candlefish-ai" \
        "main" \
        "docs/claude" \
        "npm ci && npm run build" \
        "docs/claude/dist"

    # 6. Fix beamish-froyo-ed37ee repo
    configure_site \
        "c3f08900-230a-4a82-a58b-a5f7174e5582" \
        "beamish-froyo-ed37ee" \
        "https://github.com/candlefish-ai/candlefish-ai" \
        "main" \
        "dashboard" \
        "npm ci && npm run build" \
        "dashboard/dist"

    success "All manual configurations completed!"

    # Final verification
    log "Final verification of all sites..."
    curl -s -H "Authorization: Bearer $NETLIFY_TOKEN" "https://api.netlify.com/api/v1/sites" | \
    jq -r '.[] | select(.custom_domain) | "Site: \(.name) (\(.custom_domain)) - Repo: \(.build_settings.repo_url // "NOT CONNECTED") - Branch: \(.build_settings.repo_branch // "NONE")"'
}

main "$@"
