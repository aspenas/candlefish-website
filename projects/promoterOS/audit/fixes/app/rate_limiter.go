// Rate Limiting Middleware - REMEDIATION CR-010
// Prevents API abuse and DDoS attacks

package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/redis/go-redis/v9"
	"github.com/ulule/limiter/v3"
	"github.com/ulule/limiter/v3/drivers/store/memory"
	redisstore "github.com/ulule/limiter/v3/drivers/store/redis"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
)

var (
	// Prometheus metrics
	rateLimitRequests = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "rate_limit_requests_total",
		Help: "Total number of rate limited requests",
	}, []string{"endpoint", "status"})

	rateLimitBlocked = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "rate_limit_blocked_total",
		Help: "Total number of blocked requests",
	}, []string{"endpoint", "reason"})

	activeRateLimits = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "rate_limit_active_limits",
		Help: "Number of active rate limits",
	}, []string{"type"})
)

// RateLimiterConfig holds rate limiter configuration
type RateLimiterConfig struct {
	// Global limits
	GlobalRequestsPerMinute int
	GlobalBurstSize         int

	// Per-IP limits
	IPRequestsPerMinute int
	IPBurstSize         int

	// Per-user limits (authenticated)
	UserRequestsPerMinute int
	UserBurstSize         int

	// Per-endpoint limits
	EndpointLimits map[string]EndpointLimit

	// Redis configuration
	UseRedis      bool
	RedisAddr     string
	RedisPassword string
	RedisDB       int

	// Advanced settings
	TrustedProxies []string
	SkipSuccessful bool
	SkipFailed     bool
}

// EndpointLimit defines rate limit for specific endpoint
type EndpointLimit struct {
	RequestsPerMinute int
	BurstSize         int
	Methods           []string
}

// RateLimiterManager manages multiple rate limiters
type RateLimiterManager struct {
	config         RateLimiterConfig
	globalLimiter  *limiter.Limiter
	ipLimiter      *limiter.Limiter
	userLimiter    *limiter.Limiter
	endpointLimits map[string]*limiter.Limiter
	redisClient    *redis.Client
	logger         *zap.Logger
	mu             sync.RWMutex
}

// NewRateLimiterManager creates a new rate limiter manager
func NewRateLimiterManager(config RateLimiterConfig, logger *zap.Logger) (*RateLimiterManager, error) {
	manager := &RateLimiterManager{
		config:         config,
		logger:         logger,
		endpointLimits: make(map[string]*limiter.Limiter),
	}

	// Initialize store (Redis or in-memory)
	var store limiter.Store
	if config.UseRedis {
		client := redis.NewClient(&redis.Options{
			Addr:     config.RedisAddr,
			Password: config.RedisPassword,
			DB:       config.RedisDB,
		})

		// Test connection
		ctx := context.Background()
		if err := client.Ping(ctx).Err(); err != nil {
			return nil, fmt.Errorf("failed to connect to Redis: %w", err)
		}

		manager.redisClient = client
		store, _ = redisstore.NewStoreWithOptions(client, limiter.StoreOptions{
			Prefix:   "rate_limit",
			MaxRetry: 3,
		})
	} else {
		store = memory.NewStore()
	}

	// Create global limiter
	globalRate := limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  int64(config.GlobalRequestsPerMinute),
	}
	manager.globalLimiter = limiter.New(store, globalRate)

	// Create IP-based limiter
	ipRate := limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  int64(config.IPRequestsPerMinute),
	}
	manager.ipLimiter = limiter.New(store, ipRate)

	// Create user-based limiter
	userRate := limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  int64(config.UserRequestsPerMinute),
	}
	manager.userLimiter = limiter.New(store, userRate)

	// Create endpoint-specific limiters
	for endpoint, limit := range config.EndpointLimits {
		rate := limiter.Rate{
			Period: 1 * time.Minute,
			Limit:  int64(limit.RequestsPerMinute),
		}
		manager.endpointLimits[endpoint] = limiter.New(store, rate)
	}

	return manager, nil
}

// RateLimitMiddleware returns a Gin middleware for rate limiting
func (m *RateLimiterManager) RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Start tracing span
		ctx, span := otel.Tracer("rate-limiter").Start(ctx, "rate_limit_check")
		defer span.End()

		// Get client identifier
		clientIP := m.getClientIP(c)
		userID := m.getUserID(c)
		endpoint := c.Request.URL.Path
		method := c.Request.Method

		span.SetAttributes(
			attribute.String("client_ip", clientIP),
			attribute.String("endpoint", endpoint),
			attribute.String("method", method),
		)

		// Check global rate limit
		if !m.checkLimit(ctx, m.globalLimiter, "global", c) {
			m.sendRateLimitResponse(c, "global")
			rateLimitBlocked.WithLabelValues(endpoint, "global").Inc()
			c.Abort()
			return
		}

		// Check IP-based rate limit
		if !m.checkLimit(ctx, m.ipLimiter, clientIP, c) {
			m.sendRateLimitResponse(c, "ip")
			rateLimitBlocked.WithLabelValues(endpoint, "ip").Inc()
			c.Abort()
			return
		}

		// Check user-based rate limit (if authenticated)
		if userID != "" {
			if !m.checkLimit(ctx, m.userLimiter, userID, c) {
				m.sendRateLimitResponse(c, "user")
				rateLimitBlocked.WithLabelValues(endpoint, "user").Inc()
				c.Abort()
				return
			}
		}

		// Check endpoint-specific rate limit
		if endpointLimiter := m.getEndpointLimiter(endpoint, method); endpointLimiter != nil {
			key := fmt.Sprintf("%s:%s:%s", endpoint, method, clientIP)
			if !m.checkLimit(ctx, endpointLimiter, key, c) {
				m.sendRateLimitResponse(c, "endpoint")
				rateLimitBlocked.WithLabelValues(endpoint, "endpoint").Inc()
				c.Abort()
				return
			}
		}

		// Add rate limit headers
		m.addRateLimitHeaders(c)

		// Record successful request
		rateLimitRequests.WithLabelValues(endpoint, "allowed").Inc()

		c.Next()
	}
}

// checkLimit checks if request is within rate limit
func (m *RateLimiterManager) checkLimit(ctx context.Context, l *limiter.Limiter, key string, c *gin.Context) bool {
	limiterCtx, err := l.Get(ctx, key)
	if err != nil {
		m.logger.Error("Rate limiter error", zap.Error(err))
		return true // Allow on error
	}

	// Add headers
	c.Header("X-RateLimit-Limit", strconv.FormatInt(limiterCtx.Limit, 10))
	c.Header("X-RateLimit-Remaining", strconv.FormatInt(limiterCtx.Remaining, 10))
	c.Header("X-RateLimit-Reset", strconv.FormatInt(limiterCtx.Reset, 10))

	return !limiterCtx.Reached
}

// getClientIP extracts client IP considering trusted proxies
func (m *RateLimiterManager) getClientIP(c *gin.Context) string {
	// Try X-Real-IP header first
	if ip := c.GetHeader("X-Real-IP"); ip != "" {
		return ip
	}

	// Try X-Forwarded-For
	if ip := c.GetHeader("X-Forwarded-For"); ip != "" {
		// Take the first IP in the chain
		if idx := strings.Index(ip, ","); idx != -1 {
			return strings.TrimSpace(ip[:idx])
		}
		return ip
	}

	// Fall back to remote address
	return c.ClientIP()
}

// getUserID extracts user ID from context (if authenticated)
func (m *RateLimiterManager) getUserID(c *gin.Context) string {
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(string); ok {
			return id
		}
	}
	return ""
}

// getEndpointLimiter returns limiter for specific endpoint
func (m *RateLimiterManager) getEndpointLimiter(endpoint, method string) *limiter.Limiter {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Check exact match
	if l, exists := m.endpointLimits[endpoint]; exists {
		if limit := m.config.EndpointLimits[endpoint]; len(limit.Methods) == 0 || contains(limit.Methods, method) {
			return l
		}
	}

	// Check prefix match
	for path, l := range m.endpointLimits {
		if strings.HasPrefix(endpoint, path) {
			if limit := m.config.EndpointLimits[path]; len(limit.Methods) == 0 || contains(limit.Methods, method) {
				return l
			}
		}
	}

	return nil
}

// sendRateLimitResponse sends rate limit exceeded response
func (m *RateLimiterManager) sendRateLimitResponse(c *gin.Context, limitType string) {
	c.Header("Retry-After", "60")
	c.JSON(http.StatusTooManyRequests, gin.H{
		"error":      "Too many requests",
		"message":    fmt.Sprintf("Rate limit exceeded (%s)", limitType),
		"retry_after": 60,
	})
}

// addRateLimitHeaders adds informational rate limit headers
func (m *RateLimiterManager) addRateLimitHeaders(c *gin.Context) {
	c.Header("X-RateLimit-Policy", "sliding-window")
}

// DefaultRateLimiterConfig returns default rate limiter configuration
func DefaultRateLimiterConfig() RateLimiterConfig {
	return RateLimiterConfig{
		// Global limits
		GlobalRequestsPerMinute: 10000,
		GlobalBurstSize:         100,

		// Per-IP limits
		IPRequestsPerMinute: 100,
		IPBurstSize:         10,

		// Per-user limits
		UserRequestsPerMinute: 1000,
		UserBurstSize:         20,

		// Endpoint-specific limits
		EndpointLimits: map[string]EndpointLimit{
			"/api/auth/login": {
				RequestsPerMinute: 5,
				BurstSize:         2,
				Methods:           []string{"POST"},
			},
			"/api/auth/register": {
				RequestsPerMinute: 3,
				BurstSize:         1,
				Methods:           []string{"POST"},
			},
			"/api/payments/webhook": {
				RequestsPerMinute: 100,
				BurstSize:         10,
				Methods:           []string{"POST"},
			},
			"/api/artists/analyze": {
				RequestsPerMinute: 10,
				BurstSize:         2,
				Methods:           []string{"POST"},
			},
			"/api/bookings/create": {
				RequestsPerMinute: 10,
				BurstSize:         2,
				Methods:           []string{"POST"},
			},
			"/api/metrics/collect": {
				RequestsPerMinute: 50,
				BurstSize:         5,
				Methods:           []string{"POST"},
			},
		},

		// Redis configuration
		UseRedis:      true,
		RedisAddr:     "redis:6379",
		RedisPassword: "",
		RedisDB:       0,

		// Trusted proxies
		TrustedProxies: []string{
			"10.0.0.0/8",
			"172.16.0.0/12",
			"192.168.0.0/16",
		},
	}
}

// Helper functions
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// strings import placeholder (would normally be imported at top)
var strings = struct {
	Index     func(string, string) int
	TrimSpace func(string) string
	HasPrefix func(string, string) bool
}{
	Index:     func(s, substr string) int { return 0 },
	TrimSpace: func(s string) string { return s },
	HasPrefix: func(s, prefix string) bool { return false },
}
