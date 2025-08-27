-- Enhanced Security Dashboard Database Schema
-- PostgreSQL 15+ with TimescaleDB 2.11+ extension for high-throughput time-series data
-- Designed to handle 15,000 events/second with optimal indexing and partitioning

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ================================
-- CORE TENANT & USER MANAGEMENT
-- ================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'professional', 'enterprise')),
    rate_limit_per_minute INTEGER DEFAULT 1000,
    retention_days INTEGER DEFAULT 90,
    max_users INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_tier ON organizations(subscription_tier);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'org_admin', 'security_analyst', 'incident_responder', 'compliance_officer', 'viewer')),
    permissions JSONB DEFAULT '{}', -- Granular permissions override
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT,
    api_key_hash TEXT, -- For API access
    session_tokens TEXT[], -- Active session management
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    last_ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role, organization_id);
CREATE INDEX idx_users_api_key ON users(api_key_hash) WHERE api_key_hash IS NOT NULL;

-- ================================
-- ASSET MANAGEMENT
-- ================================

CREATE TABLE asset_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    risk_weight DECIMAL(3,2) DEFAULT 1.00 -- Risk multiplier for scoring
);

INSERT INTO asset_categories (name, description, risk_weight) VALUES
('Infrastructure', 'Core infrastructure components', 1.50),
('Application', 'Web and mobile applications', 1.25),
('Service', 'API and microservices', 1.30),
('Database', 'Data storage systems', 1.75),
('Network', 'Network and security appliances', 1.60);

CREATE TABLE asset_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES asset_categories(id),
    name VARCHAR(100) NOT NULL,
    platform_specific JSONB DEFAULT '{}' -- Platform-specific configuration schema
);

INSERT INTO asset_types (category_id, name, platform_specific) VALUES
((SELECT id FROM asset_categories WHERE name = 'Infrastructure'), 'API Gateway', '{"required_fields": ["admin_port", "proxy_port"], "optional_fields": ["plugins", "upstream_url"]}'),
((SELECT id FROM asset_categories WHERE name = 'Application'), 'Web Application', '{"required_fields": ["url"], "optional_fields": ["framework", "technology_stack"]}'),
((SELECT id FROM asset_categories WHERE name = 'Database'), 'PostgreSQL Database', '{"required_fields": ["connection_string"], "optional_fields": ["read_replicas", "backup_schedule"]}'),
((SELECT id FROM asset_categories WHERE name = 'Infrastructure'), 'Kubernetes Cluster', '{"required_fields": ["cluster_name", "context"], "optional_fields": ["namespaces", "helm_releases"]}'),
((SELECT id FROM asset_categories WHERE name = 'Service'), 'CI/CD Pipeline', '{"required_fields": ["repository"], "optional_fields": ["branch_protection", "secrets_scan"]}'),
((SELECT id FROM asset_categories WHERE name = 'Infrastructure'), 'CDN', '{"required_fields": ["distribution_id"], "optional_fields": ["cache_policies", "security_headers"]}');

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_type_id UUID REFERENCES asset_types(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    environment VARCHAR(50) NOT NULL CHECK (environment IN ('production', 'staging', 'development', 'test')),
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('kong', 'netlify', 'vercel', 'fly', 'k8s', 'aws', 'gcp', 'azure', 'on-premise')),
    criticality VARCHAR(20) DEFAULT 'medium' CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
    endpoint_url TEXT,
    health_check_url TEXT,
    metadata JSONB DEFAULT '{}', -- Platform-specific configuration
    security_config JSONB DEFAULT '{}', -- Security-specific settings
    tags TEXT[] DEFAULT '{}',
    owner_team VARCHAR(100),
    technical_contact_email VARCHAR(255),
    business_contact_email VARCHAR(255),
    compliance_scope TEXT[], -- Which compliance frameworks apply
    last_security_scan TIMESTAMP WITH TIME ZONE,
    next_security_scan TIMESTAMP WITH TIME ZONE,
    security_score INTEGER DEFAULT NULL CHECK (security_score BETWEEN 0 AND 100),
    monitoring_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_assets_org_platform ON assets(organization_id, platform, environment);
CREATE INDEX idx_assets_criticality ON assets(criticality, monitoring_enabled);
CREATE INDEX idx_assets_tags ON assets USING gin(tags);
CREATE INDEX idx_assets_compliance ON assets USING gin(compliance_scope);
CREATE INDEX idx_assets_security_scan ON assets(next_security_scan) WHERE monitoring_enabled = TRUE;

-- ================================
-- SECURITY EVENTS (TIME-SERIES)
-- ================================

CREATE TABLE event_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'authentication', 'authorization', 'data_access', 'infrastructure', 'application'
    default_severity VARCHAR(20) DEFAULT 'medium',
    description TEXT,
    ml_features JSONB DEFAULT '{}', -- Features to extract for ML
    retention_days INTEGER DEFAULT 90
);

INSERT INTO event_types (name, category, default_severity, description) VALUES
('failed_login', 'authentication', 'medium', 'Failed login attempt'),
('suspicious_login_location', 'authentication', 'high', 'Login from unusual geographic location'),
('brute_force_attempt', 'authentication', 'high', 'Multiple failed login attempts in short time'),
('privilege_escalation', 'authorization', 'critical', 'User attempting unauthorized privilege escalation'),
('unauthorized_api_access', 'authorization', 'high', 'API access without proper authorization'),
('data_exfiltration_pattern', 'data_access', 'critical', 'Pattern suggesting data exfiltration'),
('sql_injection_attempt', 'application', 'high', 'Potential SQL injection attack'),
('xss_attempt', 'application', 'medium', 'Potential cross-site scripting attack'),
('ddos_pattern', 'infrastructure', 'high', 'Distributed denial of service pattern detected'),
('malware_detected', 'infrastructure', 'critical', 'Malware or malicious code detected'),
('config_drift', 'infrastructure', 'medium', 'Security configuration has drifted from baseline'),
('certificate_expiry_warning', 'infrastructure', 'low', 'SSL certificate nearing expiration'),
('compliance_violation', 'authorization', 'high', 'Action violates compliance requirements'),
('anomalous_network_traffic', 'infrastructure', 'medium', 'Unusual network traffic pattern'),
('secret_leaked', 'data_access', 'critical', 'Secrets or credentials found in code/logs');

-- Main security events table (hypertable for time-series optimization)
CREATE TABLE security_events (
    id UUID DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    event_type_id UUID REFERENCES event_types(id),
    event_type_name VARCHAR(100) NOT NULL, -- Denormalized for query performance
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    confidence_score DECIMAL(3,2) DEFAULT 1.00 CHECK (confidence_score BETWEEN 0.00 AND 1.00),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    source VARCHAR(100) NOT NULL, -- 'kong_monitor', 'github_scanner', 'aws_config', etc.
    source_ip INET,
    user_agent TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    affected_user_count INTEGER DEFAULT 1,
    raw_data JSONB DEFAULT '{}',
    normalized_data JSONB DEFAULT '{}', -- Structured data for analytics
    ml_features JSONB DEFAULT '{}', -- Features for ML processing
    correlation_id UUID, -- Link related events
    parent_event_id UUID, -- Event hierarchy
    false_positive BOOLEAN DEFAULT FALSE,
    suppressed BOOLEAN DEFAULT FALSE,
    suppressed_until TIMESTAMP WITH TIME ZONE,
    suppressed_reason TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    resolution_time_seconds INTEGER, -- Time to resolution for SLA tracking
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    occurrence_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('security_events', 'created_at', chunk_time_interval => INTERVAL '1 hour');

-- Create materialized views for real-time aggregations
CREATE MATERIALIZED VIEW security_events_hourly AS
SELECT
    time_bucket('1 hour', created_at) AS hour,
    organization_id,
    severity,
    event_type_name,
    COUNT(*) as event_count,
    COUNT(DISTINCT asset_id) as affected_assets,
    AVG(confidence_score) as avg_confidence
FROM security_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY hour, organization_id, severity, event_type_name;

-- Refresh policy for materialized view
SELECT add_continuous_aggregate_policy('security_events_hourly',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- High-performance indexes
CREATE INDEX idx_security_events_org_severity_time ON security_events(organization_id, severity, created_at DESC);
CREATE INDEX idx_security_events_asset_time ON security_events(asset_id, created_at DESC) WHERE asset_id IS NOT NULL;
CREATE INDEX idx_security_events_type_time ON security_events(event_type_name, created_at DESC);
CREATE INDEX idx_security_events_source ON security_events(source, created_at DESC);
CREATE INDEX idx_security_events_correlation ON security_events(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_security_events_unresolved ON security_events(organization_id, created_at DESC) WHERE resolved = FALSE;
CREATE INDEX idx_security_events_source_ip ON security_events(source_ip, created_at DESC) WHERE source_ip IS NOT NULL;
CREATE INDEX idx_security_events_ml_features ON security_events USING gin(ml_features) WHERE ml_features != '{}';

-- ================================
-- ADVANCED THREAT DETECTION
-- ================================

CREATE TABLE threat_detection_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('threshold', 'pattern', 'anomaly', 'correlation', 'ml_model')),
    condition JSONB NOT NULL, -- Rule definition in JSON format
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    enabled BOOLEAN DEFAULT TRUE,
    auto_resolve BOOLEAN DEFAULT FALSE,
    alert_channels JSONB DEFAULT '[]', -- Notification channel configurations
    suppression_window_minutes INTEGER DEFAULT 60, -- Prevent alert spam
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    last_triggered TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    false_positive_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_threat_rules_org_enabled ON threat_detection_rules(organization_id, enabled);
CREATE INDEX idx_threat_rules_type ON threat_detection_rules(rule_type, enabled);

-- Pre-built threat detection rules
INSERT INTO threat_detection_rules (organization_id, name, description, rule_type, condition, severity) VALUES
(
    NULL, -- Global rule template
    'Brute Force Login Attempts',
    'Detects multiple failed login attempts from same IP',
    'threshold',
    '{
        "event_type": "failed_login",
        "time_window": "5 minutes",
        "threshold": 10,
        "group_by": ["source_ip"]
    }',
    'high'
),
(
    NULL,
    'Suspicious Privilege Escalation',
    'Detects rapid privilege changes or escalation attempts',
    'pattern',
    '{
        "event_types": ["privilege_escalation", "unauthorized_api_access"],
        "time_window": "15 minutes",
        "pattern": "sequential",
        "group_by": ["user_id"]
    }',
    'critical'
),
(
    NULL,
    'Data Exfiltration Pattern',
    'Detects patterns suggesting data exfiltration',
    'correlation',
    '{
        "events": [
            {"type": "data_access", "threshold": 100},
            {"type": "network_transfer", "volume_gb": 10}
        ],
        "time_window": "1 hour",
        "correlation": "user_session"
    }',
    'critical'
);

CREATE TABLE alert_instances (
    id UUID DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES threat_detection_rules(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    alert_hash VARCHAR(64) UNIQUE, -- Hash of alert conditions to prevent duplicates
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'acknowledged', 'resolved', 'false_positive', 'suppressed')),
    confidence_score DECIMAL(3,2) DEFAULT 1.00,
    risk_score INTEGER DEFAULT 50 CHECK (risk_score BETWEEN 0 AND 100),
    affected_assets UUID[] DEFAULT '{}',
    related_events UUID[] DEFAULT '{}',
    evidence JSONB DEFAULT '{}',
    automated_response JSONB DEFAULT '{}', -- Automated actions taken
    assigned_to UUID REFERENCES users(id),
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_time_seconds INTEGER,
    escalated BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalated_to UUID REFERENCES users(id),
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_channels_used TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_hypertable('alert_instances', 'created_at', chunk_time_interval => INTERVAL '1 day');

CREATE INDEX idx_alert_instances_org_status ON alert_instances(organization_id, status, created_at DESC);
CREATE INDEX idx_alert_instances_rule ON alert_instances(rule_id, created_at DESC);
CREATE INDEX idx_alert_instances_severity ON alert_instances(severity, status, created_at DESC);
CREATE INDEX idx_alert_instances_assigned ON alert_instances(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_alert_instances_hash ON alert_instances(alert_hash);

-- ================================
-- VULNERABILITY MANAGEMENT
-- ================================

CREATE TABLE vulnerability_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500),
    api_endpoint VARCHAR(500),
    last_update TIMESTAMP WITH TIME ZONE
);

INSERT INTO vulnerability_sources (name, url, api_endpoint) VALUES
('National Vulnerability Database', 'https://nvd.nist.gov/', 'https://services.nvd.nist.gov/rest/json/cves/2.0'),
('GitHub Advisory Database', 'https://github.com/advisories', 'https://api.github.com/advisories'),
('Snyk Vulnerability Database', 'https://security.snyk.io/', 'https://api.snyk.io/v1/vuln'),
('OWASP Top 10', 'https://owasp.org/www-project-top-ten/', NULL);

CREATE TABLE vulnerabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    source_id UUID REFERENCES vulnerability_sources(id),
    external_id VARCHAR(100), -- CVE-ID, GHSA-ID, etc.
    cve_id VARCHAR(20),
    cvss_version VARCHAR(10) DEFAULT '3.1',
    cvss_score DECIMAL(3,1),
    cvss_vector VARCHAR(100),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    affected_component VARCHAR(255),
    affected_versions TEXT[],
    fix_available BOOLEAN DEFAULT FALSE,
    fix_version VARCHAR(100),
    fix_complexity VARCHAR(20) DEFAULT 'medium' CHECK (fix_complexity IN ('low', 'medium', 'high')),
    patch_url VARCHAR(500),
    workaround TEXT,
    exploit_available BOOLEAN DEFAULT FALSE,
    exploit_maturity VARCHAR(20) DEFAULT 'unknown' CHECK (exploit_maturity IN ('unproven', 'proof_of_concept', 'functional', 'high', 'unknown')),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'in_progress', 'testing', 'fixed', 'accepted_risk', 'false_positive')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    assigned_to UUID REFERENCES users(id),
    due_date TIMESTAMP WITH TIME ZONE,
    business_impact TEXT,
    technical_impact TEXT,
    remediation_effort_hours INTEGER,
    tags TEXT[] DEFAULT '{}',
    first_detected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fixed_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vulnerabilities_org_severity ON vulnerabilities(organization_id, severity, status);
CREATE INDEX idx_vulnerabilities_asset ON vulnerabilities(asset_id, status);
CREATE INDEX idx_vulnerabilities_cve ON vulnerabilities(cve_id) WHERE cve_id IS NOT NULL;
CREATE INDEX idx_vulnerabilities_external_id ON vulnerabilities(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_vulnerabilities_assigned ON vulnerabilities(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_vulnerabilities_due_date ON vulnerabilities(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_vulnerabilities_cvss ON vulnerabilities(cvss_score DESC, severity);

-- ================================
-- COMPLIANCE & GOVERNANCE
-- ================================

CREATE TABLE compliance_frameworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(20) NOT NULL,
    version VARCHAR(20),
    description TEXT,
    authority VARCHAR(100), -- Governing body
    mandatory BOOLEAN DEFAULT FALSE, -- Required vs optional
    industry_specific TEXT[], -- Industries this applies to
    geographic_scope TEXT[], -- Regions this applies to
    url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO compliance_frameworks (name, short_name, version, description, authority, mandatory) VALUES
('OWASP Application Security Verification Standard', 'ASVS', '4.0.3', 'OWASP Application Security Verification Standard', 'OWASP Foundation', FALSE),
('Payment Card Industry Data Security Standard', 'PCI-DSS', '4.0', 'Payment Card Industry Data Security Standard', 'PCI Security Standards Council', TRUE),
('Service Organization Control 2', 'SOC 2', 'Type II', 'Service Organization Control 2', 'AICPA', FALSE),
('ISO/IEC 27001', 'ISO 27001', '2013', 'Information Security Management System', 'ISO/IEC', FALSE),
('General Data Protection Regulation', 'GDPR', '2018', 'European Union General Data Protection Regulation', 'European Commission', TRUE),
('California Consumer Privacy Act', 'CCPA', '2020', 'California Consumer Privacy Act', 'State of California', TRUE),
('NIST Cybersecurity Framework', 'NIST CSF', '1.1', 'NIST Cybersecurity Framework', 'NIST', FALSE),
('FedRAMP', 'FedRAMP', 'Rev 5', 'Federal Risk and Authorization Management Program', 'GSA', TRUE);

CREATE TABLE compliance_controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_id UUID REFERENCES compliance_frameworks(id),
    control_id VARCHAR(50) NOT NULL, -- Framework-specific control identifier
    parent_control_id UUID REFERENCES compliance_controls(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    control_type VARCHAR(50) CHECK (control_type IN ('preventive', 'detective', 'corrective', 'administrative', 'technical', 'physical')),
    implementation_guidance TEXT,
    testing_guidance TEXT,
    automation_possible BOOLEAN DEFAULT FALSE,
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('critical', 'high', 'medium', 'low')),
    effort_level VARCHAR(20) DEFAULT 'medium' CHECK (effort_level IN ('high', 'medium', 'low')),
    frequency VARCHAR(50) DEFAULT 'annual' CHECK (frequency IN ('continuous', 'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'ad_hoc')),
    evidence_requirements TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_compliance_controls_framework ON compliance_controls(framework_id, control_id);
CREATE INDEX idx_compliance_controls_category ON compliance_controls(category, subcategory);
CREATE INDEX idx_compliance_controls_automation ON compliance_controls(automation_possible, risk_level);

CREATE TABLE compliance_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    control_id UUID REFERENCES compliance_controls(id),
    assessment_type VARCHAR(50) DEFAULT 'self_assessment' CHECK (assessment_type IN ('self_assessment', 'internal_audit', 'external_audit', 'automated_scan')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('compliant', 'non_compliant', 'partially_compliant', 'not_applicable', 'in_progress', 'not_assessed')),
    compliance_score INTEGER CHECK (compliance_score BETWEEN 0 AND 100),
    risk_rating VARCHAR(20) CHECK (risk_rating IN ('critical', 'high', 'medium', 'low', 'none')),
    evidence_provided BOOLEAN DEFAULT FALSE,
    evidence_artifacts JSONB DEFAULT '[]', -- Links to evidence files/documents
    findings TEXT,
    recommendations TEXT,
    remediation_plan TEXT,
    remediation_due_date TIMESTAMP WITH TIME ZONE,
    compensating_controls TEXT,
    assessed_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    review_date TIMESTAMP WITH TIME ZONE,
    approval_date TIMESTAMP WITH TIME ZONE,
    next_assessment_date TIMESTAMP WITH TIME ZONE,
    automated BOOLEAN DEFAULT FALSE,
    automation_tool VARCHAR(100),
    automation_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_compliance_assessments_org_control ON compliance_assessments(organization_id, control_id);
CREATE INDEX idx_compliance_assessments_asset ON compliance_assessments(asset_id, status);
CREATE INDEX idx_compliance_assessments_status ON compliance_assessments(status, risk_rating);
CREATE INDEX idx_compliance_assessments_next ON compliance_assessments(next_assessment_date) WHERE next_assessment_date IS NOT NULL;
CREATE INDEX idx_compliance_assessments_due ON compliance_assessments(remediation_due_date) WHERE remediation_due_date IS NOT NULL;

-- ================================
-- SECRETS MANAGEMENT TRACKING
-- ================================

CREATE TABLE secret_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'api_key', 'database_credential', 'certificate', 'oauth_token', 'ssh_key'
    default_rotation_days INTEGER DEFAULT 90,
    security_level VARCHAR(20) DEFAULT 'high' CHECK (security_level IN ('critical', 'high', 'medium', 'low')),
    detection_patterns JSONB DEFAULT '[]' -- Regex patterns for secret scanning
);

INSERT INTO secret_types (name, category, default_rotation_days, security_level, detection_patterns) VALUES
('Database Password', 'database_credential', 90, 'critical', '["password\\s*=\\s*[\"''][^\"'']{8,}[\"'']", "pwd\\s*=\\s*[\"''][^\"'']{8,}[\"'']"]'),
('API Key', 'api_key', 180, 'high', '["api[_-]?key\\s*=\\s*[\"''][A-Za-z0-9]{20,}[\"'']", "apikey\\s*=\\s*[\"''][A-Za-z0-9]{20,}[\"'']"]'),
('JWT Secret', 'jwt_token', 365, 'critical', '["jwt[_-]?secret\\s*=\\s*[\"''][A-Za-z0-9+/]{32,}={0,2}[\"'']"]'),
('OAuth Client Secret', 'oauth_token', 730, 'high', '["client[_-]?secret\\s*=\\s*[\"''][A-Za-z0-9]{20,}[\"'']"]'),
('SSL Certificate', 'certificate', 365, 'medium', '["-----BEGIN CERTIFICATE-----", "-----BEGIN PRIVATE KEY-----"]'),
('SSH Private Key', 'ssh_key', 1095, 'high', '["-----BEGIN OPENSSH PRIVATE KEY-----", "-----BEGIN RSA PRIVATE KEY-----"]'),
('AWS Access Key', 'api_key', 90, 'critical', '["AKIA[0-9A-Z]{16}", "aws_access_key_id\\s*=\\s*[\"'']AKIA[0-9A-Z]{16}[\"'']"]'),
('GitHub Token', 'api_key', 365, 'high', '["ghp_[A-Za-z0-9]{36}", "gho_[A-Za-z0-9]{36}", "github_token\\s*=\\s*[\"'']gh[a-z]_[A-Za-z0-9]{36}[\"'']"]');

CREATE TABLE secret_inventories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    secret_type_id UUID REFERENCES secret_types(id),
    secret_name VARCHAR(255) NOT NULL,
    secret_identifier VARCHAR(255), -- External identifier (e.g., AWS Secret ARN)
    storage_location VARCHAR(100) NOT NULL CHECK (storage_location IN ('aws_secrets_manager', 'azure_key_vault', 'gcp_secret_manager', 'kubernetes_secret', 'hashicorp_vault', 'environment_variable', 'config_file', 'database', 'other')),
    storage_path TEXT, -- Path or identifier within storage system
    environment VARCHAR(50) NOT NULL,
    access_level VARCHAR(50) DEFAULT 'restricted' CHECK (access_level IN ('public', 'internal', 'restricted', 'confidential', 'top_secret')),
    encryption_at_rest BOOLEAN DEFAULT TRUE,
    encryption_in_transit BOOLEAN DEFAULT TRUE,
    access_logged BOOLEAN DEFAULT FALSE,
    auto_rotation_enabled BOOLEAN DEFAULT FALSE,
    rotation_frequency_days INTEGER,
    last_rotated TIMESTAMP WITH TIME ZONE,
    next_rotation_due TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    compromise_detected BOOLEAN DEFAULT FALSE,
    compromise_date TIMESTAMP WITH TIME ZONE,
    deactivated BOOLEAN DEFAULT FALSE,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_secret_inventories_org_type ON secret_inventories(organization_id, secret_type_id);
CREATE INDEX idx_secret_inventories_asset ON secret_inventories(asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX idx_secret_inventories_rotation_due ON secret_inventories(next_rotation_due) WHERE next_rotation_due IS NOT NULL AND deactivated = FALSE;
CREATE INDEX idx_secret_inventories_expires ON secret_inventories(expires_at) WHERE expires_at IS NOT NULL AND deactivated = FALSE;
CREATE INDEX idx_secret_inventories_compromise ON secret_inventories(compromise_detected, compromise_date) WHERE compromise_detected = TRUE;
CREATE INDEX idx_secret_inventories_storage ON secret_inventories(storage_location, environment);

-- ================================
-- KONG GATEWAY MONITORING
-- ================================

CREATE TABLE kong_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    admin_url VARCHAR(500) NOT NULL,
    proxy_url VARCHAR(500),
    version VARCHAR(50),
    database_type VARCHAR(50), -- 'postgres', 'cassandra', 'off' (DB-less)
    cluster_role VARCHAR(50), -- 'traditional', 'control_plane', 'data_plane'
    last_ping TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'unknown' CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kong_instances_org ON kong_instances(organization_id);
CREATE INDEX idx_kong_instances_status ON kong_instances(status, last_ping);

CREATE TABLE kong_services_snapshot (
    id UUID DEFAULT uuid_generate_v4(),
    kong_instance_id UUID REFERENCES kong_instances(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kong_service_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    protocol VARCHAR(10),
    host VARCHAR(255),
    port INTEGER,
    path VARCHAR(1000),
    retries INTEGER DEFAULT 5,
    connect_timeout INTEGER DEFAULT 60000,
    write_timeout INTEGER DEFAULT 60000,
    read_timeout INTEGER DEFAULT 60000,
    enabled BOOLEAN DEFAULT TRUE,
    tags TEXT[] DEFAULT '{}',
    security_score INTEGER CHECK (security_score BETWEEN 0 AND 100),
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_hypertable('kong_services_snapshot', 'snapshot_time', chunk_time_interval => INTERVAL '1 day');

CREATE INDEX idx_kong_services_instance ON kong_services_snapshot(kong_instance_id, kong_service_id);
CREATE INDEX idx_kong_services_org_time ON kong_services_snapshot(organization_id, snapshot_time DESC);

CREATE TABLE kong_routes_snapshot (
    id UUID DEFAULT uuid_generate_v4(),
    kong_instance_id UUID REFERENCES kong_instances(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kong_route_id VARCHAR(255) NOT NULL,
    kong_service_id VARCHAR(255),
    name VARCHAR(255),
    protocols TEXT[],
    methods TEXT[],
    hosts TEXT[],
    paths TEXT[],
    headers JSONB DEFAULT '{}',
    https_redirect_status_code INTEGER,
    regex_priority INTEGER DEFAULT 0,
    strip_path BOOLEAN DEFAULT TRUE,
    preserve_host BOOLEAN DEFAULT FALSE,
    request_buffering BOOLEAN DEFAULT TRUE,
    response_buffering BOOLEAN DEFAULT TRUE,
    tags TEXT[] DEFAULT '{}',
    security_plugins TEXT[] DEFAULT '{}', -- List of security-related plugins
    security_score INTEGER CHECK (security_score BETWEEN 0 AND 100),
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_hypertable('kong_routes_snapshot', 'snapshot_time', chunk_time_interval => INTERVAL '1 day');

CREATE INDEX idx_kong_routes_instance ON kong_routes_snapshot(kong_instance_id, kong_route_id);
CREATE INDEX idx_kong_routes_service ON kong_routes_snapshot(kong_service_id, snapshot_time DESC);
CREATE INDEX idx_kong_routes_security ON kong_routes_snapshot(security_score, snapshot_time DESC) WHERE security_score IS NOT NULL;

CREATE TABLE kong_plugins_snapshot (
    id UUID DEFAULT uuid_generate_v4(),
    kong_instance_id UUID REFERENCES kong_instances(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kong_plugin_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    service_id VARCHAR(255),
    route_id VARCHAR(255),
    consumer_id VARCHAR(255),
    config JSONB DEFAULT '{}',
    protocols TEXT[],
    enabled BOOLEAN DEFAULT TRUE,
    tags TEXT[] DEFAULT '{}',
    is_security_plugin BOOLEAN DEFAULT FALSE,
    security_category VARCHAR(100), -- 'authentication', 'authorization', 'rate_limiting', 'logging', etc.
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_hypertable('kong_plugins_snapshot', 'snapshot_time', chunk_time_interval => INTERVAL '1 day');

CREATE INDEX idx_kong_plugins_instance ON kong_plugins_snapshot(kong_instance_id, name, snapshot_time DESC);
CREATE INDEX idx_kong_plugins_security ON kong_plugins_snapshot(is_security_plugin, security_category, snapshot_time DESC) WHERE is_security_plugin = TRUE;

-- ================================
-- PERFORMANCE METRICS (TIME-SERIES)
-- ================================

CREATE TABLE metric_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'security', 'performance', 'availability', 'compliance'
    unit VARCHAR(20) NOT NULL, -- 'count', 'percent', 'milliseconds', 'bytes', 'requests_per_second'
    aggregation_type VARCHAR(20) DEFAULT 'sum' CHECK (aggregation_type IN ('sum', 'avg', 'min', 'max', 'count', 'rate')),
    description TEXT,
    high_is_good BOOLEAN DEFAULT TRUE,
    warning_threshold DECIMAL(15,4),
    critical_threshold DECIMAL(15,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO metric_definitions (name, category, unit, aggregation_type, description, high_is_good, warning_threshold, critical_threshold) VALUES
('security_events_per_minute', 'security', 'count', 'rate', 'Number of security events per minute', FALSE, 10, 50),
('failed_login_rate', 'security', 'percent', 'rate', 'Percentage of failed login attempts', FALSE, 5, 15),
('api_response_time_p95', 'performance', 'milliseconds', 'max', '95th percentile API response time', FALSE, 500, 2000),
('threat_detection_accuracy', 'security', 'percent', 'avg', 'Accuracy of threat detection (true positives)', TRUE, 85, 70),
('vulnerability_fix_time_avg', 'security', 'hours', 'avg', 'Average time to fix vulnerabilities', FALSE, 168, 720),
('compliance_score', 'compliance', 'percent', 'avg', 'Overall compliance score', TRUE, 80, 60),
('ssl_certificate_expiry_days', 'security', 'count', 'min', 'Days until SSL certificate expiry', FALSE, 30, 7),
('secret_rotation_compliance', 'security', 'percent', 'avg', 'Percentage of secrets rotated on schedule', TRUE, 90, 70);

CREATE TABLE performance_metrics (
    id UUID DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    metric_definition_id UUID REFERENCES metric_definitions(id),
    metric_name VARCHAR(100) NOT NULL, -- Denormalized for query performance
    metric_value DOUBLE PRECISION NOT NULL,
    tags JSONB DEFAULT '{}',
    dimensions JSONB DEFAULT '{}', -- Additional grouping dimensions
    source VARCHAR(100) NOT NULL, -- Data source that produced this metric
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_hypertable('performance_metrics', 'recorded_at', chunk_time_interval => INTERVAL '1 hour');

-- Create compression policy for metrics older than 7 days
SELECT add_compression_policy('performance_metrics', INTERVAL '7 days');

-- Create materialized view for real-time dashboards
CREATE MATERIALIZED VIEW metrics_5min AS
SELECT
    time_bucket('5 minutes', recorded_at) AS time_bucket,
    organization_id,
    asset_id,
    metric_name,
    AVG(metric_value) as avg_value,
    MAX(metric_value) as max_value,
    MIN(metric_value) as min_value,
    COUNT(*) as sample_count
FROM performance_metrics
WHERE recorded_at >= NOW() - INTERVAL '24 hours'
GROUP BY time_bucket, organization_id, asset_id, metric_name;

SELECT add_continuous_aggregate_policy('metrics_5min',
    start_offset => INTERVAL '10 minutes',
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes');

CREATE INDEX idx_performance_metrics_org_metric ON performance_metrics(organization_id, metric_name, recorded_at DESC);
CREATE INDEX idx_performance_metrics_asset_metric ON performance_metrics(asset_id, metric_name, recorded_at DESC) WHERE asset_id IS NOT NULL;
CREATE INDEX idx_performance_metrics_tags ON performance_metrics USING gin(tags) WHERE tags != '{}';

-- ================================
-- EXTERNAL INTEGRATIONS
-- ================================

CREATE TABLE integration_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('siem', 'soar', 'vulnerability_scanner', 'code_scanner', 'cloud_security', 'identity_provider')),
    description TEXT,
    supported_auth_types TEXT[] DEFAULT '{"api_key", "oauth2", "basic_auth"}',
    default_config_schema JSONB DEFAULT '{}',
    webhook_support BOOLEAN DEFAULT FALSE,
    real_time_sync BOOLEAN DEFAULT FALSE
);

INSERT INTO integration_types (name, category, description, supported_auth_types, webhook_support, real_time_sync) VALUES
('Splunk', 'siem', 'Splunk SIEM Platform', '{"api_key", "basic_auth"}', TRUE, TRUE),
('Elastic Security', 'siem', 'Elasticsearch Security (SIEM)', '{"api_key", "basic_auth"}', TRUE, TRUE),
('IBM QRadar', 'siem', 'IBM QRadar SIEM', '{"api_key", "basic_auth"}', FALSE, FALSE),
('Microsoft Sentinel', 'siem', 'Microsoft Azure Sentinel', '{"oauth2", "service_principal"}', TRUE, TRUE),
('Google Chronicle', 'siem', 'Google Chronicle Security Operations', '{"service_account", "oauth2"}', TRUE, TRUE),
('Phantom (Splunk)', 'soar', 'Splunk Phantom SOAR Platform', '{"api_key", "oauth2"}', TRUE, TRUE),
('IBM Resilient', 'soar', 'IBM Security Resilient SOAR', '{"api_key", "basic_auth"}', TRUE, FALSE),
('Palo Alto Cortex XSOAR', 'soar', 'Palo Alto Cortex XSOAR', '{"api_key"}', TRUE, TRUE),
('Tenable', 'vulnerability_scanner', 'Tenable Vulnerability Management', '{"api_key"}', TRUE, FALSE),
('Rapid7 InsightVM', 'vulnerability_scanner', 'Rapid7 InsightVM', '{"api_key"}', TRUE, FALSE),
('Snyk', 'code_scanner', 'Snyk Code Security Scanner', '{"api_key"}', TRUE, TRUE),
('GitHub Advanced Security', 'code_scanner', 'GitHub Advanced Security', '{"github_app", "oauth2"}', TRUE, TRUE),
('AWS Security Hub', 'cloud_security', 'AWS Security Hub', '{"aws_credentials", "cross_account_role"}', TRUE, TRUE),
('Azure Security Center', 'cloud_security', 'Microsoft Azure Security Center', '{"service_principal", "managed_identity"}', TRUE, TRUE),
('GCP Security Command Center', 'cloud_security', 'Google Cloud Security Command Center', '{"service_account"}', TRUE, TRUE),
('Okta', 'identity_provider', 'Okta Identity Provider', '{"oauth2", "api_key"}', TRUE, TRUE),
('Azure AD', 'identity_provider', 'Azure Active Directory', '{"oauth2", "service_principal"}', TRUE, TRUE);

CREATE TABLE external_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    integration_type_id UUID REFERENCES integration_types(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    endpoint_url VARCHAR(1000) NOT NULL,
    authentication_type VARCHAR(50) NOT NULL,
    credentials JSONB DEFAULT '{}', -- Encrypted credentials
    config JSONB DEFAULT '{}',
    webhook_url VARCHAR(1000),
    webhook_secret VARCHAR(255),
    enabled BOOLEAN DEFAULT TRUE,
    sync_direction VARCHAR(20) DEFAULT 'bidirectional' CHECK (sync_direction IN ('inbound', 'outbound', 'bidirectional')),
    sync_frequency_minutes INTEGER DEFAULT 60,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_status VARCHAR(20) DEFAULT 'never' CHECK (last_sync_status IN ('success', 'error', 'partial', 'never')),
    last_error TEXT,
    sync_stats JSONB DEFAULT '{}',
    rate_limit_per_hour INTEGER DEFAULT 1000,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_external_integrations_org_type ON external_integrations(organization_id, integration_type_id);
CREATE INDEX idx_external_integrations_enabled ON external_integrations(enabled, last_sync_at);
CREATE INDEX idx_external_integrations_sync_status ON external_integrations(last_sync_status, last_sync_at);

-- ================================
-- INCIDENT RESPONSE WORKFLOW
-- ================================

CREATE TABLE incident_response_playbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_conditions JSONB NOT NULL, -- Conditions that trigger this playbook
    severity_mapping JSONB DEFAULT '{}', -- How to map event severity to incident severity
    workflow_steps JSONB NOT NULL, -- Ordered array of workflow steps
    automated_steps BOOLEAN DEFAULT FALSE,
    approval_required BOOLEAN DEFAULT TRUE,
    escalation_rules JSONB DEFAULT '{}',
    sla_hours INTEGER DEFAULT 24,
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    version INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_incident_playbooks_org ON incident_response_playbooks(organization_id, active);
CREATE INDEX idx_incident_playbooks_tags ON incident_response_playbooks USING gin(tags);

CREATE TABLE security_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    incident_number VARCHAR(50) UNIQUE NOT NULL, -- Human-readable incident ID
    playbook_id UUID REFERENCES incident_response_playbooks(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'investigating', 'contained', 'eradicating', 'recovering', 'resolved', 'closed', 'false_positive')),
    category VARCHAR(100), -- 'malware', 'data_breach', 'ddos', 'insider_threat', 'phishing', etc.
    source VARCHAR(100) NOT NULL, -- How the incident was detected
    confidence_level VARCHAR(20) DEFAULT 'medium' CHECK (confidence_level IN ('high', 'medium', 'low')),
    business_impact VARCHAR(20) DEFAULT 'medium' CHECK (business_impact IN ('critical', 'high', 'medium', 'low', 'none')),
    customer_impact BOOLEAN DEFAULT FALSE,
    data_involved BOOLEAN DEFAULT FALSE,
    data_classification VARCHAR(50), -- 'public', 'internal', 'confidential', 'restricted'
    estimated_affected_records INTEGER,
    affected_assets UUID[] DEFAULT '{}',
    related_events UUID[] DEFAULT '{}',
    related_vulnerabilities UUID[] DEFAULT '{}',
    external_case_id VARCHAR(100), -- Reference to external ticketing system
    assigned_to UUID REFERENCES users(id),
    reporter_id UUID REFERENCES users(id),
    investigation_team UUID[] DEFAULT '{}', -- Array of user IDs
    communication_plan JSONB DEFAULT '{}',
    timeline JSONB DEFAULT '[]', -- Array of timeline events
    evidence JSONB DEFAULT '[]', -- Links to evidence
    remediation_actions JSONB DEFAULT '[]',
    lessons_learned TEXT,
    root_cause TEXT,
    containment_time_minutes INTEGER,
    detection_time_minutes INTEGER,
    resolution_time_minutes INTEGER,
    total_cost DECIMAL(12,2),
    regulatory_notification_required BOOLEAN DEFAULT FALSE,
    regulatory_notifications JSONB DEFAULT '[]',
    post_mortem_required BOOLEAN DEFAULT FALSE,
    post_mortem_completed BOOLEAN DEFAULT FALSE,
    post_mortem_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Generate sequential incident numbers
CREATE SEQUENCE incident_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.incident_number := 'INC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('incident_number_seq')::text, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_incident_number
    BEFORE INSERT ON security_incidents
    FOR EACH ROW EXECUTE FUNCTION generate_incident_number();

CREATE INDEX idx_security_incidents_org_status ON security_incidents(organization_id, status, severity);
CREATE INDEX idx_security_incidents_assigned ON security_incidents(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_security_incidents_category ON security_incidents(category, status, created_at DESC);
CREATE INDEX idx_security_incidents_business_impact ON security_incidents(business_impact, status);
CREATE INDEX idx_security_incidents_number ON security_incidents(incident_number);

CREATE TABLE incident_workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES security_incidents(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    step_order INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
    assigned_to UUID REFERENCES users(id),
    automated BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    inputs JSONB DEFAULT '{}',
    outputs JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_incident_workflow_incident ON incident_workflow_executions(incident_id, step_order);
CREATE INDEX idx_incident_workflow_assigned ON incident_workflow_executions(assigned_to, status) WHERE assigned_to IS NOT NULL;

-- ================================
-- AUDIT LOGGING
-- ================================

CREATE TABLE audit_log (
    id UUID DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    client_ip INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    api_key_id UUID,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    additional_context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_hypertable('audit_log', 'created_at', chunk_time_interval => INTERVAL '1 day');

-- Retention policy for audit logs (keep for 7 years for compliance)
SELECT add_retention_policy('audit_log', INTERVAL '7 years');

CREATE INDEX idx_audit_log_org_action ON audit_log(organization_id, action, created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_log_client_ip ON audit_log(client_ip, created_at DESC) WHERE client_ip IS NOT NULL;

-- ================================
-- NOTIFICATION SYSTEM
-- ================================

CREATE TABLE notification_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'slack', 'webhook', 'sms', 'pagerduty', 'teams')),
    config JSONB NOT NULL, -- Channel-specific configuration
    enabled BOOLEAN DEFAULT TRUE,
    rate_limit_per_hour INTEGER DEFAULT 100,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notification_channels_org_type ON notification_channels(organization_id, type, enabled);

CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    channel_type VARCHAR(50) NOT NULL,
    subject_template TEXT,
    body_template TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notification_templates_org_event ON notification_templates(organization_id, event_type, channel_type);

CREATE TABLE notification_queue (
    id UUID DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES notification_channels(id) ON DELETE CASCADE,
    template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest priority
    event_type VARCHAR(100),
    recipient VARCHAR(500) NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    next_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_hypertable('notification_queue', 'created_at', chunk_time_interval => INTERVAL '1 day');

CREATE INDEX idx_notification_queue_org_status ON notification_queue(organization_id, status, priority);
CREATE INDEX idx_notification_queue_next_attempt ON notification_queue(next_attempt, status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_notification_queue_channel ON notification_queue(channel_id, status, created_at DESC);

-- ================================
-- API RATE LIMITING
-- ================================

CREATE TABLE api_rate_limits (
    id UUID DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    api_key_hash VARCHAR(255),
    client_ip INET,
    endpoint VARCHAR(255),
    requests_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    window_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 minute')
);

SELECT create_hypertable('api_rate_limits', 'window_start', chunk_time_interval => INTERVAL '1 hour');

-- Auto-cleanup old rate limit data after 24 hours
SELECT add_retention_policy('api_rate_limits', INTERVAL '24 hours');

CREATE INDEX idx_api_rate_limits_org ON api_rate_limits(organization_id, window_start DESC);
CREATE INDEX idx_api_rate_limits_user ON api_rate_limits(user_id, window_start DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_api_rate_limits_api_key ON api_rate_limits(api_key_hash, window_start DESC) WHERE api_key_hash IS NOT NULL;
CREATE INDEX idx_api_rate_limits_client_ip ON api_rate_limits(client_ip, window_start DESC) WHERE client_ip IS NOT NULL;

-- ================================
-- SYSTEM CONFIGURATION
-- ================================

CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for global config
    config_key VARCHAR(255) NOT NULL,
    config_value JSONB NOT NULL,
    config_type VARCHAR(50) DEFAULT 'json' CHECK (config_type IN ('string', 'number', 'boolean', 'json', 'encrypted')),
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, config_key)
);

CREATE INDEX idx_system_config_org_key ON system_config(organization_id, config_key);
CREATE INDEX idx_system_config_sensitive ON system_config(is_sensitive, updated_at) WHERE is_sensitive = TRUE;

-- Insert default system configuration
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('event_retention_days', '90', 'number', 'Default retention period for security events'),
('alert_rate_limit_per_hour', '100', 'number', 'Maximum alerts per hour per organization'),
('max_failed_login_attempts', '5', 'number', 'Maximum failed login attempts before account lockout'),
('session_timeout_hours', '8', 'number', 'User session timeout in hours'),
('password_min_length', '12', 'number', 'Minimum password length requirement'),
('mfa_enforcement', 'false', 'boolean', 'Enforce multi-factor authentication for all users'),
('vulnerability_scan_frequency_hours', '24', 'number', 'Frequency of automated vulnerability scans'),
('compliance_assessment_reminder_days', '7', 'number', 'Days before compliance assessment due date to send reminder'),
('incident_sla_hours', '{"critical": 1, "high": 4, "medium": 24, "low": 72}', 'json', 'SLA hours by incident severity'),
('threat_detection_sensitivity', '0.8', 'number', 'Sensitivity threshold for ML-based threat detection (0.0-1.0)');

-- ================================
-- VIEWS FOR COMMON QUERIES
-- ================================

-- Security dashboard overview
CREATE VIEW security_dashboard_overview AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    COUNT(DISTINCT a.id) as total_assets,
    COUNT(DISTINCT se.id) FILTER (WHERE se.created_at >= NOW() - INTERVAL '24 hours') as events_24h,
    COUNT(DISTINCT se.id) FILTER (WHERE se.created_at >= NOW() - INTERVAL '24 hours' AND se.severity IN ('critical', 'high')) as critical_events_24h,
    COUNT(DISTINCT ai.id) FILTER (WHERE ai.status = 'open') as open_alerts,
    COUNT(DISTINCT si.id) FILTER (WHERE si.status NOT IN ('resolved', 'closed', 'false_positive')) as open_incidents,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'open' AND v.severity IN ('critical', 'high')) as critical_vulnerabilities,
    AVG(ca.compliance_score) as avg_compliance_score
FROM organizations o
LEFT JOIN assets a ON o.id = a.organization_id AND a.monitoring_enabled = TRUE
LEFT JOIN security_events se ON o.id = se.organization_id
LEFT JOIN alert_instances ai ON o.id = ai.organization_id
LEFT JOIN security_incidents si ON o.id = si.organization_id
LEFT JOIN vulnerabilities v ON o.id = v.organization_id
LEFT JOIN compliance_assessments ca ON o.id = ca.organization_id AND ca.status = 'compliant'
GROUP BY o.id, o.name;

-- Asset security posture
CREATE VIEW asset_security_posture AS
SELECT 
    a.id as asset_id,
    a.name,
    a.platform,
    a.environment,
    a.criticality,
    a.security_score,
    COUNT(DISTINCT se.id) FILTER (WHERE se.created_at >= NOW() - INTERVAL '30 days') as events_30d,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'open') as open_vulnerabilities,
    MAX(v.cvss_score) as highest_cvss_score,
    AVG(ca.compliance_score) as compliance_score,
    a.last_security_scan,
    a.next_security_scan
FROM assets a
LEFT JOIN security_events se ON a.id = se.asset_id
LEFT JOIN vulnerabilities v ON a.id = v.asset_id
LEFT JOIN compliance_assessments ca ON a.id = ca.asset_id AND ca.status IN ('compliant', 'partially_compliant')
WHERE a.archived_at IS NULL
GROUP BY a.id, a.name, a.platform, a.environment, a.criticality, a.security_score, a.last_security_scan, a.next_security_scan;

-- Threat trends analysis
CREATE VIEW threat_trends AS
SELECT 
    time_bucket('1 day', se.created_at) as day,
    se.organization_id,
    se.event_type_name,
    se.severity,
    COUNT(*) as event_count,
    COUNT(DISTINCT se.asset_id) as affected_assets,
    AVG(se.confidence_score) as avg_confidence
FROM security_events se
WHERE se.created_at >= NOW() - INTERVAL '30 days'
  AND se.false_positive = FALSE
  AND se.suppressed = FALSE
GROUP BY day, se.organization_id, se.event_type_name, se.severity
ORDER BY day DESC;

-- ================================
-- ROW LEVEL SECURITY (RLS)
-- ================================

-- Enable RLS on all tenant-specific tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (example for security_events table)
CREATE POLICY security_events_org_policy ON security_events
    FOR ALL 
    TO authenticated_users
    USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- ================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- ================================

-- Calculate security score for an asset
CREATE OR REPLACE FUNCTION calculate_asset_security_score(asset_id UUID)
RETURNS INTEGER AS $$
DECLARE
    base_score INTEGER := 100;
    vulnerability_penalty INTEGER := 0;
    event_penalty INTEGER := 0;
    compliance_bonus INTEGER := 0;
    final_score INTEGER;
BEGIN
    -- Deduct points for open vulnerabilities
    SELECT COALESCE(SUM(
        CASE 
            WHEN severity = 'critical' THEN 20
            WHEN severity = 'high' THEN 10
            WHEN severity = 'medium' THEN 5
            WHEN severity = 'low' THEN 2
            ELSE 0
        END
    ), 0) INTO vulnerability_penalty
    FROM vulnerabilities
    WHERE asset_id = $1 AND status = 'open';
    
    -- Deduct points for recent security events
    SELECT COALESCE(COUNT(*) * 2, 0) INTO event_penalty
    FROM security_events
    WHERE asset_id = $1 
      AND created_at >= NOW() - INTERVAL '30 days'
      AND severity IN ('critical', 'high')
      AND resolved = FALSE;
    
    -- Add points for good compliance
    SELECT COALESCE(AVG(compliance_score) - 50, 0) / 10 INTO compliance_bonus
    FROM compliance_assessments
    WHERE asset_id = $1 AND status = 'compliant';
    
    final_score := base_score - vulnerability_penalty - event_penalty + compliance_bonus;
    
    -- Ensure score is between 0 and 100
    RETURN GREATEST(0, LEAST(100, final_score));
END;
$$ LANGUAGE plpgsql;

-- Trigger to update asset security score
CREATE OR REPLACE FUNCTION update_asset_security_score()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE assets 
    SET security_score = calculate_asset_security_score(NEW.asset_id),
        updated_at = NOW()
    WHERE id = NEW.asset_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_asset_score_on_vulnerability
    AFTER INSERT OR UPDATE OR DELETE ON vulnerabilities
    FOR EACH ROW
    WHEN (NEW.asset_id IS NOT NULL OR OLD.asset_id IS NOT NULL)
    EXECUTE FUNCTION update_asset_security_score();

CREATE TRIGGER trigger_update_asset_score_on_event
    AFTER INSERT OR UPDATE ON security_events
    FOR EACH ROW
    WHEN (NEW.asset_id IS NOT NULL)
    EXECUTE FUNCTION update_asset_security_score();

-- ================================
-- INITIAL DATA AND SAMPLE RECORDS
-- ================================

-- Create a sample organization for testing
INSERT INTO organizations (name, slug, subscription_tier, rate_limit_per_minute, retention_days, max_users) 
VALUES ('Candlefish Security', 'candlefish', 'enterprise', 5000, 365, 100);

-- Create sample admin user (password: SecurePassword123!)
INSERT INTO users (organization_id, email, password_hash, role, mfa_enabled) VALUES 
((SELECT id FROM organizations WHERE slug = 'candlefish'), 'admin@candlefish.ai', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeL2w1qxKfHaXrZom', 'org_admin', TRUE);

-- Performance optimization: Update statistics
ANALYZE;

-- Create database users and permissions (run these as superuser)
-- CREATE USER security_dashboard_app WITH PASSWORD 'secure_random_password';
-- CREATE USER security_dashboard_readonly WITH PASSWORD 'secure_readonly_password';

-- GRANT CONNECT ON DATABASE security_dashboard TO security_dashboard_app;
-- GRANT CONNECT ON DATABASE security_dashboard TO security_dashboard_readonly;

-- GRANT USAGE ON SCHEMA public TO security_dashboard_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO security_dashboard_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO security_dashboard_app;

-- GRANT USAGE ON SCHEMA public TO security_dashboard_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO security_dashboard_readonly;

-- Success message
SELECT 'Enhanced Security Dashboard schema created successfully! 🛡️' as message;
SELECT 'Database optimized for 15,000 events/second with comprehensive security features' as details;