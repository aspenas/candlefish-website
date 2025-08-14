#!/bin/sh
# Production startup script for Paintbox application
# Handles graceful startup, database migrations, and service initialization

set -e

# Configuration
APP_PORT=${PORT:-8080}
NODE_ENV=${NODE_ENV:-production}
LOG_LEVEL=${LOG_LEVEL:-info}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [STARTUP] $1"
}

log_info() {
    log "${BLUE}INFO: $1${NC}"
}

log_success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

log_warning() {
    log "${YELLOW}WARNING: $1${NC}"
}

log_error() {
    log "${RED}ERROR: $1${NC}"
}

# Error handling
handle_error() {
    log_error "$1"
    cleanup
    exit 1
}

# Cleanup function
cleanup() {
    log_info "Performing cleanup..."
    
    # Kill background processes if any
    if [ -n "$WS_PID" ] && kill -0 "$WS_PID" 2>/dev/null; then
        log_info "Stopping WebSocket server (PID: $WS_PID)"
        kill -TERM "$WS_PID" 2>/dev/null || true
        sleep 2
        kill -KILL "$WS_PID" 2>/dev/null || true
    fi
    
    log_info "Cleanup completed"
}

# Signal handlers for graceful shutdown
trap 'log_warning "Received SIGTERM, initiating graceful shutdown..."; cleanup; exit 0' TERM
trap 'log_warning "Received SIGINT, initiating graceful shutdown..."; cleanup; exit 0' INT

# Validation checks
validate_environment() {
    log_info "Validating environment configuration"
    
    # Check required files
    if [ ! -f "/app/server.js" ]; then
        handle_error "server.js not found in /app"
    fi
    
    if [ ! -f "/app/package.json" ]; then
        handle_error "package.json not found in /app"
    fi
    
    # Check environment variables
    if [ -z "$DATABASE_URL" ]; then
        log_warning "DATABASE_URL not set, database operations may fail"
    fi
    
    if [ -z "$REDIS_URL" ]; then
        log_warning "REDIS_URL not set, caching will be disabled"
    fi
    
    if [ -z "$NEXTAUTH_SECRET" ]; then
        log_warning "NEXTAUTH_SECRET not set, authentication may not work properly"
    fi
    
    log_success "Environment validation completed"
}

# Database connectivity check
check_database_connection() {
    log_info "Checking database connectivity"
    
    if [ -n "$DATABASE_URL" ]; then
        # Simple connection test using Node.js
        node -e "
        const { Client } = require('pg');
        const client = new Client({ connectionString: process.env.DATABASE_URL });
        client.connect()
          .then(() => {
            console.log('Database connection successful');
            return client.end();
          })
          .catch((err) => {
            console.error('Database connection failed:', err.message);
            process.exit(1);
          });
        " || handle_error "Database connection failed"
        
        log_success "Database connectivity verified"
    else
        log_warning "Skipping database check (DATABASE_URL not set)"
    fi
}

# Redis connectivity check
check_redis_connection() {
    log_info "Checking Redis connectivity"
    
    if [ -n "$REDIS_URL" ]; then
        # Simple Redis connection test
        node -e "
        const redis = require('redis');
        const client = redis.createClient({ url: process.env.REDIS_URL });
        client.on('error', (err) => {
          console.error('Redis connection failed:', err.message);
          process.exit(1);
        });
        client.connect()
          .then(() => {
            console.log('Redis connection successful');
            return client.quit();
          })
          .catch((err) => {
            console.error('Redis connection failed:', err.message);
            process.exit(1);
          });
        " || log_warning "Redis connection failed, continuing without cache"
        
        log_success "Redis connectivity verified"
    else
        log_warning "Skipping Redis check (REDIS_URL not set)"
    fi
}

# Database migrations
run_database_migrations() {
    log_info "Running database migrations"
    
    if [ -f "/app/prisma/schema.prisma" ] && [ -n "$DATABASE_URL" ]; then
        # Run Prisma migrations
        if command -v npx > /dev/null 2>&1; then
            npx prisma migrate deploy || log_warning "Database migration failed"
            npx prisma generate || log_warning "Prisma client generation failed"
            log_success "Database migrations completed"
        else
            log_warning "npx not available, skipping migrations"
        fi
    else
        log_warning "Skipping database migrations (no schema or DATABASE_URL)"
    fi
}

# Cache warmup
warm_cache() {
    log_info "Starting cache warmup"
    
    # Give the application a moment to start
    sleep 5
    
    # Warm up critical endpoints
    if command -v curl > /dev/null 2>&1; then
        curl -s "http://localhost:${APP_PORT}/api/health" > /dev/null || log_warning "Cache warmup failed for health endpoint"
        log_success "Cache warmup completed"
    else
        log_warning "curl not available, skipping cache warmup"
    fi
}

# Start WebSocket server
start_websocket_server() {
    if [ -f "/app/dist/websocket-server.js" ]; then
        log_info "Starting WebSocket server"
        node /app/dist/websocket-server.js &
        WS_PID=$!
        log_success "WebSocket server started with PID: $WS_PID"
        
        # Give WebSocket server time to initialize
        sleep 2
        
        # Verify WebSocket server is running
        if ! kill -0 "$WS_PID" 2>/dev/null; then
            log_warning "WebSocket server failed to start"
            WS_PID=""
        fi
    else
        log_info "WebSocket server not found, skipping"
    fi
}

# Health check during startup
startup_health_check() {
    log_info "Performing startup health check"
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if command -v curl > /dev/null 2>&1; then
            if curl -f -s "http://localhost:${APP_PORT}/api/health" > /dev/null 2>&1; then
                log_success "Application is healthy and ready"
                return 0
            fi
        fi
        
        log_info "Waiting for application to be ready... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_warning "Application health check timeout, proceeding anyway"
}

# Main startup sequence
main() {
    log_info "=== Paintbox Production Startup ==="
    log_info "Environment: $NODE_ENV"
    log_info "Port: $APP_PORT"
    log_info "Log Level: $LOG_LEVEL"
    
    # Pre-startup checks
    validate_environment
    check_database_connection
    check_redis_connection
    
    # Database setup
    run_database_migrations
    
    # Start auxiliary services
    start_websocket_server
    
    # Start main application
    log_info "Starting main Next.js application"
    
    # Start the application in the background to allow health checks
    node server.js &
    MAIN_PID=$!
    
    log_success "Main application started with PID: $MAIN_PID"
    
    # Startup health check
    startup_health_check
    
    # Background cache warmup
    warm_cache &
    
    log_success "=== Paintbox startup completed successfully ==="
    log_info "Application is ready to serve requests on port $APP_PORT"
    
    # Wait for main process
    wait $MAIN_PID
    
    # If we reach here, the main process has exited
    log_warning "Main application process has exited"
    cleanup
}

# Execute main function
main "$@"