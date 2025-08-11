# Candlefish Collaboration System - Operations Runbook

## Table of Contents

1. [System Overview](#system-overview)
2. [Emergency Procedures](#emergency-procedures)
3. [Alert Response](#alert-response)
4. [Common Issues](#common-issues)
5. [Scaling Procedures](#scaling-procedures)
6. [Backup and Recovery](#backup-and-recovery)
7. [Performance Tuning](#performance-tuning)
8. [Security Incident Response](#security-incident-response)

## System Overview

### Architecture Summary

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Users/Apps    │ -> │   AWS ALB        │ -> │   EKS Cluster   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────────────────────┼─────────────────────────────────┐
                       │                                 │                                 │
                ┌─────────────┐                   ┌─────────────┐                  ┌─────────────┐
                │  Frontend   │                   │  GraphQL    │                  │ WebSocket   │
                │ (Next.js)   │                   │    API      │                  │  Service    │
                └─────────────┘                   └─────────────┘                  └─────────────┘
                       │                                 │                                 │
                ┌─────────────┐                   ┌─────────────────────────────────────────────────┐
                │  Document   │                   │              Data Layer                         │
                │  Service    │                   │  ┌─────────────┐        ┌─────────────┐       │
                └─────────────┘                   │  │ PostgreSQL  │        │   Redis     │       │
                                                  │  │    RDS      │        │ ElastiCache │       │
                                                  │  └─────────────┘        └─────────────┘       │
                                                  └─────────────────────────────────────────────────┘
```

### Key Metrics

- **SLA**: 99.9% uptime
- **RTO**: 4 hours
- **RPO**: 15 minutes
- **Max Response Time**: 2 seconds (95th percentile)
- **Max WebSocket Connection Time**: 100ms

### Critical Dependencies

- AWS EKS cluster
- RDS PostgreSQL database
- ElastiCache Redis cluster
- AWS ALB/NLB load balancers
- Route53 DNS
- ACM certificates

## Emergency Procedures

### 1. Complete System Outage

**Symptoms:** All services returning 5xx errors, no user access

**Immediate Actions (0-5 minutes):**

1. **Confirm the outage:**
```bash
# Check service status
kubectl get pods -n collaboration
curl -I https://editor.candlefish.ai
curl -I https://api.candlefish.ai/health
```

2. **Check infrastructure:**
```bash
# Check EKS cluster status
aws eks describe-cluster --name candlefish-collaboration --region us-east-1

# Check RDS status
aws rds describe-db-instances --db-instance-identifier candlefish-collaboration-db

# Check ALB status
aws elbv2 describe-load-balancers --names candlefish-collaboration-alb
```

3. **Update status page:** https://status.candlefish.ai
4. **Page on-call team:** Use PagerDuty or direct phone call

**Investigation (5-15 minutes):**

```bash
# Check cluster nodes
kubectl get nodes

# Check system pods
kubectl get pods -n kube-system

# Check recent deployments
kubectl rollout history deployment -n collaboration

# Check AWS service health
aws health describe-events --filter services=EKS,RDS,EC2
```

**Recovery Actions:**

If cluster is healthy but applications are down:
```bash
# Restart all deployments
kubectl rollout restart deployment -n collaboration

# Check for resource exhaustion
kubectl top nodes
kubectl top pods -n collaboration
```

If cluster nodes are unhealthy:
```bash
# Drain and replace unhealthy nodes
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
aws ec2 terminate-instances --instance-ids <instance-id>
# ASG will automatically replace the node
```

If database is down:
```bash
# Check RDS status and failover if Multi-AZ
aws rds describe-db-instances --db-instance-identifier candlefish-collaboration-db
aws rds failover-db-cluster --db-cluster-identifier candlefish-collaboration-cluster
```

### 2. Database Outage

**Symptoms:** Applications can't connect to database

**Immediate Actions:**

1. **Check database status:**
```bash
aws rds describe-db-instances --db-instance-identifier candlefish-collaboration-db
```

2. **Test connectivity from cluster:**
```bash
kubectl run postgres-test --rm -i --tty \
  --image postgres:15-alpine \
  --env="PGPASSWORD=$DB_PASSWORD" \
  -- psql -h $DB_HOST -U collaboration_user -d collaboration_db -c "SELECT 1;"
```

3. **Check for automated failover (if Multi-AZ):**
```bash
aws rds describe-events --source-identifier candlefish-collaboration-db --source-type db-instance
```

**Recovery Actions:**

If database is stuck:
```bash
# Reboot database instance
aws rds reboot-db-instance --db-instance-identifier candlefish-collaboration-db
```

If database is corrupted and needs restoration:
```bash
# Restore from latest automated backup
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier candlefish-collaboration-db \
  --target-db-instance-identifier candlefish-collaboration-db-restored \
  --restore-time $(date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%S.%3NZ)
```

### 3. High Memory/CPU Usage

**Symptoms:** Slow response times, pod restarts, OOM kills

**Investigation:**
```bash
# Check resource usage
kubectl top pods -n collaboration --sort-by=memory
kubectl top nodes

# Check for memory leaks
kubectl describe pod <high-memory-pod> -n collaboration

# Check application metrics
curl https://api.candlefish.ai/metrics | grep memory
```

**Immediate Actions:**
```bash
# Scale up immediately
kubectl scale deployment <deployment-name> --replicas=10 -n collaboration

# If nodes are at capacity, scale cluster
aws eks update-nodegroup-config \
  --cluster-name candlefish-collaboration \
  --nodegroup-name general \
  --scaling-config minSize=5,maxSize=20,desiredSize=10
```

### 4. WebSocket Connection Issues

**Symptoms:** Real-time features not working, connection drops

**Investigation:**
```bash
# Check WebSocket service status
kubectl get pods -l app=websocket-service -n collaboration
kubectl logs -l app=websocket-service -n collaboration --tail=100

# Check connection metrics
curl https://ws.candlefish.ai/metrics | grep websocket_active_connections

# Test WebSocket connectivity
wscat -c wss://ws.candlefish.ai/graphql
```

**Recovery Actions:**
```bash
# Restart WebSocket services
kubectl rollout restart deployment websocket-service -n collaboration

# Scale WebSocket services if needed
kubectl scale deployment websocket-service --replicas=5 -n collaboration

# Check load balancer configuration
aws elbv2 describe-target-groups --names candlefish-websocket-tg
```

## Alert Response

### GraphQL API Alerts

#### High Error Rate (>5%)
```bash
# Check application logs
kubectl logs -l app=graphql-api -n collaboration --since=10m | grep ERROR

# Check database connection pool
kubectl exec -it <graphql-pod> -n collaboration -- curl localhost:4000/metrics | grep db_connections

# Scale if needed
kubectl scale deployment graphql-api --replicas=5 -n collaboration
```

#### High Latency (>2s p95)
```bash
# Check slow queries
kubectl exec -it postgres-0 -n collaboration -- \
  psql -U collaboration_user -d collaboration_db \
  -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check cache hit rate
kubectl exec -it redis-0 -n collaboration -- redis-cli info stats | grep keyspace
```

### Database Alerts

#### High Connection Count (>160)
```bash
# Check active connections
kubectl exec -it postgres-0 -n collaboration -- \
  psql -U collaboration_user -d collaboration_db \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Kill long-running queries
kubectl exec -it postgres-0 -n collaboration -- \
  psql -U collaboration_user -d collaboration_db \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes';"
```

#### Slow Queries Detected
```bash
# Identify slow queries
kubectl exec -it postgres-0 -n collaboration -- \
  psql -U collaboration_user -d collaboration_db \
  -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements WHERE mean_exec_time > 1000 ORDER BY mean_exec_time DESC;"

# Check for missing indexes
kubectl exec -it postgres-0 -n collaboration -- \
  psql -U collaboration_user -d collaboration_db \
  -c "SELECT schemaname, tablename, attname, n_distinct, correlation FROM pg_stats WHERE n_distinct > 100 AND correlation < 0.1;"
```

### Redis Alerts

#### High Memory Usage (>90%)
```bash
# Check memory usage
kubectl exec -it redis-0 -n collaboration -- redis-cli info memory

# Find large keys
kubectl exec -it redis-0 -n collaboration -- redis-cli --bigkeys

# Clear expired keys
kubectl exec -it redis-0 -n collaboration -- redis-cli FLUSHEXPIRED
```

### Kubernetes Alerts

#### Pod Crash Looping
```bash
# Check pod status
kubectl describe pod <pod-name> -n collaboration

# Check previous logs
kubectl logs <pod-name> -n collaboration --previous

# Check resource limits
kubectl get pod <pod-name> -n collaboration -o yaml | grep -A 10 resources
```

#### Node High CPU/Memory
```bash
# Check node status
kubectl describe node <node-name>

# Check system processes
kubectl debug node/<node-name> -it --image=ubuntu -- chroot /host top

# Drain node if necessary
kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
```

## Common Issues

### 1. Application Won't Start

**Problem:** Pods stuck in `CrashLoopBackOff` or `Error` state

**Diagnosis:**
```bash
kubectl describe pod <pod-name> -n collaboration
kubectl logs <pod-name> -n collaboration
kubectl get events -n collaboration --sort-by='.lastTimestamp'
```

**Common Causes and Solutions:**

- **Missing secrets:**
```bash
kubectl get secrets -n collaboration
kubectl describe secret <secret-name> -n collaboration
```

- **Database connection issues:**
```bash
kubectl run database-test --rm -i --tty \
  --image postgres:15-alpine \
  --env="PGPASSWORD=$DB_PASSWORD" \
  -- psql -h $DB_HOST -U collaboration_user -d collaboration_db
```

- **Insufficient resources:**
```bash
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### 2. Slow API Responses

**Problem:** API response times exceed SLA thresholds

**Diagnosis:**
```bash
# Check application metrics
curl https://api.candlefish.ai/metrics | grep -E "(response_time|request_duration)"

# Check database performance
kubectl exec -it postgres-0 -n collaboration -- \
  psql -U collaboration_user -d collaboration_db \
  -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

**Solutions:**
- Add database indexes for slow queries
- Scale application pods
- Enable query caching
- Optimize database parameters

### 3. WebSocket Connections Failing

**Problem:** Real-time features not working

**Diagnosis:**
```bash
# Test WebSocket connectivity
kubectl port-forward service/websocket-service 4001:4001 -n collaboration &
wscat -c ws://localhost:4001/graphql

# Check load balancer configuration
kubectl describe ingress collaboration-ingress -n collaboration
```

**Solutions:**
- Verify load balancer supports WebSockets
- Check session affinity settings
- Verify firewall rules
- Scale WebSocket service

### 4. File Upload Issues

**Problem:** Users cannot upload files

**Diagnosis:**
```bash
# Check S3 connectivity
kubectl run s3-test --rm -i --tty \
  --image amazon/aws-cli \
  --env="AWS_ACCESS_KEY_ID=$ACCESS_KEY" \
  --env="AWS_SECRET_ACCESS_KEY=$SECRET_KEY" \
  -- aws s3 ls s3://candlefish-collaboration-documents/

# Check document service logs
kubectl logs -l app=document-service -n collaboration | grep upload
```

**Solutions:**
- Verify S3 bucket permissions
- Check IAM roles and policies
- Verify file size limits
- Check network connectivity to S3

## Scaling Procedures

### Horizontal Pod Autoscaling (HPA)

**Check current HPA status:**
```bash
kubectl get hpa -n collaboration
kubectl describe hpa <hpa-name> -n collaboration
```

**Manually scale deployments:**
```bash
# Scale specific deployment
kubectl scale deployment graphql-api --replicas=10 -n collaboration

# Scale all deployments
for deployment in $(kubectl get deployments -n collaboration -o name); do
  kubectl scale $deployment --replicas=5 -n collaboration
done
```

### Cluster Autoscaling

**Check node group status:**
```bash
aws eks describe-nodegroup \
  --cluster-name candlefish-collaboration \
  --nodegroup-name general
```

**Manually scale node groups:**
```bash
aws eks update-nodegroup-config \
  --cluster-name candlefish-collaboration \
  --nodegroup-name general \
  --scaling-config minSize=3,maxSize=20,desiredSize=6
```

### Database Scaling

**Scale RDS read replicas:**
```bash
# Create additional read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier candlefish-collaboration-db-replica-3 \
  --source-db-instance-identifier candlefish-collaboration-db
```

**Scale Redis cluster:**
```bash
# Add nodes to Redis cluster
aws elasticache modify-replication-group \
  --replication-group-id candlefish-collaboration-redis \
  --num-cache-clusters 5 \
  --apply-immediately
```

## Backup and Recovery

### Database Backup

**Create manual backup:**
```bash
aws rds create-db-snapshot \
  --db-instance-identifier candlefish-collaboration-db \
  --db-snapshot-identifier manual-backup-$(date +%Y%m%d-%H%M%S)
```

**Restore from backup:**
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier candlefish-collaboration-db-restored \
  --db-snapshot-identifier manual-backup-20240101-120000
```

### Application Configuration Backup

**Export current configuration:**
```bash
kubectl get all,configmap,secret,ingress,pvc -n collaboration -o yaml > \
  collaboration-backup-$(date +%Y%m%d).yaml
```

**Restore configuration:**
```bash
kubectl apply -f collaboration-backup-20240101.yaml
```

### Disaster Recovery

**Complete cluster rebuild:**
```bash
# 1. Save current state
kubectl get all --all-namespaces -o yaml > cluster-backup.yaml

# 2. Restore infrastructure with Terraform
cd deployment/terraform/collaboration
terraform apply -var-file=terraform.tfvars

# 3. Restore applications
helm install collaboration deployment/helm/candlefish-collaboration \
  --namespace collaboration \
  --create-namespace \
  --values values-production.yaml
```

## Performance Tuning

### Database Optimization

**Analyze query performance:**
```bash
kubectl exec -it postgres-0 -n collaboration -- \
  psql -U collaboration_user -d collaboration_db \
  -c "SELECT query, mean_exec_time, calls, total_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;"
```

**Update database statistics:**
```bash
kubectl exec -it postgres-0 -n collaboration -- \
  psql -U collaboration_user -d collaboration_db \
  -c "ANALYZE;"
```

**Add missing indexes:**
```bash
kubectl exec -it postgres-0 -n collaboration -- \
  psql -U collaboration_user -d collaboration_db \
  -c "CREATE INDEX CONCURRENTLY idx_documents_updated_at ON documents(updated_at);"
```

### Application Performance

**Profile memory usage:**
```bash
kubectl exec -it <pod-name> -n collaboration -- \
  curl localhost:4000/debug/pprof/heap > heap.prof

# Analyze with pprof tools
```

**Monitor garbage collection:**
```bash
kubectl exec -it <pod-name> -n collaboration -- \
  curl localhost:4000/metrics | grep go_gc
```

### Cache Optimization

**Monitor Redis hit rates:**
```bash
kubectl exec -it redis-0 -n collaboration -- \
  redis-cli info stats | grep keyspace_hits
```

**Optimize cache keys:**
```bash
# Find frequently accessed keys
kubectl exec -it redis-0 -n collaboration -- \
  redis-cli --hotkeys
```

## Security Incident Response

### Suspected Breach

**Immediate Actions:**

1. **Isolate affected systems:**
```bash
# Scale down affected deployments
kubectl scale deployment <affected-deployment> --replicas=0 -n collaboration

# Block suspicious IPs
kubectl patch networkpolicy collaboration-network-policy -n collaboration \
  --type='json' -p='[{"op": "add", "path": "/spec/ingress/0/from/0/ipBlock/except/-", "value": "suspicious.ip.address/32"}]'
```

2. **Preserve evidence:**
```bash
# Capture logs
kubectl logs <affected-pod> -n collaboration > incident-logs-$(date +%Y%m%d-%H%M%S).log

# Export pod specifications
kubectl get pod <affected-pod> -n collaboration -o yaml > incident-pod-spec.yaml
```

3. **Change credentials:**
```bash
# Rotate all secrets
aws secretsmanager update-secret \
  --secret-id candlefish/collaboration/app-secrets \
  --secret-string '{"jwt_secret": "new-jwt-secret"}'

# Force pod restart to pick up new secrets
kubectl rollout restart deployment -n collaboration
```

### DDoS Attack

**Mitigation:**
```bash
# Enable AWS WAF rate limiting
aws wafv2 update-rule-group \
  --scope CLOUDFRONT \
  --id <rule-group-id> \
  --rules file://rate-limit-rule.json

# Scale up to handle legitimate traffic
kubectl scale deployment collaboration-editor --replicas=20 -n collaboration
```

### Data Breach

**Response:**
1. Immediately isolate the database
2. Review access logs
3. Notify security team and stakeholders
4. Begin forensic analysis
5. Prepare incident report

## Contact Information

### On-call Escalation

1. **Primary On-call:** +1-555-0001
2. **Secondary On-call:** +1-555-0002
3. **Engineering Manager:** +1-555-0003
4. **CTO:** +1-555-0004

### Team Contacts

- **DevOps Team:** devops@candlefish.ai
- **Security Team:** security@candlefish.ai
- **Database Team:** database@candlefish.ai
- **Frontend Team:** frontend@candlefish.ai
- **Backend Team:** backend@candlefish.ai

### External Contacts

- **AWS Support:** Use AWS Support Center
- **PagerDuty:** https://candlefish.pagerduty.com
- **Slack Emergency:** #incident-response

Remember: This runbook should be updated regularly and all team members should be familiar with these procedures. Practice these scenarios during regular fire drills.
