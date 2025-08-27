package services

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/candlefish-ai/security-dashboard/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// SecurityService handles security-related operations
type SecurityService struct {
	db     *sqlx.DB
	redis  *redis.Client
	logger *zap.Logger
}

// NewSecurityService creates a new security service instance
func NewSecurityService(db *sqlx.DB, redis *redis.Client, logger *zap.Logger) *SecurityService {
	return &SecurityService{
		db:     db,
		redis:  redis,
		logger: logger,
	}
}

// GetSecurityOverview returns high-level security metrics
func (s *SecurityService) GetSecurityOverview(ctx context.Context, organizationID uuid.UUID) (*models.SecurityOverview, error) {
	overview := &models.SecurityOverview{}

	// Get total assets
	var totalAssets int
	err := s.db.GetContext(ctx, &totalAssets,
		"SELECT COUNT(*) FROM assets WHERE organization_id = $1", organizationID)
	if err != nil {
		s.logger.Error("Failed to get total assets", zap.Error(err))
		return nil, fmt.Errorf("failed to get total assets: %w", err)
	}
	overview.TotalAssets = totalAssets

	// Get critical vulnerabilities count
	var criticalVulns int
	err = s.db.GetContext(ctx, &criticalVulns, `
		SELECT COUNT(v.*)
		FROM vulnerabilities v
		JOIN assets a ON v.asset_id = a.id
		WHERE a.organization_id = $1 AND v.severity = 'CRITICAL' AND v.status != 'RESOLVED'`,
		organizationID)
	if err != nil {
		s.logger.Error("Failed to get critical vulnerabilities", zap.Error(err))
		return nil, fmt.Errorf("failed to get critical vulnerabilities: %w", err)
	}
	overview.CriticalVulnerabilities = criticalVulns

	// Get active alerts count
	var activeAlerts int
	err = s.db.GetContext(ctx, &activeAlerts,
		"SELECT COUNT(*) FROM alerts WHERE organization_id = $1 AND status IN ('OPEN', 'IN_PROGRESS')",
		organizationID)
	if err != nil {
		s.logger.Error("Failed to get active alerts", zap.Error(err))
		return nil, fmt.Errorf("failed to get active alerts: %w", err)
	}
	overview.ActiveAlerts = activeAlerts

	// Calculate compliance score (simplified logic)
	overview.ComplianceScore = s.calculateComplianceScore(ctx, organizationID)

	// Determine overall threat level
	overview.ThreatLevel = s.determineThreatLevel(criticalVulns, activeAlerts)

	// Get vulnerabilities by severity
	vulnsBySeverity, err := s.getVulnerabilitiesBySeverity(ctx, organizationID)
	if err != nil {
		s.logger.Error("Failed to get vulnerabilities by severity", zap.Error(err))
		return nil, fmt.Errorf("failed to get vulnerabilities by severity: %w", err)
	}
	overview.VulnerabilitiesBySeverity = vulnsBySeverity

	return overview, nil
}

// GetAssets returns filtered list of assets
func (s *SecurityService) GetAssets(ctx context.Context, organizationID uuid.UUID, assetType *models.AssetType, environment *models.Environment) ([]models.Asset, error) {
	query := "SELECT * FROM assets WHERE organization_id = $1"
	args := []interface{}{organizationID}

	if assetType != nil {
		query += " AND asset_type = $2"
		args = append(args, *assetType)
	}

	if environment != nil {
		if assetType != nil {
			query += " AND environment = $3"
		} else {
			query += " AND environment = $2"
		}
		args = append(args, *environment)
	}

	query += " ORDER BY created_at DESC"

	var assets []models.Asset
	err := s.db.SelectContext(ctx, &assets, query, args...)
	if err != nil {
		s.logger.Error("Failed to get assets", zap.Error(err))
		return nil, fmt.Errorf("failed to get assets: %w", err)
	}

	return assets, nil
}

// CreateAsset creates a new security asset
func (s *SecurityService) CreateAsset(ctx context.Context, organizationID uuid.UUID, req *models.CreateAssetRequest) (*models.Asset, error) {
	asset := &models.Asset{
		ID:             uuid.New(),
		OrganizationID: organizationID,
		Name:           req.Name,
		AssetType:      req.AssetType,
		Environment:    req.Environment,
		Platform:       req.Platform,
		URL:            req.URL,
		Description:    req.Description,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	query := `
		INSERT INTO assets (id, organization_id, name, asset_type, environment, platform, url, description, created_at, updated_at)
		VALUES (:id, :organization_id, :name, :asset_type, :environment, :platform, :url, :description, :created_at, :updated_at)`

	_, err := s.db.NamedExecContext(ctx, query, asset)
	if err != nil {
		s.logger.Error("Failed to create asset", zap.Error(err))
		return nil, fmt.Errorf("failed to create asset: %w", err)
	}

	s.logger.Info("Asset created", zap.String("asset_id", asset.ID.String()), zap.String("name", asset.Name))
	return asset, nil
}

// GetAssetVulnerabilities returns vulnerabilities for a specific asset
func (s *SecurityService) GetAssetVulnerabilities(ctx context.Context, assetID uuid.UUID) ([]models.Vulnerability, error) {
	var vulnerabilities []models.Vulnerability

	query := "SELECT * FROM vulnerabilities WHERE asset_id = $1 ORDER BY detected_at DESC"
	err := s.db.SelectContext(ctx, &vulnerabilities, query, assetID)
	if err != nil {
		s.logger.Error("Failed to get asset vulnerabilities", zap.Error(err))
		return nil, fmt.Errorf("failed to get asset vulnerabilities: %w", err)
	}

	return vulnerabilities, nil
}

// GetAssetSecurityEvents returns security events for a specific asset
func (s *SecurityService) GetAssetSecurityEvents(ctx context.Context, assetID uuid.UUID, limit int) ([]models.SecurityEvent, error) {
	var events []models.SecurityEvent

	query := "SELECT * FROM security_events WHERE asset_id = $1 ORDER BY created_at DESC LIMIT $2"
	err := s.db.SelectContext(ctx, &events, query, assetID, limit)
	if err != nil {
		s.logger.Error("Failed to get asset security events", zap.Error(err))
		return nil, fmt.Errorf("failed to get asset security events: %w", err)
	}

	return events, nil
}

// CreateVulnerability creates a new vulnerability
func (s *SecurityService) CreateVulnerability(ctx context.Context, vulnerability *models.Vulnerability) error {
	vulnerability.ID = uuid.New()
	vulnerability.CreatedAt = time.Now()
	vulnerability.UpdatedAt = time.Now()
	vulnerability.DetectedAt = time.Now()

	query := `
		INSERT INTO vulnerabilities (id, asset_id, cve_id, title, description, severity, status, detected_at, created_at, updated_at)
		VALUES (:id, :asset_id, :cve_id, :title, :description, :severity, :status, :detected_at, :created_at, :updated_at)`

	_, err := s.db.NamedExecContext(ctx, query, vulnerability)
	if err != nil {
		s.logger.Error("Failed to create vulnerability", zap.Error(err))
		return fmt.Errorf("failed to create vulnerability: %w", err)
	}

	// Trigger alert if critical or high severity
	if vulnerability.Severity == models.ThreatLevelCritical || vulnerability.Severity == models.ThreatLevelHigh {
		go s.triggerVulnerabilityAlert(ctx, vulnerability)
	}

	return nil
}

// CreateSecurityEvent creates a new security event
func (s *SecurityService) CreateSecurityEvent(ctx context.Context, event *models.SecurityEvent) error {
	event.ID = uuid.New()
	event.CreatedAt = time.Now()

	query := `
		INSERT INTO security_events (id, asset_id, organization_id, event_type, severity, title, description, metadata, ip_address, user_agent, acknowledged, created_at)
		VALUES (:id, :asset_id, :organization_id, :event_type, :severity, :title, :description, :metadata, :ip_address, :user_agent, :acknowledged, :created_at)`

	_, err := s.db.NamedExecContext(ctx, query, event)
	if err != nil {
		s.logger.Error("Failed to create security event", zap.Error(err))
		return fmt.Errorf("failed to create security event: %w", err)
	}

	return nil
}

// Helper methods
func (s *SecurityService) calculateComplianceScore(ctx context.Context, organizationID uuid.UUID) float64 {
	// Simplified compliance score calculation
	// In production, this would involve multiple compliance frameworks
	var totalAssets, vulnerableAssets int

	s.db.GetContext(ctx, &totalAssets,
		"SELECT COUNT(*) FROM assets WHERE organization_id = $1", organizationID)

	s.db.GetContext(ctx, &vulnerableAssets, `
		SELECT COUNT(DISTINCT a.id)
		FROM assets a
		JOIN vulnerabilities v ON a.id = v.asset_id
		WHERE a.organization_id = $1 AND v.status != 'RESOLVED'`, organizationID)

	if totalAssets == 0 {
		return 100.0
	}

	return float64(totalAssets-vulnerableAssets) / float64(totalAssets) * 100.0
}

func (s *SecurityService) determineThreatLevel(criticalVulns, activeAlerts int) models.ThreatLevel {
	if criticalVulns > 0 || activeAlerts > 10 {
		return models.ThreatLevelCritical
	}
	if activeAlerts > 5 {
		return models.ThreatLevelHigh
	}
	if activeAlerts > 0 {
		return models.ThreatLevelMedium
	}
	return models.ThreatLevelLow
}

func (s *SecurityService) getVulnerabilitiesBySeverity(ctx context.Context, organizationID uuid.UUID) ([]models.VulnerabilitySeverityCount, error) {
	query := `
		SELECT v.severity, COUNT(*)::int as count
		FROM vulnerabilities v
		JOIN assets a ON v.asset_id = a.id
		WHERE a.organization_id = $1 AND v.status != 'RESOLVED'
		GROUP BY v.severity`

	var results []models.VulnerabilitySeverityCount
	err := s.db.SelectContext(ctx, &results, query, organizationID)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	return results, nil
}

func (s *SecurityService) triggerVulnerabilityAlert(ctx context.Context, vulnerability *models.Vulnerability) {
	// Implementation would trigger alerts via notification service
	s.logger.Info("Vulnerability alert triggered",
		zap.String("vulnerability_id", vulnerability.ID.String()),
		zap.String("severity", string(vulnerability.Severity)),
		zap.String("title", vulnerability.Title))
}
