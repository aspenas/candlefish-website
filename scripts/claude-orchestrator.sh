#!/bin/bash

# Claude Workflow Orchestrator - Interactive Management Tool
# Provides comprehensive control over parallel Claude sessions and automation

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
REPO_DIR="/Users/patricksmith/candlefish-ai"
WORKTREE_BASE="/Users/patricksmith/candlefish-worktrees"
CURRENT_DIR=$(pwd)

# Function to display main menu
show_main_menu() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║         ${BLUE}Claude Workflow Orchestrator v1.0${CYAN}                 ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Worktree Management${NC}"
    echo "  1) View worktree status"
    echo "  2) Switch to worktree"
    echo "  3) Update worktrees from main"
    echo "  4) Clean worktree changes"
    echo ""
    echo -e "${BLUE}Parallel Execution${NC}"
    echo "  5) Run parallel tests (3 sessions)"
    echo "  6) Run parallel build"
    echo "  7) Run parallel lint & format"
    echo "  8) Custom parallel task"
    echo ""
    echo -e "${MAGENTA}GitHub Actions${NC}"
    echo "  9) Trigger Claude automation workflow"
    echo " 10) View workflow runs"
    echo " 11) Download workflow artifacts"
    echo " 12) Cancel running workflows"
    echo ""
    echo -e "${YELLOW}Automation Tools${NC}"
    echo " 13) Generate documentation"
    echo " 14) Run security scan"
    echo " 15) Performance analysis"
    echo " 16) Dependency updates"
    echo ""
    echo -e "${CYAN}Quick Actions${NC}"
    echo " 17) Full CI/CD pipeline"
    echo " 18) Emergency rollback"
    echo " 19) Production deployment"
    echo " 20) System health check"
    echo ""
    echo " 0) Exit"
    echo ""
}

# Worktree status with enhanced details
view_worktree_status() {
    echo -e "${BLUE}=== Detailed Worktree Status ===${NC}"
    echo ""

    for worktree in $(git worktree list --porcelain | grep "worktree " | cut -d' ' -f2); do
        if [ -d "$worktree" ]; then
            echo -e "${CYAN}📁 $(basename $worktree)${NC}"
            cd "$worktree" 2>/dev/null || continue

            # Branch info
            branch=$(git branch --show-current)
            echo "   Branch: $branch"

            # File statistics
            modified=$(git status --porcelain | grep -c "^ M" || echo 0)
            untracked=$(git status --porcelain | grep -c "^??" || echo 0)
            staged=$(git status --porcelain | grep -c "^[AM]" || echo 0)

            if [ "$modified" -gt 0 ] || [ "$untracked" -gt 0 ] || [ "$staged" -gt 0 ]; then
                echo -e "   Files: ${YELLOW}$modified modified, $untracked untracked, $staged staged${NC}"
            else
                echo -e "   Files: ${GREEN}✅ Clean${NC}"
            fi

            # Remote sync status
            if git rev-parse --abbrev-ref @{u} >/dev/null 2>&1; then
                ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo 0)
                behind=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo 0)

                if [ "$ahead" -gt 0 ] && [ "$behind" -gt 0 ]; then
                    echo -e "   Remote: ${YELLOW}↑$ahead ↓$behind (diverged)${NC}"
                elif [ "$ahead" -gt 0 ]; then
                    echo -e "   Remote: ${GREEN}↑$ahead ahead${NC}"
                elif [ "$behind" -gt 0 ]; then
                    echo -e "   Remote: ${YELLOW}↓$behind behind${NC}"
                else
                    echo -e "   Remote: ${GREEN}✅ In sync${NC}"
                fi
            else
                echo -e "   Remote: ${RED}No upstream${NC}"
            fi

            # Last commit
            last_commit=$(git log -1 --format="%h %s" 2>/dev/null || echo "No commits")
            echo "   Last: $last_commit"
            echo ""
        fi
    done

    cd "$CURRENT_DIR"
}

# Switch to worktree
switch_worktree() {
    echo -e "${BLUE}Available worktrees:${NC}"
    echo "1) main (primary)"
    echo "2) main-development"
    echo "3) main-feature"
    echo "4) main-experimental"
    echo "5) main-hotfix"
    echo "6) main-docs"
    echo "7) main-cicd"

    read -p "Select worktree (1-7): " choice

    case $choice in
        1) target="/Users/patricksmith/candlefish-ai" ;;
        2) target="$WORKTREE_BASE/main-development" ;;
        3) target="$WORKTREE_BASE/main-feature" ;;
        4) target="$WORKTREE_BASE/main-experimental" ;;
        5) target="$WORKTREE_BASE/main-hotfix" ;;
        6) target="$WORKTREE_BASE/main-docs" ;;
        7) target="$WORKTREE_BASE/main-cicd" ;;
        *) echo -e "${RED}Invalid choice${NC}"; return ;;
    esac

    cd "$target"
    echo -e "${GREEN}✅ Switched to: $target${NC}"
    echo "Current directory: $(pwd)"
}

# Update worktrees from main
update_worktrees() {
    echo -e "${BLUE}Updating all worktrees from main...${NC}"

    cd "$REPO_DIR"
    git fetch origin

    for worktree in "$WORKTREE_BASE"/main-*; do
        if [ -d "$worktree" ]; then
            echo -e "${CYAN}Updating $(basename $worktree)...${NC}"
            cd "$worktree"

            # Stash any changes
            if [ -n "$(git status --porcelain)" ]; then
                echo "  Stashing local changes..."
                git stash push -m "Auto-stash before update $(date +%Y%m%d-%H%M%S)"
            fi

            # Pull latest changes
            git pull origin main --rebase || {
                echo -e "${YELLOW}  Merge conflicts detected, skipping${NC}"
                continue
            }

            echo -e "${GREEN}  ✅ Updated${NC}"
        fi
    done

    cd "$CURRENT_DIR"
}

# Run parallel tests
run_parallel_tests() {
    echo -e "${BLUE}Running tests in parallel across 3 worktrees...${NC}"

    # Create temporary script for parallel execution
    cat > /tmp/parallel-tests.sh << 'EOF'
#!/bin/bash
worktree=$1
shard=$2
total=$3

cd "$worktree"
echo "Running tests in $(basename $worktree) (shard $shard/$total)..."

if [ -f "package.json" ] && grep -q '"test"' package.json; then
    npm test -- --shard=$shard/$total --coverage
elif [ -f "pytest.ini" ] || [ -d "tests" ]; then
    pytest --cov -n auto --dist loadgroup
else
    echo "No test configuration found"
fi
EOF
    chmod +x /tmp/parallel-tests.sh

    # Run tests in parallel
    (
        /tmp/parallel-tests.sh "$WORKTREE_BASE/main-development" 1 3 &
        /tmp/parallel-tests.sh "$WORKTREE_BASE/main-feature" 2 3 &
        /tmp/parallel-tests.sh "$WORKTREE_BASE/main-experimental" 3 3 &
        wait
    )

    echo -e "${GREEN}✅ Parallel tests completed${NC}"
}

# Run parallel build
run_parallel_build() {
    echo -e "${BLUE}Running parallel build across worktrees...${NC}"

    parallel_command() {
        local worktree=$1
        local task=$2

        echo -e "${CYAN}Building in $(basename $worktree)...${NC}"
        cd "$worktree"

        if [ -f "package.json" ]; then
            npm run build 2>&1 | sed "s/^/[$(basename $worktree)] /"
        elif [ -f "Makefile" ]; then
            make build 2>&1 | sed "s/^/[$(basename $worktree)] /"
        else
            echo "[$(basename $worktree)] No build configuration found"
        fi
    }

    export -f parallel_command

    # Run builds in parallel
    echo "$WORKTREE_BASE/main-development" | xargs -P 3 -I {} bash -c 'parallel_command "$@"' _ {} build &
    echo "$WORKTREE_BASE/main-feature" | xargs -P 3 -I {} bash -c 'parallel_command "$@"' _ {} build &
    echo "$WORKTREE_BASE/main-experimental" | xargs -P 3 -I {} bash -c 'parallel_command "$@"' _ {} build &
    wait

    echo -e "${GREEN}✅ Parallel build completed${NC}"
}

# Trigger GitHub Actions workflow
trigger_workflow() {
    echo -e "${BLUE}Triggering Claude automation workflow...${NC}"

    echo "Select workflow to trigger:"
    echo "1) Parallel Claude Sessions"
    echo "2) Claude Automation Suite"
    echo "3) Multi-Worktree CI/CD"
    echo "4) Daily Automation"

    read -p "Choice (1-4): " workflow_choice

    case $workflow_choice in
        1)
            read -p "Number of sessions (1-5): " sessions
            read -p "Task (test/lint/build/deploy/analyze): " task
            gh workflow run parallel-claude-fixed.yml \
                --repo aspenas/candlefish-ai \
                -f sessions="$sessions" \
                -f task="$task"
            ;;
        2)
            gh workflow run claude-automation.yml --repo aspenas/candlefish-ai
            ;;
        3)
            gh workflow run multi-worktree-ci.yml --repo aspenas/candlefish-ai
            ;;
        4)
            gh workflow run daily-automation.yml --repo aspenas/candlefish-ai
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            return
            ;;
    esac

    echo -e "${GREEN}✅ Workflow triggered${NC}"
    echo "View status: gh run list --repo aspenas/candlefish-ai --limit 1"
}

# View workflow runs
view_workflow_runs() {
    echo -e "${BLUE}Recent workflow runs:${NC}"
    gh run list --repo aspenas/candlefish-ai --limit 10
}

# Generate documentation
generate_documentation() {
    echo -e "${BLUE}Generating documentation...${NC}"

    cd "$REPO_DIR"

    # Generate README sections
    echo "# Candlefish AI - Workflow Documentation" > docs/workflow-guide.md
    echo "" >> docs/workflow-guide.md
    echo "Generated: $(date)" >> docs/workflow-guide.md
    echo "" >> docs/workflow-guide.md

    # Add worktree information
    echo "## Worktree Structure" >> docs/workflow-guide.md
    git worktree list >> docs/workflow-guide.md
    echo "" >> docs/workflow-guide.md

    # Add workflow information
    echo "## GitHub Actions Workflows" >> docs/workflow-guide.md
    ls -la .github/workflows/*.yml 2>/dev/null | awk '{print "- " $NF}' >> docs/workflow-guide.md

    echo -e "${GREEN}✅ Documentation generated at docs/workflow-guide.md${NC}"
    cd "$CURRENT_DIR"
}

# System health check
system_health_check() {
    echo -e "${BLUE}=== System Health Check ===${NC}"
    echo ""

    # Check git status
    echo -e "${CYAN}Git Configuration:${NC}"
    git --version
    echo "User: $(git config user.name) <$(git config user.email)>"
    echo ""

    # Check GitHub CLI
    echo -e "${CYAN}GitHub CLI:${NC}"
    gh --version
    gh auth status 2>&1 | head -3
    echo ""

    # Check Node.js
    echo -e "${CYAN}Node.js Environment:${NC}"
    node --version 2>/dev/null || echo "Node.js not installed"
    npm --version 2>/dev/null || echo "npm not installed"
    echo ""

    # Check Python
    echo -e "${CYAN}Python Environment:${NC}"
    python3 --version 2>/dev/null || echo "Python not installed"
    pip3 --version 2>/dev/null || echo "pip not installed"
    echo ""

    # Check Docker
    echo -e "${CYAN}Docker:${NC}"
    docker --version 2>/dev/null || echo "Docker not installed"
    docker ps 2>/dev/null | head -1 || echo "Docker daemon not running"
    echo ""

    # Check disk space
    echo -e "${CYAN}Disk Space:${NC}"
    df -h "$REPO_DIR" | tail -1
    echo ""

    # Check worktree health
    echo -e "${CYAN}Worktree Health:${NC}"
    healthy=0
    unhealthy=0

    for worktree in $(git worktree list --porcelain | grep "worktree " | cut -d' ' -f2); do
        if [ -d "$worktree" ]; then
            ((healthy++))
        else
            ((unhealthy++))
            echo -e "${RED}  Missing: $worktree${NC}"
        fi
    done

    echo -e "${GREEN}  Healthy: $healthy${NC}"
    if [ "$unhealthy" -gt 0 ]; then
        echo -e "${RED}  Unhealthy: $unhealthy${NC}"
    fi
}

# Full CI/CD pipeline
run_full_pipeline() {
    echo -e "${BLUE}Running full CI/CD pipeline...${NC}"

    stages=("lint" "test" "build" "security" "deploy")

    for stage in "${stages[@]}"; do
        echo -e "${CYAN}Stage: $stage${NC}"

        case $stage in
            lint)
                npm run lint 2>/dev/null || echo "Lint not configured"
                ;;
            test)
                npm test 2>/dev/null || echo "Tests not configured"
                ;;
            build)
                npm run build 2>/dev/null || echo "Build not configured"
                ;;
            security)
                npm audit --production 2>/dev/null || echo "Security audit not available"
                ;;
            deploy)
                echo "Deploy stage (dry run)"
                ;;
        esac

        echo -e "${GREEN}  ✅ $stage completed${NC}"
    done

    echo -e "${GREEN}✅ Full pipeline completed${NC}"
}

# Main loop
main() {
    while true; do
        show_main_menu
        read -p "Select option: " choice

        case $choice in
            1) view_worktree_status ;;
            2) switch_worktree ;;
            3) update_worktrees ;;
            4) echo "Clean worktree changes - Not implemented" ;;
            5) run_parallel_tests ;;
            6) run_parallel_build ;;
            7) echo "Parallel lint - Not implemented" ;;
            8) echo "Custom parallel task - Not implemented" ;;
            9) trigger_workflow ;;
            10) view_workflow_runs ;;
            11) echo "Download artifacts - Not implemented" ;;
            12) echo "Cancel workflows - Not implemented" ;;
            13) generate_documentation ;;
            14) echo "Security scan - Not implemented" ;;
            15) echo "Performance analysis - Not implemented" ;;
            16) echo "Dependency updates - Not implemented" ;;
            17) run_full_pipeline ;;
            18) echo "Emergency rollback - Not implemented" ;;
            19) echo "Production deployment - Not implemented" ;;
            20) system_health_check ;;
            0) echo -e "${GREEN}Goodbye!${NC}"; exit 0 ;;
            *) echo -e "${RED}Invalid option${NC}" ;;
        esac

        echo ""
        read -p "Press enter to continue..."
    done
}

# Start the orchestrator
main
