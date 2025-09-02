-- Claude Configuration Dashboard Database Schema
-- PostgreSQL + TimescaleDB for time-series metrics
-- Production-ready schema with proper indexing, constraints, and partitioning

-- Enable TimescaleDB extension for time-series data
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create schemas for logical separation
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS projects;
CREATE SCHEMA IF NOT EXISTS metrics;
CREATE SCHEMA IF NOT EXISTS costs;
CREATE SCHEMA IF NOT EXISTS monitoring;

-- =============================================================================
-- AUTH SCHEMA - User management and authentication
-- =============================================================================

-- Users table
CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- JWT tokens for session management
CREATE TABLE auth.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    device_info JSONB,
    ip_address INET
);

-- API keys for service-to-service communication
CREATE TABLE auth.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '[]',
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Permission system
CREATE TABLE auth.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    actions TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User permissions mapping
CREATE TABLE auth.user_permissions (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES auth.permissions(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, permission_id)
);

-- =============================================================================
-- PROJECTS SCHEMA - Project and configuration management
-- =============================================================================

-- Teams
CREATE TABLE projects.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Team members
CREATE TABLE projects.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES projects.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permissions JSONB NOT NULL DEFAULT '[]',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(team_id, user_id)
);

-- Projects
CREATE TABLE projects.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    path TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    team_id UUID REFERENCES projects.teams(id),
    repository_url TEXT,
    deployment_url TEXT,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Project collaborators
CREATE TABLE projects.project_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permissions JSONB NOT NULL DEFAULT '[]',
    added_by UUID REFERENCES auth.users(id),
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(project_id, user_id)
);

-- AI Models
CREATE TABLE projects.models (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('anthropic', 'openai', 'google', 'ollama')),
    version VARCHAR(50) NOT NULL,
    max_tokens INTEGER NOT NULL,
    cost_per_input_token DECIMAL(10, 8) NOT NULL,
    cost_per_output_token DECIMAL(10, 8) NOT NULL,
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    rate_limit_tokens_per_minute INTEGER,
    rate_limit_requests_per_minute INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Claude Configurations
CREATE TABLE projects.claude_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Default Configuration',
    model_id VARCHAR(100) NOT NULL REFERENCES projects.models(id),
    settings JSONB NOT NULL DEFAULT '{}',
    secrets JSONB NOT NULL DEFAULT '[]',
    mcp_servers JSONB NOT NULL DEFAULT '[]',
    workflows JSONB NOT NULL DEFAULT '[]',
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    is_active BOOLEAN NOT NULL DEFAULT true,
    deployment_status VARCHAR(20) DEFAULT 'draft' CHECK (deployment_status IN ('draft', 'deployed', 'failed')),
    deployed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Deployments
CREATE TABLE projects.deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    configuration_id UUID NOT NULL REFERENCES projects.claude_configurations(id),
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
    started_by UUID NOT NULL REFERENCES auth.users(id),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    logs JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- =============================================================================
-- METRICS SCHEMA - Usage analytics and time-series data
-- =============================================================================

-- Usage events (hypertable for time-series data)
CREATE TABLE metrics.usage_events (
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    id UUID DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL,
    user_id UUID,
    model_id VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    response_time_ms INTEGER,
    success BOOLEAN NOT NULL DEFAULT true,
    error_type VARCHAR(100),
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Add constraints
    CONSTRAINT usage_events_tokens_check CHECK (total_tokens = input_tokens + output_tokens),
    CONSTRAINT usage_events_cost_check CHECK (cost >= 0)
);

-- Convert to hypertable (TimescaleDB)
SELECT create_hypertable('metrics.usage_events', 'timestamp', 
    chunk_time_interval => INTERVAL '1 day',
    create_default_indexes => false
);

-- Model routing events
CREATE TABLE metrics.model_routing_events (
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    id UUID DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL,
    user_id UUID,
    original_model VARCHAR(100) NOT NULL,
    routed_model VARCHAR(100) NOT NULL,
    routing_reason VARCHAR(100),
    latency_improvement_ms INTEGER,
    cost_savings DECIMAL(8, 4),
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Convert to hypertable
SELECT create_hypertable('metrics.model_routing_events', 'timestamp',
    chunk_time_interval => INTERVAL '1 day'
);

-- Aggregated metrics (materialized views for faster queries)
CREATE TABLE metrics.hourly_aggregates (
    time_bucket TIMESTAMP WITH TIME ZONE NOT NULL,
    project_id UUID,
    model_id VARCHAR(100),
    user_id UUID,
    total_requests INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10, 4) NOT NULL DEFAULT 0,
    avg_response_time_ms REAL,
    error_count INTEGER NOT NULL DEFAULT 0,
    success_rate REAL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (time_bucket, project_id, model_id, user_id)
);

-- Convert to hypertable
SELECT create_hypertable('metrics.hourly_aggregates', 'time_bucket',
    chunk_time_interval => INTERVAL '1 week'
);

-- Real-time metrics (current activity)
CREATE TABLE metrics.realtime_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    value REAL NOT NULL,
    dimensions JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

-- =============================================================================
-- COSTS SCHEMA - Cost management and budgets
-- =============================================================================

-- Cost budgets
CREATE TABLE costs.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('global', 'team', 'project', 'user')),
    scope_id UUID, -- References team, project, or user ID based on scope
    alert_thresholds JSONB NOT NULL DEFAULT '[0.8, 0.9, 1.0]', -- 80%, 90%, 100%
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Budget alerts
CREATE TABLE costs.budget_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID NOT NULL REFERENCES costs.budgets(id) ON DELETE CASCADE,
    threshold_percentage DECIMAL(5, 2) NOT NULL,
    current_spent DECIMAL(10, 2) NOT NULL,
    current_percentage DECIMAL(5, 2) NOT NULL,
    alert_sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    recipients JSONB NOT NULL DEFAULT '[]'
);

-- Cost predictions (ML-generated forecasts)
CREATE TABLE costs.cost_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('global', 'team', 'project', 'user')),
    scope_id UUID,
    prediction_date DATE NOT NULL,
    predicted_cost DECIMAL(10, 2) NOT NULL,
    confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    model_version VARCHAR(20) NOT NULL,
    features JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- MONITORING SCHEMA - System health and error tracking
-- =============================================================================

-- Error logs
CREATE TABLE monitoring.error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    level VARCHAR(20) NOT NULL CHECK (level IN ('error', 'warning', 'info', 'debug')),
    message TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    service VARCHAR(100),
    project_id UUID,
    user_id UUID,
    error_code VARCHAR(50),
    stack_trace TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
);

-- Convert to hypertable
SELECT create_hypertable('monitoring.error_logs', 'timestamp',
    chunk_time_interval => INTERVAL '1 week'
);

-- System health checks
CREATE TABLE monitoring.health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
    response_time_ms INTEGER,
    details JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('monitoring.health_checks', 'timestamp',
    chunk_time_interval => INTERVAL '1 day'
);

-- Audit trail
CREATE TABLE monitoring.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255)
);

-- Convert to hypertable
SELECT create_hypertable('monitoring.audit_logs', 'timestamp',
    chunk_time_interval => INTERVAL '1 month'
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Auth indexes
CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_users_role ON auth.users(role);
CREATE INDEX idx_users_active ON auth.users(is_active);
CREATE INDEX idx_refresh_tokens_user ON auth.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON auth.refresh_tokens(expires_at);
CREATE INDEX idx_api_keys_user ON auth.api_keys(user_id);
CREATE INDEX idx_api_keys_active ON auth.api_keys(is_active);

-- Projects indexes
CREATE INDEX idx_projects_owner ON projects.projects(owner_id);
CREATE INDEX idx_projects_team ON projects.projects(team_id);
CREATE INDEX idx_projects_status ON projects.projects(status);
CREATE INDEX idx_team_members_team ON projects.team_members(team_id);
CREATE INDEX idx_team_members_user ON projects.team_members(user_id);
CREATE INDEX idx_project_collaborators_project ON projects.project_collaborators(project_id);
CREATE INDEX idx_project_collaborators_user ON projects.project_collaborators(user_id);
CREATE INDEX idx_claude_configurations_project ON projects.claude_configurations(project_id);
CREATE INDEX idx_claude_configurations_active ON projects.claude_configurations(is_active);
CREATE INDEX idx_deployments_project ON projects.deployments(project_id);
CREATE INDEX idx_deployments_status ON projects.deployments(status);

-- Metrics indexes (TimescaleDB handles time indexes automatically)
CREATE INDEX idx_usage_events_project ON metrics.usage_events(project_id, timestamp DESC);
CREATE INDEX idx_usage_events_user ON metrics.usage_events(user_id, timestamp DESC);
CREATE INDEX idx_usage_events_model ON metrics.usage_events(model_id, timestamp DESC);
CREATE INDEX idx_usage_events_success ON metrics.usage_events(success, timestamp DESC);

CREATE INDEX idx_model_routing_project ON metrics.model_routing_events(project_id, timestamp DESC);
CREATE INDEX idx_model_routing_user ON metrics.model_routing_events(user_id, timestamp DESC);

CREATE INDEX idx_hourly_aggregates_project ON metrics.hourly_aggregates(project_id, time_bucket DESC);
CREATE INDEX idx_hourly_aggregates_model ON metrics.hourly_aggregates(model_id, time_bucket DESC);

CREATE INDEX idx_realtime_metrics_type ON metrics.realtime_metrics(metric_type, timestamp DESC);
CREATE INDEX idx_realtime_metrics_expires ON metrics.realtime_metrics(expires_at);

-- Costs indexes
CREATE INDEX idx_budgets_scope ON costs.budgets(scope, scope_id);
CREATE INDEX idx_budgets_active ON costs.budgets(is_active);
CREATE INDEX idx_budget_alerts_budget ON costs.budget_alerts(budget_id);
CREATE INDEX idx_cost_predictions_scope ON costs.cost_predictions(scope, scope_id, prediction_date);

-- Monitoring indexes
CREATE INDEX idx_error_logs_timestamp ON monitoring.error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_level ON monitoring.error_logs(level, timestamp DESC);
CREATE INDEX idx_error_logs_project ON monitoring.error_logs(project_id, timestamp DESC);
CREATE INDEX idx_error_logs_resolved ON monitoring.error_logs(resolved);

CREATE INDEX idx_health_checks_service ON monitoring.health_checks(service_name, timestamp DESC);
CREATE INDEX idx_health_checks_status ON monitoring.health_checks(status, timestamp DESC);

CREATE INDEX idx_audit_logs_user ON monitoring.audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_resource ON monitoring.audit_logs(resource_type, resource_id, timestamp DESC);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON projects.teams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects.projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON projects.models 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_configurations_updated_at BEFORE UPDATE ON projects.claude_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON costs.budgets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate total tokens
CREATE OR REPLACE FUNCTION calculate_total_tokens()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_tokens = NEW.input_tokens + NEW.output_tokens;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply token calculation trigger
CREATE TRIGGER calculate_usage_tokens BEFORE INSERT OR UPDATE ON metrics.usage_events 
    FOR EACH ROW EXECUTE FUNCTION calculate_total_tokens();

-- Function to clean expired realtime metrics
CREATE OR REPLACE FUNCTION clean_expired_realtime_metrics()
RETURNS void AS $$
BEGIN
    DELETE FROM metrics.realtime_metrics WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- =============================================================================
-- RETENTION POLICIES (TimescaleDB)
-- =============================================================================

-- Retain usage events for 2 years
SELECT add_retention_policy('metrics.usage_events', INTERVAL '2 years');

-- Retain model routing events for 1 year
SELECT add_retention_policy('metrics.model_routing_events', INTERVAL '1 year');

-- Retain hourly aggregates for 5 years
SELECT add_retention_policy('metrics.hourly_aggregates', INTERVAL '5 years');

-- Retain error logs for 6 months
SELECT add_retention_policy('monitoring.error_logs', INTERVAL '6 months');

-- Retain health checks for 3 months
SELECT add_retention_policy('monitoring.health_checks', INTERVAL '3 months');

-- Retain audit logs for 7 years (compliance)
SELECT add_retention_policy('monitoring.audit_logs', INTERVAL '7 years');

-- =============================================================================
-- CONTINUOUS AGGREGATES (TimescaleDB) - Pre-computed materialized views
-- =============================================================================

-- Daily usage aggregates
CREATE MATERIALIZED VIEW metrics.daily_usage_summary
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', timestamp) AS day,
    project_id,
    model_id,
    COUNT(*) as request_count,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    SUM(total_tokens) as total_tokens,
    SUM(cost) as total_cost,
    AVG(response_time_ms) as avg_response_time,
    COUNT(*) FILTER (WHERE success = false) as error_count,
    (COUNT(*) FILTER (WHERE success = true)::float / COUNT(*)::float) as success_rate
FROM metrics.usage_events
GROUP BY day, project_id, model_id;

-- Refresh policy for continuous aggregates
SELECT add_continuous_aggregate_policy('metrics.daily_usage_summary',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- Weekly cost summary
CREATE MATERIALIZED VIEW costs.weekly_cost_summary
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 week', timestamp) AS week,
    project_id,
    SUM(cost) as total_cost,
    COUNT(*) as total_requests,
    SUM(total_tokens) as total_tokens
FROM metrics.usage_events
GROUP BY week, project_id;

SELECT add_continuous_aggregate_policy('costs.weekly_cost_summary',
    start_offset => INTERVAL '2 weeks',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day');

-- =============================================================================
-- INITIAL DATA SEEDING
-- =============================================================================

-- Insert default permissions
INSERT INTO auth.permissions (name, description, resource, actions) VALUES
    ('admin.full', 'Full administrative access', '*', ARRAY['*']),
    ('projects.read', 'Read project information', 'projects', ARRAY['read']),
    ('projects.write', 'Create and update projects', 'projects', ARRAY['read', 'create', 'update']),
    ('projects.delete', 'Delete projects', 'projects', ARRAY['read', 'create', 'update', 'delete']),
    ('configs.read', 'Read configurations', 'configurations', ARRAY['read']),
    ('configs.write', 'Create and update configurations', 'configurations', ARRAY['read', 'create', 'update']),
    ('configs.deploy', 'Deploy configurations', 'configurations', ARRAY['read', 'deploy']),
    ('metrics.read', 'Read usage metrics', 'metrics', ARRAY['read']),
    ('costs.read', 'Read cost information', 'costs', ARRAY['read']),
    ('costs.manage', 'Manage budgets and costs', 'costs', ARRAY['read', 'create', 'update', 'delete']),
    ('team.read', 'Read team information', 'teams', ARRAY['read']),
    ('team.manage', 'Manage team members', 'teams', ARRAY['read', 'create', 'update', 'delete']);

-- Insert default AI models
INSERT INTO projects.models (id, name, provider, version, max_tokens, cost_per_input_token, cost_per_output_token, capabilities) VALUES
    ('claude-3-opus', 'Claude 3 Opus', 'anthropic', '3.0', 200000, 0.000015, 0.000075, ARRAY['text', 'analysis', 'code', 'multimodal']),
    ('claude-3-sonnet', 'Claude 3 Sonnet', 'anthropic', '3.0', 200000, 0.000003, 0.000015, ARRAY['text', 'analysis', 'code', 'multimodal']),
    ('claude-3-haiku', 'Claude 3 Haiku', 'anthropic', '3.0', 200000, 0.00000025, 0.00000125, ARRAY['text', 'analysis', 'fast']),
    ('gpt-4-turbo', 'GPT-4 Turbo', 'openai', '4.0', 128000, 0.00001, 0.00003, ARRAY['text', 'analysis', 'code']),
    ('gpt-3.5-turbo', 'GPT-3.5 Turbo', 'openai', '3.5', 16384, 0.0000005, 0.0000015, ARRAY['text', 'fast']),
    ('gemini-pro', 'Gemini Pro', 'google', '1.0', 32768, 0.000001, 0.000002, ARRAY['text', 'multimodal']),
    ('llama2-70b', 'Llama 2 70B', 'ollama', '2.0', 4096, 0, 0, ARRAY['text', 'local', 'private']);

-- Create a cron job to clean expired realtime metrics (if pg_cron is available)
-- SELECT cron.schedule('clean-realtime-metrics', '*/5 * * * *', 'SELECT clean_expired_realtime_metrics();');

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- Current active projects with latest configurations
CREATE VIEW projects.active_projects_with_config AS
SELECT 
    p.*,
    cc.id as config_id,
    cc.model_id,
    cc.version as config_version,
    cc.is_active as config_active,
    cc.deployed_at,
    m.name as model_name,
    m.provider as model_provider,
    u.name as owner_name,
    u.email as owner_email
FROM projects.projects p
LEFT JOIN projects.claude_configurations cc ON p.id = cc.project_id AND cc.is_active = true
LEFT JOIN projects.models m ON cc.model_id = m.id
LEFT JOIN auth.users u ON p.owner_id = u.id
WHERE p.status = 'active';

-- User dashboard summary
CREATE VIEW auth.user_dashboard_summary AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    COUNT(DISTINCT p.id) as owned_projects,
    COUNT(DISTINCT pc.project_id) as collaborated_projects,
    COUNT(DISTINCT tm.team_id) as team_memberships,
    u.last_login,
    u.created_at
FROM auth.users u
LEFT JOIN projects.projects p ON u.id = p.owner_id AND p.status = 'active'
LEFT JOIN projects.project_collaborators pc ON u.id = pc.user_id AND pc.is_active = true
LEFT JOIN projects.team_members tm ON u.id = tm.user_id AND tm.is_active = true
GROUP BY u.id, u.name, u.email, u.role, u.last_login, u.created_at;