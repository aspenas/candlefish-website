# Claude Resources Disaster Recovery Runbook

## Overview

This runbook provides step-by-step procedures for recovering from various disaster scenarios for the Claude Resources deployment system.

## Prerequisites

- AWS CLI configured with appropriate permissions
- kubectl configured with cluster access
- Velero CLI installed
- Access to backup S3 buckets
- Emergency contact information

## Recovery Scenarios

### 1. Database Corruption/Loss

#### Detection

- Application unable to connect to database
- Database integrity check failures
- Data inconsistencies reported

#### Recovery Steps

1. **Assess the situation**

   ```bash
   # Check database status
   kubectl get pods -n claude-resources -l app=postgres
   kubectl logs -n claude-resources deployment/postgres

   # Check recent backups
   aws s3 ls s3://candlefish-claude-resources-backups/database/ --recursive | tail -10
   ```

2. **Scale down applications**

   ```bash
   kubectl scale deployment backend-production --replicas=0 -n claude-resources
   kubectl scale deployment frontend-production --replicas=0 -n claude-resources
   ```

3. **Restore from backup**

   ```bash
   # Create restore job
   kubectl create job --from=cronjob/postgres-backup postgres-restore -n claude-resources

   # Or manually restore from specific backup
   kubectl run postgres-restore \
     --image=postgres:15-alpine \
     --env="POSTGRES_HOST=postgres" \
     --env="POSTGRES_USER=postgres" \
     --env="POSTGRES_DB=claude_resources" \
     --env="S3_BACKUP_BUCKET=candlefish-claude-resources-backups" \
     --restart=Never \
     -n claude-resources \
     -- /bin/bash /scripts/restore.sh backup_file_name.sql.gz
   ```

4. **Verify restoration**

   ```bash
   # Check database connectivity
   kubectl exec -it deployment/postgres -n claude-resources -- psql -U postgres -d claude_resources -c "SELECT COUNT(*) FROM information_schema.tables;"
   ```

5. **Scale applications back up**

   ```bash
   kubectl scale deployment backend-production --replicas=3 -n claude-resources
   kubectl scale deployment frontend-production --replicas=3 -n claude-resources

   # Wait for rollout completion
   kubectl rollout status deployment/backend-production -n claude-resources
   kubectl rollout status deployment/frontend-production -n claude-resources
   ```

#### Recovery Time Objective (RTO): 30 minutes

#### Recovery Point Objective (RPO): 24 hours (daily backups)

### 2. Complete Cluster Loss

#### Detection

- Unable to connect to Kubernetes API
- All nodes unreachable
- Regional AWS outage

#### Recovery Steps

1. **Create new EKS cluster**

   ```bash
   # Navigate to Terraform directory
   cd terraform/

   # Initialize and apply infrastructure
   terraform init
   terraform plan -var-file="environments/production.tfvars"
   terraform apply -var-file="environments/production.tfvars"

   # Update kubeconfig
   aws eks update-kubeconfig --region us-west-2 --name claude-resources-prod
   ```

2. **Install required operators and controllers**

   ```bash
   # Install ingress controller
   helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
   helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace

   # Install cert-manager
   helm repo add jetstack https://charts.jetstack.io
   helm install cert-manager jetstack/cert-manager -n cert-manager --create-namespace --set installCRDs=true

   # Install external-secrets-operator
   helm repo add external-secrets https://charts.external-secrets.io
   helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

   # Install Velero
   velero install --provider aws --plugins velero/velero-plugin-for-aws:v1.8.0 --bucket candlefish-claude-resources-velero --secret-file ./velero-credentials --backup-location-config region=us-west-2
   ```

3. **Restore from Velero backup**

   ```bash
   # List available backups
   velero backup get

   # Restore from latest backup
   LATEST_BACKUP=$(velero backup get --output json | jq -r '.items | sort_by(.status.completionTimestamp) | last | .metadata.name')
   velero restore create cluster-restore --from-backup $LATEST_BACKUP

   # Monitor restore progress
   velero restore describe cluster-restore
   ```

4. **Restore database if needed**

   ```bash
   # If database wasn't included in Velero backup, restore manually
   kubectl apply -f backup-dr/database/postgres-backup.yaml
   kubectl create job --from=cronjob/postgres-backup postgres-restore -n claude-resources
   ```

5. **Verify all services**

   ```bash
   # Check all deployments
   kubectl get deployments -A

   # Check ingress
   kubectl get ingress -A

   # Test application endpoints
   curl -k https://claude-resources.candlefish.ai/health
   ```

#### Recovery Time Objective (RTO): 2 hours

#### Recovery Point Objective (RPO): 24 hours

### 3. Application Corruption

#### Detection

- Application returning errors
- Performance degradation
- Incorrect business logic behavior

#### Recovery Steps

1. **Rollback to previous version**

   ```bash
   # Check rollout history
   kubectl rollout history deployment/backend-production -n claude-resources

   # Rollback to previous version
   kubectl rollout undo deployment/backend-production -n claude-resources
   kubectl rollout undo deployment/frontend-production -n claude-resources

   # Monitor rollback
   kubectl rollout status deployment/backend-production -n claude-resources
   ```

2. **If rollback insufficient, restore from backup**

   ```bash
   # Scale down current version
   kubectl scale deployment backend-production --replicas=0 -n claude-resources

   # Deploy known good version
   kubectl set image deployment/backend-production backend=ghcr.io/candlefish-ai/claude-resources-setup/backend:KNOWN_GOOD_TAG -n claude-resources

   # Scale back up
   kubectl scale deployment backend-production --replicas=3 -n claude-resources
   ```

#### Recovery Time Objective (RTO): 15 minutes

#### Recovery Point Objective (RPO): Immediate (rolling deployment)

### 4. Regional AWS Outage

#### Detection

- Multiple AWS services unavailable
- Unable to reach resources in primary region

#### Recovery Steps

1. **Activate disaster recovery region**

   ```bash
   # Switch to DR region configuration
   cd terraform/
   terraform workspace select dr-region
   terraform apply -var-file="environments/dr.tfvars"
   ```

2. **Restore data from cross-region replicas**

   ```bash
   # Database restore from cross-region backup
   aws s3 sync s3://candlefish-claude-resources-backups-dr/database/ ./dr-restore/

   # Apply restored database
   kubectl apply -f backup-dr/database/postgres-backup.yaml
   ```

3. **Update DNS to point to DR region**

   ```bash
   # Update Route53 records
   aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch file://dr-dns-update.json
   ```

4. **Monitor and validate DR environment**

   ```bash
   # Test all endpoints
   curl -k https://claude-resources.candlefish.ai/health

   # Run smoke tests
   kubectl apply -f tests/smoke-tests.yaml
   ```

#### Recovery Time Objective (RTO): 4 hours

#### Recovery Point Objective (RPO): 1 hour (cross-region replication)

## Testing and Validation

### Monthly DR Testing Schedule

1. **Week 1**: Database restore test
2. **Week 2**: Application rollback test
3. **Week 3**: Velero backup/restore test
4. **Week 4**: Cross-region failover test

### Test Commands

```bash
# Test database backup
kubectl create job --from=cronjob/postgres-backup test-backup -n claude-resources

# Test Velero backup
velero backup create test-backup-$(date +%Y%m%d) --include-namespaces claude-resources

# Test restore
velero restore create test-restore-$(date +%Y%m%d) --from-backup test-backup-$(date +%Y%m%d)
```

## Contact Information

### Emergency Contacts

- **On-call Engineer**: +1-555-0123
- **Platform Team**: <platform-team@candlefish.ai>
- **AWS Support**: (Premium Support Case)

### Escalation Path

1. On-call Engineer (0-15 minutes)
2. Platform Team Lead (15-30 minutes)
3. Engineering Manager (30-60 minutes)
4. CTO (1+ hours)

## Post-Incident Actions

1. **Create incident report** within 24 hours
2. **Update runbook** based on lessons learned
3. **Review and update RTO/RPO** targets if needed
4. **Schedule follow-up DR testing** within 30 days
5. **Update monitoring and alerting** to prevent recurrence

## Maintenance Windows

### Scheduled Maintenance

- **Database maintenance**: Sunday 2-4 AM UTC
- **Cluster updates**: Saturday 6-8 AM UTC
- **Security patching**: As needed, coordinate with team

### Change Management

- All production changes require approval
- Emergency changes documented post-implementation
- Rollback plan required for all deployments
