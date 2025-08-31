# Gate Promotion Notices
*Channel: #engineering or pod-specific channels*

---

## Successful Promotion

```
✅ **Gate Promotion: [Feature Name]**

**[Feature]** has been promoted from **[Old Gate] → [New Gate]**

**What this means:**
• [Specific next steps based on new gate]
• [New requirements to meet]
• [Timeline expectations]

**Owner:** @person
**Pod:** [Pod name]
**Next Review:** [Date]

Details: [GitHub Issue link]

Congrats on the progress! 🎯
```

---

## Gate Rejection

```
⚠️ **Gate Review: [Feature Name]**

**[Feature]** remains in **[Current Gate]**

**Missing requirements:**
• [ ] [Requirement 1]
• [ ] [Requirement 2]
• [ ] [Requirement 3]

**Next steps:**
1. Address requirements above
2. Request re-review when complete
3. Target date: [Date]

**Owner:** @person
**Support available:** @helper

Let's get this over the line! 💪
```

---

## Auto-Kill Triggered

```
🛑 **Auto-Kill Triggered: [Feature Name]**

**[Feature]** has been automatically moved to **Killed** status.

**Trigger:** [Specific trigger condition met]
• [Details about what triggered it]

**What happens now:**
1. Code archived to `/experiments`
2. Learnings documented
3. Resources freed up

**Salvageable components:**
• [Component 1] - can be reused for [Purpose]
• [Component 2] - extracted to shared library

**Owner:** @person - please document learnings by [Date]

This isn't failure—it's focus. On to the next! 🚀
```

---

## WIP Limit Warning

```
⚠️ **WIP Limit Warning: [Pod Name]**

**[Pod]** is approaching WIP limits:
• Current Scaffold items: 2/3
• Current Seed items: 4/5

**Impact:**
• New work will be queued
• Gate promotions may be delayed

**Recommended actions:**
1. Focus on completing current Scaffold items
2. Defer new Seed explorations
3. Review and kill stalled items

**Current priorities:**
1. [Item 1] - @owner
2. [Item 2] - @owner
3. [Item 3] - @owner

Need help prioritizing? → @integrator-pod
```

---

## Blocker Escalation

```
🚨 **Blocker Escalation: [Item Name]**

**[Item]** has been blocked for **48+ hours**

**Blocker:** [Description]
**Owner:** @blocked-person
**Blocking:** @blocking-person or [External dependency]

**Escalation path triggered:**
1. ✅ Integrator Pod notified
2. ⏳ Patrick review scheduled
3. ⏳ Resource reallocation pending

**Required action:**
@blocking-person - Please respond by EOD with:
• Resolution timeline
• What you need to unblock
• Alternative approaches

This is now tracked as priority incident.
```

---

## Ship Gate Approval

```
🚀 **Ship Gate Approved: [Feature Name]**

**[Feature]** is cleared for production! 

**✅ All criteria met:**
• Minimum Remarkable: All green
• Performance benchmarks: Passed
• Documentation: Complete
• Support runbook: Ready

**Deployment window:** [Date/time]
**Owner:** @person
**Rollback owner:** @person

**Pre-deploy checklist:**
• [ ] Customer notification sent
• [ ] Monitoring dashboard ready
• [ ] Rollback tested
• [ ] Team notified

This is what shipping remarkable looks like! 🎯

Demo this on Friday for Ship of the Week consideration.
```

---

## Weekly Gate Summary

```
📊 **Weekly Gate Movement**

**Promotions this week:**
• Spark → Seed: 3 items
• Seed → Scaffold: 2 items  
• Scaffold → Ship: 1 item ⭐
• Ship → Scale: 0 items

**Currently in flight:**
• Spark: 12 items
• Seed: 8 items
• Scaffold: 7 items (WIP: 7/9)
• Ship: 3 items
• Scale: 2 items

**Auto-kills:** 2 items
**Blocked >24hrs:** 4 items

**Spotlight:** @person shipped [Feature] in just 12 days from Spark to Ship! 🏃‍♂️

Full dashboard: [Link]
```