# Daily Unblock & Commit
*Version: 1.0 | Generated: 2025-08-31*

## Overview
**Time:** 10:00 PST (17:00 UTC)
**Duration:** 15 minutes maximum
**Format:** Async Slack thread in #unblock-and-commit
**Attendance:** All active contributors

## Purpose
- Surface blockers before they become critical
- Create public commitment to daily progress
- Enable rapid cross-pod assistance
- Maintain momentum

## Format

### Thread Template
```
🎯 **Daily Unblock & Commit** - [Date]

Post your update using this format:

✅ **Completed Yesterday:**
- 

🚧 **Blocked On:**
- 

📝 **Committing to Today:**
- 
```

### Response Format
Each person posts one message with three sections:

**✅ Completed Yesterday**
- Specific, measurable accomplishments
- Link to PR/commit/demo if applicable
- Gate progressions achieved

**🚧 Blocked On**
- Specific blocker with context
- What you've tried
- Who/what you need
- Time blocked

**📝 Committing to Today**
- 1-3 specific deliverables
- Must be achievable in one day
- Include gate/stage if applicable

## Rules

### Participation
- Post by 10:15 PST or marked absent
- Weekend/PTO excluded
- Missing 2 days without notice = escalation

### Blockers
- Tag specific person who can unblock
- Escalate if blocked >24 hours
- Integrator Pod monitors all blockers
- Patrick reviews blockers >48 hours

### Commitments
- Must be specific and measurable
- "Work on X" not acceptable
- "Complete Y section of X" acceptable
- Previous commitments auto-carried if not mentioned

## Escalation

### 24-Hour Blockers
1. Integrator Pod DMs blocker owner
2. Adds to afternoon sync agenda
3. Creates tracking issue

### 48-Hour Blockers
1. Patrick notified
2. Pod Lead meeting scheduled
3. Resource reallocation considered

### Pattern Detection
- 3+ similar blockers = systemic issue
- Added to Portfolio Council agenda
- Root cause analysis required

## Examples

### Good Update
```
✅ Completed Yesterday:
- Shipped PR #234 for auth integration
- Fixed 3 critical bugs in photo upload
- Recorded demo for Friday presentation

🚧 Blocked On:
- AWS credentials for staging deploy (need @ops-team, blocked 18hrs)
- API contract review from @mike (sent Monday)

📝 Committing to Today:
- Complete test coverage for auth module
- Review and merge Lisa's PWA changes
- Start Seed gate documentation
```

### Poor Update
```
✅ Completed: Worked on stuff
🚧 Blocked: Waiting on things
📝 Today: Continue working
```

## Metrics Tracked
- Blocker resolution time
- Commitment completion rate
- Participation rate
- Cross-pod assistance frequency

## Bot Automation
```javascript
// Slack bot posts thread at 10:00 PST
// Reminder at 10:10 for non-responders
// Summary posted at 10:30
// Blockers compiled for afternoon sync
```

## Integration Points
- Blockers feed Portfolio Council
- Commitments update GitHub projects
- Completions trigger Demo Friday eligibility
- Patterns inform retrospectives

---

*"Small commitments, daily delivered."*