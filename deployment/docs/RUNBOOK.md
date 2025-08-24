# Operations Runbook - Netlify Extension Management System

This runbook provides operational procedures, troubleshooting guides, and emergency response protocols for the Netlify Extension Management System.

## 🚨 Emergency Response

### Severity Classification

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| **P1 - Critical** | Complete service outage, data loss | 15 minutes | Immediate page + Slack |
| **P2 - High** | Major feature degraded, significant impact | 1 hour | Slack + Email |
| **P3 - Medium** | Minor feature issue, limited impact | 4 hours | Slack notification |
| **P4 - Low** | Enhancement requests, cosmetic issues | Next business day | Ticket queue |

### Emergency Contacts
- **On-call Engineer**: Available 24/7 via PagerDuty
- **Platform Team Lead**: Business hours (9 AM - 5 PM EST)
- **Security Team**: security@candlefish.ai

## 🔍 Quick Diagnostics

### System Health Check
```bash
# Overall system health
./deployment/scripts/health-check.sh production --external

# Individual services
./deployment/scripts/health-check.sh production --service api
```

### Key Monitoring Commands
```bash
# Check pod status
kubectl get pods -n netlify-extension-production

# Check recent events
kubectl get events --sort-by=.metadata.creationTimestamp -n netlify-extension-production

# Check service logs
kubectl logs -f deployment/netlify-api-production -n netlify-extension-production
```

## 🛠️ Common Issues

### Service Unavailable
1. Check pod status: `kubectl get pods -n netlify-extension-production`
2. Check logs: `kubectl logs -f deployment/netlify-api-production -n netlify-extension-production`
3. If needed, rollback: `./deployment/scripts/emergency-rollback.sh production --force`

### High Response Times
1. Check resource usage: `kubectl top pods -n netlify-extension-production`
2. Scale up: `kubectl scale deployment netlify-api-production --replicas=10 -n netlify-extension-production`
3. Check database performance

### Database Issues
1. Check connectivity: `kubectl exec -it deployment/netlify-api-production -n netlify-extension-production -- nc -zv database-host 5432`
2. Restart connections: `kubectl rollout restart deployment/netlify-api-production -n netlify-extension-production`

## 📞 Support Escalation

1. **Check documentation** and runbook
2. **Slack**: `#deployment-help` for guidance
3. **On-call**: Page for P1/P2 issues
4. **Management**: Escalate if >4 hour resolution

---

**Remember**: When in doubt, escalate early rather than struggle alone.
