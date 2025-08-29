#!/bin/bash
# CLOS Network Connectivity Monitor - Test internal service communication

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
LOG_FILE="/var/log/clos-network.log"
METRICS_FILE="/var/log/clos-network-metrics.json"
TIMEOUT=10

# Network test definitions
declare -A NETWORK_TESTS=(
    # External connectivity
    ["external-dns"]="8.8.8.8:53"
    ["external-http"]="https://httpbin.org/status/200"
    
    # Internal Docker network
    ["docker-bridge"]="172.17.0.1:22"
    ["candlefish-network"]="172.20.0.1:22"
    
    # Core services internal communication
    ["postgres-internal"]="172.20.0.10:5432"
    ["redis-internal"]="172.20.0.11:6379"
    ["caddy-internal"]="172.20.0.12:80"
    ["rabbitmq-internal"]="172.20.0.13:5672"
    ["consul-internal"]="172.20.0.14:8500"
    ["jaeger-internal"]="172.20.0.15:16686"
    
    # Service-to-service communication
    ["security-frontend-to-api"]="172.20.1.11:4100"
    ["pkb-ui-to-api"]="172.20.2.11:8787"
    ["candlefish-web-to-api"]="172.20.3.11:4000"
)

# Service endpoints for HTTP checks
declare -A HTTP_ENDPOINTS=(
    ["security-dashboard"]="http://localhost:3100/health"
    ["security-api"]="http://localhost:4100/health"
    ["pkb-ui"]="http://localhost:8501/_stcore/health"
    ["pkb-api"]="http://localhost:8787/health"
    ["candlefish-web"]="http://localhost:3000/api/health"
    ["candlefish-api"]="http://localhost:4000/health"
    ["grafana"]="http://localhost:3001/api/health"
    ["prometheus"]="http://localhost:9090/-/healthy"
)

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

# Test TCP connectivity
test_tcp() {
    local target="$1"
    local timeout="${2:-$TIMEOUT}"
    
    local host="${target%:*}"
    local port="${target#*:}"
    
    if timeout "$timeout" bash -c "</dev/tcp/$host/$port" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Test HTTP endpoint
test_http() {
    local url="$1"
    local timeout="${2:-$TIMEOUT}"
    
    if curl -sf --max-time "$timeout" --connect-timeout 5 "$url" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Test DNS resolution
test_dns() {
    local hostname="$1"
    
    if nslookup "$hostname" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Test ping connectivity
test_ping() {
    local target="$1"
    local count="${2:-3}"
    
    if ping -c "$count" -W 2 "$target" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Test Docker network connectivity
test_docker_networks() {
    local results=()
    
    log "INFO" "Testing Docker network connectivity"
    
    # Check if candlefish-network exists
    if docker network ls | grep -q candlefish-network; then
        log "SUCCESS" "candlefish-network exists"
        
        # Test network connectivity between containers
        local containers=(
            "clos-postgres:172.20.0.10"
            "clos-redis:172.20.0.11" 
            "clos-caddy:172.20.0.12"
        )
        
        for container_info in "${containers[@]}"; do
            local container="${container_info%:*}"
            local ip="${container_info#*:}"
            
            if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
                # Test from caddy to other services
                if docker exec clos-caddy ping -c 1 -W 2 "$ip" >/dev/null 2>&1; then
                    log "SUCCESS" "Network connectivity: clos-caddy -> $container ($ip)"
                    results+=("$container:success")
                else
                    log "ERROR" "Network connectivity failed: clos-caddy -> $container ($ip)"
                    results+=("$container:failed")
                fi
            else
                log "WARN" "Container not running: $container"
                results+=("$container:not_running")
            fi
        done
    else
        log "ERROR" "candlefish-network does not exist"
        results+=("candlefish-network:missing")
    fi
    
    echo "${results[@]}"
}

# Test service endpoints
test_service_endpoints() {
    local results=()
    
    log "INFO" "Testing service HTTP endpoints"
    
    for service in "${!HTTP_ENDPOINTS[@]}"; do
        local endpoint="${HTTP_ENDPOINTS[$service]}"
        
        if test_http "$endpoint"; then
            log "SUCCESS" "HTTP endpoint healthy: $service ($endpoint)"
            results+=("$service:healthy")
        else
            log "ERROR" "HTTP endpoint failed: $service ($endpoint)"
            results+=("$service:failed")
        fi
    done
    
    echo "${results[@]}"
}

# Test external connectivity
test_external_connectivity() {
    local results=()
    
    log "INFO" "Testing external connectivity"
    
    # Test DNS resolution
    if test_dns "google.com"; then
        log "SUCCESS" "DNS resolution working"
        results+=("dns:success")
    else
        log "ERROR" "DNS resolution failed"
        results+=("dns:failed")
    fi
    
    # Test external HTTP
    if test_http "https://httpbin.org/status/200" 5; then
        log "SUCCESS" "External HTTP connectivity working"
        results+=("http:success")
    else
        log "ERROR" "External HTTP connectivity failed"
        results+=("http:failed")
    fi
    
    # Test ping to external host
    if test_ping "8.8.8.8" 2; then
        log "SUCCESS" "External ping connectivity working"
        results+=("ping:success")
    else
        log "ERROR" "External ping connectivity failed"
        results+=("ping:failed")
    fi
    
    echo "${results[@]}"
}

# Generate network metrics
generate_network_metrics() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Get network test results
    local docker_results=($(test_docker_networks))
    local endpoint_results=($(test_service_endpoints))
    local external_results=($(test_external_connectivity))
    
    # Count successes and failures
    local docker_success=0 docker_failed=0
    local endpoint_success=0 endpoint_failed=0  
    local external_success=0 external_failed=0
    
    for result in "${docker_results[@]}"; do
        if [[ "$result" == *":success" ]]; then
            ((docker_success++))
        else
            ((docker_failed++))
        fi
    done
    
    for result in "${endpoint_results[@]}"; do
        if [[ "$result" == *":healthy" ]]; then
            ((endpoint_success++))
        else
            ((endpoint_failed++))
        fi
    done
    
    for result in "${external_results[@]}"; do
        if [[ "$result" == *":success" ]]; then
            ((external_success++))
        else
            ((external_failed++))
        fi
    done
    
    # Generate JSON metrics
    cat > "$METRICS_FILE" << EOF
{
  "timestamp": "$timestamp",
  "docker_network": {
    "healthy": $docker_success,
    "failed": $docker_failed,
    "details": [$(printf '"%s",' "${docker_results[@]}" | sed 's/,$//')],
    "candlefish_network_exists": $(docker network ls | grep -q candlefish-network && echo "true" || echo "false")
  },
  "service_endpoints": {
    "healthy": $endpoint_success,
    "failed": $endpoint_failed,
    "total": ${#HTTP_ENDPOINTS[@]},
    "details": [$(printf '"%s",' "${endpoint_results[@]}" | sed 's/,$//')],
    "uptime_percentage": $(echo "scale=2; $endpoint_success * 100 / ${#HTTP_ENDPOINTS[@]}" | bc -l)
  },
  "external_connectivity": {
    "healthy": $external_success,
    "failed": $external_failed,
    "details": [$(printf '"%s",' "${external_results[@]}" | sed 's/,$//')],
    "status": "$([ $external_failed -eq 0 ] && echo "healthy" || echo "degraded")"
  },
  "network_interfaces": $(ip -json addr show | jq -c 'map({name: .ifname, state: .operstate, addresses: [.addr_info[].local]})')
}
EOF
}

# Main function
main() {
    local start_time=$(date +%s)
    
    log "INFO" "Starting CLOS network connectivity tests"
    
    # Test Docker availability
    if ! docker info >/dev/null 2>&1; then
        log "ERROR" "Docker is not available"
        exit 1
    fi
    
    # Generate comprehensive network metrics
    generate_network_metrics
    
    # Summary
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "INFO" "Network connectivity tests completed in ${duration}s"
    log "INFO" "Metrics saved to $METRICS_FILE"
    
    # Check if any critical tests failed
    if grep -q '"failed":[^0]' "$METRICS_FILE" || grep -q '"status":"degraded"' "$METRICS_FILE"; then
        log "WARN" "Some network connectivity tests failed - check metrics for details"
        return 1
    else
        log "SUCCESS" "All network connectivity tests passed"
        return 0
    fi
}

# Cleanup function
cleanup() {
    log "INFO" "Network connectivity test interrupted"
    exit 130
}

# Signal handling  
trap cleanup SIGINT SIGTERM

# Create log directories
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$METRICS_FILE")"

# Run main function
main "$@"