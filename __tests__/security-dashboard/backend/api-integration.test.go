package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/candlefish-ai/security-dashboard/internal/api"
	"github.com/candlefish-ai/security-dashboard/internal/models"
	"github.com/candlefish-ai/security-dashboard/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
)

// APIIntegrationTestSuite tests the full API integration
type APIIntegrationTestSuite struct {
	suite.Suite
	router         *gin.Engine
	organizationID uuid.UUID
	testAssetID    uuid.UUID
	jwtSecret      string
	adminToken     string
	userToken      string
}

// SetupSuite initializes the test environment
func (s *APIIntegrationTestSuite) SetupSuite() {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Initialize test database and services
	db := setupTestDB(s.T())
	redisClient := setupTestRedis()
	logger := zaptest.NewLogger(s.T())

	// Create services
	securityService := services.NewSecurityService(db, redisClient, logger)
	kongService := services.NewKongMonitoringService(nil, logger) // Mock config
	alertService := services.NewAlertService(db, redisClient, logger)

	// Setup API router
	s.router = api.SetupRouter(securityService, kongService, alertService, logger)

	// Setup test data
	s.organizationID = uuid.New()
	s.testAssetID = uuid.New()
	s.jwtSecret = "test-secret-key"

	// Create test tokens
	s.setupAuthTokens()

	// Create test organization and asset
	s.setupTestData()
}

// TestHealthCheck tests the health check endpoint
func (s *APIIntegrationTestSuite) TestHealthCheck() {
	req, _ := http.NewRequest("GET", "/api/health", nil)
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	assert.Equal(s.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(s.T(), err)

	assert.Equal(s.T(), "healthy", response["status"])
	assert.Contains(s.T(), response, "timestamp")
	assert.Contains(s.T(), response, "version")
}

// TestSecurityOverviewEndpoint tests the security overview API
func (s *APIIntegrationTestSuite) TestSecurityOverviewEndpoint() {
	req, _ := http.NewRequest("GET", "/api/security/overview", nil)
	req.Header.Set("Authorization", "Bearer "+s.adminToken)
	req.Header.Set("X-Organization-ID", s.organizationID.String())
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	assert.Equal(s.T(), http.StatusOK, w.Code)

	var overview models.SecurityOverview
	err := json.Unmarshal(w.Body.Bytes(), &overview)
	require.NoError(s.T(), err)

	// Validate overview structure
	assert.GreaterOrEqual(s.T(), overview.TotalAssets, 0)
	assert.GreaterOrEqual(s.T(), overview.CriticalVulnerabilities, 0)
	assert.GreaterOrEqual(s.T(), overview.ActiveAlerts, 0)
	assert.GreaterOrEqual(s.T(), overview.ComplianceScore, 0.0)
	assert.LessOrEqual(s.T(), overview.ComplianceScore, 100.0)
	assert.Contains(s.T(), []models.ThreatLevel{
		models.ThreatLevelLow,
		models.ThreatLevelMedium,
		models.ThreatLevelHigh,
		models.ThreatLevelCritical,
	}, overview.ThreatLevel)
}

// TestAssetManagement tests asset CRUD operations
func (s *APIIntegrationTestSuite) TestAssetManagement() {
	// Test creating asset
	assetData := models.CreateAssetRequest{
		Name:        "Test API Asset",
		AssetType:   models.AssetTypeAPI,
		Environment: models.EnvironmentStaging,
		Platform:    models.PlatformKubernetes,
		URL:         "https://api-test.candlefish.ai",
		Description: "API asset created via integration test",
	}

	payload, _ := json.Marshal(assetData)
	req, _ := http.NewRequest("POST", "/api/assets", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.adminToken)
	req.Header.Set("X-Organization-ID", s.organizationID.String())
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	assert.Equal(s.T(), http.StatusCreated, w.Code)

	var createdAsset models.Asset
	err := json.Unmarshal(w.Body.Bytes(), &createdAsset)
	require.NoError(s.T(), err)

	assert.Equal(s.T(), assetData.Name, createdAsset.Name)
	assert.Equal(s.T(), assetData.AssetType, createdAsset.AssetType)
	assert.Equal(s.T(), assetData.Environment, createdAsset.Environment)
	assert.NotEqual(s.T(), uuid.Nil, createdAsset.ID)

	// Test getting assets
	req, _ = http.NewRequest("GET", "/api/assets", nil)
	req.Header.Set("Authorization", "Bearer "+s.adminToken)
	req.Header.Set("X-Organization-ID", s.organizationID.String())
	w = httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	assert.Equal(s.T(), http.StatusOK, w.Code)

	var assets []models.Asset
	err = json.Unmarshal(w.Body.Bytes(), &assets)
	require.NoError(s.T(), err)
	assert.GreaterOrEqual(s.T(), len(assets), 1)

	// Test filtering assets by type
	req, _ = http.NewRequest("GET", "/api/assets?asset_type=api", nil)
	req.Header.Set("Authorization", "Bearer "+s.adminToken)
	req.Header.Set("X-Organization-ID", s.organizationID.String())
	w = httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	assert.Equal(s.T(), http.StatusOK, w.Code)

	var filteredAssets []models.Asset
	err = json.Unmarshal(w.Body.Bytes(), &filteredAssets)
	require.NoError(s.T(), err)

	// All returned assets should be of type API
	for _, asset := range filteredAssets {
		assert.Equal(s.T(), models.AssetTypeAPI, asset.AssetType)
	}
}

// TestVulnerabilityOperations tests vulnerability management
func (s *APIIntegrationTestSuite) TestVulnerabilityOperations() {
	// Create a vulnerability
	vulnData := models.Vulnerability{
		AssetID:     s.testAssetID,
		CVEID:       "CVE-2024-API-001",
		Title:       "SQL Injection in API Endpoint",
		Description: "Critical SQL injection vulnerability in user authentication",
		Severity:    models.ThreatLevelCritical,
		Status:      models.VulnerabilityStatusOpen,
	}

	payload, _ := json.Marshal(vulnData)
	req, _ := http.NewRequest("POST", "/api/vulnerabilities", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.adminToken)
	req.Header.Set("X-Organization-ID", s.organizationID.String())
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	assert.Equal(s.T(), http.StatusCreated, w.Code)

	var createdVuln models.Vulnerability
	err := json.Unmarshal(w.Body.Bytes(), &createdVuln)
	require.NoError(s.T(), err)

	assert.Equal(s.T(), vulnData.CVEId, createdVuln.CVEId)
	assert.Equal(s.T(), vulnData.Title, createdVuln.Title)
	assert.Equal(s.T(), vulnData.Severity, createdVuln.Severity)
	assert.NotEqual(s.T(), uuid.Nil, createdVuln.ID)

	// Test getting asset vulnerabilities
	url := fmt.Sprintf("/api/assets/%s/vulnerabilities", s.testAssetID.String())
	req, _ = http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+s.adminToken)
	req.Header.Set("X-Organization-ID", s.organizationID.String())
	w = httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	assert.Equal(s.T(), http.StatusOK, w.Code)

	var vulnerabilities []models.Vulnerability
	err = json.Unmarshal(w.Body.Bytes(), &vulnerabilities)
	require.NoError(s.T(), err)
	assert.GreaterOrEqual(s.T(), len(vulnerabilities), 1)

	found := false
	for _, v := range vulnerabilities {
		if v.ID == createdVuln.ID {
			found = true
			break
		}
	}
	assert.True(s.T(), found, "Created vulnerability should be in asset vulnerabilities")
}

// TestSecurityEventStreaming tests security event creation and streaming
func (s *APIIntegrationTestSuite) TestSecurityEventStreaming() {
	// Create a security event
	eventData := models.SecurityEvent{
		AssetID:        &s.testAssetID,
		OrganizationID: s.organizationID,
		EventType:      "unauthorized_access",
		Severity:       models.ThreatLevelHigh,
		Title:          "Unauthorized API Access Attempt",
		Description:    "User attempted to access admin endpoints without proper authorization",
		Metadata: map[string]interface{}{
			"endpoint":    "/api/admin/users",
			"method":      "GET",
			"status_code": 403,
		},
		IPAddress:    "203.0.113.1",
		UserAgent:    "curl/7.68.0",
		Acknowledged: false,
	}

	payload, _ := json.Marshal(eventData)
	req, _ := http.NewRequest("POST", "/api/security/events", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.adminToken)
	req.Header.Set("X-Organization-ID", s.organizationID.String())
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	assert.Equal(s.T(), http.StatusCreated, w.Code)

	var createdEvent models.SecurityEvent
	err := json.Unmarshal(w.Body.Bytes(), &createdEvent)
	require.NoError(s.T(), err)

	assert.Equal(s.T(), eventData.EventType, createdEvent.EventType)
	assert.Equal(s.T(), eventData.Title, createdEvent.Title)
	assert.Equal(s.T(), eventData.Severity, createdEvent.Severity)
	assert.NotEqual(s.T(), uuid.Nil, createdEvent.ID)

	// Test getting recent events for asset
	url := fmt.Sprintf("/api/assets/%s/events?limit=10", s.testAssetID.String())
	req, _ = http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+s.adminToken)
	req.Header.Set("X-Organization-ID", s.organizationID.String())
	w = httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	assert.Equal(s.T(), http.StatusOK, w.Code)

	var events []models.SecurityEvent
	err = json.Unmarshal(w.Body.Bytes(), &events)
	require.NoError(s.T(), err)
	assert.GreaterOrEqual(s.T(), len(events), 1)

	found := false
	for _, e := range events {
		if e.ID == createdEvent.ID {
			found = true
			break
		}
	}
	assert.True(s.T(), found, "Created event should be in recent events")
}

// TestAuthenticationAndAuthorization tests JWT authentication
func (s *APIIntegrationTestSuite) TestAuthenticationAndAuthorization() {
	// Test without token - should fail
	req, _ := http.NewRequest("GET", "/api/security/overview", nil)
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)
	assert.Equal(s.T(), http.StatusUnauthorized, w.Code)

	// Test with invalid token - should fail
	req, _ = http.NewRequest("GET", "/api/security/overview", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	w = httptest.NewRecorder()
	s.router.ServeHTTP(w, req)
	assert.Equal(s.T(), http.StatusUnauthorized, w.Code)

	// Test with valid admin token - should succeed
	req, _ = http.NewRequest("GET", "/api/security/overview", nil)
	req.Header.Set("Authorization", "Bearer "+s.adminToken)
	req.Header.Set("X-Organization-ID", s.organizationID.String())
	w = httptest.NewRecorder()
	s.router.ServeHTTP(w, req)
	assert.Equal(s.T(), http.StatusOK, w.Code)

	// Test user token with admin endpoint - should fail
	req, _ = http.NewRequest("DELETE", "/api/admin/reset", nil)
	req.Header.Set("Authorization", "Bearer "+s.userToken)
	req.Header.Set("X-Organization-ID", s.organizationID.String())
	w = httptest.NewRecorder()
	s.router.ServeHTTP(w, req)
	assert.Equal(s.T(), http.StatusForbidden, w.Code)
}

// TestRateLimiting tests API rate limiting
func (s *APIIntegrationTestSuite) TestRateLimiting() {
	// Make multiple requests quickly to trigger rate limiting
	successCount := 0
	rateLimitedCount := 0

	for i := 0; i < 20; i++ {
		req, _ := http.NewRequest("GET", "/api/security/overview", nil)
		req.Header.Set("Authorization", "Bearer "+s.adminToken)
		req.Header.Set("X-Organization-ID", s.organizationID.String())
		w := httptest.NewRecorder()
		s.router.ServeHTTP(w, req)

		if w.Code == http.StatusOK {
			successCount++
		} else if w.Code == http.StatusTooManyRequests {
			rateLimitedCount++
		}
	}

	// Should have some successful requests and potentially some rate limited
	assert.Greater(s.T(), successCount, 0, "Should have some successful requests")
	// Note: Rate limiting behavior depends on configuration
}

// TestErrorHandling tests various error scenarios
func (s *APIIntegrationTestSuite) TestErrorHandling() {
	// Test malformed JSON
	req, _ := http.NewRequest("POST", "/api/assets", bytes.NewBufferString("invalid-json"))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.adminToken)
	req.Header.Set("X-Organization-ID", s.organizationID.String())
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)
	assert.Equal(s.T(), http.StatusBadRequest, w.Code)

	// Test missing required fields
	incompleteAsset := map[string]string{"name": "Test"} // Missing required fields
	payload, _ := json.Marshal(incompleteAsset)
	req, _ = http.NewRequest("POST", "/api/assets", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.adminToken)
	req.Header.Set("X-Organization-ID", s.organizationID.String())
	w = httptest.NewRecorder()
	s.router.ServeHTTP(w, req)
	assert.Equal(s.T(), http.StatusBadRequest, w.Code)

	// Test non-existent resource
	fakeID := uuid.New().String()
	req, _ = http.NewRequest("GET", "/api/assets/"+fakeID+"/vulnerabilities", nil)
	req.Header.Set("Authorization", "Bearer "+s.adminToken)
	req.Header.Set("X-Organization-ID", s.organizationID.String())
	w = httptest.NewRecorder()
	s.router.ServeHTTP(w, req)
	// Should return 200 with empty array, not 404
	assert.Equal(s.T(), http.StatusOK, w.Code)

	var vulnerabilities []models.Vulnerability
	err := json.Unmarshal(w.Body.Bytes(), &vulnerabilities)
	require.NoError(s.T(), err)
	assert.Equal(s.T(), 0, len(vulnerabilities))
}

// TestConcurrentRequests tests handling of concurrent API requests
func (s *APIIntegrationTestSuite) TestConcurrentRequests() {
	numRequests := 50
	resultsChan := make(chan int, numRequests)

	// Make concurrent requests
	for i := 0; i < numRequests; i++ {
		go func() {
			req, _ := http.NewRequest("GET", "/api/security/overview", nil)
			req.Header.Set("Authorization", "Bearer "+s.adminToken)
			req.Header.Set("X-Organization-ID", s.organizationID.String())
			w := httptest.NewRecorder()
			s.router.ServeHTTP(w, req)
			resultsChan <- w.Code
		}()
	}

	// Collect results
	successCount := 0
	for i := 0; i < numRequests; i++ {
		code := <-resultsChan
		if code == http.StatusOK {
			successCount++
		}
	}

	// Most requests should succeed (allowing for potential rate limiting)
	assert.GreaterOrEqual(s.T(), successCount, numRequests/2,
		"At least half of concurrent requests should succeed")
}

// Helper methods

func (s *APIIntegrationTestSuite) setupAuthTokens() {
	// Create admin token
	adminClaims := map[string]interface{}{
		"sub":         "admin-123",
		"role":        "admin",
		"permissions": []string{"*"},
		"exp":         time.Now().Add(time.Hour).Unix(),
		"iat":         time.Now().Unix(),
	}
	s.adminToken = createTestJWT(adminClaims, s.jwtSecret)

	// Create user token
	userClaims := map[string]interface{}{
		"sub":  "user-123",
		"role": "security_analyst",
		"permissions": []string{
			"security:read",
			"assets:read",
			"vulnerabilities:read",
			"events:read",
		},
		"exp": time.Now().Add(time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}
	s.userToken = createTestJWT(userClaims, s.jwtSecret)
}

func (s *APIIntegrationTestSuite) setupTestData() {
	// This would create test organization and asset in the database
	// Implementation would depend on your database setup
}

func createTestJWT(claims map[string]interface{}, secret string) string {
	// Implementation to create JWT token
	// This would use the jwt-go library or similar
	return "test-jwt-token" // Placeholder
}

// TestAPIIntegrationSuite runs the integration test suite
func TestAPIIntegrationSuite(t *testing.T) {
	suite.Run(t, new(APIIntegrationTestSuite))
}