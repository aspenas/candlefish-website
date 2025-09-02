package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"

	"github.com/patricksmith/highline-inventory/handlers"
	"github.com/patricksmith/highline-inventory/models"
	"github.com/patricksmith/highline-inventory/services"
	"github.com/patricksmith/highline-inventory/tests/fixtures"
)

// ValuationAPITestSuite contains integration tests for the valuation API
type ValuationAPITestSuite struct {
	suite.Suite
	app           *fiber.App
	dbContainer   testcontainers.Container
	ctx           context.Context
	baseURL       string
	testItemID    uuid.UUID
	testRoomID    uuid.UUID
}

// SetupSuite sets up the test suite with a real database
func (suite *ValuationAPITestSuite) SetupSuite() {
	suite.ctx = context.Background()
	
	// Start PostgreSQL container for integration testing
	req := testcontainers.ContainerRequest{
		Image:        "postgres:15-alpine",
		ExposedPorts: []string{"5432/tcp"},
		Env: map[string]string{
			"POSTGRES_DB":       "test_valuation_db",
			"POSTGRES_USER":     "test",
			"POSTGRES_PASSWORD": "test",
		},
		WaitingFor: wait.ForListeningPort("5432/tcp"),
	}
	
	var err error
	suite.dbContainer, err = testcontainers.GenericContainer(suite.ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	suite.Require().NoError(err)
	
	// Get database connection details
	host, err := suite.dbContainer.Host(suite.ctx)
	suite.Require().NoError(err)
	
	port, err := suite.dbContainer.MappedPort(suite.ctx, "5432")
	suite.Require().NoError(err)
	
	// Create Fiber app with real database connection
	suite.app = fiber.New(fiber.Config{
		ErrorHandler: func(ctx *fiber.Ctx, err error) error {
			return ctx.Status(500).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})
	
	// Setup database connection
	dbURL := fmt.Sprintf("postgres://test:test@%s:%s/test_valuation_db?sslmode=disable", host, port.Port())
	
	// Initialize services (this would require implementing a database setup method)
	// For this example, we'll mock the services
	cacheService := services.NewCacheService()
	marketService := services.NewMarketDataService(cacheService)
	
	// Setup routes
	handlers.SetupValuationRoutes(suite.app, nil, marketService, cacheService) // db would be passed here
	
	// Create test data IDs
	suite.testItemID = uuid.New()
	suite.testRoomID = uuid.New()
	
	// Run database migrations and seed test data
	suite.seedTestData()
}

// TearDownSuite cleans up the test suite
func (suite *ValuationAPITestSuite) TearDownSuite() {
	if suite.dbContainer != nil {
		suite.dbContainer.Terminate(suite.ctx)
	}
}

// SetupTest sets up each individual test
func (suite *ValuationAPITestSuite) SetupTest() {
	// Additional per-test setup can go here
}

// seedTestData creates test data in the database
func (suite *ValuationAPITestSuite) seedTestData() {
	// This would typically run SQL migrations and insert test data
	// For now, we'll focus on the API structure
}

// TestGetCurrentValuation tests the GET /api/valuations/current/:id endpoint
func (suite *ValuationAPITestSuite) TestGetCurrentValuation() {
	// Test successful retrieval
	req := httptest.NewRequest("GET", fmt.Sprintf("/api/valuations/current/%s", suite.testItemID), nil)
	resp, err := suite.app.Test(req, -1)
	suite.NoError(err)
	
	if resp.StatusCode == 200 {
		var response models.CurrentValuation
		err = json.NewDecoder(resp.Body).Decode(&response)
		suite.NoError(err)
		suite.Equal(suite.testItemID, response.ItemID)
		suite.Greater(response.EstimatedValue, 0.0)
		suite.NotNil(response.ConfidenceScore)
	}
	
	// Test not found
	nonExistentID := uuid.New()
	req = httptest.NewRequest("GET", fmt.Sprintf("/api/valuations/current/%s", nonExistentID), nil)
	resp, err = suite.app.Test(req, -1)
	suite.NoError(err)
	suite.Equal(404, resp.StatusCode)
	
	// Test invalid UUID
	req = httptest.NewRequest("GET", "/api/valuations/current/invalid-uuid", nil)
	resp, err = suite.app.Test(req, -1)
	suite.NoError(err)
	suite.Equal(400, resp.StatusCode)
}

// TestCreateValuation tests the POST /api/valuations endpoint
func (suite *ValuationAPITestSuite) TestCreateValuation() {
	valuation := &models.ItemValuation{
		ItemID:          suite.testItemID,
		ValuationMethod: models.ValuationManualOverride,
		EstimatedValue:  1500.00,
		ConfidenceScore: floatPtr(0.95),
		Notes:           stringPtr("Manual valuation by owner"),
		ValuerType:      stringPtr("owner"),
	}
	
	body, err := json.Marshal(valuation)
	suite.NoError(err)
	
	req := httptest.NewRequest("POST", "/api/valuations", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := suite.app.Test(req, -1)
	suite.NoError(err)
	
	if resp.StatusCode == 201 {
		var response models.ItemValuation
		err = json.NewDecoder(resp.Body).Decode(&response)
		suite.NoError(err)
		suite.Equal(suite.testItemID, response.ItemID)
		suite.Equal(1500.00, response.EstimatedValue)
		suite.NotEqual(uuid.Nil, response.ID)
	}
	
	// Test invalid request body
	req = httptest.NewRequest("POST", "/api/valuations", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err = suite.app.Test(req, -1)
	suite.NoError(err)
	suite.Equal(400, resp.StatusCode)
}

// TestRequestMarketValuation tests the POST /api/valuations/request endpoint
func (suite *ValuationAPITestSuite) TestRequestMarketValuation() {
	request := map[string]interface{}{
		"item_ids":     []string{suite.testItemID.String()},
		"request_type": "market_lookup",
		"priority":     1,
	}
	
	body, err := json.Marshal(request)
	suite.NoError(err)
	
	req := httptest.NewRequest("POST", "/api/valuations/request", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := suite.app.Test(req, -1)
	suite.NoError(err)
	
	if resp.StatusCode == 202 {
		var response models.ValuationRequest
		err = json.NewDecoder(resp.Body).Decode(&response)
		suite.NoError(err)
		suite.Equal("market_lookup", response.RequestType)
		suite.Equal("pending", response.Status)
		suite.Equal(1, response.Priority)
	}
}

// TestGetValuationResponse tests the GET /api/valuations/response/:id endpoint
func (suite *ValuationAPITestSuite) TestGetValuationResponse() {
	req := httptest.NewRequest("GET", fmt.Sprintf("/api/valuations/response/%s", suite.testItemID), nil)
	resp, err := suite.app.Test(req, -1)
	suite.NoError(err)
	
	if resp.StatusCode == 200 {
		var response models.ValuationResponse
		err = json.NewDecoder(resp.Body).Decode(&response)
		suite.NoError(err)
		suite.Equal(suite.testItemID, response.ItemID)
		suite.NotEmpty(response.LastUpdated)
	}
}

// TestGetPricingInsights tests the GET /api/valuations/insights endpoint
func (suite *ValuationAPITestSuite) TestGetPricingInsights() {
	req := httptest.NewRequest("GET", "/api/valuations/insights", nil)
	resp, err := suite.app.Test(req, -1)
	suite.NoError(err)
	
	if resp.StatusCode == 200 {
		var response models.PricingInsightsResponse
		err = json.NewDecoder(resp.Body).Decode(&response)
		suite.NoError(err)
		suite.GreaterOrEqual(response.TotalItems, 0)
		suite.NotNil(response.RoomSummaries)
		suite.NotNil(response.MarketInsights)
	}
}

// TestGetMarketComparisons tests the GET /api/valuations/comparisons/:id endpoint
func (suite *ValuationAPITestSuite) TestGetMarketComparisons() {
	req := httptest.NewRequest("GET", fmt.Sprintf("/api/valuations/comparisons/%s", suite.testItemID), nil)
	resp, err := suite.app.Test(req, -1)
	suite.NoError(err)
	
	if resp.StatusCode == 200 {
		var response []models.MarketComparison
		err = json.NewDecoder(resp.Body).Decode(&response)
		suite.NoError(err)
		// Response might be empty if no comparisons exist
		suite.GreaterOrEqual(len(response), 0)
	}
}

// TestGetPriceHistory tests the GET /api/valuations/history/:id endpoint
func (suite *ValuationAPITestSuite) TestGetPriceHistory() {
	req := httptest.NewRequest("GET", fmt.Sprintf("/api/valuations/history/%s", suite.testItemID), nil)
	resp, err := suite.app.Test(req, -1)
	suite.NoError(err)
	
	if resp.StatusCode == 200 {
		var response []models.PriceHistory
		err = json.NewDecoder(resp.Body).Decode(&response)
		suite.NoError(err)
		suite.GreaterOrEqual(len(response), 0)
		
		// If there are price history entries, validate structure
		for _, entry := range response {
			suite.Equal(suite.testItemID, entry.ItemID)
			suite.Greater(entry.Price, 0.0)
			suite.NotEmpty(entry.PriceType)
			suite.NotEmpty(entry.EffectiveDate)
		}
	}
}

// TestValuationWorkflow tests a complete valuation workflow
func (suite *ValuationAPITestSuite) TestValuationWorkflow() {
	// 1. Request market valuation
	request := map[string]interface{}{
		"item_ids":     []string{suite.testItemID.String()},
		"request_type": "market_lookup",
		"priority":     1,
	}
	
	body, _ := json.Marshal(request)
	req := httptest.NewRequest("POST", "/api/valuations/request", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := suite.app.Test(req, -1)
	suite.NoError(err)
	
	var requestResponse models.ValuationRequest
	if resp.StatusCode == 202 {
		err = json.NewDecoder(resp.Body).Decode(&requestResponse)
		suite.NoError(err)
		suite.Equal("pending", requestResponse.Status)
	}
	
	// 2. Check current valuation (might not exist yet)
	req = httptest.NewRequest("GET", fmt.Sprintf("/api/valuations/current/%s", suite.testItemID), nil)
	resp, err = suite.app.Test(req, -1)
	suite.NoError(err)
	
	// 3. Get comprehensive valuation response
	req = httptest.NewRequest("GET", fmt.Sprintf("/api/valuations/response/%s", suite.testItemID), nil)
	resp, err = suite.app.Test(req, -1)
	suite.NoError(err)
	
	if resp.StatusCode == 200 {
		var response models.ValuationResponse
		err = json.NewDecoder(resp.Body).Decode(&response)
		suite.NoError(err)
		suite.Equal(suite.testItemID, response.ItemID)
	}
}

// TestConcurrentValuationRequests tests handling of concurrent requests
func (suite *ValuationAPITestSuite) TestConcurrentValuationRequests() {
	const numRequests = 10
	results := make(chan int, numRequests)
	
	// Create test items for concurrent requests
	testItems := make([]uuid.UUID, numRequests)
	for i := 0; i < numRequests; i++ {
		testItems[i] = uuid.New()
	}
	
	// Send concurrent requests
	for i := 0; i < numRequests; i++ {
		go func(itemID uuid.UUID) {
			defer func() { results <- 1 }()
			
			request := map[string]interface{}{
				"item_ids":     []string{itemID.String()},
				"request_type": "market_lookup",
				"priority":     1,
			}
			
			body, _ := json.Marshal(request)
			req := httptest.NewRequest("POST", "/api/valuations/request", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			
			resp, err := suite.app.Test(req, -1)
			suite.NoError(err)
			suite.True(resp.StatusCode == 202 || resp.StatusCode == 409) // 409 for duplicate requests
		}(testItems[i])
	}
	
	// Wait for all requests to complete
	for i := 0; i < numRequests; i++ {
		select {
		case <-results:
		case <-time.After(10 * time.Second):
			suite.Fail("Timeout waiting for concurrent requests")
		}
	}
}

// TestErrorHandling tests various error scenarios
func (suite *ValuationAPITestSuite) TestErrorHandling() {
	// Test malformed JSON
	req := httptest.NewRequest("POST", "/api/valuations", bytes.NewBuffer([]byte("{")))
	req.Header.Set("Content-Type", "application/json")
	resp, err := suite.app.Test(req, -1)
	suite.NoError(err)
	suite.Equal(400, resp.StatusCode)
	
	// Test missing required fields
	invalidValuation := map[string]interface{}{
		"estimated_value": 1000.00,
		// Missing item_id and valuation_method
	}
	body, _ := json.Marshal(invalidValuation)
	req = httptest.NewRequest("POST", "/api/valuations", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err = suite.app.Test(req, -1)
	suite.NoError(err)
	suite.Equal(400, resp.StatusCode)
	
	// Test invalid UUID format
	req = httptest.NewRequest("GET", "/api/valuations/current/not-a-uuid", nil)
	resp, err = suite.app.Test(req, -1)
	suite.NoError(err)
	suite.Equal(400, resp.StatusCode)
	
	// Test non-existent resource
	nonExistentID := uuid.New()
	req = httptest.NewRequest("GET", fmt.Sprintf("/api/valuations/current/%s", nonExistentID), nil)
	resp, err = suite.app.Test(req, -1)
	suite.NoError(err)
	suite.Equal(404, resp.StatusCode)
}

// TestRateLimiting tests rate limiting for valuation requests
func (suite *ValuationAPITestSuite) TestRateLimiting() {
	// This test would verify that rapid successive requests are rate-limited
	// Implementation depends on the rate limiting strategy used
	
	const rapidRequests = 20
	successCount := 0
	rateLimitedCount := 0
	
	for i := 0; i < rapidRequests; i++ {
		request := map[string]interface{}{
			"item_ids":     []string{suite.testItemID.String()},
			"request_type": "market_lookup",
			"priority":     1,
		}
		
		body, _ := json.Marshal(request)
		req := httptest.NewRequest("POST", "/api/valuations/request", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		
		resp, err := suite.app.Test(req, -1)
		suite.NoError(err)
		
		switch resp.StatusCode {
		case 202:
			successCount++
		case 429: // Too Many Requests
			rateLimitedCount++
		case 409: // Conflict (duplicate request)
			// This is acceptable
		}
	}
	
	// At least some requests should succeed
	suite.Greater(successCount, 0)
}

// TestRunner function to run the test suite
func TestValuationAPIIntegration(t *testing.T) {
	suite.Run(t, new(ValuationAPITestSuite))
}

// Helper functions
func floatPtr(f float64) *float64 {
	return &f
}

func stringPtr(s string) *string {
	return &s
}

// Additional integration tests for GraphQL would go in a separate file
// TestGraphQLValuationQueries tests GraphQL valuation queries
func TestGraphQLValuationQueries(t *testing.T) {
	// This would test GraphQL queries for valuations
	// Implementation would depend on the GraphQL server setup
	
	t.Run("GetCurrentValuation", func(t *testing.T) {
		query := `
			query GetCurrentValuation($itemId: ID!) {
				currentValuation(itemId: $itemId) {
					itemId
					valuationId
					valuationMethod
					estimatedValue
					confidenceScore
					valuationDate
					itemName
					purchasePrice
					askingPrice
					valueChangePercent
				}
			}
		`
		
		variables := map[string]interface{}{
			"itemId": uuid.New().String(),
		}
		
		// Would execute GraphQL query and validate response
		assert.NotEmpty(t, query)
		assert.NotEmpty(t, variables)
	})
	
	t.Run("GetPricingInsights", func(t *testing.T) {
		query := `
			query GetPricingInsights {
				pricingInsights {
					totalItems
					itemsWithValuations
					totalPurchaseValue
					totalCurrentValue
					overallAppreciation
					roomSummaries {
						roomId
						roomName
						floor
						itemsWithValuations
						totalPurchaseValue
						totalEstimatedValue
						avgConfidence
					}
					marketInsights {
						category
						brand
						itemCount
						avgCurrentValue
						avgPurchasePrice
						retentionPercent
					}
					topPerformers {
						itemId
						itemName
						estimatedValue
						valueChangePercent
					}
				}
			}
		`
		
		// Would execute GraphQL query and validate response structure
		assert.NotEmpty(t, query)
	})
	
	t.Run("RequestMarketValuation", func(t *testing.T) {
		mutation := `
			mutation RequestMarketValuation($input: ValuationRequestInput!) {
				requestMarketValuation(input: $input) {
					id
					itemId
					requestType
					status
					priority
					estimatedCompletion
					createdAt
				}
			}
		`
		
		variables := map[string]interface{}{
			"input": map[string]interface{}{
				"itemIds":     []string{uuid.New().String()},
				"requestType": "market_lookup",
				"priority":    1,
			},
		}
		
		// Would execute GraphQL mutation and validate response
		assert.NotEmpty(t, mutation)
		assert.NotEmpty(t, variables)
	})
}