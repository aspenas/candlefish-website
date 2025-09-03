#!/bin/bash

# Deployment Verification Script for Candlefish Animation
# Comprehensive health checks and performance validation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
DOMAIN_NAME=${DOMAIN_NAME:-candlefish.ai}
TIMEOUT=${TIMEOUT:-30}
PERFORMANCE_THRESHOLD_FPS=${PERFORMANCE_THRESHOLD_FPS:-55}
MEMORY_THRESHOLD_MB=${MEMORY_THRESHOLD_MB:-50}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Track verification results
VERIFICATION_RESULTS=()
PERFORMANCE_RESULTS=()
FAILED_CHECKS=0
TOTAL_CHECKS=0

# Add result to tracking
add_result() {
    local check_name="$1"
    local status="$2"
    local details="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [[ "$status" == "PASS" ]]; then
        log_success "✅ $check_name"
        VERIFICATION_RESULTS+=("✅ $check_name: $details")
    elif [[ "$status" == "WARN" ]]; then
        log_warning "⚠️ $check_name"
        VERIFICATION_RESULTS+=("⚠️ $check_name: $details")
    else
        log_error "❌ $check_name"
        VERIFICATION_RESULTS+=("❌ $check_name: $details")
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    
    [[ -n "$details" ]] && log_info "   $details"
}

# Health check functions
check_basic_connectivity() {
    log_info "Checking basic connectivity..."
    
    # Main domain
    if curl -f -s --max-time "$TIMEOUT" "https://$DOMAIN_NAME" > /dev/null; then
        add_result "Main Domain Connectivity" "PASS" "https://$DOMAIN_NAME responds successfully"
    else
        add_result "Main Domain Connectivity" "FAIL" "https://$DOMAIN_NAME is not accessible"
    fi
    
    # Health endpoint
    local health_status=$(curl -s --max-time "$TIMEOUT" "https://$DOMAIN_NAME/api/health" || echo "ERROR")
    if [[ "$health_status" == *"ok"* ]] || [[ "$health_status" == *"healthy"* ]]; then
        add_result "Health Endpoint" "PASS" "Health check returns positive status"
    else
        add_result "Health Endpoint" "FAIL" "Health check failed or returned unexpected status"
    fi
}

check_candlefish_animation() {
    log_info "Checking Candlefish animation specific functionality..."
    
    # Check if animation assets are accessible
    local animation_js_status=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN_NAME/web/aquarium/candlefish.js")
    if [[ "$animation_js_status" == "200" ]]; then
        add_result "Animation Script" "PASS" "candlefish.js accessible (HTTP $animation_js_status)"
    else
        add_result "Animation Script" "FAIL" "candlefish.js not accessible (HTTP $animation_js_status)"
    fi
    
    # Check CSS assets
    local animation_css_status=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN_NAME/web/aquarium/candlefish.css")
    if [[ "$animation_css_status" == "200" ]]; then
        add_result "Animation Styles" "PASS" "candlefish.css accessible (HTTP $animation_css_status)"
    else
        add_result "Animation Styles" "FAIL" "candlefish.css not accessible (HTTP $animation_css_status)"
    fi
    
    # Check static fallback SVG
    local fallback_svg_status=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN_NAME/img/candlefish-static.svg")
    if [[ "$fallback_svg_status" == "200" ]]; then
        add_result "Fallback Animation" "PASS" "Static SVG fallback available"
    else
        add_result "Fallback Animation" "WARN" "Static SVG fallback may not be available"
    fi
}

check_api_endpoints() {
    log_info "Checking API endpoints..."
    
    # Get API Gateway ID
    local api_id=$(aws apigateway get-rest-apis \
        --query "items[?name=='${ENVIRONMENT}-candlefish-animation-api'].id" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$api_id" ]]; then
        local api_base_url="https://${api_id}.execute-api.${AWS_REGION}.amazonaws.com/${ENVIRONMENT}"
        
        # Analytics endpoint
        local analytics_status=$(curl -s -o /dev/null -w "%{http_code}" \
            -X OPTIONS "$api_base_url/analytics" \
            -H "Origin: https://$DOMAIN_NAME")
        
        if [[ "$analytics_status" == "200" ]]; then
            add_result "Analytics API CORS" "PASS" "Analytics API CORS configured correctly"
        else
            add_result "Analytics API CORS" "FAIL" "Analytics API CORS not working (HTTP $analytics_status)"
        fi
        
        # A/B Testing config endpoint
        local ab_config_status=$(curl -s -o /dev/null -w "%{http_code}" \
            -X GET "$api_base_url/ab-config" \
            -H "Origin: https://$DOMAIN_NAME")
        
        if [[ "$ab_config_status" == "200" || "$ab_config_status" == "404" ]]; then
            add_result "A/B Config API" "PASS" "A/B Config API accessible"
        else
            add_result "A/B Config API" "FAIL" "A/B Config API not accessible (HTTP $ab_config_status)"
        fi
        
    else
        add_result "API Gateway" "FAIL" "Could not find API Gateway for environment $ENVIRONMENT"
    fi
}

check_database_connectivity() {
    log_info "Checking database connectivity..."
    
    # Check DynamoDB tables
    local tables=(
        "${ENVIRONMENT}-candlefish-animation-analytics"
        "${ENVIRONMENT}-candlefish-memory" 
        "${ENVIRONMENT}-candlefish-ab-testing"
    )
    
    for table in "${tables[@]}"; do
        if aws dynamodb describe-table --table-name "$table" &> /dev/null; then
            local table_status=$(aws dynamodb describe-table --table-name "$table" \
                --query 'Table.TableStatus' --output text)
            if [[ "$table_status" == "ACTIVE" ]]; then
                add_result "DynamoDB Table: $table" "PASS" "Table status: $table_status"
            else
                add_result "DynamoDB Table: $table" "WARN" "Table status: $table_status (not ACTIVE)"
            fi
        else
            add_result "DynamoDB Table: $table" "FAIL" "Table not found or not accessible"
        fi
    done
}

check_lambda_functions() {
    log_info "Checking Lambda function health..."
    
    local functions=(
        "${ENVIRONMENT}-candlefish-analytics-processor"
        "${ENVIRONMENT}-candlefish-ab-config"
    )
    
    for function_name in "${functions[@]}"; do
        if aws lambda get-function --function-name "$function_name" &> /dev/null; then
            local function_state=$(aws lambda get-function --function-name "$function_name" \
                --query 'Configuration.State' --output text)
            if [[ "$function_state" == "Active" ]]; then
                add_result "Lambda Function: $function_name" "PASS" "Function state: $function_state"
            else
                add_result "Lambda Function: $function_name" "FAIL" "Function state: $function_state (not Active)"
            fi
        else
            add_result "Lambda Function: $function_name" "FAIL" "Function not found"
        fi
    done
}

check_cloudfront_distribution() {
    log_info "Checking CloudFront distribution..."
    
    local distribution_id=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?Aliases.Items[0]=='$DOMAIN_NAME'].Id" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$distribution_id" ]]; then
        local distribution_status=$(aws cloudfront get-distribution \
            --id "$distribution_id" \
            --query 'Distribution.Status' --output text)
        
        if [[ "$distribution_status" == "Deployed" ]]; then
            add_result "CloudFront Distribution" "PASS" "Distribution $distribution_id is deployed"
        else
            add_result "CloudFront Distribution" "WARN" "Distribution $distribution_id status: $distribution_status"
        fi
        
        # Check cache hit rates (last hour)
        local cache_hit_rate=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/CloudFront \
            --metric-name CacheHitRate \
            --dimensions Name=DistributionId,Value="$distribution_id" \
            --start-time "$(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%S')" \
            --end-time "$(date -u '+%Y-%m-%dT%H:%M:%S')" \
            --period 3600 \
            --statistics Average \
            --query 'Datapoints[0].Average' \
            --output text 2>/dev/null || echo "0")
        
        if [[ "$cache_hit_rate" != "None" ]] && (( $(echo "$cache_hit_rate > 80" | bc -l) )); then
            add_result "CloudFront Cache Performance" "PASS" "Cache hit rate: ${cache_hit_rate}%"
        elif [[ "$cache_hit_rate" != "None" ]]; then
            add_result "CloudFront Cache Performance" "WARN" "Cache hit rate: ${cache_hit_rate}% (below 80%)"
        else
            add_result "CloudFront Cache Performance" "WARN" "No recent cache metrics available"
        fi
    else
        add_result "CloudFront Distribution" "FAIL" "No CloudFront distribution found for $DOMAIN_NAME"
    fi
}

check_ssl_certificate() {
    log_info "Checking SSL certificate..."
    
    local cert_info=$(echo | openssl s_client -servername "$DOMAIN_NAME" -connect "$DOMAIN_NAME:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")
    
    if [[ -n "$cert_info" ]]; then
        local expiry_date=$(echo "$cert_info" | grep "notAfter" | cut -d'=' -f2)
        local days_until_expiry=$(( ($(date -d "$expiry_date" +%s) - $(date +%s)) / 86400 ))
        
        if [[ $days_until_expiry -gt 30 ]]; then
            add_result "SSL Certificate" "PASS" "Certificate valid for $days_until_expiry days"
        elif [[ $days_until_expiry -gt 7 ]]; then
            add_result "SSL Certificate" "WARN" "Certificate expires in $days_until_expiry days"
        else
            add_result "SSL Certificate" "FAIL" "Certificate expires in $days_until_expiry days"
        fi
    else
        add_result "SSL Certificate" "FAIL" "Unable to retrieve certificate information"
    fi
}

performance_test_animation() {
    log_info "Running animation performance tests..."
    
    # Use headless browser testing with Playwright/Puppeteer simulation
    cat > /tmp/candlefish-perf-test.js << 'EOF'
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Enable performance monitoring
  await page.evaluateOnNewDocument(() => {
    window.performanceData = {
      fps: [],
      memoryUsage: [],
      errorCount: 0
    };
    
    // Mock requestAnimationFrame to track FPS
    let lastTime = 0;
    let frameCount = 0;
    const originalRAF = window.requestAnimationFrame;
    
    window.requestAnimationFrame = function(callback) {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        window.performanceData.fps.push(frameCount);
        frameCount = 0;
        lastTime = currentTime;
      }
      
      return originalRAF.call(this, callback);
    };
    
    // Track memory usage
    setInterval(() => {
      if (performance.memory) {
        window.performanceData.memoryUsage.push(
          Math.round(performance.memory.usedJSHeapSize / 1048576) // MB
        );
      }
    }, 1000);
    
    // Track errors
    window.addEventListener('error', () => {
      window.performanceData.errorCount++;
    });
  });
  
  try {
    await page.goto(process.argv[2], { waitUntil: 'networkidle' });
    
    // Wait for animation to initialize
    await page.waitForTimeout(5000);
    
    // Simulate user interactions
    await page.mouse.move(200, 200);
    await page.waitForTimeout(1000);
    await page.click(300, 300);
    await page.waitForTimeout(2000);
    
    // Get performance data
    const perfData = await page.evaluate(() => window.performanceData);
    
    console.log(JSON.stringify(perfData));
    
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
  } finally {
    await browser.close();
  }
})();
EOF
    
    # Check if we have the necessary tools
    if command -v node &> /dev/null && npm list playwright &> /dev/null; then
        local perf_result=$(timeout 30 node /tmp/candlefish-perf-test.js "https://$DOMAIN_NAME" 2>/dev/null || echo '{"error":"timeout"}')
        
        if [[ "$perf_result" == *'"error"'* ]]; then
            add_result "Animation Performance Test" "WARN" "Performance test could not complete"
        else
            local avg_fps=$(echo "$perf_result" | jq -r '.fps | if length > 0 then (add / length) else 0 end' 2>/dev/null || echo "0")
            local max_memory=$(echo "$perf_result" | jq -r '.memoryUsage | if length > 0 then max else 0 end' 2>/dev/null || echo "0")
            local error_count=$(echo "$perf_result" | jq -r '.errorCount // 0' 2>/dev/null || echo "0")
            
            PERFORMANCE_RESULTS+=("Average FPS: $avg_fps")
            PERFORMANCE_RESULTS+=("Peak Memory: ${max_memory}MB")
            PERFORMANCE_RESULTS+=("JavaScript Errors: $error_count")
            
            if (( $(echo "$avg_fps >= $PERFORMANCE_THRESHOLD_FPS" | bc -l) )) && [[ "$error_count" == "0" ]]; then
                add_result "Animation Performance" "PASS" "FPS: $avg_fps, Memory: ${max_memory}MB, Errors: $error_count"
            elif (( $(echo "$avg_fps >= 30" | bc -l) )); then
                add_result "Animation Performance" "WARN" "FPS: $avg_fps (below target $PERFORMANCE_THRESHOLD_FPS), Memory: ${max_memory}MB, Errors: $error_count"
            else
                add_result "Animation Performance" "FAIL" "FPS: $avg_fps (critically low), Memory: ${max_memory}MB, Errors: $error_count"
            fi
        fi
    else
        add_result "Animation Performance Test" "WARN" "Performance testing tools not available"
    fi
    
    rm -f /tmp/candlefish-perf-test.js
}

check_monitoring_alerts() {
    log_info "Checking monitoring and alerting setup..."
    
    # Check CloudWatch alarms
    local alarms=$(aws cloudwatch describe-alarms \
        --alarm-name-prefix "${ENVIRONMENT}-candlefish" \
        --state-value ALARM \
        --query 'MetricAlarms[].AlarmName' \
        --output text 2>/dev/null || echo "")
    
    if [[ -z "$alarms" ]]; then
        add_result "CloudWatch Alarms" "PASS" "No active alarms"
    else
        add_result "CloudWatch Alarms" "WARN" "Active alarms: $alarms"
    fi
    
    # Check if SNS topic exists for alerts
    local sns_topic=$(aws sns list-topics \
        --query "Topics[?contains(TopicArn, '${ENVIRONMENT}-candlefish-animation-alerts')].TopicArn" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$sns_topic" ]]; then
        add_result "SNS Alert Topic" "PASS" "Alert topic configured"
    else
        add_result "SNS Alert Topic" "WARN" "No SNS alert topic found"
    fi
}

generate_verification_report() {
    local report_file="verification-report-$(date +%Y%m%d-%H%M%S).txt"
    local success_rate=$((((TOTAL_CHECKS - FAILED_CHECKS) * 100) / TOTAL_CHECKS))
    
    cat > "$report_file" << EOF
CANDLEFISH ANIMATION DEPLOYMENT VERIFICATION REPORT
==================================================
Date: $(date)
Environment: $ENVIRONMENT
Domain: $DOMAIN_NAME
Success Rate: $success_rate% ($((TOTAL_CHECKS - FAILED_CHECKS))/$TOTAL_CHECKS checks passed)
Status: $([ $FAILED_CHECKS -eq 0 ] && echo "✅ HEALTHY" || echo "⚠️ ISSUES DETECTED")

VERIFICATION RESULTS:
$(printf '%s\n' "${VERIFICATION_RESULTS[@]}")

PERFORMANCE METRICS:
$(printf '%s\n' "${PERFORMANCE_RESULTS[@]}")

SUMMARY:
- Total Checks: $TOTAL_CHECKS
- Passed: $((TOTAL_CHECKS - FAILED_CHECKS))
- Failed: $FAILED_CHECKS
- Success Rate: $success_rate%

RECOMMENDATIONS:
$([ $FAILED_CHECKS -eq 0 ] && echo "✅ Deployment is healthy and ready for production traffic" || echo "⚠️ Address failed checks before promoting to full traffic")

NEXT STEPS:
1. Monitor application metrics for next 15-30 minutes
2. Review CloudWatch logs for any errors
3. $([ $FAILED_CHECKS -eq 0 ] && echo "Deploy to production" || echo "Fix issues and re-verify")
EOF

    echo "$report_file"
}

# Main verification process
main() {
    log_info "🔍 Starting Candlefish Animation Deployment Verification"
    log_info "Environment: $ENVIRONMENT | Domain: $DOMAIN_NAME"
    
    START_TIME=$(date +%s)
    
    # Run all verification checks
    check_basic_connectivity
    check_candlefish_animation
    check_api_endpoints
    check_database_connectivity
    check_lambda_functions
    check_cloudfront_distribution
    check_ssl_certificate
    performance_test_animation
    check_monitoring_alerts
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    # Generate report
    REPORT_FILE=$(generate_verification_report)
    
    log_info "Verification completed in ${DURATION} seconds"
    log_info "Report saved to: $REPORT_FILE"
    
    # Final status
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        log_success "🎉 All verification checks passed! Deployment is healthy."
        exit 0
    else
        log_error "💥 $FAILED_CHECKS verification check(s) failed. Review issues before proceeding."
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --domain)
            DOMAIN_NAME="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --fps-threshold)
            PERFORMANCE_THRESHOLD_FPS="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --environment ENV    Target environment (default: production)"
            echo "  --domain DOMAIN      Domain name (default: candlefish.ai)"
            echo "  --timeout SECONDS    Request timeout (default: 30)"
            echo "  --fps-threshold FPS  Minimum FPS threshold (default: 55)"
            echo "  --help               Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Execute main function
main