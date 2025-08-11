#!/bin/bash

# Collaboration Test Suite Setup Script
# Sets up the complete testing infrastructure for the real-time collaboration system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
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

# Check if required commands exist
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# Verify system requirements
verify_requirements() {
    log_info "Verifying system requirements..."

    check_command "node"
    check_command "pnpm"
    check_command "docker"
    check_command "docker-compose"

    # Check Node.js version
    NODE_VERSION=$(node --version | sed 's/v//')
    REQUIRED_NODE_VERSION="18.0.0"

    if ! printf '%s\n%s\n' "$REQUIRED_NODE_VERSION" "$NODE_VERSION" | sort -V -C; then
        log_error "Node.js version $NODE_VERSION is below required version $REQUIRED_NODE_VERSION"
        exit 1
    fi

    log_success "All system requirements met"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."

    if [ ! -f "pnpm-lock.yaml" ]; then
        log_warning "pnpm-lock.yaml not found, generating lockfile..."
        pnpm install
    else
        pnpm install --frozen-lockfile
    fi

    log_success "Dependencies installed"
}

# Setup Docker services
setup_docker_services() {
    log_info "Setting up Docker services for testing..."

    # Stop any existing services
    docker-compose -f docker-compose.test.yml down --remove-orphans 2>/dev/null || true

    # Pull latest images
    docker-compose -f docker-compose.test.yml pull

    # Build custom images
    docker-compose -f docker-compose.test.yml build

    log_success "Docker services ready"
}

# Create test databases and schemas
setup_test_database() {
    log_info "Setting up test database..."

    # Start only the database service
    docker-compose -f docker-compose.test.yml up -d postgres-test redis-test

    # Wait for services to be ready
    log_info "Waiting for database to be ready..."
    sleep 10

    # Check if PostgreSQL is ready
    max_attempts=30
    attempt=1

    while ! docker-compose -f docker-compose.test.yml exec -T postgres-test pg_isready -U test -d collaboration_test &>/dev/null; do
        if [ $attempt -eq $max_attempts ]; then
            log_error "PostgreSQL failed to start after $max_attempts attempts"
            exit 1
        fi

        log_info "Waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done

    # Check if Redis is ready
    while ! docker-compose -f docker-compose.test.yml exec -T redis-test redis-cli ping &>/dev/null; do
        log_info "Waiting for Redis..."
        sleep 1
    done

    log_success "Test database is ready"
}

# Validate test configuration
validate_test_config() {
    log_info "Validating test configuration..."

    # Check Jest config
    if ! node -e "require('./jest.config.js')" &>/dev/null; then
        log_error "Jest configuration is invalid"
        exit 1
    fi

    # Check required test files
    required_files=(
        "__tests__/collaboration/setup/global.setup.js"
        "__tests__/collaboration/setup/global.teardown.js"
        "__tests__/collaboration/setup/unit.setup.js"
        "__tests__/collaboration/setup/integration.setup.js"
        "__tests__/collaboration/factories/test-data-factory.ts"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Required test file not found: $file"
            exit 1
        fi
    done

    # Validate Docker Compose
    if ! docker-compose -f docker-compose.test.yml config &>/dev/null; then
        log_error "Docker Compose configuration is invalid"
        exit 1
    fi

    log_success "Test configuration is valid"
}

# Run test suite verification
verify_test_suite() {
    log_info "Running test suite verification..."

    # Set test environment variables
    export NODE_ENV=test
    export CI=true
    export DATABASE_URL="postgresql://test:test@localhost:5433/collaboration_test"
    export REDIS_URL="redis://localhost:6380"
    export WEBSOCKET_PORT=8081
    export GRAPHQL_PORT=4001

    # Run a quick test to verify everything is working
    log_info "Running unit test verification..."
    if pnpm test __tests__/collaboration/unit/crdt-operations.test.ts --testTimeout=30000 --silent; then
        log_success "Unit tests are working"
    else
        log_error "Unit tests failed"
        exit 1
    fi

    log_info "Running integration test verification..."
    if timeout 60 pnpm test __tests__/collaboration/integration/graphql-api.test.ts --testTimeout=45000 --silent --maxWorkers=1; then
        log_success "Integration tests are working"
    else
        log_warning "Integration tests may need additional setup or services"
    fi
}

# Setup development tools
setup_dev_tools() {
    log_info "Setting up development tools..."

    # Install Playwright browsers if not already installed
    if [ ! -d "node_modules/@playwright/test" ]; then
        log_info "Installing Playwright..."
        npx playwright install
    fi

    # Install Artillery for load testing if not installed
    if ! pnpm list artillery &>/dev/null; then
        log_info "Installing Artillery for load testing..."
        pnpm add -D artillery
    fi

    log_success "Development tools ready"
}

# Generate test documentation
generate_test_docs() {
    log_info "Generating test documentation..."

    cat > TESTING.md << 'EOF'
# Collaboration System Testing Guide

This document provides comprehensive information about the test suite for the real-time collaboration system.

## Test Structure

### Unit Tests
- **CRDT Operations**: Tests for conflict-free replicated data types
- **GraphQL Resolvers**: Tests for GraphQL query and mutation resolvers
- **Frontend Components**: Tests for React collaboration components
- **Mobile Components**: Tests for React Native components and offline sync

### Integration Tests
- **GraphQL API**: End-to-end API testing with real database
- **WebSocket Communication**: Real-time communication testing
- **Authentication**: Multi-tenant access control testing

### Performance Tests
- **Load Testing**: 100-1000+ concurrent users
- **Stress Testing**: Resource limits and memory usage
- **Latency Testing**: Real-time synchronization performance

### E2E Tests
- **Multi-user Scenarios**: Complete collaboration workflows
- **Conflict Resolution**: CRDT conflict handling
- **Offline Synchronization**: Mobile offline/online transitions

## Running Tests

### Quick Start
```bash
# Setup test environment
./scripts/setup-collaboration-tests.sh

# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:performance
```

### Development Workflow
```bash
# Watch mode for development
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test __tests__/collaboration/unit/crdt-operations.test.ts
```

### Docker Services
```bash
# Start test services
pnpm test:docker:up

# Stop test services
pnpm test:docker:down

# Clean up volumes
pnpm test:docker:clean
```

## Test Configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection for integration tests
- `REDIS_URL`: Redis connection for real-time features
- `WEBSOCKET_PORT`: WebSocket server port
- `GRAPHQL_PORT`: GraphQL server port

### Performance Thresholds
- Response Time: < 1000ms (95th percentile)
- Throughput: > 100 operations/second
- Error Rate: < 5%
- Memory Usage: < 500MB peak

### Coverage Goals
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

## Continuous Integration

The test suite runs automatically on:
- Pull requests
- Pushes to main/develop branches
- Nightly performance tests

### CI/CD Pipeline Stages
1. **Unit Tests**: Fast tests on code changes
2. **Integration Tests**: API and database testing
3. **E2E Tests**: Full user workflow testing
4. **Performance Tests**: Load and stress testing
5. **Coverage Reports**: Code coverage analysis
6. **Security Scans**: Dependency and code security

## Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure ports 5433, 6380, 8081, 4001 are available
2. **Docker issues**: Run `docker system prune` to clean up
3. **Memory issues**: Reduce concurrent test workers
4. **Network timeouts**: Increase test timeouts in CI environments

### Debug Mode
```bash
# Run tests in debug mode
DEBUG=* pnpm test

# Verbose Jest output
pnpm test --verbose

# Run single test with logs
pnpm test __tests__/collaboration/unit/crdt-operations.test.ts --verbose
```

## Performance Monitoring

### Metrics Collected
- Response times (min, max, average, percentiles)
- Throughput (operations per second)
- Error rates and types
- Memory usage patterns
- WebSocket connection counts
- CRDT operation conflicts

### Load Test Scenarios
- **Normal Load**: 100 concurrent users
- **Heavy Load**: 500 concurrent users
- **Stress Test**: 1000+ concurrent users
- **Burst Traffic**: High activity periods
- **Extended Operation**: Memory leak detection

## Contributing

When adding new tests:
1. Follow the existing test structure and naming conventions
2. Include both positive and negative test cases
3. Add performance considerations for integration tests
4. Update this documentation for new test categories
5. Ensure tests are deterministic and can run in parallel

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [WebSocket Testing Guide](https://github.com/websockets/ws#how-to-test)
EOF

    log_success "Test documentation generated: TESTING.md"
}

# Print usage information
print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --quick        Skip verification and documentation generation"
    echo "  --no-docker    Skip Docker service setup"
    echo "  --docs-only    Only generate documentation"
    echo "  --verify-only  Only run verification"
    echo "  --help         Show this help message"
    echo ""
}

# Main execution
main() {
    local QUICK=false
    local NO_DOCKER=false
    local DOCS_ONLY=false
    local VERIFY_ONLY=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --quick)
                QUICK=true
                shift
                ;;
            --no-docker)
                NO_DOCKER=true
                shift
                ;;
            --docs-only)
                DOCS_ONLY=true
                shift
                ;;
            --verify-only)
                VERIFY_ONLY=true
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

    log_info "🚀 Setting up Collaboration Test Suite..."

    if [ "$DOCS_ONLY" = true ]; then
        generate_test_docs
        exit 0
    fi

    if [ "$VERIFY_ONLY" = true ]; then
        verify_requirements
        validate_test_config
        verify_test_suite
        exit 0
    fi

    # Full setup process
    verify_requirements
    install_dependencies

    if [ "$NO_DOCKER" = false ]; then
        setup_docker_services
        setup_test_database
    fi

    validate_test_config
    setup_dev_tools

    if [ "$QUICK" = false ]; then
        verify_test_suite
        generate_test_docs
    fi

    log_success "🎉 Collaboration test suite setup complete!"
    echo ""
    log_info "Next steps:"
    echo "  • Run 'pnpm test' to execute the full test suite"
    echo "  • Run 'pnpm test:watch' for development"
    echo "  • Read TESTING.md for detailed usage instructions"
    echo "  • Use 'pnpm test:docker:up' to start services manually"
    echo ""
    log_info "Test coverage goal: 85% across all test types"
    log_info "Performance target: <1s response time, >100 ops/sec throughput"
}

# Execute main function with all arguments
main "$@"
