#!/bin/bash

# Candlefish GitHub Enterprise Migration Script
# Migrates repositories from personal account to enterprise

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🚀 Candlefish GitHub Enterprise Migration Tool"
echo "=============================================="

# Configuration - UPDATE THESE
SOURCE_USER="aspenas"
ENTERPRISE_URL="${GITHUB_ENTERPRISE_URL:-github.com}"  # Set via environment variable
TARGET_ORG="${GITHUB_TARGET_ORG:-candlefish}"          # Set via environment variable

# Phase 1 Repositories
REPOS_PHASE1=(
    "candlefish-ai"
    "candlefish-temporal-platform"
    "paintbox-production"
    "paintbox-backend"
    "aws-keychain-sync"
)

# Check environment
echo -e "${YELLOW}Checking configuration...${NC}"
echo "  Source: $SOURCE_USER"
echo "  Target Org: $TARGET_ORG"
echo "  Enterprise URL: $ENTERPRISE_URL"

# Function to check if we're using enterprise
is_enterprise() {
    [[ "$ENTERPRISE_URL" != "github.com" ]]
}

# Function to setup enterprise authentication
setup_enterprise_auth() {
    if is_enterprise; then
        echo -e "${YELLOW}Setting up Enterprise authentication...${NC}"

        # Check if already authenticated to enterprise
        if gh auth status --hostname "$ENTERPRISE_URL" 2>/dev/null; then
            echo -e "${GREEN}✓ Already authenticated to $ENTERPRISE_URL${NC}"
        else
            echo -e "${YELLOW}Need to authenticate to $ENTERPRISE_URL${NC}"
            echo "Please run: gh auth login --hostname $ENTERPRISE_URL"
            exit 1
        fi
    fi
}

# Function to clone and push repository
migrate_via_push() {
    local repo=$1
    local temp_dir="/tmp/migrate-$repo-$$"

    echo -e "\n${YELLOW}Migrating $repo via clone/push method${NC}"

    # Clone from source
    echo "  Cloning from $SOURCE_USER/$repo..."
    git clone --mirror "https://github.com/$SOURCE_USER/$repo.git" "$temp_dir"

    cd "$temp_dir"

    # Update remote
    if is_enterprise; then
        git remote set-url origin "https://$ENTERPRISE_URL/$TARGET_ORG/$repo.git"
    else
        git remote set-url origin "https://github.com/$TARGET_ORG/$repo.git"
    fi

    # Create repo in target org
    echo "  Creating repository in $TARGET_ORG..."
    if is_enterprise; then
        gh repo create "$TARGET_ORG/$repo" --private --hostname "$ENTERPRISE_URL" 2>/dev/null || true
    else
        gh repo create "$TARGET_ORG/$repo" --private 2>/dev/null || true
    fi

    # Push all refs
    echo "  Pushing to $TARGET_ORG/$repo..."
    git push --mirror

    # Cleanup
    cd /
    rm -rf "$temp_dir"

    echo -e "${GREEN}✓ Successfully migrated $repo${NC}"
}

# Function to update local remotes
update_local_remote() {
    local repo=$1
    local local_path=$2

    if [ -d "$local_path/.git" ]; then
        echo -e "  Updating remote for $local_path"
        cd "$local_path"

        if is_enterprise; then
            git remote set-url origin "https://$ENTERPRISE_URL/$TARGET_ORG/$repo.git"
        else
            git remote set-url origin "https://github.com/$TARGET_ORG/$repo.git"
        fi

        echo -e "${GREEN}  ✓ Updated remote URL${NC}"
    fi
}

# Main execution
setup_enterprise_auth

echo -e "\n${BLUE}Repositories to migrate:${NC}"
for repo in "${REPOS_PHASE1[@]}"; do
    echo "  • $repo"
done

read -p "Continue with migration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 0
fi

# Migrate repositories
for repo in "${REPOS_PHASE1[@]}"; do
    migrate_via_push "$repo"
done

# Update local repositories
echo -e "\n${YELLOW}Updating local repository remotes...${NC}"

update_local_remote "candlefish-ai" "/Users/patricksmith/candlefish-ai"
update_local_remote "candlefish-ai" "/Users/patricksmith/candlefish-ai-clean"

# Update worktrees
for worktree in /Users/patricksmith/candlefish-worktrees/*; do
    if [ -d "$worktree/.git" ]; then
        update_local_remote "candlefish-ai" "$worktree"
    fi
done

# Update other local repos
update_local_remote "aws-keychain-sync" "/Users/patricksmith/0l0/active/aws-keychain-sync"

echo -e "\n${GREEN}✅ Migration Complete!${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Verify all repositories are accessible in $TARGET_ORG"
echo "2. Update GitHub Actions secrets in the new organization"
echo "3. Update deployment webhooks (Vercel, Netlify, Fly.io)"
echo "4. Update team member access"
echo "5. Archive or delete source repositories from $SOURCE_USER"
