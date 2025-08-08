#!/bin/bash
# Setup Claude resources for Git worktrees
# This script integrates Claude resources with all Candlefish Git worktrees

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
CLAUDE_HOME="$HOME/.claude"
CANDLEFISH_DIR="${CANDLEFISH_DIR:-$HOME/code/candlefish}"

echo -e "${BLUE}Candlefish Claude Resources - Worktree Integration${NC}"
echo "=================================================="

# Function to find all worktrees in a repository
find_worktrees() {
    local repo_path="$1"
    cd "$repo_path"

    # Get all worktrees for this repository
    if git worktree list &>/dev/null; then
        git worktree list --porcelain | grep "^worktree " | cut -d' ' -f2
    fi
}

# Function to setup claude in a worktree
setup_worktree_claude() {
    local worktree_path="$1"

    if [ ! -d "$worktree_path" ]; then
        echo -e "${RED}✗ Worktree not found: $worktree_path${NC}"
        return 1
    fi

    # Check if .claude already exists
    if [ -e "$worktree_path/.claude" ]; then
        if [ -L "$worktree_path/.claude" ]; then
            # It's already a symlink, update it
            rm "$worktree_path/.claude"
        else
            # It's a real directory, back it up
            echo -e "${YELLOW}Backing up existing .claude in $worktree_path${NC}"
            mv "$worktree_path/.claude" "$worktree_path/.claude.backup.$(date +%Y%m%d-%H%M%S)"
        fi
    fi

    # Create symlink
    ln -s "$CLAUDE_HOME" "$worktree_path/.claude"
    echo -e "${GREEN}✓ Linked Claude resources in: $worktree_path${NC}"
}

# Function to find all Candlefish projects
find_candlefish_projects() {
    echo -e "\n${YELLOW}Searching for Candlefish projects...${NC}"

    local projects=()

    # Find all git repositories in Candlefish directory
    while IFS= read -r -d '' git_dir; do
        local repo_path=$(dirname "$git_dir")
        projects+=("$repo_path")
    done < <(find "$CANDLEFISH_DIR" -name ".git" -type d -print0 2>/dev/null)

    echo -e "${BLUE}Found ${#projects[@]} Candlefish projects${NC}"

    # Process each project
    for project in "${projects[@]}"; do
        echo -e "\n${YELLOW}Processing: $(basename "$project")${NC}"

        # Setup main repository
        setup_worktree_claude "$project"

        # Find and setup worktrees
        local worktrees=($(find_worktrees "$project"))
        if [ ${#worktrees[@]} -gt 0 ]; then
            echo -e "${BLUE}Found ${#worktrees[@]} worktrees${NC}"
            for worktree in "${worktrees[@]}"; do
                if [ "$worktree" != "$project" ]; then
                    setup_worktree_claude "$worktree"
                fi
            done
        fi
    done
}

# Function to setup specific project
setup_specific_project() {
    local project_path="$1"

    if [ ! -d "$project_path/.git" ]; then
        echo -e "${RED}Error: Not a git repository: $project_path${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Setting up Claude resources for: $project_path${NC}"

    # Setup main repository
    setup_worktree_claude "$project_path"

    # Find and setup worktrees
    local worktrees=($(find_worktrees "$project_path"))
    if [ ${#worktrees[@]} -gt 1 ]; then
        echo -e "${BLUE}Found ${#worktrees[@]} worktrees${NC}"
        for worktree in "${worktrees[@]}"; do
            if [ "$worktree" != "$project_path" ]; then
                setup_worktree_claude "$worktree"
            fi
        done
    fi
}

# Function to verify Claude home exists
verify_claude_home() {
    if [ ! -d "$CLAUDE_HOME" ]; then
        echo -e "${RED}Error: ~/.claude not found${NC}"
        echo "Please run the main setup script first:"
        echo "  curl -sSL https://raw.githubusercontent.com/candlefish/claude-resources/main/scripts/setup-local.sh | bash"
        exit 1
    fi

    if [ ! -L "$CLAUDE_HOME" ]; then
        echo -e "${YELLOW}Warning: ~/.claude is not a symlink to organization resources${NC}"
        echo "This might cause synchronization issues."
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to create worktree integration hook
create_worktree_hook() {
    local hook_script="$CANDLEFISH_DIR/claude-worktree-hook.sh"

    cat > "$hook_script" << 'HOOK_SCRIPT'
#!/bin/bash
# Git worktree post-checkout hook for Claude resources
# Add this to your git hooks to automatically setup Claude in new worktrees

WORKTREE_PATH="$PWD"
CLAUDE_HOME="$HOME/.claude"

if [ -d "$CLAUDE_HOME" ] && [ ! -e "$WORKTREE_PATH/.claude" ]; then
    ln -s "$CLAUDE_HOME" "$WORKTREE_PATH/.claude"
    echo "✓ Claude resources linked in new worktree"
fi
HOOK_SCRIPT

    chmod +x "$hook_script"
    echo -e "${GREEN}✓ Created worktree hook script: $hook_script${NC}"
    echo -e "${BLUE}To use this hook in a repository:${NC}"
    echo "  cp $hook_script <repo>/.git/hooks/post-checkout"
}

# Main menu
show_menu() {
    echo -e "\n${BLUE}What would you like to do?${NC}"
    echo "1. Setup Claude for all Candlefish projects and worktrees"
    echo "2. Setup Claude for a specific project and its worktrees"
    echo "3. Create worktree integration hook"
    echo "4. Exit"

    read -p "Enter choice (1-4): " choice

    case $choice in
        1)
            find_candlefish_projects
            ;;
        2)
            read -p "Enter project path: " project_path
            setup_specific_project "$project_path"
            ;;
        3)
            create_worktree_hook
            ;;
        4)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            show_menu
            ;;
    esac
}

# Main execution
main() {
    verify_claude_home

    # If argument provided, assume it's a project path
    if [ $# -eq 1 ]; then
        setup_specific_project "$1"
    else
        show_menu
    fi

    echo -e "\n${GREEN}✅ Worktree integration complete!${NC}"
}

# Run main
main "$@"
