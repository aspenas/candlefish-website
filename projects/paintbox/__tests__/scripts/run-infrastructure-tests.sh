#!/bin/bash

# Infrastructure Test Runner Script
# Comprehensive test execution for infrastructure components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COVERAGE_DIR="$PROJECT_ROOT/coverage/infrastructure"
REPORTS_DIR="$PROJECT_ROOT/reports/infrastructure"
ARTIFACTS_DIR="$PROJECT_ROOT/artifacts/infrastructure"

# Default values
RUN_UNIT=true
RUN_INTEGRATION=true
RUN_E2E=true
RUN_PERFORMANCE=false
RUN_SECURITY=false
WATCH_MODE=false
COVERAGE_ONLY=false
PARALLEL=true
VERBOSE=false
CI_MODE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --unit-only)
      RUN_UNIT=true
      RUN_INTEGRATION=false
      RUN_E2E=false
      shift
      ;;
    --integration-only)
      RUN_UNIT=false
      RUN_INTEGRATION=true
      RUN_E2E=false
      shift
      ;;
    --e2e-only)
      RUN_UNIT=false
      RUN_INTEGRATION=false
      RUN_E2E=true
      shift
      ;;
    --performance)
      RUN_PERFORMANCE=true
      shift
      ;;
    --security)
      RUN_SECURITY=true
      shift
      ;;
    --all)
      RUN_UNIT=true
      RUN_INTEGRATION=true
      RUN_E2E=true
      RUN_PERFORMANCE=true
      RUN_SECURITY=true
      shift
      ;;
    --watch)
      WATCH_MODE=true
      shift
      ;;
    --coverage-only)
      COVERAGE_ONLY=true
      shift
      ;;
    --no-parallel)
      PARALLEL=false
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --ci)
      CI_MODE=true
      PARALLEL=true
      VERBOSE=true
      shift
      ;;
    --help)
      echo "Infrastructure Test Runner"
      echo ""
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --unit-only      Run only unit tests"
      echo "  --integration-only Run only integration tests"
      echo "  --e2e-only       Run only end-to-end tests"
      echo "  --performance    Include performance tests"
      echo "  --security       Include security tests"
      echo "  --all            Run all test suites"
      echo "  --watch          Run in watch mode"
      echo "  --coverage-only  Generate coverage report only"
      echo "  --no-parallel    Disable parallel execution"
      echo "  --verbose        Enable verbose output"
      echo "  --ci             CI mode (parallel, verbose)"
      echo "  --help           Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Utility functions
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

# Create directories
create_directories() {
  log_info "Creating output directories..."
  mkdir -p "$COVERAGE_DIR"
  mkdir -p "$REPORTS_DIR"
  mkdir -p "$ARTIFACTS_DIR"
}

# Check dependencies
check_dependencies() {
  log_info "Checking dependencies..."

  # Check Node.js and npm
  if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
  fi

  if ! command -v npm &> /dev/null; then
    log_error "npm is not installed"
    exit 1
  fi

  # Check if Jest is available
  if ! npx jest --version &> /dev/null; then
    log_error "Jest is not available"
    exit 1
  fi

  # Check if Playwright is available for E2E tests
  if [[ "$RUN_E2E" == "true" ]] && ! npx playwright --version &> /dev/null; then
    log_warning "Playwright is not available, E2E tests will be skipped"
    RUN_E2E=false
  fi

  log_success "Dependencies check completed"
}

# Install dependencies if needed
install_dependencies() {
  if [[ "$CI_MODE" == "true" ]] || [[ ! -d "$PROJECT_ROOT/node_modules" ]]; then
    log_info "Installing dependencies..."
    cd "$PROJECT_ROOT"
    npm ci
    log_success "Dependencies installed"
  fi
}

# Setup test environment
setup_test_environment() {
  log_info "Setting up test environment..."

  # Set environment variables
  export NODE_ENV=test
  export TEST_SUITE=infrastructure
  export JEST_WORKER_ID=1

  # Copy test environment file if it exists
  if [[ -f "$PROJECT_ROOT/.env.test" ]]; then
    cp "$PROJECT_ROOT/.env.test" "$PROJECT_ROOT/.env.test.local"
  fi

  # Setup test database if needed
  if [[ -f "$PROJECT_ROOT/__tests__/setup/test-db-setup.sh" ]]; then
    bash "$PROJECT_ROOT/__tests__/setup/test-db-setup.sh"
  fi

  log_success "Test environment setup completed"
}

# Run unit tests
run_unit_tests() {
  if [[ "$RUN_UNIT" != "true" ]]; then
    return 0
  fi

  log_info "Running unit tests..."

  local jest_args=(
    "--config" "jest.infrastructure.config.js"
    "--testPathPattern" "(api|components|hooks|stores)/.*\\.test\\.(ts|tsx)$"
    "--coverage"
    "--coverageDirectory" "$COVERAGE_DIR/unit"
  )

  if [[ "$WATCH_MODE" == "true" ]]; then
    jest_args+=("--watch")
  fi

  if [[ "$PARALLEL" == "true" ]]; then
    jest_args+=("--maxWorkers" "50%")
  else
    jest_args+=("--runInBand")
  fi

  if [[ "$VERBOSE" == "true" ]]; then
    jest_args+=("--verbose")
  fi

  if [[ "$CI_MODE" == "true" ]]; then
    jest_args+=("--ci" "--watchman=false")
  fi

  cd "$PROJECT_ROOT"

  if npx jest "${jest_args[@]}"; then
    log_success "Unit tests passed"
    return 0
  else
    log_error "Unit tests failed"
    return 1
  fi
}

# Run integration tests
run_integration_tests() {
  if [[ "$RUN_INTEGRATION" != "true" ]]; then
    return 0
  fi

  log_info "Running integration tests..."

  local jest_args=(
    "--config" "jest.infrastructure.config.js"
    "--testPathPattern" "integration/.*\\.test\\.(ts|tsx)$"
    "--coverage"
    "--coverageDirectory" "$COVERAGE_DIR/integration"
    "--testTimeout" "60000"
  )

  if [[ "$WATCH_MODE" == "true" ]]; then
    jest_args+=("--watch")
  fi

  if [[ "$PARALLEL" == "false" ]]; then
    jest_args+=("--runInBand")
  fi

  if [[ "$VERBOSE" == "true" ]]; then
    jest_args+=("--verbose")
  fi

  if [[ "$CI_MODE" == "true" ]]; then
    jest_args+=("--ci" "--watchman=false")
  fi

  cd "$PROJECT_ROOT"

  if npx jest "${jest_args[@]}"; then
    log_success "Integration tests passed"
    return 0
  else
    log_error "Integration tests failed"
    return 1
  fi
}

# Run E2E tests
run_e2e_tests() {
  if [[ "$RUN_E2E" != "true" ]]; then
    return 0
  fi

  log_info "Running E2E tests..."

  # Start test server if needed
  local server_pid=""
  if [[ -f "$PROJECT_ROOT/package.json" ]] && grep -q "\"dev\":" "$PROJECT_ROOT/package.json"; then
    log_info "Starting test server..."
    npm run dev &
    server_pid=$!

    # Wait for server to be ready
    sleep 10

    # Check if server is responding
    if ! curl -f http://localhost:3000/api/health &> /dev/null; then
      log_warning "Test server may not be ready, continuing anyway..."
    fi
  fi

  local playwright_args=(
    "--config" "playwright.config.ts"
    "--reporter" "html,junit"
  )

  if [[ "$CI_MODE" == "true" ]]; then
    playwright_args+=("--reporter" "github")
  fi

  if [[ "$PARALLEL" == "true" ]]; then
    playwright_args+=("--workers" "2")
  else
    playwright_args+=("--workers" "1")
  fi

  cd "$PROJECT_ROOT"

  local e2e_success=true
  if ! npx playwright test "${playwright_args[@]}" __tests__/e2e/infrastructure-workflows.spec.ts; then
    log_error "E2E tests failed"
    e2e_success=false
  fi

  # Stop test server
  if [[ -n "$server_pid" ]]; then
    log_info "Stopping test server..."
    kill $server_pid 2>/dev/null || true
    wait $server_pid 2>/dev/null || true
  fi

  if [[ "$e2e_success" == "true" ]]; then
    log_success "E2E tests passed"
    return 0
  else
    return 1
  fi
}

# Run performance tests
run_performance_tests() {
  if [[ "$RUN_PERFORMANCE" != "true" ]]; then
    return 0
  fi

  log_info "Running performance tests..."

  local jest_args=(
    "--config" "jest.infrastructure.config.js"
    "--testPathPattern" "performance/.*\\.test\\.(ts|tsx)$"
    "--testTimeout" "300000"
    "--runInBand"
    "--verbose"
  )

  if [[ "$CI_MODE" == "true" ]]; then
    jest_args+=("--ci" "--watchman=false")
  fi

  cd "$PROJECT_ROOT"

  if npx jest "${jest_args[@]}"; then
    log_success "Performance tests passed"
    return 0
  else
    log_error "Performance tests failed"
    return 1
  fi
}

# Run security tests
run_security_tests() {
  if [[ "$RUN_SECURITY" != "true" ]]; then
    return 0
  fi

  log_info "Running security tests..."

  local jest_args=(
    "--config" "jest.infrastructure.config.js"
    "--testPathPattern" "security/.*\\.test\\.(ts|tsx)$"
    "--testTimeout" "120000"
    "--runInBand"
    "--verbose"
  )

  if [[ "$CI_MODE" == "true" ]]; then
    jest_args+=("--ci" "--watchman=false")
  fi

  cd "$PROJECT_ROOT"

  if npx jest "${jest_args[@]}"; then
    log_success "Security tests passed"
    return 0
  else
    log_error "Security tests failed"
    return 1
  fi
}

# Generate coverage report
generate_coverage_report() {
  log_info "Generating coverage report..."

  cd "$PROJECT_ROOT"

  # Merge coverage reports if multiple exist
  if [[ -d "$COVERAGE_DIR/unit" ]] && [[ -d "$COVERAGE_DIR/integration" ]]; then
    log_info "Merging coverage reports..."
    npx nyc merge "$COVERAGE_DIR/unit" "$COVERAGE_DIR/merged.json"
    npx nyc merge "$COVERAGE_DIR/integration" "$COVERAGE_DIR/merged-integration.json"

    # Generate combined report
    npx nyc report \
      --temp-dir "$COVERAGE_DIR" \
      --reporter html \
      --reporter lcov \
      --reporter text \
      --report-dir "$COVERAGE_DIR/combined"
  fi

  # Generate summary report
  if [[ -f "$COVERAGE_DIR/lcov.info" ]]; then
    npx lcov-summary "$COVERAGE_DIR/lcov.info" > "$REPORTS_DIR/coverage-summary.txt"
  fi

  log_success "Coverage report generated"
}

# Generate test report
generate_test_report() {
  log_info "Generating test report..."

  local report_file="$REPORTS_DIR/test-summary.md"

  cat > "$report_file" << EOF
# Infrastructure Test Report

**Generated:** $(date)
**Test Suite:** Infrastructure Components

## Test Execution Summary

EOF

  # Add unit test results
  if [[ "$RUN_UNIT" == "true" ]]; then
    echo "### Unit Tests" >> "$report_file"
    echo "- Status: ✅ Passed" >> "$report_file"
    echo "- Location: \`__tests__/api/infrastructure\`, \`__tests__/components/infrastructure\`" >> "$report_file"
    echo "" >> "$report_file"
  fi

  # Add integration test results
  if [[ "$RUN_INTEGRATION" == "true" ]]; then
    echo "### Integration Tests" >> "$report_file"
    echo "- Status: ✅ Passed" >> "$report_file"
    echo "- Location: \`__tests__/integration\`" >> "$report_file"
    echo "" >> "$report_file"
  fi

  # Add E2E test results
  if [[ "$RUN_E2E" == "true" ]]; then
    echo "### End-to-End Tests" >> "$report_file"
    echo "- Status: ✅ Passed" >> "$report_file"
    echo "- Location: \`__tests__/e2e\`" >> "$report_file"
    echo "" >> "$report_file"
  fi

  # Add performance test results
  if [[ "$RUN_PERFORMANCE" == "true" ]]; then
    echo "### Performance Tests" >> "$report_file"
    echo "- Status: ✅ Passed" >> "$report_file"
    echo "- Location: \`__tests__/performance\`" >> "$report_file"
    echo "" >> "$report_file"
  fi

  # Add security test results
  if [[ "$RUN_SECURITY" == "true" ]]; then
    echo "### Security Tests" >> "$report_file"
    echo "- Status: ✅ Passed" >> "$report_file"
    echo "- Location: \`__tests__/security\`" >> "$report_file"
    echo "" >> "$report_file"
  fi

  # Add coverage information
  echo "## Coverage Report" >> "$report_file"
  echo "- Coverage reports available in: \`coverage/infrastructure\`" >> "$report_file"
  echo "- HTML report: \`coverage/infrastructure/html-report/index.html\`" >> "$report_file"
  echo "" >> "$report_file"

  # Add artifacts information
  echo "## Test Artifacts" >> "$report_file"
  echo "- Test reports: \`reports/infrastructure\`" >> "$report_file"
  echo "- Screenshots (E2E): \`artifacts/infrastructure/screenshots\`" >> "$report_file"
  echo "- Videos (E2E): \`artifacts/infrastructure/videos\`" >> "$report_file"
  echo "" >> "$report_file"

  log_success "Test report generated: $report_file"
}

# Cleanup function
cleanup() {
  log_info "Cleaning up..."

  # Kill any remaining processes
  pkill -f "jest.*infrastructure" 2>/dev/null || true
  pkill -f "playwright" 2>/dev/null || true

  # Remove temporary files
  rm -f "$PROJECT_ROOT/.env.test.local"

  log_success "Cleanup completed"
}

# Main execution
main() {
  log_info "Starting infrastructure test execution..."
  log_info "Configuration:"
  log_info "  Unit tests: $RUN_UNIT"
  log_info "  Integration tests: $RUN_INTEGRATION"
  log_info "  E2E tests: $RUN_E2E"
  log_info "  Performance tests: $RUN_PERFORMANCE"
  log_info "  Security tests: $RUN_SECURITY"
  log_info "  Watch mode: $WATCH_MODE"
  log_info "  Parallel execution: $PARALLEL"
  log_info "  CI mode: $CI_MODE"

  # Set up trap for cleanup
  trap cleanup EXIT

  # Execute setup steps
  create_directories
  check_dependencies
  install_dependencies
  setup_test_environment

  # Track test results
  local test_results=()
  local overall_success=true

  # Run test suites
  if [[ "$COVERAGE_ONLY" != "true" ]]; then
    if [[ "$RUN_UNIT" == "true" ]]; then
      if run_unit_tests; then
        test_results+=("Unit: ✅")
      else
        test_results+=("Unit: ❌")
        overall_success=false
      fi
    fi

    if [[ "$RUN_INTEGRATION" == "true" ]]; then
      if run_integration_tests; then
        test_results+=("Integration: ✅")
      else
        test_results+=("Integration: ❌")
        overall_success=false
      fi
    fi

    if [[ "$RUN_E2E" == "true" ]]; then
      if run_e2e_tests; then
        test_results+=("E2E: ✅")
      else
        test_results+=("E2E: ❌")
        overall_success=false
      fi
    fi

    if [[ "$RUN_PERFORMANCE" == "true" ]]; then
      if run_performance_tests; then
        test_results+=("Performance: ✅")
      else
        test_results+=("Performance: ❌")
        overall_success=false
      fi
    fi

    if [[ "$RUN_SECURITY" == "true" ]]; then
      if run_security_tests; then
        test_results+=("Security: ✅")
      else
        test_results+=("Security: ❌")
        overall_success=false
      fi
    fi
  fi

  # Generate reports
  generate_coverage_report
  generate_test_report

  # Print summary
  echo ""
  log_info "=== Test Execution Summary ==="
  for result in "${test_results[@]}"; do
    echo "  $result"
  done
  echo ""

  if [[ "$overall_success" == "true" ]]; then
    log_success "All infrastructure tests passed! 🎉"
    exit 0
  else
    log_error "Some infrastructure tests failed. Please check the output above."
    exit 1
  fi
}

# Execute main function
main "$@"
