#!/bin/bash
# Emergency Secrets Audit Script - Candlefish AI Platform
# Identifies and catalogs all exposed secrets for immediate rotation

set -euo pipefail

AUDIT_DIR="/tmp/candlefish-secrets-audit-$(date +%Y%m%d-%H%M%S)"
REPORT_FILE="$AUDIT_DIR/secrets-audit-report.json"
CRITICAL_SECRETS_FILE="$AUDIT_DIR/critical-secrets.txt"

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}🚨 EMERGENCY SECRETS AUDIT INITIATED${NC}"
echo "Audit ID: $(date +%Y%m%d-%H%M%S)"
echo "Output Directory: $AUDIT_DIR"

# Create audit directory
mkdir -p "$AUDIT_DIR"

# Initialize JSON report
cat > "$REPORT_FILE" << EOF
{
  "audit_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "repository": "candlefish-ai",
  "severity": "CRITICAL",
  "exposed_secrets": [],
  "files_scanned": 0,
  "secrets_found": 0,
  "rotation_required": []
}
EOF

# Function to scan for secrets
scan_for_secrets() {
    local file=$1
    local secrets_found=false

    # Patterns to detect secrets
    local patterns=(
        'password.*=.*["\047][^"\047]+["\047]'
        'api[_-]?key.*=.*["\047][^"\047]+["\047]'
        'secret.*=.*["\047][^"\047]+["\047]'
        'token.*=.*["\047][^"\047]+["\047]'
        'AWS_SECRET_ACCESS_KEY'
        'GITHUB_TOKEN'
        'JWT_SECRET'
        'DATABASE_URL.*postgresql'
        'MONGODB_URI'
        'REDIS_URL'
        'STRIPE_SECRET_KEY'
        'SENDGRID_API_KEY'
        'TWILIO_AUTH_TOKEN'
    )

    for pattern in "${patterns[@]}"; do
        if grep -Ei "$pattern" "$file" > /dev/null 2>&1; then
            secrets_found=true
            echo -e "${RED}⚠️  SECRET FOUND:${NC} $file"

            # Extract the actual secret line
            local secret_line=$(grep -Ei "$pattern" "$file" | head -1)

            # Log to critical secrets file
            echo "FILE: $file" >> "$CRITICAL_SECRETS_FILE"
            echo "PATTERN: $pattern" >> "$CRITICAL_SECRETS_FILE"
            echo "LINE: $secret_line" >> "$CRITICAL_SECRETS_FILE"
            echo "---" >> "$CRITICAL_SECRETS_FILE"

            # Update JSON report
            jq --arg file "$file" \
               --arg pattern "$pattern" \
               --arg line "$secret_line" \
               '.exposed_secrets += [{
                   "file": $file,
                   "pattern": $pattern,
                   "line": $line,
                   "severity": "CRITICAL"
               }]' "$REPORT_FILE" > "$REPORT_FILE.tmp" && mv "$REPORT_FILE.tmp" "$REPORT_FILE"
        fi
    done

    echo "$secrets_found"
}

# Find all potential secret files
echo -e "${YELLOW}Scanning for exposed secrets...${NC}"

# Priority 1: Environment files
echo "Scanning .env files..."
find . -type f \( -name "*.env*" -o -name ".env" \) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | while read -r file; do
    scan_for_secrets "$file"
done

# Priority 2: Configuration files
echo "Scanning configuration files..."
find . -type f \( -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" \) \
    -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | grep -E "(config|secret|credential)" | while read -r file; do
    scan_for_secrets "$file"
done

# Priority 3: Kubernetes manifests
echo "Scanning Kubernetes manifests..."
find . -path "*/k8s/*" -name "*.yaml" -o -path "*/kubernetes/*" -name "*.yaml" 2>/dev/null | while read -r file; do
    scan_for_secrets "$file"
done

# Priority 4: Docker files
echo "Scanning Docker configurations..."
find . -name "docker-compose*.yml" -o -name "Dockerfile*" 2>/dev/null | while read -r file; do
    scan_for_secrets "$file"
done

# Count total secrets found
TOTAL_SECRETS=$(jq '.exposed_secrets | length' "$REPORT_FILE")
TOTAL_FILES=$(jq '.exposed_secrets | map(.file) | unique | length' "$REPORT_FILE")

# Update report with totals
jq --arg total "$TOTAL_SECRETS" \
   --arg files "$TOTAL_FILES" \
   '.secrets_found = ($total | tonumber) | .files_with_secrets = ($files | tonumber)' \
   "$REPORT_FILE" > "$REPORT_FILE.tmp" && mv "$REPORT_FILE.tmp" "$REPORT_FILE"

# Generate rotation priority list
echo -e "\n${RED}🔴 CRITICAL ROTATION PRIORITY:${NC}"
echo "1. AWS Credentials (IAM keys, access keys)"
echo "2. Database passwords (PostgreSQL, MongoDB, Redis)"
echo "3. JWT secrets and API tokens"
echo "4. Third-party service keys (Stripe, SendGrid, Twilio)"
echo "5. GitHub tokens and OAuth secrets"

# Create rotation script
cat > "$AUDIT_DIR/rotate-all-secrets.sh" << 'ROTATE_SCRIPT'
#!/bin/bash
# Automated Secret Rotation Script

echo "🔄 Starting automated secret rotation..."

# AWS Secrets Manager rotation
rotate_aws_secret() {
    local secret_name=$1
    echo "Rotating AWS secret: $secret_name"
    aws secretsmanager rotate-secret \
        --secret-id "$secret_name" \
        --rotation-lambda-arn "arn:aws:lambda:us-east-1:681214184463:function:SecretsManagerRotation" \
        --rotation-rules AutomaticallyAfterDays=30
}

# Database password rotation
rotate_database_password() {
    local db_identifier=$1
    local new_password=$(openssl rand -base64 32)

    echo "Rotating database password for: $db_identifier"

    # Update in AWS RDS
    aws rds modify-db-instance \
        --db-instance-identifier "$db_identifier" \
        --master-user-password "$new_password" \
        --apply-immediately

    # Store in Secrets Manager
    aws secretsmanager put-secret-value \
        --secret-id "rds/$db_identifier/password" \
        --secret-string "$new_password"
}

# JWT secret rotation
rotate_jwt_secret() {
    local new_secret=$(openssl rand -base64 64)

    echo "Rotating JWT secret..."

    # Store new secret
    aws secretsmanager put-secret-value \
        --secret-id "jwt/signing-key" \
        --secret-string "$new_secret"

    # Keep old secret for grace period (allows existing tokens to validate)
    aws secretsmanager put-secret-value \
        --secret-id "jwt/signing-key-previous" \
        --secret-string "$(aws secretsmanager get-secret-value --secret-id jwt/signing-key --query SecretString --output text)"
}

# Execute rotations
rotate_aws_secret "candlefish/api-keys"
rotate_database_password "candlefish-prod-db"
rotate_jwt_secret

echo "✅ Secret rotation completed"
ROTATE_SCRIPT

chmod +x "$AUDIT_DIR/rotate-all-secrets.sh"

# Generate summary
echo -e "\n${RED}═══════════════════════════════════════════════════════${NC}"
echo -e "${RED}            SECURITY AUDIT SUMMARY                      ${NC}"
echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
echo -e "Total Secrets Found: ${RED}$TOTAL_SECRETS${NC}"
echo -e "Files with Secrets: ${RED}$TOTAL_FILES${NC}"
echo -e "Audit Report: ${YELLOW}$REPORT_FILE${NC}"
echo -e "Critical Secrets: ${YELLOW}$CRITICAL_SECRETS_FILE${NC}"
echo -e "Rotation Script: ${GREEN}$AUDIT_DIR/rotate-all-secrets.sh${NC}"
echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
echo -e "\n${RED}⚠️  IMMEDIATE ACTION REQUIRED:${NC}"
echo "1. Run rotation script: $AUDIT_DIR/rotate-all-secrets.sh"
echo "2. Remove all .env files from repository"
echo "3. Update all services with new credentials"
echo "4. Invalidate all existing sessions"

# Create removal script
cat > "$AUDIT_DIR/remove-all-env-files.sh" << 'REMOVE_SCRIPT'
#!/bin/bash
# Remove all environment files from repository

echo "🗑️  Removing all .env files from repository..."

# Create backup first
BACKUP_DIR="/tmp/env-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Find and backup env files
find . -type f -name "*.env*" -not -path "*/node_modules/*" | while read -r file; do
    cp "$file" "$BACKUP_DIR/$(echo $file | tr '/' '_')"
    git rm --cached "$file" 2>/dev/null || rm "$file"
done

# Update .gitignore
cat >> .gitignore << 'GITIGNORE'

# Environment files - NEVER COMMIT
*.env
*.env.*
.env*
!.env.example
!.env.template

# Secrets and credentials
*secrets*
*credentials*
*.key
*.pem
*.p12
*.pfx
GITIGNORE

echo "✅ Environment files removed and backed up to: $BACKUP_DIR"
REMOVE_SCRIPT

chmod +x "$AUDIT_DIR/remove-all-env-files.sh"

exit 0
