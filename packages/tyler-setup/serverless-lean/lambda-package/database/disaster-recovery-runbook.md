# Tyler Setup Disaster Recovery Runbook

## Overview

This runbook provides step-by-step procedures for database disaster recovery scenarios in the Tyler Setup GraphQL backend. The procedures are designed to minimize downtime and data loss while ensuring business continuity.

## Recovery Objectives

- **RTO (Recovery Time Objective)**: 15 minutes for single region failure
- **RPO (Recovery Point Objective)**: 5 minutes maximum data loss
- **Availability SLA**: 99.99% uptime

## Emergency Contacts

| Role | Primary | Secondary | Phone | Email |
|------|---------|-----------|--------|-------|
| Database Admin | John Doe | Jane Smith | +1-555-0100 | dba@candlefish.ai |
| DevOps Lead | Alice Johnson | Bob Wilson | +1-555-0200 | devops@candlefish.ai |
| Engineering Manager | Carol Davis | Dave Brown | +1-555-0300 | engineering@candlefish.ai |
| Business Continuity | Eve Taylor | Frank Miller | +1-555-0400 | ops@candlefish.ai |

## Incident Classification

### Severity Levels

**P1 - Critical**
- Complete database unavailability
- Data corruption affecting business operations
- Security breach with data exposure
- RTO: 15 minutes, immediate response required

**P2 - High**
- Degraded performance affecting user experience
- Single table/service unavailable
- Backup failures
- RTO: 1 hour, response within 30 minutes

**P3 - Medium**
- Performance degradation without user impact
- Non-critical feature unavailability
- RTO: 4 hours, response within 2 hours

**P4 - Low**
- Minor issues not affecting users
- Maintenance-related problems
- RTO: 24 hours, response within business hours

## Disaster Recovery Scenarios

### Scenario 1: Complete Regional Failure

**Symptoms:**
- All DynamoDB tables inaccessible
- High error rates across all services
- AWS console shows regional service issues

**Immediate Actions (0-5 minutes):**

1. **Confirm Outage Scope**
   ```bash
   # Check AWS status page
   curl -s https://status.aws.amazon.com/rss/dynamodb-us-east-1.rss
   
   # Test table connectivity
   aws dynamodb describe-table --table-name candlefish-employee-setup-lean-prod-entities --region us-east-1
   ```

2. **Activate Incident Response**
   ```bash
   # Send alert to team
   aws sns publish \
     --topic-arn arn:aws:sns:us-east-1:ACCOUNT:tyler-setup-emergency-alerts \
     --message "P1 INCIDENT: Regional database failure detected" \
     --subject "CRITICAL: Database Regional Failure"
   ```

3. **Implement Traffic Routing**
   ```bash
   # Update Route 53 to point to disaster recovery region
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z1234567890ABC \
     --change-batch file://failover-changeset.json
   ```

**Recovery Actions (5-15 minutes):**

4. **Restore from Cross-Region Backups**
   ```bash
   # List available backups in secondary region
   aws backup list-recovery-points-by-backup-vault \
     --backup-vault-name candlefish-employee-setup-lean-prod-vault \
     --region us-west-2
   
   # Start restore process for critical tables
   aws backup start-restore-job \
     --recovery-point-arn "arn:aws:backup:us-west-2:ACCOUNT:recovery-point:RECOVERY_POINT_ID" \
     --metadata target-table-name=candlefish-employee-setup-lean-prod-entities-recovery \
     --iam-role-arn "arn:aws:iam::ACCOUNT:role/candlefish-employee-setup-lean-prod-backup-role" \
     --region us-west-2
   ```

5. **Update Application Configuration**
   ```bash
   # Update environment variables for disaster recovery region
   export AWS_REGION=us-west-2
   export ENTITY_TABLE=candlefish-employee-setup-lean-prod-entities-recovery
   export EVENT_TABLE=candlefish-employee-setup-lean-prod-events-recovery
   
   # Redeploy applications
   serverless deploy --stage prod --region us-west-2
   ```

### Scenario 2: Single Table Corruption

**Symptoms:**
- Specific table returning errors or corrupted data
- Other tables functioning normally
- Application errors for specific features

**Immediate Actions:**

1. **Isolate Affected Table**
   ```bash
   # Stop writes to affected table (implement circuit breaker)
   aws lambda update-function-configuration \
     --function-name tyler-setup-entities-handler \
     --environment Variables="{CIRCUIT_BREAKER_ENTITIES=OPEN}"
   ```

2. **Identify Latest Good Backup**
   ```bash
   # List recent backups for the affected table
   aws backup list-recovery-points-by-resource \
     --resource-arn "arn:aws:dynamodb:us-east-1:ACCOUNT:table/candlefish-employee-setup-lean-prod-entities" \
     --max-results 10
   ```

**Recovery Actions:**

3. **Point-in-Time Recovery**
   ```bash
   # Restore table to last known good state
   aws dynamodb restore-table-to-point-in-time \
     --source-table-name candlefish-employee-setup-lean-prod-entities \
     --target-table-name candlefish-employee-setup-lean-prod-entities-recovery \
     --restore-date-time "2024-01-15T10:30:00.000Z"
   ```

4. **Validate Data Integrity**
   ```bash
   # Run data validation scripts
   node scripts/validate-table-data.js \
     --table candlefish-employee-setup-lean-prod-entities-recovery \
     --sample-size 1000
   ```

5. **Cutover to Recovered Table**
   ```bash
   # Rename tables (requires application downtime)
   aws dynamodb describe-table \
     --table-name candlefish-employee-setup-lean-prod-entities \
     --query 'Table.{TableName:TableName,TableStatus:TableStatus}'
   
   # Update application configuration
   aws lambda update-function-configuration \
     --function-name tyler-setup-entities-handler \
     --environment Variables="{ENTITY_TABLE=candlefish-employee-setup-lean-prod-entities-recovery}"
   ```

### Scenario 3: Data Breach/Security Incident

**Symptoms:**
- Unauthorized access detected
- Suspicious query patterns
- Security alerts from AWS CloudTrail

**Immediate Actions:**

1. **Contain the Breach**
   ```bash
   # Revoke all access keys immediately
   aws iam list-users --query 'Users[].UserName' | xargs -I {} aws iam list-access-keys --user-name {}
   
   # Disable compromised IAM users/roles
   aws iam attach-user-policy --user-name COMPROMISED_USER --policy-arn arn:aws:iam::aws:policy/AWSDenyAll
   ```

2. **Enable Enhanced Monitoring**
   ```bash
   # Enable VPC Flow Logs
   aws ec2 create-flow-logs \
     --resource-type VPC \
     --resource-ids vpc-12345678 \
     --traffic-type ALL \
     --log-destination-type cloud-watch-logs \
     --log-group-name /aws/vpc/flowlogs
   ```

**Recovery Actions:**

3. **Forensic Analysis**
   ```bash
   # Export CloudTrail logs for analysis
   aws logs filter-log-events \
     --log-group-name /aws/cloudtrail \
     --start-time 1642204800000 \
     --end-time 1642291200000 \
     --filter-pattern "{ ($.eventName = GetItem) || ($.eventName = Query) || ($.eventName = Scan) }"
   ```

4. **Rotate All Credentials**
   ```bash
   # Rotate KMS keys
   aws kms schedule-key-deletion \
     --key-id COMPROMISED_KEY_ID \
     --pending-window-in-days 7
   
   # Generate new application credentials
   aws secretsmanager rotate-secret \
     --secret-id candlefish-employee-setup-lean/database-credentials
   ```

### Scenario 4: Performance Degradation

**Symptoms:**
- High latency on database operations
- Throttling errors
- Increased error rates

**Immediate Actions:**

1. **Identify Bottlenecks**
   ```bash
   # Check CloudWatch metrics
   aws cloudwatch get-metric-statistics \
     --namespace AWS/DynamoDB \
     --metric-name ConsumedReadCapacityUnits \
     --dimensions Name=TableName,Value=candlefish-employee-setup-lean-prod-entities \
     --start-time 2024-01-15T09:00:00Z \
     --end-time 2024-01-15T10:00:00Z \
     --period 300 \
     --statistics Sum
   ```

2. **Enable Auto Scaling**
   ```bash
   # Enable auto scaling for affected table
   aws application-autoscaling register-scalable-target \
     --service-namespace dynamodb \
     --resource-id table/candlefish-employee-setup-lean-prod-entities \
     --scalable-dimension dynamodb:table:ReadCapacityUnits \
     --min-capacity 5 \
     --max-capacity 1000
   ```

**Recovery Actions:**

3. **Query Optimization**
   ```bash
   # Analyze slow queries
   aws logs filter-log-events \
     --log-group-name /aws/lambda/tyler-setup-graphql \
     --filter-pattern "[timestamp, request_id, \"SLOW QUERY\"]" \
     --start-time 1642204800000
   ```

4. **Cache Warming**
   ```bash
   # Warm critical caches
   node scripts/warm-cache.js \
     --cache-type user \
     --batch-size 100 \
     --concurrency 10
   ```

## Recovery Scripts

### Table Validation Script

```javascript
// scripts/validate-table-data.js
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

async function validateTable(tableName, sampleSize = 1000) {
    console.log(`Validating table: ${tableName}`);
    
    try {
        // Check table schema
        const tableDesc = await dynamodb.describeTable({ TableName: tableName }).promise();
        console.log(`✓ Table schema valid: ${JSON.stringify(tableDesc.Table.KeySchema)}`);
        
        // Sample data integrity
        const scanResult = await dynamodb.scan({
            TableName: tableName,
            Limit: sampleSize,
            Select: 'ALL_ATTRIBUTES'
        }).promise();
        
        let validRecords = 0;
        let invalidRecords = 0;
        
        for (const item of scanResult.Items) {
            if (validateRecord(item)) {
                validRecords++;
            } else {
                invalidRecords++;
                console.warn(`✗ Invalid record: ${JSON.stringify(item)}`);
            }
        }
        
        console.log(`✓ Validation complete: ${validRecords} valid, ${invalidRecords} invalid`);
        return { valid: validRecords, invalid: invalidRecords };
        
    } catch (error) {
        console.error(`✗ Validation failed: ${error.message}`);
        throw error;
    }
}

function validateRecord(item) {
    // Implement record validation logic based on schema
    return item.PK && item.SK && item.entityType;
}

module.exports = { validateTable };
```

### Cache Warming Script

```javascript
// scripts/warm-cache.js
const { getCacheManager } = require('../database/cache-layer');
const { getDynamoDBClient } = require('../database/connection-pool');

async function warmCache(cacheType, batchSize = 100, concurrency = 10) {
    console.log(`Warming ${cacheType} cache...`);
    
    const cache = getCacheManager();
    const db = getDynamoDBClient();
    
    try {
        // Get frequently accessed items
        const items = await getFrequentlyAccessedItems(cacheType, batchSize);
        
        // Warm cache in batches
        const batches = chunkArray(items, concurrency);
        
        for (const batch of batches) {
            await Promise.all(batch.map(item => 
                cache.set(cacheType, item.id, item.data, {}, item.ttl)
            ));
        }
        
        console.log(`✓ Cache warmed with ${items.length} items`);
        
    } catch (error) {
        console.error(`✗ Cache warming failed: ${error.message}`);
        throw error;
    }
}

async function getFrequentlyAccessedItems(type, limit) {
    // Query for most frequently accessed items based on type
    // Implementation would depend on your specific access patterns
    return [];
}

function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

module.exports = { warmCache };
```

## Post-Incident Procedures

### 1. Service Restoration Verification

```bash
# Comprehensive health check
curl -X POST https://api.tyler-setup.candlefish.ai/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ healthCheck { status database { entities events cache } } }"}'

# Performance verification
node scripts/performance-test.js --duration 300 --concurrency 50
```

### 2. Data Consistency Verification

```bash
# Compare record counts between primary and backup
aws dynamodb describe-table --table-name candlefish-employee-setup-lean-prod-entities \
  --query 'Table.ItemCount'

aws dynamodb describe-table --table-name candlefish-employee-setup-lean-prod-entities-recovery \
  --query 'Table.ItemCount'
```

### 3. Post-Incident Report

**Template:**

```markdown
# Incident Post-Mortem Report

## Incident Summary
- **Date/Time**: 
- **Duration**: 
- **Severity**: 
- **Root Cause**: 

## Timeline
- **Detection**: 
- **Response**: 
- **Mitigation**: 
- **Resolution**: 

## Impact Analysis
- **Users Affected**: 
- **Data Loss**: 
- **Financial Impact**: 

## Actions Taken
1. Immediate response actions
2. Recovery procedures executed
3. Communication to stakeholders

## Root Cause Analysis
- Technical cause
- Contributing factors
- Prevention measures

## Lessons Learned
- What went well
- What could be improved
- Process changes needed

## Action Items
- [ ] Technical improvements
- [ ] Process updates
- [ ] Documentation changes
- [ ] Training needs
```

## Maintenance Procedures

### Monthly Backup Verification

```bash
#!/bin/bash
# monthly-backup-check.sh

echo "Starting monthly backup verification..."

# Test restore from latest backup
LATEST_BACKUP=$(aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name candlefish-employee-setup-lean-prod-vault \
  --query 'RecoveryPoints[0].RecoveryPointArn' \
  --output text)

echo "Testing restore from: $LATEST_BACKUP"

# Start test restore
aws backup start-restore-job \
  --recovery-point-arn "$LATEST_BACKUP" \
  --metadata target-table-name=backup-verification-test-$(date +%s) \
  --iam-role-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/candlefish-employee-setup-lean-prod-backup-role"

echo "Backup verification initiated"
```

### Quarterly Disaster Recovery Drill

```bash
#!/bin/bash
# dr-drill.sh

echo "Starting quarterly DR drill..."

# 1. Simulate regional failure
# 2. Execute failover procedures
# 3. Validate application functionality
# 4. Measure recovery time
# 5. Document results

START_TIME=$(date +%s)

# Execute DR procedures
./scripts/failover-to-secondary.sh

END_TIME=$(date +%s)
RECOVERY_TIME=$((END_TIME - START_TIME))

echo "DR drill completed in ${RECOVERY_TIME} seconds"
echo "Target RTO: 900 seconds (15 minutes)"

if [ $RECOVERY_TIME -le 900 ]; then
    echo "✓ RTO target met"
else
    echo "✗ RTO target exceeded - review procedures"
fi
```

## Contact and Escalation Matrix

### Escalation Path

1. **Level 1**: On-call Engineer (0-15 minutes)
2. **Level 2**: Database Team Lead (15-30 minutes)
3. **Level 3**: Engineering Manager (30-60 minutes)
4. **Level 4**: CTO/Business Continuity (60+ minutes)

### External Vendors

- **AWS Support**: Enterprise Support Case (Critical)
- **Monitoring Vendor**: DataDog/NewRelic support
- **Security Vendor**: CrowdStrike/incident response team

## Document Control

- **Version**: 1.0
- **Last Updated**: January 2024
- **Next Review**: April 2024
- **Owner**: Database Operations Team
- **Approved By**: Engineering Manager

---

**Note**: This runbook should be tested quarterly and updated based on lessons learned from incidents and drills. All team members should be familiar with their roles and responsibilities during incident response.
