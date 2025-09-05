#!/bin/bash

# Deployment Verification Script for Candlefish Website
# Provides comprehensive verification of deployment success and system health

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
DOMAIN_NAME=${DOMAIN_NAME:-candlefish.ai}
NAMESPACE=${NAMESPACE:-production}
SERVICE_NAME=${SERVICE_NAME:-candlefish-website}

# Verification configuration
VERIFICATION_TIMEOUT=${VERIFICATION_TIMEOUT:-600} # 10 minutes
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-30}
MIN_RESPONSE_TIME=${MIN_RESPONSE_TIME:-50} # 50ms minimum
MAX_RESPONSE_TIME=${MAX_RESPONSE_TIME:-3000} # 3 seconds maximum
MIN_SUCCESS_RATE=${MIN_SUCCESS_RATE:-95} # 95% minimum success rate

# Test configuration
LOAD_TEST_USERS=${LOAD_TEST_USERS:-10}
LOAD_TEST_DURATION=${LOAD_TEST_DURATION:-60}
SMOKE_TEST_ITERATIONS=${SMOKE_TEST_ITERATIONS:-5}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a deployment-verification.log
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a deployment-verification.log
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a deployment-verification.log
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a deployment-verification.log
}

log_verify() {
    echo -e "${PURPLE}[VERIFY]${NC} $1" | tee -a deployment-verification.log
}

# Global verification results
declare -A VERIFICATION_RESULTS
declare -A VERIFICATION_DETAILS
declare -A VERIFICATION_METRICS

# Initialize verification report
init_verification_report() {
    cat > verification-report.json << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "domain": "$DOMAIN_NAME",
    "deployment_status": "verifying",
    "verifications": {},
    "overall_score": 0,
    "summary": {
        "total_checks": 0,
        "passed": 0,
        "failed": 0,
        "warnings": 0
    }
}
EOF
}

# Update verification report
update_verification_report() {
    local check_name="$1"
    local status="$2"
    local details="$3"
    local metrics="$4"
    
    jq --arg check "$check_name" \
       --arg status "$status" \
       --arg details "$details" \
       --arg metrics "$metrics" \
       --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '.verifications[$check] = {
           "status": $status,
           "details": $details,
           "metrics": ($metrics | try fromjson catch {}),
           "timestamp": $timestamp
       }' verification-report.json > verification-report.tmp && mv verification-report.tmp verification-report.json
}

# Notification function
notify_verification() {
    local status="$1"
    local details="$2"
    local color="${3:-good}"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"🔍 Deployment Verification - $status\",
                    \"text\": \"$details\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"Domain\", \"value\": \"$DOMAIN_NAME\", \"short\": true},
                        {\"title\": \"Service\", \"value\": \"$SERVICE_NAME\", \"short\": true},
                        {\"title\": \"Timestamp\", \"value\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"short\": true}
                    ],
                    \"footer\": \"Candlefish Verification Pipeline\"
                }]
            }" \
            --silent || log_warning "Failed to send verification notification"
    fi
}

# Basic connectivity verification
verify_basic_connectivity() {
    log_verify "Verifying basic connectivity to $DOMAIN_NAME"
    
    local start_time=$(date +%s%N)
    local http_status
    local response_time
    
    # Test HTTPS connectivity
    http_status=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time 30 \
        --retry 3 \
        --retry-delay 5 \
        "https://$DOMAIN_NAME/" || echo "000")
    
    local end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    local metrics="{\"response_time\": $response_time, \"http_status\": \"$http_status\"}"
    
    if [[ "$http_status" == "200" ]]; then
        VERIFICATION_RESULTS["connectivity"]="passed"
        VERIFICATION_DETAILS["connectivity"]="HTTPS connectivity successful (${response_time}ms)"
        update_verification_report "basic_connectivity" "passed" "HTTPS accessible" "$metrics"
        log_success "Basic connectivity verified: HTTP $http_status in ${response_time}ms"
        return 0
    else
        VERIFICATION_RESULTS["connectivity"]="failed"
        VERIFICATION_DETAILS["connectivity"]="HTTPS connectivity failed: HTTP $http_status"
        update_verification_report "basic_connectivity" "failed" "HTTPS not accessible" "$metrics"
        log_error "Basic connectivity failed: HTTP $http_status"
        return 1
    fi
}

# Health endpoint verification
verify_health_endpoints() {
    log_verify "Verifying health endpoints"
    
    local endpoints=(
        "/health"
        "/api/health"
        "/api/status"
    )
    
    local passed_endpoints=0
    local total_endpoints=${#endpoints[@]}
    
    for endpoint in "${endpoints[@]}"; do
        local url="https://$DOMAIN_NAME$endpoint"
        local http_status=$(curl -s -o /dev/null -w "%{http_code}" \
            --max-time 10 \
            "$url" || echo "000")
        
        if [[ "$http_status" == "200" ]]; then
            log_success "Health endpoint OK: $endpoint (HTTP $http_status)"
            passed_endpoints=$((passed_endpoints + 1))
        else
            log_warning "Health endpoint failed: $endpoint (HTTP $http_status)"
        fi
    done
    
    local metrics="{\"passed_endpoints\": $passed_endpoints, \"total_endpoints\": $total_endpoints}"
    
    if [[ $passed_endpoints -gt 0 ]]; then
        VERIFICATION_RESULTS["health"]="passed"
        VERIFICATION_DETAILS["health"]="$passed_endpoints/$total_endpoints health endpoints responding"
        update_verification_report "health_endpoints" "passed" "Health endpoints accessible" "$metrics"
        log_success "Health endpoints verified: $passed_endpoints/$total_endpoints responding"
        return 0
    else
        VERIFICATION_RESULTS["health"]="failed"
        VERIFICATION_DETAILS["health"]="No health endpoints responding"
        update_verification_report "health_endpoints" "failed" "Health endpoints not accessible" "$metrics"
        log_error "Health endpoints failed: No endpoints responding"
        return 1
    fi
}

# Critical user journey verification
verify_critical_paths() {
    log_verify "Verifying critical user journeys"
    
    local critical_paths=(
        "/"
        "/workshop"
        "/atelier"
        "/api/health"
    )
    
    local passed_paths=0
    local total_paths=${#critical_paths[@]}
    local total_response_time=0
    
    for path in "${critical_paths[@]}"; do
        local url="https://$DOMAIN_NAME$path"
        local start_time=$(date +%s%N)
        local http_status
        
        http_status=$(curl -s -o /dev/null -w "%{http_code}" \
            --max-time 15 \
            --user-agent "Candlefish-Verification/1.0" \
            "$url" || echo "000")
        
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))
        total_response_time=$((total_response_time + response_time))
        
        if [[ "$http_status" == "200" ]]; then
            log_success "Critical path OK: $path (HTTP $http_status, ${response_time}ms)"
            passed_paths=$((passed_paths + 1))
        else
            log_error "Critical path failed: $path (HTTP $http_status, ${response_time}ms)"
        fi
        
        # Brief delay between requests
        sleep 2
    done
    
    local avg_response_time=$((total_response_time / total_paths))
    local success_rate=$((passed_paths * 100 / total_paths))
    
    local metrics="{\"passed_paths\": $passed_paths, \"total_paths\": $total_paths, \"success_rate\": $success_rate, \"avg_response_time\": $avg_response_time}"
    
    if [[ $success_rate -ge $MIN_SUCCESS_RATE ]]; then
        VERIFICATION_RESULTS["critical_paths"]="passed"
        VERIFICATION_DETAILS["critical_paths"]="Critical paths verified ($success_rate% success rate)"
        update_verification_report "critical_paths" "passed" "Critical journeys working" "$metrics"
        log_success "Critical paths verified: $success_rate% success rate, ${avg_response_time}ms avg response time"
        return 0
    else
        VERIFICATION_RESULTS["critical_paths"]="failed"
        VERIFICATION_DETAILS["critical_paths"]="Critical paths failed ($success_rate% success rate below $MIN_SUCCESS_RATE%)"
        update_verification_report "critical_paths" "failed" "Critical journeys failing" "$metrics"
        log_error "Critical paths failed: $success_rate% success rate below $MIN_SUCCESS_RATE%"
        return 1
    fi
}

# Performance verification
verify_performance() {
    log_verify "Verifying performance characteristics"
    
    local test_url="https://$DOMAIN_NAME/"
    local iterations=5
    local response_times=()
    local successful_requests=0
    
    for ((i=1; i<=iterations; i++)); do
        log_info "Performance test $i/$iterations"
        
        local start_time=$(date +%s%N)
        local http_status
        
        http_status=$(curl -s -o /dev/null -w "%{http_code}" \
            --max-time 10 \
            "$test_url" || echo "000")
        
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))
        
        if [[ "$http_status" == "200" ]]; then
            successful_requests=$((successful_requests + 1))
            response_times+=($response_time)
            log_info "Request $i: HTTP $http_status in ${response_time}ms"
        else
            log_warning "Request $i failed: HTTP $http_status"
        fi
        
        sleep 3
    done
    
    if [[ ${#response_times[@]} -eq 0 ]]; then
        VERIFICATION_RESULTS["performance"]="failed"
        VERIFICATION_DETAILS["performance"]="No successful performance measurements"
        update_verification_report "performance" "failed" "Performance tests failed" "{}"
        log_error "Performance verification failed: No successful requests"
        return 1
    fi
    
    # Calculate performance metrics
    local total_time=0
    local min_time=${response_times[0]}
    local max_time=${response_times[0]}
    
    for time in "${response_times[@]}"; do
        total_time=$((total_time + time))
        if [[ $time -lt $min_time ]]; then
            min_time=$time
        fi
        if [[ $time -gt $max_time ]]; then
            max_time=$time
        fi
    done
    
    local avg_time=$((total_time / ${#response_times[@]}))
    local success_rate=$((successful_requests * 100 / iterations))
    
    local metrics="{\"avg_response_time\": $avg_time, \"min_response_time\": $min_time, \"max_response_time\": $max_time, \"success_rate\": $success_rate, \"total_requests\": $iterations}"
    
    # Evaluate performance
    local performance_status="passed"
    local performance_issues=()
    
    if [[ $avg_time -gt $MAX_RESPONSE_TIME ]]; then
        performance_status="failed"
        performance_issues+=("Average response time ${avg_time}ms exceeds threshold ${MAX_RESPONSE_TIME}ms")
    fi
    
    if [[ $max_time -gt $((MAX_RESPONSE_TIME * 2)) ]]; then
        performance_status="warning"
        performance_issues+=("Maximum response time ${max_time}ms is concerning")
    fi
    
    if [[ $success_rate -lt $MIN_SUCCESS_RATE ]]; then
        performance_status="failed"
        performance_issues+=("Success rate ${success_rate}% below threshold ${MIN_SUCCESS_RATE}%")
    fi
    
    if [[ ${#performance_issues[@]} -gt 0 ]]; then
        local issues_string=$(IFS=', '; echo "${performance_issues[*]}")
        VERIFICATION_RESULTS["performance"]="$performance_status"
        VERIFICATION_DETAILS["performance"]="Performance issues: $issues_string"
        update_verification_report "performance" "$performance_status" "Performance concerns detected" "$metrics"
        log_warning "Performance verification: $issues_string"
    else
        VERIFICATION_RESULTS["performance"]="passed"
        VERIFICATION_DETAILS["performance"]="Performance within acceptable limits (avg: ${avg_time}ms)"
        update_verification_report "performance" "passed" "Performance is acceptable" "$metrics"
        log_success "Performance verified: avg ${avg_time}ms, min ${min_time}ms, max ${max_time}ms"
    fi
    
    return 0
}

# SSL certificate verification
verify_ssl_certificate() {
    log_verify "Verifying SSL certificate"
    
    # Check SSL certificate expiry
    local cert_info
    cert_info=$(echo | openssl s_client -servername "$DOMAIN_NAME" -connect "$DOMAIN_NAME":443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")
    
    if [[ -z "$cert_info" ]]; then
        VERIFICATION_RESULTS["ssl"]="failed"
        VERIFICATION_DETAILS["ssl"]="Cannot retrieve SSL certificate"
        update_verification_report "ssl_certificate" "failed" "SSL certificate not accessible" "{}"
        log_error "SSL verification failed: Cannot retrieve certificate"
        return 1
    fi
    
    # Extract expiry information
    local not_after=$(echo "$cert_info" | grep "notAfter" | cut -d'=' -f2)
    local expiry_timestamp=$(date -d "$not_after" +%s 2>/dev/null || echo 0)
    local current_timestamp=$(date +%s)
    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    # Check SSL configuration
    local ssl_score
    ssl_score=$(curl -s "https://api.ssllabs.com/api/v3/analyze?host=$DOMAIN_NAME&publish=off&startNew=on&all=done" | jq -r '.endpoints[0].grade // "Unknown"' 2>/dev/null || echo "Unknown")
    
    local metrics="{\"days_until_expiry\": $days_until_expiry, \"expiry_date\": \"$not_after\", \"ssl_grade\": \"$ssl_score\"}"
    
    if [[ $days_until_expiry -le 0 ]]; then
        VERIFICATION_RESULTS["ssl"]="failed"
        VERIFICATION_DETAILS["ssl"]="SSL certificate expired"
        update_verification_report "ssl_certificate" "failed" "SSL certificate expired" "$metrics"
        log_error "SSL verification failed: Certificate expired"
        return 1
    elif [[ $days_until_expiry -le 30 ]]; then
        VERIFICATION_RESULTS["ssl"]="warning"
        VERIFICATION_DETAILS["ssl"]="SSL certificate expires in $days_until_expiry days"
        update_verification_report "ssl_certificate" "warning" "SSL certificate expires soon" "$metrics"
        log_warning "SSL verification warning: Certificate expires in $days_until_expiry days"
    else
        VERIFICATION_RESULTS["ssl"]="passed"
        VERIFICATION_DETAILS["ssl"]="SSL certificate valid for $days_until_expiry days"
        update_verification_report "ssl_certificate" "passed" "SSL certificate is valid" "$metrics"
        log_success "SSL verified: Certificate valid for $days_until_expiry days"
    fi
    
    return 0
}

# Kubernetes deployment verification
verify_kubernetes_deployment() {
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available - skipping Kubernetes verification"
        return 0
    fi
    
    log_verify "Verifying Kubernetes deployment"
    
    # Check if deployment exists
    if ! kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" &>/dev/null; then
        VERIFICATION_RESULTS["k8s"]="failed"
        VERIFICATION_DETAILS["k8s"]="Deployment not found"
        update_verification_report "kubernetes_deployment" "failed" "Deployment not found" "{}"
        log_error "Kubernetes verification failed: Deployment not found"
        return 1
    fi
    
    # Get deployment status
    local ready_replicas=$(kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
    local desired_replicas=$(kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.status.replicas}' 2>/dev/null || echo 0)
    local updated_replicas=$(kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.status.updatedReplicas}' 2>/dev/null || echo 0)
    local available_replicas=$(kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.status.availableReplicas}' 2>/dev/null || echo 0)
    
    # Get pod status
    local pod_status=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" -o jsonpath='{.items[*].status.phase}' 2>/dev/null || echo "")
    local running_pods=$(echo "$pod_status" | tr ' ' '\n' | grep -c "Running" || echo 0)
    
    local metrics="{\"ready_replicas\": $ready_replicas, \"desired_replicas\": $desired_replicas, \"updated_replicas\": $updated_replicas, \"available_replicas\": $available_replicas, \"running_pods\": $running_pods}"
    
    # Evaluate deployment health
    if [[ $ready_replicas -eq 0 ]]; then
        VERIFICATION_RESULTS["k8s"]="failed"
        VERIFICATION_DETAILS["k8s"]="No ready replicas"
        update_verification_report "kubernetes_deployment" "failed" "No ready replicas" "$metrics"
        log_error "Kubernetes verification failed: No ready replicas"
        return 1
    elif [[ $ready_replicas -ne $desired_replicas ]]; then
        VERIFICATION_RESULTS["k8s"]="warning"
        VERIFICATION_DETAILS["k8s"]="Partial deployment: $ready_replicas/$desired_replicas ready"
        update_verification_report "kubernetes_deployment" "warning" "Deployment partially ready" "$metrics"
        log_warning "Kubernetes verification warning: $ready_replicas/$desired_replicas replicas ready"
    else
        VERIFICATION_RESULTS["k8s"]="passed"
        VERIFICATION_DETAILS["k8s"]="All replicas ready and available"
        update_verification_report "kubernetes_deployment" "passed" "Deployment is healthy" "$metrics"
        log_success "Kubernetes verified: $ready_replicas/$desired_replicas replicas ready"
    fi
    
    return 0
}

# Database connectivity verification
verify_database_connectivity() {
    log_verify "Verifying database connectivity"
    
    # Test database through API endpoint
    local db_health_url="https://$DOMAIN_NAME/api/health/database"
    local db_status=$(curl -s -o /tmp/db_response.json -w "%{http_code}" \
        --max-time 15 \
        "$db_health_url" 2>/dev/null || echo "000")
    
    if [[ "$db_status" == "200" ]]; then
        local db_response_time=$(jq -r '.response_time // "unknown"' /tmp/db_response.json 2>/dev/null || echo "unknown")
        VERIFICATION_RESULTS["database"]="passed"
        VERIFICATION_DETAILS["database"]="Database connectivity verified (${db_response_time}ms)"
        update_verification_report "database_connectivity" "passed" "Database is accessible" "{\"response_time\": \"$db_response_time\"}"
        log_success "Database verified: Connectivity confirmed"
        return 0
    else
        VERIFICATION_RESULTS["database"]="warning"
        VERIFICATION_DETAILS["database"]="Database health endpoint not available (HTTP $db_status)"
        update_verification_report "database_connectivity" "warning" "Database health endpoint unavailable" "{\"http_status\": \"$db_status\"}"
        log_warning "Database verification: Health endpoint not available (HTTP $db_status)"
        return 0
    fi
}

# Load test verification
verify_load_handling() {
    if ! command -v ab &> /dev/null && ! command -v wrk &> /dev/null; then
        log_warning "No load testing tools available - skipping load verification"
        return 0
    fi
    
    log_verify "Verifying load handling capabilities"
    
    local test_url="https://$DOMAIN_NAME/"
    local concurrent_users=5
    local total_requests=25
    
    # Use Apache Bench if available
    if command -v ab &> /dev/null; then
        log_info "Running load test: $total_requests requests with $concurrent_users concurrent users"
        
        local ab_output
        ab_output=$(ab -n $total_requests -c $concurrent_users -q "$test_url" 2>/dev/null || echo "")
        
        if [[ -n "$ab_output" ]]; then
            local requests_per_second=$(echo "$ab_output" | grep "Requests per second" | awk '{print $4}' || echo "0")
            local time_per_request=$(echo "$ab_output" | grep "Time per request:" | head -1 | awk '{print $4}' || echo "0")
            local failed_requests=$(echo "$ab_output" | grep "Failed requests:" | awk '{print $3}' || echo "0")
            
            local success_rate=$(( (total_requests - failed_requests) * 100 / total_requests ))
            
            local metrics="{\"requests_per_second\": $requests_per_second, \"time_per_request\": $time_per_request, \"failed_requests\": $failed_requests, \"success_rate\": $success_rate}"
            
            if [[ $success_rate -ge $MIN_SUCCESS_RATE ]] && [[ $(echo "$time_per_request < $MAX_RESPONSE_TIME" | bc -l) -eq 1 ]]; then
                VERIFICATION_RESULTS["load"]="passed"
                VERIFICATION_DETAILS["load"]="Load test passed: ${success_rate}% success rate, ${requests_per_second} req/sec"
                update_verification_report "load_handling" "passed" "Load test successful" "$metrics"
                log_success "Load test verified: ${success_rate}% success rate, ${requests_per_second} req/sec"
            else
                VERIFICATION_RESULTS["load"]="warning"
                VERIFICATION_DETAILS["load"]="Load test concerns: ${success_rate}% success rate, ${time_per_request}ms avg"
                update_verification_report "load_handling" "warning" "Load test shows concerns" "$metrics"
                log_warning "Load test warning: ${success_rate}% success rate, ${time_per_request}ms avg response time"
            fi
        else
            log_warning "Load test failed to execute properly"
        fi
    fi
    
    return 0
}

# Calculate overall verification score
calculate_verification_score() {
    local total_checks=0
    local passed_checks=0
    local failed_checks=0
    local warning_checks=0
    
    for result in "${VERIFICATION_RESULTS[@]}"; do
        total_checks=$((total_checks + 1))
        case "$result" in
            "passed")
                passed_checks=$((passed_checks + 1))
                ;;
            "failed")
                failed_checks=$((failed_checks + 1))
                ;;
            "warning")
                warning_checks=$((warning_checks + 1))
                ;;
        esac
    done
    
    # Calculate score (0-100)
    local score=0
    if [[ $total_checks -gt 0 ]]; then
        score=$(( (passed_checks * 100 + warning_checks * 50) / total_checks ))
    fi
    
    # Update final report
    jq --arg score "$score" \
       --arg total "$total_checks" \
       --arg passed "$passed_checks" \
       --arg failed "$failed_checks" \
       --arg warnings "$warning_checks" \
       --arg status "$(get_overall_status $score $failed_checks)" \
       '.overall_score = ($score | tonumber) |
        .summary.total_checks = ($total | tonumber) |
        .summary.passed = ($passed | tonumber) |
        .summary.failed = ($failed | tonumber) |
        .summary.warnings = ($warnings | tonumber) |
        .deployment_status = $status' verification-report.json > verification-report.tmp && mv verification-report.tmp verification-report.json
    
    echo "$score"
}

# Get overall deployment status
get_overall_status() {
    local score="$1"
    local failed_checks="$2"
    
    if [[ $failed_checks -gt 0 ]]; then
        echo "failed"
    elif [[ $score -ge 90 ]]; then
        echo "excellent"
    elif [[ $score -ge 80 ]]; then
        echo "good"
    elif [[ $score -ge 70 ]]; then
        echo "acceptable"
    else
        echo "poor"
    fi
}

# Main verification function
main() {
    local verification_start_time=$(date +%s)
    
    log_info "🔍 STARTING DEPLOYMENT VERIFICATION"
    log_info "Environment: $ENVIRONMENT"
    log_info "Domain: $DOMAIN_NAME"
    log_info "Service: $SERVICE_NAME"
    log_info "Verification timeout: ${VERIFICATION_TIMEOUT}s"
    
    # Initialize verification report
    init_verification_report
    
    notify_verification "Started" "Deployment verification initiated for $DOMAIN_NAME" "good"
    
    # Run verification tests
    log_info "=== RUNNING VERIFICATION TESTS ==="
    
    verify_basic_connectivity || true
    verify_health_endpoints || true
    verify_critical_paths || true
    verify_performance || true
    verify_ssl_certificate || true
    verify_kubernetes_deployment || true
    verify_database_connectivity || true
    verify_load_handling || true
    
    # Calculate results
    local verification_end_time=$(date +%s)
    local verification_duration=$((verification_end_time - verification_start_time))
    local overall_score
    overall_score=$(calculate_verification_score)
    
    log_info "=== VERIFICATION SUMMARY ==="
    log_info "Duration: ${verification_duration} seconds"
    log_info "Overall Score: ${overall_score}/100"
    
    # Display results
    local has_failures=false
    for check in "${!VERIFICATION_RESULTS[@]}"; do
        local result="${VERIFICATION_RESULTS[$check]}"
        local details="${VERIFICATION_DETAILS[$check]}"
        
        case "$result" in
            "passed")
                log_success "$check: $details"
                ;;
            "warning")
                log_warning "$check: $details"
                ;;
            "failed")
                log_error "$check: $details"
                has_failures=true
                ;;
        esac
    done
    
    # Final status determination
    local final_status
    local exit_code
    
    if [[ "$has_failures" == "true" ]]; then
        final_status="FAILED"
        exit_code=2
        log_error "❌ DEPLOYMENT VERIFICATION FAILED"
        notify_verification "Failed" "Deployment verification failed - critical issues detected" "danger"
    elif [[ $overall_score -ge 90 ]]; then
        final_status="EXCELLENT"
        exit_code=0
        log_success "🎉 DEPLOYMENT VERIFICATION EXCELLENT"
        notify_verification "Excellent" "Deployment verification passed with excellent score ($overall_score/100)" "good"
    elif [[ $overall_score -ge 80 ]]; then
        final_status="GOOD"
        exit_code=0
        log_success "✅ DEPLOYMENT VERIFICATION PASSED (GOOD)"
        notify_verification "Good" "Deployment verification passed with good score ($overall_score/100)" "good"
    elif [[ $overall_score -ge 70 ]]; then
        final_status="ACCEPTABLE"
        exit_code=1
        log_warning "⚠️  DEPLOYMENT VERIFICATION ACCEPTABLE"
        notify_verification "Acceptable" "Deployment verification passed with acceptable score ($overall_score/100)" "warning"
    else
        final_status="POOR"
        exit_code=1
        log_warning "⚠️  DEPLOYMENT VERIFICATION POOR"
        notify_verification "Poor" "Deployment verification completed with poor score ($overall_score/100)" "warning"
    fi
    
    log_info "Final Status: $final_status"
    log_info "Verification report saved to: verification-report.json"
    log_info "Verification log saved to: deployment-verification.log"
    
    exit $exit_code
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
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --timeout)
            VERIFICATION_TIMEOUT="$2"
            shift 2
            ;;
        --min-success-rate)
            MIN_SUCCESS_RATE="$2"
            shift 2
            ;;
        --max-response-time)
            MAX_RESPONSE_TIME="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --environment ENV         Target environment (default: production)"
            echo "  --domain DOMAIN           Domain name (default: candlefish.ai)"
            echo "  --namespace NAMESPACE     Kubernetes namespace (default: production)"
            echo "  --timeout SECONDS         Verification timeout (default: 600)"
            echo "  --min-success-rate PERCENT Minimum success rate (default: 95)"
            echo "  --max-response-time MS    Maximum response time (default: 3000)"
            echo "  --help                    Show this help message"
            echo ""
            echo "Exit Codes:"
            echo "  0  Verification passed (good/excellent)"
            echo "  1  Verification passed with warnings (acceptable/poor)"
            echo "  2  Verification failed (critical issues)"
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