package repositories

import (
	"context"
	"database/sql"
	"fmt"
	
	"github.com/jmoiron/sqlx"
)

// BaseRepository provides common database operations
type BaseRepository struct {
	db *sqlx.DB
}

// NewBaseRepository creates a new base repository
func NewBaseRepository(db *sqlx.DB) *BaseRepository {
	return &BaseRepository{db: db}
}

// BeginTx starts a new database transaction
func (r *BaseRepository) BeginTx(ctx context.Context) (*sqlx.Tx, error) {
	return r.db.BeginTxx(ctx, nil)
}

// WithTx executes a function within a transaction
func (r *BaseRepository) WithTx(ctx context.Context, fn func(*sqlx.Tx) error) error {
	tx, err := r.BeginTx(ctx)
	if err != nil {
		return fmt.Errorf("beginning transaction: %w", err)
	}
	
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		}
	}()
	
	if err := fn(tx); err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			return fmt.Errorf("tx failed: %v, unable to rollback: %v", err, rbErr)
		}
		return err
	}
	
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("committing transaction: %w", err)
	}
	
	return nil
}

// Exists checks if a record exists
func (r *BaseRepository) Exists(ctx context.Context, query string, args ...interface{}) (bool, error) {
	var exists bool
	err := r.db.GetContext(ctx, &exists, query, args...)
	if err != nil && err != sql.ErrNoRows {
		return false, err
	}
	return exists, nil
}