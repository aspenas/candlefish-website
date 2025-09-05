#!/bin/bash

# Security Scan Script for Secrets Management
# Scans for hardcoded credentials, security vulnerabilities, and compliance issues

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

FAILED_TESTS=0
PASSED_TESTS=0
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "$BASE_DIR/../.." && pwd)"

test_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    if [[ "$status" == "PASS" ]]; then
        echo -e "${GREEN}✓ $test_name: $message${NC}"
        ((PASSED_TESTS++))
    elif [[ "$status" == "FAIL" ]]; then
        echo -e "${RED}✗ $test_name: $message${NC}"
        ((FAILED_TESTS++))
    elif [[ "$status" == "WARN" ]]; then
        echo -e "${YELLOW}⚠ $test_name: $message${NC}"
    else
        echo -e "${BLUE}ℹ $test_name: $message${NC}"
    fi
}

print_header() {
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}            Security Scan - Secrets Management${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Test 1: Hardcoded Credentials Scan
test_hardcoded_credentials() {
    echo -e "${PURPLE}══════ Hardcoded Credentials Scan ══════${NC}"
    
    # Define patterns for different types of credentials
    local patterns=(
        # API Keys
        "AKIA[0-9A-Z]{16}"                              # AWS Access Keys
        "sk-[a-zA-Z0-9]{48}"                           # OpenAI API Keys
        "xoxb-[0-9]+-[0-9]+-[0-9]+-[a-zA-Z0-9]+"      # Slack Bot Tokens
        "ya29\.[0-9A-Za-z\-_]+"                       # Google OAuth Tokens
        "AIza[0-9A-Za-z\-_]{35}"                       # Google API Keys
        
        # Database Connection Strings
        "mongodb://[^\"'\s]+"                          # MongoDB URIs
        "postgres://[^\"'\s]+"                         # PostgreSQL URIs
        "mysql://[^\"'\s]+"                            # MySQL URIs
        
        # Generic Patterns
        "password\s*[=:]\s*['\"][^'\"]{8,}['\"]"       # Password assignments
        "api_?key\s*[=:]\s*['\"][^'\"]{10,}['\"]"      # API key assignments
        "secret\s*[=:]\s*['\"][^'\"]{10,}['\"]"        # Secret assignments
        "token\s*[=:]\s*['\"][^'\"]{10,}['\"]"         # Token assignments
        
        # Specific Services
        "sk_live_[0-9a-zA-Z]{24}"                      # Stripe Live Keys
        "pk_live_[0-9a-zA-Z]{24}"                      # Stripe Public Keys
        "rk_live_[0-9a-zA-Z]{24}"                      # Stripe Restricted Keys
        "[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com" # Google OAuth Client IDs
    )
    
    local total_issues=0
    local scanned_files=0
    
    # Create temporary file for results
    local temp_results="/tmp/security_scan_$$"
    
    for pattern in "${patterns[@]}"; do
        local pattern_name=$(echo "$pattern" | head -c 30)...
        
        # Search for pattern across the codebase
        local matches=$(grep -r -E "$pattern" "$ROOT_DIR" \
            --exclude-dir=.git \
            --exclude-dir=node_modules \
            --exclude-dir=.terraform \
            --exclude-dir=venv \
            --exclude-dir=__pycache__ \
            --exclude="*.log" \
            --exclude="*.pyc" \
            --exclude="security-scan.sh" \
            --exclude="comprehensive-test-suite.sh" \
            --exclude="*.md" \
            2>/dev/null || echo "")
        
        if [[ -n "$matches" ]]; then
            echo "$matches" >> "$temp_results"
            local match_count=$(echo "$matches" | wc -l)
            total_issues=$((total_issues + match_count))
            test_result "PATTERN_$pattern_name" "FAIL" "Found $match_count potential matches"
            
            # Show first few matches for context
            echo "$matches" | head -3 | while IFS= read -r line; do
                echo "    $line"
            done
            if [[ $(echo "$matches" | wc -l) -gt 3 ]]; then
                echo "    ... and $(($(echo "$matches" | wc -l) - 3)) more matches"
            fi
        fi
    done
    
    if [[ $total_issues -eq 0 ]]; then
        test_result "HARDCODED_SCAN" "PASS" "No hardcoded credentials detected"
    else
        test_result "HARDCODED_SCAN" "FAIL" "Found $total_issues potential hardcoded credentials"
    fi
    
    # Clean up
    rm -f "$temp_results"
    echo ""
}

# Test 2: Environment File Security
test_env_file_security() {
    echo -e "${PURPLE}══════ Environment File Security ══════${NC}"
    
    # Find all .env files
    local env_files=$(find "$ROOT_DIR" -name ".env*" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null || echo "")
    
    if [[ -z "$env_files" ]]; then
        test_result "ENV_FILES_FOUND" "PASS" "No .env files found in repository"
    else
        test_result "ENV_FILES_FOUND" "WARN" "Found .env files in repository"
        
        echo "$env_files" | while IFS= read -r env_file; do
            if [[ -n "$env_file" ]]; then
                local file_name=$(basename "$env_file")
                
                # Check if it's an example file
                if [[ "$file_name" == *.example ]] || [[ "$file_name" == *.template ]]; then
                    test_result "ENV_EXAMPLE_$file_name" "PASS" "Example/template file: $env_file"
                else
                    test_result "ENV_REAL_$file_name" "WARN" "Real env file found: $env_file"
                    
                    # Check if it's in .gitignore
                    local relative_path="${env_file#$ROOT_DIR/}"
                    if git check-ignore "$env_file" &>/dev/null; then
                        test_result "ENV_GITIGNORE_$file_name" "PASS" "File is properly ignored by git"
                    else
                        test_result "ENV_GITIGNORE_$file_name" "FAIL" "File is NOT ignored by git (security risk)"
                    fi
                fi
                
                # Check file permissions
                if [[ -f "$env_file" ]]; then
                    local perms=$(stat -c "%a" "$env_file" 2>/dev/null || stat -f "%A" "$env_file" 2>/dev/null)
                    if [[ "$perms" =~ ^[0-7][0-7]0$ ]]; then
                        test_result "ENV_PERMS_$file_name" "PASS" "File has secure permissions ($perms)"
                    else
                        test_result "ENV_PERMS_$file_name" "WARN" "File permissions may be too open ($perms)"
                    fi
                fi
            fi
        done
    fi
    echo ""
}

# Test 3: Git History Scan
test_git_history() {
    echo -e "${PURPLE}══════ Git History Security Scan ══════${NC}"
    
    cd "$ROOT_DIR"
    
    # Check if git is available and this is a git repository
    if git rev-parse --git-dir &>/dev/null; then
        test_result "GIT_REPO" "PASS" "Git repository detected"
        
        # Look for potential secrets in commit messages
        local suspicious_commits=$(git log --oneline --grep="password\|secret\|key\|token" --ignore-case || echo "")
        if [[ -n "$suspicious_commits" ]]; then
            local commit_count=$(echo "$suspicious_commits" | wc -l)
            test_result "GIT_COMMIT_MESSAGES" "WARN" "Found $commit_count commits with suspicious keywords"
        else
            test_result "GIT_COMMIT_MESSAGES" "PASS" "No suspicious commit messages found"
        fi
        
        # Check for large files that might contain secrets
        local large_files=$(git log --all --full-history -- '*.env' '*.key' '*.pem' '*.p12' '*.pfx' | head -10 || echo "")
        if [[ -n "$large_files" ]]; then
            test_result "GIT_SENSITIVE_FILES" "WARN" "Found potentially sensitive files in git history"
        else
            test_result "GIT_SENSITIVE_FILES" "PASS" "No obviously sensitive files in git history"
        fi
        
        # Check for removed .env files (might indicate they were accidentally committed)
        local removed_env_files=$(git log --diff-filter=D --summary | grep -E "\\.env|secret|credential" | head -5 || echo "")
        if [[ -n "$removed_env_files" ]]; then
            test_result "GIT_REMOVED_SECRETS" "WARN" "Found evidence of removed secret files"
            echo "$removed_env_files" | while IFS= read -r line; do
                echo "    $line"
            done
        else
            test_result "GIT_REMOVED_SECRETS" "PASS" "No evidence of removed secret files"
        fi
    else
        test_result "GIT_REPO" "INFO" "Not a git repository or git not available"
    fi
    echo ""
}

# Test 4: File Permission Audit
test_file_permissions() {
    echo -e "${PURPLE}══════ File Permission Security Audit ══════${NC}"
    
    # Check sensitive file types
    local sensitive_patterns=("*.key" "*.pem" "*.p12" "*.pfx" "*.crt" "*credential*" "*secret*")
    local permission_issues=0
    
    for pattern in "${sensitive_patterns[@]}"; do
        local files=$(find "$ROOT_DIR" -name "$pattern" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null || echo "")
        
        if [[ -n "$files" ]]; then
            echo "$files" | while IFS= read -r file; do
                if [[ -n "$file" && -f "$file" ]]; then
                    local perms=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%A" "$file" 2>/dev/null)
                    local filename=$(basename "$file")
                    
                    # Check if permissions are secure (should be 600 or 700)
                    if [[ "$perms" =~ ^[0-7]00$ ]]; then
                        test_result "FILE_PERMS_$filename" "PASS" "Secure permissions ($perms)"
                    else
                        test_result "FILE_PERMS_$filename" "WARN" "Potentially insecure permissions ($perms)"
                        ((permission_issues++))
                    fi
                fi
            done
        fi
    done
    
    # Check script files
    local script_files=$(find "$BASE_DIR" -name "*.sh" 2>/dev/null || echo "")
    if [[ -n "$script_files" ]]; then
        echo "$script_files" | while IFS= read -r script; do
            if [[ -n "$script" && -f "$script" ]]; then
                local filename=$(basename "$script")
                if [[ -x "$script" ]]; then
                    test_result "SCRIPT_EXEC_$filename" "PASS" "Script is executable"
                else
                    test_result "SCRIPT_EXEC_$filename" "WARN" "Script is not executable"
                fi
            fi
        done
    fi
    echo ""
}

# Test 5: Dependency Security Scan
test_dependency_security() {
    echo -e "${PURPLE}══════ Dependency Security Scan ══════${NC}"
    
    # Check for package.json files and run security audit if npm is available
    local package_files=$(find "$ROOT_DIR" -name "package.json" -not -path "*/node_modules/*" 2>/dev/null || echo "")
    
    if [[ -n "$package_files" ]]; then
        if command -v npm &>/dev/null; then
            echo "$package_files" | head -3 | while IFS= read -r package_file; do
                if [[ -n "$package_file" ]]; then
                    local dir=$(dirname "$package_file")
                    local dirname=$(basename "$dir")
                    
                    cd "$dir"
                    
                    # Run npm audit if node_modules exists
                    if [[ -d "node_modules" ]]; then
                        local audit_result=$(npm audit --audit-level moderate --json 2>/dev/null || echo '{"error": "audit_failed"}')
                        
                        if echo "$audit_result" | jq -e '.vulnerabilities' &>/dev/null; then
                            local vuln_count=$(echo "$audit_result" | jq '.metadata.vulnerabilities.total' 2>/dev/null || echo "0")
                            if [[ "$vuln_count" -gt 0 ]]; then
                                test_result "NPM_AUDIT_$dirname" "WARN" "Found $vuln_count vulnerabilities"
                            else
                                test_result "NPM_AUDIT_$dirname" "PASS" "No vulnerabilities found"
                            fi
                        else
                            test_result "NPM_AUDIT_$dirname" "INFO" "Could not run npm audit"
                        fi
                    else
                        test_result "NPM_MODULES_$dirname" "INFO" "No node_modules found"
                    fi
                fi
            done
        else
            test_result "NPM_AVAILABLE" "INFO" "npm not available for dependency scanning"
        fi
    else
        test_result "PACKAGE_JSON_FOUND" "INFO" "No package.json files found"
    fi
    
    # Check for requirements.txt files (Python)
    local requirements_files=$(find "$ROOT_DIR" -name "requirements*.txt" -not -path "*/venv/*" 2>/dev/null || echo "")
    
    if [[ -n "$requirements_files" ]]; then
        if command -v pip &>/dev/null || command -v safety &>/dev/null; then
            test_result "PYTHON_DEPS_FOUND" "PASS" "Python requirements files found"
            
            # Run safety check if available
            if command -v safety &>/dev/null; then
                echo "$requirements_files" | head -2 | while IFS= read -r req_file; do
                    if [[ -n "$req_file" ]]; then
                        local filename=$(basename "$req_file")
                        if safety check -r "$req_file" &>/dev/null; then
                            test_result "SAFETY_CHECK_$filename" "PASS" "No known vulnerabilities"
                        else
                            test_result "SAFETY_CHECK_$filename" "WARN" "Potential vulnerabilities found"
                        fi
                    fi
                done
            else
                test_result "SAFETY_AVAILABLE" "INFO" "safety tool not available for Python dependency scanning"
            fi
        else
            test_result "PYTHON_AVAILABLE" "INFO" "Python tools not available for dependency scanning"
        fi
    fi
    echo ""
}

# Test 6: Configuration Security
test_configuration_security() {
    echo -e "${PURPLE}══════ Configuration Security ══════${NC}"
    
    # Check Terraform state files
    local tf_state_files=$(find "$ROOT_DIR" -name "terraform.tfstate*" 2>/dev/null || echo "")
    if [[ -n "$tf_state_files" ]]; then
        test_result "TERRAFORM_STATE" "WARN" "Terraform state files found (may contain sensitive data)"
        echo "$tf_state_files" | while IFS= read -r state_file; do
            if [[ -n "$state_file" ]]; then
                echo "    $state_file"
                # Check if it's in .gitignore
                if git check-ignore "$state_file" &>/dev/null; then
                    test_result "TF_STATE_GITIGNORE" "PASS" "State file is ignored by git"
                else
                    test_result "TF_STATE_GITIGNORE" "FAIL" "State file is NOT ignored by git"
                fi
            fi
        done
    else
        test_result "TERRAFORM_STATE" "PASS" "No Terraform state files found in repository"
    fi
    
    # Check for Docker secrets
    local docker_files=$(find "$ROOT_DIR" -name "docker-compose*.yml" -o -name "Dockerfile*" 2>/dev/null || echo "")
    if [[ -n "$docker_files" ]]; then
        local docker_secrets_found=false
        
        echo "$docker_files" | while IFS= read -r docker_file; do
            if [[ -n "$docker_file" ]]; then
                local filename=$(basename "$docker_file")
                
                # Check for hardcoded secrets in Docker files
                if grep -qiE "(password|secret|key|token)\s*=" "$docker_file" 2>/dev/null; then
                    test_result "DOCKER_HARDCODED_$filename" "FAIL" "Potential hardcoded secrets in Docker file"
                    docker_secrets_found=true
                else
                    test_result "DOCKER_HARDCODED_$filename" "PASS" "No hardcoded secrets in Docker file"
                fi
                
                # Check for proper secrets management
                if grep -qE "(secrets:|env_file:)" "$docker_file" 2>/dev/null; then
                    test_result "DOCKER_SECRETS_MGMT_$filename" "PASS" "Uses proper secrets management"
                else
                    test_result "DOCKER_SECRETS_MGMT_$filename" "INFO" "No explicit secrets management detected"
                fi
            fi
        done
    else
        test_result "DOCKER_FILES" "INFO" "No Docker files found"
    fi
    
    # Check for Kubernetes secrets
    local k8s_files=$(find "$ROOT_DIR" -name "*.yaml" -o -name "*.yml" | xargs grep -l "kind.*Secret" 2>/dev/null || echo "")
    if [[ -n "$k8s_files" ]]; then
        test_result "K8S_SECRETS_FOUND" "PASS" "Kubernetes Secret resources found"
        
        echo "$k8s_files" | while IFS= read -r k8s_file; do
            if [[ -n "$k8s_file" ]]; then
                local filename=$(basename "$k8s_file")
                
                # Check if secrets are base64 encoded (they should be)
                if grep -A 10 "kind.*Secret" "$k8s_file" | grep -qE "data:|stringData:" 2>/dev/null; then
                    test_result "K8S_SECRET_FORMAT_$filename" "PASS" "Kubernetes secrets use proper data format"
                else
                    test_result "K8S_SECRET_FORMAT_$filename" "INFO" "Could not verify Kubernetes secret format"
                fi
            fi
        done
    else
        test_result "K8S_SECRETS" "INFO" "No Kubernetes Secret resources found"
    fi
    echo ""
}

# Generate security report
generate_security_report() {
    local total_tests=$((PASSED_TESTS + FAILED_TESTS))
    
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                  Security Scan Report${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Scan Summary:${NC}"
    echo -e "  Tests Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "  Tests Failed: ${RED}$FAILED_TESTS${NC}"
    echo -e "  Total Tests: $total_tests"
    echo ""
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "${GREEN}✓ SECURITY SCAN PASSED - No critical issues found${NC}"
        echo ""
        echo -e "${BLUE}Recommendations:${NC}"
        echo "1. Continue regular security scans"
        echo "2. Monitor for new vulnerabilities in dependencies"
        echo "3. Review file permissions periodically"
        echo "4. Keep security tools up to date"
        return 0
    elif [[ $FAILED_TESTS -le 3 ]]; then
        echo -e "${YELLOW}⚠ MINOR SECURITY ISSUES - Review and fix recommended${NC}"
        echo ""
        echo -e "${BLUE}Action Items:${NC}"
        echo "1. Review and address failed security checks"
        echo "2. Consider implementing additional security measures"
        echo "3. Schedule regular security reviews"
        return 1
    else
        echo -e "${RED}✗ CRITICAL SECURITY ISSUES - Immediate action required${NC}"
        echo ""
        echo -e "${BLUE}Immediate Actions Required:${NC}"
        echo "1. Address all failed security checks immediately"
        echo "2. Rotate any exposed credentials"
        echo "3. Review and strengthen security practices"
        echo "4. Consider implementing automated security scanning"
        return 2
    fi
}

# Main execution
main() {
    print_header
    
    test_hardcoded_credentials
    test_env_file_security
    test_git_history
    test_file_permissions
    test_dependency_security
    test_configuration_security
    
    generate_security_report
}

# Run the security scan
main "$@"