-- Add sample health metrics for running services
-- Generate realistic metrics for the last 24 hours

-- Function to generate random metrics for a service
DO $$
DECLARE
    service_record RECORD;
    metric_time TIMESTAMP;
    hours_back INTEGER;
BEGIN
    -- Loop through all running services
    FOR service_record IN 
        SELECT id, name FROM services WHERE status = 'running'
    LOOP
        -- Generate metrics for the last 24 hours (one per hour)
        FOR hours_back IN 0..23 LOOP
            metric_time := NOW() - (hours_back || ' hours')::INTERVAL;
            
            INSERT INTO health_metrics (
                service_id, 
                metric_type, 
                metric_value,
                cpu_usage,
                memory_usage,
                disk_usage,
                network_in,
                network_out,
                request_count,
                error_count,
                response_time_p50,
                response_time_p95,
                response_time_p99,
                timestamp
            ) VALUES (
                service_record.id,
                'system',
                jsonb_build_object(
                    'status', 'healthy',
                    'uptime_seconds', (24 - hours_back) * 3600,
                    'version', '2.0.0'
                ),
                -- CPU usage (varies by service type)
                CASE 
                    WHEN service_record.name LIKE '%ai%' THEN 30 + random() * 40  -- AI services use more CPU
                    WHEN service_record.name LIKE '%scraper%' THEN 20 + random() * 30
                    WHEN service_record.name LIKE '%api%' THEN 15 + random() * 25
                    WHEN service_record.name LIKE '%frontend%' THEN 5 + random() * 15
                    ELSE 10 + random() * 20
                END,
                -- Memory usage (varies by service type)
                CASE 
                    WHEN service_record.name LIKE '%ai%' THEN 512 + random() * 256  -- AI services use more memory
                    WHEN service_record.name LIKE '%temporal%' THEN 384 + random() * 128
                    WHEN service_record.name LIKE '%postgres%' THEN 256 + random() * 128
                    WHEN service_record.name LIKE '%api%' THEN 192 + random() * 64
                    WHEN service_record.name LIKE '%frontend%' THEN 128 + random() * 64
                    ELSE 96 + random() * 32
                END,
                -- Disk usage (gradual increase)
                20 + hours_back * 0.5 + random() * 5,
                -- Network in (KB/s)
                100 + random() * 500,
                -- Network out (KB/s)
                150 + random() * 750,
                -- Request count (varies by time of day)
                CASE 
                    WHEN EXTRACT(HOUR FROM metric_time) BETWEEN 9 AND 17 THEN 1000 + random() * 2000
                    WHEN EXTRACT(HOUR FROM metric_time) BETWEEN 6 AND 9 THEN 500 + random() * 1000
                    WHEN EXTRACT(HOUR FROM metric_time) BETWEEN 17 AND 22 THEN 750 + random() * 1500
                    ELSE 100 + random() * 400
                END::INTEGER,
                -- Error count (occasional errors)
                CASE 
                    WHEN random() > 0.9 THEN (random() * 10)::INTEGER
                    ELSE 0
                END,
                -- Response time P50 (ms)
                50 + random() * 100,
                -- Response time P95 (ms)
                200 + random() * 300,
                -- Response time P99 (ms)
                500 + random() * 500,
                metric_time
            );
        END LOOP;
        
        -- Add current real-time metric
        INSERT INTO health_metrics (
            service_id, 
            metric_type, 
            metric_value,
            cpu_usage,
            memory_usage,
            disk_usage,
            network_in,
            network_out,
            request_count,
            error_count,
            response_time_p50,
            response_time_p95,
            response_time_p99,
            timestamp
        ) VALUES (
            service_record.id,
            'system',
            jsonb_build_object(
                'status', 'healthy',
                'uptime_seconds', 86400,
                'version', '2.0.0',
                'last_check', NOW()
            ),
            -- Current metrics (slightly different pattern)
            CASE 
                WHEN service_record.name LIKE '%ai%' THEN 35 + random() * 35
                WHEN service_record.name LIKE '%scraper%' THEN 25 + random() * 25
                WHEN service_record.name LIKE '%api%' THEN 18 + random() * 22
                WHEN service_record.name LIKE '%frontend%' THEN 8 + random() * 12
                ELSE 12 + random() * 18
            END,
            CASE 
                WHEN service_record.name LIKE '%ai%' THEN 540 + random() * 220
                WHEN service_record.name LIKE '%temporal%' THEN 400 + random() * 100
                WHEN service_record.name LIKE '%postgres%' THEN 280 + random() * 100
                WHEN service_record.name LIKE '%api%' THEN 200 + random() * 56
                WHEN service_record.name LIKE '%frontend%' THEN 140 + random() * 52
                ELSE 100 + random() * 28
            END,
            25 + random() * 5,
            120 + random() * 480,
            180 + random() * 720,
            1200 + random() * 1800,
            CASE 
                WHEN random() > 0.95 THEN (random() * 5)::INTEGER
                ELSE 0
            END,
            45 + random() * 90,
            180 + random() * 270,
            450 + random() * 450,
            NOW()
        );
    END LOOP;
END $$;

-- Add some sample alerts for monitoring
INSERT INTO alerts (service_id, alert_type, severity, title, message, is_resolved, created_at)
SELECT 
    s.id,
    CASE (random() * 3)::INTEGER
        WHEN 0 THEN 'high_cpu'
        WHEN 1 THEN 'high_memory'
        WHEN 2 THEN 'slow_response'
        ELSE 'error_rate'
    END,
    CASE (random() * 3)::INTEGER
        WHEN 0 THEN 'critical'
        WHEN 1 THEN 'warning'
        ELSE 'info'
    END,
    CASE (random() * 4)::INTEGER
        WHEN 0 THEN 'High CPU Usage Detected'
        WHEN 1 THEN 'Memory Usage Above Threshold'
        WHEN 2 THEN 'Slow Response Times'
        ELSE 'Increased Error Rate'
    END,
    CASE (random() * 4)::INTEGER
        WHEN 0 THEN 'CPU usage has exceeded 80% for more than 5 minutes'
        WHEN 1 THEN 'Memory usage is above 85% of allocated resources'
        WHEN 2 THEN 'P95 response time is above 500ms'
        ELSE 'Error rate has increased by 200% in the last hour'
    END,
    random() > 0.3, -- 70% resolved
    NOW() - (random() * INTERVAL '7 days')
FROM services s
WHERE s.status = 'running'
AND random() > 0.7; -- Only 30% of services have alerts