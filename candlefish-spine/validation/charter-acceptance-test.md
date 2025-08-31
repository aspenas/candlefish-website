# Charter Acceptance Test Plan
*Version: 1.0 | Generated: 2025-08-31*

## Purpose
Define observable signals that prove the Operating Charter is working as designed over 14/30/60 day periods.

## Success Criteria Overview

### 🎯 Target State (60 days)
- Stage gates fully adopted
- WIP limits self-enforcing
- Cadences have >90% participation
- Kill switches prevent waste
- Ship velocity increased 25%

## 14-Day Validation

### Observable Signals
```yaml
adoption_metrics:
  stage_gate_labeling:
    target: ">80% of issues labeled"
    measure: "GitHub issue count with gate labels"
    query: |
      SELECT COUNT(*) filter (WHERE labels @> '["spark","seed","scaffold","ship","scale"]')
      / COUNT(*) as label_rate
      FROM issues
      WHERE created_at > NOW() - INTERVAL '14 days'
  
  daily_standup_participation:
    target: ">70% team participating"
    measure: "Slack thread responses"
    query: "Count unique users in #unblock-and-commit"
  
  demo_friday_attendance:
    target: ">50% team attending"
    measure: "Meeting attendance + recording views"
    
  wip_violations:
    target: "<5 violations"
    measure: "Count of WIP limit breaches"
```

### Test Scenarios

#### Test 1: Gate Progression Flow
```gherkin
Given a new feature idea is submitted
When it enters the Spark gate
Then it appears in the Idea Ledger
And has scoring assigned within 48 hours
And progresses to Seed within 7 days or is killed
```

#### Test 2: Daily Cadence
```gherkin
Given it is 10:00 AM PST on a weekday
When the Unblock & Commit thread is posted
Then >70% of active contributors respond by 10:15
And blockers are tagged with owners
And yesterday's commitments are addressed
```

#### Test 3: WIP Limit Enforcement
```gherkin
Given a pod has 3 items in Scaffold
When someone tries to promote a 4th item
Then the GitHub Action blocks the promotion
And suggests items to complete first
And the item remains in Seed
```

### Pass/Fail Criteria (Day 14)

| Metric | Pass | Warning | Fail |
|--------|------|---------|------|
| Gate adoption | >80% | 60-80% | <60% |
| Daily participation | >70% | 50-70% | <50% |
| Demo submissions | >3/week | 2-3/week | <2/week |
| Blockers resolved | <24hrs | 24-48hrs | >48hrs |
| Kill switches triggered | >0 | 0 | N/A |

## 30-Day Validation

### Observable Signals
```yaml
velocity_metrics:
  cycle_time:
    target: "20% reduction"
    measure: "Spark to Ship duration"
    baseline: "Current average: 28 days"
    
  items_shipped:
    target: ">10 items"
    measure: "Count of Ship gate completions"
    
  quality_metrics:
    target: "100% pass Minimum Remarkable"
    measure: "Checklist completion rate"

process_health:
  portfolio_council_decisions:
    target: "2 strategic decisions made"
    measure: "Decision memos approved"
    
  idea_ledger_growth:
    target: ">30 new ideas"
    measure: "Idea Ledger entries"
    
  cross_pod_collaboration:
    target: ">5 instances"
    measure: "Cross-pod dependencies resolved"
```

### Test Scenarios

#### Test 4: End-to-End Feature Delivery
```gherkin
Given a feature starts in Spark on Day 1
When it progresses through all gates
Then it reaches Ship within 21 days
And meets all Minimum Remarkable criteria
And has zero rollbacks in production
```

#### Test 5: Portfolio Council Effectiveness
```gherkin
Given the monthly Portfolio Council meets
When a strategic decision is needed
Then 3 paths are presented
And one decision is made within the meeting
And action items are completed before next council
```

#### Test 6: Kill Switch Value
```gherkin
Given a project meets kill criteria
When the kill switch activates
Then resources are freed within 48 hours
And learnings are documented
And components are salvaged
And team moves to higher-priority work
```

### Pass/Fail Criteria (Day 30)

| Metric | Pass | Warning | Fail |
|--------|------|---------|------|
| Cycle time reduction | >20% | 10-20% | <10% |
| Items shipped | >10 | 5-10 | <5 |
| Remarkable compliance | 100% | 90-99% | <90% |
| Kill switch activations | 2-5 | 1 or >5 | 0 |
| Idea velocity | >1/day | 0.5-1/day | <0.5/day |

## 60-Day Validation

### Observable Signals
```yaml
business_impact:
  customer_satisfaction:
    target: ">4.5/5"
    measure: "NPS and feedback scores"
    
  revenue_impact:
    target: "Features driving >$50k MRR"
    measure: "Revenue attribution"
    
  team_health:
    target: "Engagement score >4/5"
    measure: "Pulse survey results"

system_maturity:
  self_organization:
    target: ">90% autonomous progression"
    measure: "Gates progressed without intervention"
    
  prediction_accuracy:
    target: ">80% delivery predictions met"
    measure: "Committed vs actual delivery dates"
    
  waste_reduction:
    target: ">30% reduction in abandoned work"
    measure: "Work started but not shipped"
```

### Test Scenarios

#### Test 7: System Self-Sufficiency
```gherkin
Given the Operating Charter has been active for 60 days
When measuring system autonomy
Then >90% of gate progressions happen automatically
And <10% require manual intervention
And teams self-organize around WIP limits
```

#### Test 8: Value Delivery
```gherkin
Given 60 days of operation
When measuring business impact
Then shipped features generate measurable value
And customer satisfaction increases
And team velocity is predictable
And strategic goals are advanced
```

### Pass/Fail Criteria (Day 60)

| Metric | Pass | Warning | Fail |
|--------|------|---------|------|
| System autonomy | >90% | 75-90% | <75% |
| Prediction accuracy | >80% | 60-80% | <60% |
| Team engagement | >4/5 | 3.5-4/5 | <3.5/5 |
| Revenue impact | >$50k | $25-50k | <$25k |
| Waste reduction | >30% | 15-30% | <15% |

## Monitoring Implementation

### Automated Checks
```yaml
daily:
  - participation_rate
  - blocker_age
  - wip_status
  
weekly:
  - gate_progression
  - demo_participation
  - idea_velocity
  
monthly:
  - cycle_time
  - ship_rate
  - quality_score
  - team_health
```

### Manual Reviews
```yaml
weekly:
  review_meeting: "Integrator Pod Sync"
  agenda:
    - Gate progression blockers
    - WIP limit adjustments
    - Cadence participation
    - System issues
  
monthly:
  review_meeting: "Portfolio Council"
  agenda:
    - Validation metrics
    - System adjustments
    - Success stories
    - Improvement areas
```

## Adjustment Triggers

### Minor Adjustments (Can be made immediately)
- Cadence timing changes
- Slack channel modifications
- Template updates
- Label additions

### Major Adjustments (Require Portfolio Council)
- WIP limit changes
- Gate criteria modifications
- New cadence additions
- Role changes

### Charter Amendments (Require team consensus)
- Fundamental process changes
- New stage gates
- Elimination of practices
- Cultural shifts

## Rollback Criteria

If after 30 days we observe:
- Team engagement <3/5
- Velocity decreased >20%
- >3 critical failures
- Majority team resistance

Then initiate rollback procedure:
1. Emergency Portfolio Council
2. Identify root causes
3. Propose modifications
4. Team vote on continuation

## Success Celebration

### 14-Day Milestone
- Team lunch if targets met
- Share early wins in all-hands

### 30-Day Milestone
- Demo Friday special edition
- Success stories blog post
- Team recognition

### 60-Day Milestone
- Quarterly celebration event
- Equity refresh consideration
- Case study publication
- System optimization sprint

---

*"Measure everything, adjust quickly, celebrate progress."*