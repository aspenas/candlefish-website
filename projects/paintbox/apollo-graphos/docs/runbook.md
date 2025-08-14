# Paintbox Apollo GraphOS - Operations Runbook

## Emergency Response

### 🚨 Production Down (P0)

**Symptoms**: Complete service unavailability, all health checks failing
**Response Time**: Immediate (< 5 minutes)

#### Immediate Actions
```bash
# 1. Check overall system status
kubectl get pods -n paintbox
kubectl get svc -n paintbox
kubectl get ingress -n paintbox

# 2. Check load balancer health
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:...

# 3. Verify DNS resolution
nslookup paintbox.candlefish.ai
nslookup api.paintbox.candlefish.ai

# 4. Check certificates
echo | openssl s_client -connect paintbox.candlefish.ai:443 -servername paintbox.candlefish.ai 2>/dev/null | openssl x509 -noout -dates
```

#### Recovery Steps
```bash
# If pods are failing:
kubectl rollout restart deployment/apollo-router -n paintbox
kubectl rollout restart deployment/frontend -n paintbox

# If ingress is down:
kubectl delete ingress paintbox-ingress -n paintbox
kubectl apply -f k8s/ingress.yaml -n paintbox

# If load balancer is unhealthy:
# Check target group health in AWS Console
# Verify security groups allow traffic on ports 80/443
```

### 🔥 High Error Rate (P1)

**Symptoms**: Error rate > 10%, users experiencing failures
**Response Time**: < 15 minutes

#### Investigation
```bash
# Check Apollo Router errors
kubectl logs deployment/apollo-router -n paintbox --tail=100 | grep -i error

# Check subgraph health
for service in estimates customers projects integrations; do
  kubectl exec -it deployment/apollo-router -n paintbox -- curl -s http://${service}-subgraph:400X/.well-known/apollo/server-health
done

# Check database connections
kubectl logs deployment/estimates-subgraph -n paintbox --tail=50 | grep -i "database\|connection\|error"
```

#### Resolution
```bash
# Restart unhealthy services
kubectl rollout restart deployment/SERVICE-NAME -n paintbox

# Scale up if needed
kubectl scale deployment/apollo-router --replicas=5 -n paintbox

# Check Apollo Studio for GraphQL errors
# Visit: https://studio.apollographql.com/graph/paintbox
```

### ⚠️ Performance Degradation (P2)

**Symptoms**: Response times > 2s, slow queries
**Response Time**: < 30 minutes

#### Investigation
```bash
# Check response times
kubectl logs deployment/apollo-router -n paintbox | grep "response_time"

# Check resource usage
kubectl top pods -n paintbox
kubectl describe nodes

# Check database performance
aws rds describe-db-instances --db-instance-identifier paintbox-estimates-production --query 'DBInstances[0].DBInstanceStatus'
```

#### Optimization
```bash
# Scale services horizontally
kubectl scale deployment/SERVICE-NAME --replicas=X -n paintbox

# Check for resource constraints
kubectl describe pod POD-NAME -n paintbox

# Monitor cache hit rates in Redis
kubectl exec -it deployment/apollo-router -n paintbox -- redis-cli info stats
```

## Service-Specific Troubleshooting

### Apollo Router Issues

#### Router Not Starting
```bash
# Check configuration
kubectl logs deployment/apollo-router -n paintbox
kubectl describe configmap apollo-router-config -n paintbox

# Verify supergraph schema
kubectl exec -it deployment/apollo-router -n paintbox -- cat /app/supergraph-schema.graphql

# Common fixes:
# - Invalid supergraph schema
# - Missing environment variables
# - Network connectivity to subgraphs
```

#### Query Planning Errors
```bash
# Check Apollo Studio for composition errors
rover supergraph compose --config supergraph-config.yaml

# Validate individual subgraph schemas
for service in estimates customers projects integrations; do
  rover subgraph check paintbox@main --schema ./subgraph-${service}/schema.graphql --name ${service}
done
```

### Subgraph Issues

#### Database Connection Failures
```bash
# Test database connectivity
kubectl exec -it deployment/SERVICE-subgraph -n paintbox -- nc -zv DATABASE-HOST 5432

# Check secrets
kubectl get secret database-credentials -n paintbox -o yaml

# Verify RDS instance status
aws rds describe-db-instances --query 'DBInstances[?DBName==`paintbox_SERVICE`].[DBInstanceIdentifier,DBInstanceStatus]'

# Common fixes:
# - Restart database instance
# - Check security group rules
# - Verify connection string format
# - Check database disk space
```

#### Salesforce Integration Issues
```bash
# Check Salesforce API connectivity
kubectl logs deployment/customers-subgraph -n paintbox | grep -i salesforce

# Test Salesforce credentials
kubectl exec -it deployment/customers-subgraph -n paintbox -- curl -X POST https://login.salesforce.com/services/oauth2/token \
  -d "grant_type=password&client_id=CLIENT_ID&client_secret=CLIENT_SECRET&username=USERNAME&password=PASSWORD"

# Common issues:
# - Expired security token
# - API rate limits
# - Authentication failures
```

#### Company Cam Integration Issues
```bash
# Check Company Cam API status
kubectl logs deployment/projects-subgraph -n paintbox | grep -i "company.cam\|companycam"

# Test API connectivity
kubectl exec -it deployment/projects-subgraph -n paintbox -- curl -H "Authorization: Bearer API_KEY" https://api.companycam.com/v2/projects

# Common issues:
# - Invalid API credentials
# - Webhook endpoint not reachable
# - Photo upload failures
```

### Frontend Issues

#### Static Assets Not Loading
```bash
# Check nginx configuration
kubectl exec -it deployment/frontend -n paintbox -- nginx -t

# Check nginx logs
kubectl logs deployment/frontend -n paintbox

# Verify CDN/CloudFront distribution (if used)
aws cloudfront list-distributions --query 'DistributionList.Items[?Comment==`paintbox-frontend`]'
```

#### WebSocket Connection Failures
```bash
# Test WebSocket endpoint
wscat -c wss://api.paintbox.candlefish.ai/graphql -s graphql-ws

# Check router WebSocket configuration
kubectl logs deployment/apollo-router -n paintbox | grep -i websocket

# Common issues:
# - Load balancer not configured for WebSocket
# - Security groups blocking WebSocket traffic
# - Router WebSocket settings incorrect
```

## Database Operations

### Backup Operations
```bash
# Create manual RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier paintbox-SERVICE-production \
  --db-snapshot-identifier manual-snapshot-$(date +%Y%m%d-%H%M)

# List recent snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier paintbox-SERVICE-production \
  --snapshot-type manual \
  --max-items 5
```

### Database Maintenance
```bash
# Check database size and connections
kubectl exec -it deployment/SERVICE-subgraph -n paintbox -- psql $DATABASE_URL -c "
SELECT 
  datname,
  pg_size_pretty(pg_database_size(datname)) as size,
  numbackends as connections
FROM pg_stat_database 
WHERE datname = 'paintbox_SERVICE';"

# Check long-running queries
kubectl exec -it deployment/SERVICE-subgraph -n paintbox -- psql $DATABASE_URL -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"
```

### Database Recovery
```bash
# Restore from snapshot (CAUTION: This will replace the database)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier paintbox-SERVICE-restored \
  --db-snapshot-identifier SNAPSHOT-ID

# Point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
  --db-instance-identifier paintbox-SERVICE-pitr \
  --source-db-instance-identifier paintbox-SERVICE-production \
  --restore-time 2023-XX-XXTXX:XX:XX.000Z
```

## Cache Operations

### Redis Troubleshooting
```bash
# Check Redis connectivity
kubectl exec -it deployment/apollo-router -n paintbox -- redis-cli ping

# Monitor Redis performance
kubectl exec -it deployment/apollo-router -n paintbox -- redis-cli info stats
kubectl exec -it deployment/apollo-router -n paintbox -- redis-cli info memory

# Check cache hit rates
kubectl exec -it deployment/apollo-router -n paintbox -- redis-cli info stats | grep hits
```

### Cache Invalidation
```bash
# Clear all cache
kubectl exec -it deployment/apollo-router -n paintbox -- redis-cli flushall

# Clear specific cache patterns
kubectl exec -it deployment/apollo-router -n paintbox -- redis-cli --scan --pattern "paintbox:customers:*" | xargs redis-cli del
```

## Monitoring and Alerting

### Check Alert Status
```bash
# Check active alerts
kubectl port-forward -n monitoring svc/alertmanager 9093:9093 &
curl http://localhost:9093/api/v1/alerts

# Silence alerts temporarily
curl -X POST http://localhost:9093/api/v1/silences \
  -H "Content-Type: application/json" \
  -d '{"matchers":[{"name":"alertname","value":"HighErrorRate"}],"startsAt":"2023-XX-XXTXX:XX:XX.000Z","endsAt":"2023-XX-XXTXX:XX:XX.000Z","comment":"Investigating issue"}'
```

### Performance Monitoring
```bash
# Check service metrics
kubectl port-forward -n monitoring svc/prometheus-server 9090:80 &

# Key queries:
# - Response time: histogram_quantile(0.95, rate(apollo_router_http_request_duration_seconds_bucket[5m]))
# - Error rate: rate(apollo_router_http_requests_total{status=~"5.."}[5m]) / rate(apollo_router_http_requests_total[5m])
# - Request rate: rate(apollo_router_http_requests_total[5m])
```

## Security Incidents

### Suspected Security Breach
```bash
# 1. Immediately rotate all API keys
kubectl delete secret external-api-keys -n paintbox
kubectl apply -f k8s/secrets.yaml -n paintbox

# 2. Check access logs
kubectl logs deployment/apollo-router -n paintbox | grep -E "(40[0-9]|401|403)"

# 3. Review recent deployments
kubectl rollout history deployment/apollo-router -n paintbox

# 4. Check for unusual traffic patterns
# Review CloudWatch logs and metrics
aws logs filter-log-events --log-group-name /aws/apigateway/paintbox --filter-pattern "ERROR"
```

### Certificate Expiration
```bash
# Check certificate status
kubectl get certificates -n paintbox
kubectl describe certificate paintbox-tls -n paintbox

# Force certificate renewal
kubectl annotate certificate paintbox-tls -n paintbox cert-manager.io/force-renewal="true"

# Manual certificate check
echo | openssl s_client -connect paintbox.candlefish.ai:443 -servername paintbox.candlefish.ai 2>/dev/null | openssl x509 -noout -dates
```

## Scaling Operations

### Horizontal Scaling
```bash
# Scale individual services
kubectl scale deployment/SERVICE-NAME --replicas=X -n paintbox

# Update HPA settings
kubectl edit hpa SERVICE-NAME-hpa -n paintbox

# Check current resource usage
kubectl top pods -n paintbox
kubectl describe nodes
```

### Vertical Scaling
```bash
# Update resource limits
kubectl patch deployment SERVICE-NAME -n paintbox -p '{"spec":{"template":{"spec":{"containers":[{"name":"SERVICE-NAME","resources":{"limits":{"memory":"1Gi","cpu":"1000m"}}}]}}}}'

# Monitor resource usage after scaling
kubectl top pods -n paintbox --sort-by=memory
kubectl top pods -n paintbox --sort-by=cpu
```

## Disaster Recovery

### Complete Infrastructure Recovery
```bash
# 1. Restore from Terraform state
cd terraform
terraform plan -refresh=true
terraform apply

# 2. Restore database from snapshots
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier paintbox-estimates-production \
  --db-snapshot-identifier LATEST-SNAPSHOT-ID

# 3. Redeploy applications
kubectl apply -f k8s/ -n paintbox

# 4. Verify all services
kubectl get pods -n paintbox
kubectl get services -n paintbox
```

### Data Recovery
```bash
# List available backups
aws rds describe-db-snapshots --db-instance-identifier paintbox-SERVICE-production

# Restore specific tables (if partial data loss)
kubectl exec -it deployment/SERVICE-subgraph -n paintbox -- pg_dump $DATABASE_URL --table=TABLE_NAME > table_backup.sql
kubectl exec -it deployment/SERVICE-subgraph -n paintbox -- psql $DATABASE_URL < table_backup.sql
```

## Communication Templates

### Incident Communication
```
INCIDENT: [Brief description]
STATUS: Investigating/Identified/Monitoring/Resolved
IMPACT: [User impact description]
START TIME: [UTC time]
SERVICES: [Affected services]
UPDATE: [What we know and what we're doing]
ETA: [Expected resolution time]
```

### Maintenance Window
```
MAINTENANCE WINDOW: [Date/Time UTC]
DURATION: [Expected duration]
SERVICES: [Services being updated]
IMPACT: [Expected user impact]
ROLLBACK PLAN: [How to rollback if issues occur]
```

## Escalation

### On-Call Escalation Path
1. **Level 1**: Platform Engineer (Primary On-Call)
2. **Level 2**: Senior Platform Engineer (Secondary On-Call)  
3. **Level 3**: Platform Lead
4. **Level 4**: CTO

### Contact Information
- **Primary On-Call**: +1-XXX-XXX-XXXX
- **Slack**: #paintbox-incidents
- **Email**: incidents@paintbox.candlefish.ai

### External Vendors
- **AWS Support**: [Case URL]
- **Apollo Support**: support@apollographql.com
- **Salesforce Support**: [Case management portal]

---

**Last Updated**: $(date)
**On-Call Rotation**: [Current on-call schedule]
