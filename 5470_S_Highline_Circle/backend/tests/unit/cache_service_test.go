package unit

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"

	"github.com/patricksmith/highline-inventory/services"
)

// CacheServiceTestSuite contains all tests for CacheService
type CacheServiceTestSuite struct {
	suite.Suite
	cache *services.CacheService
	ctx   context.Context
}

// SetupSuite sets up the test suite
func (suite *CacheServiceTestSuite) SetupSuite() {
	suite.ctx = context.Background()
}

// SetupTest sets up each individual test
func (suite *CacheServiceTestSuite) SetupTest() {
	suite.cache = services.NewCacheService()
}

// TearDownTest cleans up after each test
func (suite *CacheServiceTestSuite) TearDownTest() {
	suite.cache.Clear(suite.ctx)
}

// TestSetAndGet tests basic cache set and get operations
func (suite *CacheServiceTestSuite) TestSetAndGet() {
	key := "test_key"
	value := "test_value"
	expiration := 1 * time.Hour
	
	// Set value
	err := suite.cache.Set(suite.ctx, key, value, expiration)
	suite.NoError(err)
	
	// Get value
	result, err := suite.cache.Get(suite.ctx, key)
	suite.NoError(err)
	suite.Equal(value, result)
}

// TestGet_NotFound tests getting a non-existent key
func (suite *CacheServiceTestSuite) TestGet_NotFound() {
	result, err := suite.cache.Get(suite.ctx, "non_existent_key")
	suite.Error(err)
	suite.Empty(result)
	suite.Contains(err.Error(), "not found")
}

// TestGet_Expired tests getting an expired key
func (suite *CacheServiceTestSuite) TestGet_Expired() {
	key := "expired_key"
	value := "expired_value"
	expiration := 10 * time.Millisecond
	
	// Set value with short expiration
	err := suite.cache.Set(suite.ctx, key, value, expiration)
	suite.NoError(err)
	
	// Wait for expiration
	time.Sleep(20 * time.Millisecond)
	
	// Attempt to get expired value
	result, err := suite.cache.Get(suite.ctx, key)
	suite.Error(err)
	suite.Empty(result)
	suite.Contains(err.Error(), "expired")
}

// TestDelete tests cache deletion
func (suite *CacheServiceTestSuite) TestDelete() {
	key := "delete_key"
	value := "delete_value"
	expiration := 1 * time.Hour
	
	// Set value
	err := suite.cache.Set(suite.ctx, key, value, expiration)
	suite.NoError(err)
	
	// Verify it exists
	result, err := suite.cache.Get(suite.ctx, key)
	suite.NoError(err)
	suite.Equal(value, result)
	
	// Delete
	err = suite.cache.Delete(suite.ctx, key)
	suite.NoError(err)
	
	// Verify it's gone
	result, err = suite.cache.Get(suite.ctx, key)
	suite.Error(err)
	suite.Empty(result)
}

// TestSetJSON tests JSON serialization and deserialization
func (suite *CacheServiceTestSuite) TestSetJSON() {
	type TestData struct {
		ID    int    `json:"id"`
		Name  string `json:"name"`
		Value float64 `json:"value"`
	}
	
	key := "json_key"
	originalData := TestData{
		ID:    123,
		Name:  "Test Item",
		Value: 456.78,
	}
	expiration := 1 * time.Hour
	
	// Set JSON data
	err := suite.cache.SetJSON(suite.ctx, key, originalData, expiration)
	suite.NoError(err)
	
	// Get JSON data
	var retrievedData TestData
	err = suite.cache.GetJSON(suite.ctx, key, &retrievedData)
	suite.NoError(err)
	
	// Verify data integrity
	suite.Equal(originalData.ID, retrievedData.ID)
	suite.Equal(originalData.Name, retrievedData.Name)
	suite.Equal(originalData.Value, retrievedData.Value)
}

// TestGetOrSet tests the get-or-set functionality
func (suite *CacheServiceTestSuite) TestGetOrSet() {
	key := "get_or_set_key"
	expiration := 1 * time.Hour
	expectedValue := "computed_value"
	
	callCount := 0
	computeFunc := func() (interface{}, error) {
		callCount++
		return expectedValue, nil
	}
	
	// First call - should compute and cache
	result, err := suite.cache.GetOrSet(suite.ctx, key, expiration, computeFunc)
	suite.NoError(err)
	suite.Contains(result, expectedValue)
	suite.Equal(1, callCount)
	
	// Second call - should return cached value without computation
	result2, err := suite.cache.GetOrSet(suite.ctx, key, expiration, computeFunc)
	suite.NoError(err)
	suite.Equal(result, result2)
	suite.Equal(1, callCount) // Function should not be called again
}

// TestGetOrSet_ComputeError tests error handling in get-or-set
func (suite *CacheServiceTestSuite) TestGetOrSet_ComputeError() {
	key := "error_key"
	expiration := 1 * time.Hour
	
	computeFunc := func() (interface{}, error) {
		return nil, assert.AnError
	}
	
	result, err := suite.cache.GetOrSet(suite.ctx, key, expiration, computeFunc)
	suite.Error(err)
	suite.Empty(result)
	suite.Equal(assert.AnError, err)
}

// TestInvalidate tests cache invalidation by pattern
func (suite *CacheServiceTestSuite) TestInvalidate() {
	expiration := 1 * time.Hour
	
	// Set multiple keys with same prefix
	suite.cache.Set(suite.ctx, "user:123", "user_123_data", expiration)
	suite.cache.Set(suite.ctx, "user:456", "user_456_data", expiration)
	suite.cache.Set(suite.ctx, "product:789", "product_789_data", expiration)
	
	// Verify all keys exist
	result1, err1 := suite.cache.Get(suite.ctx, "user:123")
	result2, err2 := suite.cache.Get(suite.ctx, "user:456")
	result3, err3 := suite.cache.Get(suite.ctx, "product:789")
	
	suite.NoError(err1)
	suite.NoError(err2)
	suite.NoError(err3)
	suite.Equal("user_123_data", result1)
	suite.Equal("user_456_data", result2)
	suite.Equal("product_789_data", result3)
	
	// Invalidate user keys
	err := suite.cache.Invalidate(suite.ctx, "user:")
	suite.NoError(err)
	
	// Verify user keys are gone but product key remains
	_, err1 = suite.cache.Get(suite.ctx, "user:123")
	_, err2 = suite.cache.Get(suite.ctx, "user:456")
	result3, err3 = suite.cache.Get(suite.ctx, "product:789")
	
	suite.Error(err1)
	suite.Error(err2)
	suite.NoError(err3)
	suite.Equal("product_789_data", result3)
}

// TestClear tests clearing all cache entries
func (suite *CacheServiceTestSuite) TestClear() {
	expiration := 1 * time.Hour
	
	// Set multiple keys
	suite.cache.Set(suite.ctx, "key1", "value1", expiration)
	suite.cache.Set(suite.ctx, "key2", "value2", expiration)
	suite.cache.Set(suite.ctx, "key3", "value3", expiration)
	
	// Verify keys exist
	stats := suite.cache.Stats()
	suite.Equal(3, stats["active_keys"])
	
	// Clear cache
	err := suite.cache.Clear(suite.ctx)
	suite.NoError(err)
	
	// Verify all keys are gone
	stats = suite.cache.Stats()
	suite.Equal(0, stats["total_keys"])
	
	// Verify individual keys are gone
	_, err1 := suite.cache.Get(suite.ctx, "key1")
	_, err2 := suite.cache.Get(suite.ctx, "key2")
	_, err3 := suite.cache.Get(suite.ctx, "key3")
	
	suite.Error(err1)
	suite.Error(err2)
	suite.Error(err3)
}

// TestStats tests cache statistics
func (suite *CacheServiceTestSuite) TestStats() {
	expiration := 1 * time.Hour
	shortExpiration := 10 * time.Millisecond
	
	// Set some keys with different expirations
	suite.cache.Set(suite.ctx, "active1", "value1", expiration)
	suite.cache.Set(suite.ctx, "active2", "value2", expiration)
	suite.cache.Set(suite.ctx, "expired1", "value3", shortExpiration)
	
	// Wait for some keys to expire
	time.Sleep(20 * time.Millisecond)
	
	// Get stats
	stats := suite.cache.Stats()
	
	// Verify stats
	suite.Equal(3, stats["total_keys"])
	suite.Equal(1, stats["expired_keys"])
	suite.Equal(2, stats["active_keys"])
}

// TestConcurrentAccess tests concurrent cache access
func (suite *CacheServiceTestSuite) TestConcurrentAccess() {
	const numGoroutines = 100
	const expiration = 1 * time.Hour
	
	// Channel to coordinate goroutines
	done := make(chan bool, numGoroutines)
	
	// Start multiple goroutines performing cache operations
	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			defer func() { done <- true }()
			
			key := fmt.Sprintf("concurrent_key_%d", id)
			value := fmt.Sprintf("concurrent_value_%d", id)
			
			// Set
			err := suite.cache.Set(suite.ctx, key, value, expiration)
			suite.NoError(err)
			
			// Get
			result, err := suite.cache.Get(suite.ctx, key)
			suite.NoError(err)
			suite.Equal(value, result)
			
			// Delete
			err = suite.cache.Delete(suite.ctx, key)
			suite.NoError(err)
		}(i)
	}
	
	// Wait for all goroutines to complete
	for i := 0; i < numGoroutines; i++ {
		select {
		case <-done:
		case <-time.After(5 * time.Second):
			suite.Fail("Timeout waiting for concurrent operations")
		}
	}
}

// TestCacheKeys tests the cache key generation utilities
func (suite *CacheServiceTestSuite) TestCacheKeys() {
	keys := services.CacheKeys{}
	
	// Test valuation keys
	valuationKeys := keys.ValuationKeys()
	
	itemID := "123e4567-e89b-12d3-a456-426614174000"
	roomID := "456e7890-e12c-34d5-b678-901234567890"
	
	currentKey := valuationKeys.CurrentValuation(itemID)
	suite.Equal("valuation:current:123e4567-e89b-12d3-a456-426614174000", currentKey)
	
	roomKey := valuationKeys.RoomSummary(roomID)
	suite.Equal("valuation:room_summary:456e7890-e12c-34d5-b678-901234567890", roomKey)
	
	insightsKey := valuationKeys.PricingInsights()
	suite.Equal("valuation:pricing_insights", insightsKey)
	
	// Test market keys
	marketKeys := keys.MarketKeys()
	
	ebayKey := marketKeys.EbaySearch("modern sofa", 10)
	suite.Equal("market:ebay:modern sofa:10", ebayKey)
	
	retailKey := marketKeys.RetailSearch("West Elm", "sofa")
	suite.Equal("market:retail:West Elm:sofa", retailKey)
}

// TestCacheDurations tests predefined cache durations
func (suite *CacheServiceTestSuite) TestCacheDurations() {
	durations := services.CacheDurations
	
	// Verify durations are reasonable
	suite.Equal(1*time.Hour, durations.CurrentValuation)
	suite.Equal(30*time.Minute, durations.PricingInsights)
	suite.Equal(24*time.Hour, durations.DepreciationModel)
	suite.Equal(6*time.Hour, durations.EbaySearch)
	suite.Equal(15*time.Minute, durations.Short)
	suite.Equal(1*time.Hour, durations.Medium)
	suite.Equal(24*time.Hour, durations.Long)
}

// TestRunner function to run the test suite
func TestCacheServiceSuite(t *testing.T) {
	suite.Run(t, new(CacheServiceTestSuite))
}

// Individual function tests for edge cases

// TestCacheCleanup tests the automatic cleanup of expired entries
func TestCacheCleanup(t *testing.T) {
	cache := services.NewCacheService()
	ctx := context.Background()
	
	// Set keys with very short expiration
	shortExpiration := 50 * time.Millisecond
	cache.Set(ctx, "cleanup_test_1", "value1", shortExpiration)
	cache.Set(ctx, "cleanup_test_2", "value2", shortExpiration)
	
	// Verify keys exist initially
	stats := cache.Stats()
	assert.GreaterOrEqual(t, stats["total_keys"].(int), 2)
	
	// Wait for expiration and cleanup cycle
	time.Sleep(100 * time.Millisecond)
	
	// Trigger cleanup by accessing expired key
	_, err := cache.Get(ctx, "cleanup_test_1")
	assert.Error(t, err)
	
	// The cleanup should have removed expired keys
	stats = cache.Stats()
	assert.Equal(t, 0, stats["expired_keys"].(int))
}

// TestCacheMemoryManagement tests that cache doesn't leak memory
func TestCacheMemoryManagement(t *testing.T) {
	cache := services.NewCacheService()
	ctx := context.Background()
	
	// Add many keys
	for i := 0; i < 1000; i++ {
		key := fmt.Sprintf("memory_test_%d", i)
		value := fmt.Sprintf("value_%d", i)
		cache.Set(ctx, key, value, 10*time.Millisecond)
	}
	
	stats := cache.Stats()
	assert.Equal(t, 1000, stats["total_keys"].(int))
	
	// Wait for expiration
	time.Sleep(50 * time.Millisecond)
	
	// Access one key to trigger cleanup
	cache.Get(ctx, "memory_test_0")
	
	// Clear all to ensure cleanup
	cache.Clear(ctx)
	
	stats = cache.Stats()
	assert.Equal(t, 0, stats["total_keys"].(int))
}