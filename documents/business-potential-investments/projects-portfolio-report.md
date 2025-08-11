# Candlefish.ai Projects Portfolio — Investor-Focused Report

Scope: Strictly based on `projects/` content. No speculation beyond marked assumptions.

## 1) Chronological narrative (verified vs. assumptions)

- 2025‑08‑06 — FOGG Calendar
  - Verified: Critical deployment orchestrator fully validated (10/10 scenarios, 100% success). Source: `projects/fogg/calendar/deploy/DEPLOYMENT_REPORT_FINAL.md`.
  - Verified: Dashboard live at `https://fogg-calendar.netlify.app`; DNS scripts in place to enable `fogg.candlefish.ai`. Sources: `deployment-dashboard/IMPLEMENTATION_COMPLETE.md`, `SETUP_SUMMARY.md`.
- 2025‑08‑07 — PromoterOS
  - Verified: Domain live `https://promoteros.candlefish.ai`, health endpoint, independent infra, Netlify site ID + CNAME mapping. Sources: `DEPLOYMENT_SUMMARY.md`, `PROJECT_CONFIG.md`.
  - Verified: Security review flags critical gaps (auth, CORS, validation, rate limiting, secrets); separate summary claims remediations and CI/CD. Treat as partially remediated pending code verification. Sources: `COMPREHENSIVE_REVIEW_CONSOLIDATED.md`, `SECURITY_AUDIT_REPORT.md`, `DEPLOYMENT_SUMMARY.md`.
- 2025‑08‑07 — Paintbox
  - Verified: Production-minded app with Excel parity, Salesforce/Company Cam integrations, offline-first; security audit B+ with critical items; Render infra configured with last build failed. Sources: `README.md`, `SECURITY_AUDIT_REPORT_2025.md`, `DEPLOYMENT_STATUS_FINAL.md`.
- 2025‑08‑08 — Excel Engine and Slack Admin
  - Verified: Excel engine “Production Ready”—14,683 formulas, 25 sheets, parity tests. Source: `EXCEL_ENGINE_IMPLEMENTATION_COMPLETE.md`.
  - Verified: Slack Admin bot “Ready for deployment,” AWS Secrets, Prometheus/Grafana; high-privilege warnings. Sources: `projects/candlefish-business-solutions/slack-integration/README.md`, `SLACK_ADMIN_SETUP.md`.
- Assumptions: Founder identity inferred from authored reports and local path; not explicitly profiled in `/projects/`.

## 2) Investment analysis

- Strengths
  - Vertical SaaS surface with deployable products (Paintbox, PromoterOS, FOGG) and shared operational patterns.
  - Excel engine IP (14,683 formulas) with clear business utility for Paintbox.
  - Documentation depth: deployment guides, audits, health/monitoring patterns, secrets management.
- Risks
  - Security gaps (PromoterOS, Paintbox) and operational inconsistencies (Paintbox build, FOGG DNS).
  - Focus/PMF clarity across multiple verticals; limited documented paying usage.
- Market context
  - Active markets for AI-enabled vertical SaaS; TAM/SAM not documented here (requires separate work).
- Seed-stage conditions
  - Evidence: 2–3 paying design partners across projects with KPI dashboards.
  - Security: close critical audit items; least-privilege Slack scopes; secret rotation & monitoring.
  - Operations: green builds, health SLOs, published docs, DNS finalized (FOGG), parity CI (Paintbox).

## 3) Strategic business plan (drawn from `/projects`)

- Mission: Turn domain-specific workflows into reliable, measurable AI systems that compress time-to-decision/action.
- Vision: Portfolio of vertical SaaS built on a common security/ops foundation.
- Modules
  - Paintbox (estimation platform, Excel parity, SFDC/Company Cam).
  - PromoterOS (venue intelligence: artists, demand, booking score).
  - FOGG Calendar (calendar/group orchestration + MCP tools).
  - Slack Admin (internal ops asset; least-privilege for external).
- GTM Phases
  - 0–60 days: secure/stabilize; convert pilots to paid design partners; publish KPIs.
  - 60–180 days: package, SOC-aligned posture, case studies, DNS/SSO polish.
  - 6–12 months: concentrate on the highest-traction wedge; integrations.
- Team (lean): Founder, Senior Backend/Security, Full-stack, DevOps, part-time Compliance, Solutions.
- Capital (assumption): Seed $1.5–3.0M for security/infra, design partners, GTM, SOC readiness.
- Milestones: 90 days (3 paying design partners, audits closed); 6 months (6–10 paying customers, case studies); 12 months (wedge selection, scalable GTM).

## 4) VC shortlist and rationale

- Andreessen Horowitz (a16z): enterprise AI and agentic workflow experience.
- Bessemer Venture Partners: cloud/SaaS rigor; packaging/pricing discipline.
- Foundry Group: early-stage, product-centric partnership.
Note: Selection based on fit; not referenced in `/projects`.

## 5) Practical next steps per project

- Paintbox: fix Render build; remediate critical security items; automate Excel parity CI; publish SLOs/alerts.
- PromoterOS: verify middleware enforcement; enable secret rotation; add DB + caching; publish OpenAPI; CI security scans.
- FOGG: add CNAME `fogg` → `fogg-calendar.netlify.app`; verify SSL; deploy DNS/SSL monitoring; handoff runbooks.
- Slack Admin: bot + app tokens; Socket Mode; least-privilege scopes; audit trails; rotation schedule.

## 6) Environment variables (always-include-env)

- Paintbox — Required: `NEXT_PUBLIC_COMPANYCAM_API_TOKEN`, `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, `SALESFORCE_USERNAME`, `SALESFORCE_PASSWORD`, `SALESFORCE_SECURITY_TOKEN` • Recommended: `DATABASE_URL`, `REDIS_URL`, `SENTRY_DSN`, `AWS_SECRETS_MANAGER_SECRET_NAME`.
- PromoterOS — Use AWS Secrets `promoteros/production/config`, including `JWT_SECRET`, provider tokens, strict origin allow-list.
- FOGG Calendar — `GOOGLE_APPLICATION_CREDENTIALS` (or ADC), optional `ANTHROPIC_API_KEY`.
- Slack Admin — AWS Secrets `slack-admin-bot-tokens` (us-west-2): `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`.

## 7) Assumptions and gaps

- No explicit founder bio in `/projects`; usage metrics/contracts not present; TAM/SAM absent; PromoterOS remediation requires code validation.
