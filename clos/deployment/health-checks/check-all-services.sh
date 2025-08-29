#!/bin/bash
# CLOS Health Check - Monitor all services and report status

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
HEALTH_CHECK_TIMEOUT=10
LOG_FILE="/var/log/clos-health.log"
METRICS_FILE="/var/log/clos-metrics.json"
ALERT_THRESHOLD=3  # Number of consecutive failures before alerting

# Service definitions
declare -A SERVICES=(
    # Core Infrastructure
    ["clos-caddy"]="http://localhost:2019/config/"
    ["clos-postgres"]="tcp:localhost:5432"
    ["clos-redis"]="tcp:localhost:6379"
    ["clos-rabbitmq"]="http://localhost:15672/"
    ["clos-consul"]="http://localhost:8500/v1/status/leader"
    ["clos-jaeger"]="http://localhost:16686/"
    
    # Security Dashboard
    ["security-dashboard-frontend"]="http://localhost:3100/health"
    ["security-dashboard-api"]="http://localhost:4100/health"
    ["security-dashboard-postgres"]="tcp:localhost:5433"
    ["security-dashboard-redis"]="tcp:localhost:6380"
    
    # PKB
    ["pkb-ui"]="http://localhost:8501/_stcore/health"
    ["pkb-api"]="http://localhost:8787/health"
    ["pkb-postgres"]="tcp:localhost:5434"
    ["pkb-elasticsearch"]="http://localhost:9201/_cluster/health"
    ["pkb-minio"]="http://localhost:9000/minio/health/live"
    
    # Candlefish
    ["candlefish-web"]="http://localhost:3000/api/health"
    ["candlefish-api"]="http://localhost:4000/health"
    ["candlefish-postgres"]="tcp:localhost:5435"
    ["candlefish-redis"]="tcp:localhost:6381"
    
    # Monitoring
    ["clos-prometheus"]="http://localhost:9090/-/healthy"
    ["clos-grafana"]="http://localhost:3001/api/health"
    ["clos-alertmanager"]="http://localhost:9093/-/healthy"
    ["clos-loki"]="http://localhost:3100/ready"
    ["clos-tempo"]="http://localhost:3200/ready"
    ["clos-node-exporter"]="http://localhost:9100/metrics"
    ["clos-cadvisor"]="http://localhost:8080/healthz"
)

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE" >&2
    
    case "$level" in
        "ERROR")
            echo -e "${RED}[$timestamp] [$level] $message${NC}"
            ;;
        "WARN")
            echo -e "${YELLOW}[$timestamp] [$level] $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}[$timestamp] [$level] $message${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[$timestamp] [$level] $message${NC}"
            ;;
    esac
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log "ERROR" "Docker is not running"
        return 1
    fi
    return 0
}

# Check HTTP endpoint
check_http() {
    local url="$1"
    local timeout="${2:-$HEALTH_CHECK_TIMEOUT}"
    
    if curl -sf --max-time "$timeout" --connect-timeout 5 "$url" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check TCP port
check_tcp() {
    local host_port="$1"
    local timeout="${2:-$HEALTH_CHECK_TIMEOUT}"
    
    local host="${host_port%:*}"
    local port="${host_port#*:}"
    
    if timeout "$timeout" bash -c "</dev/tcp/$host/$port" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check individual service
check_service() {
    local service="$1"
    local endpoint="$2"
    
    # Check if container is running
    if ! docker ps --format "{{.Names}}" | grep -q "^${service}$"; then
        log "WARN" "$service: Container not running"
        return 2  # Container not running
    fi
    
    # Check service endpoint
    if [[ "$endpoint" =~ ^http ]]; then
        if check_http "$endpoint"; then
            log "SUCCESS" "$service: Healthy (HTTP)"
            return 0
        else
            log "ERROR" "$service: Health check failed (HTTP: $endpoint)"
            return 1
        fi
    elif [[ "$endpoint" =~ ^tcp: ]]; then
        local tcp_endpoint="${endpoint#tcp:}"
        if check_tcp "$tcp_endpoint"; then
            log "SUCCESS" "$service: Healthy (TCP)"
            return 0
        else
            log "ERROR" "$service: Health check failed (TCP: $tcp_endpoint)"
            return 1
        fi
    else
        log "WARN" "$service: Unknown endpoint type: $endpoint"
        return 3
    fi
}

# Generate metrics JSON
generate_metrics() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local healthy_count=0
    local unhealthy_count=0
    local not_running_count=0
    
    # Count service states
    for service in "${!SERVICES[@]}"; do
        if docker ps --format "{{.Names}}" | grep -q "^${service}$"; then
            if check_service "$service" "${SERVICES[$service]}" >/dev/null 2>&1; then
                ((healthy_count++))
            else
                ((unhealthy_count++))
            fi
        else
            ((not_running_count++))
        fi
    done
    
    # Generate JSON metrics
    cat > "$METRICS_FILE" << EOF
{
  "timestamp": "$timestamp",
  "total_services": ${#SERVICES[@]},
  "healthy": $healthy_count,
  "unhealthy": $unhealthy_count,
  "not_running": $not_running_count,
  "uptime_percentage": $(echo "scale=2; $healthy_count * 100 / ${#SERVICES[@]}" | bc -l),
  "docker_status": "$(docker info >/dev/null 2>&1 && echo "running" || echo "stopped")",
  "system_load": "$(uptime | awk -F'load average:' '{print $2}' | cut -d, -f1 | xargs)",
  "memory_usage": "$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')",
  "disk_usage": "$(df / | tail -1 | awk '{print $5}' | sed 's/%//')"
}
EOF
}

# Send alerts (placeholder for integration with monitoring systems)
send_alert() {
    local service="$1"
    local status="$2"
    local message="$3"
    
    log "ERROR" "ALERT: $service - $status - $message"
    
    # TODO: Integrate with alerting systems (Slack, PagerDuty, etc.)
    # Example webhook call:
    # curl -X POST "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" \
    #   -H "Content-Type: application/json" \
    #   -d "{\"text\": \"CLOS Alert: $service is $status - $message\"}"
}

# Main health check function
main() {
    local start_time=$(date +%s)
    local failed_services=()
    local exit_code=0
    
    log "INFO" "Starting CLOS health check"
    
    # Check Docker first
    if ! check_docker; then
        log "ERROR" "Docker is not available - aborting health checks"
        exit 1
    fi
    
    # Check all services
    for service in "${!SERVICES[@]}"; do
        local endpoint="${SERVICES[$service]}"
        
        if ! check_service "$service" "$endpoint"; then
            failed_services+=("$service")
            exit_code=1
        fi
        
        # Small delay between checks to avoid overwhelming services
        sleep 0.1
    done
    
    # Generate metrics
    generate_metrics
    
    # Summary
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local healthy_count=$((${#SERVICES[@]} - ${#failed_services[@]}))
    
    if [[ ${#failed_services[@]} -eq 0 ]]; then
        log "SUCCESS" "All ${#SERVICES[@]} services are healthy (checked in ${duration}s)"
    else
        log "ERROR" "${#failed_services[@]} of ${#SERVICES[@]} services failed health checks:"
        for service in "${failed_services[@]}"; do
            log "ERROR" "  - $service"
        done
        
        # Send alerts for failed services
        for service in "${failed_services[@]}"; do
            send_alert "$service" "unhealthy" "Service failed health check"
        done
    fi
    
    log "INFO" "Health check completed - ${healthy_count}/${#SERVICES[@]} healthy"
    
    return $exit_code
}

# Cleanup function
cleanup() {
    log "INFO" "Health check interrupted"
    exit 130
}

# Signal handling
trap cleanup SIGINT SIGTERM

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$METRICS_FILE")"

# Run main function
main "$@"