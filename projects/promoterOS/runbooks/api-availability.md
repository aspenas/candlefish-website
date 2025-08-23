# API Availability Runbook

## Alert: APIAvailabilityBurnRateHigh

### Overview
This alert fires when the API availability is burning through its error budget too quickly, indicating a significant increase in 5xx errors or complete unavailability.

### Impact
- Users cannot access the PromoterOS platform
- Bookings cannot be created or modified
- Payment processing may be affected
- Artist data collection is blocked

### Severity Levels
- **Critical**: Burn rate > 14.4x (exhausts monthly budget in 2 days)
- **Warning**: Burn rate > 3x (exhausts monthly budget in 10 days)

## Investigation Steps

### 1. Check Current Status
```bash
# Check API Gateway pod status
kubectl get pods -n promoteros-api -l app=api-gateway

# Check recent events
kubectl get events -n promoteros-api --sort-by='.lastTimestamp' | head -20

# Check ingress status
kubectl get ingress -n promoteros-api
```

### 2. Review Logs
```bash
# API Gateway logs
kubectl logs -n promoteros-api -l app=api-gateway --tail=100

# Check for panic/crash
kubectl logs -n promoteros-api -l app=api-gateway --previous

# Search for errors
kubectl logs -n promoteros-api -l app=api-gateway | grep -i error | tail -50
```

### 3. Check Metrics
- Open Grafana dashboard: https://grafana.promoteros.io/d/api-slo
- Check error rate by endpoint
- Review response time percentiles
- Verify upstream service health

### 4. Database Connectivity
```bash
# Check PgBouncer status
kubectl get pods -n promoteros-data -l app=pgbouncer

# Check database connections
kubectl exec -n promoteros-data pgbouncer-0 -- psql -U pgbouncer_stats -d pgbouncer -c "SHOW POOLS;"
```

### 5. Check Dependencies
```bash
# Redis availability
kubectl get pods -n promoteros-cache -l app=redis

# External API status (TikTok, Stripe)
curl -s https://status.stripe.com/api/v2/status.json | jq .status
```

## Resolution Steps

### Quick Fixes

#### 1. Restart Unhealthy Pods
```bash
# Delete crashlooping pods
kubectl delete pods -n promoteros-api -l app=api-gateway --field-selector status.phase=Failed

# Rolling restart
kubectl rollout restart deployment/api-gateway -n promoteros-api
```

#### 2. Scale Up If Under Load
```bash
# Check current scale
kubectl get hpa -n promoteros-api

# Manual scale if needed
kubectl scale deployment/api-gateway -n promoteros-api --replicas=10
```

#### 3. Circuit Breaker Reset
```bash
# If external API issues, reset circuit breakers
kubectl exec -n promoteros-api deployment/api-gateway -- curl -X POST localhost:8080/admin/circuit-breaker/reset
```

### Root Cause Analysis

#### Database Issues
If database is the bottleneck:
```bash
# Increase PgBouncer pool size temporarily
kubectl edit configmap pgbouncer-config -n promoteros-data
# Modify: default_pool_size = 50

# Restart PgBouncer
kubectl rollout restart deployment/pgbouncer -n promoteros-data
```

#### Memory/CPU Issues
```bash
# Check resource usage
kubectl top pods -n promoteros-api -l app=api-gateway

# Increase limits if needed
kubectl edit deployment api-gateway -n promoteros-api
# Modify resource limits
```

#### Network Issues
```bash
# Check network policies
kubectl get networkpolicies -n promoteros-api

# Verify DNS resolution
kubectl exec -n promoteros-api deployment/api-gateway -- nslookup postgres.promoteros-data.svc.cluster.local
```

## Rollback Procedure

If recent deployment caused issues:
```bash
# Check rollout history
kubectl rollout history deployment/api-gateway -n promoteros-api

# Rollback to previous version
kubectl rollout undo deployment/api-gateway -n promoteros-api

# Verify rollback
kubectl rollout status deployment/api-gateway -n promoteros-api
```

## Escalation

1. **Level 1** (0-15 min): On-call engineer follows this runbook
2. **Level 2** (15-30 min): Escalate to Platform Team Lead
3. **Level 3** (30+ min): Involve CTO and consider status page update

### Contacts
- Platform Team: #platform-oncall (Slack)
- Database Team: #database-oncall (Slack)
- StatusPage: https://status.promoteros.io/admin

## Prevention

1. **Review recent changes**: Check last 24h deployments
2. **Capacity planning**: Ensure we have headroom for traffic spikes
3. **Load testing**: Run k6 tests before major releases
4. **Progressive rollout**: Use canary deployments for risky changes

## Post-Incident

1. Create incident report in Confluence
2. Schedule blameless postmortem
3. Update this runbook with new findings
4. Add missing metrics/alerts
5. Consider adding automated remediation

## Related Documents
- [Architecture Diagram](../docs/architecture.md)
- [Deployment Guide](../docs/deployment.md)
- [Monitoring Strategy](../docs/monitoring.md)
- [Incident Response Process](../docs/incident-response.md)
