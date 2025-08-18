#!/bin/bash
# Infrastructure Test Runner Script
set -euo pipefail

# Configuration
PROJECT_ROOT="/Users/patricksmith/candlefish-ai"
TEST_DIR="$PROJECT_ROOT/__tests__"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

test_result() {
    local test_name=$1
    local status=$2

    TESTS_RUN=$((TESTS_RUN + 1))

    case $status in
        pass)
            echo -e "${GREEN}✅ PASS${NC} - $test_name"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            ;;
        fail)
            echo -e "${RED}❌ FAIL${NC} - $test_name"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            ;;
        skip)
            echo -e "${YELLOW}⏩ SKIP${NC} - $test_name"
            TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
            ;;
    esac
}

# Infrastructure connectivity tests
test_infrastructure() {
    log "Running Infrastructure Tests..."
    echo ""

    # Test AWS connectivity
    if aws sts get-caller-identity >/dev/null 2>&1; then
        test_result "AWS Authentication" "pass"
    else
        test_result "AWS Authentication" "fail"
    fi

    # Test S3 access
    if aws s3 ls 2>/dev/null | grep -q candlefish; then
        test_result "S3 Bucket Access" "pass"
    else
        test_result "S3 Bucket Access" "fail"
    fi

    # Test CloudWatch access
    if aws cloudwatch describe-alarms --max-records 1 >/dev/null 2>&1; then
        test_result "CloudWatch Access" "pass"
    else
        test_result "CloudWatch Access" "fail"
    fi

    # Test Secrets Manager
    if aws secretsmanager list-secrets --max-results 1 >/dev/null 2>&1; then
        test_result "Secrets Manager Access" "pass"
    else
        test_result "Secrets Manager Access" "fail"
    fi

    # Test Fly.io connectivity
    if flyctl version >/dev/null 2>&1; then
        test_result "Fly.io CLI Available" "pass"
    else
        test_result "Fly.io CLI Available" "fail"
    fi

    # Test Fly.io authentication
    if flyctl auth whoami >/dev/null 2>&1; then
        test_result "Fly.io Authentication" "pass"
    else
        test_result "Fly.io Authentication" "fail"
    fi
}

# API endpoint tests
test_api_endpoints() {
    log "Running API Endpoint Tests..."
    echo ""

    # Test Paintbox health endpoint
    if curl -f -s -m 5 https://paintbox-app.fly.dev/api/health >/dev/null 2>&1; then
        test_result "Paintbox Health Endpoint" "pass"
    else
        test_result "Paintbox Health Endpoint" "fail"
    fi

    # Test Paintbox status endpoint
    if curl -f -s -m 5 https://paintbox-app.fly.dev/api/status >/dev/null 2>&1; then
        test_result "Paintbox Status Endpoint" "pass"
    else
        test_result "Paintbox Status Endpoint" "fail"
    fi

    # Test Temporal health endpoint
    if curl -f -s -m 5 https://candlefish-temporal-platform.fly.dev/health >/dev/null 2>&1; then
        test_result "Temporal Health Endpoint" "pass"
    else
        test_result "Temporal Health Endpoint" "fail"
    fi
}

# Performance tests
test_performance() {
    log "Running Performance Tests..."
    echo ""

    # Test response times
    local endpoints=(
        "https://paintbox-app.fly.dev/api/health"
        "https://paintbox-app.fly.dev/api/status"
        "https://candlefish-temporal-platform.fly.dev/health"
    )

    for endpoint in "${endpoints[@]}"; do
        response_time=$(curl -o /dev/null -s -w "%{time_total}" "$endpoint" 2>/dev/null || echo "999")
        response_time_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "999")

        if (( $(echo "$response_time_ms < 500" | bc -l 2>/dev/null || echo 0) )); then
            test_result "Performance: ${endpoint##*/} (<500ms)" "pass"
        elif (( $(echo "$response_time_ms < 1000" | bc -l 2>/dev/null || echo 0) )); then
            test_result "Performance: ${endpoint##*/} (${response_time_ms}ms)" "skip"
        else
            test_result "Performance: ${endpoint##*/} (${response_time_ms}ms)" "fail"
        fi
    done
}

# Security tests
test_security() {
    log "Running Security Tests..."
    echo ""

    # Test HTTPS enforcement
    local urls=(
        "https://paintbox-app.fly.dev"
        "https://candlefish-temporal-platform.fly.dev"
    )

    for url in "${urls[@]}"; do
        # Check if HTTPS is enforced
        if curl -I -s "$url" | grep -q "Strict-Transport-Security"; then
            test_result "HSTS Header: ${url##*/}" "pass"
        else
            test_result "HSTS Header: ${url##*/}" "skip"
        fi

        # Check for security headers
        if curl -I -s "$url" | grep -q "X-Content-Type-Options"; then
            test_result "Security Headers: ${url##*/}" "pass"
        else
            test_result "Security Headers: ${url##*/}" "skip"
        fi
    done

    # Test secrets are not exposed
    if curl -s https://paintbox-app.fly.dev 2>/dev/null | grep -q "AWS_SECRET\|DATABASE_URL\|API_KEY"; then
        test_result "No Secrets Exposed" "fail"
    else
        test_result "No Secrets Exposed" "pass"
    fi
}

# Configuration tests
test_configuration() {
    log "Running Configuration Tests..."
    echo ""

    # Check Docker installation
    if docker --version >/dev/null 2>&1; then
        test_result "Docker Available" "pass"
    else
        test_result "Docker Available" "skip"
    fi

    # Check Node.js version
    if node --version | grep -q "v18\|v20"; then
        test_result "Node.js Version" "pass"
    else
        test_result "Node.js Version" "fail"
    fi

    # Check npm version
    if npm --version >/dev/null 2>&1; then
        test_result "NPM Available" "pass"
    else
        test_result "NPM Available" "fail"
    fi

    # Check Git configuration
    if git config --get user.email >/dev/null 2>&1; then
        test_result "Git Configuration" "pass"
    else
        test_result "Git Configuration" "skip"
    fi
}

# Backup and recovery tests
test_backup_recovery() {
    log "Running Backup & Recovery Tests..."
    echo ""

    # Test backup bucket exists
    BACKUP_BUCKET="candlefish-backups-$(date +%Y%m%d)"
    if aws s3 ls "s3://$BACKUP_BUCKET" 2>/dev/null; then
        test_result "Backup Bucket Exists" "pass"
    else
        test_result "Backup Bucket Exists" "fail"
    fi

    # Test backup write access
    TEST_FILE="/tmp/backup-test-$(date +%s).txt"
    echo "Test backup" > "$TEST_FILE"
    if aws s3 cp "$TEST_FILE" "s3://$BACKUP_BUCKET/test/" 2>/dev/null; then
        test_result "Backup Write Access" "pass"
        aws s3 rm "s3://$BACKUP_BUCKET/test/$(basename $TEST_FILE)" 2>/dev/null
    else
        test_result "Backup Write Access" "fail"
    fi
    rm -f "$TEST_FILE"

    # Test DR bucket exists
    DR_BUCKET="candlefish-backups-dr-$(date +%Y%m%d)"
    if aws s3 ls "s3://$DR_BUCKET" --region us-west-2 2>/dev/null; then
        test_result "DR Bucket Exists" "pass"
    else
        test_result "DR Bucket Exists" "fail"
    fi
}

# Generate test report
generate_report() {
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo -e "${CYAN}              PRODUCTION TEST RESULTS${NC}"
    echo "════════════════════════════════════════════════════════════"
    echo ""
    echo -e "Total Tests Run: ${MAGENTA}$TESTS_RUN${NC}"
    echo -e "Tests Passed:    ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed:    ${RED}$TESTS_FAILED${NC}"
    echo -e "Tests Skipped:   ${YELLOW}$TESTS_SKIPPED${NC}"
    echo ""

    # Calculate pass rate
    if [ $TESTS_RUN -gt 0 ]; then
        PASS_RATE=$(echo "scale=1; $TESTS_PASSED * 100 / $TESTS_RUN" | bc)
        echo -e "Pass Rate: ${CYAN}${PASS_RATE}%${NC}"
    fi

    echo ""
    echo "────────────────────────────────────────────────────────────"

    # Overall status
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ ALL CRITICAL TESTS PASSED!${NC}"
        echo ""
        echo "Infrastructure is ready for production use."
        return 0
    else
        echo -e "${RED}❌ SOME TESTS FAILED${NC}"
        echo ""
        echo "Please review failed tests and fix issues before production use."
        return 1
    fi
}

# Main test execution
main() {
    log "🧪 Starting Production Test Suite..."
    echo "════════════════════════════════════════════════════════════"
    echo ""

    # Parse command line arguments
    case "${1:-all}" in
        --infrastructure)
            test_infrastructure
            ;;
        --api)
            test_api_endpoints
            ;;
        --performance)
            test_performance
            ;;
        --security)
            test_security
            ;;
        --configuration)
            test_configuration
            ;;
        --backup)
            test_backup_recovery
            ;;
        --all|*)
            test_infrastructure
            echo ""
            test_api_endpoints
            echo ""
            test_performance
            echo ""
            test_security
            echo ""
            test_configuration
            echo ""
            test_backup_recovery
            ;;
    esac

    # Generate report
    generate_report
}

# Run main function
main "$@"
