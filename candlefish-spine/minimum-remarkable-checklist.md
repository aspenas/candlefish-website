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