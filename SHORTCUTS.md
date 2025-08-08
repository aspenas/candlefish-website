# 🐠 Candlefish AI - Complete Shortcuts Reference

## 📍 Navigation Shortcuts

| Command | Description | Full Path |
|---------|-------------|-----------|
| `cf` | Go to Candlefish root | `/Users/patricksmith/candlefish-ai` |
| `cfweb` | Go to website project | `.../apps/website` |
| `cfpaint` | Go to Paintbox project | `.../projects/paintbox` |
| `cffogg` | Go to Fogg Calendar | `.../projects/fogg/calendar` |
| `cfprom` | Go to PromoterOS | `.../projects/promoterOS` |
| `cfbrew` | Go to Brewkit | `.../projects/brewkit` |
| `cfcrown` | Go to Crown Trophy | `.../projects/crowntrophy` |
| `cfbart` | Go to BART project | `.../projects/bart-clean-core` |

## 🤖 Claude Commands

| Command | Description | Details |
|---------|-------------|---------|
| `cc` | Claude Code | Quick access to Claude |
| `claude` | Claude Code | Full command |
| `cct` | Claude with thinking mode | Step-by-step reasoning |
| `ccm` | Claude with Opus 4.1 | Force latest model |
| `ccs` | Claude with Sonnet | Use Sonnet model |
| `cc200k` | Claude with 200k context | Maximum context window |
| `ccmax` | Claude Max (Opus + 200k) | Full power mode |

## 🌳 Git Commands

| Command | Description | Example Output |
|---------|-------------|----------------|
| `gs` | Git status | Shows changed files |
| `gd` | Git diff | Shows unstaged changes |
| `gds` | Git diff staged | Shows staged changes |
| `glog` | Beautiful git log tree | Colored graph with branches |
| `gtree` | Compact git tree | One-line graph view |
| `glt` | Last 10 commits tree | Recent history only |
| `gb` | Git branches (all) | Local + remote branches |
| `gco` | Git checkout | Switch branches |
| `gcb` | Git checkout -b | Create new branch |
| `gcm` | Git commit -m | Quick commit with message |
| `gca` | Git commit --amend | Amend last commit |
| `gp` | Git push | Push to remote |
| `gpf` | Git push force (safe) | Force with lease |
| `gpl` | Git pull --rebase | Pull and rebase |
| `gcp` | Git cherry-pick | Apply specific commit |
| `grh` | Git reset HEAD~ | Undo last commit |

## 🐙 GitHub CLI Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `ghpr` | Create pull request | `ghpr` - interactive PR creation |
| `ghprv` | View PR in browser | `ghprv` - opens current PR |
| `ghprl` | List pull requests | `ghprl` - shows all PRs |
| `ghprm` | Merge pull request | `ghprm` - merge current PR |
| `ghprc` | Checkout PR locally | `ghprc 123` - checkout PR #123 |
| `ghw` | Workflow commands | `ghw list` - list workflows |
| `ghwl` | List workflows | Shows all GitHub Actions |
| `ghwr` | Run workflow | `ghwr deploy.yml` - trigger workflow |
| `ghwv` | View workflow | `ghwv` - show workflow details |
| `ghrun` | Run commands | `ghrun list` - list runs |
| `ghrunl` | List runs | Shows recent workflow runs |
| `ghrunv` | View run | `ghrunv` - view run details |
| `ghruns` | Runs by status | `ghruns` - filter by status |

## 🛠️ Git Worktree Commands

| Command | Description | Example |
|---------|-------------|---------|
| `gwl` | List worktrees | Shows all worktrees |
| `gwa` | Add worktree | `gwa ../feature feature-branch` |
| `gwr` | Remove worktree | `gwr ../feature` |
| `gwp` | Prune worktrees | Clean up deleted worktrees |

## 🚀 Candlefish Functions

| Command | Description | What it does |
|---------|-------------|--------------|
| `candlefish_status` | Full status report | Shows environment, branch, model, etc. |
| `cfbuild` | Build Candlefish | Runs `pnpm build` |
| `cftest` | Run tests | Runs `pnpm test` |
| `deploy_candlefish` | Deploy to production | Triggers GitHub Actions deploy |
| `init_candlefish` | Initialize environment | Sets up auth, keys, git config |

## ⚙️ System Aliases

| Command | Description |
|---------|-------------|
| `ll` | List files (detailed) |
| `la` | List all files |
| `l` | List files (compact) |
| `..` | Go up one directory |
| `...` | Go up two directories |
| `python` | Python 3 |
| `pip` | Pip 3 |

## 🔑 Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `CLAUDE_MODEL` | `claude-opus-4-1-20250805` | Default Claude model |
| `CLAUDE_SUBSCRIPTION` | `max` | Subscription tier |
| `CLAUDE_TIER` | `200` | $200/month plan |
| `CLAUDE_MAX_TOKENS` | `400000` | Maximum token limit |
| `CANDLEFISH_HOME` | `/Users/patricksmith/candlefish-ai` | Project root |

## 📝 Quick File Edits

| Command | Description |
|---------|-------------|
| `cfclm` | Edit CLAUDE.md in project |
| `cfreadme` | Edit README.md |
| `cfpack` | Edit package.json |

## 🎯 Pro Tips

1. **Quick project jump**: Type `cf` then Tab for autocomplete
2. **Git tree view**: Use `glog` for beautiful commit history
3. **PR workflow**: `ghpr` → `ghprv` → `ghprm` for complete PR cycle
4. **Claude max power**: Use `ccmax` for complex tasks
5. **Status check**: Run `candlefish_status` anytime

## 🔄 Workflow Examples

### Create and merge a feature

```bash
cf                    # Go to project
gcb feature/my-feature  # Create branch
# ... make changes ...
gcm "Add new feature"   # Commit
gp                      # Push
ghpr                    # Create PR
ghprv                   # View in browser
ghprm                   # Merge when ready
```

### Debug with Claude

```bash
ccmax                   # Start Claude with max context
# Paste error message
# Claude helps debug
cftest                  # Run tests
```

### Deploy to production

```bash
deploy_candlefish       # Trigger deployment
ghrunl                  # Watch run status
```

---
*Type any command to use it. Most commands support Tab completion.*
