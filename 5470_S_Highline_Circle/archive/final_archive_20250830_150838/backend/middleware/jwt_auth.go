package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/patricksmith/highline-inventory/auth"
)

// AuthConfig holds the authentication middleware configuration
type AuthConfig struct {
	JWTManager     *auth.JWTManager
	Blacklist      *auth.TokenBlacklist
	CSRFManager    *auth.CSRFManager
	RateLimiter    *auth.RateLimiter
	SkipCSRF       bool
	RequiredRoles  []string
}

// ContextKey for storing user info in context
type ContextKey string

const (
	UserContextKey  ContextKey = "user"
	ClaimsContextKey ContextKey = "claims"
)

// JWTAuth creates a JWT authentication middleware
func JWTAuth(config AuthConfig) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract token from both Authorization header and cookies
		token := extractTokenFromRequest(c)
		
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing authentication token",
			})
		}

		// Validate token
		claims, err := config.JWTManager.ValidateToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		// Check if token is blacklisted
		if config.Blacklist != nil && config.Blacklist.IsRevoked(claims.ID) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Token has been revoked",
			})
		}

		// Check token type
		if claims.Type != "access" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token type",
			})
		}

		// Check required roles
		if len(config.RequiredRoles) > 0 {
			if !hasRequiredRole(claims.Roles, config.RequiredRoles) {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "Insufficient permissions",
				})
			}
		}

		// CSRF validation for state-changing requests
		if !config.SkipCSRF && isStateChangingMethod(c.Method()) {
			csrfToken := c.Get("X-CSRF-Token")
			csrfCookie := c.Cookies("csrf_token")
			
			if err := auth.VerifyCSRFHeader(csrfToken, csrfCookie); err != nil {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "CSRF validation failed",
				})
			}
		}

		// Store claims in context
		c.Locals(string(ClaimsContextKey), claims)
		c.Locals(string(UserContextKey), fiber.Map{
			"id":       claims.UserID,
			"email":    claims.Email,
			"username": claims.Username,
			"roles":    claims.Roles,
		})

		return c.Next()
	}
}

// OptionalJWTAuth creates an optional JWT authentication middleware
// It validates the token if present but allows requests without tokens
func OptionalJWTAuth(config AuthConfig) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract token from both Authorization header and cookies
		token := extractTokenFromRequest(c)
		
		if token != "" {
			// Validate token if present
			claims, err := config.JWTManager.ValidateToken(token)
			if err == nil && (config.Blacklist == nil || !config.Blacklist.IsRevoked(claims.ID)) {
				// Store claims in context if valid
				c.Locals(string(ClaimsContextKey), claims)
				c.Locals(string(UserContextKey), fiber.Map{
					"id":       claims.UserID,
					"email":    claims.Email,
					"username": claims.Username,
					"roles":    claims.Roles,
				})
			}
		}

		return c.Next()
	}
}

// RequireRoles creates middleware that requires specific roles
func RequireRoles(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals(string(ClaimsContextKey)).(*auth.Claims)
		if !ok || claims == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authentication required",
			})
		}

		if !hasRequiredRole(claims.Roles, roles) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Insufficient permissions",
			})
		}

		return c.Next()
	}
}

// RateLimitAuth creates rate limiting middleware for auth endpoints
func RateLimitAuth(limiter *auth.RateLimiter) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get client identifier
		identifier := getClientIdentifier(c)
		
		// Check rate limit
		allowed, remaining, resetAt, err := limiter.CheckLimit(identifier)
		if err != nil {
			// Log error but allow request
			return c.Next()
		}

		// Set rate limit headers
		c.Set("X-RateLimit-Limit", "5")
		c.Set("X-RateLimit-Remaining", string(rune(remaining)))
		c.Set("X-RateLimit-Reset", resetAt.Format(time.RFC3339))

		if !allowed {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":     "Too many requests",
				"retry_after": resetAt.Unix(),
			})
		}

		return c.Next()
	}
}

// extractTokenFromRequest extracts JWT token from Authorization header or cookies
func extractTokenFromRequest(c *fiber.Ctx) string {
	// Check Authorization header first
	authHeader := c.Get("Authorization")
	if authHeader != "" {
		// Bearer token
		if strings.HasPrefix(authHeader, "Bearer ") {
			return strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	// Check cookie
	token := c.Cookies("access_token")
	if token != "" {
		return token
	}

	return ""
}

// hasRequiredRole checks if user has at least one of the required roles
func hasRequiredRole(userRoles, requiredRoles []string) bool {
	for _, required := range requiredRoles {
		for _, userRole := range userRoles {
			if userRole == required || userRole == "admin" { // Admin has all permissions
				return true
			}
		}
	}
	return false
}

// isStateChangingMethod checks if the HTTP method is state-changing
func isStateChangingMethod(method string) bool {
	switch method {
	case "POST", "PUT", "PATCH", "DELETE":
		return true
	default:
		return false
	}
}

// getClientIdentifier gets a unique identifier for rate limiting
func getClientIdentifier(c *fiber.Ctx) string {
	// Try to get user ID if authenticated
	if claims, ok := c.Locals(string(ClaimsContextKey)).(*auth.Claims); ok && claims != nil {
		return "user:" + claims.UserID
	}

	// Use IP address as fallback
	ip := c.IP()
	if ip == "" {
		// Check headers for real IP
		headers := map[string][]string{
			"X-Real-IP":        {c.Get("X-Real-IP")},
			"X-Forwarded-For":  {c.Get("X-Forwarded-For")},
			"CF-Connecting-IP": {c.Get("CF-Connecting-IP")},
		}
		ip = auth.GetClientIP(headers)
	}

	return "ip:" + ip
}

// GetUserFromContext extracts user information from context
func GetUserFromContext(c *fiber.Ctx) (userID string, email string, username string, roles []string) {
	if claims, ok := c.Locals(string(ClaimsContextKey)).(*auth.Claims); ok && claims != nil {
		return claims.UserID, claims.Email, claims.Username, claims.Roles
	}
	return "", "", "", nil
}

// GetClaimsFromContext extracts JWT claims from context
func GetClaimsFromContext(c *fiber.Ctx) *auth.Claims {
	if claims, ok := c.Locals(string(ClaimsContextKey)).(*auth.Claims); ok {
		return claims
	}
	return nil
}

// RefreshTokenMiddleware validates refresh tokens
func RefreshTokenMiddleware(jwtManager *auth.JWTManager, blacklist *auth.TokenBlacklist) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract refresh token
		token := c.Get("X-Refresh-Token")
		if token == "" {
			token = c.Cookies("refresh_token")
		}
		
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing refresh token",
			})
		}

		// Validate token
		claims, err := jwtManager.ValidateToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid refresh token",
			})
		}

		// Check token type
		if claims.Type != "refresh" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token type",
			})
		}

		// Check if blacklisted
		if blacklist != nil && blacklist.IsRevoked(claims.ID) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Token has been revoked",
			})
		}

		// Store claims in context
		c.Locals(string(ClaimsContextKey), claims)
		
		return c.Next()
	}
}