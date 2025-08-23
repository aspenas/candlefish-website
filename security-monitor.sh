#!/bin/bash
# Security Monitoring Script - Continuous protection verification
# Run this daily to ensure family content remains isolated

set -e

# Configuration
MAIN_REPO="/Users/patricksmith/candlefish-ai"
VAULT_REPO="/Users/patricksmith/family-vault"
LOG_FILE="$HOME/.security-monitor.log"
ALERT_EMAIL="patrick@candlefish.ai"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log function
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo "$1"
}

# Alert function
send_alert() {
    local severity=$1
    local message=$2

    log_message "[$severity] $message"

    # Color output based on severity
    case $severity in
        "CRITICAL")
            echo -e "${RED}🚨 CRITICAL: $message${NC}"
            # Send email alert for critical issues
            echo "CRITICAL SECURITY ALERT: $message" | mail -s "CRITICAL: Family Vault Security Alert" "$ALERT_EMAIL" 2>/dev/null || true
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  WARNING: $message${NC}"
            ;;
        "INFO")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
    esac
}

echo "🔍 SECURITY MONITORING SCAN"
echo "==========================="
echo "Started: $(date)"
echo ""

ISSUES=0
WARNINGS=0

# Check 1: Scan main repository for privileged content
echo "Check 1: Scanning main repository for privileged content..."
cd "$MAIN_REPO"

PRIVILEGED_DIRS=$(find . -type d \( -name "privileged" -o -name "family" -o -name "private" -o -name "confidential" \) ! -path "./.git/*" 2>/dev/null | wc -l)
if [ "$PRIVILEGED_DIRS" -gt 0 ]; then
    send_alert "CRITICAL" "Found $PRIVILEGED_DIRS privileged directories in main repository!"
    find . -type d \( -name "privileged" -o -name "family" -o -name "private" -o -name "confidential" \) ! -path "./.git/*" 2>/dev/null | while read dir; do
        echo "  - $dir"
    done
    ((ISSUES++))
else
    send_alert "INFO" "No privileged directories found in main repository"
fi

# Check 2: Verify .gitignore protection
echo ""
echo "Check 2: Verifying .gitignore protection..."
if [ -f ".gitignore" ]; then
    if grep -q "privileged" .gitignore && grep -q "family" .gitignore; then
        send_alert "INFO" ".gitignore properly configured"
    else
        send_alert "CRITICAL" ".gitignore missing privileged/family exclusions!"
        ((ISSUES++))
    fi
else
    send_alert "CRITICAL" ".gitignore file missing!"
    ((ISSUES++))
fi

# Check 3: Check for sensitive files by content
echo ""
echo "Check 3: Scanning for sensitive file contents..."
SENSITIVE_FILES=$(grep -r -l -i "family trust\|estate planning\|legal structure" . --exclude-dir=.git --exclude-dir=node_modules --exclude="*.log" 2>/dev/null | wc -l)
if [ "$SENSITIVE_FILES" -gt 0 ]; then
    send_alert "WARNING" "Found $SENSITIVE_FILES files with potentially sensitive content"
    ((WARNINGS++))
else
    send_alert "INFO" "No files with sensitive content patterns found"
fi

# Check 4: Verify Netlify redirects
echo ""
echo "Check 4: Verifying Netlify security redirects..."
if [ -f "public/_redirects" ] || [ -f "apps/website/public/_redirects" ]; then
    REDIRECT_FILE=$([ -f "public/_redirects" ] && echo "public/_redirects" || echo "apps/website/public/_redirects")
    if grep -q "/privileged/\|/family/" "$REDIRECT_FILE"; then
        send_alert "INFO" "Netlify redirects blocking sensitive paths"
    else
        send_alert "WARNING" "Netlify redirects not blocking sensitive paths"
        ((WARNINGS++))
    fi
else
    send_alert "WARNING" "No Netlify _redirects file found"
    ((WARNINGS++))
fi

# Check 5: Verify family vault repository exists and is private
echo ""
echo "Check 5: Verifying family vault repository..."
if [ -d "$VAULT_REPO/.git" ]; then
    cd "$VAULT_REPO"

    # Check if remote is configured
    REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
    if [ -n "$REMOTE_URL" ]; then
        send_alert "INFO" "Family vault repository exists with remote: $REMOTE_URL"

        # Check if it's a GitHub repo and verify privacy
        if [[ "$REMOTE_URL" == *"github.com"* ]]; then
            REPO_PATH=$(echo "$REMOTE_URL" | sed 's/.*github.com[:/]\(.*\)\.git/\1/')
            IS_PRIVATE=$(gh api "repos/$REPO_PATH" --jq '.private' 2>/dev/null || echo "error")

            if [ "$IS_PRIVATE" = "true" ]; then
                send_alert "INFO" "Family vault repository is PRIVATE on GitHub"
            elif [ "$IS_PRIVATE" = "false" ]; then
                send_alert "CRITICAL" "Family vault repository is PUBLIC on GitHub!"
                ((ISSUES++))
            else
                send_alert "WARNING" "Could not verify family vault privacy status"
                ((WARNINGS++))
            fi
        fi
    else
        send_alert "WARNING" "Family vault has no remote configured"
        ((WARNINGS++))
    fi
else
    send_alert "WARNING" "Family vault repository not found at $VAULT_REPO"
    ((WARNINGS++))
fi

# Check 6: Check recent git commits for sensitive terms
echo ""
echo "Check 6: Checking recent commits for sensitive terms..."
cd "$MAIN_REPO"
SENSITIVE_COMMITS=$(git log --oneline -n 50 | grep -i -E "family|privileged|estate|trust|private" | wc -l)
if [ "$SENSITIVE_COMMITS" -gt 0 ]; then
    send_alert "WARNING" "Found $SENSITIVE_COMMITS recent commits mentioning sensitive terms"
    ((WARNINGS++))
else
    send_alert "INFO" "No sensitive terms in recent commits"
fi

# Check 7: Verify no team members have access to family vault
echo ""
echo "Check 7: Checking family vault collaborators..."
if [ -d "$VAULT_REPO/.git" ]; then
    cd "$VAULT_REPO"
    REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")

    if [[ "$REMOTE_URL" == *"github.com"* ]]; then
        REPO_PATH=$(echo "$REMOTE_URL" | sed 's/.*github.com[:/]\(.*\)\.git/\1/')
        COLLABORATORS=$(gh api "repos/$REPO_PATH/collaborators" --jq '.[].login' 2>/dev/null || echo "")

        if [ -n "$COLLABORATORS" ]; then
            echo "Collaborators on family-vault:"
            echo "$COLLABORATORS" | while read user; do
                if [[ "$user" == "tyler"* ]] || [[ "$user" == "aaron"* ]]; then
                    send_alert "CRITICAL" "Team member '$user' has access to family vault!"
                    ((ISSUES++))
                else
                    echo "  - $user (authorized)"
                fi
            done
        else
            send_alert "INFO" "No collaborators found or unable to check"
        fi
    fi
fi

# Check 8: Monitor file system for new sensitive files
echo ""
echo "Check 8: Monitoring for new sensitive files..."
cd "$MAIN_REPO"
NEW_SENSITIVE=$(find . -type f -name "*family*" -o -name "*privileged*" -o -name "*estate*" -o -name "*trust*" -mtime -1 ! -path "./.git/*" 2>/dev/null | wc -l)
if [ "$NEW_SENSITIVE" -gt 0 ]; then
    send_alert "WARNING" "Found $NEW_SENSITIVE new files with sensitive names (created in last 24h)"
    find . -type f -name "*family*" -o -name "*privileged*" -o -name "*estate*" -o -name "*trust*" -mtime -1 ! -path "./.git/*" 2>/dev/null | while read file; do
        echo "  - $file"
    done
    ((WARNINGS++))
else
    send_alert "INFO" "No new sensitive files detected"
fi

# Check 9: Verify build artifacts don't contain sensitive content
echo ""
echo "Check 9: Checking build artifacts..."
BUILD_DIRS=("dist" "build" ".next" ".netlify/static" "apps/website/dist")
for dir in "${BUILD_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        SENSITIVE_IN_BUILD=$(find "$dir" -type f -name "*family*" -o -name "*privileged*" 2>/dev/null | wc -l)
        if [ "$SENSITIVE_IN_BUILD" -gt 0 ]; then
            send_alert "CRITICAL" "Found sensitive files in build directory $dir"
            ((ISSUES++))
        fi
    fi
done
send_alert "INFO" "Build artifacts check complete"

# Check 10: Test web endpoints (if deployed)
echo ""
echo "Check 10: Testing web endpoints for leaks..."
if command -v curl &> /dev/null; then
    TEST_URLS=(
        "https://candlefish.ai/docs/privileged/"
        "https://candlefish.ai/docs/family/"
        "https://candlefish.ai/privileged/"
        "https://www.candlefish.ai/docs/privileged/"
    )

    for url in "${TEST_URLS[@]}"; do
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        if [ "$HTTP_STATUS" = "200" ]; then
            send_alert "CRITICAL" "Sensitive path accessible at $url (HTTP $HTTP_STATUS)"
            ((ISSUES++))
        elif [ "$HTTP_STATUS" = "404" ] || [ "$HTTP_STATUS" = "403" ] || [ "$HTTP_STATUS" = "401" ]; then
            echo "  ✓ $url properly blocked (HTTP $HTTP_STATUS)"
        else
            echo "  ? $url returned HTTP $HTTP_STATUS"
        fi
    done
else
    send_alert "WARNING" "curl not available, skipping endpoint tests"
    ((WARNINGS++))
fi

# Generate summary report
echo ""
echo "==========================="
echo "SECURITY SCAN SUMMARY"
echo "==========================="
echo "Completed: $(date)"
echo ""

if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    send_alert "INFO" "🎉 All security checks PASSED!"
    echo "No issues detected. Family content is properly isolated."
elif [ $ISSUES -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Scan completed with $WARNINGS warnings${NC}"
    echo "Review warnings above and consider addressing them."
else
    echo -e "${RED}🚨 CRITICAL: $ISSUES security issues detected!${NC}"
    echo -e "${YELLOW}Additionally, $WARNINGS warnings found${NC}"
    echo ""
    echo "IMMEDIATE ACTION REQUIRED:"
    echo "1. Run: ./emergency-security-fix.sh"
    echo "2. Review issues above and fix immediately"
    echo "3. Run migration: ./migrate-to-family-vault.sh"
fi

# Log summary
log_message "Scan completed: $ISSUES issues, $WARNINGS warnings"

# Create status file for other scripts
cat > "$HOME/.security-monitor-status" << EOF
LAST_RUN=$(date '+%Y-%m-%d %H:%M:%S')
ISSUES=$ISSUES
WARNINGS=$WARNINGS
STATUS=$([ $ISSUES -eq 0 ] && echo "SECURE" || echo "AT_RISK")
EOF

# Set exit code based on issues
if [ $ISSUES -gt 0 ]; then
    exit 1
else
    exit 0
fi
