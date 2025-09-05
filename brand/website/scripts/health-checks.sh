#!/bin/bash

# Comprehensive Health Check System for Candlefish Website
# Provides deep health monitoring for all system components

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
DOMAIN_NAME=${DOMAIN_NAME:-candlefish.ai}
NAMESPACE=${NAMESPACE:-production}
SERVICE_NAME=${SERVICE_NAME:-candlefish-website}

# Health check thresholds
RESPONSE_TIME_THRESHOLD=${RESPONSE_TIME_THRESHOLD:-2000} # 2 seconds
MEMORY_THRESHOLD=${MEMORY_THRESHOLD:-80} # 80%
CPU_THRESHOLD=${CPU_THRESHOLD:-80} # 80%
DISK_THRESHOLD=${DISK_THRESHOLD:-85} # 85%
ERROR_RATE_THRESHOLD=${ERROR_RATE_THRESHOLD:-5} # 5%

# Retry configuration
MAX_RETRIES=${MAX_RETRIES:-3}
RETRY_DELAY=${RETRY_DELAY:-10}

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
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a health-check.log
}

log_success() {
    echo -e "${GREEN}[HEALTHY]${NC} $1" | tee -a health-check.log
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a health-check.log
}

log_error() {
    echo -e "${RED}[UNHEALTHY]${NC} $1" | tee -a health-check.log
}

log_critical() {
    echo -e "${RED}[CRITICAL]${NC} $1" | tee -a health-check.log
}

# Global health status
declare -A HEALTH_STATUS
declare -A HEALTH_DETAILS
declare -A HEALTH_METRICS

# Initialize health check report
init_health_report() {
    cat > health-report.json << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "domain": "$DOMAIN_NAME",
    "overall_status": "unknown",
    "checks": {}
}
EOF
}

# Update health report
update_health_report() {
    local component="$1"
    local status="$2"
    local details="$3"
    local metrics="$4"
    
    # Create temporary file with updated JSON
    jq --arg component "$component" \
       --arg status "$status" \
       --arg details "$details" \
       --arg metrics "$metrics" \
       --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '.checks[$component] = {
           "status": $status,
           "details": $details,
           "metrics": ($metrics | try fromjson catch {}),
           "timestamp": $timestamp
       }' health-report.json > health-report.tmp && mv health-report.tmp health-report.json
}

# Send alert notification
send_alert() {
    local component="$1"
    local status="$2"
    local details="$3"
    local severity="${4:-warning}"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local color
        local emoji
        
        case "$severity" in
            critical)
                color="danger"
                emoji="🚨"
                ;;
            error)
                color="danger" 
                emoji="❌"
                ;;
            warning)
                color="warning"
                emoji="⚠️"
                ;;
            *)
                color="good"
                emoji="✅"
                ;;
        esac
        
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$emoji Health Check Alert - $component\",
                    \"text\": \"$details\",
                    \"fields\": [
                        {\"title\": \"Component\", \"value\": \"$component\", \"short\": true},
                        {\"title\": \"Status\", \"value\": \"$status\", \"short\": true},
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"Severity\", \"value\": \"$severity\", \"short\": true}
                    ],
                    \"footer\": \"Candlefish Health Monitor\",
                    \"ts\": $(date +%s)
                }]
            }" \
            --silent || log_warning "Failed to send alert notification"
    fi
}

# Retry function for health checks
retry_check() {
    local check_function="$1"
    local component="$2"
    shift 2
    
    local attempt=1
    while [[ $attempt -le $MAX_RETRIES ]]; do
        log_info "Health check attempt $attempt/$MAX_RETRIES for $component"
        
        if $check_function "$@"; then
            return 0
        fi
        
        if [[ $attempt -lt $MAX_RETRIES ]]; then
            log_warning "Attempt $attempt failed, retrying in $RETRY_DELAY seconds..."
            sleep $RETRY_DELAY
        fi
        
        attempt=$((attempt + 1))
    done
    
    log_error "Health check failed for $component after $MAX_RETRIES attempts"
    return 1
}

# HTTP endpoint health check
check_http_endpoint() {
    local url="$1"
    local expected_status="${2:-200}"
    local timeout="${3:-10}"
    
    log_info "Checking HTTP endpoint: $url"
    
    local start_time=$(date +%s%N)
    local http_response
    
    # Make HTTP request with timeout
    http_response=$(curl -s -o /tmp/http_response.txt -w "%{http_code}|%{time_total}|%{size_download}" \
        --max-time "$timeout" \
        "$url" 2>/dev/null || echo "000|999|0")
    
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    IFS='|' read -r status_code time_total size_download <<< "$http_response"
    
    local metrics="{\"response_time\": $response_time, \"status_code\": \"$status_code\", \"size\": \"$size_download\"}"
    
    # Check status code
    if [[ "$status_code" != "$expected_status" ]]; then
        HEALTH_STATUS["http_$url"]="unhealthy"
        HEALTH_DETAILS["http_$url"]="HTTP $status_code (expected $expected_status)"
        update_health_report "http_endpoint_$(echo $url | sed 's|[^a-zA-Z0-9]|_|g')" "unhealthy" "HTTP $status_code" "$metrics"
        return 1
    fi
    
    # Check response time
    if [[ $response_time -gt $RESPONSE_TIME_THRESHOLD ]]; then
        HEALTH_STATUS["http_$url"]="degraded"
        HEALTH_DETAILS["http_$url"]="Slow response: ${response_time}ms > ${RESPONSE_TIME_THRESHOLD}ms"
        update_health_report "http_endpoint_$(echo $url | sed 's|[^a-zA-Z0-9]|_|g')" "degraded" "Slow response time" "$metrics"
        log_warning "Slow response from $url: ${response_time}ms"
        return 0
    fi
    
    HEALTH_STATUS["http_$url"]="healthy"
    HEALTH_DETAILS["http_$url"]="HTTP $status_code in ${response_time}ms"
    update_health_report "http_endpoint_$(echo $url | sed 's|[^a-zA-Z0-9]|_|g')" "healthy" "Responding normally" "$metrics"
    
    log_success "HTTP endpoint $url: $status_code in ${response_time}ms"
    return 0
}

# Database connectivity check
check_database() {
    log_info "Checking database connectivity"
    
    # This would connect to your actual database
    # Using kubectl to check if database pods are running as a proxy
    if command -v kubectl &> /dev/null && kubectl get pods -n "$NAMESPACE" -l app=postgresql &>/dev/null; then
        local db_pods=$(kubectl get pods -n "$NAMESPACE" -l app=postgresql -o jsonpath='{.items[*].status.phase}')
        
        if [[ "$db_pods" == *"Running"* ]]; then
            HEALTH_STATUS["database"]="healthy"
            HEALTH_DETAILS["database"]="Database pods running"
            update_health_report "database" "healthy" "Database pods are running" "{}"
            log_success "Database connectivity: OK"
            return 0
        else
            HEALTH_STATUS["database"]="unhealthy"
            HEALTH_DETAILS["database"]="Database pods not running: $db_pods"
            update_health_report "database" "unhealthy" "Database pods not running" "{}"
            log_error "Database connectivity: FAILED"
            return 1
        fi
    else
        log_warning "Cannot check database - kubectl not available or no database pods found"
        HEALTH_STATUS["database"]="unknown"
        HEALTH_DETAILS["database"]="Cannot verify database status"
        update_health_report "database" "unknown" "Cannot verify database status" "{}"
        return 0
    fi
}

# Redis/Cache connectivity check
check_cache() {
    log_info "Checking cache connectivity"
    
    # Check Redis pods in Kubernetes
    if command -v kubectl &> /dev/null && kubectl get pods -n "$NAMESPACE" -l app=redis &>/dev/null; then
        local redis_pods=$(kubectl get pods -n "$NAMESPACE" -l app=redis -o jsonpath='{.items[*].status.phase}')
        
        if [[ "$redis_pods" == *"Running"* ]]; then
            HEALTH_STATUS["cache"]="healthy"
            HEALTH_DETAILS["cache"]="Redis pods running"
            update_health_report "cache" "healthy" "Redis pods are running" "{}"
            log_success "Cache connectivity: OK"
            return 0
        else
            HEALTH_STATUS["cache"]="unhealthy"
            HEALTH_DETAILS["cache"]="Redis pods not running: $redis_pods"
            update_health_report "cache" "unhealthy" "Redis pods not running" "{}"
            log_error "Cache connectivity: FAILED"
            return 1
        fi
    else
        log_warning "Cannot check cache - kubectl not available or no Redis pods found"
        HEALTH_STATUS["cache"]="unknown"
        HEALTH_DETAILS["cache"]="Cannot verify cache status"
        update_health_report "cache" "unknown" "Cannot verify cache status" "{}"
        return 0
    fi
}

# Kubernetes cluster health
check_kubernetes_cluster() {
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available - skipping Kubernetes checks"
        return 0
    fi
    
    log_info "Checking Kubernetes cluster health"
    
    # Check cluster connectivity
    if ! kubectl cluster-info &>/dev/null; then
        HEALTH_STATUS["kubernetes"]="unhealthy"
        HEALTH_DETAILS["kubernetes"]="Cannot connect to cluster"
        update_health_report "kubernetes_cluster" "unhealthy" "Cannot connect to cluster" "{}"
        log_error "Kubernetes cluster: UNREACHABLE"
        return 1
    fi
    
    # Check node status
    local node_status=$(kubectl get nodes --no-headers | awk '{print $2}' | sort | uniq -c)
    local ready_nodes=$(echo "$node_status" | grep -c "Ready" || echo 0)
    local not_ready_nodes=$(echo "$node_status" | grep -v "Ready" | wc -l || echo 0)
    
    local metrics="{\"ready_nodes\": $ready_nodes, \"not_ready_nodes\": $not_ready_nodes}"
    
    if [[ $not_ready_nodes -gt 0 ]]; then
        HEALTH_STATUS["kubernetes"]="degraded"
        HEALTH_DETAILS["kubernetes"]="$not_ready_nodes nodes not ready"
        update_health_report "kubernetes_cluster" "degraded" "$not_ready_nodes nodes not ready" "$metrics"
        log_warning "Kubernetes cluster: $not_ready_nodes nodes not ready"
    else
        HEALTH_STATUS["kubernetes"]="healthy"
        HEALTH_DETAILS["kubernetes"]="All $ready_nodes nodes ready"
        update_health_report "kubernetes_cluster" "healthy" "All nodes ready" "$metrics"
        log_success "Kubernetes cluster: All $ready_nodes nodes ready"
    fi
    
    return 0
}

# Application deployment health
check_application_deployment() {
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available - skipping deployment checks"
        return 0
    fi
    
    log_info "Checking application deployment health"
    
    # Check deployment status
    if ! kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" &>/dev/null; then
        HEALTH_STATUS["deployment"]="unhealthy"
        HEALTH_DETAILS["deployment"]="Deployment not found"
        update_health_report "application_deployment" "unhealthy" "Deployment not found" "{}"
        log_error "Application deployment: NOT FOUND"
        return 1
    fi
    
    local ready_replicas=$(kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
    local desired_replicas=$(kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.status.replicas}' 2>/dev/null || echo 0)
    local unavailable_replicas=$(kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.status.unavailableReplicas}' 2>/dev/null || echo 0)
    
    local metrics="{\"ready_replicas\": $ready_replicas, \"desired_replicas\": $desired_replicas, \"unavailable_replicas\": $unavailable_replicas}"
    
    if [[ $ready_replicas -eq 0 ]]; then
        HEALTH_STATUS["deployment"]="critical"
        HEALTH_DETAILS["deployment"]="No ready replicas (0/$desired_replicas)"
        update_health_report "application_deployment" "critical" "No ready replicas" "$metrics"
        log_critical "Application deployment: NO READY REPLICAS"
        return 1
    elif [[ $ready_replicas -lt $desired_replicas ]]; then
        HEALTH_STATUS["deployment"]="degraded"
        HEALTH_DETAILS["deployment"]="Partial replicas ready ($ready_replicas/$desired_replicas)"
        update_health_report "application_deployment" "degraded" "Partial replicas ready" "$metrics"
        log_warning "Application deployment: PARTIALLY READY ($ready_replicas/$desired_replicas)"
    else
        HEALTH_STATUS["deployment"]="healthy"
        HEALTH_DETAILS["deployment"]="All replicas ready ($ready_replicas/$desired_replicas)"
        update_health_report "application_deployment" "healthy" "All replicas ready" "$metrics"
        log_success "Application deployment: HEALTHY ($ready_replicas/$desired_replicas)"
    fi
    
    return 0
}

# Resource utilization check
check_resource_utilization() {
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not available - skipping resource checks"
        return 0
    fi
    
    log_info "Checking resource utilization"
    
    # Check if metrics-server is available
    if ! kubectl top nodes &>/dev/null; then
        log_warning "Metrics server not available - cannot check resource utilization"
        HEALTH_STATUS["resources"]="unknown"
        HEALTH_DETAILS["resources"]="Metrics server not available"
        update_health_report "resource_utilization" "unknown" "Metrics server not available" "{}"
        return 0
    fi
    
    # Get node resource usage
    local node_metrics=$(kubectl top nodes --no-headers 2>/dev/null | awk '{
        cpu_used += $3; cpu_percent += $4; 
        mem_used += $5; mem_percent += $6; 
        count++
    } END {
        if (count > 0) {
            print cpu_percent/count, mem_percent/count
        } else {
            print "0 0"
        }
    }' | sed 's/%//g')
    
    read -r avg_cpu_percent avg_mem_percent <<< "$node_metrics"
    
    # Get pod resource usage
    local pod_metrics=$(kubectl top pods -n "$NAMESPACE" -l app="$SERVICE_NAME" --no-headers 2>/dev/null | awk '{
        cpu_used += $2; mem_used += $3; count++
    } END {
        if (count > 0) {
            print cpu_used/count, mem_used/count
        } else {
            print "0 0"
        }
    }' | sed 's/[m]//g; s/Mi//g')
    
    read -r avg_pod_cpu avg_pod_mem <<< "$pod_metrics"
    
    local metrics="{\"node_cpu_percent\": ${avg_cpu_percent:-0}, \"node_memory_percent\": ${avg_mem_percent:-0}, \"pod_cpu_millis\": ${avg_pod_cpu:-0}, \"pod_memory_mb\": ${avg_pod_mem:-0}}"
    
    # Evaluate resource health
    local resource_status="healthy"
    local resource_issues=()
    
    if (( $(echo "${avg_cpu_percent:-0} > $CPU_THRESHOLD" | bc -l) )); then
        resource_status="degraded"
        resource_issues+=("High CPU usage: ${avg_cpu_percent}%")
    fi
    
    if (( $(echo "${avg_mem_percent:-0} > $MEMORY_THRESHOLD" | bc -l) )); then
        resource_status="degraded"
        resource_issues+=("High memory usage: ${avg_mem_percent}%")
    fi
    
    if [[ ${#resource_issues[@]} -gt 0 ]]; then
        local issues_string=$(IFS=', '; echo "${resource_issues[*]}")
        HEALTH_STATUS["resources"]="$resource_status"
        HEALTH_DETAILS["resources"]="$issues_string"
        update_health_report "resource_utilization" "$resource_status" "$issues_string" "$metrics"
        log_warning "Resource utilization: $issues_string"
    else
        HEALTH_STATUS["resources"]="healthy"
        HEALTH_DETAILS["resources"]="CPU: ${avg_cpu_percent}%, Memory: ${avg_mem_percent}%"
        update_health_report "resource_utilization" "healthy" "Resource usage within limits" "$metrics"
        log_success "Resource utilization: CPU: ${avg_cpu_percent}%, Memory: ${avg_mem_percent}%"
    fi
    
    return 0
}

# SSL certificate check
check_ssl_certificate() {
    local domain="$1"
    
    log_info "Checking SSL certificate for $domain"
    
    local cert_info
    cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain":443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")
    
    if [[ -z "$cert_info" ]]; then
        HEALTH_STATUS["ssl_$domain"]="unhealthy"
        HEALTH_DETAILS["ssl_$domain"]="Cannot retrieve certificate"
        update_health_report "ssl_certificate" "unhealthy" "Cannot retrieve certificate" "{}"
        log_error "SSL certificate: FAILED to retrieve for $domain"
        return 1
    fi
    
    # Extract expiry date
    local not_after=$(echo "$cert_info" | grep "notAfter" | cut -d'=' -f2)
    local expiry_timestamp=$(date -d "$not_after" +%s 2>/dev/null || echo 0)
    local current_timestamp=$(date +%s)
    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    local metrics="{\"days_until_expiry\": $days_until_expiry, \"expiry_date\": \"$not_after\"}"
    
    if [[ $days_until_expiry -le 0 ]]; then
        HEALTH_STATUS["ssl_$domain"]="critical"
        HEALTH_DETAILS["ssl_$domain"]="Certificate expired"
        update_health_report "ssl_certificate" "critical" "Certificate expired" "$metrics"
        log_critical "SSL certificate: EXPIRED for $domain"
        return 1
    elif [[ $days_until_expiry -le 30 ]]; then
        HEALTH_STATUS["ssl_$domain"]="warning"
        HEALTH_DETAILS["ssl_$domain"]="Certificate expires in $days_until_expiry days"
        update_health_report "ssl_certificate" "warning" "Certificate expires soon" "$metrics"
        log_warning "SSL certificate: EXPIRES in $days_until_expiry days for $domain"
    else
        HEALTH_STATUS["ssl_$domain"]="healthy"
        HEALTH_DETAILS["ssl_$domain"]="Certificate valid for $days_until_expiry days"
        update_health_report "ssl_certificate" "healthy" "Certificate is valid" "$metrics"
        log_success "SSL certificate: VALID for $days_until_expiry days for $domain"
    fi
    
    return 0
}

# External service dependencies check
check_external_dependencies() {
    log_info "Checking external service dependencies"
    
    # List of external services to check
    local external_services=(
        "https://api.github.com/status"
        "https://registry.npmjs.org/-/ping"
        "https://aws.amazon.com/health/"
    )
    
    local healthy_deps=0
    local total_deps=${#external_services[@]}
    
    for service in "${external_services[@]}"; do
        if curl -f -s --max-time 10 "$service" >/dev/null 2>&1; then
            healthy_deps=$((healthy_deps + 1))
            log_info "External dependency OK: $service"
        else
            log_warning "External dependency FAILED: $service"
        fi
    done
    
    local metrics="{\"healthy_dependencies\": $healthy_deps, \"total_dependencies\": $total_deps}"
    
    if [[ $healthy_deps -eq $total_deps ]]; then
        HEALTH_STATUS["external_deps"]="healthy"
        HEALTH_DETAILS["external_deps"]="All $total_deps dependencies healthy"
        update_health_report "external_dependencies" "healthy" "All dependencies available" "$metrics"
        log_success "External dependencies: All $total_deps services available"
    elif [[ $healthy_deps -gt 0 ]]; then
        HEALTH_STATUS["external_deps"]="degraded"
        HEALTH_DETAILS["external_deps"]="$healthy_deps/$total_deps dependencies healthy"
        update_health_report "external_dependencies" "degraded" "Some dependencies unavailable" "$metrics"
        log_warning "External dependencies: $healthy_deps/$total_deps services available"
    else
        HEALTH_STATUS["external_deps"]="critical"
        HEALTH_DETAILS["external_deps"]="No dependencies reachable"
        update_health_report "external_dependencies" "critical" "All dependencies unavailable" "$metrics"
        log_critical "External dependencies: No services reachable"
    fi
    
    return 0
}

# Calculate overall health status
calculate_overall_health() {
    local critical_count=0
    local unhealthy_count=0
    local degraded_count=0
    local warning_count=0
    local healthy_count=0
    local total_checks=0
    
    for status in "${HEALTH_STATUS[@]}"; do
        case "$status" in
            critical)
                critical_count=$((critical_count + 1))
                ;;
            unhealthy)
                unhealthy_count=$((unhealthy_count + 1))
                ;;
            degraded)
                degraded_count=$((degraded_count + 1))
                ;;
            warning)
                warning_count=$((warning_count + 1))
                ;;
            healthy)
                healthy_count=$((healthy_count + 1))
                ;;
        esac
        total_checks=$((total_checks + 1))
    done
    
    local overall_status
    local overall_details
    
    if [[ $critical_count -gt 0 ]]; then
        overall_status="critical"
        overall_details="$critical_count critical issues detected"
    elif [[ $unhealthy_count -gt 0 ]]; then
        overall_status="unhealthy"
        overall_details="$unhealthy_count unhealthy components"
    elif [[ $degraded_count -gt 0 ]]; then
        overall_status="degraded"
        overall_details="$degraded_count degraded components"
    elif [[ $warning_count -gt 0 ]]; then
        overall_status="warning"
        overall_details="$warning_count warnings detected"
    elif [[ $healthy_count -eq $total_checks ]]; then
        overall_status="healthy"
        overall_details="All $total_checks components healthy"
    else
        overall_status="unknown"
        overall_details="Unable to determine health status"
    fi
    
    # Update final report
    jq --arg status "$overall_status" \
       --arg details "$overall_details" \
       --arg critical "$critical_count" \
       --arg unhealthy "$unhealthy_count" \
       --arg degraded "$degraded_count" \
       --arg warning "$warning_count" \
       --arg healthy "$healthy_count" \
       --arg total "$total_checks" \
       '.overall_status = $status |
        .overall_details = $details |
        .summary = {
            "critical": ($critical | tonumber),
            "unhealthy": ($unhealthy | tonumber),
            "degraded": ($degraded | tonumber),
            "warning": ($warning | tonumber),
            "healthy": ($healthy | tonumber),
            "total_checks": ($total | tonumber)
        }' health-report.json > health-report.tmp && mv health-report.tmp health-report.json
    
    echo "$overall_status"
}

# Main health check execution
main() {
    local check_type="${1:-all}"
    
    log_info "🏥 STARTING COMPREHENSIVE HEALTH CHECK"
    log_info "Environment: $ENVIRONMENT"
    log_info "Domain: $DOMAIN_NAME"
    log_info "Check Type: $check_type"
    
    # Initialize health report
    init_health_report
    
    case "$check_type" in
        "http"|"all")
            log_info "=== HTTP ENDPOINT CHECKS ==="
            retry_check check_http_endpoint "main_site" "https://$DOMAIN_NAME/"
            retry_check check_http_endpoint "health_endpoint" "https://$DOMAIN_NAME/health"
            retry_check check_http_endpoint "api_health" "https://$DOMAIN_NAME/api/health"
            retry_check check_http_endpoint "workshop" "https://$DOMAIN_NAME/workshop"
            ;&
        "infrastructure"|"all")
            if [[ "$check_type" != "http" ]]; then
                log_info "=== INFRASTRUCTURE CHECKS ==="
                retry_check check_kubernetes_cluster "kubernetes"
                retry_check check_application_deployment "deployment"
                retry_check check_database "database"
                retry_check check_cache "cache"
                retry_check check_resource_utilization "resources"
            fi
            ;&
        "security"|"all")
            if [[ "$check_type" != "http" && "$check_type" != "infrastructure" ]]; then
                log_info "=== SECURITY CHECKS ==="
                retry_check check_ssl_certificate "ssl" "$DOMAIN_NAME"
            fi
            ;&
        "external"|"all")
            if [[ "$check_type" != "http" && "$check_type" != "infrastructure" && "$check_type" != "security" ]]; then
                log_info "=== EXTERNAL DEPENDENCY CHECKS ==="
                retry_check check_external_dependencies "external"
            fi
            ;;
        *)
            log_error "Unknown check type: $check_type"
            echo "Usage: $0 [all|http|infrastructure|security|external]"
            exit 1
            ;;
    esac
    
    log_info "=== HEALTH CHECK SUMMARY ==="
    
    # Calculate overall health
    local overall_status
    overall_status=$(calculate_overall_health)
    
    case "$overall_status" in
        "critical")
            log_critical "🚨 OVERALL STATUS: CRITICAL"
            send_alert "System" "CRITICAL" "Critical health issues detected" "critical"
            ;;
        "unhealthy")
            log_error "❌ OVERALL STATUS: UNHEALTHY"
            send_alert "System" "UNHEALTHY" "Unhealthy components detected" "error"
            ;;
        "degraded")
            log_warning "⚠️  OVERALL STATUS: DEGRADED"
            send_alert "System" "DEGRADED" "System performance degraded" "warning"
            ;;
        "warning")
            log_warning "⚠️  OVERALL STATUS: WARNING"
            ;;
        "healthy")
            log_success "✅ OVERALL STATUS: HEALTHY"
            ;;
        *)
            log_warning "❓ OVERALL STATUS: UNKNOWN"
            ;;
    esac
    
    # Display component statuses
    for component in "${!HEALTH_STATUS[@]}"; do
        local status="${HEALTH_STATUS[$component]}"
        local details="${HEALTH_DETAILS[$component]}"
        
        case "$status" in
            "critical")
                log_critical "$component: $details"
                ;;
            "unhealthy")
                log_error "$component: $details"
                ;;
            "degraded")
                log_warning "$component: $details"
                ;;
            "warning")
                log_warning "$component: $details"
                ;;
            "healthy")
                log_success "$component: $details"
                ;;
            *)
                log_info "$component: $details"
                ;;
        esac
    done
    
    log_info "Health check report saved to: health-report.json"
    
    # Exit with appropriate code
    case "$overall_status" in
        "critical"|"unhealthy")
            exit 2
            ;;
        "degraded"|"warning")
            exit 1
            ;;
        "healthy")
            exit 0
            ;;
        *)
            exit 3
            ;;
    esac
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
        --response-time-threshold)
            RESPONSE_TIME_THRESHOLD="$2"
            shift 2
            ;;
        --max-retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [CHECK_TYPE] [OPTIONS]"
            echo ""
            echo "Check Types:"
            echo "  all            Run all health checks (default)"
            echo "  http           HTTP endpoint checks only"
            echo "  infrastructure Kubernetes and resource checks"
            echo "  security       SSL and security checks"
            echo "  external       External dependency checks"
            echo ""
            echo "Options:"
            echo "  --environment ENV       Target environment (default: production)"
            echo "  --domain DOMAIN         Domain name (default: candlefish.ai)"
            echo "  --namespace NAMESPACE   Kubernetes namespace (default: production)"
            echo "  --response-time-threshold MS  Response time threshold (default: 2000)"
            echo "  --max-retries NUM       Maximum retry attempts (default: 3)"
            echo "  --help                  Show this help message"
            echo ""
            echo "Exit Codes:"
            echo "  0  All checks healthy"
            echo "  1  Warnings or degraded performance"
            echo "  2  Critical or unhealthy status"
            echo "  3  Unknown status"
            exit 0
            ;;
        *)
            CHECK_TYPE="$1"
            shift
            ;;
    esac
done

# Execute main function
main "${CHECK_TYPE:-all}"