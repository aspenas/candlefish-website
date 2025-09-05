-- SQLite to PostgreSQL Migration Script
-- Candlefish AI Platform Database Migration
-- Target: Zero-downtime migration from SQLite to PostgreSQL with performance optimization

-- ============================================================================
-- PHASE 1: POSTGRESQL SETUP AND CONFIGURATION
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Configure PostgreSQL for optimal performance
-- Note: These settings should be applied to postgresql.conf

/*
# Connection Settings
max_connections = 200
superuser_reserved_connections = 3

# Memory Settings
shared_buffers = 2GB                    # 25% of total RAM
effective_cache_size = 6GB              # 75% of total RAM
maintenance_work_mem = 512MB            # For maintenance operations
work_mem = 10MB                         # Per query operation
wal_buffers = 16MB                      # WAL buffer size

# Checkpoint Settings
checkpoint_completion_target = 0.9      # Spread checkpoints over 90% of time
wal_buffers = 16MB                      # Write-ahead log buffers
checkpoint_segments = 32                # Number of log segments
checkpoint_timeout = 5min               # Maximum checkpoint interval

# Performance Settings
default_statistics_target = 100         # Statistics collection detail
random_page_cost = 1.1                  # SSD-optimized random page cost
effective_io_concurrency = 200          # SSD concurrent I/O
cpu_tuple_cost = 0.01                   # CPU processing cost
cpu_index_tuple_cost = 0.005           # CPU index processing cost
cpu_operator_cost = 0.0025             # CPU operator processing cost

# Parallel Query Settings
max_worker_processes = 8                # Total background workers
max_parallel_workers_per_gather = 4     # Workers per parallel query
max_parallel_workers = 8                # Total parallel workers
max_parallel_maintenance_workers = 4    # Parallel maintenance workers

# Logging for Performance Analysis
log_min_duration_statement = 100        # Log queries >100ms
log_checkpoints = on                    # Log checkpoint activity
log_connections = on                    # Log new connections
log_disconnections = on                 # Log disconnections
log_lock_waits = on                     # Log lock waits
log_temp_files = 0                      # Log temp file usage
log_autovacuum_min_duration = 0         # Log autovacuum activity
log_statement = 'ddl'                   # Log DDL statements

# pg_stat_statements configuration
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000          # Track top 10k queries
pg_stat_statements.track = all          # Track all queries
pg_stat_statements.track_utility = on   # Track utility commands
*/

-- ============================================================================
-- PHASE 2: CREATE OPTIMIZED SCHEMA WITH ENHANCED TYPES
-- ============================================================================

-- Create custom types for better performance and data integrity
CREATE TYPE user_role AS ENUM ('admin', 'user', 'viewer', 'maintainer');
CREATE TYPE service_status AS ENUM ('running', 'stopped', 'starting', 'stopping', 'crashed', 'unhealthy');
CREATE TYPE agent_status AS ENUM ('active', 'idle', 'disabled', 'error', 'initializing');
CREATE TYPE log_level AS ENUM ('debug', 'info', 'warn', 'error', 'fatal');
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Users table with enhanced security and performance
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    api_key VARCHAR(255) UNIQUE,
    api_key_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    last_login TIMESTAMP,
    login_count INTEGER DEFAULT 0 NOT NULL,
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMP,
    preferences JSONB DEFAULT '{}' NOT NULL,
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints for data integrity
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_username_length CHECK (char_length(username) >= 3),
    CONSTRAINT users_failed_attempts_limit CHECK (failed_login_attempts >= 0 AND failed_login_attempts <= 10)
);

-- Services table with comprehensive monitoring support
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    group_name VARCHAR(100) NOT NULL,
    status service_status DEFAULT 'stopped' NOT NULL,
    port INTEGER,
    health_check_url VARCHAR(500),
    health_check_interval INTEGER DEFAULT 30 NOT NULL,
    health_check_timeout INTEGER DEFAULT 5 NOT NULL,
    container_id VARCHAR(100),
    process_id INTEGER,
    auto_restart BOOLEAN DEFAULT false NOT NULL,
    max_restarts INTEGER DEFAULT 3 NOT NULL,
    restart_count INTEGER DEFAULT 0 NOT NULL,
    dependencies JSONB DEFAULT '[]' NOT NULL,
    environment JSONB DEFAULT '{}' NOT NULL,
    labels JSONB DEFAULT '{}' NOT NULL,
    resource_limits JSONB DEFAULT '{"cpu": null, "memory": null}' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    started_at TIMESTAMP,
    stopped_at TIMESTAMP,
    last_health_check TIMESTAMP,
    health_check_failures INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT services_port_range CHECK (port IS NULL OR (port > 0 AND port <= 65535)),
    CONSTRAINT services_restart_count_positive CHECK (restart_count >= 0),
    CONSTRAINT services_health_interval_positive CHECK (health_check_interval > 0),
    CONSTRAINT services_health_timeout_positive CHECK (health_check_timeout > 0)
);

-- NANDA Agents table with capabilities tracking
CREATE TABLE nanda_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    status agent_status DEFAULT 'idle' NOT NULL,
    capabilities JSONB DEFAULT '[]' NOT NULL,
    configuration JSONB DEFAULT '{}' NOT NULL,
    state JSONB DEFAULT '{}' NOT NULL,
    performance_metrics JSONB DEFAULT '{}' NOT NULL,
    last_heartbeat TIMESTAMP,
    heartbeat_interval INTEGER DEFAULT 30 NOT NULL,
    error_count INTEGER DEFAULT 0 NOT NULL,
    success_count INTEGER DEFAULT 0 NOT NULL,
    total_decisions INTEGER DEFAULT 0 NOT NULL,
    avg_decision_time_ms DECIMAL(10,3) DEFAULT 0 NOT NULL,
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    version VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT nanda_agents_heartbeat_interval_positive CHECK (heartbeat_interval > 0),
    CONSTRAINT nanda_agents_error_count_positive CHECK (error_count >= 0),
    CONSTRAINT nanda_agents_success_count_positive CHECK (success_count >= 0)
);

-- Agent decisions with detailed tracking
CREATE TABLE agent_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES nanda_agents(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    decision_type VARCHAR(100) NOT NULL,
    action_taken VARCHAR(255) NOT NULL,
    reason TEXT,
    confidence_score DECIMAL(5,4),
    outcome VARCHAR(50),
    execution_time_ms INTEGER,
    success BOOLEAN,
    error_message TEXT,
    metadata JSONB DEFAULT '{}' NOT NULL,
    context JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT agent_decisions_confidence_range CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
    CONSTRAINT agent_decisions_execution_time_positive CHECK (execution_time_ms IS NULL OR execution_time_ms >= 0)
);

-- Health metrics with partitioning for performance
CREATE TABLE health_metrics (
    id UUID DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES nanda_agents(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    memory_total_mb BIGINT,
    memory_used_mb BIGINT,
    disk_usage DECIMAL(5,2),
    disk_total_gb DECIMAL(10,2),
    disk_used_gb DECIMAL(10,2),
    network_in_bytes BIGINT DEFAULT 0,
    network_out_bytes BIGINT DEFAULT 0,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_rate DECIMAL(5,2) DEFAULT 0,
    request_count INTEGER DEFAULT 0,
    active_connections INTEGER DEFAULT 0,
    load_average DECIMAL(4,2),
    uptime_seconds BIGINT,
    custom_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    PRIMARY KEY (id, created_at), -- Composite primary key for partitioning
    
    -- Constraints
    CONSTRAINT health_metrics_cpu_range CHECK (cpu_usage IS NULL OR (cpu_usage >= 0 AND cpu_usage <= 100)),
    CONSTRAINT health_metrics_memory_range CHECK (memory_usage IS NULL OR (memory_usage >= 0 AND memory_usage <= 100)),
    CONSTRAINT health_metrics_disk_range CHECK (disk_usage IS NULL OR (disk_usage >= 0 AND disk_usage <= 100)),
    CONSTRAINT health_metrics_response_time_positive CHECK (response_time_ms IS NULL OR response_time_ms >= 0),
    CONSTRAINT health_metrics_error_rate_range CHECK (error_rate >= 0 AND error_rate <= 100)
) PARTITION BY RANGE (created_at);

-- Logs table with partitioning for scalability
CREATE TABLE logs (
    id UUID DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES nanda_agents(id) ON DELETE CASCADE,
    level log_level NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(100),
    component VARCHAR(100),
    trace_id VARCHAR(100),
    span_id VARCHAR(100),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    request_id VARCHAR(100),
    metadata JSONB DEFAULT '{}' NOT NULL,
    stack_trace TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    PRIMARY KEY (id, created_at), -- Composite primary key for partitioning
    
    -- Add GIN index for full-text search on message
    -- CREATE INDEX LATER - after data migration
) PARTITION BY RANGE (created_at);

-- Sessions table for user session management
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_hash VARCHAR(255) UNIQUE,
    device_id VARCHAR(255),
    device_type VARCHAR(50),
    browser VARCHAR(100),
    ip_address INET NOT NULL,
    user_agent TEXT,
    location JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT sessions_expires_future CHECK (expires_at > created_at)
);

-- API keys table for programmatic access
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(20) NOT NULL, -- First 20 chars for identification
    permissions JSONB DEFAULT '[]' NOT NULL,
    rate_limit_per_hour INTEGER DEFAULT 1000 NOT NULL,
    usage_count BIGINT DEFAULT 0 NOT NULL,
    last_used TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT api_keys_rate_limit_positive CHECK (rate_limit_per_hour > 0),
    CONSTRAINT api_keys_usage_count_positive CHECK (usage_count >= 0),
    CONSTRAINT api_keys_expires_future CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Alerts configuration table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES nanda_agents(id) ON DELETE CASCADE,
    condition JSONB NOT NULL,
    threshold_value DECIMAL(15,6),
    threshold_operator VARCHAR(10), -- '>', '<', '>=', '<=', '==', '!='
    severity alert_severity DEFAULT 'medium' NOT NULL,
    notification_channels JSONB DEFAULT '[]' NOT NULL,
    cooldown_seconds INTEGER DEFAULT 300 NOT NULL,
    last_triggered TIMESTAMP,
    trigger_count BIGINT DEFAULT 0 NOT NULL,
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT alerts_cooldown_positive CHECK (cooldown_seconds > 0),
    CONSTRAINT alerts_trigger_count_positive CHECK (trigger_count >= 0),
    CONSTRAINT alerts_threshold_operator_valid 
        CHECK (threshold_operator IN ('>', '<', '>=', '<=', '==', '!='))
);

-- Incidents tracking table
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
    severity alert_severity DEFAULT 'medium' NOT NULL,
    status VARCHAR(20) DEFAULT 'open' NOT NULL,
    priority INTEGER DEFAULT 3 NOT NULL, -- 1 (highest) to 5 (lowest)
    tags JSONB DEFAULT '[]' NOT NULL,
    resolution TEXT,
    root_cause TEXT,
    timeline JSONB DEFAULT '[]' NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    first_response_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT incidents_priority_range CHECK (priority >= 1 AND priority <= 5),
    CONSTRAINT incidents_status_valid CHECK (status IN ('open', 'assigned', 'investigating', 'resolved', 'closed')),
    CONSTRAINT incidents_timeline_order CHECK (
        opened_at <= COALESCE(first_response_at, opened_at) AND
        COALESCE(first_response_at, opened_at) <= COALESCE(resolved_at, first_response_at, opened_at) AND
        COALESCE(resolved_at, opened_at) <= COALESCE(closed_at, resolved_at, opened_at)
    )
);

-- ============================================================================
-- PHASE 3: CREATE PARTITIONS FOR TIME-SERIES DATA
-- ============================================================================

-- Create monthly partitions for health_metrics (last 6 months + future 6 months)
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN -6..6 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'health_metrics_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I PARTITION OF health_metrics
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        
        -- Create indexes on partitions for better performance
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS %I ON %I (service_id, created_at DESC)',
            partition_name || '_service_time_idx', partition_name
        );
        
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS %I ON %I (agent_id, created_at DESC) WHERE agent_id IS NOT NULL',
            partition_name || '_agent_time_idx', partition_name
        );
    END LOOP;
END $$;

-- Create monthly partitions for logs (last 3 months + future 3 months)
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN -3..3 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'logs_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I PARTITION OF logs
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        
        -- Create indexes on partitions
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS %I ON %I (service_id, level, created_at DESC)',
            partition_name || '_service_level_time_idx', partition_name
        );
        
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS %I ON %I USING GIN (to_tsvector(''english'', message))',
            partition_name || '_message_search_idx', partition_name
        );
    END LOOP;
END $$;

-- ============================================================================
-- PHASE 4: CREATE PERFORMANCE-OPTIMIZED INDEXES
-- ============================================================================

-- Users table indexes
CREATE INDEX CONCURRENTLY idx_users_email_active ON users(email) WHERE is_active = true AND is_verified = true;
CREATE INDEX CONCURRENTLY idx_users_username_lower ON users(lower(username)) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_users_role ON users(role) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_users_last_login ON users(last_login DESC NULLS LAST);
CREATE INDEX CONCURRENTLY idx_users_created_at ON users(created_at DESC);
CREATE INDEX CONCURRENTLY idx_users_api_key_hash ON users(api_key_hash) WHERE api_key_hash IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;

-- Services table indexes
CREATE INDEX CONCURRENTLY idx_services_status_group ON services(status, group_name) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_services_group_name ON services(group_name, name) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_services_port ON services(port) WHERE port IS NOT NULL AND is_active = true;
CREATE INDEX CONCURRENTLY idx_services_container_id ON services(container_id) WHERE container_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_services_health_check ON services(last_health_check) WHERE status = 'running';
CREATE INDEX CONCURRENTLY idx_services_auto_restart ON services(auto_restart, restart_count) WHERE auto_restart = true;
CREATE INDEX CONCURRENTLY idx_services_updated_at ON services(updated_at DESC);

-- Partial index for running services with health checks
CREATE INDEX CONCURRENTLY idx_services_running_health ON services(id, health_check_url, last_health_check) 
    WHERE status = 'running' AND health_check_url IS NOT NULL;

-- GIN indexes for JSONB columns
CREATE INDEX CONCURRENTLY idx_services_labels_gin ON services USING GIN(labels) WHERE labels != '{}';
CREATE INDEX CONCURRENTLY idx_services_environment_gin ON services USING GIN(environment) WHERE environment != '{}';

-- NANDA Agents table indexes
CREATE INDEX CONCURRENTLY idx_nanda_agents_type_status ON nanda_agents(type, status) WHERE is_enabled = true;
CREATE INDEX CONCURRENTLY idx_nanda_agents_status_active ON nanda_agents(status, last_heartbeat DESC) WHERE is_enabled = true;
CREATE INDEX CONCURRENTLY idx_nanda_agents_heartbeat ON nanda_agents(last_heartbeat DESC) WHERE is_enabled = true;
CREATE INDEX CONCURRENTLY idx_nanda_agents_performance ON nanda_agents(avg_decision_time_ms, success_count DESC) WHERE is_enabled = true;

-- GIN indexes for NANDA agents JSONB columns
CREATE INDEX CONCURRENTLY idx_nanda_agents_capabilities_gin ON nanda_agents USING GIN(capabilities);
CREATE INDEX CONCURRENTLY idx_nanda_agents_configuration_gin ON nanda_agents USING GIN(configuration) WHERE configuration != '{}';

-- Agent decisions indexes
CREATE INDEX CONCURRENTLY idx_agent_decisions_agent_time ON agent_decisions(agent_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_agent_decisions_service_time ON agent_decisions(service_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_agent_decisions_type_outcome ON agent_decisions(decision_type, outcome, created_at DESC);
CREATE INDEX CONCURRENTLY idx_agent_decisions_confidence ON agent_decisions(confidence_score DESC, success) WHERE confidence_score IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_agent_decisions_execution_time ON agent_decisions(execution_time_ms) WHERE execution_time_ms IS NOT NULL;

-- Sessions table indexes
CREATE INDEX CONCURRENTLY idx_sessions_user_active ON sessions(user_id, is_active, last_activity DESC) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_sessions_token_hash ON sessions(token_hash) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_sessions_expires_at ON sessions(expires_at) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_sessions_last_activity ON sessions(last_activity DESC) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_sessions_device ON sessions(device_id, user_id) WHERE device_id IS NOT NULL AND is_active = true;

-- API keys table indexes
CREATE INDEX CONCURRENTLY idx_api_keys_user_active ON api_keys(user_id, is_active, created_at DESC) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_api_keys_hash ON api_keys(key_hash) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_api_keys_prefix ON api_keys(key_prefix) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_api_keys_last_used ON api_keys(last_used DESC NULLS LAST) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL AND is_active = true;

-- Alerts table indexes
CREATE INDEX CONCURRENTLY idx_alerts_service_enabled ON alerts(service_id, is_enabled, severity) WHERE is_enabled = true;
CREATE INDEX CONCURRENTLY idx_alerts_agent_enabled ON alerts(agent_id, is_enabled, severity) WHERE agent_id IS NOT NULL AND is_enabled = true;
CREATE INDEX CONCURRENTLY idx_alerts_severity_enabled ON alerts(severity, is_enabled, last_triggered DESC) WHERE is_enabled = true;
CREATE INDEX CONCURRENTLY idx_alerts_last_triggered ON alerts(last_triggered DESC NULLS LAST) WHERE is_enabled = true;

-- GIN index for alert conditions
CREATE INDEX CONCURRENTLY idx_alerts_condition_gin ON alerts USING GIN(condition);

-- Incidents table indexes
CREATE INDEX CONCURRENTLY idx_incidents_service_status ON incidents(service_id, status, severity, opened_at DESC);
CREATE INDEX CONCURRENTLY idx_incidents_assigned_to ON incidents(assigned_to, status, priority, opened_at DESC) WHERE assigned_to IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_incidents_status_priority ON incidents(status, priority, opened_at DESC);
CREATE INDEX CONCURRENTLY idx_incidents_severity ON incidents(severity, status, opened_at DESC);
CREATE INDEX CONCURRENTLY idx_incidents_created_by ON incidents(created_by, opened_at DESC) WHERE created_by IS NOT NULL;

-- GIN indexes for incidents JSONB columns
CREATE INDEX CONCURRENTLY idx_incidents_tags_gin ON incidents USING GIN(tags) WHERE tags != '[]';
CREATE INDEX CONCURRENTLY idx_incidents_timeline_gin ON incidents USING GIN(timeline) WHERE timeline != '[]';

-- ============================================================================
-- PHASE 5: CREATE MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================================================

-- Service health summary materialized view (refresh every 5 minutes)
CREATE MATERIALIZED VIEW service_health_summary AS
SELECT 
    s.id as service_id,
    s.name,
    s.group_name,
    s.status,
    s.port,
    COUNT(hm.id) as metric_count_1h,
    AVG(hm.cpu_usage) as avg_cpu_1h,
    AVG(hm.memory_usage) as avg_memory_1h,
    AVG(hm.response_time_ms) as avg_response_time_1h,
    MAX(hm.response_time_ms) as max_response_time_1h,
    COUNT(CASE WHEN hm.status_code >= 500 THEN 1 END) as error_count_1h,
    COUNT(CASE WHEN hm.status_code >= 400 AND hm.status_code < 500 THEN 1 END) as client_error_count_1h,
    s.last_health_check,
    s.health_check_failures,
    s.restart_count
FROM services s
LEFT JOIN health_metrics hm ON s.id = hm.service_id 
    AND hm.created_at > NOW() - INTERVAL '1 hour'
WHERE s.is_active = true
GROUP BY s.id, s.name, s.group_name, s.status, s.port, s.last_health_check, s.health_check_failures, s.restart_count;

CREATE UNIQUE INDEX ON service_health_summary(service_id);
CREATE INDEX ON service_health_summary(group_name, avg_response_time_1h DESC);
CREATE INDEX ON service_health_summary(status, error_count_1h DESC);

-- NANDA agent performance summary materialized view
CREATE MATERIALIZED VIEW nanda_agent_performance AS
SELECT 
    na.id as agent_id,
    na.name,
    na.type,
    na.status,
    na.success_count,
    na.error_count,
    na.total_decisions,
    na.avg_decision_time_ms,
    CASE 
        WHEN na.total_decisions > 0 
        THEN ROUND((na.success_count::DECIMAL / na.total_decisions) * 100, 2)
        ELSE 0 
    END as success_rate_percent,
    COUNT(ad.id) as decisions_24h,
    COUNT(CASE WHEN ad.success = true THEN 1 END) as successful_decisions_24h,
    AVG(ad.execution_time_ms) as avg_execution_time_24h,
    AVG(ad.confidence_score) as avg_confidence_24h,
    MAX(na.last_heartbeat) as last_heartbeat
FROM nanda_agents na
LEFT JOIN agent_decisions ad ON na.id = ad.agent_id 
    AND ad.created_at > NOW() - INTERVAL '24 hours'
WHERE na.is_enabled = true
GROUP BY na.id, na.name, na.type, na.status, na.success_count, na.error_count, 
         na.total_decisions, na.avg_decision_time_ms, na.last_heartbeat;

CREATE UNIQUE INDEX ON nanda_agent_performance(agent_id);
CREATE INDEX ON nanda_agent_performance(type, success_rate_percent DESC);
CREATE INDEX ON nanda_agent_performance(avg_execution_time_24h);

-- User activity summary materialized view
CREATE MATERIALIZED VIEW user_activity_summary AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u.role,
    u.is_active,
    u.last_login,
    u.login_count,
    COUNT(DISTINCT s.id) as active_sessions,
    COUNT(DISTINCT ak.id) as api_keys_count,
    COUNT(DISTINCT i.id) as incidents_assigned,
    COUNT(CASE WHEN i.status = 'open' THEN 1 END) as open_incidents_assigned,
    MAX(s.last_activity) as last_session_activity
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id AND s.is_active = true
LEFT JOIN api_keys ak ON u.id = ak.user_id AND ak.is_active = true
LEFT JOIN incidents i ON u.id = i.assigned_to AND i.status IN ('open', 'assigned', 'investigating')
WHERE u.is_active = true
GROUP BY u.id, u.username, u.email, u.role, u.is_active, u.last_login, u.login_count;

CREATE UNIQUE INDEX ON user_activity_summary(user_id);
CREATE INDEX ON user_activity_summary(role, last_login DESC);
CREATE INDEX ON user_activity_summary(active_sessions DESC);

-- ============================================================================
-- PHASE 6: CREATE PERFORMANCE FUNCTIONS
-- ============================================================================

-- Function to get service health with caching support
CREATE OR REPLACE FUNCTION get_service_health_batch(
    service_ids UUID[],
    time_range_hours INTEGER DEFAULT 1
)
RETURNS TABLE (
    service_id UUID,
    service_name VARCHAR(100),
    status service_status,
    avg_cpu DECIMAL(5,2),
    avg_memory DECIMAL(5,2),
    avg_response_time INTEGER,
    error_count BIGINT,
    last_health_check TIMESTAMP
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.status,
        AVG(hm.cpu_usage)::DECIMAL(5,2) as avg_cpu,
        AVG(hm.memory_usage)::DECIMAL(5,2) as avg_memory,
        AVG(hm.response_time_ms)::INTEGER as avg_response_time,
        COUNT(CASE WHEN hm.status_code >= 500 THEN 1 END) as error_count,
        s.last_health_check
    FROM services s
    LEFT JOIN health_metrics hm ON s.id = hm.service_id 
        AND hm.created_at > NOW() - (time_range_hours || ' hours')::INTERVAL
    WHERE s.id = ANY(service_ids)
        AND s.is_active = true
    GROUP BY s.id, s.name, s.status, s.last_health_check
    ORDER BY s.name;
END;
$$;

-- Function for efficient log search with full-text search
CREATE OR REPLACE FUNCTION search_logs(
    search_query TEXT,
    service_ids UUID[] DEFAULT NULL,
    log_levels log_level[] DEFAULT NULL,
    start_time TIMESTAMP DEFAULT NOW() - INTERVAL '24 hours',
    end_time TIMESTAMP DEFAULT NOW(),
    limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    service_id UUID,
    level log_level,
    message TEXT,
    source VARCHAR(100),
    created_at TIMESTAMP,
    rank REAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.service_id,
        l.level,
        l.message,
        l.source,
        l.created_at,
        ts_rank(to_tsvector('english', l.message), plainto_tsquery('english', search_query)) as rank
    FROM logs l
    WHERE 
        l.created_at >= start_time
        AND l.created_at <= end_time
        AND (service_ids IS NULL OR l.service_id = ANY(service_ids))
        AND (log_levels IS NULL OR l.level = ANY(log_levels))
        AND to_tsvector('english', l.message) @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC, l.created_at DESC
    LIMIT limit_count;
END;
$$;

-- Function to get agent decision analytics
CREATE OR REPLACE FUNCTION get_agent_decision_analytics(
    agent_ids UUID[] DEFAULT NULL,
    time_range_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    agent_id UUID,
    agent_name VARCHAR(100),
    total_decisions BIGINT,
    successful_decisions BIGINT,
    failed_decisions BIGINT,
    success_rate DECIMAL(5,2),
    avg_confidence DECIMAL(5,4),
    avg_execution_time DECIMAL(10,3)
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        na.id,
        na.name,
        COUNT(ad.id) as total_decisions,
        COUNT(CASE WHEN ad.success = true THEN 1 END) as successful_decisions,
        COUNT(CASE WHEN ad.success = false THEN 1 END) as failed_decisions,
        CASE 
            WHEN COUNT(ad.id) > 0 
            THEN ROUND((COUNT(CASE WHEN ad.success = true THEN 1 END)::DECIMAL / COUNT(ad.id)) * 100, 2)
            ELSE 0 
        END as success_rate,
        AVG(ad.confidence_score) as avg_confidence,
        AVG(ad.execution_time_ms) as avg_execution_time
    FROM nanda_agents na
    LEFT JOIN agent_decisions ad ON na.id = ad.agent_id 
        AND ad.created_at > NOW() - (time_range_hours || ' hours')::INTERVAL
    WHERE (agent_ids IS NULL OR na.id = ANY(agent_ids))
        AND na.is_enabled = true
    GROUP BY na.id, na.name
    ORDER BY total_decisions DESC;
END;
$$;

-- ============================================================================
-- PHASE 7: CREATE TRIGGERS FOR DATA INTEGRITY AND AUTOMATION
-- ============================================================================

-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user login statistics
CREATE OR REPLACE FUNCTION update_user_login_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_login IS NOT NULL AND (OLD.last_login IS NULL OR NEW.last_login > OLD.last_login) THEN
        NEW.login_count = COALESCE(OLD.login_count, 0) + 1;
        NEW.failed_login_attempts = 0; -- Reset failed attempts on successful login
        NEW.locked_until = NULL; -- Unlock account
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update agent performance metrics
CREATE OR REPLACE FUNCTION update_agent_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update agent decision counts and performance metrics
    UPDATE nanda_agents 
    SET 
        total_decisions = total_decisions + 1,
        success_count = CASE WHEN NEW.success = true THEN success_count + 1 ELSE success_count END,
        error_count = CASE WHEN NEW.success = false THEN error_count + 1 ELSE error_count END,
        avg_decision_time_ms = CASE 
            WHEN NEW.execution_time_ms IS NOT NULL THEN
                ((avg_decision_time_ms * (total_decisions - 1)) + NEW.execution_time_ms) / total_decisions
            ELSE avg_decision_time_ms
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.agent_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update service health check statistics
CREATE OR REPLACE FUNCTION update_service_health_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update service health check failure count
    IF NEW.status_code IS NOT NULL AND NEW.status_code >= 500 THEN
        UPDATE services 
        SET health_check_failures = health_check_failures + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.service_id;
    ELSIF NEW.status_code IS NOT NULL AND NEW.status_code < 400 THEN
        -- Reset failure count on successful health check
        UPDATE services 
        SET health_check_failures = 0,
            last_health_check = NEW.created_at,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.service_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to tables
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_login_stats 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_user_login_stats();

CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nanda_agents_updated_at 
    BEFORE UPDATE ON nanda_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at 
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_performance_stats 
    AFTER INSERT ON agent_decisions
    FOR EACH ROW EXECUTE FUNCTION update_agent_performance();

CREATE TRIGGER update_service_health_check_stats 
    AFTER INSERT ON health_metrics
    FOR EACH ROW EXECUTE FUNCTION update_service_health_stats();

-- ============================================================================
-- PHASE 8: DATA MIGRATION FROM SQLITE
-- ============================================================================

-- Note: This section should be executed after the above schema is created
-- The actual data migration will be done using a separate script or ETL process

-- Create a temporary table for SQLite data import
CREATE TABLE temp_sqlite_data (
    table_name VARCHAR(100),
    data JSONB
);

-- Example migration procedure (to be customized based on actual SQLite schema)
CREATE OR REPLACE PROCEDURE migrate_from_sqlite()
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Disable triggers during migration for performance
    SET session_replication_role = replica;
    
    -- Migrate users (example - adjust based on actual SQLite schema)
    INSERT INTO users (id, username, email, password_hash, role, is_active, created_at)
    SELECT 
        uuid_generate_v4(),
        data->>'username',
        data->>'email',
        data->>'password_hash',
        COALESCE((data->>'role')::user_role, 'user'),
        COALESCE((data->>'is_active')::boolean, true),
        COALESCE((data->>'created_at')::timestamp, CURRENT_TIMESTAMP)
    FROM temp_sqlite_data 
    WHERE table_name = 'users'
    ON CONFLICT (email) DO NOTHING;
    
    -- Migrate services (example)
    INSERT INTO services (id, name, display_name, description, group_name, status, port, is_active, created_at)
    SELECT 
        uuid_generate_v4(),
        data->>'name',
        data->>'display_name',
        data->>'description',
        COALESCE(data->>'group_name', 'default'),
        COALESCE((data->>'status')::service_status, 'stopped'),
        (data->>'port')::integer,
        COALESCE((data->>'is_active')::boolean, true),
        COALESCE((data->>'created_at')::timestamp, CURRENT_TIMESTAMP)
    FROM temp_sqlite_data 
    WHERE table_name = 'services'
    ON CONFLICT (name) DO NOTHING;
    
    -- Re-enable triggers
    SET session_replication_role = DEFAULT;
    
    -- Update sequences and refresh materialized views
    REFRESH MATERIALIZED VIEW service_health_summary;
    REFRESH MATERIALIZED VIEW nanda_agent_performance;
    REFRESH MATERIALIZED VIEW user_activity_summary;
    
    RAISE NOTICE 'Migration completed successfully';
END;
$$;

-- ============================================================================
-- PHASE 9: MAINTENANCE AND MONITORING PROCEDURES
-- ============================================================================

-- Procedure to refresh materialized views
CREATE OR REPLACE PROCEDURE refresh_materialized_views()
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY service_health_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY nanda_agent_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_summary;
    
    INSERT INTO logs (level, message, source, created_at)
    VALUES ('info', 'Materialized views refreshed successfully', 'system', CURRENT_TIMESTAMP);
END;
$$;

-- Procedure for partition maintenance
CREATE OR REPLACE PROCEDURE maintain_partitions()
LANGUAGE plpgsql
AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Create next month's partitions if they don't exist
    start_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
    end_date := start_date + INTERVAL '1 month';
    
    -- Health metrics partition
    partition_name := 'health_metrics_' || TO_CHAR(start_date, 'YYYY_MM');
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF health_metrics
        FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );
    
    -- Logs partition
    partition_name := 'logs_' || TO_CHAR(start_date, 'YYYY_MM');
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF logs
        FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );
    
    -- Drop old partitions (older than 6 months for health_metrics, 3 months for logs)
    FOR partition_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'health_metrics_%' 
        AND tablename < 'health_metrics_' || TO_CHAR(CURRENT_DATE - INTERVAL '6 months', 'YYYY_MM')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', partition_name);
    END LOOP;
    
    FOR partition_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'logs_%' 
        AND tablename < 'logs_' || TO_CHAR(CURRENT_DATE - INTERVAL '3 months', 'YYYY_MM')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', partition_name);
    END LOOP;
    
    INSERT INTO logs (level, message, source, created_at)
    VALUES ('info', 'Partition maintenance completed', 'system', CURRENT_TIMESTAMP);
END;
$$;

-- Procedure for cleanup old data
CREATE OR REPLACE PROCEDURE cleanup_old_data()
LANGUAGE plpgsql
AS $$
BEGIN
    -- Clean up expired sessions
    DELETE FROM sessions 
    WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '1 day';
    
    -- Clean up old API key usage data (keep last 90 days)
    UPDATE api_keys 
    SET usage_count = 0, last_used = NULL 
    WHERE last_used < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    -- Archive resolved incidents older than 1 year
    -- (In production, you might want to move to an archive table instead)
    DELETE FROM incidents 
    WHERE status = 'closed' 
    AND closed_at < CURRENT_TIMESTAMP - INTERVAL '1 year';
    
    INSERT INTO logs (level, message, source, created_at)
    VALUES ('info', 'Old data cleanup completed', 'system', CURRENT_TIMESTAMP);
END;
$$;

-- Main maintenance procedure
CREATE OR REPLACE PROCEDURE perform_maintenance()
LANGUAGE plpgsql
AS $$
BEGIN
    -- Vacuum and analyze critical tables
    VACUUM ANALYZE users;
    VACUUM ANALYZE services;
    VACUUM ANALYZE nanda_agents;
    VACUUM ANALYZE sessions;
    VACUUM ANALYZE api_keys;
    
    -- Update table statistics
    ANALYZE;
    
    -- Refresh materialized views
    CALL refresh_materialized_views();
    
    -- Maintain partitions
    CALL maintain_partitions();
    
    -- Cleanup old data
    CALL cleanup_old_data();
    
    INSERT INTO logs (level, message, source, created_at)
    VALUES ('info', 'Complete maintenance cycle finished', 'system', CURRENT_TIMESTAMP);
END;
$$;

-- ============================================================================
-- PHASE 10: INITIAL DATA INSERTION
-- ============================================================================

-- Insert default admin user (password should be changed immediately)
INSERT INTO users (username, email, password_hash, role, is_active, is_verified) 
VALUES (
    'admin', 
    'admin@candlefish.local', 
    crypt('changeme123!', gen_salt('bf', 10)), 
    'admin', 
    true, 
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert default NANDA agents
INSERT INTO nanda_agents (name, type, capabilities, configuration, is_enabled) VALUES
    ('health-monitor', 'monitoring', 
     '["health_check", "metric_collection", "anomaly_detection"]',
     '{"check_interval": 30, "threshold_cpu": 80, "threshold_memory": 85}',
     true),
    ('auto-healer', 'recovery', 
     '["restart_service", "clear_cache", "rotate_logs", "scale_service"]',
     '{"max_restart_attempts": 3, "cooldown_minutes": 5, "escalation_enabled": true}',
     true),
    ('performance-optimizer', 'optimization', 
     '["scale_service", "optimize_queries", "cache_management", "load_balancing"]',
     '{"optimization_interval": 300, "scaling_threshold": 0.8, "cache_ttl": 3600}',
     true),
    ('security-scanner', 'security', 
     '["vulnerability_scan", "access_audit", "threat_detection", "compliance_check"]',
     '{"scan_interval": 3600, "threat_db_update": 86400, "alert_threshold": "medium"}',
     true),
    ('log-analyzer', 'analytics', 
     '["log_aggregation", "pattern_detection", "error_correlation", "trend_analysis"]',
     '{"analysis_window": 3600, "correlation_threshold": 0.7, "retention_days": 90}',
     true)
ON CONFLICT (name) DO NOTHING;

-- Insert default alerts
INSERT INTO alerts (name, description, condition, threshold_value, threshold_operator, severity, notification_channels, is_enabled) VALUES
    ('High CPU Usage', 'Alert when service CPU usage exceeds 80%', 
     '{"metric": "cpu_usage", "aggregation": "avg", "time_window": "5m"}', 
     80.0, '>', 'high', '["email", "webhook"]', true),
    ('High Memory Usage', 'Alert when service memory usage exceeds 85%',
     '{"metric": "memory_usage", "aggregation": "avg", "time_window": "5m"}',
     85.0, '>', 'high', '["email"]', true),
    ('Service Down', 'Alert when service is not responding',
     '{"metric": "health_check", "status": "failed", "consecutive_failures": 3}',
     NULL, NULL, 'critical', '["email", "webhook", "sms"]', true),
    ('High Error Rate', 'Alert when error rate exceeds 5%',
     '{"metric": "error_rate", "aggregation": "avg", "time_window": "10m"}',
     5.0, '>', 'medium', '["email"]', true),
    ('Slow Response Time', 'Alert when response time exceeds 1000ms',
     '{"metric": "response_time_ms", "aggregation": "p95", "time_window": "5m"}',
     1000.0, '>', 'medium', '["email"]', true)
ON CONFLICT (name) DO NOTHING;

-- Create a function to generate sample data for testing (optional)
CREATE OR REPLACE FUNCTION generate_sample_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- This function can be used to generate sample data for testing
    -- Remove in production
    
    -- Sample services
    INSERT INTO services (name, display_name, group_name, status, port, health_check_url, is_active) VALUES
        ('api-server', 'API Server', 'backend', 'running', 3000, 'http://localhost:3000/health', true),
        ('web-dashboard', 'Web Dashboard', 'frontend', 'running', 3001, 'http://localhost:3001/health', true),
        ('redis-cache', 'Redis Cache', 'infrastructure', 'running', 6379, NULL, true),
        ('postgresql-db', 'PostgreSQL Database', 'infrastructure', 'running', 5432, NULL, true)
    ON CONFLICT (name) DO NOTHING;
    
    RAISE NOTICE 'Sample data generated successfully';
END;
$$;

-- ============================================================================
-- MIGRATION COMPLETED
-- ============================================================================

-- Create a view to track migration status
CREATE OR REPLACE VIEW migration_status AS
SELECT 
    'PostgreSQL Migration' as component,
    CASE WHEN EXISTS (SELECT 1 FROM users LIMIT 1) THEN 'Completed' ELSE 'Pending' END as status,
    (SELECT count(*) FROM users) as user_count,
    (SELECT count(*) FROM services) as service_count,
    (SELECT count(*) FROM nanda_agents) as agent_count,
    CURRENT_TIMESTAMP as checked_at;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'PostgreSQL Migration Schema Setup COMPLETED';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run data migration from SQLite: CALL migrate_from_sqlite();';
    RAISE NOTICE '2. Update application connection strings to use PostgreSQL';
    RAISE NOTICE '3. Configure connection pooling (pgBouncer)';
    RAISE NOTICE '4. Set up monitoring and alerting';
    RAISE NOTICE '5. Schedule maintenance procedures';
    RAISE NOTICE '============================================================================';
END $$;