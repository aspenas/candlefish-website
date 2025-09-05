-- Database Monitoring and Performance Optimization Queries
-- Candlefish AI Platform - Real-time Database Monitoring
-- Target: Sub-50ms query performance with 99%+ uptime

-- ============================================================================
-- REAL-TIME PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- 1. Current Database Performance Overview
CREATE OR REPLACE VIEW database_performance_overview AS
SELECT 
    -- Connection Statistics
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction') as idle_in_transaction,
    
    -- Query Performance
    (SELECT count(*) FROM pg_stat_statements WHERE mean_exec_time > 100) as slow_queries_count,
    (SELECT round(avg(mean_exec_time)::numeric, 2) FROM pg_stat_statements) as avg_query_time_ms,
    (SELECT round(max(mean_exec_time)::numeric, 2) FROM pg_stat_statements) as max_query_time_ms,
    
    -- Cache Performance
    (SELECT round(
        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))::numeric * 100, 2
    ) FROM pg_statio_user_tables) as cache_hit_ratio_percent,
    
    -- Database Size
    (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size,
    
    -- Lock Information
    (SELECT count(*) FROM pg_locks WHERE NOT granted) as waiting_locks,
    
    -- Last Statistics Update
    CURRENT_TIMESTAMP as snapshot_time;

-- 2. Slow Query Analysis (Queries taking >100ms)
CREATE OR REPLACE VIEW slow_query_analysis AS
SELECT 
    query_id,
    left(query, 100) as query_preview,
    calls,
    total_exec_time,
    round(mean_exec_time::numeric, 2) as mean_exec_time_ms,
    round(stddev_exec_time::numeric, 2) as stddev_exec_time_ms,
    round(min_exec_time::numeric, 2) as min_exec_time_ms,
    round(max_exec_time::numeric, 2) as max_exec_time_ms,
    rows as total_rows,
    round((rows::numeric / calls), 2) as avg_rows_per_call,
    round((100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0))::numeric, 2) as cache_hit_percent,
    shared_blks_read as disk_reads,
    shared_blks_hit as cache_hits,
    round((total_exec_time * 100 / sum(total_exec_time) OVER ())::numeric, 2) as percent_total_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Only queries slower than 100ms
ORDER BY mean_exec_time DESC
LIMIT 50;

-- 3. Index Usage Statistics
CREATE OR REPLACE VIEW index_usage_analysis AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    pg_relation_size(indexrelid) as size_bytes,
    CASE 
        WHEN idx_scan = 0 THEN 'NEVER USED'
        WHEN idx_scan < 10 THEN 'RARELY USED'
        WHEN idx_scan < 100 THEN 'OCCASIONALLY USED'
        WHEN idx_scan < 1000 THEN 'FREQUENTLY USED'
        ELSE 'HEAVILY USED'
    END as usage_category,
    -- Calculate efficiency: tuples fetched vs read
    CASE 
        WHEN idx_tup_read > 0 THEN round((idx_tup_fetch::numeric / idx_tup_read) * 100, 2)
        ELSE 0 
    END as fetch_efficiency_percent
FROM pg_stat_user_indexes
WHERE pg_relation_size(indexrelid) > 0
ORDER BY idx_scan DESC, pg_relation_size(indexrelid) DESC;

-- 4. Table Statistics and Bloat Analysis
CREATE OR REPLACE VIEW table_analysis AS
WITH table_stats AS (
    SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        pg_total_relation_size(schemaname||'.'||tablename) as total_size_bytes,
        pg_relation_size(schemaname||'.'||tablename) as table_size_bytes
    FROM pg_stat_user_tables
)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(total_size_bytes) as total_size,
    pg_size_pretty(table_size_bytes) as table_size,
    pg_size_pretty(total_size_bytes - table_size_bytes) as indexes_size,
    inserts + updates + deletes as total_modifications,
    live_tuples,
    dead_tuples,
    CASE 
        WHEN live_tuples > 0 THEN round((dead_tuples::numeric / live_tuples) * 100, 2)
        ELSE 0 
    END as dead_tuple_percent,
    seq_scan,
    idx_scan,
    CASE 
        WHEN seq_scan + idx_scan > 0 THEN round((idx_scan::numeric / (seq_scan + idx_scan)) * 100, 2)
        ELSE 0 
    END as index_usage_percent,
    -- Table activity score (higher = more active)
    round(((inserts + updates + deletes)::numeric / GREATEST(live_tuples, 1)) * 100, 2) as activity_ratio
FROM table_stats
WHERE total_size_bytes > 0
ORDER BY total_size_bytes DESC;

-- 5. Connection Pool Monitoring
CREATE OR REPLACE VIEW connection_pool_status AS
SELECT 
    datname as database,
    usename as username,
    application_name,
    state,
    count(*) as connection_count,
    min(backend_start) as oldest_connection,
    max(backend_start) as newest_connection,
    avg(extract(epoch from (now() - backend_start))) as avg_connection_age_seconds
FROM pg_stat_activity 
WHERE pid != pg_backend_pid()  -- Exclude current connection
GROUP BY datname, usename, application_name, state
ORDER BY connection_count DESC;

-- 6. Lock Analysis
CREATE OR REPLACE VIEW lock_analysis AS
SELECT 
    l.locktype,
    l.mode,
    l.granted,
    count(*) as lock_count,
    array_agg(DISTINCT a.usename) as users,
    array_agg(DISTINCT a.application_name) as applications,
    min(a.query_start) as oldest_lock_time,
    max(a.query_start) as newest_lock_time
FROM pg_locks l
LEFT JOIN pg_stat_activity a ON l.pid = a.pid
GROUP BY l.locktype, l.mode, l.granted
ORDER BY lock_count DESC;

-- 7. Wait Events Analysis
CREATE OR REPLACE VIEW wait_events_analysis AS
SELECT 
    wait_event_type,
    wait_event,
    count(*) as session_count,
    array_agg(DISTINCT application_name) as applications,
    avg(extract(epoch from (now() - query_start))) as avg_wait_time_seconds,
    max(extract(epoch from (now() - query_start))) as max_wait_time_seconds
FROM pg_stat_activity 
WHERE wait_event IS NOT NULL
    AND state != 'idle'
GROUP BY wait_event_type, wait_event
ORDER BY session_count DESC;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION RECOMMENDATIONS
-- ============================================================================

-- 8. Missing Index Recommendations
CREATE OR REPLACE VIEW missing_index_recommendations AS
WITH foreign_keys AS (
    SELECT 
        conname as constraint_name,
        conrelid::regclass as table_name,
        a.attname as column_name,
        conkey[1] as column_attnum
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.contype = 'f'
),
existing_indexes AS (
    SELECT 
        i.indrelid::regclass as table_name,
        a.attname as column_name
    FROM pg_index i
    JOIN pg_attribute a ON a.attnum = i.indkey[0] AND a.attrelid = i.indrelid
    WHERE i.indkey[0] != 0
)
SELECT 
    fk.table_name,
    fk.column_name,
    'CREATE INDEX CONCURRENTLY idx_' || replace(fk.table_name::text, '.', '_') || '_' || fk.column_name || 
    ' ON ' || fk.table_name || '(' || fk.column_name || ');' as recommended_index,
    'Foreign key without supporting index' as reason,
    'HIGH' as priority
FROM foreign_keys fk
LEFT JOIN existing_indexes ei ON fk.table_name = ei.table_name AND fk.column_name = ei.column_name
WHERE ei.column_name IS NULL

UNION ALL

-- Recommend indexes for frequently scanned columns
SELECT 
    schemaname||'.'||tablename as table_name,
    'Multiple columns may benefit from composite indexes' as column_name,
    'ANALYZE table for composite index opportunities' as recommended_index,
    'High sequential scan ratio: ' || round((seq_scan::numeric / (seq_scan + idx_scan)) * 100, 2) || '%' as reason,
    CASE 
        WHEN seq_scan > 1000 THEN 'HIGH'
        WHEN seq_scan > 100 THEN 'MEDIUM' 
        ELSE 'LOW'
    END as priority
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan 
    AND seq_scan > 100
ORDER BY priority DESC, table_name;

-- 9. Query Optimization Opportunities
CREATE OR REPLACE VIEW query_optimization_opportunities AS
WITH query_stats AS (
    SELECT 
        query_id,
        left(query, 200) as query_text,
        calls,
        mean_exec_time,
        total_exec_time,
        shared_blks_read,
        shared_blks_hit,
        temp_blks_read,
        temp_blks_written,
        rows
    FROM pg_stat_statements
    WHERE calls > 10  -- Focus on frequently called queries
)
SELECT 
    query_id,
    query_text,
    calls,
    round(mean_exec_time::numeric, 2) as avg_time_ms,
    round(total_exec_time::numeric, 2) as total_time_ms,
    CASE 
        WHEN mean_exec_time > 1000 THEN 'CRITICAL: Very slow query (>1s)'
        WHEN mean_exec_time > 500 THEN 'HIGH: Slow query (>500ms)'
        WHEN mean_exec_time > 100 THEN 'MEDIUM: Moderate slow query (>100ms)'
        ELSE 'LOW: Query under 100ms'
    END as performance_issue,
    CASE 
        WHEN shared_blks_read > shared_blks_hit THEN 'Consider adding indexes to reduce disk reads'
        WHEN temp_blks_read > 0 THEN 'Query uses temporary files - increase work_mem or optimize'
        WHEN rows / calls > 1000 THEN 'Query returns many rows - consider pagination'
        ELSE 'Query performance appears acceptable'
    END as optimization_suggestion,
    round(((shared_blks_read * 100.0) / NULLIF(shared_blks_hit + shared_blks_read, 0))::numeric, 2) as disk_read_percent
FROM query_stats
ORDER BY 
    CASE 
        WHEN mean_exec_time > 1000 THEN 1
        WHEN mean_exec_time > 500 THEN 2
        WHEN mean_exec_time > 100 THEN 3
        ELSE 4
    END,
    total_exec_time DESC;

-- ============================================================================
-- HEALTH CHECK AND ALERTING QUERIES
-- ============================================================================

-- 10. Database Health Score
CREATE OR REPLACE VIEW database_health_score AS
WITH health_metrics AS (
    SELECT 
        -- Cache hit ratio (target: >95%)
        CASE 
            WHEN cache_hit_ratio >= 95 THEN 100
            WHEN cache_hit_ratio >= 90 THEN 80
            WHEN cache_hit_ratio >= 80 THEN 60
            ELSE 20
        END as cache_score,
        
        -- Query performance (target: avg <50ms)
        CASE 
            WHEN avg_query_time <= 50 THEN 100
            WHEN avg_query_time <= 100 THEN 80
            WHEN avg_query_time <= 200 THEN 60
            ELSE 20
        END as query_performance_score,
        
        -- Connection usage (target: <80% of max_connections)
        CASE 
            WHEN (active_connections + idle_connections)::numeric / 200 <= 0.8 THEN 100
            WHEN (active_connections + idle_connections)::numeric / 200 <= 0.9 THEN 80
            WHEN (active_connections + idle_connections)::numeric / 200 <= 0.95 THEN 60
            ELSE 20
        END as connection_score,
        
        -- Lock contention (target: 0 waiting locks)
        CASE 
            WHEN waiting_locks = 0 THEN 100
            WHEN waiting_locks <= 5 THEN 80
            WHEN waiting_locks <= 10 THEN 60
            ELSE 20
        END as lock_score,
        
        cache_hit_ratio,
        avg_query_time,
        active_connections + idle_connections as total_connections,
        waiting_locks
    FROM database_performance_overview
)
SELECT 
    round(((cache_score + query_performance_score + connection_score + lock_score) / 4.0)::numeric, 1) as overall_health_score,
    cache_score,
    query_performance_score, 
    connection_score,
    lock_score,
    cache_hit_ratio,
    avg_query_time,
    total_connections,
    waiting_locks,
    CASE 
        WHEN round(((cache_score + query_performance_score + connection_score + lock_score) / 4.0)::numeric, 1) >= 90 THEN 'EXCELLENT'
        WHEN round(((cache_score + query_performance_score + connection_score + lock_score) / 4.0)::numeric, 1) >= 80 THEN 'GOOD'
        WHEN round(((cache_score + query_performance_score + connection_score + lock_score) / 4.0)::numeric, 1) >= 70 THEN 'FAIR'
        WHEN round(((cache_score + query_performance_score + connection_score + lock_score) / 4.0)::numeric, 1) >= 60 THEN 'POOR'
        ELSE 'CRITICAL'
    END as health_status,
    CURRENT_TIMESTAMP as evaluated_at
FROM health_metrics;

-- 11. Alert Conditions Query
CREATE OR REPLACE VIEW database_alerts AS
SELECT 
    'Database Performance' as category,
    CASE 
        WHEN cache_hit_ratio_percent < 90 THEN 'CRITICAL: Cache hit ratio below 90%'
        WHEN cache_hit_ratio_percent < 95 THEN 'WARNING: Cache hit ratio below 95%'
        WHEN avg_query_time_ms > 200 THEN 'CRITICAL: Average query time above 200ms'
        WHEN avg_query_time_ms > 100 THEN 'WARNING: Average query time above 100ms'
        WHEN waiting_locks > 10 THEN 'CRITICAL: High lock contention'
        WHEN waiting_locks > 5 THEN 'WARNING: Lock contention detected'
        WHEN (active_connections + idle_connections)::numeric / 200 > 0.9 THEN 'CRITICAL: Connection pool near exhaustion'
        WHEN (active_connections + idle_connections)::numeric / 200 > 0.8 THEN 'WARNING: High connection usage'
        ELSE NULL
    END as alert_message,
    CASE 
        WHEN cache_hit_ratio_percent < 90 OR avg_query_time_ms > 200 OR waiting_locks > 10 
             OR (active_connections + idle_connections)::numeric / 200 > 0.9 THEN 'CRITICAL'
        WHEN cache_hit_ratio_percent < 95 OR avg_query_time_ms > 100 OR waiting_locks > 5 
             OR (active_connections + idle_connections)::numeric / 200 > 0.8 THEN 'WARNING'
        ELSE 'OK'
    END as severity,
    CURRENT_TIMESTAMP as alert_time
FROM database_performance_overview
WHERE cache_hit_ratio_percent < 95 
   OR avg_query_time_ms > 100 
   OR waiting_locks > 5
   OR (active_connections + idle_connections)::numeric / 200 > 0.8;

-- ============================================================================
-- SPECIFIC CANDLEFISH PLATFORM MONITORING
-- ============================================================================

-- 12. Service Performance Monitoring
CREATE OR REPLACE VIEW service_performance_monitoring AS
SELECT 
    s.id as service_id,
    s.name as service_name,
    s.group_name,
    s.status,
    COUNT(hm.id) as metric_count_1h,
    AVG(hm.cpu_usage) as avg_cpu_1h,
    AVG(hm.memory_usage) as avg_memory_1h,
    AVG(hm.response_time_ms) as avg_response_time_1h,
    MAX(hm.response_time_ms) as max_response_time_1h,
    COUNT(CASE WHEN hm.status_code >= 500 THEN 1 END) as error_count_1h,
    COUNT(CASE WHEN hm.status_code >= 400 AND hm.status_code < 500 THEN 1 END) as client_error_count_1h,
    s.health_check_failures,
    s.restart_count,
    -- Performance scoring
    CASE 
        WHEN AVG(hm.response_time_ms) <= 100 THEN 'EXCELLENT'
        WHEN AVG(hm.response_time_ms) <= 500 THEN 'GOOD'
        WHEN AVG(hm.response_time_ms) <= 1000 THEN 'FAIR'
        ELSE 'POOR'
    END as response_time_grade,
    CASE 
        WHEN COUNT(CASE WHEN hm.status_code >= 500 THEN 1 END) = 0 THEN 'EXCELLENT'
        WHEN COUNT(CASE WHEN hm.status_code >= 500 THEN 1 END) <= 5 THEN 'GOOD'
        WHEN COUNT(CASE WHEN hm.status_code >= 500 THEN 1 END) <= 20 THEN 'FAIR'
        ELSE 'POOR'
    END as error_rate_grade
FROM services s
LEFT JOIN health_metrics hm ON s.id = hm.service_id 
    AND hm.created_at > NOW() - INTERVAL '1 hour'
WHERE s.is_active = true
GROUP BY s.id, s.name, s.group_name, s.status, s.health_check_failures, s.restart_count
ORDER BY s.group_name, s.name;

-- 13. NANDA Agent Performance Monitoring
CREATE OR REPLACE VIEW nanda_agent_monitoring AS
SELECT 
    na.id as agent_id,
    na.name as agent_name,
    na.type,
    na.status,
    na.is_enabled,
    COUNT(ad.id) as decisions_24h,
    COUNT(CASE WHEN ad.success = true THEN 1 END) as successful_decisions_24h,
    CASE 
        WHEN COUNT(ad.id) > 0 
        THEN ROUND((COUNT(CASE WHEN ad.success = true THEN 1 END)::DECIMAL / COUNT(ad.id)) * 100, 2)
        ELSE NULL 
    END as success_rate_24h,
    AVG(ad.execution_time_ms) as avg_execution_time_24h,
    MAX(ad.execution_time_ms) as max_execution_time_24h,
    AVG(ad.confidence_score) as avg_confidence_24h,
    -- Agent health scoring
    CASE 
        WHEN na.last_heartbeat > NOW() - INTERVAL '2 minutes' THEN 'HEALTHY'
        WHEN na.last_heartbeat > NOW() - INTERVAL '5 minutes' THEN 'WARNING'
        ELSE 'CRITICAL'
    END as heartbeat_status,
    EXTRACT(EPOCH FROM (NOW() - na.last_heartbeat)) as seconds_since_heartbeat,
    -- Performance grade
    CASE 
        WHEN COUNT(ad.id) > 0 AND 
             COUNT(CASE WHEN ad.success = true THEN 1 END)::DECIMAL / COUNT(ad.id) >= 0.95 THEN 'EXCELLENT'
        WHEN COUNT(ad.id) > 0 AND 
             COUNT(CASE WHEN ad.success = true THEN 1 END)::DECIMAL / COUNT(ad.id) >= 0.90 THEN 'GOOD'
        WHEN COUNT(ad.id) > 0 AND 
             COUNT(CASE WHEN ad.success = true THEN 1 END)::DECIMAL / COUNT(ad.id) >= 0.80 THEN 'FAIR'
        WHEN COUNT(ad.id) > 0 THEN 'POOR'
        ELSE 'NO_DATA'
    END as performance_grade
FROM nanda_agents na
LEFT JOIN agent_decisions ad ON na.id = ad.agent_id 
    AND ad.created_at > NOW() - INTERVAL '24 hours'
GROUP BY na.id, na.name, na.type, na.status, na.is_enabled, na.last_heartbeat
ORDER BY na.type, na.name;

-- 14. User Session Monitoring
CREATE OR REPLACE VIEW user_session_monitoring AS
SELECT 
    u.id as user_id,
    u.username,
    u.role,
    COUNT(s.id) as active_sessions,
    MAX(s.last_activity) as last_activity,
    COUNT(ak.id) as active_api_keys,
    SUM(ak.usage_count) as total_api_usage,
    -- Recent activity
    COUNT(CASE WHEN s.last_activity > NOW() - INTERVAL '1 hour' THEN 1 END) as sessions_active_1h,
    COUNT(CASE WHEN s.last_activity > NOW() - INTERVAL '24 hours' THEN 1 END) as sessions_active_24h,
    -- Security metrics
    u.failed_login_attempts,
    u.locked_until,
    CASE 
        WHEN u.locked_until IS NOT NULL AND u.locked_until > NOW() THEN 'LOCKED'
        WHEN u.failed_login_attempts >= 5 THEN 'SUSPICIOUS'
        WHEN COUNT(s.id) > 10 THEN 'HIGH_USAGE'
        ELSE 'NORMAL'
    END as security_status
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id AND s.is_active = true
LEFT JOIN api_keys ak ON u.id = ak.user_id AND ak.is_active = true
WHERE u.is_active = true
GROUP BY u.id, u.username, u.role, u.failed_login_attempts, u.locked_until
ORDER BY active_sessions DESC, last_activity DESC;

-- ============================================================================
-- AUTOMATED PERFORMANCE FUNCTIONS
-- ============================================================================

-- 15. Function to collect performance metrics
CREATE OR REPLACE FUNCTION collect_performance_metrics()
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC,
    metric_unit TEXT,
    severity TEXT,
    collected_at TIMESTAMP
)
LANGUAGE plpgsql
AS $$
DECLARE
    cache_hit_ratio NUMERIC;
    avg_query_time NUMERIC;
    active_conns INTEGER;
    slow_queries INTEGER;
    waiting_locks INTEGER;
BEGIN
    -- Collect current metrics
    SELECT 
        COALESCE(dpo.cache_hit_ratio_percent, 0),
        COALESCE(dpo.avg_query_time_ms, 0),
        COALESCE(dpo.active_connections, 0),
        COALESCE(dpo.slow_queries_count, 0),
        COALESCE(dpo.waiting_locks, 0)
    INTO cache_hit_ratio, avg_query_time, active_conns, slow_queries, waiting_locks
    FROM database_performance_overview dpo;
    
    -- Return metrics with severity assessment
    RETURN QUERY
    SELECT 'cache_hit_ratio'::TEXT, cache_hit_ratio, 'percent'::TEXT,
           CASE WHEN cache_hit_ratio < 90 THEN 'CRITICAL'
                WHEN cache_hit_ratio < 95 THEN 'WARNING'
                ELSE 'OK' END::TEXT,
           CURRENT_TIMESTAMP
    UNION ALL
    SELECT 'avg_query_time'::TEXT, avg_query_time, 'milliseconds'::TEXT,
           CASE WHEN avg_query_time > 200 THEN 'CRITICAL'
                WHEN avg_query_time > 100 THEN 'WARNING'
                ELSE 'OK' END::TEXT,
           CURRENT_TIMESTAMP
    UNION ALL
    SELECT 'active_connections'::TEXT, active_conns::NUMERIC, 'count'::TEXT,
           CASE WHEN active_conns > 160 THEN 'CRITICAL'  -- 80% of 200
                WHEN active_conns > 140 THEN 'WARNING'   -- 70% of 200
                ELSE 'OK' END::TEXT,
           CURRENT_TIMESTAMP
    UNION ALL
    SELECT 'slow_queries_count'::TEXT, slow_queries::NUMERIC, 'count'::TEXT,
           CASE WHEN slow_queries > 50 THEN 'CRITICAL'
                WHEN slow_queries > 20 THEN 'WARNING'
                ELSE 'OK' END::TEXT,
           CURRENT_TIMESTAMP
    UNION ALL
    SELECT 'waiting_locks'::TEXT, waiting_locks::NUMERIC, 'count'::TEXT,
           CASE WHEN waiting_locks > 10 THEN 'CRITICAL'
                WHEN waiting_locks > 5 THEN 'WARNING'
                ELSE 'OK' END::TEXT,
           CURRENT_TIMESTAMP;
END;
$$;

-- 16. Function to identify performance bottlenecks
CREATE OR REPLACE FUNCTION identify_performance_bottlenecks()
RETURNS TABLE (
    bottleneck_type TEXT,
    description TEXT,
    severity TEXT,
    recommendation TEXT,
    query_example TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    -- Slow queries bottleneck
    SELECT 
        'SLOW_QUERIES'::TEXT,
        'Found ' || count(*)::TEXT || ' queries with mean execution time > 100ms'::TEXT,
        CASE WHEN count(*) > 50 THEN 'CRITICAL'
             WHEN count(*) > 20 THEN 'HIGH'
             WHEN count(*) > 10 THEN 'MEDIUM'
             ELSE 'LOW' END::TEXT,
        'Review and optimize slow queries using EXPLAIN ANALYZE'::TEXT,
        'EXPLAIN ANALYZE ' || left(max(query), 100)::TEXT
    FROM pg_stat_statements
    WHERE mean_exec_time > 100
    HAVING count(*) > 0
    
    UNION ALL
    
    -- Unused indexes bottleneck
    SELECT 
        'UNUSED_INDEXES'::TEXT,
        'Found ' || count(*)::TEXT || ' unused indexes consuming ' || 
        pg_size_pretty(sum(pg_relation_size(indexrelid)))::TEXT || ' of space'::TEXT,
        CASE WHEN sum(pg_relation_size(indexrelid)) > 100*1024*1024 THEN 'HIGH'  -- >100MB
             WHEN sum(pg_relation_size(indexrelid)) > 50*1024*1024 THEN 'MEDIUM'  -- >50MB
             ELSE 'LOW' END::TEXT,
        'Consider dropping unused indexes to improve write performance'::TEXT,
        'DROP INDEX CONCURRENTLY ' || string_agg(indexname, ', ')::TEXT
    FROM pg_stat_user_indexes
    WHERE idx_scan = 0 AND pg_relation_size(indexrelid) > 1024*1024  -- >1MB
    HAVING count(*) > 0
    
    UNION ALL
    
    -- High sequential scan bottleneck
    SELECT 
        'HIGH_SEQ_SCANS'::TEXT,
        'Tables with high sequential scan ratios may need indexes'::TEXT,
        'MEDIUM'::TEXT,
        'Analyze query patterns and add appropriate indexes'::TEXT,
        'CREATE INDEX ON table_name (frequently_queried_columns)'::TEXT
    FROM pg_stat_user_tables
    WHERE seq_scan > idx_scan AND seq_scan > 1000
    HAVING count(*) > 0
    LIMIT 1
    
    UNION ALL
    
    -- Connection pool pressure
    SELECT 
        'CONNECTION_PRESSURE'::TEXT,
        'Connection usage at ' || round(((active_connections + idle_connections)::NUMERIC / 200) * 100, 1)::TEXT || '%'::TEXT,
        CASE WHEN (active_connections + idle_connections)::NUMERIC / 200 > 0.9 THEN 'CRITICAL'
             WHEN (active_connections + idle_connections)::NUMERIC / 200 > 0.8 THEN 'HIGH'
             ELSE 'MEDIUM' END::TEXT,
        'Consider connection pooling optimization or increasing max_connections'::TEXT,
        'Review connection pooling configuration'::TEXT
    FROM database_performance_overview
    WHERE (active_connections + idle_connections)::NUMERIC / 200 > 0.7;
END;
$$;

-- 17. Function to generate optimization report
CREATE OR REPLACE FUNCTION generate_optimization_report()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    report TEXT := '';
    health_score NUMERIC;
    rec RECORD;
BEGIN
    -- Get overall health score
    SELECT overall_health_score INTO health_score FROM database_health_score;
    
    report := report || E'=== CANDLEFISH AI DATABASE OPTIMIZATION REPORT ===\n';
    report := report || 'Generated: ' || CURRENT_TIMESTAMP::TEXT || E'\n';
    report := report || 'Overall Health Score: ' || health_score::TEXT || '/100' || E'\n\n';
    
    -- Performance bottlenecks
    report := report || E'=== PERFORMANCE BOTTLENECKS ===\n';
    FOR rec IN SELECT * FROM identify_performance_bottlenecks() ORDER BY 
        CASE severity 
            WHEN 'CRITICAL' THEN 1 
            WHEN 'HIGH' THEN 2 
            WHEN 'MEDIUM' THEN 3 
            ELSE 4 
        END
    LOOP
        report := report || '[' || rec.severity || '] ' || rec.bottleneck_type || ': ' || rec.description || E'\n';
        report := report || '  Recommendation: ' || rec.recommendation || E'\n';
        IF rec.query_example IS NOT NULL THEN
            report := report || '  Example: ' || rec.query_example || E'\n';
        END IF;
        report := report || E'\n';
    END LOOP;
    
    -- Top slow queries
    report := report || E'=== TOP 5 SLOW QUERIES ===\n';
    FOR rec IN SELECT * FROM slow_query_analysis LIMIT 5
    LOOP
        report := report || '• Query ID: ' || rec.query_id::TEXT || E'\n';
        report := report || '  Average Time: ' || rec.mean_exec_time_ms::TEXT || 'ms' || E'\n';
        report := report || '  Calls: ' || rec.calls::TEXT || E'\n';
        report := report || '  Preview: ' || rec.query_preview || E'\n\n';
    END LOOP;
    
    -- Index recommendations
    report := report || E'=== INDEX RECOMMENDATIONS ===\n';
    FOR rec IN SELECT * FROM missing_index_recommendations WHERE priority = 'HIGH' LIMIT 5
    LOOP
        report := report || '• [' || rec.priority || '] ' || rec.table_name::TEXT || E'\n';
        report := report || '  Reason: ' || rec.reason || E'\n';
        report := report || '  SQL: ' || rec.recommended_index || E'\n\n';
    END LOOP;
    
    report := report || E'=== END REPORT ===\n';
    
    RETURN report;
END;
$$;

-- ============================================================================
-- MONITORING DASHBOARD QUERIES
-- ============================================================================

-- 18. Real-time dashboard metrics (for API endpoints)
CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT 
    json_build_object(
        'database_health', (SELECT row_to_json(dhs) FROM database_health_score dhs),
        'performance_overview', (SELECT row_to_json(dpo) FROM database_performance_overview dpo),
        'service_performance', (SELECT array_agg(row_to_json(spm)) FROM service_performance_monitoring spm),
        'agent_performance', (SELECT array_agg(row_to_json(nam)) FROM nanda_agent_monitoring nam),
        'active_alerts', (SELECT array_agg(row_to_json(da)) FROM database_alerts da WHERE severity IN ('CRITICAL', 'WARNING')),
        'connection_pool', (SELECT array_agg(row_to_json(cps)) FROM connection_pool_status cps),
        'timestamp', CURRENT_TIMESTAMP
    ) as metrics_json;

-- Grant permissions for monitoring
DO $$
BEGIN
    -- Create monitoring user if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'candlefish_monitor') THEN
        CREATE USER candlefish_monitor WITH PASSWORD 'monitor_password_change_me';
    END IF;
    
    -- Grant necessary permissions
    GRANT CONNECT ON DATABASE current_database() TO candlefish_monitor;
    GRANT USAGE ON SCHEMA public TO candlefish_monitor;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO candlefish_monitor;
    GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO candlefish_monitor;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO candlefish_monitor;
    
    -- Grant access to system views
    GRANT pg_monitor TO candlefish_monitor;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Database Monitoring Queries Setup COMPLETED';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Available monitoring views:';
    RAISE NOTICE '• database_performance_overview - Real-time performance metrics';
    RAISE NOTICE '• slow_query_analysis - Identify slow queries';
    RAISE NOTICE '• index_usage_analysis - Index efficiency analysis';
    RAISE NOTICE '• table_analysis - Table statistics and bloat';
    RAISE NOTICE '• database_health_score - Overall health scoring';
    RAISE NOTICE '• service_performance_monitoring - Service-specific metrics';
    RAISE NOTICE '• nanda_agent_monitoring - Agent performance tracking';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Monitoring functions:';
    RAISE NOTICE '• SELECT * FROM collect_performance_metrics();';
    RAISE NOTICE '• SELECT * FROM identify_performance_bottlenecks();';
    RAISE NOTICE '• SELECT generate_optimization_report();';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Dashboard endpoint: SELECT * FROM dashboard_metrics;';
    RAISE NOTICE '============================================================================';
END $$;