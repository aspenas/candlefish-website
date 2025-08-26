#!/bin/bash

# Security Dashboard Staging Deployment Script
set -e

echo "🚀 Security Dashboard - Staging Deployment"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}Docker Compose is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All prerequisites met${NC}"
}

# Setup environment variables
setup_env() {
    echo "Setting up environment variables..."
    
    # Generate secure passwords if not set
    export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-$(openssl rand -base64 32)}
    export JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 64)}
    export GRAFANA_PASSWORD=${GRAFANA_PASSWORD:-$(openssl rand -base64 16)}
    
    # Save to .env file
    cat > .env.staging << EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
GRAFANA_PASSWORD=$GRAFANA_PASSWORD
EOF
    
    echo -e "${GREEN}✓ Environment variables configured${NC}"
}

# Build and start services
deploy_services() {
    echo "Building and deploying services..."
    
    # Stop any existing containers
    docker-compose -f docker-compose.staging.yml down 2>/dev/null || true
    
    # Build images
    echo "Building Docker images..."
    docker-compose -f docker-compose.staging.yml build --parallel
    
    # Start services
    echo "Starting services..."
    docker-compose -f docker-compose.staging.yml up -d
    
    echo -e "${GREEN}✓ Services deployed${NC}"
}

# Wait for services to be healthy
wait_for_services() {
    echo "Waiting for services to be healthy..."
    
    services=("postgres" "redis" "backend" "frontend")
    
    for service in "${services[@]}"; do
        echo -n "  Waiting for $service..."
        for i in {1..30}; do
            if docker-compose -f docker-compose.staging.yml ps | grep "$service" | grep -q "healthy\|Up"; then
                echo -e " ${GREEN}✓${NC}"
                break
            fi
            sleep 2
            echo -n "."
        done
        
        if [ $i -eq 30 ]; then
            echo -e " ${RED}✗ Timeout${NC}"
            docker-compose -f docker-compose.staging.yml logs "$service"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✓ All services healthy${NC}"
}

# Run database migrations
run_migrations() {
    echo "Running database migrations..."
    
    # Wait a bit for postgres to be fully ready
    sleep 5
    
    # Run migrations
    docker-compose -f docker-compose.staging.yml exec -T postgres psql -U secadmin -d security_dashboard << 'EOF'
-- Create TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Security events table
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    severity VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    source VARCHAR(100),
    message TEXT,
    details JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('security_events', 'timestamp', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_category ON security_events(category);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);

-- Alert rules table
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    condition JSONB NOT NULL,
    severity VARCHAR(20) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

EOF
    
    echo -e "${GREEN}✓ Database migrations complete${NC}"
}

# Display access information
display_info() {
    echo ""
    echo "==========================================="
    echo -e "${GREEN}Security Dashboard Deployed Successfully!${NC}"
    echo "==========================================="
    echo ""
    echo "Access URLs:"
    echo "  Frontend:    http://localhost:3000"
    echo "  GraphQL API: http://localhost:4001/graphql"
    echo "  Backend API: http://localhost:4000"
    echo "  Kong Admin:  https://localhost:8001 (HTTPS enforced)"
    echo "  Prometheus:  http://localhost:9090"
    echo "  Grafana:     http://localhost:3001"
    echo ""
    echo "Credentials:"
    echo "  Grafana Username: admin"
    echo "  Grafana Password: $GRAFANA_PASSWORD"
    echo ""
    echo "Commands:"
    echo "  View logs:    docker-compose -f deployment/docker-compose.staging.yml logs -f"
    echo "  Stop:         docker-compose -f deployment/docker-compose.staging.yml down"
    echo "  Restart:      docker-compose -f deployment/docker-compose.staging.yml restart"
    echo ""
    echo -e "${YELLOW}Note: Kong Admin API now enforces HTTPS as per security requirements${NC}"
}

# Main execution
main() {
    check_prerequisites
    setup_env
    deploy_services
    wait_for_services
    run_migrations
    display_info
}

# Run main function
main "$@"