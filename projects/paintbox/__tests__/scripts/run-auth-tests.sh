#!/bin/bash

# Authentication Test Suite Runner
# Comprehensive test execution script for JWKS and authentication testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_URL=${TEST_URL:-"http://localhost:3000"}
TEST_TIMEOUT=${TEST_TIMEOUT:-300000}
COVERAGE_THRESHOLD=${COVERAGE_THRESHOLD:-80}
PARALLEL_JOBS=${PARALLEL_JOBS:-4}

# Directories
TEST_DIR="$(dirname "$0")/.."
ROOT_DIR="$(dirname "$0")/../.."
REPORTS_DIR="$ROOT_DIR/test-reports"
COVERAGE_DIR="$ROOT_DIR/coverage"

# Test categories
UNIT_TESTS="$TEST_DIR/api/auth/jwks-comprehensive.test.ts"
INTEGRATION_TESTS="$TEST_DIR/integration/aws-secrets-jwks.test.ts"
E2E_TESTS="$TEST_DIR/e2e/auth-flow-comprehensive.spec.ts"
LOAD_TESTS="$TEST_DIR/performance/auth-load-tests.test.ts"
SECURITY_TESTS="$TEST_DIR/security/auth-security-tests.test.ts"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_banner() {
    echo -e "${BLUE}"
    echo "==========================================="
    echo "  Authentication Test Suite Runner"
    echo "==========================================="
    echo -e "${NC}"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi

    # Check if we're in the right directory
    if [ ! -f "$ROOT_DIR/package.json" ]; then
        log_error "package.json not found. Please run from project root."
        exit 1
    fi

    # Check if test files exist
    if [ ! -f "$UNIT_TESTS" ]; then
        log_warning "Unit test file not found: $UNIT_TESTS"
    fi

    log_success "Prerequisites check passed"
}

setup_environment() {
    log_info "Setting up test environment..."

    # Create directories
    mkdir -p "$REPORTS_DIR" "$COVERAGE_DIR"

    # Set environment variables
    export NODE_ENV=test
    export TEST_URL="$TEST_URL"
    export CI=true

    # Clear previous reports
    rm -rf "${REPORTS_DIR:?}"/* "${COVERAGE_DIR:?}"/*

    log_success "Environment setup complete"
}

check_server() {
    log_info "Checking if test server is running..."

    if curl -f -s "$TEST_URL/health" > /dev/null 2>&1; then
        log_success "Server is running at $TEST_URL"
    else
        log_warning "Server is not running at $TEST_URL"
        log_info "Please start the server before running E2E tests"
        return 1
    fi
}

run_unit_tests() {
    log_info "Running unit tests..."

    cd "$ROOT_DIR"

    if npm run test -- \
        --testPathPattern="api/auth" \
        --coverage \
        --coverageDirectory="$COVERAGE_DIR/unit" \
        --coverageReporters=json,lcov,text \
        --maxWorkers="$PARALLEL_JOBS" \
        --testTimeout="$TEST_TIMEOUT" \
        --detectOpenHandles \
        --forceExit; then
        log_success "Unit tests passed"
        return 0
    else
        log_error "Unit tests failed"
        return 1
    fi
}

run_integration_tests() {
    log_info "Running integration tests..."

    cd "$ROOT_DIR"

    # Check AWS credentials for integration tests
    if [ -z "$AWS_ACCESS_KEY_ID" ] && [ -z "$AWS_PROFILE" ]; then
        log_warning "No AWS credentials found. Skipping AWS integration tests."
        return 0
    fi

    if npm run test -- \
        --testPathPattern="integration/aws-secrets" \
        --coverage \
        --coverageDirectory="$COVERAGE_DIR/integration" \
        --coverageReporters=json,lcov,text \
        --maxWorkers=1 \
        --testTimeout="$TEST_TIMEOUT" \
        --detectOpenHandles \
        --forceExit; then
        log_success "Integration tests passed"
        return 0
    else
        log_error "Integration tests failed"
        return 1
    fi
}

run_e2e_tests() {
    log_info "Running E2E tests..."

    cd "$ROOT_DIR"

    if ! check_server; then
        log_error "Cannot run E2E tests without server"
        return 1
    fi

    if npx playwright test "$E2E_TESTS" \
        --reporter=html \
        --output-dir="$REPORTS_DIR/e2e"; then
        log_success "E2E tests passed"
        return 0
    else
        log_error "E2E tests failed"
        return 1
    fi
}

run_performance_tests() {
    log_info "Running performance tests..."

    cd "$ROOT_DIR"

    if ! check_server; then
        log_warning "Server not running. Performance tests may fail."
    fi

    if npm run test -- \
        --testPathPattern="performance/auth-load" \
        --maxWorkers=1 \
        --testTimeout=600000 \
        --detectOpenHandles \
        --forceExit; then
        log_success "Performance tests passed"
        return 0
    else
        log_error "Performance tests failed"
        return 1
    fi
}

run_security_tests() {
    log_info "Running security tests..."

    cd "$ROOT_DIR"

    if npm run test -- \
        --testPathPattern="security/auth-security" \
        --maxWorkers=1 \
        --testTimeout="$TEST_TIMEOUT" \
        --detectOpenHandles \
        --forceExit; then
        log_success "Security tests passed"
        return 0
    else
        log_error "Security tests failed"
        return 1
    fi
}

generate_coverage_report() {
    log_info "Generating coverage report..."

    cd "$ROOT_DIR"

    # Merge coverage reports
    if command -v nyc &> /dev/null; then
        nyc merge "$COVERAGE_DIR" "$COVERAGE_DIR/merged-coverage.json"
        nyc report \
            --temp-dir="$COVERAGE_DIR" \
            --reporter=html \
            --reporter=text \
            --report-dir="$COVERAGE_DIR/html"
    fi

    # Check coverage threshold
    if [ -f "$COVERAGE_DIR/coverage-summary.json" ]; then
        local coverage=$(node -e "console.log(require('$COVERAGE_DIR/coverage-summary.json').total.lines.pct)")
        if (( $(echo "$coverage >= $COVERAGE_THRESHOLD" | bc -l) )); then
            log_success "Coverage threshold met: ${coverage}% >= ${COVERAGE_THRESHOLD}%"
        else
            log_warning "Coverage below threshold: ${coverage}% < ${COVERAGE_THRESHOLD}%"
        fi
    fi
}

generate_test_report() {
    log_info "Generating test report..."

    local report_file="$REPORTS_DIR/auth-test-report.md"

    cat > "$report_file" << EOF
# Authentication Test Suite Report

**Date:** $(date)
**Test URL:** $TEST_URL
**Duration:** $((SECONDS / 60)) minutes

## Test Results

| Test Suite | Status | Duration |
|------------|--------|----------|
| Unit Tests | ${UNIT_RESULT:-❌} | ${UNIT_DURATION:-0}s |
| Integration Tests | ${INTEGRATION_RESULT:-❌} | ${INTEGRATION_DURATION:-0}s |
| E2E Tests | ${E2E_RESULT:-❌} | ${E2E_DURATION:-0}s |
| Performance Tests | ${PERFORMANCE_RESULT:-❌} | ${PERFORMANCE_DURATION:-0}s |
| Security Tests | ${SECURITY_RESULT:-❌} | ${SECURITY_DURATION:-0}s |

## Coverage Summary

$(cat "$COVERAGE_DIR/coverage-summary.json" 2>/dev/null | jq -r '.total' 2>/dev/null || echo "Coverage data not available")

## Recommendations

- Review failed tests in detail
- Check coverage reports for uncovered code
- Monitor performance metrics
- Address security vulnerabilities

EOF

    log_success "Test report generated: $report_file"
}

cleanup() {
    log_info "Cleaning up..."

    # Kill any background processes
    jobs -p | xargs -r kill

    # Clean temporary files
    rm -f /tmp/auth-test-*

    log_success "Cleanup complete"
}

show_usage() {
    echo "Usage: $0 [OPTIONS] [TEST_SUITE]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -u, --url URL           Test server URL (default: http://localhost:3000)"
    echo "  -t, --timeout TIMEOUT   Test timeout in ms (default: 300000)"
    echo "  -c, --coverage PERCENT  Coverage threshold (default: 80)"
    echo "  -j, --jobs JOBS         Parallel jobs (default: 4)"
    echo "  -v, --verbose           Verbose output"
    echo "  --skip-setup            Skip environment setup"
    echo "  --skip-cleanup          Skip cleanup"
    echo ""
    echo "Test Suites:"
    echo "  unit                    Run unit tests only"
    echo "  integration             Run integration tests only"
    echo "  e2e                     Run E2E tests only"
    echo "  performance             Run performance tests only"
    echo "  security                Run security tests only"
    echo "  all                     Run all test suites (default)"
    echo ""
    echo "Examples:"
    echo "  $0                      # Run all tests"
    echo "  $0 unit                 # Run unit tests only"
    echo "  $0 --url http://localhost:4000 e2e  # Run E2E tests against specific URL"
}

main() {
    local test_suite="all"
    local skip_setup=false
    local skip_cleanup=false
    local verbose=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -u|--url)
                TEST_URL="$2"
                shift 2
                ;;
            -t|--timeout)
                TEST_TIMEOUT="$2"
                shift 2
                ;;
            -c|--coverage)
                COVERAGE_THRESHOLD="$2"
                shift 2
                ;;
            -j|--jobs)
                PARALLEL_JOBS="$2"
                shift 2
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            --skip-setup)
                skip_setup=true
                shift
                ;;
            --skip-cleanup)
                skip_cleanup=true
                shift
                ;;
            unit|integration|e2e|performance|security|all)
                test_suite="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Set verbose mode
    if [ "$verbose" = true ]; then
        set -x
    fi

    # Trap cleanup on exit
    if [ "$skip_cleanup" = false ]; then
        trap cleanup EXIT
    fi

    print_banner

    log_info "Starting authentication test suite..."
    log_info "Test URL: $TEST_URL"
    log_info "Test Suite: $test_suite"
    log_info "Parallel Jobs: $PARALLEL_JOBS"
    log_info "Coverage Threshold: $COVERAGE_THRESHOLD%"

    check_prerequisites

    if [ "$skip_setup" = false ]; then
        setup_environment
    fi

    local start_time=$(date +%s)
    local exit_code=0

    # Run test suites
    case $test_suite in
        unit)
            run_unit_tests || exit_code=1
            ;;
        integration)
            run_integration_tests || exit_code=1
            ;;
        e2e)
            run_e2e_tests || exit_code=1
            ;;
        performance)
            run_performance_tests || exit_code=1
            ;;
        security)
            run_security_tests || exit_code=1
            ;;
        all)
            # Run all test suites
            local unit_start=$(date +%s)
            if run_unit_tests; then
                UNIT_RESULT="✅"
            else
                UNIT_RESULT="❌"
                exit_code=1
            fi
            UNIT_DURATION=$(($(date +%s) - unit_start))

            local integration_start=$(date +%s)
            if run_integration_tests; then
                INTEGRATION_RESULT="✅"
            else
                INTEGRATION_RESULT="❌"
                exit_code=1
            fi
            INTEGRATION_DURATION=$(($(date +%s) - integration_start))

            local e2e_start=$(date +%s)
            if run_e2e_tests; then
                E2E_RESULT="✅"
            else
                E2E_RESULT="❌"
                exit_code=1
            fi
            E2E_DURATION=$(($(date +%s) - e2e_start))

            local performance_start=$(date +%s)
            if run_performance_tests; then
                PERFORMANCE_RESULT="✅"
            else
                PERFORMANCE_RESULT="❌"
                exit_code=1
            fi
            PERFORMANCE_DURATION=$(($(date +%s) - performance_start))

            local security_start=$(date +%s)
            if run_security_tests; then
                SECURITY_RESULT="✅"
            else
                SECURITY_RESULT="❌"
                exit_code=1
            fi
            SECURITY_DURATION=$(($(date +%s) - security_start))
            ;;
        *)
            log_error "Unknown test suite: $test_suite"
            exit 1
            ;;
    esac

    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))

    # Generate reports
    if [ "$test_suite" = "all" ] || [ "$test_suite" = "unit" ]; then
        generate_coverage_report
    fi

    if [ "$test_suite" = "all" ]; then
        generate_test_report
    fi

    # Final summary
    echo ""
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${BLUE}  Test Suite Summary${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo "Total Duration: ${total_duration}s"
    echo "Reports Directory: $REPORTS_DIR"
    echo "Coverage Directory: $COVERAGE_DIR"

    if [ $exit_code -eq 0 ]; then
        log_success "All tests passed! 🎉"
    else
        log_error "Some tests failed. Check the reports for details."
    fi

    exit $exit_code
}

# Run main function with all arguments
main "$@"
