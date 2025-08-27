package services_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/candlefish-ai/security-dashboard/internal/config"
	"github.com/candlefish-ai/security-dashboard/internal/models"
	"github.com/candlefish-ai/security-dashboard/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap/zaptest"
)

type KongMonitoringServiceTestSuite struct {
	suite.Suite
	service    *services.KongMonitoringService
	httpServer *httptest.Server
	config     config.KongConfig
}

func (suite *KongMonitoringServiceTestSuite) SetupTest() {
	// Create test HTTP server
	suite.httpServer = httptest.NewServer(http.HandlerFunc(suite.kongAdminAPIHandler))

	suite.config = config.KongConfig{
		AdminURL: suite.httpServer.URL,
		Username: "admin",
		Password: "secret",
	}

	logger := zaptest.NewLogger(suite.T())
	suite.service = services.NewKongMonitoringService(suite.config, logger)
}

func (suite *KongMonitoringServiceTestSuite) TearDownTest() {
	if suite.httpServer != nil {
		suite.httpServer.Close()
	}
}

func (suite *KongMonitoringServiceTestSuite) kongAdminAPIHandler(w http.ResponseWriter, r *http.Request) {
	// Check authentication
	username, password, ok := r.BasicAuth()
	if !ok || username != "admin" || password != "secret" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	switch r.URL.Path {
	case "/":
		// Kong info endpoint
		response := services.KongInfo{
			Version:    "3.4.0",
			NodeID:     "test-node-123",
			Hostname:   "test-kong",
			Tagline:    "Welcome to Kong",
			LuaVersion: "LuaJIT 2.1.0",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	case "/services":
		// Kong services endpoint
		response := services.KongServicesResponse{
			Data: []services.KongService{
				{
					ID:        "service-1",
					Name:      "test-service",
					Protocol:  "http",
					Host:      "httpbin.org",
					Port:      80,
					Path:      "/anything",
					Tags:      []string{"test"},
					CreatedAt: time.Now().Unix(),
					UpdatedAt: time.Now().Unix(),
					Enabled:   true,
				},
				{
					ID:        "service-2",
					Name:      "secure-service",
					Protocol:  "https",
					Host:      "api.example.com",
					Port:      443,
					Tags:      []string{"production"},
					CreatedAt: time.Now().Unix(),
					UpdatedAt: time.Now().Unix(),
					Enabled:   true,
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	case "/routes":
		// Kong routes endpoint
		response := services.KongRoutesResponse{
			Data: []services.KongRoute{
				{
					ID:        "route-1",
					Name:      "insecure-route",
					Protocols: []string{"http"},
					Methods:   []string{"GET", "POST"},
					Hosts:     []string{"api.example.com"},
					Paths:     []string{"/api/v1"},
					HTTPSRedirect: false,
					Service: services.KongService{
						ID:   "service-1",
						Name: "test-service",
					},
					CreatedAt: time.Now().Unix(),
					UpdatedAt: time.Now().Unix(),
				},
				{
					ID:        "route-2",
					Name:      "secure-route",
					Protocols: []string{"https"},
					Methods:   []string{"GET", "POST"},
					Hosts:     []string{"secure.example.com"},
					Paths:     []string{"/api/v2"},
					HTTPSRedirect: true,
					Service: services.KongService{
						ID:   "service-2",
						Name: "secure-service",
					},
					CreatedAt: time.Now().Unix(),
					UpdatedAt: time.Now().Unix(),
				},
				{
					ID:        "route-3",
					Name:      "mixed-route",
					Protocols: []string{"http", "https"},
					Methods:   []string{"GET"},
					Hosts:     []string{"mixed.example.com"},
					Paths:     []string{"/api/v3"},
					HTTPSRedirect: false,
					Service: services.KongService{
						ID:   "service-1",
						Name: "test-service",
					},
					CreatedAt: time.Now().Unix(),
					UpdatedAt: time.Now().Unix(),
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func (suite *KongMonitoringServiceTestSuite) TestGetAdminAPIStatus_HTTP_Vulnerable() {
	ctx := context.Background()

	// Test with HTTP URL (vulnerable)
	suite.config.AdminURL = "http://kong-admin:8001"
	suite.service = services.NewKongMonitoringService(suite.config, zaptest.NewLogger(suite.T()))

	status, err := suite.service.GetAdminAPIStatus(ctx)

	require.NoError(suite.T(), err)
	assert.False(suite.T(), status.IsSecure)
	assert.True(suite.T(), status.IsVulnerable)
	assert.Equal(suite.T(), "HTTP", status.Protocol)
	assert.Equal(suite.T(), models.ThreatLevelCritical, status.RiskLevel)
	assert.NotNil(suite.T(), status.VulnerabilityDescription)
	assert.Contains(suite.T(), *status.VulnerabilityDescription, "HTTP protocol")
	assert.NotEmpty(suite.T(), status.RecommendedActions)
	assert.Contains(suite.T(), status.RecommendedActions[0], "restrict Admin API access")
	assert.WithinDuration(suite.T(), time.Now(), status.LastChecked, time.Second)
}

func (suite *KongMonitoringServiceTestSuite) TestGetAdminAPIStatus_HTTPS_Secure() {
	ctx := context.Background()

	// Create HTTPS test server
	httpsServer := httptest.NewTLSServer(http.HandlerFunc(suite.kongAdminAPIHandler))
	defer httpsServer.Close()

	suite.config.AdminURL = httpsServer.URL
	suite.service = services.NewKongMonitoringService(suite.config, zaptest.NewLogger(suite.T()))

	// Skip TLS verification for test
	suite.service = services.NewKongMonitoringService(suite.config, zaptest.NewLogger(suite.T()))

	status, err := suite.service.GetAdminAPIStatus(ctx)

	require.NoError(suite.T(), err)
	assert.True(suite.T(), status.IsSecure)
	assert.False(suite.T(), status.IsVulnerable)
	assert.Equal(suite.T(), "HTTPS", status.Protocol)
	assert.Equal(suite.T(), models.ThreatLevelLow, status.RiskLevel)
	assert.NotEmpty(suite.T(), status.RecommendedActions)
	assert.Contains(suite.T(), status.RecommendedActions[0], "Continue monitoring")
}

func (suite *KongMonitoringServiceTestSuite) TestGetKongInfo() {
	ctx := context.Background()

	info, err := suite.service.GetKongInfo(ctx)

	require.NoError(suite.T(), err)
	assert.Equal(suite.T(), "3.4.0", info.Version)
	assert.Equal(suite.T(), "test-node-123", info.NodeID)
	assert.Equal(suite.T(), "test-kong", info.Hostname)
	assert.Equal(suite.T(), "Welcome to Kong", info.Tagline)
	assert.Equal(suite.T(), "LuaJIT 2.1.0", info.LuaVersion)
}

func (suite *KongMonitoringServiceTestSuite) TestGetKongInfo_Unauthorized() {
	ctx := context.Background()

	// Create service without credentials
	noAuthConfig := config.KongConfig{
		AdminURL: suite.httpServer.URL,
	}
	noAuthService := services.NewKongMonitoringService(noAuthConfig, zaptest.NewLogger(suite.T()))

	_, err := noAuthService.GetKongInfo(ctx)

	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "status 401")
}

func (suite *KongMonitoringServiceTestSuite) TestGetServices() {
	ctx := context.Background()

	services, err := suite.service.GetServices(ctx)

	require.NoError(suite.T(), err)
	assert.Len(suite.T(), services, 2)

	// Check first service
	assert.Equal(suite.T(), "service-1", services[0].ID)
	assert.Equal(suite.T(), "test-service", services[0].Name)
	assert.Equal(suite.T(), "http", services[0].Protocol)
	assert.Equal(suite.T(), "httpbin.org", services[0].Host)
	assert.Equal(suite.T(), 80, services[0].Port)
	assert.True(suite.T(), services[0].Enabled)

	// Check second service
	assert.Equal(suite.T(), "service-2", services[1].ID)
	assert.Equal(suite.T(), "secure-service", services[1].Name)
	assert.Equal(suite.T(), "https", services[1].Protocol)
	assert.Equal(suite.T(), "api.example.com", services[1].Host)
	assert.Equal(suite.T(), 443, services[1].Port)
}

func (suite *KongMonitoringServiceTestSuite) TestGetRoutes() {
	ctx := context.Background()

	routes, err := suite.service.GetRoutes(ctx)

	require.NoError(suite.T(), err)
	assert.Len(suite.T(), routes, 3)

	// Check insecure route
	insecureRoute := routes[0]
	assert.Equal(suite.T(), "route-1", insecureRoute.ID)
	assert.Equal(suite.T(), "insecure-route", insecureRoute.Name)
	assert.Equal(suite.T(), []string{"http"}, insecureRoute.Protocols)
	assert.False(suite.T(), insecureRoute.HTTPSRedirect)

	// Check secure route
	secureRoute := routes[1]
	assert.Equal(suite.T(), "route-2", secureRoute.ID)
	assert.Equal(suite.T(), "secure-route", secureRoute.Name)
	assert.Equal(suite.T(), []string{"https"}, secureRoute.Protocols)
	assert.True(suite.T(), secureRoute.HTTPSRedirect)

	// Check mixed route
	mixedRoute := routes[2]
	assert.Equal(suite.T(), "route-3", mixedRoute.ID)
	assert.Equal(suite.T(), "mixed-route", mixedRoute.Name)
	assert.Equal(suite.T(), []string{"http", "https"}, mixedRoute.Protocols)
	assert.False(suite.T(), mixedRoute.HTTPSRedirect)
}

func (suite *KongMonitoringServiceTestSuite) TestCheckInsecureRoutes() {
	ctx := context.Background()

	insecureRoutes, err := suite.service.CheckInsecureRoutes(ctx)

	require.NoError(suite.T(), err)
	assert.Len(suite.T(), insecureRoutes, 2) // route-1 and route-3 both allow HTTP

	// Verify the insecure routes
	routeIDs := make([]string, len(insecureRoutes))
	for i, route := range insecureRoutes {
		routeIDs[i] = route.ID
	}
	assert.Contains(suite.T(), routeIDs, "route-1")
	assert.Contains(suite.T(), routeIDs, "route-3")

	// route-2 should not be in the list as it only uses HTTPS
	for _, route := range insecureRoutes {
		assert.NotEqual(suite.T(), "route-2", route.ID)
	}
}

func (suite *KongMonitoringServiceTestSuite) TestMonitorContinuously() {
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	callCount := 0
	var lastStatus *models.KongAPIStatus

	callback := func(status *models.KongAPIStatus) {
		callCount++
		lastStatus = status
	}

	// Start monitoring with very short interval
	go suite.service.MonitorContinuously(ctx, 50*time.Millisecond, callback)

	// Wait for context to expire
	<-ctx.Done()

	// Should have been called at least once (initial check)
	assert.GreaterOrEqual(suite.T(), callCount, 1)
	assert.NotNil(suite.T(), lastStatus)
}

// Test runner
func TestKongMonitoringServiceTestSuite(t *testing.T) {
	suite.Run(t, new(KongMonitoringServiceTestSuite))
}

// Unit tests for edge cases
func TestKongMonitoringService_ConnectionErrors(t *testing.T) {
	logger := zaptest.NewLogger(t)

	// Test with invalid URL
	config := config.KongConfig{
		AdminURL: "http://nonexistent-kong-server:8001",
		Username: "admin",
		Password: "secret",
	}

	service := services.NewKongMonitoringService(config, logger)
	ctx := context.Background()

	// All methods should return connection errors
	_, err := service.GetKongInfo(ctx)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to make request")

	_, err = service.GetServices(ctx)
	assert.Error(t, err)

	_, err = service.GetRoutes(ctx)
	assert.Error(t, err)

	_, err = service.CheckInsecureRoutes(ctx)
	assert.Error(t, err)
}

func TestKongMonitoringService_InvalidResponse(t *testing.T) {
	// Create server that returns invalid JSON
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("invalid json response"))
	}))
	defer server.Close()

	logger := zaptest.NewLogger(t)
	config := config.KongConfig{
		AdminURL: server.URL,
	}

	service := services.NewKongMonitoringService(config, logger)
	ctx := context.Background()

	_, err := service.GetKongInfo(ctx)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to unmarshal")
}

func TestKongMonitoringService_HTTPStatusErrors(t *testing.T) {
	// Create server that returns HTTP errors
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/":
			w.WriteHeader(http.StatusServiceUnavailable)
		case "/services":
			w.WriteHeader(http.StatusInternalServerError)
		case "/routes":
			w.WriteHeader(http.StatusForbidden)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	logger := zaptest.NewLogger(t)
	config := config.KongConfig{
		AdminURL: server.URL,
	}

	service := services.NewKongMonitoringService(config, logger)
	ctx := context.Background()

	_, err := service.GetKongInfo(ctx)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "returned status 503")

	_, err = service.GetServices(ctx)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "returned status 500")

	_, err = service.GetRoutes(ctx)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "returned status 403")
}

// Benchmark tests
func BenchmarkGetKongInfo(b *testing.B) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := services.KongInfo{
			Version:    "3.4.0",
			NodeID:     "benchmark-node",
			Hostname:   "benchmark-kong",
			Tagline:    "Welcome to Kong",
			LuaVersion: "LuaJIT 2.1.0",
		}
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	logger := zaptest.NewLogger(b)
	config := config.KongConfig{AdminURL: server.URL}
	service := services.NewKongMonitoringService(config, logger)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.GetKongInfo(ctx)
		require.NoError(b, err)
	}
}
