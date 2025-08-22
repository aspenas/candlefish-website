# Eggshell SLOs and Monitors

## SLO Targets
- p95 page TTFB: < 300ms (staging)
- Error rate: < 0.5% per 5m
- Availability: 299.5%

## Measurements
- TTFB: collected via `/api/health` durationMs and CDN/edge logs
- Error rate: count 5xx from logs and health status != healthy
- Availability: uptime of `/api/health` returning 200

## Alerting
- Slack webhook: `SLACK_ALERTS_WEBHOOK_URL`
- GitHub Action `ci-slos-alerts.yml` runs every 10m and posts on failure

## Dashboards
- Prometheus (if backend): `/metrics`
- Log-based counters for Next.js if Prom unavailable

## Runbooks
- Health degraded: check Redis/DB connectivity; verify AWS Secrets
- TTFB > 300ms: inspect slow endpoints and external API latencies
- Error rate > 0.5%: examine recent deploys, rollback if needed
