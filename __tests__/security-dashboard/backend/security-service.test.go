package tests

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/candlefish-ai/security-dashboard/internal/models"
	"github.com/candlefish-ai/security-dashboard/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap/zaptest"
)

// SecurityServiceTestSuite contains all security service tests
type SecurityServiceTestSuite struct {
	suite.Suite
	db              *sqlx.DB
	redis           *redis.Client
	service         *services.SecurityService
	organizationID  uuid.UUID
	testAssetID     uuid.UUID
	cleanupFunctions []func()
}

// SetupSuite initializes test database and services
func (s *SecurityServiceTestSuite) SetupSuite() {
	// Initialize test database (PostgreSQL with TimescaleDB)
	db := setupTestDB(s.T())
	s.db = db

	// Initialize test Redis
	redisClient := setupTestRedis()
	s.redis = redisClient

	// Initialize logger
	logger := zaptest.NewLogger(s.T())

	// Create security service
	s.service = services.NewSecurityService(db, redisClient, logger)

	// Create test organization
	s.organizationID = uuid.New()
	err := s.createTestOrganization()
	require.NoError(s.T(), err)

	// Create test asset
	s.testAssetID = uuid.New()
	err = s.createTestAsset()
	require.NoError(s.T(), err)
}

// TearDownSuite cleans up test resources
func (s *SecurityServiceTestSuite) TearDownSuite() {
	// Run cleanup functions in reverse order
	for i := len(s.cleanupFunctions) - 1; i >= 0; i-- {
		s.cleanupFunctions[i]()
	}

	if s.db != nil {
		s.db.Close()
	}
	if s.redis != nil {
		s.redis.Close()
	}
}

// TestSecurityOverview tests the security overview functionality
func (s *SecurityServiceTestSuite) TestSecurityOverview() {
	ctx := context.Background()

	// Test with empty organization (baseline)
	overview, err := s.service.GetSecurityOverview(ctx, s.organizationID)
	require.NoError(s.T(), err)
	require.NotNil(s.T(), overview)

	// Should have at least the test asset
	assert.GreaterOrEqual(s.T(), overview.TotalAssets, 1)
	assert.Equal(s.T(), 0, overview.CriticalVulnerabilities)
	assert.Equal(s.T(), 0, overview.ActiveAlerts)
	assert.Equal(s.T(), 100.0, overview.ComplianceScore) // No vulnerabilities = 100%
	assert.Equal(s.T(), models.ThreatLevelLow, overview.ThreatLevel)

	// Create some test vulnerabilities
	err = s.createTestVulnerabilities()
	require.NoError(s.T(), err)

	// Test with vulnerabilities
	overview, err = s.service.GetSecurityOverview(ctx, s.organizationID)
	require.NoError(s.T(), err)

	assert.Greater(s.T(), overview.CriticalVulnerabilities, 0)
	assert.Equal(s.T(), models.ThreatLevelCritical, overview.ThreatLevel)
	assert.Less(s.T(), overview.ComplianceScore, 100.0)
}

// TestAssetCRUD tests asset creation, reading, updating, deletion
func (s *SecurityServiceTestSuite) TestAssetCRUD() {
	ctx := context.Background()

	// Test creating asset
	createReq := &models.CreateAssetRequest{
		Name:        "Test Web Application",
		AssetType:   models.AssetTypeWebApp,
		Environment: models.EnvironmentProduction,
		Platform:    models.PlatformVercel,
		URL:         "https://test.candlefish.ai",
		Description: "Test application for security testing",
	}

	asset, err := s.service.CreateAsset(ctx, s.organizationID, createReq)
	require.NoError(s.T(), err)
	require.NotNil(s.T(), asset)

	assert.Equal(s.T(), createReq.Name, asset.Name)
	assert.Equal(s.T(), createReq.AssetType, asset.AssetType)
	assert.Equal(s.T(), createReq.Environment, asset.Environment)
	assert.Equal(s.T(), s.organizationID, asset.OrganizationID)
	assert.NotEqual(s.T(), uuid.Nil, asset.ID)

	// Test reading assets
	assets, err := s.service.GetAssets(ctx, s.organizationID, nil, nil)
	require.NoError(s.T(), err)
	assert.GreaterOrEqual(s.T(), len(assets), 1)

	// Test filtering by asset type
	assetType := models.AssetTypeWebApp
	filteredAssets, err := s.service.GetAssets(ctx, s.organizationID, &assetType, nil)
	require.NoError(s.T(), err)

	found := false
	for _, a := range filteredAssets {
		if a.ID == asset.ID {
			found = true
			break
		}
	}
	assert.True(s.T(), found, "Created asset should be found in filtered results")

	// Test filtering by environment
	environment := models.EnvironmentProduction
	envAssets, err := s.service.GetAssets(ctx, s.organizationID, nil, &environment)
	require.NoError(s.T(), err)

	found = false
	for _, a := range envAssets {
		if a.ID == asset.ID {
			found = true
			break
		}
	}
	assert.True(s.T(), found, "Created asset should be found in environment filter")
}

// TestVulnerabilityManagement tests vulnerability operations
func (s *SecurityServiceTestSuite) TestVulnerabilityManagement() {
	ctx := context.Background()

	// Create test vulnerability
	vuln := &models.Vulnerability{
		AssetID:     s.testAssetID,
		CVEID:       "CVE-2024-12345",
		Title:       "Test SQL Injection Vulnerability",
		Description: "A SQL injection vulnerability in the login form",
		Severity:    models.ThreatLevelCritical,
		Status:      models.VulnerabilityStatusOpen,
	}

	err := s.service.CreateVulnerability(ctx, vuln)
	require.NoError(s.T(), err)
	assert.NotEqual(s.T(), uuid.Nil, vuln.ID)
	assert.False(s.T(), vuln.CreatedAt.IsZero())
	assert.False(s.T(), vuln.DetectedAt.IsZero())

	// Test retrieving asset vulnerabilities
	vulnerabilities, err := s.service.GetAssetVulnerabilities(ctx, s.testAssetID)
	require.NoError(s.T(), err)
	assert.GreaterOrEqual(s.T(), len(vulnerabilities), 1)

	found := false
	for _, v := range vulnerabilities {
		if v.ID == vuln.ID {
			found = true
			assert.Equal(s.T(), vuln.CVEId, v.CVEId)
			assert.Equal(s.T(), vuln.Title, v.Title)
			assert.Equal(s.T(), vuln.Severity, v.Severity)
			break
		}
	}
	assert.True(s.T(), found, "Created vulnerability should be retrievable")
}

// TestSecurityEventCreation tests security event logging
func (s *SecurityServiceTestSuite) TestSecurityEventCreation() {
	ctx := context.Background()

	// Create security event
	event := &models.SecurityEvent{
		AssetID:        &s.testAssetID,
		OrganizationID: s.organizationID,
		EventType:      "failed_login",
		Severity:       models.ThreatLevelHigh,
		Title:          "Multiple Failed Login Attempts",
		Description:    "User attempted to login 5 times with wrong password",
		Metadata: map[string]interface{}{
			"user_id":       "test-user-123",
			"ip_address":    "192.168.1.100",
			"user_agent":    "Mozilla/5.0",
			"attempt_count": 5,
		},
		IPAddress:    "192.168.1.100",
		UserAgent:    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
		Acknowledged: false,
	}

	err := s.service.CreateSecurityEvent(ctx, event)
	require.NoError(s.T(), err)
	assert.NotEqual(s.T(), uuid.Nil, event.ID)
	assert.False(s.T(), event.CreatedAt.IsZero())

	// Test retrieving security events for asset
	events, err := s.service.GetAssetSecurityEvents(ctx, s.testAssetID, 10)
	require.NoError(s.T(), err)
	assert.GreaterOrEqual(s.T(), len(events), 1)

	found := false
	for _, e := range events {
		if e.ID == event.ID {
			found = true
			assert.Equal(s.T(), event.EventType, e.EventType)
			assert.Equal(s.T(), event.Title, e.Title)
			assert.Equal(s.T(), event.Severity, e.Severity)
			assert.Equal(s.T(), event.IPAddress, e.IPAddress)
			break
		}
	}
	assert.True(s.T(), found, "Created security event should be retrievable")
}

// TestConcurrentEventCreation tests handling multiple concurrent events
func (s *SecurityServiceTestSuite) TestConcurrentEventCreation() {
	ctx := context.Background()
	numEvents := 100
	errorsChan := make(chan error, numEvents)

	// Create multiple events concurrently
	for i := 0; i < numEvents; i++ {
		go func(eventNum int) {
			event := &models.SecurityEvent{
				AssetID:        &s.testAssetID,
				OrganizationID: s.organizationID,
				EventType:      "api_request",
				Severity:       models.ThreatLevelLow,
				Title:          fmt.Sprintf("API Request %d", eventNum),
				Description:    fmt.Sprintf("Concurrent test event %d", eventNum),
				IPAddress:      "127.0.0.1",
				UserAgent:      "Test Agent",
				Acknowledged:   false,
			}

			err := s.service.CreateSecurityEvent(ctx, event)
			errorsChan <- err
		}(i)
	}

	// Wait for all events to complete
	for i := 0; i < numEvents; i++ {
		err := <-errorsChan
		assert.NoError(s.T(), err, "Concurrent event creation should not fail")
	}

	// Verify all events were created
	events, err := s.service.GetAssetSecurityEvents(ctx, s.testAssetID, numEvents+50)
	require.NoError(s.T(), err)
	assert.GreaterOrEqual(s.T(), len(events), numEvents)
}

// TestErrorHandling tests various error scenarios
func (s *SecurityServiceTestSuite) TestErrorHandling() {
	ctx := context.Background()

	// Test with non-existent organization
	fakeOrgID := uuid.New()
	overview, err := s.service.GetSecurityOverview(ctx, fakeOrgID)
	require.NoError(s.T(), err) // Should not error, but return empty results
	assert.Equal(s.T(), 0, overview.TotalAssets)

	// Test with invalid asset ID
	fakeAssetID := uuid.New()
	vulns, err := s.service.GetAssetVulnerabilities(ctx, fakeAssetID)
	require.NoError(s.T(), err) // Should not error, but return empty slice
	assert.Equal(s.T(), 0, len(vulns))

	// Test creating vulnerability with invalid asset ID
	vuln := &models.Vulnerability{
		AssetID:     fakeAssetID,
		CVEID:       "CVE-2024-99999",
		Title:       "Test Vulnerability",
		Description: "Test",
		Severity:    models.ThreatLevelMedium,
		Status:      models.VulnerabilityStatusOpen,
	}

	err = s.service.CreateVulnerability(ctx, vuln)
	assert.Error(s.T(), err, "Should error when creating vulnerability with invalid asset ID")
}

// TestPerformanceMetrics tests system performance under load
func (s *SecurityServiceTestSuite) TestPerformanceMetrics() {
	ctx := context.Background()

	// Test performance of security overview with large dataset
	start := time.Now()
	overview, err := s.service.GetSecurityOverview(ctx, s.organizationID)
	duration := time.Since(start)

	require.NoError(s.T(), err)
	require.NotNil(s.T(), overview)
	assert.Less(s.T(), duration, time.Millisecond*500, "Security overview should complete within 500ms")

	// Test performance of asset listing
	start = time.Now()
	assets, err := s.service.GetAssets(ctx, s.organizationID, nil, nil)
	duration = time.Since(start)

	require.NoError(s.T(), err)
	assert.Less(s.T(), duration, time.Millisecond*200, "Asset listing should complete within 200ms")

	// Test performance of vulnerability listing
	start = time.Now()
	vulns, err := s.service.GetAssetVulnerabilities(ctx, s.testAssetID)
	duration = time.Since(start)

	require.NoError(s.T(), err)
	assert.Less(s.T(), duration, time.Millisecond*300, "Vulnerability listing should complete within 300ms")
}

// Helper functions

func (s *SecurityServiceTestSuite) createTestOrganization() error {
	query := `
		INSERT INTO organizations (id, name, slug, subscription_tier, rate_limit_per_minute, retention_days, max_users)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := s.db.ExecContext(context.Background(), query,
		s.organizationID, "Test Organization", "test-org", "enterprise", 5000, 365, 100)
	return err
}

func (s *SecurityServiceTestSuite) createTestAsset() error {
	query := `
		INSERT INTO assets (id, organization_id, name, asset_type, environment, platform, endpoint_url, description, criticality, monitoring_enabled, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	now := time.Now()
	_, err := s.db.ExecContext(context.Background(), query,
		s.testAssetID, s.organizationID, "Test Asset", "web_application", "test",
		"netlify", "https://test.candlefish.ai", "Test asset for security testing",
		"medium", true, now, now)
	return err
}

func (s *SecurityServiceTestSuite) createTestVulnerabilities() error {
	vulns := []struct {
		cveID    string
		title    string
		severity string
	}{
		{"CVE-2024-1001", "Critical SQL Injection", "critical"},
		{"CVE-2024-1002", "XSS Vulnerability", "high"},
		{"CVE-2024-1003", "Information Disclosure", "medium"},
	}

	for _, vuln := range vulns {
		query := `
			INSERT INTO vulnerabilities (id, organization_id, asset_id, cve_id, title, description, severity, status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`
		now := time.Now()
		_, err := s.db.ExecContext(context.Background(), query,
			uuid.New(), s.organizationID, s.testAssetID, vuln.cveID, vuln.title,
			"Test vulnerability for security testing", vuln.severity, "open", now, now)
		if err != nil {
			return err
		}
	}

	return nil
}

// TestMain runs the test suite
func TestSecurityServiceSuite(t *testing.T) {
	suite.Run(t, new(SecurityServiceTestSuite))
}

// Test helper functions for database setup
func setupTestDB(t *testing.T) *sqlx.DB {
	// This would connect to a test database
	// In a real implementation, you'd use testcontainers or similar
	dbURL := getTestDatabaseURL()
	db, err := sqlx.Connect("postgres", dbURL)
	require.NoError(t, err)

	// Run database migrations
	err = runTestMigrations(db)
	require.NoError(t, err)

	return db
}

func setupTestRedis() *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   1, // Use test database
	})
}

func getTestDatabaseURL() string {
	// Return test database connection string
	// This should be configured via environment variables
	return "postgres://test_user:test_pass@localhost:5432/security_dashboard_test?sslmode=disable"
}

func runTestMigrations(db *sqlx.DB) error {
	// Run database schema migrations for testing
	// This would execute the enhanced schema SQL file
	return nil
}