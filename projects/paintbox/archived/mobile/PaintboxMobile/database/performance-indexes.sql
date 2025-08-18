-- Paintbox Performance Optimization - Database Indexes
-- This script creates optimized indexes for the Paintbox paint estimation system
-- Target: <200ms simple queries, <500ms complex federated queries

-- =============================================
-- Project Table Optimizations
-- =============================================

-- Primary project lookup by ID (already exists as PK, but ensure it's optimal)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_id_optimized
ON projects USING btree (id)
WITH (FILLFACTOR = 90);

-- Project status filtering (very common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status_created_at
ON projects USING btree (status, created_at DESC)
WHERE status IN ('ACTIVE', 'IN_PROGRESS', 'REVIEW', 'COMPLETED');

-- Customer projects lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_customer_status
ON projects USING btree (customer_id, status, scheduled_start_date)
WHERE status != 'DELETED';

-- Date-based project queries (scheduling, reporting)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_date_range
ON projects USING btree (scheduled_start_date, scheduled_end_date)
WHERE scheduled_start_date IS NOT NULL;

-- Overdue projects identification
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_overdue
ON projects USING btree (scheduled_end_date, status)
WHERE status IN ('IN_PROGRESS', 'ACTIVE') AND scheduled_end_date < NOW();

-- Project manager assignments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_manager
ON projects USING btree (project_manager_id, status, priority)
WHERE project_manager_id IS NOT NULL;

-- Location-based project search (service address)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_location_gin
ON projects USING gin ((service_address->'coordinates'))
WHERE service_address->'coordinates' IS NOT NULL;

-- Full-text search on project name and description
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_search
ON projects USING gin (to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')));

-- =============================================
-- Estimates Table Optimizations
-- =============================================

-- Estimate lookups by project
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_project_status
ON estimates USING btree (project_id, status, created_at DESC);

-- Customer estimates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_customer
ON estimates USING btree (customer_id, status, created_at DESC)
WHERE customer_id IS NOT NULL;

-- Pricing tier analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_pricing_analysis
ON estimates USING btree (selected_tier, total_square_footage, material_cost)
WHERE selected_tier IS NOT NULL;

-- Estimate status workflow
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_workflow
ON estimates USING btree (status, created_by, updated_at DESC)
WHERE status IN ('DRAFT', 'REVIEW', 'APPROVED', 'SENT');

-- Labor hours analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_labor_analysis
ON estimates USING btree (labor_hours, total_square_footage)
WHERE labor_hours > 0 AND total_square_footage > 0;

-- =============================================
-- Project Photos Table Optimizations
-- =============================================

-- Photos by project (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_photos_project_category
ON project_photos USING btree (project_id, category, captured_at DESC);

-- CompanyCam integration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_photos_company_cam
ON project_photos USING btree (company_cam_id, sync_status)
WHERE company_cam_id IS NOT NULL;

-- Photo sync status monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_photos_sync_status
ON project_photos USING btree (sync_status, uploaded_at)
WHERE sync_status IN ('PENDING', 'UPLOADING', 'FAILED');

-- Photo location search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_photos_location
ON project_photos USING btree (project_id, phase, room, surface)
WHERE phase IS NOT NULL OR room IS NOT NULL;

-- File management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_photos_file_info
ON project_photos USING btree (file_size, mime_type, captured_at DESC);

-- AI analysis results
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_photos_ai_analysis
ON project_photos USING gin (ai_analysis)
WHERE ai_analysis IS NOT NULL;

-- =============================================
-- Measurements Table Optimizations
-- =============================================

-- Measurements by estimate (primary use case)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurements_estimate
ON measurements USING btree (estimate_id, created_at DESC);

-- Surface area calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurements_surface_area
ON measurements USING btree (estimate_id, surface_type, calculated_area DESC)
WHERE calculated_area > 0;

-- Room-based measurements
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurements_room
ON measurements USING btree (estimate_id, room_name, surface_type);

-- Measurement validation status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurements_validation
ON measurements USING btree (validation_status, created_at)
WHERE validation_status IN ('PENDING', 'VALIDATED', 'FLAGGED');

-- Kind Home Paint integration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurements_paint_calculation
ON measurements USING btree (estimate_id, paint_calculation_id)
WHERE paint_calculation_id IS NOT NULL;

-- =============================================
-- Customers Table Optimizations
-- =============================================

-- Customer search by name and contact info
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_search
ON customers USING gin (to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '')));

-- Customer address lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_address_gin
ON customers USING gin (address)
WHERE address IS NOT NULL;

-- Active customer status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_active
ON customers USING btree (created_at DESC, updated_at DESC)
WHERE deleted_at IS NULL;

-- =============================================
-- Audit and Timeline Tables
-- =============================================

-- Project timeline by project
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_timeline_project_type
ON project_timeline USING btree (project_id, type, timestamp DESC);

-- Activity logs by user and timestamp
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_user_timestamp
ON activity_logs USING btree (user_id, timestamp DESC)
WHERE user_id IS NOT NULL;

-- =============================================
-- Performance Monitoring Tables
-- =============================================

-- Performance metrics table (for monitoring)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,3) NOT NULL,
    metric_unit VARCHAR(20) DEFAULT 'ms',
    context_data JSONB,
    recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_name_time
ON performance_metrics USING btree (metric_name, recorded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_context
ON performance_metrics USING gin (context_data)
WHERE context_data IS NOT NULL;

-- =============================================
-- Composite Indexes for Complex Queries
-- =============================================

-- Dashboard overview queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_dashboard
ON projects USING btree (status, priority, scheduled_start_date)
WHERE status IN ('ACTIVE', 'IN_PROGRESS')
  AND scheduled_start_date BETWEEN NOW() AND NOW() + INTERVAL '30 days';

-- Manager workflow queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_manager_review
ON estimates USING btree (status, good_price DESC, better_price DESC, best_price DESC)
WHERE status = 'REVIEW';

-- Photo gallery optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_gallery
ON project_photos USING btree (project_id, category, captured_at DESC, id)
WHERE category IS NOT NULL;

-- Measurement summary calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurements_summary
ON measurements USING btree (estimate_id)
INCLUDE (calculated_area, surface_type, room_name);

-- =============================================
-- Partial Indexes for Better Performance
-- =============================================

-- Only index active/relevant records to save space and improve performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_active_only
ON projects USING btree (customer_id, created_at DESC)
WHERE status != 'DELETED' AND status != 'CANCELLED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_valid_only
ON estimates USING btree (project_id, updated_at DESC)
WHERE status != 'DELETED' AND total_square_footage > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_synced_only
ON project_photos USING btree (project_id, captured_at DESC)
WHERE sync_status = 'COMPLETED' AND url IS NOT NULL;

-- =============================================
-- Statistics and Maintenance
-- =============================================

-- Update table statistics for better query planning
ANALYZE projects;
ANALYZE estimates;
ANALYZE project_photos;
ANALYZE measurements;
ANALYZE customers;

-- Create function to monitor slow queries
CREATE OR REPLACE FUNCTION log_slow_query_performance() RETURNS void AS $$
BEGIN
    -- Log queries taking longer than 200ms
    INSERT INTO performance_metrics (metric_name, metric_value, context_data)
    SELECT
        'slow_query' as metric_name,
        (total_exec_time / calls) as metric_value,
        jsonb_build_object(
            'query', query,
            'calls', calls,
            'total_time', total_exec_time,
            'mean_time', mean_exec_time
        ) as context_data
    FROM pg_stat_statements
    WHERE (total_exec_time / calls) > 200  -- queries slower than 200ms
      AND calls > 10  -- with significant usage
    ORDER BY (total_exec_time / calls) DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Index Maintenance Commands
-- =============================================

-- Commands to run periodically for index maintenance:

-- 1. Update statistics (run weekly):
-- ANALYZE;

-- 2. Rebuild indexes if fragmented (check monthly):
-- REINDEX INDEX CONCURRENTLY idx_name;

-- 3. Monitor index usage:
-- SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_tup_read + idx_tup_fetch DESC;

-- 4. Find unused indexes:
-- SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE idx_tup_read = 0 AND idx_tup_fetch = 0;

-- 5. Monitor query performance:
-- SELECT log_slow_query_performance();
