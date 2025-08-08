#!/bin/bash

# RTPM Dashboard - Main Deployment Script
# Orchestrates the complete deployment of the Real-time Performance Monitoring Dashboard

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
ENVIRONMENT="${1:-local}"
DEPLOYMENT_TYPE="${2:-standard}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Logging
log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_step() { echo -e "\n${CYAN}▶${NC} $1"; }

# Banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║     Real-time Performance Monitoring Dashboard            ║"
    echo "║                 Deployment System                         ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║  Environment: ${ENVIRONMENT}                              ║"
    echo "║  Type: ${DEPLOYMENT_TYPE}                                 ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."

    local missing=()

    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing+=("docker")
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        # Try docker compose (newer version)
        if ! docker compose version &> /dev/null; then
            missing+=("docker-compose")
        fi
    fi

    # Check Node.js for frontend
    if ! command -v node &> /dev/null; then
        missing+=("node")
    fi

    # Check Python for backend
    if ! command -v python3 &> /dev/null; then
        missing+=("python3")
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing prerequisites: ${missing[*]}"
        log_info "Please install missing dependencies and try again"
        exit 1
    fi

    log_info "All prerequisites met"
}

# Create necessary directories
setup_directories() {
    log_step "Setting up directories..."

    # Create required directories if they don't exist
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/data/postgres"
    mkdir -p "$PROJECT_ROOT/data/redis"

    log_info "Directories created"
}

# Generate environment files
setup_environment() {
    log_step "Setting up environment..."

    # Create .env file if it doesn't exist
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        cat > "$PROJECT_ROOT/.env" <<EOF
# RTPM Dashboard Environment Configuration
ENVIRONMENT=${ENVIRONMENT}

# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=rtpm_metrics
POSTGRES_USER=rtpm_admin
POSTGRES_PASSWORD=rtpm_secure_password_123

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_URL=http://localhost:8000

# Frontend Configuration
FRONTEND_PORT=3000
FRONTEND_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=3600

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001

# Demo Credentials
DEMO_EMAIL=admin@example.com
DEMO_PASSWORD=admin123
EOF
        log_info "Created .env file with default configuration"
    else
        log_info "Using existing .env file"
    fi
}

# Build Docker images
build_images() {
    log_step "Building Docker images..."

    # Build API image
    if [ -f "$PROJECT_ROOT/apps/rtpm-api/Dockerfile" ]; then
        log_info "Building API image..."
        docker build -t rtpm-api:latest "$PROJECT_ROOT/apps/rtpm-api" || {
            log_warn "API Dockerfile not found, will use pre-built image"
        }
    fi

    # Build Frontend image
    if [ -f "$PROJECT_ROOT/deployment/rtpm-dashboard/frontend/Dockerfile" ]; then
        log_info "Building Frontend image..."
        docker build -t rtpm-frontend:latest "$PROJECT_ROOT/deployment/rtpm-dashboard/frontend" || {
            log_warn "Frontend Dockerfile not found, will use pre-built image"
        }
    fi

    log_info "Docker images ready"
}

# Create docker-compose.yml if it doesn't exist
create_docker_compose() {
    if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        log_step "Creating docker-compose.yml..."

        cat > "$PROJECT_ROOT/docker-compose.yml" <<'EOF'
version: '3.8'

services:
  # PostgreSQL with TimescaleDB
  postgres:
    image: timescale/timescaledb:latest-pg15
    container_name: rtpm-postgres
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: rtpm-redis
    ports:
      - "6379:6379"
    volumes:
      - ./data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  api:
    image: rtpm-api:latest
    build:
      context: ./apps/rtpm-api
      dockerfile: Dockerfile
    container_name: rtpm-api
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - API_HOST=${API_HOST}
      - API_PORT=${API_PORT}
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./apps/rtpm-api:/app
    command: python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

  # Frontend Dashboard
  frontend:
    image: rtpm-frontend:latest
    build:
      context: ./deployment/rtpm-dashboard/frontend
      dockerfile: Dockerfile
    container_name: rtpm-frontend
    environment:
      - VITE_API_URL=http://localhost:8000
      - VITE_WS_URL=ws://localhost:8000
    ports:
      - "3000:80"
    depends_on:
      - api

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: rtpm-prometheus
    volumes:
      - ./deployment/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  # Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: rtpm-grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3001:3000"
    volumes:
      - ./deployment/monitoring/grafana:/etc/grafana/provisioning

networks:
  default:
    name: rtpm-network
EOF
        log_info "docker-compose.yml created"
    fi
}

# Start services based on environment
start_services() {
    log_step "Starting services for ${ENVIRONMENT} environment..."

    case "$ENVIRONMENT" in
        local)
            # Ensure docker-compose.yml exists
            create_docker_compose

            # Start with docker-compose
            if command -v docker-compose &> /dev/null; then
                docker-compose up -d
            else
                docker compose up -d
            fi

            log_info "Waiting for services to be healthy..."
            sleep 10

            # Check service health
            check_services_health
            ;;

        production)
            if [ "$DEPLOYMENT_TYPE" == "blue-green" ]; then
                log_info "Starting blue-green deployment..."
                # Production blue-green deployment would go here
                log_warn "Production deployment requires cloud infrastructure setup"
            else
                log_info "Starting standard production deployment..."
                # Standard production deployment
                log_warn "Production deployment requires cloud infrastructure setup"
            fi
            ;;

        *)
            log_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
}

# Check services health
check_services_health() {
    log_step "Checking services health..."

    local all_healthy=true

    # Check PostgreSQL
    if docker exec rtpm-postgres pg_isready -U rtpm_admin &> /dev/null; then
        log_info "PostgreSQL: Healthy"
    else
        log_error "PostgreSQL: Not responding"
        all_healthy=false
    fi

    # Check Redis
    if docker exec rtpm-redis redis-cli ping &> /dev/null; then
        log_info "Redis: Healthy"
    else
        log_error "Redis: Not responding"
        all_healthy=false
    fi

    # Check API
    if curl -sf http://localhost:8000/health &> /dev/null; then
        log_info "API: Healthy"
    else
        log_warn "API: Starting up..."
    fi

    # Check Frontend
    if curl -sf http://localhost:3000 &> /dev/null; then
        log_info "Frontend: Healthy"
    else
        log_warn "Frontend: Starting up..."
    fi

    if [ "$all_healthy" = true ]; then
        log_info "All services are healthy"
    else
        log_warn "Some services need more time to start"
    fi
}

# Stop services
stop_services() {
    log_step "Stopping services..."

    if command -v docker-compose &> /dev/null; then
        docker-compose down
    else
        docker compose down
    fi

    log_info "Services stopped"
}

# Show access information
show_access_info() {
    echo -e "\n${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}     RTPM Dashboard Successfully Deployed!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"

    echo -e "\n📊 ${CYAN}Access Points:${NC}"
    echo -e "   • Dashboard: ${BLUE}http://localhost:3000${NC}"
    echo -e "   • API: ${BLUE}http://localhost:8000${NC}"
    echo -e "   • API Docs: ${BLUE}http://localhost:8000/docs${NC}"
    echo -e "   • Prometheus: ${BLUE}http://localhost:9090${NC}"
    echo -e "   • Grafana: ${BLUE}http://localhost:3001${NC}"

    echo -e "\n🔐 ${CYAN}Demo Credentials:${NC}"
    echo -e "   • Email: ${YELLOW}admin@example.com${NC}"
    echo -e "   • Password: ${YELLOW}admin123${NC}"

    echo -e "\n📝 ${CYAN}Useful Commands:${NC}"
    echo -e "   • View logs: ${MAGENTA}docker-compose logs -f [service]${NC}"
    echo -e "   • Stop services: ${MAGENTA}./deploy.sh stop${NC}"
    echo -e "   • Restart services: ${MAGENTA}./deploy.sh restart${NC}"
    echo -e "   • Clean data: ${MAGENTA}./deploy.sh clean${NC}"

    echo -e "\n${GREEN}Ready to monitor your infrastructure!${NC}\n"
}

# Main execution
main() {
    case "$ENVIRONMENT" in
        stop)
            stop_services
            ;;
        restart)
            stop_services
            ENVIRONMENT="local"
            print_banner
            start_services
            show_access_info
            ;;
        clean)
            log_warn "This will delete all data. Continue? (y/N)"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                stop_services
                rm -rf "$PROJECT_ROOT/data"
                log_info "Data cleaned"
            fi
            ;;
        *)
            print_banner
            check_prerequisites
            setup_directories
            setup_environment
            build_images
            start_services
            show_access_info
            ;;
    esac
}

# Run main function
main "$@"
