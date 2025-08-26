package performance

import (
	"context"
	"database/sql"
	"runtime"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"go.uber.org/zap"
)

var (
	// Metrics for monitoring performance
	apiLatency = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "api_request_duration_seconds",
		Help:    "API request latency in seconds",
		Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10},
	}, []string{"method", "endpoint", "status"})

	dbQueryDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "db_query_duration_seconds",
		Help:    "Database query duration in seconds",
		Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1},
	}, []string{"query_type", "table"})

	cacheHitRate = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "cache_hit_total",
		Help: "Total number of cache hits and misses",
	}, []string{"cache_type", "hit"})

	goroutineCount = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "goroutine_count",
		Help: "Current number of goroutines",
	})

	memoryUsage = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "memory_usage_bytes",
		Help: "Current memory usage in bytes",
	})

	eventProcessingRate = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "event_processing_rate",
		Help: "Events processed per second",
	})
)

// ConnectionPool manages database connection pooling
type ConnectionPool struct {
	db     *sql.DB
	config PoolConfig
	logger *zap.Logger
}

// PoolConfig contains connection pool configuration
type PoolConfig struct {
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

// NewConnectionPool creates an optimized connection pool
func NewConnectionPool(dsn string, config PoolConfig, logger *zap.Logger) (*ConnectionPool, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}

	// Configure connection pool for optimal performance
	db.SetMaxOpenConns(config.MaxOpenConns)
	db.SetMaxIdleConns(config.MaxIdleConns)
	db.SetConnMaxLifetime(config.ConnMaxLifetime)
	db.SetConnMaxIdleTime(config.ConnMaxIdleTime)

	// Test the connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, err
	}

	return &ConnectionPool{
		db:     db,
		config: config,
		logger: logger,
	}, nil
}

// CacheManager handles multi-level caching
type CacheManager struct {
	redis      *redis.Client
	memCache   *MemoryCache
	logger     *zap.Logger
	mu         sync.RWMutex
}

// MemoryCache provides in-memory caching with TTL
type MemoryCache struct {
	data   map[string]*CacheItem
	mu     sync.RWMutex
	ticker *time.Ticker
}

// CacheItem represents a cached item
type CacheItem struct {
	Value      interface{}
	ExpiresAt  time.Time
}

// NewCacheManager creates a multi-level cache manager
func NewCacheManager(redisClient *redis.Client, logger *zap.Logger) *CacheManager {
	memCache := &MemoryCache{
		data:   make(map[string]*CacheItem),
		ticker: time.NewTicker(30 * time.Second),
	}

	// Start cleanup goroutine for memory cache
	go memCache.cleanup()

	return &CacheManager{
		redis:    redisClient,
		memCache: memCache,
		logger:   logger,
	}
}

// Get retrieves item from cache (L1: memory, L2: Redis)
func (cm *CacheManager) Get(ctx context.Context, key string) (interface{}, bool) {
	// Check L1 cache (memory)
	if val, found := cm.memCache.Get(key); found {
		cacheHitRate.WithLabelValues("memory", "hit").Inc()
		return val, true
	}
	cacheHitRate.WithLabelValues("memory", "miss").Inc()

	// Check L2 cache (Redis)
	val, err := cm.redis.Get(ctx, key).Result()
	if err == nil {
		cacheHitRate.WithLabelValues("redis", "hit").Inc()
		// Store in L1 cache for faster access
		cm.memCache.Set(key, val, 5*time.Minute)
		return val, true
	}
	cacheHitRate.WithLabelValues("redis", "miss").Inc()

	return nil, false
}

// Set stores item in both cache levels
func (cm *CacheManager) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	// Store in L1 cache (memory)
	cm.memCache.Set(key, value, ttl)

	// Store in L2 cache (Redis)
	return cm.redis.Set(ctx, key, value, ttl).Err()
}

// Get retrieves item from memory cache
func (mc *MemoryCache) Get(key string) (interface{}, bool) {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	item, found := mc.data[key]
	if !found || time.Now().After(item.ExpiresAt) {
		return nil, false
	}
	return item.Value, true
}

// Set stores item in memory cache
func (mc *MemoryCache) Set(key string, value interface{}, ttl time.Duration) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	mc.data[key] = &CacheItem{
		Value:     value,
		ExpiresAt: time.Now().Add(ttl),
	}
}

// cleanup removes expired items from memory cache
func (mc *MemoryCache) cleanup() {
	for range mc.ticker.C {
		mc.mu.Lock()
		now := time.Now()
		for key, item := range mc.data {
			if now.After(item.ExpiresAt) {
				delete(mc.data, key)
			}
		}
		mc.mu.Unlock()
	}
}

// BatchProcessor handles batch processing of events
type BatchProcessor struct {
	batchSize     int
	flushInterval time.Duration
	processor     func([]interface{}) error
	buffer        []interface{}
	mu            sync.Mutex
	ticker        *time.Ticker
	logger        *zap.Logger
}

// NewBatchProcessor creates a new batch processor
func NewBatchProcessor(batchSize int, flushInterval time.Duration, processor func([]interface{}) error, logger *zap.Logger) *BatchProcessor {
	bp := &BatchProcessor{
		batchSize:     batchSize,
		flushInterval: flushInterval,
		processor:     processor,
		buffer:        make([]interface{}, 0, batchSize),
		ticker:        time.NewTicker(flushInterval),
		logger:        logger,
	}

	// Start flush goroutine
	go bp.flushPeriodically()

	return bp
}

// Add adds an item to the batch
func (bp *BatchProcessor) Add(item interface{}) error {
	bp.mu.Lock()
	defer bp.mu.Unlock()

	bp.buffer = append(bp.buffer, item)

	// Flush if batch is full
	if len(bp.buffer) >= bp.batchSize {
		return bp.flush()
	}

	return nil
}

// flush processes the current batch
func (bp *BatchProcessor) flush() error {
	if len(bp.buffer) == 0 {
		return nil
	}

	batch := bp.buffer
	bp.buffer = make([]interface{}, 0, bp.batchSize)

	// Process batch in goroutine for non-blocking operation
	go func() {
		if err := bp.processor(batch); err != nil {
			bp.logger.Error("Failed to process batch", zap.Error(err))
		}
	}()

	return nil
}

// flushPeriodically flushes the buffer at regular intervals
func (bp *BatchProcessor) flushPeriodically() {
	for range bp.ticker.C {
		bp.mu.Lock()
		if err := bp.flush(); err != nil {
			bp.logger.Error("Failed to flush batch", zap.Error(err))
		}
		bp.mu.Unlock()
	}
}

// MemoryOptimizer manages memory optimization
type MemoryOptimizer struct {
	logger *zap.Logger
	ticker *time.Ticker
}

// NewMemoryOptimizer creates a memory optimizer
func NewMemoryOptimizer(logger *zap.Logger) *MemoryOptimizer {
	mo := &MemoryOptimizer{
		logger: logger,
		ticker: time.NewTicker(30 * time.Second),
	}

	// Start monitoring goroutine
	go mo.monitor()

	return mo
}

// monitor tracks memory usage and triggers GC when needed
func (mo *MemoryOptimizer) monitor() {
	for range mo.ticker.C {
		var m runtime.MemStats
		runtime.ReadMemStats(&m)

		// Update metrics
		memoryUsage.Set(float64(m.Alloc))
		goroutineCount.Set(float64(runtime.NumGoroutine()))

		// Force GC if memory usage is high
		if m.Alloc > 500*1024*1024 { // 500MB threshold
			runtime.GC()
			mo.logger.Info("Forced garbage collection",
				zap.Uint64("memory_before", m.Alloc))

			runtime.ReadMemStats(&m)
			mo.logger.Info("Memory after GC",
				zap.Uint64("memory_after", m.Alloc))
		}
	}
}

// QueryOptimizer provides database query optimization
type QueryOptimizer struct {
	db     *sql.DB
	logger *zap.Logger
}

// NewQueryOptimizer creates a query optimizer
func NewQueryOptimizer(db *sql.DB, logger *zap.Logger) *QueryOptimizer {
	return &QueryOptimizer{
		db:     db,
		logger: logger,
	}
}

// CreateIndexes creates optimized indexes for common queries
func (qo *QueryOptimizer) CreateIndexes(ctx context.Context) error {
	indexes := []string{
		// Security events indexes
		`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC)`,
		`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_severity ON security_events(severity, timestamp DESC)`,
		`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_type ON security_events(event_type, timestamp DESC)`,

		// Alerts indexes
		`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_status ON alerts(status, created_at DESC)`,
		`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_severity ON alerts(severity, created_at DESC)`,

		// Kong monitoring indexes
		`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kong_metrics_timestamp ON kong_metrics(timestamp DESC)`,
		`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kong_metrics_service ON kong_metrics(service_id, timestamp DESC)`,

		// Composite indexes for common queries
		`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_composite ON security_events(timestamp DESC, severity, event_type)`,
		`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_composite ON alerts(created_at DESC, status, severity)`,
	}

	for _, index := range indexes {
		if _, err := qo.db.ExecContext(ctx, index); err != nil {
			qo.logger.Warn("Failed to create index",
				zap.String("index", index),
				zap.Error(err))
		}
	}

	// Analyze tables for query planner optimization
	tables := []string{"security_events", "alerts", "kong_metrics", "vulnerabilities", "assets"}
	for _, table := range tables {
		if _, err := qo.db.ExecContext(ctx, "ANALYZE "+table); err != nil {
			qo.logger.Warn("Failed to analyze table",
				zap.String("table", table),
				zap.Error(err))
		}
	}

	return nil
}

// OptimizeQuery adds query hints and optimizations
func (qo *QueryOptimizer) OptimizeQuery(query string) string {
	// Add query hints for better performance
	// This is a simplified example - real implementation would be more sophisticated
	return query
}

// EventProcessor handles high-throughput event processing
type EventProcessor struct {
	workers       int
	eventChan     chan interface{}
	processor     func(interface{}) error
	logger        *zap.Logger
	wg            sync.WaitGroup
	eventsPerSec  int64
	mu            sync.Mutex
}

// NewEventProcessor creates a high-performance event processor
func NewEventProcessor(workers int, bufferSize int, processor func(interface{}) error, logger *zap.Logger) *EventProcessor {
	ep := &EventProcessor{
		workers:   workers,
		eventChan: make(chan interface{}, bufferSize),
		processor: processor,
		logger:    logger,
	}

	// Start worker goroutines
	for i := 0; i < workers; i++ {
		ep.wg.Add(1)
		go ep.worker(i)
	}

	// Start metrics updater
	go ep.updateMetrics()

	return ep
}

// Process adds an event to the processing queue
func (ep *EventProcessor) Process(event interface{}) error {
	select {
	case ep.eventChan <- event:
		return nil
	default:
		return ErrQueueFull
	}
}

// worker processes events from the queue
func (ep *EventProcessor) worker(id int) {
	defer ep.wg.Done()

	for event := range ep.eventChan {
		start := time.Now()

		if err := ep.processor(event); err != nil {
			ep.logger.Error("Failed to process event",
				zap.Int("worker", id),
				zap.Error(err))
		}

		// Track processing rate
		ep.mu.Lock()
		ep.eventsPerSec++
		ep.mu.Unlock()

		// Record processing time
		processingTime := time.Since(start).Seconds()
		if processingTime > 0.1 { // Log slow processing
			ep.logger.Warn("Slow event processing",
				zap.Int("worker", id),
				zap.Float64("duration", processingTime))
		}
	}
}

// updateMetrics updates processing rate metrics
func (ep *EventProcessor) updateMetrics() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		ep.mu.Lock()
		rate := ep.eventsPerSec
		ep.eventsPerSec = 0
		ep.mu.Unlock()

		eventProcessingRate.Set(float64(rate))
	}
}

// Shutdown gracefully shuts down the event processor
func (ep *EventProcessor) Shutdown() {
	close(ep.eventChan)
	ep.wg.Wait()
}

// Errors
var (
	ErrQueueFull = &Error{Code: "QUEUE_FULL", Message: "Event queue is full"}
)

// Error represents a performance error
type Error struct {
	Code    string
	Message string
}

func (e *Error) Error() string {
	return e.Message
}
