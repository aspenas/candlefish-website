package main

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus"
	"go.uber.org/zap"
)

// RequestIDMiddleware adds a unique request ID to each request
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

// LoggingMiddleware logs all requests with structured logging
func LoggingMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Log request details
		latency := time.Since(start)
		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()
		errorMessage := c.Errors.ByType(gin.ErrorTypePrivate).String()
		requestID, _ := c.Get("request_id")

		if raw != "" {
			path = path + "?" + raw
		}

		fields := []zap.Field{
			zap.String("request_id", requestID.(string)),
			zap.String("method", method),
			zap.String("path", path),
			zap.Int("status", statusCode),
			zap.String("ip", clientIP),
			zap.Duration("latency", latency),
			zap.String("user_agent", c.Request.UserAgent()),
		}

		if errorMessage != "" {
			fields = append(fields, zap.String("error", errorMessage))
		}

		switch {
		case statusCode >= 500:
			logger.Error("Server error", fields...)
		case statusCode >= 400:
			logger.Warn("Client error", fields...)
		default:
			logger.Info("Request processed", fields...)
		}
	}
}

// PrometheusMiddleware collects metrics for all requests
func PrometheusMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		// Process request
		c.Next()

		// Record metrics
		status := fmt.Sprintf("%d", c.Writer.Status())
		duration := time.Since(start).Seconds()

		httpRequestsTotal.WithLabelValues(method, path, status).Inc()
		httpRequestDuration.WithLabelValues(method, path).Observe(duration)
	}
}

// AuthMiddleware validates JWT tokens
func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip auth for health checks
		if strings.HasPrefix(c.Request.URL.Path, "/health") {
			c.Next()
			return
		}

		// Get token from header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header"})
			c.Abort()
			return
		}

		// Extract token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Parse and validate token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Verify signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Extract claims
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			// Check expiration
			if exp, ok := claims["exp"].(float64); ok {
				if time.Now().Unix() > int64(exp) {
					c.JSON(http.StatusUnauthorized, gin.H{"error": "Token expired"})
					c.Abort()
					return
				}
			}

			// Set user context
			c.Set("user_id", claims["sub"])
			c.Set("user_email", claims["email"])
			c.Set("user_role", claims["role"])
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RateLimitMiddleware implements rate limiting per IP/user
func RateLimitMiddleware(rateLimit int, window time.Duration) gin.HandlerFunc {
	// This would typically use Redis for distributed rate limiting
	// Simplified in-memory implementation for demonstration

	type client struct {
		count    int
		lastSeen time.Time
	}

	clients := make(map[string]*client)

	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		userID, exists := c.Get("user_id")

		key := clientIP
		if exists {
			key = userID.(string)
		}

		now := time.Now()

		if cl, exists := clients[key]; exists {
			if now.Sub(cl.lastSeen) > window {
				cl.count = 1
				cl.lastSeen = now
			} else {
				cl.count++
				if cl.count > rateLimit {
					c.JSON(http.StatusTooManyRequests, gin.H{
						"error": "Rate limit exceeded",
						"retry_after": window.Seconds(),
					})
					c.Abort()
					return
				}
			}
		} else {
			clients[key] = &client{
				count:    1,
				lastSeen: now,
			}
		}

		c.Next()
	}
}

// CORSMiddleware handles CORS headers
func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin || allowedOrigin == "*" {
				allowed = true
				break
			}
		}

		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Max-Age", "86400")
		}

		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// ValidationMiddleware ensures request payloads meet requirements
func ValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Add custom validation logic here
		// For example, check content-type, payload size, etc.

		if c.Request.Method == "POST" || c.Request.Method == "PUT" {
			contentType := c.GetHeader("Content-Type")
			if !strings.Contains(contentType, "application/json") {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Content-Type must be application/json"})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

// ErrorHandlerMiddleware centralizes error handling
func ErrorHandlerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Handle any errors that occurred during request processing
		if len(c.Errors) > 0 {
			err := c.Errors.Last()

			// Log the error
			requestID, _ := c.Get("request_id")
			fmt.Printf("Error processing request %s: %v\n", requestID, err)

			// Return appropriate error response
			switch err.Type {
			case gin.ErrorTypePublic:
				c.JSON(c.Writer.Status(), gin.H{"error": err.Error()})
			case gin.ErrorTypeBind:
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
			default:
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			}
		}
	}
}
