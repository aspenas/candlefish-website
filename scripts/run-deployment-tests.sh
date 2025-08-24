#!/bin/bash

# Comprehensive deployment infrastructure test runner
# Runs all test suites with proper setup and reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
export NODE_ENV=test
export JWT_SECRET=test-jwt-secret-for-deployment-tests
export API_BASE_URL=http://localhost:3001
export TEST_TIMEOUT=300000 # 5 minutes

# Database configuration
export TEST_DB_HOST=${TEST_DB_HOST:-localhost}
export TEST_DB_PORT=${TEST_DB_PORT:-5432}
export TEST_DB_NAME=${TEST_DB_NAME:-deployment_api_test}
export TEST_DB_USER=${TEST_DB_USER:-postgres}
export TEST_DB_PASSWORD=${TEST_DB_PASSWORD:-postgres}

# Redis configuration
export TEST_REDIS_HOST=${TEST_REDIS_HOST:-localhost}
export TEST_REDIS_PORT=${TEST_REDIS_PORT:-6379}
export TEST_REDIS_DB=${TEST_REDIS_DB:-1}

# Test report directory
REPORT_DIR="./test-reports/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}🧪 Candlefish AI Deployment Infrastructure Test Suite${NC}"
echo -e "${BLUE}===================================================${NC}"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..50})${NC}"
}

# Function to run a test suite
run_test_suite() {
    local suite_name="$1"
    local test_command="$2"
    local report_file="$REPORT_DIR/${suite_name}-report.xml"

    echo -e "${YELLOW}Running $suite_name tests...${NC}"

    if eval "$test_command --reporter=mocha-junit-reporter --reporter-options mochaFile=$report_file"; then
        echo -e "${GREEN}✅ $suite_name tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $suite_name tests failed${NC}"
        return 1
    fi
}

# Function to run k6 performance tests
run_k6_tests() {
    local test_name="$1"
    local test_file="$2"
    local report_file="$REPORT_DIR/${test_name}-report.json"

    echo -e "${YELLOW}Running $test_name...${NC}"

    if k6 run --out json="$report_file" "$test_file"; then
        echo -e "${GREEN}✅ $test_name completed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_section "Checking Prerequisites"

    local missing_deps=()

    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi

    # Check npm/pnpm
    if ! command -v pnpm &> /dev/null && ! command -v npm &> /dev/null; then
        missing_deps+=("pnpm or npm")
    fi

    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        missing_deps+=("postgresql-client")
    fi

    # Check Redis
    if ! command -v redis-cli &> /dev/null; then
        missing_deps+=("redis-cli")
    fi

    # Check k6 for performance tests
    if ! command -v k6 &> /dev/null; then
        echo -e "${YELLOW}⚠️  k6 not found. Performance tests will be skipped.${NC}"
        echo "Install k6: https://k6.io/docs/getting-started/installation/"
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing dependencies:${NC}"
        printf '%s\n' "${missing_deps[@]}"
        exit 1
    fi

    echo -e "${GREEN}✅ All prerequisites satisfied${NC}"
}

# Function to setup test environment
setup_test_environment() {
    print_section "Setting Up Test Environment"

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        if command -v pnpm &> /dev/null; then
            pnpm install
        else
            npm install
        fi
    fi

    # Create test database
    echo "Setting up test database..."
    PGPASSWORD="$TEST_DB_PASSWORD" createdb -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" "$TEST_DB_NAME" 2>/dev/null || true

    # Test database connection
    if PGPASSWORD="$TEST_DB_PASSWORD" psql -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" -d "$TEST_DB_NAME" -c "SELECT 1;" &> /dev/null; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        echo "Please ensure PostgreSQL is running and accessible"
        exit 1
    fi

    # Test Redis connection
    if redis-cli -h "$TEST_REDIS_HOST" -p "$TEST_REDIS_PORT" ping &> /dev/null; then
        echo -e "${GREEN}✅ Redis connection successful${NC}"
    else
        echo -e "${RED}❌ Redis connection failed${NC}"
        echo "Please ensure Redis is running and accessible"
        exit 1
    fi
}

# Function to cleanup test environment
cleanup_test_environment() {
    print_section "Cleaning Up Test Environment"

    # Drop test database
    echo "Dropping test database..."
    PGPASSWORD="$TEST_DB_PASSWORD" dropdb -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" "$TEST_DB_NAME" 2>/dev/null || true

    # Clear test Redis database
    echo "Clearing test Redis database..."
    redis-cli -h "$TEST_REDIS_HOST" -p "$TEST_REDIS_PORT" -n "$TEST_REDIS_DB" flushdb &> /dev/null || true

    echo -e "${GREEN}✅ Test environment cleaned up${NC}"
}

# Function to generate test report
generate_test_report() {
    print_section "Generating Test Report"

    local summary_file="$REPORT_DIR/test-summary.md"

    cat > "$summary_file" << EOF
# Deployment Infrastructure Test Report

**Generated**: $(date)
**Environment**: Test
**Report Directory**: $REPORT_DIR

## Test Results Summary

| Test Suite | Status | Report File |
|------------|--------|-------------|
EOF

    for result_file in "$REPORT_DIR"/*-report.xml; do
        if [ -f "$result_file" ]; then
            local suite_name=$(basename "$result_file" -report.xml)
            local status="❌ Failed"

            # Check if test passed (basic check)
            if grep -q 'failures="0"' "$result_file" 2>/dev/null; then
                status="✅ Passed"
            fi

            echo "| $suite_name | $status | $(basename "$result_file") |" >> "$summary_file"
        fi
    done

    cat >> "$summary_file" << EOF

## Coverage Report

Run \`pnpm test:coverage\` to generate detailed coverage report.

## Performance Test Results

Check k6 JSON reports for performance metrics and thresholds.

## Next Steps

1. Review failed tests if any
2. Check detailed logs in individual report files
3. Update test configurations as needed
4. Run specific test suites for debugging: \`pnpm test:backend\`, \`pnpm test:frontend\`, etc.

EOF

    echo -e "${GREEN}✅ Test report generated: $summary_file${NC}"
}

# Main test execution
main() {
    local exit_code=0

    # Parse command line arguments
    local run_unit=true
    local run_integration=true
    local run_e2e=true
    local run_performance=true
    local run_security=true

    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit-only)
                run_integration=false
                run_e2e=false
                run_performance=false
                run_security=false
                shift
                ;;
            --no-performance)
                run_performance=false
                shift
                ;;
            --no-e2e)
                run_e2e=false
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --unit-only      Run only unit tests"
                echo "  --no-performance Skip performance tests"
                echo "  --no-e2e        Skip E2E tests"
                echo "  --help          Show this help"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    check_prerequisites
    setup_test_environment

    # Trap to ensure cleanup happens
    trap cleanup_test_environment EXIT

    print_section "Running Test Suites"

    # Unit Tests
    if [ "$run_unit" = true ]; then
        if ! run_test_suite "unit-backend" "jest --testPathPattern=__tests__/deployment-api/unit --runInBand"; then
            exit_code=1
        fi

        if ! run_test_suite "unit-frontend" "jest --testPathPattern=__tests__/deployment-ui/components --runInBand"; then
            exit_code=1
        fi
    fi

    # Integration Tests
    if [ "$run_integration" = true ]; then
        if ! run_test_suite "integration" "jest --testPathPattern=__tests__/deployment-api/integration --runInBand --testTimeout=$TEST_TIMEOUT"; then
            exit_code=1
        fi
    fi

    # Security Tests
    if [ "$run_security" = true ]; then
        if ! run_test_suite "security" "jest --testPathPattern=__tests__/security --runInBand"; then
            exit_code=1
        fi
    fi

    # Rollback Tests
    if ! run_test_suite "rollback" "jest --testPathPattern=__tests__/rollback --runInBand --testTimeout=$TEST_TIMEOUT"; then
        exit_code=1
    fi

    # WebSocket Tests
    if ! run_test_suite "websocket" "jest --testPathPattern=__tests__/websocket --runInBand --testTimeout=$TEST_TIMEOUT"; then
        exit_code=1
    fi

    # E2E Tests with Cypress
    if [ "$run_e2e" = true ]; then
        print_section "End-to-End Tests"

        echo -e "${YELLOW}Starting deployment API server for E2E tests...${NC}"
        # Start the API server in background for E2E tests
        npm run dev:api &
        API_PID=$!
        sleep 10 # Wait for server to start

        if cypress run --spec "__tests__/e2e/**/*.cy.ts" --reporter mocha-junit-reporter --reporter-options "mochaFile=$REPORT_DIR/e2e-report.xml"; then
            echo -e "${GREEN}✅ E2E tests passed${NC}"
        else
            echo -e "${RED}❌ E2E tests failed${NC}"
            exit_code=1
        fi

        # Stop API server
        kill $API_PID 2>/dev/null || true
        wait $API_PID 2>/dev/null || true
    fi

    # Performance Tests with k6
    if [ "$run_performance" = true ] && command -v k6 &> /dev/null; then
        print_section "Performance Tests"

        # Ensure API server is running
        if ! curl -f "$API_BASE_URL/health" &> /dev/null; then
            echo "Starting API server for performance tests..."
            npm run dev:api &
            API_PID=$!
            sleep 10
        fi

        # Generate auth token for k6 tests
        export AUTH_TOKEN=$(node -e "
            const jwt = require('jsonwebtoken');
            const token = jwt.sign({
                sub: 'k6-test-user',
                role: 'admin',
                permissions: ['deployments:create', 'deployments:read', 'deployments:rollback']
            }, '$JWT_SECRET', { expiresIn: '1h' });
            console.log(token);
        ")

        if ! run_k6_tests "load-test" "__tests__/performance/k6/deployment-api-load-test.js"; then
            exit_code=1
        fi

        if ! run_k6_tests "stress-test" "__tests__/performance/k6/deployment-api-stress-test.js"; then
            exit_code=1
        fi

        # Stop API server if we started it
        if [ -n "$API_PID" ]; then
            kill $API_PID 2>/dev/null || true
            wait $API_PID 2>/dev/null || true
        fi
    fi

    generate_test_report

    print_section "Test Execution Complete"

    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
        echo -e "${GREEN}📊 Test reports available in: $REPORT_DIR${NC}"
    else
        echo -e "${RED}❌ Some tests failed. Check the reports for details.${NC}"
        echo -e "${YELLOW}📊 Test reports available in: $REPORT_DIR${NC}"
    fi

    return $exit_code
}

# Run main function with all arguments
main "$@"
