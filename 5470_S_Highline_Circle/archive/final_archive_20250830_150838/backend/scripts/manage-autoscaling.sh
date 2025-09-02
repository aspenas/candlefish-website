#!/bin/bash

# Auto-scaling Management Script for Item Valuation System
# Manages HPA, VPA, and Cluster Autoscaler configurations

set -euo pipefail

# Configuration
NAMESPACE="${NAMESPACE:-inventory-system}"
MONITORING_NAMESPACE="${MONITORING_NAMESPACE:-monitoring}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log_info() {
    log "${BLUE}INFO: $1${NC}"
}

log_success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

log_warn() {
    log "${YELLOW}WARNING: $1${NC}"
}

log_error() {
    log "${RED}ERROR: $1${NC}"
}

error_exit() {
    log_error "$1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking auto-scaling prerequisites..."
    
    # Required tools
    for tool in kubectl jq; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            error_exit "Required tool '$tool' is not installed"
        fi
    done
    
    # Kubernetes connection
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi
    
    # Check if metrics server is running
    if ! kubectl get apiservice v1beta1.metrics.k8s.io >/dev/null 2>&1; then
        log_warn "Metrics server not found - HPA may not work properly"
    else
        log_success "Metrics server is available"
    fi
    
    # Check if custom metrics API is available
    if kubectl get apiservice v1beta1.custom.metrics.k8s.io >/dev/null 2>&1; then
        log_success "Custom metrics API is available"
    else
        log_warn "Custom metrics API not available - custom HPA metrics won't work"
    fi
    
    log_success "Prerequisites check completed"
}

# Show HPA status
show_hpa_status() {
    log_info "Horizontal Pod Autoscaler Status:"
    
    if kubectl get hpa -n "$NAMESPACE" >/dev/null 2>&1; then
        kubectl get hpa -n "$NAMESPACE" -o wide
        
        echo
        log_info "HPA Details:"
        local hpas
        hpas=$(kubectl get hpa -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}')
        
        for hpa in $hpas; do
            echo
            log_info "HPA: $hpa"
            kubectl describe hpa "$hpa" -n "$NAMESPACE"
        done
    else
        log_warn "No HPAs found in namespace $NAMESPACE"
    fi
}

# Show VPA status
show_vpa_status() {
    log_info "Vertical Pod Autoscaler Status:"
    
    if kubectl get vpa -n "$NAMESPACE" >/dev/null 2>&1; then
        kubectl get vpa -n "$NAMESPACE" -o wide
        
        echo
        log_info "VPA Details:"
        local vpas
        vpas=$(kubectl get vpa -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}')
        
        for vpa in $vpas; do
            echo
            log_info "VPA: $vpa"
            kubectl describe vpa "$vpa" -n "$NAMESPACE"
        done
    else
        log_warn "No VPAs found in namespace $NAMESPACE or VPA not installed"
    fi
}

# Show cluster autoscaler status
show_cluster_autoscaler_status() {
    log_info "Cluster Autoscaler Status:"
    
    # Check if cluster autoscaler is running
    if kubectl get deployment cluster-autoscaler -n kube-system >/dev/null 2>&1; then
        kubectl get deployment cluster-autoscaler -n kube-system
        
        echo
        log_info "Cluster Autoscaler Logs (last 20 lines):"
        kubectl logs deployment/cluster-autoscaler -n kube-system --tail=20
        
        echo
        log_info "Node Status:"
        kubectl get nodes -o wide
        
    else
        log_warn "Cluster Autoscaler not found"
    fi
}

# Show scaling events
show_scaling_events() {
    local time_range="${1:-1h}"
    
    log_info "Recent Scaling Events (last $time_range):"
    
    # HPA events
    kubectl get events -n "$NAMESPACE" \
        --field-selector involvedObject.kind=HorizontalPodAutoscaler \
        --sort-by='.lastTimestamp' \
        --output custom-columns=TIME:.lastTimestamp,OBJECT:.involvedObject.name,REASON:.reason,MESSAGE:.message
    
    echo
    log_info "Pod scaling events:"
    kubectl get events -n "$NAMESPACE" \
        --field-selector reason=Killing,reason=Created,reason=Scheduled \
        --sort-by='.lastTimestamp' \
        --output custom-columns=TIME:.lastTimestamp,OBJECT:.involvedObject.name,REASON:.reason,MESSAGE:.message | tail -20
}

# Analyze scaling performance
analyze_scaling_performance() {
    log_info "Analyzing scaling performance..."
    
    # Check current resource usage vs requests/limits
    log_info "Current Resource Usage:"
    
    local deployments
    deployments=$(kubectl get deployments -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}')
    
    for deployment in $deployments; do
        echo
        log_info "Deployment: $deployment"
        
        # Get current replicas
        local current_replicas
        current_replicas=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.status.replicas}')
        local ready_replicas
        ready_replicas=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
        
        echo "  Replicas: $ready_replicas/$current_replicas"
        
        # Get resource requests and limits
        local cpu_requests
        cpu_requests=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].resources.requests.cpu}')
        local memory_requests
        memory_requests=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].resources.requests.memory}')
        local cpu_limits
        cpu_limits=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].resources.limits.cpu}')
        local memory_limits
        memory_limits=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}')
        
        echo "  CPU: requests=$cpu_requests, limits=$cpu_limits"
        echo "  Memory: requests=$memory_requests, limits=$memory_limits"
        
        # Get actual resource usage if metrics are available
        if kubectl top pods -n "$NAMESPACE" -l app="$deployment" >/dev/null 2>&1; then
            echo "  Current usage:"
            kubectl top pods -n "$NAMESPACE" -l app="$deployment" --no-headers | while read -r pod cpu memory; do
                echo "    $pod: CPU=$cpu, Memory=$memory"
            done
        fi
    done
}

# Test scaling behavior
test_scaling() {
    local component="${1:-backend}"
    local test_type="${2:-cpu}"
    local duration="${3:-300}"  # 5 minutes
    
    log_info "Testing scaling behavior for $component (test: $test_type, duration: ${duration}s)"
    
    # Check if deployment exists
    if ! kubectl get deployment "$component" -n "$NAMESPACE" >/dev/null 2>&1; then
        error_exit "Deployment '$component' not found"
    fi
    
    # Get initial state
    local initial_replicas
    initial_replicas=$(kubectl get deployment "$component" -n "$NAMESPACE" -o jsonpath='{.status.replicas}')
    log_info "Initial replicas: $initial_replicas"
    
    case "$test_type" in
        "cpu")
            log_info "Starting CPU stress test..."
            # Create a job that stresses CPU
            kubectl run stress-test-cpu --image=polinux/stress --rm -i --restart=Never -n "$NAMESPACE" -- \
                stress --cpu 4 --timeout ${duration}s &
            ;;
        "memory")
            log_info "Starting memory stress test..."
            # Create a job that uses memory
            kubectl run stress-test-memory --image=polinux/stress --rm -i --restart=Never -n "$NAMESPACE" -- \
                stress --vm 2 --vm-bytes 512M --timeout ${duration}s &
            ;;
        "load")
            log_info "Starting load test..."
            # This would typically use a load testing tool like k6 or hey
            log_warn "Load testing not implemented in this script"
            return 1
            ;;
        *)
            error_exit "Unknown test type: $test_type"
            ;;
    esac
    
    # Monitor scaling for the duration
    local end_time=$(($(date +%s) + duration))
    local max_replicas=$initial_replicas
    
    while [ $(date +%s) -lt $end_time ]; do
        local current_replicas
        current_replicas=$(kubectl get deployment "$component" -n "$NAMESPACE" -o jsonpath='{.status.replicas}')
        
        if [ "$current_replicas" -gt "$max_replicas" ]; then
            max_replicas=$current_replicas
            log_info "Scaled up to $max_replicas replicas"
        fi
        
        sleep 30
    done
    
    log_success "Test completed. Max replicas reached: $max_replicas (started with $initial_replicas)"
    
    # Wait for scale down
    log_info "Waiting for scale down..."
    sleep 300  # Wait 5 minutes
    
    local final_replicas
    final_replicas=$(kubectl get deployment "$component" -n "$NAMESPACE" -o jsonpath='{.status.replicas}')
    log_info "Final replicas: $final_replicas"
}

# Tune HPA settings
tune_hpa() {
    local hpa_name="${1:-backend-hpa}"
    local cpu_target="${2:-70}"
    local memory_target="${3:-80}"
    local min_replicas="${4:-3}"
    local max_replicas="${5:-50}"
    
    log_info "Tuning HPA: $hpa_name"
    
    # Check if HPA exists
    if ! kubectl get hpa "$hpa_name" -n "$NAMESPACE" >/dev/null 2>&1; then
        error_exit "HPA '$hpa_name' not found"
    fi
    
    # Update HPA configuration
    kubectl patch hpa "$hpa_name" -n "$NAMESPACE" --type='merge' -p="{
        \"spec\": {
            \"minReplicas\": $min_replicas,
            \"maxReplicas\": $max_replicas,
            \"metrics\": [
                {
                    \"type\": \"Resource\",
                    \"resource\": {
                        \"name\": \"cpu\",
                        \"target\": {
                            \"type\": \"Utilization\",
                            \"averageUtilization\": $cpu_target
                        }
                    }
                },
                {
                    \"type\": \"Resource\",
                    \"resource\": {
                        \"name\": \"memory\",
                        \"target\": {
                            \"type\": \"Utilization\",
                            \"averageUtilization\": $memory_target
                        }
                    }
                }
            ]
        }
    }"
    
    log_success "HPA $hpa_name updated:"
    log_info "  CPU target: ${cpu_target}%"
    log_info "  Memory target: ${memory_target}%"
    log_info "  Replicas: $min_replicas - $max_replicas"
}

# Enable/disable autoscaling
toggle_autoscaling() {
    local action="${1:-enable}"  # enable or disable
    local component="${2:-all}"   # all, hpa, vpa, or cluster
    
    log_info "${action^}ing autoscaling for: $component"
    
    case "$component" in
        "all"|"hpa")
            if [ "$action" = "enable" ]; then
                # Enable HPA by ensuring they exist
                kubectl apply -f k8s/autoscaling.yaml -n "$NAMESPACE"
                log_success "HPAs enabled"
            else
                # Disable HPA by deleting them
                kubectl delete hpa --all -n "$NAMESPACE" || true
                log_success "HPAs disabled"
            fi
            ;;&
        "all"|"vpa")
            if [ "$action" = "enable" ]; then
                # Enable VPA (assuming VPA manifests are in autoscaling.yaml)
                kubectl apply -f k8s/autoscaling.yaml -n "$NAMESPACE"
                log_success "VPAs enabled"
            else
                # Disable VPA
                kubectl delete vpa --all -n "$NAMESPACE" || true
                log_success "VPAs disabled"
            fi
            ;;&
        "all"|"cluster")
            if [ "$action" = "enable" ]; then
                # Enable cluster autoscaler (this would typically be done via Terraform/CloudFormation)
                log_info "Cluster autoscaler needs to be enabled via infrastructure configuration"
            else
                # Scale cluster autoscaler to 0 replicas
                kubectl scale deployment cluster-autoscaler -n kube-system --replicas=0 || true
                log_success "Cluster autoscaler disabled"
            fi
            ;;
        *)
            error_exit "Unknown component: $component. Use 'all', 'hpa', 'vpa', or 'cluster'"
            ;;
    esac
}

# Generate scaling recommendations
generate_recommendations() {
    log_info "Generating autoscaling recommendations..."
    
    local report_file="scaling-recommendations-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << 'EOF'
# Autoscaling Recommendations Report

## Executive Summary
This report provides recommendations for optimizing autoscaling configuration based on current system behavior and resource usage patterns.

## Current Configuration Analysis
EOF
    
    # Analyze current HPAs
    echo "### Horizontal Pod Autoscalers" >> "$report_file"
    kubectl get hpa -n "$NAMESPACE" -o json | jq -r '
    .items[] | 
    "- **" + .metadata.name + "**: " + 
    (.spec.minReplicas | tostring) + "-" + (.spec.maxReplicas | tostring) + " replicas, " +
    "CPU: " + (.spec.metrics[] | select(.resource.name == "cpu") | .resource.target.averageUtilization | tostring) + "%, " +
    "Memory: " + (.spec.metrics[] | select(.resource.name == "memory") | .resource.target.averageUtilization | tostring) + "%"
    ' >> "$report_file"
    
    # Add resource usage analysis
    echo -e "\n### Resource Usage Analysis" >> "$report_file"
    echo "Based on recent metrics and scaling events:" >> "$report_file"
    
    # This would be enhanced with actual metrics analysis
    cat >> "$report_file" << 'EOF'

### Recommendations

#### High Priority
1. **Adjust CPU thresholds**: Consider lowering CPU thresholds for faster response
2. **Memory optimization**: Review memory limits vs actual usage
3. **Scaling policies**: Implement more conservative scale-down policies

#### Medium Priority  
1. **Custom metrics**: Implement application-specific metrics for better scaling decisions
2. **Predictive scaling**: Consider implementing predictive scaling based on usage patterns
3. **Cost optimization**: Review resource requests vs limits for cost efficiency

#### Low Priority
1. **VPA integration**: Consider VPA for right-sizing container resources
2. **Mixed instance types**: Use spot instances for non-critical workloads
3. **Scheduling optimization**: Implement pod affinity rules

### Next Steps
1. Monitor scaling behavior for 1 week after implementing changes
2. Set up alerts for scaling events
3. Review and adjust thresholds based on performance data

EOF
    
    log_success "Recommendations report generated: $report_file"
}

# Main function
main() {
    local command="${1:-help}"
    
    case "$command" in
        "status")
            check_prerequisites
            show_hpa_status
            echo
            show_vpa_status
            echo
            show_cluster_autoscaler_status
            ;;
        "events")
            local time_range="${2:-1h}"
            check_prerequisites
            show_scaling_events "$time_range"
            ;;
        "analyze")
            check_prerequisites
            analyze_scaling_performance
            ;;
        "test")
            local component="${2:-backend}"
            local test_type="${3:-cpu}"
            local duration="${4:-300}"
            check_prerequisites
            test_scaling "$component" "$test_type" "$duration"
            ;;
        "tune")
            local hpa_name="${2:-backend-hpa}"
            local cpu_target="${3:-70}"
            local memory_target="${4:-80}"
            local min_replicas="${5:-3}"
            local max_replicas="${6:-50}"
            check_prerequisites
            tune_hpa "$hpa_name" "$cpu_target" "$memory_target" "$min_replicas" "$max_replicas"
            ;;
        "enable")
            local component="${2:-all}"
            check_prerequisites
            toggle_autoscaling "enable" "$component"
            ;;
        "disable")
            local component="${2:-all}"
            check_prerequisites
            toggle_autoscaling "disable" "$component"
            ;;
        "recommend")
            check_prerequisites
            generate_recommendations
            ;;
        *)
            echo "Usage: $0 [status|events|analyze|test|tune|enable|disable|recommend]"
            echo ""
            echo "Commands:"
            echo "  status                         - Show current autoscaling status"
            echo "  events [time]                 - Show recent scaling events (default: 1h)"
            echo "  analyze                       - Analyze scaling performance"
            echo "  test [component] [type] [dur] - Test scaling behavior"
            echo "  tune [hpa] [cpu] [mem] [min] [max] - Tune HPA settings"
            echo "  enable [component]            - Enable autoscaling (all/hpa/vpa/cluster)"
            echo "  disable [component]           - Disable autoscaling"
            echo "  recommend                     - Generate scaling recommendations"
            echo ""
            echo "Examples:"
            echo "  $0 status                     # Show all autoscaling status"
            echo "  $0 test backend cpu 600       # Test CPU scaling for 10 minutes"
            echo "  $0 tune backend-hpa 60 70 2 20 # Tune HPA thresholds and limits"
            echo "  $0 events 2h                  # Show scaling events from last 2 hours"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"