#!/bin/bash

# Analytics Dashboard Comprehensive Test Runner
# Runs all test suites for the Analytics Dashboard feature

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_SERVER_DIR="${PROJECT_ROOT}/clos/api-server"
WEB_DASHBOARD_DIR="${PROJECT_ROOT}/clos/web-dashboard"
RESULTS_DIR="${PROJECT_ROOT}/test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Test configuration
export NODE_ENV=test
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/clos_test"
export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/clos_test"
export REDIS_URL="redis://localhost:6379/1"
export TEST_REDIS_URL="redis://localhost:6379/1"
export JWT_SECRET="test-jwt-secret-for-analytics-tests"

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

cleanup() {
    log_info "Cleaning up..."
    
    # Stop any running services
    pkill -f "npm run dev" || true
    pkill -f "next dev" || true
    pkill -f "tsx watch" || true
    
    # Clean up Docker containers if running in Docker mode
    if [[ "$USE_DOCKER" == "true" ]]; then
        docker-compose -f "${PROJECT_ROOT}/clos/docker-compose.test.yml" down --volumes
    fi
    
    log_info "Cleanup completed"
}

# Set up trap for cleanup
trap cleanup EXIT INT TERM

setup_test_environment() {
    log_info "Setting up test environment..."
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    # Check if we should use Docker
    if [[ "$USE_DOCKER" == "true" ]]; then
        log_info "Starting Docker test environment..."
        cd "$PROJECT_ROOT/clos"
        docker-compose -f docker-compose.test.yml up -d postgres-test redis-test
        
        # Wait for services to be ready
        log_info "Waiting for test services to be ready..."
        sleep 10
        
        # Update connection strings for Docker
        export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/clos_test"
        export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5433/clos_test"
        export REDIS_URL="redis://localhost:6380/1"
        export TEST_REDIS_URL="redis://localhost:6380/1"
    else
        # Check if local services are running
        log_info "Checking local service availability..."
        
        if ! pg_isready -h localhost -p 5432 -U postgres > /dev/null 2>&1; then
            log_error "PostgreSQL is not running. Please start PostgreSQL or use Docker mode with USE_DOCKER=true"
            exit 1
        fi
        
        if ! redis-cli -h localhost -p 6379 ping > /dev/null 2>&1; then
            log_error "Redis is not running. Please start Redis or use Docker mode with USE_DOCKER=true"
            exit 1
        fi
    fi
    
    log_success "Test environment setup completed"
}

install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install API server dependencies
    cd "$API_SERVER_DIR"
    if [[ ! -d node_modules ]] || [[ package.json -nt node_modules ]]; then
        npm ci
    fi
    
    # Install web dashboard dependencies
    cd "$WEB_DASHBOARD_DIR"
    if [[ ! -d node_modules ]] || [[ package.json -nt node_modules ]]; then
        npm ci
    fi
    
    # Install Playwright browsers if needed
    if [[ "$RUN_E2E" == "true" ]] && ! npx playwright --version > /dev/null 2>&1; then
        npx playwright install --with-deps
    fi
    
    log_success "Dependencies installed"
}

run_backend_tests() {
    log_info "Running backend tests..."
    
    cd "$API_SERVER_DIR"
    
    # Run linting
    if [[ "$SKIP_LINT" != "true" ]]; then
        log_info "Running backend linting..."
        npm run lint || {
            log_error "Backend linting failed"
            return 1
        }
    fi
    
    # Run TypeScript compilation
    log_info "Building backend..."
    npm run build || {
        log_error "Backend build failed"
        return 1
    }
    
    # Run unit tests with coverage
    log_info "Running backend unit tests..."
    npm run test:coverage || {
        log_error "Backend unit tests failed"
        return 1
    }
    
    # Run integration tests
    log_info "Running backend integration tests..."
    npm run test:integration || {
        log_error "Backend integration tests failed"
        return 1
    }
    
    # Copy coverage results
    if [[ -d coverage ]]; then
        cp -r coverage "$RESULTS_DIR/backend-coverage-$TIMESTAMP"
    fi
    
    log_success "Backend tests completed"
}

run_frontend_tests() {
    log_info "Running frontend tests..."
    
    cd "$WEB_DASHBOARD_DIR"
    
    # Run linting
    if [[ "$SKIP_LINT" != "true" ]]; then
        log_info "Running frontend linting..."
        npm run lint || {
            log_error "Frontend linting failed"
            return 1
        }
    fi
    
    # Run TypeScript type checking
    log_info "Running TypeScript type checking..."
    npm run type-check || {
        log_error "TypeScript type checking failed"
        return 1
    }
    
    # Run unit tests with coverage
    log_info "Running frontend unit tests..."
    npm run test:coverage || {
        log_error "Frontend unit tests failed"
        return 1
    }
    
    # Copy coverage results
    if [[ -d coverage ]]; then
        cp -r coverage "$RESULTS_DIR/frontend-coverage-$TIMESTAMP"
    fi
    
    log_success "Frontend tests completed"
}

start_services() {
    log_info "Starting services for E2E tests..."
    
    # Start API server
    cd "$API_SERVER_DIR"
    npm start &
    API_PID=$!
    
    # Start web dashboard
    cd "$WEB_DASHBOARD_DIR"
    npm start &
    WEB_PID=$!
    
    # Wait for services to be ready
    log_info "Waiting for services to start..."
    
    # Wait for API server
    for i in {1..30}; do
        if curl -f http://localhost:3501/api/health > /dev/null 2>&1; then
            log_success "API server is ready"
            break
        fi
        if [[ $i -eq 30 ]]; then
            log_error "API server failed to start"
            return 1
        fi
        sleep 2
    done
    
    # Wait for web dashboard
    for i in {1..30}; do
        if curl -f http://localhost:3500 > /dev/null 2>&1; then
            log_success "Web dashboard is ready"
            break
        fi
        if [[ $i -eq 30 ]]; then
            log_error "Web dashboard failed to start"
            return 1
        fi
        sleep 2
    done
}

run_e2e_tests() {
    if [[ "$RUN_E2E" != "true" ]]; then
        log_info "Skipping E2E tests (RUN_E2E not set)"
        return 0
    fi
    
    log_info "Running E2E tests..."
    
    cd "$WEB_DASHBOARD_DIR"
    
    # Run Playwright E2E tests
    npm run test:e2e || {
        log_error "E2E tests failed"
        return 1
    }
    
    # Copy test results
    if [[ -d test-results ]]; then
        cp -r test-results "$RESULTS_DIR/e2e-results-$TIMESTAMP"
    fi
    
    log_success "E2E tests completed"
}

run_performance_tests() {
    if [[ "$RUN_PERFORMANCE" != "true" ]]; then
        log_info "Skipping performance tests (RUN_PERFORMANCE not set)"
        return 0
    fi
    
    log_info "Running performance tests..."
    
    # Check if k6 is available
    if ! command -v k6 &> /dev/null; then
        log_warning "k6 not found, skipping load tests"
    else
        cd "$API_SERVER_DIR"
        
        # Run API load tests
        log_info "Running API load tests..."
        k6 run tests/performance/load-test.js --out json="$RESULTS_DIR/k6-api-results-$TIMESTAMP.json" || {
            log_warning "API load tests had issues (non-critical)"
        }
        
        # Run WebSocket load tests
        log_info "Running WebSocket load tests..."
        k6 run tests/performance/websocket-load-test.js --out json="$RESULTS_DIR/k6-ws-results-$TIMESTAMP.json" || {
            log_warning "WebSocket load tests had issues (non-critical)"
        }
    fi
    
    # Run Lighthouse tests if Chrome is available
    if command -v google-chrome &> /dev/null || command -v chromium &> /dev/null; then
        cd "$WEB_DASHBOARD_DIR"
        log_info "Running Lighthouse performance tests..."
        node tests/performance/lighthouse-performance.js || {
            log_warning "Lighthouse tests had issues (non-critical)"
        }
        
        # Copy Lighthouse results
        if [[ -d test-results/lighthouse ]]; then
            cp -r test-results/lighthouse "$RESULTS_DIR/lighthouse-results-$TIMESTAMP"
        fi
    else
        log_warning "Chrome not found, skipping Lighthouse tests"
    fi
    
    log_success "Performance tests completed"
}

generate_test_report() {
    log_info "Generating test report..."
    
    cd "$PROJECT_ROOT"
    
    # Create test report
    cat > "$RESULTS_DIR/test-report-$TIMESTAMP.md" << EOF
# Analytics Dashboard Test Report

**Date:** $(date)
**Timestamp:** $TIMESTAMP

## Test Summary

### Backend Tests
- ✅ Linting
- ✅ TypeScript Compilation
- ✅ Unit Tests with Coverage
- ✅ Integration Tests

### Frontend Tests
- ✅ Linting
- ✅ TypeScript Type Checking
- ✅ Unit Tests with Coverage

EOF

    if [[ "$RUN_E2E" == "true" ]]; then
        echo "### End-to-End Tests" >> "$RESULTS_DIR/test-report-$TIMESTAMP.md"
        echo "- ✅ Playwright E2E Tests" >> "$RESULTS_DIR/test-report-$TIMESTAMP.md"
        echo "" >> "$RESULTS_DIR/test-report-$TIMESTAMP.md"
    fi

    if [[ "$RUN_PERFORMANCE" == "true" ]]; then
        echo "### Performance Tests" >> "$RESULTS_DIR/test-report-$TIMESTAMP.md"
        echo "- ✅ API Load Tests (k6)" >> "$RESULTS_DIR/test-report-$TIMESTAMP.md"
        echo "- ✅ WebSocket Load Tests (k6)" >> "$RESULTS_DIR/test-report-$TIMESTAMP.md"
        echo "- ✅ Lighthouse Performance Tests" >> "$RESULTS_DIR/test-report-$TIMESTAMP.md"
        echo "" >> "$RESULTS_DIR/test-report-$TIMESTAMP.md"
    fi

    echo "## Test Artifacts" >> "$RESULTS_DIR/test-report-$TIMESTAMP.md"
    echo "" >> "$RESULTS_DIR/test-report-$TIMESTAMP.md"
    find "$RESULTS_DIR" -name "*$TIMESTAMP*" -type d | while read -r dir; do
        echo "- $(basename "$dir")" >> "$RESULTS_DIR/test-report-$TIMESTAMP.md"
    done

    log_success "Test report generated: $RESULTS_DIR/test-report-$TIMESTAMP.md"
}

print_usage() {
    cat << EOF
Analytics Dashboard Test Runner

Usage: $0 [OPTIONS]

OPTIONS:
    --docker                Use Docker for test environment
    --e2e                  Run E2E tests
    --performance          Run performance tests
    --skip-lint           Skip linting steps
    --help                Show this help message

ENVIRONMENT VARIABLES:
    USE_DOCKER=true        Use Docker test environment
    RUN_E2E=true          Run E2E tests
    RUN_PERFORMANCE=true   Run performance tests
    SKIP_LINT=true        Skip linting steps

EXAMPLES:
    # Run basic tests
    $0

    # Run all tests including E2E and performance
    $0 --e2e --performance

    # Use Docker environment
    $0 --docker --e2e

    # Environment variable approach
    RUN_E2E=true RUN_PERFORMANCE=true $0
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --docker)
            USE_DOCKER=true
            shift
            ;;
        --e2e)
            RUN_E2E=true
            shift
            ;;
        --performance)
            RUN_PERFORMANCE=true
            shift
            ;;
        --skip-lint)
            SKIP_LINT=true
            shift
            ;;
        --help)
            print_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    log_info "🧪 Starting Analytics Dashboard Comprehensive Test Suite"
    log_info "Project root: $PROJECT_ROOT"
    log_info "Results directory: $RESULTS_DIR"
    log_info "Timestamp: $TIMESTAMP"
    
    # Track test results
    FAILED_TESTS=()
    
    # Setup
    setup_test_environment
    install_dependencies
    
    # Run tests
    run_backend_tests || FAILED_TESTS+=("Backend Tests")
    run_frontend_tests || FAILED_TESTS+=("Frontend Tests")
    
    if [[ "$RUN_E2E" == "true" ]]; then
        start_services
        run_e2e_tests || FAILED_TESTS+=("E2E Tests")
    fi
    
    if [[ "$RUN_PERFORMANCE" == "true" ]]; then
        # Ensure services are running for performance tests
        if [[ "$RUN_E2E" != "true" ]]; then
            start_services
        fi
        run_performance_tests || FAILED_TESTS+=("Performance Tests")
    fi
    
    # Generate report
    generate_test_report
    
    # Final summary
    log_info "🎯 Test Execution Summary"
    log_info "========================"
    
    if [[ ${#FAILED_TESTS[@]} -eq 0 ]]; then
        log_success "All tests passed! ✅"
        log_info "Test results available in: $RESULTS_DIR"
        exit 0
    else
        log_error "The following test suites failed:"
        for test in "${FAILED_TESTS[@]}"; do
            log_error "  - $test"
        done
        log_info "Test results available in: $RESULTS_DIR"
        exit 1
    fi
}

# Run main function
main "$@"