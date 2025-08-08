# Architectural Decision Records (ADRs)

## ADR-001: Symlink-Based Local Distribution

**Status**: Accepted
**Date**: 2025-08-04
**Context**: Need to distribute Claude resources to all developer machines efficiently

### Decision

Use symbolic links from `~/.claude` to a centrally managed Git repository instead of copying files to each project.

### Consequences

✅ **Positive**:

- Instant updates when pulling the central repository
- No file duplication across projects
- Single source of truth
- Easy rollback by changing symlink target
- Works seamlessly with Git worktrees

❌ **Negative**:

- Requires initial setup script execution
- Developers must have the central repo cloned
- Symlinks may not work on all filesystems (rare)

### Alternatives Considered

1. **File Copying**: Rejected due to synchronization complexity
2. **Git Submodules**: Rejected due to poor developer experience
3. **Package Manager**: Rejected due to overhead and complexity

---

## ADR-002: GitHub Actions for Automation

**Status**: Accepted
**Date**: 2025-08-04
**Context**: Need automated synchronization from upstream repositories

### Decision

Use GitHub Actions workflows for all automation tasks including upstream sync, distribution, and project integration.

### Consequences

✅ **Positive**:

- Native GitHub integration
- No external CI/CD infrastructure needed
- Built-in secret management
- Reusable workflows
- Free for private repositories

❌ **Negative**:

- Vendor lock-in to GitHub
- Subject to GitHub Actions quotas
- Limited customization compared to dedicated CI/CD

### Alternatives Considered

1. **Jenkins**: Rejected due to infrastructure overhead
2. **GitLab CI**: Rejected as not using GitLab
3. **CircleCI/TravisCI**: Rejected due to additional complexity

---

## ADR-003: Pull Request Based Review Process

**Status**: Accepted
**Date**: 2025-08-04
**Context**: Need quality control for upstream synchronization

### Decision

All synchronization from upstream creates pull requests for human review rather than automatic merging.

### Consequences

✅ **Positive**:

- Quality control and security review
- Audit trail of all changes
- Ability to reject problematic updates
- Team awareness of changes
- Custom modifications possible

❌ **Negative**:

- Requires manual review (6x daily)
- Potential for review bottleneck
- Delayed updates

### Mitigation

- Assign multiple reviewers (Aaron, Tyler)
- Clear review guidelines
- Automated security scanning

---

## ADR-004: Centralized Repository Pattern

**Status**: Accepted
**Date**: 2025-08-04
**Context**: Need to manage resources across multiple projects

### Decision

Create a single `candlefish/claude-resources` repository as the central source of truth rather than duplicating in each project.

### Consequences

✅ **Positive**:

- Single point of management
- Consistent versioning
- Reduced storage usage
- Simplified updates
- Clear ownership

❌ **Negative**:

- Single point of failure
- Requires repository access
- Network dependency

### Alternatives Considered

1. **Per-Project Copies**: Rejected due to synchronization complexity
2. **Monorepo**: Rejected as projects are separate
3. **NPM Package**: Rejected due to publishing overhead

---

## ADR-005: Git Worktree First-Class Support

**Status**: Accepted
**Date**: 2025-08-04
**Context**: Team uses Git worktrees extensively for feature development

### Decision

Build Git worktree support as a core feature, not an afterthought, with dedicated scripts and automatic detection.

### Consequences

✅ **Positive**:

- Seamless developer experience
- No manual worktree setup
- Consistent resources across all worktrees
- Supports existing workflows

❌ **Negative**:

- Additional complexity in setup scripts
- More testing scenarios
- Potential edge cases

---

## ADR-006: Shell Script Based Local Setup

**Status**: Accepted
**Date**: 2025-08-04
**Context**: Need simple, reliable local environment setup

### Decision

Use Bash scripts for local setup rather than complex installation tools or configuration management.

### Consequences

✅ **Positive**:

- No dependencies required
- Works on all Unix systems
- Easy to understand and modify
- Can be curl-piped for quick setup
- Transparent operations

❌ **Negative**:

- No Windows support (without WSL)
- Limited error handling
- No rollback mechanism

### Alternatives Considered

1. **Ansible**: Rejected as overkill
2. **Docker**: Rejected due to complexity
3. **Make**: Rejected for less clarity

---

## ADR-007: Upstream Repository Structure Preservation

**Status**: Accepted
**Date**: 2025-08-04
**Context**: Syncing from wshobson/agents and wshobson/commands

### Decision

Preserve the exact directory structure from upstream repositories within our `.claude/` directory.

### Consequences

✅ **Positive**:

- Easy to track upstream changes
- Maintains compatibility
- Simplifies sync logic
- Clear attribution

❌ **Negative**:

- May not match our ideal structure
- Limited organization flexibility
- Potential naming conflicts

---

## ADR-008: No Direct Upstream Forks

**Status**: Accepted
**Date**: 2025-08-04
**Context**: Need to sync from upstream while maintaining custom additions

### Decision

Clone and sync from upstream rather than using GitHub forks, allowing custom additions in the same repository.

### Consequences

✅ **Positive**:

- Can add custom resources
- Not limited by fork restrictions
- Cleaner repository relationship
- Better access control

❌ **Negative**:

- No automatic fork sync features
- Manual sync workflow needed
- Less visible connection to upstream

---

## ADR-009: Environment Agnostic Design

**Status**: Accepted
**Date**: 2025-08-04
**Context**: Developers use various environments and setups

### Decision

Design scripts to work in any Unix environment without assuming specific tools or configurations beyond Git and Bash.

### Consequences

✅ **Positive**:

- Maximum compatibility
- Works in containers
- No special requirements
- Easy troubleshooting

❌ **Negative**:

- Can't use advanced features
- More verbose scripts
- Limited optimization

---

## ADR-010: Future API Preparation

**Status**: Proposed
**Date**: 2025-08-04
**Context**: May need programmatic access to resources

### Decision

Structure the system to allow future API layer addition without breaking existing functionality.

### Consequences

✅ **Positive**:

- Future extensibility
- Clean separation of concerns
- Multiple access methods
- Progressive enhancement

❌ **Negative**:

- Some over-engineering
- Unused abstraction initially
- Additional complexity

### Implementation Notes

- Keep file structure API-friendly
- Use consistent naming conventions
- Document resource metadata
- Plan for versioning

---

## Summary of Principles

1. **Simplicity First**: Prefer simple solutions that work over complex ones
2. **Developer Experience**: Optimize for ease of use and minimal friction
3. **Automation**: Automate repetitive tasks but maintain human oversight
4. **Flexibility**: Design for future enhancements without over-engineering
5. **Reliability**: Ensure system works consistently across environments
6. **Transparency**: Make it clear what the system is doing and why

These architectural decisions form the foundation of the Claude resources organization-wide sharing system. They should be revisited quarterly or when significant changes are proposed.
