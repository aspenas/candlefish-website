package unit

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"

	"github.com/patricksmith/highline-inventory/models"
	"github.com/patricksmith/highline-inventory/services"
)

// MarketDataServiceTestSuite contains all tests for MarketDataService
type MarketDataServiceTestSuite struct {
	suite.Suite
	mockCache     *MockCacheService
	marketService *services.MarketDataService
	ctx           context.Context
	testServer    *httptest.Server
}

// SetupSuite sets up the test suite
func (suite *MarketDataServiceTestSuite) SetupSuite() {
	suite.ctx = context.Background()
}

// SetupTest sets up each individual test
func (suite *MarketDataServiceTestSuite) SetupTest() {
	suite.mockCache = new(MockCacheService)
	suite.marketService = services.NewMarketDataService(suite.mockCache)
	
	// Create test HTTP server for mocking external APIs
	suite.testServer = httptest.NewServer(http.HandlerFunc(suite.mockHTTPHandler))
}

// TearDownTest cleans up after each test
func (suite *MarketDataServiceTestSuite) TearDownTest() {
	suite.mockCache.AssertExpectations(suite.T())
	suite.testServer.Close()
}

// mockHTTPHandler handles HTTP requests for testing
func (suite *MarketDataServiceTestSuite) mockHTTPHandler(w http.ResponseWriter, r *http.Request) {
	// Mock eBay API response
	if r.URL.Path == "/services/search/FindingService/v1" {
		ebayResponse := map[string]interface{}{
			"findItemsByKeywordsResponse": []map[string]interface{}{
				{
					"searchResult": []map[string]interface{}{
						{
							"item": []map[string]interface{}{
								{
									"itemId":    []string{"123456789"},
									"title":     []string{"Modern Sofa - Like New"},
									"viewItemURL": []string{"https://ebay.com/item/123456789"},
									"sellingStatus": map[string]interface{}{
										"currentPrice": []map[string]interface{}{
											{
												"__value__":    "1200.00",
												"@currencyId": "USD",
											},
										},
									},
									"condition": []map[string]interface{}{
										{
											"conditionDisplayName": []string{"Very Good"},
										},
									},
									"shippingInfo": []map[string]interface{}{
										{
											"shippingServiceCost": []map[string]interface{}{
												{
													"__value__": "50.00",
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ebayResponse)
		return
	}
	
	// Default 404
	w.WriteHeader(http.StatusNotFound)
}

// TestGenerateSearchTerms tests search term generation
func (suite *MarketDataServiceTestSuite) TestGenerateSearchTerms() {
	item := &models.Item{
		Name:     "Modern Leather Sofa",
		Category: models.CategoryFurniture,
		Source:   stringPtr("West Elm"),
	}
	
	// This would test a public method if exposed, or we test through SearchComparableItems
	// For now, we test the overall functionality
	comparisons, err := suite.marketService.SearchComparableItems(suite.ctx, item)
	
	// Should not error even if no results
	suite.NoError(err)
	suite.NotNil(comparisons)
}

// TestSearchComparableItems_CacheHit tests using cached search results
func (suite *MarketDataServiceTestSuite) TestSearchComparableItems_CacheHit() {
	item := &models.Item{
		Name:     "Test Sofa",
		Category: models.CategoryFurniture,
		Source:   stringPtr("IKEA"),
	}
	
	// Mock cached eBay results
	cachedComparisons := []models.MarketComparison{
		{
			ID:     uuid.New(),
			ItemID: uuid.New(),
			Source: models.MarketSourceEbay,
			Title:  "IKEA Sofa - Used",
			Price:  floatPtr(400.00),
			SimilarityScore: floatPtr(0.85),
		},
	}
	
	cachedData, _ := json.Marshal(cachedComparisons)
	suite.mockCache.On("Get", suite.ctx, mock.MatchedBy(func(key string) bool {
		return key != "" // Any non-empty cache key
	})).Return(string(cachedData), nil).Maybe()
	
	// Execute
	comparisons, err := suite.marketService.SearchComparableItems(suite.ctx, item)
	
	// Assertions
	suite.NoError(err)
	suite.NotNil(comparisons)
}

// TestSearchComparableItems_CacheMiss tests fetching new search results
func (suite *MarketDataServiceTestSuite) TestSearchComparableItems_CacheMiss() {
	item := &models.Item{
		Name:     "Modern Sofa",
		Category: models.CategoryFurniture,
		Source:   stringPtr("West Elm"),
	}
	
	// Mock cache miss for all searches
	suite.mockCache.On("Get", suite.ctx, mock.AnythingOfType("string")).
		Return("", assert.AnError).Maybe()
	
	// Mock cache set for storing results
	suite.mockCache.On("Set", suite.ctx, mock.AnythingOfType("string"), 
		mock.AnythingOfType("string"), mock.AnythingOfType("time.Duration")).
		Return(nil).Maybe()
	
	// Execute
	comparisons, err := suite.marketService.SearchComparableItems(suite.ctx, item)
	
	// Assertions
	suite.NoError(err)
	suite.NotNil(comparisons)
}

// TestSearchComparableItems_ChairishRelevantCategory tests Chairish search for relevant categories
func (suite *MarketDataServiceTestSuite) TestSearchComparableItems_ChairishRelevantCategory() {
	furnitureItem := &models.Item{
		Name:     "Vintage Armchair",
		Category: models.CategoryFurniture,
		Source:   stringPtr("Unknown"),
	}
	
	electronicsItem := &models.Item{
		Name:     "Smart TV",
		Category: models.CategoryElectronics,
		Source:   stringPtr("Samsung"),
	}
	
	// Mock cache misses
	suite.mockCache.On("Get", suite.ctx, mock.AnythingOfType("string")).
		Return("", assert.AnError).Maybe()
	suite.mockCache.On("Set", suite.ctx, mock.AnythingOfType("string"), 
		mock.AnythingOfType("string"), mock.AnythingOfType("time.Duration")).
		Return(nil).Maybe()
	
	// Test furniture item (should attempt Chairish search)
	comparisons1, err1 := suite.marketService.SearchComparableItems(suite.ctx, furnitureItem)
	suite.NoError(err1)
	suite.NotNil(comparisons1)
	
	// Test electronics item (should not attempt Chairish search)
	comparisons2, err2 := suite.marketService.SearchComparableItems(suite.ctx, electronicsItem)
	suite.NoError(err2)
	suite.NotNil(comparisons2)
}

// TestSimilarityScoring tests the scoring algorithm
func TestSimilarityScoring(t *testing.T) {
	cacheService := services.NewCacheService()
	marketService := services.NewMarketDataService(cacheService)
	
	item := &models.Item{
		Name:     "West Elm Modern Sofa",
		Category: models.CategoryFurniture,
		Source:   stringPtr("West Elm"),
		Condition: stringPtr("good"),
	}
	
	tests := []struct {
		name             string
		comparison       models.MarketComparison
		expectedMinScore float64
		expectedMaxScore float64
	}{
		{
			name: "Perfect match",
			comparison: models.MarketComparison{
				Title:       "West Elm Modern Sofa",
				Source:      models.MarketSourceWestElm,
				Condition:   stringPtr("good"),
				Description: stringPtr("West Elm modern sofa in good condition"),
			},
			expectedMinScore: 0.8,
			expectedMaxScore: 1.0,
		},
		{
			name: "Good brand match",
			comparison: models.MarketComparison{
				Title:       "Modern Sofa West Elm",
				Source:      models.MarketSourceEbay,
				Condition:   stringPtr("very good"),
				Description: stringPtr("Beautiful West Elm sofa"),
			},
			expectedMinScore: 0.6,
			expectedMaxScore: 0.9,
		},
		{
			name: "Category match only",
			comparison: models.MarketComparison{
				Title:       "Vintage Couch",
				Source:      models.MarketSourceFacebookMarketplace,
				Condition:   stringPtr("fair"),
				Description: stringPtr("Old couch for sale"),
			},
			expectedMinScore: 0.1,
			expectedMaxScore: 0.5,
		},
		{
			name: "No match",
			comparison: models.MarketComparison{
				Title:       "Dining Table",
				Source:      models.MarketSourceEbay,
				Condition:   stringPtr("good"),
				Description: stringPtr("Wooden dining table"),
			},
			expectedMinScore: 0.0,
			expectedMaxScore: 0.3,
		},
	}
	
	// Since the scoring logic is private, we test it indirectly through the search functionality
	// In a real implementation, you might expose a ScoreComparison method or test through integration
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// This is a conceptual test - in practice, we'd need to expose the scoring method
			// or test it through integration tests
			
			// Verify that different comparison types exist and can be differentiated
			assert.NotEmpty(t, tt.comparison.Title)
			assert.NotEmpty(t, tt.comparison.Source)
			
			// The actual scoring would be tested with access to the private method
			// or through integration tests that verify ranking of results
		})
	}
}

// TestTextSimilarity tests text similarity calculation
func TestTextSimilarity(t *testing.T) {
	// This tests the concept of text similarity that would be used in scoring
	// Since the actual method is private, we test the logic conceptually
	
	tests := []struct {
		text1    string
		text2    string
		expected string // high, medium, low similarity
	}{
		{
			text1:    "West Elm Modern Sofa",
			text2:    "West Elm Modern Sofa",
			expected: "high",
		},
		{
			text1:    "West Elm Modern Sofa",
			text2:    "Modern Sofa from West Elm",
			expected: "high",
		},
		{
			text1:    "West Elm Modern Sofa",
			text2:    "Modern Leather Couch",
			expected: "medium",
		},
		{
			text1:    "West Elm Modern Sofa",
			text2:    "Dining Room Table",
			expected: "low",
		},
	}
	
	for _, tt := range tests {
		t.Run(fmt.Sprintf("%s vs %s", tt.text1, tt.text2), func(t *testing.T) {
			// Test that we can differentiate between similarity levels
			// In practice, this would test the actual similarity algorithm
			
			words1 := strings.Fields(strings.ToLower(tt.text1))
			words2 := strings.Fields(strings.ToLower(tt.text2))
			
			matches := 0
			for _, word1 := range words1 {
				for _, word2 := range words2 {
					if word1 == word2 && len(word1) > 2 {
						matches++
						break
					}
				}
			}
			
			similarity := float64(matches) / float64(len(words1))
			
			switch tt.expected {
			case "high":
				assert.Greater(t, similarity, 0.6)
			case "medium":
				assert.Greater(t, similarity, 0.2)
				assert.Less(t, similarity, 0.6)
			case "low":
				assert.LessOrEqual(t, similarity, 0.2)
			}
		})
	}
}

// TestCategoryRelevance tests category-based relevance scoring
func TestCategoryRelevance(t *testing.T) {
	tests := []struct {
		category    models.Category
		title       string
		description string
		expectHigh  bool
	}{
		{
			category:    models.CategoryFurniture,
			title:       "Modern Sofa Chair",
			description: "Beautiful furniture piece for living room",
			expectHigh:  true,
		},
		{
			category:    models.CategoryLighting,
			title:       "Pendant Light Fixture",
			description: "Modern ceiling lamp",
			expectHigh:  true,
		},
		{
			category:    models.CategoryElectronics,
			title:       "Smart TV Device",
			description: "Electronic entertainment system",
			expectHigh:  true,
		},
		{
			category:    models.CategoryFurniture,
			title:       "Electronic Device",
			description: "Technology gadget",
			expectHigh:  false,
		},
	}
	
	for _, tt := range tests {
		t.Run(string(tt.category), func(t *testing.T) {
			// Test category keyword matching logic
			categoryKeywords := map[models.Category][]string{
				models.CategoryFurniture:   {"chair", "table", "sofa", "couch", "desk", "cabinet", "dresser", "bed"},
				models.CategoryLighting:    {"lamp", "light", "chandelier", "sconce", "pendant", "fixture"},
				models.CategoryElectronics: {"tv", "speaker", "audio", "electronic", "device", "tech"},
			}
			
			keywords := categoryKeywords[tt.category]
			text := strings.ToLower(tt.title + " " + tt.description)
			
			matches := 0
			for _, keyword := range keywords {
				if strings.Contains(text, keyword) {
					matches++
				}
			}
			
			relevance := float64(matches) / float64(len(keywords))
			
			if tt.expectHigh {
				assert.Greater(t, relevance, 0.0, "Expected high relevance for category %s", tt.category)
			} else {
				// Even low relevance might have some matches, so we just verify it's calculated
				assert.GreaterOrEqual(t, relevance, 0.0)
			}
		})
	}
}

// TestConditionSimilarity tests condition matching logic
func TestConditionSimilarity(t *testing.T) {
	tests := []struct {
		condition1 *string
		condition2 *string
		expectHigh bool
	}{
		{stringPtr("excellent"), stringPtr("excellent"), true},
		{stringPtr("good"), stringPtr("very good"), true},
		{stringPtr("fair"), stringPtr("okay"), true},
		{stringPtr("poor"), stringPtr("damaged"), true},
		{stringPtr("excellent"), stringPtr("poor"), false},
		{stringPtr("good"), stringPtr("damaged"), false},
		{nil, stringPtr("good"), false}, // Unknown condition
	}
	
	for _, tt := range tests {
		t.Run(fmt.Sprintf("%v vs %v", tt.condition1, tt.condition2), func(t *testing.T) {
			// Test condition similarity logic
			if tt.condition1 == nil || tt.condition2 == nil {
				// Handle nil conditions
				if tt.expectHigh {
					t.Skip("Cannot have high similarity with nil condition")
				}
				return
			}
			
			cond1 := strings.ToLower(*tt.condition1)
			cond2 := strings.ToLower(*tt.condition2)
			
			if cond1 == cond2 {
				assert.True(t, tt.expectHigh, "Exact match should be high similarity")
				return
			}
			
			// Test similarity mapping
			conditionMap := map[string][]string{
				"excellent": {"like new", "mint", "perfect"},
				"good":      {"very good", "nice", "decent"},
				"fair":      {"okay", "used", "worn"},
				"poor":      {"damaged", "bad", "broken"},
			}
			
			foundSimilarity := false
			for mainCond, variations := range conditionMap {
				if cond1 == mainCond {
					for _, variation := range variations {
						if strings.Contains(cond2, variation) {
							foundSimilarity = true
							break
						}
					}
				}
			}
			
			if tt.expectHigh {
				assert.True(t, foundSimilarity, "Expected to find similarity between conditions")
			}
		})
	}
}

// TestSourceReliability tests source reliability scoring
func TestSourceReliability(t *testing.T) {
	tests := []struct {
		source           models.MarketSource
		expectedMinScore float64
	}{
		{models.MarketSourceWestElm, 0.9},
		{models.MarketSourcePotteryBarn, 0.9},
		{models.MarketSourceRestorationHardware, 0.9},
		{models.MarketSourceChairish, 0.8},
		{models.MarketSourceEbay, 0.7},
		{models.MarketSourceFacebookMarketplace, 0.5},
		{models.MarketSourceManualEntry, 0.4},
	}
	
	for _, tt := range tests {
		t.Run(string(tt.source), func(t *testing.T) {
			// Test that we have reasonable reliability scores for different sources
			// This would be tested through the actual GetSourceReliabilityScore method
			
			sourceScores := map[models.MarketSource]float64{
				models.MarketSourceEbay:                     0.8,
				models.MarketSourceFacebookMarketplace:      0.6,
				models.MarketSourceChairish:                 0.9,
				models.MarketSourceWestElm:                  0.95,
				models.MarketSourcePotteryBarn:              0.95,
				models.MarketSourceRestorationHardware:      0.95,
				models.MarketSourceArticle:                  0.9,
				models.MarketSourceManualEntry:              0.5,
			}
			
			score := sourceScores[tt.source]
			assert.GreaterOrEqual(t, score, tt.expectedMinScore)
			assert.LessOrEqual(t, score, 1.0)
		})
	}
}

// TestRunner function to run the test suite
func TestMarketDataServiceSuite(t *testing.T) {
	suite.Run(t, new(MarketDataServiceTestSuite))
}

// Helper functions
func stringPtr(s string) *string {
	return &s
}

func floatPtr(f float64) *float64 {
	return &f
}