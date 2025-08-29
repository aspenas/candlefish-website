#!/bin/bash
# CLOS Shell Integration - Provides context-aware shell enhancements
# Source this file in your .zshrc or .bashrc for CLOS integration

# Colors
export CLOS_COLOR_PRIMARY='\033[0;36m'    # Cyan
export CLOS_COLOR_SUCCESS='\033[0;32m'    # Green
export CLOS_COLOR_WARNING='\033[1;33m'    # Yellow
export CLOS_COLOR_ERROR='\033[0;31m'      # Red
export CLOS_COLOR_INFO='\033[0;34m'       # Blue
export CLOS_COLOR_RESET='\033[0m'         # No Color

# CLOS environment detection
export CLOS_ROOT="${CLOS_ROOT:-$(pwd)}"
export CLOS_CONFIG_PATH="${CLOS_CONFIG_PATH:-${CLOS_ROOT}/.clos/config.yaml}"
export CLOS_LOG_LEVEL="${CLOS_LOG_LEVEL:-info}"

# Function to detect if we're in a CLOS project
clos_detect_project() {
    local current_dir="$PWD"
    while [[ "$current_dir" != "/" ]]; do
        if [[ -f "$current_dir/.clos/config.yaml" ]] || [[ -f "$current_dir/clos" ]]; then
            export CLOS_PROJECT_ROOT="$current_dir"
            export CLOS_PROJECT_NAME="$(basename "$current_dir")"
            return 0
        fi
        current_dir="$(dirname "$current_dir")"
    done
    unset CLOS_PROJECT_ROOT
    unset CLOS_PROJECT_NAME
    return 1
}

# Function to get CLOS status
clos_status() {
    if ! clos_detect_project; then
        echo -e "${CLOS_COLOR_WARNING}Not in a CLOS project${CLOS_COLOR_RESET}"
        return 1
    fi
    
    echo -e "${CLOS_COLOR_INFO}CLOS Project: ${CLOS_COLOR_PRIMARY}$CLOS_PROJECT_NAME${CLOS_COLOR_RESET}"
    echo -e "${CLOS_COLOR_INFO}Root: ${CLOS_COLOR_PRIMARY}$CLOS_PROJECT_ROOT${CLOS_COLOR_RESET}"
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        echo -e "${CLOS_COLOR_ERROR}Docker is not running${CLOS_COLOR_RESET}"
        return 1
    fi
    
    # Check CLOS services status
    local base_compose="$CLOS_PROJECT_ROOT/deployment/docker-compose.base.yml"
    if [[ -f "$base_compose" ]]; then
        echo -e "\n${CLOS_COLOR_INFO}Service Status:${CLOS_COLOR_RESET}"
        
        # Get running containers with CLOS labels
        local running_containers=$(docker ps --filter "label=clos.service" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null)
        
        if [[ -n "$running_containers" ]]; then
            echo "$running_containers"
        else
            echo -e "${CLOS_COLOR_WARNING}No CLOS services running${CLOS_COLOR_RESET}"
        fi
    fi
}

# Function to start CLOS services
clos_up() {
    if ! clos_detect_project; then
        echo -e "${CLOS_COLOR_ERROR}Not in a CLOS project${CLOS_COLOR_RESET}"
        return 1
    fi
    
    local services="${1:-core}"
    
    echo -e "${CLOS_COLOR_INFO}Starting CLOS services: ${CLOS_COLOR_PRIMARY}$services${CLOS_COLOR_RESET}"
    
    cd "$CLOS_PROJECT_ROOT"
    
    case "$services" in
        "core")
            docker-compose -f deployment/docker-compose.base.yml up -d
            ;;
        "security-dashboard"|"security")
            docker-compose -f deployment/docker-compose.base.yml \
                          -f deployment/services/security-dashboard.yml up -d
            ;;
        "pkb")
            docker-compose -f deployment/docker-compose.base.yml \
                          -f deployment/services/pkb.yml up -d
            ;;
        "candlefish"|"main")
            docker-compose -f deployment/docker-compose.base.yml \
                          -f deployment/services/candlefish.yml up -d
            ;;
        "monitoring"|"monitor")
            docker-compose -f deployment/docker-compose.base.yml \
                          -f deployment/services/monitoring.yml up -d
            ;;
        "all")
            docker-compose -f deployment/docker-compose.base.yml \
                          -f deployment/services/security-dashboard.yml \
                          -f deployment/services/pkb.yml \
                          -f deployment/services/candlefish.yml \
                          -f deployment/services/monitoring.yml up -d
            ;;
        *)
            echo -e "${CLOS_COLOR_ERROR}Unknown service group: $services${CLOS_COLOR_RESET}"
            echo -e "${CLOS_COLOR_INFO}Available groups: core, security-dashboard, pkb, candlefish, monitoring, all${CLOS_COLOR_RESET}"
            return 1
            ;;
    esac
    
    cd - > /dev/null
    echo -e "${CLOS_COLOR_SUCCESS}CLOS services started${CLOS_COLOR_RESET}"
}

# Function to stop CLOS services
clos_down() {
    if ! clos_detect_project; then
        echo -e "${CLOS_COLOR_ERROR}Not in a CLOS project${CLOS_COLOR_RESET}"
        return 1
    fi
    
    echo -e "${CLOS_COLOR_INFO}Stopping CLOS services...${CLOS_COLOR_RESET}"
    
    cd "$CLOS_PROJECT_ROOT"
    
    docker-compose -f deployment/docker-compose.base.yml \
                  -f deployment/services/security-dashboard.yml \
                  -f deployment/services/pkb.yml \
                  -f deployment/services/candlefish.yml \
                  -f deployment/services/monitoring.yml down
    
    cd - > /dev/null
    echo -e "${CLOS_COLOR_SUCCESS}CLOS services stopped${CLOS_COLOR_RESET}"
}

# Function to restart CLOS services
clos_restart() {
    clos_down && clos_up "${1:-core}"
}

# Function to view CLOS logs
clos_logs() {
    if ! clos_detect_project; then
        echo -e "${CLOS_COLOR_ERROR}Not in a CLOS project${CLOS_COLOR_RESET}"
        return 1
    fi
    
    local service="${1:-}"
    local follow_flag=""
    
    if [[ "$2" == "-f" ]] || [[ "$2" == "--follow" ]]; then
        follow_flag="-f"
    fi
    
    cd "$CLOS_PROJECT_ROOT"
    
    if [[ -n "$service" ]]; then
        docker-compose -f deployment/docker-compose.base.yml \
                      -f deployment/services/security-dashboard.yml \
                      -f deployment/services/pkb.yml \
                      -f deployment/services/candlefish.yml \
                      -f deployment/services/monitoring.yml logs $follow_flag "$service"
    else
        docker-compose -f deployment/docker-compose.base.yml \
                      -f deployment/services/security-dashboard.yml \
                      -f deployment/services/pkb.yml \
                      -f deployment/services/candlefish.yml \
                      -f deployment/services/monitoring.yml logs $follow_flag
    fi
    
    cd - > /dev/null
}

# Function to execute commands in CLOS containers
clos_exec() {
    if ! clos_detect_project; then
        echo -e "${CLOS_COLOR_ERROR}Not in a CLOS project${CLOS_COLOR_RESET}"
        return 1
    fi
    
    local container="$1"
    shift
    
    if [[ -z "$container" ]]; then
        echo -e "${CLOS_COLOR_ERROR}Container name required${CLOS_COLOR_RESET}"
        echo -e "${CLOS_COLOR_INFO}Usage: clos_exec <container_name> <command>${CLOS_COLOR_RESET}"
        return 1
    fi
    
    docker exec -it "$container" "${@:-bash}"
}

# Function to show CLOS help
clos_help() {
    echo -e "${CLOS_COLOR_PRIMARY}CLOS Shell Integration Commands:${CLOS_COLOR_RESET}"
    echo ""
    echo -e "${CLOS_COLOR_INFO}Project Management:${CLOS_COLOR_RESET}"
    echo -e "  clos_status              - Show CLOS project status"
    echo -e "  clos_up [group]          - Start CLOS services (groups: core, security, pkb, candlefish, monitoring, all)"
    echo -e "  clos_down                - Stop all CLOS services"
    echo -e "  clos_restart [group]     - Restart CLOS services"
    echo ""
    echo -e "${CLOS_COLOR_INFO}Service Management:${CLOS_COLOR_RESET}"
    echo -e "  clos_logs [service] [-f] - View service logs (use -f to follow)"
    echo -e "  clos_exec <container>    - Execute command in container"
    echo ""
    echo -e "${CLOS_COLOR_INFO}Monitoring:${CLOS_COLOR_RESET}"
    echo -e "  clos_health              - Check service health"
    echo -e "  clos_ps                  - Show running containers"
    echo ""
    echo -e "${CLOS_COLOR_INFO}Development:${CLOS_COLOR_RESET}"
    echo -e "  clos_build [service]     - Build service images"
    echo -e "  clos_clean               - Clean up unused images and volumes"
    echo ""
    echo -e "${CLOS_COLOR_INFO}Quick Access URLs:${CLOS_COLOR_RESET}"
    echo -e "  Security Dashboard:      http://security.local"
    echo -e "  PKB:                     http://pkb.local" 
    echo -e "  Candlefish:              http://candlefish.local"
    echo -e "  Grafana:                 http://grafana.local"
    echo -e "  Prometheus:              http://prometheus.local"
}

# Health check function
clos_health() {
    if ! clos_detect_project; then
        echo -e "${CLOS_COLOR_ERROR}Not in a CLOS project${CLOS_COLOR_RESET}"
        return 1
    fi
    
    echo -e "${CLOS_COLOR_INFO}CLOS Health Check:${CLOS_COLOR_RESET}\n"
    
    # Check individual service health
    local services=(
        "clos-caddy:80:/health"
        "clos-postgres:5432"
        "clos-redis:6379"
        "security-dashboard-frontend:3100/health"
        "pkb-ui:8501/_stcore/health"
        "candlefish-web:3000/api/health"
        "clos-grafana:3000/api/health"
    )
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r container port path <<< "$service_info"
        
        if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
            if [[ -n "$path" ]]; then
                if curl -sf "http://localhost:${port}${path}" >/dev/null 2>&1; then
                    echo -e "${CLOS_COLOR_SUCCESS}✓${CLOS_COLOR_RESET} $container (http://localhost:$port$path)"
                else
                    echo -e "${CLOS_COLOR_ERROR}✗${CLOS_COLOR_RESET} $container (http://localhost:$port$path)"
                fi
            else
                echo -e "${CLOS_COLOR_SUCCESS}✓${CLOS_COLOR_RESET} $container (running)"
            fi
        else
            echo -e "${CLOS_COLOR_WARNING}○${CLOS_COLOR_RESET} $container (not running)"
        fi
    done
}

# Show running CLOS containers
clos_ps() {
    if ! clos_detect_project; then
        echo -e "${CLOS_COLOR_ERROR}Not in a CLOS project${CLOS_COLOR_RESET}"
        return 1
    fi
    
    docker ps --filter "label=clos.service" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
}

# Build CLOS services
clos_build() {
    if ! clos_detect_project; then
        echo -e "${CLOS_COLOR_ERROR}Not in a CLOS project${CLOS_COLOR_RESET}"
        return 1
    fi
    
    local service="${1:-}"
    
    cd "$CLOS_PROJECT_ROOT"
    
    if [[ -n "$service" ]]; then
        case "$service" in
            "security-dashboard"|"security")
                docker-compose -f deployment/services/security-dashboard.yml build
                ;;
            "pkb")
                docker-compose -f deployment/services/pkb.yml build
                ;;
            "candlefish"|"main")
                docker-compose -f deployment/services/candlefish.yml build
                ;;
            *)
                echo -e "${CLOS_COLOR_ERROR}Unknown service: $service${CLOS_COLOR_RESET}"
                return 1
                ;;
        esac
    else
        echo -e "${CLOS_COLOR_INFO}Building all CLOS services...${CLOS_COLOR_RESET}"
        docker-compose -f deployment/services/security-dashboard.yml build
        docker-compose -f deployment/services/pkb.yml build  
        docker-compose -f deployment/services/candlefish.yml build
    fi
    
    cd - > /dev/null
    echo -e "${CLOS_COLOR_SUCCESS}Build completed${CLOS_COLOR_RESET}"
}

# Clean up unused Docker resources
clos_clean() {
    echo -e "${CLOS_COLOR_INFO}Cleaning up unused Docker resources...${CLOS_COLOR_RESET}"
    docker system prune -f
    docker volume prune -f
    echo -e "${CLOS_COLOR_SUCCESS}Cleanup completed${CLOS_COLOR_RESET}"
}

# Prompt integration for zsh
clos_prompt_info() {
    if clos_detect_project >/dev/null 2>&1; then
        local running_count=$(docker ps --filter "label=clos.service" --quiet | wc -l | tr -d ' ')
        echo " [clos:$CLOS_PROJECT_NAME:$running_count]"
    fi
}

# Auto-completion for zsh
if [[ -n "$ZSH_VERSION" ]]; then
    # Check if compdef is available (part of zsh completion system)
    if command -v compdef >/dev/null 2>&1; then
        # Tab completion for CLOS commands
        _clos_services() {
            local -a services
            services=(
                'core:Start core infrastructure services'
                'security-dashboard:Start security dashboard services'  
                'pkb:Start PKB services'
                'candlefish:Start main Candlefish services'
                'monitoring:Start monitoring stack'
                'all:Start all services'
            )
            _describe 'services' services
        }
        
        _clos_containers() {
            local -a containers
            if clos_detect_project >/dev/null 2>&1; then
                containers=($(docker ps --filter "label=clos.service" --format "{{.Names}}" 2>/dev/null))
            fi
            _describe 'containers' containers
        }
        
        compdef _clos_services clos_up clos_restart
        compdef _clos_containers clos_logs clos_exec
    fi
fi

# Pre-command hook for context detection
if [[ -n "$ZSH_VERSION" ]]; then
    autoload -U add-zsh-hook
    add-zsh-hook preexec clos_preexec_hook
    
    clos_preexec_hook() {
        # Detect CLOS project on directory change
        clos_detect_project >/dev/null 2>&1
    }
fi

# Aliases for common operations
alias clos='clos_help'
alias cst='clos_status'
alias cup='clos_up'
alias cdown='clos_down' 
alias crestart='clos_restart'
alias clogs='clos_logs'
alias cexec='clos_exec'
alias chealth='clos_health'
alias cps='clos_ps'
alias cbuild='clos_build'
alias cclean='clos_clean'

# Environment setup message
if [[ -n "${BASH_SOURCE[0]:-}" ]] && [[ "${BASH_SOURCE[0]:-}" == "${0}" ]]; then
    echo -e "${CLOS_COLOR_SUCCESS}CLOS Shell Integration loaded!${CLOS_COLOR_RESET}"
    echo -e "${CLOS_COLOR_INFO}Type 'clos' for help${CLOS_COLOR_RESET}"
fi