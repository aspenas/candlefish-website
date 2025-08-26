# Proportion-by-Design: Architecture for Human Sovereignty

## Executive Summary

Proportion-by-Design is Candlefish's architectural philosophy that embeds human sovereignty through deliberate constraints. Every feature, interaction, and system decision explicitly acknowledges the relative nature of human experience while maintaining operational precision.

## Core Principles

### 1. SOURCE
**Definition**: Every action and claim traces to discoverable origins.

**Implementation**:
- Git commit attribution with `[SOURCE: file:line]` annotations
- Data lineage tracking in all analytics pipelines
- API responses include `x-source-trace` headers
- UI components display source badges on generated content

**Example**: When the system generates a recommendation, it shows:
```
Recommendation based on:
- 3 similar projects (click to view)
- Historical success rate: 78%
- Confidence interval: ±12%
```

### 2. TETHER
**Definition**: Surface constraints transparently at decision points.

**Implementation**:
- Resource meters displayed during operations
- Cost projections shown before actions
- Privacy impact notices on data operations
- Performance trade-off indicators

**Example**: Before deploying:
```
Deploy Impact:
- Cost: ~$12/month
- Latency: +20ms (p95)
- Privacy: 3 new data points collected
- Accessibility: WCAG AAA maintained
```

### 3. SERVICE
**Definition**: Clear beneficiary and accountability chains.

**Implementation**:
- Stakeholder mapping in project metadata
- Risk assignment matrices
- Benefit distribution tracking
- Harm mitigation protocols

**Example**: PR template section:
```yaml
beneficiaries:
  - end_users: "Faster page loads"
  - developers: "Cleaner API"
risk_owners:
  - performance: "@team-frontend"
  - security: "@team-platform"
```

### 4. CALM
**Definition**: Minimize attention cost and cognitive load.

**Implementation**:
- Progressive disclosure patterns
- Reduced motion by default
- Ambient feedback over interruptions
- Queue-based notifications

**Example**: Notification system:
- No modals except critical security
- Soft chimes optional, off by default
- Status changes via subtle border shifts
- Batch updates in 5-minute windows

### 5. LIMINAL
**Definition**: Design for threshold moments of reflection.

**Implementation**:
- Pause points before irreversible actions
- Transition animations that provide thinking space
- Review interfaces at natural boundaries
- Contemplation-friendly layouts

**Example**: Deploy sequence includes:
1. Summary pause (5 seconds minimum)
2. Breath timer option
3. One-line intention field
4. Gentle proceed confirmation

### 6. PRIVACY/SECURITY
**Definition**: HIPAA-grade data posture as baseline.

**Implementation**:
- End-to-end encryption for user data
- Local-first storage patterns
- Minimal telemetry with clear opt-out
- Zero third-party beacons by default

## Feature Implementations

### Pause & Seal Component
A micro-ritual for intentional action, appearing before publish/deploy operations.

**Structure**:
```typescript
interface PauseSealState {
  duration: 5 | 8 | 10; // minutes
  breathPattern: 'box' | 'exhale-biased' | 'natural';
  intention?: string; // single line, optional
  chime: boolean; // default false
}
```

**Interaction Flow**:
1. Triggered by keyboard shortcut (Cmd+Shift+P) or button proximity
2. Non-blocking overlay (can dismiss)
3. Timer with breath guide visualization
4. Optional intention capture
5. Soft completion tone if enabled

### Fragments Journal
Local-first reflection space without goals or metrics.

**Data Model**:
```typescript
interface Fragment {
  id: string; // UUID v4
  type: 'text' | 'image' | 'sketch';
  content: string | Blob;
  tags: string[];
  created: ISO8601;
  encrypted: boolean;
  localOnly: boolean; // never syncs if true
}
```

**Privacy Features**:
- AES-256 encryption at rest
- Optional device-only mode
- Export as encrypted bundle
- No analytics or tracking

### Focus Room
Minimal shared workspace for deep work.

**Capabilities**:
- Presence dots (initials only)
- Timebox: 25/45/90 minutes
- Do Not Disturb auto-activation
- End chime (optional)
- No chat by default

**Technical Stack**:
- WebRTC for presence
- SharedArrayBuffer for state
- Service Worker for offline
- IndexedDB for session history

### Proportion Nudge
Inline triad form at publication points.

**Integration Points**:
- Git commit hooks
- Deploy pipelines
- Content publishing
- API releases

**Data Captured**:
```json
{
  "source": ["url", "file:line", "analysis-id"],
  "tether": ["cost", "performance", "privacy"],
  "service": {
    "benefits": ["user-group"],
    "risks": ["owner-id"]
  }
}
```

### Right-Sized Metrics
Relative measurement preventing vanity metrics.

**Display Format**:
- You vs. median (percentile)
- Week-over-week delta
- Cohort size indicator
- No raw peer data

**Privacy Guarantees**:
- k-anonymity (k ≥ 5)
- Differential privacy (ε = 0.1)
- Weekly aggregation minimum
- Local computation when possible

### Credit Chip
Lightweight attribution interface.

**Render Locations**:
- Next to publish buttons
- In PR descriptions
- On dashboard cards
- In commit messages

**Format**:
```
Via: @author | Source: [link] | Prior: [ref]
```

## Security Architecture

### Content Security Policy
```
default-src 'self';
script-src 'self' 'sha256-[hash]';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https://api.candlefish.ai;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

### Headers Configuration
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Accessibility Baseline

### Core Requirements
- WCAG 2.1 AA minimum, AAA preferred
- Keyboard navigation for all interactions
- Screen reader landmarks and regions
- Reduced motion respecting `prefers-reduced-motion`
- High contrast mode support
- Focus indicators visible and consistent

### Testing Protocol
```bash
# Automated checks
pnpm test:accessibility

# Manual verification
- Tab navigation complete path
- Screen reader full narration
- Color contrast validation
- Motion preference toggle
- Zoom to 200% functionality
```

## Migration Strategy

### Phase 1: Foundation (Week 1)
- Security headers and CSP
- PR template and hooks
- Accessibility audit baseline

### Phase 2: Core Features (Week 2-3)
- Pause & Seal component
- Proportion Nudge system
- Credit Chip interface

### Phase 3: Advanced Features (Week 4-5)
- Fragments Journal
- Focus Room
- Right-Sized Metrics

### Phase 4: Integration (Week 6)
- Feature flag rollout
- A/B testing setup
- Performance optimization

## Success Metrics

### Quantitative
- Attention cost: < 3 interruptions/hour
- Accessibility score: > 95/100
- Security headers: 100% coverage
- Page weight: < 500KB initial
- Time to interactive: < 3s

### Qualitative
- User calm rating: > 4/5
- Developer friction: reduced 30%
- Attribution completeness: > 80%
- Privacy confidence: > 90%

## References

### Internal
- [Security Baseline](./SECURITY_PRIVACY_BASELINE.md)
- [Accessibility Guide](./ACCESSIBILITY.md)
- [Component Library](../packages/ui/README.md)

### Design Philosophy
- Calm Technology Institute principles
- Liminal design research (threshold UX)
- Privacy-preserving analytics patterns
- Exhale-biased breathing for parasympathetic activation

---

*This document embodies proportion-by-design: traceable (git history), constrained (migration phases), service-oriented (success metrics), calm (progressive disclosure), liminal (reflection points), and private (no tracking).*
