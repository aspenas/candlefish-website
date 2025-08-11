-- Database Performance Optimization for Candlefish AI
-- PostgreSQL with TimescaleDB extensions

-- ============================================
-- 1. CONNECTION POOLING CONFIGURATION
-- ============================================

-- Optimal connection pool settings for production
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET effective_cache_size = '12GB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET work_mem = '32MB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- ============================================
-- 2. CRITICAL INDEXES FOR PAINTBOX
-- ============================================

-- Estimates table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_customer_id
ON estimates(customer_id)
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_status
ON estimates(status)
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_created_at
ON estimates(created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_composite
ON estimates(customer_id, status, created_at DESC)
WHERE deleted_at IS NULL;

-- Projects table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_company_id
ON projects(company_id)
WHERE archived = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status_updated
ON projects(status, updated_at DESC)
WHERE archived = false;

-- Photos table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_project_id
ON photos(project_id)
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_created_at
ON photos(created_at DESC);

-- PDF generation tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pdf_generation_estimate_id
ON pdf_generation_logs(estimate_id, created_at DESC);

-- ============================================
-- 3. MATERIALIZED VIEWS FOR EXPENSIVE QUERIES
-- ============================================

-- Customer statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS customer_stats AS
SELECT
    c.id as customer_id,
    c.name,
    c.email,
    COUNT(DISTINCT e.id) as total_estimates,
    COUNT(DISTINCT CASE WHEN e.status = 'accepted' THEN e.id END) as accepted_estimates,
    COUNT(DISTINCT CASE WHEN e.status = 'pending' THEN e.id END) as pending_estimates,
    SUM(CASE WHEN e.status = 'accepted' THEN e.total_amount ELSE 0 END) as total_revenue,
    AVG(CASE WHEN e.status = 'accepted' THEN e.total_amount ELSE NULL END) as avg_estimate_value,
    MAX(e.created_at) as last_estimate_date,
    MIN(e.created_at) as first_estimate_date
FROM customers c
LEFT JOIN estimates e ON c.id = e.customer_id AND e.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name, c.email;

CREATE UNIQUE INDEX ON customer_stats(customer_id);
CREATE INDEX ON customer_stats(total_revenue DESC);
CREATE INDEX ON customer_stats(last_estimate_date DESC);

-- Project performance metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS project_metrics AS
SELECT
    p.id as project_id,
    p.name,
    p.status,
    COUNT(DISTINCT ph.id) as photo_count,
    COUNT(DISTINCT e.id) as estimate_count,
    SUM(e.total_amount) as total_value,
    AVG(EXTRACT(EPOCH FROM (e.updated_at - e.created_at))/3600) as avg_processing_hours,
    MAX(ph.created_at) as last_photo_date,
    p.created_at,
    p.updated_at
FROM projects p
LEFT JOIN photos ph ON p.id = ph.project_id AND ph.deleted_at IS NULL
LEFT JOIN estimates e ON p.id = e.project_id AND e.deleted_at IS NULL
WHERE p.archived = false
GROUP BY p.id, p.name, p.status, p.created_at, p.updated_at;

CREATE UNIQUE INDEX ON project_metrics(project_id);
CREATE INDEX ON project_metrics(status, updated_at DESC);
CREATE INDEX ON project_metrics(total_value DESC);

-- Daily revenue aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_revenue AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as estimate_count,
    SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_count,
    SUM(CASE WHEN status = 'accepted' THEN total_amount ELSE 0 END) as revenue,
    AVG(CASE WHEN status = 'accepted' THEN total_amount ELSE NULL END) as avg_estimate_value
FROM estimates
WHERE deleted_at IS NULL
GROUP BY DATE(created_at);

CREATE UNIQUE INDEX ON daily_revenue(date);

-- ============================================
-- 4. REFRESH MATERIALIZED VIEWS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY customer_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY project_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_revenue;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh every hour
-- Note: Requires pg_cron extension
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('refresh-views', '0 * * * *', 'SELECT refresh_all_materialized_views();');

-- ============================================
-- 5. PARTITIONING FOR LARGE TABLES
-- ============================================

-- Convert photos table to partitioned by month
CREATE TABLE IF NOT EXISTS photos_partitioned (
    LIKE photos INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions for the last 12 months and next 3 months
DO $$
DECLARE
    start_date date := date_trunc('month', CURRENT_DATE - interval '12 months');
    end_date date := date_trunc('month', CURRENT_DATE + interval '3 months');
    partition_date date;
BEGIN
    partition_date := start_date;
    WHILE partition_date < end_date LOOP
        EXECUTE format('CREATE TABLE IF NOT EXISTS photos_%s PARTITION OF photos_partitioned
            FOR VALUES FROM (%L) TO (%L)',
            to_char(partition_date, 'YYYY_MM'),
            partition_date,
            partition_date + interval '1 month'
        );
        partition_date := partition_date + interval '1 month';
    END LOOP;
END $$;

-- ============================================
-- 6. QUERY OPTIMIZATION FUNCTIONS
-- ============================================

-- Function to get estimate with all related data (optimized)
CREATE OR REPLACE FUNCTION get_estimate_with_details(estimate_id UUID)
RETURNS TABLE (
    estimate JSON,
    customer JSON,
    line_items JSON,
    photos JSON,
    project JSON
) AS $$
BEGIN
    RETURN QUERY
    WITH estimate_data AS (
        SELECT e.* FROM estimates e WHERE e.id = estimate_id AND e.deleted_at IS NULL
    ),
    customer_data AS (
        SELECT c.* FROM customers c
        JOIN estimate_data e ON c.id = e.customer_id
        WHERE c.deleted_at IS NULL
    ),
    line_items_data AS (
        SELECT json_agg(li.*) as items
        FROM line_items li
        WHERE li.estimate_id = estimate_id AND li.deleted_at IS NULL
    ),
    photos_data AS (
        SELECT json_agg(p.*) as photos
        FROM photos p
        JOIN estimate_data e ON p.project_id = e.project_id
        WHERE p.deleted_at IS NULL
    ),
    project_data AS (
        SELECT pr.* FROM projects pr
        JOIN estimate_data e ON pr.id = e.project_id
        WHERE pr.archived = false
    )
    SELECT
        row_to_json(e.*) as estimate,
        row_to_json(c.*) as customer,
        COALESCE(li.items, '[]'::json) as line_items,
        COALESCE(ph.photos, '[]'::json) as photos,
        row_to_json(pr.*) as project
    FROM estimate_data e
    LEFT JOIN customer_data c ON true
    LEFT JOIN line_items_data li ON true
    LEFT JOIN photos_data ph ON true
    LEFT JOIN project_data pr ON true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. PERFORMANCE MONITORING
-- ============================================

-- Create table for query performance tracking
CREATE TABLE IF NOT EXISTS query_performance_log (
    id SERIAL PRIMARY KEY,
    query_hash TEXT,
    query_text TEXT,
    execution_time_ms NUMERIC,
    rows_returned INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ON query_performance_log(query_hash, timestamp DESC);
CREATE INDEX ON query_performance_log(execution_time_ms DESC);

-- Function to log slow queries
CREATE OR REPLACE FUNCTION log_slow_queries()
RETURNS void AS $$
BEGIN
    INSERT INTO query_performance_log (query_hash, query_text, execution_time_ms, rows_returned)
    SELECT
        md5(query) as query_hash,
        LEFT(query, 1000) as query_text,
        total_time as execution_time_ms,
        calls as rows_returned
    FROM pg_stat_statements
    WHERE total_time > 100 -- Log queries taking more than 100ms
    AND query NOT LIKE '%pg_stat_statements%'
    ORDER BY total_time DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. VACUUM AND ANALYZE CONFIGURATION
-- ============================================

-- Auto-vacuum settings for high-traffic tables
ALTER TABLE estimates SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_limit = 1000
);

ALTER TABLE photos SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE projects SET (
    autovacuum_vacuum_scale_factor = 0.15,
    autovacuum_analyze_scale_factor = 0.1
);

-- ============================================
-- 9. CONNECTION POOLING WITH PGBOUNCER CONFIG
-- ============================================

-- PgBouncer configuration (save as pgbouncer.ini)
/*
[databases]
paintbox = host=localhost port=5432 dbname=paintbox

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
server_lifetime = 3600
server_idle_timeout = 600
server_connect_timeout = 15
server_login_retry = 15
query_wait_timeout = 120
client_idle_timeout = 0
client_login_timeout = 60
*/

-- ============================================
-- 10. TIMESCALEDB OPTIMIZATION (if using)
-- ============================================

-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert metrics table to hypertable
-- SELECT create_hypertable('metrics', 'timestamp', chunk_time_interval => interval '1 day');

-- Create continuous aggregate for hourly metrics
/*
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS hour,
    metric_name,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    MIN(value) as min_value,
    COUNT(*) as sample_count
FROM metrics
GROUP BY hour, metric_name;
*/

-- ============================================
-- 11. PERFORMANCE TESTING QUERIES
-- ============================================

-- Test query performance
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM estimates
WHERE customer_id = '123e4567-e89b-12d3-a456-426614174000'
AND status = 'pending'
AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find missing indexes
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 100
AND correlation < 0.1
ORDER BY n_distinct DESC;
