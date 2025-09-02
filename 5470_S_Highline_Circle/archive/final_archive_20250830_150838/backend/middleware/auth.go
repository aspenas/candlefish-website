package middleware

import (
	"crypto/rsa"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Claims represents the JWT claims
type Claims struct {
	UserID      string   `json:"user_id"`
	Email       string   `json:"email"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
	jwt.RegisteredClaims
}

// UserContext represents the authenticated user in the request context
type UserContext struct {
	UserID      string
	Email       string
	Role        string
	Permissions []string
}

var (
	jwtSecret   []byte
	jwtPublicKey  *rsa.PublicKey
	jwtPrivateKey *rsa.PrivateKey
)

func init() {
	// Load JWT secret from environment
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		panic("JWT_SECRET environment variable is required")
	}
	jwtSecret = []byte(secret)
	
	// Optional: Load RSA keys for RS256 algorithm
	if pubKeyPath := os.Getenv("JWT_PUBLIC_KEY_PATH"); pubKeyPath != "" {
		loadRSAKeys(pubKeyPath, os.Getenv("JWT_PRIVATE_KEY_PATH"))
	}
}

// AuthRequired middleware validates JWT tokens
func AuthRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get token from Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return unauthorizedError(c, "Missing authorization header")
		}

		// Extract token from "Bearer <token>" format
		tokenString := extractToken(authHeader)
		if tokenString == "" {
			return unauthorizedError(c, "Invalid authorization format")
		}

		// Parse and validate token
		claims, err := validateToken(tokenString)
		if err != nil {
			return unauthorizedError(c, "Invalid or expired token")
		}

		// Check if token is not expired
		if claims.ExpiresAt != nil && claims.ExpiresAt.Before(time.Now()) {
			return unauthorizedError(c, "Token has expired")
		}

		// Store user info in context
		userContext := &UserContext{
			UserID:      claims.UserID,
			Email:       claims.Email,
			Role:        claims.Role,
			Permissions: claims.Permissions,
		}
		c.Locals("user", userContext)

		return c.Next()
	}
}

// RequireRole checks if user has one of the required roles
func RequireRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := c.Locals("user").(*UserContext)
		if !ok {
			return forbiddenError(c, "User context not found")
		}

		// Check if user has any of the required roles
		for _, role := range roles {
			if user.Role == role {
				return c.Next()
			}
		}

		return forbiddenError(c, "Insufficient permissions")
	}
}

// RequirePermission checks if user has specific permissions
func RequirePermission(permissions ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := c.Locals("user").(*UserContext)
		if !ok {
			return forbiddenError(c, "User context not found")
		}

		// Check if user has all required permissions
		for _, requiredPerm := range permissions {
			hasPermission := false
			for _, userPerm := range user.Permissions {
				if userPerm == requiredPerm {
					hasPermission = true
					break
				}
			}
			if !hasPermission {
				return forbiddenError(c, fmt.Sprintf("Missing permission: %s", requiredPerm))
			}
		}

		return c.Next()
	}
}

// OptionalAuth extracts user info if token is present but doesn't require it
func OptionalAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Next()
		}

		tokenString := extractToken(authHeader)
		if tokenString == "" {
			return c.Next()
		}

		claims, err := validateToken(tokenString)
		if err == nil && claims.ExpiresAt != nil && claims.ExpiresAt.After(time.Now()) {
			userContext := &UserContext{
				UserID:      claims.UserID,
				Email:       claims.Email,
				Role:        claims.Role,
				Permissions: claims.Permissions,
			}
			c.Locals("user", userContext)
		}

		return c.Next()
	}
}

// GenerateToken creates a new JWT token for a user
func GenerateToken(userID, email, role string, permissions []string) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour) // Token expires in 24 hours
	
	claims := &Claims{
		UserID:      userID,
		Email:       email,
		Role:        role,
		Permissions: permissions,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "highline-inventory",
			Subject:   userID,
		},
	}

	// Create token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	
	// Sign token with secret
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// RefreshToken generates a new token with extended expiration
func RefreshToken(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*UserContext)
	if !ok {
		return unauthorizedError(c, "User context not found")
	}

	// Generate new token with same claims but new expiration
	newToken, err := GenerateToken(user.UserID, user.Email, user.Role, user.Permissions)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to refresh token",
		})
	}

	return c.JSON(fiber.Map{
		"token": newToken,
		"type":  "Bearer",
		"expires_in": 86400, // 24 hours in seconds
	})
}

// HashPassword creates a bcrypt hash of the password
func HashPassword(password string) (string, error) {
	cost := bcrypt.DefaultCost
	if envCost := os.Getenv("BCRYPT_COST"); envCost != "" {
		fmt.Sscanf(envCost, "%d", &cost)
	}
	
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), cost)
	return string(bytes), err
}

// CheckPassword compares a password with its hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// Helper functions

func extractToken(authHeader string) string {
	// Support both "Bearer <token>" and direct token
	parts := strings.Split(authHeader, " ")
	if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
		return parts[1]
	}
	return authHeader
}

func validateToken(tokenString string) (*Claims, error) {
	claims := &Claims{}
	
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

func unauthorizedError(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"error": message,
		"code":  "UNAUTHORIZED",
	})
}

func forbiddenError(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
		"error": message,
		"code":  "FORBIDDEN",
	})
}

func loadRSAKeys(pubKeyPath, privKeyPath string) {
	// Implementation for RSA key loading if needed
	// This would be used for RS256 algorithm instead of HS256
}

// GetCurrentUser retrieves the current user from context
func GetCurrentUser(c *fiber.Ctx) (*UserContext, error) {
	user, ok := c.Locals("user").(*UserContext)
	if !ok {
		return nil, fmt.Errorf("user not found in context")
	}
	return user, nil
}

// IsAuthenticated checks if the request has a valid user
func IsAuthenticated(c *fiber.Ctx) bool {
	_, ok := c.Locals("user").(*UserContext)
	return ok
}