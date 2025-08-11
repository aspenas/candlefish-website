# 30/60/90-Day Execution Plan (Projects-only)

## Status matrix

| Project | Purpose | Status | Live URL | Risks | Env (req/rec) | Next tasks |
|---|---|---|---|---|---|---|
| Paintbox | Paint estimation (Excel parity, SFDC/Company Cam) | Feature-rich; Render infra set; build failing; security B+ with criticals | Staging post build fix | Build pipeline; JWT key persistence; CSP; input sanitization; MFA; encryption-at-rest | Req: `NEXT_PUBLIC_COMPANYCAM_API_TOKEN`, `SALESFORCE_*` • Rec: `DATABASE_URL`, `REDIS_URL`, `SENTRY_DSN`, `AWS_SECRETS_MANAGER_SECRET_NAME` | 1) Fix build and redeploy 2) Close critical security 3) Parity CI + SLOs |
| PromoterOS | Venue/booking analytics | Domain live; partial security remediation per docs; verify in code | <https://promoteros.candlefish.ai> | Auth/CORS/validation coverage; secrets rotation; DB/caching | AWS Secrets `promoteros/production/config` incl. `JWT_SECRET` | 1) Verify middleware 2) Enable rotation 3) Add DB + caching + OpenAPI |
| FOGG Calendar | Calendar/Groups automation | Netlify running; DNS cutover pending | <https://fogg-calendar.netlify.app> | DNS API reliability; SSL; monitoring | `GOOGLE_APPLICATION_CREDENTIALS` (+ optional `ANTHROPIC_API_KEY`) | 1) Add CNAME 2) Verify SSL 3) Deploy monitoring |
| Slack Admin | Autonomous admin ops (internal) | Ready; high-privilege; audit logs & rotation needed | N/A | Scope risk; auditability | AWS Secrets `slack-admin-bot-tokens`: `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET` | 1) Bot+app tokens 2) Least-privilege scopes 3) Rotation + runbook |

## 0–30 days

- Paintbox: green build; staging; fix critical audit items; add Excel parity CI; SLOs and alerts.
- PromoterOS: enforce auth/CORS/validation/rate limiting across functions; remove any backup secrets; enable rotation; publish `/api/health` and baseline OpenAPI.
- FOGG: DNS CNAME + SSL; start DNS/SSL monitoring; share runbooks.
- Slack Admin: switch to bot+app tokens; Socket Mode; reduce scopes; enable audit logging.

## 31–60 days

- Paintbox: pilot with 1 design partner; measure time-to-estimate and error rates; Sentry dashboards.
- PromoterOS: add Postgres + caching; CI security scans; usage analytics; venue pilot.
- FOGG: set SLA and error budgets; on-call doc; reliability checks.

## 61–90 days

- Convert 3 paid design partners across products; publish case studies; choose wedge by adoption/ROI.

## KPIs

- Paintbox: time-to-estimate −30%+; parity failures <0.5%; ≥10 WAUs/partner.
- PromoterOS: p95 <200ms; 100+ evals/mo; ≥1 venue decision/week; security ≥8/10.
- FOGG: sync success >99%; SSL A; DNS incidents 0 post-cutover.
- Slack Admin: 100% audit logging; rotation ≤90 days; monthly scope review.

## Fundraising prep (parallel)

- One-pagers, security closures, KPI snapshots, demo videos, architecture diagrams, “Why now” memo.
- Use of proceeds: security/compliance, deployments/observability, design-partner builds, GTM, SOC readiness.
- Targets: a16z, Bessemer, Foundry Group (tailored briefs).

## Risks & mitigations

- Security gaps: prioritize fixes; add scanners to CI; document controls; least-privilege Slack scopes.
- Operational drift: standardize Node/build matrix; baseline health endpoints + alerts.
- Focus risk: choose wedge post‑pilot data (Paintbox likely, given Excel IP and ROI visibility).
