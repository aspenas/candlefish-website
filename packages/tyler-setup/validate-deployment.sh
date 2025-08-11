#!/bin/bash

# Tyler Setup Platform - Production Deployment Validation
# Comprehensive validation script for all platform components
# Version: 2.0.0

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOMAIN_NAME="${DOMAIN_NAME:-setup.candlefish.ai}"
API_DOMAIN_NAME="${API_DOMAIN_NAME:-api.setup.candlefish.ai}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-tyler-setup}"

# Test configuration
TIMEOUT=30
MAX_RETRIES=3
VALIDATION_LOG="validation-$(date +%Y%m%d-%H%M%S).log"

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
CRITICAL_FAILURES=0

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "$VALIDATION_LOG"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$VALIDATION_LOG"
    ((TESTS_PASSED++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$VALIDATION_LOG"
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$VALIDATION_LOG"
    ((TESTS_FAILED++))
}

log_critical() {
    echo -e "${RED}💥 CRITICAL: $1${NC}" | tee -a "$VALIDATION_LOG"
    ((TESTS_FAILED++))
    ((CRITICAL_FAILURES++))
}

log_test() {
    echo -e "\n${BLUE}🔍 Testing: $1${NC}" | tee -a "$VALIDATION_LOG"
    ((TESTS_RUN++))
}

# HTTP test with retries
http_test() {
    local url="$1"
    local expected_code="${2:-200}"
    local description="$3"
    local max_time="${4:-$TIMEOUT}"
    local retry_count=0

    while [ $retry_count -lt $MAX_RETRIES ]; do
        local response
        local http_code
        local total_time

        if response=$(curl -s -w "HTTPSTATUS:%{http_code}|TIME:%{time_total}|SIZE:%{size_download}" \
                          --max-time "$max_time" \
                          -H "User-Agent: Tyler-Setup-Validator/2.0" \
                          "$url" 2>/dev/null); then

            http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
            total_time=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)

            if [ "$http_code" = "$expected_code" ]; then
                log_success "$description (${http_code}, ${total_time}s)"
                return 0
            else
                log_warning "$description - Unexpected HTTP code: $http_code (expected $expected_code)"
            fi
        else
            log_warning "$description - Request failed (attempt $((retry_count + 1))/$MAX_RETRIES)"
        fi

        ((retry_count++))
        if [ $retry_count -lt $MAX_RETRIES ]; then
            sleep $((retry_count * 2))
        fi
    done

    log_error "$description - All attempts failed"
    return 1
}

# JSON API test
json_api_test() {
    local url="$1"
    local expected_field="$2"
    local description="$3"
    local method="${4:-GET}"
    local data="${5:-}"

    local curl_cmd="curl -s --max-time $TIMEOUT"

    if [ "$method" = "POST" ]; then
        curl_cmd="$curl_cmd -X POST -H 'Content-Type: application/json'"
        if [ -n "$data" ]; then
            curl_cmd="$curl_cmd -d '$data'"
        fi
    fi

    local response
    if response=$(eval "$curl_cmd '$url'" 2>/dev/null); then
        if echo "$response" | jq -e "$expected_field" >/dev/null 2>&1; then
            log_success "$description"
            return 0
        else
            log_error "$description - Expected field '$expected_field' not found in response"
            echo "Response: $response" >> "$VALIDATION_LOG"
            return 1
        fi
    else
        log_error "$description - Request failed"
        return 1
    fi
}

# SSL certificate test
ssl_test() {
    local domain="$1"
    local description="$2"

    if openssl s_client -connect "$domain:443" -servername "$domain" < /dev/null 2>/dev/null | \
       openssl x509 -noout -dates 2>/dev/null; then

        local expiry_date
        expiry_date=$(openssl s_client -connect "$domain:443" -servername "$domain" < /dev/null 2>/dev/null | \
                     openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

        local expiry_epoch
        expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")

        local current_epoch
        current_epoch=$(date +%s)

        local days_until_expiry
        days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))

        if [ $days_until_expiry -gt 30 ]; then
            log_success "$description (expires in $days_until_expiry days)"
        elif [ $days_until_expiry -gt 0 ]; then
            log_warning "$description (expires in $days_until_expiry days - renewal needed soon)"
        else
            log_error "$description (certificate expired or invalid)"
        fi
    else
        log_error "$description - SSL certificate test failed"
    fi
}

# DNS test
dns_test() {
    local domain="$1"
    local expected_type="$2"
    local description="$3"

    if dig +short "$domain" "$expected_type" | grep -q .; then
        local result
        result=$(dig +short "$domain" "$expected_type" | head -1)
        log_success "$description (resolves to: $result)"
    else
        log_error "$description - DNS resolution failed"
    fi
}

# AWS service test
aws_service_test() {
    local service="$1"
    local description="$2"
    local test_command="$3"

    if eval "$test_command" >/dev/null 2>&1; then
        log_success "$description"
    else
        log_error "$description - AWS service test failed"
    fi
}

# WebSocket test
websocket_test() {
    local ws_url="$1"
    local description="$2"

    # Simple WebSocket connection test using curl if available
    if command -v wscat >/dev/null 2>&1; then
        if timeout 10 wscat -c "$ws_url" -x '{"action":"ping"}' >/dev/null 2>&1; then
            log_success "$description"
        else
            log_error "$description - WebSocket connection failed"
        fi
    else
        log_warning "$description - wscat not available, skipping WebSocket test"
    fi
}

# Performance test
performance_test() {
    local url="$1"
    local max_response_time="$2"
    local description="$3"

    local response_time
    response_time=$(curl -s -w "%{time_total}" -o /dev/null "$url" 2>/dev/null || echo "999")

    local response_time_ms
    response_time_ms=$(echo "$response_time * 1000" | bc 2>/dev/null | cut -d. -f1)

    local max_response_time_ms
    max_response_time_ms=$(echo "$max_response_time * 1000" | bc | cut -d. -f1)

    if [ "$response_time_ms" -le "$max_response_time_ms" ]; then
        log_success "$description (${response_time_ms}ms)"
    else
        log_warning "$description - Response time ${response_time_ms}ms exceeds ${max_response_time_ms}ms threshold"
    fi
}

# Security test
security_header_test() {
    local url="$1"
    local header="$2"
    local expected_value="$3"
    local description="$4"

    local header_value
    header_value=$(curl -s -I "$url" | grep -i "^$header:" | cut -d: -f2- | sed 's/^ *//' | tr -d '\r\n')

    if [ -n "$header_value" ]; then
        if [ -n "$expected_value" ]; then
            if [[ "$header_value" =~ $expected_value ]]; then
                log_success "$description (value: $header_value)"
            else
                log_warning "$description - Unexpected value: $header_value"
            fi
        else
            log_success "$description (present)"
        fi
    else
        log_error "$description - Header missing"
    fi
}

# Start validation
main() {
    echo -e "${BLUE}🚀 Tyler Setup Platform - Production Validation${NC}"
    echo -e "${BLUE}=================================================${NC}\n"
    echo "Validation started at: $(date)" | tee "$VALIDATION_LOG"
    echo "Domain: $DOMAIN_NAME" | tee -a "$VALIDATION_LOG"
    echo "API Domain: $API_DOMAIN_NAME" | tee -a "$VALIDATION_LOG"
    echo "AWS Region: $AWS_REGION" | tee -a "$VALIDATION_LOG"
    echo "" | tee -a "$VALIDATION_LOG"

    # Test 1: DNS Resolution
    echo -e "${BLUE}🌐 DNS Resolution Tests${NC}"
    echo "----------------------------------------"
    log_test "DNS resolution for main domain"
    dns_test "$DOMAIN_NAME" "A" "Main domain DNS resolution"

    log_test "DNS resolution for API domain"
    dns_test "$API_DOMAIN_NAME" "A" "API domain DNS resolution"

    log_test "DNS resolution for www subdomain"
    dns_test "www.$DOMAIN_NAME" "CNAME" "WWW subdomain DNS resolution"

    # Test 2: SSL Certificates
    echo -e "\n${BLUE}🔒 SSL Certificate Tests${NC}"
    echo "----------------------------------------"
    log_test "SSL certificate for main domain"
    ssl_test "$DOMAIN_NAME" "Main domain SSL certificate"

    log_test "SSL certificate for API domain"
    ssl_test "$API_DOMAIN_NAME" "API domain SSL certificate"

    # Test 3: Frontend Tests
    echo -e "\n${BLUE}🌐 Frontend Tests${NC}"
    echo "----------------------------------------"
    log_test "Frontend availability"
    http_test "https://$DOMAIN_NAME" 200 "Frontend main page"

    log_test "Frontend performance"
    performance_test "https://$DOMAIN_NAME" 2.0 "Frontend response time"

    log_test "Static assets"
    http_test "https://$DOMAIN_NAME/favicon.ico" 200 "Favicon availability"

    # Test 4: API Tests
    echo -e "\n${BLUE}🔌 API Tests${NC}"
    echo "----------------------------------------"
    log_test "API health check"
    http_test "https://$API_DOMAIN_NAME/health" 200 "API health endpoint"

    log_test "GraphQL endpoint"
    json_api_test "https://$API_DOMAIN_NAME/graphql" ".data" "GraphQL introspection" "POST" '{"query":"query{__typename}"}'

    log_test "API performance"
    performance_test "https://$API_DOMAIN_NAME/health" 1.0 "API response time"

    # Test 5: Security Headers
    echo -e "\n${BLUE}🛡️  Security Headers Tests${NC}"
    echo "----------------------------------------"
    log_test "Security headers on frontend"
    security_header_test "https://$DOMAIN_NAME" "X-Frame-Options" "DENY" "X-Frame-Options header"
    security_header_test "https://$DOMAIN_NAME" "X-Content-Type-Options" "nosniff" "X-Content-Type-Options header"
    security_header_test "https://$DOMAIN_NAME" "X-XSS-Protection" "1" "X-XSS-Protection header"
    security_header_test "https://$DOMAIN_NAME" "Strict-Transport-Security" "" "HSTS header"
    security_header_test "https://$DOMAIN_NAME" "Content-Security-Policy" "" "CSP header"

    log_test "Security headers on API"
    security_header_test "https://$API_DOMAIN_NAME/health" "X-Frame-Options" "DENY" "API X-Frame-Options header"
    security_header_test "https://$API_DOMAIN_NAME/health" "X-Content-Type-Options" "nosniff" "API X-Content-Type-Options header"

    # Test 6: WebSocket Tests
    echo -e "\n${BLUE}🔌 WebSocket Tests${NC}"
    echo "----------------------------------------"
    log_test "WebSocket endpoint availability"
    websocket_test "wss://$API_DOMAIN_NAME:8080" "WebSocket connection"

    # Test 7: AWS Infrastructure Tests
    echo -e "\n${BLUE}☁️  AWS Infrastructure Tests${NC}"
    echo "----------------------------------------"

    if command -v aws >/dev/null 2>&1; then
        log_test "ECS service status"
        aws_service_test "ECS" "ECS service health" \
            "aws ecs describe-services --cluster $PROJECT_NAME-cluster --services $PROJECT_NAME-blue --region $AWS_REGION --query 'services[0].runningCount'"

        log_test "RDS instance status"
        aws_service_test "RDS" "RDS instance availability" \
            "aws rds describe-db-instances --db-instance-identifier $PROJECT_NAME-db --region $AWS_REGION --query 'DBInstances[0].DBInstanceStatus'"

        log_test "ElastiCache cluster status"
        aws_service_test "ElastiCache" "Redis cluster health" \
            "aws elasticache describe-replication-groups --replication-group-id $PROJECT_NAME-redis --region $AWS_REGION --query 'ReplicationGroups[0].Status'"

        log_test "CloudFront distribution"
        aws_service_test "CloudFront" "CloudFront distribution status" \
            "aws cloudfront list-distributions --region us-east-1 --query 'DistributionList.Items[?contains(Comment, \`$PROJECT_NAME\`)].Status'"

        log_test "WAF web ACL"
        aws_service_test "WAF" "WAF rules active" \
            "aws wafv2 get-web-acl --scope REGIONAL --id \$(aws wafv2 list-web-acls --scope REGIONAL --region $AWS_REGION --query 'WebACLs[?contains(Name, \`$PROJECT_NAME\`)].Id' --output text) --region $AWS_REGION"
    else
        log_warning "AWS CLI not available - skipping AWS infrastructure tests"
    fi

    # Test 8: Performance and Load Tests
    echo -e "\n${BLUE}⚡ Performance Tests${NC}"
    echo "----------------------------------------"
    log_test "Frontend load time"
    performance_test "https://$DOMAIN_NAME" 3.0 "Frontend full load time"

    log_test "API response time"
    performance_test "https://$API_DOMAIN_NAME/health" 0.5 "API health check response time"

    log_test "GraphQL query performance"
    performance_test "https://$API_DOMAIN_NAME/graphql" 2.0 "GraphQL query response time"

    # Test 9: Monitoring and Logging
    echo -e "\n${BLUE}📊 Monitoring Tests${NC}"
    echo "----------------------------------------"

    if command -v aws >/dev/null 2>&1; then
        log_test "CloudWatch log groups"
        aws_service_test "CloudWatch" "Application logs" \
            "aws logs describe-log-groups --log-group-name-prefix /ecs/$PROJECT_NAME --region $AWS_REGION"

        log_test "CloudWatch dashboard"
        aws_service_test "CloudWatch" "Monitoring dashboard" \
            "aws cloudwatch list-dashboards --region $AWS_REGION --query 'DashboardEntries[?contains(DashboardName, \`$PROJECT_NAME\`)].DashboardName'"
    else
        log_warning "AWS CLI not available - skipping monitoring tests"
    fi

    # Test 10: Business Logic Tests
    echo -e "\n${BLUE}🏢 Business Logic Tests${NC}"
    echo "----------------------------------------"
    log_test "GraphQL schema validation"
    json_api_test "https://$API_DOMAIN_NAME/graphql" ".data.__schema" "GraphQL schema introspection" "POST" '{"query":"query{__schema{types{name}}}"}'

    # Test 11: Mobile API Tests (if applicable)
    echo -e "\n${BLUE}📱 Mobile API Tests${NC}"
    echo "----------------------------------------"
    log_test "Mobile API version endpoint"
    http_test "https://$API_DOMAIN_NAME/api/v1/version" 200 "Mobile API version endpoint"

    # Test 12: Backup and Recovery Tests
    echo -e "\n${BLUE}💾 Backup and Recovery Tests${NC}"
    echo "----------------------------------------"

    if command -v aws >/dev/null 2>&1; then
        log_test "RDS automated backups"
        aws_service_test "RDS" "Automated backups enabled" \
            "aws rds describe-db-instances --db-instance-identifier $PROJECT_NAME-db --region $AWS_REGION --query 'DBInstances[0].BackupRetentionPeriod' | grep -v '^0$'"

        log_test "S3 versioning enabled"
        local s3_bucket
        s3_bucket=$(aws s3api list-buckets --query "Buckets[?contains(Name, '$PROJECT_NAME-frontend')].Name" --output text)
        if [ -n "$s3_bucket" ]; then
            aws_service_test "S3" "S3 bucket versioning" \
                "aws s3api get-bucket-versioning --bucket $s3_bucket --query 'Status'"
        else
            log_warning "S3 bucket not found for versioning test"
        fi
    else
        log_warning "AWS CLI not available - skipping backup tests"
    fi

    # Generate summary
    echo -e "\n${BLUE}📋 Validation Summary${NC}"
    echo "============================================"
    echo "Total Tests: $TESTS_RUN" | tee -a "$VALIDATION_LOG"
    echo "Passed: $TESTS_PASSED" | tee -a "$VALIDATION_LOG"
    echo "Failed: $TESTS_FAILED" | tee -a "$VALIDATION_LOG"
    echo "Critical Failures: $CRITICAL_FAILURES" | tee -a "$VALIDATION_LOG"

    local success_rate
    success_rate=$(echo "scale=1; $TESTS_PASSED * 100 / $TESTS_RUN" | bc 2>/dev/null || echo "0")
    echo "Success Rate: ${success_rate}%" | tee -a "$VALIDATION_LOG"

    echo "" | tee -a "$VALIDATION_LOG"
    echo "Validation completed at: $(date)" | tee -a "$VALIDATION_LOG"
    echo "Log file: $VALIDATION_LOG" | tee -a "$VALIDATION_LOG"

    # Final status
    if [ $CRITICAL_FAILURES -gt 0 ]; then
        echo -e "\n${RED}💥 CRITICAL FAILURES DETECTED - DEPLOYMENT NOT READY FOR PRODUCTION${NC}"
        echo -e "${RED}Please review and fix critical issues before going live.${NC}"
        exit 1
    elif [ $TESTS_FAILED -gt 0 ]; then
        echo -e "\n${YELLOW}⚠️  SOME TESTS FAILED - REVIEW REQUIRED${NC}"
        echo -e "${YELLOW}Consider fixing failed tests before production use.${NC}"
        exit 1
    else
        echo -e "\n${GREEN}🎉 ALL TESTS PASSED - DEPLOYMENT READY FOR PRODUCTION${NC}"
        echo -e "${GREEN}Platform validation completed successfully!${NC}"

        echo -e "\n${BLUE}🌐 Platform URLs:${NC}"
        echo "  Frontend: https://$DOMAIN_NAME"
        echo "  API: https://$API_DOMAIN_NAME"
        echo "  GraphQL: https://$API_DOMAIN_NAME/graphql"
        echo "  WebSocket: wss://$API_DOMAIN_NAME:8080"

        echo -e "\n${BLUE}📊 Next Steps:${NC}"
        echo "  1. Monitor CloudWatch dashboards"
        echo "  2. Set up alerting rules"
        echo "  3. Conduct user acceptance testing"
        echo "  4. Schedule regular security scans"
        echo "  5. Plan disaster recovery testing"

        exit 0
    fi
}

# Handle script interruption
trap 'echo -e "\n${YELLOW}Validation interrupted${NC}"; exit 1' INT TERM

# Ensure required tools are available
check_dependencies() {
    local missing_tools=()

    command -v curl >/dev/null 2>&1 || missing_tools+=("curl")
    command -v dig >/dev/null 2>&1 || missing_tools+=("dig")
    command -v openssl >/dev/null 2>&1 || missing_tools+=("openssl")
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")
    command -v bc >/dev/null 2>&1 || missing_tools+=("bc")

    if [ ${#missing_tools[@]} -ne 0 ]; then
        echo -e "${RED}Missing required tools: ${missing_tools[*]}${NC}"
        echo "Please install missing tools and try again"
        exit 1
    fi
}

# Run dependency check
check_dependencies

# Run main validation
main "$@"
