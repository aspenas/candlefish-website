#!/bin/zsh
# .zshrc - Optimized for both Warp and regular terminals
# 🐠 Candlefish AI Environment

# Exit if not interactive
[[ $- != *i* ]] && return

# =============================================================================
# WARP TERMINAL OPTIMIZATION
# =============================================================================
if [[ "$TERM_PROGRAM" == "WarpTerminal" ]]; then
    # Minimal setup for Warp (it handles most things internally)

    # Basic options
    setopt no_nomatch
    unsetopt unset

    # Core aliases only
    alias ll='ls -la'
    alias python='python3'
    alias pip='pip3'

    # Claude shortcuts
    alias claude='claude-code'
    alias c='claude-code'
    alias cc='claude-code'

    # Quick Candlefish navigation
    alias cf='cd /Users/patricksmith/candlefish-ai'
    alias cfweb='cd /Users/patricksmith/candlefish-ai/apps/website'
    alias cfpaint='cd /Users/patricksmith/candlefish-ai/projects/paintbox'
    alias cffogg='cd /Users/patricksmith/candlefish-ai/projects/fogg/calendar'

    # Git essentials
    alias gs='git status'
    alias gd='git diff'
    alias glog='git log --graph --pretty=format:"%C(yellow)%h%Creset %C(cyan)%d%Creset %s %C(green)(%cr) %C(bold blue)<%an>%Creset" --abbrev-commit --all'

    # Simple history
    HISTFILE="$HOME/.zsh_history"
    HISTSIZE=10000
    SAVEHIST=10000
    setopt HIST_IGNORE_DUPS HIST_IGNORE_SPACE

    # Basic completion (Warp handles most)
    autoload -Uz compinit && compinit -C

    # Load candlefish complete setup
    [[ -f "$HOME/.config/candlefish-complete-setup.zsh" ]] && source "$HOME/.config/candlefish-complete-setup.zsh"

    return
fi

# =============================================================================
# REGULAR TERMINAL FULL CONFIGURATION
# =============================================================================

# Ensure home directory
[[ "$PWD" == "/" ]] && cd "$HOME" 2>/dev/null

# Basic shell options
setopt no_nomatch
unsetopt unset
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_SPACE
setopt APPEND_HISTORY
setopt SHARE_HISTORY

# History configuration
HISTFILE="$HOME/.zsh_history"
HISTSIZE=50000
SAVEHIST=50000

# =============================================================================
# PATH CONFIGURATION
# =============================================================================
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.local/bin:$HOME/bin:$HOME/.claude/bin:$HOME/0l0/scripts:$PATH"

# =============================================================================
# CORE ALIASES
# =============================================================================

# System basics
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'

# Python
alias python='python3'
alias pip='pip3'

# Claude Code
alias claude='claude-code'
alias c='claude-code'
alias cc='claude-code'

# =============================================================================
# 🐠 CANDLEFISH COMPLETE ENVIRONMENT
# =============================================================================

# Load the comprehensive candlefish setup
if [[ -f "$HOME/.config/candlefish-complete-setup.zsh" ]]; then
    source "$HOME/.config/candlefish-complete-setup.zsh"
fi

# =============================================================================
# AWS & API KEYS
# =============================================================================

# Function to load AWS secrets
load_aws_secrets() {
    if [[ -f "$HOME/0l0/scripts/load-all-api-keys.sh" ]]; then
        source "$HOME/0l0/scripts/load-all-api-keys.sh" >/dev/null 2>&1
        # Override with correct model
        export CLAUDE_MODEL="claude-opus-4-1-20250805"
        export ANTHROPIC_MODEL="claude-opus-4-1-20250805"
    fi
}

# Load on startup (in background)
( load_aws_secrets 2>/dev/null & )

# =============================================================================
# COMPLETION SYSTEM
# =============================================================================

# Initialize completion
autoload -Uz compinit
# Fix ZDOTDIR parameter issue
if [[ -n "${ZDOTDIR:-}" ]] && [[ -f "${ZDOTDIR}/.zcompdump" ]]; then
    compinit -C
else
    compinit -C 2>/dev/null || compinit
fi

# Better completion options
zstyle ':completion:*' menu select
zstyle ':completion:*' matcher-list 'm:{a-zA-Z}={A-Za-z}'
zstyle ':completion:*' list-colors ''

# =============================================================================
# PROMPT CONFIGURATION (for non-Warp terminals)
# =============================================================================

# Load version control info
autoload -Uz vcs_info
zstyle ':vcs_info:git:*' formats '%F{green}[%b]%f'

# Custom precmd to show projects table before each prompt
precmd() {
    vcs_info
    # Show compact projects table
    print ""
    print "🐠 CANDLEFISH PROJECTS"
    print "═══════════════════════════════════════════════════════════════════"
    print ""
    print "🎯 CORE APPLICATIONS"
    print "├─ cfweb    → Website         Main candlefish.ai site"
    print "└─ cf       → Root            Project root & configs"
    print ""
    print "💼 ENTERPRISE TOOLS"
    print "├─ cfpaint  → Paintbox        Painting contractor platform"
    print "├─ cffogg   → Fogg Calendar   Smart scheduling system"
    print "└─ cfprom   → PromoterOS      Event management system"
    print ""
    print "🛠️ BUSINESS SOLUTIONS"
    print "├─ cfbrew   → Brewkit         Brewery management"
    print "├─ cfcrown  → Crown Trophy    Awards e-commerce"
    print "└─ cfbart   → BART            Business analytics engine"
    print ""
    print "═══════════════════════════════════════════════════════════════════"
}

# Simple clean prompt with git branch
setopt PROMPT_SUBST
PROMPT='🐠 %F{cyan}%~%f %F{green}${vcs_info_msg_0_}%f %F{yellow}❯%f '
RPROMPT=''  # Clear right prompt to avoid duplication

# =============================================================================
# ADDITIONAL CONFIGURATIONS
# =============================================================================

# Load any additional personal configs
[[ -f "$HOME/.zshrc.local" ]] && source "$HOME/.zshrc.local"

# Load 0l0 configurations if available
[[ -f "$HOME/0l0/.zshrc" ]] && source "$HOME/0l0/.zshrc"

# =============================================================================
# AUTO-START SERVICES
# =============================================================================

# Ensure Claude is logged in (background, only in interactive shells)
if [[ -f "/Users/patricksmith/.local/bin/claude-auto-login" ]] && [[ -t 0 ]]; then
    ( /Users/patricksmith/.local/bin/claude-auto-login 2>/dev/null & ) >/dev/null 2>&1
fi

# =============================================================================
# FINAL SETUP
# =============================================================================

# Export key environment variables
export EDITOR="vim"
export VISUAL="vim"
export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"

# Welcome message - disabled for clean startup
# Uncomment below to show welcome message
# if [[ -z "${WARP_IS_LOCAL_SHELL_SESSION:-}" ]] && [[ -t 0 ]]; then
#     echo "🐠 Candlefish AI Environment Ready"
#     echo "   Type 'candlefish_status' for status"
# fi
