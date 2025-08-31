# Decision Memo: Unified Authentication System
*Date: 2025-08-31 | Owner: Integrator Pod | Status: Approved*

## Context
Each pod currently maintains separate authentication systems with different security standards, user experiences, and maintenance overhead. Recent security audit identified this as our highest risk area with 3 near-miss incidents in Q2.

## Decision Required
How should we implement unified authentication across all Candlefish products?

## Three Paths

### Path 1: Build Custom Auth Service
**Description:** Build our own authentication service from scratch using industry best practices.

**Pros:**
- Complete control over implementation
- Perfect fit for our specific needs
- No vendor lock-in
- Can monetize as separate product

**Cons:**
- 3-4 month development time
- Ongoing maintenance burden
- Security responsibility on us
- Compliance complexity (SOC2, GDPR)

**Cost:** $120k development + $30k/year maintenance
**Timeline:** 4 months

### Path 2: Auth0/Okta Integration
**Description:** Integrate enterprise auth provider across all services.

**Pros:**
- Production-ready immediately
- Enterprise-grade security
- Compliance handled
- 24/7 support

**Cons:**
- $48k/year at our scale
- Vendor lock-in risk
- Limited customization
- Per-user pricing model

**Cost:** $48k/year + $15k integration
**Timeline:** 3 weeks

### Path 3: Open Source (Keycloak/Ory)
**Description:** Deploy open-source identity platform with custom integrations.

**Pros:**
- No licensing costs
- Highly customizable
- Active community
- Self-hosted control

**Cons:**
- Complex deployment
- Requires auth expertise
- Self-support model
- Scaling challenges

**Cost:** $40k setup + $20k/year operations
**Timeline:** 6 weeks

## Recommendation
**Path 2: Auth0 Integration**

Rationale:
- Fastest path to eliminating security risk
- Total 3-year cost lowest when including engineering time
- Allows team to focus on core product differentiation
- Can migrate away if needed (standard protocols)

## Reversibility
**Reversible with effort** - OIDC/SAML standards mean we can migrate, but would require coordinated effort across all pods (estimated 2-3 weeks).

## Success Metrics
1. Zero security incidents related to authentication
2. Single sign-on working across all products within 30 days
3. Customer satisfaction score for login experience >4.5/5
4. Support tickets related to auth reduced by 75%

## Next Steps
1. Negotiate enterprise agreement with Auth0
2. Create integration roadmap by pod
3. Set up staging environment
4. Begin Crown Trophy integration as pilot

---
*Approved by Portfolio Council: 2025-08-28*