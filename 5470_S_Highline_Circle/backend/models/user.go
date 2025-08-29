package models

import (
	"time"
)

// User represents a user in the system
type User struct {
	ID           string         `db:"id" json:"id"`
	Email        string         `db:"email" json:"email"`
	Username     string         `db:"username" json:"username"`
	PasswordHash string         `db:"password_hash" json:"-"` // Never send to client
	FirstName    string         `db:"first_name" json:"first_name"`
	LastName     string         `db:"last_name" json:"last_name"`
	Roles        []string       `json:"roles"`
	IsActive     bool           `db:"is_active" json:"is_active"`
	IsVerified   bool           `db:"is_verified" json:"is_verified"`
	CreatedAt    time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time      `db:"updated_at" json:"updated_at"`
	LastLoginAt  *time.Time     `db:"last_login_at" json:"last_login_at"`
	FailedLogins int            `db:"failed_logins" json:"-"`
	LockedUntil  *time.Time     `db:"locked_until" json:"-"`
}

// UserRoleAssignment represents user role assignments in database
type UserRoleAssignment struct {
	UserID    string    `db:"user_id" json:"user_id"`
	Role      string    `db:"role" json:"role"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// RefreshToken stores refresh token data in database
type RefreshToken struct {
	ID        string    `db:"id" json:"id"`
	UserID    string    `db:"user_id" json:"user_id"`
	Token     string    `db:"token" json:"token"`
	ExpiresAt time.Time `db:"expires_at" json:"expires_at"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	Revoked   bool      `db:"revoked" json:"revoked"`
	RevokedAt *time.Time `db:"revoked_at" json:"revoked_at"`
	DeviceInfo string   `db:"device_info" json:"device_info"`
	IPAddress  string   `db:"ip_address" json:"ip_address"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Username string `json:"username"` // Either email or username required
	Password string `json:"password" validate:"required,min=8"`
}

// RegisterRequest represents a registration request
type RegisterRequest struct {
	Email     string `json:"email" validate:"required,email"`
	Username  string `json:"username" validate:"required,min=3,max=50"`
	Password  string `json:"password" validate:"required,min=8"`
	FirstName string `json:"first_name" validate:"required"`
	LastName  string `json:"last_name" validate:"required"`
}

// TokenResponse represents the response containing tokens
type TokenResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	ExpiresIn    int       `json:"expires_in"`
	User         *User     `json:"user,omitempty"`
	CSRFToken    string    `json:"csrf_token,omitempty"`
}

// RefreshTokenRequest represents a token refresh request
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// AuthLog represents authentication events for auditing
type AuthLog struct {
	ID         string    `db:"id" json:"id"`
	UserID     *string   `db:"user_id" json:"user_id"`
	Event      string    `db:"event" json:"event"` // login_success, login_failed, logout, token_refresh, etc.
	IPAddress  string    `db:"ip_address" json:"ip_address"`
	UserAgent  string    `db:"user_agent" json:"user_agent"`
	Details    string    `db:"details" json:"details"`
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
}

// Session represents an active user session
type Session struct {
	ID           string    `db:"id" json:"id"`
	UserID       string    `db:"user_id" json:"user_id"`
	AccessToken  string    `db:"access_token" json:"-"`
	RefreshToken string    `db:"refresh_token" json:"-"`
	IPAddress    string    `db:"ip_address" json:"ip_address"`
	UserAgent    string    `db:"user_agent" json:"user_agent"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	LastActivity time.Time `db:"last_activity" json:"last_activity"`
	ExpiresAt    time.Time `db:"expires_at" json:"expires_at"`
}

// GetRoles returns user roles as a slice
func (u *User) GetRoles() []string {
	if u.Roles == nil {
		return []string{"user"} // Default role
	}
	return u.Roles
}

// IsAccountLocked checks if the account is currently locked
func (u *User) IsAccountLocked() bool {
	if u.LockedUntil == nil {
		return false
	}
	return time.Now().Before(*u.LockedUntil)
}

// IncrementFailedLogins increments failed login attempts
func (u *User) IncrementFailedLogins() {
	u.FailedLogins++
	
	// Lock account after 5 failed attempts
	if u.FailedLogins >= 5 {
		lockUntil := time.Now().Add(30 * time.Minute)
		u.LockedUntil = &lockUntil
	}
}

// ResetFailedLogins resets the failed login counter
func (u *User) ResetFailedLogins() {
	u.FailedLogins = 0
	u.LockedUntil = nil
}

// UserRepository interface for user operations
type UserRepository interface {
	Create(user *User) error
	GetByID(id string) (*User, error)
	GetByEmail(email string) (*User, error)
	GetByUsername(username string) (*User, error)
	Update(user *User) error
	Delete(id string) error
	GetUserRoles(userID string) ([]string, error)
	SetUserRoles(userID string, roles []string) error
	UpdateLastLogin(userID string) error
	UpdateFailedLogins(user *User) error
}

// TokenRepository interface for token operations
type TokenRepository interface {
	SaveRefreshToken(token *RefreshToken) error
	GetRefreshToken(token string) (*RefreshToken, error)
	RevokeRefreshToken(token string) error
	RevokeAllUserTokens(userID string) error
	CleanupExpiredTokens() error
}

// AuthLogRepository interface for auth logging
type AuthLogRepository interface {
	LogAuthEvent(log *AuthLog) error
	GetUserAuthLogs(userID string, limit int) ([]*AuthLog, error)
	GetRecentFailedAttempts(ipAddress string, since time.Time) (int, error)
}

// Predefined roles
const (
	RoleAdmin     = "admin"
	RoleManager   = "manager"
	RoleUser      = "user"
	RoleViewer    = "viewer"
)

// Predefined auth events
const (
	EventLoginSuccess    = "login_success"
	EventLoginFailed     = "login_failed"
	EventLogout          = "logout"
	EventTokenRefresh    = "token_refresh"
	EventTokenRevoked    = "token_revoked"
	EventPasswordChanged = "password_changed"
	EventAccountLocked   = "account_locked"
	EventAccountUnlocked = "account_unlocked"
)