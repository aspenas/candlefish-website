// Circuit Breaker Implementation - REMEDIATION CR-009
// Prevents cascading failures from external API outages

package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/sony/gobreaker"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
)

var (
	// Prometheus metrics
	circuitBreakerState = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "circuit_breaker_state",
		Help: "Current state of circuit breaker (0=closed, 1=open, 2=half-open)",
	}, []string{"name"})

	circuitBreakerRequests = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "circuit_breaker_requests_total",
		Help: "Total number of requests through circuit breaker",
	}, []string{"name", "status"})

	circuitBreakerFailures = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "circuit_breaker_failures_total",
		Help: "Total number of failures in circuit breaker",
	}, []string{"name", "reason"})
)

// CircuitBreakerManager manages multiple circuit breakers for different services
type CircuitBreakerManager struct {
	breakers map[string]*ServiceBreaker
	mu       sync.RWMutex
	logger   *zap.Logger
	tracer   trace.Tracer
}

// ServiceBreaker wraps a circuit breaker for a specific service
type ServiceBreaker struct {
	breaker     *gobreaker.CircuitBreaker
	name        string
	logger      *zap.Logger
	rateLimiter *RateLimiter
}

// RateLimiter implements token bucket rate limiting
type RateLimiter struct {
	tokens    int
	maxTokens int
	refillRate time.Duration
	mu        sync.Mutex
	lastRefill time.Time
}

// NewCircuitBreakerManager creates a new circuit breaker manager
func NewCircuitBreakerManager(logger *zap.Logger) *CircuitBreakerManager {
	return &CircuitBreakerManager{
		breakers: make(map[string]*ServiceBreaker),
		logger:   logger,
		tracer:   otel.Tracer("circuit-breaker"),
	}
}

// GetBreaker returns or creates a circuit breaker for the given service
func (m *CircuitBreakerManager) GetBreaker(name string, config BreakerConfig) *ServiceBreaker {
	m.mu.RLock()
	breaker, exists := m.breakers[name]
	m.mu.RUnlock()

	if exists {
		return breaker
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// Double-check after acquiring write lock
	if breaker, exists := m.breakers[name]; exists {
		return breaker
	}

	// Create new circuit breaker
	settings := gobreaker.Settings{
		Name:        name,
		MaxRequests: uint32(config.MaxRequests),
		Interval:    config.Interval,
		Timeout:     config.Timeout,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= uint32(config.MinRequests) &&
				   failureRatio >= config.FailureThreshold
		},
		OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
			m.logger.Info("Circuit breaker state changed",
				zap.String("name", name),
				zap.String("from", from.String()),
				zap.String("to", to.String()))

			// Update Prometheus metric
			var stateValue float64
			switch to {
			case gobreaker.StateClosed:
				stateValue = 0
			case gobreaker.StateOpen:
				stateValue = 1
			case gobreaker.StateHalfOpen:
				stateValue = 2
			}
			circuitBreakerState.WithLabelValues(name).Set(stateValue)
		},
		IsSuccessful: func(err error) bool {
			if err == nil {
				return true
			}
			// Consider timeouts and 5xx errors as failures
			if httpErr, ok := err.(*HTTPError); ok {
				return httpErr.StatusCode < 500
			}
			return false
		},
	}

	cb := gobreaker.NewCircuitBreaker(settings)

	// Create rate limiter
	rl := &RateLimiter{
		tokens:     config.RateLimitTokens,
		maxTokens:  config.RateLimitTokens,
		refillRate: config.RateLimitRefill,
		lastRefill: time.Now(),
	}

	breaker = &ServiceBreaker{
		breaker:     cb,
		name:        name,
		logger:      m.logger,
		rateLimiter: rl,
	}

	m.breakers[name] = breaker
	return breaker
}

// Execute runs a function through the circuit breaker
func (sb *ServiceBreaker) Execute(ctx context.Context, fn func() (interface{}, error)) (interface{}, error) {
	// Start tracing span
	ctx, span := otel.Tracer("circuit-breaker").Start(ctx, fmt.Sprintf("cb.%s", sb.name))
	defer span.End()

	// Check rate limit first
	if !sb.rateLimiter.Allow() {
		circuitBreakerFailures.WithLabelValues(sb.name, "rate_limited").Inc()
		span.SetAttributes(attribute.String("error", "rate_limited"))
		return nil, &HTTPError{
			StatusCode: http.StatusTooManyRequests,
			Message:    "Rate limit exceeded",
		}
	}

	// Execute through circuit breaker
	result, err := sb.breaker.Execute(func() (interface{}, error) {
		// Add timeout to context
		ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()

		// Execute the actual function
		return fn()
	})

	// Record metrics
	if err != nil {
		circuitBreakerRequests.WithLabelValues(sb.name, "failure").Inc()
		span.SetAttributes(attribute.String("error", err.Error()))
	} else {
		circuitBreakerRequests.WithLabelValues(sb.name, "success").Inc()
	}

	return result, err
}

// Allow checks if a request is allowed by the rate limiter
func (rl *RateLimiter) Allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	// Refill tokens
	now := time.Now()
	elapsed := now.Sub(rl.lastRefill)
	tokensToAdd := int(elapsed / rl.refillRate)

	if tokensToAdd > 0 {
		rl.tokens = min(rl.tokens+tokensToAdd, rl.maxTokens)
		rl.lastRefill = now
	}

	// Check if we have tokens
	if rl.tokens > 0 {
		rl.tokens--
		return true
	}

	return false
}

// BreakerConfig holds configuration for a circuit breaker
type BreakerConfig struct {
	MaxRequests       int
	MinRequests       int
	Interval          time.Duration
	Timeout           time.Duration
	FailureThreshold  float64
	RateLimitTokens   int
	RateLimitRefill   time.Duration
}

// DefaultBreakerConfigs returns default configurations for different services
func DefaultBreakerConfigs() map[string]BreakerConfig {
	return map[string]BreakerConfig{
		"tiktok_api": {
			MaxRequests:      3,
			MinRequests:      3,
			Interval:         10 * time.Second,
			Timeout:          30 * time.Second,
			FailureThreshold: 0.6,
			RateLimitTokens:  100,
			RateLimitRefill:  time.Second,
		},
		"stripe_api": {
			MaxRequests:      5,
			MinRequests:      5,
			Interval:         30 * time.Second,
			Timeout:          60 * time.Second,
			FailureThreshold: 0.5,
			RateLimitTokens:  50,
			RateLimitRefill:  time.Second,
		},
		"spotify_api": {
			MaxRequests:      3,
			MinRequests:      3,
			Interval:         10 * time.Second,
			Timeout:          30 * time.Second,
			FailureThreshold: 0.6,
			RateLimitTokens:  100,
			RateLimitRefill:  time.Second,
		},
		"instagram_api": {
			MaxRequests:      3,
			MinRequests:      3,
			Interval:         10 * time.Second,
			Timeout:          30 * time.Second,
			FailureThreshold: 0.6,
			RateLimitTokens:  50,
			RateLimitRefill:  time.Second,
		},
		"youtube_api": {
			MaxRequests:      3,
			MinRequests:      3,
			Interval:         10 * time.Second,
			Timeout:          30 * time.Second,
			FailureThreshold: 0.6,
			RateLimitTokens:  100,
			RateLimitRefill:  time.Second,
		},
	}
}

// HTTPError represents an HTTP error
type HTTPError struct {
	StatusCode int
	Message    string
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("HTTP %d: %s", e.StatusCode, e.Message)
}

// TikTokAPIClient wraps TikTok API calls with circuit breaker
type TikTokAPIClient struct {
	breaker *ServiceBreaker
	client  *http.Client
	baseURL string
	apiKey  string
	logger  *zap.Logger
}

// NewTikTokAPIClient creates a new TikTok API client with circuit breaker
func NewTikTokAPIClient(manager *CircuitBreakerManager, apiKey string) *TikTokAPIClient {
	config := DefaultBreakerConfigs()["tiktok_api"]
	breaker := manager.GetBreaker("tiktok_api", config)

	return &TikTokAPIClient{
		breaker: breaker,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
		baseURL: "https://api.tiktok.com/v1",
		apiKey:  apiKey,
		logger:  manager.logger,
	}
}

// GetArtistMetrics fetches artist metrics through circuit breaker
func (c *TikTokAPIClient) GetArtistMetrics(ctx context.Context, artistID string) (*ArtistMetrics, error) {
	result, err := c.breaker.Execute(ctx, func() (interface{}, error) {
		url := fmt.Sprintf("%s/artists/%s/metrics", c.baseURL, artistID)

		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return nil, err
		}

		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))
		req.Header.Set("User-Agent", "PromoterOS/1.0")

		resp, err := c.client.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 500 {
			return nil, &HTTPError{
				StatusCode: resp.StatusCode,
				Message:    "TikTok API error",
			}
		}

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("unexpected status: %d", resp.StatusCode)
		}

		var metrics ArtistMetrics
		if err := json.NewDecoder(resp.Body).Decode(&metrics); err != nil {
			return nil, err
		}

		return &metrics, nil
	})

	if err != nil {
		c.logger.Error("Failed to get artist metrics",
			zap.String("artist_id", artistID),
			zap.Error(err))
		return nil, err
	}

	return result.(*ArtistMetrics), nil
}

// ArtistMetrics represents artist metrics from TikTok
type ArtistMetrics struct {
	ArtistID     string    `json:"artist_id"`
	Followers    int64     `json:"followers"`
	MonthlyViews int64     `json:"monthly_views"`
	Engagement   float64   `json:"engagement_rate"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Helper function
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
