# Git History Cleanup Plan - Candlefish AI Repository

## Overview
This document outlines the comprehensive plan for cleaning sensitive content from the git history of the candlefish-ai repository. This is the final step in the security isolation process.

## Current Status Analysis

### Sensitive Content Identified
Based on repository analysis, the following sensitive patterns exist in git history:

**File Patterns:**
- `apps/website/src/family-dashboard/` - Complete family dashboard application
- `apps/website/.github/workflows/family-dashboard-ci.yml` - CI configuration
- `apps/website/deploy-family-dashboard.sh` - Deployment script
- `apps/website/netlify/edge-functions/validate-family-auth.js` - Authentication
- `apps/website/netlify/functions/family-*.js` - Various family functions
- Files within `candlefish-production/docs/privileged/family/` path structure

**Commit Messages:**
- 12+ commits containing "family", "privileged", "estate", or "trust" terms
- References to "Mike McIntosh", "legal structure", "Studio structure"
- Commits mentioning "comprehensive structural changes"

## Backup Strategy

### 1. Automated Backup
The cleanup script automatically creates:
- **Location**: `$HOME/candlefish-history-backup-$(date +%Y%m%d-%H%M%S)`
- **Content**: Complete repository copy with full history
- **Retention**: Keep indefinitely for security recovery

### 2. Remote Backup Verification
Before execution, ensure:
```bash
# Verify remote is accessible
git remote -v
git fetch origin --all

# Confirm all branches are pushed
git push origin --all
git push origin --tags
```

### 3. Team Coordination Backup
- Notify Tyler and Aaron BEFORE execution
- Request they create local backups if needed
- Confirm they understand re-clone requirement

## Cleanup Process Summary

### Phase 1: Validation & Setup
1. **Repository Validation**
   - Verify correct repository (candlefish-ai)
   - Check for uncommitted changes
   - Confirm on main branch
   - Validate remote connectivity

2. **Pre-execution Analysis**
   - Scan for sensitive file patterns
   - Count affected commits
   - Display sample content to be removed
   - Provide impact summary

### Phase 2: History Cleaning
1. **Download BFG Repo Cleaner** (if not present)
2. **Create Isolated Clone** for safe processing
3. **Folder Removal**:
   - `privileged/`, `family/`, `private/`, `confidential/`
   - `family-dashboard/`, `family-auth/`, `family-data/`
   - `estate/`, `trust/`, `legal_structure/`

4. **File Pattern Removal**:
   - All files matching: `*family*`, `*privileged*`, `*private*`, etc.
   - Specific patterns: `family-dashboard*`, `family-auth*`, etc.

5. **Commit Message Cleaning**:
   - Replace sensitive terms with `[REDACTED]`
   - Patterns: family, privileged, estate, trust, etc.
   - Names: Mike McIntosh → [REDACTED]

### Phase 3: Verification & Deployment
1. **Comprehensive Verification**
   - Check file paths for sensitive content
   - Verify commit messages are cleaned
   - Test for specific sensitive patterns
   - Fail-safe if verification fails

2. **Safe Deployment**
   - Multiple confirmation prompts
   - Option to abort at each step
   - Force-push with explicit confirmation

## Risk Assessment & Mitigation

### High Risk
- **Git history rewrite**: Irreversible operation
- **Team disruption**: All team members must re-clone
- **Deployment impact**: CI/CD pipelines may need updates

### Mitigation Strategies
1. **Multiple Confirmations**: Script requires explicit confirmations
2. **Comprehensive Backup**: Automatic backup before any changes
3. **Step-by-step Process**: Can abort at multiple points
4. **Verification Checks**: Validates cleaning before push
5. **Team Communication**: Built-in notification reminders

### Rollback Plan
If issues occur after cleanup:
1. Restore from backup: `$HOME/candlefish-history-backup-*`
2. Force push backup to restore original history
3. Re-coordinate with team for fresh clones

## Execution Timeline

### Immediate Pre-execution (Day 0)
- [ ] Review this plan with team
- [ ] Confirm Tyler and Aaron availability for re-clone
- [ ] Ensure all current work is committed and pushed
- [ ] Verify backup strategies are in place

### Execution Day (Within 24 hours)
1. **Morning** (9 AM - 11 AM):
   - Execute cleanup script
   - Verify results
   - Force push cleaned history

2. **Afternoon** (1 PM - 3 PM):
   - Notify team members
   - Assist with re-cloning process
   - Verify deployments are working

3. **Evening** (5 PM - 6 PM):
   - Monitor for any issues
   - Confirm all systems operational

### Post-execution (Days 1-3)
- [ ] Monitor CI/CD pipelines
- [ ] Verify Netlify deployments
- [ ] Confirm team members have clean repositories
- [ ] Document any lessons learned

## Team Communication Template

**Subject**: URGENT: Candlefish AI Repository History Cleanup - Action Required

Team,

The candlefish-ai repository has undergone a security cleanup to remove sensitive content from git history. This was necessary to complete our security isolation process.

**IMMEDIATE ACTION REQUIRED:**
1. Delete your local candlefish-ai repository
2. Re-clone from GitHub:
   ```bash
   rm -rf candlefish-ai
   git clone https://github.com/candlefish-ai/candlefish-ai.git
   ```

**What happened:**
- Removed all traces of family/privileged content from git history
- This was a security requirement, not a code issue
- All current functionality remains intact

**Verification:**
- All deployments are working normally
- No functionality has been lost
- This only affected git history, not current code

Please confirm when you've re-cloned successfully.

Thanks,
Patrick

## Script Execution Commands

```bash
# Navigate to repository
cd /Users/patricksmith/candlefish-ai

# Ensure clean state
git status
git checkout main
git pull origin main

# Execute cleanup (interactive)
./clean-git-history.sh
```

## Success Criteria
- [ ] No sensitive file paths in git history
- [ ] No sensitive terms in commit messages  
- [ ] All verification checks pass
- [ ] Repository functions normally
- [ ] Team members successfully re-clone
- [ ] CI/CD pipelines operational
- [ ] Netlify deployments working

## Emergency Contacts
- **Primary**: Patrick Smith (executor)
- **Team**: Tyler and Aaron (requires re-clone)
- **Fallback**: Restore from backup if critical issues

---

**IMPORTANT**: This is a one-time security operation. Once executed, the original git history with sensitive content will be permanently removed from the main repository.
