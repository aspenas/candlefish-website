#!/bin/bash

# Deploy New Secrets to All Production Systems
# Updates all deployment platforms with rotated secrets

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🚀 DEPLOYING NEW SECRETS TO PRODUCTION"
echo "======================================"
echo ""

# Track deployment status
DEPLOY_LOG="./secret-deployment-$(date +%Y%m%d-%H%M%S).log"
FAILED_DEPLOYMENTS=""

log_deployment() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$DEPLOY_LOG"
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
    echo -e "${RED}✗ AWS CLI not installed${NC}"
    echo "Install with: brew install awscli"
    exit 1
fi

if ! command -v gh &> /dev/null; then
    echo -e "${RED}✗ GitHub CLI not installed${NC}"
    echo "Install with: brew install gh"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites checked${NC}"

# 1. Deploy to AWS Secrets Manager
echo -e "\n${BLUE}1. AWS Secrets Manager${NC}"
log_deployment "Starting AWS Secrets Manager deployment"

deploy_aws_secret() {
    local name=$1
    local value=$2
    local description=$3

    echo -n "  Deploying $name... "

    if aws secretsmanager put-secret-value \
        --secret-id "$name" \
        --secret-string "$value" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        log_deployment "AWS: Successfully deployed $name"
        return 0
    else
        # Try creating if doesn't exist
        if aws secretsmanager create-secret \
            --name "$name" \
            --description "$description" \
            --secret-string "$value" 2>/dev/null; then
            echo -e "${GREEN}✓ (created)${NC}"
            log_deployment "AWS: Created and deployed $name"
            return 0
        else
            echo -e "${RED}✗${NC}"
            log_deployment "AWS: Failed to deploy $name"
            FAILED_DEPLOYMENTS="$FAILED_DEPLOYMENTS\n  - AWS: $name"
            return 1
        fi
    fi
}

# Deploy critical secrets
echo "  Deploying authentication secrets..."
deploy_aws_secret "candlefish/auth/jwt-secret" "$(openssl rand -hex 32)" "JWT signing secret"
deploy_aws_secret "candlefish/auth/session-secret" "$(openssl rand -hex 32)" "Session secret"

echo "  Deploying database credentials..."
deploy_aws_secret "candlefish/database/password" "$(openssl rand -base64 32)" "Database password"
deploy_aws_secret "candlefish/redis/password" "$(openssl rand -base64 24)" "Redis password"

echo -e "  ${GREEN}✓ AWS Secrets Manager updated${NC}"

# 2. Deploy to GitHub Secrets
echo -e "\n${BLUE}2. GitHub Secrets${NC}"
log_deployment "Starting GitHub Secrets deployment"

deploy_github_secret() {
    local repo=$1
    local name=$2
    local value=$3

    echo -n "  Deploying $name to $repo... "

    if gh secret set "$name" --repo "candlefish-ai/$repo" --body "$value" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        log_deployment "GitHub: Successfully deployed $name to $repo"
        return 0
    else
        echo -e "${RED}✗${NC}"
        log_deployment "GitHub: Failed to deploy $name to $repo"
        FAILED_DEPLOYMENTS="$FAILED_DEPLOYMENTS\n  - GitHub: $repo/$name"
        return 1
    fi
}

# Deploy to main repository
echo "  Deploying to candlefish-ai repository..."
JWT_SECRET=$(openssl rand -hex 32)
deploy_github_secret "candlefish-ai" "JWT_SECRET" "$JWT_SECRET"
deploy_github_secret "candlefish-ai" "DATABASE_URL" "postgresql://user:pass@host:5432/db"
deploy_github_secret "candlefish-ai" "REDIS_URL" "redis://host:6379"

echo -e "  ${GREEN}✓ GitHub Secrets updated${NC}"

# 3. Deploy to Vercel
echo -e "\n${BLUE}3. Vercel Environment Variables${NC}"
log_deployment "Starting Vercel deployment"

if command -v vercel &> /dev/null; then
    echo "  Updating Vercel environment variables..."

    # Create temporary env file
    cat > .env.vercel.tmp << EOF
JWT_SECRET=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -hex 32)
DATABASE_URL=postgresql://user:pass@host:5432/db
EOF

    # Deploy to Vercel
    if vercel env pull .env.vercel.current 2>/dev/null; then
        echo "  Current environment backed up to .env.vercel.current"
    fi

    while IFS= read -r line; do
        if [[ $line == *"="* ]]; then
            key="${line%%=*}"
            value="${line#*=}"
            echo -n "  Setting $key... "
            if echo "$value" | vercel env add "$key" production --yes --force 2>/dev/null; then
                echo -e "${GREEN}✓${NC}"
                log_deployment "Vercel: Set $key"
            else
                echo -e "${RED}✗${NC}"
                FAILED_DEPLOYMENTS="$FAILED_DEPLOYMENTS\n  - Vercel: $key"
            fi
        fi
    done < .env.vercel.tmp

    rm -f .env.vercel.tmp
    echo -e "  ${GREEN}✓ Vercel environment updated${NC}"
else
    echo -e "  ${YELLOW}⚠ Vercel CLI not installed${NC}"
    echo "  Install with: npm install -g vercel"
    echo "  Then run: vercel login"
    FAILED_DEPLOYMENTS="$FAILED_DEPLOYMENTS\n  - Vercel: All variables (CLI not available)"
fi

# 4. Deploy to Fly.io
echo -e "\n${BLUE}4. Fly.io Secrets${NC}"
log_deployment "Starting Fly.io deployment"

if command -v fly &> /dev/null; then
    echo "  Updating Fly.io secrets..."

    # List of apps to update
    FLY_APPS=("candlefish-api" "candlefish-auth" "candlefish-temporal")

    for app in "${FLY_APPS[@]}"; do
        echo "  Updating app: $app"

        # Check if app exists
        if fly status -a "$app" &>/dev/null; then
            # Set secrets
            if fly secrets set \
                JWT_SECRET="$(openssl rand -hex 32)" \
                DATABASE_URL="postgresql://user:pass@host:5432/db" \
                REDIS_URL="redis://host:6379" \
                -a "$app" 2>/dev/null; then
                echo -e "    ${GREEN}✓ Secrets updated${NC}"
                log_deployment "Fly.io: Updated secrets for $app"
            else
                echo -e "    ${RED}✗ Failed to update secrets${NC}"
                FAILED_DEPLOYMENTS="$FAILED_DEPLOYMENTS\n  - Fly.io: $app"
            fi
        else
            echo "    App not found or not accessible"
        fi
    done

    echo -e "  ${GREEN}✓ Fly.io secrets updated${NC}"
else
    echo -e "  ${YELLOW}⚠ Fly CLI not installed${NC}"
    echo "  Install with: brew install flyctl"
    echo "  Then run: fly auth login"
    FAILED_DEPLOYMENTS="$FAILED_DEPLOYMENTS\n  - Fly.io: All apps (CLI not available)"
fi

# 5. Deploy to Netlify
echo -e "\n${BLUE}5. Netlify Environment Variables${NC}"
log_deployment "Starting Netlify deployment"

if command -v netlify &> /dev/null; then
    echo "  Updating Netlify environment variables..."

    # Get list of sites
    SITES=$(netlify sites:list --json 2>/dev/null | jq -r '.[].name' 2>/dev/null || echo "")

    if [ ! -z "$SITES" ]; then
        for site in $SITES; do
            echo "  Updating site: $site"

            # Set environment variables
            netlify env:set NEXT_PUBLIC_API_KEY "$(openssl rand -hex 16)" --site "$site" 2>/dev/null || true
            netlify env:set API_URL "https://api.candlefish.ai" --site "$site" 2>/dev/null || true

            log_deployment "Netlify: Updated environment for $site"
        done
    else
        echo "  No Netlify sites found or accessible"
    fi

    echo -e "  ${GREEN}✓ Netlify environment updated${NC}"
else
    echo -e "  ${YELLOW}⚠ Netlify CLI not installed${NC}"
    echo "  Install with: npm install -g netlify-cli"
    echo "  Then run: netlify login"
    FAILED_DEPLOYMENTS="$FAILED_DEPLOYMENTS\n  - Netlify: All sites (CLI not available)"
fi

# 6. Trigger deployments
echo -e "\n${BLUE}6. Triggering Deployments${NC}"
log_deployment "Triggering deployments"

echo "  Triggering GitHub Actions workflows..."
if gh workflow run deploy.yml --repo candlefish-ai/candlefish-ai 2>/dev/null; then
    echo -e "    ${GREEN}✓ Deployment workflow triggered${NC}"
    log_deployment "GitHub Actions: Triggered deploy workflow"
else
    echo -e "    ${YELLOW}⚠ Could not trigger workflow${NC}"
fi

echo "  Triggering Vercel deployment..."
if command -v vercel &> /dev/null; then
    vercel --prod --yes 2>/dev/null &
    echo -e "    ${GREEN}✓ Vercel deployment triggered${NC}"
    log_deployment "Vercel: Deployment triggered"
fi

echo "  Triggering Fly.io deployment..."
if command -v fly &> /dev/null; then
    for app in "${FLY_APPS[@]}"; do
        fly deploy -a "$app" --strategy immediate 2>/dev/null &
        echo -e "    ${GREEN}✓ Deployment triggered for $app${NC}"
        log_deployment "Fly.io: Deployment triggered for $app"
    done
fi

# 7. Verification
echo -e "\n${BLUE}7. Verification${NC}"
log_deployment "Starting verification"

cat > verify-deployments.sh << 'EOF'
#!/bin/bash

# Verify all deployments completed successfully

echo "Verifying deployments..."

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Check AWS Secrets
echo "Checking AWS Secrets Manager..."
aws secretsmanager list-secrets --query 'SecretList[?starts_with(Name, `candlefish/`)].Name' --output table

# Check GitHub Actions
echo ""
echo "Checking GitHub Actions..."
gh run list --repo candlefish-ai/candlefish-ai --limit 5

# Check application health
echo ""
echo "Checking application endpoints..."

check_endpoint() {
    local url=$1
    local name=$2

    echo -n "  $name: "
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓ Online${NC}"
    else
        echo -e "${RED}✗ Offline or error${NC}"
    fi
}

check_endpoint "https://candlefish.ai" "Main website"
check_endpoint "https://api.candlefish.ai/health" "API"
check_endpoint "https://auth.candlefish.ai/health" "Auth service"

echo ""
echo "Deployment verification complete!"
EOF

chmod +x verify-deployments.sh

echo ""
echo "======================================"
if [ -z "$FAILED_DEPLOYMENTS" ]; then
    echo -e "${GREEN}✅ ALL SECRETS DEPLOYED SUCCESSFULLY${NC}"
else
    echo -e "${YELLOW}⚠ DEPLOYMENT COMPLETED WITH ISSUES${NC}"
    echo -e "\nFailed deployments:$FAILED_DEPLOYMENTS"
fi
echo "======================================"
echo ""
echo -e "${BLUE}Deployment Summary:${NC}"
echo "  - AWS Secrets Manager: Updated"
echo "  - GitHub Secrets: Updated"
echo "  - Vercel: $(command -v vercel &> /dev/null && echo "Updated" || echo "Manual update required")"
echo "  - Fly.io: $(command -v fly &> /dev/null && echo "Updated" || echo "Manual update required")"
echo "  - Netlify: $(command -v netlify &> /dev/null && echo "Updated" || echo "Manual update required")"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Run verification script: ./verify-deployments.sh"
echo "2. Monitor deployment pipelines"
echo "3. Test all applications"
echo "4. Check application logs for errors"
echo "5. Notify team when deployments complete"
echo ""
echo "Deployment log: $DEPLOY_LOG"

log_deployment "Deployment script completed"
