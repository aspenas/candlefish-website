# Candlefish.ai Architectural Decision Log

## Decision #001: Paintbox Production Deployment
**Date**: August 10, 2025
**Decision Maker**: Claude (Co-owner, Operational Lead)
**Status**: APPROVED

### Context
Patrick has delegated full operational authority for technical execution. Paintbox needs immediate production deployment while maintaining parallel development of Crown, PromoterOS, and Brewkit.

### Decision
Deploy Paintbox to Fly.io with the following architecture:
- **Primary**: Fly.io (immediate deployment)
- **Database**: PostgreSQL on Fly with daily backups
- **Caching**: Redis for calculation caching
- **CDN**: Cloudflare for static assets
- **Secrets**: AWS Secrets Manager integration

### Rationale
- Fly.io provides fastest path to production (< 24 hours)
- Existing configuration files ready
- Cost-effective for self-funded approach
- Can migrate to AWS EKS later if needed

### Implementation
1. Deploy to Fly.io today
2. Configure production environment
3. Set up monitoring
4. Enable SSL/security

---

## Decision #002: Hybrid Database Architecture
**Date**: August 10, 2025
**Decision Maker**: Claude (Co-owner, Operational Lead)
**Status**: APPROVED

### Context
Need to support 4 parallel verticals with shared core infrastructure.

### Decision
Implement hybrid database approach:
- **Shared Core DB**: Authentication, billing, operator management
- **Vertical-Specific DBs**: Paintbox, Crown, PromoterOS, Brewkit separate schemas

### Rationale
- Maintains data isolation between verticals
- Enables independent scaling
- Simplifies compliance and security
- Allows vertical-specific optimizations

### Implementation
1. Create shared core database
2. Create paintbox_production database
3. Set up connection pooling
4. Configure cross-database queries for reports

---

## Decision #003: Tyler's Task Assignment
**Date**: August 10, 2025
**Decision Maker**: Claude (Co-owner, Operational Lead)
**Status**: APPROVED

### Context
Tyler available full-time, needs explicit task delegation.

### Decision
Tyler owns:
1. **Frontend Polish** - UI/UX improvements for Paintbox
2. **Mobile Responsiveness** - Tablet optimization
3. **Testing Suite** - Unit and integration tests
4. **Documentation** - API and user documentation

### Rationale
- Leverages Tyler's strengths
- Critical for production readiness
- Allows Patrick to focus on strategic decisions
- Clear ownership boundaries

### Implementation
Creating detailed task board with specific deliverables and deadlines.

---

## Decision #004: Production Deployment Timeline
**Date**: August 10, 2025
**Decision Maker**: Claude (Co-owner, Operational Lead)
**Status**: APPROVED

### Context
AI4 conference in Las Vegas provides networking opportunity. Need production system live.

### Decision
- **Hour 0-12**: Deploy Paintbox to Fly.io
- **Hour 12-24**: Configure production environment
- **Hour 24-36**: Testing and validation
- **Hour 36-48**: Go live with first customer

### Rationale
- Demonstrates capability at AI4
- Creates urgency and momentum
- Allows real customer feedback
- Proves Excel migration technology

---

## Decision #005: Monitoring and Reporting
**Date**: August 10, 2025
**Decision Maker**: Claude (Co-owner, Operational Lead)
**Status**: APPROVED

### Context
Patrick requested hourly progress updates with full autonomy.

### Decision
Implement automated monitoring:
- Hourly status reports
- Real-time dashboard
- Slack notifications for critical events
- Daily executive summary

### Rationale
- Maintains visibility without micromanagement
- Enables quick course correction
- Documents progress for investors/partners
- Creates accountability

---

*This log will be updated with each architectural decision. All decisions can be revisited with 24-hour notice per company policy.*
