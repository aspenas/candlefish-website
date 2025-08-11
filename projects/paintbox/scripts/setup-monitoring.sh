#!/bin/bash

# Setup Monitoring and Alerting for Paintbox Production
# Configures health checks, alerts, and monitoring dashboards

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
FLY_APP_NAME="${FLY_APP_NAME:-paintbox-app}"
ENVIRONMENT="${ENVIRONMENT:-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Setup CloudWatch alarms
setup_cloudwatch_alarms() {
    log_info "Setting up CloudWatch alarms..."

    local app_url="https://${FLY_APP_NAME}.fly.dev"
    local alarm_prefix="Paintbox-${ENVIRONMENT}"

    # Application availability alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "${alarm_prefix}-Application-Availability" \
        --alarm-description "Paintbox application availability" \
        --metric-name "HealthCheck" \
        --namespace "Paintbox/Application" \
        --statistic "Average" \
        --period 300 \
        --threshold 1 \
        --comparison-operator "LessThanThreshold" \
        --evaluation-periods 2 \
        --alarm-actions "arn:aws:sns:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):paintbox-alerts" \
        --region "$AWS_REGION"

    # Response time alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "${alarm_prefix}-Response-Time" \
        --alarm-description "Paintbox response time too high" \
        --metric-name "ResponseTime" \
        --namespace "Paintbox/Performance" \
        --statistic "Average" \
        --period 300 \
        --threshold 2000 \
        --comparison-operator "GreaterThanThreshold" \
        --evaluation-periods 2 \
        --alarm-actions "arn:aws:sns:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):paintbox-alerts" \
        --region "$AWS_REGION"

    # Error rate alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "${alarm_prefix}-Error-Rate" \
        --alarm-description "Paintbox error rate too high" \
        --metric-name "ErrorRate" \
        --namespace "Paintbox/Application" \
        --statistic "Average" \
        --period 300 \
        --threshold 5 \
        --comparison-operator "GreaterThanThreshold" \
        --evaluation-periods 1 \
        --alarm-actions "arn:aws:sns:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):paintbox-alerts" \
        --region "$AWS_REGION"

    log_success "CloudWatch alarms configured"
}

# Setup SNS topic for alerts
setup_sns_alerts() {
    log_info "Setting up SNS alerts..."

    local topic_name="paintbox-alerts"
    local topic_arn

    # Create SNS topic if it doesn't exist
    topic_arn=$(aws sns create-topic --name "$topic_name" --region "$AWS_REGION" --query TopicArn --output text)

    # Subscribe email endpoints (if configured)
    if [[ -n "${ALERT_EMAIL:-}" ]]; then
        aws sns subscribe \
            --topic-arn "$topic_arn" \
            --protocol email \
            --notification-endpoint "$ALERT_EMAIL" \
            --region "$AWS_REGION" || log_warning "Email subscription may need confirmation"
    fi

    # Subscribe Slack webhook (if configured)
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        aws sns subscribe \
            --topic-arn "$topic_arn" \
            --protocol https \
            --notification-endpoint "$SLACK_WEBHOOK_URL" \
            --region "$AWS_REGION" || log_warning "Slack webhook subscription failed"
    fi

    log_success "SNS alerts configured: $topic_arn"
}

# Create monitoring dashboard
create_dashboard() {
    log_info "Creating CloudWatch dashboard..."

    local dashboard_name="Paintbox-${ENVIRONMENT}"

    cat > /tmp/dashboard.json << EOF
{
    "widgets": [
        {
            "type": "metric",
            "x": 0,
            "y": 0,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "Paintbox/Application", "HealthCheck" ],
                    [ ".", "RequestCount" ],
                    [ ".", "ErrorRate" ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "$AWS_REGION",
                "title": "Application Health"
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 0,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "Paintbox/Performance", "ResponseTime" ],
                    [ ".", "DatabaseResponseTime" ],
                    [ ".", "RedisResponseTime" ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "$AWS_REGION",
                "title": "Performance Metrics"
            }
        },
        {
            "type": "log",
            "x": 0,
            "y": 6,
            "width": 24,
            "height": 6,
            "properties": {
                "query": "SOURCE '/aws/lambda/paintbox-${ENVIRONMENT}' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20",
                "region": "$AWS_REGION",
                "title": "Recent Errors"
            }
        }
    ]
}
EOF

    aws cloudwatch put-dashboard \
        --dashboard-name "$dashboard_name" \
        --dashboard-body file:///tmp/dashboard.json \
        --region "$AWS_REGION"

    rm -f /tmp/dashboard.json

    local dashboard_url="https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=${dashboard_name}"
    log_success "Dashboard created: $dashboard_url"
}

# Setup external monitoring (UptimeRobot, StatusPage, etc.)
setup_external_monitoring() {
    log_info "Setting up external monitoring..."

    local app_url="https://${FLY_APP_NAME}.fly.dev"

    # Create monitoring configuration
    cat > monitoring-endpoints.json << EOF
{
    "endpoints": [
        {
            "name": "Paintbox Main Application",
            "url": "$app_url",
            "method": "GET",
            "expected_status": 200,
            "timeout": 30,
            "interval": 300
        },
        {
            "name": "Paintbox Health Check",
            "url": "$app_url/api/health",
            "method": "GET",
            "expected_status": 200,
            "expected_content": "ok",
            "timeout": 10,
            "interval": 60
        },
        {
            "name": "Paintbox API Status",
            "url": "$app_url/api/status",
            "method": "GET",
            "expected_status": 200,
            "expected_content": "ok",
            "timeout": 10,
            "interval": 300
        }
    ],
    "notifications": {
        "email": "${ALERT_EMAIL:-}",
        "slack": "${SLACK_WEBHOOK_URL:-}",
        "sms": "${ALERT_SMS:-}"
    }
}
EOF

    log_success "External monitoring configuration created: monitoring-endpoints.json"
}

# Create health check script
create_health_check_script() {
    log_info "Creating comprehensive health check script..."

    cat > health-check.sh << 'EOF'
#!/bin/bash

# Comprehensive Health Check for Paintbox
# This script can be run by external monitoring services

set -euo pipefail

APP_URL="${1:-https://paintbox-app.fly.dev}"
TIMEOUT="${2:-30}"
VERBOSE="${3:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Results
TESTS_PASSED=0
TESTS_FAILED=0

log_test() {
    local status="$1"
    local message="$2"

    if [[ "$status" == "PASS" ]]; then
        [[ "$VERBOSE" == "true" ]] && echo -e "${GREEN}[PASS]${NC} $message"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}[FAIL]${NC} $message"
        ((TESTS_FAILED++))
    fi
}

# Test 1: Basic connectivity
if curl -f -s --max-time "$TIMEOUT" "$APP_URL" > /dev/null; then
    log_test "PASS" "Basic connectivity"
else
    log_test "FAIL" "Basic connectivity"
fi

# Test 2: Health endpoint
health_response=$(curl -s --max-time "$TIMEOUT" "$APP_URL/api/health" 2>/dev/null || echo "ERROR")
if [[ "$health_response" == *"ok"* ]]; then
    log_test "PASS" "Health endpoint"
else
    log_test "FAIL" "Health endpoint: $health_response"
fi

# Test 3: API status
status_response=$(curl -s --max-time "$TIMEOUT" "$APP_URL/api/status" 2>/dev/null | jq -r '.status' 2>/dev/null || echo "ERROR")
if [[ "$status_response" == "ok" ]]; then
    log_test "PASS" "API status"
else
    log_test "FAIL" "API status: $status_response"
fi

# Test 4: Response time
response_time=$(curl -o /dev/null -s -w '%{time_total}' --max-time "$TIMEOUT" "$APP_URL/api/health")
if (( $(echo "$response_time < 2.0" | bc -l) )); then
    log_test "PASS" "Response time: ${response_time}s"
else
    log_test "FAIL" "Response time too slow: ${response_time}s"
fi

# Test 5: Database connectivity
if curl -f -s --max-time "$TIMEOUT" "$APP_URL/api/health/db" > /dev/null 2>&1; then
    log_test "PASS" "Database connectivity"
else
    log_test "FAIL" "Database connectivity"
fi

# Test 6: Redis connectivity
if curl -f -s --max-time "$TIMEOUT" "$APP_URL/api/health/redis" > /dev/null 2>&1; then
    log_test "PASS" "Redis connectivity"
else
    log_test "FAIL" "Redis connectivity"
fi

# Results
echo ""
echo "Health Check Results:"
echo "  Tests Passed: $TESTS_PASSED"
echo "  Tests Failed: $TESTS_FAILED"
echo "  Success Rate: $(( TESTS_PASSED * 100 / (TESTS_PASSED + TESTS_FAILED) ))%"

if [[ $TESTS_FAILED -gt 0 ]]; then
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All health checks passed${NC}"
    exit 0
fi
EOF

    chmod +x health-check.sh
    log_success "Health check script created: health-check.sh"
}

# Setup log aggregation
setup_log_aggregation() {
    log_info "Setting up log aggregation..."

    # Create CloudWatch log group if it doesn't exist
    aws logs create-log-group \
        --log-group-name "/aws/applications/paintbox-${ENVIRONMENT}" \
        --region "$AWS_REGION" 2>/dev/null || true

    # Set retention policy
    aws logs put-retention-policy \
        --log-group-name "/aws/applications/paintbox-${ENVIRONMENT}" \
        --retention-in-days 30 \
        --region "$AWS_REGION"

    log_success "Log aggregation configured"
}

# Main setup function
main() {
    log_info "Starting monitoring setup for Paintbox $ENVIRONMENT..."

    # Check prerequisites
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is required but not installed"
        exit 1
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi

    # Setup components
    setup_sns_alerts
    setup_cloudwatch_alarms
    create_dashboard
    setup_external_monitoring
    create_health_check_script
    setup_log_aggregation

    echo ""
    log_success "🎉 Monitoring setup completed successfully!"
    echo ""
    echo "📊 Monitoring Components:"
    echo "  - CloudWatch Alarms: Application health, response time, error rate"
    echo "  - SNS Alerts: Email and Slack notifications"
    echo "  - Dashboard: https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home#dashboards:"
    echo "  - Log Aggregation: /aws/applications/paintbox-${ENVIRONMENT}"
    echo ""
    echo "📋 Next Steps:"
    echo "  1. Confirm email subscription in your inbox"
    echo "  2. Test alerts: aws sns publish --topic-arn <topic-arn> --message 'Test alert'"
    echo "  3. Review dashboard and customize as needed"
    echo "  4. Setup external monitoring service with monitoring-endpoints.json"
    echo "  5. Schedule regular health checks: ./health-check.sh"
    echo ""
}

# Run main function
main "$@"
