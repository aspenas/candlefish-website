-- Candlefish AI Secrets Management Database Schema
-- Operational Design Atelier - Security as Craft

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Audit log table for security events
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    resource VARCHAR(500) NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure')),
    metadata JSONB DEFAULT '{}',
    client_ip INET,
    user_agent TEXT,
    session_id VARCHAR(255)
);

-- Secret metadata table
CREATE TABLE secret_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path VARCHAR(500) UNIQUE NOT NULL,
    classification VARCHAR(50) NOT NULL CHECK (classification IN ('public', 'internal', 'confidential', 'restricted')),
    owner VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    tags JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_rotated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rotation_schedule INTERVAL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Break-glass access log
CREATE TABLE break_glass_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    requested_by VARCHAR(255) NOT NULL,
    approvers TEXT[] NOT NULL,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    video_recorded BOOLEAN DEFAULT FALSE,
    session_recording_path VARCHAR(500)
);

-- Performance metrics
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metric VARCHAR(100) NOT NULL,
    path VARCHAR(500) NOT NULL,
    latency_ms INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor);
CREATE INDEX idx_audit_log_resource ON audit_log(resource);
CREATE INDEX idx_secret_metadata_path ON secret_metadata(path);
CREATE INDEX idx_secret_metadata_owner ON secret_metadata(owner);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX idx_performance_metrics_path ON performance_metrics(path);

-- Insert initial secret metadata
INSERT INTO secret_metadata (path, classification, owner, purpose, tags) VALUES
    ('candlefish/mongodb/connection', 'confidential', 'platform-team', 'Database connection for MongoDB', '{"type": "database", "service": "mongodb"}'),
    ('candlefish/api/smithery', 'confidential', 'platform-team', 'Smithery API key for external integrations', '{"type": "api_key", "service": "smithery"}'),
    ('candlefish/jwt/secret', 'restricted', 'security-team', 'JWT signing secret', '{"type": "crypto", "purpose": "auth"}'),
    ('candlefish/encryption/key', 'restricted', 'security-team', 'Master encryption key', '{"type": "crypto", "purpose": "encryption"}'),
    ('candlefish/postgres/password', 'confidential', 'platform-team', 'PostgreSQL database password', '{"type": "database", "service": "postgresql"}'),
    ('candlefish/redis/password', 'confidential', 'platform-team', 'Redis cache password', '{"type": "database", "service": "redis"}');

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_action VARCHAR(100),
    p_actor VARCHAR(255),
    p_resource VARCHAR(500),
    p_result VARCHAR(20),
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS 61439
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_log (action, actor, resource, result, metadata)
    VALUES (p_action, p_actor, p_resource, p_result, p_metadata)
    RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
61439 LANGUAGE plpgsql;

-- Function to record performance metrics
CREATE OR REPLACE FUNCTION record_metric(
    p_metric VARCHAR(100),
    p_path VARCHAR(500),
    p_latency_ms INTEGER,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS 61439
DECLARE
    metric_id UUID;
BEGIN
    INSERT INTO performance_metrics (metric, path, latency_ms, metadata)
    VALUES (p_metric, p_path, p_latency_ms, p_metadata)
    RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
61439 LANGUAGE plpgsql;

COMMIT;
