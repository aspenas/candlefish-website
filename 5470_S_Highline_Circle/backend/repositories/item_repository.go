package repositories

import (
	"context"
	"database/sql"
	"fmt"
	
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/patricksmith/highline-inventory/domain/models"
)

// ItemRepository defines the interface for item data access
type ItemRepository interface {
	GetAll(ctx context.Context, filters ItemFilters) ([]models.Item, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.Item, error)
	GetByRoom(ctx context.Context, roomID int) ([]models.Item, error)
	Create(ctx context.Context, item *models.Item) error
	Update(ctx context.Context, item *models.Item) error
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
	BulkUpdate(ctx context.Context, items []models.Item) error
	Search(ctx context.Context, query string) ([]models.Item, error)
	GetStats(ctx context.Context) (*ItemStats, error)
}

// ItemFilters represents filters for querying items
type ItemFilters struct {
	RoomID     *int
	Category   *string
	Status     *string
	MinValue   *float64
	MaxValue   *float64
	SearchTerm *string
	Limit      int
	Offset     int
}

// ItemStats represents aggregate statistics for items
type ItemStats struct {
	TotalCount     int     `db:"total_count"`
	TotalValue     float64 `db:"total_value"`
	AvgValue       float64 `db:"avg_value"`
	CategoryCounts map[string]int
	RoomCounts     map[int]int
}

// itemRepository implements ItemRepository
type itemRepository struct {
	*BaseRepository
}

// NewItemRepository creates a new item repository
func NewItemRepository(db *sqlx.DB) ItemRepository {
	return &itemRepository{
		BaseRepository: NewBaseRepository(db),
	}
}

// GetAll retrieves all items with optional filters
func (r *itemRepository) GetAll(ctx context.Context, filters ItemFilters) ([]models.Item, error) {
	query := `
		SELECT 
			i.id, i.name, i.description, i.category, i.quantity,
			i.purchase_price, i.current_value, i.room_id, i.status,
			i.barcode, i.qr_code, i.serial_number, i.model_number,
			i.manufacturer, i.notes, i.tags, i.metadata,
			i.created_at, i.updated_at,
			r.name as room_name, r.floor as room_floor
		FROM items i
		LEFT JOIN rooms r ON i.room_id = r.id
		WHERE 1=1
	`
	
	args := []interface{}{}
	argCount := 0
	
	if filters.RoomID != nil {
		argCount++
		query += fmt.Sprintf(" AND i.room_id = $%d", argCount)
		args = append(args, *filters.RoomID)
	}
	
	if filters.Category != nil {
		argCount++
		query += fmt.Sprintf(" AND i.category = $%d", argCount)
		args = append(args, *filters.Category)
	}
	
	if filters.Status != nil {
		argCount++
		query += fmt.Sprintf(" AND i.status = $%d", argCount)
		args = append(args, *filters.Status)
	}
	
	if filters.MinValue != nil {
		argCount++
		query += fmt.Sprintf(" AND i.current_value >= $%d", argCount)
		args = append(args, *filters.MinValue)
	}
	
	if filters.MaxValue != nil {
		argCount++
		query += fmt.Sprintf(" AND i.current_value <= $%d", argCount)
		args = append(args, *filters.MaxValue)
	}
	
	if filters.SearchTerm != nil && *filters.SearchTerm != "" {
		argCount++
		query += fmt.Sprintf(" AND (i.name ILIKE $%d OR i.description ILIKE $%d OR i.notes ILIKE $%d)", 
			argCount, argCount, argCount)
		searchPattern := "%" + *filters.SearchTerm + "%"
		args = append(args, searchPattern)
	}
	
	query += " ORDER BY i.updated_at DESC"
	
	if filters.Limit > 0 {
		argCount++
		query += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, filters.Limit)
		
		if filters.Offset > 0 {
			argCount++
			query += fmt.Sprintf(" OFFSET $%d", argCount)
			args = append(args, filters.Offset)
		}
	}
	
	var items []models.Item
	err := r.db.SelectContext(ctx, &items, query, args...)
	if err != nil {
		return nil, fmt.Errorf("fetching items: %w", err)
	}
	
	return items, nil
}

// GetByID retrieves a single item by ID
func (r *itemRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Item, error) {
	query := `
		SELECT 
			i.*, 
			r.name as room_name, 
			r.floor as room_floor
		FROM items i
		LEFT JOIN rooms r ON i.room_id = r.id
		WHERE i.id = $1
	`
	
	var item models.Item
	err := r.db.GetContext(ctx, &item, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("item not found: %w", err)
		}
		return nil, fmt.Errorf("fetching item: %w", err)
	}
	
	return &item, nil
}

// GetByRoom retrieves all items in a specific room
func (r *itemRepository) GetByRoom(ctx context.Context, roomID int) ([]models.Item, error) {
	query := `
		SELECT * FROM items 
		WHERE room_id = $1 
		ORDER BY name
	`
	
	var items []models.Item
	err := r.db.SelectContext(ctx, &items, query, roomID)
	if err != nil {
		return nil, fmt.Errorf("fetching items by room: %w", err)
	}
	
	return items, nil
}

// Create inserts a new item
func (r *itemRepository) Create(ctx context.Context, item *models.Item) error {
	if item.ID == uuid.Nil {
		item.ID = uuid.New()
	}
	
	query := `
		INSERT INTO items (
			id, name, description, category, quantity, 
			purchase_price, current_value, room_id, status,
			barcode, qr_code, serial_number, model_number,
			manufacturer, notes, tags, metadata
		) VALUES (
			:id, :name, :description, :category, :quantity,
			:purchase_price, :current_value, :room_id, :status,
			:barcode, :qr_code, :serial_number, :model_number,
			:manufacturer, :notes, :tags, :metadata
		)
	`
	
	_, err := r.db.NamedExecContext(ctx, query, item)
	if err != nil {
		return fmt.Errorf("creating item: %w", err)
	}
	
	return nil
}

// Update modifies an existing item
func (r *itemRepository) Update(ctx context.Context, item *models.Item) error {
	query := `
		UPDATE items SET
			name = :name,
			description = :description,
			category = :category,
			quantity = :quantity,
			purchase_price = :purchase_price,
			current_value = :current_value,
			room_id = :room_id,
			status = :status,
			barcode = :barcode,
			qr_code = :qr_code,
			serial_number = :serial_number,
			model_number = :model_number,
			manufacturer = :manufacturer,
			notes = :notes,
			tags = :tags,
			metadata = :metadata,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = :id
	`
	
	result, err := r.db.NamedExecContext(ctx, query, item)
	if err != nil {
		return fmt.Errorf("updating item: %w", err)
	}
	
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("checking update result: %w", err)
	}
	
	if rows == 0 {
		return fmt.Errorf("item not found")
	}
	
	return nil
}

// Delete removes an item
func (r *itemRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM items WHERE id = $1`
	
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("deleting item: %w", err)
	}
	
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("checking delete result: %w", err)
	}
	
	if rows == 0 {
		return fmt.Errorf("item not found")
	}
	
	return nil
}

// UpdateStatus updates the status of an item
func (r *itemRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `
		UPDATE items 
		SET status = $2, updated_at = CURRENT_TIMESTAMP 
		WHERE id = $1
	`
	
	result, err := r.db.ExecContext(ctx, query, id, status)
	if err != nil {
		return fmt.Errorf("updating item status: %w", err)
	}
	
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("checking status update result: %w", err)
	}
	
	if rows == 0 {
		return fmt.Errorf("item not found")
	}
	
	return nil
}

// BulkUpdate updates multiple items in a transaction
func (r *itemRepository) BulkUpdate(ctx context.Context, items []models.Item) error {
	return r.WithTx(ctx, func(tx *sqlx.Tx) error {
		query := `
			UPDATE items SET
				name = :name,
				description = :description,
				category = :category,
				quantity = :quantity,
				current_value = :current_value,
				room_id = :room_id,
				status = :status,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = :id
		`
		
		for _, item := range items {
			_, err := tx.NamedExecContext(ctx, query, item)
			if err != nil {
				return fmt.Errorf("updating item %s: %w", item.ID, err)
			}
		}
		
		return nil
	})
}

// Search performs a full-text search on items
func (r *itemRepository) Search(ctx context.Context, searchTerm string) ([]models.Item, error) {
	query := `
		SELECT i.*, r.name as room_name, r.floor as room_floor
		FROM items i
		LEFT JOIN rooms r ON i.room_id = r.id
		WHERE 
			i.name ILIKE $1 OR 
			i.description ILIKE $1 OR 
			i.category ILIKE $1 OR
			i.manufacturer ILIKE $1 OR
			i.notes ILIKE $1 OR
			i.serial_number ILIKE $1 OR
			i.model_number ILIKE $1
		ORDER BY i.updated_at DESC
		LIMIT 100
	`
	
	searchPattern := "%" + searchTerm + "%"
	var items []models.Item
	err := r.db.SelectContext(ctx, &items, query, searchPattern)
	if err != nil {
		return nil, fmt.Errorf("searching items: %w", err)
	}
	
	return items, nil
}

// GetStats returns aggregate statistics for items
func (r *itemRepository) GetStats(ctx context.Context) (*ItemStats, error) {
	stats := &ItemStats{
		CategoryCounts: make(map[string]int),
		RoomCounts:     make(map[int]int),
	}
	
	// Get basic stats
	statsQuery := `
		SELECT 
			COUNT(*) as total_count,
			COALESCE(SUM(current_value * quantity), 0) as total_value,
			COALESCE(AVG(current_value), 0) as avg_value
		FROM items
		WHERE status = 'Active'
	`
	
	err := r.db.GetContext(ctx, stats, statsQuery)
	if err != nil {
		return nil, fmt.Errorf("fetching item stats: %w", err)
	}
	
	// Get category counts
	categoryQuery := `
		SELECT category, COUNT(*) as count
		FROM items
		WHERE status = 'Active'
		GROUP BY category
	`
	
	rows, err := r.db.QueryContext(ctx, categoryQuery)
	if err != nil {
		return nil, fmt.Errorf("fetching category counts: %w", err)
	}
	defer rows.Close()
	
	for rows.Next() {
		var category string
		var count int
		if err := rows.Scan(&category, &count); err != nil {
			return nil, fmt.Errorf("scanning category count: %w", err)
		}
		stats.CategoryCounts[category] = count
	}
	
	// Get room counts
	roomQuery := `
		SELECT room_id, COUNT(*) as count
		FROM items
		WHERE status = 'Active'
		GROUP BY room_id
	`
	
	rows, err = r.db.QueryContext(ctx, roomQuery)
	if err != nil {
		return nil, fmt.Errorf("fetching room counts: %w", err)
	}
	defer rows.Close()
	
	for rows.Next() {
		var roomID int
		var count int
		if err := rows.Scan(&roomID, &count); err != nil {
			return nil, fmt.Errorf("scanning room count: %w", err)
		}
		stats.RoomCounts[roomID] = count
	}
	
	return stats, nil
}