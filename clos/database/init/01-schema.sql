-- CLOS Database Schema with NANDA Agent Support
-- PostgreSQL 15+ Required

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'user', 'viewer');
CREATE TYPE service_status AS ENUM ('running', 'stopped', 'starting', 'stopping', 'crashed', 'unhealthy');
CREATE TYPE agent_status AS ENUM ('active', 'idle', 'disabled', 'error');
CREATE TYPE log_level AS ENUM ('debug', 'info', 'warn', 'error', 'fatal');

-- Users table with authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    api_key VARCHAR(255) UNIQUE,
    api_key_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services table (curated list)
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    group_name VARCHAR(100),
    status service_status DEFAULT 'stopped',
    port INTEGER,
    health_check_url VARCHAR(500),
    health_check_interval INTEGER DEFAULT 30,
    container_id VARCHAR(100),
    process_id INTEGER,
    auto_restart BOOLEAN DEFAULT false,
    max_restarts INTEGER DEFAULT 3,
    restart_count INTEGER DEFAULT 0,
    dependencies JSONB DEFAULT '[]',
    environment JSONB DEFAULT '{}',
    labels JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    started_at TIMESTAMP,
    stopped_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NANDA Agents table
CREATE TABLE nanda_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    status agent_status DEFAULT 'idle',
    capabilities JSONB DEFAULT '[]',
    configuration JSONB DEFAULT '{}',
    state JSONB DEFAULT '{}',
    last_heartbeat TIMESTAMP,
    error_count INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent decisions tracking
CREATE TABLE agent_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES nanda_agents(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    decision_type VARCHAR(100),
    action_taken VARCHAR(255),
    reason TEXT,
    confidence_score DECIMAL(3,2),
    outcome VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Health metrics table
CREATE TABLE health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    disk_usage DECIMAL(5,2),
    network_in BIGINT,
    network_out BIGINT,
    response_time INTEGER,
    status_code INTEGER,
    error_rate DECIMAL(5,2),
    request_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logs table with partitioning
CREATE TABLE logs (
    id UUID DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    level log_level NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for logs
CREATE TABLE logs_2025_01 PARTITION OF logs FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE logs_2025_02 PARTITION OF logs FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE logs_2025_03 PARTITION OF logs FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- Audit log for compliance
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    changes JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    permissions JSONB DEFAULT '[]',
    last_used TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for user sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts configuration
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    condition JSONB NOT NULL,
    threshold DECIMAL(10,2),
    severity VARCHAR(20),
    notification_channels JSONB DEFAULT '[]',
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incidents tracking
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    alert_id UUID REFERENCES alerts(id),
    severity VARCHAR(20),
    status VARCHAR(20) DEFAULT 'open',
    description TEXT,
    resolution TEXT,
    assigned_to UUID REFERENCES users(id),
    resolved_by UUID REFERENCES users(id),
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_services_group ON services(group_name);
CREATE INDEX idx_health_metrics_service_time ON health_metrics(service_id, created_at DESC);
CREATE INDEX idx_logs_service_time ON logs(service_id, created_at DESC);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_audit_user_time ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_agent_decisions_agent ON agent_decisions(agent_id, created_at DESC);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- Create views for common queries
CREATE VIEW service_health_summary AS
SELECT 
    s.id,
    s.name,
    s.status,
    s.group_name,
    AVG(hm.cpu_usage) as avg_cpu,
    AVG(hm.memory_usage) as avg_memory,
    AVG(hm.response_time) as avg_response_time,
    COUNT(CASE WHEN hm.status_code >= 500 THEN 1 END) as error_count
FROM services s
LEFT JOIN health_metrics hm ON s.id = hm.service_id
    AND hm.created_at > NOW() - INTERVAL '1 hour'
GROUP BY s.id, s.name, s.status, s.group_name;

-- Insert default users
INSERT INTO users (username, email, password_hash, role) VALUES
    ('patrick', 'patrick@clos.local', crypt('admin_password', gen_salt('bf')), 'admin'),
    ('tyler', 'tyler@clos.local', crypt('user_password', gen_salt('bf')), 'user'),
    ('aaron', 'aaron@clos.local', crypt('user_password', gen_salt('bf')), 'user'),
    ('james', 'james@clos.local', crypt('user_password', gen_salt('bf')), 'user');

-- Insert NANDA agents
INSERT INTO nanda_agents (name, type, capabilities, is_enabled) VALUES
    ('health-monitor', 'monitoring', '["health_check", "metric_collection", "anomaly_detection"]', true),
    ('auto-healer', 'recovery', '["restart_service", "clear_cache", "rotate_logs"]', true),
    ('performance-optimizer', 'optimization', '["scale_service", "optimize_queries", "cache_management"]', true),
    ('security-scanner', 'security', '["vulnerability_scan", "access_audit", "threat_detection"]', true),
    ('log-analyzer', 'analytics', '["log_aggregation", "pattern_detection", "error_correlation"]', true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nanda_agents_updated_at BEFORE UPDATE ON nanda_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();