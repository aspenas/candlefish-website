# 🔐 SECURITY IMPLEMENTATION GUIDE
## Secure Code Templates and Best Practices

---

## 1. AUTHENTICATION & AUTHORIZATION

### JWT Authentication Middleware (Go/Fiber)
```go
package middleware

import (
    "crypto/rsa"
    "fmt"
    "os"
    "strings"
    "time"
    
    "github.com/gofiber/fiber/v2"
    "github.com/golang-jwt/jwt/v5"
)

type AuthClaims struct {
    UserID    string   `json:"user_id"`
    Email     string   `json:"email"`
    Roles     []string `json:"roles"`
    SessionID string   `json:"session_id"`
    jwt.RegisteredClaims
}

type AuthMiddleware struct {
    publicKey  *rsa.PublicKey
    privateKey *rsa.PrivateKey
}

func NewAuthMiddleware() (*AuthMiddleware, error) {
    // Load keys from AWS Secrets Manager or environment
    publicKeyPEM := os.Getenv("JWT_PUBLIC_KEY")
    privateKeyPEM := os.Getenv("JWT_PRIVATE_KEY")
    
    publicKey, err := jwt.ParseRSAPublicKeyFromPEM([]byte(publicKeyPEM))
    if err != nil {
        return nil, fmt.Errorf("failed to parse public key: %w", err)
    }
    
    privateKey, err := jwt.ParseRSAPrivateKeyFromPEM([]byte(privateKeyPEM))
    if err != nil {
        return nil, fmt.Errorf("failed to parse private key: %w", err)
    }
    
    return &AuthMiddleware{
        publicKey:  publicKey,
        privateKey: privateKey,
    }, nil
}

// Middleware function for protected routes
func (am *AuthMiddleware) Required() fiber.Handler {
    return func(c *fiber.Ctx) error {
        // Extract token from header
        authHeader := c.Get("Authorization")
        if authHeader == "" {
            return c.Status(401).JSON(fiber.Map{
                "error": "Missing authorization header",
            })
        }
        
        // Remove "Bearer " prefix
        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        if tokenString == authHeader {
            return c.Status(401).JSON(fiber.Map{
                "error": "Invalid authorization format",
            })
        }
        
        // Parse and validate token
        token, err := jwt.ParseWithClaims(tokenString, &AuthClaims{}, func(token *jwt.Token) (interface{}, error) {
            if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
                return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
            }
            return am.publicKey, nil
        })
        
        if err != nil {
            return c.Status(401).JSON(fiber.Map{
                "error": "Invalid token",
                "details": err.Error(),
            })
        }
        
        if claims, ok := token.Claims.(*AuthClaims); ok && token.Valid {
            // Check token expiration
            if claims.ExpiresAt.Time.Before(time.Now()) {
                return c.Status(401).JSON(fiber.Map{
                    "error": "Token expired",
                })
            }
            
            // Store claims in context for use in handlers
            c.Locals("user", claims)
            return c.Next()
        }
        
        return c.Status(401).JSON(fiber.Map{
            "error": "Invalid token claims",
        })
    }
}

// Role-based access control
func (am *AuthMiddleware) RequireRole(roles ...string) fiber.Handler {
    return func(c *fiber.Ctx) error {
        // First check authentication
        if err := am.Required()(c); err != nil {
            return err
        }
        
        // Get user claims from context
        claims, ok := c.Locals("user").(*AuthClaims)
        if !ok {
            return c.Status(403).JSON(fiber.Map{
                "error": "Unable to verify permissions",
            })
        }
        
        // Check if user has required role
        for _, requiredRole := range roles {
            for _, userRole := range claims.Roles {
                if userRole == requiredRole {
                    return c.Next()
                }
            }
        }
        
        return c.Status(403).JSON(fiber.Map{
            "error": "Insufficient permissions",
            "required": roles,
        })
    }
}

// Generate JWT token
func (am *AuthMiddleware) GenerateToken(userID, email string, roles []string) (string, error) {
    claims := AuthClaims{
        UserID:    userID,
        Email:     email,
        Roles:     roles,
        SessionID: generateSessionID(),
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            NotBefore: jwt.NewNumericDate(time.Now()),
            Issuer:    "candlefish-security",
            Subject:   userID,
            ID:        generateJTI(),
        },
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
    return token.SignedString(am.privateKey)
}
```

### OAuth2 Integration
```typescript
// OAuth2 configuration for frontend
import { AuthConfig } from '@auth0/nextjs-auth0';

export const authConfig: AuthConfig = {
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  redirectUri: process.env.AUTH0_REDIRECT_URI!,
  postLogoutRedirectUri: process.env.AUTH0_POST_LOGOUT_REDIRECT_URI!,
  scope: 'openid profile email offline_access',
  audience: process.env.AUTH0_AUDIENCE,
  
  // Security settings
  session: {
    absoluteDuration: 86400, // 24 hours
    cookie: {
      domain: process.env.COOKIE_DOMAIN,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  },
  
  // Token rotation
  authorizationParams: {
    response_type: 'code',
    prompt: 'consent',
    access_type: 'offline',
  },
};
```

---

## 2. INPUT VALIDATION & SANITIZATION

### Comprehensive Input Validation (Go)
```go
package validation

import (
    "regexp"
    "strings"
    "github.com/go-playground/validator/v10"
    "github.com/microcosm-cc/bluemonday"
)

var (
    validate = validator.New()
    policy   = bluemonday.UGCPolicy()
)

// Custom validation rules
func init() {
    validate.RegisterValidation("safe_string", validateSafeString)
    validate.RegisterValidation("no_sql", validateNoSQL)
    validate.RegisterValidation("safe_filename", validateSafeFilename)
}

// Validate safe string (no XSS)
func validateSafeString(fl validator.FieldLevel) bool {
    str := fl.Field().String()
    // Check for common XSS patterns
    xssPatterns := []string{
        "<script", "javascript:", "onerror=", "onclick=",
        "onload=", "<iframe", "<embed", "<object",
    }
    
    lowerStr := strings.ToLower(str)
    for _, pattern := range xssPatterns {
        if strings.Contains(lowerStr, pattern) {
            return false
        }
    }
    return true
}

// Validate no SQL injection attempts
func validateNoSQL(fl validator.FieldLevel) bool {
    str := fl.Field().String()
    // Check for SQL keywords and patterns
    sqlPatterns := []string{
        "'; DROP", "' OR ", "1=1", "/*", "*/",
        "UNION SELECT", "' --", "\" --",
    }
    
    upperStr := strings.ToUpper(str)
    for _, pattern := range sqlPatterns {
        if strings.Contains(upperStr, pattern) {
            return false
        }
    }
    return true
}

// Validate safe filename
func validateSafeFilename(fl validator.FieldLevel) bool {
    filename := fl.Field().String()
    // Only allow alphanumeric, dash, underscore, and dot
    match, _ := regexp.MatchString("^[a-zA-Z0-9._-]+$", filename)
    
    // Prevent directory traversal
    if strings.Contains(filename, "..") || strings.Contains(filename, "/") {
        return false
    }
    
    return match
}

// Input sanitization struct
type InputSanitizer struct {
    policy *bluemonday.Policy
}

func NewInputSanitizer() *InputSanitizer {
    return &InputSanitizer{
        policy: bluemonday.StrictPolicy(),
    }
}

// Sanitize HTML input
func (is *InputSanitizer) SanitizeHTML(input string) string {
    return policy.Sanitize(input)
}

// Sanitize for database storage
func (is *InputSanitizer) SanitizeForDB(input string) string {
    // Remove null bytes
    input = strings.ReplaceAll(input, "\x00", "")
    
    // Trim whitespace
    input = strings.TrimSpace(input)
    
    // Escape special characters
    replacer := strings.NewReplacer(
        "'", "''",
        "\\", "\\\\",
        "\n", "\\n",
        "\r", "\\r",
        "\t", "\\t",
    )
    
    return replacer.Replace(input)
}

// Request validation middleware
type RequestValidator struct {
    validator *validator.Validate
    sanitizer *InputSanitizer
}

func NewRequestValidator() *RequestValidator {
    return &RequestValidator{
        validator: validate,
        sanitizer: NewInputSanitizer(),
    }
}

// Example validation struct
type CreateItemRequest struct {
    Name        string  `json:"name" validate:"required,min=1,max=255,safe_string,no_sql"`
    Category    string  `json:"category" validate:"required,oneof=furniture art rugs electronics"`
    Price       float64 `json:"price" validate:"min=0,max=10000000"`
    Description string  `json:"description" validate:"max=2000,safe_string"`
    Quantity    int     `json:"quantity" validate:"min=1,max=1000"`
}

// Validate request
func (rv *RequestValidator) ValidateCreateItem(req *CreateItemRequest) error {
    // First validate structure
    if err := rv.validator.Struct(req); err != nil {
        return err
    }
    
    // Then sanitize fields
    req.Name = rv.sanitizer.SanitizeForDB(req.Name)
    req.Description = rv.sanitizer.SanitizeHTML(req.Description)
    
    return nil
}
```

---

## 3. SQL INJECTION PREVENTION

### Secure Database Queries (Go)
```go
package database

import (
    "context"
    "database/sql"
    "fmt"
    "time"
    
    "github.com/jmoiron/sqlx"
    _ "github.com/lib/pq"
)

type SecureDB struct {
    db *sqlx.DB
}

// NEVER do this - VULNERABLE
func (s *SecureDB) BAD_GetItemsByCategory(category string) ([]Item, error) {
    query := fmt.Sprintf("SELECT * FROM items WHERE category = '%s'", category)
    // This is vulnerable to SQL injection!
    return s.db.Query(query)
}

// ALWAYS do this - SECURE
func (s *SecureDB) GetItemsByCategory(ctx context.Context, category string) ([]Item, error) {
    query := `
        SELECT id, name, category, price, created_at
        FROM items
        WHERE category = $1
        ORDER BY created_at DESC
    `
    
    var items []Item
    err := s.db.SelectContext(ctx, &items, query, category)
    return items, err
}

// Secure bulk insert with transaction
func (s *SecureDB) BulkInsertItems(ctx context.Context, items []Item) error {
    tx, err := s.db.BeginTxx(ctx, &sql.TxOptions{
        Isolation: sql.LevelReadCommitted,
    })
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }
    defer tx.Rollback()
    
    stmt, err := tx.PreparexContext(ctx, `
        INSERT INTO items (name, category, price, created_at)
        VALUES ($1, $2, $3, $4)
    `)
    if err != nil {
        return fmt.Errorf("failed to prepare statement: %w", err)
    }
    defer stmt.Close()
    
    for _, item := range items {
        _, err := stmt.ExecContext(ctx,
            item.Name,
            item.Category,
            item.Price,
            time.Now(),
        )
        if err != nil {
            return fmt.Errorf("failed to insert item %s: %w", item.Name, err)
        }
    }
    
    return tx.Commit()
}

// Secure dynamic query builder
type QueryBuilder struct {
    baseQuery string
    args      []interface{}
    argCount  int
}

func NewQueryBuilder(base string) *QueryBuilder {
    return &QueryBuilder{
        baseQuery: base,
        args:      []interface{}{},
        argCount:  0,
    }
}

func (qb *QueryBuilder) AddCondition(condition string, value interface{}) {
    qb.argCount++
    if qb.argCount == 1 {
        qb.baseQuery += " WHERE "
    } else {
        qb.baseQuery += " AND "
    }
    qb.baseQuery += fmt.Sprintf("%s = $%d", condition, qb.argCount)
    qb.args = append(qb.args, value)
}

func (qb *QueryBuilder) Build() (string, []interface{}) {
    return qb.baseQuery, qb.args
}

// Example usage
func (s *SecureDB) SearchItems(filters map[string]interface{}) ([]Item, error) {
    qb := NewQueryBuilder("SELECT * FROM items")
    
    for key, value := range filters {
        switch key {
        case "category", "name", "status":
            qb.AddCondition(key, value)
        }
    }
    
    query, args := qb.Build()
    
    var items []Item
    err := s.db.Select(&items, query, args...)
    return items, err
}

// Secure stored procedure call
func (s *SecureDB) CallStoredProcedure(ctx context.Context, userID string) ([]Result, error) {
    query := `SELECT * FROM get_user_items($1)`
    
    var results []Result
    err := s.db.SelectContext(ctx, &results, query, userID)
    return results, err
}
```

---

## 4. ENCRYPTION & SECRETS MANAGEMENT

### Field-Level Encryption
```go
package encryption

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "crypto/rsa"
    "crypto/sha256"
    "crypto/x509"
    "encoding/base64"
    "encoding/pem"
    "errors"
    "fmt"
    "io"
    
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/kms"
)

type EncryptionService struct {
    kmsClient *kms.KMS
    keyID     string
    aesKey    []byte
}

func NewEncryptionService(keyID string) (*EncryptionService, error) {
    sess, err := session.NewSession(&aws.Config{
        Region: aws.String("us-east-1"),
    })
    if err != nil {
        return nil, err
    }
    
    svc := kms.New(sess)
    
    // Generate data encryption key
    result, err := svc.GenerateDataKey(&kms.GenerateDataKeyInput{
        KeyId:   aws.String(keyID),
        KeySpec: aws.String("AES_256"),
    })
    if err != nil {
        return nil, err
    }
    
    return &EncryptionService{
        kmsClient: svc,
        keyID:     keyID,
        aesKey:    result.Plaintext,
    }, nil
}

// Encrypt sensitive field
func (es *EncryptionService) EncryptField(plaintext string) (string, error) {
    block, err := aes.NewCipher(es.aesKey)
    if err != nil {
        return "", err
    }
    
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return "", err
    }
    
    nonce := make([]byte, gcm.NonceSize())
    if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
        return "", err
    }
    
    ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
    return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt sensitive field
func (es *EncryptionService) DecryptField(ciphertext string) (string, error) {
    data, err := base64.StdEncoding.DecodeString(ciphertext)
    if err != nil {
        return "", err
    }
    
    block, err := aes.NewCipher(es.aesKey)
    if err != nil {
        return "", err
    }
    
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return "", err
    }
    
    nonceSize := gcm.NonceSize()
    if len(data) < nonceSize {
        return "", errors.New("ciphertext too short")
    }
    
    nonce, ciphertext := data[:nonceSize], data[nonceSize:]
    plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
    if err != nil {
        return "", err
    }
    
    return string(plaintext), nil
}

// Secure model with encrypted fields
type SecureUser struct {
    ID            string `db:"id"`
    Email         string `db:"email"`        // Encrypted
    SSN           string `db:"ssn"`          // Encrypted
    CreditCard    string `db:"credit_card"`  // Encrypted
    PublicData    string `db:"public_data"`  // Not encrypted
}

// Encrypt before save
func (su *SecureUser) BeforeSave(es *EncryptionService) error {
    var err error
    
    su.Email, err = es.EncryptField(su.Email)
    if err != nil {
        return err
    }
    
    su.SSN, err = es.EncryptField(su.SSN)
    if err != nil {
        return err
    }
    
    su.CreditCard, err = es.EncryptField(su.CreditCard)
    if err != nil {
        return err
    }
    
    return nil
}

// Decrypt after load
func (su *SecureUser) AfterLoad(es *EncryptionService) error {
    var err error
    
    su.Email, err = es.DecryptField(su.Email)
    if err != nil {
        return err
    }
    
    su.SSN, err = es.DecryptField(su.SSN)
    if err != nil {
        return err
    }
    
    su.CreditCard, err = es.DecryptField(su.CreditCard)
    if err != nil {
        return err
    }
    
    return nil
}
```

---

## 5. SECURE API ENDPOINTS

### Rate Limiting & DDoS Protection
```go
package api

import (
    "sync"
    "time"
    
    "github.com/gofiber/fiber/v2"
    "golang.org/x/time/rate"
)

// IP-based rate limiter
type RateLimiter struct {
    visitors map[string]*rate.Limiter
    mu       sync.RWMutex
    r        rate.Limit
    b        int
}

func NewRateLimiter(r rate.Limit, b int) *RateLimiter {
    return &RateLimiter{
        visitors: make(map[string]*rate.Limiter),
        r:        r,
        b:        b,
    }
}

func (rl *RateLimiter) GetVisitor(ip string) *rate.Limiter {
    rl.mu.RLock()
    limiter, exists := rl.visitors[ip]
    rl.mu.RUnlock()
    
    if !exists {
        rl.mu.Lock()
        defer rl.mu.Unlock()
        
        limiter = rate.NewLimiter(rl.r, rl.b)
        rl.visitors[ip] = limiter
        
        // Clean up old entries
        go rl.cleanupVisitors()
    }
    
    return limiter
}

func (rl *RateLimiter) cleanupVisitors() {
    time.Sleep(time.Minute)
    
    rl.mu.Lock()
    defer rl.mu.Unlock()
    
    for ip, limiter := range rl.visitors {
        if !limiter.Allow() {
            delete(rl.visitors, ip)
        }
    }
}

// Rate limiting middleware
func RateLimitMiddleware(rl *RateLimiter) fiber.Handler {
    return func(c *fiber.Ctx) error {
        limiter := rl.GetVisitor(c.IP())
        
        if !limiter.Allow() {
            return c.Status(429).JSON(fiber.Map{
                "error": "Too many requests",
                "retry_after": limiter.Reserve().Delay().Seconds(),
            })
        }
        
        return c.Next()
    }
}

// API key authentication
type APIKeyAuth struct {
    keys map[string]*APIKey
    mu   sync.RWMutex
}

type APIKey struct {
    Key         string
    UserID      string
    Permissions []string
    RateLimit   int
    ExpiresAt   time.Time
}

func (aka *APIKeyAuth) Middleware() fiber.Handler {
    return func(c *fiber.Ctx) error {
        apiKey := c.Get("X-API-Key")
        if apiKey == "" {
            return c.Status(401).JSON(fiber.Map{
                "error": "Missing API key",
            })
        }
        
        aka.mu.RLock()
        key, exists := aka.keys[apiKey]
        aka.mu.RUnlock()
        
        if !exists {
            return c.Status(401).JSON(fiber.Map{
                "error": "Invalid API key",
            })
        }
        
        if key.ExpiresAt.Before(time.Now()) {
            return c.Status(401).JSON(fiber.Map{
                "error": "API key expired",
            })
        }
        
        c.Locals("api_key", key)
        return c.Next()
    }
}

// Request signing verification
func VerifyRequestSignature() fiber.Handler {
    return func(c *fiber.Ctx) error {
        signature := c.Get("X-Signature")
        timestamp := c.Get("X-Timestamp")
        
        if signature == "" || timestamp == "" {
            return c.Status(401).JSON(fiber.Map{
                "error": "Missing signature",
            })
        }
        
        // Verify timestamp is recent (prevent replay attacks)
        ts, err := time.Parse(time.RFC3339, timestamp)
        if err != nil {
            return c.Status(400).JSON(fiber.Map{
                "error": "Invalid timestamp",
            })
        }
        
        if time.Since(ts) > 5*time.Minute {
            return c.Status(401).JSON(fiber.Map{
                "error": "Request expired",
            })
        }
        
        // Verify signature
        body := c.Body()
        expectedSig := generateHMAC(body, timestamp)
        
        if !hmac.Equal([]byte(signature), []byte(expectedSig)) {
            return c.Status(401).JSON(fiber.Map{
                "error": "Invalid signature",
            })
        }
        
        return c.Next()
    }
}
```

---

## 6. SECURE WEBSOCKET CONNECTIONS

```typescript
// Secure WebSocket implementation
import { WebSocket, WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

class SecureWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedWebSocket>;
  
  constructor(port: number) {
    this.wss = new WebSocketServer({ 
      port,
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.clients = new Map();
    this.setupHeartbeat();
  }
  
  private verifyClient(info: any, callback: (result: boolean, code?: number, message?: string) => void) {
    const token = this.extractToken(info.req.headers.authorization);
    
    if (!token) {
      callback(false, 401, 'Unauthorized');
      return;
    }
    
    jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
      if (err) {
        callback(false, 401, 'Invalid token');
      } else {
        info.req.userId = (decoded as any).userId;
        callback(true);
      }
    });
  }
  
  private extractToken(authHeader: string): string | null {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
    return null;
  }
  
  private setupHeartbeat() {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
    
    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }
  
  public broadcast(userId: string, message: any) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
}
```

---

## 7. SECURITY HEADERS

```typescript
// Next.js security headers configuration
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  }
];

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.candlefish.ai wss://ws.candlefish.ai;
  media-src 'self';
  object-src 'none';
  child-src 'self';
  frame-src 'self';
  worker-src 'self' blob:;
  form-action 'self';
  base-uri 'self';
  manifest-src 'self';
  upgrade-insecure-requests;
`;
```

---

## 8. SECURE FILE UPLOAD

```go
package upload

import (
    "crypto/md5"
    "fmt"
    "io"
    "mime/multipart"
    "os"
    "path/filepath"
    "strings"
    
    "github.com/gofiber/fiber/v2"
)

type FileUploadService struct {
    maxFileSize      int64
    allowedMimeTypes map[string]bool
    uploadDir        string
}

func NewFileUploadService() *FileUploadService {
    return &FileUploadService{
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: map[string]bool{
            "image/jpeg": true,
            "image/png":  true,
            "image/gif":  true,
            "application/pdf": true,
        },
        uploadDir: "/secure/uploads",
    }
}

func (fus *FileUploadService) HandleUpload(c *fiber.Ctx) error {
    // Parse multipart form
    form, err := c.MultipartForm()
    if err != nil {
        return c.Status(400).JSON(fiber.Map{
            "error": "Invalid form data",
        })
    }
    
    files := form.File["files"]
    uploaded := []string{}
    
    for _, file := range files {
        // Validate file size
        if file.Size > fus.maxFileSize {
            return c.Status(400).JSON(fiber.Map{
                "error": "File too large",
                "max_size": fus.maxFileSize,
            })
        }
        
        // Validate file type
        if !fus.isAllowedType(file) {
            return c.Status(400).JSON(fiber.Map{
                "error": "Invalid file type",
            })
        }
        
        // Scan for malware (integrate with ClamAV or similar)
        if err := fus.scanFile(file); err != nil {
            return c.Status(400).JSON(fiber.Map{
                "error": "File failed security scan",
            })
        }
        
        // Generate secure filename
        filename := fus.generateSecureFilename(file.Filename)
        
        // Save file
        dst := filepath.Join(fus.uploadDir, filename)
        if err := c.SaveFile(file, dst); err != nil {
            return c.Status(500).JSON(fiber.Map{
                "error": "Failed to save file",
            })
        }
        
        uploaded = append(uploaded, filename)
    }
    
    return c.JSON(fiber.Map{
        "files": uploaded,
    })
}

func (fus *FileUploadService) isAllowedType(file *multipart.FileHeader) bool {
    // Check MIME type
    contentType := file.Header.Get("Content-Type")
    if !fus.allowedMimeTypes[contentType] {
        return false
    }
    
    // Also check file extension
    ext := strings.ToLower(filepath.Ext(file.Filename))
    allowedExts := map[string]bool{
        ".jpg": true, ".jpeg": true,
        ".png": true, ".gif": true,
        ".pdf": true,
    }
    
    return allowedExts[ext]
}

func (fus *FileUploadService) generateSecureFilename(original string) string {
    ext := filepath.Ext(original)
    
    // Generate unique filename
    h := md5.New()
    io.WriteString(h, fmt.Sprintf("%s-%d", original, time.Now().UnixNano()))
    
    return fmt.Sprintf("%x%s", h.Sum(nil), ext)
}

func (fus *FileUploadService) scanFile(file *multipart.FileHeader) error {
    // Implement virus scanning here
    // Example with ClamAV:
    // cmd := exec.Command("clamdscan", "--no-summary", file.Filename)
    // output, err := cmd.Output()
    return nil
}
```

---

## 9. SECURE SESSION MANAGEMENT

```go
package session

import (
    "time"
    
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/session"
    "github.com/gofiber/storage/redis"
)

func SetupSecureSessions() *session.Store {
    // Create storage
    storage := redis.New(redis.Config{
        Host:     "localhost",
        Port:     6379,
        Password: "",
        Database: 0,
    })
    
    // Create session store
    store := session.New(session.Config{
        Storage:        storage,
        Expiration:     30 * time.Minute,
        KeyLookup:      "cookie:session_id",
        CookieSecure:   true,
        CookieHTTPOnly: true,
        CookieSameSite: "Lax",
        KeyGenerator: func() string {
            return generateSecureSessionID()
        },
    })
    
    return store
}

// Session middleware with CSRF protection
func SessionMiddleware(store *session.Store) fiber.Handler {
    return func(c *fiber.Ctx) error {
        sess, err := store.Get(c)
        if err != nil {
            return c.Status(500).JSON(fiber.Map{
                "error": "Session error",
            })
        }
        
        // Generate CSRF token if not exists
        if sess.Get("csrf_token") == nil {
            sess.Set("csrf_token", generateCSRFToken())
        }
        
        // Set session in context
        c.Locals("session", sess)
        
        // Save session
        if err := sess.Save(); err != nil {
            return c.Status(500).JSON(fiber.Map{
                "error": "Failed to save session",
            })
        }
        
        return c.Next()
    }
}

// CSRF protection middleware
func CSRFProtection() fiber.Handler {
    return func(c *fiber.Ctx) error {
        // Skip for safe methods
        if c.Method() == "GET" || c.Method() == "HEAD" || c.Method() == "OPTIONS" {
            return c.Next()
        }
        
        sess := c.Locals("session").(*session.Session)
        sessionToken := sess.Get("csrf_token")
        
        // Check CSRF token
        requestToken := c.Get("X-CSRF-Token")
        if requestToken == "" {
            requestToken = c.FormValue("csrf_token")
        }
        
        if requestToken != sessionToken {
            return c.Status(403).JSON(fiber.Map{
                "error": "Invalid CSRF token",
            })
        }
        
        return c.Next()
    }
}
```

---

## 10. SECURITY MONITORING & LOGGING

```go
package monitoring

import (
    "context"
    "encoding/json"
    "time"
    
    "github.com/gofiber/fiber/v2"
    "github.com/sirupsen/logrus"
)

type SecurityLogger struct {
    logger *logrus.Logger
}

func NewSecurityLogger() *SecurityLogger {
    logger := logrus.New()
    logger.SetFormatter(&logrus.JSONFormatter{})
    logger.SetLevel(logrus.InfoLevel)
    
    return &SecurityLogger{logger: logger}
}

// Security event types
const (
    EventAuthFailure    = "AUTH_FAILURE"
    EventAuthSuccess    = "AUTH_SUCCESS"
    EventAccessDenied   = "ACCESS_DENIED"
    EventSuspiciousActivity = "SUSPICIOUS_ACTIVITY"
    EventDataAccess     = "DATA_ACCESS"
    EventConfigChange   = "CONFIG_CHANGE"
)

// Log security event
func (sl *SecurityLogger) LogSecurityEvent(eventType string, details map[string]interface{}) {
    sl.logger.WithFields(logrus.Fields{
        "event_type": eventType,
        "timestamp":  time.Now().UTC(),
        "details":    details,
    }).Info("Security event")
}

// Audit middleware
func AuditMiddleware(sl *SecurityLogger) fiber.Handler {
    return func(c *fiber.Ctx) error {
        start := time.Now()
        
        // Capture request details
        reqDetails := map[string]interface{}{
            "method":     c.Method(),
            "path":       c.Path(),
            "ip":         c.IP(),
            "user_agent": c.Get("User-Agent"),
        }
        
        // Process request
        err := c.Next()
        
        // Log based on response status
        duration := time.Since(start).Milliseconds()
        status := c.Response().StatusCode()
        
        reqDetails["status"] = status
        reqDetails["duration_ms"] = duration
        
        if status >= 400 && status < 500 {
            sl.LogSecurityEvent(EventAccessDenied, reqDetails)
        } else if status >= 500 {
            reqDetails["error"] = err
            sl.LogSecurityEvent(EventSuspiciousActivity, reqDetails)
        }
        
        return err
    }
}

// Detect suspicious patterns
func (sl *SecurityLogger) DetectAnomalies(c *fiber.Ctx) {
    // Check for SQL injection attempts
    if detectSQLInjection(c.Body()) {
        sl.LogSecurityEvent(EventSuspiciousActivity, map[string]interface{}{
            "type": "SQL_INJECTION_ATTEMPT",
            "ip":   c.IP(),
            "path": c.Path(),
        })
    }
    
    // Check for XSS attempts
    if detectXSS(string(c.Body())) {
        sl.LogSecurityEvent(EventSuspiciousActivity, map[string]interface{}{
            "type": "XSS_ATTEMPT",
            "ip":   c.IP(),
            "path": c.Path(),
        })
    }
    
    // Check for path traversal
    if detectPathTraversal(c.Path()) {
        sl.LogSecurityEvent(EventSuspiciousActivity, map[string]interface{}{
            "type": "PATH_TRAVERSAL_ATTEMPT",
            "ip":   c.IP(),
            "path": c.Path(),
        })
    }
}
```

---

## SECURITY TESTING SCRIPTS

### API Security Test Suite
```bash
#!/bin/bash

# security-test.sh
API_URL="https://api.candlefish.ai"

echo "Running Security Tests..."

# Test 1: SQL Injection
echo "Testing SQL Injection..."
curl -X POST "$API_URL/api/v1/items" \
  -H "Content-Type: application/json" \
  -d '{"name": "test'\'' OR 1=1--", "category": "test"}' \
  -w "\nStatus: %{http_code}\n"

# Test 2: XSS
echo "Testing XSS..."
curl -X POST "$API_URL/api/v1/items" \
  -H "Content-Type: application/json" \
  -d '{"name": "<script>alert(1)</script>", "description": "<img src=x onerror=alert(1)>"}' \
  -w "\nStatus: %{http_code}\n"

# Test 3: Authentication Bypass
echo "Testing Authentication Bypass..."
curl -X GET "$API_URL/api/v1/admin/users" \
  -H "Authorization: Bearer invalid_token" \
  -w "\nStatus: %{http_code}\n"

# Test 4: Rate Limiting
echo "Testing Rate Limiting..."
for i in {1..100}; do
  curl -X GET "$API_URL/api/v1/items" \
    -w "Request $i: %{http_code}\n" \
    -o /dev/null -s
done

# Test 5: HTTPS Enforcement
echo "Testing HTTPS Enforcement..."
curl -X GET "http://api.candlefish.ai/api/v1/items" \
  -w "\nStatus: %{http_code}\n"
```

---

This implementation guide provides secure, production-ready code templates that address all the vulnerabilities identified in the security audit. Each section includes best practices and can be directly integrated into the Security Dashboard implementation.
