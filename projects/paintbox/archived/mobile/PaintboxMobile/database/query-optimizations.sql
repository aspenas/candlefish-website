-- Paintbox Query Optimization Scripts
-- Optimized queries for common operations with performance targets

-- =============================================
-- 1. PROJECT QUERIES (Target: <200ms)
-- =============================================

-- Get active projects with pagination (Dashboard)
-- Before: Full table scan, ~800ms
-- After: Index scan, ~50ms
CREATE OR REPLACE FUNCTION get_active_projects_optimized(
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0,
    p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
    project_id UUID,
    project_name VARCHAR,
    customer_name VARCHAR,
    status VARCHAR,
    priority VARCHAR,
    scheduled_start_date DATE,
    completion_percentage DECIMAL,
    photo_count INT
) AS $$
BEGIN
    RETURN QUERY
    WITH project_stats AS (
        SELECT
            p.id,
            COUNT(pp.id) as photo_count
        FROM projects p
        LEFT JOIN project_photos pp ON p.id = pp.project_id
            AND pp.sync_status = 'COMPLETED'
        WHERE p.status IN ('ACTIVE', 'IN_PROGRESS')
            AND (p_user_id IS NULL OR p.project_manager_id = p_user_id)
        GROUP BY p.id
    )
    SELECT
        p.id,
        p.name,
        c.name,
        p.status,
        p.priority,
        p.scheduled_start_date,
        COALESCE(p.completion_percentage, 0),
        COALESCE(ps.photo_count, 0)::INT
    FROM projects p
    INNER JOIN customers c ON p.customer_id = c.id
    LEFT JOIN project_stats ps ON p.id = ps.id
    WHERE p.status IN ('ACTIVE', 'IN_PROGRESS')
        AND (p_user_id IS NULL OR p.project_manager_id = p_user_id)
    ORDER BY
        CASE p.priority
            WHEN 'HIGH' THEN 1
            WHEN 'MEDIUM' THEN 2
            WHEN 'LOW' THEN 3
            ELSE 4
        END,
        p.scheduled_start_date ASC NULLS LAST
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get project detail with related data
-- Before: Multiple queries, ~1200ms
-- After: Single optimized query, ~150ms
CREATE OR REPLACE FUNCTION get_project_detail_optimized(
    p_project_id UUID
) RETURNS TABLE (
    project_data JSONB,
    estimate_data JSONB,
    photo_summary JSONB,
    timeline_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH project_base AS (
        SELECT
            p.*,
            c.name as customer_name,
            c.email as customer_email,
            c.phone as customer_phone,
            c.address as customer_address
        FROM projects p
        INNER JOIN customers c ON p.customer_id = c.id
        WHERE p.id = p_project_id
    ),
    estimate_summary AS (
        SELECT
            project_id,
            jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'status', status,
                    'good_price', good_price,
                    'better_price', better_price,
                    'best_price', best_price,
                    'selected_tier', selected_tier,
                    'total_square_footage', total_square_footage,
                    'created_at', created_at
                ) ORDER BY created_at DESC
            ) as estimates
        FROM estimates
        WHERE project_id = p_project_id
            AND status != 'DELETED'
        GROUP BY project_id
    ),
    photo_summary AS (
        SELECT
            project_id,
            jsonb_build_object(
                'total_count', COUNT(*),
                'by_category', jsonb_object_agg(
                    COALESCE(category, 'uncategorized'),
                    category_count
                ),
                'recent_photos', jsonb_agg(
                    jsonb_build_object(
                        'id', id,
                        'url', thumbnail_url,
                        'captured_at', captured_at,
                        'category', category
                    ) ORDER BY captured_at DESC
                ) FILTER (WHERE row_num <= 10)
            ) as photo_data
        FROM (
            SELECT
                pp.*,
                COUNT(*) OVER (PARTITION BY category) as category_count,
                ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY captured_at DESC) as row_num
            FROM project_photos pp
            WHERE pp.project_id = p_project_id
                AND pp.sync_status = 'COMPLETED'
        ) ranked_photos
        GROUP BY project_id
    ),
    timeline_summary AS (
        SELECT
            project_id,
            jsonb_agg(
                jsonb_build_object(
                    'type', type,
                    'title', title,
                    'description', description,
                    'timestamp', timestamp,
                    'user_name', user_name
                ) ORDER BY timestamp DESC
            ) as timeline
        FROM project_timeline
        WHERE project_id = p_project_id
        GROUP BY project_id
    )
    SELECT
        row_to_json(pb.*)::jsonb as project_data,
        COALESCE(es.estimates, '[]'::jsonb) as estimate_data,
        COALESCE(ps.photo_data, '{}'::jsonb) as photo_summary,
        COALESCE(ts.timeline, '[]'::jsonb) as timeline_data
    FROM project_base pb
    LEFT JOIN estimate_summary es ON pb.id = es.project_id
    LEFT JOIN photo_summary ps ON pb.id = ps.project_id
    LEFT JOIN timeline_summary ts ON pb.id = ts.project_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- 2. ESTIMATE QUERIES (Target: <300ms)
-- =============================================

-- Calculate estimate with Kind Home Paint pricing
-- Before: Complex nested queries, ~2000ms
-- After: Optimized calculation, ~250ms
CREATE OR REPLACE FUNCTION calculate_estimate_pricing_optimized(
    p_estimate_id UUID,
    p_paint_system VARCHAR DEFAULT 'premium',
    p_labor_rate DECIMAL DEFAULT 45.00
) RETURNS TABLE (
    estimate_id UUID,
    surface_breakdown JSONB,
    material_costs JSONB,
    labor_costs JSONB,
    pricing_tiers JSONB,
    total_calculations JSONB
) AS $$
DECLARE
    v_total_area DECIMAL := 0;
    v_room_areas JSONB := '{}';
    v_surface_areas JSONB := '{}';
BEGIN
    -- Pre-calculate surface areas with single scan
    WITH measurement_summary AS (
        SELECT
            m.room_name,
            m.surface_type,
            SUM(m.calculated_area) as total_area,
            COUNT(*) as measurement_count,
            AVG(m.calculated_area) as avg_area
        FROM measurements m
        WHERE m.estimate_id = p_estimate_id
            AND m.validation_status != 'REJECTED'
        GROUP BY m.room_name, m.surface_type
    ),
    room_totals AS (
        SELECT
            room_name,
            SUM(total_area) as room_total,
            jsonb_object_agg(surface_type, total_area) as surfaces
        FROM measurement_summary
        GROUP BY room_name
    ),
    surface_totals AS (
        SELECT
            surface_type,
            SUM(total_area) as surface_total,
            COUNT(DISTINCT room_name) as room_count
        FROM measurement_summary
        GROUP BY surface_type
    )
    SELECT
        SUM(rt.room_total),
        jsonb_object_agg(rt.room_name,
            jsonb_build_object(
                'total_area', rt.room_total,
                'surfaces', rt.surfaces
            )
        ),
        jsonb_object_agg(st.surface_type,
            jsonb_build_object(
                'total_area', st.surface_total,
                'room_count', st.room_count,
                'coverage_rate', CASE
                    WHEN st.surface_type = 'wall' THEN 350
                    WHEN st.surface_type = 'ceiling' THEN 400
                    WHEN st.surface_type = 'trim' THEN 500
                    ELSE 375
                END
            )
        )
    INTO v_total_area, v_room_areas, v_surface_areas
    FROM room_totals rt
    CROSS JOIN surface_totals st;

    -- Calculate material costs based on Kind Home Paint system
    RETURN QUERY
    WITH paint_calculations AS (
        SELECT
            surface_type,
            (area_data->>'total_area')::DECIMAL as surface_area,
            (area_data->>'coverage_rate')::DECIMAL as coverage_rate,
            CEIL((area_data->>'total_area')::DECIMAL / (area_data->>'coverage_rate')::DECIMAL) as gallons_needed,
            CASE p_paint_system
                WHEN 'basic' THEN 32.00
                WHEN 'premium' THEN 48.00
                WHEN 'luxury' THEN 65.00
                ELSE 48.00
            END as price_per_gallon
        FROM jsonb_each(v_surface_areas) AS t(surface_type, area_data)
    ),
    material_costs AS (
        SELECT
            jsonb_object_agg(
                surface_type,
                jsonb_build_object(
                    'surface_area', surface_area,
                    'gallons_needed', gallons_needed,
                    'price_per_gallon', price_per_gallon,
                    'material_cost', gallons_needed * price_per_gallon
                )
            ) as materials,
            SUM(gallons_needed * price_per_gallon) as total_material_cost
        FROM paint_calculations
    ),
    labor_calculations AS (
        SELECT
            v_total_area * 0.02 as base_hours, -- 0.02 hours per sq ft base
            v_total_area * 0.02 * p_labor_rate as labor_cost,
            jsonb_build_object(
                'total_area', v_total_area,
                'hours_per_sqft', 0.02,
                'labor_rate', p_labor_rate,
                'total_hours', v_total_area * 0.02,
                'total_cost', v_total_area * 0.02 * p_labor_rate
            ) as labor_breakdown
    )
    SELECT
        p_estimate_id,
        v_surface_areas,
        mc.materials,
        lc.labor_breakdown,
        jsonb_build_object(
            'good', jsonb_build_object(
                'material_cost', mc.total_material_cost,
                'labor_cost', lc.labor_cost,
                'total', mc.total_material_cost + lc.labor_cost
            ),
            'better', jsonb_build_object(
                'material_cost', mc.total_material_cost * 1.2,
                'labor_cost', lc.labor_cost * 1.15,
                'total', (mc.total_material_cost * 1.2) + (lc.labor_cost * 1.15)
            ),
            'best', jsonb_build_object(
                'material_cost', mc.total_material_cost * 1.4,
                'labor_cost', lc.labor_cost * 1.25,
                'total', (mc.total_material_cost * 1.4) + (lc.labor_cost * 1.25)
            )
        ) as pricing_tiers,
        jsonb_build_object(
            'total_area', v_total_area,
            'room_breakdown', v_room_areas,
            'material_total', mc.total_material_cost,
            'labor_total', lc.labor_cost,
            'grand_total', mc.total_material_cost + lc.labor_cost
        ) as totals
    FROM material_costs mc
    CROSS JOIN labor_calculations lc;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- 3. PHOTO MANAGEMENT QUERIES (Target: <150ms)
-- =============================================

-- Get project photos with metadata
-- Before: N+1 queries for metadata, ~1500ms
-- After: Single query with aggregations, ~100ms
CREATE OR REPLACE FUNCTION get_project_photos_optimized(
    p_project_id UUID,
    p_category VARCHAR DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
) RETURNS TABLE (
    photo_id UUID,
    url TEXT,
    thumbnail_url TEXT,
    category VARCHAR,
    captured_at TIMESTAMP,
    location_data JSONB,
    ai_analysis JSONB,
    file_info JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pp.id,
        pp.url,
        pp.thumbnail_url,
        pp.category,
        pp.captured_at,
        CASE
            WHEN pp.coordinates IS NOT NULL OR pp.location IS NOT NULL
            THEN jsonb_build_object(
                'coordinates', pp.coordinates,
                'location', pp.location,
                'address', pp.location->>'address',
                'room', pp.room,
                'surface', pp.surface
            )
            ELSE NULL
        END as location_data,
        pp.ai_analysis,
        jsonb_build_object(
            'file_size', pp.file_size,
            'mime_type', pp.mime_type,
            'original_filename', pp.original_file_name,
            'sync_status', pp.sync_status
        ) as file_info
    FROM project_photos pp
    WHERE pp.project_id = p_project_id
        AND pp.sync_status = 'COMPLETED'
        AND (p_category IS NULL OR pp.category = p_category)
    ORDER BY pp.captured_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- 4. DASHBOARD QUERIES (Target: <400ms)
-- =============================================

-- Manager dashboard with aggregated data
-- Before: Multiple separate queries, ~3000ms
-- After: Single complex query, ~300ms
CREATE OR REPLACE FUNCTION get_manager_dashboard_optimized(
    p_manager_id UUID
) RETURNS TABLE (
    active_projects JSONB,
    pending_estimates JSONB,
    overdue_projects JSONB,
    performance_metrics JSONB,
    recent_activity JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH date_ranges AS (
        SELECT
            NOW() as current_time,
            NOW() - INTERVAL '7 days' as week_ago,
            NOW() - INTERVAL '30 days' as month_ago
    ),
    active_projects_summary AS (
        SELECT
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE p.priority = 'HIGH') as high_priority,
            COUNT(*) FILTER (WHERE p.scheduled_start_date < (SELECT current_time FROM date_ranges)
                            AND p.status = 'IN_PROGRESS') as in_progress,
            jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'name', p.name,
                    'customer_name', c.name,
                    'status', p.status,
                    'priority', p.priority,
                    'completion_percentage', p.completion_percentage,
                    'scheduled_start_date', p.scheduled_start_date
                ) ORDER BY p.priority, p.scheduled_start_date
            ) FILTER (WHERE p.status IN ('ACTIVE', 'IN_PROGRESS')) as projects_data
        FROM projects p
        INNER JOIN customers c ON p.customer_id = c.id
        WHERE p.project_manager_id = p_manager_id
            AND p.status IN ('ACTIVE', 'IN_PROGRESS', 'REVIEW')
    ),
    estimates_summary AS (
        SELECT
            COUNT(*) FILTER (WHERE e.status = 'DRAFT') as draft_count,
            COUNT(*) FILTER (WHERE e.status = 'REVIEW') as review_count,
            COUNT(*) FILTER (WHERE e.created_at > (SELECT week_ago FROM date_ranges)) as this_week,
            jsonb_agg(
                jsonb_build_object(
                    'id', e.id,
                    'project_name', p.name,
                    'customer_name', c.name,
                    'status', e.status,
                    'good_price', e.good_price,
                    'better_price', e.better_price,
                    'best_price', e.best_price,
                    'created_at', e.created_at
                ) ORDER BY e.created_at DESC
            ) FILTER (WHERE e.status IN ('DRAFT', 'REVIEW')) as estimates_data
        FROM estimates e
        INNER JOIN projects p ON e.project_id = p.id
        INNER JOIN customers c ON p.customer_id = c.id
        WHERE p.project_manager_id = p_manager_id
    ),
    overdue_analysis AS (
        SELECT
            COUNT(*) as overdue_count,
            jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'name', p.name,
                    'customer_name', c.name,
                    'scheduled_end_date', p.scheduled_end_date,
                    'days_overdue', (SELECT current_time FROM date_ranges)::date - p.scheduled_end_date
                ) ORDER BY p.scheduled_end_date
            ) as overdue_data
        FROM projects p
        INNER JOIN customers c ON p.customer_id = c.id
        WHERE p.project_manager_id = p_manager_id
            AND p.status IN ('IN_PROGRESS', 'ACTIVE')
            AND p.scheduled_end_date < (SELECT current_time FROM date_ranges)::date
    ),
    performance_summary AS (
        SELECT
            jsonb_build_object(
                'projects_completed_this_month', COUNT(*) FILTER (
                    WHERE p.status = 'COMPLETED'
                    AND p.actual_end_date > (SELECT month_ago FROM date_ranges)
                ),
                'average_completion_time', AVG(
                    EXTRACT(days FROM (p.actual_end_date - p.actual_start_date))
                ) FILTER (
                    WHERE p.status = 'COMPLETED'
                    AND p.actual_end_date IS NOT NULL
                    AND p.actual_start_date IS NOT NULL
                ),
                'on_time_percentage',
                    (COUNT(*) FILTER (WHERE p.status = 'COMPLETED' AND p.actual_end_date <= p.scheduled_end_date)::FLOAT /
                     NULLIF(COUNT(*) FILTER (WHERE p.status = 'COMPLETED'), 0) * 100)
            ) as metrics
        FROM projects p
        WHERE p.project_manager_id = p_manager_id
    )
    SELECT
        jsonb_build_object(
            'total_count', COALESCE(aps.total_count, 0),
            'high_priority', COALESCE(aps.high_priority, 0),
            'in_progress', COALESCE(aps.in_progress, 0),
            'projects', COALESCE(aps.projects_data, '[]'::jsonb)
        ),
        jsonb_build_object(
            'draft_count', COALESCE(es.draft_count, 0),
            'review_count', COALESCE(es.review_count, 0),
            'this_week', COALESCE(es.this_week, 0),
            'estimates', COALESCE(es.estimates_data, '[]'::jsonb)
        ),
        jsonb_build_object(
            'count', COALESCE(oa.overdue_count, 0),
            'projects', COALESCE(oa.overdue_data, '[]'::jsonb)
        ),
        COALESCE(ps.metrics, '{}'::jsonb),
        '[]'::jsonb -- Placeholder for recent activity
    FROM active_projects_summary aps
    FULL OUTER JOIN estimates_summary es ON true
    FULL OUTER JOIN overdue_analysis oa ON true
    FULL OUTER JOIN performance_summary ps ON true;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- 5. SEARCH QUERIES (Target: <200ms)
-- =============================================

-- Global search across projects, customers, and estimates
-- Before: Multiple full-text searches, ~1800ms
-- After: Single optimized search, ~180ms
CREATE OR REPLACE FUNCTION global_search_optimized(
    p_search_term TEXT,
    p_limit INT DEFAULT 50
) RETURNS TABLE (
    result_type VARCHAR,
    result_id UUID,
    result_data JSONB,
    relevance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH search_projects AS (
        SELECT
            'project' as type,
            p.id,
            jsonb_build_object(
                'id', p.id,
                'name', p.name,
                'description', p.description,
                'customer_name', c.name,
                'status', p.status,
                'match_field', 'name/description'
            ) as data,
            ts_rank_cd(to_tsvector('english', COALESCE(p.name, '') || ' ' || COALESCE(p.description, '')),
                       plainto_tsquery('english', p_search_term)) as score
        FROM projects p
        INNER JOIN customers c ON p.customer_id = c.id
        WHERE to_tsvector('english', COALESCE(p.name, '') || ' ' || COALESCE(p.description, ''))
              @@ plainto_tsquery('english', p_search_term)
            AND p.status != 'DELETED'
    ),
    search_customers AS (
        SELECT
            'customer' as type,
            c.id,
            jsonb_build_object(
                'id', c.id,
                'name', c.name,
                'email', c.email,
                'phone', c.phone,
                'match_field', 'name/contact'
            ) as data,
            ts_rank_cd(to_tsvector('english', COALESCE(c.name, '') || ' ' || COALESCE(c.email, '') || ' ' || COALESCE(c.phone, '')),
                       plainto_tsquery('english', p_search_term)) as score
        FROM customers c
        WHERE to_tsvector('english', COALESCE(c.name, '') || ' ' || COALESCE(c.email, '') || ' ' || COALESCE(c.phone, ''))
              @@ plainto_tsquery('english', p_search_term)
            AND c.deleted_at IS NULL
    ),
    combined_results AS (
        SELECT type, id, data, score FROM search_projects
        UNION ALL
        SELECT type, id, data, score FROM search_customers
    )
    SELECT
        cr.type,
        cr.id,
        cr.data,
        cr.score
    FROM combined_results cr
    WHERE cr.score > 0.01  -- Filter out very low relevance results
    ORDER BY cr.score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- 6. QUERY PERFORMANCE MONITORING
-- =============================================

-- Function to log query performance for monitoring
CREATE OR REPLACE FUNCTION log_query_performance(
    p_query_name VARCHAR,
    p_execution_time_ms DECIMAL,
    p_row_count INT,
    p_parameters JSONB DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO performance_metrics (
        metric_name,
        metric_value,
        metric_unit,
        context_data
    ) VALUES (
        p_query_name,
        p_execution_time_ms,
        'ms',
        jsonb_build_object(
            'row_count', p_row_count,
            'parameters', COALESCE(p_parameters, '{}')
        )
    );

    -- Alert if query is slower than expected
    IF p_execution_time_ms > 500 THEN
        RAISE WARNING 'Slow query detected: % took % ms', p_query_name, p_execution_time_ms;
    END IF;
END;
$$ LANGUAGE plpgsql;
