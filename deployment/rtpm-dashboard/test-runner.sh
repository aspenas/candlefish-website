#!/bin/bash

# RTPM Dashboard Test Runner
# Comprehensive test execution with coverage reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="/Users/patricksmith/candlefish-ai/apps/rtpm-api"
FRONTEND_DIR="/Users/patricksmith/candlefish-ai/deployment/rtpm-dashboard"
E2E_DIR="${FRONTEND_DIR}/e2e"
COVERAGE_DIR="${FRONTEND_DIR}/coverage"
REPORTS_DIR="${FRONTEND_DIR}/test-reports"

# Test suites
RUN_UNIT_TESTS=true
RUN_INTEGRATION_TESTS=true
RUN_E2E_TESTS=false
RUN_PERFORMANCE_TESTS=false
COVERAGE_THRESHOLD=80

print_header() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo
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

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --unit)
            RUN_UNIT_TESTS=true
            shift
            ;;
        --integration)
            RUN_INTEGRATION_TESTS=true
            shift
            ;;
        --e2e)
            RUN_E2E_TESTS=true
            shift
            ;;
        --performance)
            RUN_PERFORMANCE_TESTS=true
            shift
            ;;
        --all)
            RUN_UNIT_TESTS=true
            RUN_INTEGRATION_TESTS=true
            RUN_E2E_TESTS=true
            RUN_PERFORMANCE_TESTS=false # Still optional
            shift
            ;;
        --coverage-threshold)
            COVERAGE_THRESHOLD="$2"
            shift
            shift
            ;;
        --help)
            echo "RTPM Dashboard Test Runner"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --unit                 Run unit tests (backend & frontend)"
            echo "  --integration         Run integration tests"
            echo "  --e2e                 Run E2E tests with Playwright"
            echo "  --performance         Run performance tests with Locust"
            echo "  --all                 Run all test suites (except performance)"
            echo "  --coverage-threshold  Set coverage threshold (default: 80)"
            echo "  --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --unit --integration"
            echo "  $0 --all --coverage-threshold 85"
            echo "  $0 --e2e"
            exit 0
            ;;
        *)
            print_error "Unknown option $1"
            exit 1
            ;;
    esac
done

# Create directories
mkdir -p "$COVERAGE_DIR"
mkdir -p "$REPORTS_DIR"

# Test results tracking
BACKEND_UNIT_PASSED=false
FRONTEND_UNIT_PASSED=false
INTEGRATION_PASSED=false
E2E_PASSED=false
PERFORMANCE_PASSED=false

print_header "RTPM Dashboard Test Suite"
print_info "Backend Directory: $BACKEND_DIR"
print_info "Frontend Directory: $FRONTEND_DIR"
print_info "Coverage Threshold: ${COVERAGE_THRESHOLD}%"
print_info "Reports Directory: $REPORTS_DIR"
echo

# Function to check if service is running
check_service() {
    local port=$1
    local service=$2
    
    if nc -z localhost $port 2>/dev/null; then
        print_success "$service is running on port $port"
        return 0
    else
        print_warning "$service is not running on port $port"
        return 1
    fi
}

# Function to start test database
start_test_db() {
    print_info "Starting test database..."
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        print_warning "Docker not found, assuming database is available"
        return 0
    fi
    
    # Start TimescaleDB for tests
    docker run --name rtpm-test-db -d \
        -p 5433:5432 \
        -e POSTGRES_DB=rtpm_test \
        -e POSTGRES_USER=test_user \
        -e POSTGRES_PASSWORD=test_pass \
        timescale/timescaledb:latest-pg14 \
        > /dev/null 2>&1 || true
    
    # Wait for database to be ready
    sleep 5
    print_success "Test database started"
}

# Function to stop test database
stop_test_db() {
    print_info "Cleaning up test database..."
    docker stop rtpm-test-db > /dev/null 2>&1 || true
    docker rm rtpm-test-db > /dev/null 2>&1 || true
}

# Backend Unit Tests
run_backend_unit_tests() {
    if [ "$RUN_UNIT_TESTS" = false ]; then
        return 0
    fi
    
    print_header "Backend Unit Tests"
    
    cd "$BACKEND_DIR"
    
    # Check if pytest is available
    if ! command -v pytest &> /dev/null; then
        print_error "pytest not found. Install with: pip install pytest pytest-cov pytest-asyncio"
        return 1
    fi
    
    # Run tests with coverage
    print_info "Running backend unit tests..."
    
    if pytest tests/ \
        --cov=app \
        --cov-report=html:$COVERAGE_DIR/backend-html \
        --cov-report=xml:$COVERAGE_DIR/backend-coverage.xml \
        --cov-report=term-missing \
        --cov-fail-under=$COVERAGE_THRESHOLD \
        --junit-xml=$REPORTS_DIR/backend-junit.xml \
        --tb=short \
        -v; then
        
        print_success "Backend unit tests passed"
        BACKEND_UNIT_PASSED=true
        
        # Extract coverage percentage
        local coverage=$(grep -oP 'TOTAL.*?(\d+)%' $COVERAGE_DIR/backend-coverage.xml | grep -oP '\d+%' | tail -1)
        print_info "Backend coverage: $coverage"
        
    else
        print_error "Backend unit tests failed"
        BACKEND_UNIT_PASSED=false
    fi
}

# Frontend Unit Tests
run_frontend_unit_tests() {
    if [ "$RUN_UNIT_TESTS" = false ]; then
        return 0
    fi
    
    print_header "Frontend Unit Tests"
    
    cd "$FRONTEND_DIR"
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        print_error "npm not found"
        return 1
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing frontend dependencies..."
        npm install
    fi
    
    print_info "Running frontend unit tests..."
    
    if npm test -- --coverage \
        --coverageDirectory="$COVERAGE_DIR/frontend" \
        --coverageReporters=html,lcov,text,cobertura \
        --coverageThreshold="{\"global\":{\"branches\":$COVERAGE_THRESHOLD,\"functions\":$COVERAGE_THRESHOLD,\"lines\":$COVERAGE_THRESHOLD,\"statements\":$COVERAGE_THRESHOLD}}" \
        --watchAll=false \
        --ci; then
        
        print_success "Frontend unit tests passed"
        FRONTEND_UNIT_PASSED=true
        
        # Extract coverage from lcov report
        if [ -f "$COVERAGE_DIR/frontend/lcov-report/index.html" ]; then
            local coverage=$(grep -oP 'Functions</span>.*?(\d+\.\d+)%' "$COVERAGE_DIR/frontend/lcov-report/index.html" | grep -oP '\d+\.\d+%' | head -1)
            print_info "Frontend coverage: $coverage"
        fi
        
    else
        print_error "Frontend unit tests failed"
        FRONTEND_UNIT_PASSED=false
    fi
}

# Integration Tests
run_integration_tests() {
    if [ "$RUN_INTEGRATION_TESTS" = false ]; then
        return 0
    fi
    
    print_header "Integration Tests"
    
    cd "$BACKEND_DIR"
    
    print_info "Running integration tests..."
    
    if pytest tests/test_integration.py \
        --junit-xml=$REPORTS_DIR/integration-junit.xml \
        --tb=short \
        -v; then
        
        print_success "Integration tests passed"
        INTEGRATION_PASSED=true
    else
        print_error "Integration tests failed"
        INTEGRATION_PASSED=false
    fi
}

# E2E Tests
run_e2e_tests() {
    if [ "$RUN_E2E_TESTS" = false ]; then
        return 0
    fi
    
    print_header "End-to-End Tests"
    
    cd "$E2E_DIR"
    
    # Check if Playwright is installed
    if ! command -v npx &> /dev/null || ! npx playwright --version &> /dev/null; then
        print_info "Installing Playwright..."
        npm install @playwright/test
        npx playwright install
    fi
    
    # Check if services are running
    if ! check_service 3000 "Frontend"; then
        print_warning "Starting frontend development server..."
        cd "$FRONTEND_DIR"
        npm run dev &
        FRONTEND_PID=$!
        sleep 10
        cd "$E2E_DIR"
    fi
    
    if ! check_service 8000 "Backend API"; then
        print_error "Backend API is not running. Please start it before running E2E tests."
        return 1
    fi
    
    print_info "Running E2E tests..."
    
    if npx playwright test \
        --reporter=html,junit \
        --output-dir=$REPORTS_DIR/e2e; then
        
        print_success "E2E tests passed"
        E2E_PASSED=true
    else
        print_error "E2E tests failed"
        E2E_PASSED=false
        
        # Show test report location
        print_info "E2E test report available at: $REPORTS_DIR/e2e/playwright-report/index.html"
    fi
    
    # Clean up frontend process if we started it
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
}

# Performance Tests
run_performance_tests() {
    if [ "$RUN_PERFORMANCE_TESTS" = false ]; then
        return 0
    fi
    
    print_header "Performance Tests"
    
    cd "$BACKEND_DIR"
    
    # Check if Locust is available
    if ! command -v locust &> /dev/null; then
        print_error "Locust not found. Install with: pip install locust"
        return 1
    fi
    
    if ! check_service 8000 "Backend API"; then
        print_error "Backend API is not running. Please start it before running performance tests."
        return 1
    fi
    
    print_info "Running performance tests (30 second duration)..."
    print_warning "Performance tests require manual review of results"
    
    # Run Locust in headless mode
    if locust -f tests/performance/locustfile.py \
        --host=http://localhost:8000 \
        --users 50 \
        --spawn-rate 5 \
        --run-time 30s \
        --html $REPORTS_DIR/locust_report.html \
        --csv $REPORTS_DIR/locust \
        --headless; then
        
        print_success "Performance tests completed"
        print_info "Performance report: $REPORTS_DIR/locust_report.html"
        PERFORMANCE_PASSED=true
    else
        print_error "Performance tests failed"
        PERFORMANCE_PASSED=false
    fi
}

# Generate combined coverage report
generate_coverage_report() {
    print_header "Coverage Report Generation"
    
    cd "$FRONTEND_DIR"
    
    # Create combined coverage directory
    mkdir -p "$COVERAGE_DIR/combined"
    
    # Copy backend coverage
    if [ -d "$COVERAGE_DIR/backend-html" ]; then
        cp -r "$COVERAGE_DIR/backend-html" "$COVERAGE_DIR/combined/"
        print_info "Backend coverage report: $COVERAGE_DIR/combined/backend-html/index.html"
    fi
    
    # Copy frontend coverage
    if [ -d "$COVERAGE_DIR/frontend/lcov-report" ]; then
        cp -r "$COVERAGE_DIR/frontend/lcov-report" "$COVERAGE_DIR/combined/frontend-html"
        print_info "Frontend coverage report: $COVERAGE_DIR/combined/frontend-html/index.html"
    fi
    
    # Generate summary report
    cat > "$COVERAGE_DIR/combined/index.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>RTPM Dashboard - Test Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { color: #333; border-bottom: 2px solid #007cba; padding-bottom: 10px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background-color: #d4edda; border-color: #c3e6cb; }
        .warning { background-color: #fff3cd; border-color: #ffeaa7; }
        .error { background-color: #f8d7da; border-color: #f5c6cb; }
        a { color: #007cba; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat-box { padding: 15px; border-radius: 5px; text-align: center; min-width: 150px; }
        .stat-title { font-size: 12px; color: #666; text-transform: uppercase; }
        .stat-value { font-size: 24px; font-weight: bold; margin-top: 5px; }
    </style>
</head>
<body>
    <h1 class="header">RTPM Dashboard - Test Coverage Report</h1>
    <p>Generated on $(date)</p>
    
    <div class="stats">
        <div class="stat-box success">
            <div class="stat-title">Backend Unit Tests</div>
            <div class="stat-value">$([ "$BACKEND_UNIT_PASSED" = true ] && echo "✅ PASS" || echo "❌ FAIL")</div>
        </div>
        <div class="stat-box success">
            <div class="stat-title">Frontend Unit Tests</div>
            <div class="stat-value">$([ "$FRONTEND_UNIT_PASSED" = true ] && echo "✅ PASS" || echo "❌ FAIL")</div>
        </div>
        <div class="stat-box success">
            <div class="stat-title">Integration Tests</div>
            <div class="stat-value">$([ "$INTEGRATION_PASSED" = true ] && echo "✅ PASS" || echo "❌ FAIL")</div>
        </div>
        <div class="stat-box $([ "$E2E_PASSED" = true ] && echo "success" || echo "warning")">
            <div class="stat-title">E2E Tests</div>
            <div class="stat-value">$([ "$RUN_E2E_TESTS" = true ] && ([ "$E2E_PASSED" = true ] && echo "✅ PASS" || echo "❌ FAIL") || echo "⏭️ SKIP")</div>
        </div>
    </div>
    
    <div class="section">
        <h2>Coverage Reports</h2>
        <ul>
            <li><a href="backend-html/index.html">Backend Coverage Report</a> (Python/FastAPI)</li>
            <li><a href="frontend-html/index.html">Frontend Coverage Report</a> (React/TypeScript)</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>Test Reports</h2>
        <ul>
            <li>Backend JUnit: <code>test-reports/backend-junit.xml</code></li>
            <li>Frontend Coverage: <code>coverage/frontend/cobertura-coverage.xml</code></li>
            <li>Integration JUnit: <code>test-reports/integration-junit.xml</code></li>
            $([ "$RUN_E2E_TESTS" = true ] && echo "<li>E2E Report: <code>test-reports/e2e/playwright-report/index.html</code></li>")
            $([ "$RUN_PERFORMANCE_TESTS" = true ] && echo "<li>Performance Report: <code>test-reports/locust_report.html</code></li>")
        </ul>
    </div>
    
    <div class="section">
        <h2>Next Steps</h2>
        <ul>
            <li>Review coverage reports to identify untested code paths</li>
            <li>Add tests for areas below $(echo $COVERAGE_THRESHOLD)% coverage</li>
            <li>Review failed tests and fix issues</li>
            <li>Consider running E2E tests for full system validation</li>
            $([ "$RUN_PERFORMANCE_TESTS" = true ] && echo "<li>Review performance metrics and optimize bottlenecks</li>")
        </ul>
    </div>
    
    <footer style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
        Generated by RTPM Dashboard Test Runner
    </footer>
</body>
</html>
EOF

    print_success "Combined coverage report generated: $COVERAGE_DIR/combined/index.html"
}

# Main execution
main() {
    # Trap to ensure cleanup
    trap 'stop_test_db' EXIT
    
    # Start test database if needed
    if [ "$RUN_UNIT_TESTS" = true ] || [ "$RUN_INTEGRATION_TESTS" = true ]; then
        start_test_db
    fi
    
    # Run test suites
    run_backend_unit_tests
    run_frontend_unit_tests
    run_integration_tests
    run_e2e_tests
    run_performance_tests
    
    # Generate reports
    generate_coverage_report
    
    # Summary
    print_header "Test Results Summary"
    
    echo "Backend Unit Tests:    $([ "$BACKEND_UNIT_PASSED" = true ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
    echo "Frontend Unit Tests:   $([ "$FRONTEND_UNIT_PASSED" = true ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
    echo "Integration Tests:     $([ "$INTEGRATION_PASSED" = true ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
    echo "E2E Tests:             $([ "$RUN_E2E_TESTS" = true ] && ([ "$E2E_PASSED" = true ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}") || echo -e "${YELLOW}SKIPPED${NC}")"
    echo "Performance Tests:     $([ "$RUN_PERFORMANCE_TESTS" = true ] && ([ "$PERFORMANCE_PASSED" = true ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}") || echo -e "${YELLOW}SKIPPED${NC}")"
    
    echo
    print_info "Coverage report: $COVERAGE_DIR/combined/index.html"
    print_info "Test reports: $REPORTS_DIR/"
    
    # Exit with appropriate code
    local all_passed=true
    
    if [ "$RUN_UNIT_TESTS" = true ]; then
        [ "$BACKEND_UNIT_PASSED" = false ] && all_passed=false
        [ "$FRONTEND_UNIT_PASSED" = false ] && all_passed=false
    fi
    
    [ "$RUN_INTEGRATION_TESTS" = true ] && [ "$INTEGRATION_PASSED" = false ] && all_passed=false
    [ "$RUN_E2E_TESTS" = true ] && [ "$E2E_PASSED" = false ] && all_passed=false
    [ "$RUN_PERFORMANCE_TESTS" = true ] && [ "$PERFORMANCE_PASSED" = false ] && all_passed=false
    
    if [ "$all_passed" = true ]; then
        print_success "All enabled test suites passed!"
        exit 0
    else
        print_error "Some test suites failed!"
        exit 1
    fi
}

# Run main function
main "$@"