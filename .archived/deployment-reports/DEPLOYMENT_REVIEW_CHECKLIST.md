# Deployment Review Checklist & Guide
## Week 2-3 Implementation Review

## 📋 Pre-Deployment Review Checklist

### 1. **Infrastructure Review**

#### RDS PostgreSQL (`/infrastructure/terraform/rds-postgresql.tf`)
- [ ] Review instance sizes - Currently: db.r6g.xlarge ($340/month)
  - [ ] Confirm this matches your workload requirements
  - [ ] Consider starting with db.r6g.large ($170/month) if lower traffic
- [ ] Verify Multi-AZ is needed (adds ~40% cost but critical for production)
- [ ] Check backup retention (currently 30 days)
- [ ] Review security group rules
- [ ] Confirm VPC and subnet configurations exist

**Decision Points:**
```yaml
Questions to Answer:
1. Current database size: _____ GB
2. Current connection count peak: _____
3. Acceptable downtime for maintenance: _____
4. Budget for RDS: $_____ /month
5. Need cross-region failover? Yes/No
```

#### ElastiCache Redis (`/infrastructure/terraform/elasticache-redis.tf`)
- [ ] Review node type - Currently: cache.r7g.xlarge (26GB RAM)
  - [ ] Calculate actual cache size needs
  - [ ] Consider cache.r7g.large (13GB) if smaller dataset
- [ ] Verify 3 nodes needed (vs 2 for cost savings)
- [ ] Review encryption requirements (adds latency)
- [ ] Check auth token complexity requirements

**Decision Points:**
```yaml
Questions to Answer:
1. Expected cache dataset size: _____ GB
2. Peak requests per second: _____
3. Acceptable cache miss penalty: _____ ms
4. Need cluster mode (sharding)? Yes/No
```

#### PgBouncer Configuration (`/infrastructure/pgbouncer/`)
- [ ] Review connection pool sizes
- [ ] Verify pooling mode (transaction vs session)
- [ ] Check timeout settings
- [ ] Review logging verbosity

### 2. **Security Review**

#### Credentials & Secrets
- [ ] AWS Secrets Manager configured for:
  - [ ] RDS master password
  - [ ] Redis auth token
  - [ ] PgBouncer admin password
- [ ] IAM roles created with least privilege
- [ ] Network isolation verified (private subnets only)
- [ ] Encryption at rest enabled
- [ ] Encryption in transit enabled
- [ ] Security groups follow least privilege

#### Access Control Checklist
```bash
# Verify no public access
aws rds describe-db-instances --query 'DBInstances[?PubliclyAccessible==`true`].DBInstanceIdentifier'

# Check security group rules
aws ec2 describe-security-groups --group-ids <sg-id> --query 'SecurityGroups[*].IpPermissions'
```

### 3. **Cost Review**

#### Current Estimates vs Actual
| Service | Estimated | Actual | Notes |
|---------|-----------|--------|-------|
| RDS Main | $340/mo | TBD | Review after 1 week |
| RDS Replicas | $340/mo | TBD | Can start with 1 replica |
| ElastiCache | $620/mo | TBD | Consider smaller nodes |
| PgBouncer | $40/mo | TBD | Minimal cost |
| **Total** | **$1,385/mo** | **TBD** | |

#### Cost Optimization Options
- [ ] Reserved Instances (save 30-50%)
- [ ] Graviton instances (already selected)
- [ ] Savings Plans commitment
- [ ] Dev/test environments with smaller instances

### 4. **Performance Baseline**

#### Metrics to Capture Before Migration
```sql
-- Current database performance baseline
SELECT 
    'Queries' as metric,
    COUNT(*) as total,
    AVG(mean_exec_time) as avg_ms,
    MAX(mean_exec_time) as max_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY mean_exec_time) as p95_ms
FROM pg_stat_statements;

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Connection count
SELECT COUNT(*) FROM pg_stat_activity;
```

## 🚀 Deployment Guide

### Phase 1: Infrastructure Setup (Day 1)

#### Step 1: Terraform Preparation
```bash
# Clone and setup
cd /Users/patricksmith/candlefish-ai/infrastructure/terraform

# Initialize Terraform
terraform init

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
environment = "production"
db_name = "candlefish"
db_username = "candlefish_admin"
enable_redis_cluster_mode = false
EOF

# Review the plan
terraform plan -out=infrastructure.tfplan

# IMPORTANT: Review the plan output carefully
terraform show infrastructure.tfplan | less
```

#### Step 2: Deploy RDS First (2-3 hours)
```bash
# Deploy only RDS to start
terraform apply -target=aws_db_instance.main -auto-approve

# Wait for RDS to be available (15-20 minutes)
aws rds wait db-instance-available \
    --db-instance-identifier candlefish-postgres-main

# Get connection details
terraform output db_instance_endpoint
terraform output db_password_secret_arn

# Test connection
PGPASSWORD=$(aws secretsmanager get-secret-value \
    --secret-id $(terraform output -raw db_password_secret_arn) \
    --query SecretString \
    --output text | jq -r .password) \
psql -h $(terraform output -raw db_instance_address) \
    -U candlefish_admin -d postgres -c "SELECT version();"
```

#### Step 3: Database Migration (1-2 hours)
```bash
# Backup existing database
pg_dump -h OLD_HOST -U OLD_USER -d candlefish \
    -f candlefish_backup_$(date +%Y%m%d).sql

# Restore to RDS
PGPASSWORD=$NEW_PASSWORD psql -h $(terraform output -raw db_instance_address) \
    -U candlefish_admin -d candlefish \
    -f candlefish_backup_$(date +%Y%m%d).sql

# Apply optimizations
psql -h $(terraform output -raw db_instance_address) \
    -U candlefish_admin -d candlefish \
    -f ../database/optimization-scripts.sql

# Verify indexes created
psql -h $(terraform output -raw db_instance_address) \
    -U candlefish_admin -d candlefish \
    -c "SELECT indexname FROM pg_indexes WHERE schemaname = 'public';"
```

#### Step 4: Deploy Read Replicas (30 minutes)
```bash
# Add read replicas
terraform apply -target=aws_db_instance.read_replica_1 \
                -target=aws_db_instance.read_replica_2

# Wait for replicas
aws rds wait db-instance-available \
    --db-instance-identifier candlefish-postgres-read-1

aws rds wait db-instance-available \
    --db-instance-identifier candlefish-postgres-read-2

# Verify replication lag
aws cloudwatch get-metric-statistics \
    --namespace AWS/RDS \
    --metric-name ReplicaLag \
    --dimensions Name=DBInstanceIdentifier,Value=candlefish-postgres-read-1 \
    --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 60 \
    --statistics Average
```

### Phase 2: Connection Pooling (Day 1)

#### Step 5: Deploy PgBouncer
```bash
cd /Users/patricksmith/candlefish-ai/infrastructure/pgbouncer

# Build Docker image
docker build -t candlefish/pgbouncer:latest .

# Run locally for testing
docker run -d \
    --name pgbouncer-test \
    -p 6432:6432 \
    -e DB_HOST=$(terraform output -raw db_instance_address) \
    -e DB_USERNAME=candlefish_admin \
    -e DB_PASSWORD=$PGPASSWORD \
    -e DB_NAME=candlefish \
    candlefish/pgbouncer:latest

# Test connection through PgBouncer
psql -h localhost -p 6432 -U candlefish_admin -d candlefish_main \
    -c "SELECT 'Connected through PgBouncer';"

# Check PgBouncer stats
psql -h localhost -p 6432 -U pgbouncer_admin -d pgbouncer \
    -c "SHOW POOLS;"
```

### Phase 3: Caching Layer (Day 2)

#### Step 6: Deploy ElastiCache
```bash
# Deploy Redis cluster
terraform apply -target=aws_elasticache_replication_group.redis

# Wait for cluster (20-30 minutes)
aws elasticache wait cache-cluster-available \
    --cache-cluster-id candlefish-redis-cluster-001

# Get endpoints
terraform output redis_endpoint
terraform output redis_auth_secret_arn

# Test connection (from EC2 instance in same VPC)
redis-cli -h $(terraform output -raw redis_endpoint) \
          -p 6379 \
          --askpass \
          PING
```

### Phase 4: Application Integration (Day 2-3)

#### Step 7: Update Application Configuration
```typescript
// Update environment variables
export DATABASE_URL="postgresql://candlefish_admin:${DB_PASSWORD}@pgbouncer:6432/candlefish_main"
export DATABASE_READ_URL="postgresql://candlefish_admin:${DB_PASSWORD}@pgbouncer:6432/candlefish_read"
export REDIS_URL="rediss://:${REDIS_AUTH}@${REDIS_ENDPOINT}:6379"

// Update application code
// See integration examples in PATH_B_WEEK_2_3_COMPLETE.md
```

#### Step 8: Gradual Traffic Migration
```bash
# Step 1: Route 10% traffic to new infrastructure
# Update load balancer weights

# Step 2: Monitor for 1 hour
# Check CloudWatch dashboards
# Monitor application logs

# Step 3: Increase to 50%
# Continue monitoring

# Step 4: Full cutover
# Update DNS/load balancer to 100% new infrastructure
```

## 📊 Post-Deployment Validation

### Health Checks
```bash
# RDS Health
aws rds describe-db-instances \
    --db-instance-identifier candlefish-postgres-main \
    --query 'DBInstances[0].DBInstanceStatus'

# Redis Health
aws elasticache describe-cache-clusters \
    --cache-cluster-id candlefish-redis-cluster-001 \
    --query 'CacheClusters[0].CacheClusterStatus'

# Check CloudWatch Alarms
aws cloudwatch describe-alarms \
    --alarm-name-prefix "candlefish-" \
    --query 'MetricAlarms[?StateValue!=`OK`].[AlarmName,StateValue]'
```

### Performance Validation
```sql
-- Check query performance improvement
SELECT 
    calls,
    mean_exec_time,
    total_exec_time,
    query
FROM pg_stat_statements
WHERE mean_exec_time > 50
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Verify indexes are being used
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan > 0
ORDER BY idx_scan DESC;
```

### Cache Performance
```bash
# Redis stats from application
redis-cli --stat

# Cache hit rate
redis-cli INFO stats | grep keyspace_hits
redis-cli INFO stats | grep keyspace_misses
```

## 🚨 Rollback Plan

### If Issues Occur:
```bash
# 1. Immediate: Route traffic back to old infrastructure
# Update load balancer to original targets

# 2. Keep new infrastructure running for investigation
# Do not terminate immediately

# 3. For RDS rollback
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier candlefish-postgres-rollback \
    --db-snapshot-identifier <snapshot-id>

# 4. For Redis - just point back to old cache or disable caching

# 5. Document issues for resolution
```

## 📝 Sign-off Checklist

### Before Going Live:
- [ ] All health checks passing
- [ ] Performance baselines captured
- [ ] Monitoring dashboards configured
- [ ] Alerts tested and working
- [ ] Backup/restore procedure tested
- [ ] Rollback plan reviewed
- [ ] Team trained on new infrastructure
- [ ] Documentation updated
- [ ] Cost tracking enabled

### Stakeholder Approvals:
- [ ] Engineering Lead: _____________
- [ ] DevOps Lead: _____________
- [ ] Finance (for costs): _____________
- [ ] Security Review: _____________

## 📞 Support Contacts

| Role | Name | Contact | Escalation |
|------|------|---------|------------|
| AWS Support | TAM | support@aws | Premium Support |
| Database Admin | TBD | | |
| DevOps Lead | TBD | | |
| On-call Engineer | TBD | | PagerDuty |

## 🎯 Success Criteria

✅ Migration complete when:
1. All applications connected to new infrastructure
2. Performance metrics meet or exceed targets
3. No critical alarms for 24 hours
4. Cost tracking shows expected spend
5. Team comfortable with new setup

---

**Ready for Deployment Review Meeting**

Schedule review session to walk through this checklist before proceeding with deployment.