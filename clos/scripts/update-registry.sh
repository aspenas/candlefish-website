#!/bin/bash

# Update CLOS Registry with all discovered services
# This script populates the SQLite database with all known services

CLOS_ROOT="/Users/patricksmith/candlefish-ai/clos"
DB_PATH="$CLOS_ROOT/.clos/registry.db"

# Ensure database exists
mkdir -p "$CLOS_ROOT/.clos"

# Create or update the database
sqlite3 "$DB_PATH" <<EOF
-- Ensure services table exists with all columns
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    port INTEGER NOT NULL,
    group_name TEXT,
    status TEXT DEFAULT 'stopped',
    started_at DATETIME,
    health_check_url TEXT,
    container_id TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Clear existing data for fresh import
DELETE FROM services;

-- Core Infrastructure Services
INSERT INTO services (name, port, group_name, description, health_check_url, status) VALUES
    ('clos-postgres', 5432, 'core', 'Main PostgreSQL database', NULL, 'running'),
    ('clos-redis', 6379, 'core', 'Main Redis cache', NULL, 'running'),
    ('clos-caddy', 80, 'core', 'HTTP reverse proxy', 'http://localhost:2019/config/', 'running'),
    ('caddy-admin', 2019, 'core', 'Caddy Admin API', 'http://localhost:2019/config/', 'running');

-- Frontend Applications
INSERT INTO services (name, port, group_name, description, health_check_url, status) VALUES
    ('candlefish-web', 3000, 'candlefish', 'Main Candlefish web application', 'http://localhost:3000/api/health', 'stopped'),
    ('grafana-monitoring', 3001, 'monitoring', 'Grafana monitoring dashboard', 'http://localhost:3001/api/health', 'running'),
    ('pkb-frontend', 3002, 'pkb', 'Personal Knowledge Base UI', 'http://localhost:3002/health', 'running'),
    ('security-grafana', 3003, 'security', 'Security dashboard Grafana', 'http://localhost:3003/api/health', 'running'),
    ('temporal-ui', 3004, 'temporal', 'Temporal workflow UI', 'http://localhost:3004/health', 'running'),
    ('security-dashboard', 3100, 'security', 'Security dashboard frontend', 'http://localhost:3100/health', 'stopped'),
    ('agent-dashboard', 3333, 'agents', 'Agent management dashboard', 'http://localhost:3333/health', 'stopped'),
    ('clos-dashboard', 3500, 'core', 'CLOS web dashboard', 'http://localhost:3500', 'running');

-- Backend APIs
INSERT INTO services (name, port, group_name, description, health_check_url, status) VALUES
    ('candlefish-api', 4000, 'candlefish', 'Main Candlefish API', 'http://localhost:4000/health', 'stopped'),
    ('workflow-api', 4040, 'workflow', 'Workflow management API', 'http://localhost:4040/health', 'stopped'),
    ('security-api', 4100, 'security', 'Security dashboard API', 'http://localhost:4100/health', 'stopped'),
    ('pkb-api', 4200, 'pkb', 'PKB API service', 'http://localhost:4200/health', 'stopped');

-- AI/ML Services
INSERT INTO services (name, port, group_name, description, health_check_url, status) VALUES
    ('mlflow', 5000, 'ai', 'MLflow tracking server', 'http://localhost:5000/health', 'stopped'),
    ('mlflow-artifacts', 5001, 'ai', 'MLflow artifacts server', 'http://localhost:5001/health', 'stopped'),
    ('ollama', 11434, 'ai', 'Ollama local LLM service', 'http://localhost:11434/api/tags', 'running');

-- Control & Management
INSERT INTO services (name, port, group_name, description, health_check_url, status) VALUES
    ('control-center', 7000, 'control', 'AFS3 fileserver/Control Center', NULL, 'running'),
    ('temporal-frontend', 7233, 'temporal', 'Temporal frontend service', 'http://localhost:7233/health', 'stopped'),
    ('goose-ai', 7768, 'ai', 'Goose AI service', 'http://localhost:7768/health', 'stopped');

-- Agent Services
INSERT INTO services (name, port, group_name, description, health_check_url, status) VALUES
    ('agent-registry', 8087, 'agents', 'Agent registry service', 'http://localhost:8087/health', 'running'),
    ('paintbox-agent', 8088, 'agents', 'Paintbox deployment agent', 'http://localhost:8088/health', 'running'),
    ('crown-trophy-agent', 8089, 'agents', 'Crown Trophy agent', 'http://localhost:8089/health', 'running'),
    ('temporal-agent', 8090, 'agents', 'Temporal workflow agent', 'http://localhost:8090/health', 'running'),
    ('clark-county-agent', 8091, 'agents', 'Clark County scraper agent', 'http://localhost:8091/health', 'running'),
    ('temporal-worker', 8233, 'temporal', 'Temporal worker service', 'http://localhost:8233/health', 'stopped'),
    ('pkb-streamlit', 8501, 'pkb', 'PKB Streamlit UI', 'http://localhost:8501/_stcore/health', 'stopped'),
    ('pkb-api-service', 8787, 'pkb', 'PKB API service', 'http://localhost:8787/health', 'stopped');

-- Monitoring & Metrics
INSERT INTO services (name, port, group_name, description, health_check_url, status) VALUES
    ('prometheus-main', 9090, 'monitoring', 'Main Prometheus server', 'http://localhost:9090/-/healthy', 'running'),
    ('security-prometheus', 9091, 'monitoring', 'Security Prometheus', 'http://localhost:9091/-/healthy', 'running'),
    ('dashboard-prometheus', 9092, 'monitoring', 'Dashboard Prometheus', 'http://localhost:9092/-/healthy', 'running');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_port ON services(port);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_group ON services(group_name);

-- Update container IDs for running Docker containers
UPDATE services SET container_id = 'clos-postgres' WHERE name = 'clos-postgres';
UPDATE services SET container_id = 'clos-redis' WHERE name = 'clos-redis';
UPDATE services SET container_id = 'clos-caddy' WHERE name IN ('clos-caddy', 'caddy-admin');
UPDATE services SET container_id = 'security-grafana' WHERE name = 'security-grafana';
UPDATE services SET container_id = 'security-dashboard-prometheus' WHERE name = 'dashboard-prometheus';
UPDATE services SET container_id = 'security-prometheus' WHERE name = 'security-prometheus';
UPDATE services SET container_id = 'deploy-prometheus-1' WHERE name = 'prometheus-main';
UPDATE services SET container_id = 'deploy-agent-registry-1' WHERE name = 'agent-registry';
UPDATE services SET container_id = 'deploy-paintbox-agent-1' WHERE name = 'paintbox-agent';
UPDATE services SET container_id = 'deploy-crown-trophy-agent-1' WHERE name = 'crown-trophy-agent';
UPDATE services SET container_id = 'deploy-temporal-agent-1' WHERE name = 'temporal-agent';
UPDATE services SET container_id = 'deploy-clark-county-agent-1' WHERE name = 'clark-county-agent';

-- Show summary
SELECT COUNT(*) as total_services FROM services;
SELECT group_name, COUNT(*) as count FROM services GROUP BY group_name;
SELECT status, COUNT(*) as count FROM services GROUP BY status;
EOF

echo "✅ Registry updated with all services"
echo "📊 Service summary:"
sqlite3 "$DB_PATH" "SELECT printf('  %-20s: %d services', group_name, COUNT(*)) FROM services GROUP BY group_name;"
echo ""
echo "🔄 Status summary:"
sqlite3 "$DB_PATH" "SELECT printf('  %-10s: %d services', status, COUNT(*)) FROM services GROUP BY status;"