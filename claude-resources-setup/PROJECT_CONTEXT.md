# Claude Resources Organization-Wide Sharing System - Project Context

## Project Overview

**Date**: August 4, 2025
**Status**: Implementation Complete, Ready for Deployment
**Purpose**: Create a centralized system for sharing Claude agents and commands across all Candlefish projects and team members

## System Architecture

### Core Components

1. **Central Repository**: `candlefish/claude-resources`
   - Contains all agents from <https://github.com/wshobson/agents>
   - Contains all commands from <https://github.com/wshobson/commands>
   - Auto-syncs every 6 hours via GitHub Actions
   - PR-based review process with Aaron and Tyler as reviewers

2. **Distribution System**
   - GitHub Actions workflows propagate resources to all projects
   - Reusable workflow pattern for consistency
   - Automatic PR creation for transparency

3. **Local Developer Experience**
   - One-time setup script creates ~/.claude symlink
   - Git worktree support built-in
   - Auto-update reminders in shell profile
   - Zero manual configuration for new projects

## Technical Architecture Decisions

### 1. Symlink-Based Distribution

**Decision**: Use symlinks from ~/.claude to organization repository
**Rationale**:

- Instant updates when pulling claude-resources repo
- No duplication of files across projects
- Works seamlessly with Git worktrees
- Simple rollback by changing symlink

### 2. GitHub Actions for Automation

**Decision**: Use GitHub Actions for all sync and distribution
**Rationale**:

- Native GitHub integration
- No external dependencies
- Built-in secret management
- Reusable workflows across projects

### 3. PR-Based Review Process

**Decision**: All updates create PRs for review
**Rationale**:

- Ensures quality control
- Allows custom modifications
- Provides audit trail
- Enables rollback if needed

### 4. Upstream Repository Structure

**Decision**: Mirror upstream structure in .claude directory
**Rationale**:

- Maintains compatibility
- Easy to track changes
- Allows selective syncing
- Preserves upstream organization

## Implementation Details

### File Structure

```
claude-resources/
├── .claude/
│   ├── agents/          # 51+ AI agents
│   ├── commands/        # Workflow commands
│   ├── tools/          # Utility tools
│   └── workflows/      # Complex workflows
├── .github/
│   └── workflows/
│       ├── sync-upstream.yml         # Pulls from wshobson repos
│       ├── sync-to-projects.yml      # Distributes to projects
│       └── project-sync-template.yml # Template for projects
├── scripts/
│   ├── setup-local.sh               # One-time team setup
│   ├── setup-worktree-claude.sh     # Git worktree integration
│   └── test-setup.sh                # Validation script
├── README.md
├── TEAM_ONBOARDING.md
└── IMPLEMENTATION_GUIDE.md
```

### API Design (Future Enhancement)

- RESTful API for programmatic access
- PostgreSQL for sync history and status
- Redis for caching and rate limiting
- WebSocket for real-time updates

### Frontend Dashboard (Future Enhancement)

- React/TypeScript deployment dashboard
- Real-time sync progress monitoring
- One-click deployment actions
- Team member onboarding wizard

### Production Infrastructure (Future Enhancement)

- Docker containers with multi-stage builds
- Kubernetes deployment with auto-scaling
- Prometheus/Grafana monitoring
- Terraform infrastructure as code

## Key Workflows

### 1. Initial Setup (One-Time)

```bash
# For implementer
gh repo create candlefish/claude-resources --private
cd claude-resources-setup && cp -r * ../claude-resources/
cd ../claude-resources && git add . && git commit -m "Initial setup" && git push

# For team members
curl -sSL https://raw.githubusercontent.com/candlefish/claude-resources/main/scripts/setup-local.sh | bash
```

### 2. Upstream Sync (Automated)

- Runs every 6 hours via cron schedule
- Creates PR with changes for review
- Aaron and Tyler review and merge
- Changes propagate to all projects

### 3. Project Integration (Automated)

- Each project has sync workflow
- Pulls from claude-resources repository
- Updates .claude directory
- No manual intervention needed

### 4. Git Worktree Support

- setup-worktree-claude.sh handles all worktrees
- Creates symlinks in each worktree
- Works with existing and new worktrees
- Optional post-checkout hook available

## Security Considerations

1. **Repository Access**
   - Private repository for claude-resources
   - Team members need read access
   - Write access limited to maintainers

2. **Secret Management**
   - No secrets in claude-resources
   - GitHub Actions use GITHUB_TOKEN
   - No API keys or credentials stored

3. **Code Review**
   - All updates go through PR review
   - Two reviewers required (Aaron, Tyler)
   - Automated security scanning possible

## Maintenance Procedures

### Daily

- Automatic syncs run every 6 hours
- No manual intervention required

### Weekly

- Review pending sync PRs
- Check for failed workflows
- Monitor team feedback

### Monthly

- Review custom additions
- Update documentation
- Audit resource usage

### Quarterly

- Evaluate sync frequency
- Plan feature enhancements
- Security audit

## Success Metrics

1. **Adoption**
   - All team members using shared resources
   - Zero manual setup complaints
   - Positive feedback on workflow

2. **Reliability**
   - 99%+ successful sync rate
   - <5 minute sync duration
   - Zero data loss incidents

3. **Efficiency**
   - One-time setup per developer
   - Automatic updates
   - No manual file copying

## Future Enhancements

1. **Web Dashboard**
   - Visual sync status
   - Resource browser
   - Team analytics

2. **API Access**
   - Programmatic resource access
   - Integration with CI/CD
   - Custom tooling support

3. **Advanced Features**
   - Resource versioning
   - Rollback capabilities
   - A/B testing for agents

## Troubleshooting Guide

### Common Issues

1. **"~/.claude not found"**
   - Run setup-local.sh script
   - Check symlink exists
   - Verify repository cloned

2. **"Sync workflow failing"**
   - Check GitHub Actions logs
   - Verify repository permissions
   - Review error messages

3. **"Updates not appearing"**
   - Pull claude-resources repo
   - Check symlink target
   - Verify workflow running

## Contact & Support

- **Implementation Lead**: @patricksmith
- **Reviewers**: @aaron, @tyler
- **Issues**: Create in claude-resources repo
- **Slack**: #claude-resources channel

## Decision Log

1. **2025-08-04**: Chose symlink approach over file copying for instant updates
2. **2025-08-04**: Selected GitHub Actions over external CI/CD for simplicity
3. **2025-08-04**: Implemented PR-based review instead of direct commits
4. **2025-08-04**: Added Git worktree support as core feature
5. **2025-08-04**: Designed for future API and dashboard enhancements

---

This context document serves as the source of truth for the Claude resources organization-wide sharing system. It should be updated as the system evolves and new decisions are made.
