#!/bin/zsh
# Candlefish AI Complete Setup - Full Auto Configuration
# 🐠 Restores all navigation, git, GitHub Actions, and customizations

# ============================================================================
# 🐠 CANDLEFISH QUICK NAVIGATION
# ============================================================================

# Main candlefish directories
alias cf='cd /Users/patricksmith/candlefish-ai'
alias candlefish='cd /Users/patricksmith/candlefish-ai'
alias cfa='cd /Users/patricksmith/candlefish-ai'

# Sub-project navigation
alias cfweb='cd /Users/patricksmith/candlefish-ai/apps/website'
alias cfpaint='cd /Users/patricksmith/candlefish-ai/projects/paintbox'
alias cffogg='cd /Users/patricksmith/candlefish-ai/projects/fogg/calendar'
alias cfprom='cd /Users/patricksmith/candlefish-ai/projects/promoterOS'
alias cfbrew='cd /Users/patricksmith/candlefish-ai/projects/brewkit'
alias cfcrown='cd /Users/patricksmith/candlefish-ai/projects/crowntrophy'
alias cfbart='cd /Users/patricksmith/candlefish-ai/projects/bart-clean-core'

# Quick edit important files
alias cfclm='cd /Users/patricksmith/candlefish-ai && claude CLAUDE.md'
alias cfreadme='cd /Users/patricksmith/candlefish-ai && claude README.md'
alias cfpack='cd /Users/patricksmith/candlefish-ai && claude package.json'

# ============================================================================
# 🐠 GIT TREE AND UTILITIES
# ============================================================================

# Beautiful git log with tree visualization
alias glog='git log --graph --pretty=format:"%C(yellow)%h%Creset %C(cyan)%d%Creset %s %C(green)(%cr) %C(bold blue)<%an>%Creset" --abbrev-commit --all'
alias gtree='git log --graph --oneline --decorate --all'
alias glt='git log --graph --pretty=format:"%C(yellow)%h%Creset %C(cyan)%d%Creset %s %C(green)(%cr) %C(bold blue)<%an>%Creset" --abbrev-commit -10'

# Git status and diff shortcuts
alias gs='git status'
alias gd='git diff'
alias gds='git diff --staged'
alias gb='git branch -av'
alias gco='git checkout'
alias gcb='git checkout -b'
alias gcp='git cherry-pick'
alias grh='git reset HEAD~'

# Git worktree helpers
alias gwl='git worktree list'
alias gwa='git worktree add'
alias gwr='git worktree remove'
alias gwp='git worktree prune'

# Quick commit and push
alias gcm='git commit -m'
alias gca='git commit --amend'
alias gp='git push'
alias gpf='git push --force-with-lease'
alias gpl='git pull --rebase'

# ============================================================================
# 🐠 GITHUB ACTIONS AND AUTOMATION
# ============================================================================

# GitHub CLI shortcuts
alias ghpr='gh pr create'
alias ghprv='gh pr view --web'
alias ghprl='gh pr list'
alias ghprm='gh pr merge'
alias ghprc='gh pr checkout'

# GitHub Actions
alias ghw='gh workflow'
alias ghwl='gh workflow list'
alias ghwr='gh workflow run'
alias ghwv='gh workflow view'
alias ghrun='gh run'
alias ghrunl='gh run list'
alias ghrunv='gh run view'
alias ghruns='gh run list --status'

# Auto-setup GitHub authentication if needed
setup_github_auth() {
    if ! gh auth status &>/dev/null; then
        echo "🐠 Setting up GitHub CLI authentication..."
        gh auth login
    fi
}

# ============================================================================
# 🐠 CLAUDE CODE OPTIMIZATIONS
# ============================================================================

# Claude shortcuts with auto-login
alias claude='claude-code'
alias c='claude-code'
alias cc='claude-code'
alias cct='claude-code --thinking'
alias ccm='claude-code --model claude-opus-4-1-20250805'
alias ccs='claude-code --model claude-3-5-sonnet-20241022'

# Claude with context
alias cc200k='claude-code --context 200k'
alias ccmax='claude-code --context 200k --model claude-opus-4-1-20250805'

# ============================================================================
# 🐠 ENVIRONMENT SETUP
# ============================================================================

# Set candlefish environment
export CANDLEFISH_HOME="/Users/patricksmith/candlefish-ai"
export CANDLEFISH_ENV="production"

# Claude Pro Max settings
export CLAUDE_SUBSCRIPTION="max"
export CLAUDE_TIER="200"
export CLAUDE_MAX_TOKENS="400000"
export CLAUDE_MODEL="claude-opus-4-1-20250805"
export ANTHROPIC_MODEL="claude-opus-4-1-20250805"

# GitHub settings
export GH_DEFAULT_REPO="patricksmith/candlefish-ai"
export GITHUB_DEFAULT_BRANCH="main"

# ============================================================================
# 🐠 PROMPT CUSTOMIZATION
# ============================================================================

# Add candlefish emoji to prompt if not in Warp
if [[ "$TERM_PROGRAM" != "WarpTerminal" ]]; then
    # Simple prompt with candlefish
    PROMPT='🐠 %F{cyan}%~%f %F{yellow}❯%f '
    
    # Git branch in right prompt
    autoload -Uz vcs_info
    precmd() { vcs_info }
    zstyle ':vcs_info:git:*' formats '%F{green}(%b)%f'
    RPROMPT='${vcs_info_msg_0_}'
fi

# ============================================================================
# 🐠 AUTO-INITIALIZATION
# ============================================================================

# Function to initialize candlefish environment
init_candlefish() {
    # Ensure GitHub is authenticated
    setup_github_auth 2>/dev/null
    
    # Ensure Claude is logged in
    if [ -f "/Users/patricksmith/.local/bin/claude-auto-login" ]; then
        /Users/patricksmith/.local/bin/claude-auto-login 2>/dev/null &
    fi
    
    # Load AWS credentials if available
    if [ -f "/Users/patricksmith/0l0/scripts/load-all-api-keys.sh" ]; then
        source "/Users/patricksmith/0l0/scripts/load-all-api-keys.sh" >/dev/null 2>&1
        # Override with correct model
        export CLAUDE_MODEL="claude-opus-4-1-20250805"
        export ANTHROPIC_MODEL="claude-opus-4-1-20250805"
    fi
    
    # Set up git config if needed
    if [ -z "$(git config --global user.email)" ]; then
        git config --global user.email "patrick@candlefish.ai"
        git config --global user.name "Patrick Smith"
    fi
}

# ============================================================================
# 🐠 QUICK ACTIONS
# ============================================================================

# Quick deploy to production
deploy_candlefish() {
    cd "$CANDLEFISH_HOME"
    echo "🐠 Deploying Candlefish to production..."
    gh workflow run deploy.yml
}

# Quick status check
candlefish_status() {
    echo "🐠 Candlefish Status Report"
    echo "=========================="
    echo "📍 Location: $CANDLEFISH_HOME"
    echo "🌿 Branch: $(cd $CANDLEFISH_HOME && git branch --show-current)"
    echo "📊 Model: $CLAUDE_MODEL"
    echo "💰 Subscription: Claude Pro Max ($CLAUDE_TIER/month)"
    echo "🔧 GitHub: $(gh auth status 2>&1 | head -1)"
    echo "📦 Last commit: $(cd $CANDLEFISH_HOME && git log -1 --format='%h %s' 2>/dev/null)"
}

# Quick test runner
cftest() {
    cd "$CANDLEFISH_HOME"
    echo "🐠 Running Candlefish tests..."
    pnpm test
}

# Quick build
cfbuild() {
    cd "$CANDLEFISH_HOME"
    echo "🐠 Building Candlefish..."
    pnpm build
}

# Show shortcuts reference
cfhelp() {
    echo "🐠 Candlefish Quick Reference"
    echo "=============================="
    echo ""
    echo "📍 NAVIGATION          🤖 CLAUDE"
    echo "cf      → root         cc      → claude"
    echo "cfweb   → website      cct     → thinking mode"
    echo "cfpaint → paintbox     ccmax   → max power"
    echo "cffogg  → fogg         cc200k  → 200k context"
    echo ""
    echo "🌳 GIT                 🐙 GITHUB"
    echo "gs      → status       ghpr    → create PR"
    echo "gd      → diff         ghprv   → view PR"
    echo "glog    → tree log     ghprl   → list PRs"
    echo "gcm     → commit -m    ghprm   → merge PR"
    echo "gp      → push         ghw     → workflows"
    echo ""
    echo "🚀 COMMANDS"
    echo "candlefish_status  → full environment status"
    echo "cfbuild           → build project"
    echo "cftest            → run tests"
    echo "cfprojects        → show all projects"
    echo ""
    echo "📝 Type 'cat $CANDLEFISH_HOME/SHORTCUTS.md' for full reference"
}

# Show all projects with descriptions
cfprojects() {
    echo ""
    echo "🐠 CANDLEFISH PROJECTS"
    echo "═══════════════════════════════════════════════════════════════════"
    echo ""
    echo "🎯 CORE APPLICATIONS"
    echo "├─ cfweb    → Website         Main candlefish.ai site"
    echo "└─ cf       → Root            Project root & configs"
    echo ""
    echo "💼 ENTERPRISE TOOLS"
    echo "├─ cfpaint  → Paintbox        Painting contractor platform"
    echo "├─ cffogg   → Fogg Calendar   Smart scheduling system"
    echo "└─ cfprom   → PromoterOS      Event management system"
    echo ""
    echo "🛠️ BUSINESS SOLUTIONS"
    echo "├─ cfbrew   → Brewkit         Brewery management"
    echo "├─ cfcrown  → Crown Trophy    Awards e-commerce"
    echo "└─ cfbart   → BART            Business analytics engine"
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    echo "Type any command to navigate. Full docs: cat $CANDLEFISH_HOME/PROJECTS.md"
}

# Alias for projects
alias cfp='cfprojects'
alias cfh='cfhelp'

# ============================================================================
# 🐠 TERMINAL STARTUP MESSAGE
# ============================================================================

# Show welcome message on terminal start (optional)
candlefish_welcome() {
    echo "🐠 Candlefish AI Environment Loaded"
    echo "   Quick nav: cf, cfweb, cfpaint, cffogg"
    echo "   Git: glog, gtree, gs, gd"
    echo "   GitHub: ghpr, ghw, ghrun"
    echo "   Claude: cc, ccmax, cct"
    echo "   Type 'candlefish_status' for full status"
}

# ============================================================================
# 🐠 INITIALIZE ON LOAD
# ============================================================================

# Auto-initialize in background (suppress ALL output)
( init_candlefish >/dev/null 2>&1 & )

# Export functions silently (suppress ALL output including function definitions)
(
    export -f setup_github_auth >/dev/null 2>&1
    export -f init_candlefish >/dev/null 2>&1
    export -f deploy_candlefish >/dev/null 2>&1
    export -f candlefish_status >/dev/null 2>&1
    export -f cftest >/dev/null 2>&1
    export -f cfbuild >/dev/null 2>&1
    export -f cfhelp >/dev/null 2>&1
    export -f cfprojects >/dev/null 2>&1
    export -f candlefish_welcome >/dev/null 2>&1
) 2>/dev/null

# Optional: Show welcome (comment out if too verbose)
# candlefish_welcome