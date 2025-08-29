-- CLOS Enhanced Database Schema v2.0
-- Comprehensive schema for Candlefish Localhost Orchestration System

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = memory;
PRAGMA mmap_size = 268435456; -- 256MB

-- ============================================================================
-- Core Tables
-- ============================================================================

-- Services table with enhanced fields
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    port INTEGER UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('running', 'stopped', 'failed', 'starting', 'stopping', 'unhealthy')),
    started_at DATETIME,
    stopped_at DATETIME,
    health_url TEXT,
    container_id TEXT,
    image TEXT,
    restart_policy TEXT DEFAULT 'unless-stopped',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Resource limits
    cpu_limit REAL,
    memory_limit INTEGER, -- in MB
    
    -- Networking
    network_mode TEXT DEFAULT 'bridge',
    dns_servers TEXT, -- JSON array
    
    -- Metadata
    description TEXT,
    version TEXT,
    owner TEXT,
    
    -- Health check configuration
    health_check_enabled BOOLEAN DEFAULT TRUE,
    health_check_interval INTEGER DEFAULT 30, -- seconds
    health_check_timeout INTEGER DEFAULT 10, -- seconds
    health_check_retries INTEGER DEFAULT 3,
    health_check_start_period INTEGER DEFAULT 30, -- seconds
    health_expected_status INTEGER DEFAULT 200,
    
    -- Last health check result
    last_health_check DATETIME,
    health_status TEXT CHECK (health_status IN ('healthy', 'unhealthy', 'starting')) DEFAULT 'starting',
    health_response_time REAL, -- milliseconds
    
    UNIQUE(name, group_name)
);

-- Service groups with enhanced orchestration
CREATE TABLE IF NOT EXISTS service_groups (
    name TEXT PRIMARY KEY NOT NULL,
    description TEXT,
    dependencies TEXT, -- JSON array of group names
    start_order INTEGER DEFAULT 0,
    compose_file TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Group-level configuration
    auto_restart BOOLEAN DEFAULT FALSE,
    restart_policy TEXT DEFAULT 'unless-stopped',
    network_name TEXT,
    
    -- Status tracking
    status TEXT CHECK (status IN ('running', 'stopped', 'partial', 'starting', 'stopping')) DEFAULT 'stopped',
    health_score REAL DEFAULT 0.0 CHECK (health_score >= 0.0 AND health_score <= 1.0)
);

-- Port allocation ranges with enhanced tracking
CREATE TABLE IF NOT EXISTS port_ranges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project TEXT NOT NULL,
    start_port INTEGER NOT NULL,
    end_port INTEGER NOT NULL,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Usage tracking
    max_services INTEGER,
    priority INTEGER DEFAULT 0,
    
    UNIQUE(project, start_port, end_port),
    CHECK(start_port <= end_port),
    CHECK(start_port >= 1024 AND end_port <= 65535)
);

-- ============================================================================
-- Relationship Tables
-- ============================================================================

-- Service tags (many-to-many)
CREATE TABLE IF NOT EXISTS service_tags (
    service_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (service_id, tag),
    FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE
);

-- Service environment variables
CREATE TABLE IF NOT EXISTS service_environment (
    service_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (service_id, key),
    FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE
);

-- Docker volumes
CREATE TABLE IF NOT EXISTS service_volumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id TEXT NOT NULL,
    host_path TEXT,
    container_path TEXT NOT NULL,
    mode TEXT DEFAULT 'rw' CHECK (mode IN ('ro', 'rw')),
    volume_type TEXT DEFAULT 'bind' CHECK (volume_type IN ('bind', 'volume', 'tmpfs')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE
);

-- Docker networks
CREATE TABLE IF NOT EXISTS service_networks (
    service_id TEXT NOT NULL,
    network_name TEXT NOT NULL,
    ip_address TEXT,
    aliases TEXT, -- JSON array
    PRIMARY KEY (service_id, network_name),
    FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE
);

-- Service dependencies
CREATE TABLE IF NOT EXISTS service_dependencies (
    service_id TEXT NOT NULL,
    depends_on_service_id TEXT NOT NULL,
    dependency_type TEXT DEFAULT 'soft' CHECK (dependency_type IN ('soft', 'hard')),
    PRIMARY KEY (service_id, depends_on_service_id),
    FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_service_id) REFERENCES services (id) ON DELETE CASCADE,
    CHECK (service_id != depends_on_service_id)
);

-- ============================================================================
-- Monitoring and Metrics
-- ============================================================================

-- Real-time metrics storage
CREATE TABLE IF NOT EXISTS service_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id TEXT NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Resource usage
    cpu_usage REAL, -- percentage
    memory_usage INTEGER, -- MB
    memory_percent REAL, -- percentage
    
    -- Network metrics
    network_rx INTEGER DEFAULT 0, -- bytes
    network_tx INTEGER DEFAULT 0, -- bytes
    
    -- Disk metrics
    disk_usage INTEGER DEFAULT 0, -- bytes
    disk_read INTEGER DEFAULT 0, -- bytes
    disk_write INTEGER DEFAULT 0, -- bytes
    
    -- Performance metrics
    response_time REAL, -- milliseconds
    request_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    
    FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE
);

-- System-wide metrics
CREATE TABLE IF NOT EXISTS system_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- System resources
    cpu_usage REAL,
    memory_usage REAL,
    disk_usage REAL,
    load_average_1m REAL,
    load_average_5m REAL,
    load_average_15m REAL,
    
    -- Docker stats
    containers_running INTEGER DEFAULT 0,
    containers_stopped INTEGER DEFAULT 0,
    images_count INTEGER DEFAULT 0,
    volumes_count INTEGER DEFAULT 0,
    networks_count INTEGER DEFAULT 0,
    
    -- CLOS stats
    services_total INTEGER DEFAULT 0,
    services_running INTEGER DEFAULT 0,
    services_unhealthy INTEGER DEFAULT 0,
    port_conflicts INTEGER DEFAULT 0
);

-- ============================================================================
-- Operations and Events
-- ============================================================================

-- Service operations tracking
CREATE TABLE IF NOT EXISTS service_operations (
    id TEXT PRIMARY KEY NOT NULL, -- UUID
    service_id TEXT NOT NULL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('start', 'stop', 'restart', 'update', 'deploy')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
    
    -- Timing
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    timeout_at DATETIME,
    
    -- Operation details
    initiated_by TEXT, -- user or system
    parameters TEXT, -- JSON
    error_message TEXT,
    exit_code INTEGER,
    
    -- Progress tracking
    progress_percent REAL DEFAULT 0.0 CHECK (progress_percent >= 0.0 AND progress_percent <= 100.0),
    current_step TEXT,
    
    FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE
);

-- Group operations tracking
CREATE TABLE IF NOT EXISTS group_operations (
    id TEXT PRIMARY KEY NOT NULL, -- UUID
    group_name TEXT NOT NULL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('start', 'stop', 'restart', 'deploy')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
    
    -- Timing
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    
    -- Operation details
    initiated_by TEXT,
    parameters TEXT, -- JSON
    error_message TEXT,
    
    -- Progress tracking
    total_services INTEGER DEFAULT 0,
    completed_services INTEGER DEFAULT 0,
    failed_services INTEGER DEFAULT 0,
    
    FOREIGN KEY (group_name) REFERENCES service_groups (name) ON DELETE CASCADE
);

-- System events log
CREATE TABLE IF NOT EXISTS system_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    service_id TEXT,
    group_name TEXT,
    
    -- Event details
    severity TEXT NOT NULL CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')) DEFAULT 'info',
    message TEXT NOT NULL,
    data TEXT, -- JSON
    
    -- Context
    user_agent TEXT,
    ip_address TEXT,
    session_id TEXT,
    
    -- Timing
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE SET NULL,
    FOREIGN KEY (group_name) REFERENCES service_groups (name) ON DELETE SET NULL
);

-- ============================================================================
-- Port Conflict Management
-- ============================================================================

-- Port conflict detection results
CREATE TABLE IF NOT EXISTS port_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    port INTEGER NOT NULL,
    detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    status TEXT NOT NULL CHECK (status IN ('active', 'resolved', 'ignored')) DEFAULT 'active',
    
    -- Conflict details
    clos_service_id TEXT,
    system_process_name TEXT,
    system_process_pid INTEGER,
    
    -- Resolution
    resolution_type TEXT CHECK (resolution_type IN ('migrate_service', 'kill_process', 'change_port', 'ignore')),
    resolution_details TEXT, -- JSON
    resolved_by TEXT,
    
    FOREIGN KEY (clos_service_id) REFERENCES services (id) ON DELETE SET NULL
);

-- ============================================================================
-- Configuration and Settings
-- ============================================================================

-- System configuration key-value store
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('string', 'integer', 'boolean', 'json')) DEFAULT 'string',
    description TEXT,
    is_secret BOOLEAN DEFAULT FALSE,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User sessions (for web dashboard)
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    last_activity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- API keys for service-to-service communication
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    permissions TEXT NOT NULL, -- JSON array
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    last_used_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_by TEXT
);

-- ============================================================================
-- Performance Indexes
-- ============================================================================

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_services_group ON services (group_name);
CREATE INDEX IF NOT EXISTS idx_services_port ON services (port);
CREATE INDEX IF NOT EXISTS idx_services_status ON services (status);
CREATE INDEX IF NOT EXISTS idx_services_health ON services (health_status);
CREATE INDEX IF NOT EXISTS idx_services_updated ON services (updated_at);
CREATE INDEX IF NOT EXISTS idx_services_container ON services (container_id);

-- Service groups indexes
CREATE INDEX IF NOT EXISTS idx_service_groups_status ON service_groups (status);
CREATE INDEX IF NOT EXISTS idx_service_groups_order ON service_groups (start_order);

-- Port ranges indexes
CREATE INDEX IF NOT EXISTS idx_port_ranges_project ON port_ranges (project);
CREATE INDEX IF NOT EXISTS idx_port_ranges_range ON port_ranges (start_port, end_port);

-- Metrics indexes
CREATE INDEX IF NOT EXISTS idx_service_metrics_service_time ON service_metrics (service_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_service_metrics_timestamp ON service_metrics (timestamp);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics (timestamp DESC);

-- Operations indexes
CREATE INDEX IF NOT EXISTS idx_service_operations_service ON service_operations (service_id);
CREATE INDEX IF NOT EXISTS idx_service_operations_status ON service_operations (status);
CREATE INDEX IF NOT EXISTS idx_service_operations_started ON service_operations (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_operations_group ON group_operations (group_name);
CREATE INDEX IF NOT EXISTS idx_group_operations_started ON group_operations (started_at DESC);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_system_events_type ON system_events (event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_service ON system_events (service_id);
CREATE INDEX IF NOT EXISTS idx_system_events_timestamp ON system_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events (severity);

-- Conflicts indexes
CREATE INDEX IF NOT EXISTS idx_port_conflicts_port ON port_conflicts (port);
CREATE INDEX IF NOT EXISTS idx_port_conflicts_status ON port_conflicts (status);
CREATE INDEX IF NOT EXISTS idx_port_conflicts_detected ON port_conflicts (detected_at DESC);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions (is_active, last_activity);

-- API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys (is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys (expires_at);

-- ============================================================================
-- Triggers for Data Integrity
-- ============================================================================

-- Update timestamps on services
CREATE TRIGGER IF NOT EXISTS update_services_timestamp
    AFTER UPDATE ON services
    FOR EACH ROW
    BEGIN
        UPDATE services SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Update timestamps on service groups
CREATE TRIGGER IF NOT EXISTS update_service_groups_timestamp
    AFTER UPDATE ON service_groups
    FOR EACH ROW
    BEGIN
        UPDATE service_groups SET updated_at = CURRENT_TIMESTAMP WHERE name = NEW.name;
    END;

-- Update system config timestamps
CREATE TRIGGER IF NOT EXISTS update_system_config_timestamp
    AFTER UPDATE ON system_config
    FOR EACH ROW
    BEGIN
        UPDATE system_config SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
    END;

-- Set completed_at for service operations
CREATE TRIGGER IF NOT EXISTS complete_service_operations
    AFTER UPDATE OF status ON service_operations
    FOR EACH ROW
    WHEN NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status NOT IN ('completed', 'failed', 'cancelled')
    BEGIN
        UPDATE service_operations 
        SET completed_at = CURRENT_TIMESTAMP 
        WHERE id = NEW.id;
    END;

-- Set completed_at for group operations
CREATE TRIGGER IF NOT EXISTS complete_group_operations
    AFTER UPDATE OF status ON group_operations
    FOR EACH ROW
    WHEN NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status NOT IN ('completed', 'failed', 'cancelled')
    BEGIN
        UPDATE group_operations 
        SET completed_at = CURRENT_TIMESTAMP 
        WHERE id = NEW.id;
    END;

-- Auto-resolve port conflicts when service is deleted
CREATE TRIGGER IF NOT EXISTS resolve_conflicts_on_service_delete
    AFTER DELETE ON services
    FOR EACH ROW
    BEGIN
        UPDATE port_conflicts 
        SET status = 'resolved', 
            resolved_at = CURRENT_TIMESTAMP,
            resolution_type = 'service_deleted'
        WHERE clos_service_id = OLD.id AND status = 'active';
    END;

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- Service overview with health and metrics
CREATE VIEW IF NOT EXISTS service_overview AS
SELECT 
    s.id,
    s.name,
    s.group_name,
    s.port,
    s.status,
    s.health_status,
    s.health_response_time,
    s.last_health_check,
    s.started_at,
    s.container_id,
    s.description,
    s.version,
    -- Latest metrics
    m.cpu_usage,
    m.memory_usage,
    m.memory_percent,
    m.response_time as avg_response_time,
    -- Tag aggregation
    GROUP_CONCAT(st.tag, ',') as tags,
    -- Dependency count
    (SELECT COUNT(*) FROM service_dependencies WHERE service_id = s.id) as dependency_count
FROM services s
LEFT JOIN service_tags st ON s.id = st.service_id
LEFT JOIN (
    SELECT DISTINCT service_id,
           FIRST_VALUE(cpu_usage) OVER (PARTITION BY service_id ORDER BY timestamp DESC) as cpu_usage,
           FIRST_VALUE(memory_usage) OVER (PARTITION BY service_id ORDER BY timestamp DESC) as memory_usage,
           FIRST_VALUE(memory_percent) OVER (PARTITION BY service_id ORDER BY timestamp DESC) as memory_percent,
           FIRST_VALUE(response_time) OVER (PARTITION BY service_id ORDER BY timestamp DESC) as response_time
    FROM service_metrics 
    WHERE timestamp > datetime('now', '-5 minutes')
) m ON s.id = m.service_id
GROUP BY s.id;

-- Group status with service counts
CREATE VIEW IF NOT EXISTS group_status AS
SELECT 
    sg.name,
    sg.description,
    sg.status as group_status,
    sg.health_score,
    COUNT(s.id) as total_services,
    SUM(CASE WHEN s.status = 'running' THEN 1 ELSE 0 END) as running_services,
    SUM(CASE WHEN s.health_status = 'healthy' THEN 1 ELSE 0 END) as healthy_services,
    SUM(CASE WHEN s.status = 'failed' THEN 1 ELSE 0 END) as failed_services,
    sg.created_at,
    sg.updated_at
FROM service_groups sg
LEFT JOIN services s ON sg.name = s.group_name
GROUP BY sg.name;

-- Port usage summary
CREATE VIEW IF NOT EXISTS port_usage_summary AS
SELECT 
    pr.project,
    pr.start_port,
    pr.end_port,
    (pr.end_port - pr.start_port + 1) as total_ports,
    COUNT(s.port) as used_ports,
    ROUND((COUNT(s.port) * 100.0) / (pr.end_port - pr.start_port + 1), 2) as usage_percent,
    pr.priority,
    pr.description
FROM port_ranges pr
LEFT JOIN services s ON s.port BETWEEN pr.start_port AND pr.end_port
GROUP BY pr.project, pr.start_port, pr.end_port;

-- Recent system activity
CREATE VIEW IF NOT EXISTS recent_activity AS
SELECT 
    'event' as activity_type,
    se.event_type as activity_name,
    se.service_id,
    se.group_name,
    se.severity,
    se.message,
    se.timestamp
FROM system_events se
WHERE se.timestamp > datetime('now', '-24 hours')

UNION ALL

SELECT 
    'operation' as activity_type,
    so.operation_type as activity_name,
    so.service_id,
    NULL as group_name,
    CASE WHEN so.status = 'failed' THEN 'error' ELSE 'info' END as severity,
    'Service ' || so.operation_type || ' ' || so.status as message,
    so.started_at as timestamp
FROM service_operations so
WHERE so.started_at > datetime('now', '-24 hours')

ORDER BY timestamp DESC
LIMIT 100;

-- ============================================================================
-- Initial Configuration Data
-- ============================================================================

-- Default system configuration
INSERT OR IGNORE INTO system_config (key, value, data_type, description) VALUES
('version', '2.0.0', 'string', 'CLOS system version'),
('metrics_retention_days', '7', 'integer', 'Number of days to retain metrics'),
('log_retention_days', '30', 'integer', 'Number of days to retain logs'),
('health_check_global_enabled', 'true', 'boolean', 'Global health check enable/disable'),
('websocket_enabled', 'true', 'boolean', 'WebSocket real-time updates enabled'),
('api_rate_limit', '1000', 'integer', 'API requests per minute per client'),
('auto_resolve_conflicts', 'false', 'boolean', 'Automatically resolve port conflicts'),
('dashboard_refresh_interval', '5', 'integer', 'Dashboard refresh interval in seconds'),
('max_concurrent_operations', '10', 'integer', 'Maximum concurrent service operations'),
('docker_timeout', '30', 'integer', 'Docker operation timeout in seconds');

-- Default port ranges (matching current configuration)
INSERT OR IGNORE INTO port_ranges (project, start_port, end_port, description, priority) VALUES
('core', 5000, 5999, 'Core infrastructure services', 1),
('candlefish-frontend', 3000, 3099, 'Candlefish frontend applications', 2),
('security-dashboard', 3100, 3199, 'Security dashboard services', 2),
('pkb', 3200, 3299, 'PKB (Personal Knowledge Base) services', 2),
('apis', 4000, 4999, 'API backend services', 3),
('monitoring', 8000, 8099, 'Monitoring and observability', 4),
('development', 9000, 9999, 'Development and testing services', 5);

-- Default service groups
INSERT OR IGNORE INTO service_groups (name, description, start_order, auto_restart) VALUES
('core', 'Core infrastructure (database, cache, proxy)', 1, true),
('candlefish', 'Candlefish application stack', 2, true),
('security', 'Security dashboard and related services', 3, false),
('pkb', 'Personal Knowledge Base services', 4, false),
('monitoring', 'Monitoring and observability stack', 5, true);

-- Create event for schema initialization
INSERT INTO system_events (event_type, severity, message, data) VALUES
('system.schema_initialized', 'info', 'Database schema v2.0 initialized successfully', 
 json_object('version', '2.0.0', 'tables_created', 20, 'indexes_created', 25, 'views_created', 4));

-- ============================================================================
-- Cleanup Procedures (for maintenance)
-- ============================================================================

-- Note: These would typically be run as scheduled maintenance tasks

-- Clean old metrics (keeping last 7 days by default)
-- DELETE FROM service_metrics WHERE timestamp < datetime('now', '-7 days');
-- DELETE FROM system_metrics WHERE timestamp < datetime('now', '-7 days');

-- Clean old events (keeping last 30 days by default)  
-- DELETE FROM system_events WHERE timestamp < datetime('now', '-30 days');

-- Clean completed operations older than 7 days
-- DELETE FROM service_operations WHERE status IN ('completed', 'failed') AND completed_at < datetime('now', '-7 days');
-- DELETE FROM group_operations WHERE status IN ('completed', 'failed') AND completed_at < datetime('now', '-7 days');

-- Clean expired sessions
-- DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;

-- Vacuum and optimize
-- PRAGMA optimize;
-- VACUUM;

-- ============================================================================
-- Schema Version and Metadata
-- ============================================================================

PRAGMA user_version = 2000; -- Version 2.0.0