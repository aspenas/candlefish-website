#!/bin/bash

# Quick Security Fix for Critical Issues
# Focus on main configuration files only

set -euo pipefail

echo "=== Quick Security Fix for Critical Issues ==="

# 1. Fix main Claude directory permissions
echo "Fixing directory permissions..."
chmod 700 ~/.claude
chmod 700 ~/.claude/.secure 2>/dev/null || mkdir -p ~/.claude/.secure && chmod 700 ~/.claude/.secure
chmod 700 ~/.claude/memories 2>/dev/null || true
chmod 700 ~/.claude/backups 2>/dev/null || true

# 2. Fix critical sensitive files
echo "Securing critical files..."

# Google OAuth credentials (already moved)
if [[ -L ~/.claude/google_oauth_credentials.json ]]; then
    echo "  ✓ Google OAuth already secured"
else
    if [[ -f ~/.claude/google_oauth_credentials.json ]]; then
        echo "  ⚠️  Google OAuth needs manual review"
    fi
fi

# Fix token usage log
if [[ -f ~/.claude/metrics/token_usage.log ]]; then
    chmod 600 ~/.claude/metrics/token_usage.log
    echo "  ✓ Fixed token_usage.log permissions"
fi

# Fix AWS credential troubleshoot script
if [[ -f ~/.claude/aws_credential_troubleshoot.sh ]]; then
    chmod 700 ~/.claude/aws_credential_troubleshoot.sh
    echo "  ✓ Fixed aws_credential_troubleshoot.sh permissions"
fi

# 3. Fix permissions on secure directory contents
echo "Securing .secure directory contents..."
if [[ -d ~/.claude/.secure ]]; then
    find ~/.claude/.secure -type f -exec chmod 600 {} \;
    find ~/.claude/.secure -type d -exec chmod 700 {} \;
    echo "  ✓ Secured all files in .secure directory"
fi

# 4. Quick check for AWS account ID exposure
echo "Checking for AWS account ID exposure..."
EXPOSED_FILES=$(grep -r "681214184463" ~/.claude 2>/dev/null | grep -v ".secure" | grep -v "venv" | grep -v "__pycache__" | grep -v ".pyc" | wc -l)
if [[ $EXPOSED_FILES -gt 0 ]]; then
    echo "  ⚠️  Found $EXPOSED_FILES files with exposed AWS account ID"
    echo "     Run full security fix to sanitize these files"
else
    echo "  ✓ No AWS account ID exposure found"
fi

# 5. Create minimal security check script
cat > ~/.claude/bin/quick_security_check.sh << 'EOF'
#!/bin/bash
echo "=== Quick Security Check ==="
echo ""
echo "Directory Permissions:"
ls -ld ~/.claude ~/.claude/.secure ~/.claude/memories ~/.claude/backups 2>/dev/null | awk '{print $1, $9}'
echo ""
echo "Sensitive File Check:"
for file in ~/.claude/google_oauth_credentials.json ~/.claude/.secure/google_oauth.json ~/.claude/metrics/token_usage.log; do
    if [[ -e "$file" ]]; then
        perms=$(ls -l "$file" 2>/dev/null | awk '{print $1}')
        echo "  $file: $perms"
    fi
done
echo ""
echo "AWS Account ID Check:"
if grep -r "681214184463" ~/.claude --exclude-dir=venv --exclude-dir=.secure --exclude="*.pyc" 2>/dev/null | head -1 > /dev/null; then
    echo "  ⚠️  AWS account ID found in files"
else
    echo "  ✓ AWS account ID not exposed"
fi
EOF

chmod 700 ~/.claude/bin/quick_security_check.sh

echo ""
echo "=== Quick Fix Complete ==="
echo ""
echo "Running security check..."
~/.claude/bin/quick_security_check.sh

echo ""
echo "For full security audit and fixes, run:"
echo "  /Users/patricksmith/candlefish-ai/security/fix_claude_config_security.sh"