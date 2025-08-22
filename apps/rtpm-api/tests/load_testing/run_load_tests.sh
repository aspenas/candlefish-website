#!/bin/bash

# Load Testing Runner Script for RTPM API
# Runs various K6 load test scenarios

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8000}"
WS_URL="${WS_URL:-ws://localhost:8000}"
RESULTS_DIR="./load_test_results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}🚀 Starting RTPM API Load Tests${NC}"
echo -e "${BLUE}================================${NC}"
echo "Base URL: $BASE_URL"
echo "WebSocket URL: $WS_URL"
echo "Results Directory: $RESULTS_DIR"
echo "Timestamp: $TIMESTAMP"
echo ""

# Check if K6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ K6 is not installed. Please install K6 first.${NC}"
    echo "Visit: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if the API is running
echo -e "${YELLOW}🔍 Checking API availability...${NC}"
if curl -s "$BASE_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ API is responding${NC}"
else
    echo -e "${RED}❌ API is not responding at $BASE_URL${NC}"
    echo "Please start the API server first"
    exit 1
fi

# Function to run a specific test scenario
run_test() {
    local test_name="$1"
    local scenario="$2"
    local description="$3"
    local additional_env="$4"

    echo ""
    echo -e "${BLUE}🔄 Running: $test_name${NC}"
    echo -e "${YELLOW}Description: $description${NC}"
    echo "Scenario: $scenario"

    local output_file="$RESULTS_DIR/${test_name}_${TIMESTAMP}.json"
    local summary_file="$RESULTS_DIR/${test_name}_${TIMESTAMP}_summary.txt"

    # Set environment variables
    export BASE_URL="$BASE_URL"
    export WS_URL="$WS_URL"

    if [ -n "$additional_env" ]; then
        eval "export $additional_env"
    fi

    # Run the test
    if k6 run \
        --scenario "$scenario" \
        --out json="$output_file" \
        --summary-export="$summary_file" \
        k6_load_tests.js; then
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
}

# Test scenarios
echo -e "${BLUE}📋 Running Load Test Scenarios${NC}"
echo -e "${BLUE}==============================${NC}"

# 1. Baseline Load Test
run_test \
    "baseline_load" \
    "baseline_load" \
    "Baseline performance with normal load (10 VUs for 2 minutes)"

# 2. Stress Test
run_test \
    "stress_test" \
    "stress_test" \
    "Stress test with gradually increasing load (up to 100 VUs)"

# 3. Spike Test
run_test \
    "spike_test" \
    "spike_test" \
    "Spike test with sudden traffic increase (10 to 200 VUs)"

# 4. API-only Test
run_test \
    "api_endpoints" \
    "baseline_load" \
    "API endpoints only (no WebSocket)" \
    "K6_TEST_TYPE=api_only"

# 5. WebSocket-only Test
run_test \
    "websocket_load" \
    "websocket_load" \
    "WebSocket connections only (50 VUs for 3 minutes)" \
    "K6_TEST_TYPE=websocket_only"

# 6. Metrics Ingestion Test
run_test \
    "metrics_ingestion" \
    "baseline_load" \
    "Heavy metrics ingestion load" \
    "K6_TEST_TYPE=metrics_ingestion"

# 7. Soak Test (if requested)
if [ "$1" == "--soak" ] || [ "$1" == "--all" ]; then
    echo -e "${YELLOW}⚠️  Starting soak test (10 minutes)...${NC}"
    run_test \
        "soak_test" \
        "soak_test" \
        "Soak test with sustained load (20 VUs for 10 minutes)"
fi

# Generate combined report
echo ""
echo -e "${BLUE}📊 Generating Combined Report${NC}"
echo -e "${BLUE}=============================${NC}"

REPORT_FILE="$RESULTS_DIR/load_test_report_${TIMESTAMP}.html"

cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>RTPM API Load Test Report - $TIMESTAMP</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { border-left: 5px solid #28a745; }
        .warning { border-left: 5px solid #ffc107; }
        .error { border-left: 5px solid #dc3545; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 10px 0; }
        .metric { background: #f8f9fa; padding: 10px; border-radius: 3px; text-align: center; }
        .metric-value { font-size: 1.5em; font-weight: bold; color: #007bff; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>RTPM API Load Test Report</h1>
        <p><strong>Timestamp:</strong> $TIMESTAMP</p>
        <p><strong>Base URL:</strong> $BASE_URL</p>
        <p><strong>WebSocket URL:</strong> $WS_URL</p>
    </div>

    <h2>Test Summary</h2>
EOF

# Add summary for each test
for summary_file in "$RESULTS_DIR"/*_"$TIMESTAMP"_summary.txt; do
    if [ -f "$summary_file" ]; then
        test_name=$(basename "$summary_file" "_${TIMESTAMP}_summary.txt")

        cat >> "$REPORT_FILE" << EOF
    <div class="test-section success">
        <h3>$test_name</h3>
        <pre>$(cat "$summary_file")</pre>
    </div>
EOF
    fi
done

cat >> "$REPORT_FILE" << EOF
    <h2>Key Metrics Analysis</h2>
    <div class="metrics">
        <div class="metric">
            <div class="metric-value" id="total-requests">-</div>
            <div>Total Requests</div>
        </div>
        <div class="metric">
            <div class="metric-value" id="avg-response-time">-</div>
            <div>Avg Response Time</div>
        </div>
        <div class="metric">
            <div class="metric-value" id="error-rate">-</div>
            <div>Error Rate</div>
        </div>
        <div class="metric">
            <div class="metric-value" id="throughput">-</div>
            <div>Throughput (req/s)</div>
        </div>
    </div>

    <h2>Recommendations</h2>
    <div class="test-section">
        <h3>Performance Optimization</h3>
        <ul>
            <li>Monitor response times during peak load</li>
            <li>Check for memory leaks during sustained load</li>
            <li>Optimize database queries for large datasets</li>
            <li>Consider implementing caching for frequently accessed data</li>
            <li>Monitor WebSocket connection stability</li>
        </ul>
    </div>

    <div class="test-section">
        <h3>Scaling Recommendations</h3>
        <ul>
            <li>Implement horizontal scaling for API servers</li>
            <li>Use load balancer for WebSocket connections</li>
            <li>Set up database read replicas for better performance</li>
            <li>Consider implementing rate limiting</li>
        </ul>
    </div>

    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
        Generated on $(date) by RTPM Load Testing Suite
    </footer>
</body>
</html>
EOF

echo -e "${GREEN}✅ Combined report generated: $REPORT_FILE${NC}"

# Performance analysis
echo ""
echo -e "${BLUE}📈 Performance Analysis${NC}"
echo -e "${BLUE}=======================${NC}"

# Extract key metrics from JSON results
total_requests=0
total_duration=0
total_errors=0

for json_file in "$RESULTS_DIR"/*_"$TIMESTAMP".json; do
    if [ -f "$json_file" ]; then
        # Use jq if available for better JSON parsing
        if command -v jq &> /dev/null; then
            requests=$(jq '.metrics.http_reqs.values.count // 0' "$json_file")
            duration=$(jq '.metrics.http_req_duration.values.avg // 0' "$json_file")
            errors=$(jq '.metrics.http_req_failed.values.rate // 0' "$json_file")

            total_requests=$((total_requests + requests))
            if (( $(echo "$duration > 0" | bc -l) )); then
                total_duration=$(echo "$total_duration + $duration" | bc -l)
            fi
            if (( $(echo "$errors > $total_errors" | bc -l) )); then
                total_errors=$errors
            fi
        fi
    fi
done

if [ $total_requests -gt 0 ]; then
    echo "📊 Key Performance Metrics:"
    echo "  Total Requests: $total_requests"
    echo "  Average Response Time: ${total_duration}ms"
    echo "  Error Rate: ${total_errors}%"

    if (( $(echo "$total_errors < 1" | bc -l) )); then
        echo -e "${GREEN}✅ Error rate is within acceptable limits${NC}"
    else
        echo -e "${YELLOW}⚠️  Error rate is higher than recommended${NC}"
    fi
fi

# Cleanup old results (keep last 10 runs)
echo ""
echo -e "${BLUE}🧹 Cleaning up old results...${NC}"
find "$RESULTS_DIR" -name "*.json" -o -name "*.txt" -o -name "*.html" | \
    head -n -30 | xargs rm -f 2>/dev/null || true

echo ""
echo -e "${GREEN}🎉 Load testing completed successfully!${NC}"
echo -e "${GREEN}📁 Results saved in: $RESULTS_DIR${NC}"
echo -e "${GREEN}📊 Report available at: $REPORT_FILE${NC}"

# Show quick summary
echo ""
echo -e "${BLUE}📋 Quick Summary${NC}"
echo -e "${BLUE}===============${NC}"
echo "Tests run: $(ls "$RESULTS_DIR"/*_"$TIMESTAMP"_summary.txt 2>/dev/null | wc -l)"
echo "Report: file://$PWD/$REPORT_FILE"

if [ "$1" == "--open" ]; then
    echo ""
    echo -e "${BLUE}🌐 Opening report in browser...${NC}"
    if command -v open &> /dev/null; then
        open "$REPORT_FILE"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$REPORT_FILE"
    else
        echo "Please open $REPORT_FILE in your browser"
    fi
fi
