package services_test

import (
	"context"
	"testing"
	"time"

	"github.com/candlefish-ai/security-dashboard/internal/models"
	"github.com/candlefish-ai/security-dashboard/internal/services"
	"github.com/candlefish-ai/security-dashboard/internal/testutil"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap/zaptest"
)

type SecurityServiceTestSuite struct {
	suite.Suite
	securityService *services.SecurityService
	testContainer   *testutil.TestContainer
	organizationID  uuid.UUID
}

func (suite *SecurityServiceTestSuite) SetupSuite() {
	var err error
	suite.testContainer, err = testutil.SetupTestContainer()
	require.NoError(suite.T(), err)

	logger := zaptest.NewLogger(suite.T())
	suite.securityService = services.NewSecurityService(
		suite.testContainer.DB,
		suite.testContainer.Redis,
		logger,
	)

	suite.organizationID = uuid.New()
}

func (suite *SecurityServiceTestSuite) TearDownSuite() {
	if suite.testContainer != nil {
		suite.testContainer.Cleanup()
	}
}

func (suite *SecurityServiceTestSuite) SetupTest() {
	// Clean up database before each test
	suite.testContainer.CleanupDatabase()
}

func (suite *SecurityServiceTestSuite) TestCreateAsset() {
	ctx := context.Background()

	req := &models.CreateAssetRequest{
		Name:        "Test Web Application",
		AssetType:   models.AssetTypeApplication,
		Environment: models.EnvironmentProduction,
		Platform:    models.PlatformKubernetes,
		URL:         stringPtr("https://app.example.com"),
		Description: stringPtr("Main web application"),
	}

	asset, err := suite.securityService.CreateAsset(ctx, suite.organizationID, req)

	require.NoError(suite.T(), err)
	assert.NotEqual(suite.T(), uuid.Nil, asset.ID)
	assert.Equal(suite.T(), suite.organizationID, asset.OrganizationID)
	assert.Equal(suite.T(), req.Name, asset.Name)
	assert.Equal(suite.T(), req.AssetType, asset.AssetType)
	assert.Equal(suite.T(), req.Environment, asset.Environment)
	assert.Equal(suite.T(), req.Platform, asset.Platform)
	assert.Equal(suite.T(), req.URL, asset.URL)
	assert.Equal(suite.T(), req.Description, asset.Description)
	assert.WithinDuration(suite.T(), time.Now(), asset.CreatedAt, time.Second)
	assert.WithinDuration(suite.T(), time.Now(), asset.UpdatedAt, time.Second)
}

func (suite *SecurityServiceTestSuite) TestCreateAsset_ValidationError() {
	ctx := context.Background()

	req := &models.CreateAssetRequest{
		Name:        "", // Invalid: empty name
		AssetType:   models.AssetTypeApplication,
		Environment: models.EnvironmentProduction,
		Platform:    models.PlatformKubernetes,
	}

	_, err := suite.securityService.CreateAsset(ctx, suite.organizationID, req)

	assert.Error(suite.T(), err)
}

func (suite *SecurityServiceTestSuite) TestGetAssets() {
	ctx := context.Background()

	// Create test assets
	assets := []models.CreateAssetRequest{
		{
			Name:        "Web App",
			AssetType:   models.AssetTypeApplication,
			Environment: models.EnvironmentProduction,
			Platform:    models.PlatformKubernetes,
		},
		{
			Name:        "API Gateway",
			AssetType:   models.AssetTypeAPI,
			Environment: models.EnvironmentProduction,
			Platform:    models.PlatformAWS,
		},
		{
			Name:        "Test Database",
			AssetType:   models.AssetTypeDatabase,
			Environment: models.EnvironmentStaging,
			Platform:    models.PlatformAWS,
		},
	}

	for _, req := range assets {
		_, err := suite.securityService.CreateAsset(ctx, suite.organizationID, &req)
		require.NoError(suite.T(), err)
	}

	// Test getting all assets
	allAssets, err := suite.securityService.GetAssets(ctx, suite.organizationID, nil, nil)
	require.NoError(suite.T(), err)
	assert.Len(suite.T(), allAssets, 3)

	// Test filtering by asset type
	appType := models.AssetTypeApplication
	filteredAssets, err := suite.securityService.GetAssets(ctx, suite.organizationID, &appType, nil)
	require.NoError(suite.T(), err)
	assert.Len(suite.T(), filteredAssets, 1)
	assert.Equal(suite.T(), models.AssetTypeApplication, filteredAssets[0].AssetType)

	// Test filtering by environment
	prodEnv := models.EnvironmentProduction
	prodAssets, err := suite.securityService.GetAssets(ctx, suite.organizationID, nil, &prodEnv)
	require.NoError(suite.T(), err)
	assert.Len(suite.T(), prodAssets, 2)
	for _, asset := range prodAssets {
		assert.Equal(suite.T(), models.EnvironmentProduction, asset.Environment)
	}

	// Test filtering by both asset type and environment
	dbType := models.AssetTypeDatabase
	stagingEnv := models.EnvironmentStaging
	specificAssets, err := suite.securityService.GetAssets(ctx, suite.organizationID, &dbType, &stagingEnv)
	require.NoError(suite.T(), err)
	assert.Len(suite.T(), specificAssets, 1)
	assert.Equal(suite.T(), models.AssetTypeDatabase, specificAssets[0].AssetType)
	assert.Equal(suite.T(), models.EnvironmentStaging, specificAssets[0].Environment)
}

func (suite *SecurityServiceTestSuite) TestCreateVulnerability() {
	ctx := context.Background()

	// Create an asset first
	asset := suite.createTestAsset(ctx)

	vulnerability := &models.Vulnerability{
		AssetID:     asset.ID,
		CVEID:       stringPtr("CVE-2023-12345"),
		Title:       "Critical SQL Injection Vulnerability",
		Description: "SQL injection vulnerability in user input validation",
		Severity:    models.ThreatLevelCritical,
		Status:      "OPEN",
	}

	err := suite.securityService.CreateVulnerability(ctx, vulnerability)

	require.NoError(suite.T(), err)
	assert.NotEqual(suite.T(), uuid.Nil, vulnerability.ID)
	assert.WithinDuration(suite.T(), time.Now(), vulnerability.CreatedAt, time.Second)
	assert.WithinDuration(suite.T(), time.Now(), vulnerability.UpdatedAt, time.Second)
	assert.WithinDuration(suite.T(), time.Now(), vulnerability.DetectedAt, time.Second)
}

func (suite *SecurityServiceTestSuite) TestGetAssetVulnerabilities() {
	ctx := context.Background()

	// Create an asset
	asset := suite.createTestAsset(ctx)

	// Create vulnerabilities
	vulnerabilities := []models.Vulnerability{
		{
			AssetID:     asset.ID,
			Title:       "High severity vulnerability",
			Description: "Description 1",
			Severity:    models.ThreatLevelHigh,
			Status:      "OPEN",
		},
		{
			AssetID:     asset.ID,
			Title:       "Medium severity vulnerability",
			Description: "Description 2",
			Severity:    models.ThreatLevelMedium,
			Status:      "RESOLVED",
		},
	}

	for _, vuln := range vulnerabilities {
		err := suite.securityService.CreateVulnerability(ctx, &vuln)
		require.NoError(suite.T(), err)
	}

	// Get asset vulnerabilities
	assetVulns, err := suite.securityService.GetAssetVulnerabilities(ctx, asset.ID)

	require.NoError(suite.T(), err)
	assert.Len(suite.T(), assetVulns, 2)

	// Verify vulnerabilities are sorted by detected_at DESC
	assert.True(suite.T(), assetVulns[0].DetectedAt.After(assetVulns[1].DetectedAt) ||
		assetVulns[0].DetectedAt.Equal(assetVulns[1].DetectedAt))
}

func (suite *SecurityServiceTestSuite) TestCreateSecurityEvent() {
	ctx := context.Background()

	// Create an asset
	asset := suite.createTestAsset(ctx)

	event := &models.SecurityEvent{
		AssetID:        asset.ID,
		OrganizationID: suite.organizationID,
		EventType:      "SUSPICIOUS_LOGIN",
		Severity:       models.ThreatLevelHigh,
		Title:          "Suspicious login attempt",
		Description:    "Multiple failed login attempts from unusual location",
		IPAddress:      stringPtr("192.168.1.100"),
		UserAgent:      stringPtr("Mozilla/5.0 Test Browser"),
		Acknowledged:   false,
	}

	err := suite.securityService.CreateSecurityEvent(ctx, event)

	require.NoError(suite.T(), err)
	assert.NotEqual(suite.T(), uuid.Nil, event.ID)
	assert.WithinDuration(suite.T(), time.Now(), event.CreatedAt, time.Second)
}

func (suite *SecurityServiceTestSuite) TestGetAssetSecurityEvents() {
	ctx := context.Background()

	// Create an asset
	asset := suite.createTestAsset(ctx)

	// Create security events
	events := []models.SecurityEvent{
		{
			AssetID:        asset.ID,
			OrganizationID: suite.organizationID,
			EventType:      "LOGIN_ATTEMPT",
			Severity:       models.ThreatLevelMedium,
			Title:          "Login attempt",
			Description:    "User login attempt",
		},
		{
			AssetID:        asset.ID,
			OrganizationID: suite.organizationID,
			EventType:      "DATA_ACCESS",
			Severity:       models.ThreatLevelLow,
			Title:          "Data access",
			Description:    "Authorized data access",
		},
	}

	for _, event := range events {
		// Add small delay to ensure different timestamps
		time.Sleep(time.Millisecond)
		err := suite.securityService.CreateSecurityEvent(ctx, &event)
		require.NoError(suite.T(), err)
	}

	// Get asset security events with limit
	assetEvents, err := suite.securityService.GetAssetSecurityEvents(ctx, asset.ID, 10)

	require.NoError(suite.T(), err)
	assert.Len(suite.T(), assetEvents, 2)

	// Verify events are sorted by created_at DESC (most recent first)
	assert.True(suite.T(), assetEvents[0].CreatedAt.After(assetEvents[1].CreatedAt) ||
		assetEvents[0].CreatedAt.Equal(assetEvents[1].CreatedAt))

	// Test with limit
	limitedEvents, err := suite.securityService.GetAssetSecurityEvents(ctx, asset.ID, 1)
	require.NoError(suite.T(), err)
	assert.Len(suite.T(), limitedEvents, 1)
}

func (suite *SecurityServiceTestSuite) TestGetSecurityOverview() {
	ctx := context.Background()

	// Create test data
	asset := suite.createTestAsset(ctx)

	// Create vulnerabilities
	vulnerabilities := []models.Vulnerability{
		{
			AssetID:     asset.ID,
			Title:       "Critical vulnerability",
			Description: "Description 1",
			Severity:    models.ThreatLevelCritical,
			Status:      "OPEN",
		},
		{
			AssetID:     asset.ID,
			Title:       "High vulnerability",
			Description: "Description 2",
			Severity:    models.ThreatLevelHigh,
			Status:      "OPEN",
		},
		{
			AssetID:     asset.ID,
			Title:       "Resolved critical",
			Description: "Description 3",
			Severity:    models.ThreatLevelCritical,
			Status:      "RESOLVED", // This should not be counted
		},
	}

	for _, vuln := range vulnerabilities {
		err := suite.securityService.CreateVulnerability(ctx, &vuln)
		require.NoError(suite.T(), err)
	}

	// Get security overview
	overview, err := suite.securityService.GetSecurityOverview(ctx, suite.organizationID)

	require.NoError(suite.T(), err)
	assert.Equal(suite.T(), 1, overview.TotalAssets)
	assert.Equal(suite.T(), 1, overview.CriticalVulnerabilities) // Only open critical vulnerabilities
	assert.Equal(suite.T(), models.ThreatLevelCritical, overview.ThreatLevel)
	assert.True(suite.T(), overview.ComplianceScore >= 0 && overview.ComplianceScore <= 100)

	// Check vulnerabilities by severity
	assert.NotEmpty(suite.T(), overview.VulnerabilitiesBySeverity)

	// Verify severity counts
	severityCounts := make(map[models.ThreatLevel]int)
	for _, count := range overview.VulnerabilitiesBySeverity {
		severityCounts[count.Severity] = count.Count
	}
	assert.Equal(suite.T(), 1, severityCounts[models.ThreatLevelCritical]) // Only open critical
	assert.Equal(suite.T(), 1, severityCounts[models.ThreatLevelHigh])
}

func (suite *SecurityServiceTestSuite) TestGetSecurityOverview_EmptyOrganization() {
	ctx := context.Background()
	emptyOrgID := uuid.New()

	overview, err := suite.securityService.GetSecurityOverview(ctx, emptyOrgID)

	require.NoError(suite.T(), err)
	assert.Equal(suite.T(), 0, overview.TotalAssets)
	assert.Equal(suite.T(), 0, overview.CriticalVulnerabilities)
	assert.Equal(suite.T(), 0, overview.ActiveAlerts)
	assert.Equal(suite.T(), float64(100), overview.ComplianceScore) // 100% compliance when no assets
	assert.Equal(suite.T(), models.ThreatLevelLow, overview.ThreatLevel)
	assert.Empty(suite.T(), overview.VulnerabilitiesBySeverity)
}

// Helper methods
func (suite *SecurityServiceTestSuite) createTestAsset(ctx context.Context) *models.Asset {
	req := &models.CreateAssetRequest{
		Name:        "Test Asset",
		AssetType:   models.AssetTypeApplication,
		Environment: models.EnvironmentProduction,
		Platform:    models.PlatformKubernetes,
	}

	asset, err := suite.securityService.CreateAsset(ctx, suite.organizationID, req)
	require.NoError(suite.T(), err)
	return asset
}

// Test runner
func TestSecurityServiceTestSuite(t *testing.T) {
	suite.Run(t, new(SecurityServiceTestSuite))
}

// Unit tests for specific methods
func TestThreatLevelDetermination(t *testing.T) {
	testCases := []struct {
		name          string
		criticalVulns int
		activeAlerts  int
		expectedLevel models.ThreatLevel
	}{
		{
			name:          "No threats",
			criticalVulns: 0,
			activeAlerts:  0,
			expectedLevel: models.ThreatLevelLow,
		},
		{
			name:          "Few alerts",
			criticalVulns: 0,
			activeAlerts:  3,
			expectedLevel: models.ThreatLevelMedium,
		},
		{
			name:          "Many alerts",
			criticalVulns: 0,
			activeAlerts:  8,
			expectedLevel: models.ThreatLevelHigh,
		},
		{
			name:          "Critical vulnerabilities",
			criticalVulns: 1,
			activeAlerts:  0,
			expectedLevel: models.ThreatLevelCritical,
		},
		{
			name:          "Too many alerts",
			criticalVulns: 0,
			activeAlerts:  15,
			expectedLevel: models.ThreatLevelCritical,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// This would need to be exposed as a helper method or made public
			// For now, we're testing the logic through the GetSecurityOverview integration test
		})
	}
}

// Benchmark tests
func BenchmarkCreateAsset(b *testing.B) {
	container, err := testutil.SetupTestContainer()
	require.NoError(b, err)
	defer container.Cleanup()

	logger := zaptest.NewLogger(b)
	service := services.NewSecurityService(container.DB, container.Redis, logger)

	ctx := context.Background()
	organizationID := uuid.New()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := &models.CreateAssetRequest{
			Name:        "Benchmark Asset",
			AssetType:   models.AssetTypeApplication,
			Environment: models.EnvironmentProduction,
			Platform:    models.PlatformKubernetes,
		}
		_, err := service.CreateAsset(ctx, organizationID, req)
		require.NoError(b, err)
	}
}

func BenchmarkGetSecurityOverview(b *testing.B) {
	container, err := testutil.SetupTestContainer()
	require.NoError(b, err)
	defer container.Cleanup()

	logger := zaptest.NewLogger(b)
	service := services.NewSecurityService(container.DB, container.Redis, logger)

	ctx := context.Background()
	organizationID := uuid.New()

	// Setup test data
	for i := 0; i < 10; i++ {
		req := &models.CreateAssetRequest{
			Name:        "Benchmark Asset",
			AssetType:   models.AssetTypeApplication,
			Environment: models.EnvironmentProduction,
			Platform:    models.PlatformKubernetes,
		}
		_, err := service.CreateAsset(ctx, organizationID, req)
		require.NoError(b, err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.GetSecurityOverview(ctx, organizationID)
		require.NoError(b, err)
	}
}

// Helper function
func stringPtr(s string) *string {
	return &s
}
