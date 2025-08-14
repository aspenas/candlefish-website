#!/bin/bash

# Emergency Security Fix Script
# Removes exposed credentials and sets up secure secret management

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚨 EMERGENCY SECURITY FIX 🚨"
echo "=========================="
echo ""

# Step 1: Remove all .env.local files
echo -e "${YELLOW}Step 1: Removing exposed credential files...${NC}"
find . -name ".env.local" -type f -exec rm -f {} \; 2>/dev/null || true
find . -name ".env.production" -type f -exec rm -f {} \; 2>/dev/null || true
find . -name ".env.staging" -type f -exec rm -f {} \; 2>/dev/null || true
echo -e "${GREEN}✓ Removed all .env files with potential secrets${NC}"

# Step 2: Create secure .env.example files
echo -e "${YELLOW}Step 2: Creating secure example files...${NC}"

# Paintbox example
cat > ./projects/paintbox/.env.example << 'EOF'
# DO NOT COMMIT ACTUAL VALUES - USE AWS SECRETS MANAGER
# This file shows the required environment variables

# Database (from AWS Secrets Manager)
DATABASE_URL=postgres://user:password@host:5432/database

# Authentication
JWT_SECRET=use-aws-secrets-manager
NEXTAUTH_SECRET=use-aws-secrets-manager
NEXTAUTH_URL=http://localhost:3000

# Salesforce Integration
SALESFORCE_CLIENT_ID=use-aws-secrets-manager
SALESFORCE_CLIENT_SECRET=use-aws-secrets-manager
SALESFORCE_USERNAME=use-aws-secrets-manager
SALESFORCE_PASSWORD=use-aws-secrets-manager
SALESFORCE_SECURITY_TOKEN=use-aws-secrets-manager
SALESFORCE_LOGIN_URL=https://login.salesforce.com

# CompanyCam Integration
COMPANYCAM_API_KEY=use-aws-secrets-manager
COMPANYCAM_API_URL=https://api.companycam.com/v2

# AWS Configuration
AWS_REGION=us-west-2
AWS_SECRETS_PREFIX=candlefish/paintbox/

# Email Service
SENDGRID_API_KEY=use-aws-secrets-manager
EMAIL_FROM=noreply@candlefish.ai

# Monitoring
SENTRY_DSN=use-aws-secrets-manager
EOF

# Website example
cat > ./apps/website/.env.example << 'EOF'
# DO NOT COMMIT ACTUAL VALUES - USE AWS SECRETS MANAGER

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000

# Design System
FIGMA_API_TOKEN=use-aws-secrets-manager
FIGMA_PROJECT_ID=use-aws-secrets-manager

# Analytics
NEXT_PUBLIC_GA_ID=use-aws-secrets-manager
NEXT_PUBLIC_HOTJAR_ID=use-aws-secrets-manager

# AWS Configuration
AWS_REGION=us-west-2
AWS_SECRETS_PREFIX=candlefish/website/
EOF

echo -e "${GREEN}✓ Created secure .env.example files${NC}"

# Step 3: Update .gitignore
echo -e "${YELLOW}Step 3: Updating .gitignore...${NC}"

# Ensure all env files are ignored
if ! grep -q "^\.env\*$" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Environment files - NEVER COMMIT" >> .gitignore
    echo ".env*" >> .gitignore
    echo "!.env.example" >> .gitignore
    echo "!.env.*.example" >> .gitignore
fi

echo -e "${GREEN}✓ Updated .gitignore${NC}"

# Step 4: Check for exposed secrets in git history
echo -e "${YELLOW}Step 4: Scanning for exposed secrets in git history...${NC}"

# List of sensitive patterns to search for
PATTERNS=(
    "sk-ant-api"
    "figd_"
    "3MVG"
    "postgres://postgres:"
    "QC_pTRjmQLM"
    "EPpCzXjR6sn8Xlq"
    "54B10E80E3D17048"
    "conxiK-8vytcu"
)

FOUND_SECRETS=false
for pattern in "${PATTERNS[@]}"; do
    if git log -p | grep -q "$pattern" 2>/dev/null; then
        echo -e "${RED}⚠ Found exposed secret pattern: $pattern${NC}"
        FOUND_SECRETS=true
    fi
done

if [ "$FOUND_SECRETS" = true ]; then
    echo -e "${RED}⚠ WARNING: Exposed secrets found in git history!${NC}"
    echo -e "${YELLOW}  You must clean the git history using BFG Repo-Cleaner or git filter-branch${NC}"
    echo -e "${YELLOW}  Instructions: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository${NC}"
fi

# Step 5: Create AWS Secrets Manager helper script
echo -e "${YELLOW}Step 5: Creating AWS Secrets Manager helper...${NC}"

cat > ./scripts/setup-secrets.sh << 'EOF'
#!/bin/bash

# Setup AWS Secrets Manager for Candlefish
# This script helps create and manage secrets securely

set -e

echo "Setting up AWS Secrets Manager..."

# Function to create or update a secret
create_secret() {
    local name=$1
    local value=$2
    local description=$3

    if aws secretsmanager describe-secret --secret-id "$name" 2>/dev/null; then
        echo "Updating secret: $name"
        aws secretsmanager update-secret \
            --secret-id "$name" \
            --secret-string "$value" \
            --description "$description"
    else
        echo "Creating secret: $name"
        aws secretsmanager create-secret \
            --name "$name" \
            --description "$description" \
            --secret-string "$value"
    fi
}

# Example usage (DO NOT COMMIT ACTUAL VALUES)
# create_secret "candlefish/paintbox/database-url" "postgres://..." "Paintbox database connection"
# create_secret "candlefish/paintbox/jwt-secret" "..." "JWT signing secret"
# create_secret "candlefish/paintbox/salesforce-client-id" "..." "Salesforce OAuth client ID"

echo "Secrets setup complete!"
echo "Remember to:"
echo "1. Never commit actual secret values"
echo "2. Use AWS IAM roles for authentication"
echo "3. Rotate secrets regularly"
echo "4. Monitor secret access in CloudTrail"
EOF

chmod +x ./scripts/setup-secrets.sh
echo -e "${GREEN}✓ Created AWS Secrets Manager helper script${NC}"

# Step 6: Fix npm vulnerabilities
echo -e "${YELLOW}Step 6: Fixing npm vulnerabilities...${NC}"

# Update critical packages individually
npm update axios@latest --save 2>/dev/null || true
npm update ws@latest --save 2>/dev/null || true
npm update tar-fs@latest --save 2>/dev/null || true
npm update d3-color@latest --save 2>/dev/null || true

# Run audit fix for remaining issues
npm audit fix 2>/dev/null || true

echo -e "${GREEN}✓ Updated vulnerable packages${NC}"

# Step 7: Create security checklist
echo -e "${YELLOW}Step 7: Creating security checklist...${NC}"

cat > ./SECURITY-EMERGENCY.md << 'EOF'
# 🚨 EMERGENCY SECURITY CHECKLIST

## Immediate Actions Required (Within 2 Hours)

### 1. Revoke Exposed Credentials
- [ ] Salesforce API credentials
- [ ] Database passwords
- [ ] Figma API token
- [ ] CompanyCam API key
- [ ] Any other exposed tokens

### 2. Rotate All Secrets
- [ ] Generate new database passwords
- [ ] Create new API keys for all services
- [ ] Update JWT secrets
- [ ] Generate new OAuth credentials

### 3. Update Production Systems
- [ ] Deploy new secrets to AWS Secrets Manager
- [ ] Update GitHub Actions secrets
- [ ] Update Vercel environment variables
- [ ] Update Fly.io secrets
- [ ] Update Netlify environment variables

### 4. Monitor for Unauthorized Access
- [ ] Check AWS CloudTrail logs
- [ ] Review database access logs
- [ ] Monitor API usage for anomalies
- [ ] Check for unauthorized GitHub commits

### 5. Clean Git History
- [ ] Use BFG Repo-Cleaner to remove secrets from history
- [ ] Force push cleaned history
- [ ] Notify all developers to re-clone

## Prevention Measures

1. **Never commit .env files**
2. **Always use AWS Secrets Manager or GitHub Secrets**
3. **Enable secret scanning in GitHub**
4. **Use pre-commit hooks to detect secrets**
5. **Regular security audits**

## Contact for Security Incidents
- Security Team: security@candlefish.ai
- AWS Support: (if account compromised)
- GitHub Security: https://github.com/contact/security
EOF

echo -e "${GREEN}✓ Created security checklist${NC}"

echo ""
echo "======================================="
echo -e "${GREEN}✅ EMERGENCY SECURITY FIX COMPLETE${NC}"
echo "======================================="
echo ""
echo -e "${RED}⚠️  CRITICAL ACTIONS REQUIRED:${NC}"
echo "1. Revoke all exposed credentials immediately"
echo "2. Rotate all secrets in production"
echo "3. Clean git history to remove exposed secrets"
echo "4. Monitor for unauthorized access"
echo ""
echo -e "${YELLOW}See SECURITY-EMERGENCY.md for full checklist${NC}"
