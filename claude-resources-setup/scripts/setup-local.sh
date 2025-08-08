#!/bin/bash
# Candlefish Claude Resources - Local Setup Script
# This script sets up a team member's local environment to use shared Claude resources

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
ORG_NAME="candlefish"
CLAUDE_REPO="claude-resources"
CLAUDE_RESOURCES_URL="https://github.com/$ORG_NAME/$CLAUDE_REPO.git"
CLAUDE_HOME="$HOME/.claude"
CANDLEFISH_DIR="$HOME/code/candlefish"  # Default Candlefish projects directory

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║      Candlefish Claude Resources Setup            ║"
echo "║      Organization-wide Agent & Command Sharing    ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    # Check git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}✗ Git is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Git installed${NC}"

    # Check GitHub CLI (optional but recommended)
    if command -v gh &> /dev/null; then
        echo -e "${GREEN}✓ GitHub CLI installed${NC}"
    else
        echo -e "${YELLOW}⚠ GitHub CLI not installed (optional)${NC}"
    fi
}

# Function to setup organization directory
setup_org_directory() {
    echo -e "\n${YELLOW}Setting up Candlefish organization directory...${NC}"

    # Ask for custom directory
    read -p "Enter Candlefish projects directory [$CANDLEFISH_DIR]: " custom_dir
    if [ -n "$custom_dir" ]; then
        CANDLEFISH_DIR="$custom_dir"
    fi

    # Create directory
    mkdir -p "$CANDLEFISH_DIR"
    echo -e "${GREEN}✓ Created $CANDLEFISH_DIR${NC}"
}

# Function to clone claude-resources repository
clone_claude_resources() {
    echo -e "\n${YELLOW}Cloning Claude resources repository...${NC}"

    CLAUDE_RESOURCES_PATH="$CANDLEFISH_DIR/$CLAUDE_REPO"

    if [ -d "$CLAUDE_RESOURCES_PATH" ]; then
        echo -e "${BLUE}Repository already exists, updating...${NC}"
        cd "$CLAUDE_RESOURCES_PATH"
        git pull origin main
    else
        cd "$CANDLEFISH_DIR"
        git clone "$CLAUDE_RESOURCES_URL"
        echo -e "${GREEN}✓ Cloned claude-resources repository${NC}"
    fi
}

# Function to setup symlinks
setup_symlinks() {
    echo -e "\n${YELLOW}Setting up symlinks for ~/.claude...${NC}"

    # Backup existing .claude if it exists and is not a symlink
    if [ -e "$CLAUDE_HOME" ] && [ ! -L "$CLAUDE_HOME" ]; then
        BACKUP_DIR="$CLAUDE_HOME.backup.$(date +%Y%m%d-%H%M%S)"
        echo -e "${YELLOW}Backing up existing ~/.claude to $BACKUP_DIR${NC}"
        mv "$CLAUDE_HOME" "$BACKUP_DIR"
    fi

    # Remove existing symlink if it exists
    if [ -L "$CLAUDE_HOME" ]; then
        rm "$CLAUDE_HOME"
    fi

    # Create symlink to organization claude resources
    ln -s "$CLAUDE_RESOURCES_PATH/.claude" "$CLAUDE_HOME"
    echo -e "${GREEN}✓ Created symlink: ~/.claude -> $CLAUDE_RESOURCES_PATH/.claude${NC}"
}

# Function to setup git worktree support
setup_worktree_support() {
    echo -e "\n${YELLOW}Setting up Git worktree support...${NC}"

    # Create worktree setup script
    cat > "$CANDLEFISH_DIR/setup-claude-worktree.sh" << 'WORKTREE_SCRIPT'
#!/bin/bash
# Setup Claude resources for a Git worktree

WORKTREE_PATH="$1"
CLAUDE_RESOURCES_PATH="$(dirname "$0")/claude-resources/.claude"

if [ -z "$WORKTREE_PATH" ]; then
    echo "Usage: $0 <worktree-path>"
    exit 1
fi

if [ ! -d "$WORKTREE_PATH" ]; then
    echo "Error: Worktree path does not exist: $WORKTREE_PATH"
    exit 1
fi

# Create .claude symlink in worktree
ln -sfn "$CLAUDE_RESOURCES_PATH" "$WORKTREE_PATH/.claude"
echo "✓ Claude resources linked in worktree: $WORKTREE_PATH"
WORKTREE_SCRIPT

    chmod +x "$CANDLEFISH_DIR/setup-claude-worktree.sh"
    echo -e "${GREEN}✓ Created worktree setup script${NC}"
}

# Function to setup auto-update
setup_auto_update() {
    echo -e "\n${YELLOW}Setting up auto-update...${NC}"

    # Create update script
    cat > "$CANDLEFISH_DIR/update-claude-resources.sh" << 'UPDATE_SCRIPT'
#!/bin/bash
# Update Claude resources from upstream

cd "$(dirname "$0")/claude-resources"
git pull origin main
echo "✓ Claude resources updated"

# Show update summary
echo -e "\nUpdate summary:"
git log --oneline -5
UPDATE_SCRIPT

    chmod +x "$CANDLEFISH_DIR/update-claude-resources.sh"
    echo -e "${GREEN}✓ Created update script${NC}"

    # Add to shell profile for periodic reminders
    SHELL_PROFILE=""
    if [ -f "$HOME/.zshrc" ]; then
        SHELL_PROFILE="$HOME/.zshrc"
    elif [ -f "$HOME/.bashrc" ]; then
        SHELL_PROFILE="$HOME/.bashrc"
    fi

    if [ -n "$SHELL_PROFILE" ]; then
        # Check if already added
        if ! grep -q "claude-resources-update-check" "$SHELL_PROFILE"; then
            echo -e "\n# Candlefish Claude resources update check" >> "$SHELL_PROFILE"
            echo "# claude-resources-update-check" >> "$SHELL_PROFILE"
            echo "if [ -f \"$CANDLEFISH_DIR/update-claude-resources.sh\" ]; then" >> "$SHELL_PROFILE"
            echo "    # Check once per day" >> "$SHELL_PROFILE"
            echo "    LAST_CHECK_FILE=\"$HOME/.claude-last-update-check\"" >> "$SHELL_PROFILE"
            echo "    if [ ! -f \"\$LAST_CHECK_FILE\" ] || [ \$(find \"\$LAST_CHECK_FILE\" -mtime +1 2>/dev/null) ]; then" >> "$SHELL_PROFILE"
            echo "        echo \"💡 Reminder: Run '$CANDLEFISH_DIR/update-claude-resources.sh' to update Claude resources\"" >> "$SHELL_PROFILE"
            echo "        touch \"\$LAST_CHECK_FILE\"" >> "$SHELL_PROFILE"
            echo "    fi" >> "$SHELL_PROFILE"
            echo "fi" >> "$SHELL_PROFILE"
            echo -e "${GREEN}✓ Added update reminder to shell profile${NC}"
        fi
    fi
}

# Function to verify installation
verify_installation() {
    echo -e "\n${YELLOW}Verifying installation...${NC}"

    # Check symlink
    if [ -L "$CLAUDE_HOME" ]; then
        echo -e "${GREEN}✓ ~/.claude symlink is set up correctly${NC}"
    else
        echo -e "${RED}✗ ~/.claude symlink is not set up${NC}"
        return 1
    fi

    # Count resources
    if [ -d "$CLAUDE_HOME/agents" ]; then
        AGENT_COUNT=$(find "$CLAUDE_HOME/agents" -name "*.md" -type f 2>/dev/null | wc -l)
        echo -e "${GREEN}✓ Found $AGENT_COUNT agents${NC}"
    fi

    if [ -d "$CLAUDE_HOME/commands" ]; then
        COMMAND_COUNT=$(find "$CLAUDE_HOME/commands" -name "*.md" -type f 2>/dev/null | wc -l)
        echo -e "${GREEN}✓ Found $COMMAND_COUNT commands${NC}"
    fi

    # Check for worktree projects
    echo -e "\n${YELLOW}Checking for existing Candlefish projects...${NC}"
    if [ -d "$CANDLEFISH_DIR" ]; then
        PROJECTS=$(find "$CANDLEFISH_DIR" -maxdepth 2 -name ".git" -type d 2>/dev/null | wc -l)
        echo -e "${BLUE}Found $PROJECTS Git repositories in $CANDLEFISH_DIR${NC}"
    fi
}

# Function to show next steps
show_next_steps() {
    echo -e "\n${BLUE}╔═══════════════════════════════════════════════════╗"
    echo "║                  Setup Complete! 🎉               ║"
    echo "╚═══════════════════════════════════════════════════╝${NC}"

    echo -e "\n${GREEN}Next steps:${NC}"
    echo "1. Your ~/.claude directory now links to the organization resources"
    echo "2. All Candlefish projects will automatically use these resources"
    echo "3. To update resources: $CANDLEFISH_DIR/update-claude-resources.sh"
    echo "4. To setup a worktree: $CANDLEFISH_DIR/setup-claude-worktree.sh <path>"

    echo -e "\n${GREEN}Quick commands:${NC}"
    echo "  cd ~/.claude/agents     # Browse available agents"
    echo "  cd ~/.claude/commands   # Browse available commands"
    echo "  $CANDLEFISH_DIR/update-claude-resources.sh  # Update resources"

    echo -e "\n${YELLOW}Important:${NC}"
    echo "- Resources are shared across all team members"
    echo "- Updates happen automatically via GitHub Actions"
    echo "- Custom additions should be made via PR to claude-resources repo"
}

# Main execution
main() {
    check_prerequisites
    setup_org_directory
    clone_claude_resources
    setup_symlinks
    setup_worktree_support
    setup_auto_update
    verify_installation
    show_next_steps
}

# Run main function
main "$@"
