#!/bin/bash

# Claude Configuration Security Fix Script v2.0
# Fixes identified security vulnerabilities in ~/.claude directory
# Author: Security Audit System
# Date: 2025-09-01

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLAUDE_DIR="$HOME/.claude"
SECURE_DIR="$CLAUDE_DIR/.secure"
BACKUP_DIR="$CLAUDE_DIR/backups/security_fix_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="$CLAUDE_DIR/security_fix.log"
AWS_ACCOUNT_ID="681214184463"

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Check if running as correct user
check_user() {
    if [[ "$USER" != "patricksmith" ]]; then
        log "${RED}Error: This script must be run as user 'patricksmith'${NC}"
        exit 1
    fi
}

# Create backup of current state
create_backup() {
    log "${BLUE}Creating backup of current configuration...${NC}"
    mkdir -p "$BACKUP_DIR"
    
    # Backup file permissions
    find "$CLAUDE_DIR" -type f -exec stat -f "%Sp %N" {} \; > "$BACKUP_DIR/permissions.txt" 2>/dev/null || true
    
    # Backup sensitive files
    if [[ -f "$CLAUDE_DIR/google_oauth_credentials.json" ]]; then
        cp "$CLAUDE_DIR/google_oauth_credentials.json" "$BACKUP_DIR/" 2>/dev/null || true
    fi
    
    log "${GREEN}Backup created at: $BACKUP_DIR${NC}"
}

# Fix directory permissions
fix_directory_permissions() {
    log "${BLUE}Fixing directory permissions...${NC}"
    
    # Main directory should be readable only by owner
    chmod 700 "$CLAUDE_DIR"
    
    # Secure directory for sensitive files
    mkdir -p "$SECURE_DIR"
    chmod 700 "$SECURE_DIR"
    
    # Other subdirectories
    for dir in "$CLAUDE_DIR"/{memories,backups,config,bin,setup}; do
        if [[ -d "$dir" ]]; then
            chmod 700 "$dir"
            log "  Fixed: $dir (700)"
        fi
    done
}

# Move and secure sensitive files
secure_sensitive_files() {
    log "${BLUE}Securing sensitive files...${NC}"
    
    # OAuth credentials
    if [[ -f "$CLAUDE_DIR/google_oauth_credentials.json" ]]; then
        mv "$CLAUDE_DIR/google_oauth_credentials.json" "$SECURE_DIR/google_oauth.json"
        chmod 600 "$SECURE_DIR/google_oauth.json"
        ln -sf "$SECURE_DIR/google_oauth.json" "$CLAUDE_DIR/google_oauth_credentials.json"
        log "  Secured: Google OAuth credentials"
    fi
    
    # Twilio credentials
    if [[ -d "$CLAUDE_DIR/twilio_credentials" ]]; then
        mv "$CLAUDE_DIR/twilio_credentials" "$SECURE_DIR/"
        chmod -R 600 "$SECURE_DIR/twilio_credentials"
        ln -sf "$SECURE_DIR/twilio_credentials" "$CLAUDE_DIR/twilio_credentials"
        log "  Secured: Twilio credentials"
    fi
    
    # AWS secrets configuration
    if [[ -f "$CLAUDE_DIR/config/aws_secrets_unrestricted.yml" ]]; then
        chmod 600 "$CLAUDE_DIR/config/aws_secrets_unrestricted.yml"
        log "  Secured: AWS secrets configuration"
    fi
}

# Fix file permissions for all JSON and configuration files
fix_file_permissions() {
    log "${BLUE}Fixing file permissions...${NC}"
    
    # Fix permissions for all JSON files
    find "$CLAUDE_DIR" -name "*.json" -type f 2>/dev/null | while read -r file; do
        # Skip symbolic links
        if [[ ! -L "$file" ]]; then
            # Sensitive files get 600, others get 640
            if [[ "$file" == *"credential"* ]] || [[ "$file" == *"secret"* ]] || [[ "$file" == *"token"* ]]; then
                chmod 600 "$file"
                log "  Secured (600): $(basename "$file")"
            else
                chmod 640 "$file"
            fi
        fi
    done
    
    # Fix permissions for script files
    find "$CLAUDE_DIR/bin" -type f 2>/dev/null | while read -r file; do
        if [[ ! -L "$file" ]]; then
            chmod 700 "$file"
        fi
    done
    
    # Fix permissions for Python files
    find "$CLAUDE_DIR" -name "*.py" -type f 2>/dev/null | while read -r file; do
        if [[ ! -L "$file" ]]; then
            chmod 640 "$file"
        fi
    done
    
    # Fix permissions for markdown files
    find "$CLAUDE_DIR" -name "*.md" -type f 2>/dev/null | while read -r file; do
        if [[ ! -L "$file" ]]; then
            chmod 640 "$file"
        fi
    done
    
    # Fix permissions for YAML files
    find "$CLAUDE_DIR" -name "*.yml" -o -name "*.yaml" -type f 2>/dev/null | while read -r file; do
        if [[ ! -L "$file" ]]; then
            if [[ "$file" == *"secret"* ]]; then
                chmod 600 "$file"
            else
                chmod 640 "$file"
            fi
        fi
    done
}

# Remove AWS account ID from files
sanitize_aws_account_id() {
    log "${BLUE}Sanitizing AWS account ID references...${NC}"
    
    # Create placeholder for AWS account ID
    PLACEHOLDER="<AWS_ACCOUNT_ID>"
    
    # Find and replace AWS account ID in text files
    find "$CLAUDE_DIR" -type f \( -name "*.md" -o -name "*.txt" -o -name "*.yml" -o -name "*.yaml" \) 2>/dev/null | while read -r file; do
        if [[ ! -L "$file" ]] && grep -q "$AWS_ACCOUNT_ID" "$file" 2>/dev/null; then
            sed -i.bak "s/$AWS_ACCOUNT_ID/$PLACEHOLDER/g" "$file"
            rm -f "${file}.bak"
            log "  Sanitized: $(basename "$file")"
        fi
    done
}

# Create secure environment file
create_secure_env() {
    log "${BLUE}Creating secure environment file...${NC}"
    
    cat > "$SECURE_DIR/env.sh" << 'EOF'
#!/bin/bash
# Secure environment variables for Claude configuration
# This file should never be committed to version control

# AWS Configuration
export CLAUDE_AWS_ACCOUNT_ID="681214184463"
export CLAUDE_AWS_REGION="us-east-1"
export CLAUDE_AWS_PROFILE="candlefish"

# OAuth Credentials Path
export CLAUDE_OAUTH_CREDS="$HOME/.claude/.secure/google_oauth.json"

# API Keys (load from AWS Secrets Manager)
export ANTHROPIC_API_KEY=$(aws secretsmanager get-secret-value --secret-id anthropic-api-key --query SecretString --output text 2>/dev/null)

# Security Settings
export CLAUDE_SECURE_MODE="true"
export CLAUDE_AUDIT_LOG="$HOME/.claude/.secure/audit.log"
EOF
    
    chmod 600 "$SECURE_DIR/env.sh"
    log "${GREEN}Secure environment file created${NC}"
}

# Create security audit script
create_audit_script() {
    log "${BLUE}Creating security audit script...${NC}"
    
    cat > "$CLAUDE_DIR/bin/security_audit.sh" << 'EOF'
#!/bin/bash
# Claude Configuration Security Audit Script

CLAUDE_DIR="$HOME/.claude"
ISSUES_FOUND=0

echo "=== Claude Configuration Security Audit ==="
echo "Date: $(date)"
echo ""

# Check directory permissions
echo "Checking directory permissions..."
for dir in "$CLAUDE_DIR" "$CLAUDE_DIR/.secure" "$CLAUDE_DIR/memories" "$CLAUDE_DIR/backups"; do
    if [[ -d "$dir" ]]; then
        perms=$(stat -f "%Sp" "$dir" 2>/dev/null)
        if [[ "$perms" != "drwx------" ]]; then
            echo "  ⚠️  ISSUE: $dir has incorrect permissions: $perms (should be drwx------)"
            ((ISSUES_FOUND++))
        else
            echo "  ✓ $dir: OK"
        fi
    fi
done

# Check for sensitive files with world-readable permissions
echo ""
echo "Checking for world-readable sensitive files..."
find "$CLAUDE_DIR" -type f \( -name "*credential*" -o -name "*secret*" -o -name "*token*" -o -name "*oauth*" \) 2>/dev/null | while read -r file; do
    if [[ ! -L "$file" ]]; then
        perms=$(stat -f "%Sp" "$file" 2>/dev/null)
        if [[ "$perms" == *"r--" ]] || [[ "$perms" == *"r-x" ]]; then
            echo "  ⚠️  ISSUE: $file is world-readable: $perms"
            ((ISSUES_FOUND++))
        fi
    fi
done

# Check for exposed AWS account ID
echo ""
echo "Checking for exposed AWS account ID..."
if grep -r "681214184463" "$CLAUDE_DIR" --exclude-dir=.secure 2>/dev/null | grep -v "security_audit.sh"; then
    echo "  ⚠️  ISSUE: AWS account ID found in files"
    ((ISSUES_FOUND++))
fi

# Summary
echo ""
echo "=== Audit Summary ==="
if [[ $ISSUES_FOUND -eq 0 ]]; then
    echo "✓ No security issues found"
else
    echo "⚠️  Found $ISSUES_FOUND security issues"
    echo "Run fix_claude_config_security.sh to resolve"
fi
EOF
    
    chmod 700 "$CLAUDE_DIR/bin/security_audit.sh"
    log "${GREEN}Security audit script created${NC}"
}

# Create gitignore for sensitive files
update_gitignore() {
    log "${BLUE}Updating .gitignore...${NC}"
    
    cat >> "$CLAUDE_DIR/.gitignore" << 'EOF'

# Security-sensitive files
.secure/
*.credential*
*.secret*
*oauth*.json
*token*.json
*key*.json
env.sh
security_fix.log

# AWS account information
*681214184463*

# Backup files
*.bak
backups/
EOF
    
    log "${GREEN}.gitignore updated${NC}"
}

# Main execution
main() {
    log "${BLUE}=== Claude Configuration Security Fix v2.0 ===${NC}"
    log "Starting at: $(date)"
    
    check_user
    create_backup
    fix_directory_permissions
    secure_sensitive_files
    fix_file_permissions
    sanitize_aws_account_id
    create_secure_env
    create_audit_script
    update_gitignore
    
    log ""
    log "${GREEN}=== Security Fix Complete ===${NC}"
    log "Backup saved to: $BACKUP_DIR"
    log "Secure directory: $SECURE_DIR"
    log ""
    log "Next steps:"
    log "1. Source the secure environment: source $SECURE_DIR/env.sh"
    log "2. Run security audit: $CLAUDE_DIR/bin/security_audit.sh"
    log "3. Review the changes in: $LOG_FILE"
    
    # Run initial audit
    log ""
    log "${BLUE}Running security audit...${NC}"
    "$CLAUDE_DIR/bin/security_audit.sh"
}

# Run main function
main "$@"