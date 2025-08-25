-- Database Query Optimization for Inventory Management System
-- PostgreSQL optimizations for sub-100ms query performance

-- ============================================
-- 1. OPTIMIZED INDEXES
-- ============================================

-- Primary indexes for inventory items
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_room_id ON inventory_items(room_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_category ON inventory_items(category) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_decision ON inventory_items(decision) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_created_at ON inventory_items(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_updated_at ON inventory_items(updated_at DESC) WHERE deleted_at IS NULL;

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_room_category ON inventory_items(room_id, category) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_category_decision ON inventory_items(category, decision) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_decision_price ON inventory_items(decision, asking_price) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_search ON inventory_items
USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(notes, '')))
WHERE deleted_at IS NULL;

-- JSONB indexes for metadata
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_metadata ON inventory_items USING gin(metadata) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_tags ON inventory_items USING gin(tags) WHERE deleted_at IS NULL;

-- Partial indexes for specific queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_for_sale ON inventory_items(asking_price, created_at DESC)
WHERE decision = 'Sell' AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_high_value ON inventory_items(purchase_price DESC)
WHERE purchase_price > 1000 AND deleted_at IS NULL;

-- Covering indexes to avoid table lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_listing_cover ON inventory_items(room_id, category)
INCLUDE (name, asking_price, decision, photo_url)
WHERE deleted_at IS NULL;

-- ============================================
-- 2. MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================

-- Room statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS room_statistics AS
SELECT
    r.id as room_id,
    r.name as room_name,
    r.floor,
    COUNT(i.id) as item_count,
    COUNT(DISTINCT i.category) as category_count,
    SUM(i.purchase_price) as total_purchase_value,
    SUM(i.asking_price) as total_asking_value,
    SUM(CASE WHEN i.decision = 'Keep' THEN 1 ELSE 0 END) as keep_count,
    SUM(CASE WHEN i.decision = 'Sell' THEN 1 ELSE 0 END) as sell_count,
    SUM(CASE WHEN i.decision = 'Donate' THEN 1 ELSE 0 END) as donate_count,
    SUM(CASE WHEN i.decision = 'Unsure' THEN 1 ELSE 0 END) as unsure_count,
    MAX(i.updated_at) as last_updated
FROM rooms r
LEFT JOIN inventory_items i ON r.id = i.room_id AND i.deleted_at IS NULL
WHERE r.deleted_at IS NULL
GROUP BY r.id, r.name, r.floor
WITH DATA;

CREATE UNIQUE INDEX ON room_statistics(room_id);
CREATE INDEX ON room_statistics(item_count DESC);

-- Category analytics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS category_analytics AS
SELECT
    category,
    COUNT(*) as item_count,
    AVG(purchase_price)::numeric(10,2) as avg_purchase_price,
    AVG(asking_price)::numeric(10,2) as avg_asking_price,
    MIN(purchase_price) as min_price,
    MAX(purchase_price) as max_price,
    SUM(purchase_price) as total_value,
    COUNT(DISTINCT room_id) as room_count,
    COUNT(CASE WHEN decision = 'Sell' THEN 1 END) as for_sale_count,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY purchase_price) as median_price
FROM inventory_items
WHERE deleted_at IS NULL
GROUP BY category
WITH DATA;

CREATE UNIQUE INDEX ON category_analytics(category);
CREATE INDEX ON category_analytics(item_count DESC);

-- Inventory summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_summary AS
SELECT
    COUNT(*) as total_items,
    COUNT(DISTINCT room_id) as total_rooms,
    COUNT(DISTINCT category) as total_categories,
    SUM(purchase_price) as total_purchase_value,
    SUM(asking_price) as total_asking_value,
    AVG(purchase_price)::numeric(10,2) as avg_purchase_price,
    AVG(asking_price)::numeric(10,2) as avg_asking_price,
    SUM(CASE WHEN decision = 'Keep' THEN purchase_price ELSE 0 END) as keep_value,
    SUM(CASE WHEN decision = 'Sell' THEN asking_price ELSE 0 END) as potential_sale_value,
    SUM(CASE WHEN decision = 'Donate' THEN purchase_price ELSE 0 END) as donate_value,
    COUNT(CASE WHEN photo_url IS NOT NULL THEN 1 END) as items_with_photos,
    MAX(created_at) as newest_item_date,
    MIN(created_at) as oldest_item_date,
    NOW() as last_refreshed
FROM inventory_items
WHERE deleted_at IS NULL
WITH DATA;

-- ============================================
-- 3. OPTIMIZED QUERIES WITH CTEs
-- ============================================

-- Optimized search query with relevance ranking
CREATE OR REPLACE FUNCTION search_inventory(
    search_query TEXT,
    limit_count INT DEFAULT 50,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    category VARCHAR,
    room_id UUID,
    room_name VARCHAR,
    purchase_price DECIMAL,
    asking_price DECIMAL,
    decision VARCHAR,
    photo_url TEXT,
    relevance FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH search_results AS (
        SELECT
            i.id,
            i.name,
            i.description,
            i.category,
            i.room_id,
            r.name as room_name,
            i.purchase_price,
            i.asking_price,
            i.decision,
            i.photo_url,
            ts_rank(
                to_tsvector('english', i.name || ' ' || COALESCE(i.description, '') || ' ' || COALESCE(i.notes, '')),
                plainto_tsquery('english', search_query)
            ) as relevance
        FROM inventory_items i
        JOIN rooms r ON i.room_id = r.id
        WHERE
            i.deleted_at IS NULL
            AND r.deleted_at IS NULL
            AND to_tsvector('english', i.name || ' ' || COALESCE(i.description, '') || ' ' || COALESCE(i.notes, ''))
                @@ plainto_tsquery('english', search_query)
    )
    SELECT * FROM search_results
    ORDER BY relevance DESC, name
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Optimized pagination query
CREATE OR REPLACE FUNCTION get_inventory_page(
    page_size INT DEFAULT 50,
    page_number INT DEFAULT 1,
    filter_category VARCHAR DEFAULT NULL,
    filter_decision VARCHAR DEFAULT NULL,
    filter_room_id UUID DEFAULT NULL,
    sort_column VARCHAR DEFAULT 'created_at',
    sort_direction VARCHAR DEFAULT 'DESC'
)
RETURNS TABLE (
    items JSONB,
    total_count BIGINT,
    page_count INT,
    current_page INT
) AS $$
DECLARE
    offset_count INT;
    total_items BIGINT;
    total_pages INT;
BEGIN
    offset_count := (page_number - 1) * page_size;

    -- Get total count with filters
    SELECT COUNT(*) INTO total_items
    FROM inventory_items i
    WHERE
        i.deleted_at IS NULL
        AND (filter_category IS NULL OR i.category = filter_category)
        AND (filter_decision IS NULL OR i.decision = filter_decision)
        AND (filter_room_id IS NULL OR i.room_id = filter_room_id);

    total_pages := CEIL(total_items::FLOAT / page_size);

    -- Build dynamic query with proper sorting
    RETURN QUERY
    WITH filtered_items AS (
        SELECT
            i.*,
            r.name as room_name
        FROM inventory_items i
        JOIN rooms r ON i.room_id = r.id
        WHERE
            i.deleted_at IS NULL
            AND r.deleted_at IS NULL
            AND (filter_category IS NULL OR i.category = filter_category)
            AND (filter_decision IS NULL OR i.decision = filter_decision)
            AND (filter_room_id IS NULL OR i.room_id = filter_room_id)
        ORDER BY
            CASE WHEN sort_column = 'name' AND sort_direction = 'ASC' THEN i.name END ASC,
            CASE WHEN sort_column = 'name' AND sort_direction = 'DESC' THEN i.name END DESC,
            CASE WHEN sort_column = 'purchase_price' AND sort_direction = 'ASC' THEN i.purchase_price END ASC,
            CASE WHEN sort_column = 'purchase_price' AND sort_direction = 'DESC' THEN i.purchase_price END DESC,
            CASE WHEN sort_column = 'created_at' AND sort_direction = 'ASC' THEN i.created_at END ASC,
            CASE WHEN sort_column = 'created_at' AND sort_direction = 'DESC' THEN i.created_at END DESC
        LIMIT page_size
        OFFSET offset_count
    )
    SELECT
        jsonb_agg(to_jsonb(filtered_items.*)) as items,
        total_items as total_count,
        total_pages as page_count,
        page_number as current_page;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. PARTITIONING FOR LARGE TABLES
-- ============================================

-- Create partitioned activity log table
CREATE TABLE IF NOT EXISTS activity_log_partitioned (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE IF NOT EXISTS activity_log_y2024m01 PARTITION OF activity_log_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE IF NOT EXISTS activity_log_y2024m02 PARTITION OF activity_log_partitioned
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Add indexes to partitions
CREATE INDEX ON activity_log_y2024m01(user_id, created_at DESC);
CREATE INDEX ON activity_log_y2024m01(entity_type, entity_id);

-- ============================================
-- 5. QUERY PERFORMANCE MONITORING
-- ============================================

-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT
    query,
    calls,
    mean_exec_time::numeric(10,2) as avg_ms,
    max_exec_time::numeric(10,2) as max_ms,
    total_exec_time::numeric(10,2) as total_ms,
    rows,
    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) as cache_hit_ratio
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- Queries averaging over 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;

-- ============================================
-- 6. CONNECTION POOLING CONFIGURATION
-- ============================================

-- PgBouncer configuration (pgbouncer.ini)
COMMENT ON DATABASE inventory_db IS '
[databases]
inventory_db = host=localhost port=5432 dbname=inventory_db

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
autodb_idle_timeout = 3600
dns_max_ttl = 15
';

-- ============================================
-- 7. VACUUM AND ANALYZE AUTOMATION
-- ============================================

-- Create maintenance function
CREATE OR REPLACE FUNCTION perform_maintenance()
RETURNS void AS $$
BEGIN
    -- Analyze frequently queried tables
    ANALYZE inventory_items;
    ANALYZE rooms;

    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY room_statistics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY category_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_summary;

    -- Clean up old activity logs
    DELETE FROM activity_log_partitioned
    WHERE created_at < NOW() - INTERVAL '90 days';

    -- Update table statistics
    PERFORM pg_stat_reset();
END;
$$ LANGUAGE plpgsql;

-- Schedule maintenance (using pg_cron extension)
-- SELECT cron.schedule('maintenance', '0 2 * * *', 'SELECT perform_maintenance();');

-- ============================================
-- 8. OPTIMIZED AGGREGATION QUERIES
-- ============================================

-- Fast count estimation for large tables
CREATE OR REPLACE FUNCTION fast_count(table_name text)
RETURNS BIGINT AS $$
DECLARE
    count_estimate BIGINT;
BEGIN
    EXECUTE format('
        SELECT reltuples::BIGINT
        FROM pg_class
        WHERE relname = %L', table_name)
    INTO count_estimate;

    RETURN count_estimate;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. DATABASE CONFIGURATION OPTIMIZATIONS
-- ============================================

-- Recommended PostgreSQL configuration settings
COMMENT ON DATABASE inventory_db IS '
-- Memory Configuration
shared_buffers = 4GB              # 25% of RAM
effective_cache_size = 12GB       # 75% of RAM
work_mem = 16MB                   # Per operation
maintenance_work_mem = 1GB        # For VACUUM, CREATE INDEX

-- Connection Settings
max_connections = 200
max_prepared_transactions = 100

-- WAL Settings
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 2GB
min_wal_size = 1GB

-- Query Planner
random_page_cost = 1.1            # For SSD
effective_io_concurrency = 200   # For SSD
default_statistics_target = 100

-- Logging
log_min_duration_statement = 100  # Log queries over 100ms
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0

-- Autovacuum
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 10s
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
';

-- ============================================
-- 10. BACKUP AND RECOVERY OPTIMIZATION
-- ============================================

-- Create backup function with parallel processing
COMMENT ON DATABASE inventory_db IS '
#!/bin/bash
# Optimized backup script with parallel dump

pg_dump -Fd -j 4 -d inventory_db -f /backup/inventory_backup
# -Fd: Directory format
# -j 4: Use 4 parallel jobs
# Compress with custom level
pg_dump -Fc -Z 6 -d inventory_db -f /backup/inventory_backup.custom
';
