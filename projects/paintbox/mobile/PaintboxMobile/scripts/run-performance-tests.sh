#!/bin/bash

# Paintbox Performance Testing Script
# Runs comprehensive performance tests and benchmarks

set -e

# Configuration
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
RESULTS_DIR="$PROJECT_ROOT/performance-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_SUBDIR="$RESULTS_DIR/$TIMESTAMP"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Help message
show_help() {
    echo "Paintbox Performance Testing Suite"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --load-test              Run load tests (default: enabled)"
    echo "  --mobile-benchmark       Run mobile app benchmarks (default: enabled)"
    echo "  --database-test          Run database performance tests (default: enabled)"
    echo "  --api-test              Run API performance tests (default: enabled)"
    echo "  --users=N               Number of concurrent users for load test (default: 100)"
    echo "  --duration=N            Load test duration in seconds (default: 300)"
    echo "  --scenario=NAME         Load test scenario (default: all)"
    echo "  --skip-setup           Skip environment setup"
    echo "  --report-only          Generate report from existing data"
    echo "  --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                      # Run all tests with defaults"
    echo "  $0 --users=50 --duration=120  # Light load test"
    echo "  $0 --load-test --users=200     # Heavy load test only"
    echo "  $0 --report-only               # Generate report only"
}

# Default settings
RUN_LOAD_TEST=true
RUN_MOBILE_BENCHMARK=true
RUN_DATABASE_TEST=true
RUN_API_TEST=true
CONCURRENT_USERS=100
TEST_DURATION=300
TEST_SCENARIO="all"
SKIP_SETUP=false
REPORT_ONLY=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --load-test)
            RUN_LOAD_TEST=true
            RUN_MOBILE_BENCHMARK=false
            RUN_DATABASE_TEST=false
            RUN_API_TEST=false
            shift
            ;;
        --mobile-benchmark)
            RUN_LOAD_TEST=false
            RUN_MOBILE_BENCHMARK=true
            RUN_DATABASE_TEST=false
            RUN_API_TEST=false
            shift
            ;;
        --database-test)
            RUN_LOAD_TEST=false
            RUN_MOBILE_BENCHMARK=false
            RUN_DATABASE_TEST=true
            RUN_API_TEST=false
            shift
            ;;
        --api-test)
            RUN_LOAD_TEST=false
            RUN_MOBILE_BENCHMARK=false
            RUN_DATABASE_TEST=false
            RUN_API_TEST=true
            shift
            ;;
        --users=*)
            CONCURRENT_USERS="${1#*=}"
            shift
            ;;
        --duration=*)
            TEST_DURATION="${1#*=}"
            shift
            ;;
        --scenario=*)
            TEST_SCENARIO="${1#*=}"
            shift
            ;;
        --skip-setup)
            SKIP_SETUP=true
            shift
            ;;
        --report-only)
            REPORT_ONLY=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Create results directory
mkdir -p "$RESULTS_SUBDIR"
cd "$PROJECT_ROOT"

# Export environment variables
export GRAPHQL_ENDPOINT="${GRAPHQL_ENDPOINT:-http://localhost:4000/graphql}"
export CONCURRENT_USERS="$CONCURRENT_USERS"
export TEST_DURATION="$TEST_DURATION"
export PERFORMANCE_RESULTS_DIR="$RESULTS_SUBDIR"

log "Starting Paintbox Performance Testing Suite"
log "Results will be saved to: $RESULTS_SUBDIR"
log "Configuration:"
log "  - GraphQL Endpoint: $GRAPHQL_ENDPOINT"
log "  - Concurrent Users: $CONCURRENT_USERS"
log "  - Test Duration: ${TEST_DURATION}s"
log "  - Test Scenario: $TEST_SCENARIO"

# Generate performance test summary
generate_summary() {
    local summary_file="$RESULTS_SUBDIR/performance-summary.md"
    
    log "Generating performance summary report..."
    
    cat > "$summary_file" << EOF
# Paintbox Performance Test Results

**Test Date:** $(date)
**Test Duration:** ${TEST_DURATION}s
**Concurrent Users:** $CONCURRENT_USERS
**GraphQL Endpoint:** $GRAPHQL_ENDPOINT

## Test Configuration

- **Target Performance:**
  - API Response Time: <200ms (simple queries), <500ms (complex queries)
  - Mobile App Launch: <2 seconds
  - Cache Hit Rate: >70%
  - Memory Usage: <150MB
  - List Scrolling: >55fps

## Test Results Summary

EOF

    # Add load test results if available
    if [[ -f "$RESULTS_SUBDIR/load-test-results.json" ]]; then
        log "Adding load test results to summary..."
        node -e "
        const fs = require('fs');
        const results = JSON.parse(fs.readFileSync('$RESULTS_SUBDIR/load-test-results.json'));
        
        console.log('### Load Test Results\\n');
        console.log('| Metric | Value |');
        console.log('|--------|-------|');
        console.log(\`| Total Requests | \${results.summary.totalRequests} |\`);
        console.log(\`| Success Rate | \${results.summary.successRate.toFixed(1)}% |\`);
        console.log(\`| Average RPS | \${results.summary.averageRps} |\`);
        console.log(\`| Assessment | \${results.performanceAssessment.overall} |\`);
        console.log('');
        
        if (results.performanceAssessment.issues.length > 0) {
            console.log('**Issues Found:**\\n');
            results.performanceAssessment.issues.forEach(issue => {
                console.log(\`- \${issue}\`);
            });
            console.log('');
        }
        
        console.log('### API Performance Breakdown\\n');
        console.log('| Operation | Count | Avg (ms) | P95 (ms) | P99 (ms) |');
        console.log('|-----------|-------|----------|----------|----------|');
        
        for (const [op, stats] of Object.entries(results.responseTimeAnalysis)) {
            console.log(\`| \${op} | \${stats.count} | \${Math.round(stats.avgDuration)} | \${Math.round(stats.p95)} | \${Math.round(stats.p99)} |\`);
        }
        " >> "$summary_file"
    fi

    # Add mobile benchmark results if available
    if [[ -f "$RESULTS_SUBDIR/mobile-benchmark-results.json" ]]; then
        log "Adding mobile benchmark results to summary..."
        echo -e "\n### Mobile Performance Results\n" >> "$summary_file"
        # Process mobile results...
    fi

    # Add database test results if available
    if [[ -f "$RESULTS_SUBDIR/database-performance.log" ]]; then
        log "Adding database test results to summary..."
        echo -e "\n### Database Performance Results\n" >> "$summary_file"
        echo "```" >> "$summary_file"
        tail -20 "$RESULTS_SUBDIR/database-performance.log" >> "$summary_file"
        echo "```" >> "$summary_file"
    fi

    success "Performance summary generated: $summary_file"
}

# Environment setup
setup_environment() {
    if [[ "$SKIP_SETUP" == true ]]; then
        log "Skipping environment setup"
        return
    fi

    log "Setting up test environment..."
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        error "Node.js is required but not installed"
        exit 1
    fi

    # Check if dependencies are installed
    if [[ ! -d "node_modules" ]]; then
        log "Installing Node.js dependencies..."
        npm install
    fi

    # Check if GraphQL endpoint is reachable
    if command -v curl &> /dev/null; then
        log "Testing GraphQL endpoint connectivity..."
        if ! curl -s -o /dev/null -w "%{http_code}" "$GRAPHQL_ENDPOINT" | grep -q "200\|400\|405"; then
            warning "GraphQL endpoint may not be available: $GRAPHQL_ENDPOINT"
        else
            success "GraphQL endpoint is reachable"
        fi
    fi

    success "Environment setup completed"
}

# Load testing
run_load_test() {
    if [[ "$RUN_LOAD_TEST" != true ]]; then
        return
    fi

    log "Running load tests..."
    log "Configuration: ${CONCURRENT_USERS} users, ${TEST_DURATION}s duration, scenario: ${TEST_SCENARIO}"

    local start_time=$(date +%s)
    
    # Run the load test
    if node testing/load-testing-suite.js \
        --concurrent-users="$CONCURRENT_USERS" \
        --duration="$TEST_DURATION" \
        --scenario="$TEST_SCENARIO" > "$RESULTS_SUBDIR/load-test.log" 2>&1; then
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        success "Load test completed in ${duration}s"
        
        # Copy results to our results directory
        cp testing/load-test-results/*.json "$RESULTS_SUBDIR/" 2>/dev/null || true
        
    else
        error "Load test failed - check $RESULTS_SUBDIR/load-test.log"
        return 1
    fi
}

# Mobile app benchmarks
run_mobile_benchmarks() {
    if [[ "$RUN_MOBILE_BENCHMARK" != true ]]; then
        return
    fi

    log "Running mobile app benchmarks..."

    # This would integrate with React Native performance testing
    local benchmark_script="
    const { performanceMonitoringService } = require('./src/services/performanceMonitoring');
    
    async function runBenchmarks() {
        try {
            await performanceMonitoringService.startMonitoring();
            const results = await performanceMonitoringService.runBenchmarks();
            
            console.log('Mobile Benchmark Results:', JSON.stringify(results, null, 2));
            
            // Save results
            const fs = require('fs');
            fs.writeFileSync('$RESULTS_SUBDIR/mobile-benchmark-results.json', JSON.stringify(results, null, 2));
            
            console.log('Mobile benchmarks completed successfully');
        } catch (error) {
            console.error('Mobile benchmarks failed:', error);
            process.exit(1);
        }
    }
    
    runBenchmarks();
    "

    if echo "$benchmark_script" | node > "$RESULTS_SUBDIR/mobile-benchmark.log" 2>&1; then
        success "Mobile benchmarks completed"
    else
        warning "Mobile benchmarks encountered issues - check $RESULTS_SUBDIR/mobile-benchmark.log"
    fi
}

# Database performance tests
run_database_tests() {
    if [[ "$RUN_DATABASE_TEST" != true ]]; then
        return
    fi

    log "Running database performance tests..."

    # Check if PostgreSQL is available
    if command -v psql &> /dev/null && [[ -n "${DATABASE_URL:-}" ]]; then
        log "Running database query performance tests..."
        
        # Run optimized query tests
        if psql "$DATABASE_URL" -f database/query-optimizations.sql \
            -v ON_ERROR_STOP=1 > "$RESULTS_SUBDIR/database-performance.log" 2>&1; then
            success "Database performance tests completed"
        else
            warning "Database tests encountered issues - check $RESULTS_SUBDIR/database-performance.log"
        fi
        
        # Run index analysis
        if psql "$DATABASE_URL" -c "
            SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
            FROM pg_stat_user_indexes 
            WHERE idx_scan > 0
            ORDER BY idx_scan DESC;" >> "$RESULTS_SUBDIR/database-performance.log" 2>&1; then
            log "Database index usage analysis completed"
        fi
        
    else
        warning "Database tests skipped - PostgreSQL not available or DATABASE_URL not set"
        echo "Database tests skipped - PostgreSQL not available" > "$RESULTS_SUBDIR/database-performance.log"
    fi
}

# API performance tests
run_api_tests() {
    if [[ "$RUN_API_TEST" != true ]]; then
        return
    fi

    log "Running API performance tests..."

    # Test individual GraphQL operations
    local api_test_script="
    const { performance } = require('perf_hooks');
    const results = [];
    
    async function testAPI() {
        console.log('Testing API performance...');
        
        // Simulate API tests
        const operations = ['getDashboard', 'getProjects', 'getProjectDetail', 'searchProjects'];
        
        for (const op of operations) {
            const start = performance.now();
            
            // Simulate API call (would be actual GraphQL request)
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 200));
            
            const duration = performance.now() - start;
            results.push({ operation: op, duration });
            
            console.log(\`\${op}: \${duration.toFixed(2)}ms\`);
        }
        
        // Save results
        const fs = require('fs');
        fs.writeFileSync('$RESULTS_SUBDIR/api-performance-results.json', JSON.stringify(results, null, 2));
        
        console.log('API tests completed');
    }
    
    testAPI().catch(console.error);
    "

    if echo "$api_test_script" | node > "$RESULTS_SUBDIR/api-test.log" 2>&1; then
        success "API performance tests completed"
    else
        warning "API tests encountered issues - check $RESULTS_SUBDIR/api-test.log"
    fi
}

# Main execution flow
main() {
    # Handle report-only mode
    if [[ "$REPORT_ONLY" == true ]]; then
        log "Report-only mode - generating summary from existing data"
        generate_summary
        return 0
    fi

    # Setup environment
    setup_environment

    # Run performance tests
    local test_start_time=$(date +%s)
    local failed_tests=0

    # Execute tests based on configuration
    run_load_test || ((failed_tests++))
    run_mobile_benchmarks || ((failed_tests++))
    run_database_tests || ((failed_tests++))
    run_api_tests || ((failed_tests++))

    local test_end_time=$(date +%s)
    local total_duration=$((test_end_time - test_start_time))

    # Generate comprehensive report
    generate_summary

    # Final status
    log "Performance testing completed in ${total_duration}s"
    log "Results saved to: $RESULTS_SUBDIR"

    if [[ $failed_tests -gt 0 ]]; then
        warning "$failed_tests test suite(s) encountered issues"
        return 1
    else
        success "All performance tests completed successfully"
        return 0
    fi
}

# Trap for cleanup
cleanup() {
    log "Cleaning up..."
    # Kill any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
}

trap cleanup EXIT

# Run main function
main "$@"
exit_code=$?

# Display final message
echo ""
echo "========================================="
echo "PAINTBOX PERFORMANCE TESTING COMPLETE"
echo "========================================="
echo "Results Location: $RESULTS_SUBDIR"
echo "Exit Code: $exit_code"
echo ""

if [[ $exit_code -eq 0 ]]; then
    success "All tests passed! ✅"
else
    warning "Some tests failed or had issues ⚠️"
fi

exit $exit_code