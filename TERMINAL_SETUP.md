# 🐠 Candlefish Terminal Configuration

## Overview

This document contains the complete terminal setup for the Candlefish AI development environment, including all shortcuts, project navigation, and customizations.

## Configuration Files

### 1. Main Shell Configuration

**File**: `~/.zshrc`

- Terminal prompt configuration
- Projects table display on every command
- Git branch integration
- Clean startup (no function output)

### 2. Candlefish Complete Setup

**File**: `~/.config/candlefish-complete-setup.zsh`

- All project navigation aliases
- Git shortcuts and utilities
- GitHub CLI integration
- Claude Code shortcuts
- Helper functions

### 3. Claude Code Wrapper

**File**: `~/.local/bin/claude-code`

- Auto-login to Claude Pro Max ($200 tier)
- Model: claude-opus-4-1-20250805
- 400,000 token context
- TTY detection for clean operation

### 4. Claude Auto-Login

**File**: `~/.local/bin/claude-auto-login`

- Automatic authentication
- Pro Max subscription setup
- Non-interactive shell handling

## What You See in Terminal

Every command shows:

```
🐠 CANDLEFISH PROJECTS
═══════════════════════════════════════════════════════════════════

🎯 CORE APPLICATIONS
├─ cfweb    → Website         Main candlefish.ai site
└─ cf       → Root            Project root & configs

💼 ENTERPRISE TOOLS
├─ cfpaint  → Paintbox        Painting contractor platform
├─ cffogg   → Fogg Calendar   Smart scheduling system
└─ cfprom   → PromoterOS      Event management system

🛠️ BUSINESS SOLUTIONS
├─ cfbrew   → Brewkit         Brewery management
├─ cfcrown  → Crown Trophy    Awards e-commerce
└─ cfbart   → BART            Business analytics engine

═══════════════════════════════════════════════════════════════════
🐠 ~/candlefish-ai [branch-name] ❯
```

## Quick Reference Files

1. **SHORTCUTS.md** - Complete command reference
2. **PROJECTS.md** - Detailed project descriptions
3. **TERMINAL_SETUP.md** - This file

## Backup & Restore

### Backup Current Setup

```bash
# Create backup directory
mkdir -p ~/candlefish-ai/terminal-backup

# Backup all config files
cp ~/.zshrc ~/candlefish-ai/terminal-backup/
cp ~/.config/candlefish-complete-setup.zsh ~/candlefish-ai/terminal-backup/
cp ~/.local/bin/claude-code ~/candlefish-ai/terminal-backup/
cp ~/.local/bin/claude-auto-login ~/candlefish-ai/terminal-backup/
cp ~/.claude/settings.json ~/candlefish-ai/terminal-backup/
```

### Restore from Backup

```bash
# Restore all files
cp ~/candlefish-ai/terminal-backup/.zshrc ~/
cp ~/candlefish-ai/terminal-backup/candlefish-complete-setup.zsh ~/.config/
cp ~/candlefish-ai/terminal-backup/claude-code ~/.local/bin/
cp ~/candlefish-ai/terminal-backup/claude-auto-login ~/.local/bin/
cp ~/candlefish-ai/terminal-backup/settings.json ~/.claude/

# Make scripts executable
chmod +x ~/.local/bin/claude-code
chmod +x ~/.local/bin/claude-auto-login
chmod +x ~/.config/candlefish-complete-setup.zsh

# Reload shell
source ~/.zshrc
```

## Key Features

✅ **Projects table on every command** - Always visible reference
✅ **Claude Pro Max auto-login** - $200/month tier
✅ **Clean terminal startup** - No function output or errors
✅ **Git branch in prompt** - Always know your branch
✅ **All shortcuts available** - Navigation, git, GitHub, Claude
✅ **Model: claude-opus-4-1-20250805** - Latest and most capable

## Troubleshooting

### If projects table doesn't show

```bash
source ~/.zshrc
source ~/.config/candlefish-complete-setup.zsh
```

### If Claude login fails

```bash
claude /login  # Manual login
/Users/patricksmith/.local/bin/claude-auto-login  # Auto-login script
```

### To disable projects table

Comment out the precmd function in ~/.zshrc

### To re-enable welcome message

Uncomment lines 186-189 in ~/.zshrc

## Maintenance

This setup is maintained in the candlefish-ai repository. Any changes should be:

1. Tested locally
2. Backed up using the backup commands above
3. Documented in this file
4. Committed to git

---
*Last updated: August 6, 2025*
*Configuration by: Claude Code with Patrick Smith*
