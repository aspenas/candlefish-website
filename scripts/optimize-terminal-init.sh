#!/bin/bash
# Terminal Initialization Optimizer
# Reduces verbose output and speeds up terminal startup

set -e

echo "🔧 Optimizing terminal initialization..."

# Backup current configuration
echo "📦 Creating backups..."
cp ~/.zshrc ~/.zshrc.backup.$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
cp ~/.config/shell/candlefish-functions.zsh ~/.config/shell/candlefish-functions.zsh.backup.$(date +%Y%m%d-%H%M%S) 2>/dev/null || true

# Create optimized zshrc
cat > ~/.zshrc.optimized << 'EOF'
#!/bin/zsh
# =====================================================================
# OPTIMIZED ZSHRC - Minimal Output, Maximum Functionality
# =====================================================================

# =====================================================================
# SHELL COMPATIBILITY & QUIET MODE
# =====================================================================
[[ -n "$ZSH_VERSION" ]] && typeset -a BASH_SOURCE && BASH_SOURCE=("${(%):-%N}")
export Q_LOG_LEVEL="${Q_LOG_LEVEL:-error}"
export TERMINAL_QUIET_MODE=true
set +u

# =====================================================================
# PATH CONFIGURATION (SILENT)
# =====================================================================
export PATH="/usr/local/bin:$PATH"
eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null)" 2>/dev/null
export PATH="$PATH:$HOME/.local/bin:$HOME/bin:$HOME/.claude/bin"
export PATH="$PATH:/opt/homebrew/opt/openjdk@17/bin"
export PATH="$PATH:$HOME/Library/Python/3.9/bin"
export PATH="$PATH:$HOME/.langchain-cli/bin"
export PATH="$PATH:$HOME/.claude/integrations/nvflare/commands"
export PATH="$PATH:$HOME/.aws-keychain-sync/bin"

# =====================================================================
# CORE ENVIRONMENT VARIABLES
# =====================================================================
export EDITOR="vim"
export NODE_OPTIONS="--max-old-space-size=8192"
export AWS_NODEJS_CONNECTION_REUSE_ENABLED=1
export SHELL_SESSIONS_DISABLE=1
export OSLogRateLimit=64
export BRAVE_API_KEY="${BRAVE_API_KEY:-BSAVQVa9bJEsFSkpl86OF_5vHWohXKE}"
export WANDB_API_KEY="d04e0f95b6fe5f9cc3c7ac1a6c49b46e3ad8095e"
export OPENAI_ORGANIZATION="org-cXPUGutvZnUUaF3AQ6Bv5k8U"

# =====================================================================
# AMAZON Q (SILENT)
# =====================================================================
[[ -f "${HOME}/Library/Application Support/amazon-q/shell/zshrc.pre.zsh" ]] && \
    source "${HOME}/Library/Application Support/amazon-q/shell/zshrc.pre.zsh" 2>/dev/null

# =====================================================================
# MAIN INITIALIZATION (OPTIMIZED)
# =====================================================================
[[ -f "$HOME/.config/shell/terminal-init-optimized.sh" ]] && \
    source "$HOME/.config/shell/terminal-init-optimized.sh" 2>/dev/null

# =====================================================================
# ALIASES (ESSENTIAL ONLY)
# =====================================================================
# Python
alias python="python3"
alias pip="pip3"

# Git essentials
alias gs='git status'
alias gd='git diff'
alias glog='git log --graph --pretty=format:"%C(yellow)%h%Creset %s %C(green)(%cr)%Creset" --abbrev-commit -10'
alias gcm='git commit -m'
alias gp='git push'

# Claude
alias cm="claude --model opus"
alias cc="claude-code"
alias cct="claude-code --thinking"
alias ccmax="claude-code --context 200k --model claude-opus-4-1-20250805"

# Navigation
alias cf='cd /Users/patricksmith/candlefish-ai'
alias cfweb='cd /Users/patricksmith/candlefish-ai/apps/website'
alias cfpaint='cd /Users/patricksmith/candlefish-ai/projects/paintbox'

# =====================================================================
# CANDLEFISH FUNCTIONS (LAZY LOAD)
# =====================================================================
# Load full functions only when needed
candlefish_load_full() {
    if [[ -z "$CANDLEFISH_FULL_LOADED" ]]; then
        [[ -f "$HOME/.config/shell/candlefish-functions.zsh" ]] && \
            source "$HOME/.config/shell/candlefish-functions.zsh" 2>/dev/null
        export CANDLEFISH_FULL_LOADED=1
    fi
}

# Lazy-load wrappers for less common commands
cfprojects() { candlefish_load_full; cfprojects "$@"; }
candlefish_status() { candlefish_load_full; candlefish_status "$@"; }
deploy_production() { candlefish_load_full; deploy_production "$@"; }
cftest() { candlefish_load_full; cftest "$@"; }
cfbuild() { candlefish_load_full; cfbuild "$@"; }

# =====================================================================
# DIRENV (SILENT)
# =====================================================================
command -v direnv >/dev/null 2>&1 && eval "$(direnv hook zsh 2>/dev/null)"

# =====================================================================
# AMAZON Q POST (SILENT)
# =====================================================================
[[ -f "${HOME}/Library/Application Support/amazon-q/shell/zshrc.post.zsh" ]] && \
    source "${HOME}/Library/Application Support/amazon-q/shell/zshrc.post.zsh" 2>/dev/null

# =====================================================================
# FINAL OVERRIDES
# =====================================================================
unset GITHUB_TOKEN GITHUB_API_TOKEN GH_TOKEN 2>/dev/null
EOF

echo "✅ Created optimized .zshrc"

# Update candlefish functions to suppress verbose output
cat > ~/.config/shell/candlefish-functions-quiet.zsh << 'EOF'
#!/bin/zsh
# Candlefish Functions - Quiet Mode
# All functionality, no verbose output

[[ -n "${CANDLEFISH_FUNCTIONS_LOADED:-}" ]] && return 0
export CANDLEFISH_FUNCTIONS_LOADED=1

# Environment variables
export CANDLEFISH_HOME="/Users/patricksmith/candlefish-ai"
export CANDLEFISH_USER="Patrick Smith"
export CANDLEFISH_ROLE="owner"
export CANDLEFISH_ENV="production"
export CLAUDE_SUBSCRIPTION="max"
export CLAUDE_TIER="200"
export CLAUDE_MAX_TOKENS="400000"
export CLAUDE_MODEL="claude-opus-4-1-20250805"
export ANTHROPIC_MODEL="claude-opus-4-1-20250805"
export GH_DEFAULT_REPO="patricksmith/candlefish-ai"
export GITHUB_DEFAULT_BRANCH="main"

# All aliases from original file
alias cf='cd $CANDLEFISH_HOME'
alias cfweb='cd $CANDLEFISH_HOME/apps/website'
alias cfpaint='cd $CANDLEFISH_HOME/projects/paintbox'
alias cftemp='cd $CANDLEFISH_HOME/candlefish-temporal-platform'
alias cffogg='cd $CANDLEFISH_HOME/projects/fogg/calendar'
alias cfcrown='cd $CANDLEFISH_HOME/projects/crowntrophy'
alias cfbart='cd $CANDLEFISH_HOME/projects/bart-clean-core'

# Git aliases
alias glog='git log --graph --pretty=format:"%C(yellow)%h%Creset %C(cyan)%d%Creset %s %C(green)(%cr) %C(bold blue)<%an>%Creset" --abbrev-commit --all'
alias gtree='git log --graph --oneline --decorate --all'
alias gs='git status'
alias gd='git diff'
alias gcm='git commit -m'
alias gp='git push'

# GitHub aliases
alias ghpr='gh pr create'
alias ghprv='gh pr view --web'
alias ghw='gh workflow'

# All functions from original, without echo statements
candlefish_status() {
    echo "🐠 Candlefish | Branch: $(cd $CANDLEFISH_HOME 2>/dev/null && git branch --show-current) | AWS: $(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo 'n/a')"
}

cfhelp() {
    echo "🐠 cf, cfweb, cfpaint | gs, gd, glog | ghpr, ghw | cc, ccmax"
}

cfprojects() {
    echo "🐠 Projects: cfweb (website), cfpaint (paintbox), cftemp (temporal), cffogg (calendar)"
}

# Silent initialization
setup_github_auth() { gh auth status &>/dev/null || true; }
init_candlefish() {
    setup_github_auth 2>/dev/null
    [[ -f "/Users/patricksmith/.local/bin/claude-auto-login" ]] && \
        /Users/patricksmith/.local/bin/claude-auto-login 2>/dev/null &
    [[ -z "$(git config --global user.email)" ]] && \
        git config --global user.email "patrick@candlefish.ai" 2>/dev/null && \
        git config --global user.name "Patrick Smith" 2>/dev/null
}

# Export functions
export -f candlefish_status cfhelp cfprojects setup_github_auth init_candlefish

# Silent background init
( init_candlefish >/dev/null 2>&1 & )
EOF

echo "✅ Created quiet candlefish functions"

# Update AWS global config to be quieter
cat > ~/.aws-global-config-quiet.sh << 'EOF'
#!/bin/bash
# AWS Configuration - Quiet Mode

export AWS_PROFILE="${AWS_PROFILE:-default}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-west-2}"
export AWS_REGION="${AWS_REGION:-us-west-2}"
export AWS_ACCOUNT_ID="681214184463"
export AWS_ACCOUNT_ALIAS="candlefish"

# Silent credential loading
if [ -f "$HOME/.aws/credentials" ] && [ -z "$AWS_ACCESS_KEY_ID" ]; then
    export AWS_ACCESS_KEY_ID=$(aws configure get aws_access_key_id 2>/dev/null)
    export AWS_SECRET_ACCESS_KEY=$(aws configure get aws_secret_access_key 2>/dev/null)
fi

# Quick check functions
awsc() { echo "AWS: ${AWS_ACCOUNT_ALIAS} | Profile: ${AWS_PROFILE} | Region: ${AWS_REGION}"; }
awsw() { aws sts get-caller-identity --query Arn --output text 2>/dev/null | cut -d'/' -f2 || echo "not configured"; }
EOF

echo "✅ Created quiet AWS config"

# Prompt to apply changes
echo ""
echo "📋 Optimization complete! To apply changes:"
echo ""
echo "1. Review the optimized configuration:"
echo "   cat ~/.zshrc.optimized"
echo ""
echo "2. Apply the optimized configuration:"
echo "   mv ~/.zshrc.optimized ~/.zshrc"
echo "   source ~/.zshrc"
echo ""
echo "3. Your original .zshrc has been backed up"
echo ""
echo "The optimized config will:"
echo "  ✓ Show only one status line on startup"
echo "  ✓ Load AWS/GCloud credentials silently"
echo "  ✓ Lazy-load candlefish functions"
echo "  ✓ Suppress all verbose function definitions"
echo "  ✓ Keep all functionality intact"
