# Database Migration Plan: Tyler Setup GraphQL Backend

## Overview

This document outlines the step-by-step migration plan from the current REST-based DynamoDB schema to an optimized GraphQL single-table design. The migration is designed to minimize downtime and ensure data integrity throughout the process.

## Migration Objectives

- **Zero Data Loss**: All existing data must be preserved and accurately migrated
- **Minimal Downtime**: Target maximum 30 minutes of service interruption
- **Rollback Capability**: Ability to quickly revert changes if issues arise
- **Performance Validation**: Verify improved performance after migration
- **Business Continuity**: Maintain essential service functionality during migration

## Pre-Migration Requirements

### Prerequisites Checklist

- [ ] **New Table Infrastructure**: Deploy new tables via Terraform
- [ ] **Backup Verification**: Confirm all tables have recent backups
- [ ] **Team Availability**: Key personnel available during migration window
- [ ] **Rollback Plan**: Tested rollback procedures in staging environment
- [ ] **Monitoring Setup**: Enhanced monitoring in place for migration
- [ ] **Communication Plan**: Stakeholder notifications prepared

### Environment Setup

```bash
# Required environment variables
export AWS_REGION=us-east-1
export SECRETS_PREFIX=candlefish-employee-setup-lean-prod
export DRY_RUN=false
export PRESERVE_OLD_TABLES=true
export MIGRATION_LOG_LEVEL=info

# AWS credentials with sufficient permissions
aws sts get-caller-identity
```

### Permission Requirements

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:*",
        "backup:*",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*"
    }
  ]
}
```

## Migration Phases

### Phase 1: Infrastructure Preparation (Day -7 to Day 0)

#### 1.1 Deploy New Table Structure

```bash
# Deploy new tables using Terraform
cd database/
terraform init
terraform plan -var="environment=prod"
terraform apply -var="environment=prod"

# Verify table creation
aws dynamodb list-tables --query 'TableNames[?contains(@, `candlefish-employee-setup-lean-prod-entities`)]'
```

#### 1.2 Backup Current Data

```bash
# Create manual backups of all current tables
aws dynamodb create-backup --table-name candlefish-employee-setup-lean-prod-users --backup-name "migration-backup-users-$(date +%Y%m%d)"
aws dynamodb create-backup --table-name candlefish-employee-setup-lean-prod-contractors --backup-name "migration-backup-contractors-$(date +%Y%m%d)"
aws dynamodb create-backup --table-name candlefish-employee-setup-lean-prod-refresh-tokens --backup-name "migration-backup-tokens-$(date +%Y%m%d)"
aws dynamodb create-backup --table-name candlefish-employee-setup-lean-prod-audit --backup-name "migration-backup-audit-$(date +%Y%m%d)"
aws dynamodb create-backup --table-name candlefish-employee-setup-lean-prod-config --backup-name "migration-backup-config-$(date +%Y%m%d)"
```

#### 1.3 Deploy Backup and Recovery Infrastructure

```bash
# Deploy backup infrastructure
aws cloudformation deploy \
  --template-file backup-recovery.yml \
  --stack-name tyler-setup-backup-prod \
  --parameter-overrides Environment=prod ProjectName=candlefish-employee-setup-lean \
  --capabilities CAPABILITY_IAM
```

### Phase 2: Pre-Migration Validation (Day 0, -2 hours)

#### 2.1 Data Consistency Check

```bash
# Run pre-migration validation
node database/migration-scripts.js validate

# Expected output:
# ✓ users: 150 records
# ✓ contractors: 25 records  
# ✓ refresh-tokens: 180 records
# ✓ audit: 1250 records
# ✓ config: 12 records
# ✓ Target table entities is accessible
# ✓ Target table events is accessible
```

#### 2.2 Staging Environment Test

```bash
# Test migration on staging data
export SECRETS_PREFIX=candlefish-employee-setup-lean-staging
export DRY_RUN=true
node database/migration-scripts.js migrate

# Verify dry run output shows expected transformations
```

#### 2.3 Performance Baseline

```bash
# Capture current performance metrics
node scripts/performance-baseline.js --duration 300 --output baseline-pre-migration.json
```

### Phase 3: Migration Execution (Day 0, Maintenance Window)

#### 3.1 Service Shutdown (0 minutes)

```bash
# Put application into maintenance mode
aws lambda update-function-configuration \
  --function-name tyler-setup-graphql-gateway \
  --environment Variables='{"MAINTENANCE_MODE":"true"}'

# Verify maintenance mode is active
curl -X GET https://api.tyler-setup.candlefish.ai/health
# Expected: {"status":"maintenance","message":"System under maintenance"}
```

#### 3.2 Final Data Sync (5 minutes)

```bash
# Final incremental backup
aws dynamodb create-backup \
  --table-name candlefish-employee-setup-lean-prod-users \
  --backup-name "final-migration-backup-$(date +%Y%m%d%H%M)"

# Stop all write operations to ensure consistency
aws lambda update-function-configuration \
  --function-name tyler-setup-users-handler \
  --environment Variables='{"READ_ONLY_MODE":"true"}'
```

#### 3.3 Execute Migration (10 minutes)

```bash
# Start migration with full logging
export DRY_RUN=false
export PRESERVE_OLD_TABLES=true

node database/migration-scripts.js migrate 2>&1 | tee migration-$(date +%Y%m%d%H%M).log

# Expected output:
# Starting database migration...
# Validating source tables...
# ✓ users: 150 records
# ✓ contractors: 25 records
# ...
# Migrating users to entities...
# Processed 150 items from users
# ✓ Completed migration of users: 150 items
# ...
# Migration completed successfully!
```

#### 3.4 Data Validation (10 minutes)

```bash
# Verify record counts match
aws dynamodb describe-table \
  --table-name candlefish-employee-setup-lean-prod-entities \
  --query 'Table.ItemCount'

# Run data integrity checks
node scripts/validate-migrated-data.js --sample-size 100

# Test critical queries
node scripts/test-migration-queries.js
```

#### 3.5 Application Configuration Update (5 minutes)

```bash
# Update Lambda functions to use new tables
aws lambda update-function-configuration \
  --function-name tyler-setup-graphql-gateway \
  --environment Variables='{
    "ENTITY_TABLE":"candlefish-employee-setup-lean-prod-entities",
    "EVENT_TABLE":"candlefish-employee-setup-lean-prod-events",
    "CACHE_TABLE":"candlefish-employee-setup-lean-prod-cache",
    "MAINTENANCE_MODE":"false",
    "USE_NEW_SCHEMA":"true"
  }'

# Update other Lambda functions
for func in tyler-setup-users-handler tyler-setup-contractors-handler tyler-setup-secrets-handler; do
  aws lambda update-function-configuration \
    --function-name $func \
    --environment Variables='{
      "ENTITY_TABLE":"candlefish-employee-setup-lean-prod-entities",
      "READ_ONLY_MODE":"false",
      "USE_NEW_SCHEMA":"true"
    }'
done
```

### Phase 4: Post-Migration Validation (Day 0, +30 minutes)

#### 4.1 Service Restoration Test

```bash
# Test basic functionality
curl -X POST https://api.tyler-setup.candlefish.ai/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ healthCheck { status database { entities events cache } } }"}'

# Expected response:
# {"data":{"healthCheck":{"status":"healthy","database":{"entities":"healthy","events":"healthy","cache":"healthy"}}}}
```

#### 4.2 Performance Validation

```bash
# Run performance test suite
node scripts/performance-test.js --duration 600 --concurrency 20 --output post-migration-perf.json

# Compare with baseline
node scripts/compare-performance.js baseline-pre-migration.json post-migration-perf.json
```

#### 4.3 Functional Testing

```bash
# Execute critical user journeys
npm run test:e2e -- --config=migration-validation.config.js

# Test GraphQL operations
node scripts/test-graphql-operations.js --comprehensive
```

### Phase 5: Monitoring and Cleanup (Day +1 to Day +7)

#### 5.1 Enhanced Monitoring

```bash
# Set up migration-specific alerts
aws cloudwatch put-metric-alarm \
  --alarm-name "tyler-setup-post-migration-errors" \
  --alarm-description "High error rate after migration" \
  --metric-name "Errors" \
  --namespace "AWS/Lambda" \
  --statistic "Sum" \
  --period 300 \
  --threshold 5 \
  --comparison-operator "GreaterThanThreshold" \
  --evaluation-periods 2
```

#### 5.2 Performance Monitoring (Days +1 to +7)

Daily performance reports:
```bash
# Daily performance check
node scripts/daily-performance-report.js --date $(date +%Y-%m-%d)
```

#### 5.3 Data Consistency Monitoring

```bash
# Automated data consistency checks
node scripts/data-consistency-check.js --schedule daily
```

#### 5.4 Old Table Cleanup (Day +7, after validation)

**⚠️ CRITICAL: Only perform after 7 days of successful operation**

```bash
# Final validation before cleanup
node scripts/final-validation.js

# Archive old tables (recommended approach)
for table in users contractors refresh-tokens audit config; do
  aws dynamodb create-backup \
    --table-name "candlefish-employee-setup-lean-prod-${table}" \
    --backup-name "final-archive-${table}-$(date +%Y%m%d)"
done

# Delete old tables (only after confirmation)
# aws dynamodb delete-table --table-name candlefish-employee-setup-lean-prod-users
# ... (repeat for other tables)
```

## Rollback Procedures

### Immediate Rollback (< 1 hour after migration)

```bash
# Step 1: Stop new schema usage
aws lambda update-function-configuration \
  --function-name tyler-setup-graphql-gateway \
  --environment Variables='{"MAINTENANCE_MODE":"true"}'

# Step 2: Restore original table configuration
for func in tyler-setup-users-handler tyler-setup-contractors-handler tyler-setup-secrets-handler; do
  aws lambda update-function-configuration \
    --function-name $func \
    --environment Variables='{
      "USE_NEW_SCHEMA":"false",
      "MAINTENANCE_MODE":"false"
    }'
done

# Step 3: Clear new tables
node database/migration-scripts.js rollback

# Step 4: Restore from backups if needed
aws dynamodb restore-table-from-backup \
  --target-table-name candlefish-employee-setup-lean-prod-users-restored \
  --backup-arn arn:aws:dynamodb:us-east-1:ACCOUNT:table/candlefish-employee-setup-lean-prod-users/backup/BACKUP_ID
```

### Data Recovery Rollback (> 1 hour after migration)

```bash
# If data issues are discovered later
# Step 1: Identify affected time range
export RECOVERY_POINT="2024-01-15T10:30:00.000Z"

# Step 2: Point-in-time recovery
aws dynamodb restore-table-to-point-in-time \
  --source-table-name candlefish-employee-setup-lean-prod-users \
  --target-table-name candlefish-employee-setup-lean-prod-users-recovery \
  --restore-date-time "$RECOVERY_POINT"

# Step 3: Validate recovered data
node scripts/validate-recovered-data.js --recovery-table candlefish-employee-setup-lean-prod-users-recovery

# Step 4: Coordinated cutover (requires maintenance window)
```

## Risk Mitigation

### Identified Risks and Mitigation Strategies

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Data transformation errors | High | Low | Comprehensive validation, dry-run testing |
| Performance degradation | Medium | Medium | Performance testing, rollback plan |
| Extended downtime | High | Low | Practice runs, automated scripts |
| Data corruption | High | Very Low | Multiple backups, point-in-time recovery |
| Schema incompatibility | Medium | Low | Staging environment testing |

### Contingency Plans

#### Plan A: Minor Issues
- Continue monitoring
- Apply hotfixes as needed
- Daily performance reviews

#### Plan B: Performance Issues
- Enable read replicas
- Increase provisioned capacity
- Optimize queries

#### Plan C: Major Issues
- Execute immediate rollback
- Convene incident response team
- Implement disaster recovery

## Success Criteria

### Technical Metrics
- [ ] Zero data loss confirmed
- [ ] All functional tests passing
- [ ] Performance equal to or better than baseline
- [ ] Error rates within normal bounds (< 0.1%)
- [ ] Response times within SLA (95th percentile < 200ms)

### Business Metrics
- [ ] All user workflows functional
- [ ] GraphQL queries performing as expected
- [ ] Real-time subscriptions working
- [ ] No user-reported issues for 48 hours

### Operational Metrics
- [ ] Monitoring dashboards updated
- [ ] Backup procedures validated
- [ ] Team trained on new schema
- [ ] Documentation updated

## Communication Plan

### Stakeholder Notifications

#### T-48 hours: Migration Announcement
**Recipients**: All users, stakeholders, support team
**Content**: 
- Scheduled maintenance window
- Expected improvements
- Contact information for issues

#### T-2 hours: Final Notice
**Recipients**: Critical stakeholders, on-call team
**Content**:
- Confirmation of migration start
- Expected completion time
- Escalation procedures

#### T+0: Migration Complete
**Recipients**: All stakeholders
**Content**:
- Migration status
- Any observed issues
- Next steps

#### T+24 hours: Status Report
**Recipients**: Leadership, technical team
**Content**:
- Performance comparison
- Issue summary
- Lessons learned

## Post-Migration Activities

### Week 1: Intensive Monitoring
- Daily performance reports
- User feedback collection
- Error rate analysis
- Data consistency checks

### Week 2-4: Performance Optimization
- Query optimization based on real usage
- Index tuning
- Cache effectiveness analysis
- Capacity planning updates

### Month 1: Cleanup and Documentation
- Remove old table references
- Update operational procedures
- Team training on new schema
- Performance benchmark updates

## Documentation Updates Required

1. **API Documentation**: Update GraphQL schema documentation
2. **Operational Runbooks**: Update with new table structure
3. **Monitoring Playbooks**: Update alert thresholds and procedures
4. **Developer Guides**: Update with new data access patterns
5. **Disaster Recovery**: Update procedures for new schema

## Lessons Learned Template

Post-migration, document:
- What went well
- What could be improved
- Unexpected issues encountered
- Timeline accuracy
- Resource utilization
- Team coordination effectiveness

This migration plan provides a comprehensive, step-by-step approach to safely migrating the Tyler Setup database to the new GraphQL-optimized schema while minimizing risk and ensuring business continuity.
