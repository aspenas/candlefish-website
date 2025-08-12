# Critical Deployment Workflow Instructions for Leslie

## Overview

This document provides step-by-step instructions for using the Critical Deployment Workflow Orchestrator to safely deploy the FOGG Calendar application with automated validation, testing, and rollback capabilities.

## Quick Start

### Basic Deployment (Recommended for First Time)

```bash
cd /Users/patricksmith/candlefish-ai/projects/fogg/calendar
./deploy/critical-deploy.sh --dry-run
```

This runs a safe dry-run that simulates deployment without making actual changes.

### Real Deployment to Staging

```bash
./deploy/critical-deploy.sh --env staging
```

### Production Deployment (Use with Caution)

```bash
./deploy/critical-deploy.sh --env production
```

⚠️ **WARNING**: This will prompt for confirmation before proceeding.

## Available Deployment Agents

The system includes four specialized agents that validate different aspects of the deployment:

1. **security-auditor** - Scans for vulnerabilities, exposed secrets, and security issues
2. **performance-engineer** - Optimizes performance and measures improvements
3. **test-automator** - Runs comprehensive test suites (unit, integration, API, etc.)
4. **database-optimizer** - Optimizes database queries, indexes, and performance

## Common Deployment Scenarios

### 1. Full Deployment with All Validations (Default)

```bash
./deploy/critical-deploy.sh
```

- Runs all 4 agents
- Priority: Security → Performance → Testing → Database
- Full validation and rollback enabled

### 2. Security-Focused Deployment

```bash
./deploy/critical-deploy.sh \
    --agents "security-auditor,test-automator" \
    --env staging
```

- Only runs security and testing validations
- Faster deployment when performance is not a concern

### 3. Database Migration Deployment

```bash
./deploy/critical-deploy.sh \
    --agents "database-optimizer,test-automator" \
    --priority "database>testing"
```

- Prioritizes database changes
- Ensures migrations are tested

### 4. Emergency Hotfix Deployment

```bash
./deploy/critical-deploy.sh \
    --agents "security-auditor" \
    --validation automated \
    --env production \
    --dry-run
```

- Minimal validation for urgent fixes
- Always test with --dry-run first!

### 5. Performance Optimization Deployment

```bash
./deploy/critical-deploy.sh \
    --agents "performance-engineer,database-optimizer" \
    --priority "performance>database"
```

- Focuses on performance improvements
- Optimizes both application and database

## Command Options

| Option | Description | Values | Default |
|--------|-------------|---------|---------|
| `--env` | Target environment | staging, production | staging |
| `--agents` | Agents to run (comma-separated) | security-auditor, performance-engineer, test-automator, database-optimizer | all agents |
| `--priority` | Execution order | Format: "agent1>agent2>agent3" | security>performance>testing>architecture |
| `--validation` | Validation mode | automated, manual, hybrid | automated |
| `--rollback` | Enable rollback on failure | enabled, disabled | enabled |
| `--parallel` | Run agents in parallel | (flag) | sequential |
| `--dry-run` | Simulate without deploying | (flag) | false |

## Step-by-Step Deployment Process

### Step 1: Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All code changes are committed
- [ ] Tests pass locally: `pytest tests/`
- [ ] No exposed secrets: `git diff | grep -i "api_key\|secret\|password"`
- [ ] Backup exists (for production)

### Step 2: Test with Dry-Run

Always test your deployment configuration first:

```bash
./deploy/critical-deploy.sh --dry-run --env staging
```

Check the output for:

- ✅ All agents show "PASSED" status
- ✅ Success rate is above 95%
- ⚠️ Review any warnings (some test failures are acceptable)

### Step 3: Deploy to Staging

```bash
./deploy/critical-deploy.sh --env staging
```

Monitor the output:

- Each agent will run sequentially
- Progress is shown in real-time
- Final summary shows overall status

### Step 4: Verify Staging Deployment

After successful staging deployment:

```bash
# Check application health
curl https://fogg-calendar-staging.run.app/health

# View deployment report
cat deploy/reports/latest.json | jq '.status'

# Check logs
gcloud logging read --limit 10
```

### Step 5: Deploy to Production (if needed)

```bash
# First, always dry-run
./deploy/critical-deploy.sh --env production --dry-run

# If dry-run succeeds, deploy for real
./deploy/critical-deploy.sh --env production
```

You will see:

```
⚠️  WARNING: You are about to deploy to PRODUCTION!
Are you sure you want to continue? (yes/no):
```

Type `yes` to proceed.

## Understanding the Output

### Successful Deployment

```
╔══════════════════════════════════════════════════════════╗
║              DEPLOYMENT COMPLETED SUCCESSFULLY           ║
╚══════════════════════════════════════════════════════════╝

📊 Deployment report: ./deploy/reports/latest.json
```

### Failed Deployment with Rollback

```
╔══════════════════════════════════════════════════════════╗
║                  DEPLOYMENT FAILED                       ║
╚══════════════════════════════════════════════════════════╝

✓ Rollback was performed automatically
```

## Deployment Reports

Reports are saved in `deploy/reports/` with detailed metrics:

- `latest.json` - Most recent deployment
- `deployment_[id]_[timestamp].json` - Timestamped reports

View report summary:

```bash
# Quick status check
cat deploy/reports/latest.json | jq '.status, .metrics_summary'

# View warnings
cat deploy/reports/latest.json | jq '.warnings'

# Check specific agent results
cat deploy/reports/latest.json | jq '.agent_results[] | select(.agent=="security-auditor")'
```

## Troubleshooting

### Issue: Deployment Fails at Security Check

**Solution**: Review security warnings and fix issues:

```bash
# Check what failed
cat deploy/reports/latest.json | jq '.agent_results[] | select(.agent=="security-auditor") | .errors'

# Common fixes:
# - Remove hardcoded secrets
# - Update dependencies with vulnerabilities
# - Fix permission issues
```

### Issue: Test Failures Block Deployment

**Solution**: Some test failures are acceptable (>95% pass rate):

```bash
# Check test results
cat deploy/reports/latest.json | jq '.agent_results[] | select(.agent=="test-automator") | .metrics.overall'

# If pass rate is too low, fix failing tests or adjust threshold
```

### Issue: Database Optimization Shows No Improvement

**Solution**: This warning is informational and doesn't block deployment:

```bash
# Database already optimized is actually good!
# To force re-optimization:
./deploy/critical-deploy.sh --agents "database-optimizer" --env staging
```

### Issue: Rollback Failed

**Solution**: Manual intervention required:

```bash
# Check rollback status
cat deploy/reports/latest.json | jq '.status'

# Manual rollback steps:
1. Revert to previous container image
2. Restore database from backup
3. Clear caches
4. Restart services
```

## Best Practices

1. **Always Use Dry-Run First**
   - Test every deployment configuration
   - Especially important for production

2. **Deploy During Low-Traffic Hours**
   - Production: Early morning or late night
   - Staging: Anytime

3. **Monitor After Deployment**

   ```bash
   # Watch logs
   gcloud logging read --follow

   # Check metrics
   curl https://fogg-calendar.run.app/metrics
   ```

4. **Keep Rollback Enabled**
   - Never disable rollback for production
   - Only disable for testing purposes

5. **Review Reports**
   - Check warnings even if deployment succeeds
   - Archive reports for compliance

## Emergency Procedures

### Immediate Rollback

If something goes wrong after deployment:

```bash
# 1. Trigger manual rollback
gcloud run services update-traffic fogg-calendar --to-revisions=PREVIOUS=100

# 2. Verify rollback
curl https://fogg-calendar.run.app/health

# 3. Investigate issue
cat deploy/reports/latest.json | jq '.errors'
```

### Contact for Help

If you encounter issues:

1. Check deployment report: `deploy/reports/latest.json`
2. Review logs: `gcloud logging read --limit 50`
3. Contact Patrick with:
   - Deployment ID from report
   - Error messages
   - Time of deployment

## Configuration Files

### Deployment Configurations

Pre-defined configurations are in `deploy/deployment-configs.yaml`:

- `critical-full` - All validations
- `security-priority` - Security focus
- `performance-tuning` - Performance focus
- `quick-validation` - Fast minimal checks
- `database-migration` - Database changes
- `production-hotfix` - Emergency fixes

### Custom Configuration Example

Create a custom deployment:

```bash
./deploy/critical-deploy.sh \
    --agents "security-auditor,performance-engineer,test-automator" \
    --priority "security>testing>performance" \
    --validation automated \
    --rollback enabled \
    --env staging
```

## Summary

The Critical Deployment Workflow Orchestrator provides:

- ✅ Automated security scanning
- ✅ Performance optimization
- ✅ Comprehensive testing
- ✅ Database optimization
- ✅ Automatic rollback on failure
- ✅ Detailed reporting
- ✅ Dry-run capability

**Remember**: When in doubt, use `--dry-run` first!

---

*Last Updated: August 6, 2025*
*Created by: Patrick Smith*
*For: Leslie's use with FOGG Calendar deployment*
