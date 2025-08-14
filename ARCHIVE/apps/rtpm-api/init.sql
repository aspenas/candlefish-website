-- TimescaleDB initialization script
-- This script is run when the database container starts for the first time

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
    id BIGSERIAL,
    timestamp TIMESTAMPTZ NOT NULL,
    metric_name TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    labels JSONB DEFAULT '{}',
    help_text TEXT DEFAULT '',
    unit TEXT DEFAULT '',
    source TEXT DEFAULT 'api',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create hypertable for metrics
SELECT create_hypertable('metrics', 'timestamp',
                        chunk_time_interval => INTERVAL '1 day',
                        if_not_exists => TRUE);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_metrics_name_timestamp
ON metrics (metric_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_labels_gin
ON metrics USING GIN (labels);

CREATE INDEX IF NOT EXISTS idx_metrics_type_timestamp
ON metrics (metric_type, timestamp DESC);

-- Create aggregated metrics table
CREATE TABLE IF NOT EXISTS aggregated_metrics (
    id BIGSERIAL,
    timestamp TIMESTAMPTZ NOT NULL,
    metric_name TEXT NOT NULL,
    aggregation_type TEXT NOT NULL,
    interval_duration TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    sample_count INTEGER NOT NULL DEFAULT 1,
    labels JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create hypertable for aggregated metrics
SELECT create_hypertable('aggregated_metrics', 'timestamp',
                        chunk_time_interval => INTERVAL '1 day',
                        if_not_exists => TRUE);

-- Create indexes for aggregated metrics
CREATE INDEX IF NOT EXISTS idx_aggregated_name_type_timestamp
ON aggregated_metrics (metric_name, aggregation_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_aggregated_interval_timestamp
ON aggregated_metrics (interval_duration, timestamp DESC);

-- Create alert rules table
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    metric_name TEXT NOT NULL,
    condition TEXT NOT NULL,
    threshold DOUBLE PRECISION NOT NULL,
    severity TEXT NOT NULL,
    labels JSONB DEFAULT '{}',
    annotations JSONB DEFAULT '{}',
    evaluation_interval INTEGER NOT NULL DEFAULT 60,
    for_duration INTEGER NOT NULL DEFAULT 300,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for alert rules
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules (enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_metric ON alert_rules (metric_name);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY,
    rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    status TEXT NOT NULL,
    severity TEXT NOT NULL,
    current_value DOUBLE PRECISION NOT NULL,
    threshold DOUBLE PRECISION NOT NULL,
    condition TEXT NOT NULL,
    labels JSONB DEFAULT '{}',
    annotations JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    last_seen TIMESTAMPTZ NOT NULL,
    fingerprint TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_status_severity ON alerts (status, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_rule_id ON alerts (rule_id);
CREATE INDEX IF NOT EXISTS idx_alerts_fingerprint ON alerts (fingerprint);
CREATE INDEX IF NOT EXISTS idx_alerts_started_at ON alerts (started_at DESC);

-- Set up retention policies
SELECT add_retention_policy('metrics', INTERVAL '90 days', if_not_exists => TRUE);
SELECT add_retention_policy('aggregated_metrics', INTERVAL '365 days', if_not_exists => TRUE);

-- Create compression policies for better storage efficiency
SELECT add_compression_policy('metrics', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('aggregated_metrics', INTERVAL '30 days', if_not_exists => TRUE);

-- Create continuous aggregates for common queries (optional)
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS bucket,
    metric_name,
    labels,
    AVG(value) AS avg_value,
    MAX(value) AS max_value,
    MIN(value) AS min_value,
    COUNT(*) AS sample_count
FROM metrics
GROUP BY bucket, metric_name, labels;

-- Refresh policy for continuous aggregates
SELECT add_continuous_aggregate_policy('metrics_hourly',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rtmp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rtmp;

-- Insert some sample alert rules
INSERT INTO alert_rules (id, name, metric_name, condition, threshold, severity, annotations)
VALUES
    (gen_random_uuid(), 'High CPU Usage', 'cpu_usage_percent', '> 80', 80.0, 'high', '{"description": "CPU usage is above 80%"}'),
    (gen_random_uuid(), 'High Memory Usage', 'memory_usage_percent', '> 90', 90.0, 'critical', '{"description": "Memory usage is above 90%"}'),
    (gen_random_uuid(), 'Low Disk Space', 'disk_usage_percent', '> 85', 85.0, 'medium', '{"description": "Disk usage is above 85%"}')
ON CONFLICT (name) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for alert_rules updated_at
CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Log initialization
INSERT INTO metrics (timestamp, metric_name, metric_type, value, labels, help_text, unit, source)
VALUES (NOW(), 'database_initialized', 'counter', 1, '{"component": "timescaledb"}', 'Database initialization marker', 'count', 'system');

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'TimescaleDB initialization completed successfully';
END $$;
