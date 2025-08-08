#!/bin/bash

# Security Check Script for Paintbox
# Performs pre-deployment security validation

echo "🔒 Paintbox Security Check"
echo "=========================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Exit on error
set -e

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "lib" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    exit 1
fi

echo "1. Checking Environment Variables..."
echo "-----------------------------------"

# Check for required environment variables
REQUIRED_VARS=(
    "AWS_REGION"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${YELLOW}⚠${NC} Warning: $var not set"
    else
        echo -e "${GREEN}✓${NC} $var is set"
    fi
done

echo ""
echo "2. Checking for Exposed Secrets..."
echo "---------------------------------"

# Check for common secret patterns
PATTERNS=(
    "password['\"]?\s*[:=]\s*['\"][^'\"]{8,}"
    "api[_-]?key['\"]?\s*[:=]\s*['\"][^'\"]{16,}"
    "secret['\"]?\s*[:=]\s*['\"][^'\"]{16,}"
    "token['\"]?\s*[:=]\s*['\"][^'\"]{16,}"
)

FOUND_SECRETS=0
for pattern in "${PATTERNS[@]}"; do
    if grep -riE "$pattern" --include="*.ts" --include="*.tsx" --include="*.js" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=__tests__ . 2>/dev/null | grep -v "process\.env\|test\|mock\|example" > /dev/null; then
        echo -e "${RED}✗${NC} Found potential exposed secrets matching pattern: $pattern"
        ((FOUND_SECRETS++))
    fi
done

if [ $FOUND_SECRETS -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No exposed secrets found"
fi

echo ""
echo "3. Checking Dependencies..."
echo "--------------------------"

# Check for known vulnerable packages
echo -n "Running npm audit... "
AUDIT_RESULT=$(npm audit --json 2>/dev/null || true)
VULNERABILITIES=$(echo "$AUDIT_RESULT" | jq -r '.metadata.vulnerabilities // {}')
CRITICAL=$(echo "$VULNERABILITIES" | jq -r '.critical // 0')
HIGH=$(echo "$VULNERABILITIES" | jq -r '.high // 0')

if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
    echo -e "${RED}✗${NC} Found $CRITICAL critical and $HIGH high vulnerabilities"
else
    echo -e "${GREEN}✓${NC} No critical or high vulnerabilities found"
fi

echo ""
echo "4. Checking File Permissions..."
echo "------------------------------"

# Check for overly permissive files
PERMISSIVE_FILES=$(find . -type f -name "*.env*" -o -name "*.key" -o -name "*.pem" 2>/dev/null | head -20)
if [ -n "$PERMISSIVE_FILES" ]; then
    echo -e "${YELLOW}⚠${NC} Found potentially sensitive files:"
    echo "$PERMISSIVE_FILES" | while read -r file; do
        PERMS=$(stat -f "%A" "$file" 2>/dev/null || stat -c "%a" "$file" 2>/dev/null)
        if [ "$PERMS" -gt 600 ]; then
            echo -e "  ${RED}✗${NC} $file has permissions $PERMS (should be 600 or less)"
        else
            echo -e "  ${GREEN}✓${NC} $file has secure permissions $PERMS"
        fi
    done
else
    echo -e "${GREEN}✓${NC} No sensitive files found"
fi

echo ""
echo "5. Checking Security Headers..."
echo "------------------------------"

# Check if security headers are configured
if grep -q "helmet\|security.*headers" next.config.js 2>/dev/null || grep -q "helmet" lib/middleware/*.ts 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Security headers middleware found"
else
    echo -e "${YELLOW}⚠${NC} Security headers middleware not detected"
fi

echo ""
echo "6. Checking Authentication..."
echo "----------------------------"

# Check if auth middleware exists
if [ -f "lib/middleware/auth.ts" ]; then
    echo -e "${GREEN}✓${NC} Authentication middleware exists"

    # Check for JWT configuration
    if grep -q "RS256\|ES256" lib/middleware/auth.ts; then
        echo -e "${GREEN}✓${NC} Using secure JWT algorithm"
    else
        echo -e "${YELLOW}⚠${NC} JWT algorithm not verified"
    fi
else
    echo -e "${RED}✗${NC} Authentication middleware not found"
fi

echo ""
echo "7. Checking Rate Limiting..."
echo "---------------------------"

# Check if rate limiting exists
if [ -f "lib/middleware/rate-limit.ts" ]; then
    echo -e "${GREEN}✓${NC} Rate limiting middleware exists"
else
    echo -e "${RED}✗${NC} Rate limiting middleware not found"
fi

echo ""
echo "8. Checking Input Validation..."
echo "------------------------------"

# Check if validation middleware exists
if [ -f "lib/middleware/validation.ts" ]; then
    echo -e "${GREEN}✓${NC} Input validation middleware exists"

    # Check for zod usage
    if grep -q "z\." lib/middleware/validation.ts; then
        echo -e "${GREEN}✓${NC} Using Zod for schema validation"
    fi
else
    echo -e "${RED}✗${NC} Input validation middleware not found"
fi

echo ""
echo "9. Checking HTTPS Configuration..."
echo "---------------------------------"

# Check for HTTPS/TLS configuration
if grep -q "https\|tls\|ssl" vercel.json render.yaml netlify.toml 2>/dev/null; then
    echo -e "${GREEN}✓${NC} HTTPS configuration found in deployment files"
else
    echo -e "${YELLOW}⚠${NC} HTTPS configuration not detected in deployment files"
fi

echo ""
echo "10. Checking AWS Configuration..."
echo "--------------------------------"

# Check if AWS Secrets Manager is configured
if [ -f "lib/services/secrets-manager.ts" ]; then
    echo -e "${GREEN}✓${NC} AWS Secrets Manager service exists"

    # Check for proper error handling
    if grep -q "try.*catch\|error" lib/services/secrets-manager.ts; then
        echo -e "${GREEN}✓${NC} Error handling implemented"
    fi
else
    echo -e "${RED}✗${NC} AWS Secrets Manager service not found"
fi

echo ""
echo "=========================="
echo "Security Check Complete"
echo "=========================="

# Summary
if [ $FOUND_SECRETS -gt 0 ] || [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
    echo -e "${RED}❌ Security issues found. Please fix before deployment.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Security check passed!${NC}"
    echo "Remember to:"
    echo "  - Test in staging environment first"
    echo "  - Monitor logs after deployment"
    echo "  - Review security alerts regularly"
fi
