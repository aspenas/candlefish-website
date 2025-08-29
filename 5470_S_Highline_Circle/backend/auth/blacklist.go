package auth

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
)

// TokenBlacklist manages revoked tokens
type TokenBlacklist struct {
	redis       *redis.Client
	memoryStore map[string]time.Time
	mu          sync.RWMutex
	useRedis    bool
}

// NewTokenBlacklist creates a new token blacklist
func NewTokenBlacklist(redisClient *redis.Client) *TokenBlacklist {
	tb := &TokenBlacklist{
		redis:       redisClient,
		memoryStore: make(map[string]time.Time),
		useRedis:    redisClient != nil,
	}

	// Start cleanup goroutine for memory store
	if !tb.useRedis {
		go tb.cleanupExpired()
	}

	return tb
}

// RevokeToken adds a token to the blacklist
func (tb *TokenBlacklist) RevokeToken(tokenID string, expiresAt time.Time) error {
	ctx := context.Background()
	
	if tb.useRedis {
		// Store in Redis with expiration
		ttl := time.Until(expiresAt)
		if ttl <= 0 {
			return nil // Token already expired
		}
		
		key := fmt.Sprintf("blacklist:%s", tokenID)
		return tb.redis.Set(ctx, key, time.Now().Unix(), ttl).Err()
	}

	// Store in memory
	tb.mu.Lock()
	defer tb.mu.Unlock()
	tb.memoryStore[tokenID] = expiresAt
	return nil
}

// IsRevoked checks if a token is blacklisted
func (tb *TokenBlacklist) IsRevoked(tokenID string) bool {
	ctx := context.Background()
	
	if tb.useRedis {
		key := fmt.Sprintf("blacklist:%s", tokenID)
		exists, err := tb.redis.Exists(ctx, key).Result()
		if err != nil {
			// Log error but don't fail authentication
			fmt.Printf("Error checking token blacklist: %v\n", err)
			return false
		}
		return exists > 0
	}

	// Check memory store
	tb.mu.RLock()
	defer tb.mu.RUnlock()
	
	expiresAt, exists := tb.memoryStore[tokenID]
	if !exists {
		return false
	}
	
	// Check if still valid
	if time.Now().After(expiresAt) {
		// Token expired, can be removed from blacklist
		return false
	}
	
	return true
}

// cleanupExpired removes expired tokens from memory store
func (tb *TokenBlacklist) cleanupExpired() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		tb.mu.Lock()
		now := time.Now()
		for tokenID, expiresAt := range tb.memoryStore {
			if now.After(expiresAt) {
				delete(tb.memoryStore, tokenID)
			}
		}
		tb.mu.Unlock()
	}
}

// RevokeAllUserTokens revokes all tokens for a specific user
func (tb *TokenBlacklist) RevokeAllUserTokens(userID string, tokenIDs []string, expiresAt time.Time) error {
	for _, tokenID := range tokenIDs {
		if err := tb.RevokeToken(tokenID, expiresAt); err != nil {
			return err
		}
	}
	return nil
}