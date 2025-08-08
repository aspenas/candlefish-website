# Git Worktree Management

## Current Worktree Topology

```
candlefish-ai/                    # Main repository (homepage-deploy branch)
├── candlefish-worktrees/
│   ├── main-cicd/                # CI/CD improvements (cicd/github-actions)
│   ├── main-development/         # Development integration (development)
│   ├── main-docs/                # Documentation updates (docs/updates)
│   ├── main-experimental/        # Experimental features (experimental/testing)
│   ├── main-feature/             # Feature development (feature/parallel-work)
│   └── main-hotfix/              # Quick fixes (hotfix/quick-fixes)
```

## Worktree Commands

### List All Worktrees

```bash
git worktree list
```

### Add New Worktree

```bash
# Create worktree for existing branch
git worktree add ../candlefish-worktrees/<name> <branch>

# Create worktree with new branch
git worktree add -b <new-branch> ../candlefish-worktrees/<name> <base-branch>

# Example: Create feature worktree
git worktree add -b feature/new-feature ../candlefish-worktrees/main-new-feature main
```

### Remove Worktree

```bash
# Remove worktree (keep branch)
git worktree remove ../candlefish-worktrees/<name>

# Force remove (if worktree has uncommitted changes)
git worktree remove --force ../candlefish-worktrees/<name>

# Clean up stale worktree references
git worktree prune
```

### Move Worktree

```bash
git worktree move <old-path> <new-path>
```

## Worktree Best Practices

### 1. Naming Convention

- **Production**: `main-<purpose>`
- **Features**: `main-feature-<name>`
- **Fixes**: `main-hotfix-<issue>`
- **Experiments**: `main-experimental-<test>`

### 2. Branch Strategy

- Each worktree should track a specific branch
- Avoid switching branches within a worktree
- Use descriptive branch names matching the worktree purpose

### 3. Synchronization

```bash
# Sync worktree with remote
cd ../candlefish-worktrees/<name>
git pull origin <branch>

# Sync all worktrees (use cf-sync.sh script)
../bin/cf-sync.sh
```

### 4. Resource Management

- Remove unused worktrees promptly
- Run `git worktree prune` weekly
- Keep maximum 5-7 active worktrees
- Document active worktrees in team wiki

## Common Workflows

### Feature Development

```bash
# 1. Create feature worktree
git worktree add -b feature/awesome-feature \
  ../candlefish-worktrees/main-awesome-feature main

# 2. Develop in worktree
cd ../candlefish-worktrees/main-awesome-feature
# ... make changes ...
git add .
git commit -m "feat: add awesome feature"
git push -u origin feature/awesome-feature

# 3. Create PR
gh pr create -B main -t "Add awesome feature"

# 4. After merge, cleanup
cd ../../candlefish-ai
git worktree remove ../candlefish-worktrees/main-awesome-feature
git branch -d feature/awesome-feature
```

### Hotfix Workflow

```bash
# 1. Create hotfix from main
git worktree add -b hotfix/critical-bug \
  ../candlefish-worktrees/main-hotfix-bug main

# 2. Fix and test
cd ../candlefish-worktrees/main-hotfix-bug
# ... fix bug ...
git add .
git commit -m "fix: resolve critical bug"
git push -u origin hotfix/critical-bug

# 3. Fast-track PR
gh pr create -B main -t "Critical: Fix production bug" --label "hotfix"

# 4. Cleanup after merge
cd ../../candlefish-ai
git worktree remove ../candlefish-worktrees/main-hotfix-bug
```

### Parallel Development

```bash
# Work on multiple features simultaneously
git worktree add -b feature/api ../candlefish-worktrees/main-api main
git worktree add -b feature/ui ../candlefish-worktrees/main-ui main

# Switch between worktrees
cd ../candlefish-worktrees/main-api  # Work on API
cd ../candlefish-worktrees/main-ui   # Work on UI
```

## CI/CD Integration

### GitHub Actions Considerations

- Each worktree push triggers CI for its branch
- Use path filters to optimize builds
- Worktree branches follow same protection rules
- Automated sync available via `sync-worktrees` job

### Build Optimization

```yaml
# .github/workflows/multi-worktree-ci.yml
on:
  push:
    branches:
      - main
      - development
      - 'feature/**'
      - 'hotfix/**'
    paths:
      - 'apps/**'
      - 'packages/**'
      - 'projects/**'
```

## Troubleshooting

### Worktree Locked

```bash
# If worktree is locked
git worktree unlock <path>

# Force unlock
rm <path>/.git/worktree.lock
```

### Corrupted Worktree

```bash
# Remove corrupted worktree
git worktree remove --force <path>
git worktree prune

# Re-create if needed
git worktree add <path> <branch>
```

### Branch Conflicts

```bash
# If branch exists in multiple worktrees
git worktree list --porcelain | grep "branch refs/heads/<branch>"

# Remove duplicate
git worktree remove <duplicate-path>
```

## Automation Scripts

See `/bin/cf-sync.sh` for automated worktree management:

- Sync all worktrees with remote
- Prune stale worktrees
- Update branch tracking
- Generate status report

## Resources

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [GitHub Actions with Worktrees](https://docs.github.com/en/actions)
- Team Wiki: Worktree Status Dashboard
