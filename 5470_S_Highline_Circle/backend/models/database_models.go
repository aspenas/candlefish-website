package models

import (
	"database/sql/driver"
	"time"
	
	"github.com/google/uuid"
)

// Database models matching the SQLite schema in inventory_master.db

// DataSource model
type DataSource struct {
	ID            int       `json:"id" db:"id"`
	SourceName    string    `json:"source_name" db:"source_name"`
	SourceType    string    `json:"source_type" db:"source_type"`
	OriginalCount *int      `json:"original_count,omitempty" db:"original_count"`
	OriginalValue *float64  `json:"original_value,omitempty" db:"original_value"`
	ImportDate    time.Time `json:"import_date" db:"import_date"`
	FilePath      *string   `json:"file_path,omitempty" db:"file_path"`
	Notes         *string   `json:"notes,omitempty" db:"notes"`
}

// Room model matching SQLite schema
type DatabaseRoom struct {
	ID          int       `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Floor       *int      `json:"floor,omitempty" db:"floor"`
	SquareFeet  *int      `json:"square_feet,omitempty" db:"square_feet"`
	Description *string   `json:"description,omitempty" db:"description"`
	SortOrder   int       `json:"sort_order" db:"sort_order"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// Category model
type DatabaseCategory struct {
	ID               int       `json:"id" db:"id"`
	Name             string    `json:"name" db:"name"`
	ParentCategoryID *int      `json:"parent_category_id,omitempty" db:"parent_category_id"`
	Description      *string   `json:"description,omitempty" db:"description"`
	IsValuable       bool      `json:"is_valuable" db:"is_valuable"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}

// DatabaseItem model matching SQLite schema
type DatabaseItem struct {
	// Primary identification
	ID              int     `json:"id" db:"id"`
	UUID            string  `json:"uuid" db:"uuid"`
	MovingCompanyID *string `json:"moving_company_id,omitempty" db:"moving_company_id"`
	LegacyID        *int    `json:"legacy_id,omitempty" db:"legacy_id"`

	// Basic information
	Name        string  `json:"name" db:"name"`
	Description *string `json:"description,omitempty" db:"description"`
	CategoryID  *int    `json:"category_id,omitempty" db:"category_id"`
	RoomID      *int    `json:"room_id,omitempty" db:"room_id"`

	// Physical attributes
	Brand        *string  `json:"brand,omitempty" db:"brand"`
	Model        *string  `json:"model,omitempty" db:"model"`
	SerialNumber *string  `json:"serial_number,omitempty" db:"serial_number"`
	Color        *string  `json:"color,omitempty" db:"color"`
	Materials    *string  `json:"materials,omitempty" db:"materials"`
	Dimensions   *string  `json:"dimensions,omitempty" db:"dimensions"`
	WeightLbs    *float64 `json:"weight_lbs,omitempty" db:"weight_lbs"`

	// Condition and status
	Condition      string  `json:"condition" db:"condition"`
	ConditionNotes *string `json:"condition_notes,omitempty" db:"condition_notes"`
	IsFragile      bool    `json:"is_fragile" db:"is_fragile"`
	IsHighValue    bool    `json:"is_high_value" db:"is_high_value"`

	// Tracking
	Status        string  `json:"status" db:"status"`
	LocationNotes *string `json:"location_notes,omitempty" db:"location_notes"`
	BoxNumber     *string `json:"box_number,omitempty" db:"box_number"`

	// Valuation
	PurchasePrice     *float64   `json:"purchase_price,omitempty" db:"purchase_price"`
	PurchaseDate      *time.Time `json:"purchase_date,omitempty" db:"purchase_date"`
	EstimatedValue    *float64   `json:"estimated_value,omitempty" db:"estimated_value"`
	ReplacementCost   *float64   `json:"replacement_cost,omitempty" db:"replacement_cost"`
	ValuationDate     *time.Time `json:"valuation_date,omitempty" db:"valuation_date"`
	ValuationSource   *string    `json:"valuation_source,omitempty" db:"valuation_source"`

	// Metadata
	DataSourceID *int       `json:"data_source_id,omitempty" db:"data_source_id"`
	ImportedAt   *time.Time `json:"imported_at,omitempty" db:"imported_at"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
	CreatedBy    string     `json:"created_by" db:"created_by"`
	UpdatedBy    string     `json:"updated_by" db:"updated_by"`

	// Data integrity
	Checksum         *string    `json:"checksum,omitempty" db:"checksum"`
	IsVerified       bool       `json:"is_verified" db:"is_verified"`
	VerificationDate *time.Time `json:"verification_date,omitempty" db:"verification_date"`
	VerifiedBy       *string    `json:"verified_by,omitempty" db:"verified_by"`

	// Relations (populated by joins)
	RoomName     *string `json:"room_name,omitempty" db:"room_name"`
	CategoryName *string `json:"category_name,omitempty" db:"category_name"`
}

// Condition enum values
const (
	ConditionNew       = "New"
	ConditionLikeNew   = "Like New"
	ConditionExcellent = "Excellent"
	ConditionGood      = "Good"
	ConditionFair      = "Fair"
	ConditionPoor      = "Poor"
	ConditionDamaged   = "Damaged"
)

// Status enum values
const (
	StatusActive    = "Active"
	StatusSold      = "Sold"
	StatusDonated   = "Donated"
	StatusDisposed  = "Disposed"
	StatusLost      = "Lost"
	StatusInStorage = "In Storage"
)

// Helper method to convert to legacy Item model for API compatibility
func (d *DatabaseItem) ToLegacyItem() *Item {
	// Convert to legacy format for API compatibility
	legacyItem := &Item{
		Name:         d.Name,
		Description:  d.Description,
		PurchasePrice: d.PurchasePrice,
		PurchaseDate: d.PurchaseDate,
		CreatedAt:    d.CreatedAt,
		UpdatedAt:    d.UpdatedAt,
		Quantity:     1, // Default quantity
	}

	// Parse UUID if valid
	if parsed, err := parseUUID(d.UUID); err == nil {
		legacyItem.ID = parsed
	}

	// Map category
	if d.CategoryName != nil {
		legacyItem.Category = Category(*d.CategoryName)
	}

	// Map decision based on status
	switch d.Status {
	case StatusSold:
		legacyItem.Decision = DecisionSold
	case StatusDonated:
		legacyItem.Decision = DecisionDonated
	case StatusActive:
		// Default to unsure for active items
		legacyItem.Decision = DecisionUnsure
	default:
		legacyItem.Decision = DecisionUnsure
	}

	// Set asking price same as estimated value for now
	if d.EstimatedValue != nil {
		legacyItem.AskingPrice = d.EstimatedValue
	}

	return legacyItem
}

// Helper function to parse UUID
func parseUUID(uuidStr string) (uuid.UUID, error) {
	return uuid.Parse(uuidStr)
}

// Implement driver.Valuer for custom types
func (d DatabaseItem) Value() (driver.Value, error) {
	return nil, nil
}

// For API responses matching the existing frontend expectations
type ItemResponse struct {
	ID           string     `json:"id"`
	Name         string     `json:"name"`
	Category     string     `json:"category"`
	Decision     string     `json:"decision"`
	Price        *float64   `json:"price"`
	IsFixture    bool       `json:"is_fixture"`
	Source       *string    `json:"source"`
	InvoiceRef   *string    `json:"invoice_ref"`
	Room         string     `json:"room"`
	Floor        *int       `json:"floor"`
	HasImages    bool       `json:"has_images"`
	ImageCount   int        `json:"image_count"`
	PurchaseDate *string    `json:"purchase_date,omitempty"`
	CreatedAt    string     `json:"created_at"`
	Description  *string    `json:"description,omitempty"`
}

// Convert DatabaseItem to API response format
func (d *DatabaseItem) ToItemResponse() ItemResponse {
	response := ItemResponse{
		ID:        d.UUID,
		Name:      d.Name,
		Price:     d.PurchasePrice,
		IsFixture: false, // Default value
		HasImages: false, // Would need to query images table
		ImageCount: 0,    // Would need to count images
		CreatedAt: d.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		Description: d.Description,
	}

	// Set category
	if d.CategoryName != nil {
		response.Category = *d.CategoryName
	}

	// Set room
	if d.RoomName != nil {
		response.Room = *d.RoomName
	}

	// Map status to decision
	switch d.Status {
	case StatusSold:
		response.Decision = "Sold"
	case StatusDonated:
		response.Decision = "Donated"
	case StatusActive:
		response.Decision = "Unsure" // Default for active items
	default:
		response.Decision = "Unsure"
	}

	// Format purchase date
	if d.PurchaseDate != nil {
		dateStr := d.PurchaseDate.Format("2006-01-02")
		response.PurchaseDate = &dateStr
	}

	return response
}