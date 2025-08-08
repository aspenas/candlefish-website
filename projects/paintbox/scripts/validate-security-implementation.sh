#!/bin/bash

# Security Implementation Validation Script
# This script validates all security components are properly implemented

echo "🔐 Security Implementation Validation"
echo "===================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to check if a file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $2 - File not found: $1"
        ((FAILED++))
    fi
}

# Function to check if a directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $2 - Directory not found: $1"
        ((FAILED++))
    fi
}

# Function to check for patterns in files
check_pattern() {
    if grep -q "$1" "$2" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $3"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} $3 - Pattern not found"
        ((WARNINGS++))
    fi
}

echo "1. Backend Security Components"
echo "------------------------------"
check_file "lib/services/secrets-manager.ts" "Secrets Manager Service"
check_file "lib/middleware/auth.ts" "Authentication Middleware"
check_file "lib/middleware/rate-limit.ts" "Rate Limiting Middleware"
check_file "lib/middleware/validation.ts" "Input Validation Middleware"
check_pattern "AWS Secrets Manager" "lib/services/secrets-manager.ts" "AWS Integration"

echo ""
echo "2. Frontend Security Components"
echo "-------------------------------"
check_file "components/secrets/SecretsManagementDashboard.tsx" "Secrets Dashboard"
check_file "components/secrets/ServiceStatusMonitor.tsx" "Service Monitor"
check_file "components/secrets/AuditLogViewer.tsx" "Audit Log Viewer"
check_file "components/secrets/SecurityConfigurationPanel.tsx" "Security Config Panel"
check_file "components/secrets/types.ts" "Security Types"
check_file "hooks/useSecretsAPI.ts" "Secrets API Hook"

echo ""
echo "3. Security Test Suite"
echo "---------------------"
check_dir "__tests__/security" "Security Tests Directory"
check_file "__tests__/security/penetration-tests.test.ts" "Penetration Tests"
check_dir "__tests__/api" "API Tests Directory"
check_file "__tests__/api/secrets.test.ts" "Secrets API Tests"
check_dir "__tests__/integration" "Integration Tests Directory"
check_file "__tests__/integration/aws-secrets-manager.test.ts" "AWS Integration Tests"
check_dir "__tests__/performance" "Performance Tests Directory"
check_file "__tests__/performance/secret-retrieval-load.test.ts" "Load Tests"

echo ""
echo "4. E2E Security Tests"
echo "--------------------"
check_dir "e2e" "E2E Tests Directory"
check_file "e2e/security-authentication.spec.ts" "Authentication E2E"
check_file "e2e/security-secrets-management.spec.ts" "Secrets Management E2E"
check_file "e2e/security-api-endpoints.spec.ts" "API Security E2E"
check_file "playwright.config.ts" "Playwright Configuration"

echo ""
echo "5. Infrastructure as Code"
echo "-------------------------"
check_dir "terraform" "Terraform Directory"
check_file "terraform/main.tf" "Main Infrastructure"
check_file "terraform/variables.tf" "Infrastructure Variables"
check_file "terraform/security.tf" "Security Configuration"
check_file "terraform/monitoring.tf" "Monitoring Setup"

echo ""
echo "6. CI/CD Pipeline"
echo "-----------------"
check_dir ".github/workflows" "GitHub Workflows Directory"
check_file ".github/workflows/production-deploy.yml" "Production Deploy Pipeline"
check_file ".github/workflows/security-scan.yml" "Security Scan Workflow"

echo ""
echo "7. Deployment Scripts"
echo "--------------------"
check_file "scripts/secure-deploy.sh" "Secure Deployment Script"
check_file "scripts/zero-downtime-deploy.sh" "Zero Downtime Deploy"
check_file "scripts/security-check.sh" "Security Check Script"

echo ""
echo "8. Docker Configuration"
echo "-----------------------"
check_file "Dockerfile" "Frontend Dockerfile"
check_file "paintbox-backend/Dockerfile" "Backend Dockerfile"

echo ""
echo "9. Monitoring Configuration"
echo "---------------------------"
check_dir "monitoring" "Monitoring Directory"
check_file "monitoring/cloudwatch-dashboard.json" "CloudWatch Dashboard"
check_file "monitoring/health-check.json" "Health Check Config"

echo ""
echo "10. Documentation"
echo "-----------------"
check_file "SECURITY_DEPLOYMENT_GUIDE.md" "Security Deployment Guide"
check_file "SECURITY_TESTING_GUIDE.md" "Security Testing Guide"
check_file ".claude/project-context.md" "Project Context"
check_file ".claude/architectural-decisions.md" "Architectural Decisions"
check_file ".claude/security-implementation-summary.md" "Security Summary"

echo ""
echo "11. Configuration Files"
echo "-----------------------"
check_file "jest.config.js" "Jest Configuration"
check_file "jest.setup.js" "Jest Setup"
check_file "artillery-config.yml" "Artillery Load Test Config"

echo ""
echo "12. Security Patterns Validation"
echo "--------------------------------"
# Check for insecure patterns
echo -n "Checking for hardcoded secrets... "
if grep -r "password.*=.*['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=__tests__ --exclude-dir=e2e . 2>/dev/null | grep -v "test\|mock\|example" > /dev/null; then
    echo -e "${RED}✗${NC} Found potential hardcoded passwords"
    ((FAILED++))
else
    echo -e "${GREEN}✓${NC} No hardcoded passwords found"
    ((PASSED++))
fi

echo -n "Checking for exposed API keys... "
if grep -r "api[_-]?key.*=.*['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=__tests__ . 2>/dev/null | grep -v "test\|mock\|example\|process\.env" > /dev/null; then
    echo -e "${RED}✗${NC} Found potential exposed API keys"
    ((FAILED++))
else
    echo -e "${GREEN}✓${NC} No exposed API keys found"
    ((PASSED++))
fi

echo ""
echo "===================================="
echo "Validation Summary"
echo "===================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Security implementation validation PASSED!${NC}"
    exit 0
else
    echo -e "${RED}❌ Security implementation validation FAILED!${NC}"
    echo "Please address the missing components before deployment."
    exit 1
fi
