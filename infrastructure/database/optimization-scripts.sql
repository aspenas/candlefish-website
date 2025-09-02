-- Database Optimization Scripts for Candlefish
-- Path B: Performance & Scale Focus
-- Target: <30ms p95 query time

-- ============================================
-- 1. ANALYZE CURRENT STATE
-- ============================================

-- Find missing indexes on foreign keys
SELECT
    c.conname AS constraint_name,
    c.conrelid::regclass AS table_name,
    array_agg(a.attname ORDER BY x.n) AS columns,
    pg_size_pretty(pg_relation_size(c.conrelid)) AS table_size
FROM pg_constraint c
CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS x(attnum, n)
JOIN pg_attribute a ON a.attnum = x.attnum AND a.attrelid = c.conrelid
WHERE c.contype = 'f'
AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid
    AND i.indkey[0] = c.conkey[1]
)
GROUP BY c.conname, c.conrelid
ORDER BY pg_relation_size(c.conrelid) DESC;

-- Find slow queries
SELECT 
    calls,
    mean_exec_time,
    total_exec_time,
    stddev_exec_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent,
    substring(query, 1, 100) AS short_query
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Queries taking more than 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Find tables with high sequential scans
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    CASE 
        WHEN seq_scan + idx_scan > 0 
        THEN round(100.0 * idx_scan / (seq_scan + idx_scan), 1)
        ELSE 0
    END AS index_usage_percent
FROM pg_stat_user_tables
WHERE seq_scan > 1000
ORDER BY seq_tup_read DESC
LIMIT 20;

-- ============================================
-- 2. CREATE OPTIMIZED INDEXES
-- ============================================

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_organization_id ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC) WHERE last_login_at IS NOT NULL;

-- Organizations table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_plan ON organizations(plan_type, status) WHERE status = 'active';

-- Dashboards table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboards_organization_id ON dashboards(organization_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboards_created_by ON dashboards(created_by, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboards_visibility ON dashboards(visibility, organization_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboards_updated ON dashboards(updated_at DESC) WHERE deleted_at IS NULL;

-- Widgets table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_widgets_dashboard_id ON widgets(dashboard_id, position_y, position_x) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_widgets_type ON widgets(widget_type, dashboard_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_widgets_data_source ON widgets(data_source_id) WHERE deleted_at IS NULL;

-- Services table indexes (for CLOS)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_status ON services(status, group_name) WHERE status IN ('running', 'stopped');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_group ON services(group_name, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_port ON services(port) WHERE port IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_health ON services(last_health_check) WHERE status = 'running';

-- NANDA agents table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nanda_agents_type ON nanda_agents(agent_type, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nanda_agents_status ON nanda_agents(status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nanda_agents_last_heartbeat ON nanda_agents(last_heartbeat DESC);

-- Agent decisions table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_decisions_agent ON agent_decisions(agent_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_decisions_type ON agent_decisions(decision_type, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_decisions_confidence ON agent_decisions(confidence_score) WHERE confidence_score > 0.75;

-- Metrics/time-series data with BRIN indexes (space-efficient for time-series)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_time_brin ON metrics USING BRIN(created_at) WITH (pages_per_range = 128);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_health_metrics_brin ON health_metrics USING BRIN(timestamp) WITH (pages_per_range = 128);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_brin ON activity_logs USING BRIN(created_at) WITH (pages_per_range = 128);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_role ON users(organization_id, role) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboards_org_visibility ON dashboards(organization_id, visibility, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_widgets_dashboard_position ON widgets(dashboard_id, position_y, position_x) WHERE deleted_at IS NULL;

-- Partial indexes for specific query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users(organization_id, last_login_at DESC) 
    WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboards_public ON dashboards(organization_id, created_at DESC) 
    WHERE visibility = 'public' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_running ON services(group_name, port) 
    WHERE status = 'running';

-- GIN indexes for JSONB columns (if any)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_widgets_config_gin ON widgets USING GIN(configuration) WHERE configuration IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_metadata_gin ON services USING GIN(metadata) WHERE metadata IS NOT NULL;

-- ============================================
-- 3. QUERY OPTIMIZATION VIEWS
-- ============================================

-- Materialized view for dashboard statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats AS
SELECT 
    d.organization_id,
    d.id as dashboard_id,
    d.name,
    d.visibility,
    COUNT(DISTINCT w.id) as widget_count,
    COUNT(DISTINCT ds.user_id) as shared_with_count,
    MAX(w.updated_at) as last_widget_update,
    d.created_at,
    d.updated_at
FROM dashboards d
LEFT JOIN widgets w ON w.dashboard_id = d.id AND w.deleted_at IS NULL
LEFT JOIN dashboard_shares ds ON ds.dashboard_id = d.id AND ds.expires_at > NOW()
WHERE d.deleted_at IS NULL
GROUP BY d.id;

CREATE UNIQUE INDEX ON dashboard_stats(dashboard_id);
CREATE INDEX ON dashboard_stats(organization_id, updated_at DESC);

-- Materialized view for user activity summary
CREATE MATERIALIZED VIEW IF NOT EXISTS user_activity_summary AS
SELECT 
    u.id as user_id,
    u.organization_id,
    u.email,
    u.role,
    COUNT(DISTINCT d.id) as dashboard_count,
    COUNT(DISTINCT al.id) as activity_count_30d,
    MAX(al.created_at) as last_activity,
    u.last_login_at
FROM users u
LEFT JOIN dashboards d ON d.created_by = u.id AND d.deleted_at IS NULL
LEFT JOIN activity_logs al ON al.user_id = u.id AND al.created_at > NOW() - INTERVAL '30 days'
WHERE u.deleted_at IS NULL
GROUP BY u.id;

CREATE UNIQUE INDEX ON user_activity_summary(user_id);
CREATE INDEX ON user_activity_summary(organization_id, last_activity DESC);

-- ============================================
-- 4. PARTITION LARGE TABLES
-- ============================================

-- Partition activity_logs by month
CREATE TABLE IF NOT EXISTS activity_logs_partitioned (
    LIKE activity_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions for the last 12 months and future
DO $$
DECLARE
    start_date date;
    end_date date;
    partition_name text;
BEGIN
    FOR i IN 0..12 LOOP
        start_date := date_trunc('month', CURRENT_DATE - (i || ' months')::interval);
        end_date := start_date + '1 month'::interval;
        partition_name := 'activity_logs_y' || to_char(start_date, 'YYYY') || 'm' || to_char(start_date, 'MM');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF activity_logs_partitioned
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;
END $$;

-- Partition metrics table by week
CREATE TABLE IF NOT EXISTS metrics_partitioned (
    LIKE metrics INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create weekly partitions
DO $$
DECLARE
    start_date date;
    end_date date;
    partition_name text;
BEGIN
    FOR i IN 0..52 LOOP
        start_date := date_trunc('week', CURRENT_DATE - (i || ' weeks')::interval);
        end_date := start_date + '1 week'::interval;
        partition_name := 'metrics_y' || to_char(start_date, 'YYYY') || 'w' || to_char(start_date, 'WW');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF metrics_partitioned
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;
END $$;

-- ============================================
-- 5. OPTIMIZE EXISTING QUERIES
-- ============================================

-- Function to get user's dashboards with optimal performance
CREATE OR REPLACE FUNCTION get_user_dashboards(
    p_user_id UUID,
    p_organization_id UUID,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    dashboard_id UUID,
    name TEXT,
    description TEXT,
    visibility TEXT,
    widget_count BIGINT,
    last_updated TIMESTAMP,
    created_at TIMESTAMP
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.name,
        d.description,
        d.visibility,
        ds.widget_count,
        ds.last_widget_update,
        d.created_at
    FROM dashboards d
    JOIN dashboard_stats ds ON ds.dashboard_id = d.id
    WHERE d.organization_id = p_organization_id
    AND d.deleted_at IS NULL
    AND (
        d.visibility = 'public'
        OR d.created_by = p_user_id
        OR EXISTS (
            SELECT 1 FROM dashboard_shares sh
            WHERE sh.dashboard_id = d.id
            AND sh.user_id = p_user_id
            AND sh.expires_at > NOW()
        )
    )
    ORDER BY d.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Function to get service health efficiently
CREATE OR REPLACE FUNCTION get_service_health_batch(
    p_service_ids UUID[]
)
RETURNS TABLE (
    service_id UUID,
    status TEXT,
    last_health_check TIMESTAMP,
    cpu_usage FLOAT,
    memory_usage FLOAT,
    response_time_ms INT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.status,
        s.last_health_check,
        hm.cpu_usage,
        hm.memory_usage,
        hm.response_time_ms
    FROM services s
    LEFT JOIN LATERAL (
        SELECT 
            cpu_usage,
            memory_usage,
            response_time_ms
        FROM health_metrics
        WHERE service_id = s.id
        ORDER BY timestamp DESC
        LIMIT 1
    ) hm ON true
    WHERE s.id = ANY(p_service_ids);
END;
$$;

-- ============================================
-- 6. MAINTENANCE PROCEDURES
-- ============================================

-- Procedure to refresh materialized views
CREATE OR REPLACE PROCEDURE refresh_materialized_views()
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_summary;
    
    -- Log the refresh
    INSERT INTO maintenance_log (operation, completed_at)
    VALUES ('refresh_materialized_views', NOW());
END;
$$;

-- Schedule regular maintenance
-- Run VACUUM and ANALYZE on heavily used tables
CREATE OR REPLACE PROCEDURE perform_maintenance()
LANGUAGE plpgsql
AS $$
BEGIN
    -- VACUUM and ANALYZE critical tables
    VACUUM ANALYZE users;
    VACUUM ANALYZE dashboards;
    VACUUM ANALYZE widgets;
    VACUUM ANALYZE services;
    VACUUM ANALYZE activity_logs;
    
    -- Update table statistics
    ANALYZE;
    
    -- Refresh materialized views
    CALL refresh_materialized_views();
    
    -- Clean up old partitions (keep 6 months of activity logs)
    DELETE FROM activity_logs 
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- Log maintenance completion
    INSERT INTO maintenance_log (operation, completed_at)
    VALUES ('perform_maintenance', NOW());
END;
$$;

-- ============================================
-- 7. MONITORING QUERIES
-- ============================================

-- Query to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'RARELY USED'
        WHEN idx_scan < 1000 THEN 'OCCASIONALLY USED'
        ELSE 'FREQUENTLY USED'
    END as usage_category
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Query to find duplicate indexes
CREATE OR REPLACE VIEW duplicate_indexes AS
WITH index_data AS (
    SELECT
        indrelid,
        indexrelid,
        indkey,
        indclass,
        indexprs,
        indpred
    FROM pg_index
)
SELECT
    a.indexrelid::regclass AS index1,
    b.indexrelid::regclass AS index2,
    pg_size_pretty(pg_relation_size(a.indexrelid)) AS size1,
    pg_size_pretty(pg_relation_size(b.indexrelid)) AS size2
FROM index_data a
JOIN index_data b ON (
    a.indrelid = b.indrelid
    AND a.indexrelid < b.indexrelid
    AND a.indkey = b.indkey
    AND a.indclass = b.indclass
    AND COALESCE(a.indexprs, '') = COALESCE(b.indexprs, '')
    AND COALESCE(a.indpred, '') = COALESCE(b.indpred, '')
);

-- ============================================
-- 8. PERFORMANCE TESTING QUERIES
-- ============================================

-- Test query performance after optimizations
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) 
SELECT * FROM get_user_dashboards(
    'USER_UUID_HERE'::uuid,
    'ORG_UUID_HERE'::uuid,
    20,
    0
);

-- Verify index usage
SELECT * FROM index_usage_stats 
WHERE usage_category IN ('UNUSED', 'RARELY USED')
AND pg_relation_size(indexrelid) > 1024 * 1024; -- Indexes larger than 1MB

-- Check for table bloat
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size,
    ROUND(100 * pg_total_relation_size(schemaname||'.'||tablename) / 
        NULLIF(SUM(pg_total_relation_size(schemaname||'.'||tablename)) OVER (), 0), 2) AS percent_of_total
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;