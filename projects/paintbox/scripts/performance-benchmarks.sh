#!/bin/bash

# Paintbox Performance Benchmarking Suite
# Comprehensive performance testing for production readiness

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="performance-results-${TIMESTAMP}"
TARGET_URL=${TARGET_URL:-"https://paintbox-app.fly.dev"}
ENVIRONMENT=${ENVIRONMENT:-"production"}

# Create results directory
mkdir -p "$RESULTS_DIR"

# Log function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."

    local deps=("node" "npm" "curl" "jq" "ab" "siege")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            warning "$dep is not installed"

            # Try to install missing dependencies
            case "$dep" in
                "ab")
                    log "Installing Apache Bench..."
                    if [[ "$OSTYPE" == "darwin"* ]]; then
                        brew install httpd
                    else
                        sudo apt-get install -y apache2-utils
                    fi
                    ;;
                "siege")
                    log "Installing Siege..."
                    if [[ "$OSTYPE" == "darwin"* ]]; then
                        brew install siege
                    else
                        sudo apt-get install -y siege
                    fi
                    ;;
                "jq")
                    log "Installing jq..."
                    if [[ "$OSTYPE" == "darwin"* ]]; then
                        brew install jq
                    else
                        sudo apt-get install -y jq
                    fi
                    ;;
            esac
        fi
    done

    # Install Artillery if not present
    if ! command -v artillery &> /dev/null; then
        log "Installing Artillery..."
        npm install -g artillery@latest
    fi

    # Install k6 if not present
    if ! command -v k6 &> /dev/null; then
        log "Installing k6..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install k6
        else
            sudo gpg -k
            sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
            echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
            sudo apt-get update
            sudo apt-get install k6
        fi
    fi

    success "All dependencies checked"
}

# 1. API Response Time Benchmarks
benchmark_api_response() {
    log "Running API response time benchmarks..."

    local endpoints=(
        "/api/health"
        "/api/v1/calculations/execute"
        "/api/v1/estimates/create"
        "/api/v1/salesforce/sync"
        "/api/v1/pdf/generate"
    )

    echo "# API Response Time Benchmarks" > "$RESULTS_DIR/api-response-times.md"
    echo "Target: $TARGET_URL" >> "$RESULTS_DIR/api-response-times.md"
    echo "" >> "$RESULTS_DIR/api-response-times.md"

    for endpoint in "${endpoints[@]}"; do
        log "Testing endpoint: $endpoint"

        # Use curl to measure response times
        response_times=()
        for i in {1..10}; do
            time=$(curl -o /dev/null -s -w '%{time_total}' "${TARGET_URL}${endpoint}")
            response_times+=($time)
        done

        # Calculate statistics
        avg=$(echo "${response_times[@]}" | awk '{s+=$1; n++} END {print s/n}')
        min=$(echo "${response_times[@]}" | tr ' ' '\n' | sort -n | head -1)
        max=$(echo "${response_times[@]}" | tr ' ' '\n' | sort -n | tail -1)

        echo "## Endpoint: $endpoint" >> "$RESULTS_DIR/api-response-times.md"
        echo "- Average: ${avg}s" >> "$RESULTS_DIR/api-response-times.md"
        echo "- Min: ${min}s" >> "$RESULTS_DIR/api-response-times.md"
        echo "- Max: ${max}s" >> "$RESULTS_DIR/api-response-times.md"
        echo "" >> "$RESULTS_DIR/api-response-times.md"
    done

    success "API response time benchmarks completed"
}

# 2. Load Testing with Artillery
run_artillery_tests() {
    log "Running Artillery load tests..."

    # Run different test scenarios
    local scenarios=("local" "staging" "production")

    for scenario in "${scenarios[@]}"; do
        if [[ "$scenario" == "$ENVIRONMENT" ]] || [[ "$ENVIRONMENT" == "all" ]]; then
            log "Running Artillery test for $scenario environment..."

            artillery run \
                --environment "$scenario" \
                --output "$RESULTS_DIR/artillery-${scenario}-report.json" \
                artillery-config.yml

            # Generate HTML report
            artillery report \
                "$RESULTS_DIR/artillery-${scenario}-report.json" \
                --output "$RESULTS_DIR/artillery-${scenario}-report.html"

            success "Artillery test for $scenario completed"
        fi
    done
}

# 3. Stress Testing with Apache Bench
run_ab_tests() {
    log "Running Apache Bench stress tests..."

    # Test configuration
    local requests=10000
    local concurrency=100

    ab -n $requests -c $concurrency \
        -g "$RESULTS_DIR/ab-results.tsv" \
        -e "$RESULTS_DIR/ab-percentiles.csv" \
        "${TARGET_URL}/api/health" > "$RESULTS_DIR/ab-summary.txt" 2>&1

    # Parse results
    if [ -f "$RESULTS_DIR/ab-summary.txt" ]; then
        local req_per_sec=$(grep "Requests per second" "$RESULTS_DIR/ab-summary.txt" | awk '{print $4}')
        local time_per_req=$(grep "Time per request" "$RESULTS_DIR/ab-summary.txt" | head -1 | awk '{print $4}')

        echo "# Apache Bench Results" > "$RESULTS_DIR/ab-analysis.md"
        echo "- Requests per second: $req_per_sec" >> "$RESULTS_DIR/ab-analysis.md"
        echo "- Time per request: ${time_per_req}ms" >> "$RESULTS_DIR/ab-analysis.md"

        success "Apache Bench tests completed"
    else
        warning "Apache Bench tests failed"
    fi
}

# 4. Siege Testing for Sustained Load
run_siege_tests() {
    log "Running Siege sustained load tests..."

    # Create Siege configuration
    cat > "$RESULTS_DIR/siege-urls.txt" << EOF
${TARGET_URL}/api/health
${TARGET_URL}/api/v1/calculations/execute POST {"formula":"=SUM(A1:A10)","context":{"A1":100}}
${TARGET_URL}/api/v1/estimates/create POST {"type":"good","client":{"name":"Test"}}
EOF

    # Run Siege test
    siege \
        -c 50 \
        -t 5M \
        -f "$RESULTS_DIR/siege-urls.txt" \
        --log="$RESULTS_DIR/siege.log" \
        --mark="Paintbox Load Test" \
        --header="Content-Type: application/json" \
        --json-output \
        2>&1 | tee "$RESULTS_DIR/siege-output.txt"

    success "Siege tests completed"
}

# 5. k6 Performance Testing
run_k6_tests() {
    log "Running k6 performance tests..."

    # Create k6 test script
    cat > "$RESULTS_DIR/k6-test.js" << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const calculationDuration = new Trend('calculation_duration');
const pdfGenerationDuration = new Trend('pdf_generation_duration');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Spike
    { duration: '5m', target: 100 },  // Back to normal
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
    errors: ['rate<0.1'],               // Error rate under 10%
  },
};

export default function () {
  const BASE_URL = __ENV.TARGET_URL || 'https://paintbox-app.fly.dev';

  // Test 1: Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  // Test 2: Excel calculation
  const calcStart = Date.now();
  const calcPayload = JSON.stringify({
    formula: '=SUM(A1:A10)',
    context: {
      A1: 100, A2: 200, A3: 300, A4: 400, A5: 500,
      A6: 600, A7: 700, A8: 800, A9: 900, A10: 1000
    }
  });

  const calcRes = http.post(
    `${BASE_URL}/api/v1/calculations/execute`,
    calcPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  const calcDuration = Date.now() - calcStart;
  calculationDuration.add(calcDuration);

  const calcSuccess = check(calcRes, {
    'calculation status is 200': (r) => r.status === 200,
    'calculation has result': (r) => r.json('result') !== undefined,
  });

  errorRate.add(!calcSuccess);

  // Test 3: Estimate creation
  const estimatePayload = JSON.stringify({
    type: 'good',
    client: {
      name: `Test Client ${Date.now()}`,
      email: 'test@example.com',
      phone: '555-0100'
    },
    measurements: {
      exterior: { sqft: 2000, stories: 2 },
      interior: { rooms: 8, sqft: 2500 }
    }
  });

  const estimateRes = http.post(
    `${BASE_URL}/api/v1/estimates/create`,
    estimatePayload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(estimateRes, {
    'estimate created': (r) => r.status === 201 || r.status === 200,
  });

  sleep(1);
}
EOF

    # Run k6 test
    k6 run \
        --out json="$RESULTS_DIR/k6-results.json" \
        --summary-export="$RESULTS_DIR/k6-summary.json" \
        -e TARGET_URL="$TARGET_URL" \
        "$RESULTS_DIR/k6-test.js"

    success "k6 tests completed"
}

# 6. Database Connection Pool Testing
test_database_pool() {
    log "Testing database connection pool..."

    # Create test script
    cat > "$RESULTS_DIR/db-pool-test.js" << 'EOF'
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function testPool() {
  const results = [];
  const promises = [];

  // Create 100 concurrent queries
  for (let i = 0; i < 100; i++) {
    promises.push(
      pool.query('SELECT NOW()')
        .then(() => ({ success: true, id: i }))
        .catch(err => ({ success: false, id: i, error: err.message }))
    );
  }

  const outcomes = await Promise.all(promises);
  const successful = outcomes.filter(o => o.success).length;
  const failed = outcomes.filter(o => !o.success).length;

  console.log(`Pool Test Results: ${successful} successful, ${failed} failed`);
  await pool.end();
}

testPool().catch(console.error);
EOF

    if [ -n "$DATABASE_URL" ]; then
        node "$RESULTS_DIR/db-pool-test.js" > "$RESULTS_DIR/db-pool-results.txt" 2>&1
        success "Database pool testing completed"
    else
        warning "DATABASE_URL not set, skipping database pool tests"
    fi
}

# 7. Redis Performance Testing
test_redis_performance() {
    log "Testing Redis performance..."

    if [ -n "$REDIS_URL" ]; then
        # Use redis-benchmark if available
        if command -v redis-benchmark &> /dev/null; then
            redis-benchmark \
                -h "${REDIS_HOST:-localhost}" \
                -p "${REDIS_PORT:-6379}" \
                -a "${REDIS_PASSWORD:-}" \
                -c 50 \
                -n 10000 \
                -d 100 \
                --csv > "$RESULTS_DIR/redis-benchmark.csv" 2>&1

            success "Redis benchmark completed"
        else
            warning "redis-benchmark not installed, skipping Redis tests"
        fi
    else
        warning "REDIS_URL not set, skipping Redis tests"
    fi
}

# 8. CDN Performance Testing
test_cdn_performance() {
    log "Testing CDN performance..."

    local static_assets=(
        "/_next/static/css/app.css"
        "/_next/static/js/main.js"
        "/favicon.ico"
        "/logo.png"
    )

    echo "# CDN Performance Results" > "$RESULTS_DIR/cdn-performance.md"

    for asset in "${static_assets[@]}"; do
        log "Testing asset: $asset"

        # Test from multiple locations using curl
        for i in {1..5}; do
            response=$(curl -o /dev/null -s -w '%{http_code},%{time_total},%{size_download}' \
                -H "Cache-Control: no-cache" \
                "${TARGET_URL}${asset}")

            IFS=',' read -r status time size <<< "$response"
            echo "- Asset: $asset, Status: $status, Time: ${time}s, Size: ${size} bytes" \
                >> "$RESULTS_DIR/cdn-performance.md"
        done
    done

    success "CDN performance testing completed"
}

# 9. WebSocket Performance Testing
test_websocket_performance() {
    log "Testing WebSocket performance..."

    # Create WebSocket test script
    cat > "$RESULTS_DIR/ws-test.js" << 'EOF'
const WebSocket = require('ws');

async function testWebSocket() {
  const ws = new WebSocket('wss://paintbox-app.fly.dev/ws');
  const messages = [];
  let messageCount = 0;

  ws.on('open', () => {
    console.log('WebSocket connected');

    // Send 100 messages
    for (let i = 0; i < 100; i++) {
      const message = {
        type: 'calculate',
        formula: `=SUM(A1:A${i + 1})`,
        timestamp: Date.now()
      };
      ws.send(JSON.stringify(message));
      messages.push(message);
    }
  });

  ws.on('message', (data) => {
    messageCount++;
    if (messageCount >= 100) {
      console.log(`Received ${messageCount} responses`);
      ws.close();
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('WebSocket closed');
  });
}

testWebSocket().catch(console.error);
EOF

    if command -v ws &> /dev/null || npm list ws &> /dev/null; then
        node "$RESULTS_DIR/ws-test.js" > "$RESULTS_DIR/websocket-results.txt" 2>&1
        success "WebSocket testing completed"
    else
        warning "WebSocket client not available, skipping WebSocket tests"
    fi
}

# 10. Generate Performance Report
generate_report() {
    log "Generating performance report..."

    cat > "$RESULTS_DIR/PERFORMANCE_REPORT.md" << EOF
# Paintbox Performance Test Report
Generated: $(date)
Environment: $ENVIRONMENT
Target: $TARGET_URL

## Test Summary

### 1. API Response Times
$([ -f "$RESULTS_DIR/api-response-times.md" ] && cat "$RESULTS_DIR/api-response-times.md" || echo "Not tested")

### 2. Load Testing Results
$([ -f "$RESULTS_DIR/artillery-${ENVIRONMENT}-report.json" ] && echo "Artillery test completed - see HTML report" || echo "Not tested")

### 3. Stress Testing Results
$([ -f "$RESULTS_DIR/ab-analysis.md" ] && cat "$RESULTS_DIR/ab-analysis.md" || echo "Not tested")

### 4. Sustained Load Results
$([ -f "$RESULTS_DIR/siege-output.txt" ] && tail -20 "$RESULTS_DIR/siege-output.txt" || echo "Not tested")

### 5. k6 Performance Results
$([ -f "$RESULTS_DIR/k6-summary.json" ] && jq -r '.metrics.http_req_duration | "p95: \(.["p(95)"]}ms, p99: \(.["p(99)"]}ms"' "$RESULTS_DIR/k6-summary.json" 2>/dev/null || echo "Not tested")

### 6. Database Pool Testing
$([ -f "$RESULTS_DIR/db-pool-results.txt" ] && cat "$RESULTS_DIR/db-pool-results.txt" || echo "Not tested")

### 7. Redis Performance
$([ -f "$RESULTS_DIR/redis-benchmark.csv" ] && echo "Redis benchmark completed - see CSV file" || echo "Not tested")

### 8. CDN Performance
$([ -f "$RESULTS_DIR/cdn-performance.md" ] && cat "$RESULTS_DIR/cdn-performance.md" || echo "Not tested")

### 9. WebSocket Performance
$([ -f "$RESULTS_DIR/websocket-results.txt" ] && cat "$RESULTS_DIR/websocket-results.txt" || echo "Not tested")

## Recommendations

Based on the test results:

1. **Optimize slow endpoints**: Review any endpoints with p95 > 1000ms
2. **Scale instances**: Consider increasing minimum instances if load tests show saturation
3. **Cache optimization**: Implement caching for frequently accessed data
4. **Database tuning**: Review slow queries and optimize indexes
5. **CDN configuration**: Ensure static assets are properly cached

## Next Steps

1. Review detailed reports in the $RESULTS_DIR directory
2. Address any performance bottlenecks identified
3. Re-run tests after optimizations
4. Set up continuous performance monitoring

EOF

    success "Performance report generated at $RESULTS_DIR/PERFORMANCE_REPORT.md"
}

# Main execution
main() {
    log "Starting Paintbox Performance Benchmarking Suite"
    log "Environment: $ENVIRONMENT"
    log "Target: $TARGET_URL"
    log "Results directory: $RESULTS_DIR"

    # Run all tests
    check_dependencies
    benchmark_api_response
    run_artillery_tests
    run_ab_tests
    run_siege_tests
    run_k6_tests
    test_database_pool
    test_redis_performance
    test_cdn_performance
    test_websocket_performance
    generate_report

    success "All performance benchmarks completed!"
    log "Results saved to: $RESULTS_DIR"

    # Open report if on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$RESULTS_DIR/PERFORMANCE_REPORT.md"
        [ -f "$RESULTS_DIR/artillery-${ENVIRONMENT}-report.html" ] && open "$RESULTS_DIR/artillery-${ENVIRONMENT}-report.html"
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --target|--url)
            TARGET_URL="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [--env production|staging|local] [--target URL]"
            echo "  --env: Environment to test (default: production)"
            echo "  --target: Target URL to test (default: https://paintbox-app.fly.dev)"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Run main function
main
