# Kill Switch Runbook
*Version: 1.0 | Generated: 2025-08-31*

## Purpose
Gracefully terminate projects that no longer meet success criteria while preserving learnings and reusable components.

## Automatic Triggers

### Time-Based Kills
| Stage | Trigger | Grace Period |
|-------|---------|--------------|
| Spark | No update for 30 days | 7 days |
| Seed | Blocked for 14 days | 3 days |
| Scaffold | Tests failing for 7 days | 24 hours |
| Ship | Customer bugs for 48 hours | 0 (immediate) |
| Scale | SLA violations for 3 days | 0 (immediate) |

### Quality-Based Kills
- Minimum Remarkable score <3/10
- Test coverage drops below 40%
- Security vulnerabilities marked critical
- Performance regression >50%

### Strategic Kills
- Strategic fit score drops below 2/5
- Effort estimate exceeds 3x original
- Dependencies become unavailable
- Market conditions change materially

## Kill Switch Process

### 1. Detection (Automated)
```yaml
trigger_detected:
  - GitHub Action identifies trigger condition
  - Notification sent to owner and pod lead
  - Grace period timer starts
  - Issue labeled with 'kill-review'
```

### 2. Grace Period Response
**Owner has grace period to:**
- Fix the triggering condition
- Request exception with justification
- Propose pivot/rescope
- Accept termination

**Exception Request Template:**
```markdown
## Kill Switch Exception Request
**Project:** [Name]
**Trigger:** [What triggered kill switch]
**Resolution Plan:** [How you'll fix it]
**Timeline:** [When it will be fixed]
**Why Continue:** [Business justification]
**Risk Accepted By:** @stakeholder
```

### 3. Termination Execution

#### A. Code Preservation
```bash
# Create archive branch
git checkout -b archive/[project-name]-[date]
git push origin archive/[project-name]-[date]

# Move to experiments folder
mkdir -p experiments/[year]/[project-name]
mv src/[project-files] experiments/[year]/[project-name]/
git add -A
git commit -m "Archive: [project-name] - Kill switch triggered by [reason]"

# Tag for reference
git tag -a killed/[project-name] -m "Killed: [reason]"
git push --tags
```

#### B. Documentation
Create `/experiments/[year]/[project-name]/POSTMORTEM.md`:
```markdown
# [Project Name] Postmortem
**Killed Date:** [Date]
**Trigger:** [What triggered termination]
**Stage at Death:** [Gate]
**Resources Invested:** [Time/Money]

## What We Tried
[Approach and implementation details]

## Why It Failed
[Root cause analysis]

## What We Learned
1. [Learning 1]
2. [Learning 2]
3. [Learning 3]

## Reusable Components
- `[component]` - [how it can be reused]
- `[pattern]` - [where it applies]

## Recommendations
[What to do differently next time]
```

#### C. Resource Recovery
1. **AWS Resources**
   - Terminate EC2 instances
   - Delete unused RDS databases
   - Remove S3 buckets (after backup)
   - Cancel reserved instances

2. **External Services**
   - Cancel API subscriptions
   - Remove webhooks
   - Delete OAuth apps
   - Close vendor accounts

3. **Team Resources**
   - Reassign owner to new project
   - Update capacity planning
   - Cancel recurring meetings
   - Archive Slack channels

### 4. Salvage Operations

#### Component Extraction
```bash
# Identify reusable components
grep -r "export" src/ | grep -E "(class|function|const)" > reusable.txt

# Extract to shared library
mkdir -p packages/shared/[component-name]
cp [reusable-files] packages/shared/[component-name]/

# Update package.json
npm init -y
npm publish --access=private
```

#### Data Preservation
```sql
-- Backup any valuable data
CREATE TABLE archive.[project_name]_backup AS
SELECT * FROM production.[project_tables];

-- Document data schema
\d+ [table_name] > schema_backup.sql
```

#### Learning Capture
1. Schedule retrospective within 48 hours
2. Document patterns to avoid
3. Update decision criteria
4. Share learnings in Demo Friday

## Graceful Shutdown Checklist

### Customer Impact
- [ ] Identify affected customers
- [ ] Prepare communication
- [ ] Offer alternatives
- [ ] Process refunds if needed
- [ ] Update documentation

### Technical Cleanup
- [ ] Remove from load balancers
- [ ] Update DNS records
- [ ] Disable monitoring alerts
- [ ] Archive logs
- [ ] Clean up databases

### Financial Cleanup
- [ ] Cancel subscriptions
- [ ] Final vendor invoices
- [ ] Update budget tracking
- [ ] Calculate total cost
- [ ] Close cost centers

### Team Communication
```slack
@channel

**Project Termination: [Project Name]**

After [duration] in development, we're terminating [project] due to [reason].

**Key Learnings:**
• [Learning 1]
• [Learning 2]

**Salvaged Components:**
• [Component 1] - now available in shared library
• [Component 2] - pattern documented

**Resources Freed:**
• [Person] now available for [new project]
• $[amount]/month in services

This wasn't failure—it was learning. The kill switch worked as designed to free resources for higher-impact work.

Full postmortem: [link]
```

## Appeal Process

### When to Appeal
- New information materially changes the situation
- Triggering condition was measurement error
- Customer commits to usage/payment
- Strategic priority changes

### Appeal Requirements
1. Decision memo with three paths
2. Sponsor at VP level or higher
3. Concrete plan to avoid future triggers
4. Success metrics with timeline

### Appeal Review
- Portfolio Council special session
- Majority vote required
- One appeal per project maximum
- Decision final

## Metrics to Track

### Kill Metrics
- Time from trigger to termination
- Resources recovered (hours/dollars)
- Components salvaged
- Learnings documented

### Pattern Analysis
- Most common kill triggers
- Average stage at termination
- Correlation with initial scores
- False positive rate

## Common Scenarios

### Scenario 1: Technical Impossibility
**Trigger:** Core assumption proved false
**Response:** Immediate termination, extract learnings
**Salvage:** Document anti-patterns

### Scenario 2: Market Change
**Trigger:** Customer need disappeared
**Response:** Pivot exploration, then terminate
**Salvage:** Repurpose for adjacent need

### Scenario 3: Resource Constraint
**Trigger:** Key person left, no replacement
**Response:** Pause, attempt handoff, then terminate
**Salvage:** Documentation and partial implementation

### Scenario 4: Quality Failure
**Trigger:** Cannot meet performance requirements
**Response:** One spike to fix, then terminate
**Salvage:** Test suite and benchmarks

## Prevention Strategies

### Early Detection
- Weekly score review
- Automated health checks
- Regular customer validation
- Dependency monitoring

### Risk Mitigation
- Smaller initial scopes
- Proof of concept first
- Customer development parallel
- Regular pivot evaluation

---

*"Kill quickly, learn completely, move forward."*

**Remember:** Killing projects isn't failure—it's portfolio optimization. The faster we kill the wrong things, the more resources we have for the right things.