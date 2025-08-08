# Candlefish Claude Resources - Team Onboarding Guide

Welcome to the Candlefish team! This guide will help you set up access to our shared Claude agents and commands across all projects.

## 🚀 Quick Start (5 minutes)

Run this single command to set up everything:

```bash
curl -sSL https://raw.githubusercontent.com/candlefish/claude-resources/main/scripts/setup-local.sh | bash
```

That's it! You now have access to all Claude agents and commands across every Candlefish project.

## 📚 What You Get

### Agents (51+ AI Specialists)

- **Language Experts**: Python, Go, Rust, JavaScript, TypeScript, Java, C++, etc.
- **Framework Specialists**: React, Vue, Django, Rails, Spring Boot, etc.
- **Infrastructure**: AWS, Kubernetes, Docker, Terraform, CI/CD
- **Specialized**: Security, Performance, Database, ML, Mobile, etc.

### Commands & Workflows

- **Tools**: Individual utility commands for specific tasks
- **Workflows**: Multi-step processes for complex operations
- **Templates**: Reusable patterns for common scenarios

## 🔧 How It Works

### Organization Structure

```
candlefish/claude-resources/           # Central repository
├── .claude/
│   ├── agents/                       # All available agents
│   ├── commands/                     # Command tools
│   ├── tools/                        # Utility tools
│   └── workflows/                    # Complex workflows
└── .github/workflows/                # Auto-sync workflows

~/.claude -> ~/code/candlefish/claude-resources/.claude  # Your local symlink
```

### Automatic Synchronization

- **Upstream Sync**: Every 6 hours from wshobson/agents and wshobson/commands
- **Project Sync**: Each Candlefish project automatically gets updates
- **Local Updates**: Pull the claude-resources repo to get latest changes

## 💻 Daily Usage

### Using Agents in Claude Code

```bash
# List available agents
ls ~/.claude/agents/

# Use a specific agent
claude --agent python-pro "Optimize this function for performance"
claude --agent react-specialist "Convert this to use hooks"
```

### Using Commands/Workflows

```bash
# List available workflows
ls ~/.claude/workflows/

# Use a workflow
claude --workflow feature-development "Add user authentication"
claude --workflow bug-fix "Fix memory leak in user service"
```

### Updating Your Local Resources

```bash
# Manual update (if needed)
cd ~/code/candlefish/claude-resources
git pull

# Or use the update script
~/code/candlefish/update-claude-resources.sh
```

## 🌳 Git Worktrees Support

If you use Git worktrees for your development:

### Setup All Worktrees at Once

```bash
~/code/candlefish/setup-worktree-claude.sh
```

### Setup Specific Project Worktrees

```bash
~/code/candlefish/setup-worktree-claude.sh /path/to/project
```

### New Worktree?

The setup script creates symlinks automatically, but for new worktrees:

```bash
ln -s ~/.claude /path/to/new/worktree/.claude
```

## 🔄 Keeping Everything in Sync

### Your Side (Automatic)

1. Shell reminder prompts you daily if updates are available
2. Each project pulls from claude-resources via GitHub Actions
3. Your ~/.claude always points to the latest version

### Organization Side (Automatic)

1. GitHub Actions sync from upstream every 6 hours
2. Changes create PRs reviewed by Aaron and Tyler
3. Approved changes propagate to all projects

## 🛠️ Troubleshooting

### "Command not found: claude"

Make sure Claude Code is installed and in your PATH:

```bash
# Check installation
which claude

# If not found, install Claude Code
# (Installation instructions depend on your OS)
```

### "No agents found"

```bash
# Verify symlink
ls -la ~/.claude

# Should show: ~/.claude -> /Users/you/code/candlefish/claude-resources/.claude
# If not, re-run setup script
```

### "Permission denied"

```bash
# Ensure you have access to the candlefish organization
gh auth login

# Clone with proper credentials
cd ~/code/candlefish
git clone https://github.com/candlefish/claude-resources.git
```

### Conflicts with Existing .claude

The setup script backs up your existing .claude directory. To restore:

```bash
# Find backups
ls -la ~/.claude.backup.*

# Restore if needed
mv ~/.claude.backup.20240115-093021 ~/.claude
```

## 🤝 Contributing

### Adding Custom Agents/Commands

1. Clone the claude-resources repository
2. Add your files to appropriate directories
3. Create a PR for review
4. Once merged, everyone gets your additions automatically

### Example: Adding a Custom Agent

```bash
cd ~/code/candlefish/claude-resources
git checkout -b add-my-agent

# Create your agent
cat > .claude/agents/my-specialist.md << 'EOF'
You are a specialist in...
EOF

git add .claude/agents/my-specialist.md
git commit -m "Add my-specialist agent for X tasks"
git push origin add-my-agent

# Create PR via GitHub or CLI
gh pr create --title "Add my-specialist agent" --body "This agent helps with..."
```

## 📞 Support

### Getting Help

- **Setup Issues**: Contact @patricksmith
- **Agent Questions**: Check agent documentation in ~/.claude/agents/
- **Workflow Help**: See ~/.claude/workflows/README.md

### Useful Commands

```bash
# Check Claude resources status
ls -la ~/.claude/
find ~/.claude -name "*.md" | wc -l

# See recent updates
cd ~/code/candlefish/claude-resources
git log --oneline -10

# List all available agents
ls ~/.claude/agents/ | sort

# Search for specific capabilities
grep -r "security" ~/.claude/agents/
```

## 🎯 Pro Tips

1. **Explore Available Agents**: Take 10 minutes to browse ~/.claude/agents/
2. **Use Workflows**: For complex tasks, check workflows before writing custom scripts
3. **Stay Updated**: Pull claude-resources weekly for latest improvements
4. **Share Knowledge**: If you create useful agents/commands, contribute them back
5. **Worktree Workflow**: Use worktrees for feature branches to keep .claude consistent

## 🚦 Status Indicators

- ✅ **Green**: Everything is working correctly
- 🟡 **Yellow**: Updates available, pull claude-resources
- 🔴 **Red**: Setup issue, re-run setup script or contact support

---

Welcome to the team! With this setup, you have the collective knowledge and capabilities of all our Claude agents at your fingertips across every Candlefish project. Happy coding! 🎉
