-- Candlefish AI Deployment Management Database Schema
-- Supports blue-green deployments, rollbacks, and environment management

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE DEPLOYMENT ENTITIES
-- ============================================================================

-- Sites table - tracks the three Next.js sites
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL, -- docs, partners, api
    domain VARCHAR(255) UNIQUE NOT NULL,
    repository_url VARCHAR(500) NOT NULL,
    build_command TEXT NOT NULL,
    build_directory VARCHAR(255) DEFAULT 'out',
    node_version VARCHAR(20) DEFAULT '18.17.0',
    env_vars JSONB DEFAULT '{}',
    netlify_site_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Environments table - production, staging, preview
CREATE TABLE IF NOT EXISTS environments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL, -- production, staging, preview
    description TEXT,
    priority INTEGER DEFAULT 100, -- lower = higher priority
    auto_deploy BOOLEAN DEFAULT false,
    require_approval BOOLEAN DEFAULT true,
    max_concurrent_deployments INTEGER DEFAULT 3,
    retention_days INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deployments table - tracks all deployment attempts
CREATE TABLE IF NOT EXISTS deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id),
    environment_id UUID NOT NULL REFERENCES environments(id),

    -- Version information
    commit_sha VARCHAR(40) NOT NULL,
    branch VARCHAR(255) NOT NULL,
    tag VARCHAR(255),
    version VARCHAR(100),

    -- Build information
    build_id VARCHAR(100), -- external build system ID
    build_url VARCHAR(500),
    build_logs_url VARCHAR(500),

    -- Deployment metadata
    deployment_type VARCHAR(50) DEFAULT 'standard', -- standard, hotfix, rollback
    deployment_strategy VARCHAR(50) DEFAULT 'blue-green', -- blue-green, rolling, recreate
    triggered_by VARCHAR(100), -- user_id or 'github_webhook'
    trigger_source VARCHAR(100), -- manual, webhook, scheduled, rollback

    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending', -- pending, building, deploying, success, failed, cancelled
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,

    -- URLs and access
    preview_url VARCHAR(500),
    live_url VARCHAR(500),

    -- Metadata
    changelog TEXT,
    release_notes TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deployment steps table - tracks individual deployment phases
CREATE TABLE IF NOT EXISTS deployment_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    step_name VARCHAR(100) NOT NULL, -- build, test, deploy, verify, promote
    step_order INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, success, failed, skipped
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    logs_url VARCHAR(500),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- HEALTH MONITORING
-- ============================================================================

-- Health checks table - stores health check configurations and results
CREATE TABLE IF NOT EXISTS health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id),
    environment_id UUID NOT NULL REFERENCES environments(id),

    -- Check configuration
    check_type VARCHAR(50) NOT NULL, -- http, tcp, graphql, custom
    endpoint_url VARCHAR(500) NOT NULL,
    method VARCHAR(10) DEFAULT 'GET',
    headers JSONB DEFAULT '{}',
    expected_status INTEGER DEFAULT 200,
    expected_response TEXT,
    timeout_seconds INTEGER DEFAULT 30,

    -- Scheduling
    interval_seconds INTEGER DEFAULT 300, -- 5 minutes
    retry_count INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 30,

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_check_at TIMESTAMP,
    last_success_at TIMESTAMP,
    consecutive_failures INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Health check results table - stores individual check results
CREATE TABLE IF NOT EXISTS health_check_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    health_check_id UUID NOT NULL REFERENCES health_checks(id) ON DELETE CASCADE,

    -- Check execution
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL, -- success, failure, timeout, error
    response_time_ms INTEGER,
    status_code INTEGER,
    response_body TEXT,
    error_message TEXT,

    -- Deployment context (optional)
    deployment_id UUID REFERENCES deployments(id),

    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- ENVIRONMENT & SECRET MANAGEMENT
-- ============================================================================

-- Environment variables table - manages env vars per site/environment
CREATE TABLE IF NOT EXISTS environment_variables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id),
    environment_id UUID NOT NULL REFERENCES environments(id),

    -- Variable details
    key VARCHAR(255) NOT NULL,
    value_encrypted BYTEA, -- encrypted using application-level encryption
    is_secret BOOLEAN DEFAULT false,
    description TEXT,

    -- Lifecycle
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),

    UNIQUE(site_id, environment_id, key)
);

-- Secret rotation logs table - tracks secret rotation events
CREATE TABLE IF NOT EXISTS secret_rotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    secret_name VARCHAR(255) NOT NULL,
    rotation_type VARCHAR(50) NOT NULL, -- manual, scheduled, emergency
    old_version VARCHAR(100),
    new_version VARCHAR(100),
    rotated_by VARCHAR(100),
    rotation_status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed
    rollback_plan TEXT,
    affected_services JSONB DEFAULT '[]',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- ROLLBACK & DISASTER RECOVERY
-- ============================================================================

-- Deployment snapshots table - captures deployment state for rollbacks
CREATE TABLE IF NOT EXISTS deployment_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID NOT NULL REFERENCES deployments(id),
    site_id UUID NOT NULL REFERENCES sites(id),
    environment_id UUID NOT NULL REFERENCES environments(id),

    -- Snapshot data
    snapshot_type VARCHAR(50) NOT NULL, -- pre_deploy, post_deploy, rollback_point
    config_snapshot JSONB NOT NULL,
    env_vars_snapshot JSONB NOT NULL,
    build_artifacts_url VARCHAR(500),
    database_backup_url VARCHAR(500),

    -- Verification
    verified_at TIMESTAMP,
    verification_status VARCHAR(50), -- pending, verified, failed

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Rollback plans table - defines rollback procedures
CREATE TABLE IF NOT EXISTS rollback_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id),
    environment_id UUID NOT NULL REFERENCES environments(id),

    -- Plan details
    plan_name VARCHAR(255) NOT NULL,
    description TEXT,
    rollback_strategy VARCHAR(50) DEFAULT 'previous_deployment', -- previous_deployment, specific_version, snapshot

    -- Execution steps
    pre_rollback_steps JSONB DEFAULT '[]',
    rollback_steps JSONB NOT NULL,
    post_rollback_steps JSONB DEFAULT '[]',
    verification_steps JSONB DEFAULT '[]',

    -- Conditions
    max_rollback_window_hours INTEGER DEFAULT 72,
    requires_approval BOOLEAN DEFAULT true,
    auto_rollback_triggers JSONB DEFAULT '[]',

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MONITORING & ALERTING
-- ============================================================================

-- Monitoring metrics table - stores deployment and system metrics
CREATE TABLE IF NOT EXISTS monitoring_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- counter, gauge, histogram, summary

    -- Context
    site_id UUID REFERENCES sites(id),
    environment_id UUID REFERENCES environments(id),
    deployment_id UUID REFERENCES deployments(id),

    -- Metric data
    value DECIMAL(20,8) NOT NULL,
    unit VARCHAR(50),
    labels JSONB DEFAULT '{}',

    -- Timestamp
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Partitioning helper
    date_partition DATE DEFAULT CURRENT_DATE
);

-- Alert rules table - defines monitoring alert conditions
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Rule conditions
    metric_name VARCHAR(100) NOT NULL,
    condition_operator VARCHAR(20) NOT NULL, -- >, <, >=, <=, ==, !=
    threshold_value DECIMAL(20,8) NOT NULL,
    evaluation_window_minutes INTEGER DEFAULT 5,

    -- Filters
    site_filters JSONB DEFAULT '{}',
    environment_filters JSONB DEFAULT '{}',
    label_filters JSONB DEFAULT '{}',

    -- Actions
    severity VARCHAR(20) DEFAULT 'warning', -- info, warning, error, critical
    notification_channels JSONB DEFAULT '[]', -- slack, email, pagerduty
    auto_rollback BOOLEAN DEFAULT false,

    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alert instances table - tracks fired alerts
CREATE TABLE IF NOT EXISTS alert_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_rule_id UUID NOT NULL REFERENCES alert_rules(id),

    -- Alert details
    status VARCHAR(50) DEFAULT 'firing', -- firing, resolved, suppressed
    fired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,

    -- Context
    metric_value DECIMAL(20,8),
    threshold_value DECIMAL(20,8),
    site_id UUID REFERENCES sites(id),
    environment_id UUID REFERENCES environments(id),
    deployment_id UUID REFERENCES deployments(id),

    -- Notifications
    notifications_sent JSONB DEFAULT '[]',
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP,

    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- AUDIT & COMPLIANCE
-- ============================================================================

-- Deployment audit logs table - comprehensive audit trail
CREATE TABLE IF NOT EXISTS deployment_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Event details
    event_type VARCHAR(100) NOT NULL, -- deployment_started, deployment_failed, rollback_initiated, etc.
    event_category VARCHAR(50) NOT NULL, -- deployment, rollback, config, access

    -- Context
    deployment_id UUID REFERENCES deployments(id),
    site_id UUID REFERENCES sites(id),
    environment_id UUID REFERENCES environments(id),

    -- Actor information
    actor_type VARCHAR(50) NOT NULL, -- user, system, webhook
    actor_id VARCHAR(255),
    actor_ip INET,
    user_agent TEXT,

    -- Event data
    description TEXT NOT NULL,
    before_state JSONB,
    after_state JSONB,
    metadata JSONB DEFAULT '{}',

    -- Compliance
    compliance_tags JSONB DEFAULT '[]',
    risk_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical

    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API access logs table - tracks API usage for rate limiting and monitoring
CREATE TABLE IF NOT EXISTS api_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Request details
    request_id UUID DEFAULT uuid_generate_v4(),
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,

    -- Authentication
    api_key_id VARCHAR(255),
    user_id VARCHAR(255),

    -- Client information
    client_ip INET NOT NULL,
    user_agent TEXT,

    -- Rate limiting
    rate_limit_key VARCHAR(255),
    rate_limit_remaining INTEGER,

    -- Error tracking
    error_type VARCHAR(100),
    error_message TEXT,

    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_partition DATE DEFAULT CURRENT_DATE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Core entity indexes
CREATE INDEX idx_sites_name ON sites(name);
CREATE INDEX idx_sites_domain ON sites(domain);
CREATE INDEX idx_environments_name ON environments(name);

-- Deployment indexes
CREATE INDEX idx_deployments_site_env ON deployments(site_id, environment_id);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_created_at ON deployments(created_at DESC);
CREATE INDEX idx_deployments_commit ON deployments(commit_sha);
CREATE INDEX idx_deployments_branch ON deployments(branch);

-- Deployment steps indexes
CREATE INDEX idx_deployment_steps_deployment ON deployment_steps(deployment_id);
CREATE INDEX idx_deployment_steps_status ON deployment_steps(status);

-- Health check indexes
CREATE INDEX idx_health_checks_site_env ON health_checks(site_id, environment_id);
CREATE INDEX idx_health_checks_active ON health_checks(is_active);
CREATE INDEX idx_health_check_results_check_id ON health_check_results(health_check_id);
CREATE INDEX idx_health_check_results_checked_at ON health_check_results(checked_at DESC);

-- Environment variables indexes
CREATE INDEX idx_env_vars_site_env ON environment_variables(site_id, environment_id);
CREATE INDEX idx_env_vars_key ON environment_variables(key);
CREATE INDEX idx_env_vars_active ON environment_variables(is_active);

-- Monitoring indexes
CREATE INDEX idx_monitoring_metrics_name ON monitoring_metrics(metric_name);
CREATE INDEX idx_monitoring_metrics_timestamp ON monitoring_metrics(timestamp DESC);
CREATE INDEX idx_monitoring_metrics_site ON monitoring_metrics(site_id);
CREATE INDEX idx_monitoring_metrics_deployment ON monitoring_metrics(deployment_id);

-- Partitioning index for metrics (by date)
CREATE INDEX idx_monitoring_metrics_partition ON monitoring_metrics(date_partition, timestamp DESC);

-- Alert indexes
CREATE INDEX idx_alert_rules_active ON alert_rules(is_active);
CREATE INDEX idx_alert_instances_status ON alert_instances(status);
CREATE INDEX idx_alert_instances_fired_at ON alert_instances(fired_at DESC);

-- Audit indexes
CREATE INDEX idx_deployment_audit_timestamp ON deployment_audit_logs(timestamp DESC);
CREATE INDEX idx_deployment_audit_deployment ON deployment_audit_logs(deployment_id);
CREATE INDEX idx_deployment_audit_event_type ON deployment_audit_logs(event_type);
CREATE INDEX idx_api_access_timestamp ON api_access_logs(timestamp DESC);
CREATE INDEX idx_api_access_endpoint ON api_access_logs(endpoint);
CREATE INDEX idx_api_access_partition ON api_access_logs(date_partition, timestamp DESC);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_environments_updated_at BEFORE UPDATE ON environments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deployments_updated_at BEFORE UPDATE ON deployments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_checks_updated_at BEFORE UPDATE ON health_checks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_environment_variables_updated_at BEFORE UPDATE ON environment_variables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rollback_plans_updated_at BEFORE UPDATE ON rollback_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create deployment snapshots
CREATE OR REPLACE FUNCTION create_deployment_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    -- Create pre-deployment snapshot when deployment starts
    IF NEW.status = 'building' AND OLD.status = 'pending' THEN
        INSERT INTO deployment_snapshots (
            deployment_id, site_id, environment_id,
            snapshot_type, config_snapshot, env_vars_snapshot
        ) VALUES (
            NEW.id, NEW.site_id, NEW.environment_id,
            'pre_deploy',
            jsonb_build_object('commit_sha', NEW.commit_sha, 'branch', NEW.branch),
            '{}'::jsonb
        );
    END IF;

    -- Create post-deployment snapshot when deployment succeeds
    IF NEW.status = 'success' AND OLD.status = 'deploying' THEN
        INSERT INTO deployment_snapshots (
            deployment_id, site_id, environment_id,
            snapshot_type, config_snapshot, env_vars_snapshot
        ) VALUES (
            NEW.id, NEW.site_id, NEW.environment_id,
            'post_deploy',
            jsonb_build_object('commit_sha', NEW.commit_sha, 'branch', NEW.branch, 'live_url', NEW.live_url),
            '{}'::jsonb
        );
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_deployment_snapshot_trigger
    AFTER UPDATE ON deployments
    FOR EACH ROW EXECUTE FUNCTION create_deployment_snapshot();

-- Function to create audit logs for deployments
CREATE OR REPLACE FUNCTION log_deployment_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
        INSERT INTO deployment_audit_logs (
            event_type, event_category, deployment_id, site_id, environment_id,
            actor_type, actor_id, description, before_state, after_state
        ) VALUES (
            'deployment_status_changed', 'deployment', NEW.id, NEW.site_id, NEW.environment_id,
            'system', 'deployment_trigger',
            format('Deployment status changed from %s to %s', OLD.status, NEW.status),
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status)
        );
    END IF;

    -- Log new deployments
    IF TG_OP = 'INSERT' THEN
        INSERT INTO deployment_audit_logs (
            event_type, event_category, deployment_id, site_id, environment_id,
            actor_type, actor_id, description, after_state
        ) VALUES (
            'deployment_created', 'deployment', NEW.id, NEW.site_id, NEW.environment_id,
            COALESCE(NEW.triggered_by, 'system'), NEW.triggered_by,
            format('New deployment created for %s branch %s',
                   (SELECT name FROM sites WHERE id = NEW.site_id), NEW.branch),
            jsonb_build_object('commit_sha', NEW.commit_sha, 'branch', NEW.branch, 'status', NEW.status)
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER log_deployment_events_trigger
    AFTER INSERT OR UPDATE ON deployments
    FOR EACH ROW EXECUTE FUNCTION log_deployment_events();

-- ============================================================================
-- PARTITIONING SETUP (for high-volume tables)
-- ============================================================================

-- Partition monitoring_metrics by date (monthly partitions)
-- This would typically be set up with pg_partman or similar tool in production

-- Example partition creation (would be automated)
-- CREATE TABLE monitoring_metrics_y2025m01 PARTITION OF monitoring_metrics
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default environments
INSERT INTO environments (name, description, priority, auto_deploy, require_approval) VALUES
('production', 'Production environment', 1, false, true),
('staging', 'Staging environment', 2, true, false),
('preview', 'Preview environment for PRs', 3, true, false)
ON CONFLICT (name) DO NOTHING;

-- Insert the three main sites
INSERT INTO sites (name, domain, repository_url, build_command, netlify_site_id) VALUES
('docs', 'docs.candlefish.ai', 'https://github.com/candlefish-ai/candlefish-ai', 'pnpm turbo build --filter=apps/docs-site', 'docs-candlefish'),
('partners', 'partners.candlefish.ai', 'https://github.com/candlefish-ai/candlefish-ai', 'pnpm turbo build --filter=apps/partners-site', 'partners-candlefish'),
('api', 'api.candlefish.ai', 'https://github.com/candlefish-ai/candlefish-ai', 'pnpm turbo build --filter=apps/api-site', 'api-candlefish')
ON CONFLICT (name) DO NOTHING;

-- Insert default health checks for each site
INSERT INTO health_checks (site_id, environment_id, check_type, endpoint_url, interval_seconds)
SELECT s.id, e.id, 'http', format('https://%s', s.domain), 300
FROM sites s
CROSS JOIN environments e
WHERE e.name = 'production'
ON CONFLICT DO NOTHING;

-- Insert default alert rules
INSERT INTO alert_rules (name, description, metric_name, condition_operator, threshold_value, severity) VALUES
('High Response Time', 'Alert when response time exceeds 2 seconds', 'response_time_ms', '>', 2000, 'warning'),
('Deployment Failure Rate', 'Alert when deployment failure rate exceeds 10%', 'deployment_failure_rate', '>', 0.1, 'error'),
('Site Downtime', 'Alert when site is down', 'uptime_percentage', '<', 0.99, 'critical')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE sites IS 'Stores configuration for the three Next.js sites: docs, partners, and api';
COMMENT ON TABLE deployments IS 'Tracks all deployment attempts with comprehensive metadata';
COMMENT ON TABLE health_checks IS 'Defines and tracks health check configurations for monitoring';
COMMENT ON TABLE deployment_snapshots IS 'Stores deployment state snapshots for rollback capabilities';
COMMENT ON TABLE monitoring_metrics IS 'Stores time-series metrics data, partitioned by date for performance';
COMMENT ON TABLE deployment_audit_logs IS 'Comprehensive audit trail for all deployment-related events';
