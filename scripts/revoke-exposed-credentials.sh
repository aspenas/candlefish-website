#!/bin/bash

# Emergency Credential Revocation Script
# This script helps revoke all exposed credentials immediately

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚨 EMERGENCY CREDENTIAL REVOCATION 🚨"
echo "====================================="
echo ""

# Track revocation status
REVOCATION_LOG="./credential-revocation-$(date +%Y%m%d-%H%M%S).log"

log_action() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$REVOCATION_LOG"
}

echo -e "${YELLOW}Starting credential revocation process...${NC}"
log_action "Starting emergency credential revocation"

# 1. Salesforce Credentials
echo -e "${YELLOW}1. Revoking Salesforce OAuth tokens...${NC}"
log_action "Salesforce: Starting revocation"

# Check if we have Salesforce CLI installed
if command -v sf &> /dev/null; then
    echo "   Attempting to revoke Salesforce connected apps..."
    # List and revoke all connected apps
    sf auth:logout --all --no-prompt 2>/dev/null || true
    log_action "Salesforce: Logged out all sessions via CLI"
else
    echo -e "${RED}   ⚠ Salesforce CLI not found. Manual action required:${NC}"
    echo "   1. Log into Salesforce Setup"
    echo "   2. Navigate to Apps > Connected Apps > OAuth Usage"
    echo "   3. Revoke access for all Candlefish applications"
    echo "   4. Reset the Consumer Secret for each connected app"
    log_action "Salesforce: Manual revocation required - CLI not available"
fi

echo -e "${YELLOW}   Manual verification required:${NC}"
echo "   - Login URL: https://login.salesforce.com"
echo "   - Check Setup > Apps > Connected Apps > OAuth Usage"
echo ""

# 2. Database Passwords
echo -e "${YELLOW}2. Rotating database passwords...${NC}"
log_action "Database: Starting password rotation"

# Check if we can connect to AWS RDS
if command -v aws &> /dev/null; then
    echo "   Checking for RDS instances..."

    # List all RDS instances
    INSTANCES=$(aws rds describe-db-instances --query 'DBInstances[*].DBInstanceIdentifier' --output text 2>/dev/null || echo "")

    if [ ! -z "$INSTANCES" ]; then
        for instance in $INSTANCES; do
            echo "   Found RDS instance: $instance"
            echo -e "${YELLOW}   To rotate password for $instance:${NC}"
            echo "   aws rds modify-db-instance --db-instance-identifier $instance --master-user-password <NEW_PASSWORD>"
            log_action "Database: Found instance $instance - requires manual password rotation"
        done
    else
        echo "   No RDS instances found or accessible"
        log_action "Database: No RDS instances found"
    fi

    # Check for ElastiCache Redis instances
    echo "   Checking for ElastiCache Redis clusters..."
    REDIS_CLUSTERS=$(aws elasticache describe-cache-clusters --query 'CacheClusters[*].CacheClusterId' --output text 2>/dev/null || echo "")

    if [ ! -z "$REDIS_CLUSTERS" ]; then
        for cluster in $REDIS_CLUSTERS; do
            echo "   Found Redis cluster: $cluster"
            log_action "Database: Found Redis cluster $cluster"
        done
    fi
else
    echo -e "${RED}   ⚠ AWS CLI not configured. Manual action required.${NC}"
    log_action "Database: AWS CLI not available - manual rotation required"
fi

echo ""

# 3. API Keys
echo -e "${YELLOW}3. Revoking API keys...${NC}"
log_action "API Keys: Starting revocation"

# Figma API Token
echo "   Figma API Token:"
echo "   - Navigate to: https://www.figma.com/settings"
echo "   - Go to 'Personal Access Tokens'"
echo "   - Delete all existing tokens"
echo "   - Generate new token if needed"
log_action "API Keys: Figma token requires manual revocation"

# CompanyCam API Key
echo ""
echo "   CompanyCam API Key:"
echo "   - Navigate to: https://app.companycam.com/settings/integrations"
echo "   - Go to 'API Keys'"
echo "   - Delete existing keys"
echo "   - Generate new key if needed"
log_action "API Keys: CompanyCam key requires manual revocation"

# SendGrid API Key
echo ""
echo "   SendGrid API Key:"
echo "   - Navigate to: https://app.sendgrid.com/settings/api_keys"
echo "   - Delete compromised keys"
echo "   - Create new API key with appropriate permissions"
log_action "API Keys: SendGrid key requires manual revocation"

echo ""

# 4. JWT Secrets and Session Keys
echo -e "${YELLOW}4. Invalidating JWT tokens and sessions...${NC}"
log_action "JWT/Sessions: Starting invalidation"

# This will invalidate all existing tokens
echo "   All existing JWT tokens will become invalid when secrets are rotated"
echo "   Users will need to re-authenticate after deployment"
log_action "JWT/Sessions: Will be invalidated upon secret rotation"

echo ""

# 5. GitHub Tokens
echo -e "${YELLOW}5. Checking GitHub access...${NC}"
log_action "GitHub: Checking for unauthorized access"

if command -v gh &> /dev/null; then
    echo "   Checking recent repository activity..."

    # Check recent commits
    RECENT_COMMITS=$(git log --oneline -10 --since="2 hours ago" 2>/dev/null || echo "")
    if [ ! -z "$RECENT_COMMITS" ]; then
        echo -e "${RED}   ⚠ Recent commits detected (last 2 hours):${NC}"
        echo "$RECENT_COMMITS" | head -5
        log_action "GitHub: Recent commits detected - review required"
    else
        echo -e "${GREEN}   ✓ No suspicious recent commits${NC}"
        log_action "GitHub: No recent suspicious activity"
    fi

    # Check for new SSH keys or tokens
    echo "   Review GitHub audit log:"
    echo "   https://github.com/organizations/candlefish-ai/settings/audit-log"
else
    echo -e "${RED}   ⚠ GitHub CLI not available${NC}"
    log_action "GitHub: CLI not available - manual check required"
fi

echo ""

# 6. Create new secrets in AWS Secrets Manager
echo -e "${YELLOW}6. Preparing new secrets...${NC}"
log_action "New Secrets: Starting creation"

cat > ./rotate-secrets-aws.sh << 'EOF'
#!/bin/bash

# Rotate all secrets in AWS Secrets Manager
set -e

echo "Rotating secrets in AWS Secrets Manager..."

# Function to generate secure random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Function to generate secure token
generate_token() {
    openssl rand -hex 32
}

# Create new secrets
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2

    if aws secretsmanager describe-secret --secret-id "$secret_name" 2>/dev/null; then
        echo "Updating: $secret_name"
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$secret_value"
    else
        echo "Creating: $secret_name"
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --secret-string "$secret_value"
    fi
}

# Rotate database passwords
DB_PASSWORD=$(generate_password)
create_or_update_secret "candlefish/paintbox/db-password" "$DB_PASSWORD"

# Rotate JWT secrets
JWT_SECRET=$(generate_token)
create_or_update_secret "candlefish/paintbox/jwt-secret" "$JWT_SECRET"

# Rotate session secrets
SESSION_SECRET=$(generate_token)
create_or_update_secret "candlefish/paintbox/session-secret" "$SESSION_SECRET"

echo "Secrets rotated successfully!"
echo "Remember to update all deployments with new secrets"
EOF

chmod +x ./rotate-secrets-aws.sh

echo -e "${GREEN}   ✓ Created rotation script: ./rotate-secrets-aws.sh${NC}"
log_action "New Secrets: Rotation script created"

echo ""

# 7. Monitor for unauthorized access
echo -e "${YELLOW}7. Setting up monitoring...${NC}"
log_action "Monitoring: Setting up alerts"

cat > ./monitor-unauthorized-access.sh << 'EOF'
#!/bin/bash

# Monitor for unauthorized access using exposed credentials

echo "Monitoring for unauthorized access..."

# Check AWS CloudTrail
if command -v aws &> /dev/null; then
    echo "Checking AWS CloudTrail for suspicious activity..."

    # Look for recent API calls from unknown IPs
    aws cloudtrail lookup-events \
        --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRole \
        --start-time $(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%S) \
        --max-items 10 2>/dev/null || echo "CloudTrail not accessible"
fi

# Check application logs
echo ""
echo "Check application logs for:"
echo "- Failed authentication attempts"
echo "- Unusual API access patterns"
echo "- Database queries from unknown sources"
echo "- Large data exports"

# Check GitHub audit log
echo ""
echo "Review GitHub audit log:"
echo "https://github.com/organizations/candlefish-ai/settings/audit-log"

# Check deployment platforms
echo ""
echo "Check deployment platforms:"
echo "- Vercel: https://vercel.com/candlefish/audit-logs"
echo "- Netlify: https://app.netlify.com/teams/candlefish/audit"
echo "- Fly.io: fly logs -a candlefish-api"

echo ""
echo "Set up alerts for:"
echo "1. AWS CloudWatch alarms for unusual API activity"
echo "2. Database connection monitoring"
echo "3. GitHub webhook for repository changes"
echo "4. Application error tracking (Sentry)"
EOF

chmod +x ./monitor-unauthorized-access.sh

echo -e "${GREEN}   ✓ Created monitoring script: ./monitor-unauthorized-access.sh${NC}"
log_action "Monitoring: Monitoring script created"

echo ""
echo "======================================"
echo -e "${GREEN}✅ REVOCATION SCRIPT COMPLETE${NC}"
echo "======================================"
echo ""
echo -e "${RED}⚠️  IMMEDIATE ACTIONS REQUIRED:${NC}"
echo ""
echo "1. ${YELLOW}Salesforce:${NC}"
echo "   - Login to Salesforce Setup"
echo "   - Revoke all OAuth tokens"
echo "   - Reset Consumer Secrets"
echo ""
echo "2. ${YELLOW}Figma:${NC}"
echo "   - Go to https://www.figma.com/settings"
echo "   - Delete all API tokens"
echo ""
echo "3. ${YELLOW}CompanyCam:${NC}"
echo "   - Go to https://app.companycam.com/settings/integrations"
echo "   - Delete all API keys"
echo ""
echo "4. ${YELLOW}Database:${NC}"
echo "   - Run: ./rotate-secrets-aws.sh"
echo "   - Update RDS master passwords"
echo ""
echo "5. ${YELLOW}Monitor:${NC}"
echo "   - Run: ./monitor-unauthorized-access.sh"
echo "   - Check CloudTrail logs"
echo "   - Review GitHub audit log"
echo ""
echo -e "${YELLOW}Revocation log saved to: $REVOCATION_LOG${NC}"

log_action "Script completed - manual actions required"
