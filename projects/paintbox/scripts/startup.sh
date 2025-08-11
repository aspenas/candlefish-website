#!/bin/sh

# Container startup script for Paintbox
# Handles initialization, health checks, and graceful shutdown

set -e

# Colors for logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') [STARTUP] $*"
}

log_info() { log "${BLUE}[INFO]${NC} $*"; }
log_success() { log "${GREEN}[SUCCESS]${NC} $*"; }
log_warning() { log "${YELLOW}[WARNING]${NC} $*"; }
log_error() { log "${RED}[ERROR]${NC} $*"; }

# Signal handlers for graceful shutdown
cleanup() {
    log_warning "Received shutdown signal, cleaning up..."

    if [ ! -z "${APP_PID:-}" ]; then
        log_info "Stopping application (PID: $APP_PID)..."
        kill -TERM $APP_PID 2>/dev/null || true

        # Wait for graceful shutdown
        local timeout=30
        while [ $timeout -gt 0 ]; do
            if ! kill -0 $APP_PID 2>/dev/null; then
                break
            fi
            sleep 1
            timeout=$((timeout - 1))
        done

        # Force kill if still running
        if kill -0 $APP_PID 2>/dev/null; then
            log_warning "Forcing application shutdown..."
            kill -KILL $APP_PID 2>/dev/null || true
        fi
    fi

    log_success "Cleanup completed"
    exit 0
}

trap cleanup TERM INT

# Pre-startup checks
pre_startup_checks() {
    log_info "Running pre-startup checks..."

    # Check required environment variables
    if [ -z "${PORT:-}" ]; then
        log_error "PORT environment variable is required"
        exit 1
    fi

    # Check if running as non-root user
    if [ "$(id -u)" = "0" ]; then
        log_warning "Running as root user - security risk"
    fi

    # Check disk space
    local disk_usage=$(df /app | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log_warning "Low disk space: ${disk_usage}% used"
    fi

    # Check memory
    if [ -f /proc/meminfo ]; then
        local mem_available=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
        if [ "$mem_available" -lt 100000 ]; then  # Less than 100MB
            log_warning "Low memory available: ${mem_available}KB"
        fi
    fi

    log_success "Pre-startup checks completed"
}

# Wait for dependencies
wait_for_dependencies() {
    log_info "Waiting for dependencies..."

    # Wait for database (if configured)
    if [ ! -z "${DATABASE_URL:-}" ]; then
        log_info "Checking database connectivity..."
        local retries=30
        while [ $retries -gt 0 ]; do
            if pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; then
                log_success "Database is ready"
                break
            fi
            log_info "Waiting for database... ($retries attempts remaining)"
            sleep 2
            retries=$((retries - 1))
        done

        if [ $retries -eq 0 ]; then
            log_error "Database connection timeout"
            exit 1
        fi
    fi

    # Wait for Redis (if configured)
    if [ ! -z "${REDIS_URL:-}" ]; then
        log_info "Checking Redis connectivity..."
        local retries=15
        while [ $retries -gt 0 ]; do
            if redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then
                log_success "Redis is ready"
                break
            fi
            log_info "Waiting for Redis... ($retries attempts remaining)"
            sleep 2
            retries=$((retries - 1))
        done

        if [ $retries -eq 0 ]; then
            log_warning "Redis connection timeout - continuing without cache"
        fi
    fi
}

# Database migrations
run_migrations() {
    if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
        log_info "Running database migrations..."

        # Check if Prisma is available
        if [ -f "/app/prisma/schema.prisma" ]; then
            npx prisma migrate deploy || {
                log_error "Database migration failed"
                exit 1
            }
            log_success "Database migrations completed"
        else
            log_warning "No Prisma schema found, skipping migrations"
        fi
    fi
}

# Generate build info
generate_build_info() {
    log_info "Generating build information..."

    cat > /tmp/build-info.json << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "version": "${APP_VERSION:-unknown}",
    "commit": "${GIT_COMMIT:-unknown}",
    "environment": "${NODE_ENV:-production}",
    "port": "${PORT}",
    "user": "$(whoami)",
    "pid": "$$"
}
EOF

    log_success "Build info generated"
}

# Start the application
start_application() {
    log_info "Starting Paintbox application..."

    # Set Node.js options for production
    export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=512 --optimize-for-size}"

    # Start the application in background
    node server.js &
    APP_PID=$!

    log_success "Application started with PID: $APP_PID"

    # Wait for the application to be ready
    log_info "Waiting for application to be ready..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if curl -f -s "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
            log_success "Application is ready and responding"
            break
        fi
        log_info "Waiting for application... ($retries attempts remaining)"
        sleep 2
        retries=$((retries - 1))
    done

    if [ $retries -eq 0 ]; then
        log_error "Application failed to start properly"
        cleanup
        exit 1
    fi

    # Monitor application health
    monitor_application
}

# Monitor application health
monitor_application() {
    log_info "Monitoring application health..."

    while true; do
        if ! kill -0 $APP_PID 2>/dev/null; then
            log_error "Application process died unexpectedly"
            exit 1
        fi

        # Health check every 30 seconds
        if ! curl -f -s "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
            log_warning "Health check failed - application may be unhealthy"
        fi

        sleep 30
    done
}

# Main startup sequence
main() {
    log_info "Starting Paintbox container..."
    log_info "Version: ${APP_VERSION:-unknown}"
    log_info "Environment: ${NODE_ENV:-production}"
    log_info "Port: ${PORT}"

    pre_startup_checks
    wait_for_dependencies
    run_migrations
    generate_build_info
    start_application
}

# Run main function
main "$@"
