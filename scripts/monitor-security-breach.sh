#!/bin/bash

# Security Breach Monitoring Script
# Monitors for unauthorized access from exposed credentials

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔍 SECURITY BREACH MONITORING"
echo "=============================="
echo ""

# Create monitoring report
REPORT_FILE="./security-monitoring-$(date +%Y%m%d-%H%M%S).log"
ALERTS_FILE="./security-alerts-$(date +%Y%m%d-%H%M%S).txt"

log_finding() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$REPORT_FILE"
}

alert() {
    echo "🚨 ALERT: $1" | tee -a "$ALERTS_FILE"
    log_finding "ALERT: $1"
}

echo -e "${YELLOW}Starting security monitoring...${NC}"
log_finding "Security monitoring started"

# 1. Check AWS CloudTrail for suspicious activity
echo -e "\n${BLUE}1. AWS CloudTrail Analysis${NC}"
echo "   Checking for unauthorized API calls..."

if command -v aws &> /dev/null; then
    # Check for recent suspicious events
    echo "   Looking for unusual activities in last 24 hours..."

    # Check for root account usage
    ROOT_EVENTS=$(aws cloudtrail lookup-events \
        --lookup-attributes AttributeKey=UserName,AttributeValue=root \
        --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
        --query 'Events[?EventTime > `2024-01-01`].{Time:EventTime,Event:EventName,IP:CloudTrailEvent.sourceIPAddress}' \
        --output json 2>/dev/null || echo "[]")

    if [ "$ROOT_EVENTS" != "[]" ]; then
        alert "Root account activity detected in CloudTrail"
        echo "$ROOT_EVENTS" >> "$REPORT_FILE"
    fi

    # Check for failed authentication attempts
    FAILED_AUTH=$(aws cloudtrail lookup-events \
        --lookup-attributes AttributeKey=EventName,AttributeValue=ConsoleLogin \
        --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
        --query 'Events[?CloudTrailEvent.errorCode != null]' \
        --output json 2>/dev/null || echo "[]")

    if [ "$FAILED_AUTH" != "[]" ]; then
        alert "Failed authentication attempts detected"
        echo "$FAILED_AUTH" >> "$REPORT_FILE"
    fi

    # Check for secret access
    SECRET_ACCESS=$(aws cloudtrail lookup-events \
        --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
        --start-time $(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%S) \
        --query 'Events[*].{Time:EventTime,User:Username,IP:CloudTrailEvent.sourceIPAddress,Secret:CloudTrailEvent.requestParameters.secretId}' \
        --output json 2>/dev/null || echo "[]")

    if [ "$SECRET_ACCESS" != "[]" ]; then
        echo "   Recent secret access detected (review for anomalies):"
        echo "$SECRET_ACCESS" | jq -r '.[] | "\(.Time) - User: \(.User), IP: \(.IP), Secret: \(.Secret)"' 2>/dev/null || echo "$SECRET_ACCESS"
        log_finding "Secret access events logged for review"
    fi

    # Check for IAM changes
    IAM_CHANGES=$(aws cloudtrail lookup-events \
        --lookup-attributes AttributeKey=EventName,AttributeValue=CreateAccessKey \
        --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
        --output json 2>/dev/null || echo "[]")

    if [ "$IAM_CHANGES" != "[]" ]; then
        alert "New IAM access keys created - verify if authorized"
        echo "$IAM_CHANGES" >> "$REPORT_FILE"
    fi

    echo -e "   ${GREEN}✓ CloudTrail analysis complete${NC}"
else
    echo -e "   ${RED}⚠ AWS CLI not available${NC}"
    log_finding "AWS CLI not available for CloudTrail analysis"
fi

# 2. Check GitHub for unauthorized access
echo -e "\n${BLUE}2. GitHub Repository Monitoring${NC}"
echo "   Checking for suspicious repository activity..."

if command -v gh &> /dev/null; then
    # Check for recent commits from unknown authors
    echo "   Analyzing recent commits..."

    RECENT_COMMITS=$(git log --format="%H|%an|%ae|%s" --since="2 hours ago" 2>/dev/null || echo "")

    if [ ! -z "$RECENT_COMMITS" ]; then
        echo "   Recent commits (last 2 hours):"
        while IFS='|' read -r hash author email subject; do
            # Check if author is known
            if [[ ! "$email" =~ candlefish\.ai$ ]] && [[ "$email" != "noreply@github.com" ]]; then
                alert "Commit from unknown email: $email"
            fi
            echo "     - $author ($email): $subject"
            log_finding "Recent commit: $author ($email) - $subject"
        done <<< "$RECENT_COMMITS"
    else
        echo -e "   ${GREEN}✓ No recent commits in last 2 hours${NC}"
    fi

    # Check for new deploy keys or webhooks
    echo "   Checking deploy keys and webhooks..."

    # List deploy keys
    DEPLOY_KEYS=$(gh api repos/candlefish-ai/candlefish-ai/keys 2>/dev/null || echo "[]")
    KEY_COUNT=$(echo "$DEPLOY_KEYS" | jq '. | length' 2>/dev/null || echo "0")

    if [ "$KEY_COUNT" -gt "0" ]; then
        echo "   Found $KEY_COUNT deploy key(s) - verify all are authorized"
        echo "$DEPLOY_KEYS" | jq -r '.[] | "     - \(.title) (ID: \(.id), Read-only: \(.read_only))"' 2>/dev/null
        log_finding "Deploy keys found: $KEY_COUNT"
    fi

    # Check webhooks
    WEBHOOKS=$(gh api repos/candlefish-ai/candlefish-ai/hooks 2>/dev/null || echo "[]")
    WEBHOOK_COUNT=$(echo "$WEBHOOKS" | jq '. | length' 2>/dev/null || echo "0")

    if [ "$WEBHOOK_COUNT" -gt "0" ]; then
        echo "   Found $WEBHOOK_COUNT webhook(s) - verify all are authorized"
        echo "$WEBHOOKS" | jq -r '.[] | "     - \(.config.url) (Active: \(.active))"' 2>/dev/null
        log_finding "Webhooks found: $WEBHOOK_COUNT"
    fi

    echo -e "   ${GREEN}✓ GitHub monitoring complete${NC}"
else
    echo -e "   ${RED}⚠ GitHub CLI not available${NC}"
    log_finding "GitHub CLI not available for repository monitoring"
fi

# 3. Check database connections
echo -e "\n${BLUE}3. Database Connection Monitoring${NC}"
echo "   Checking for unusual database connections..."

# Check if we can query RDS metrics
if command -v aws &> /dev/null; then
    # Get list of RDS instances
    INSTANCES=$(aws rds describe-db-instances --query 'DBInstances[*].DBInstanceIdentifier' --output text 2>/dev/null || echo "")

    if [ ! -z "$INSTANCES" ]; then
        for instance in $INSTANCES; do
            echo "   Checking RDS instance: $instance"

            # Get connection count metric
            CONNECTION_COUNT=$(aws cloudwatch get-metric-statistics \
                --namespace AWS/RDS \
                --metric-name DatabaseConnections \
                --dimensions Name=DBInstanceIdentifier,Value=$instance \
                --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
                --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
                --period 300 \
                --statistics Maximum \
                --query 'Datapoints[0].Maximum' \
                --output text 2>/dev/null || echo "N/A")

            if [ "$CONNECTION_COUNT" != "N/A" ] && [ "$CONNECTION_COUNT" != "None" ]; then
                echo "     Current connections: $CONNECTION_COUNT"

                # Alert if connections are unusually high
                if [ "$CONNECTION_COUNT" -gt "50" ]; then
                    alert "High database connection count: $CONNECTION_COUNT for $instance"
                fi
            fi

            log_finding "Database $instance connection count: $CONNECTION_COUNT"
        done
    else
        echo "   No RDS instances found or accessible"
    fi

    echo -e "   ${GREEN}✓ Database monitoring complete${NC}"
else
    echo -e "   ${RED}⚠ AWS CLI not available${NC}"
fi

# 4. Check application logs for suspicious activity
echo -e "\n${BLUE}4. Application Log Analysis${NC}"
echo "   Checking deployment platform logs..."

# Check Vercel logs
echo "   Vercel logs:"
if command -v vercel &> /dev/null; then
    echo "     Check at: https://vercel.com/candlefish-ai/candlefish-website/logs"
else
    echo "     Manual check required at: https://vercel.com/candlefish-ai/candlefish-website/logs"
fi

# Check Fly.io logs
echo "   Fly.io logs:"
if command -v fly &> /dev/null; then
    # Get recent error logs
    echo "     Checking for authentication errors..."
    FLY_ERRORS=$(fly logs -a candlefish-api --since 2h | grep -i "auth\|unauthorized\|forbidden" | head -10 2>/dev/null || echo "")

    if [ ! -z "$FLY_ERRORS" ]; then
        echo "     Found authentication-related log entries:"
        echo "$FLY_ERRORS" | head -5
        log_finding "Fly.io authentication errors detected"
    else
        echo -e "     ${GREEN}✓ No authentication errors found${NC}"
    fi
else
    echo "     Manual check required: fly logs -a candlefish-api"
fi

# Check Netlify logs
echo "   Netlify logs:"
echo "     Check at: https://app.netlify.com/teams/candlefish/sites"

echo -e "   ${GREEN}✓ Application log analysis complete${NC}"

# 5. Check for data exfiltration attempts
echo -e "\n${BLUE}5. Data Exfiltration Detection${NC}"
echo "   Checking for unusual data access patterns..."

if command -v aws &> /dev/null; then
    # Check S3 access logs
    echo "   Checking S3 bucket access..."

    BUCKETS=$(aws s3api list-buckets --query 'Buckets[*].Name' --output text 2>/dev/null || echo "")

    if [ ! -z "$BUCKETS" ]; then
        for bucket in $BUCKETS; do
            # Check for large number of GET requests
            echo "     Analyzing bucket: $bucket"

            # Get bucket metrics
            REQUESTS=$(aws cloudwatch get-metric-statistics \
                --namespace AWS/S3 \
                --metric-name NumberOfObjects \
                --dimensions Name=BucketName,Value=$bucket Name=StorageType,Value=AllStorageTypes \
                --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
                --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
                --period 3600 \
                --statistics Average \
                --query 'Datapoints[0].Average' \
                --output text 2>/dev/null || echo "N/A")

            if [ "$REQUESTS" != "N/A" ] && [ "$REQUESTS" != "None" ]; then
                log_finding "S3 bucket $bucket object count: $REQUESTS"
            fi
        done
    fi

    echo -e "   ${GREEN}✓ Data access monitoring complete${NC}"
fi

# 6. Generate security report
echo -e "\n${BLUE}6. Security Report Generation${NC}"

# Count alerts
ALERT_COUNT=$(grep -c "ALERT:" "$ALERTS_FILE" 2>/dev/null || echo "0")

echo ""
echo "======================================"
if [ "$ALERT_COUNT" -gt "0" ]; then
    echo -e "${RED}⚠ SECURITY ALERTS DETECTED${NC}"
    echo "======================================"
    echo ""
    echo -e "${RED}Found $ALERT_COUNT security alert(s)${NC}"
    echo ""
    echo "Alerts:"
    cat "$ALERTS_FILE"
else
    echo -e "${GREEN}✅ NO SECURITY ALERTS${NC}"
    echo "======================================"
    echo "No immediate security threats detected"
fi

echo ""
echo "Reports generated:"
echo "  - Full report: $REPORT_FILE"
echo "  - Alerts only: $ALERTS_FILE"

echo ""
echo -e "${YELLOW}Recommended Actions:${NC}"
echo "1. Review CloudTrail logs manually for last 24 hours"
echo "2. Check all deployment platform access logs"
echo "3. Verify all recent GitHub commits and actions"
echo "4. Monitor database connection patterns"
echo "5. Set up CloudWatch alarms for suspicious activity"
echo "6. Enable GuardDuty if not already active"

echo ""
echo -e "${BLUE}Continuous Monitoring Setup:${NC}"

cat > ./setup-continuous-monitoring.sh << 'EOF'
#!/bin/bash

# Setup continuous security monitoring

echo "Setting up continuous monitoring..."

# Create CloudWatch alarm for root account usage
aws cloudwatch put-metric-alarm \
    --alarm-name "RootAccountUsage" \
    --alarm-description "Alert on root account usage" \
    --metric-name "RootAccountUsage" \
    --namespace "CloudTrailMetrics" \
    --statistic Sum \
    --period 300 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --evaluation-periods 1

# Create alarm for failed authentication
aws cloudwatch put-metric-alarm \
    --alarm-name "FailedAuthenticationAttempts" \
    --alarm-description "Alert on multiple failed auth attempts" \
    --metric-name "FailedAuthenticationAttempts" \
    --namespace "CloudTrailMetrics" \
    --statistic Sum \
    --period 300 \
    --threshold 5 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1

# Create alarm for unauthorized API calls
aws cloudwatch put-metric-alarm \
    --alarm-name "UnauthorizedAPICalls" \
    --alarm-description "Alert on unauthorized API calls" \
    --metric-name "UnauthorizedAPICalls" \
    --namespace "CloudTrailMetrics" \
    --statistic Sum \
    --period 300 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --evaluation-periods 1

echo "CloudWatch alarms configured!"
echo "Remember to:"
echo "1. Set up SNS topic for alarm notifications"
echo "2. Enable GuardDuty for threat detection"
echo "3. Configure AWS Config for compliance monitoring"
echo "4. Enable VPC Flow Logs for network monitoring"
EOF

chmod +x ./setup-continuous-monitoring.sh

echo ""
echo "To set up continuous monitoring, run:"
echo "  ./setup-continuous-monitoring.sh"

log_finding "Security monitoring completed - $ALERT_COUNT alert(s) found"
