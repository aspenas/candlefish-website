#!/bin/bash
# Setup Claude agents and commands with Git worktrees for team sharing

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Claude Worktree Setup for Team Collaboration${NC}"
echo "============================================="

# Configuration
MAIN_REPO_PATH="$(pwd)"
CLAUDE_BASE="$HOME/.claude"
AGENTS_UPSTREAM="https://github.com/wshobson/agents.git"
COMMANDS_UPSTREAM="https://github.com/wshobson/commands.git"

# Team members (update with actual GitHub usernames)
TEAM_MEMBERS=("aaron" "tyler" "patricksmith")

# Function to setup worktree
setup_worktree() {
    local name=$1
    local upstream=$2
    local branch=$3

    echo -e "${YELLOW}Setting up $name worktree...${NC}"

    # Check if worktree already exists
    if git worktree list | grep -q "$CLAUDE_BASE/$name"; then
        echo -e "${GREEN}✓ Worktree already exists: $CLAUDE_BASE/$name${NC}"
        return
    fi

    # Create worktree
    git worktree add -B "claude-$name" "$CLAUDE_BASE/$name"

    # Setup in worktree
    cd "$CLAUDE_BASE/$name"

    # Initialize if needed
    if [ ! -d ".git" ]; then
        git init
    fi

    # Add upstream remote
    git remote add upstream "$upstream" 2>/dev/null || git remote set-url upstream "$upstream"

    # Fetch and merge upstream
    echo -e "${YELLOW}Fetching from upstream...${NC}"
    git fetch upstream main
    git merge upstream/main --allow-unrelated-histories -m "Merge upstream $name"

    # Return to main repo
    cd "$MAIN_REPO_PATH"

    echo -e "${GREEN}✓ $name worktree setup complete${NC}"
}

# Function to setup team permissions
setup_team_permissions() {
    echo -e "${YELLOW}Setting up team permissions...${NC}"

    # Create team access file
    cat > "$CLAUDE_BASE/TEAM_ACCESS.md" << EOF
# Claude Resources Team Access

## Team Members
$(for member in "${TEAM_MEMBERS[@]}"; do echo "- @$member"; done)

## Access Permissions
All team members have read/write access to:
- Agents repository worktree
- Commands repository worktree

## Sync Instructions
To sync your local copy with upstream:
\`\`\`bash
cd ~/.claude/agents
git fetch upstream main
git merge upstream/main

cd ~/.claude/commands
git fetch upstream main
git merge upstream/main
\`\`\`

## GitHub Actions
- Automatic sync runs every 6 hours
- Manual sync: \`gh workflow run claude-agents-sync.yml\`
EOF

    echo -e "${GREEN}✓ Team permissions documented${NC}"
}

# Function to create sync script
create_sync_script() {
    echo -e "${YELLOW}Creating sync script...${NC}"

    cat > "$CLAUDE_BASE/sync-claude-resources.sh" << 'EOF'
#!/bin/bash
# Sync Claude resources with upstream

set -e

echo "🔄 Syncing Claude resources..."

# Sync agents
if [ -d "$HOME/.claude/agents" ]; then
    cd "$HOME/.claude/agents"
    git fetch upstream main
    git merge upstream/main
    echo "✓ Agents synced"
fi

# Sync commands
if [ -d "$HOME/.claude/commands" ]; then
    cd "$HOME/.claude/commands"
    git fetch upstream main
    git merge upstream/main
    echo "✓ Commands synced"
fi

echo "✅ Sync complete!"
EOF

    chmod +x "$CLAUDE_BASE/sync-claude-resources.sh"
    echo -e "${GREEN}✓ Sync script created${NC}"
}

# Main setup process
main() {
    # Ensure we're in a git repository
    if [ ! -d ".git" ]; then
        echo -e "${RED}Error: Not in a git repository${NC}"
        exit 1
    fi

    # Create .claude directory
    mkdir -p "$CLAUDE_BASE"

    # Setup worktrees
    setup_worktree "agents" "$AGENTS_UPSTREAM" "claude-agents"
    setup_worktree "commands" "$COMMANDS_UPSTREAM" "claude-commands"

    # Setup team permissions
    setup_team_permissions

    # Create sync script
    create_sync_script

    # Create .gitignore for main repo
    if ! grep -q "^\.claude/\*$" .gitignore 2>/dev/null; then
        echo -e "${YELLOW}Adding .claude to .gitignore...${NC}"
        echo ".claude/*" >> .gitignore
        echo "!.claude/agents/" >> .gitignore
        echo "!.claude/commands/" >> .gitignore
    fi

    # Summary
    echo
    echo -e "${BLUE}Setup Complete!${NC}"
    echo "=============="
    echo
    echo "Worktrees created:"
    git worktree list | grep claude || true
    echo
    echo "Resources available:"
    echo "- Agents: $(find "$CLAUDE_BASE/agents" -name "*.md" -type f 2>/dev/null | wc -l) files"
    echo "- Commands: $(find "$CLAUDE_BASE/commands" -name "*.md" -type f 2>/dev/null | wc -l) files"
    echo
    echo "Team sync commands:"
    echo "  gh workflow run claude-agents-sync.yml    # GitHub Action sync"
    echo "  ~/.claude/sync-claude-resources.sh        # Local sync"
    echo
    echo "Share with team:"
    echo "  1. Commit and push these changes"
    echo "  2. Team members run: gh workflow run claude-team-setup.yml"
    echo "  3. Or run: ./scripts/setup-claude-worktrees.sh"
}

# Run main setup
main
