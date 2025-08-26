#!/bin/bash

# Security Dashboard Rollback Procedures
# Comprehensive rollback automation with safety checks and validation

set -euo pipefail

# ============================================================================
# Configuration and Constants
# ============================================================================

NAMESPACE="security-dashboard"
CLUSTER_NAME="security-dashboard-eks"
AWS_REGION="us-east-1"
ROLLBACK_TIMEOUT="600s"
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# ============================================================================
# Utility Functions
# ============================================================================

# Check if required tools are installed
check_prerequisites() {
    local missing_tools=()
    
    command -v kubectl >/dev/null 2>&1 || missing_tools+=("kubectl")
    command -v aws >/dev/null 2>&1 || missing_tools+=("aws")
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")
    command -v curl >/dev/null 2>&1 || missing_tools+=("curl")
    
    # Check for Argo Rollouts kubectl plugin
    if ! kubectl argo rollouts version >/dev/null 2>&1; then
        missing_tools+=("kubectl-argo-rollouts")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install the missing tools and try again."
        exit 1
    fi
    
    log_success "All prerequisites are installed"
}

# Verify cluster connectivity
verify_cluster_connectivity() {
    log_info "Verifying cluster connectivity..."
    
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Cannot connect to Kubernetes cluster"
        log_info "Run: aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME"
        exit 1
    fi
    
    # Verify namespace exists
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log_error "Namespace '$NAMESPACE' does not exist"
        exit 1
    fi
    
    log_success "Cluster connectivity verified"
}

# Get current deployment status
get_deployment_status() {
    local component="$1"
    local status
    
    status=$(kubectl argo rollouts get rollout "$component" -n "$NAMESPACE" -o json 2>/dev/null | jq -r '.status.phase // "Unknown"')
    echo "$status"
}

# Get revision history
get_revision_history() {
    local component="$1"
    
    kubectl argo rollouts get rollout "$component" -n "$NAMESPACE" --watch=false 2>/dev/null || {
        log_error "Failed to get revision history for $component"
        return 1
    }
}

# Health check for a service
health_check() {
    local service_name="$1"
    local endpoint="$2"
    local max_retries="${3:-$HEALTH_CHECK_RETRIES}"
    local interval="${4:-$HEALTH_CHECK_INTERVAL}"
    
    log_info "Performing health check for $service_name..."
    
    for ((i=1; i<=max_retries; i++)); do
        if kubectl exec -n "$NAMESPACE" deployment/"$service_name" -- curl -f "$endpoint" >/dev/null 2>&1; then
            log_success "$service_name health check passed"
            return 0
        fi
        
        log_warning "$service_name health check failed (attempt $i/$max_retries)"
        
        if [ "$i" -lt "$max_retries" ]; then
            sleep "$interval"
        fi
    done
    
    log_error "$service_name health check failed after $max_retries attempts"
    return 1
}

# Validate rollback target
validate_rollback_target() {
    local component="$1"
    local target_revision="$2"
    
    log_info "Validating rollback target for $component to revision $target_revision..."
    
    # Get available revisions
    local available_revisions
    available_revisions=$(kubectl argo rollouts get rollout "$component" -n "$NAMESPACE" -o json | jq -r '.status.canaryStatus.stableRS // .status.stableRS // ""')
    
    if [ -z "$available_revisions" ]; then
        log_error "No stable revision found for $component"
        return 1
    fi
    
    log_success "Rollback target validated"
    return 0
}

# ============================================================================
# Rollback Functions
# ============================================================================

# Rollback a single component using Argo Rollouts
rollback_component() {
    local component="$1"
    local target_revision="${2:-}"
    
    log_info "Starting rollback for $component${target_revision:+ to revision $target_revision}..."
    
    # Get current status
    local current_status
    current_status=$(get_deployment_status "$component")
    log_info "Current status of $component: $current_status"
    
    # Perform rollback
    if [ -n "$target_revision" ]; then
        kubectl argo rollouts undo rollout "$component" -n "$NAMESPACE" --to-revision="$target_revision"
    else
        kubectl argo rollouts undo rollout "$component" -n "$NAMESPACE"
    fi
    
    # Wait for rollback to complete
    log_info "Waiting for rollback to complete (timeout: $ROLLBACK_TIMEOUT)..."
    if ! kubectl argo rollouts status rollout "$component" -n "$NAMESPACE" --timeout="$ROLLBACK_TIMEOUT"; then
        log_error "Rollback timed out for $component"
        return 1
    fi
    
    log_success "Rollback completed for $component"
    return 0
}

# Abort current rollout
abort_rollout() {
    local component="$1"
    
    log_info "Aborting current rollout for $component..."
    
    kubectl argo rollouts abort rollout "$component" -n "$NAMESPACE"
    
    # Wait for abort to complete
    sleep 10
    
    local status
    status=$(get_deployment_status "$component")
    log_info "Status after abort: $status"
    
    if [ "$status" = "Aborted" ]; then
        log_success "Rollout aborted successfully for $component"
        return 0
    else
        log_error "Failed to abort rollout for $component"
        return 1
    fi
}

# Emergency stop - scale down to zero
emergency_stop() {
    local component="$1"
    
    log_warning "Performing emergency stop for $component..."
    
    # Scale down the rollout
    kubectl patch rollout "$component" -n "$NAMESPACE" -p '{"spec":{"replicas":0}}'
    
    # Wait for pods to terminate
    kubectl wait --for=delete pod -l "app=$component" -n "$NAMESPACE" --timeout=120s
    
    log_success "Emergency stop completed for $component"
}

# ============================================================================
# Database Rollback Functions
# ============================================================================

# Database rollback (if migrations need to be reverted)
rollback_database() {
    local target_version="$1"
    
    log_warning "Database rollback requested to version: $target_version"
    log_warning "This is a potentially dangerous operation!"
    
    # Confirm with user
    read -p "Are you sure you want to rollback the database? (yes/no): " -r
    if [[ ! $REPLY =~ ^yes$ ]]; then
        log_info "Database rollback cancelled by user"
        return 0
    fi
    
    # Create database backup before rollback
    log_info "Creating database backup before rollback..."
    local backup_name="pre-rollback-$(date +%Y%m%d-%H%M%S)"
    
    if ! create_database_backup "$backup_name"; then
        log_error "Failed to create database backup. Aborting rollback."
        return 1
    fi
    
    # Perform database rollback
    log_info "Performing database rollback to version $target_version..."
    
    kubectl exec -n "$NAMESPACE" deployment/security-dashboard-backend -- \
        npm run migrate:rollback -- --to="$target_version" || {
        log_error "Database rollback failed"
        return 1
    }
    
    log_success "Database rollback completed"
}

# Create database backup
create_database_backup() {
    local backup_name="$1"
    
    log_info "Creating database backup: $backup_name"
    
    # Get database credentials from secret
    local db_host db_user db_name
    db_host=$(kubectl get secret database-secrets -n "$NAMESPACE" -o jsonpath='{.data.host}' | base64 -d)
    db_user=$(kubectl get secret database-secrets -n "$NAMESPACE" -o jsonpath='{.data.username}' | base64 -d)
    db_name=$(kubectl get secret database-secrets -n "$NAMESPACE" -o jsonpath='{.data.database}' | base64 -d)
    
    # Create backup using pg_dump
    kubectl run db-backup-"$backup_name" -n "$NAMESPACE" --rm -i --restart=Never \
        --image=postgres:15-alpine \
        --env="PGPASSWORD=$(kubectl get secret database-secrets -n "$NAMESPACE" -o jsonpath='{.data.password}' | base64 -d)" \
        -- pg_dump -h "$db_host" -U "$db_user" -d "$db_name" > "/tmp/backup-$backup_name.sql" || {
        log_error "Failed to create database backup"
        return 1
    }
    
    log_success "Database backup created: /tmp/backup-$backup_name.sql"
    return 0
}

# ============================================================================
# Validation Functions
# ============================================================================

# Comprehensive post-rollback validation
validate_system_health() {
    log_info "Performing comprehensive system health validation..."
    
    local failed_checks=0
    
    # Check all components are running
    local components=("security-dashboard-backend" "graphql-gateway" "security-dashboard-frontend")
    
    for component in "${components[@]}"; do
        local status
        status=$(get_deployment_status "$component")
        
        if [ "$status" != "Healthy" ] && [ "$status" != "Progressing" ]; then
            log_error "$component is not healthy (status: $status)"
            ((failed_checks++))
        else
            log_success "$component is healthy"
        fi
    done
    
    # Health check endpoints
    if ! health_check "security-dashboard-backend" "http://localhost:4000/health"; then
        ((failed_checks++))
    fi
    
    if ! health_check "graphql-gateway" "http://localhost:4000/.well-known/apollo/server-health"; then
        ((failed_checks++))
    fi
    
    if ! health_check "security-dashboard-frontend" "http://localhost:8080/health"; then
        ((failed_checks++))
    fi
    
    # Check database connectivity
    log_info "Checking database connectivity..."
    if kubectl exec -n "$NAMESPACE" deployment/security-dashboard-backend -- npm run db:check >/dev/null 2>&1; then
        log_success "Database connectivity check passed"
    else
        log_error "Database connectivity check failed"
        ((failed_checks++))
    fi
    
    # Check Redis connectivity
    log_info "Checking Redis connectivity..."
    if kubectl exec -n "$NAMESPACE" deployment/security-dashboard-backend -- npm run redis:ping >/dev/null 2>&1; then
        log_success "Redis connectivity check passed"
    else
        log_error "Redis connectivity check failed"
        ((failed_checks++))
    fi
    
    # API integration test
    log_info "Running API integration test..."
    if kubectl run api-test --rm -i --restart=Never --image=curlimages/curl:latest -n "$NAMESPACE" -- \
        curl -f http://security-dashboard-backend:4000/api/health >/dev/null 2>&1; then
        log_success "API integration test passed"
    else
        log_error "API integration test failed"
        ((failed_checks++))
    fi
    
    if [ "$failed_checks" -eq 0 ]; then
        log_success "All system health checks passed"
        return 0
    else
        log_error "$failed_checks health checks failed"
        return 1
    fi
}

# Monitor system metrics after rollback
monitor_post_rollback_metrics() {
    local duration="${1:-300}" # Monitor for 5 minutes by default
    
    log_info "Monitoring system metrics for $duration seconds..."
    
    # Monitor key metrics using Prometheus queries
    local prometheus_url="http://security-dashboard-monitoring-prometheus:9090"
    
    # Check error rates
    local error_rate
    error_rate=$(kubectl run metrics-check --rm -i --restart=Never --image=curlimages/curl:latest -n "$NAMESPACE" -- \
        curl -s "$prometheus_url/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])" | \
        jq -r '.data.result[0].value[1] // "0"')
    
    if (( $(echo "$error_rate > 0.05" | bc -l) )); then
        log_warning "High error rate detected: $error_rate"
    else
        log_success "Error rate is acceptable: $error_rate"
    fi
    
    # Check response times
    local p99_latency
    p99_latency=$(kubectl run metrics-check --rm -i --restart=Never --image=curlimages/curl:latest -n "$NAMESPACE" -- \
        curl -s "$prometheus_url/api/v1/query?query=histogram_quantile(0.99,rate(http_request_duration_seconds_bucket[5m]))" | \
        jq -r '.data.result[0].value[1] // "0"')
    
    if (( $(echo "$p99_latency > 1.0" | bc -l) )); then
        log_warning "High P99 latency detected: ${p99_latency}s"
    else
        log_success "P99 latency is acceptable: ${p99_latency}s"
    fi
    
    log_success "Metrics monitoring completed"
}

# ============================================================================
# Main Rollback Procedures
# ============================================================================

# Full system rollback
full_system_rollback() {
    local target_revision="$1"
    
    log_info "Starting full system rollback${target_revision:+ to revision $target_revision}..."
    
    # Create system snapshot before rollback
    log_info "Creating system snapshot before rollback..."
    kubectl get all,configmaps,secrets,pvc -n "$NAMESPACE" -o yaml > "/tmp/system-snapshot-$(date +%Y%m%d-%H%M%S).yaml"
    
    # Rollback components in reverse dependency order
    local components=("security-dashboard-frontend" "graphql-gateway" "security-dashboard-backend")
    local failed_components=()
    
    for component in "${components[@]}"; do
        if ! rollback_component "$component" "$target_revision"; then
            failed_components+=("$component")
        fi
    done
    
    if [ ${#failed_components[@]} -ne 0 ]; then
        log_error "Rollback failed for components: ${failed_components[*]}"
        return 1
    fi
    
    # Validate system health
    if ! validate_system_health; then
        log_error "System health validation failed after rollback"
        return 1
    fi
    
    # Monitor metrics
    monitor_post_rollback_metrics
    
    log_success "Full system rollback completed successfully"
}

# Partial rollback (single component)
partial_rollback() {
    local component="$1"
    local target_revision="$2"
    
    log_info "Starting partial rollback for $component${target_revision:+ to revision $target_revision}..."
    
    # Validate component exists
    if ! kubectl get rollout "$component" -n "$NAMESPACE" >/dev/null 2>&1; then
        log_error "Component '$component' not found"
        return 1
    fi
    
    # Perform rollback
    if ! rollback_component "$component" "$target_revision"; then
        log_error "Rollback failed for $component"
        return 1
    fi
    
    # Component-specific validation
    case "$component" in
        "security-dashboard-backend")
            health_check "$component" "http://localhost:4000/health"
            ;;
        "graphql-gateway")
            health_check "$component" "http://localhost:4000/.well-known/apollo/server-health"
            ;;
        "security-dashboard-frontend")
            health_check "$component" "http://localhost:8080/health"
            ;;
    esac
    
    log_success "Partial rollback completed successfully for $component"
}

# Emergency rollback (immediate abort and rollback)
emergency_rollback() {
    log_warning "EMERGENCY ROLLBACK INITIATED"
    
    # Abort all ongoing rollouts
    local components=("security-dashboard-backend" "graphql-gateway" "security-dashboard-frontend")
    
    for component in "${components[@]}"; do
        log_info "Aborting rollout for $component..."
        abort_rollout "$component" &
    done
    
    # Wait for all aborts to complete
    wait
    
    # Perform immediate rollback to previous stable version
    for component in "${components[@]}"; do
        log_info "Rolling back $component to previous stable version..."
        rollback_component "$component" &
    done
    
    # Wait for all rollbacks to complete
    wait
    
    # Quick health validation
    sleep 30
    validate_system_health
    
    log_warning "EMERGENCY ROLLBACK COMPLETED"
}

# ============================================================================
# Usage and Help
# ============================================================================

show_usage() {
    cat << EOF
Security Dashboard Rollback Procedures

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  full-rollback [REVISION]     - Rollback entire system to specified revision (or previous)
  partial-rollback COMPONENT [REVISION] - Rollback specific component
  emergency-rollback           - Emergency abort and rollback all components
  abort COMPONENT              - Abort ongoing rollout for component
  emergency-stop COMPONENT     - Emergency scale down component to zero
  database-rollback VERSION    - Rollback database migrations (DANGEROUS)
  status                       - Show current deployment status
  history COMPONENT            - Show rollout history for component
  validate                     - Run system health validation
  monitor [DURATION]           - Monitor post-rollback metrics

Components:
  - security-dashboard-backend
  - graphql-gateway  
  - security-dashboard-frontend

Examples:
  $0 full-rollback                          # Rollback all components to previous version
  $0 partial-rollback security-dashboard-backend 5  # Rollback backend to revision 5
  $0 emergency-rollback                     # Emergency abort and rollback
  $0 status                                 # Show current status
  $0 validate                               # Run health checks

Options:
  -h, --help     Show this help message
  -v, --verbose  Enable verbose logging
  -n, --namespace NAMESPACE  Override default namespace (default: security-dashboard)

Environment Variables:
  NAMESPACE                   Override default namespace
  ROLLBACK_TIMEOUT           Override rollback timeout (default: 600s)
  HEALTH_CHECK_RETRIES       Override health check retries (default: 10)
  HEALTH_CHECK_INTERVAL      Override health check interval (default: 30s)

EOF
}

# Show current system status
show_status() {
    log_info "Current Security Dashboard System Status"
    echo
    
    local components=("security-dashboard-backend" "graphql-gateway" "security-dashboard-frontend")
    
    for component in "${components[@]}"; do
        echo "=========================================="
        echo "Component: $component"
        echo "=========================================="
        get_revision_history "$component"
        echo
    done
    
    # Show pod status
    echo "=========================================="
    echo "Pod Status"
    echo "=========================================="
    kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/name=security-dashboard"
    
    # Show service status
    echo
    echo "=========================================="
    echo "Service Status"
    echo "=========================================="
    kubectl get services -n "$NAMESPACE" -l "app.kubernetes.io/name=security-dashboard"
}

# ============================================================================
# Main Script Logic
# ============================================================================

main() {
    # Parse command line arguments
    local command=""
    local component=""
    local revision=""
    local verbose=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -v|--verbose)
                verbose=true
                set -x
                shift
                ;;
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            full-rollback|partial-rollback|emergency-rollback|abort|emergency-stop|database-rollback|status|history|validate|monitor)
                command="$1"
                shift
                ;;
            *)
                if [ -z "$component" ]; then
                    component="$1"
                elif [ -z "$revision" ]; then
                    revision="$1"
                fi
                shift
                ;;
        esac
    done
    
    # Check if command was provided
    if [ -z "$command" ]; then
        log_error "No command specified"
        show_usage
        exit 1
    fi
    
    # Run prerequisites check
    check_prerequisites
    verify_cluster_connectivity
    
    # Execute command
    case "$command" in
        "full-rollback")
            full_system_rollback "$component"
            ;;
        "partial-rollback")
            if [ -z "$component" ]; then
                log_error "Component name required for partial rollback"
                exit 1
            fi
            partial_rollback "$component" "$revision"
            ;;
        "emergency-rollback")
            emergency_rollback
            ;;
        "abort")
            if [ -z "$component" ]; then
                log_error "Component name required for abort"
                exit 1
            fi
            abort_rollout "$component"
            ;;
        "emergency-stop")
            if [ -z "$component" ]; then
                log_error "Component name required for emergency stop"
                exit 1
            fi
            emergency_stop "$component"
            ;;
        "database-rollback")
            if [ -z "$component" ]; then
                log_error "Target version required for database rollback"
                exit 1
            fi
            rollback_database "$component"
            ;;
        "status")
            show_status
            ;;
        "history")
            if [ -z "$component" ]; then
                log_error "Component name required for history"
                exit 1
            fi
            get_revision_history "$component"
            ;;
        "validate")
            validate_system_health
            ;;
        "monitor")
            monitor_post_rollback_metrics "$component"
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"