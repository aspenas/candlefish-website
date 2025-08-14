#!/bin/bash

# Candlefish GitHub Migration Script
# Migrates repositories from aspenas to Candlefish organization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SOURCE_USER="aspenas"
TARGET_ORG="candlefish"  # Update if different
REPOS_PHASE1=(
    "candlefish-ai"
    "candlefish-temporal-platform"
    "paintbox-production"
    "paintbox-backend"
    "aws-keychain-sync"
)

echo "🚀 Candlefish GitHub Migration Tool"
echo "===================================="

# Check if org exists
echo -e "${YELLOW}Checking if $TARGET_ORG organization exists...${NC}"
if gh api orgs/$TARGET_ORG --jq '.login' 2>/dev/null; then
    echo -e "${GREEN}✓ Organization $TARGET_ORG found${NC}"
else
    echo -e "${RED}✗ Organization $TARGET_ORG not found${NC}"
    echo "Please create the organization first at: https://github.com/organizations/new"
    exit 1
fi

# Function to transfer repository
transfer_repo() {
    local repo=$1
    echo -e "\n${YELLOW}Processing: $repo${NC}"
    
    # Check if repo exists in source
    if ! gh repo view $SOURCE_USER/$repo --json name >/dev/null 2>&1; then
        echo -e "${RED}  ✗ Repository $SOURCE_USER/$repo not found${NC}"
        return 1
    fi
    
    # Check if already in target org
    if gh repo view $TARGET_ORG/$repo --json name >/dev/null 2>&1; then
        echo -e "${YELLOW}  ⚠ Repository already exists in $TARGET_ORG${NC}"
        return 0
    fi
    
    # Transfer repository
    echo -e "  Transferring $repo to $TARGET_ORG..."
    if gh api repos/$SOURCE_USER/$repo/transfer \
        --method POST \
        --field new_owner=$TARGET_ORG \
        --field new_name=$repo 2>/dev/null; then
        echo -e "${GREEN}  ✓ Successfully transferred $repo${NC}"
        return 0
    else
        echo -e "${RED}  ✗ Failed to transfer $repo${NC}"
        echo "  Try manual transfer at: https://github.com/$SOURCE_USER/$repo/settings"
        return 1
    fi
}

# Function to update local remote
update_local_remote() {
    local repo=$1
    local local_path=$2
    
    if [ -d "$local_path/.git" ]; then
        echo -e "  Updating remote for local copy at $local_path"
        cd "$local_path"
        git remote set-url origin "https://github.com/$TARGET_ORG/$repo.git"
        echo -e "${GREEN}  ✓ Updated remote URL${NC}"
    fi
}

# Main migration process
echo -e "\n${YELLOW}Starting Phase 1 Migration${NC}"
echo "Repositories to migrate:"
for repo in "${REPOS_PHASE1[@]}"; do
    echo "  - $repo"
done

read -p "Continue with migration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 0
fi

# Migrate each repository
for repo in "${REPOS_PHASE1[@]}"; do
    transfer_repo "$repo"
done

echo -e "\n${YELLOW}Updating local repositories...${NC}"

# Update candlefish-ai main repo
update_local_remote "candlefish-ai" "/Users/patricksmith/candlefish-ai"
update_local_remote "candlefish-ai" "/Users/patricksmith/candlefish-ai-clean"

# Update worktrees
if [ -d "/Users/patricksmith/candlefish-worktrees" ]; then
    echo -e "${YELLOW}Updating worktree remotes...${NC}"
    for worktree in /Users/patricksmith/candlefish-worktrees/*; do
        if [ -d "$worktree/.git" ]; then
            update_local_remote "candlefish-ai" "$worktree"
        fi
    done
fi

# Update aws-keychain-sync if local
if [ -d "/Users/patricksmith/0l0/active/aws-keychain-sync/.git" ]; then
    update_local_remote "aws-keychain-sync" "/Users/patricksmith/0l0/active/aws-keychain-sync"
fi

echo -e "\n${GREEN}✓ Phase 1 Migration Complete!${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Update GitHub Actions secrets in the new organization"
echo "2. Update deployment webhooks (Vercel, Netlify, Fly.io)"
echo "3. Update any CI/CD integrations"
echo "4. Invite team members to the organization"
echo ""
echo "Run './scripts/migrate-github-secrets.sh' to migrate secrets"