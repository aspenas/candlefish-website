#!/bin/bash

# Candlefish AI - Comprehensive Secrets Management Test Suite
# This script runs all tests required for production readiness verification

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
FAILED_TESTS=0
PASSED_TESTS=0
TEST_RESULTS=()

# Test timing
START_TIME=$(date +%s)

print_header() {
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}        Candlefish AI - Secrets Management Test Suite${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
    echo -e "${BLUE}Region: $REGION${NC}"
    echo -e "${BLUE}Started: $(date)${NC}"
    echo ""
}

log_test() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    if [[ "$status" == "PASS" ]]; then
        echo -e "${GREEN}✓ $test_name: $message${NC}"
        ((PASSED_TESTS++))
        TEST_RESULTS+=("PASS: $test_name - $message")
    elif [[ "$status" == "FAIL" ]]; then
        echo -e "${RED}✗ $test_name: $message${NC}"
        ((FAILED_TESTS++))
        TEST_RESULTS+=("FAIL: $test_name - $message")
    elif [[ "$status" == "WARN" ]]; then
        echo -e "${YELLOW}⚠ $test_name: $message${NC}"
        TEST_RESULTS+=("WARN: $test_name - $message")
    else
        echo -e "${BLUE}ℹ $test_name: $message${NC}"
        TEST_RESULTS+=("INFO: $test_name - $message")
    fi
}

# Test 1: Environment and Prerequisites
test_environment() {
    echo -e "${PURPLE}══════ 1. Environment and Prerequisites Tests ══════${NC}"
    
    # Check AWS CLI
    if command -v aws &> /dev/null; then
        log_test "AWS_CLI_INSTALLED" "PASS" "AWS CLI is installed"
    else
        log_test "AWS_CLI_INSTALLED" "FAIL" "AWS CLI is not installed"
        return 1
    fi
    
    # Check AWS credentials
    if aws sts get-caller-identity &> /dev/null; then
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        log_test "AWS_CREDENTIALS" "PASS" "AWS credentials valid for account $ACCOUNT_ID"
    else
        log_test "AWS_CREDENTIALS" "FAIL" "AWS credentials not configured or invalid"
        return 1
    fi
    
    # Check required tools
    local tools=("jq" "curl" "terraform" "kubectl")
    for tool in "${tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            log_test "TOOL_$tool" "PASS" "$tool is installed"
        else
            log_test "TOOL_$tool" "WARN" "$tool is not installed (may be needed for some tests)"
        fi
    done
    
    echo ""
}

# Test 2: Vault Connectivity Tests
test_vault_connectivity() {
    echo -e "${PURPLE}══════ 2. Vault Connectivity Tests ══════${NC}"
    
    # Check if Vault is configured in environment
    if [[ -n "${VAULT_ADDR:-}" ]]; then
        if curl -s --connect-timeout 5 "$VAULT_ADDR/v1/sys/health" &> /dev/null; then
            log_test "VAULT_CONNECTIVITY" "PASS" "Vault is reachable at $VAULT_ADDR"
            
            # Check Vault status
            local vault_status=$(curl -s "$VAULT_ADDR/v1/sys/health" | jq -r '.sealed // "unknown"')
            if [[ "$vault_status" == "false" ]]; then
                log_test "VAULT_STATUS" "PASS" "Vault is unsealed and ready"
            else
                log_test "VAULT_STATUS" "FAIL" "Vault is sealed or status unknown"
            fi
        else
            log_test "VAULT_CONNECTIVITY" "FAIL" "Cannot reach Vault at $VAULT_ADDR"
        fi
        
        # Test authentication if token exists
        if [[ -n "${VAULT_TOKEN:-}" ]]; then
            if curl -s -H "X-Vault-Token: $VAULT_TOKEN" "$VAULT_ADDR/v1/auth/token/lookup-self" &> /dev/null; then
                log_test "VAULT_AUTH" "PASS" "Vault authentication successful"
            else
                log_test "VAULT_AUTH" "FAIL" "Vault authentication failed"
            fi
        else
            log_test "VAULT_AUTH" "WARN" "VAULT_TOKEN not set, skipping auth test"
        fi
    else
        log_test "VAULT_CONFIGURATION" "WARN" "VAULT_ADDR not configured, skipping Vault tests"
    fi
    
    echo ""
}

# Test 3: Secret Retrieval Tests
test_secret_retrieval() {
    echo -e "${PURPLE}══════ 3. Secret Retrieval Tests ══════${NC}"
    
    local secrets=(
        "mongodb/credentials"
        "api/smithery"
        "api/google"
        "security/jwt"
        "security/encryption"
        "database/postgres"
        "database/redis"
    )
    
    for secret in "${secrets[@]}"; do
        local secret_full_path="candlefish/$ENVIRONMENT/$secret"
        
        if aws secretsmanager get-secret-value \
            --secret-id "$secret_full_path" \
            --region "$REGION" \
            --query 'SecretString' \
            --output text &> /dev/null; then
            log_test "SECRET_$secret" "PASS" "Secret retrieval successful"
            
            # Test JSON parsing for structured secrets
            local secret_value=$(aws secretsmanager get-secret-value \
                --secret-id "$secret_full_path" \
                --region "$REGION" \
                --query 'SecretString' \
                --output text 2>/dev/null)
            
            if echo "$secret_value" | jq empty 2>/dev/null; then
                log_test "SECRET_JSON_$secret" "PASS" "Secret has valid JSON format"
            else
                log_test "SECRET_JSON_$secret" "INFO" "Secret is not JSON (may be plain text)"
            fi
        else
            log_test "SECRET_$secret" "FAIL" "Secret retrieval failed"
        fi
    done
    
    # Test secret versioning
    if aws secretsmanager describe-secret \
        --secret-id "candlefish/$ENVIRONMENT/security/jwt" \
        --region "$REGION" \
        --query 'VersionIdsToStages' &> /dev/null; then
        log_test "SECRET_VERSIONING" "PASS" "Secret versioning is working"
    else
        log_test "SECRET_VERSIONING" "FAIL" "Secret versioning test failed"
    fi
    
    echo ""
}

# Test 4: SDK Functionality Tests
test_sdk_functionality() {
    echo -e "${PURPLE}══════ 4. SDK Functionality Tests ══════${NC}"
    
    # Check if SDK exists
    local sdk_path="$BASE_DIR/sdk/typescript"
    if [[ -d "$sdk_path" ]]; then
        log_test "SDK_EXISTS" "PASS" "TypeScript SDK directory exists"
        
        # Check SDK files
        local required_files=("index.ts" "package.json")
        for file in "${required_files[@]}"; do
            if [[ -f "$sdk_path/$file" ]]; then
                log_test "SDK_FILE_$file" "PASS" "SDK file $file exists"
            else
                log_test "SDK_FILE_$file" "FAIL" "SDK file $file missing"
            fi
        done
        
        # Test TypeScript compilation if possible
        if command -v npx &> /dev/null && [[ -f "$sdk_path/package.json" ]]; then
            cd "$sdk_path"
            if npm list typescript &> /dev/null || npx tsc --version &> /dev/null; then
                if npx tsc --noEmit --skipLibCheck index.ts 2>/dev/null; then
                    log_test "SDK_TYPESCRIPT" "PASS" "TypeScript SDK compiles successfully"
                else
                    log_test "SDK_TYPESCRIPT" "FAIL" "TypeScript SDK compilation failed"
                fi
            else
                log_test "SDK_TYPESCRIPT" "WARN" "TypeScript not available, skipping compilation test"
            fi
            cd - > /dev/null
        else
            log_test "SDK_COMPILATION" "WARN" "Cannot test SDK compilation (npm/npx not available)"
        fi
        
        # Test SDK server if it exists
        if [[ -f "$sdk_path/src/server.ts" ]]; then
            log_test "SDK_SERVER" "PASS" "SDK server file exists"
        else
            log_test "SDK_SERVER" "INFO" "SDK server file not found (may not be required)"
        fi
    else
        log_test "SDK_EXISTS" "FAIL" "SDK directory not found at $sdk_path"
    fi
    
    echo ""
}

# Test 5: Docker Container Health Checks
test_docker_containers() {
    echo -e "${PURPLE}══════ 5. Docker Container Health Checks ══════${NC}"
    
    # Check if Docker is available
    if command -v docker &> /dev/null; then
        log_test "DOCKER_AVAILABLE" "PASS" "Docker is installed and available"
        
        # Check if Docker daemon is running
        if docker info &> /dev/null; then
            log_test "DOCKER_DAEMON" "PASS" "Docker daemon is running"
            
            # Look for secrets-related containers
            local containers=$(docker ps --format "table {{.Names}}" | grep -i "secret\|vault" || true)
            if [[ -n "$containers" ]]; then
                log_test "SECRETS_CONTAINERS" "PASS" "Found secrets-related containers: $containers"
            else
                log_test "SECRETS_CONTAINERS" "INFO" "No secrets-related containers found (may not be containerized)"
            fi
            
            # Check docker-compose files
            local compose_files=("$BASE_DIR/docker-compose.yml" "$BASE_DIR/docker-compose.local.yml")
            for compose_file in "${compose_files[@]}"; do
                if [[ -f "$compose_file" ]]; then
                    log_test "DOCKER_COMPOSE_$(basename "$compose_file")" "PASS" "Docker compose file exists"
                    
                    # Validate compose file syntax
                    if command -v docker-compose &> /dev/null; then
                        if docker-compose -f "$compose_file" config &> /dev/null; then
                            log_test "DOCKER_COMPOSE_VALID_$(basename "$compose_file")" "PASS" "Docker compose file is valid"
                        else
                            log_test "DOCKER_COMPOSE_VALID_$(basename "$compose_file")" "FAIL" "Docker compose file has syntax errors"
                        fi
                    fi
                else
                    log_test "DOCKER_COMPOSE_$(basename "$compose_file")" "INFO" "Docker compose file not found (may not be used)"
                fi
            done
        else
            log_test "DOCKER_DAEMON" "FAIL" "Docker daemon is not running"
        fi
    else
        log_test "DOCKER_AVAILABLE" "WARN" "Docker is not installed"
    fi
    
    # Check Kubernetes resources if kubectl is available
    if command -v kubectl &> /dev/null; then
        if kubectl cluster-info &> /dev/null; then
            log_test "KUBERNETES_AVAILABLE" "PASS" "Kubernetes cluster is accessible"
            
            # Look for secrets-related resources
            local secrets=$(kubectl get secrets --all-namespaces | grep -i candlefish || true)
            if [[ -n "$secrets" ]]; then
                log_test "KUBERNETES_SECRETS" "PASS" "Found Kubernetes secrets"
            else
                log_test "KUBERNETES_SECRETS" "INFO" "No Candlefish secrets found in Kubernetes"
            fi
        else
            log_test "KUBERNETES_AVAILABLE" "INFO" "Kubernetes cluster not accessible"
        fi
    else
        log_test "KUBERNETES_AVAILABLE" "INFO" "kubectl not available"
    fi
    
    echo ""
}

# Test 6: Integration Tests
test_integration() {
    echo -e "${PURPLE}══════ 6. Integration Tests ══════${NC}"
    
    # Test KMS integration
    local kms_alias="alias/candlefish-secrets-$ENVIRONMENT"
    if aws kms describe-key --key-id "$kms_alias" --region "$REGION" &> /dev/null; then
        log_test "KMS_INTEGRATION" "PASS" "KMS key exists and is accessible"
        
        # Check key rotation
        if aws kms get-key-rotation-status --key-id "$kms_alias" --region "$REGION" \
            --query 'KeyRotationEnabled' --output text | grep -q "true"; then
            log_test "KMS_ROTATION" "PASS" "KMS key rotation is enabled"
        else
            log_test "KMS_ROTATION" "WARN" "KMS key rotation is not enabled"
        fi
    else
        log_test "KMS_INTEGRATION" "FAIL" "KMS key not found or not accessible"
    fi
    
    # Test IAM integration
    local iam_user="candlefish-secrets-admin"
    if aws iam get-user --user-name "$iam_user" &> /dev/null; then
        log_test "IAM_INTEGRATION" "PASS" "IAM user exists"
        
        # Check user policies
        local policies=$(aws iam list-attached-user-policies --user-name "$iam_user" --query 'AttachedPolicies[].PolicyName' --output text)
        if [[ -n "$policies" ]]; then
            log_test "IAM_POLICIES" "PASS" "IAM user has attached policies: $policies"
        else
            log_test "IAM_POLICIES" "WARN" "IAM user has no attached policies"
        fi
    else
        log_test "IAM_INTEGRATION" "INFO" "IAM user not found (may use roles instead)"
    fi
    
    # Test CloudWatch integration
    if aws cloudwatch describe-alarms \
        --alarm-names "candlefish-secret-rotation-failed" \
        --region "$REGION" &> /dev/null; then
        log_test "CLOUDWATCH_INTEGRATION" "PASS" "CloudWatch alarms are configured"
    else
        log_test "CLOUDWATCH_INTEGRATION" "WARN" "CloudWatch alarms not found"
    fi
    
    # Test secret rotation functionality
    local rotation_test_secret="candlefish/$ENVIRONMENT/security/jwt"
    local rotation_config=$(aws secretsmanager describe-secret \
        --secret-id "$rotation_test_secret" \
        --region "$REGION" \
        --query 'RotationEnabled' --output text 2>/dev/null || echo "false")
    
    if [[ "$rotation_config" == "true" ]]; then
        log_test "SECRET_ROTATION" "PASS" "Secret rotation is enabled"
    else
        log_test "SECRET_ROTATION" "INFO" "Secret rotation is not enabled (may be manual)"
    fi
    
    echo ""
}

# Test 7: Security Scans
test_security() {
    echo -e "${PURPLE}══════ 7. Security and Credential Scans ══════${NC}"
    
    # Scan for hardcoded credentials in common patterns
    local patterns=(
        "password\s*=\s*['\"][^'\"]*['\"]"
        "api_key\s*=\s*['\"][^'\"]*['\"]"
        "secret\s*=\s*['\"][^'\"]*['\"]"
        "token\s*=\s*['\"][^'\"]*['\"]"
        "AKIA[0-9A-Z]{16}"  # AWS Access Key pattern
        "[0-9a-zA-Z/+]{40}"  # Potential secret key pattern
    )
    
    local found_issues=0
    for pattern in "${patterns[@]}"; do
        local matches=$(grep -r -E "$pattern" "$BASE_DIR" \
            --exclude-dir=.git \
            --exclude-dir=node_modules \
            --exclude-dir=.terraform \
            --exclude="*.log" \
            --exclude="comprehensive-test-suite.sh" \
            2>/dev/null | head -5)
        
        if [[ -n "$matches" ]]; then
            log_test "HARDCODED_SECRETS" "FAIL" "Potential hardcoded secrets found (pattern: ${pattern:0:20}...)"
            echo "$matches" | while IFS= read -r line; do
                echo "    $line"
            done
            ((found_issues++))
        fi
    done
    
    if [[ $found_issues -eq 0 ]]; then
        log_test "HARDCODED_SECRETS" "PASS" "No obvious hardcoded credentials found"
    fi
    
    # Check for .env files in version control
    local env_files=$(find "$BASE_DIR" -name ".env*" -not -path "*/node_modules/*" -not -path "*/.git/*")
    if [[ -n "$env_files" ]]; then
        log_test "ENV_FILES" "WARN" "Environment files found (ensure they're in .gitignore)"
        echo "$env_files" | while IFS= read -r file; do
            echo "    $file"
        done
    else
        log_test "ENV_FILES" "PASS" "No .env files found in repository"
    fi
    
    # Check permissions on sensitive files
    local sensitive_files=("$BASE_DIR/terraform/terraform.tfstate" "$BASE_DIR/.env.production")
    for file in "${sensitive_files[@]}"; do
        if [[ -f "$file" ]]; then
            local perms=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%A" "$file" 2>/dev/null)
            if [[ "$perms" =~ ^[0-7]00$ ]]; then
                log_test "FILE_PERMISSIONS_$(basename "$file")" "PASS" "File has secure permissions ($perms)"
            else
                log_test "FILE_PERMISSIONS_$(basename "$file")" "WARN" "File may have insecure permissions ($perms)"
            fi
        fi
    done
    
    echo ""
}

# Test 8: Emergency and Rollback Procedures
test_emergency_procedures() {
    echo -e "${PURPLE}══════ 8. Emergency and Rollback Procedures ══════${NC}"
    
    # Check if emergency scripts exist
    local emergency_scripts=("break-glass.sh" "rollback.sh" "emergency-access.sh")
    for script in "${emergency_scripts[@]}"; do
        if [[ -f "$BASE_DIR/$script" ]]; then
            log_test "EMERGENCY_SCRIPT_$script" "PASS" "Emergency script exists"
            
            # Check if script is executable
            if [[ -x "$BASE_DIR/$script" ]]; then
                log_test "EMERGENCY_EXEC_$script" "PASS" "Emergency script is executable"
            else
                log_test "EMERGENCY_EXEC_$script" "WARN" "Emergency script is not executable"
            fi
        else
            log_test "EMERGENCY_SCRIPT_$script" "WARN" "Emergency script not found"
        fi
    done
    
    # Check if backup procedures are documented
    local doc_files=("$BASE_DIR/docs/emergency-procedures.md" "$BASE_DIR/docs/disaster-recovery.md" "$BASE_DIR/README.md")
    for doc in "${doc_files[@]}"; do
        if [[ -f "$doc" ]]; then
            if grep -i "emergency\|rollback\|disaster\|backup" "$doc" &> /dev/null; then
                log_test "EMERGENCY_DOCS_$(basename "$doc")" "PASS" "Emergency procedures documented"
            else
                log_test "EMERGENCY_DOCS_$(basename "$doc")" "INFO" "Document exists but no emergency procedures found"
            fi
        fi
    done
    
    # Test backup functionality if available
    if aws s3 ls s3://candlefish-secrets-backup-$ENVIRONMENT &> /dev/null; then
        log_test "BACKUP_LOCATION" "PASS" "Backup S3 bucket exists"
        
        # Check recent backups
        local recent_backups=$(aws s3 ls s3://candlefish-secrets-backup-$ENVIRONMENT/ \
            --recursive | tail -5)
        if [[ -n "$recent_backups" ]]; then
            log_test "BACKUP_RECENT" "PASS" "Recent backups found in S3"
        else
            log_test "BACKUP_RECENT" "WARN" "No recent backups found"
        fi
    else
        log_test "BACKUP_LOCATION" "INFO" "Backup S3 bucket not found (may use different strategy)"
    fi
    
    echo ""
}

# Generate final report
generate_report() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                    Final Test Report${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Test Summary:${NC}"
    echo -e "  Total Duration: ${duration}s"
    echo -e "  Tests Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "  Tests Failed: ${RED}$FAILED_TESTS${NC}"
    echo -e "  Total Tests: $((PASSED_TESTS + FAILED_TESTS))"
    echo ""
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "${GREEN}✓ ALL TESTS PASSED - SYSTEM IS PRODUCTION READY${NC}"
        local status="PRODUCTION_READY"
    elif [[ $FAILED_TESTS -le 2 ]]; then
        echo -e "${YELLOW}⚠ MINOR ISSUES FOUND - REVIEW REQUIRED${NC}"
        local status="REVIEW_REQUIRED"
    else
        echo -e "${RED}✗ CRITICAL ISSUES FOUND - NOT PRODUCTION READY${NC}"
        local status="NOT_READY"
    fi
    
    echo ""
    echo -e "${BLUE}Detailed Results:${NC}"
    printf '%s\n' "${TEST_RESULTS[@]}"
    
    echo ""
    echo -e "${BLUE}Recommendations:${NC}"
    if [[ $FAILED_TESTS -gt 0 ]]; then
        echo "1. Address all failed tests before production deployment"
        echo "2. Review warning items for potential improvements"
        echo "3. Ensure emergency procedures are tested and documented"
        echo "4. Schedule regular security audits and penetration testing"
    else
        echo "1. System appears ready for production deployment"
        echo "2. Continue regular monitoring and maintenance"
        echo "3. Schedule periodic security reviews"
        echo "4. Keep emergency procedures up to date"
    fi
    
    # Save report to file
    local report_file="$BASE_DIR/logs/test-report-$(date +%Y%m%d-%H%M%S).txt"
    mkdir -p "$(dirname "$report_file")"
    {
        echo "Candlefish AI Secrets Management Test Report"
        echo "Generated: $(date)"
        echo "Environment: $ENVIRONMENT"
        echo "Region: $REGION"
        echo "Status: $status"
        echo "Duration: ${duration}s"
        echo "Passed: $PASSED_TESTS"
        echo "Failed: $FAILED_TESTS"
        echo ""
        echo "Detailed Results:"
        printf '%s\n' "${TEST_RESULTS[@]}"
    } > "$report_file"
    
    echo ""
    echo -e "${BLUE}Report saved to: $report_file${NC}"
    
    # Return appropriate exit code
    if [[ $FAILED_TESTS -eq 0 ]]; then
        return 0
    elif [[ $FAILED_TESTS -le 2 ]]; then
        return 1
    else
        return 2
    fi
}

# Main execution
main() {
    print_header
    
    test_environment || true
    test_vault_connectivity || true
    test_secret_retrieval || true
    test_sdk_functionality || true
    test_docker_containers || true
    test_integration || true
    test_security || true
    test_emergency_procedures || true
    
    generate_report
}

# Run the tests
main "$@"