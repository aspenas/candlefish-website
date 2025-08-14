#!/bin/bash

# Comprehensive Deployment Test Suite
# ====================================
# Runs all deployment scenarios to validate the critical workflow orchestrator

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print colored output
print_color() {
    local color=$1
    shift
    echo -e "${color}$@${NC}"
}

# Function to run a test scenario
run_test() {
    local test_name="$1"
    local test_command="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    print_color $CYAN "\n════════════════════════════════════════════════════════════════"
    print_color $CYAN "Test #$TOTAL_TESTS: $test_name"
    print_color $CYAN "════════════════════════════════════════════════════════════════"
    print_color $YELLOW "Command: $test_command"
    echo ""

    if eval "$test_command"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        print_color $GREEN "✅ Test PASSED: $test_name"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        print_color $RED "❌ Test FAILED: $test_name"
    fi

    # Brief pause between tests
    sleep 2
}

# Main execution
print_color $MAGENTA "╔══════════════════════════════════════════════════════════════╗"
print_color $MAGENTA "║     COMPREHENSIVE DEPLOYMENT TEST SUITE                      ║"
print_color $MAGENTA "║     Running All Deployment Scenarios                         ║"
print_color $MAGENTA "╚══════════════════════════════════════════════════════════════╝"

START_TIME=$(date +%s)

# Test 1: Basic Dry-Run
run_test "Basic Dry-Run Deployment" \
    "./deploy/critical-deploy.sh --dry-run"

# Test 2: Staging Deployment with All Agents
run_test "Staging Full Deployment" \
    "./deploy/critical-deploy.sh --env staging --dry-run"

# Test 3: Security-Focused Deployment
run_test "Security Priority Deployment" \
    "./deploy/critical-deploy.sh --agents security-auditor,test-automator --priority security>testing --dry-run"

# Test 4: Performance Optimization Deployment
run_test "Performance Tuning Deployment" \
    "./deploy/critical-deploy.sh --agents performance-engineer,database-optimizer --priority performance>database --dry-run"

# Test 5: Database Migration Scenario
run_test "Database Migration Deployment" \
    "./deploy/critical-deploy.sh --agents database-optimizer,test-automator --priority database>testing --dry-run"

# Test 6: Quick Validation
run_test "Quick Validation Deployment" \
    "./deploy/critical-deploy.sh --agents test-automator --validation automated --dry-run"

# Test 7: Custom Priority Chain
run_test "Custom Priority Chain" \
    "./deploy/critical-deploy.sh --priority testing>security>database>performance --dry-run"

# Test 8: Production Simulation
run_test "Production Deployment Simulation" \
    "./deploy/critical-deploy.sh --env production --agents security-auditor,performance-engineer,test-automator,database-optimizer --dry-run"

# Test 9: Parallel Execution Mode
run_test "Parallel Execution Mode" \
    "./deploy/critical-deploy.sh --parallel --dry-run"

# Test 10: Emergency Hotfix Scenario
run_test "Emergency Hotfix Deployment" \
    "./deploy/critical-deploy.sh --agents security-auditor --validation automated --rollback enabled --dry-run"

# Calculate execution time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Generate summary report
print_color $MAGENTA "\n╔══════════════════════════════════════════════════════════════╗"
print_color $MAGENTA "║                    TEST SUITE SUMMARY                        ║"
print_color $MAGENTA "╚══════════════════════════════════════════════════════════════╝"

echo ""
print_color $BLUE "Execution Time: ${DURATION} seconds"
print_color $BLUE "Total Tests: $TOTAL_TESTS"
print_color $GREEN "Passed: $PASSED_TESTS"
print_color $RED "Failed: $FAILED_TESTS"

SUCCESS_RATE=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
print_color $YELLOW "Success Rate: ${SUCCESS_RATE}%"

echo ""
if [ $FAILED_TESTS -eq 0 ]; then
    print_color $GREEN "╔══════════════════════════════════════════════════════════════╗"
    print_color $GREEN "║         🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉                ║"
    print_color $GREEN "╚══════════════════════════════════════════════════════════════╝"
else
    print_color $RED "╔══════════════════════════════════════════════════════════════╗"
    print_color $RED "║              ⚠️  SOME TESTS FAILED  ⚠️                        ║"
    print_color $RED "╚══════════════════════════════════════════════════════════════╝"
fi

# Generate consolidated report
REPORT_DIR="deploy/reports"
SUMMARY_FILE="$REPORT_DIR/test-suite-summary-$(date +%Y%m%d-%H%M%S).json"

cat > "$SUMMARY_FILE" << EOF
{
  "test_suite": "comprehensive_deployment_tests",
  "timestamp": "$(date -Iseconds)",
  "duration_seconds": $DURATION,
  "total_tests": $TOTAL_TESTS,
  "passed_tests": $PASSED_TESTS,
  "failed_tests": $FAILED_TESTS,
  "success_rate": $SUCCESS_RATE,
  "test_scenarios": [
    "basic_dry_run",
    "staging_full_deployment",
    "security_priority",
    "performance_tuning",
    "database_migration",
    "quick_validation",
    "custom_priority_chain",
    "production_simulation",
    "parallel_execution",
    "emergency_hotfix"
  ]
}
EOF

print_color $CYAN "\n📊 Test suite summary saved to: $SUMMARY_FILE"
print_color $CYAN "📁 Individual reports available in: $REPORT_DIR/"

# Check latest deployment report
if [ -f "$REPORT_DIR/latest.json" ]; then
    echo ""
    print_color $YELLOW "Latest Deployment Metrics:"
    cat "$REPORT_DIR/latest.json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"  - Status: {data.get('status', 'unknown').upper()}\")
print(f\"  - Duration: {data.get('duration_seconds', 0):.2f} seconds\")
if 'metrics_summary' in data:
    print(f\"  - Success Rate: {data['metrics_summary'].get('success_rate', 0):.2f}%\")
    print(f\"  - Agents Run: {data['metrics_summary'].get('total_agents', 0)}\")
if 'warnings' in data:
    print(f\"  - Warnings: {len(data['warnings'])}\")
"
fi

echo ""
print_color $BLUE "════════════════════════════════════════════════════════════════"
print_color $BLUE "Deployment orchestrator validation complete!"
print_color $BLUE "════════════════════════════════════════════════════════════════"

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    exit 0
else
    exit 1
fi
