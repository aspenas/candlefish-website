package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"sync"
	"time"
)

// CSRFManager handles CSRF token generation and validation
type CSRFManager struct {
	secret      []byte
	tokenStore  map[string]csrfToken
	mu          sync.RWMutex
	tokenExpiry time.Duration
}

type csrfToken struct {
	Token     string
	ExpiresAt time.Time
	UserID    string
}

// NewCSRFManager creates a new CSRF manager
func NewCSRFManager(secret string) *CSRFManager {
	if secret == "" {
		// Generate random secret if not provided
		b := make([]byte, 32)
		rand.Read(b)
		secret = base64.StdEncoding.EncodeToString(b)
	}

	cm := &CSRFManager{
		secret:      []byte(secret),
		tokenStore:  make(map[string]csrfToken),
		tokenExpiry: 24 * time.Hour,
	}

	// Start cleanup goroutine
	go cm.cleanupExpired()

	return cm
}

// GenerateToken generates a new CSRF token for a user
func (cm *CSRFManager) GenerateToken(userID string) (string, error) {
	// Generate random bytes
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	// Create HMAC
	h := hmac.New(sha256.New, cm.secret)
	h.Write(b)
	h.Write([]byte(userID))
	h.Write([]byte(time.Now().String()))
	
	token := base64.URLEncoding.EncodeToString(h.Sum(nil))
	
	// Store token
	cm.mu.Lock()
	cm.tokenStore[token] = csrfToken{
		Token:     token,
		ExpiresAt: time.Now().Add(cm.tokenExpiry),
		UserID:    userID,
	}
	cm.mu.Unlock()

	return token, nil
}

// ValidateToken validates a CSRF token
func (cm *CSRFManager) ValidateToken(token, userID string) error {
	if token == "" {
		return errors.New("CSRF token is required")
	}

	cm.mu.RLock()
	storedToken, exists := cm.tokenStore[token]
	cm.mu.RUnlock()

	if !exists {
		return errors.New("invalid CSRF token")
	}

	if time.Now().After(storedToken.ExpiresAt) {
		// Remove expired token
		cm.mu.Lock()
		delete(cm.tokenStore, token)
		cm.mu.Unlock()
		return errors.New("CSRF token expired")
	}

	if storedToken.UserID != userID {
		return errors.New("CSRF token does not match user")
	}

	return nil
}

// InvalidateToken removes a CSRF token
func (cm *CSRFManager) InvalidateToken(token string) {
	cm.mu.Lock()
	delete(cm.tokenStore, token)
	cm.mu.Unlock()
}

// InvalidateUserTokens removes all CSRF tokens for a user
func (cm *CSRFManager) InvalidateUserTokens(userID string) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	for token, csrfToken := range cm.tokenStore {
		if csrfToken.UserID == userID {
			delete(cm.tokenStore, token)
		}
	}
}

// cleanupExpired removes expired tokens periodically
func (cm *CSRFManager) cleanupExpired() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		cm.mu.Lock()
		now := time.Now()
		for token, csrfToken := range cm.tokenStore {
			if now.After(csrfToken.ExpiresAt) {
				delete(cm.tokenStore, token)
			}
		}
		cm.mu.Unlock()
	}
}

// GetTokenExpiry returns the token expiry duration
func (cm *CSRFManager) GetTokenExpiry() time.Duration {
	return cm.tokenExpiry
}

// VerifyCSRFHeader checks if the CSRF token in the header matches
func VerifyCSRFHeader(headerToken, cookieToken string) error {
	if headerToken == "" {
		return errors.New("X-CSRF-Token header is required")
	}
	
	if cookieToken == "" {
		return errors.New("CSRF cookie is required")
	}
	
	if headerToken != cookieToken {
		return errors.New("CSRF token mismatch")
	}
	
	return nil
}

// GenerateCSRFPair generates a matching pair of CSRF tokens
func GenerateCSRFPair() (headerToken, cookieToken string, err error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", fmt.Errorf("failed to generate random bytes: %v", err)
	}
	
	token := base64.URLEncoding.EncodeToString(b)
	return token, token, nil
}