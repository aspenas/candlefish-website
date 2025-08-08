# Claude Agent & Command Resources

This directory contains shared Claude agents and commands for the team.

## Team Access Setup

### For Aaron & Tyler

1. **Quick Setup** (Recommended):

   ```bash
   # From the candlefish-ai repository
   gh workflow run claude-team-setup.yml -f setup_type=install
   ```

2. **Manual Setup**:

   ```bash
   # Clone this repository
   git clone https://github.com/[your-org]/candlefish-ai.git
   cd candlefish-ai

   # Run the setup script
   ./scripts/setup-claude-worktrees.sh
   ```

3. **Direct Clone** (Simplest):

   ```bash
   # Just clone the agent repositories directly
   mkdir -p ~/.claude
   cd ~/.claude
   git clone https://github.com/wshobson/agents.git
   git clone https://github.com/wshobson/commands.git
   ```

## Keeping Resources Updated

### Automatic Updates

- GitHub Actions runs every 6 hours to sync with upstream
- Updates are automatically created as PRs for review

### Manual Updates

```bash
# Update your local copies
cd ~/.claude/agents && git pull
cd ~/.claude/commands && git pull

# Or use the sync script
~/.claude/sync-claude-resources.sh
```

## Available Resources

### Agents (51 specialized agents)

- **AI/ML**: ai-engineer, ml-engineer, data-scientist
- **Languages**: python-pro, golang-pro, rust-pro, typescript-pro
- **Infrastructure**: cloud-architect, terraform-specialist, devops-troubleshooter
- **Quality**: code-reviewer, security-auditor, test-automator
- **And many more...**

### Commands

- **Tools**: Individual utility commands for specific tasks
- **Workflows**: Multi-step processes for complex operations

## Using in Claude Code

```bash
# Use a specific agent
claude --agent python-pro "Optimize this Python code"

# Use a workflow
claude --workflow feature-development "Add user authentication"

# List available agents
ls ~/.claude/agents/*.md

# List available commands
ls ~/.claude/commands/tools/*.md
ls ~/.claude/commands/workflows/*.md
```

## Worktree Structure

The setup creates Git worktrees that:

1. Keep resources separate from main codebase
2. Allow independent updates without affecting main branch
3. Enable easy sharing across team members
4. Maintain sync with upstream repositories

## Troubleshooting

### Permission Issues

```bash
# Ensure you have GitHub CLI authenticated
gh auth login

# Check workflow permissions
gh workflow list
```

### Sync Issues

```bash
# Check worktree status
git worktree list

# Repair worktree if needed
git worktree repair
```

### Missing Resources

```bash
# Re-run setup
./scripts/setup-claude-worktrees.sh

# Or trigger GitHub Action
gh workflow run claude-agents-sync.yml
```

## Support

- **Patrick**: Architecture and setup questions
- **Team Channel**: #claude-agents (Slack/Discord)
- **Issues**: Create an issue in this repository

---

Last updated: $(date)
