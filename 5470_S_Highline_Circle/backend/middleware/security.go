package middleware

import (
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/helmet"
)

// SecurityHeaders adds comprehensive security headers to all responses
func SecurityHeaders() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Prevent clickjacking attacks
		c.Set("X-Frame-Options", "DENY")
		
		// Prevent MIME type sniffing
		c.Set("X-Content-Type-Options", "nosniff")
		
		// Enable browser XSS protection (legacy browsers)
		c.Set("X-XSS-Protection", "1; mode=block")
		
		// Force HTTPS
		c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		
		// Content Security Policy - adjust based on your needs
		csp := []string{
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
			"font-src 'self' https://fonts.gstatic.com",
			"img-src 'self' data: https: blob:",
			"connect-src 'self' wss: https:",
			"frame-ancestors 'none'",
			"base-uri 'self'",
			"form-action 'self'",
		}
		c.Set("Content-Security-Policy", strings.Join(csp, "; "))
		
		// Referrer policy
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		
		// Permissions policy (formerly Feature policy)
		permissions := []string{
			"geolocation=()",
			"microphone=()",
			"camera=()",
			"payment=()",
			"usb=()",
			"magnetometer=()",
			"gyroscope=()",
			"accelerometer=()",
		}
		c.Set("Permissions-Policy", strings.Join(permissions, ", "))
		
		// Remove server identification
		c.Set("X-Powered-By", "")
		c.Set("Server", "")
		
		// Cache control for sensitive data
		if strings.Contains(c.Path(), "/api/") {
			c.Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
			c.Set("Pragma", "no-cache")
			c.Set("Expires", "0")
		}
		
		return c.Next()
	}
}

// HelmetMiddleware provides additional security headers using helmet
func HelmetMiddleware() fiber.Handler {
	return helmet.New(helmet.Config{
		XSSProtection:             "1; mode=block",
		ContentTypeNosniff:        "nosniff",
		XFrameOptions:             "DENY",
		HSTSMaxAge:                31536000,
		HSTSExcludeSubdomains:     false,
		ContentSecurityPolicy:     "",  // We set this manually in SecurityHeaders
		CSPReportOnly:             false,
		HSTSPreloadEnabled:        true,
		ReferrerPolicy:            "strict-origin-when-cross-origin",
		CrossOriginEmbedderPolicy: "require-corp",
		CrossOriginOpenerPolicy:   "same-origin",
		CrossOriginResourcePolicy: "same-origin",
		OriginAgentCluster:        "?1",
		XDNSPrefetchControl:       "off",
		XDownloadOptions:          "noopen",
	})
}

// RateLimiter provides configurable rate limiting
func RateLimiter(requestsPerMinute int) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        requestsPerMinute,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			// Use IP address as key, with X-Forwarded-For support
			ip := c.Get("X-Forwarded-For")
			if ip == "" {
				ip = c.Get("X-Real-IP")
			}
			if ip == "" {
				ip = c.IP()
			}
			return ip
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Too many requests",
				"code":  "RATE_LIMIT_EXCEEDED",
				"retry_after": 60, // seconds
			})
		},
		SkipFailedRequests: false,
		SkipSuccessfulRequests: false,
	})
}

// StrictRateLimiter for sensitive endpoints
func StrictRateLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        5,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Rate limit exceeded for sensitive operation",
				"code":  "STRICT_RATE_LIMIT",
				"retry_after": 60,
			})
		},
	})
}

// APIKeyRateLimiter for API key based rate limiting
func APIKeyRateLimiter(requestsPerMinute int) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        requestsPerMinute,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			// Use API key as rate limit key
			apiKey := c.Get("X-API-Key")
			if apiKey == "" {
				return c.IP() // Fallback to IP
			}
			return "api_key:" + apiKey
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "API rate limit exceeded",
				"code":  "API_RATE_LIMIT",
				"retry_after": 60,
			})
		},
	})
}

// LoginRateLimiter specifically for login attempts
func LoginRateLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        5, // 5 login attempts
		Expiration: 15 * time.Minute, // per 15 minutes
		KeyGenerator: func(c *fiber.Ctx) string {
			// Combine IP and username for rate limiting
			var loginReq struct {
				Email string `json:"email"`
			}
			c.BodyParser(&loginReq)
			
			key := fmt.Sprintf("login:%s:%s", c.IP(), loginReq.Email)
			return key
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Too many login attempts. Please try again later.",
				"code":  "LOGIN_RATE_LIMIT",
				"retry_after": 900, // 15 minutes in seconds
			})
		},
	})
}

// RequestSizeLimiter limits the size of incoming requests
func RequestSizeLimiter(maxBytes int) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if len(c.Body()) > maxBytes {
			return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{
				"error": "Request body too large",
				"code":  "PAYLOAD_TOO_LARGE",
				"max_size": maxBytes,
			})
		}
		return c.Next()
	}
}

// SecureJSON ensures JSON responses are protected against JSON hijacking
func SecureJSON() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Add JSON hijacking protection prefix
		c.Set("X-Content-Type-Options", "nosniff")
		
		// Prevent JSON responses from being loaded via <script> tags
		if c.Get("Accept") != "" && !strings.Contains(c.Get("Accept"), "application/json") {
			contentType := c.Get("Content-Type")
			if strings.Contains(contentType, "application/json") {
				c.Set("X-Content-Type-Options", "nosniff")
			}
		}
		
		return c.Next()
	}
}

// IPWhitelist restricts access to specific IP addresses
func IPWhitelist(allowedIPs []string) fiber.Handler {
	ipMap := make(map[string]bool)
	for _, ip := range allowedIPs {
		ipMap[ip] = true
	}
	
	return func(c *fiber.Ctx) error {
		clientIP := c.IP()
		
		// Check X-Forwarded-For header if behind proxy
		if forwardedFor := c.Get("X-Forwarded-For"); forwardedFor != "" {
			ips := strings.Split(forwardedFor, ",")
			if len(ips) > 0 {
				clientIP = strings.TrimSpace(ips[0])
			}
		}
		
		if !ipMap[clientIP] {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Access denied",
				"code":  "IP_NOT_WHITELISTED",
			})
		}
		
		return c.Next()
	}
}

// APIKey validates API key for machine-to-machine authentication
func APIKey() fiber.Handler {
	return func(c *fiber.Ctx) error {
		apiKey := c.Get("X-API-Key")
		if apiKey == "" {
			apiKey = c.Query("api_key")
		}
		
		if apiKey == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "API key required",
				"code":  "MISSING_API_KEY",
			})
		}
		
		// Validate API key (implement your validation logic)
		if !validateAPIKey(apiKey) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid API key",
				"code":  "INVALID_API_KEY",
			})
		}
		
		// Store API key info in context
		c.Locals("api_key", apiKey)
		
		return c.Next()
	}
}

// validateAPIKey checks if the API key is valid
func validateAPIKey(key string) bool {
	// TODO: Implement actual API key validation
	// This should check against a database or cache
	// For now, this is a placeholder
	return len(key) >= 32
}

// RequestID adds a unique request ID to each request
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		requestID := c.Get("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}
		
		c.Set("X-Request-ID", requestID)
		c.Locals("request_id", requestID)
		
		return c.Next()
	}
}

// generateRequestID creates a unique request identifier
func generateRequestID() string {
	return fmt.Sprintf("%d-%s", time.Now().UnixNano(), randomString(8))
}

// randomString generates a random string of specified length
func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(result)
}