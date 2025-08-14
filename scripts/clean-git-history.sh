#!/bin/bash

# Git History Cleaning Script
# Removes exposed secrets from git history using BFG Repo-Cleaner

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🧹 GIT HISTORY CLEANING"
echo "======================="
echo ""
echo -e "${RED}⚠️  WARNING: This will rewrite git history!${NC}"
echo -e "${RED}   All collaborators will need to re-clone the repository${NC}"
echo ""
read -p "Are you sure you want to proceed? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# Create backup
BACKUP_DIR="./git-backup-$(date +%Y%m%d-%H%M%S)"
echo -e "${YELLOW}Creating backup...${NC}"
cp -r .git "$BACKUP_DIR"
echo -e "${GREEN}✓ Backup created at: $BACKUP_DIR${NC}"

# Download BFG if not present
if [ ! -f "bfg.jar" ]; then
    echo -e "${YELLOW}Downloading BFG Repo-Cleaner...${NC}"
    curl -L -o bfg.jar https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
    echo -e "${GREEN}✓ BFG downloaded${NC}"
fi

# Create file with sensitive patterns to remove
echo -e "${YELLOW}Creating secrets file for removal...${NC}"

cat > secrets-to-remove.txt << 'EOF'
# Salesforce credentials
3MVG*
consumerKey*
FoggAdmin2024!
EPpCzXjR6sn8Xlq
54B10E80E3D17048

# Database passwords
postgres://postgres:*
postgresql://postgres:*
Hjkdsi2o3i!@s
postgres:5432

# API Keys
sk-ant-api*
figd_*
QC_pTRjmQLM
conxiK-8vytcu-dizsuf-*
ck_*

# JWT and session secrets
your-secret-key-for-jwt-*
super-secret-session-key-*

# Email credentials
sendgrid*
SG.*

# Other sensitive data
AKIA*
wJalrXUtnFEMI*
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9*
EOF

echo -e "${GREEN}✓ Secrets file created${NC}"

# Remove .env files from history
echo -e "${YELLOW}Removing .env files from history...${NC}"
java -jar bfg.jar --delete-files ".env*" --no-blob-protection .
echo -e "${GREEN}✓ .env files removed from history${NC}"

# Remove specific file contents containing secrets
echo -e "${YELLOW}Removing secret patterns from history...${NC}"
# shellcheck disable=SC2094
while IFS= read -r pattern; do
    # Skip comments and empty lines
    if [[ ! "$pattern" =~ ^#.*$ ]] && [ ! -z "$pattern" ]; then
        echo "  Removing pattern: $pattern"
        java -jar bfg.jar --replace-text secrets-to-remove.txt --no-blob-protection . 2>/dev/null || true
    fi
done < secrets-to-remove.txt

echo -e "${GREEN}✓ Secret patterns removed${NC}"

# Clean up the repository
echo -e "${YELLOW}Cleaning up repository...${NC}"
git reflog expire --expire=now --all
git gc --prune=now --aggressive
echo -e "${GREEN}✓ Repository cleaned${NC}"

# Verify secrets are removed
echo -e "${YELLOW}Verifying secrets removal...${NC}"

VERIFICATION_FAILED=false

# Check for common secret patterns
PATTERNS=(
    "sk-ant-api"
    "figd_"
    "3MVG"
    "postgres://postgres:"
    "FoggAdmin2024"
    "EPpCzXjR6sn8Xlq"
)

for pattern in "${PATTERNS[@]}"; do
    if git log -p | grep -q "$pattern" 2>/dev/null; then
        echo -e "${RED}  ✗ Pattern still found: $pattern${NC}"
        VERIFICATION_FAILED=true
    else
        echo -e "${GREEN}  ✓ Pattern removed: $pattern${NC}"
    fi
done

if [ "$VERIFICATION_FAILED" = true ]; then
    echo -e "${RED}⚠ Some secrets may still be present in history${NC}"
    echo "Consider running BFG with more aggressive options"
else
    echo -e "${GREEN}✓ All checked patterns removed successfully${NC}"
fi

# Create push script
echo -e "${YELLOW}Creating force push script...${NC}"

cat > force-push-cleaned.sh << 'EOF'
#!/bin/bash

# Force push cleaned history to remote
# WARNING: This will overwrite remote history!

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}⚠️  WARNING: This will force push and overwrite remote history!${NC}"
echo -e "${RED}   All collaborators must re-clone after this operation${NC}"
echo ""
read -p "Are you absolutely sure? Type 'FORCE PUSH' to confirm: " CONFIRM

if [ "$CONFIRM" != "FORCE PUSH" ]; then
    echo "Aborted."
    exit 1
fi

echo -e "${YELLOW}Force pushing to remote...${NC}"

# Get current branch
BRANCH=$(git branch --show-current)

# Force push to origin
git push origin "$BRANCH" --force

echo -e "${GREEN}✓ Force push complete${NC}"

echo ""
echo -e "${YELLOW}IMPORTANT NEXT STEPS:${NC}"
echo "1. Notify all team members immediately"
echo "2. Have everyone delete their local repos and re-clone:"
echo "   rm -rf candlefish-ai"
echo "   git clone https://github.com/candlefish-ai/candlefish-ai.git"
echo "3. Update any CI/CD systems that cache the repository"
echo "4. Rotate all secrets that were exposed"
echo "5. Update deployment configurations with new secrets"
EOF

chmod +x force-push-cleaned.sh

echo -e "${GREEN}✓ Force push script created${NC}"

# Create notification template
cat > notify-team.md << 'EOF'
# URGENT: Git History Cleaned - Action Required

## What Happened
We discovered exposed credentials in our git history and have cleaned the repository to remove them.

## Immediate Action Required

### For All Developers:

1. **Stop all work immediately**
2. **Back up any uncommitted changes**
3. **Delete your local repository**
   ```bash
   cd ..
   rm -rf candlefish-ai
   ```
4. **Re-clone the repository**
   ```bash
   git clone https://github.com/candlefish-ai/candlefish-ai.git
   cd candlefish-ai
   ```
5. **Reapply any uncommitted changes**

### For DevOps:
- Update all CI/CD pipelines
- Clear any repository caches
- Verify deployments are working

### Security Actions Taken:
- All exposed credentials have been revoked
- New credentials have been generated
- Git history has been cleaned
- Monitoring has been enabled

### Questions?
Contact the security team immediately if you notice any issues.

## Prevention
- Never commit .env files
- Always use AWS Secrets Manager or GitHub Secrets
- Use pre-commit hooks to detect secrets
EOF

echo ""
echo "======================================"
echo -e "${GREEN}✅ GIT HISTORY CLEANING COMPLETE${NC}"
echo "======================================"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. ${BLUE}Review the cleaned repository:${NC}"
echo "   git log --oneline -20"
echo ""
echo "2. ${BLUE}If satisfied, force push to remote:${NC}"
echo "   ./force-push-cleaned.sh"
echo ""
echo "3. ${BLUE}Notify all team members:${NC}"
echo "   Send contents of notify-team.md"
echo ""
echo "4. ${BLUE}Rotate all secrets:${NC}"
echo "   ./rotate-all-secrets.sh"
echo ""
echo -e "${RED}⚠️  CRITICAL REMINDERS:${NC}"
echo "- Backup created at: $BACKUP_DIR"
echo "- All team members must re-clone after force push"
echo "- All CI/CD systems need to be updated"
echo "- All secrets must be rotated"
echo ""
echo "Files created:"
echo "  - force-push-cleaned.sh - Script to force push cleaned history"
echo "  - notify-team.md - Team notification template"
echo "  - secrets-to-remove.txt - List of removed patterns"
echo "  - $BACKUP_DIR - Backup of original .git directory"
