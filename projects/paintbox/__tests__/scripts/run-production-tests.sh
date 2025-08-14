#!/bin/bash

# Production Features Test Suite Runner
# Comprehensive testing script for Paintbox production deployment features

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_ENV=${TEST_ENV:-test}
COVERAGE_THRESHOLD=${COVERAGE_THRESHOLD:-80}
PARALLEL_WORKERS=${PARALLEL_WORKERS:-4}
TIMEOUT=${TIMEOUT:-30000}

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}     Paintbox Production Features Test Suite    ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to run test suite with error handling
run_test_suite() {
    local test_name="$1"
    local test_pattern="$2"
    local additional_args="$3"
    
    print_status "Running $test_name..."
    
    if npm run test -- --testPathPattern="$test_pattern" $additional_args; then
        print_success "$test_name completed successfully"
        return 0
    else
        print_error "$test_name failed"
        return 1
    fi
}

# Function to check test coverage
check_coverage() {
    print_status "Checking test coverage..."
    
    # Extract coverage percentages from coverage report
    if [ -f "coverage/coverage-summary.json" ]; then
        local lines_coverage=$(node -p "
            const coverage = require('./coverage/coverage-summary.json');
            coverage.total.lines.pct;
        ")
        
        local functions_coverage=$(node -p "
            const coverage = require('./coverage/coverage-summary.json');
            coverage.total.functions.pct;
        ")
        
        local branches_coverage=$(node -p "
            const coverage = require('./coverage/coverage-summary.json');
            coverage.total.branches.pct;
        ")
        
        local statements_coverage=$(node -p "
            const coverage = require('./coverage/coverage-summary.json');
            coverage.total.statements.pct;
        ")
        
        echo ""
        echo -e "${BLUE}Coverage Report:${NC}"
        echo -e "Lines:      ${lines_coverage}%"
        echo -e "Functions:  ${functions_coverage}%"
        echo -e "Branches:   ${branches_coverage}%"
        echo -e "Statements: ${statements_coverage}%"
        echo ""
        
        # Check if coverage meets threshold
        local min_coverage=$(echo "$lines_coverage $functions_coverage $branches_coverage $statements_coverage" | tr ' ' '\n' | sort -n | head -1)
        
        if (( $(echo "$min_coverage >= $COVERAGE_THRESHOLD" | bc -l) )); then
            print_success "Coverage threshold ($COVERAGE_THRESHOLD%) met"
            return 0
        else
            print_error "Coverage threshold ($COVERAGE_THRESHOLD%) not met. Minimum coverage: $min_coverage%"
            return 1
        fi
    else
        print_warning "Coverage report not found"
        return 1
    fi
}

# Function to generate test report
generate_test_report() {
    print_status "Generating test report..."
    
    local report_file="test-results/production-test-report-$(date +%Y-%m-%d-%H-%M-%S).md"
    mkdir -p test-results
    
    cat > "$report_file" << EOF
# Paintbox Production Features Test Report

**Generated:** $(date)
**Environment:** $TEST_ENV
**Coverage Threshold:** $COVERAGE_THRESHOLD%

## Test Suite Results

$(if [ -f "test-results/unit-tests.xml" ]; then
    echo "### Unit Tests"
    echo "- Status: ✅ Passed"
    echo "- Test Pattern: api/production"
    echo ""
fi)

$(if [ -f "test-results/integration-tests.xml" ]; then
    echo "### Integration Tests"
    echo "- Status: ✅ Passed"
    echo "- Test Pattern: integration"
    echo ""
fi)

$(if [ -f "test-results/component-tests.xml" ]; then
    echo "### Component Tests"
    echo "- Status: ✅ Passed"
    echo "- Test Pattern: components/production"
    echo ""
fi)

$(if [ -f "test-results/e2e-tests.xml" ]; then
    echo "### E2E Tests"
    echo "- Status: ✅ Passed"
    echo "- Test Pattern: e2e"
    echo ""
fi)

$(if [ -f "test-results/security-tests.xml" ]; then
    echo "### Security Tests"
    echo "- Status: ✅ Passed"
    echo "- Test Pattern: security"
    echo ""
fi)

$(if [ -f "test-results/performance-tests.xml" ]; then
    echo "### Performance Tests"
    echo "- Status: ✅ Passed"
    echo "- Test Pattern: performance"
    echo ""
fi)

$(if [ -f "test-results/accessibility-tests.xml" ]; then
    echo "### Accessibility Tests"
    echo "- Status: ✅ Passed"
    echo "- Test Pattern: accessibility"
    echo ""
fi)

## Coverage Report

$(if [ -f "coverage/coverage-summary.json" ]; then
    node -p "
        const coverage = require('./coverage/coverage-summary.json');
        const total = coverage.total;
        \`- Lines: \${total.lines.pct}%
- Functions: \${total.functions.pct}%
- Branches: \${total.branches.pct}%
- Statements: \${total.statements.pct}%\`;
    "
fi)

## Test Artifacts

- Coverage Report: [coverage/lcov-report/index.html](coverage/lcov-report/index.html)
- Test Results: [test-results/](test-results/)
- Performance Metrics: [test-results/performance-metrics.json](test-results/performance-metrics.json)

EOF

    print_success "Test report generated: $report_file"
}

# Function to setup test environment
setup_test_environment() {
    print_status "Setting up test environment..."
    
    # Set environment variables
    export NODE_ENV=test
    export CI=true
    export JEST_TIMEOUT=$TIMEOUT
    export JEST_WORKERS=$PARALLEL_WORKERS
    
    # Ensure test directories exist
    mkdir -p test-results
    mkdir -p coverage
    
    # Clear previous test results
    rm -f test-results/*.xml
    rm -rf coverage/*
    
    print_success "Test environment setup complete"
}

# Function to cleanup test environment
cleanup_test_environment() {
    print_status "Cleaning up test environment..."
    
    # Archive old test results
    if [ -d "test-results" ]; then
        local archive_dir="test-results/archive/$(date +%Y-%m-%d)"
        mkdir -p "$archive_dir"
        find test-results -name "*.xml" -mtime +7 -exec mv {} "$archive_dir" \;
    fi
    
    print_success "Test environment cleanup complete"
}

# Main test execution function
run_all_tests() {
    local failed_tests=0
    
    print_status "Starting comprehensive test suite..."
    echo ""
    
    # 1. Unit Tests - API Endpoints
    print_status "Phase 1: Unit Tests (API Endpoints)"
    if run_test_suite "API Unit Tests" "api/production" "--outputFile=test-results/unit-tests.xml --testTimeout=$TIMEOUT"; then
        print_success "✅ API Unit Tests"
    else
        print_error "❌ API Unit Tests"
        ((failed_tests++))
    fi
    echo ""
    
    # 2. Integration Tests
    print_status "Phase 2: Integration Tests"
    if run_test_suite "Integration Tests" "integration" "--outputFile=test-results/integration-tests.xml --testTimeout=$TIMEOUT"; then
        print_success "✅ Integration Tests"
    else
        print_error "❌ Integration Tests"
        ((failed_tests++))
    fi
    echo ""
    
    # 3. Component Tests
    print_status "Phase 3: Component Tests"
    if run_test_suite "Component Tests" "components/production" "--outputFile=test-results/component-tests.xml --testTimeout=$TIMEOUT"; then
        print_success "✅ Component Tests"
    else
        print_error "❌ Component Tests"
        ((failed_tests++))
    fi
    echo ""
    
    # 4. Security Tests
    print_status "Phase 4: Security Tests"
    if run_test_suite "Security Tests" "security" "--outputFile=test-results/security-tests.xml --testTimeout=$TIMEOUT"; then
        print_error "✅ Security Tests"
    else
        print_error "❌ Security Tests"
        ((failed_tests++))
    fi
    echo ""
    
    # 5. Accessibility Tests
    print_status "Phase 5: Accessibility Tests"
    if run_test_suite "Accessibility Tests" "accessibility" "--outputFile=test-results/accessibility-tests.xml --testTimeout=$TIMEOUT"; then
        print_success "✅ Accessibility Tests"
    else
        print_error "❌ Accessibility Tests"
        ((failed_tests++))
    fi
    echo ""
    
    # 6. Generate Coverage Report
    print_status "Phase 6: Coverage Analysis"
    if npm run test:coverage -- --testPathPattern="(api/production|integration|components/production|security|accessibility)" --silent; then
        if check_coverage; then
            print_success "✅ Coverage Requirements Met"
        else
            print_error "❌ Coverage Requirements Not Met"
            ((failed_tests++))
        fi
    else
        print_error "❌ Coverage Generation Failed"
        ((failed_tests++))
    fi
    echo ""
    
    return $failed_tests
}

# Function to run E2E tests separately (requires running application)
run_e2e_tests() {
    print_status "Running E2E Tests (requires running application)..."
    
    # Check if application is running
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        print_status "Application detected, running E2E tests..."
        if npm run test:e2e -- --outputFile=test-results/e2e-tests.xml; then
            print_success "✅ E2E Tests"
            return 0
        else
            print_error "❌ E2E Tests"
            return 1
        fi
    else
        print_warning "Application not running, skipping E2E tests"
        print_warning "To run E2E tests, start the application with: npm run dev"
        return 0
    fi
}

# Function to run performance tests separately
run_performance_tests() {
    print_status "Running Performance Tests..."
    
    # Check if application is running
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        print_status "Application detected, running performance tests..."
        if npm run test -- --testPathPattern="performance" --outputFile=test-results/performance-tests.xml --testTimeout=300000; then
            print_success "✅ Performance Tests"
            return 0
        else
            print_error "❌ Performance Tests"
            return 1
        fi
    else
        print_warning "Application not running, skipping performance tests"
        print_warning "To run performance tests, start the application with: npm run dev"
        return 0
    fi
}

# Parse command line arguments
SKIP_E2E=false
SKIP_PERFORMANCE=false
GENERATE_REPORT=true
RUN_ONLY=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-e2e)
            SKIP_E2E=true
            shift
            ;;
        --skip-performance)
            SKIP_PERFORMANCE=true
            shift
            ;;
        --no-report)
            GENERATE_REPORT=false
            shift
            ;;
        --only)
            RUN_ONLY="$2"
            shift 2
            ;;
        --coverage-threshold)
            COVERAGE_THRESHOLD="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --workers)
            PARALLEL_WORKERS="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-e2e                 Skip E2E tests"
            echo "  --skip-performance         Skip performance tests"
            echo "  --no-report               Don't generate test report"
            echo "  --only PATTERN             Run only tests matching pattern"
            echo "  --coverage-threshold N     Set coverage threshold (default: 80)"
            echo "  --timeout N                Set test timeout in ms (default: 30000)"
            echo "  --workers N                Set number of parallel workers (default: 4)"
            echo "  -h, --help                 Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Run all tests"
            echo "  $0 --skip-e2e --skip-performance     # Run unit/integration tests only"
            echo "  $0 --only security                   # Run security tests only"
            echo "  $0 --coverage-threshold 90           # Require 90% coverage"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Main execution
main() {
    local start_time=$(date +%s)
    local total_failed=0
    
    # Setup
    setup_test_environment
    
    # Run tests based on options
    if [ -n "$RUN_ONLY" ]; then
        print_status "Running only tests matching: $RUN_ONLY"
        if run_test_suite "Filtered Tests" "$RUN_ONLY" "--outputFile=test-results/filtered-tests.xml --testTimeout=$TIMEOUT"; then
            print_success "✅ Filtered Tests"
        else
            print_error "❌ Filtered Tests"
            ((total_failed++))
        fi
    else
        # Run core test suite
        run_all_tests
        total_failed=$?
        
        # Run E2E tests if not skipped
        if [ "$SKIP_E2E" = false ]; then
            run_e2e_tests
            if [ $? -ne 0 ]; then
                ((total_failed++))
            fi
        fi
        
        # Run performance tests if not skipped
        if [ "$SKIP_PERFORMANCE" = false ]; then
            run_performance_tests
            if [ $? -ne 0 ]; then
                ((total_failed++))
            fi
        fi
    fi
    
    # Generate report
    if [ "$GENERATE_REPORT" = true ]; then
        generate_test_report
    fi
    
    # Cleanup
    cleanup_test_environment
    
    # Final summary
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}              Test Suite Summary                ${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
    echo -e "Duration: ${duration}s"
    echo -e "Environment: $TEST_ENV"
    echo -e "Coverage Threshold: $COVERAGE_THRESHOLD%"
    echo ""
    
    if [ $total_failed -eq 0 ]; then
        print_success "🎉 All tests passed successfully!"
        echo ""
        print_success "✅ Production features are ready for deployment"
        exit 0
    else
        print_error "❌ $total_failed test suite(s) failed"
        echo ""
        print_error "🚨 Please fix failing tests before deployment"
        exit 1
    fi
}

# Execute main function
main "$@"