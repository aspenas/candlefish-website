#!/bin/bash
# CLOS Resource Monitor - Track system and container resource usage

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
METRICS_FILE="/var/log/clos-resource-metrics.json"
LOG_FILE="/var/log/clos-resource-monitor.log"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_DISK=90

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
    
    case "$level" in
        "ERROR") echo -e "${RED}[$timestamp] [$level] $message${NC}" ;;
        "WARN") echo -e "${YELLOW}[$timestamp] [$level] $message${NC}" ;;
        "INFO") echo -e "${BLUE}[$timestamp] [$level] $message${NC}" ;;
        "SUCCESS") echo -e "${GREEN}[$timestamp] [$level] $message${NC}" ;;
    esac
}

# Get system CPU usage
get_cpu_usage() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    if [[ -z "$cpu_usage" ]]; then
        # Fallback method
        cpu_usage=$(grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}')
    fi
    printf "%.1f" "$cpu_usage"
}

# Get system memory usage
get_memory_usage() {
    local mem_info=$(free | grep Mem)
    local total=$(echo "$mem_info" | awk '{print $2}')
    local used=$(echo "$mem_info" | awk '{print $3}')
    local usage=$(echo "scale=1; $used * 100 / $total" | bc -l)
    echo "$usage"
}

# Get disk usage
get_disk_usage() {
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    echo "$disk_usage"
}

# Get system load average
get_load_average() {
    local load=$(uptime | awk -F'load average:' '{print $2}' | sed 's/^[ \t]*//')
    echo "$load"
}

# Get container resource usage
get_container_metrics() {
    local container_name="$1"
    
    if ! docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
        echo "null"
        return
    fi
    
    local stats=$(docker stats "$container_name" --no-stream --format "table {{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}}")
    
    if [[ -n "$stats" ]]; then
        # Parse docker stats output
        local cpu_perc=$(echo "$stats" | tail -1 | cut -d',' -f1 | sed 's/%//')
        local mem_usage=$(echo "$stats" | tail -1 | cut -d',' -f2)
        local mem_perc=$(echo "$stats" | tail -1 | cut -d',' -f3 | sed 's/%//')
        local net_io=$(echo "$stats" | tail -1 | cut -d',' -f4)
        local block_io=$(echo "$stats" | tail -1 | cut -d',' -f5)
        
        cat << EOF
{
  "cpu_percent": "${cpu_perc:-0}",
  "memory_usage": "$mem_usage",
  "memory_percent": "${mem_perc:-0}",
  "network_io": "$net_io",
  "block_io": "$block_io"
}
EOF
    else
        echo "null"
    fi
}

# Get all container metrics
get_all_container_metrics() {
    local containers=(
        "clos-caddy"
        "clos-postgres"
        "clos-redis"
        "security-dashboard-frontend"
        "security-dashboard-api"
        "pkb-ui"
        "pkb-api"
        "candlefish-web"
        "candlefish-api"
        "clos-grafana"
        "clos-prometheus"
    )
    
    echo "{"
    local first=true
    for container in "${containers[@]}"; do
        if [[ "$first" == "true" ]]; then
            first=false
        else
            echo ","
        fi
        
        echo -n "  \"$container\": "
        get_container_metrics "$container" | tr -d '\n'
    done
    echo ""
    echo "}"
}

# Check thresholds and generate alerts
check_thresholds() {
    local cpu_usage="$1"
    local memory_usage="$2" 
    local disk_usage="$3"
    
    local alerts=()
    
    if (( $(echo "$cpu_usage > $ALERT_THRESHOLD_CPU" | bc -l) )); then
        alerts+=("High CPU usage: ${cpu_usage}%")
        log "WARN" "High CPU usage: ${cpu_usage}%"
    fi
    
    if (( $(echo "$memory_usage > $ALERT_THRESHOLD_MEMORY" | bc -l) )); then
        alerts+=("High memory usage: ${memory_usage}%")
        log "WARN" "High memory usage: ${memory_usage}%"
    fi
    
    if [[ "$disk_usage" -gt "$ALERT_THRESHOLD_DISK" ]]; then
        alerts+=("High disk usage: ${disk_usage}%")
        log "WARN" "High disk usage: ${disk_usage}%"
    fi
    
    if [[ ${#alerts[@]} -eq 0 ]]; then
        log "SUCCESS" "All resource usage within normal thresholds"
        return 0
    else
        for alert in "${alerts[@]}"; do
            log "ERROR" "ALERT: $alert"
        done
        return 1
    fi
}

# Generate comprehensive metrics JSON
generate_metrics() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local cpu_usage=$(get_cpu_usage)
    local memory_usage=$(get_memory_usage)
    local disk_usage=$(get_disk_usage)
    local load_average=$(get_load_average)
    
    log "INFO" "Collecting system metrics - CPU: ${cpu_usage}%, Memory: ${memory_usage}%, Disk: ${disk_usage}%"
    
    # Get container metrics
    local container_metrics=$(get_all_container_metrics)
    
    # Generate complete metrics JSON
    cat > "$METRICS_FILE" << EOF
{
  "timestamp": "$timestamp",
  "system": {
    "cpu_usage_percent": $cpu_usage,
    "memory_usage_percent": $memory_usage,
    "disk_usage_percent": $disk_usage,
    "load_average": "$load_average",
    "uptime": "$(uptime -p)",
    "kernel_version": "$(uname -r)",
    "architecture": "$(uname -m)"
  },
  "docker": {
    "version": "$(docker --version | awk '{print $3}' | sed 's/,//')",
    "info": {
      "containers_running": $(docker ps -q | wc -l),
      "containers_total": $(docker ps -a -q | wc -l),
      "images": $(docker images -q | wc -l),
      "volumes": $(docker volume ls -q | wc -l),
      "networks": $(docker network ls -q | wc -l)
    }
  },
  "containers": $container_metrics,
  "alerts": {
    "cpu_threshold": $ALERT_THRESHOLD_CPU,
    "memory_threshold": $ALERT_THRESHOLD_MEMORY,
    "disk_threshold": $ALERT_THRESHOLD_DISK,
    "triggered": $(check_thresholds "$cpu_usage" "$memory_usage" "$disk_usage" >/dev/null 2>&1 && echo "false" || echo "true")
  }
}
EOF
    
    log "INFO" "Resource metrics collected and saved to $METRICS_FILE"
}

# Main monitoring function
main() {
    log "INFO" "Starting CLOS resource monitoring"
    
    # Check if Docker is available
    if ! docker info >/dev/null 2>&1; then
        log "ERROR" "Docker is not available"
        exit 1
    fi
    
    # Check if bc is available for calculations
    if ! command -v bc >/dev/null 2>&1; then
        log "WARN" "bc calculator not available - some calculations may be inaccurate"
    fi
    
    # Generate metrics
    generate_metrics
    
    # Get system metrics for threshold checking
    local cpu_usage=$(get_cpu_usage)
    local memory_usage=$(get_memory_usage)
    local disk_usage=$(get_disk_usage)
    
    # Check thresholds and alert if necessary
    if ! check_thresholds "$cpu_usage" "$memory_usage" "$disk_usage"; then
        log "WARN" "Resource usage thresholds exceeded"
        exit 1
    fi
    
    log "SUCCESS" "Resource monitoring completed successfully"
    return 0
}

# Cleanup function
cleanup() {
    log "INFO" "Resource monitoring interrupted"
    exit 130
}

# Signal handling
trap cleanup SIGINT SIGTERM

# Create log directories
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$METRICS_FILE")"

# Run main function
main "$@"