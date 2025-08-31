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