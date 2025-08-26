package database

import (
	"fmt"
	"time"

	"github.com/candlefish-ai/security-dashboard/internal/config"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// Initialize creates a new database connection
func Initialize(cfg config.DatabaseConfig) (*sqlx.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.Username, cfg.Password, cfg.Database, cfg.SSLMode,
	)

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Configure connection pool for production
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(1 * time.Minute)

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

// RunMigrations applies database migrations
func RunMigrations(db *sqlx.DB) error {
	migrations := []string{
		createAssetsTable,
		createVulnerabilitiesTable,
		createSecurityEventsTable,
		createAlertsTable,
		createKongAPIStatusTable,
		createIndexes,
	}

	for _, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	return nil
}

const createAssetsTable = `
CREATE TABLE IF NOT EXISTS assets (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id UUID NOT NULL,
	name VARCHAR(255) NOT NULL,
	asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('APPLICATION', 'DATABASE', 'API', 'WEBSITE')),
	environment VARCHAR(50) NOT NULL CHECK (environment IN ('DEVELOPMENT', 'STAGING', 'PRODUCTION')),
	platform VARCHAR(50) NOT NULL CHECK (platform IN ('KUBERNETES', 'AWS', 'GCP', 'AZURE', 'ON_PREMISE')),
	url TEXT,
	description TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`

const createVulnerabilitiesTable = `
CREATE TABLE IF NOT EXISTS vulnerabilities (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
	cve_id VARCHAR(20),
	title VARCHAR(500) NOT NULL,
	description TEXT NOT NULL,
	severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
	status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
	detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	resolved_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`

const createSecurityEventsTable = `
CREATE TABLE IF NOT EXISTS security_events (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
	organization_id UUID NOT NULL,
	event_type VARCHAR(100) NOT NULL,
	severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
	title VARCHAR(255) NOT NULL,
	description TEXT NOT NULL,
	metadata JSONB,
	ip_address INET,
	user_agent TEXT,
	acknowledged BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for time-series data
SELECT create_hypertable('security_events', 'created_at', if_not_exists => true);`

const createAlertsTable = `
CREATE TABLE IF NOT EXISTS alerts (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
	organization_id UUID NOT NULL,
	title VARCHAR(255) NOT NULL,
	description TEXT NOT NULL,
	severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
	status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
	rule_id VARCHAR(100),
	triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	resolved_at TIMESTAMP WITH TIME ZONE,
	assigned_to UUID,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`

const createKongAPIStatusTable = `
CREATE TABLE IF NOT EXISTS kong_api_status (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	is_secure BOOLEAN NOT NULL,
	protocol VARCHAR(10) NOT NULL,
	is_vulnerable BOOLEAN NOT NULL,
	vulnerability_description TEXT,
	risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
	recommended_actions JSONB,
	last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`

const createIndexes = `
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_type_env ON assets(asset_type, environment);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_asset_id ON vulnerabilities(asset_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_security_events_asset_id ON security_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_security_events_org_id ON security_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_organization_id ON alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON alerts(triggered_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_asset_severity ON vulnerabilities(asset_id, severity);
CREATE INDEX IF NOT EXISTS idx_security_events_org_severity ON security_events(organization_id, severity);`
