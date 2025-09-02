# Security Implementation Guide

## Quick Start Security Setup

### 1. Environment Configuration

Create a `.env` file with secure values:

```bash
# Generate secure secrets
openssl rand -base64 32 > jwt_secret.txt
openssl rand -base64 32 > db_encryption_key.txt
openssl rand -base64 32 > session_secret.txt

# Database Security
DATABASE_URL="postgres://user:password@localhost/inventory"
DB_ENCRYPTION_KEY="$(cat db_encryption_key.txt)"
DB_SSL_MODE="require"

# JWT Configuration
JWT_SECRET="$(cat jwt_secret.txt)"
JWT_EXPIRY="24h"
JWT_REFRESH_EXPIRY="7d"

# Security Settings
BCRYPT_COST=12
SESSION_SECRET="$(cat session_secret.txt)"
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION="15m"
PASSWORD_MIN_LENGTH=8

# CORS Settings
ALLOWED_ORIGINS="https://yourdomain.com"
ALLOWED_METHODS="GET,POST,PUT,DELETE,OPTIONS"
ALLOWED_HEADERS="Origin,Content-Type,Accept,Authorization"

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW="1m"
STRICT_RATE_LIMIT=5

# File Upload Security
MAX_UPLOAD_SIZE=10485760
MAX_FILES_PER_UPLOAD=10
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/gif,image/webp"
SCAN_UPLOADS=true

# API Keys (encrypted)
EBAY_API_KEY="encrypted:..."
FACEBOOK_API_KEY="encrypted:..."

# TLS/SSL
TLS_ENABLED=true
TLS_CERT_PATH="/etc/ssl/certs/cert.pem"
TLS_KEY_PATH="/etc/ssl/private/key.pem"
TLS_MIN_VERSION="1.2"

# Monitoring
ENABLE_AUDIT_LOG=true
ENABLE_SECURITY_MONITORING=true
SENTRY_DSN="https://..."
```

### 2. Install Security Dependencies

```bash
# Go dependencies
go get github.com/golang-jwt/jwt/v5
go get golang.org/x/crypto/bcrypt
go get github.com/go-playground/validator/v10
go get github.com/microcosm-cc/bluemonday
go get github.com/gofiber/fiber/v2/middleware/limiter
go get github.com/gofiber/fiber/v2/middleware/helmet

# System dependencies (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y clamav clamav-daemon
sudo freshclam
sudo systemctl start clamav-daemon
```

### 3. Database Security Setup

```sql
-- Create secure database user with limited privileges
CREATE USER inventory_app WITH PASSWORD 'StrongPassword123!';
GRANT CONNECT ON DATABASE inventory TO inventory_app;
GRANT USAGE ON SCHEMA public TO inventory_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO inventory_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO inventory_app;

-- Enable Row Level Security (RLS)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY items_user_policy ON items
    FOR ALL
    USING (user_id = current_user_id());

-- Enable encryption at rest (PostgreSQL)
-- Set in postgresql.conf:
-- encryption_key_command = 'aws kms decrypt ...'
```

### 4. TLS Certificate Setup

```bash
# Generate self-signed certificate for development
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout private.key \
  -out certificate.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# For production, use Let's Encrypt
sudo apt-get install certbot
sudo certbot certonly --standalone -d yourdomain.com
```

### 5. Update Main Application

Replace your `main.go` with the secure version:

```go
package main

import (
    "log"
    "os"
    
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/logger"
    "github.com/gofiber/fiber/v2/middleware/recover"
    "github.com/patricksmith/highline-inventory/handlers"
    "github.com/patricksmith/highline-inventory/middleware"
    "github.com/patricksmith/highline-inventory/database"
)

func main() {
    // Load environment
    if err := godotenv.Load(); err != nil {
        log.Fatal("Error loading .env file")
    }

    // Initialize secure database
    db, err := database.InitSecure()
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    defer db.Close()

    // Create Fiber app with security config
    app := fiber.New(fiber.Config{
        AppName:           "Highline Inventory API",
        ServerHeader:      "", // Hide server header
        StrictRouting:     true,
        CaseSensitive:     true,
        UnescapePath:      false,
        BodyLimit:         10 * 1024 * 1024, // 10MB
        ReadTimeout:       15 * time.Second,
        WriteTimeout:      15 * time.Second,
        IdleTimeout:       60 * time.Second,
        ReadBufferSize:    4096,
        WriteBufferSize:   4096,
        CompressedFileSuffix: ".gz",
        ProxyHeader:       "X-Forwarded-For",
        GETOnly:           false,
        ErrorHandler:      secureErrorHandler,
        DisableStartupMessage: os.Getenv("ENV") == "production",
    })

    // Security middleware (order matters!)
    app.Use(middleware.RequestID())
    app.Use(recover.New())
    app.Use(middleware.SecurityHeaders())
    app.Use(middleware.HelmetMiddleware())
    
    // Logging
    app.Use(logger.New(logger.Config{
        Format: "[${time}] ${status} - ${latency} ${method} ${path} ${ip}\n",
        TimeFormat: "15:04:05",
        TimeZone: "UTC",
    }))

    // CORS configuration
    app.Use(cors.New(cors.Config{
        AllowOrigins:     os.Getenv("ALLOWED_ORIGINS"),
        AllowMethods:     os.Getenv("ALLOWED_METHODS"),
        AllowHeaders:     os.Getenv("ALLOWED_HEADERS"),
        ExposeHeaders:    "Content-Length, X-Request-ID",
        AllowCredentials: false,
        MaxAge:          86400,
    }))

    // Rate limiting
    app.Use(middleware.RateLimiter(100))

    // Initialize handlers
    h := handlers.New(db)

    // Health check (public)
    app.Get("/health", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{
            "status": "healthy",
            "timestamp": time.Now().Unix(),
        })
    })

    // API routes
    api := app.Group("/api/v1")

    // Public authentication endpoints
    auth := api.Group("/auth")
    auth.Post("/register", middleware.ValidateBody(&middleware.RegisterRequest{}), h.Register)
    auth.Post("/login", middleware.LoginRateLimiter(), middleware.ValidateBody(&middleware.LoginRequest{}), h.Login)
    auth.Post("/logout", middleware.AuthRequired(), h.Logout)
    auth.Post("/refresh", middleware.AuthRequired(), middleware.RefreshToken)

    // Protected routes
    protected := api.Group("", middleware.AuthRequired())
    
    // Items endpoints with validation
    protected.Get("/items", middleware.ValidateQuery(), h.GetItems)
    protected.Get("/items/:id", middleware.ValidateUUID("id"), h.GetItem)
    protected.Post("/items", middleware.ValidateBody(&middleware.CreateItemRequest{}), h.CreateItem)
    protected.Put("/items/:id", middleware.ValidateUUID("id"), middleware.ValidateBody(&middleware.UpdateItemRequest{}), h.UpdateItem)
    protected.Delete("/items/:id", middleware.ValidateUUID("id"), middleware.RequireRole("admin"), h.DeleteItem)

    // Secure file upload
    protected.Post("/upload", 
        middleware.RequestSizeLimiter(10*1024*1024),
        h.SecureUploadPhoto,
    )

    // Admin routes with strict security
    admin := api.Group("/admin", 
        middleware.AuthRequired(),
        middleware.RequireRole("admin"),
        middleware.StrictRateLimiter(),
    )
    admin.Post("/setup", h.SetupDatabase)
    admin.Get("/audit-log", h.GetAuditLog)
    admin.Get("/security-events", h.GetSecurityEvents)

    // Serve static files securely
    app.Static("/photos", "./uploads/photos", fiber.Static{
        Compress:      true,
        ByteRange:     true,
        Browse:        false,
        CacheDuration: 24 * time.Hour,
        MaxAge:        3600,
    })

    // 404 handler
    app.Use(func(c *fiber.Ctx) error {
        return c.Status(404).JSON(fiber.Map{
            "error": "Not found",
            "code": "NOT_FOUND",
        })
    })

    // Start server
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    // Use TLS in production
    if os.Getenv("TLS_ENABLED") == "true" {
        log.Printf("Starting secure server on port %s", port)
        log.Fatal(app.ListenTLS(
            ":"+port,
            os.Getenv("TLS_CERT_PATH"),
            os.Getenv("TLS_KEY_PATH"),
        ))
    } else {
        log.Printf("Starting server on port %s (WARNING: TLS disabled)", port)
        log.Fatal(app.Listen(":" + port))
    }
}

func secureErrorHandler(c *fiber.Ctx, err error) error {
    code := fiber.StatusInternalServerError
    message := "Internal server error"
    errorCode := "INTERNAL_ERROR"

    if e, ok := err.(*fiber.Error); ok {
        code = e.Code
        if code < 500 {
            message = e.Message
        }
    }

    // Log the actual error securely
    log.Printf("[ERROR] %s %s: %v", c.Method(), c.Path(), err)

    // Return sanitized error to client
    return c.Status(code).JSON(fiber.Map{
        "error": message,
        "code":  errorCode,
        "request_id": c.Locals("request_id"),
    })
}
```

## Testing Security Implementation

### 1. Authentication Tests

```bash
# Test registration
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "confirm_password": "SecurePass123!",
    "name": "Test User"
  }'

# Test login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Save the JWT token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test authenticated request
curl -X GET http://localhost:8080/api/v1/items \
  -H "Authorization: Bearer $TOKEN"
```

### 2. SQL Injection Tests

```bash
# These should all return validation errors
curl -X GET "http://localhost:8080/api/v1/items?category='; DROP TABLE items; --"
curl -X GET "http://localhost:8080/api/v1/items?search=1' OR '1'='1"
curl -X POST http://localhost:8080/api/v1/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test'; DELETE FROM items; --"}'
```

### 3. XSS Prevention Tests

```bash
# Test XSS in item creation
curl -X POST http://localhost:8080/api/v1/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<script>alert(\"XSS\")</script>",
    "description": "<img src=x onerror=alert(1)>"
  }'
# Should sanitize the HTML
```

### 4. File Upload Security Tests

```bash
# Test file type validation
curl -X POST http://localhost:8080/api/v1/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "photos=@malicious.exe"
# Should reject

# Test file size limit
curl -X POST http://localhost:8080/api/v1/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "photos=@large_file.jpg"
# Should reject if over 10MB

# Test valid upload
curl -X POST http://localhost:8080/api/v1/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "photos=@valid_photo.jpg" \
  -F "item_id=550e8400-e29b-41d4-a716-446655440000"
```

### 5. Rate Limiting Tests

```bash
# Test rate limiting
for i in {1..150}; do
  curl -X GET http://localhost:8080/api/v1/items \
    -H "Authorization: Bearer $TOKEN" &
done
# Should start returning 429 after 100 requests
```

## Security Monitoring

### 1. Setup Logging

```go
// middleware/audit.go
func AuditLog() fiber.Handler {
    return func(c *fiber.Ctx) error {
        start := time.Now()
        
        // Process request
        err := c.Next()
        
        // Log security-relevant events
        log.Printf(
            "[AUDIT] %s %s %s %d %dms %s",
            c.IP(),
            c.Method(),
            c.Path(),
            c.Response().StatusCode(),
            time.Since(start).Milliseconds(),
            c.Locals("user_id"),
        )
        
        // Log to database for analysis
        logToDatabase(c)
        
        return err
    }
}
```

### 2. Setup Intrusion Detection

```go
// services/security_monitor.go
type SecurityMonitor struct {
    failedLogins map[string]int
    suspicious   map[string][]string
}

func (sm *SecurityMonitor) DetectBruteForce(ip string) bool {
    if sm.failedLogins[ip] > 5 {
        // Block IP
        blockIP(ip)
        return true
    }
    return false
}

func (sm *SecurityMonitor) DetectSQLInjection(input string) bool {
    patterns := []string{
        "union select",
        "drop table",
        "'; --",
        "1=1",
    }
    
    for _, pattern := range patterns {
        if strings.Contains(strings.ToLower(input), pattern) {
            sm.LogSecurityEvent("SQL_INJECTION_ATTEMPT", input)
            return true
        }
    }
    return false
}
```

### 3. Setup Alerting

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

  alertmanager:
    image: prom/alertmanager
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - "9093:9093"
```

## Deployment Security Checklist

### Pre-Deployment

- [ ] All dependencies updated to latest secure versions
- [ ] Security scanning with `gosec` passed
- [ ] Dependency vulnerability scan with `nancy` passed
- [ ] Docker image scanned with `trivy`
- [ ] Secrets removed from code and moved to environment
- [ ] TLS certificates configured
- [ ] Database encryption enabled
- [ ] Backup encryption configured

### Deployment Configuration

- [ ] Production environment variables set
- [ ] Firewall rules configured (allow only 443, 80 redirects to 443)
- [ ] Database connections use SSL
- [ ] Redis connections use AUTH
- [ ] File permissions set correctly (uploads: 644, configs: 600)
- [ ] Non-root user for application process
- [ ] Security headers verified
- [ ] CORS properly configured

### Post-Deployment

- [ ] SSL Labs test passed (A+ rating)
- [ ] Security headers test passed
- [ ] OWASP ZAP scan completed
- [ ] Penetration testing performed
- [ ] Load testing completed
- [ ] Monitoring alerts configured
- [ ] Incident response plan documented
- [ ] Regular security updates scheduled

## Incident Response

### Security Incident Procedure

1. **Detection**: Monitor alerts, logs, and user reports
2. **Assessment**: Determine severity and scope
3. **Containment**: Isolate affected systems
4. **Investigation**: Analyze logs and forensic data
5. **Remediation**: Fix vulnerabilities and restore services
6. **Recovery**: Verify system integrity
7. **Lessons Learned**: Document and improve

### Emergency Contacts

```yaml
security_team:
  - email: security@company.com
  - phone: +1-555-0100
  - slack: #security-incidents

database_admin:
  - email: dba@company.com
  - phone: +1-555-0101

legal:
  - email: legal@company.com
  - phone: +1-555-0102
```

## Regular Security Maintenance

### Daily Tasks
- Review security logs
- Check failed authentication attempts
- Monitor rate limiting triggers

### Weekly Tasks
- Update security patches
- Review user access logs
- Check for unusual API usage

### Monthly Tasks
- Rotate API keys
- Review and update firewall rules
- Security training for team
- Dependency updates

### Quarterly Tasks
- Penetration testing
- Security audit
- Disaster recovery drill
- Review security policies

## Additional Resources

- [OWASP Security Checklist](https://owasp.org/www-project-web-security-testing-guide/)
- [Go Security Best Practices](https://github.com/OWASP/Go-SCP)
- [CIS Security Benchmarks](https://www.cisecurity.org/cis-benchmarks/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)