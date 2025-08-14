#!/bin/bash

# Complete Candlefish GitHub Migration Script
# Handles repository transfer, worktree updates, and workflow modifications

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SOURCE_USER="aspenas"
TARGET_ORG="${1:-candlefish}"  # Can override with first argument

# Phase 1 Critical Repositories
REPOS_PHASE1=(
    "candlefish-ai"
    "candlefish-temporal-platform"
    "paintbox-production"
    "paintbox-backend"
    "aws-keychain-sync"
)

# Phase 2 Client Projects
REPOS_PHASE2=(
    "fogg-calendar-dashboard"
    "candlefish-crown"
    "bart-excel"
    "bart"
    "clark-county-permits-scraper"
)

# Phase 3 Tools & Documentation
REPOS_PHASE3=(
    "claude-code-setup"
    "claude-review-dashboard"
    "olo-dashboard"
)

echo "════════════════════════════════════════════════════════"
echo "     🐠 Candlefish GitHub Enterprise Migration Tool 🐠"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Source User: ${CYAN}$SOURCE_USER${NC}"
echo "Target Org:  ${CYAN}$TARGET_ORG${NC}"
echo ""

# Check if organization exists
check_org() {
    echo -n "Checking if $TARGET_ORG organization exists... "
    if gh api orgs/$TARGET_ORG --jq '.login' 2>/dev/null >/dev/null; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        echo ""
        echo -e "${YELLOW}Organization '$TARGET_ORG' not found!${NC}"
        echo "Please create it at: https://github.com/organizations/new"
        echo "Or provide an existing org name as argument: $0 <org-name>"
        exit 1
    fi
}

# Function to transfer repository
transfer_repo() {
    local repo=$1
    echo -e "\n${BLUE}Processing: $repo${NC}"

    # Check if repo exists in source
    if ! gh repo view $SOURCE_USER/$repo --json name >/dev/null 2>&1; then
        echo -e "  ${RED}✗ Repository not found in $SOURCE_USER${NC}"
        return 1
    fi

    # Check if already in target org
    if gh repo view $TARGET_ORG/$repo --json name >/dev/null 2>&1; then
        echo -e "  ${YELLOW}⚠ Already exists in $TARGET_ORG${NC}"
        return 0
    fi

    # Transfer repository (preserves issues, PRs, stars, watchers)
    echo -e "  Transferring ownership to $TARGET_ORG..."
    if gh api repos/$SOURCE_USER/$repo/transfer \
        --method POST \
        --field new_owner=$TARGET_ORG \
        --field new_name=$repo >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓ Successfully transferred${NC}"
        return 0
    else
        echo -e "  ${YELLOW}⚠ Transfer failed - trying clone method${NC}"
        clone_and_push_repo "$repo"
    fi
}

# Fallback: Clone and push method
clone_and_push_repo() {
    local repo=$1
    local temp_dir="/tmp/migrate-$repo-$$"

    echo -e "  Cloning $repo..."
    git clone --mirror "https://github.com/$SOURCE_USER/$repo.git" "$temp_dir" 2>/dev/null

    cd "$temp_dir"

    # Create repo in target org
    echo -e "  Creating repository in $TARGET_ORG..."
    gh repo create "$TARGET_ORG/$repo" --private 2>/dev/null || true

    # Update remote and push
    git remote set-url origin "https://github.com/$TARGET_ORG/$repo.git"
    echo -e "  Pushing all branches and tags..."
    git push --mirror 2>/dev/null

    # Cleanup
    cd /
    rm -rf "$temp_dir"

    echo -e "  ${GREEN}✓ Migrated via clone/push${NC}"
}

# Update local repository remotes
update_local_remote() {
    local repo=$1
    local local_path=$2

    if [ -d "$local_path/.git" ]; then
        echo -e "  Updating: $local_path"
        cd "$local_path"
        git remote set-url origin "https://github.com/$TARGET_ORG/$repo.git" 2>/dev/null
        echo -e "  ${GREEN}✓${NC}"
    fi
}

# Update GitHub Actions workflows
update_workflows() {
    local workflow_dir="/Users/patricksmith/candlefish-ai/.github/workflows"

    if [ -d "$workflow_dir" ]; then
        echo -e "\n${YELLOW}Updating GitHub Actions workflows...${NC}"
        cd "$workflow_dir"

        for file in *.yml *.yaml; do
            if [ -f "$file" ]; then
                echo -e "  Updating $file"
                # Update repository references
                sed -i.bak "s|$SOURCE_USER/candlefish-ai|$TARGET_ORG/candlefish-ai|g" "$file"
                sed -i.bak "s|aspenas/|$TARGET_ORG/|g" "$file"
                rm -f "${file}.bak"
            fi
        done
        echo -e "  ${GREEN}✓ Workflows updated${NC}"
    fi
}

# Main execution
check_org

echo ""
echo "Migration Plan:"
echo "───────────────────────────────────────────"
echo -e "${CYAN}Phase 1: Critical Business Repos${NC}"
for repo in "${REPOS_PHASE1[@]}"; do
    echo "  • $repo"
done
echo ""
echo -e "${CYAN}Phase 2: Client Projects${NC}"
for repo in "${REPOS_PHASE2[@]}"; do
    echo "  • $repo"
done
echo ""
echo -e "${CYAN}Phase 3: Tools & Documentation${NC}"
for repo in "${REPOS_PHASE3[@]}"; do
    echo "  • $repo"
done
echo "───────────────────────────────────────────"

read -p "Begin migration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 0
fi

# Phase 1: Critical repos
echo -e "\n${CYAN}═══ Phase 1: Critical Business Repositories ═══${NC}"
for repo in "${REPOS_PHASE1[@]}"; do
    transfer_repo "$repo"
done

# Update local remotes for Phase 1
echo -e "\n${YELLOW}Updating local repository remotes...${NC}"
update_local_remote "candlefish-ai" "/Users/patricksmith/candlefish-ai"
update_local_remote "candlefish-ai" "/Users/patricksmith/candlefish-ai-clean"

# Update all worktrees
for worktree in /Users/patricksmith/candlefish-worktrees/*; do
    if [ -d "$worktree/.git" ]; then
        update_local_remote "candlefish-ai" "$worktree"
    fi
done

update_local_remote "aws-keychain-sync" "/Users/patricksmith/0l0/active/aws-keychain-sync"

# Update workflows
update_workflows

# Commit workflow changes
cd /Users/patricksmith/candlefish-ai
if git diff --quiet; then
    echo "No workflow changes needed"
else
    git add .github/workflows/
    git commit -m "chore: Update GitHub Actions to use $TARGET_ORG organization

- Updated all workflow references from $SOURCE_USER to $TARGET_ORG
- Migrated to enterprise organization structure
- Part of Candlefish enterprise migration

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
    echo -e "${GREEN}✓ Committed workflow updates${NC}"
fi

# Phase 2: Client projects
echo -e "\n${CYAN}═══ Phase 2: Client Projects ═══${NC}"
read -p "Continue with Phase 2? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    for repo in "${REPOS_PHASE2[@]}"; do
        transfer_repo "$repo"
    done
fi

# Phase 3: Tools & Documentation
echo -e "\n${CYAN}═══ Phase 3: Tools & Documentation ═══${NC}"
read -p "Continue with Phase 3? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    for repo in "${REPOS_PHASE3[@]}"; do
        transfer_repo "$repo"
    done
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo -e "         ${GREEN}✨ Migration Complete! ✨${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. [ ] Verify repositories at: https://github.com/$TARGET_ORG"
echo "2. [ ] Update GitHub Actions secrets:"
echo "       https://github.com/organizations/$TARGET_ORG/settings/secrets"
echo "3. [ ] Update deployment webhooks:"
echo "       • Vercel: https://vercel.com/account/integrations"
echo "       • Netlify: https://app.netlify.com/account/applications"
echo "       • Fly.io: Update via flyctl"
echo "4. [ ] Invite team members:"
echo "       https://github.com/orgs/$TARGET_ORG/people"
echo "5. [ ] Update AWS Secrets Manager references"
echo "6. [ ] Archive old repos at https://github.com/$SOURCE_USER?tab=repositories"
echo ""
echo "Run './scripts/migrate-secrets.sh' to migrate GitHub secrets"
echo "Run './scripts/update-deployments.sh' to update deployment hooks"
