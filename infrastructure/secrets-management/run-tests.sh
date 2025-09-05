#!/bin/bash

# Candlefish AI - Secrets Management Test Runner
# Orchestrates all test suites for comprehensive validation

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$BASE_DIR/tests"

print_banner() {
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}    Candlefish AI - Secrets Management Test Suite Runner${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

show_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  all                    Run all test suites (default)"
    echo "  comprehensive          Run comprehensive test suite"
    echo "  vault                  Test Vault connectivity"
    echo "  sdk                    Test SDK functionality"
    echo "  docker                 Test Docker container health"
    echo "  integration           Run integration tests"
    echo "  security              Run security scan"
    echo "  emergency             Test emergency procedures"
    echo "  quick                 Run quick validation tests only"
    echo "  help                  Show this help"
    echo ""
    echo "Available Test Files:"
    ls -1 "$TEST_DIR"/*.sh | sed 's/.*\//  - /'
    echo ""
    echo "Environment Variables:"
    echo "  AWS_REGION           AWS region (default: us-east-1)"
    echo "  ENVIRONMENT          Environment name (default: production)"
    echo "  VAULT_ADDR           Vault server address"
    echo "  VAULT_TOKEN          Vault authentication token"
    echo ""
}

run_test() {
    local test_name="$1"
    local test_file="$2"
    
    echo -e "${BLUE}═══ Running $test_name ═══${NC}"
    
    if [[ -x "$test_file" ]]; then
        "$test_file"
        local exit_code=$?
        
        if [[ $exit_code -eq 0 ]]; then
            echo -e "${GREEN}✓ $test_name completed successfully${NC}"
        else
            echo -e "${YELLOW}⚠ $test_name completed with warnings/errors (exit code: $exit_code)${NC}"
        fi
        
        echo ""
        return $exit_code
    else
        echo -e "${YELLOW}⚠ Test file not executable: $test_file${NC}"
        echo ""
        return 1
    fi
}

run_comprehensive() {
    echo -e "${BLUE}Running comprehensive test suite...${NC}"
    run_test "Comprehensive Tests" "$TEST_DIR/comprehensive-test-suite.sh"
}

run_vault_tests() {
    echo -e "${BLUE}Running Vault connectivity tests...${NC}"
    run_test "Vault Connectivity" "$TEST_DIR/vault-connectivity-test.sh"
}

run_sdk_tests() {
    echo -e "${BLUE}Running SDK functionality tests...${NC}"
    if command -v node &>/dev/null; then
        cd "$BASE_DIR"
        run_test "SDK Functionality" "$TEST_DIR/sdk-functionality-test.js"
    else
        echo -e "${YELLOW}⚠ Node.js not available, skipping SDK tests${NC}"
    fi
}

run_docker_tests() {
    echo -e "${BLUE}Running Docker container health tests...${NC}"
    run_test "Docker Health" "$TEST_DIR/docker-health-check.sh"
}

run_integration_tests() {
    echo -e "${BLUE}Running integration tests...${NC}"
    run_test "Integration Tests" "$TEST_DIR/integration-test.sh"
}

run_security_scan() {
    echo -e "${BLUE}Running security scan...${NC}"
    run_test "Security Scan" "$TEST_DIR/security-scan.sh"
}

run_emergency_tests() {
    echo -e "${BLUE}Running emergency procedures tests...${NC}"
    run_test "Emergency Procedures" "$TEST_DIR/emergency-procedures-test.sh"
}

run_quick_tests() {
    echo -e "${BLUE}Running quick validation tests...${NC}"
    echo ""
    
    # Quick environment check
    echo -e "${CYAN}Environment Check:${NC}"
    if command -v aws &>/dev/null; then
        echo "✓ AWS CLI available"
    else
        echo "✗ AWS CLI not available"
    fi
    
    if command -v docker &>/dev/null; then
        echo "✓ Docker available"
    else
        echo "✗ Docker not available"
    fi
    
    if [[ -d "$BASE_DIR/sdk/typescript" ]]; then
        echo "✓ SDK directory exists"
    else
        echo "✗ SDK directory missing"
    fi
    
    if [[ -f "$BASE_DIR/README.md" ]]; then
        echo "✓ Documentation exists"
    else
        echo "✗ Documentation missing"
    fi
    
    echo ""
    
    # Quick SDK test
    if command -v node &>/dev/null; then
        run_sdk_tests
    fi
}

run_all_tests() {
    echo -e "${BLUE}Running all test suites...${NC}"
    echo ""
    
    local failed_tests=0
    
    run_comprehensive || ((failed_tests++))
    run_vault_tests || ((failed_tests++))
    run_sdk_tests || ((failed_tests++))
    run_docker_tests || ((failed_tests++))
    run_integration_tests || ((failed_tests++))
    run_security_scan || ((failed_tests++))
    run_emergency_tests || ((failed_tests++))
    
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                    All Tests Complete${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    
    if [[ $failed_tests -eq 0 ]]; then
        echo -e "${GREEN}✓ All test suites completed successfully${NC}"
    else
        echo -e "${YELLOW}⚠ $failed_tests test suites had warnings or errors${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}For detailed analysis, see:${NC}"
    echo "  - Production Readiness Report: $BASE_DIR/PRODUCTION_READINESS_REPORT.md"
    echo "  - Individual test logs in: $BASE_DIR/logs/"
    echo ""
    
    return $failed_tests
}

# Main execution
main() {
    print_banner
    
    local command="${1:-all}"
    
    case "$command" in
        "help"|"-h"|"--help")
            show_usage
            ;;
        "all"|"")
            run_all_tests
            ;;
        "comprehensive")
            run_comprehensive
            ;;
        "vault")
            run_vault_tests
            ;;
        "sdk")
            run_sdk_tests
            ;;
        "docker")
            run_docker_tests
            ;;
        "integration")
            run_integration_tests
            ;;
        "security")
            run_security_scan
            ;;
        "emergency")
            run_emergency_tests
            ;;
        "quick")
            run_quick_tests
            ;;
        *)
            echo "Unknown command: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Ensure test directory exists and scripts are executable
if [[ -d "$TEST_DIR" ]]; then
    chmod +x "$TEST_DIR"/*.sh 2>/dev/null || true
    chmod +x "$TEST_DIR"/*.js 2>/dev/null || true
fi

main "$@"