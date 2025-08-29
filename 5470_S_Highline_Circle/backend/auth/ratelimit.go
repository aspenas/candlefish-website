package auth

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
)

// RateLimiter implements rate limiting for authentication endpoints
type RateLimiter struct {
	redis       *redis.Client
	memoryStore map[string]*rateLimitEntry
	mu          sync.RWMutex
	useRedis    bool
	
	// Configuration
	maxAttempts      int
	windowDuration   time.Duration
	blockDuration    time.Duration
}

type rateLimitEntry struct {
	attempts  int
	windowStart time.Time
	blockedUntil time.Time
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(redisClient *redis.Client) *RateLimiter {
	rl := &RateLimiter{
		redis:          redisClient,
		memoryStore:    make(map[string]*rateLimitEntry),
		useRedis:       redisClient != nil,
		maxAttempts:    5,                    // 5 attempts
		windowDuration: 15 * time.Minute,     // per 15 minutes
		blockDuration:  30 * time.Minute,     // block for 30 minutes after exceeding
	}

	// Start cleanup goroutine for memory store
	if !rl.useRedis {
		go rl.cleanupExpired()
	}

	return rl
}

// CheckLimit checks if the identifier (IP or userID) has exceeded rate limit
func (rl *RateLimiter) CheckLimit(identifier string) (allowed bool, remainingAttempts int, resetAt time.Time, err error) {
	if rl.useRedis {
		return rl.checkRedisLimit(identifier)
	}
	return rl.checkMemoryLimit(identifier)
}

// checkRedisLimit checks rate limit using Redis
func (rl *RateLimiter) checkRedisLimit(identifier string) (bool, int, time.Time, error) {
	ctx := context.Background()
	now := time.Now()
	
	// Check if blocked
	blockKey := fmt.Sprintf("ratelimit:block:%s", identifier)
	blocked, err := rl.redis.Exists(ctx, blockKey).Result()
	if err != nil {
		return true, rl.maxAttempts, now, err // Allow on error
	}
	
	if blocked > 0 {
		ttl, _ := rl.redis.TTL(ctx, blockKey).Result()
		resetAt := now.Add(ttl)
		return false, 0, resetAt, nil
	}
	
	// Check attempts
	attemptKey := fmt.Sprintf("ratelimit:attempts:%s", identifier)
	attempts, err := rl.redis.Incr(ctx, attemptKey).Result()
	if err != nil {
		return true, rl.maxAttempts, now, err // Allow on error
	}
	
	// Set expiry on first attempt
	if attempts == 1 {
		rl.redis.Expire(ctx, attemptKey, rl.windowDuration)
	}
	
	remaining := rl.maxAttempts - int(attempts)
	
	// Check if exceeded
	if int(attempts) > rl.maxAttempts {
		// Block the identifier
		rl.redis.Set(ctx, blockKey, "1", rl.blockDuration)
		rl.redis.Del(ctx, attemptKey) // Reset attempts
		return false, 0, now.Add(rl.blockDuration), nil
	}
	
	ttl, _ := rl.redis.TTL(ctx, attemptKey).Result()
	resetAt := now.Add(ttl)
	
	return true, remaining, resetAt, nil
}

// checkMemoryLimit checks rate limit using memory store
func (rl *RateLimiter) checkMemoryLimit(identifier string) (bool, int, time.Time, error) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	
	now := time.Now()
	entry, exists := rl.memoryStore[identifier]
	
	if !exists {
		// First attempt
		rl.memoryStore[identifier] = &rateLimitEntry{
			attempts:     1,
			windowStart:  now,
			blockedUntil: time.Time{},
		}
		return true, rl.maxAttempts - 1, now.Add(rl.windowDuration), nil
	}
	
	// Check if blocked
	if !entry.blockedUntil.IsZero() && now.Before(entry.blockedUntil) {
		return false, 0, entry.blockedUntil, nil
	}
	
	// Check if window expired
	if now.After(entry.windowStart.Add(rl.windowDuration)) {
		// Reset window
		entry.attempts = 1
		entry.windowStart = now
		entry.blockedUntil = time.Time{}
		return true, rl.maxAttempts - 1, now.Add(rl.windowDuration), nil
	}
	
	// Increment attempts
	entry.attempts++
	
	if entry.attempts > rl.maxAttempts {
		// Block the identifier
		entry.blockedUntil = now.Add(rl.blockDuration)
		return false, 0, entry.blockedUntil, nil
	}
	
	remaining := rl.maxAttempts - entry.attempts
	resetAt := entry.windowStart.Add(rl.windowDuration)
	
	return true, remaining, resetAt, nil
}

// Reset clears the rate limit for an identifier
func (rl *RateLimiter) Reset(identifier string) error {
	if rl.useRedis {
		ctx := context.Background()
		attemptKey := fmt.Sprintf("ratelimit:attempts:%s", identifier)
		blockKey := fmt.Sprintf("ratelimit:block:%s", identifier)
		
		pipe := rl.redis.Pipeline()
		pipe.Del(ctx, attemptKey)
		pipe.Del(ctx, blockKey)
		_, err := pipe.Exec(ctx)
		return err
	}
	
	rl.mu.Lock()
	delete(rl.memoryStore, identifier)
	rl.mu.Unlock()
	return nil
}

// cleanupExpired removes expired entries from memory store
func (rl *RateLimiter) cleanupExpired() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for id, entry := range rl.memoryStore {
			// Remove if window expired and not blocked
			if now.After(entry.windowStart.Add(rl.windowDuration)) && 
			   (entry.blockedUntil.IsZero() || now.After(entry.blockedUntil)) {
				delete(rl.memoryStore, id)
			}
		}
		rl.mu.Unlock()
	}
}

// GetClientIP extracts client IP from request headers
func GetClientIP(headers map[string][]string) string {
	// Check common headers for real IP
	headerNames := []string{
		"X-Real-IP",
		"X-Forwarded-For",
		"CF-Connecting-IP", // Cloudflare
		"X-Client-IP",
	}
	
	for _, header := range headerNames {
		if values, ok := headers[header]; ok && len(values) > 0 {
			return values[0]
		}
	}
	
	return "unknown"
}