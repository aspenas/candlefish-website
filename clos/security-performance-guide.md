# CLOS Security & Performance Guide

## Security Architecture

### 1. Authentication & Authorization

#### JWT-Based Authentication
```go
// JWT Configuration
type JWTConfig struct {
    SigningMethod string        // RS256 (recommended) or HS256
    PublicKeyPath string        // For RS256
    PrivateKeyPath string       // For RS256
    SecretKey     []byte        // For HS256
    TokenTTL      time.Duration // Default: 24 hours
    RefreshTTL    time.Duration // Default: 7 days
    Issuer        string        // "clos-api"
    Audience      string        // "clos-dashboard"
}

// Token Claims
type Claims struct {
    UserID      string   `json:"user_id"`
    Permissions []string `json:"permissions"`
    jwt.RegisteredClaims
}
```

#### Role-Based Access Control (RBAC)
```yaml
# Permission Matrix
permissions:
  admin:
    - "services:*"
    - "groups:*" 
    - "ports:*"
    - "config:*"
    - "system:*"
  
  operator:
    - "services:read"
    - "services:start"
    - "services:stop"
    - "services:restart"
    - "groups:read"
    - "groups:start"
    - "groups:stop"
    - "ports:read"
  
  viewer:
    - "services:read"
    - "groups:read" 
    - "ports:read"
    - "metrics:read"
```

#### API Key Management
```go
type APIKey struct {
    ID          string    `json:"id"`
    Name        string    `json:"name"`
    KeyHash     string    `json:"-"` // Never expose actual key
    Permissions []string  `json:"permissions"`
    CreatedAt   time.Time `json:"created_at"`
    ExpiresAt   *time.Time `json:"expires_at,omitempty"`
    LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
    IsActive    bool      `json:"is_active"`
}

// API Key Authentication Middleware
func APIKeyAuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        apiKey := c.GetHeader("X-API-Key")
        if apiKey == "" {
            c.JSON(401, gin.H{"error": "API key required"})
            c.Abort()
            return
        }
        
        // Validate API key and set permissions in context
        if valid, permissions := validateAPIKey(apiKey); valid {
            c.Set("permissions", permissions)
            c.Next()
        } else {
            c.JSON(401, gin.H{"error": "Invalid API key"})
            c.Abort()
        }
    }
}
```

### 2. Input Validation & Sanitization

#### Request Validation Middleware
```go
import "github.com/go-playground/validator/v10"

type ServiceCreateRequest struct {
    Name        string            `json:"name" validate:"required,min=1,max=100,alphanum"`
    Group       string            `json:"group" validate:"required,min=1,max=50,alphanum"`
    Port        int               `json:"port" validate:"min=1024,max=65535"`
    HealthURL   string            `json:"health_url,omitempty" validate:"omitempty,url"`
    Environment map[string]string `json:"environment,omitempty" validate:"dive,max=1000"`
    Tags        []string          `json:"tags,omitempty" validate:"max=10,dive,max=50"`
}

func ValidateJSON[T any]() gin.HandlerFunc {
    return func(c *gin.Context) {
        var req T
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(400, gin.H{
                "error": "Invalid request format",
                "details": err.Error(),
            })
            c.Abort()
            return
        }
        
        validate := validator.New()
        if err := validate.Struct(req); err != nil {
            c.JSON(400, gin.H{
                "error": "Validation failed",
                "details": formatValidationErrors(err),
            })
            c.Abort()
            return
        }
        
        c.Set("validated_request", req)
        c.Next()
    }
}
```

#### SQL Injection Prevention
```go
// Always use prepared statements
func (r *Registry) GetServicesByGroup(group string) ([]*Service, error) {
    query := `
        SELECT id, name, group_name, port, status, created_at, updated_at
        FROM services 
        WHERE group_name = ? 
        ORDER BY name`
    
    rows, err := r.db.Query(query, group) // Parameterized query
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    // ... rest of implementation
}
```

### 3. Rate Limiting

#### Redis-Based Rate Limiter
```go
import "github.com/go-redis/redis/v8"

type RateLimiter struct {
    client *redis.Client
    limits map[string]RateLimit
}

type RateLimit struct {
    Requests int           // Number of requests
    Duration time.Duration // Time window
}

func NewRateLimiter(client *redis.Client) *RateLimiter {
    return &RateLimiter{
        client: client,
        limits: map[string]RateLimit{
            "global":    {Requests: 1000, Duration: time.Minute},
            "auth":      {Requests: 5, Duration: time.Minute},
            "websocket": {Requests: 100, Duration: time.Minute},
        },
    }
}

func (rl *RateLimiter) Allow(ctx context.Context, key string, limitType string) (bool, error) {
    limit, exists := rl.limits[limitType]
    if !exists {
        limit = rl.limits["global"]
    }
    
    pipe := rl.client.Pipeline()
    incr := pipe.Incr(ctx, key)
    pipe.Expire(ctx, key, limit.Duration)
    
    _, err := pipe.Exec(ctx)
    if err != nil {
        return false, err
    }
    
    return incr.Val() <= int64(limit.Requests), nil
}

// Rate limiting middleware
func RateLimitMiddleware(limiter *RateLimiter, limitType string) gin.HandlerFunc {
    return func(c *gin.Context) {
        key := fmt.Sprintf("rate_limit:%s:%s", limitType, getClientIdentifier(c))
        
        allowed, err := limiter.Allow(c.Request.Context(), key, limitType)
        if err != nil {
            c.JSON(500, gin.H{"error": "Rate limit check failed"})
            c.Abort()
            return
        }
        
        if !allowed {
            c.Header("Retry-After", "60")
            c.JSON(429, gin.H{"error": "Rate limit exceeded"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

### 4. Audit Logging

#### Comprehensive Audit Trail
```go
type AuditEvent struct {
    ID          string                 `json:"id"`
    Timestamp   time.Time             `json:"timestamp"`
    UserID      string                `json:"user_id,omitempty"`
    Action      string                `json:"action"`
    Resource    string                `json:"resource"`
    ResourceID  string                `json:"resource_id,omitempty"`
    IPAddress   string                `json:"ip_address"`
    UserAgent   string                `json:"user_agent"`
    RequestID   string                `json:"request_id"`
    Success     bool                  `json:"success"`
    Error       string                `json:"error,omitempty"`
    Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

func AuditMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        requestID := c.GetHeader("X-Request-ID")
        if requestID == "" {
            requestID = generateRequestID()
            c.Header("X-Request-ID", requestID)
        }
        
        c.Set("request_id", requestID)
        c.Set("audit_start", start)
        
        c.Next()
        
        // Log audit event after request completion
        duration := time.Since(start)
        logAuditEvent(c, duration)
    }
}

func logAuditEvent(c *gin.Context, duration time.Duration) {
    event := AuditEvent{
        ID:         generateEventID(),
        Timestamp:  time.Now(),
        Action:     fmt.Sprintf("%s %s", c.Request.Method, c.Request.URL.Path),
        IPAddress:  c.ClientIP(),
        UserAgent:  c.Request.UserAgent(),
        RequestID:  c.GetString("request_id"),
        Success:    c.Writer.Status() < 400,
        Metadata: map[string]interface{}{
            "status_code":    c.Writer.Status(),
            "response_time": duration.Milliseconds(),
            "request_size":  c.Request.ContentLength,
            "response_size": c.Writer.Size(),
        },
    }
    
    if userID := c.GetString("user_id"); userID != "" {
        event.UserID = userID
    }
    
    if c.Writer.Status() >= 400 {
        if err := c.GetString("error"); err != "" {
            event.Error = err
        }
    }
    
    // Store in database and/or send to logging system
    storeAuditEvent(event)
}
```

## Performance Optimizations

### 1. Database Performance

#### Connection Pooling
```go
import "github.com/jmoiron/sqlx"

type DatabaseConfig struct {
    MaxOpenConns    int           // Maximum open connections
    MaxIdleConns    int           // Maximum idle connections
    ConnMaxLifetime time.Duration // Connection lifetime
    ConnMaxIdleTime time.Duration // Idle connection timeout
}

func NewDatabase(config DatabaseConfig) (*sqlx.DB, error) {
    db, err := sqlx.Connect("sqlite3", "registry.db?_journal_mode=WAL&_synchronous=NORMAL&_cache_size=1000&_temp_store=memory")
    if err != nil {
        return nil, err
    }
    
    db.SetMaxOpenConns(config.MaxOpenConns)
    db.SetMaxIdleConns(config.MaxIdleConns)
    db.SetConnMaxLifetime(config.ConnMaxLifetime)
    db.SetConnMaxIdleTime(config.ConnMaxIdleTime)
    
    return db, nil
}
```

#### Query Optimization
```sql
-- Optimized service listing with pagination and filtering
SELECT s.id, s.name, s.group_name, s.port, s.status, s.health_status,
       GROUP_CONCAT(st.tag) as tags,
       m.cpu_usage, m.memory_usage, m.response_time
FROM services s
LEFT JOIN service_tags st ON s.id = st.service_id
LEFT JOIN (
    SELECT service_id, 
           cpu_usage, memory_usage, response_time,
           ROW_NUMBER() OVER (PARTITION BY service_id ORDER BY timestamp DESC) as rn
    FROM service_metrics 
    WHERE timestamp > datetime('now', '-5 minutes')
) m ON s.id = m.service_id AND m.rn = 1
WHERE ($1 = '' OR s.group_name = $1)
  AND ($2 = '' OR s.status = $2)
  AND ($3 = '' OR st.tag IN (SELECT value FROM json_each($3)))
GROUP BY s.id
ORDER BY s.group_name, s.name
LIMIT $4 OFFSET $5;

-- Pre-aggregated metrics view for dashboard
CREATE VIEW service_metrics_summary AS
SELECT 
    service_id,
    AVG(cpu_usage) as avg_cpu,
    MAX(cpu_usage) as max_cpu,
    AVG(memory_usage) as avg_memory,
    MAX(memory_usage) as max_memory,
    AVG(response_time) as avg_response_time,
    COUNT(*) as sample_count
FROM service_metrics 
WHERE timestamp > datetime('now', '-1 hour')
GROUP BY service_id;
```

#### Batch Operations
```go
func (r *Registry) BatchUpdateServiceStatus(updates []ServiceStatusUpdate) error {
    tx, err := r.db.Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback()
    
    stmt, err := tx.Prepare(`
        UPDATE services 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`)
    if err != nil {
        return err
    }
    defer stmt.Close()
    
    for _, update := range updates {
        if _, err := stmt.Exec(update.Status, update.ServiceID); err != nil {
            return err
        }
    }
    
    return tx.Commit()
}
```

### 2. Caching Strategy

#### Multi-Level Caching
```go
import (
    "github.com/go-redis/redis/v8"
    "github.com/patrickmn/go-cache"
)

type CacheManager struct {
    local  *cache.Cache    // In-memory cache (L1)
    redis  *redis.Client   // Redis cache (L2)
    config CacheConfig
}

type CacheConfig struct {
    LocalTTL      time.Duration // 5 minutes
    RedisTTL      time.Duration // 1 hour
    PrefixLocal   string        // "clos:local:"
    PrefixRedis   string        // "clos:redis:"
}

func (cm *CacheManager) Get(ctx context.Context, key string, value interface{}) error {
    // Try L1 cache first
    if data, found := cm.local.Get(cm.config.PrefixLocal + key); found {
        return json.Unmarshal(data.([]byte), value)
    }
    
    // Try L2 cache
    data, err := cm.redis.Get(ctx, cm.config.PrefixRedis + key).Bytes()
    if err != nil && err != redis.Nil {
        return err
    }
    
    if err != redis.Nil {
        // Store in L1 cache for faster access
        cm.local.Set(cm.config.PrefixLocal + key, data, cm.config.LocalTTL)
        return json.Unmarshal(data, value)
    }
    
    return cache.ErrNotFound
}

func (cm *CacheManager) Set(ctx context.Context, key string, value interface{}) error {
    data, err := json.Marshal(value)
    if err != nil {
        return err
    }
    
    // Set in both caches
    cm.local.Set(cm.config.PrefixLocal + key, data, cm.config.LocalTTL)
    return cm.redis.Set(ctx, cm.config.PrefixRedis + key, data, cm.config.RedisTTL).Err()
}

// Cache-aware service getter
func (s *ServiceManager) GetService(ctx context.Context, serviceID string) (*Service, error) {
    var service Service
    cacheKey := fmt.Sprintf("service:%s", serviceID)
    
    // Try cache first
    if err := s.cache.Get(ctx, cacheKey, &service); err == nil {
        return &service, nil
    }
    
    // Fallback to database
    service, err := s.registry.GetService(serviceID)
    if err != nil {
        return nil, err
    }
    
    // Cache for future requests
    s.cache.Set(ctx, cacheKey, service)
    return service, nil
}
```

### 3. HTTP Performance

#### Response Compression
```go
import "github.com/gin-contrib/gzip"

// Enable gzip compression
router.Use(gzip.Gzip(gzip.DefaultCompression))

// Custom compression for specific endpoints
func smartCompressionMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Only compress responses larger than 1KB
        if c.Request.Header.Get("Accept-Encoding") != "" {
            c.Header("Vary", "Accept-Encoding")
        }
        c.Next()
    }
}
```

#### Connection Pooling & Keep-Alive
```go
func setupServer() *http.Server {
    return &http.Server{
        Addr:         ":8081",
        Handler:      setupRouter(),
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
        
        // Connection limits
        MaxHeaderBytes: 1 << 20, // 1 MB
    }
}

// Docker client with connection pooling
func newDockerClient() (*client.Client, error) {
    cli, err := client.NewClientWithOpts(
        client.FromEnv,
        client.WithHTTPClient(&http.Client{
            Transport: &http.Transport{
                MaxIdleConns:        100,
                MaxIdleConnsPerHost: 10,
                IdleConnTimeout:     90 * time.Second,
            },
        }),
    )
    return cli, err
}
```

### 4. WebSocket Optimization

#### Connection Management
```go
type WSManager struct {
    clients     map[string]*WSClient
    broadcast   chan []byte
    register    chan *WSClient
    unregister  chan *WSClient
    mu          sync.RWMutex
}

type WSClient struct {
    ID         string
    conn       *websocket.Conn
    send       chan []byte
    lastPing   time.Time
    filters    map[string]bool // Event type filters
}

func (manager *WSManager) run() {
    ticker := time.NewTicker(54 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case client := <-manager.register:
            manager.mu.Lock()
            manager.clients[client.ID] = client
            manager.mu.Unlock()
            go client.writePump()
            go client.readPump(manager)
            
        case client := <-manager.unregister:
            manager.mu.Lock()
            if _, ok := manager.clients[client.ID]; ok {
                delete(manager.clients, client.ID)
                close(client.send)
            }
            manager.mu.Unlock()
            
        case message := <-manager.broadcast:
            manager.mu.RLock()
            for _, client := range manager.clients {
                select {
                case client.send <- message:
                default:
                    close(client.send)
                    delete(manager.clients, client.ID)
                }
            }
            manager.mu.RUnlock()
            
        case <-ticker.C:
            manager.pingClients()
        }
    }
}

// Efficient message filtering
func (manager *WSManager) broadcastToFiltered(eventType string, message []byte) {
    manager.mu.RLock()
    defer manager.mu.RUnlock()
    
    for _, client := range manager.clients {
        if client.filters[eventType] || client.filters["*"] {
            select {
            case client.send <- message:
            default:
                // Client buffer full, disconnect
                close(client.send)
                delete(manager.clients, client.ID)
            }
        }
    }
}
```

### 5. Monitoring Performance

#### Efficient Metrics Collection
```go
type MetricsCollector struct {
    docker     *client.Client
    collectors map[string]CollectorFunc
    interval   time.Duration
    batchSize  int
}

func (mc *MetricsCollector) collectBatch() error {
    // Collect all container stats in parallel
    containers, err := mc.docker.ContainerList(context.Background(), 
        types.ContainerListOptions{})
    if err != nil {
        return err
    }
    
    metrics := make([]ServiceMetric, 0, len(containers))
    var wg sync.WaitGroup
    var mu sync.Mutex
    
    // Parallel collection with worker pool
    semaphore := make(chan struct{}, 10) // Limit to 10 concurrent collections
    
    for _, container := range containers {
        wg.Add(1)
        go func(containerID string) {
            defer wg.Done()
            semaphore <- struct{}{} // Acquire
            defer func() { <-semaphore }() // Release
            
            if metric, err := mc.collectContainerMetrics(containerID); err == nil {
                mu.Lock()
                metrics = append(metrics, metric)
                mu.Unlock()
            }
        }(container.ID)
    }
    
    wg.Wait()
    
    // Batch insert to database
    return mc.storeBatchMetrics(metrics)
}

func (mc *MetricsCollector) storeBatchMetrics(metrics []ServiceMetric) error {
    if len(metrics) == 0 {
        return nil
    }
    
    // Use transaction for batch insert
    tx, err := mc.db.Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback()
    
    stmt, err := tx.Prepare(`
        INSERT INTO service_metrics 
        (service_id, cpu_usage, memory_usage, memory_percent, network_rx, network_tx, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
    if err != nil {
        return err
    }
    defer stmt.Close()
    
    for _, metric := range metrics {
        _, err := stmt.Exec(metric.ServiceID, metric.CPUUsage, 
            metric.MemoryUsage, metric.MemoryPercent, 
            metric.NetworkRX, metric.NetworkTX, metric.Timestamp)
        if err != nil {
            return err
        }
    }
    
    return tx.Commit()
}
```

## Performance Monitoring

### Key Metrics to Track
```go
type PerformanceMetrics struct {
    // API Performance
    RequestDuration     histogram.Histogram
    RequestCount        counter.Counter
    ActiveConnections   gauge.Gauge
    
    // Database Performance  
    DBQueryDuration     histogram.Histogram
    DBConnectionsActive gauge.Gauge
    DBConnectionsIdle   gauge.Gauge
    
    // Cache Performance
    CacheHitRate       gauge.Gauge
    CacheSize          gauge.Gauge
    
    // System Resources
    CPUUsage           gauge.Gauge
    MemoryUsage        gauge.Gauge
    DiskUsage          gauge.Gauge
    
    // Docker Performance
    ContainerCount     gauge.Gauge
    ImagePullDuration  histogram.Histogram
}

// Prometheus metrics example
func setupMetrics() *PerformanceMetrics {
    return &PerformanceMetrics{
        RequestDuration: prometheus.NewHistogramVec(
            prometheus.HistogramOpts{
                Name:    "clos_http_request_duration_seconds",
                Help:    "HTTP request duration in seconds",
                Buckets: []float64{0.001, 0.01, 0.1, 0.5, 1, 5, 10},
            },
            []string{"method", "endpoint", "status"},
        ),
        // ... other metrics
    }
}
```

## Deployment Security Checklist

### Production Security Configuration
```yaml
# docker-compose.production.yml
version: '3.8'
services:
  clos-api:
    image: clos/api:latest
    environment:
      - GIN_MODE=release
      - JWT_SIGNING_METHOD=RS256
      - JWT_PUBLIC_KEY_PATH=/secrets/jwt_public.pem
      - JWT_PRIVATE_KEY_PATH=/secrets/jwt_private.pem
      - RATE_LIMIT_ENABLED=true
      - AUDIT_LOG_ENABLED=true
      - CORS_ORIGINS=https://clos.yourdomain.com
      - TLS_CERT_PATH=/certs/tls.crt
      - TLS_KEY_PATH=/certs/tls.key
    secrets:
      - jwt_public_key
      - jwt_private_key
    volumes:
      - /etc/ssl/certs:/certs:ro
      - clos_data:/data
    ports:
      - "8081:8081"
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
        reservations:
          memory: 256M
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3

secrets:
  jwt_public_key:
    external: true
  jwt_private_key:
    external: true
```

### Security Headers
```go
func securityHeadersMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("X-Content-Type-Options", "nosniff")
        c.Header("X-Frame-Options", "DENY")
        c.Header("X-XSS-Protection", "1; mode=block")
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        c.Header("Content-Security-Policy", "default-src 'self'")
        c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
        c.Next()
    }
}
```

This comprehensive security and performance guide provides the foundation for a production-ready CLOS system with enterprise-grade security and performance characteristics.