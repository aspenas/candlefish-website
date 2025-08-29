package performance

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/patricksmith/highline-inventory/models"
	"github.com/patricksmith/highline-inventory/services"
	"github.com/patricksmith/highline-inventory/tests/fixtures"
)

// PerformanceTestConfig holds configuration for performance tests
type PerformanceTestConfig struct {
	NumItems           int
	ConcurrentRequests int
	TimeoutDuration    time.Duration
}

// DefaultPerformanceConfig returns default performance test configuration
func DefaultPerformanceConfig() *PerformanceTestConfig {
	return &PerformanceTestConfig{
		NumItems:           1000,
		ConcurrentRequests: 50,
		TimeoutDuration:    30 * time.Second,
	}
}

// BenchmarkValuationService_GetCurrentValuation benchmarks getting current valuations
func BenchmarkValuationService_GetCurrentValuation(b *testing.B) {
	// Setup
	cacheService := services.NewCacheService()
	marketService := services.NewMarketDataService(cacheService)
	
	// Create test items and their valuations
	testItems := make([]*models.Item, 100)
	for i := 0; i < 100; i++ {
		testItems[i] = fixtures.TestFurnitureItem()
		testItems[i].ID = uuid.New()
	}
	
	// Pre-populate cache with some valuations
	ctx := context.Background()
	for i := 0; i < 50; i++ {
		valuation := fixtures.NewCurrentValuationBuilder().
			WithItemID(testItems[i].ID).
			WithValue(float64(1000 + i*10)).
			Build()
		
		cacheService.SetJSON(ctx, fmt.Sprintf("valuation:current:%s", testItems[i].ID.String()), 
			valuation, time.Hour)
	}
	
	// Reset benchmark timer
	b.ResetTimer()
	
	// Run benchmark
	b.RunParallel(func(pb *testing.PB) {
		itemIndex := 0
		for pb.Next() {
			// Cycle through test items
			item := testItems[itemIndex%len(testItems)]
			itemIndex++
			
			// This would call the actual service method
			// For now, we test the cache access pattern
			_, err := cacheService.Get(ctx, fmt.Sprintf("valuation:current:%s", item.ID.String()))
			if err != nil {
				// Cache miss - would trigger database query
				_ = err
			}
		}
	})
}

// BenchmarkValuationService_CreateValuation benchmarks creating valuations
func BenchmarkValuationService_CreateValuation(b *testing.B) {
	cacheService := services.NewCacheService()
	ctx := context.Background()
	
	b.ResetTimer()
	
	for i := 0; i < b.N; i++ {
		valuation := fixtures.NewValuationBuilder().
			WithItemID(uuid.New()).
			WithValue(float64(1000 + i)).
			WithConfidence(0.8).
			Build()
		
		// Simulate cache operations that would happen during creation
		cacheService.SetJSON(ctx, fmt.Sprintf("valuation:item:%s", valuation.ItemID.String()), 
			valuation, time.Hour)
		
		// Simulate cache invalidation
		cacheService.Delete(ctx, fmt.Sprintf("valuation:current:%s", valuation.ItemID.String()))
	}
}

// BenchmarkMarketDataService_SearchComparableItems benchmarks market data searches
func BenchmarkMarketDataService_SearchComparableItems(b *testing.B) {
	cacheService := services.NewCacheService()
	marketService := services.NewMarketDataService(cacheService)
	ctx := context.Background()
	
	// Test items with different characteristics
	testItems := []*models.Item{
		fixtures.TestFurnitureItem(),
		fixtures.TestElectronicsItem(),
		fixtures.TestArtDecorItem(),
		fixtures.TestLightingItem(),
	}
	
	b.ResetTimer()
	
	b.RunParallel(func(pb *testing.PB) {
		itemIndex := 0
		for pb.Next() {
			item := testItems[itemIndex%len(testItems)]
			itemIndex++
			
			// This would perform the actual market search
			_, err := marketService.SearchComparableItems(ctx, item)
			if err != nil {
				b.Logf("Search failed for item %s: %v", item.Name, err)
			}
		}
	})
}

// BenchmarkCacheService_Operations benchmarks cache operations
func BenchmarkCacheService_Operations(b *testing.B) {
	cacheService := services.NewCacheService()
	ctx := context.Background()
	
	// Test with different key patterns
	keys := []string{
		"valuation:current:",
		"valuation:item:",
		"market:ebay:",
		"market:chairish:",
		"pricing:insights:",
	}
	
	values := make([]string, len(keys))
	for i, key := range keys {
		values[i] = fmt.Sprintf(`{"test": "value_%d", "timestamp": "%s"}`, i, time.Now().Format(time.RFC3339))
	}
	
	b.Run("Set", func(b *testing.B) {
		b.RunParallel(func(pb *testing.PB) {
			keyIndex := 0
			for pb.Next() {
				key := keys[keyIndex%len(keys)] + uuid.New().String()
				value := values[keyIndex%len(values)]
				keyIndex++
				
				err := cacheService.Set(ctx, key, value, time.Hour)
				if err != nil {
					b.Errorf("Cache set failed: %v", err)
				}
			}
		})
	})
	
	b.Run("Get", func(b *testing.B) {
		// Pre-populate cache
		testKeys := make([]string, 1000)
		for i := 0; i < 1000; i++ {
			key := fmt.Sprintf("test_key_%d", i)
			testKeys[i] = key
			cacheService.Set(ctx, key, values[i%len(values)], time.Hour)
		}
		
		b.ResetTimer()
		b.RunParallel(func(pb *testing.PB) {
			keyIndex := 0
			for pb.Next() {
				key := testKeys[keyIndex%len(testKeys)]
				keyIndex++
				
				_, err := cacheService.Get(ctx, key)
				if err != nil {
					// Cache miss is acceptable
					_ = err
				}
			}
		})
	})
}

// TestConcurrentValuationRequests tests concurrent valuation request processing
func TestConcurrentValuationRequests(t *testing.T) {
	config := DefaultPerformanceConfig()
	cacheService := services.NewCacheService()
	marketService := services.NewMarketDataService(cacheService)
	ctx := context.Background()
	
	// Create test items
	testItems := make([]*models.Item, config.NumItems)
	for i := 0; i < config.NumItems; i++ {
		testItems[i] = fixtures.TestFurnitureItem()
		testItems[i].ID = uuid.New()
	}
	
	// Metrics tracking
	var wg sync.WaitGroup
	results := make(chan time.Duration, config.ConcurrentRequests)
	errors := make(chan error, config.ConcurrentRequests)
	
	startTime := time.Now()
	
	// Start concurrent requests
	for i := 0; i < config.ConcurrentRequests; i++ {
		wg.Add(1)
		go func(requestID int) {
			defer wg.Done()
			
			requestStart := time.Now()
			item := testItems[requestID%len(testItems)]
			
			// Simulate valuation request processing
			_, err := marketService.SearchComparableItems(ctx, item)
			
			requestDuration := time.Since(requestStart)
			results <- requestDuration
			
			if err != nil {
				errors <- err
			}
		}(i)
	}
	
	// Wait for completion with timeout
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()
	
	select {
	case <-done:
		// All requests completed
	case <-time.After(config.TimeoutDuration):
		t.Fatalf("Test timed out after %v", config.TimeoutDuration)
	}
	
	totalDuration := time.Since(startTime)
	close(results)
	close(errors)
	
	// Collect metrics
	var durations []time.Duration
	errorCount := 0
	
	for duration := range results {
		durations = append(durations, duration)
	}
	
	for range errors {
		errorCount++
	}
	
	// Calculate statistics
	if len(durations) > 0 {
		var totalDur time.Duration
		minDur := durations[0]
		maxDur := durations[0]
		
		for _, dur := range durations {
			totalDur += dur
			if dur < minDur {
				minDur = dur
			}
			if dur > maxDur {
				maxDur = dur
			}
		}
		
		avgDur := totalDur / time.Duration(len(durations))
		
		t.Logf("Concurrent Valuation Requests Performance:")
		t.Logf("  Total requests: %d", config.ConcurrentRequests)
		t.Logf("  Total duration: %v", totalDuration)
		t.Logf("  Successful requests: %d", len(durations))
		t.Logf("  Failed requests: %d", errorCount)
		t.Logf("  Average request time: %v", avgDur)
		t.Logf("  Min request time: %v", minDur)
		t.Logf("  Max request time: %v", maxDur)
		t.Logf("  Requests per second: %.2f", float64(len(durations))/totalDuration.Seconds())
		
		// Performance assertions
		assert.Less(t, errorCount, config.ConcurrentRequests/10, "Error rate should be less than 10%")
		assert.Less(t, avgDur, 5*time.Second, "Average request time should be under 5 seconds")
		assert.Less(t, maxDur, 15*time.Second, "Max request time should be under 15 seconds")
	}
}

// TestCachePerformanceUnderLoad tests cache performance under high load
func TestCachePerformanceUnderLoad(t *testing.T) {
	config := DefaultPerformanceConfig()
	cacheService := services.NewCacheService()
	ctx := context.Background()
	
	// Test data
	numKeys := config.NumItems
	keys := make([]string, numKeys)
	values := make([]string, numKeys)
	
	for i := 0; i < numKeys; i++ {
		keys[i] = fmt.Sprintf("test_key_%d", i)
		values[i] = fmt.Sprintf(`{"id": %d, "data": "test_data_%d", "timestamp": "%s"}`, 
			i, i, time.Now().Format(time.RFC3339))
	}
	
	// Pre-populate cache
	for i := 0; i < numKeys; i++ {
		err := cacheService.Set(ctx, keys[i], values[i], time.Hour)
		require.NoError(t, err)
	}
	
	// Test concurrent read/write operations
	var wg sync.WaitGroup
	operations := config.ConcurrentRequests * 10 // More operations per goroutine
	
	// Metrics
	readCount := int64(0)
	writeCount := int64(0)
	errorCount := int64(0)
	
	startTime := time.Now()
	
	// Start concurrent workers
	for i := 0; i < config.ConcurrentRequests; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			
			for j := 0; j < operations/config.ConcurrentRequests; j++ {
				keyIndex := (workerID*1000 + j) % numKeys
				key := keys[keyIndex]
				
				// Mix of read and write operations (80% read, 20% write)
				if j%5 == 0 { // Write operation
					newValue := fmt.Sprintf(`{"updated": true, "worker": %d, "op": %d}`, workerID, j)
					err := cacheService.Set(ctx, key, newValue, time.Hour)
					if err != nil {
						errorCount++
					} else {
						writeCount++
					}
				} else { // Read operation
					_, err := cacheService.Get(ctx, key)
					if err != nil {
						// Cache miss might be acceptable depending on the scenario
						if err.Error() != "key not found" && err.Error() != "key expired" {
							errorCount++
						}
					} else {
						readCount++
					}
				}
			}
		}(i)
	}
	
	wg.Wait()
	totalDuration := time.Since(startTime)
	
	totalOps := readCount + writeCount
	opsPerSecond := float64(totalOps) / totalDuration.Seconds()
	
	t.Logf("Cache Performance Under Load:")
	t.Logf("  Total operations: %d", totalOps)
	t.Logf("  Read operations: %d", readCount)
	t.Logf("  Write operations: %d", writeCount)
	t.Logf("  Error count: %d", errorCount)
	t.Logf("  Total duration: %v", totalDuration)
	t.Logf("  Operations per second: %.2f", opsPerSecond)
	t.Logf("  Average operation time: %v", totalDuration/time.Duration(totalOps))
	
	// Performance assertions
	assert.Greater(t, opsPerSecond, 1000.0, "Should handle at least 1000 operations per second")
	assert.Less(t, float64(errorCount)/float64(totalOps), 0.01, "Error rate should be less than 1%")
	
	// Cache statistics
	stats := cacheService.Stats()
	t.Logf("Cache Stats:")
	t.Logf("  Total keys: %v", stats["total_keys"])
	t.Logf("  Active keys: %v", stats["active_keys"])
	t.Logf("  Expired keys: %v", stats["expired_keys"])
}

// TestMemoryUsageUnderLoad tests memory usage during high load
func TestMemoryUsageUnderLoad(t *testing.T) {
	config := DefaultPerformanceConfig()
	cacheService := services.NewCacheService()
	ctx := context.Background()
	
	// Monitor memory usage (simplified - in practice you'd use runtime.MemStats)
	initialStats := cacheService.Stats()
	
	// Generate large amount of cache data
	numItems := config.NumItems * 10 // 10x more data
	for i := 0; i < numItems; i++ {
		key := fmt.Sprintf("memory_test_%d", i)
		// Create larger values to test memory usage
		largeValue := fmt.Sprintf(`{
			"id": %d,
			"data": "%s",
			"metadata": {
				"timestamp": "%s",
				"size": "large",
				"content": "%s"
			}
		}`, i, string(make([]byte, 1000)), time.Now().Format(time.RFC3339), string(make([]byte, 1000)))
		
		err := cacheService.Set(ctx, key, largeValue, time.Hour)
		require.NoError(t, err)
		
		// Periodically check stats
		if i%1000 == 0 {
			stats := cacheService.Stats()
			t.Logf("Progress: %d items, active keys: %v", i, stats["active_keys"])
		}
	}
	
	finalStats := cacheService.Stats()
	
	t.Logf("Memory Usage Test Results:")
	t.Logf("  Initial active keys: %v", initialStats["active_keys"])
	t.Logf("  Final active keys: %v", finalStats["active_keys"])
	t.Logf("  Items added: %d", numItems)
	
	// Verify all items were stored
	assert.Equal(t, numItems, finalStats["active_keys"].(int)-initialStats["active_keys"].(int))
	
	// Test cleanup efficiency
	cacheService.Clear(ctx)
	clearedStats := cacheService.Stats()
	
	t.Logf("  After clear - active keys: %v", clearedStats["active_keys"])
	assert.Equal(t, 0, clearedStats["active_keys"].(int))
}

// BenchmarkDatabaseQuery simulates database query performance
func BenchmarkDatabaseQuery(b *testing.B) {
	// This would benchmark actual database queries
	// For now, we simulate the query patterns
	
	b.Run("GetCurrentValuation", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			itemID := uuid.New()
			
			// Simulate database query time
			time.Sleep(1 * time.Microsecond) // Simulated query latency
			
			// Simulate result processing
			_ = fmt.Sprintf("valuation_result_%s", itemID.String())
		}
	})
	
	b.Run("GetPricingInsights", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			// Simulate complex aggregation query
			time.Sleep(5 * time.Microsecond) // Simulated complex query latency
			
			// Simulate result processing
			_ = map[string]interface{}{
				"total_items":           1000,
				"items_with_valuations": 800,
				"total_purchase_value":  100000.0,
				"total_current_value":   85000.0,
			}
		}
	})
}

// Helper function to measure operation latency
func measureLatency(operation func() error) (time.Duration, error) {
	start := time.Now()
	err := operation()
	return time.Since(start), err
}