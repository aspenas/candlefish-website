-- Security Dashboard Database Schema
-- Version: 1.0.0
-- Date: 2025-08-29

-- Enable TimescaleDB extension (if using TimescaleDB image)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USER MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'guest', 'analyst')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Insert default users (Tyler & Patrick as admins, Aaron & James as guests)
INSERT INTO users (email, username, password_hash, role, first_name, last_name)
VALUES 
    ('tyler@candlefish.ai', 'tyler', '$2a$10$DUMMY_HASH', 'admin', 'Tyler', 'Admin'),
    ('patrick@candlefish.ai', 'patrick', '$2a$10$DUMMY_HASH', 'admin', 'Patrick', 'Smith'),
    ('aaron@candlefish.ai', 'aaron', '$2a$10$DUMMY_HASH', 'guest', 'Aaron', 'Guest'),
    ('james@candlefish.ai', 'james', '$2a$10$DUMMY_HASH', 'guest', 'James', 'Guest')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- SECURITY EVENTS (Time-series table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_events (
    id UUID DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    source_ip INET,
    destination_ip INET,
    source_port INTEGER,
    destination_port INTEGER,
    protocol VARCHAR(20),
    action VARCHAR(50),
    user_id UUID REFERENCES users(id),
    description TEXT,
    raw_data JSONB,
    tags TEXT[],
    PRIMARY KEY (id, timestamp)
);

-- Convert to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('security_events', 'timestamp', if_not_exists => TRUE);

-- ============================================================================
-- INCIDENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    priority VARCHAR(20) CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    tags TEXT[],
    metadata JSONB
);

-- ============================================================================
-- ALERTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'false_positive')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(100),
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    incident_id UUID REFERENCES incidents(id),
    metadata JSONB
);

-- ============================================================================
-- THREAT INTELLIGENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS threat_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indicator_type VARCHAR(50) CHECK (indicator_type IN ('ip', 'domain', 'hash', 'email', 'url')),
    indicator_value VARCHAR(500) NOT NULL,
    threat_type VARCHAR(100),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    source VARCHAR(100),
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    tags TEXT[],
    metadata JSONB,
    UNIQUE(indicator_type, indicator_value)
);

-- ============================================================================
-- COMPLIANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework VARCHAR(50) CHECK (framework IN ('SOC2', 'GDPR', 'ISO27001', 'PCI-DSS', 'HIPAA')),
    control_id VARCHAR(100) NOT NULL,
    control_name VARCHAR(255),
    status VARCHAR(50) CHECK (status IN ('compliant', 'non-compliant', 'partial', 'not-applicable')),
    last_checked TIMESTAMPTZ DEFAULT NOW(),
    evidence JSONB,
    notes TEXT,
    UNIQUE(framework, control_id)
);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(50),
    details JSONB,
    PRIMARY KEY (id, timestamp)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('audit_logs', 'timestamp', if_not_exists => TRUE);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Security Events indexes
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_source_ip ON security_events(source_ip);
CREATE INDEX idx_security_events_tags ON security_events USING GIN(tags);

-- Incidents indexes
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_assigned ON incidents(assigned_to);

-- Alerts indexes
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_triggered ON alerts(triggered_at DESC);

-- Threat indicators indexes
CREATE INDEX idx_threat_indicators_type ON threat_indicators(indicator_type);
CREATE INDEX idx_threat_indicators_active ON threat_indicators(is_active);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active alerts summary
CREATE OR REPLACE VIEW active_alerts_summary AS
SELECT 
    severity,
    COUNT(*) as count,
    MAX(triggered_at) as latest
FROM alerts
WHERE status = 'active'
GROUP BY severity;

-- Incident statistics
CREATE OR REPLACE VIEW incident_stats AS
SELECT 
    status,
    priority,
    COUNT(*) as count,
    AVG(EXTRACT(epoch FROM (COALESCE(resolved_at, NOW()) - created_at))/3600)::numeric(10,2) as avg_resolution_hours
FROM incidents
GROUP BY status, priority;

-- User activity summary
CREATE OR REPLACE VIEW user_activity AS
SELECT 
    u.username,
    u.role,
    COUNT(DISTINCT al.id) as total_actions,
    MAX(al.timestamp) as last_activity
FROM users u
LEFT JOIN audit_logs al ON u.id = al.user_id
GROUP BY u.id, u.username, u.role;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dashboard_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dashboard_user;

\echo 'Security Dashboard schema created successfully!'
