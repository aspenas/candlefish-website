package services

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/google/uuid"
)

// DatabaseOptimizer provides optimized database operations
type DatabaseOptimizer struct {
	db              *sqlx.DB
	preparedStmts   map[string]*sql.Stmt
	stmtMutex       sync.RWMutex
	connectionPool  *ConnectionPool
}

// ConnectionPool manages database connections efficiently
type ConnectionPool struct {
	maxOpenConns    int
	maxIdleConns    int
	connMaxLifetime time.Duration
	connMaxIdleTime time.Duration
}

// NewDatabaseOptimizer creates an optimized database handler
func NewDatabaseOptimizer(db *sqlx.DB) *DatabaseOptimizer {
	optimizer := &DatabaseOptimizer{
		db:            db,
		preparedStmts: make(map[string]*sql.Stmt),
		connectionPool: &ConnectionPool{
			maxOpenConns:    25,
			maxIdleConns:    10,
			connMaxLifetime: 1 * time.Hour,
			connMaxIdleTime: 10 * time.Minute,
		},
	}
	
	// Configure connection pool
	db.SetMaxOpenConns(optimizer.connectionPool.maxOpenConns)
	db.SetMaxIdleConns(optimizer.connectionPool.maxIdleConns)
	db.SetConnMaxLifetime(optimizer.connectionPool.connMaxLifetime)
	db.SetConnMaxIdleTime(optimizer.connectionPool.connMaxIdleTime)
	
	// Pre-prepare frequently used statements
	optimizer.prepareFrquentStatements()
	
	return optimizer
}

// prepareFrquentStatements pre-compiles frequently used queries
func (d *DatabaseOptimizer) prepareFrquentStatements() error {
	statements := map[string]string{
		"getCurrentValuation": `
			SELECT item_id, valuation_id, valuation_method, estimated_value, 
				   confidence_score, valuation_date, expires_at, item_name,
				   purchase_price, asking_price, value_change_percent
			FROM current_valuations 
			WHERE item_id = $1`,
		
		"getItemsByRoom": `
			SELECT id, name, category, room_id, purchase_price, 
				   condition, photo_count, created_at
			FROM items 
			WHERE room_id = $1 
			ORDER BY created_at DESC`,
		
		"getPriceHistory": `
			SELECT id, item_id, price_type, price, change_reason, 
				   source_type, effective_date
			FROM price_history 
			WHERE item_id = $1 
			ORDER BY effective_date DESC 
			LIMIT $2`,
		
		"getMarketComparisons": `
			SELECT id, item_id, source, listing_title, price, 
				   condition, similarity_score, url, created_at
			FROM market_comparisons 
			WHERE item_id = $1 
			ORDER BY similarity_score DESC NULLS LAST 
			LIMIT $2`,
	}
	
	for name, query := range statements {
		stmt, err := d.db.Prepare(query)
		if err != nil {
			log.Printf("Failed to prepare statement %s: %v", name, err)
			continue
		}
		d.preparedStmts[name] = stmt
	}
	
	return nil
}

// GetPreparedStmt retrieves a prepared statement safely
func (d *DatabaseOptimizer) GetPreparedStmt(name string) (*sql.Stmt, bool) {
	d.stmtMutex.RLock()
	defer d.stmtMutex.RUnlock()
	stmt, exists := d.preparedStmts[name]
	return stmt, exists
}

// BatchGetCurrentValuations retrieves multiple valuations in a single query
func (d *DatabaseOptimizer) BatchGetCurrentValuations(ctx context.Context, itemIDs []uuid.UUID) (map[uuid.UUID]interface{}, error) {
	if len(itemIDs) == 0 {
		return make(map[uuid.UUID]interface{}), nil
	}
	
	// Use ANY for efficient batch querying
	query := `
		SELECT item_id, valuation_id, valuation_method, estimated_value, 
			   confidence_score, valuation_date, expires_at, item_name,
			   purchase_price, asking_price, value_change_percent
		FROM current_valuations 
		WHERE item_id = ANY($1::uuid[])`
	
	rows, err := d.db.QueryContext(ctx, query, itemIDs)
	if err != nil {
		return nil, fmt.Errorf("batch get current valuations failed: %w", err)
	}
	defer rows.Close()
	
	results := make(map[uuid.UUID]interface{})
	for rows.Next() {
		var valuation struct {
			ItemID             uuid.UUID
			ValuationID        uuid.UUID
			ValuationMethod    string
			EstimatedValue     float64
			ConfidenceScore    *float64
			ValuationDate      time.Time
			ExpiresAt          *time.Time
			ItemName           string
			PurchasePrice      *float64
			AskingPrice        *float64
			ValueChangePercent *float64
		}
		
		if err := rows.Scan(
			&valuation.ItemID,
			&valuation.ValuationID,
			&valuation.ValuationMethod,
			&valuation.EstimatedValue,
			&valuation.ConfidenceScore,
			&valuation.ValuationDate,
			&valuation.ExpiresAt,
			&valuation.ItemName,
			&valuation.PurchasePrice,
			&valuation.AskingPrice,
			&valuation.ValueChangePercent,
		); err != nil {
			continue
		}
		
		results[valuation.ItemID] = valuation
	}
	
	return results, nil
}

// OptimizedPricingInsights retrieves pricing insights with optimized queries
func (d *DatabaseOptimizer) OptimizedPricingInsights(ctx context.Context) (map[string]interface{}, error) {
	// Use CTEs for complex aggregations
	query := `
		WITH room_stats AS (
			SELECT 
				r.id as room_id,
				r.name as room_name,
				COUNT(i.id) as item_count,
				COUNT(cv.item_id) as items_with_valuations,
				COALESCE(SUM(i.purchase_price), 0) as total_purchase_value,
				COALESCE(SUM(cv.estimated_value), 0) as total_estimated_value,
				AVG(cv.confidence_score) as avg_confidence
			FROM rooms r
			LEFT JOIN items i ON r.id = i.room_id
			LEFT JOIN current_valuations cv ON i.id = cv.item_id
			GROUP BY r.id, r.name
		),
		market_trends AS (
			SELECT 
				category,
				AVG(price_change_7d) as avg_7d_change,
				AVG(price_change_30d) as avg_30d_change,
				COUNT(*) as data_points
			FROM market_data
			WHERE updated_at > NOW() - INTERVAL '7 days'
			GROUP BY category
		),
		top_performers AS (
			SELECT 
				cv.item_id,
				cv.item_name,
				cv.estimated_value,
				cv.purchase_price,
				cv.value_change_percent,
				ROW_NUMBER() OVER (ORDER BY cv.value_change_percent DESC NULLS LAST) as rank
			FROM current_valuations cv
			WHERE cv.purchase_price > 0 AND cv.value_change_percent IS NOT NULL
		)
		SELECT 
			json_build_object(
				'room_summaries', COALESCE(json_agg(DISTINCT rs.*), '[]'::json),
				'market_trends', COALESCE(json_agg(DISTINCT mt.*), '[]'::json),
				'top_performers', COALESCE(json_agg(DISTINCT tp.*) FILTER (WHERE tp.rank <= 10), '[]'::json),
				'total_items', (SELECT COUNT(*) FROM items),
				'items_with_valuations', (SELECT COUNT(DISTINCT item_id) FROM current_valuations),
				'total_purchase_value', (SELECT COALESCE(SUM(purchase_price), 0) FROM items WHERE purchase_price IS NOT NULL),
				'total_current_value', (SELECT COALESCE(SUM(estimated_value), 0) FROM current_valuations)
			) as insights
		FROM room_stats rs
		CROSS JOIN market_trends mt
		CROSS JOIN top_performers tp
		WHERE tp.rank <= 10`
	
	var result map[string]interface{}
	err := d.db.GetContext(ctx, &result, query)
	
	return result, err
}

// CreateIndexes creates optimized database indexes
func (d *DatabaseOptimizer) CreateIndexes(ctx context.Context) error {
	indexes := []string{
		// Current valuations indexes
		`CREATE INDEX IF NOT EXISTS idx_current_valuations_item_id ON current_valuations(item_id)`,
		`CREATE INDEX IF NOT EXISTS idx_current_valuations_expires_at ON current_valuations(expires_at) WHERE expires_at IS NOT NULL`,
		`CREATE INDEX IF NOT EXISTS idx_current_valuations_confidence ON current_valuations(confidence_score) WHERE confidence_score IS NOT NULL`,
		
		// Items indexes
		`CREATE INDEX IF NOT EXISTS idx_items_room_id ON items(room_id)`,
		`CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)`,
		`CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_items_purchase_price ON items(purchase_price) WHERE purchase_price IS NOT NULL`,
		
		// Price history indexes
		`CREATE INDEX IF NOT EXISTS idx_price_history_item_id ON price_history(item_id)`,
		`CREATE INDEX IF NOT EXISTS idx_price_history_effective_date ON price_history(effective_date DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_price_history_type ON price_history(price_type)`,
		
		// Market comparisons indexes
		`CREATE INDEX IF NOT EXISTS idx_market_comparisons_item_id ON market_comparisons(item_id)`,
		`CREATE INDEX IF NOT EXISTS idx_market_comparisons_similarity ON market_comparisons(similarity_score DESC NULLS LAST)`,
		`CREATE INDEX IF NOT EXISTS idx_market_comparisons_source ON market_comparisons(source)`,
		`CREATE INDEX IF NOT EXISTS idx_market_comparisons_created ON market_comparisons(created_at DESC)`,
		
		// Composite indexes for common queries
		`CREATE INDEX IF NOT EXISTS idx_items_room_category ON items(room_id, category)`,
		`CREATE INDEX IF NOT EXISTS idx_valuations_item_method ON item_valuations(item_id, valuation_method)`,
		`CREATE INDEX IF NOT EXISTS idx_market_item_source ON market_comparisons(item_id, source)`,
		
		// Partial indexes for filtered queries
		`CREATE INDEX IF NOT EXISTS idx_items_high_value ON items(purchase_price DESC) WHERE purchase_price > 1000`,
		`CREATE INDEX IF NOT EXISTS idx_valuations_high_confidence ON current_valuations(confidence_score DESC) WHERE confidence_score > 0.7`,
		
		// GIN indexes for full-text search
		`CREATE INDEX IF NOT EXISTS idx_items_name_gin ON items USING gin(to_tsvector('english', name))`,
		`CREATE INDEX IF NOT EXISTS idx_items_description_gin ON items USING gin(to_tsvector('english', COALESCE(description, '')))`,
	}
	
	for _, idx := range indexes {
		if _, err := d.db.ExecContext(ctx, idx); err != nil {
			log.Printf("Failed to create index: %v", err)
			// Continue with other indexes
		}
	}
	
	// Analyze tables for query planner optimization
	tables := []string{"items", "current_valuations", "item_valuations", "price_history", "market_comparisons"}
	for _, table := range tables {
		if _, err := d.db.ExecContext(ctx, fmt.Sprintf("ANALYZE %s", table)); err != nil {
			log.Printf("Failed to analyze table %s: %v", table, err)
		}
	}
	
	return nil
}

// VacuumDatabase performs maintenance operations
func (d *DatabaseOptimizer) VacuumDatabase(ctx context.Context) error {
	// VACUUM reclaims storage and updates statistics
	queries := []string{
		"VACUUM ANALYZE items",
		"VACUUM ANALYZE current_valuations",
		"VACUUM ANALYZE item_valuations",
		"VACUUM ANALYZE price_history",
		"VACUUM ANALYZE market_comparisons",
	}
	
	for _, query := range queries {
		if _, err := d.db.ExecContext(ctx, query); err != nil {
			log.Printf("Vacuum failed for query: %s, error: %v", query, err)
		}
	}
	
	return nil
}

// OptimizedBulkInsert performs efficient bulk insertions
func (d *DatabaseOptimizer) OptimizedBulkInsert(ctx context.Context, table string, data [][]interface{}) error {
	if len(data) == 0 {
		return nil
	}
	
	tx, err := d.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	
	// Use COPY for maximum performance
	stmt, err := tx.PreparexContext(ctx, fmt.Sprintf("COPY %s FROM STDIN", table))
	if err != nil {
		return err
	}
	defer stmt.Close()
	
	for _, row := range data {
		if _, err := stmt.ExecContext(ctx, row...); err != nil {
			return err
		}
	}
	
	return tx.Commit()
}

// QueryWithTimeout executes query with timeout and retry logic
func (d *DatabaseOptimizer) QueryWithTimeout(ctx context.Context, timeout time.Duration, query string, args ...interface{}) (*sql.Rows, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	
	// Retry logic for transient failures
	maxRetries := 3
	var lastErr error
	
	for i := 0; i < maxRetries; i++ {
		rows, err := d.db.QueryContext(ctx, query, args...)
		if err == nil {
			return rows, nil
		}
		
		lastErr = err
		
		// Check if error is retryable
		if !isRetryableError(err) {
			return nil, err
		}
		
		// Exponential backoff
		time.Sleep(time.Duration(1<<uint(i)) * 100 * time.Millisecond)
	}
	
	return nil, fmt.Errorf("query failed after %d retries: %w", maxRetries, lastErr)
}

// isRetryableError checks if an error is retryable
func isRetryableError(err error) bool {
	if err == nil {
		return false
	}
	
	// Check for common retryable database errors
	errStr := err.Error()
	retryableErrors := []string{
		"connection reset",
		"broken pipe",
		"deadlock",
		"timeout",
		"too many connections",
	}
	
	for _, retryable := range retryableErrors {
		if contains(errStr, retryable) {
			return true
		}
	}
	
	return false
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && s[0:len(substr)] == substr
}

// Close cleans up resources
func (d *DatabaseOptimizer) Close() error {
	d.stmtMutex.Lock()
	defer d.stmtMutex.Unlock()
	
	for name, stmt := range d.preparedStmts {
		if err := stmt.Close(); err != nil {
			log.Printf("Failed to close statement %s: %v", name, err)
		}
	}
	
	return nil
}