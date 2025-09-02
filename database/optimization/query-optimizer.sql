-- Database Query Optimization Script
-- Performance improvements for Real-Time Collaboration Platform
-- Target: Reduce query times by 70%+

-- ============================================================================
-- PERFORMANCE ANALYSIS QUERIES
-- ============================================================================

-- Find slow queries (PostgreSQL)
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    min_time,
    max_time,
    stddev_time,
    rows
FROM pg_stat_statements
WHERE mean_time > 100 -- queries taking more than 100ms
ORDER BY mean_time DESC
LIMIT 50;

-- Find missing indexes
CREATE OR REPLACE VIEW missing_indexes AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    AND n_distinct > 100
    AND correlation < 0.1
ORDER BY n_distinct DESC;

-- Table size and bloat analysis
CREATE OR REPLACE VIEW table_bloat AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    round(100 * pg_total_relation_size(schemaname||'.'||tablename) / 
        NULLIF(sum(pg_total_relation_size(schemaname||'.'||tablename)) OVER (), 0), 2) AS percent_of_total
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- CRITICAL PERFORMANCE INDEXES
-- ============================================================================

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
    ON users(email, is_active) 
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
    ON users(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login 
    ON users(last_login DESC) 
    WHERE last_login IS NOT NULL;

-- Documents table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_status_published 
    ON documents(status, published_at DESC) 
    WHERE status = 'PUBLISHED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_author_status 
    ON documents(author_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_slug 
    ON documents(slug) 
    WHERE status = 'PUBLISHED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_full_text 
    ON documents USING GIN(to_tsvector('english', title || ' ' || content));

-- Collaboration/Real-time indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collaborations_document_user 
    ON collaborations(document_id, user_id, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collaborations_user_active 
    ON collaborations(user_id, is_active, last_activity DESC) 
    WHERE is_active = true;

-- WebSocket sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_websocket_sessions_user 
    ON websocket_sessions(user_id, connected_at DESC) 
    WHERE disconnected_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_websocket_sessions_active 
    ON websocket_sessions(is_active, last_ping) 
    WHERE is_active = true;

-- Comments and interactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_document_created 
    ON comments(document_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user_created 
    ON comments(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_parent 
    ON comments(parent_id) 
    WHERE parent_id IS NOT NULL;

-- Activity logs (for real-time updates)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_entity 
    ON activity_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_user_recent 
    ON activity_logs(user_id, created_at DESC);

-- Tags (many-to-many optimization)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_tags_document 
    ON document_tags(document_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_tags_tag 
    ON document_tags(tag_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_name 
    ON tags(name);

-- ============================================================================
-- MATERIALIZED VIEWS FOR EXPENSIVE AGGREGATIONS
-- ============================================================================

-- User statistics (refresh every hour)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_stats AS
SELECT 
    u.id as user_id,
    u.username,
    COUNT(DISTINCT d.id) as document_count,
    COUNT(DISTINCT c.id) as comment_count,
    COUNT(DISTINCT col.id) as collaboration_count,
    MAX(GREATEST(
        COALESCE(d.updated_at, '1970-01-01'::timestamp),
        COALESCE(c.created_at, '1970-01-01'::timestamp),
        COALESCE(col.last_activity, '1970-01-01'::timestamp)
    )) as last_activity,
    COALESCE(AVG(CASE WHEN d.status = 'PUBLISHED' THEN 1 ELSE 0 END) * 100, 0) as publish_rate
FROM users u
LEFT JOIN documents d ON u.id = d.author_id
LEFT JOIN comments c ON u.id = c.user_id
LEFT JOIN collaborations col ON u.id = col.user_id
GROUP BY u.id, u.username;

CREATE UNIQUE INDEX ON user_stats(user_id);
CREATE INDEX ON user_stats(last_activity DESC);

-- Document statistics (refresh every 30 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS document_stats AS
SELECT 
    d.id as document_id,
    d.title,
    d.author_id,
    COUNT(DISTINCT c.id) as comment_count,
    COUNT(DISTINCT col.user_id) as collaborator_count,
    COUNT(DISTINCT v.id) as view_count,
    AVG(r.rating) as avg_rating,
    MAX(GREATEST(
        COALESCE(c.created_at, '1970-01-01'::timestamp),
        COALESCE(col.last_activity, '1970-01-01'::timestamp)
    )) as last_activity
FROM documents d
LEFT JOIN comments c ON d.id = c.document_id
LEFT JOIN collaborations col ON d.id = col.document_id
LEFT JOIN document_views v ON d.id = v.document_id
LEFT JOIN document_ratings r ON d.id = r.document_id
WHERE d.status = 'PUBLISHED'
GROUP BY d.id, d.title, d.author_id;

CREATE UNIQUE INDEX ON document_stats(document_id);
CREATE INDEX ON document_stats(comment_count DESC);
CREATE INDEX ON document_stats(last_activity DESC);

-- Popular tags (refresh every 2 hours)
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_tags AS
SELECT 
    t.id as tag_id,
    t.name as tag_name,
    COUNT(DISTINCT dt.document_id) as document_count,
    COUNT(DISTINCT d.author_id) as author_count,
    MAX(d.published_at) as last_used
FROM tags t
JOIN document_tags dt ON t.id = dt.tag_id
JOIN documents d ON dt.document_id = d.id
WHERE d.status = 'PUBLISHED'
GROUP BY t.id, t.name
HAVING COUNT(DISTINCT dt.document_id) > 5;

CREATE UNIQUE INDEX ON popular_tags(tag_id);
CREATE INDEX ON popular_tags(document_count DESC);

-- ============================================================================
-- QUERY OPTIMIZATION FUNCTIONS
-- ============================================================================

-- Optimized search function with full-text search
CREATE OR REPLACE FUNCTION search_documents(
    search_query TEXT,
    limit_count INT DEFAULT 20,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    excerpt TEXT,
    author_id UUID,
    published_at TIMESTAMP,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        LEFT(d.content, 200) as excerpt,
        d.author_id,
        d.published_at,
        ts_rank(
            to_tsvector('english', d.title || ' ' || d.content),
            plainto_tsquery('english', search_query)
        ) as rank
    FROM documents d
    WHERE 
        d.status = 'PUBLISHED'
        AND to_tsvector('english', d.title || ' ' || d.content) @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC, d.published_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Batch insert optimization for real-time events
CREATE OR REPLACE FUNCTION batch_insert_events(
    events JSONB[]
)
RETURNS INT AS $$
DECLARE
    inserted_count INT;
BEGIN
    INSERT INTO activity_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        metadata,
        created_at
    )
    SELECT 
        (e->>'user_id')::UUID,
        e->>'action',
        e->>'entity_type',
        (e->>'entity_id')::UUID,
        e->'metadata',
        COALESCE((e->>'created_at')::TIMESTAMP, NOW())
    FROM unnest(events) as e
    ON CONFLICT DO NOTHING;
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PARTITIONING FOR LARGE TABLES
-- ============================================================================

-- Partition activity_logs by month for better performance
CREATE TABLE IF NOT EXISTS activity_logs_partitioned (
    LIKE activity_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions for the last 6 months and next 3 months
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN -6..3 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'activity_logs_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I PARTITION OF activity_logs_partitioned
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;
END $$;

-- ============================================================================
-- CONNECTION POOLING CONFIGURATION
-- ============================================================================

-- Recommended PostgreSQL configuration for high concurrency
-- Add these to postgresql.conf:
/*
# Connection Settings
max_connections = 200
superuser_reserved_connections = 3

# Memory Settings
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
work_mem = 10MB

# Checkpoint Settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1

# Query Planning
effective_io_concurrency = 200
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

# Logging for Performance Analysis
log_min_duration_statement = 100
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0
log_autovacuum_min_duration = 0

# Enable pg_stat_statements
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
*/

-- ============================================================================
-- VACUUM AND ANALYZE STRATEGY
-- ============================================================================

-- Auto-vacuum configuration for high-write tables
ALTER TABLE activity_logs SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_analyze_scale_factor = 0.005,
    autovacuum_vacuum_cost_delay = 2,
    autovacuum_vacuum_cost_limit = 1000
);

ALTER TABLE websocket_sessions SET (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_analyze_scale_factor = 0.01
);

-- Manual maintenance script (run during low traffic)
CREATE OR REPLACE PROCEDURE maintenance_routine()
LANGUAGE plpgsql
AS $$
BEGIN
    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY document_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_tags;
    
    -- Analyze frequently queried tables
    ANALYZE users;
    ANALYZE documents;
    ANALYZE comments;
    ANALYZE collaborations;
    
    -- Vacuum tables with high update/delete rate
    VACUUM (ANALYZE, VERBOSE) websocket_sessions;
    VACUUM (ANALYZE, VERBOSE) activity_logs;
    
    RAISE NOTICE 'Maintenance completed at %', NOW();
END;
$$;

-- Schedule maintenance (use pg_cron or external scheduler)
-- SELECT cron.schedule('maintenance', '0 3 * * *', 'CALL maintenance_routine()');

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================

-- Current active connections
CREATE OR REPLACE VIEW active_connections AS
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- Cache hit ratio (should be > 99%)
CREATE OR REPLACE VIEW cache_hit_ratio AS
SELECT 
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit) as heap_hit,
    CASE 
        WHEN sum(heap_blks_hit) + sum(heap_blks_read) > 0
        THEN round(sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))::numeric * 100, 2)
        ELSE 0
    END as cache_hit_ratio
FROM pg_statio_user_tables;

-- Index usage statistics
CREATE OR REPLACE VIEW index_usage AS
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

-- Grant permissions for monitoring user
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitor_user;
GRANT SELECT ON slow_queries TO monitor_user;
GRANT SELECT ON missing_indexes TO monitor_user;
GRANT SELECT ON table_bloat TO monitor_user;
GRANT SELECT ON active_connections TO monitor_user;
GRANT SELECT ON cache_hit_ratio TO monitor_user;
GRANT SELECT ON index_usage TO monitor_user;