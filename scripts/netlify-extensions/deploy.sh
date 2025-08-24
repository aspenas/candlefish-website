#!/bin/bash

# Netlify Extensions Deployment Script
# Automates the deployment of Netlify configurations across all Candlefish sites

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${SCRIPT_DIR}/configs"
PLUGINS_DIR="${SCRIPT_DIR}/plugins"
SITES_CONFIG="${SCRIPT_DIR}/sites.json"

# Load environment variables
if [ -f "${SCRIPT_DIR}/.env" ]; then
    export $(cat "${SCRIPT_DIR}/.env" | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env file not found. Copy .env.template to .env and configure it.${NC}"
    exit 1
fi

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    # Check for Netlify CLI
    if ! command -v netlify &> /dev/null; then
        print_error "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    fi

    # Check for jq
    if ! command -v jq &> /dev/null; then
        print_error "jq not found. Please install jq to continue."
        exit 1
    fi

    # Check Netlify authentication
    if ! netlify status &> /dev/null; then
        print_warning "Not logged in to Netlify. Please login:"
        netlify login
    fi

    print_success "Prerequisites check completed"
}

# Function to merge configurations
merge_configs() {
    local base_config="$1"
    local site_config="$2"
    local output_file="$3"

    print_status "Merging configurations for ${output_file}..."

    # Use a simple concatenation for now
    # In production, use a proper TOML merger
    cat "${base_config}" > "${output_file}"
    echo "" >> "${output_file}"
    echo "# === Site-Specific Configuration ===" >> "${output_file}"
    cat "${site_config}" >> "${output_file}"

    print_success "Configuration merged"
}

# Function to deploy configuration to a site
deploy_to_site() {
    local site_name="$1"
    local site_id="$2"
    local config_file="$3"

    print_status "Deploying to ${site_name} (${site_id})..."

    # Link the site if not already linked
    if [ ! -d ".netlify" ] || [ "$(cat .netlify/state.json | jq -r .siteId)" != "${site_id}" ]; then
        netlify link --id "${site_id}"
    fi

    # Deploy the configuration
    cp "${config_file}" netlify.toml

    # Set environment variables
    print_status "Setting environment variables..."
    while IFS='=' read -r key value; do
        if [[ ! -z "$key" && ! "$key" =~ ^# ]]; then
            netlify env:set "${key}" "${value}" --scope production 2>/dev/null || true
        fi
    done < "${SCRIPT_DIR}/.env"

    # Deploy custom plugins if they exist
    if [ -d "${PLUGINS_DIR}" ]; then
        print_status "Deploying custom plugins..."
        cp -r "${PLUGINS_DIR}" ./plugins
    fi

    # Trigger a new build
    print_status "Triggering build..."
    netlify build

    print_success "Deployment to ${site_name} completed"
}

# Function to validate configuration
validate_config() {
    local config_file="$1"

    print_status "Validating configuration: ${config_file}"

    # Check if file exists
    if [ ! -f "${config_file}" ]; then
        print_error "Configuration file not found: ${config_file}"
        return 1
    fi

    # Basic TOML validation (check for syntax errors)
    if ! python3 -c "import toml; toml.load('${config_file}')" 2>/dev/null; then
        print_error "Invalid TOML syntax in ${config_file}"
        return 1
    fi

    print_success "Configuration valid"
    return 0
}

# Function to run tests
run_tests() {
    local site_url="$1"

    print_status "Running tests for ${site_url}..."

    # Performance test
    if command -v lighthouse &> /dev/null; then
        lighthouse "${site_url}" \
            --output=json \
            --output-path="${SCRIPT_DIR}/reports/lighthouse-$(date +%s).json" \
            --chrome-flags="--headless" \
            --quiet
    fi

    # Security headers test
    curl -s -I "${site_url}" | head -20

    print_success "Tests completed"
}

# Function to rollback deployment
rollback() {
    local site_id="$1"

    print_warning "Rolling back deployment for site ${site_id}..."

    netlify rollback --id "${site_id}"

    print_success "Rollback completed"
}

# Main deployment function
main() {
    print_status "Starting Netlify Extensions Deployment"
    echo "========================================"

    # Check prerequisites
    check_prerequisites

    # Create reports directory
    mkdir -p "${SCRIPT_DIR}/reports"

    # Load sites configuration
    if [ ! -f "${SITES_CONFIG}" ]; then
        print_error "Sites configuration not found. Creating template..."
        cat > "${SITES_CONFIG}" <<EOF
{
    "sites": [
        {
            "name": "candlefish-main",
            "id": "YOUR_SITE_ID",
            "url": "https://candlefish.ai",
            "config": "candlefish-main.toml"
        },
        {
            "name": "staging",
            "id": "YOUR_SITE_ID",
            "url": "https://staging.candlefish.ai",
            "config": "staging.toml"
        },
        {
            "name": "inventory",
            "id": "YOUR_SITE_ID",
            "url": "https://inventory.candlefish.ai",
            "config": "inventory.toml"
        },
        {
            "name": "dashboard",
            "id": "YOUR_SITE_ID",
            "url": "https://dashboard.candlefish.ai",
            "config": "dashboard.toml"
        },
        {
            "name": "claude-docs",
            "id": "YOUR_SITE_ID",
            "url": "https://claude.candlefish.ai",
            "config": "claude-docs.toml"
        }
    ]
}
EOF
        print_error "Please update ${SITES_CONFIG} with your site IDs"
        exit 1
    fi

    # Parse command line arguments
    case "${1:-all}" in
        all)
            # Deploy to all sites
            sites=$(cat "${SITES_CONFIG}" | jq -r '.sites[]')
            ;;
        test)
            # Test mode - validate only
            for config in "${CONFIG_DIR}"/*.toml; do
                validate_config "${config}"
            done
            exit 0
            ;;
        rollback)
            # Rollback specific site
            if [ -z "$2" ]; then
                print_error "Site ID required for rollback"
                exit 1
            fi
            rollback "$2"
            exit 0
            ;;
        *)
            # Deploy to specific site
            sites=$(cat "${SITES_CONFIG}" | jq -r ".sites[] | select(.name==\"$1\")")
            if [ -z "${sites}" ]; then
                print_error "Site not found: $1"
                exit 1
            fi
            ;;
    esac

    # Process each site
    echo "${sites}" | while IFS= read -r site; do
        if [ ! -z "${site}" ]; then
            name=$(echo "${site}" | jq -r '.name')
            id=$(echo "${site}" | jq -r '.id')
            url=$(echo "${site}" | jq -r '.url')
            config=$(echo "${site}" | jq -r '.config')

            print_status "Processing ${name}..."

            # Validate configuration
            if ! validate_config "${CONFIG_DIR}/${config}"; then
                print_error "Skipping ${name} due to validation errors"
                continue
            fi

            # Merge base and site configs
            merged_config="${SCRIPT_DIR}/temp_${config}"
            merge_configs "${CONFIG_DIR}/base-netlify.toml" \
                         "${CONFIG_DIR}/${config}" \
                         "${merged_config}"

            # Deploy to site
            deploy_to_site "${name}" "${id}" "${merged_config}"

            # Run tests
            run_tests "${url}"

            # Clean up
            rm -f "${merged_config}"
        fi
    done

    print_success "Deployment completed successfully!"
    echo "========================================"
    print_status "View deployment status at: https://app.netlify.com"
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
