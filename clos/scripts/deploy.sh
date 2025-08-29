#!/bin/bash
# CLOS Deployment Script - Deploy and manage CLOS services

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script directory and CLOS root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLOS_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
COMPOSE_BASE="$CLOS_ROOT/deployment/docker-compose.base.yml"
SERVICES_DIR="$CLOS_ROOT/deployment/services"
CONFIG_FILE="$CLOS_ROOT/.clos/config.yaml"

# Available service groups
AVAILABLE_SERVICES=("core" "security-dashboard" "pkb" "candlefish" "monitoring" "all")

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    case "$level" in
        "ERROR") echo -e "${RED}[$timestamp] [$level] $message${NC}" ;;
        "WARN") echo -e "${YELLOW}[$timestamp] [$level] $message${NC}" ;;
        "INFO") echo -e "${BLUE}[$timestamp] [$level] $message${NC}" ;;
        "SUCCESS") echo -e "${GREEN}[$timestamp] [$level] $message${NC}" ;;
    esac
}

# Show usage
show_usage() {
    echo -e "${BLUE}CLOS Deployment Script${NC}"
    echo ""
    echo -e "${BLUE}Usage:${NC}"
    echo "  $0 <command> [service_group] [options]"
    echo ""
    echo -e "${BLUE}Commands:${NC}"
    echo "  up [group]       - Start services (default: core)"
    echo "  down [group]     - Stop services (default: all)"
    echo "  restart [group]  - Restart services (default: core)"
    echo "  status           - Show service status"
    echo "  logs [service]   - Show service logs"
    echo "  build [group]    - Build service images"
    echo "  pull [group]     - Pull latest images"
    echo "  health           - Run health checks"
    echo "  cleanup          - Clean up unused resources"
    echo "  install          - Install as systemd service"
    echo ""
    echo -e "${BLUE}Service Groups:${NC}"
    echo "  core             - Core infrastructure (postgres, redis, caddy, etc.)"
    echo "  security-dashboard - Security dashboard frontend and API"
    echo "  pkb              - Personal Knowledge Base"
    echo "  candlefish       - Main Candlefish application"
    echo "  monitoring       - Monitoring stack (prometheus, grafana, etc.)"
    echo "  all              - All services"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  $0 up core                    - Start core services"
    echo "  $0 up security-dashboard      - Start security dashboard"
    echo "  $0 up all                     - Start all services"
    echo "  $0 down                       - Stop all services"
    echo "  $0 logs security-dashboard-api - Show API logs"
    echo "  $0 health                     - Run health checks"
}

# Check prerequisites
check_prerequisites() {
    local missing=()
    
    # Check Docker
    if ! command -v docker >/dev/null 2>&1; then
        missing+=("docker")
    elif ! docker info >/dev/null 2>&1; then
        log "ERROR" "Docker is installed but not running"
        return 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1; then
        missing+=("docker-compose")
    fi
    
    # Check required files
    if [[ ! -f "$COMPOSE_BASE" ]]; then
        log "ERROR" "Base compose file not found: $COMPOSE_BASE"
        return 1
    fi
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log "ERROR" "Missing prerequisites: ${missing[*]}"
        log "INFO" "Please install missing components and try again"
        return 1
    fi
    
    return 0
}

# Get compose files for service group
get_compose_files() {
    local group="$1"
    local files=("-f" "$COMPOSE_BASE")
    
    case "$group" in
        "core")
            # Only base compose file needed
            ;;
        "security-dashboard"|"security")
            files+=("-f" "$SERVICES_DIR/security-dashboard.yml")
            ;;
        "pkb")
            files+=("-f" "$SERVICES_DIR/pkb.yml")
            ;;
        "candlefish"|"main")
            files+=("-f" "$SERVICES_DIR/candlefish.yml")
            ;;
        "monitoring"|"monitor")
            files+=("-f" "$SERVICES_DIR/monitoring.yml")
            ;;
        "all")
            files+=("-f" "$SERVICES_DIR/security-dashboard.yml")
            files+=("-f" "$SERVICES_DIR/pkb.yml")
            files+=("-f" "$SERVICES_DIR/candlefish.yml")
            files+=("-f" "$SERVICES_DIR/monitoring.yml")
            ;;
        *)
            log "ERROR" "Unknown service group: $group"
            log "INFO" "Available groups: ${AVAILABLE_SERVICES[*]}"
            return 1
            ;;
    esac
    
    echo "${files[@]}"
}

# Start services
start_services() {
    local group="${1:-core}"
    
    log "INFO" "Starting CLOS services: $group"
    
    local compose_files=($(get_compose_files "$group"))
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    cd "$CLOS_ROOT"
    
    # Create network if it doesn't exist
    if ! docker network ls | grep -q clos-network; then
        log "INFO" "Creating clos-network"
        docker network create clos-network --driver bridge
    fi
    
    # Start services
    docker-compose "${compose_files[@]}" up -d
    
    if [[ $? -eq 0 ]]; then
        log "SUCCESS" "Services started successfully"
        
        # Wait for services to be ready
        log "INFO" "Waiting for services to be ready..."
        sleep 10
        
        # Show service status
        show_status
    else
        log "ERROR" "Failed to start services"
        return 1
    fi
}

# Stop services
stop_services() {
    local group="${1:-all}"
    
    log "INFO" "Stopping CLOS services: $group"
    
    local compose_files=($(get_compose_files "$group"))
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    cd "$CLOS_ROOT"
    
    docker-compose "${compose_files[@]}" down --timeout 60
    
    if [[ $? -eq 0 ]]; then
        log "SUCCESS" "Services stopped successfully"
    else
        log "ERROR" "Failed to stop services"
        return 1
    fi
}

# Restart services
restart_services() {
    local group="${1:-core}"
    
    log "INFO" "Restarting CLOS services: $group"
    
    stop_services "$group"
    sleep 5
    start_services "$group"
}

# Show service status
show_status() {
    log "INFO" "CLOS Service Status"
    echo ""
    
    # Show running containers with CLOS labels
    if docker ps --filter "label=clos.service" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep -v "NAMES"; then
        echo ""
    else
        log "WARN" "No CLOS services running"
    fi
    
    # Show network info
    if docker network ls | grep -q clos-network; then
        log "SUCCESS" "clos-network is available"
    else
        log "WARN" "clos-network not found"
    fi
    
    # Show volume info
    local volumes=$(docker volume ls --filter "name=clos" --quiet | wc -l | xargs)
    log "INFO" "CLOS volumes: $volumes"
}

# Show service logs
show_logs() {
    local service="$1"
    local follow="${2:-false}"
    
    cd "$CLOS_ROOT"
    
    local compose_files=("-f" "$COMPOSE_BASE")
    compose_files+=("-f" "$SERVICES_DIR/security-dashboard.yml")
    compose_files+=("-f" "$SERVICES_DIR/pkb.yml")
    compose_files+=("-f" "$SERVICES_DIR/candlefish.yml")
    compose_files+=("-f" "$SERVICES_DIR/monitoring.yml")
    
    if [[ "$follow" == "true" ]]; then
        docker-compose "${compose_files[@]}" logs -f "$service"
    else
        docker-compose "${compose_files[@]}" logs --tail=50 "$service"
    fi
}

# Build service images
build_services() {
    local group="${1:-all}"
    
    log "INFO" "Building CLOS service images: $group"
    
    local compose_files=($(get_compose_files "$group"))
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    cd "$CLOS_ROOT"
    
    docker-compose "${compose_files[@]}" build --parallel
    
    if [[ $? -eq 0 ]]; then
        log "SUCCESS" "Images built successfully"
    else
        log "ERROR" "Failed to build images"
        return 1
    fi
}

# Pull latest images
pull_images() {
    local group="${1:-all}"
    
    log "INFO" "Pulling latest images: $group"
    
    local compose_files=($(get_compose_files "$group"))
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    cd "$CLOS_ROOT"
    
    docker-compose "${compose_files[@]}" pull
    
    if [[ $? -eq 0 ]]; then
        log "SUCCESS" "Images pulled successfully"
    else
        log "ERROR" "Failed to pull images"
        return 1
    fi
}

# Run health checks
run_health_checks() {
    log "INFO" "Running CLOS health checks"
    
    local health_script="$CLOS_ROOT/deployment/health-checks/check-all-services.sh"
    
    if [[ -f "$health_script" ]]; then
        bash "$health_script"
    else
        log "ERROR" "Health check script not found: $health_script"
        return 1
    fi
}

# Clean up unused resources
cleanup_resources() {
    log "INFO" "Cleaning up unused Docker resources"
    
    # Remove stopped containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (be careful with this)
    log "WARN" "Removing unused volumes (excluding CLOS volumes)"
    docker volume prune -f --filter "label!=clos.volume"
    
    # Remove unused networks
    docker network prune -f
    
    log "SUCCESS" "Cleanup completed"
}

# Install as systemd service
install_systemd_service() {
    local install_script="$CLOS_ROOT/scripts/systemd/install-service.sh"
    
    if [[ -f "$install_script" ]]; then
        log "INFO" "Installing CLOS as systemd service"
        sudo bash "$install_script"
    else
        log "ERROR" "Install script not found: $install_script"
        return 1
    fi
}

# Main function
main() {
    local command="${1:-}"
    
    if [[ -z "$command" ]]; then
        show_usage
        exit 1
    fi
    
    # Change to CLOS root directory
    cd "$CLOS_ROOT"
    
    # Check prerequisites
    if ! check_prerequisites; then
        exit 1
    fi
    
    case "$command" in
        "up"|"start")
            start_services "${2:-core}"
            ;;
        "down"|"stop")
            stop_services "${2:-all}"
            ;;
        "restart")
            restart_services "${2:-core}"
            ;;
        "status")
            show_status
            ;;
        "logs")
            if [[ -n "${2:-}" ]]; then
                show_logs "$2" "${3:-false}"
            else
                log "ERROR" "Service name required for logs command"
                exit 1
            fi
            ;;
        "build")
            build_services "${2:-all}"
            ;;
        "pull")
            pull_images "${2:-all}"
            ;;
        "health")
            run_health_checks
            ;;
        "cleanup")
            cleanup_resources
            ;;
        "install")
            install_systemd_service
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            log "ERROR" "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"