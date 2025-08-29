-- Add sample health metrics for running services
-- Generate realistic metrics for the last 24 hours

DO $$
DECLARE
    service_record RECORD;
    hours_back INTEGER;
    metric_time TIMESTAMP;
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
                cpu_usage,
                memory_usage,
                disk_usage,
                network_in,
                network_out,
                response_time,
                status_code,
                error_rate,
                request_count,
                created_at
            ) VALUES (
                service_record.id,
                -- CPU usage (varies by service type)
                CASE 
                    WHEN service_record.name LIKE '%ai%' THEN 30 + random() * 40
                    WHEN service_record.name LIKE '%scraper%' THEN 20 + random() * 30
                    WHEN service_record.name LIKE '%api%' THEN 15 + random() * 25
                    WHEN service_record.name LIKE '%frontend%' THEN 5 + random() * 15
                    ELSE 10 + random() * 20
                END,
                -- Memory usage (percentage)
                CASE 
                    WHEN service_record.name LIKE '%ai%' THEN 60 + random() * 30
                    WHEN service_record.name LIKE '%temporal%' THEN 50 + random() * 30
                    WHEN service_record.name LIKE '%postgres%' THEN 40 + random() * 30
                    WHEN service_record.name LIKE '%api%' THEN 30 + random() * 25
                    WHEN service_record.name LIKE '%frontend%' THEN 20 + random() * 20
                    ELSE 25 + random() * 20
                END,
                -- Disk usage (percentage, gradual increase)
                20 + hours_back * 0.5 + random() * 5,
                -- Network in (bytes)
                (100000 + random() * 500000)::BIGINT,
                -- Network out (bytes)
                (150000 + random() * 750000)::BIGINT,
                -- Response time (ms)
                (50 + random() * 200)::INTEGER,
                -- Status code (mostly 200s, occasional errors)
                CASE 
                    WHEN random() > 0.95 THEN 500
                    WHEN random() > 0.90 THEN 404
                    ELSE 200
                END,
                -- Error rate (percentage)
                CASE 
                    WHEN random() > 0.9 THEN random() * 5
                    ELSE 0
                END,
                -- Request count (varies by time of day)
                CASE 
                    WHEN EXTRACT(HOUR FROM metric_time) BETWEEN 9 AND 17 THEN (1000 + random() * 2000)::INTEGER
                    WHEN EXTRACT(HOUR FROM metric_time) BETWEEN 6 AND 9 THEN (500 + random() * 1000)::INTEGER
                    WHEN EXTRACT(HOUR FROM metric_time) BETWEEN 17 AND 22 THEN (750 + random() * 1500)::INTEGER
                    ELSE (100 + random() * 400)::INTEGER
                END,
                metric_time
            );
        END LOOP;
    END LOOP;
END $$;