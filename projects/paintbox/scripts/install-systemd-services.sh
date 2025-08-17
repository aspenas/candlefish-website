#!/bin/bash

# Install Paintbox SystemD Services
# Run as root to install system services

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

# Create paintbox user and group
create_user() {
    log_info "Creating paintbox user and group..."

    if ! getent group paintbox >/dev/null 2>&1; then
        groupadd --system paintbox
        log_success "Created paintbox group"
    else
        log_info "Paintbox group already exists"
    fi

    if ! getent passwd paintbox >/dev/null 2>&1; then
        useradd --system --gid paintbox --home-dir /opt/paintbox --shell /bin/bash paintbox
        log_success "Created paintbox user"
    else
        log_info "Paintbox user already exists"
    fi
}

# Create required directories
create_directories() {
    log_info "Creating required directories..."

    local directories=(
        "/opt/paintbox"
        "/etc/paintbox"
        "/var/log/paintbox"
        "/var/lib/paintbox"
    )

    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        chown paintbox:paintbox "$dir"
        chmod 755 "$dir"
        log_success "Created directory: $dir"
    done
}

# Install systemd service files
install_services() {
    log_info "Installing systemd service files..."

    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root="$(dirname "$script_dir")"
    local systemd_dir="$project_root/systemd"

    if [[ ! -d "$systemd_dir" ]]; then
        log_error "SystemD directory not found: $systemd_dir"
        exit 1
    fi

    # Copy service files
    local service_files=(
        "paintbox-app.service"
        "paintbox-redis.service"
        "paintbox-postgres.service"
        "paintbox-health-monitor.service"
        "paintbox-dependency-checker.service"
        "paintbox-log-rotator.service"
        "paintbox.target"
    )

    for service in "${service_files[@]}"; do
        if [[ -f "$systemd_dir/$service" ]]; then
            cp "$systemd_dir/$service" /etc/systemd/system/
            chmod 644 "/etc/systemd/system/$service"
            log_success "Installed: $service"
        else
            log_warning "Service file not found: $service"
        fi
    done

    # Copy timer files
    local timer_files=(
        "paintbox-dependency-checker.timer"
        "paintbox-log-rotator.timer"
    )

    for timer in "${timer_files[@]}"; do
        if [[ -f "$systemd_dir/$timer" ]]; then
            cp "$systemd_dir/$timer" /etc/systemd/system/
            chmod 644 "/etc/systemd/system/$timer"
            log_success "Installed: $timer"
        else
            log_warning "Timer file not found: $timer"
        fi
    done
}

# Create configuration files
create_config_files() {
    log_info "Creating configuration files..."

    # Environment file
    cat > /etc/paintbox/environment << 'EOF'
# Paintbox Environment Configuration
NODE_ENV=production
PORT=3000
MONITOR_INTERVAL=10000
HEALTH_CHECK_TIMEOUT=5000
LOG_RETENTION_DAYS=30
LOG_DIRECTORY=/opt/paintbox/logs

# Database Configuration
DATABASE_URL=postgresql://paintbox:password@localhost:5432/paintbox

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Secrets Configuration
AWS_REGION=us-east-1
SECRETS_MANAGER_SECRET_NAME=paintbox/production

# Alert Configuration
SLACK_WEBHOOK_URL=

# Performance Configuration
MAX_MEMORY_RESTART=2G
CPU_WEIGHT=100
EOF

    chmod 640 /etc/paintbox/environment
    chown root:paintbox /etc/paintbox/environment
    log_success "Created environment configuration"

    # PostgreSQL environment file
    cat > /etc/paintbox/postgres.env << 'EOF'
POSTGRES_DB=paintbox
POSTGRES_USER=paintbox
POSTGRES_PASSWORD=change_this_password
EOF

    chmod 600 /etc/paintbox/postgres.env
    chown postgres:postgres /etc/paintbox/postgres.env
    log_success "Created PostgreSQL environment configuration"
}

# Deploy application
deploy_application() {
    log_info "Deploying application to /opt/paintbox..."

    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root="$(dirname "$script_dir")"

    # Copy application files
    rsync -av --exclude=node_modules --exclude=.git --exclude=.next "$project_root/" /opt/paintbox/

    # Set ownership
    chown -R paintbox:paintbox /opt/paintbox

    # Make scripts executable
    chmod +x /opt/paintbox/scripts/*.sh
    chmod +x /opt/paintbox/scripts/*.js

    log_success "Application deployed to /opt/paintbox"
}

# Install Node.js dependencies
install_dependencies() {
    log_info "Installing Node.js dependencies..."

    cd /opt/paintbox
    sudo -u paintbox npm ci --only=production

    log_success "Dependencies installed"
}

# Reload systemd daemon
reload_systemd() {
    log_info "Reloading systemd daemon..."
    systemctl daemon-reload
    log_success "SystemD daemon reloaded"
}

# Enable and start services
enable_services() {
    log_info "Enabling and starting services..."

    # Enable target and services
    systemctl enable paintbox.target
    systemctl enable paintbox-dependency-checker.timer
    systemctl enable paintbox-log-rotator.timer

    # Start services individually to handle dependencies
    local services=(
        "paintbox-postgres.service"
        "paintbox-redis.service"
        "paintbox-app.service"
        "paintbox-health-monitor.service"
    )

    for service in "${services[@]}"; do
        log_info "Starting $service..."
        if systemctl start "$service"; then
            log_success "Started: $service"
        else
            log_error "Failed to start: $service"
            systemctl status "$service" --no-pager
        fi
    done

    # Start timers
    systemctl start paintbox-dependency-checker.timer
    systemctl start paintbox-log-rotator.timer

    log_success "Services enabled and started"
}

# Check service status
check_status() {
    log_info "Checking service status..."

    echo
    echo "=== Paintbox Service Status ==="
    systemctl status paintbox.target --no-pager
    echo

    local services=(
        "paintbox-postgres.service"
        "paintbox-redis.service"
        "paintbox-app.service"
        "paintbox-health-monitor.service"
    )

    for service in "${services[@]}"; do
        echo "--- $service ---"
        if systemctl is-active "$service" >/dev/null 2>&1; then
            log_success "$service is running"
        else
            log_error "$service is not running"
        fi
    done

    echo
    echo "--- Timers ---"
    systemctl list-timers paintbox-*
}

# Show usage
show_usage() {
    cat << EOF
Usage: $0 [COMMAND]

Commands:
    install     - Full installation (default)
    deploy      - Deploy application only
    restart     - Restart all services
    status      - Show service status
    uninstall   - Remove all services
    help        - Show this help message

Examples:
    $0 install      # Full installation
    $0 deploy       # Deploy application updates
    $0 restart      # Restart all services
    $0 status       # Check service status
EOF
}

# Uninstall services
uninstall_services() {
    log_warning "Uninstalling Paintbox services..."

    # Stop and disable services
    systemctl stop paintbox.target 2>/dev/null || true
    systemctl disable paintbox.target 2>/dev/null || true

    local services=(
        "paintbox-app.service"
        "paintbox-redis.service"
        "paintbox-postgres.service"
        "paintbox-health-monitor.service"
        "paintbox-dependency-checker.service"
        "paintbox-dependency-checker.timer"
        "paintbox-log-rotator.service"
        "paintbox-log-rotator.timer"
    )

    for service in "${services[@]}"; do
        systemctl stop "$service" 2>/dev/null || true
        systemctl disable "$service" 2>/dev/null || true
        rm -f "/etc/systemd/system/$service"
        log_info "Removed: $service"
    done

    rm -f /etc/systemd/system/paintbox.target

    systemctl daemon-reload
    log_success "Services uninstalled"
}

# Restart services
restart_services() {
    log_info "Restarting Paintbox services..."

    systemctl restart paintbox.target

    log_success "Services restarted"
}

# Main execution
main() {
    local command="${1:-install}"

    case "$command" in
        "install")
            check_root
            create_user
            create_directories
            install_services
            create_config_files
            deploy_application
            install_dependencies
            reload_systemd
            enable_services
            check_status
            ;;
        "deploy")
            check_root
            deploy_application
            install_dependencies
            restart_services
            ;;
        "restart")
            check_root
            restart_services
            check_status
            ;;
        "status")
            check_status
            ;;
        "uninstall")
            check_root
            uninstall_services
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
