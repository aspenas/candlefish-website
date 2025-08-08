# Claude Resources Implementation Guide

This guide provides step-by-step instructions for setting up the Candlefish organization-wide Claude agent and command sharing system.

## 📋 Overview

The system consists of:

1. **Central Repository**: `candlefish/claude-resources` containing all agents and commands
2. **Auto-sync Workflow**: Updates from upstream every 6 hours
3. **Distribution Workflow**: Syncs to all Candlefish projects
4. **Local Setup**: One-time setup for team members

## 🚀 Implementation Steps

### Step 1: Create the Central Repository

1. Create the `candlefish/claude-resources` repository on GitHub:

```bash
gh repo create candlefish/claude-resources \
  --private \
  --description "Shared Claude agents and commands for all Candlefish projects" \
  --clone
```

2. Copy the prepared files:

```bash
# Copy all files from claude-resources-setup
cp -r claude-resources-setup/* claude-resources/
cd claude-resources
```

3. Initial commit and push:

```bash
git add .
git commit -m "Initial setup of Claude resources repository"
git push origin main
```

### Step 2: Run Initial Sync

Trigger the first sync from upstream:

```bash
gh workflow run sync-upstream.yml
```

This will:

- Clone agents from <https://github.com/wshobson/agents>
- Clone commands from <https://github.com/wshobson/commands>
- Create a PR with all resources for review

### Step 3: Setup Distribution to Projects

For each existing Candlefish project:

```bash
# Option 1: Automated distribution to all projects
gh workflow run sync-to-projects.yml \
  --repo candlefish/claude-resources \
  -f target_projects=all

# Option 2: Specific projects
gh workflow run sync-to-projects.yml \
  --repo candlefish/claude-resources \
  -f target_projects="project1,project2,project3"
```

### Step 4: Add Sync Workflow to Projects

For each project that needs Claude resources:

```bash
# In the project directory
mkdir -p .github/workflows
curl -sSL https://raw.githubusercontent.com/candlefish/claude-resources/main/.github/workflows/project-sync-template.yml \
  > .github/workflows/claude-sync.yml

git add .github/workflows/claude-sync.yml
git commit -m "Add Claude resources sync workflow"
git push
```

### Step 5: Team Member Setup

Share the setup command with all team members:

```bash
# One-line setup for team members
curl -sSL https://raw.githubusercontent.com/candlefish/claude-resources/main/scripts/setup-local.sh | bash
```

## 🔧 Configuration

### Repository Settings

In the `candlefish/claude-resources` repository settings:

1. **Branch Protection**:
   - Require PR reviews from Aaron and Tyler
   - Dismiss stale reviews
   - Include administrators

2. **Actions Permissions**:
   - Allow all actions and reusable workflows
   - Allow GitHub Actions to create and approve pull requests

3. **Secrets**:
   - No special secrets needed (uses GITHUB_TOKEN)

### Customization Options

#### Custom Agents/Commands

Add to appropriate directories:

```
.claude/
├── agents/
│   └── custom-agent.md
├── commands/
│   └── custom-command.md
└── custom/              # Organization-specific additions
    └── candlefish-specific.md
```

#### Sync Frequency

Edit `.github/workflows/sync-upstream.yml`:

```yaml
schedule:
  - cron: '0 */6 * * *'  # Change to desired frequency
```

## 🔍 Monitoring

### Check Sync Status

```bash
# View recent sync runs
gh run list --workflow=sync-upstream.yml --repo=candlefish/claude-resources

# View sync PRs
gh pr list --repo=candlefish/claude-resources --label=claude-resources
```

### Verify Distribution

```bash
# Check if a project has Claude resources
gh api repos/candlefish/{project-name}/contents/.claude
```

## 🚨 Troubleshooting

### Sync Workflow Fails

1. Check upstream repository availability
2. Verify GitHub Actions permissions
3. Check for merge conflicts in existing PRs

### Distribution Issues

1. Ensure projects have workflow permissions
2. Check for .claude directory conflicts
3. Verify team member access to repositories

### Local Setup Problems

1. Team member should have Git installed
2. Ensure ~/code/candlefish directory is accessible
3. Check for existing ~/.claude conflicts

## 📊 Success Metrics

- ✅ All team members have ~/.claude symlinked
- ✅ 51+ agents available in all projects
- ✅ Automatic updates every 6 hours
- ✅ Zero manual intervention needed
- ✅ Git worktree compatible

## 🔒 Security Considerations

1. **Private Repository**: Keep claude-resources private
2. **PR Reviews**: All updates reviewed by Aaron/Tyler
3. **No Secrets**: No API keys or secrets in resources
4. **Access Control**: Team members need repo access

## 📝 Maintenance

### Weekly Tasks

- Review pending sync PRs
- Check for failed workflows
- Monitor team feedback

### Monthly Tasks

- Review custom additions
- Update documentation
- Check upstream changes

### Quarterly Tasks

- Audit resource usage
- Optimize sync performance
- Plan new features

## 🎯 Next Steps

1. **Immediate**: Run implementation steps 1-5
2. **This Week**: Onboard all team members
3. **This Month**: Add custom Candlefish agents
4. **This Quarter**: Integrate with CI/CD pipelines

---

For questions or issues, contact @patricksmith or create an issue in the claude-resources repository.
