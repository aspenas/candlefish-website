# Security Dashboard - Incident Response Playbook

## Overview

This playbook provides step-by-step procedures for responding to incidents in the Security Dashboard production environment. It covers incident classification, response procedures, communication protocols, and post-incident analysis.

## Incident Classification

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **P0 - Critical** | Complete service outage, data breach, security incident | Immediate (< 5 minutes) | All hands, C-level notification |
| **P1 - High** | Partial service degradation, performance issues affecting > 50% users | < 15 minutes | On-call team, manager notification |
| **P2 - Medium** | Limited service impact, performance degradation < 50% users | < 1 hour | Standard escalation |
| **P3 - Low** | Minor issues, cosmetic problems, non-urgent improvements | < 24 hours | Normal business hours |

### Incident Types

1. **Service Outage** - Application unavailable
2. **Performance Degradation** - Slow response times, timeouts
3. **Security Incident** - Unauthorized access, data breach
4. **Data Issues** - Corruption, loss, inconsistency
5. **Infrastructure Issues** - AWS, Kubernetes, networking problems
6. **Third-party Dependencies** - External service failures

## Incident Detection

### Automated Monitoring

- **Prometheus Alerts** - System metrics and performance
- **Grafana Dashboards** - Visual monitoring and trending
- **PagerDuty** - Alert routing and escalation
- **AWS CloudWatch** - Infrastructure monitoring
- **Application Health Checks** - Endpoint monitoring
- **Synthetic Transactions** - User journey validation

### Manual Detection

- **User Reports** - Support tickets, social media
- **Internal Testing** - QA, staging environment issues
- **Partner Notifications** - External integration issues

## Incident Response Procedures

### Phase 1: Detection and Triage (0-5 minutes)

#### 1.1 Initial Response

```bash
# Acknowledge the incident
echo "Incident acknowledged at $(date)" >> incident-log.txt

# Check system status
kubectl get pods -n security-dashboard
kubectl get nodes
aws ec2 describe-instance-status --region us-east-1
```

#### 1.2 Quick Assessment

```bash
# Health check endpoints
curl -f https://security.candlefish.ai/api/health
curl -f https://security.candlefish.ai/api/ready

# Check metrics
kubectl port-forward svc/prometheus-stack-prometheus 9090:9090 -n monitoring &
# Open http://localhost:9090

# Review recent deployments
kubectl argo rollouts get rollout security-dashboard-backend -n security-dashboard
gh run list --workflow=security-dashboard-production-deploy.yml --limit 5
```

#### 1.3 Severity Classification

**P0 Indicators:**
- HTTP 5xx error rate > 50%
- Complete service unavailability
- Security breach detected
- Data corruption/loss

**P1 Indicators:**
- HTTP 5xx error rate > 10%
- P95 response time > 2 seconds
- Partial service degradation
- Database connectivity issues

### Phase 2: Communication and Escalation (5-10 minutes)

#### 2.1 Initial Notifications

```bash
# Slack notification template
SLACK_MESSAGE="🚨 INCIDENT DECLARED - P0 Security Dashboard
Status: Investigating
Impact: Complete service outage
Started: $(date)
Incident Commander: @oncall-engineer
Bridge: https://meet.google.com/incident-bridge
Status Page: https://status.candlefish.ai"

# Send to primary channels
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"$SLACK_MESSAGE\"}" \
  $SLACK_INCIDENT_WEBHOOK
```

#### 2.2 Incident Commander Assignment

- **P0/P1**: Senior Engineer or Engineering Manager
- **P2**: On-call Engineer
- **P3**: Any available team member

#### 2.3 War Room Setup

```bash
# Create incident bridge
echo "Incident Bridge: https://meet.google.com/incident-$(date +%Y%m%d%H%M)"

# Create incident channel
slack_channel="incident-$(date +%Y%m%d-%H%M)"
echo "Slack Channel: #$slack_channel"
```

### Phase 3: Investigation and Diagnosis (10-30 minutes)

#### 3.1 System Investigation

```bash
# Check application logs
kubectl logs -l app=security-dashboard-backend -n security-dashboard --tail=100 --since=30m

# Check system events
kubectl get events -n security-dashboard --sort-by='.lastTimestamp' --no-headers | head -20

# Review metrics
echo "📊 Checking key metrics..."
echo "Error Rate: $(curl -s 'http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])' | jq -r '.data.result[0].value[1] // "0"')"
echo "P95 Response Time: $(curl -s 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))' | jq -r '.data.result[0].value[1] // "0"')"
```

#### 3.2 Infrastructure Checks

```bash
# EKS cluster health
aws eks describe-cluster --name security-dashboard-eks --region us-east-1 \
  --query 'cluster.status'

# RDS status
aws rds describe-db-instances --region us-east-1 \
  --query 'DBInstances[?DBInstanceIdentifier==`security-dashboard-prod`].DBInstanceStatus'

# ElastiCache status
aws elasticache describe-cache-clusters --region us-east-1 \
  --query 'CacheClusters[?CacheClusterId==`security-dashboard-redis`].CacheClusterStatus'

# Load balancer health
aws elbv2 describe-target-health --region us-east-1 \
  --target-group-arn $(aws elbv2 describe-target-groups --region us-east-1 \
  --query 'TargetGroups[?TargetGroupName==`security-dashboard-tg`].TargetGroupArn' --output text)
```

#### 3.3 Recent Changes Analysis

```bash
# Check recent deployments
echo "Recent Deployments:"
gh run list --workflow=security-dashboard-production-deploy.yml --limit 10 --json createdAt,conclusion,headSha

# Check infrastructure changes
echo "Recent Infrastructure Changes:"
aws cloudtrail lookup-events --region us-east-1 \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=security-dashboard-eks \
  --start-time $(date -d '2 hours ago' --iso-8601) \
  --query 'Events[].{Time:EventTime,User:Username,Action:EventName}'
```

### Phase 4: Immediate Mitigation (30-60 minutes)

#### 4.1 Quick Fixes

```bash
# Scale up replicas if resource constrained
kubectl scale deployment security-dashboard-backend --replicas=10 -n security-dashboard

# Restart unhealthy pods
kubectl delete pods -l app=security-dashboard-backend,status.phase=Failed -n security-dashboard

# Clear problematic traffic (if DDoS)
# Update WAF rules via AWS Console or CLI
```

#### 4.2 Emergency Rollback

```bash
# If recent deployment caused issue
echo "🔄 Initiating emergency rollback..."
scripts/deployment/rollback-procedures.sh emergency-rollback

# Monitor rollback progress
watch 'kubectl argo rollouts get rollout security-dashboard-backend -n security-dashboard'
```

#### 4.3 Traffic Management

```bash
# Route traffic to healthy instances only
kubectl patch service security-dashboard-backend -n security-dashboard \
  -p '{"spec":{"selector":{"version":"stable"}}}'

# Enable maintenance mode if needed
kubectl patch configmap security-dashboard-config -n security-dashboard \
  --patch '{"data":{"MAINTENANCE_MODE":"true"}}'
```

### Phase 5: Root Cause Analysis (1-4 hours)

#### 5.1 Data Collection

```bash
# Create incident directory
INCIDENT_ID="INC-$(date +%Y%m%d%H%M)"
mkdir -p incidents/$INCIDENT_ID
cd incidents/$INCIDENT_ID

# Collect system state
kubectl get all -n security-dashboard -o yaml > system-state.yaml
kubectl get events -n security-dashboard > events.log
kubectl top pods -n security-dashboard > resource-usage.txt

# Collect logs
kubectl logs -l app=security-dashboard-backend -n security-dashboard --since=4h > application.log
kubectl logs -l app=security-dashboard-frontend -n security-dashboard --since=4h > frontend.log

# Export metrics
curl -s 'http://localhost:9090/api/v1/query_range?query=rate(http_requests_total[5m])&start='$(date -d '4 hours ago' +%s)'&end='$(date +%s)'&step=60s' > metrics-requests.json
curl -s 'http://localhost:9090/api/v1/query_range?query=up{job="security-dashboard-backend"}&start='$(date -d '4 hours ago' +%s)'&end='$(date +%s)'&step=60s' > metrics-uptime.json
```

#### 5.2 Timeline Construction

```bash
# Create timeline template
cat > timeline.md << EOF
# Incident Timeline - $INCIDENT_ID

## Key Events
- **$(date -d '2 hours ago' '+%H:%M')** - First alert received
- **$(date -d '1 hour 45 minutes ago' '+%H:%M')** - Incident declared P0
- **$(date -d '1 hour 30 minutes ago' '+%H:%M')** - Investigation started
- **$(date -d '1 hour ago' '+%H:%M')** - Root cause identified
- **$(date -d '30 minutes ago' '+%H:%M')** - Fix deployed
- **$(date '+%H:%M')** - Service restored

## Root Cause
[To be filled]

## Contributing Factors
[To be filled]

## Lessons Learned
[To be filled]
EOF
```

### Phase 6: Resolution and Recovery (Variable)

#### 6.1 Fix Implementation

```bash
# Create hotfix branch
git checkout -b hotfix/incident-$INCIDENT_ID

# Make necessary changes
# ... code fixes ...

# Create emergency PR
gh pr create --title "Hotfix: $INCIDENT_ID - [Brief Description]" \
  --body "Emergency fix for production incident $INCIDENT_ID" \
  --label "hotfix,urgent"

# Deploy with expedited process
gh workflow run security-dashboard-production-deploy.yml \
  --ref hotfix/incident-$INCIDENT_ID \
  -f deployment_type=rolling \
  -f force_deploy=true
```

#### 6.2 Validation

```bash
# Validate fix
echo "🔍 Validating fix implementation..."

# Health checks
for i in {1..10}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" https://security.candlefish.ai/api/health)
  if [ "$status" = "200" ]; then
    echo "✅ Health check passed ($i/10)"
  else
    echo "❌ Health check failed ($i/10) - Status: $status"
  fi
  sleep 6
done

# Synthetic transaction test
cd __tests__/performance/k6
k6 run security-dashboard-production-load-test.js --vus 10 --duration 5m
```

### Phase 7: Communication and Closure

#### 7.1 Status Updates

```bash
# Resolution notification
SLACK_RESOLUTION="✅ INCIDENT RESOLVED - $INCIDENT_ID
Duration: $(( $(date +%s) - $START_TIME )) seconds
Root Cause: [Brief description]
Fix: [Brief description of fix]
Next Steps: Post-incident review scheduled
Thank you to the response team! 👏"

curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"$SLACK_RESOLUTION\"}" \
  $SLACK_INCIDENT_WEBHOOK
```

#### 7.2 Post-Incident Review (PIR)

```bash
# Schedule PIR meeting
echo "📅 Post-Incident Review - $INCIDENT_ID" > pir-agenda.md
echo "Date: $(date -d 'tomorrow' '+%Y-%m-%d')" >> pir-agenda.md
echo "Time: 2:00 PM PST" >> pir-agenda.md
echo "" >> pir-agenda.md
echo "Agenda:" >> pir-agenda.md
echo "1. Timeline review" >> pir-agenda.md
echo "2. Root cause analysis" >> pir-agenda.md
echo "3. Response effectiveness" >> pir-agenda.md
echo "4. Action items" >> pir-agenda.md
echo "5. Process improvements" >> pir-agenda.md
```

## Incident Types and Specific Procedures

### Service Outage (P0)

#### Immediate Actions (0-5 minutes)

1. **Acknowledge and assess** - Confirm outage scope
2. **Declare P0 incident** - Notify all stakeholders
3. **Start incident bridge** - Coordinate response
4. **Check recent changes** - Identify potential causes
5. **Prepare for rollback** - Ready emergency procedures

#### Investigation Steps

```bash
# Check service availability
for endpoint in /health /ready /api/status; do
  echo "Testing $endpoint:"
  curl -v https://security.candlefish.ai$endpoint
done

# Check load balancer
aws elbv2 describe-target-health --target-group-arn $TARGET_GROUP_ARN

# Check pods
kubectl get pods -n security-dashboard -o wide
kubectl describe pods -l app=security-dashboard-backend -n security-dashboard
```

### Performance Issues (P1)

#### Investigation Checklist

- [ ] Check response time metrics
- [ ] Review resource utilization
- [ ] Analyze database performance
- [ ] Check external dependencies
- [ ] Review recent code changes
- [ ] Validate auto-scaling configuration

```bash
# Performance analysis
echo "🔍 Performance Analysis - $(date)"
echo "========================================"

# Response time metrics
echo "Current P95 Response Time:"
curl -s 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))' | jq -r '.data.result[0].value[1] // "N/A"'

# Resource utilization
echo "\nResource Utilization:"
kubectl top pods -n security-dashboard

# Database performance
echo "\nDatabase Connections:"
kubectl exec -it deployment/security-dashboard-backend -n security-dashboard -- \
  psql $DATABASE_URL -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"
```

### Security Incidents (P0)

#### Immediate Response

1. **Isolate affected systems** - Network segmentation
2. **Preserve evidence** - Log collection, system snapshots
3. **Assess data exposure** - Check for data breaches
4. **Notify security team** - Escalate to CISO
5. **Engage legal/compliance** - Regulatory requirements

```bash
# Security incident response
echo "🛡️ SECURITY INCIDENT RESPONSE"
echo "Incident ID: $INCIDENT_ID"
echo "Started: $(date)"

# Collect security logs
kubectl logs -l app=security-dashboard-backend -n security-dashboard --since=1h | \
  grep -E '(failed|unauthorized|breach|attack)' > security-events.log

# Check for suspicious activities
echo "Recent failed logins:"
grep 'authentication_failed' security-events.log | tail -10

# Network isolation if needed
# kubectl apply -f emergency-network-policy.yaml
```

### Database Issues (P1)

#### Database Health Checks

```bash
# Connection test
kubectl exec -it deployment/security-dashboard-backend -n security-dashboard -- \
  psql $DATABASE_URL -c "SELECT 1;"

# Replication status
kubectl exec -it deployment/security-dashboard-backend -n security-dashboard -- \
  psql $DATABASE_URL -c "SELECT * FROM pg_stat_replication;"

# Lock analysis
kubectl exec -it deployment/security-dashboard-backend -n security-dashboard -- \
  psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE granted = false;"

# Performance metrics
kubectl exec -it deployment/security-dashboard-backend -n security-dashboard -- \
  psql $DATABASE_URL -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

## Communication Templates

### Initial Incident Notification

```
🚨 INCIDENT DECLARED - [P0/P1] Security Dashboard

Severity: [P0/P1/P2]
Status: Investigating
Impact: [Brief description of user impact]
Affected Services: Security Dashboard
Started: [Timestamp]
Incident Commander: @[username]
Response Team: @[team-members]

Incident Bridge: [Meeting link]
Status Page: https://status.candlefish.ai
Runbook: [Link to this playbook]

Next update in 15 minutes.
```

### Progress Update

```
📋 INCIDENT UPDATE - [Incident ID]

Status: [Investigating/Identified/Fixing/Monitoring]
Duration: [X minutes]
Progress: [Brief description of progress]
ETA to Resolution: [Estimate if available]
Next Steps: [What's being done next]

Next update in 15 minutes or when status changes.
```

### Resolution Notification

```
✅ INCIDENT RESOLVED - [Incident ID]

Duration: [Total duration]
Root Cause: [Brief technical explanation]
Fix Applied: [What was done to resolve]
Validation: [How we confirmed the fix]

Services are now fully operational.
Post-incident review scheduled for [Date/Time].

Thank you to everyone who helped resolve this incident! 👏
```

## Escalation Matrix

### P0 - Critical

| Time | Action | Stakeholder |
|------|--------|-----------|
| Immediate | PagerDuty alert | On-call Engineer |
| +5 minutes | Slack notification | Engineering Team |
| +10 minutes | Email notification | Engineering Manager |
| +20 minutes | Phone call | Director of Engineering |
| +30 minutes | Executive briefing | CTO/CEO |

### P1 - High

| Time | Action | Stakeholder |
|------|--------|-----------|
| Immediate | PagerDuty alert | On-call Engineer |
| +15 minutes | Slack notification | Engineering Team |
| +1 hour | Email notification | Engineering Manager |
| +4 hours | Status review | Director of Engineering |

## Tools and Resources

### Monitoring and Alerting

- **Grafana**: https://grafana.security.candlefish.ai
- **Prometheus**: https://prometheus.security.candlefish.ai
- **PagerDuty**: https://candlefish.pagerduty.com
- **AWS CloudWatch**: AWS Console
- **Kubernetes Dashboard**: https://k8s.candlefish.ai

### Communication

- **Slack Channels**: #incidents, #platform-alerts, #security-alerts
- **Incident Bridge**: Google Meet (created on-demand)
- **Status Page**: https://status.candlefish.ai
- **Documentation**: GitHub Wiki

### Emergency Contacts

| Role | Primary | Backup |
|------|---------|--------|
| On-call Engineer | PagerDuty | Slack @oncall |
| Engineering Manager | [Email] | [Phone] |
| Director of Engineering | [Email] | [Phone] |
| Security Team | security@candlefish.ai | Slack #security-alerts |
| Legal/Compliance | legal@candlefish.ai | [Phone] |

## Post-Incident Activities

### Action Item Tracking

```bash
# Create action items in GitHub
gh issue create --title "[PIR] $INCIDENT_ID: Improve monitoring for [component]" \
  --body "Action item from post-incident review for $INCIDENT_ID" \
  --label "post-incident-review,improvement"
```

### Process Improvements

1. **Runbook Updates** - Based on lessons learned
2. **Monitoring Enhancements** - Fill detection gaps
3. **Automation Opportunities** - Reduce manual steps
4. **Training Needs** - Team knowledge gaps
5. **Tool Improvements** - Better incident response tools

### Documentation Updates

- Update incident response procedures
- Enhance troubleshooting guides
- Improve monitoring dashboards
- Refine alerting thresholds
- Update emergency contact information

---

## Quick Reference

### Emergency Commands

```bash
# Health check
curl -f https://security.candlefish.ai/api/health

# Emergency rollback
scripts/deployment/rollback-procedures.sh emergency-rollback

# Scale up quickly
kubectl scale deployment security-dashboard-backend --replicas=10 -n security-dashboard

# Check recent deployments
gh run list --workflow=security-dashboard-production-deploy.yml --limit 5

# View logs
kubectl logs -l app=security-dashboard-backend -n security-dashboard -f

# Port forward to Prometheus
kubectl port-forward svc/prometheus-stack-prometheus 9090:9090 -n monitoring
```

### Critical Metrics Queries

```promql
# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Response time P95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Service availability
up{job="security-dashboard-backend"}

# Database connections
security_dashboard_db_connections_active

# Memory usage
process_resident_memory_bytes{job="security-dashboard-backend"}
```

---

*This incident response playbook is maintained by the Platform Engineering team. Last updated: $(date +'%Y-%m-%d')*
*For emergency assistance, contact the on-call engineer via PagerDuty or Slack #incidents*
