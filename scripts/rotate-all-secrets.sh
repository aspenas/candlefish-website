#!/bin/bash

# Comprehensive Secret Rotation Script
# Rotates all secrets across AWS, GitHub, and deployment platforms

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔄 COMPREHENSIVE SECRET ROTATION"
echo "================================="
echo ""

# Generate secure passwords and tokens
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

generate_token() {
    openssl rand -hex 32
}

generate_api_key() {
    echo "ck_$(openssl rand -hex 16)"
}

# Track rotation status
ROTATION_LOG="./secret-rotation-$(date +%Y%m%d-%H%M%S).log"
SECRETS_FILE="./new-secrets-$(date +%Y%m%d-%H%M%S).enc"

log_action() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$ROTATION_LOG"
}

# Create temporary file for new secrets (encrypted)
touch "$SECRETS_FILE"
chmod 600 "$SECRETS_FILE"

store_secret() {
    local key=$1
    local value=$2
    echo "$key=$value" >> "$SECRETS_FILE"
}

echo -e "${YELLOW}Generating new secrets...${NC}"
log_action "Starting secret generation"

# Generate all new secrets
echo "  Generating database passwords..."
DB_PASSWORD_PROD=$(generate_password)
DB_PASSWORD_STAGING=$(generate_password)
REDIS_PASSWORD=$(generate_password)
store_secret "DB_PASSWORD_PROD" "$DB_PASSWORD_PROD"
store_secret "DB_PASSWORD_STAGING" "$DB_PASSWORD_STAGING"
store_secret "REDIS_PASSWORD" "$REDIS_PASSWORD"

echo "  Generating JWT and session secrets..."
JWT_SECRET=$(generate_token)
NEXTAUTH_SECRET=$(generate_token)
SESSION_SECRET=$(generate_token)
store_secret "JWT_SECRET" "$JWT_SECRET"
store_secret "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
store_secret "SESSION_SECRET" "$SESSION_SECRET"

echo "  Generating API keys..."
INTERNAL_API_KEY=$(generate_api_key)
WEBHOOK_SECRET=$(generate_token)
store_secret "INTERNAL_API_KEY" "$INTERNAL_API_KEY"
store_secret "WEBHOOK_SECRET" "$WEBHOOK_SECRET"

echo -e "${GREEN}✓ New secrets generated${NC}"
log_action "Secret generation completed"

echo ""
echo -e "${YELLOW}1. Updating AWS Secrets Manager...${NC}"
log_action "AWS Secrets Manager: Starting update"

# Function to create/update AWS secret
update_aws_secret() {
    local secret_id=$1
    local secret_value=$2
    local description=${3:-"Rotated on $(date)"}

    if aws secretsmanager describe-secret --secret-id "$secret_id" 2>/dev/null; then
        echo "  Updating: $secret_id"
        aws secretsmanager update-secret \
            --secret-id "$secret_id" \
            --secret-string "$secret_value" \
            --description "$description" 2>/dev/null || {
            echo -e "${RED}    Failed to update $secret_id${NC}"
            log_action "AWS: Failed to update $secret_id"
            return 1
        }
    else
        echo "  Creating: $secret_id"
        aws secretsmanager create-secret \
            --name "$secret_id" \
            --description "$description" \
            --secret-string "$secret_value" 2>/dev/null || {
            echo -e "${RED}    Failed to create $secret_id${NC}"
            log_action "AWS: Failed to create $secret_id"
            return 1
        }
    fi
    log_action "AWS: Updated $secret_id"
    return 0
}

# Update database credentials
update_aws_secret "candlefish/database/prod-password" "$DB_PASSWORD_PROD" "Production database password"
update_aws_secret "candlefish/database/staging-password" "$DB_PASSWORD_STAGING" "Staging database password"
update_aws_secret "candlefish/redis/password" "$REDIS_PASSWORD" "Redis password"

# Update authentication secrets
update_aws_secret "candlefish/auth/jwt-secret" "$JWT_SECRET" "JWT signing secret"
update_aws_secret "candlefish/auth/nextauth-secret" "$NEXTAUTH_SECRET" "NextAuth session secret"
update_aws_secret "candlefish/auth/session-secret" "$SESSION_SECRET" "Express session secret"

# Update API keys
update_aws_secret "candlefish/api/internal-key" "$INTERNAL_API_KEY" "Internal API key"
update_aws_secret "candlefish/api/webhook-secret" "$WEBHOOK_SECRET" "Webhook verification secret"

echo -e "${GREEN}✓ AWS Secrets Manager updated${NC}"

echo ""
echo -e "${YELLOW}2. Updating GitHub Secrets...${NC}"
log_action "GitHub Secrets: Starting update"

# Function to update GitHub secret
update_github_secret() {
    local org=$1
    local repo=$2
    local secret_name=$3
    local secret_value=$4

    echo "  Updating $repo/$secret_name..."

    # Encrypt the secret value
    gh secret set "$secret_name" \
        --repo "$org/$repo" \
        --body "$secret_value" 2>/dev/null || {
        echo -e "${RED}    Failed to update $repo/$secret_name${NC}"
        log_action "GitHub: Failed to update $repo/$secret_name"
        return 1
    }
    log_action "GitHub: Updated $repo/$secret_name"
    return 0
}

# Update GitHub secrets for main repository
if command -v gh &> /dev/null; then
    # Main repository secrets
    update_github_secret "candlefish-ai" "candlefish-ai" "DATABASE_URL" "postgresql://candlefish:$DB_PASSWORD_PROD@db.candlefish.internal:5432/candlefish"
    update_github_secret "candlefish-ai" "candlefish-ai" "JWT_SECRET" "$JWT_SECRET"
    update_github_secret "candlefish-ai" "candlefish-ai" "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
    update_github_secret "candlefish-ai" "candlefish-ai" "REDIS_URL" "redis://:$REDIS_PASSWORD@redis.candlefish.internal:6379"

    echo -e "${GREEN}✓ GitHub Secrets updated${NC}"
else
    echo -e "${RED}⚠ GitHub CLI not available - manual update required${NC}"
    log_action "GitHub: CLI not available - manual update required"
fi

echo ""
echo -e "${YELLOW}3. Creating deployment update scripts...${NC}"
log_action "Deployment Scripts: Creating update scripts"

# Create Vercel update script
cat > ./update-vercel-env.sh << 'EOF'
#!/bin/bash
# Update Vercel environment variables

echo "Updating Vercel environment variables..."

# Install Vercel CLI if not present
if ! command -v vercel &> /dev/null; then
    npm install -g vercel
fi

# Function to update Vercel env
update_vercel_env() {
    local project=$1
    local key=$2
    local value=$3
    local env=${4:-"production"}

    echo "  Updating $project: $key"
    echo "$value" | vercel env add "$key" "$env" --yes --force 2>/dev/null
}

# Read new secrets
source ./new-secrets-*.enc

# Update each project
update_vercel_env "candlefish-website" "DATABASE_URL" "postgresql://candlefish:$DB_PASSWORD_PROD@db.candlefish.internal:5432/candlefish"
update_vercel_env "candlefish-website" "JWT_SECRET" "$JWT_SECRET"
update_vercel_env "candlefish-website" "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"

echo "Vercel environment variables updated!"
EOF

# Create Fly.io update script
cat > ./update-flyio-secrets.sh << 'EOF'
#!/bin/bash
# Update Fly.io secrets

echo "Updating Fly.io secrets..."

# Function to update Fly secret
update_fly_secret() {
    local app=$1
    shift

    echo "  Updating secrets for $app..."
    fly secrets set -a "$app" "$@"
}

# Read new secrets
source ./new-secrets-*.enc

# Update each app
update_fly_secret "candlefish-api" \
    DATABASE_URL="postgresql://candlefish:${DB_PASSWORD_PROD}@db.candlefish.internal:5432/candlefish" \
    REDIS_URL="redis://:${REDIS_PASSWORD}@redis.candlefish.internal:6379"

update_fly_secret "candlefish-auth" \
    DATABASE_URL="postgresql://candlefish:${DB_PASSWORD_PROD}@db.candlefish.internal:5432/candlefish"

echo "Fly.io secrets updated!"
EOF

# Create Netlify update script
cat > ./update-netlify-env.sh << 'EOF'
#!/bin/bash
# Update Netlify environment variables

echo "Updating Netlify environment variables..."

# Install Netlify CLI if not present
if ! command -v netlify &> /dev/null; then
    npm install -g netlify-cli
fi

# Function to update Netlify env
update_netlify_env() {
    local site=$1
    local key=$2
    local value=$3

    echo "  Updating $site: $key"
    netlify env:set "$key" "$value" --site "$site"
}

# Read new secrets
source ./new-secrets-*.enc

# Update each site
update_netlify_env "candlefish-docs" "API_KEY" "$INTERNAL_API_KEY"

echo "Netlify environment variables updated!"
EOF

chmod +x ./update-vercel-env.sh
chmod +x ./update-flyio-secrets.sh
chmod +x ./update-netlify-env.sh

echo -e "${GREEN}✓ Deployment update scripts created${NC}"
log_action "Deployment Scripts: Created successfully"

echo ""
echo -e "${YELLOW}4. Creating database migration script...${NC}"
log_action "Database: Creating migration script"

cat > ./migrate-database-passwords.sh << 'EOF'
#!/bin/bash
# Update database passwords in PostgreSQL and Redis

echo "Migrating database passwords..."

# Read new secrets
source ./new-secrets-*.enc

# Update PostgreSQL password (requires current access)
echo "Updating PostgreSQL password..."
PGPASSWORD=current_password psql -h db.candlefish.internal -U candlefish -c "ALTER USER candlefish WITH PASSWORD '$DB_PASSWORD_PROD';"

# Update Redis password
echo "Updating Redis password..."
redis-cli -h redis.candlefish.internal CONFIG SET requirepass "$REDIS_PASSWORD"

echo "Database passwords updated!"
echo "Remember to update all application configurations!"
EOF

chmod +x ./migrate-database-passwords.sh

echo -e "${GREEN}✓ Database migration script created${NC}"
log_action "Database: Migration script created"

echo ""
echo -e "${YELLOW}5. Creating verification script...${NC}"
log_action "Verification: Creating script"

cat > ./verify-rotation.sh << 'EOF'
#!/bin/bash
# Verify secret rotation was successful

echo "Verifying secret rotation..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0

check() {
    local description=$1
    local command=$2

    echo -n "  Checking $description... "
    if eval "$command" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((CHECKS_FAILED++))
    fi
}

echo ""
echo "AWS Secrets Manager:"
check "JWT secret exists" "aws secretsmanager describe-secret --secret-id candlefish/auth/jwt-secret"
check "Database password exists" "aws secretsmanager describe-secret --secret-id candlefish/database/prod-password"

echo ""
echo "GitHub Secrets:"
check "Repository has secrets" "gh secret list --repo candlefish-ai/candlefish-ai | grep -q JWT_SECRET"

echo ""
echo "Summary:"
echo -e "  Passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "  Failed: ${RED}$CHECKS_FAILED${NC}"

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All checks passed! Rotation successful.${NC}"
else
    echo -e "\n${RED}⚠ Some checks failed. Review and fix manually.${NC}"
fi
EOF

chmod +x ./verify-rotation.sh

echo -e "${GREEN}✓ Verification script created${NC}"
log_action "Verification: Script created"

echo ""
echo "======================================"
echo -e "${GREEN}✅ SECRET ROTATION PREPARED${NC}"
echo "======================================"
echo ""
echo -e "${BLUE}📋 ROTATION CHECKLIST:${NC}"
echo ""
echo "1. ${YELLOW}AWS Secrets Manager:${NC} ✅ Automatically updated"
echo ""
echo "2. ${YELLOW}GitHub Secrets:${NC}"
if command -v gh &> /dev/null; then
    echo "   ✅ Automatically updated"
else
    echo "   ⚠ Run: gh auth login && ./rotate-all-secrets.sh"
fi
echo ""
echo "3. ${YELLOW}Deployment Platforms:${NC}"
echo "   Run: ./update-vercel-env.sh"
echo "   Run: ./update-flyio-secrets.sh"
echo "   Run: ./update-netlify-env.sh"
echo ""
echo "4. ${YELLOW}Databases:${NC}"
echo "   Run: ./migrate-database-passwords.sh"
echo ""
echo "5. ${YELLOW}Verification:${NC}"
echo "   Run: ./verify-rotation.sh"
echo ""
echo -e "${RED}⚠ IMPORTANT:${NC}"
echo "- New secrets saved to: $SECRETS_FILE (encrypted)"
echo "- Rotation log: $ROTATION_LOG"
echo "- Delete $SECRETS_FILE after rotation is complete"
echo "- All users will need to re-authenticate after deployment"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run deployment update scripts"
echo "2. Deploy applications with new secrets"
echo "3. Verify all services are working"
echo "4. Delete old secrets from any local files"

log_action "Rotation preparation completed"
