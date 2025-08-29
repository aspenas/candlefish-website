-- Security Dashboard Performance Optimization Indexes
-- Target: <100ms P95 API response time
-- Optimized for 10,000+ events/second processing

-- ============================================
-- Core Tables Structure (if not exists)
-- ============================================

-- Security Events Table
CREATE TABLE IF NOT EXISTS security_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    source_ip INET,
    user_id UUID,
    resource_id VARCHAR(255),
    action VARCHAR(100),
    status VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    correlation_id UUID
);

-- Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'open',
    assigned_to UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Metrics Table
CREATE TABLE IF NOT EXISTS metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC(20, 4),
    tags JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- PRIMARY INDEXES
-- ============================================

-- Security Events Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_created_at 
    ON security_events(created_at DESC) 
    WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_type_severity 
    ON security_events(event_type, severity, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_user_id 
    ON security_events(user_id, created_at DESC) 
    WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_source_ip 
    ON security_events(source_ip, created_at DESC) 
    WHERE source_ip IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_correlation 
    ON security_events(correlation_id) 
    WHERE correlation_id IS NOT NULL;

-- Partial index for unprocessed events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_unprocessed 
    ON security_events(created_at) 
    WHERE processed_at IS NULL;

-- JSONB GIN index for metadata queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_metadata 
    ON security_events USING GIN (metadata);

-- Alerts Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_status_severity 
    ON alerts(status, severity, created_at DESC) 
    WHERE status IN ('open', 'acknowledged');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_assigned_to 
    ON alerts(assigned_to, status, created_at DESC) 
    WHERE assigned_to IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_created_at 
    ON alerts(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_type 
    ON alerts(alert_type, created_at DESC);

-- Partial index for unresolved alerts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_unresolved 
    ON alerts(created_at DESC) 
    WHERE resolved_at IS NULL;

-- JSONB GIN index for metadata
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_metadata 
    ON alerts USING GIN (metadata);

-- Metrics Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_name_timestamp 
    ON metrics(metric_name, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_timestamp 
    ON metrics(timestamp DESC) 
    WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- JSONB GIN index for tags
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_tags 
    ON metrics USING GIN (tags);

-- User Sessions Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_id 
    ON user_sessions(user_id, started_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_active 
    ON user_sessions(last_activity DESC) 
    WHERE ended_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_ip 
    ON user_sessions(ip_address, started_at DESC);

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================

-- Dashboard overview query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_overview 
    ON security_events(created_at DESC, severity, event_type) 
    WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- Alert summary query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_summary 
    ON alerts(status, severity, created_at DESC) 
    WHERE status != 'resolved';

-- Time-series metrics query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_timeseries 
    ON metrics(metric_name, timestamp DESC) 
    WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days';

-- ============================================
-- COVERING INDEXES FOR SPECIFIC QUERIES
-- ============================================

-- Covering index for event listing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_listing 
    ON security_events(created_at DESC, event_type, severity, source_ip, user_id) 
    INCLUDE (action, status);

-- Covering index for alert listing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_listing 
    ON alerts(created_at DESC, status, severity, alert_type) 
    INCLUDE (title, assigned_to);

-- ============================================
-- BLOOM FILTERS FOR EXISTENCE CHECKS
-- ============================================

-- Create bloom extension if not exists
CREATE EXTENSION IF NOT EXISTS bloom;

-- Bloom index for checking event existence
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_bloom 
    ON security_events USING bloom (correlation_id) 
    WITH (length=80, col1=2);

-- ============================================
-- PARTITIONING SETUP (for high-volume tables)
-- ============================================

-- Convert security_events to partitioned table (by month)
-- Note: This requires recreating the table, should be done during maintenance
/*
CREATE TABLE security_events_partitioned (
    LIKE security_events INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions for recent months
CREATE TABLE security_events_y2025m01 PARTITION OF security_events_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE security_events_y2025m02 PARTITION OF security_events_partitioned
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Add more partitions as needed...
*/

-- ============================================
-- MATERIALIZED VIEWS FOR AGGREGATIONS
-- ============================================

-- Hourly security event summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hourly_security_summary AS
SELECT 
    date_trunc('hour', created_at) as hour,
    event_type,
    severity,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT source_ip) as unique_ips
FROM security_events
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY date_trunc('hour', created_at), event_type, severity;

CREATE UNIQUE INDEX ON mv_hourly_security_summary (hour, event_type, severity);

-- Daily alert summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_alert_summary AS
SELECT 
    date_trunc('day', created_at) as day,
    alert_type,
    severity,
    status,
    COUNT(*) as alert_count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, CURRENT_TIMESTAMP) - created_at))/3600) as avg_resolution_hours
FROM alerts
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at), alert_type, severity, status;

CREATE UNIQUE INDEX ON mv_daily_alert_summary (day, alert_type, severity, status);

-- ============================================
-- PERFORMANCE OPTIMIZATION SETTINGS
-- ============================================

-- Update table statistics more frequently for high-volume tables
ALTER TABLE security_events SET (autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE metrics SET (autovacuum_analyze_scale_factor = 0.02);

-- Set appropriate fill factor for frequently updated tables
ALTER TABLE security_events SET (fillfactor = 90);
ALTER TABLE alerts SET (fillfactor = 85);
ALTER TABLE user_sessions SET (fillfactor = 85);

-- ============================================
-- REFRESH MATERIALIZED VIEWS
-- ============================================

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hourly_security_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_alert_summary;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh every hour (requires pg_cron extension)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('refresh-mv', '0 * * * *', 'SELECT refresh_materialized_views();');

-- ============================================
-- QUERY PERFORMANCE VIEWS
-- ============================================

-- View for monitoring slow queries
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    stddev_time
FROM pg_stat_statements
WHERE mean_time > 100 -- queries taking more than 100ms
ORDER BY mean_time DESC
LIMIT 20;

-- View for index usage statistics
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- View for table bloat estimation
CREATE OR REPLACE VIEW v_table_bloat AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_tuple_percent
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- ============================================
-- PERFORMANCE MONITORING FUNCTIONS
-- ============================================

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_query_performance(
    p_query_pattern TEXT DEFAULT '%'
)
RETURNS TABLE (
    query TEXT,
    execution_count BIGINT,
    total_time_ms NUMERIC,
    mean_time_ms NUMERIC,
    max_time_ms NUMERIC,
    rows_per_exec NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.query::TEXT,
        s.calls,
        round(s.total_time::numeric, 2),
        round(s.mean_time::numeric, 2),
        round(s.max_time::numeric, 2),
        round(s.rows / NULLIF(s.calls, 0)::numeric, 2)
    FROM pg_stat_statements s
    WHERE s.query LIKE p_query_pattern
    ORDER BY s.mean_time DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Function to get index effectiveness
CREATE OR REPLACE FUNCTION get_index_effectiveness()
RETURNS TABLE (
    tablename TEXT,
    indexname TEXT,
    index_size TEXT,
    times_used BIGINT,
    effectiveness_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        i.indexname::TEXT,
        pg_size_pretty(pg_relation_size(i.indexrelid))::TEXT,
        i.idx_scan,
        CASE 
            WHEN pg_relation_size(i.indexrelid) = 0 THEN 0
            ELSE round((i.idx_scan::numeric * 1000000 / pg_relation_size(i.indexrelid))::numeric, 2)
        END as effectiveness
    FROM pg_stat_user_indexes i
    JOIN pg_stat_user_tables t ON i.tablename = t.tablename
    ORDER BY effectiveness DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MAINTENANCE COMMANDS
-- ============================================

-- Analyze all tables to update statistics
ANALYZE;

-- Reindex tables if needed (run during maintenance window)
-- REINDEX TABLE CONCURRENTLY security_events;
-- REINDEX TABLE CONCURRENTLY alerts;
-- REINDEX TABLE CONCURRENTLY metrics;

-- Grant necessary permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO security_dashboard_read;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO security_dashboard_write;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO security_dashboard_write;