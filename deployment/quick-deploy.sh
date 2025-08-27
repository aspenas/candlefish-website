#!/bin/bash

# Quick Security Dashboard Deployment
set -e

echo "🚀 Security Dashboard - Quick Deployment"
echo "========================================"

# Start basic services
echo "Starting core services..."

# Start PostgreSQL with TimescaleDB
docker run -d \
  --name security-postgres \
  -e POSTGRES_DB=security_dashboard \
  -e POSTGRES_USER=secadmin \
  -e POSTGRES_PASSWORD=securepass123 \
  -p 5432:5432 \
  timescale/timescaledb:latest-pg15 || echo "Postgres already running"

# Start Redis
docker run -d \
  --name security-redis \
  -p 6379:6379 \
  redis:7-alpine || echo "Redis already running"

# Wait for services
echo "Waiting for services to start..."
sleep 10

# Run database setup
echo "Setting up database..."
docker exec security-postgres psql -U secadmin -d security_dashboard -c "
CREATE EXTENSION IF NOT EXISTS timescaledb;

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

CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    condition JSONB NOT NULL,
    severity VARCHAR(20) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);" 2>/dev/null || echo "Database already configured"

echo ""
echo "========================================"
echo "✅ Security Dashboard Services Running!"
echo "========================================"
echo ""
echo "Services:"
echo "  PostgreSQL: localhost:5432"
echo "  Redis:      localhost:6379"
echo ""
echo "Database Credentials:"
echo "  Database: security_dashboard"
echo "  Username: secadmin"
echo "  Password: securepass123"
echo ""
echo "To connect:"
echo "  psql: docker exec -it security-postgres psql -U secadmin -d security_dashboard"
echo "  redis-cli: docker exec -it security-redis redis-cli"
echo ""
echo "To stop services:"
echo "  docker stop security-postgres security-redis"
echo "  docker rm security-postgres security-redis"