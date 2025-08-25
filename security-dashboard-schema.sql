-- Security Dashboard Database Schema
-- PostgreSQL with TimescaleDB extension for time-series data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations and Users
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'security_analyst', 'viewer')),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asset Management
CREATE TABLE asset_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL -- 'infrastructure', 'application', 'service'
);

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    asset_type_id UUID REFERENCES asset_types(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    environment VARCHAR(50) NOT NULL, -- 'production', 'staging', 'development'
    platform VARCHAR(50) NOT NULL, -- 'kong', 'netlify', 'vercel', 'fly', 'k8s', 'aws'
    endpoint_url TEXT,
    metadata JSONB, -- Platform-specific configuration
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security Events (Time-series table)
CREATE TABLE security_events (
    id UUID DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    asset_id UUID REFERENCES assets(id),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    source VARCHAR(100) NOT NULL, -- 'kong_monitor', 'github_scanner', 'aws_config', etc.
    raw_data JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('security_events', 'created_at');

-- Vulnerability Management
CREATE TABLE vulnerabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    asset_id UUID REFERENCES assets(id),
    cve_id VARCHAR(20),
    cvss_score DECIMAL(3,1),
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    affected_component VARCHAR(255),
    fix_available BOOLEAN DEFAULT FALSE,
    fix_version VARCHAR(100),
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'fixed', 'accepted_risk'
    first_detected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Tracking
CREATE TABLE compliance_frameworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    version VARCHAR(20),
    description TEXT
);

CREATE TABLE compliance_controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_id UUID REFERENCES compliance_frameworks(id),
    control_id VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100)
);

CREATE TABLE compliance_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    asset_id UUID REFERENCES assets(id),
    control_id UUID REFERENCES compliance_controls(id),
    status VARCHAR(50) NOT NULL, -- 'compliant', 'non_compliant', 'not_applicable', 'in_progress'
    evidence TEXT,
    assessed_by UUID REFERENCES users(id),
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_assessment TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert Rules and Configurations
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    condition JSONB NOT NULL, -- Rule definition in JSON format
    severity VARCHAR(20) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    notification_channels UUID[],
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE alert_instances (
    id UUID DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES alert_rules(id),
    organization_id UUID REFERENCES organizations(id),
    asset_id UUID REFERENCES assets(id),
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'acknowledged', 'resolved', 'suppressed'
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('alert_instances', 'created_at');

-- Secret Management Tracking
CREATE TABLE secret_inventories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    secret_name VARCHAR(255) NOT NULL,
    secret_type VARCHAR(100) NOT NULL, -- 'api_key', 'database_password', 'certificate', etc.
    storage_location VARCHAR(100) NOT NULL, -- 'aws_secrets_manager', 'kubernetes_secret', etc.
    environment VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_rotated TIMESTAMP WITH TIME ZONE,
    rotation_frequency_days INTEGER,
    auto_rotation_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kong Gateway Monitoring
CREATE TABLE kong_services_snapshot (
    id UUID DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    kong_service_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    protocol VARCHAR(10),
    host VARCHAR(255),
    port INTEGER,
    path VARCHAR(1000),
    https_redirect_status_code INTEGER,
    tls_verify BOOLEAN,
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_hypertable('kong_services_snapshot', 'snapshot_time');

CREATE TABLE kong_routes_snapshot (
    id UUID DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    kong_route_id VARCHAR(255) NOT NULL,
    kong_service_id VARCHAR(255),
    protocols TEXT[],
    methods TEXT[],
    hosts TEXT[],
    paths TEXT[],
    https_redirect_status_code INTEGER,
    preserve_host BOOLEAN,
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_hypertable('kong_routes_snapshot', 'snapshot_time');

-- Metrics and Performance Data (Time-series)
CREATE TABLE performance_metrics (
    id UUID DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    asset_id UUID REFERENCES assets(id),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    metric_unit VARCHAR(50),
    tags JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_hypertable('performance_metrics', 'recorded_at');

-- Indexes for performance
CREATE INDEX idx_security_events_org_severity ON security_events(organization_id, severity, created_at DESC);
CREATE INDEX idx_security_events_asset ON security_events(asset_id, created_at DESC);
CREATE INDEX idx_security_events_type ON security_events(event_type, created_at DESC);

CREATE INDEX idx_vulnerabilities_org_severity ON vulnerabilities(organization_id, severity, status);
CREATE INDEX idx_vulnerabilities_asset ON vulnerabilities(asset_id, status);
CREATE INDEX idx_vulnerabilities_cve ON vulnerabilities(cve_id);

CREATE INDEX idx_alert_instances_org_status ON alert_instances(organization_id, status, created_at DESC);
CREATE INDEX idx_alert_instances_rule ON alert_instances(rule_id, created_at DESC);

CREATE INDEX idx_assets_org_platform ON assets(organization_id, platform, environment);
CREATE INDEX idx_assets_tags ON assets USING gin(tags);

CREATE INDEX idx_performance_metrics_asset_name ON performance_metrics(asset_id, metric_name, recorded_at DESC);

-- Insert initial data
INSERT INTO compliance_frameworks (name, version, description) VALUES
('OWASP ASVS', '4.0.3', 'OWASP Application Security Verification Standard'),
('PCI-DSS', '4.0', 'Payment Card Industry Data Security Standard'),
('SOC 2', 'Type II', 'Service Organization Control 2'),
('ISO 27001', '2013', 'Information Security Management System');

INSERT INTO asset_types (name, category) VALUES
('API Gateway', 'infrastructure'),
('Web Application', 'application'),
('Database', 'infrastructure'),
('Kubernetes Cluster', 'infrastructure'),
('CI/CD Pipeline', 'service'),
('CDN', 'infrastructure');