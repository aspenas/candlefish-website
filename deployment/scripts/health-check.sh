#!/bin/bash

# Health Check Script for Netlify Extension Management System
# Performs comprehensive health checks across all services

set -euo pipefail

# Configuration
ENVIRONMENT="production"
NAMESPACE="netlify-extension-production"
TIMEOUT=30
MAX_RETRIES=5
RETRY_DELAY=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Health Check Script for Netlify Extension Management System

Usage: $0 [ENVIRONMENT] [OPTIONS]

Environments:
    staging                Staging environment
    production             Production environment (default)

Options:
    --namespace NAMESPACE  Kubernetes namespace
    --timeout TIMEOUT     Health check timeout in seconds (default: 30)
    --retries RETRIES     Maximum number of retries (default: 5)
    --service SERVICE     Check specific service only (api|frontend|ml|monitor|config)
    --external            Perform external endpoint checks
    --verbose             Enable verbose output
    --help                Show this help message

Examples:
    $0 production                          # Check production environment
    $0 staging --service api              # Check only API service in staging
    $0 production --external              # Include external endpoint checks

EOF
}

# Parse arguments
SPECIFIC_SERVICE=""
EXTERNAL_CHECK=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        staging|production)
            ENVIRONMENT="$1"
            NAMESPACE="netlify-extension-$1"
            shift
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        --service)
            SPECIFIC_SERVICE="$2"
            shift 2
            ;;
        --external)
            EXTERNAL_CHECK=true
            shift
            ;;
        --verbose)
            VERBOSE=true
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

# Verbose logging function
vlog() {
    if [ "$VERBOSE" = true ]; then
        log "$1"
    fi
}

# Check if kubectl is available and configured
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed or not in PATH"
        exit 1
    fi

    if ! kubectl auth can-i get pods --namespace="$NAMESPACE" >/dev/null 2>&1; then
        error "No access to Kubernetes namespace: $NAMESPACE"
        exit 1
    fi

    vlog "kubectl access confirmed for namespace: $NAMESPACE"
}

# Check pod status
check_pod_status() {
    local service=$1
    local deployment_name="netlify-${service}"

    if [ "$ENVIRONMENT" != "production" ]; then
        deployment_name="${deployment_name}-${ENVIRONMENT}"
    fi

    log "Checking pod status for $service..."

    # Get pod status
    local pods_ready
    pods_ready=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" \
        -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")

    local pods_desired
    pods_desired=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" \
        -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")

    if [ "$pods_ready" = "$pods_desired" ] && [ "$pods_ready" != "0" ]; then
        success "$service: $pods_ready/$pods_desired pods ready"
        return 0
    else
        error "$service: $pods_ready/$pods_desired pods ready"

        # Show pod details if verbose
        if [ "$VERBOSE" = true ]; then
            kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/component=$service" --no-headers
        fi
        return 1
    fi
}

# Check service endpoints
check_service_endpoints() {
    local service=$1
    local port=$2
    local path=${3:-"/health"}

    log "Checking service endpoints for $service..."

    local service_name="netlify-${service}-service"
    if [ "$ENVIRONMENT" != "production" ]; then
        service_name="${service_name}-${ENVIRONMENT}"
    fi

    # Get service cluster IP
    local cluster_ip
    cluster_ip=$(kubectl get service "$service_name" -n "$NAMESPACE" \
        -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "")

    if [ -z "$cluster_ip" ]; then
        error "$service: Service not found"
        return 1
    fi

    vlog "$service: Service cluster IP: $cluster_ip:$port"

    # Test connectivity using a temporary pod
    local test_result
    test_result=$(kubectl run health-check-test-$service --rm -i --restart=Never \
        --image=curlimages/curl --timeout=60s -- \
        curl -f -s --max-time "$TIMEOUT" "http://$cluster_ip:$port$path" 2>/dev/null || echo "FAILED")

    if [ "$test_result" != "FAILED" ]; then
        success "$service: Endpoint $cluster_ip:$port$path is healthy"
        return 0
    else
        error "$service: Endpoint $cluster_ip:$port$path is unhealthy"
        return 1
    fi
}

# Check database connectivity
check_database_connectivity() {
    log "Checking database connectivity..."

    # Use API service to check database
    local api_service_name="netlify-api-service"
    if [ "$ENVIRONMENT" != "production" ]; then
        api_service_name="${api_service_name}-${ENVIRONMENT}"
    fi

    local db_check
    db_check=$(kubectl run db-check-test --rm -i --restart=Never \
        --image=curlimages/curl --timeout=60s -- \
        curl -f -s --max-time "$TIMEOUT" \
        "http://$api_service_name.$NAMESPACE.svc.cluster.local:3001/health/db" 2>/dev/null || echo "FAILED")

    if [ "$db_check" != "FAILED" ]; then
        success "Database connectivity check passed"
        return 0
    else
        error "Database connectivity check failed"
        return 1
    fi
}

# Check external endpoints (if enabled)
check_external_endpoints() {
    if [ "$EXTERNAL_CHECK" != true ]; then
        return 0
    fi

    log "Checking external endpoints..."

    local base_url
    if [ "$ENVIRONMENT" = "staging" ]; then
        base_url="https://staging-netlify-extension.candlefish.ai"
    else
        base_url="https://netlify-extension.candlefish.ai"
    fi

    # Check frontend
    if curl -f -s --max-time "$TIMEOUT" "$base_url/health" >/dev/null 2>&1; then
        success "External frontend endpoint is healthy: $base_url"
    else
        error "External frontend endpoint is unhealthy: $base_url"
        return 1
    fi

    # Check API
    if curl -f -s --max-time "$TIMEOUT" "$base_url/api/health" >/dev/null 2>&1; then
        success "External API endpoint is healthy: $base_url/api"
    else
        error "External API endpoint is unhealthy: $base_url/api"
        return 1
    fi

    return 0
}

# Check resource utilization
check_resource_utilization() {
    log "Checking resource utilization..."

    local services=("api" "frontend" "ml" "monitor" "config")

    for service in "${services[@]}"; do
        if [ -n "$SPECIFIC_SERVICE" ] && [ "$SPECIFIC_SERVICE" != "$service" ]; then
            continue
        fi

        local deployment_name="netlify-${service}"
        if [ "$ENVIRONMENT" != "production" ]; then
            deployment_name="${deployment_name}-${ENVIRONMENT}"
        fi

        # Get CPU and memory usage
        local cpu_usage
        local memory_usage

        cpu_usage=$(kubectl top pods -n "$NAMESPACE" -l "app.kubernetes.io/component=$service" \
            --no-headers 2>/dev/null | awk '{sum+=$2} END {print sum}' || echo "N/A")

        memory_usage=$(kubectl top pods -n "$NAMESPACE" -l "app.kubernetes.io/component=$service" \
            --no-headers 2>/dev/null | awk '{sum+=$3} END {print sum}' || echo "N/A")

        if [ "$cpu_usage" != "N/A" ] && [ "$memory_usage" != "N/A" ]; then
            log "$service: CPU: ${cpu_usage}m, Memory: ${memory_usage}Mi"
        else
            warn "$service: Resource metrics unavailable"
        fi
    done
}

# Perform comprehensive health check
perform_health_check() {
    local service=$1
    local retries=0
    local checks_passed=0
    local total_checks=0

    log "Starting health check for $service service..."

    while [ $retries -lt $MAX_RETRIES ]; do
        checks_passed=0
        total_checks=0

        # Pod status check
        if check_pod_status "$service"; then
            ((checks_passed++))
        fi
        ((total_checks++))

        # Service endpoint check based on service type
        case $service in
            api)
                if check_service_endpoints "$service" 3001; then
                    ((checks_passed++))
                fi
                ;;
            frontend)
                if check_service_endpoints "$service" 80; then
                    ((checks_passed++))
                fi
                ;;
            ml)
                if check_service_endpoints "$service" 8001; then
                    ((checks_passed++))
                fi
                ;;
            monitor)
                if check_service_endpoints "$service" 8002; then
                    ((checks_passed++))
                fi
                ;;
            config)
                if check_service_endpoints "$service" 8003; then
                    ((checks_passed++))
                fi
                ;;
        esac
        ((total_checks++))

        # If all checks passed, return success
        if [ $checks_passed -eq $total_checks ]; then
            success "$service service is healthy ($checks_passed/$total_checks checks passed)"
            return 0
        fi

        # If not all checks passed and we have retries left
        ((retries++))
        if [ $retries -lt $MAX_RETRIES ]; then
            warn "$service service check failed ($checks_passed/$total_checks checks passed). Retrying in ${RETRY_DELAY}s... (attempt $retries/$MAX_RETRIES)"
            sleep $RETRY_DELAY
        fi
    done

    error "$service service is unhealthy after $MAX_RETRIES attempts ($checks_passed/$total_checks checks passed)"
    return 1
}

# Main health check function
main() {
    log "Starting health checks for Netlify Extension Management System"
    log "Environment: $ENVIRONMENT"
    log "Namespace: $NAMESPACE"

    # Check prerequisites
    check_kubectl

    # Define services to check
    local services=("api" "frontend" "ml" "monitor" "config")
    local failed_services=()
    local successful_services=()

    # If specific service specified, only check that one
    if [ -n "$SPECIFIC_SERVICE" ]; then
        services=("$SPECIFIC_SERVICE")
    fi

    # Check each service
    for service in "${services[@]}"; do
        if perform_health_check "$service"; then
            successful_services+=("$service")
        else
            failed_services+=("$service")
        fi
        echo ""  # Add spacing between service checks
    done

    # Additional checks
    if [ -z "$SPECIFIC_SERVICE" ] || [ "$SPECIFIC_SERVICE" = "api" ]; then
        check_database_connectivity
        echo ""
    fi

    if [ -n "$EXTERNAL_CHECK" ]; then
        check_external_endpoints
        echo ""
    fi

    # Resource utilization check
    check_resource_utilization
    echo ""

    # Summary
    log "Health check summary:"
    if [ ${#successful_services[@]} -gt 0 ]; then
        success "Healthy services: ${successful_services[*]}"
    fi

    if [ ${#failed_services[@]} -gt 0 ]; then
        error "Unhealthy services: ${failed_services[*]}"
        exit 1
    fi

    success "All health checks passed!"
    exit 0
}

# Run main function
main "$@"
