#!/bin/bash

# Update Deployment Webhooks for Candlefish Migration
# Updates Vercel, Netlify, and Fly.io to use new GitHub organization

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

NEW_ORG="candlefish-ai"
OLD_ORG="aspenas"

echo "════════════════════════════════════════════════════════"
echo "     🔄 Deployment Webhook Update Script"
echo "════════════════════════════════════════════════════════"
echo ""

# Function to update Vercel
update_vercel() {
    echo -e "${CYAN}Updating Vercel deployments...${NC}"

    if command -v vercel &> /dev/null; then
        echo "Vercel CLI found"

        # List all projects
        echo "Getting Vercel projects..."
        vercel ls 2>/dev/null | grep -E "candlefish|paintbox" | while read -r project; do
            echo "  Project: $project"
        done

        echo -e "${YELLOW}Manual steps for Vercel:${NC}"
        echo "1. Go to: https://vercel.com/account/integrations"
        echo "2. Find GitHub integration"
        echo "3. Update repository connections to candlefish-ai org"
        echo ""
    else
        echo -e "${YELLOW}Vercel CLI not found${NC}"
        echo "Install with: npm i -g vercel"
    fi
}

# Function to update Netlify
update_netlify() {
    echo -e "${CYAN}Updating Netlify deployments...${NC}"

    if command -v netlify &> /dev/null; then
        echo "Netlify CLI found"

        # Check linked site
        if [ -f ".netlify/state.json" ]; then
            SITE_ID=$(jq -r '.siteId' .netlify/state.json 2>/dev/null)
            if [ -n "$SITE_ID" ]; then
                echo "  Current site ID: $SITE_ID"

                # Update build settings
                echo "Updating build settings..."
                netlify unlink 2>/dev/null || true
                netlify link --git-remote origin 2>/dev/null || true
            fi
        fi

        echo -e "${YELLOW}Manual steps for Netlify:${NC}"
        echo "1. Go to: https://app.netlify.com/account/applications"
        echo "2. Update GitHub app authorization"
        echo "3. Reconnect repositories from candlefish-ai org"
        echo ""
    else
        echo -e "${YELLOW}Netlify CLI not found${NC}"
        echo "Install with: npm i -g netlify-cli"
    fi
}

# Function to update Fly.io
update_flyio() {
    echo -e "${CYAN}Updating Fly.io deployments...${NC}"

    if command -v flyctl &> /dev/null; then
        echo "Fly.io CLI found"

        # Check if fly.toml exists
        if [ -f "fly.toml" ]; then
            APP_NAME=$(grep "^app = " fly.toml | cut -d'"' -f2)
            echo "  App name: $APP_NAME"

            # Update secrets if needed
            echo "Checking Fly.io secrets..."
            flyctl secrets list --app "$APP_NAME" 2>/dev/null | head -5
        fi

        # For Paintbox
        if [ -f "projects/paintbox/fly.toml" ]; then
            echo "Found Paintbox Fly.io config"
            cd projects/paintbox
            APP_NAME=$(grep "^app = " fly.toml | cut -d'"' -f2)
            echo "  Paintbox app: $APP_NAME"
            cd ../..
        fi

        echo -e "${YELLOW}Manual steps for Fly.io:${NC}"
        echo "1. Update GitHub Actions secrets with FLY_API_TOKEN"
        echo "2. Ensure deployment workflows use correct repo"
        echo ""
    else
        echo -e "${YELLOW}Fly.io CLI not found${NC}"
        echo "Install with: curl -L https://fly.io/install.sh | sh"
    fi
}

# Function to update GitHub Pages
update_github_pages() {
    echo -e "${CYAN}Updating GitHub Pages settings...${NC}"

    # Check if gh-pages branch exists
    if git show-ref --verify --quiet refs/heads/gh-pages; then
        echo "gh-pages branch found"
        echo -e "${YELLOW}Update Pages settings at:${NC}"
        echo "https://github.com/$NEW_ORG/candlefish-ai/settings/pages"
    fi
}

# Function to update Docker Hub
update_docker_hub() {
    echo -e "${CYAN}Checking Docker Hub webhooks...${NC}"

    if [ -f "Dockerfile" ] || [ -f "projects/paintbox/Dockerfile" ]; then
        echo "Docker configuration found"
        echo -e "${YELLOW}Manual steps for Docker Hub:${NC}"
        echo "1. Go to: https://hub.docker.com/repositories"
        echo "2. Update any automated builds to use new GitHub org"
        echo ""
    fi
}

# Function to check CI/CD status
check_cicd_status() {
    echo -e "${CYAN}Checking CI/CD Status...${NC}"

    # Check GitHub Actions
    echo "GitHub Actions workflows:"
    gh workflow list --repo "$NEW_ORG/candlefish-ai" 2>/dev/null | head -10 || \
        echo "  Unable to fetch workflows"

    echo ""
    echo "Recent workflow runs:"
    gh run list --repo "$NEW_ORG/candlefish-ai" --limit 5 2>/dev/null || \
        echo "  No recent runs"
}

# Main execution
echo -e "${BLUE}Starting deployment webhook updates...${NC}"
echo ""

# Update each platform
update_vercel
update_netlify
update_flyio
update_github_pages
update_docker_hub

echo ""
echo -e "${BLUE}Checking CI/CD status...${NC}"
check_cicd_status

echo ""
echo "════════════════════════════════════════════════════════"
echo -e "         ${GREEN}✨ Webhook Update Complete! ✨${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}Checklist:${NC}"
echo "□ Vercel - Update GitHub integration"
echo "□ Netlify - Reconnect repositories"
echo "□ Fly.io - Verify deployments work"
echo "□ GitHub Pages - Update settings if used"
echo "□ Docker Hub - Update automated builds"
echo ""
echo -e "${GREEN}Quick Links:${NC}"
echo "• Vercel: https://vercel.com/account/integrations"
echo "• Netlify: https://app.netlify.com/account/applications"
echo "• GitHub Actions: https://github.com/$NEW_ORG/candlefish-ai/actions"
echo "• Repository: https://github.com/$NEW_ORG/candlefish-ai"
