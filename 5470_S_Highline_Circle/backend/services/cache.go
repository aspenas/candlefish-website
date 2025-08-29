package services

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// CacheService provides caching functionality for market data and valuations
type CacheService struct {
	// In-memory cache for development
	memCache map[string]cacheItem
	mutex    sync.RWMutex
	
	// Redis client would be used in production
	// redisClient *redis.Client
}

type cacheItem struct {
	data      string
	expiresAt time.Time
}

// NewCacheService creates a new cache service
func NewCacheService() *CacheService {
	cache := &CacheService{
		memCache: make(map[string]cacheItem),
	}
	
	// Start cleanup goroutine
	go cache.cleanup()
	
	return cache
}

// Get retrieves a value from cache
func (c *CacheService) Get(ctx context.Context, key string) (string, error) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	
	item, exists := c.memCache[key]
	if !exists {
		return "", fmt.Errorf("key not found")
	}
	
	if time.Now().After(item.expiresAt) {
		// Expired - remove from cache
		c.mutex.RUnlock()
		c.mutex.Lock()
		delete(c.memCache, key)
		c.mutex.Unlock()
		c.mutex.RLock()
		return "", fmt.Errorf("key expired")
	}
	
	return item.data, nil
}

// Set stores a value in cache with expiration
func (c *CacheService) Set(ctx context.Context, key string, value string, expiration time.Duration) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	c.memCache[key] = cacheItem{
		data:      value,
		expiresAt: time.Now().Add(expiration),
	}
	
	return nil
}

// Delete removes a value from cache
func (c *CacheService) Delete(ctx context.Context, key string) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	delete(c.memCache, key)
	return nil
}

// GetOrSet retrieves a value or sets it if not found
func (c *CacheService) GetOrSet(ctx context.Context, key string, expiration time.Duration, fn func() (interface{}, error)) (string, error) {
	// Try to get from cache first
	if value, err := c.Get(ctx, key); err == nil {
		return value, nil
	}
	
	// Not in cache, execute function
	result, err := fn()
	if err != nil {
		return "", err
	}
	
	// Marshal result to JSON
	data, err := json.Marshal(result)
	if err != nil {
		return "", fmt.Errorf("failed to marshal result: %w", err)
	}
	
	// Store in cache
	if err := c.Set(ctx, key, string(data), expiration); err != nil {
		return "", fmt.Errorf("failed to set cache: %w", err)
	}
	
	return string(data), nil
}

// GetJSON retrieves and unmarshals JSON data from cache
func (c *CacheService) GetJSON(ctx context.Context, key string, dest interface{}) error {
	data, err := c.Get(ctx, key)
	if err != nil {
		return err
	}
	
	return json.Unmarshal([]byte(data), dest)
}

// SetJSON marshals and stores JSON data in cache
func (c *CacheService) SetJSON(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}
	
	return c.Set(ctx, key, string(data), expiration)
}

// Invalidate removes cache entries matching a pattern
func (c *CacheService) Invalidate(ctx context.Context, pattern string) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	var keysToDelete []string
	for key := range c.memCache {
		// Simple pattern matching (contains)
		// In production, would use proper regex or glob matching
		if key == pattern || (len(pattern) > 0 && key[:len(pattern)] == pattern) {
			keysToDelete = append(keysToDelete, key)
		}
	}
	
	for _, key := range keysToDelete {
		delete(c.memCache, key)
	}
	
	return nil
}

// Clear removes all cache entries
func (c *CacheService) Clear(ctx context.Context) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	c.memCache = make(map[string]cacheItem)
	return nil
}

// Stats returns cache statistics
func (c *CacheService) Stats() map[string]interface{} {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	
	expired := 0
	total := len(c.memCache)
	now := time.Now()
	
	for _, item := range c.memCache {
		if now.After(item.expiresAt) {
			expired++
		}
	}
	
	return map[string]interface{}{
		"total_keys":   total,
		"expired_keys": expired,
		"active_keys":  total - expired,
	}
}

// cleanup removes expired entries periodically
func (c *CacheService) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			c.mutex.Lock()
			now := time.Now()
			var expiredKeys []string
			
			for key, item := range c.memCache {
				if now.After(item.expiresAt) {
					expiredKeys = append(expiredKeys, key)
				}
			}
			
			for _, key := range expiredKeys {
				delete(c.memCache, key)
			}
			
			c.mutex.Unlock()
		}
	}
}

// CacheKeys provides standardized cache key generation
type CacheKeys struct{}

// ValuationKeys generates cache keys for valuation-related data
func (CacheKeys) ValuationKeys() ValuationCacheKeys {
	return ValuationCacheKeys{}
}

// MarketKeys generates cache keys for market data
func (CacheKeys) MarketKeys() MarketCacheKeys {
	return MarketCacheKeys{}
}

type ValuationCacheKeys struct{}

func (ValuationCacheKeys) CurrentValuation(itemID string) string {
	return fmt.Sprintf("valuation:current:%s", itemID)
}

func (ValuationCacheKeys) ItemValuations(itemID string) string {
	return fmt.Sprintf("valuation:item:%s", itemID)
}

func (ValuationCacheKeys) RoomSummary(roomID string) string {
	return fmt.Sprintf("valuation:room_summary:%s", roomID)
}

func (ValuationCacheKeys) PricingInsights() string {
	return "valuation:pricing_insights"
}

func (ValuationCacheKeys) DepreciationModel(category, brand string) string {
	return fmt.Sprintf("valuation:depreciation:%s:%s", category, brand)
}

type MarketCacheKeys struct{}

func (MarketCacheKeys) EbaySearch(searchTerm string, limit int) string {
	return fmt.Sprintf("market:ebay:%s:%d", searchTerm, limit)
}

func (MarketCacheKeys) FacebookSearch(searchTerm string, limit int) string {
	return fmt.Sprintf("market:facebook:%s:%d", searchTerm, limit)
}

func (MarketCacheKeys) ChairishSearch(searchTerm string, limit int) string {
	return fmt.Sprintf("market:chairish:%s:%d", searchTerm, limit)
}

func (MarketCacheKeys) RetailSearch(brand, searchTerm string) string {
	return fmt.Sprintf("market:retail:%s:%s", brand, searchTerm)
}

func (MarketCacheKeys) MarketComparisons(itemID string) string {
	return fmt.Sprintf("market:comparisons:%s", itemID)
}

func (MarketCacheKeys) MarketTrends(category, brand string) string {
	return fmt.Sprintf("market:trends:%s:%s", category, brand)
}

// Predefined cache durations
var (
	CacheDurations = struct {
		// Valuation cache durations
		CurrentValuation time.Duration
		PricingInsights  time.Duration
		DepreciationModel time.Duration
		
		// Market data cache durations
		EbaySearch      time.Duration
		FacebookSearch  time.Duration
		ChairishSearch  time.Duration
		RetailSearch    time.Duration
		MarketTrends    time.Duration
		
		// General durations
		Short  time.Duration
		Medium time.Duration
		Long   time.Duration
	}{
		// Valuation durations
		CurrentValuation:  1 * time.Hour,
		PricingInsights:   30 * time.Minute,
		DepreciationModel: 24 * time.Hour,
		
		// Market data durations
		EbaySearch:     6 * time.Hour,
		FacebookSearch: 4 * time.Hour,
		ChairishSearch: 8 * time.Hour,
		RetailSearch:   12 * time.Hour,
		MarketTrends:   24 * time.Hour,
		
		// General durations
		Short:  15 * time.Minute,
		Medium: 1 * time.Hour,
		Long:   24 * time.Hour,
	}
)

// Production Redis implementation (commented out for now)
/*
import "github.com/go-redis/redis/v8"

type RedisCache struct {
	client *redis.Client
}

func NewRedisCache(addr, password string, db int) *RedisCache {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})
	
	return &RedisCache{client: rdb}
}

func (r *RedisCache) Get(ctx context.Context, key string) (string, error) {
	return r.client.Get(ctx, key).Result()
}

func (r *RedisCache) Set(ctx context.Context, key string, value string, expiration time.Duration) error {
	return r.client.Set(ctx, key, value, expiration).Err()
}

func (r *RedisCache) Delete(ctx context.Context, key string) error {
	return r.client.Del(ctx, key).Err()
}

func (r *RedisCache) Invalidate(ctx context.Context, pattern string) error {
	keys, err := r.client.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}
	
	if len(keys) > 0 {
		return r.client.Del(ctx, keys...).Err()
	}
	
	return nil
}
*/