#!/bin/bash

# Run All Tests Script for System Analyzer
# Executes comprehensive test suite across all platforms and test types

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_ENV="${TEST_ENV:-test}"
PARALLEL_TESTS="${PARALLEL_TESTS:-true}"
COVERAGE_THRESHOLD="${COVERAGE_THRESHOLD:-80}"
SKIP_E2E="${SKIP_E2E:-false}"
SKIP_PERFORMANCE="${SKIP_PERFORMANCE:-false}"

# Directories
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MOBILE_DIR="$ROOT_DIR/mobile"
TESTS_DIR="$ROOT_DIR/__tests__"
COVERAGE_DIR="$ROOT_DIR/coverage"

# Test results tracking
declare -a test_results=()
overall_success=true

print_header() {
    echo -e "\n${BLUE}=================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_dependencies() {
    print_header "Checking Dependencies"
    
    local deps=("node" "npm" "jest" "playwright")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_error "Please install missing dependencies before running tests"
        exit 1
    fi
    
    print_success "All dependencies available"
}

setup_test_environment() {
    print_header "Setting Up Test Environment"
    
    # Set environment variables
    export NODE_ENV="$TEST_ENV"
    export CI=true
    export JEST_WATCH=false
    
    # Create coverage directory
    mkdir -p "$COVERAGE_DIR"
    
    # Install dependencies if needed
    if [ ! -d "$ROOT_DIR/node_modules" ]; then
        print_warning "Installing dependencies..."
        cd "$ROOT_DIR" && npm install
    fi
    
    if [ ! -d "$MOBILE_DIR/node_modules" ]; then
        print_warning "Installing mobile dependencies..."
        cd "$MOBILE_DIR" && npm install
    fi
    
    print_success "Test environment ready"
}

run_unit_tests() {
    print_header "Running Unit Tests"
    
    cd "$ROOT_DIR"
    
    local jest_args="--coverage --coverageDirectory=$COVERAGE_DIR/unit"
    
    if [ "$PARALLEL_TESTS" = "true" ]; then
        jest_args="$jest_args --maxWorkers=50%"
    fi
    
    if npm run test:unit $jest_args; then
        test_results+=("Unit Tests: PASSED")
        print_success "Unit tests completed successfully"
    else
        test_results+=("Unit Tests: FAILED")
        print_error "Unit tests failed"
        overall_success=false
    fi
}

run_integration_tests() {
    print_header "Running Integration Tests"
    
    cd "$ROOT_DIR"
    
    # Start test services if not already running
    if ! curl -s http://localhost:4000/health &> /dev/null; then
        print_warning "Starting test services..."
        npm run start:test &
        TEST_SERVER_PID=$!
        
        # Wait for services to be ready
        for i in {1..30}; do
            if curl -s http://localhost:4000/health &> /dev/null; then
                break
            fi
            sleep 1
        done
        
        if ! curl -s http://localhost:4000/health &> /dev/null; then
            print_error "Test services failed to start"
            [ -n "$TEST_SERVER_PID" ] && kill $TEST_SERVER_PID
            test_results+=("Integration Tests: SKIPPED (services not available)")
            return
        fi
    fi
    
    local jest_args="--testPathPattern=integration --coverage --coverageDirectory=$COVERAGE_DIR/integration"
    
    if npm run test $jest_args; then
        test_results+=("Integration Tests: PASSED")
        print_success "Integration tests completed successfully"
    else
        test_results+=("Integration Tests: FAILED")
        print_error "Integration tests failed"
        overall_success=false
    fi
    
    # Clean up test services
    [ -n "$TEST_SERVER_PID" ] && kill $TEST_SERVER_PID
}

run_graphql_tests() {
    print_header "Running GraphQL Tests"
    
    cd "$ROOT_DIR"
    
    local jest_config="__tests__/jest.graphql.config.js"
    local jest_args="--config=$jest_config --coverage --coverageDirectory=$COVERAGE_DIR/graphql"
    
    if npx jest $jest_args; then
        test_results+=("GraphQL Tests: PASSED")
        print_success "GraphQL tests completed successfully"
    else
        test_results+=("GraphQL Tests: FAILED")
        print_error "GraphQL tests failed"
        overall_success=false
    fi
}

run_component_tests() {
    print_header "Running React Component Tests"
    
    cd "$ROOT_DIR"
    
    local jest_args="--testPathPattern=components --coverage --coverageDirectory=$COVERAGE_DIR/components"
    
    if npm run test:components $jest_args; then
        test_results+=("Component Tests: PASSED")
        print_success "Component tests completed successfully"
    else
        test_results+=("Component Tests: FAILED")
        print_error "Component tests failed"
        overall_success=false
    fi
}

run_mobile_tests() {
    print_header "Running React Native Tests"
    
    if [ ! -d "$MOBILE_DIR" ]; then
        print_warning "Mobile directory not found, skipping mobile tests"
        test_results+=("Mobile Tests: SKIPPED")
        return
    fi
    
    cd "$MOBILE_DIR"
    
    local jest_args="--coverage --coverageDirectory=../coverage/mobile"
    
    if npm run test $jest_args; then
        test_results+=("Mobile Tests: PASSED")
        print_success "Mobile tests completed successfully"
    else
        test_results+=("Mobile Tests: FAILED")
        print_error "Mobile tests failed"
        overall_success=false
    fi
}

run_e2e_tests() {
    if [ "$SKIP_E2E" = "true" ]; then
        print_warning "Skipping E2E tests (SKIP_E2E=true)"
        test_results+=("E2E Tests: SKIPPED")
        return
    fi
    
    print_header "Running End-to-End Tests"
    
    cd "$ROOT_DIR"
    
    # Install Playwright browsers if needed
    if [ ! -d "$HOME/.cache/ms-playwright" ] || [ ! "$(ls -A $HOME/.cache/ms-playwright)" ]; then
        print_warning "Installing Playwright browsers..."
        npx playwright install
    fi
    
    # Start application if not already running
    if ! curl -s http://localhost:3000 &> /dev/null; then
        print_warning "Starting application for E2E tests..."
        npm run build
        npm run start &
        APP_PID=$!
        
        # Wait for application to be ready
        for i in {1..60}; do
            if curl -s http://localhost:3000 &> /dev/null; then
                break
            fi
            sleep 1
        done
        
        if ! curl -s http://localhost:3000 &> /dev/null; then
            print_error "Application failed to start for E2E tests"
            [ -n "$APP_PID" ] && kill $APP_PID
            test_results+=("E2E Tests: SKIPPED (app not available)")
            return
        fi
    fi
    
    if npm run test:e2e; then
        test_results+=("E2E Tests: PASSED")
        print_success "E2E tests completed successfully"
    else
        test_results+=("E2E Tests: FAILED")
        print_error "E2E tests failed"
        overall_success=false
    fi
    
    # Clean up application
    [ -n "$APP_PID" ] && kill $APP_PID
}

run_performance_tests() {
    if [ "$SKIP_PERFORMANCE" = "true" ]; then
        print_warning "Skipping performance tests (SKIP_PERFORMANCE=true)"
        test_results+=("Performance Tests: SKIPPED")
        return
    fi
    
    print_header "Running Performance Tests"
    
    cd "$ROOT_DIR"
    
    local jest_args="--testPathPattern=performance --testTimeout=60000"
    
    if npm run test $jest_args; then
        test_results+=("Performance Tests: PASSED")
        print_success "Performance tests completed successfully"
    else
        test_results+=("Performance Tests: FAILED")
        print_error "Performance tests failed"
        overall_success=false
    fi
}

run_security_tests() {
    print_header "Running Security Tests"
    
    cd "$ROOT_DIR"
    
    local jest_args="--testPathPattern=security"
    
    if npm run test:security $jest_args; then
        test_results+=("Security Tests: PASSED")
        print_success "Security tests completed successfully"
    else
        test_results+=("Security Tests: FAILED")
        print_error "Security tests failed"
        overall_success=false
    fi
}

generate_coverage_report() {
    print_header "Generating Coverage Report"
    
    cd "$ROOT_DIR"
    
    # Merge coverage reports from different test types
    if command -v nyc &> /dev/null; then
        print_warning "Merging coverage reports..."
        npx nyc merge coverage coverage/merged-coverage.json
        npx nyc report --reporter=html --reporter=lcov --reporter=text-summary --report-dir=coverage/merged
    fi
    
    # Generate badge
    if [ -f "coverage/merged/lcov.info" ]; then
        npx coverage-badge-creator --file coverage/merged/lcov.info --output coverage/badge.svg
    fi
    
    print_success "Coverage report generated in coverage/ directory"
}

check_coverage_threshold() {
    print_header "Checking Coverage Threshold"
    
    local coverage_file="$COVERAGE_DIR/merged/coverage-summary.json"
    
    if [ -f "$coverage_file" ]; then
        local coverage=$(node -e "
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('$coverage_file', 'utf8'));
            const totalCoverage = coverage.total.lines.pct;
            console.log(Math.round(totalCoverage));
        ")
        
        if [ "$coverage" -ge "$COVERAGE_THRESHOLD" ]; then
            print_success "Coverage threshold met: $coverage% >= $COVERAGE_THRESHOLD%"
        else
            print_error "Coverage threshold not met: $coverage% < $COVERAGE_THRESHOLD%"
            overall_success=false
        fi
    else
        print_warning "Coverage summary not found, skipping threshold check"
    fi
}

print_summary() {
    print_header "Test Summary"
    
    echo "Test Results:"
    for result in "${test_results[@]}"; do
        if [[ $result == *"PASSED"* ]]; then
            print_success "$result"
        elif [[ $result == *"FAILED"* ]]; then
            print_error "$result"
        elif [[ $result == *"SKIPPED"* ]]; then
            print_warning "$result"
        fi
    done
    
    echo ""
    
    if [ "$overall_success" = "true" ]; then
        print_success "🎉 All tests completed successfully!"
        exit 0
    else
        print_error "❌ Some tests failed. Please check the output above."
        exit 1
    fi
}

cleanup() {
    print_header "Cleaning Up"
    
    # Kill any remaining background processes
    jobs -p | xargs -r kill
    
    # Clean up temporary files
    rm -f /tmp/test-*.log
    
    print_success "Cleanup completed"
}

# Signal handlers
trap cleanup EXIT
trap 'print_error "Tests interrupted"; exit 130' INT TERM

# Main execution
main() {
    print_header "System Analyzer Test Suite"
    echo "Environment: $TEST_ENV"
    echo "Parallel: $PARALLEL_TESTS"
    echo "Coverage Threshold: $COVERAGE_THRESHOLD%"
    echo "Skip E2E: $SKIP_E2E"
    echo "Skip Performance: $SKIP_PERFORMANCE"
    
    check_dependencies
    setup_test_environment
    
    # Run test suites
    run_unit_tests
    run_component_tests
    run_graphql_tests
    run_mobile_tests
    run_integration_tests
    run_security_tests
    run_e2e_tests
    run_performance_tests
    
    # Generate reports
    generate_coverage_report
    check_coverage_threshold
    
    # Summary
    print_summary
}

# Run main function
main "$@"