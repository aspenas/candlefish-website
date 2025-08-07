#!/bin/bash

# Real-time Performance Monitoring API Startup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Check if .env file exists
if [ ! -f .env ]; then
    warn ".env file not found. Using environment variables or defaults."
fi

# Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Function to check if service is ready
wait_for_service() {
    local service_name=$1
    local health_check=$2
    local max_attempts=${3:-30}
    local attempt=1
    
    log "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if eval $health_check &>/dev/null; then
            log "$service_name is ready!"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts: $service_name not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    error "$service_name failed to start within expected time"
    return 1
}

# Start services
start_services() {
    log "Starting RTPM API services..."
    
    # Pull latest images
    log "Pulling Docker images..."
    docker-compose pull
    
    # Build custom images
    log "Building RTPM API images..."
    docker-compose build
    
    # Start infrastructure services first
    log "Starting infrastructure services..."
    docker-compose up -d timescaledb redis
    
    # Wait for infrastructure to be ready
    wait_for_service "TimescaleDB" "docker-compose exec -T timescaledb pg_isready -U rtpm -d rtpm_db"
    wait_for_service "Redis" "docker-compose exec -T redis redis-cli ping"
    
    # Start application services
    log "Starting application services..."
    docker-compose up -d rtpm-api celery-worker celery-beat
    
    # Wait for API to be ready
    wait_for_service "RTPM API" "curl -sf http://localhost:8000/health"
    
    # Start monitoring services
    log "Starting monitoring services..."
    docker-compose up -d flower nginx
    
    log "All services started successfully!"
    
    # Display service status
    echo
    log "Service Status:"
    docker-compose ps
    
    echo
    log "Service URLs:"
    echo "  • API Documentation: http://localhost:8000/docs"
    echo "  • API Health Check: http://localhost:8000/health"
    echo "  • Flower (Task Monitor): http://localhost:5555"
    echo "  • Prometheus Metrics: http://localhost:8000/metrics"
    
    echo
    log "To view logs: docker-compose logs -f [service-name]"
    log "To stop services: docker-compose down"
}

# Development mode
start_development() {
    log "Starting RTPM API in development mode..."
    
    # Create .env from example if it doesn't exist
    if [ ! -f .env ]; then
        log "Creating .env from template..."
        cp .env.example .env
        warn "Please review and update .env file with your settings"
    fi
    
    # Start with development overrides
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
}

# Production mode
start_production() {
    log "Starting RTPM API in production mode..."
    
    # Check environment variables
    if [ -z "$SECRET_KEY" ]; then
        error "SECRET_KEY environment variable is not set"
        exit 1
    fi
    
    if [ -z "$JWT_SECRET_KEY" ]; then
        error "JWT_SECRET_KEY environment variable is not set"
        exit 1
    fi
    
    # Start production services
    start_services
}

# Stop services
stop_services() {
    log "Stopping RTPM API services..."
    docker-compose down -v
    log "Services stopped"
}

# Clean up (remove all data)
cleanup() {
    warn "This will remove all data and containers. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log "Cleaning up..."
        docker-compose down -v --remove-orphans
        docker system prune -f
        log "Cleanup completed"
    else
        log "Cleanup cancelled"
    fi
}

# Show logs
show_logs() {
    local service=${1:-""}
    if [ -z "$service" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$service"
    fi
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Check if services are running
    if ! docker-compose ps | grep -q "Up"; then
        error "No services are running"
        exit 1
    fi
    
    # Check API health
    if curl -sf http://localhost:8000/health/detailed &>/dev/null; then
        log "API health check passed"
    else
        error "API health check failed"
        exit 1
    fi
    
    # Check database
    if docker-compose exec -T timescaledb pg_isready -U rtpm -d rtpm_db &>/dev/null; then
        log "Database health check passed"
    else
        error "Database health check failed"
        exit 1
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping &>/dev/null; then
        log "Redis health check passed"
    else
        error "Redis health check failed" 
        exit 1
    fi
    
    log "All health checks passed!"
}

# Database operations
db_migrate() {
    log "Running database migrations..."
    docker-compose exec timescaledb psql -U rtpm -d rtpm_db -f /docker-entrypoint-initdb.d/init.sql
    log "Database migrations completed"
}

db_shell() {
    log "Opening database shell..."
    docker-compose exec timescaledb psql -U rtpm -d rtpm_db
}

# Show usage
usage() {
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  start        Start all services (default)"
    echo "  start-dev    Start in development mode"
    echo "  start-prod   Start in production mode"
    echo "  stop         Stop all services"
    echo "  restart      Restart all services"
    echo "  cleanup      Remove all containers and data"
    echo "  logs [svc]   Show logs (optionally for specific service)"
    echo "  health       Perform health check"
    echo "  db-migrate   Run database migrations"
    echo "  db-shell     Open database shell"
    echo "  status       Show service status"
    echo
    echo "Examples:"
    echo "  $0 start-dev              # Start in development mode"
    echo "  $0 logs rtpm-api          # Show API logs"
    echo "  $0 health                 # Check service health"
}

# Main command processing
case "${1:-start}" in
    start)
        start_services
        ;;
    start-dev|dev)
        start_development
        ;;
    start-prod|prod)
        start_production
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        start_services
        ;;
    cleanup)
        cleanup
        ;;
    logs)
        show_logs $2
        ;;
    health)
        health_check
        ;;
    db-migrate)
        db_migrate
        ;;
    db-shell)
        db_shell
        ;;
    status)
        docker-compose ps
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        error "Unknown command: $1"
        usage
        exit 1
        ;;
esac