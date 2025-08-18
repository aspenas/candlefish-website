# Candlefish AI Claude Code Agents - Installation Guide

## 🚀 Quick Install (One Command)

Run this single command in your terminal to install all Candlefish AI agents:

```bash
curl -sSL https://raw.githubusercontent.com/candlefish-ai/candlefish-ai/main/scripts/install-claude-agents.sh | bash
```

Or if you prefer to review the script first:

```bash
# Download and review
curl -sSL https://raw.githubusercontent.com/candlefish-ai/candlefish-ai/main/scripts/install-claude-agents.sh -o install-agents.sh
cat install-agents.sh  # Review the script
bash install-agents.sh # Run installation
```

## 📦 What Gets Installed

- **62+ Specialized AI Agents** for different programming tasks
- **MCP Server** for Claude Code integration  
- **Command-line tools** for immediate agent access
- **Shell integration** for bash/zsh

## 🎯 How to Use After Installation

### 1. Terminal Commands (Works Immediately)
```bash
# Use any agent from terminal
agent python-pro
agent backend-architect 'design a REST API'
agent security-auditor 'review this auth flow'

# List all available agents
agent
```

### 2. Claude Code @ Commands (After Restart)
```bash
# First restart Claude Code
pkill 'Claude Code' && open -a 'Claude Code'

# Then use @ commands in Claude Code
@python-pro optimize this function
@typescript-pro convert to TypeScript
@security-auditor check for vulnerabilities
```

## 📋 Available Agents (62 Total)

### Development & Architecture
- `@backend-architect` - Backend system design
- `@frontend-developer` - React/Vue/Angular
- `@api-architect` - REST/GraphQL APIs
- `@database-expert` - Database design
- `@microservices-expert` - Microservices patterns

### Programming Languages
- `@python-pro` - Python optimization
- `@typescript-pro` - TypeScript expert
- `@golang-pro` - Go programming
- `@rust-pro` - Rust development
- `@java-pro` - Java enterprise
- `@csharp-pro` - C# and .NET

### DevOps & Cloud
- `@deployment-engineer` - CI/CD pipelines
- `@cloud-architect` - AWS/GCP/Azure
- `@terraform-specialist` - Infrastructure as code
- `@devops-troubleshooter` - Problem solving

### Security & Testing
- `@security-auditor` - Security reviews
- `@test-automator` - Test automation
- `@performance-engineer` - Performance optimization
- `@debugger` - Debugging assistance

### Data & ML
- `@data-scientist` - Machine learning
- `@ml-engineer` - ML engineering
- `@data-engineer` - Data pipelines
- `@sql-pro` - SQL optimization

### And 40+ more specialized agents!

## 🔧 Manual Installation (Alternative)

If the automated script doesn't work, you can install manually:

```bash
# 1. Create Claude directory
mkdir -p ~/.claude/agents

# 2. Clone the repository
git clone https://github.com/candlefish-ai/candlefish-ai.git
cd candlefish-ai

# 3. Copy agent files
cp -r .claude/agents/* ~/.claude/agents/
cp -r .claude/wshobson-agents/* ~/.claude/agents/

# 4. Run the setup script
bash scripts/install-claude-agents.sh
```

## 🗑️ Uninstall

To remove all agents and settings:

```bash
~/.claude/uninstall-agents.sh
```

## 🐛 Troubleshooting

### @ Commands Not Working in Claude Code

1. Make sure Claude Code is restarted:
   ```bash
   pkill 'Claude Code' && sleep 2 && open -a 'Claude Code'
   ```

2. Verify agents are installed:
   ```bash
   ls ~/.claude/agents/*.md | wc -l
   # Should show 62+
   ```

3. Check settings were updated:
   ```bash
   cat ~/.claude/settings.json | grep agents
   ```

### Terminal Commands Not Working

1. Reload your shell configuration:
   ```bash
   source ~/.zshrc  # or ~/.bashrc
   ```

2. Use the full path:
   ```bash
   ~/.claude/agent python-pro
   ```

## 🔐 AWS Integration (For Candlefish Team)

If you're part of the Candlefish team with AWS access:

```bash
# Configure AWS CLI
aws configure set aws_access_key_id YOUR_KEY
aws configure set aws_secret_access_key YOUR_SECRET
aws configure set region us-east-1

# Test access
aws sts get-caller-identity

# Access secrets
aws secretsmanager list-secrets
```

## 📚 Resources

- **Agent Documentation**: `~/.claude/agents/<agent-name>.md`
- **Source Repository**: https://github.com/candlefish-ai/candlefish-ai
- **Support**: Contact Patrick or Tyler in the Candlefish Slack

## 🎉 Success Checklist

After installation, verify everything works:

- [ ] ✅ Terminal command `agent` lists all agents
- [ ] ✅ Can run `agent python-pro` from terminal
- [ ] ✅ Claude Code recognizes @ commands (after restart)
- [ ] ✅ 62+ agent files in `~/.claude/agents/`
- [ ] ✅ Settings updated at `~/.claude/settings.json`

---

**Installation takes less than 1 minute!** 🚀

If you encounter any issues, the script creates a complete log at `~/.claude/install.log`