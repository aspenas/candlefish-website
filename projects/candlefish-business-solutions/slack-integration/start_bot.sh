#!/bin/bash
# Candlefish Slack Admin Bot - Startup Script
# Production deployment with full monitoring and logging

set -euo pipefail

# Configuration
BOT_NAME="Candlefish Slack Admin Bot"
LOG_DIR="./logs"
DATA_DIR="./data"
COMPOSE_FILE="docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
        exit 1
    fi

    success "All dependencies are available"
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."

    mkdir -p "$LOG_DIR" "$DATA_DIR"
    mkdir -p grafana/dashboards grafana/datasources

    # Set permissions
    chmod 755 "$LOG_DIR" "$DATA_DIR"

    success "Directories created"
}

# Create Prometheus configuration
create_prometheus_config() {
    log "Creating Prometheus configuration..."

    cat > prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "alert_rules.yml"

scrape_configs:
  - job_name: 'slack-admin-bot'
    static_configs:
      - targets: ['slack-admin-bot:8000']
    metrics_path: /metrics
    scrape_interval: 10s

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
EOF

    success "Prometheus configuration created"
}

# Create Grafana datasource configuration
create_grafana_config() {
    log "Creating Grafana configuration..."

    mkdir -p grafana/datasources
    cat > grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

    success "Grafana configuration created"
}

# Verify AWS Secrets Manager access
verify_secrets() {
    log "Verifying AWS Secrets Manager access..."

    SECRET_NAME="slack-admin-bot-tokens"

    if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region us-west-2 &> /dev/null; then
        success "Slack bot tokens found in AWS Secrets Manager"
    else
        error "Cannot access slack bot tokens in AWS Secrets Manager"
        error "Please ensure the secret '$SECRET_NAME' exists in us-west-2"
        exit 1
    fi
}

# Build Docker image
build_image() {
    log "Building Docker image..."

    if docker build -t candlefish-slack-admin-bot .; then
        success "Docker image built successfully"
    else
        error "Failed to build Docker image"
        exit 1
    fi
}

# Start services
start_services() {
    log "Starting services..."

    # Stop any existing containers
    docker-compose down --remove-orphans 2>/dev/null || true

    # Start services
    if docker-compose up -d; then
        success "All services started successfully"
    else
        error "Failed to start services"
        exit 1
    fi

    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30

    # Check bot health
    if curl -f http://localhost:8000/metrics &> /dev/null; then
        success "Bot is healthy and responding"
    else
        warning "Bot health check failed - check logs"
    fi
}

# Show service status
show_status() {
    log "Service Status:"
    echo
    docker-compose ps
    echo

    log "Bot Metrics Available:"
    echo "- Prometheus: http://localhost:9090"
    echo "- Grafana: http://localhost:3000 (admin/admin)"
    echo "- Bot Metrics: http://localhost:8000/metrics"
    echo

    log "Useful Commands:"
    echo "- View logs: docker-compose logs -f slack-admin-bot"
    echo "- Stop bot: docker-compose down"
    echo "- Restart bot: docker-compose restart slack-admin-bot"
    echo "- Shell access: docker-compose exec slack-admin-bot bash"
}

# Test bot functionality
test_bot() {
    log "Testing bot functionality..."

    # Wait a bit more for full startup
    sleep 10

    # Check if bot is responding to metrics endpoint
    if curl -s http://localhost:8000/metrics | grep -q "slack_"; then
        success "Bot metrics are being generated"
    else
        warning "Bot metrics not found - may still be starting"
    fi

    # Check docker container health
    if docker-compose ps | grep -q "healthy"; then
        success "Container health checks passing"
    else
        warning "Container health checks not yet passing"
    fi
}

# Main execution
main() {
    echo
    echo "======================================================"
    echo "  $BOT_NAME - Deployment Script"
    echo "======================================================"
    echo

    check_dependencies
    setup_directories
    create_prometheus_config
    create_grafana_config
    verify_secrets
    build_image
    start_services
    test_bot
    show_status

    echo
    success "$BOT_NAME deployed successfully!"
    echo
    log "The bot is now running and ready to handle admin operations"
    log "Monitor the logs with: docker-compose logs -f slack-admin-bot"
    echo
}

# Handle script arguments
case "${1:-}" in
    "stop")
        log "Stopping services..."
        docker-compose down
        success "Services stopped"
        ;;
    "restart")
        log "Restarting services..."
        docker-compose restart
        success "Services restarted"
        ;;
    "logs")
        docker-compose logs -f slack-admin-bot
        ;;
    "status")
        docker-compose ps
        ;;
    "shell")
        docker-compose exec slack-admin-bot bash
        ;;
    "test")
        test_bot
        ;;
    *)
        main
        ;;
esac
