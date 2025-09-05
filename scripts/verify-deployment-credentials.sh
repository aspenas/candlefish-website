#!/bin/bash

# Deployment Credentials Verification Script
# Operational Design Atelier: Trust but verify

set -e

echo "🔍 Deployment Credentials Verification"
echo "======================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
OVERALL_STATUS=0

# Function to check status
check_status() {
    local name=$1
    local status=$2
    local details=$3
    
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $name: $details"
    else
        echo -e "${RED}✗${NC} $name: $details"
        OVERALL_STATUS=1
    fi
}

# 1. GitHub Authentication
echo "1. GitHub Authentication"
echo "------------------------"
if gh auth status &>/dev/null; then
    GH_USER=$(gh api user --jq '.login')
    check_status "GitHub Auth" 0 "Authenticated as $GH_USER"
    
    # Check repository access
    if gh api repos/aspenas/candlefish-website &>/dev/null; then
        check_status "Repository Access" 0 "Can access aspenas/candlefish-website"
    else
        check_status "Repository Access" 1 "Cannot access repository"
    fi
else
    check_status "GitHub Auth" 1 "Not authenticated"
fi
echo ""

# 2. GitHub Secrets
echo "2. GitHub Repository Secrets"
echo "----------------------------"
REQUIRED_SECRETS=("NETLIFY_AUTH_TOKEN" "NETLIFY_SITE_ID" "AWS_ACCOUNT_ID")
MISSING_SECRETS=()

for secret in "${REQUIRED_SECRETS[@]}"; do
    # We can't read the actual values, but we can check if they need to be set
    echo "  Checking: $secret (value hidden)"
done

echo -e "${YELLOW}Note:${NC} GitHub secrets cannot be read directly for security"
echo "      Please verify these are set in repository settings:"
echo "      https://github.com/aspenas/candlefish-website/settings/secrets/actions"
echo ""

# 3. AWS Credentials
echo "3. AWS Credentials"
echo "------------------"
if aws sts get-caller-identity &>/dev/null; then
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    AWS_USER=$(aws sts get-caller-identity --query Arn --output text)
    check_status "AWS Authentication" 0 "Account: $AWS_ACCOUNT"
    echo "  ARN: $AWS_USER"
    
    # Check Secrets Manager access
    if aws secretsmanager list-secrets --max-results 1 &>/dev/null; then
        SECRET_COUNT=$(aws secretsmanager list-secrets --query 'SecretList | length(@)' --output text)
        check_status "Secrets Manager Access" 0 "Can access Secrets Manager ($SECRET_COUNT secrets)"
    else
        check_status "Secrets Manager Access" 1 "Cannot access Secrets Manager"
    fi
else
    check_status "AWS Authentication" 1 "Not authenticated or invalid credentials"
    echo -e "${YELLOW}Hint:${NC} Check AWS credentials with: aws configure list"
fi
echo ""

# 4. Netlify Configuration
echo "4. Netlify Configuration"
echo "------------------------"
if [ -n "$NETLIFY_AUTH_TOKEN" ]; then
    check_status "NETLIFY_AUTH_TOKEN" 0 "Set in environment"
else
    check_status "NETLIFY_AUTH_TOKEN" 1 "Not found in environment"
fi

if [ -n "$NETLIFY_SITE_ID" ]; then
    check_status "NETLIFY_SITE_ID" 0 "Set in environment"
else
    check_status "NETLIFY_SITE_ID" 1 "Not found in environment"
fi

# Check if netlify CLI is available
if command -v netlify &>/dev/null; then
    check_status "Netlify CLI" 0 "Installed"
    
    # Try to list sites if authenticated
    if netlify status &>/dev/null; then
        check_status "Netlify Auth" 0 "CLI authenticated"
    else
        check_status "Netlify Auth" 1 "CLI not authenticated"
    fi
else
    check_status "Netlify CLI" 1 "Not installed"
fi
echo ""

# 5. Database Connections
echo "5. Database Connections"
echo "-----------------------"
# Check for common database environment variables
DB_VARS=("DATABASE_URL" "POSTGRES_URL" "REDIS_URL" "MONGODB_URI")
DB_FOUND=0

for var in "${DB_VARS[@]}"; do
    if [ -n "${!var}" ]; then
        # Mask the connection string for security
        MASKED=$(echo "${!var}" | sed 's/:\/\/[^@]*@/:\/\/****:****@/g')
        check_status "$var" 0 "Set (masked: $MASKED)"
        DB_FOUND=1
    fi
done

if [ $DB_FOUND -eq 0 ]; then
    echo -e "${YELLOW}Note:${NC} No database URLs found in environment"
fi
echo ""

# 6. CI/CD Workflow Status
echo "6. CI/CD Workflow Status"
echo "------------------------"
if gh workflow list --repo aspenas/candlefish-website --limit 5 &>/dev/null; then
    echo "Recent workflows:"
    gh workflow list --repo aspenas/candlefish-website --limit 5 | head -6
    
    echo ""
    echo "Latest runs:"
    gh run list --repo aspenas/candlefish-website --limit 3
else
    check_status "Workflow Access" 1 "Cannot access workflows"
fi
echo ""

# 7. Deployment Verification
echo "7. Deployment Verification"
echo "--------------------------"

# Check if production sites are accessible
SITES=(
    "https://candlefish.ai"
    "https://analytics.candlefish.ai"
)

for site in "${SITES[@]}"; do
    if curl -s -o /dev/null -w "%{http_code}" "$site" | grep -q "^[23]"; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$site")
        check_status "$site" 0 "HTTP $HTTP_CODE"
    else
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$site")
        check_status "$site" 1 "HTTP $HTTP_CODE"
    fi
done
echo ""

# 8. Required Files Check
echo "8. Required Files Check"
echo "-----------------------"
REQUIRED_FILES=(
    ".github/workflows/deploy-netlify-simple.yml"
    ".github/workflows/emergency-deploy.yml"
    "netlify.toml"
    "brand/website/package.json"
    "brand/website/scripts/static-export.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_status "$file" 0 "Present"
    else
        check_status "$file" 1 "Missing"
    fi
done
echo ""

# Final Summary
echo "======================================="
if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed${NC}"
else
    echo -e "${RED}✗ Some checks failed${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Set missing GitHub secrets at:"
    echo "   https://github.com/aspenas/candlefish-website/settings/secrets/actions"
    echo ""
    echo "2. Configure AWS credentials:"
    echo "   aws configure"
    echo ""
    echo "3. Set Netlify tokens:"
    echo "   export NETLIFY_AUTH_TOKEN='your-token'"
    echo "   export NETLIFY_SITE_ID='your-site-id'"
fi

exit $OVERALL_STATUS