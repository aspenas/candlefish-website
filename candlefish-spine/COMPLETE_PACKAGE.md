# 🚀 Candlefish Operating System v1.0

## 📋 Quick Navigation

This document contains the COMPLETE Operating System. Use the section links below to jump to specific parts:

### Core Documents
1. [Stakeholder Review Guide](#1-stakeholder-review-guide) - **START HERE** for Tyler, Aaron, James
2. [README Start Here](#2-readme-start-here) - 30-minute adoption guide
3. [Operating Charter](#3-operating-charter) - Full system specification
4. [Stage Gates Configuration](#4-stage-gates-configuration) - Automation rules
5. [Minimum Remarkable Checklist](#5-minimum-remarkable-checklist) - Quality standards

### Quick Links for Review
- **Tyler**: Focus on [Stage Gates](#4-stage-gates-configuration) and technical feasibility
- **Aaron**: Check [Minimum Remarkable](#5-minimum-remarkable-checklist) and product velocity 
- **James**: Review [Charter](#3-operating-charter) sections on ROI and scale

---


# 1. STAKEHOLDER REVIEW GUIDE

# Operating System Review Guide - Tyler, Aaron, James

## Quick Context (2 min read)

I've built an operating system to help us ship predictably without losing our creative edge. Think of it as "infrastructure for velocity" - not bureaucracy, but acceleration rails.

**Core insight:** We're great at 0→1 and polish. We need a system that handles the middle mile so we can focus on what we do best.

## Your Review Focus

### Tyler - Technical Feasibility & Developer Experience
**Time needed:** 20 minutes  
**Focus on:**
1. **GitHub Integration** (`.github/` folder)
   - Will these workflows actually help or create friction?
   - Are the templates practical for real development?
   - Check `stage-gates.yaml` - is this automatable?

2. **Technical Artifacts**
   - `pods/crown-trophy/engraving-flow.md` - Does the SQS/Temporal approach make sense?
   - `pods/ratio/ops-telemetry-mvp.yaml` - Realistic for brewing ops?
   - WIP limits in practice - will devs revolt?

3. **Developer Rhythm**
   - Daily Unblock & Commit - too much overhead?
   - Demo Friday format - sustainable?

**Key Question:** *"Would you actually want to work in this system?"*

### Aaron - Product Strategy & Customer Value
**Time needed:** 15 minutes  
**Focus on:**
1. **Stage Gates** (`Charter.md` sections 2-3)
   - Do these gates map to real product development?
   - Will this help or hinder product iteration speed?

2. **Minimum Remarkable** (`minimum-remarkable-checklist.md`)
   - Is this bar too high? Too low?
   - Does it capture what makes products worth shipping?

3. **Pod Artifacts**
   - `pods/paintbox/scope-map-v1.md` - Are these the right priorities?
   - `pods/promoteros/relationship-cadence.yaml` - Will this drive revenue?

**Key Question:** *"Will this help us ship better products faster?"*

### James - Business Impact & Scalability
**Time needed:** 15 minutes  
**Focus on:**
1. **ROI & Metrics** (`validation/charter-acceptance-test.md`)
   - Are the success metrics realistic?
   - 60-day targets achievable?
   - What's the real cost of implementation?

2. **Portfolio Management** (`Charter.md` + `decision-memos/`)
   - Portfolio Council structure - efficient use of time?
   - 3-paths decision framework - practical?
   - Kill switches - will we actually use them?

3. **Scale Implications**
   - Works at 10 people, but what about 50?
   - How does this affect hiring/onboarding?
   - Customer impact of this structure?

**Key Question:** *"Is the juice worth the squeeze?"*

## How to Review

### Option A: Speed Run (5 minutes)
1. Read `README_START_HERE.md` - the 30-minute adoption guide
2. Skim `Charter.md` - just the Executive Summary and Stage Gates
3. Check one pod artifact relevant to you

### Option B: Deep Dive (30 minutes)
1. Start with `DELIVERY_SUMMARY.md` for the full picture
2. Read `Charter.md` completely
3. Review `stage-gates.yaml` for automation details
4. Check `rollout/30-60-90-plan.md` for implementation reality
5. Look at your specific focus areas above

### Option C: Practical Test (15 minutes)
1. Pick one of your current projects
2. Try to map it to a stage gate
3. Run through the `minimum-remarkable-checklist.md`
4. Would the daily/weekly cadences help or hurt?

## Specific Feedback Needed

### Must Have Answers
1. **Deal Breakers:** What would make this system fail?
2. **Missing Pieces:** What critical element is absent?
3. **Oversights:** Where am I being naive?

### Nice to Have
1. **Improvements:** What would make this 10x better?
2. **Shortcuts:** What can we simplify without losing value?
3. **Quick Wins:** What should we implement first?

## Response Format

**Best:** 15-minute call to walk through your reactions
**Good:** Slack DM with bullet points
**Fine:** Comments in thread

## Implementation Options

### A. Full Send (Recommended if feedback positive)
- Monday: Announce to team
- Tuesday: Start daily standups
- Friday: First Demo Friday
- 30 days: Full system running

### B. Pilot Pod (Lower risk)
- Choose one pod (suggest Crown Trophy)
- Run for 30 days
- Measure everything
- Expand if successful

### C. Cherry Pick (Safest)
- Just implement Demo Friday first
- Add daily standups week 2
- Layer in gates gradually
- Full system over 60 days

## The Real Question

**"Does this system help us become the company we want to be?"**

Not perfect, not complete, but directionally correct and iteratively improvable.

---

*Review by: Friday EOD ideally*
*Decision: Monday Portfolio Council (or just us if you prefer)*

**Remember:** This is v1. We'll iterate based on what we learn. The goal is sustainable velocity, not perfection.

---

## Slack Message to Send

```
@tyler @aaron @james 

Built out our operating system draft - the infrastructure for shipping predictably without killing creativity.

**The gist:** Stage gates (Spark→Seed→Scaffold→Ship→Scale) + WIP limits + daily standups + Demo Fridays + kill switches for zombie projects.

**Quick review:** `/candlefish-spine/STAKEHOLDER_REVIEW_GUIDE.md` (this doc)
**Full explore:** `/candlefish-spine/README_START_HERE.md`
**Deep dive:** `/candlefish-spine/Charter.md`

**Need your take on:**
- Tyler: Will devs revolt? Is the GitHub automation realistic?
- Aaron: Does this help or hurt product velocity? 
- James: Worth the implementation cost? Scalable?

**Time needed:** 15-20 min to review, 15 min to discuss

Can we sync Friday afternoon? Or async feedback works too.

Not married to any of this - let's make it work for us.
```
---

# 2. README START HERE

# 🚀 Candlefish Operating System - Start Here

**Time to adopt: 30 minutes**  
**Time to mastery: 30 days**

## What This Is

The Candlefish Operating System codifies how we ship remarkable products predictably. It's not bureaucracy—it's acceleration infrastructure.

## Quick Start (10 minutes)

### 1. Understand the Core Loop (2 min)
```
Spark → Seed → Scaffold → Ship → Scale
  ↑                                ↓
  ←───── Kill Switch (if needed) ←─
```

Every piece of work flows through these gates. No exceptions.

### 2. Label Your Current Work (3 min)
Look at what you're working on right now. Which stage is it in?

- **Spark**: Just an idea, exploring feasibility
- **Seed**: Validating technical approach
- **Scaffold**: Building core functionality  
- **Ship**: Polishing for production
- **Scale**: Optimizing what's live

Add the appropriate label to your GitHub issues/PRs.

### 3. Join Tomorrow's Standup (2 min)
At 10:00 AM PST, post in #unblock-and-commit:

```
✅ Completed Yesterday: [What you finished]
🚧 Blocked On: [What's stopping you, tag owner]
📝 Committing Today: [What you'll complete]
```

### 4. Book Demo Friday Slot (2 min)
If you'll ship something this week, claim a Demo Friday slot in #demo-friday.
Remember: Live demos only, no slides.

### 5. Add One Idea (1 min)
Think of one improvement, feature, or fix. Add it to the Idea Ledger (link in #operations).

**Congrats! You're now operating in the system.** 🎉

## Full Adoption Checklist (20 minutes)

### Week 1: Get Into Rhythm
- [ ] Read the [Charter](./Charter.md) (10 min)
- [ ] Review [stage-gates.yaml](./stage-gates.yaml) for your current work
- [ ] Attend Demo Friday (Fridays 1pm PST)
- [ ] Post daily in Unblock & Commit
- [ ] Add 3+ ideas to Idea Ledger

### Week 2: Use the System
- [ ] Progress one item through a gate
- [ ] Review [Minimum Remarkable checklist](./minimum-remarkable-checklist.md)
- [ ] Present at Demo Friday
- [ ] Resolve someone else's blocker
- [ ] Use a [runbook](./runbooks/) for a task

### Week 3: Master the Flow
- [ ] Own an item from Spark to Ship
- [ ] Write a Decision Memo for a choice
- [ ] Help someone with gate progression
- [ ] Contribute to a pod outside yours
- [ ] Identify a process improvement

### Week 4: Full Proficiency
- [ ] Attend Portfolio Council (first Monday)
- [ ] Have zero WIP violations
- [ ] Ship something remarkable
- [ ] Mentor someone on the system
- [ ] Celebrate your first month! 🎊

## Key Resources

### Essential Documents
1. **[Charter.md](./Charter.md)** - The constitution
2. **[stage-gates.yaml](./stage-gates.yaml)** - Gate definitions
3. **[minimum-remarkable-checklist.md](./minimum-remarkable-checklist.md)** - Quality bar

### Daily Tools
- **GitHub Templates**: `.github/ISSUE_TEMPLATE/`
- **Slack Kits**: `ops/kits/slack/`
- **Runbooks**: `runbooks/`

### Cadence Docs
- **[Daily Unblock](./cadence/daily_unblock_commit.md)** - Every weekday 10am
- **[Demo Friday](./cadence/weekly_demo_friday.md)** - Fridays 1pm
- **[Portfolio Council](./cadence/monthly_portfolio_council.md)** - First Monday 11am

### Calendar Files
Import these to your calendar:
- `cadence/daily-unblock-commit.ics`
- `cadence/weekly-demo-friday.ics`
- `cadence/monthly-portfolio-council.ics`

## Your Pod's Specific Resources

### Crown Trophy
- [Inventory Schema](./pods/crown-trophy/inventory-schema-v1.yaml)
- [Engraving Flow](./pods/crown-trophy/engraving-flow.md)

### Paintbox
- [Scope Map](./pods/paintbox/scope-map-v1.md)
- Top priority: Quick Quote to Contract story

### PromoterOS
- [Relationship Cadence](./pods/promoteros/relationship-cadence.yaml)
- CRM fields ready for implementation

### Ratio
- [Ops Telemetry MVP](./pods/ratio/ops-telemetry-mvp.yaml)
- Phase 1: Temperature sensors this week

## FAQ

### "This feels like too much process"
It's actually less process—it's just visible now. You're already doing these things; we're making them systematic so you don't have to think about them.

### "What if I don't know what gate something is in?"
Ask in #operations or DM @integrator-pod. When in doubt, start with Spark.

### "Do I have to do the daily standup?"
Yes, but it takes 2 minutes. The ROI is huge—blockers get resolved faster.

### "What if I can't demo on Friday?"
That's fine! Demo when you have something to show. But aim for at least once a month.

### "Can I skip gates?"
No. Gates ensure quality and prevent waste. But gates can progress quickly if criteria are met.

### "Who decides gate progression?"
- Spark → Seed: You + Pod Lead
- Seed → Scaffold: Integrator Pod
- Scaffold → Ship: Pod Lead + Integrator Pod
- Ship → Scale: Portfolio Council

### "What if something gets killed?"
That's success, not failure. We learned something and freed resources for better work.

## Get Help

### Immediate Help
- **Slack**: #operations (monitored continuously)
- **DM**: @integrator-pod
- **Emergency**: @patrick

### Learning Resources
- Weekly office hours: Tuesdays 3pm
- Recorded trainings: [Drive folder]
- Peer mentoring: Ask in #operations

### Feedback Welcome
This system will evolve. Share what's working and what's not:
- Weekly retro thread in #operations
- Anonymous feedback: [Form link]
- Direct to Patrick: Always open

## Success Metrics

You'll know you've mastered the system when:
- Your work flows predictably through gates
- You're never blocked for >24 hours
- You ship something every 2-3 weeks
- Your demos get "oohs" and "ahhs"
- You help others navigate the system

## First Day Action Items

**Right now (5 min):**
1. Label your current work with a stage gate
2. Join #unblock-and-commit and #demo-friday
3. Add tomorrow's standup to your calendar

**Tomorrow (10 min):**
1. Post your standup update at 10am
2. Read one runbook relevant to your work
3. Add an idea to the Idea Ledger

**This week (30 min):**
1. Progress one item through a gate
2. Attend Demo Friday (or watch recording)
3. Help resolve someone's blocker

## Why This Matters

We're building a company that ships remarkable products predictably. This system is how we:
- Maintain creative edge while scaling
- Prevent burnout through sustainable pace
- Ensure everything we ship is remarkable
- Build a company worth being part of

You're not just following a process—you're building an institution.

---

## Quick Reference Card

```yaml
Daily Rhythm:
  10:00 AM: Post standup update
  10:15 AM: Check for blockers to help
  Ongoing:  Progress work through gates

Weekly Rhythm:
  Monday:    Review your gate status
  Tuesday:   Office hours if needed
  Wednesday: Update Idea Ledger
  Thursday:  Prep for Demo Friday
  Friday:    Demo or attend demos

Monthly Rhythm:
  Week 1: Portfolio Council (first Monday)
  Week 2: Focus on shipping
  Week 3: Gather ideas for next cycle
  Week 4: Reflection and improvement

Remember:
  - Remarkable is the minimum
  - Ship small, ship often
  - Kill quickly, learn completely
  - Help others unblock
  - Celebrate every ship
```

---

**Welcome to the Candlefish Operating System.**  
Let's ship remarkable things. 🚀

*Questions? Start in #operations or DM @integrator-pod*

---
*Version 1.0 | Generated: 2025-08-31*  
*"Ship remarkable products predictably without sacrificing creative edge."*
---

# 3. OPERATING CHARTER

# Candlefish Operating Charter
*Version 1.0 | Generated: 2025-08-31*

## Executive Summary

Candlefish operates as a dual-engine organization: Patrick drives Spark & Elevation while our System delivers Integration & Finish. This charter codifies how we ship remarkable products predictably without sacrificing creative edge.

## Operating Archetype

### Dual-Engine Model
- **Engine 1: Spark & Elevation** (Patrick)
  - 0→1 creation
  - Polish passes
  - Strategic vision
  - Quality elevation

- **Engine 2: Integration & Finish** (System)
  - Middle-mile execution
  - Cross-pod coordination
  - Delivery cadence
  - Operational excellence

## Stage-Gate Framework

### Gate Progression
**Spark → Seed → Scaffold → Ship → Scale**

Each gate enforces explicit criteria before promotion. No skipping gates. Kill-switches activate automatically on criteria breach.

### Gate Definitions

#### Spark Gate
- **Purpose**: Capture and qualify ideas
- **Entry**: Problem statement + hypothesis
- **Exit**: Strategic fit score ≥3/5, Impact ≥3/5
- **Artifacts**: Idea Ledger entry, initial POV
- **Review**: Weekly during Unblock & Commit
- **Auto-kill**: No progress for 30 days

#### Seed Gate
- **Purpose**: Validate feasibility
- **Entry**: Approved Spark
- **Exit**: Technical spike complete, dependency map
- **Artifacts**: Decision Memo, risk assessment
- **Review**: Integrator Pod sign-off
- **Auto-kill**: Blocking dependencies unresolved for 14 days

#### Scaffold Gate
- **Purpose**: Build foundation
- **Entry**: Approved Seed with owner assigned
- **Exit**: Core functionality working, test coverage >60%
- **Artifacts**: API contracts, acceptance tests, demo recording
- **Review**: Demo Friday presentation
- **Auto-kill**: Failed acceptance tests for 7 days

#### Ship Gate
- **Purpose**: Polish and release
- **Entry**: Scaffold complete, Minimum Remarkable checklist started
- **Exit**: All checklist items green, production deployed
- **Artifacts**: Release notes, support runbook, metrics dashboard
- **Review**: Portfolio Council approval
- **Auto-kill**: Customer-impacting bugs unresolved for 48 hours

#### Scale Gate
- **Purpose**: Optimize and expand
- **Entry**: Shipped with 30-day stability
- **Exit**: Performance targets met, operational handoff complete
- **Artifacts**: Optimization report, scaling plan
- **Review**: Quarterly business review
- **Auto-kill**: SLA violations for 3 consecutive days

## WIP Limits

### System Constraints
- **Per Pod**: Maximum 3 items in Scaffold stage
- **Per Person**: Maximum 2 items owned across all stages
- **Cross-Pod**: Maximum 5 active Seed explorations
- **Portfolio**: Maximum 10 total items in flight

### Enforcement
- GitHub Actions block new work when limits exceeded
- Weekly review identifies constraint violations
- Automatic prioritization forcing function on breach

## Kill-Switch Protocol

### Automatic Triggers
1. **Time-based**: Stage timeout exceeded
2. **Quality-based**: Minimum Remarkable violations
3. **Resource-based**: 2x effort overrun
4. **Strategic-based**: Fit score drops below 2/5

### Graceful Shutdown
1. Document learnings in Decision Memo
2. Archive code to `/experiments`
3. Extract reusable components
4. Update Idea Ledger with post-mortem

## Operating Cadences

### Daily: Unblock & Commit (15 min)
- **Time**: 10:00 PST
- **Format**: Async Slack thread
- **Template**: Completed / Blocked / Committing
- **Escalation**: Blocks >24hrs → Integrator Pod

### Weekly: Demo Friday (60 min)
- **Time**: Fridays 13:00 PST
- **Format**: Live demos only (no slides)
- **Recognition**: Ship of the Week award
- **Recording**: Posted to #demo-friday

### Monthly: Portfolio Council (60 min)
- **Time**: First Monday 11:00 PST
- **Format**: 3-paths decision framework
- **Output**: One strategic decision
- **Attendees**: Patrick + Pod Leads

## Roles & Responsibilities

### Integrator Pod
- Cross-pod dependency management
- Gate promotion reviews
- Blocker resolution
- Cadence facilitation

### Pod Leads
- Stage-gate compliance
- WIP limit enforcement
- Demo preparation
- Team health monitoring

### Individual Contributors
- Idea Ledger contributions
- Daily commits
- Acceptance test authoring
- Documentation maintenance

## Minimum Remarkable Standard

### Definition
Every shipped feature must be:
1. **Story Clear**: User can explain value in one sentence
2. **Performance Floor**: <100ms interaction, <3s load
3. **Accessibility**: WCAG 2.1 AA compliant
4. **Observable**: Metrics dashboard exists
5. **Supported**: Runbook and error states documented
6. **Delightful**: One moment of unexpected polish

### Verification
- Checklist reviewed at Scaffold→Ship promotion
- Any red item blocks Ship gate
- Patrick reserves elevation veto

## Decision Memo Protocol

### When Required
- Resource allocation >$10k or >2 weeks
- Architectural decisions
- Strategic pivots
- Partnership agreements

### Structure
1. Context (3 sentences max)
2. Three paths with tradeoffs
3. Recommendation with rationale
4. Reversible vs irreversible assessment
5. Success metrics

### Storage
- Markdown in `/decision-memos`
- Linked from relevant GitHub issues
- Reviewed in Portfolio Council

## Idea Ledger Management

### Capture Rules
- Anyone can add ideas
- No idea too small or large
- Anonymous submissions allowed
- Quarterly pruning of stale items

### Scoring Formula
```
Score = (Impact × Strategic Fit) / Effort
```

### Review Cadence
- Weekly: New submissions triaged
- Monthly: Top 10 reviewed for promotion
- Quarterly: Full ledger cleanup

## Recognition Culture

### Mechanisms
- Demo Friday: Ship of the Week
- Monthly: Integrator Award
- Quarterly: Innovation Prize
- Annual: Founder's Excellence

### Rewards
- Public recognition
- Repository contributor credits
- Conference/training budget
- Equity acceleration consideration

## Conflict Resolution

### Escalation Path
1. Direct conversation
2. Pod Lead mediation
3. Integrator Pod review
4. Patrick decision
5. External advisor consultation

### Decision Rights
- Technical: Pod Lead decides
- Resource: Integrator Pod decides
- Strategic: Patrick decides
- Cultural: Team consensus required

## Amendment Process

This charter may be amended through:
1. Proposal in Decision Memo format
2. Two-week comment period
3. Portfolio Council approval
4. 30-day implementation grace period

## Appendices

### A. Gate Artifact Templates
See `.github/ISSUE_TEMPLATE/` in spine repo

### B. Scoring Rubrics
See `minimum-remarkable-checklist.md`

### C. Tool Configuration
See `stage-gates.yaml` for automation rules

### D. Historical Decisions
See `/decision-memos` archive

---

*"Ship remarkable products predictably without sacrificing creative edge."*

**Candlefish.ai** | Quiet authority in software craft
---

# 4. STAGE GATES CONFIGURATION

```yaml
# Candlefish Stage-Gate Configuration
# Version: 1.0 | Generated: 2025-08-31
# This file drives automation in GitHub Actions and defines progression criteria

gates:
  spark:
    name: "Spark"
    description: "Idea capture and qualification"
    entry_criteria:
      - problem_statement_exists: true
      - hypothesis_defined: true
      - idea_ledger_entry: true
    
    required_artifacts:
      - type: "idea_ledger_entry"
        location: "Notion:Idea-Ledger"
        fields:
          - problem_statement
          - hypothesis
          - impact_score
          - effort_score
          - strategic_fit_score
      
      - type: "initial_pov"
        location: "issue_description"
        min_length: 200
    
    exit_criteria:
      - strategic_fit_score: ">=3"
      - impact_score: ">=3"
      - feasibility_check: "completed"
    
    reviewers:
      - role: "pod_lead"
        required: false
      - role: "integrator_pod"
        required: true
    
    promotion_test:
      script: ".github/scripts/validate-spark.sh"
      timeout: 300
    
    auto_kill_triggers:
      - condition: "days_since_update > 30"
        action: "archive"
        notification: "owner,pod_lead"
      
      - condition: "strategic_fit_score < 2"
        action: "reject"
        notification: "owner"
    
    sla: "7 days"

  seed:
    name: "Seed"
    description: "Feasibility validation and planning"
    entry_criteria:
      - spark_gate_passed: true
      - owner_assigned: true
      - pod_identified: true
    
    required_artifacts:
      - type: "technical_spike"
        location: "repo:spikes/"
        validation:
          - code_compiles: true
          - readme_exists: true
      
      - type: "dependency_map"
        location: "repo:docs/dependencies/"
        format: "mermaid|graphviz|yaml"
      
      - type: "decision_memo"
        location: "repo:decision-memos/"
        template: "decision-memo.md"
        required_sections:
          - context
          - three_paths
          - recommendation
          - reversibility
          - success_metrics
    
    exit_criteria:
      - technical_feasibility: "proven"
      - dependencies_identified: true
      - risk_assessment: "completed"
      - effort_estimate: "documented"
    
    reviewers:
      - role: "integrator_pod"
        required: true
      - role: "technical_lead"
        required: true
      - role: "patrick"
        required: "if effort > 2 weeks"
    
    promotion_test:
      script: ".github/scripts/validate-seed.sh"
      timeout: 600
    
    auto_kill_triggers:
      - condition: "blocking_dependencies_unresolved > 14 days"
        action: "escalate"
        notification: "integrator_pod,patrick"
      
      - condition: "effort_estimate > 3x original"
        action: "review"
        notification: "portfolio_council"
    
    sla: "14 days"

  scaffold:
    name: "Scaffold"
    description: "Build core functionality"
    entry_criteria:
      - seed_gate_passed: true
      - acceptance_criteria_defined: true
      - api_contracts_drafted: true
    
    required_artifacts:
      - type: "core_implementation"
        location: "repo:src/"
        validation:
          - builds: true
          - lints_pass: true
          - no_security_warnings: true
      
      - type: "test_suite"
        location: "repo:tests/"
        validation:
          - coverage: ">60%"
          - all_pass: true
          - integration_tests_exist: true
      
      - type: "api_documentation"
        location: "repo:docs/api/"
        format: "openapi|graphql|proto"
      
      - type: "demo_recording"
        location: "artifacts:demos/"
        max_duration: "5 minutes"
        required_elements:
          - user_flow
          - error_handling
          - performance_metrics
    
    exit_criteria:
      - core_features_complete: true
      - test_coverage: ">60%"
      - demo_approved: true
      - acceptance_tests_passing: true
    
    reviewers:
      - role: "pod_lead"
        required: true
      - role: "qa_engineer"
        required: "if exists"
      - role: "design_lead"
        required: "if ui_changes"
    
    promotion_test:
      script: ".github/scripts/validate-scaffold.sh"
      timeout: 1200
      stages:
        - lint
        - test
        - build
        - acceptance
    
    auto_kill_triggers:
      - condition: "acceptance_tests_failing > 7 days"
        action: "block"
        notification: "owner,pod_lead,integrator_pod"
      
      - condition: "wip_limit_exceeded"
        action: "queue"
        notification: "owner"
    
    sla: "21 days"

  ship:
    name: "Ship"
    description: "Polish and production release"
    entry_criteria:
      - scaffold_gate_passed: true
      - minimum_remarkable_checklist: "started"
      - deployment_plan_exists: true
    
    required_artifacts:
      - type: "production_code"
        location: "repo:src/"
        validation:
          - security_scan_passed: true
          - performance_benchmarks_met: true
          - accessibility_audit_passed: true
      
      - type: "minimum_remarkable_checklist"
        location: "repo:ship-checklist.md"
        all_items_green: true
      
      - type: "release_notes"
        location: "repo:CHANGELOG.md"
        required_sections:
          - features
          - fixes
          - breaking_changes
          - migration_guide
      
      - type: "support_runbook"
        location: "repo:runbooks/"
        required_sections:
          - common_issues
          - escalation_path
          - rollback_procedure
          - monitoring_queries
      
      - type: "metrics_dashboard"
        location: "links:grafana|datadog|cloudwatch"
        required_panels:
          - availability
          - latency
          - error_rate
          - business_metrics
    
    exit_criteria:
      - production_deployed: true
      - monitoring_active: true
      - documentation_complete: true
      - team_trained: true
    
    reviewers:
      - role: "integrator_pod"
        required: true
      - role: "portfolio_council"
        required: true
      - role: "patrick"
        required: "for elevation_review"
    
    promotion_test:
      script: ".github/scripts/validate-ship.sh"
      timeout: 1800
      environments:
        - staging
        - production
    
    auto_kill_triggers:
      - condition: "customer_impacting_bugs > 48 hours"
        action: "rollback"
        notification: "all_stakeholders"
      
      - condition: "minimum_remarkable_violations > 0"
        action: "block"
        notification: "patrick"
    
    sla: "7 days"

  scale:
    name: "Scale"
    description: "Optimize and expand"
    entry_criteria:
      - ship_gate_passed: true
      - stability_period: "30 days"
      - usage_metrics_baseline: true
    
    required_artifacts:
      - type: "optimization_report"
        location: "repo:reports/scale/"
        metrics:
          - performance_improvements
          - cost_reductions
          - capacity_increases
      
      - type: "scaling_plan"
        location: "repo:docs/scaling/"
        required_sections:
          - current_limits
          - target_capacity
          - migration_strategy
          - cost_projection
      
      - type: "operational_handoff"
        location: "repo:ops/"
        checklists:
          - monitoring_setup
          - alerting_rules
          - backup_procedures
          - disaster_recovery
    
    exit_criteria:
      - performance_targets_met: true
      - operational_maturity: "L2"
      - documentation_complete: true
      - team_onboarded: true
    
    reviewers:
      - role: "operations_lead"
        required: true
      - role: "portfolio_council"
        required: "quarterly"
    
    promotion_test:
      script: ".github/scripts/validate-scale.sh"
      timeout: 3600
      load_test: true
    
    auto_kill_triggers:
      - condition: "sla_violations > 3 consecutive days"
        action: "incident"
        notification: "on_call,patrick"
      
      - condition: "cost_overrun > 50%"
        action: "review"
        notification: "portfolio_council"
    
    sla: "ongoing"

# Global Configuration
configuration:
  wip_limits:
    per_pod:
      scaffold: 3
      total: 5
    per_person:
      owned: 2
      involved: 4
    cross_pod:
      seed: 5
    portfolio:
      total_active: 10
  
  notification_channels:
    slack:
      default: "#engineering"
      escalation: "#incidents"
      demos: "#demo-friday"
      blockers: "#unblock-and-commit"
    
    email:
      pod_leads: "pod-leads@candlefish.ai"
      integrator_pod: "integrators@candlefish.ai"
      portfolio_council: "council@candlefish.ai"
  
  automation:
    github_actions:
      - ".github/workflows/stage-gates.yml"
      - ".github/workflows/wip-enforcer.yml"
      - ".github/workflows/auto-kill.yml"
    
    webhooks:
      gate_promotion: "https://api.candlefish.ai/gates/promote"
      gate_rejection: "https://api.candlefish.ai/gates/reject"
      metrics_update: "https://api.candlefish.ai/metrics/update"
  
  reporting:
    dashboards:
      portfolio: "https://metrics.candlefish.ai/portfolio"
      velocity: "https://metrics.candlefish.ai/velocity"
      quality: "https://metrics.candlefish.ai/quality"
    
    exports:
      weekly_summary: "s3://candlefish-reports/weekly/"
      monthly_review: "s3://candlefish-reports/monthly/"

# Metadata
metadata:
  version: "1.0.0"
  last_updated: "2025-08-31"
  owner: "integrator-pod"
  review_cycle: "quarterly"
  schema_version: "2024.1"```

---

# 5. MINIMUM REMARKABLE CHECKLIST

# Minimum Remarkable Checklist
*Version: 1.0 | Generated: 2025-08-31*

## Definition
Every feature shipped at Candlefish must clear this bar. No exceptions.

## Checklist

### ✨ Story Clarity
- [ ] **Value Statement**: User can explain the value in one sentence
- [ ] **Problem Solved**: Clear connection between feature and user pain
- [ ] **Success Metric**: One measurable outcome defined

**Pass Criteria**: All three checked
**Verification**: Ask a non-technical team member to explain the feature

---

### ⚡ Performance Floor
- [ ] **Interaction Speed**: All interactions <100ms
- [ ] **Page Load**: Initial load <3 seconds
- [ ] **API Response**: 95th percentile <500ms
- [ ] **Asset Size**: Bundle <500KB gzipped

**Pass Criteria**: All metrics met in production environment
**Verification**: Performance dashboard shows green for 24 hours

---

### ♿ Accessibility
- [ ] **Keyboard Navigation**: All features keyboard accessible
- [ ] **Screen Reader**: Tested with NVDA/JAWS
- [ ] **Color Contrast**: WCAG 2.1 AA compliant
- [ ] **Focus Indicators**: Visible focus states
- [ ] **Error Messages**: Clear, actionable error text

**Pass Criteria**: Zero critical a11y violations
**Verification**: Automated scan + manual keyboard test

---

### 📊 Observability
- [ ] **Metrics Dashboard**: Key metrics visualized
- [ ] **Error Tracking**: Sentry/Rollbar configured
- [ ] **User Analytics**: Events tracked
- [ ] **Performance Monitoring**: Core Web Vitals tracked
- [ ] **Alerting**: Critical path alerts configured

**Pass Criteria**: Dashboard live, alerts tested
**Verification**: Trigger test alert, confirm receipt

---

### 📚 Support Path
- [ ] **Runbook**: Common issues documented
- [ ] **Error States**: All errors have recovery paths
- [ ] **Help Text**: Contextual help available
- [ ] **Support Ticket**: Template created
- [ ] **Rollback Plan**: One-click rollback ready

**Pass Criteria**: Support team trained
**Verification**: Support team can resolve test issue

---

### 🎯 Delightful Moment
- [ ] **Micro-interaction**: One surprising animation/transition
- [ ] **Copy Voice**: One moment of brand personality
- [ ] **Performance Surprise**: Something faster than expected
- [ ] **Smart Default**: One intelligent assumption
- [ ] **Recovery Grace**: Elegant handling of one edge case

**Pass Criteria**: Team identifies the moment
**Verification**: Demo produces "ooh" reaction

---

## Scoring Rubric

### 🟢 Green (Ship It)
- All sections have all checkboxes marked
- Verification passed for each section
- Patrick elevation review (if requested) passed

### 🟡 Yellow (Close)
- Maximum 2 unchecked boxes total
- No more than 1 unchecked per section
- Plan to address within 48 hours

### 🔴 Red (Block)
- 3+ unchecked boxes
- Any section completely unchecked
- Performance or accessibility failures

---

## Quick Assessment (5 minutes)

### Rapid Fire Questions
1. Can you demo it in 30 seconds? **Y/N**
2. Would you show this to a customer? **Y/N**
3. Does it feel "Candlefish"? **Y/N**
4. Is it better than what exists? **Y/N**
5. Will it work on mobile? **Y/N**

**Pass**: 5/5 Yes answers

---

## Elevation Triggers

Patrick review required if:
- First feature in a new pod
- Customer-facing UI changes
- New technology/framework adoption
- Significant brand touchpoint
- Team requests elevation

---

## Enforcement

### Automated
```yaml
- GitHub Action blocks merge if checklist.md not all green
- Performance tests run on every PR
- A11y scan on every build
- Bundle size check on every commit
```

### Manual
- Demo Friday presentation required
- Pod Lead sign-off required
- Integrator Pod spot-checks weekly

---

## Exceptions

No exceptions. If something seems exceptional:
1. Create Decision Memo
2. Present to Portfolio Council
3. Update this checklist if approved

---

## References
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Candlefish Brand Guide](./brand-tokens.md)

---

*"Remarkable is the minimum. Excellence is the expectation."*