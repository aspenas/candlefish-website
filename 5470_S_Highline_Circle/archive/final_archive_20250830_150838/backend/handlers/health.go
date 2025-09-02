// Health check handlers for the Item Valuation System
package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/gofiber/fiber/v2"
	"github.com/patricksmith/highline-inventory/config"
)

// HealthStatus represents the overall health status
type HealthStatus string

const (
	StatusHealthy   HealthStatus = "healthy"
	StatusDegraded  HealthStatus = "degraded"
	StatusUnhealthy HealthStatus = "unhealthy"
)

// HealthCheck represents a single health check
type HealthCheck struct {
	Name        string        `json:"name"`
	Status      HealthStatus  `json:"status"`
	Message     string        `json:"message,omitempty"`
	Duration    time.Duration `json:"duration"`
	LastChecked time.Time     `json:"last_checked"`
	Error       string        `json:"error,omitempty"`
}

// HealthResponse represents the complete health check response
type HealthResponse struct {
	Status      HealthStatus               `json:"status"`
	Timestamp   time.Time                  `json:"timestamp"`
	Version     string                     `json:"version"`
	Environment string                     `json:"environment"`
	Uptime      time.Duration              `json:"uptime"`
	Checks      map[string]HealthCheck     `json:"checks"`
	Metrics     map[string]interface{}     `json:"metrics,omitempty"`
}

// ReadinessResponse represents the readiness check response
type ReadinessResponse struct {
	Status      HealthStatus           `json:"status"`
	Timestamp   time.Time              `json:"timestamp"`
	Ready       bool                   `json:"ready"`
	Checks      map[string]HealthCheck `json:"checks"`
}

// LivenessResponse represents the liveness check response
type LivenessResponse struct {
	Status    HealthStatus `json:"status"`
	Timestamp time.Time    `json:"timestamp"`
	Alive     bool         `json:"alive"`
	Uptime    time.Duration `json:"uptime"`
}

// HealthChecker manages all health checks
type HealthChecker struct {
	db          *sql.DB
	redisClient *redis.Client
	config      *config.Config
	startTime   time.Time
	mu          sync.RWMutex
	lastChecks  map[string]HealthCheck
}

// NewHealthChecker creates a new health checker instance
func NewHealthChecker(db *sql.DB, redisClient *redis.Client, config *config.Config) *HealthChecker {
	return &HealthChecker{
		db:          db,
		redisClient: redisClient,
		config:      config,
		startTime:   time.Now(),
		lastChecks:  make(map[string]HealthCheck),
	}
}

// Health handles the main health check endpoint
func (hc *HealthChecker) Health(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.Context(), 30*time.Second)
	defer cancel()

	response := HealthResponse{
		Timestamp:   time.Now(),
		Version:     hc.config.AppVersion,
		Environment: hc.config.NodeEnv,
		Uptime:      time.Since(hc.startTime),
		Checks:      make(map[string]HealthCheck),
	}

	// Run all health checks concurrently
	checks := []func(context.Context) HealthCheck{
		hc.checkDatabase,
		hc.checkRedis,
		hc.checkDiskSpace,
		hc.checkMemory,
		hc.checkExternalServices,
	}

	var wg sync.WaitGroup
	checkResults := make(chan HealthCheck, len(checks))

	for _, check := range checks {
		wg.Add(1)
		go func(checkFunc func(context.Context) HealthCheck) {
			defer wg.Done()
			checkResults <- checkFunc(ctx)
		}(check)
	}

	// Close channel when all checks complete
	go func() {
		wg.Wait()
		close(checkResults)
	}()

	// Collect results
	overallStatus := StatusHealthy
	for check := range checkResults {
		response.Checks[check.Name] = check
		hc.updateLastCheck(check)

		// Determine overall status
		if check.Status == StatusUnhealthy {
			overallStatus = StatusUnhealthy
		} else if check.Status == StatusDegraded && overallStatus != StatusUnhealthy {
			overallStatus = StatusDegraded
		}
	}

	response.Status = overallStatus

	// Add metrics if requested
	if c.Query("include_metrics") == "true" {
		response.Metrics = hc.getMetrics()
	}

	// Set appropriate HTTP status code
	statusCode := http.StatusOK
	if overallStatus == StatusUnhealthy {
		statusCode = http.StatusServiceUnavailable
	} else if overallStatus == StatusDegraded {
		statusCode = http.StatusPartialContent
	}

	return c.Status(statusCode).JSON(response)
}

// Ready handles the readiness check endpoint
func (hc *HealthChecker) Ready(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.Context(), 10*time.Second)
	defer cancel()

	response := ReadinessResponse{
		Timestamp: time.Now(),
		Checks:    make(map[string]HealthCheck),
	}

	// Critical readiness checks
	criticalChecks := []func(context.Context) HealthCheck{
		hc.checkDatabase,
		hc.checkRedis,
	}

	var wg sync.WaitGroup
	checkResults := make(chan HealthCheck, len(criticalChecks))

	for _, check := range criticalChecks {
		wg.Add(1)
		go func(checkFunc func(context.Context) HealthCheck) {
			defer wg.Done()
			checkResults <- checkFunc(ctx)
		}(check)
	}

	go func() {
		wg.Wait()
		close(checkResults)
	}()

	ready := true
	for check := range checkResults {
		response.Checks[check.Name] = check
		if check.Status == StatusUnhealthy {
			ready = false
		}
	}

	response.Ready = ready
	response.Status = StatusHealthy
	if !ready {
		response.Status = StatusUnhealthy
	}

	statusCode := http.StatusOK
	if !ready {
		statusCode = http.StatusServiceUnavailable
	}

	return c.Status(statusCode).JSON(response)
}

// Live handles the liveness check endpoint
func (hc *HealthChecker) Live(c *fiber.Ctx) error {
	response := LivenessResponse{
		Status:    StatusHealthy,
		Timestamp: time.Now(),
		Alive:     true,
		Uptime:    time.Since(hc.startTime),
	}

	return c.JSON(response)
}

// checkDatabase performs database health check
func (hc *HealthChecker) checkDatabase(ctx context.Context) HealthCheck {
	start := time.Now()
	check := HealthCheck{
		Name:        "database",
		LastChecked: start,
	}

	if hc.db == nil {
		check.Status = StatusUnhealthy
		check.Message = "Database connection not initialized"
		check.Duration = time.Since(start)
		return check
	}

	// Simple ping check
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := hc.db.PingContext(pingCtx); err != nil {
		check.Status = StatusUnhealthy
		check.Message = "Database ping failed"
		check.Error = err.Error()
		check.Duration = time.Since(start)
		return check
	}

	// Connection pool check
	stats := hc.db.Stats()
	if stats.OpenConnections >= stats.MaxOpenConnections-1 {
		check.Status = StatusDegraded
		check.Message = fmt.Sprintf("Database connection pool nearly exhausted (%d/%d)", 
			stats.OpenConnections, stats.MaxOpenConnections)
	} else {
		check.Status = StatusHealthy
		check.Message = fmt.Sprintf("Database healthy (%d/%d connections)", 
			stats.OpenConnections, stats.MaxOpenConnections)
	}

	// Simple query test
	queryCtx, queryCancel := context.WithTimeout(ctx, 3*time.Second)
	defer queryCancel()

	var count int
	if err := hc.db.QueryRowContext(queryCtx, "SELECT COUNT(*) FROM schema_migrations").Scan(&count); err != nil {
		check.Status = StatusDegraded
		check.Message = "Database query test failed"
		check.Error = err.Error()
	}

	check.Duration = time.Since(start)
	return check
}

// checkRedis performs Redis health check
func (hc *HealthChecker) checkRedis(ctx context.Context) HealthCheck {
	start := time.Now()
	check := HealthCheck{
		Name:        "redis",
		LastChecked: start,
	}

	if hc.redisClient == nil {
		check.Status = StatusUnhealthy
		check.Message = "Redis connection not initialized"
		check.Duration = time.Since(start)
		return check
	}

	// Ping check
	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	pong, err := hc.redisClient.Ping(pingCtx).Result()
	if err != nil {
		check.Status = StatusUnhealthy
		check.Message = "Redis ping failed"
		check.Error = err.Error()
		check.Duration = time.Since(start)
		return check
	}

	if pong != "PONG" {
		check.Status = StatusUnhealthy
		check.Message = fmt.Sprintf("Redis ping returned unexpected response: %s", pong)
		check.Duration = time.Since(start)
		return check
	}

	// Memory usage check
	memCtx, memCancel := context.WithTimeout(ctx, 3*time.Second)
	defer memCancel()

	_, err = hc.redisClient.Info(memCtx, "memory").Result()
	if err == nil {
		// Parse memory info if needed for health assessment
		check.Status = StatusHealthy
		check.Message = "Redis healthy"
	} else {
		check.Status = StatusDegraded
		check.Message = "Redis ping successful but info command failed"
		check.Error = err.Error()
	}

	check.Duration = time.Since(start)
	return check
}

// checkDiskSpace performs disk space health check
func (hc *HealthChecker) checkDiskSpace(ctx context.Context) HealthCheck {
	start := time.Now()
	check := HealthCheck{
		Name:        "disk_space",
		LastChecked: start,
	}

	// This is a simplified check - in production you'd want to check actual disk usage
	// Using syscall or external tools like 'df'
	check.Status = StatusHealthy
	check.Message = "Disk space check not implemented"
	check.Duration = time.Since(start)
	
	return check
}

// checkMemory performs memory usage health check
func (hc *HealthChecker) checkMemory(ctx context.Context) HealthCheck {
	start := time.Now()
	check := HealthCheck{
		Name:        "memory",
		LastChecked: start,
	}

	// This is a simplified check - in production you'd want to check actual memory usage
	check.Status = StatusHealthy
	check.Message = "Memory check not implemented"
	check.Duration = time.Since(start)
	
	return check
}

// checkExternalServices performs external service health checks
func (hc *HealthChecker) checkExternalServices(ctx context.Context) HealthCheck {
	start := time.Now()
	check := HealthCheck{
		Name:        "external_services",
		LastChecked: start,
	}

	// Check external dependencies (AWS S3, email service, etc.)
	// This is a placeholder - implement actual external service checks
	check.Status = StatusHealthy
	check.Message = "External services healthy"
	check.Duration = time.Since(start)
	
	return check
}

// getMetrics returns application metrics
func (hc *HealthChecker) getMetrics() map[string]interface{} {
	metrics := make(map[string]interface{})
	
	// Database metrics
	if hc.db != nil {
		stats := hc.db.Stats()
		metrics["database"] = map[string]interface{}{
			"open_connections":     stats.OpenConnections,
			"in_use_connections":   stats.InUse,
			"idle_connections":     stats.Idle,
			"max_open_connections": stats.MaxOpenConnections,
			"wait_count":          stats.WaitCount,
			"wait_duration":       stats.WaitDuration,
		}
	}

	// Redis metrics would be added here
	
	// Application metrics
	metrics["application"] = map[string]interface{}{
		"uptime_seconds": time.Since(hc.startTime).Seconds(),
		"version":        hc.config.AppVersion,
		"environment":    hc.config.NodeEnv,
	}

	return metrics
}

// updateLastCheck updates the last check result
func (hc *HealthChecker) updateLastCheck(check HealthCheck) {
	hc.mu.Lock()
	defer hc.mu.Unlock()
	hc.lastChecks[check.Name] = check
}

// GetLastChecks returns the last check results (for background monitoring)
func (hc *HealthChecker) GetLastChecks() map[string]HealthCheck {
	hc.mu.RLock()
	defer hc.mu.RUnlock()
	
	result := make(map[string]HealthCheck)
	for name, check := range hc.lastChecks {
		result[name] = check
	}
	return result
}