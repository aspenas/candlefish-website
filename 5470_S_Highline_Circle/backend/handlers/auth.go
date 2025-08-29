package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/patricksmith/highline-inventory/auth"
	"github.com/patricksmith/highline-inventory/middleware"
	"github.com/patricksmith/highline-inventory/models"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	db          *sql.DB
	jwtManager  *auth.JWTManager
	blacklist   *auth.TokenBlacklist
	csrfManager *auth.CSRFManager
	rateLimiter *auth.RateLimiter
	validator   *validator.Validate
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(db *sql.DB, jwtManager *auth.JWTManager, blacklist *auth.TokenBlacklist, 
	csrfManager *auth.CSRFManager, rateLimiter *auth.RateLimiter) *AuthHandler {
	return &AuthHandler{
		db:          db,
		jwtManager:  jwtManager,
		blacklist:   blacklist,
		csrfManager: csrfManager,
		rateLimiter: rateLimiter,
		validator:   validator.New(),
	}
}

// Login handles user login
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate request
	if err := h.validator.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid input",
		})
	}

	// Get user by email or username
	var user *models.User
	var err error
	
	if req.Email != "" {
		user, err = h.getUserByEmail(req.Email)
	} else if req.Username != "" {
		user, err = h.getUserByUsername(req.Username)
	} else {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email or username required",
		})
	}

	if err != nil {
		// Log failed attempt
		h.logAuthEvent(nil, models.EventLoginFailed, c, "User not found")
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	// Check if account is locked
	if user.IsAccountLocked() {
		h.logAuthEvent(&user.ID, models.EventLoginFailed, c, "Account locked")
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Account is locked. Please try again later.",
		})
	}

	// Verify password
	if !auth.CheckPasswordHash(req.Password, user.PasswordHash) {
		user.IncrementFailedLogins()
		h.updateFailedLogins(user)
		h.logAuthEvent(&user.ID, models.EventLoginFailed, c, "Invalid password")
		
		if user.IsAccountLocked() {
			h.logAuthEvent(&user.ID, models.EventAccountLocked, c, "Account locked after failed attempts")
		}
		
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	// Check if account is active
	if !user.IsActive {
		h.logAuthEvent(&user.ID, models.EventLoginFailed, c, "Account inactive")
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Account is inactive",
		})
	}

	// Reset failed login attempts
	user.ResetFailedLogins()
	h.updateFailedLogins(user)

	// Get user roles
	roles, _ := h.getUserRoles(user.ID)
	if len(roles) == 0 {
		roles = []string{models.RoleUser}
	}

	// Generate tokens
	accessToken, err := h.jwtManager.GenerateAccessToken(user.ID, user.Email, user.Username, roles)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate access token",
		})
	}

	refreshToken, err := h.jwtManager.GenerateRefreshToken(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate refresh token",
		})
	}

	// Save refresh token to database
	h.saveRefreshToken(user.ID, refreshToken, c)

	// Generate CSRF token
	csrfToken, _ := h.csrfManager.GenerateToken(user.ID)

	// Update last login
	h.updateLastLogin(user.ID)

	// Log successful login
	h.logAuthEvent(&user.ID, models.EventLoginSuccess, c, "Login successful")

	// Set secure cookies
	h.setAuthCookies(c, accessToken, refreshToken, csrfToken)

	// Return response
	return c.JSON(models.TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int(auth.AccessTokenDuration.Seconds()),
		User:         user,
		CSRFToken:    csrfToken,
	})
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	claims := middleware.GetClaimsFromContext(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Not authenticated",
		})
	}

	// Revoke access token
	h.blacklist.RevokeToken(claims.ID, claims.ExpiresAt.Time)

	// Revoke refresh token from cookie
	refreshToken := c.Cookies("refresh_token")
	if refreshToken != "" {
		h.revokeRefreshToken(refreshToken)
	}

	// Invalidate CSRF tokens
	h.csrfManager.InvalidateUserTokens(claims.UserID)

	// Clear cookies
	h.clearAuthCookies(c)

	// Log logout
	h.logAuthEvent(&claims.UserID, models.EventLogout, c, "User logged out")

	return c.JSON(fiber.Map{
		"message": "Logged out successfully",
	})
}

// RefreshToken handles token refresh
func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	claims := middleware.GetClaimsFromContext(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid refresh token",
		})
	}

	// Get user
	user, err := h.getUserByID(claims.UserID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// Check if account is active
	if !user.IsActive {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Account is inactive",
		})
	}

	// Get user roles
	roles, _ := h.getUserRoles(user.ID)
	if len(roles) == 0 {
		roles = []string{models.RoleUser}
	}

	// Generate new access token
	accessToken, err := h.jwtManager.GenerateAccessToken(user.ID, user.Email, user.Username, roles)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate access token",
		})
	}

	// Rotate refresh token (generate new one)
	newRefreshToken, err := h.jwtManager.GenerateRefreshToken(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate refresh token",
		})
	}

	// Revoke old refresh token
	oldToken := c.Get("X-Refresh-Token")
	if oldToken == "" {
		oldToken = c.Cookies("refresh_token")
	}
	h.revokeRefreshToken(oldToken)

	// Save new refresh token
	h.saveRefreshToken(user.ID, newRefreshToken, c)

	// Generate new CSRF token
	csrfToken, _ := h.csrfManager.GenerateToken(user.ID)

	// Log token refresh
	h.logAuthEvent(&user.ID, models.EventTokenRefresh, c, "Token refreshed")

	// Set secure cookies
	h.setAuthCookies(c, accessToken, newRefreshToken, csrfToken)

	// Return response
	return c.JSON(models.TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int(auth.AccessTokenDuration.Seconds()),
		CSRFToken:    csrfToken,
	})
}

// Register handles user registration
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate request
	if err := h.validator.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid input",
		})
	}

	// Check if user already exists
	existingUser, _ := h.getUserByEmail(req.Email)
	if existingUser != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "Email already registered",
		})
	}

	existingUser, _ = h.getUserByUsername(req.Username)
	if existingUser != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "Username already taken",
		})
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to process password",
		})
	}

	// Create user
	user := &models.User{
		ID:           uuid.New().String(),
		Email:        req.Email,
		Username:     req.Username,
		PasswordHash: hashedPassword,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		IsActive:     true,
		IsVerified:   false, // Require email verification
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// Save user to database
	if err := h.createUser(user); err != nil {
		log.Printf("Failed to create user: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create user",
		})
	}

	// Assign default role
	h.setUserRoles(user.ID, []string{models.RoleUser})

	// Log registration
	h.logAuthEvent(&user.ID, "registration", c, "User registered")

	// Generate tokens
	accessToken, _ := h.jwtManager.GenerateAccessToken(user.ID, user.Email, user.Username, []string{models.RoleUser})
	refreshToken, _ := h.jwtManager.GenerateRefreshToken(user.ID)
	csrfToken, _ := h.csrfManager.GenerateToken(user.ID)

	// Save refresh token
	h.saveRefreshToken(user.ID, refreshToken, c)

	// Set cookies
	h.setAuthCookies(c, accessToken, refreshToken, csrfToken)

	return c.Status(fiber.StatusCreated).JSON(models.TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int(auth.AccessTokenDuration.Seconds()),
		User:         user,
		CSRFToken:    csrfToken,
	})
}

// GetProfile returns the current user's profile
func (h *AuthHandler) GetProfile(c *fiber.Ctx) error {
	claims := middleware.GetClaimsFromContext(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Not authenticated",
		})
	}

	user, err := h.getUserByID(claims.UserID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	user.Roles, _ = h.getUserRoles(user.ID)

	return c.JSON(user)
}

// Helper methods for database operations

func (h *AuthHandler) getUserByEmail(email string) (*models.User, error) {
	user := &models.User{}
	query := `SELECT id, email, username, password_hash, first_name, last_name, 
	          is_active, is_verified, created_at, updated_at, last_login_at, 
	          failed_logins, locked_until 
	          FROM users WHERE email = ?`
	
	err := h.db.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.Username, &user.PasswordHash,
		&user.FirstName, &user.LastName, &user.IsActive, &user.IsVerified,
		&user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
		&user.FailedLogins, &user.LockedUntil,
	)
	
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	return user, err
}

func (h *AuthHandler) getUserByUsername(username string) (*models.User, error) {
	user := &models.User{}
	query := `SELECT id, email, username, password_hash, first_name, last_name, 
	          is_active, is_verified, created_at, updated_at, last_login_at, 
	          failed_logins, locked_until 
	          FROM users WHERE username = ?`
	
	err := h.db.QueryRow(query, username).Scan(
		&user.ID, &user.Email, &user.Username, &user.PasswordHash,
		&user.FirstName, &user.LastName, &user.IsActive, &user.IsVerified,
		&user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
		&user.FailedLogins, &user.LockedUntil,
	)
	
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	return user, err
}

func (h *AuthHandler) getUserByID(id string) (*models.User, error) {
	user := &models.User{}
	query := `SELECT id, email, username, password_hash, first_name, last_name, 
	          is_active, is_verified, created_at, updated_at, last_login_at, 
	          failed_logins, locked_until 
	          FROM users WHERE id = ?`
	
	err := h.db.QueryRow(query, id).Scan(
		&user.ID, &user.Email, &user.Username, &user.PasswordHash,
		&user.FirstName, &user.LastName, &user.IsActive, &user.IsVerified,
		&user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
		&user.FailedLogins, &user.LockedUntil,
	)
	
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	return user, err
}

func (h *AuthHandler) createUser(user *models.User) error {
	query := `INSERT INTO users (id, email, username, password_hash, first_name, last_name, 
	          is_active, is_verified, created_at, updated_at) 
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	
	_, err := h.db.Exec(query, user.ID, user.Email, user.Username, user.PasswordHash,
		user.FirstName, user.LastName, user.IsActive, user.IsVerified,
		user.CreatedAt, user.UpdatedAt)
	return err
}

func (h *AuthHandler) getUserRoles(userID string) ([]string, error) {
	query := `SELECT role FROM user_roles WHERE user_id = ?`
	rows, err := h.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			continue
		}
		roles = append(roles, role)
	}
	return roles, nil
}

func (h *AuthHandler) setUserRoles(userID string, roles []string) error {
	// Delete existing roles
	_, err := h.db.Exec(`DELETE FROM user_roles WHERE user_id = ?`, userID)
	if err != nil {
		return err
	}

	// Insert new roles
	for _, role := range roles {
		_, err := h.db.Exec(`INSERT INTO user_roles (user_id, role, created_at) VALUES (?, ?, ?)`,
			userID, role, time.Now())
		if err != nil {
			return err
		}
	}
	return nil
}

func (h *AuthHandler) updateLastLogin(userID string) {
	now := time.Now()
	h.db.Exec(`UPDATE users SET last_login_at = ? WHERE id = ?`, now, userID)
}

func (h *AuthHandler) updateFailedLogins(user *models.User) {
	h.db.Exec(`UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?`,
		user.FailedLogins, user.LockedUntil, user.ID)
}

func (h *AuthHandler) saveRefreshToken(userID, token string, c *fiber.Ctx) {
	query := `INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at, device_info, ip_address) 
	          VALUES (?, ?, ?, ?, ?, ?, ?)`
	
	h.db.Exec(query,
		uuid.New().String(),
		userID,
		token,
		time.Now().Add(auth.RefreshTokenDuration),
		time.Now(),
		c.Get("User-Agent"),
		c.IP(),
	)
}

func (h *AuthHandler) revokeRefreshToken(token string) {
	h.db.Exec(`UPDATE refresh_tokens SET revoked = true, revoked_at = ? WHERE token = ?`,
		time.Now(), token)
}

func (h *AuthHandler) logAuthEvent(userID *string, event string, c *fiber.Ctx, details string) {
	query := `INSERT INTO auth_logs (id, user_id, event, ip_address, user_agent, details, created_at) 
	          VALUES (?, ?, ?, ?, ?, ?, ?)`
	
	h.db.Exec(query,
		uuid.New().String(),
		userID,
		event,
		c.IP(),
		c.Get("User-Agent"),
		details,
		time.Now(),
	)
}

// Cookie helpers

func (h *AuthHandler) setAuthCookies(c *fiber.Ctx, accessToken, refreshToken, csrfToken string) {
	// Access token cookie
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Expires:  time.Now().Add(auth.AccessTokenDuration),
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Strict",
		Path:     "/",
	})

	// Refresh token cookie
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Expires:  time.Now().Add(auth.RefreshTokenDuration),
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Strict",
		Path:     "/api/v1/auth/refresh",
	})

	// CSRF token cookie (not HTTPOnly so JS can read it)
	c.Cookie(&fiber.Cookie{
		Name:     "csrf_token",
		Value:    csrfToken,
		Expires:  time.Now().Add(24 * time.Hour),
		Secure:   true,
		SameSite: "Strict",
		Path:     "/",
	})
}

func (h *AuthHandler) clearAuthCookies(c *fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Path:     "/",
	})

	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Path:     "/",
	})

	c.Cookie(&fiber.Cookie{
		Name:     "csrf_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		Path:     "/",
	})
}