# Handoff Runbook
*Version: 1.0 | Generated: 2025-08-31*

## Purpose
Ensure smooth transition of projects between stages, teams, or individuals with zero knowledge loss and maintained momentum.

## Handoff Types

### 1. Stage Gate Handoffs
**Spark → Seed**: Idea to Exploration
**Seed → Scaffold**: Exploration to Building
**Scaffold → Ship**: Building to Polishing
**Ship → Scale**: Launch to Operations

### 2. Team Handoffs
- Individual to individual (ownership change)
- Pod to pod (scope change)
- Development to operations (production handoff)
- Internal to external (contractor/vendor)

### 3. Crisis Handoffs
- Emergency coverage (illness/emergency)
- Termination handoff (employee departure)
- Escalation handoff (blocked → leadership)

## Handoff Package Requirements

### Essential Components
```markdown
# [Project Name] Handoff Package
**Date:** [Date]
**From:** @current-owner
**To:** @new-owner
**Stage:** [Current gate]

## 1. Project Overview
**Problem:** [1-2 sentences]
**Solution:** [1-2 sentences]
**Current Status:** [Where we are]
**Next Milestone:** [What's next]

## 2. Technical Context
**Architecture:** [Link to diagram]
**Tech Stack:** [List key technologies]
**Codebase:** [Repository links]
**Documentation:** [Wiki/docs links]

## 3. Progress Summary
**Completed:**
- ✅ [Achievement 1]
- ✅ [Achievement 2]

**In Progress:**
- 🔄 [Task 1] - 70% complete
- 🔄 [Task 2] - 30% complete

**Not Started:**
- ⭕ [Future task 1]
- ⭕ [Future task 2]

## 4. Critical Information
**Known Issues:**
- [Issue 1] - [Impact and workaround]
- [Issue 2] - [Impact and workaround]

**Technical Debt:**
- [Debt item 1] - [Priority and impact]
- [Debt item 2] - [Priority and impact]

**Dependencies:**
- [Service/Team 1] - [What and why]
- [Service/Team 2] - [What and why]

## 5. Contacts
**Stakeholders:**
- Business: @person (role)
- Technical: @person (role)
- Customer: @person (role)

**Subject Matter Experts:**
- [Domain]: @person
- [Technology]: @person

## 6. Access Requirements
**Accounts Needed:**
- [ ] GitHub repository access
- [ ] AWS console access
- [ ] Database credentials
- [ ] Monitoring dashboards
- [ ] Third-party services

## 7. Quick Start
**Local Development:**
```bash
git clone [repo]
cd [project]
npm install  # or equivalent
npm run dev
```

**Key Commands:**
```bash
make test     # Run tests
make deploy   # Deploy to staging
make monitor  # View metrics
```

## 8. Acceptance Criteria
**You'll know handoff is complete when:**
- [ ] Can run project locally
- [ ] Understand next 3 tasks
- [ ] Have all access needed
- [ ] Questions answered
- [ ] First commit made
```

## Stage-Specific Handoffs

### Spark → Seed Handoff
```yaml
required_artifacts:
  - idea_ledger_entry: Link to Notion entry
  - initial_research: Market/competitor analysis
  - hypothesis: Clear problem/solution fit
  - success_metrics: How we'll measure success
  
validation_questions:
  - Why should we build this?
  - Who is the customer?
  - What's the MVP scope?
  - What could kill this idea?
  
new_owner_tasks:
  - Technical feasibility spike
  - Dependency mapping
  - Risk assessment
  - Decision memo draft
```

### Seed → Scaffold Handoff
```yaml
required_artifacts:
  - technical_spike: Working proof of concept
  - dependency_map: All external dependencies
  - decision_memo: Approved path forward
  - architecture_diagram: System design
  
validation_questions:
  - Is this technically feasible?
  - What are the main risks?
  - Do we have all dependencies?
  - Is the timeline realistic?
  
new_owner_tasks:
  - Set up development environment
  - Create project structure
  - Implement core features
  - Write initial tests
```

### Scaffold → Ship Handoff
```yaml
required_artifacts:
  - working_code: Core features complete
  - test_suite: >60% coverage
  - api_documentation: Complete specs
  - demo_recording: Showing functionality
  
validation_questions:
  - Does it solve the problem?
  - Is it stable enough?
  - Are edge cases handled?
  - Is it deployable?
  
new_owner_tasks:
  - Polish UI/UX
  - Performance optimization
  - Security review
  - Production deployment prep
```

### Ship → Scale Handoff
```yaml
required_artifacts:
  - production_code: Deployed and stable
  - runbook: Operational procedures
  - monitoring: Dashboards configured
  - documentation: User and technical docs
  
validation_questions:
  - Is it meeting SLAs?
  - Can it handle growth?
  - Is it cost-effective?
  - Is support ready?
  
new_owner_tasks:
  - Performance optimization
  - Cost optimization
  - Feature expansion
  - Automation implementation
```

## Handoff Ceremony

### Schedule (30 minutes)
```
:00-:05  Context setting
:05-:15  Demo/walkthrough
:15-:20  Q&A
:20-:25  Access verification
:25-:30  First task assignment
```

### Checklist
**Before Meeting:**
- [ ] Handoff package sent 24hrs prior
- [ ] Access requests submitted
- [ ] Calendar holds for follow-ups
- [ ] Demo environment ready

**During Meeting:**
- [ ] Screen share walkthrough
- [ ] Live environment tour
- [ ] Run test together
- [ ] Verify access works
- [ ] Agree on first task

**After Meeting:**
- [ ] Slack introduction
- [ ] GitHub ownership transfer
- [ ] Update project boards
- [ ] Schedule follow-up
- [ ] Monitor first 48hrs

## Emergency Handoff Protocol

### Immediate Actions (< 2 hours)
1. **Identify Coverage**
   - Check CODEOWNERS file
   - Ping pod lead
   - Escalate to integrator pod

2. **Minimal Handoff**
   ```slack
   🚨 Emergency Handoff Required
   
   Project: [Name]
   Previous Owner: @person (unavailable)
   New Owner: @person
   
   Critical Info:
   • Repo: [link]
   • Current PR: [link]
   • Blocking: [what's blocked]
   • Deadline: [when]
   
   Full handoff to follow.
   ```

3. **Grant Access**
   ```bash
   # Add to GitHub team
   gh api -X PUT /orgs/candlefish/teams/[team]/memberships/[username]
   
   # Share credentials
   aws secretsmanager get-secret-value --secret-id [project]-secrets
   ```

### Recovery Actions (< 24 hours)
1. Reverse-engineer from code
2. Check commit history for context
3. Review recent Slack threads
4. Interview recent collaborators
5. Document findings

## Quality Gates

### Handoff Acceptance Criteria
**New Owner Must:**
- [ ] Successfully run project locally
- [ ] Make one meaningful commit
- [ ] Understand next 3 priorities
- [ ] Have all required access
- [ ] Know who to ask for help

**Previous Owner Must:**
- [ ] Provide complete handoff package
- [ ] Be available for questions (1 week)
- [ ] Review first PR from new owner
- [ ] Update all documentation
- [ ] Transfer all credentials

### Handoff Metrics
- Time to first commit by new owner
- Questions asked post-handoff
- Velocity maintained?
- Bugs introduced?
- Rollback needed?

## Tools and Templates

### Handoff Generator Script
```python
#!/usr/bin/env python3
# generate-handoff.py

import json
from datetime import datetime

def generate_handoff(project_name, from_owner, to_owner, stage):
    template = f"""
# {project_name} Handoff Package
**Generated:** {datetime.now().isoformat()}
**From:** @{from_owner}
**To:** @{to_owner}
**Stage:** {stage}

## Auto-Generated Checklist
- [ ] Repository access granted
- [ ] Credentials shared
- [ ] Documentation updated
- [ ] First task assigned
- [ ] Follow-up scheduled
    """
    
    with open(f"handoff-{project_name}-{datetime.now():%Y%m%d}.md", "w") as f:
        f.write(template)
    
    print(f"Handoff package generated: handoff-{project_name}.md")

if __name__ == "__main__":
    # Usage: python generate-handoff.py "Project" "alice" "bob" "Scaffold"
    import sys
    generate_handoff(*sys.argv[1:])
```

### Access Verification Script
```bash
#!/bin/bash
# verify-access.sh

echo "Verifying access for handoff..."

# Check GitHub
echo -n "GitHub: "
gh auth status &>/dev/null && echo "✅" || echo "❌"

# Check AWS
echo -n "AWS: "
aws sts get-caller-identity &>/dev/null && echo "✅" || echo "❌"

# Check database
echo -n "Database: "
psql -c "SELECT 1" &>/dev/null && echo "✅" || echo "❌"

# Check monitoring
echo -n "Monitoring: "
curl -s https://monitoring.candlefish.ai/health &>/dev/null && echo "✅" || echo "❌"

echo "Access verification complete"
```

## Common Handoff Failures

### Problem: Incomplete Context
**Symptoms:** New owner asks basic questions repeatedly
**Prevention:** Use handoff template, require acceptance signoff
**Recovery:** Schedule knowledge transfer session

### Problem: Missing Access
**Symptoms:** New owner blocked on day 1
**Prevention:** Access checklist in template
**Recovery:** Emergency access grant process

### Problem: Unclear Priorities
**Symptoms:** New owner works on wrong things
**Prevention:** Explicit "next 3 tasks" in handoff
**Recovery:** Daily standup for first week

### Problem: Hidden Dependencies
**Symptoms:** Unexpected breakage after handoff
**Prevention:** Dependency mapping required
**Recovery:** Previous owner on-call for 1 week

## Handoff Communication

### Announcement Template
```slack
📋 **Handoff Complete: [Project Name]**

**Previous Owner:** @old-owner → **New Owner:** @new-owner

**Current Stage:** [Gate]
**Next Milestone:** [What]
**Target Date:** [When]

@new-owner is now driving this forward. Please direct all questions to them.

@old-owner remains available for questions through [date].

Handoff package: [link]
```

### Status Update Template
```slack
✅ **Handoff Status: [Project Name]**

**Day 3 Check-in**
• Local env: ✅ Running
• First PR: ✅ Merged
• Blockers: None
• Questions: Answered

Velocity on track. Full ownership transferred.
```

---

*"Clear handoffs prevent dropped balls."*

**Golden Rule:** The handoff isn't complete until the new owner successfully ships their first change.