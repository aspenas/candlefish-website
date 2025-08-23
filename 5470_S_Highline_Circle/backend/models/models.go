package models

import (
	"database/sql/driver"
	"time"

	"github.com/google/uuid"
)

// Category enum
type Category string

const (
	CategoryFurniture      Category = "Furniture"
	CategoryArtDecor       Category = "Art / Decor"
	CategoryElectronics    Category = "Electronics"
	CategoryLighting       Category = "Lighting"
	CategoryRugCarpet      Category = "Rug / Carpet"
	CategoryPlantIndoor    Category = "Plant (Indoor)"
	CategoryPlanterIndoor  Category = "Planter (Indoor)"
	CategoryOutdoorPlanter Category = "Outdoor Planter/Plant"
	CategoryPlanterAccess  Category = "Planter Accessory"
	CategoryOther          Category = "Other"
)

// DecisionStatus enum
type DecisionStatus string

const (
	DecisionKeep    DecisionStatus = "Keep"
	DecisionSell    DecisionStatus = "Sell"
	DecisionUnsure  DecisionStatus = "Unsure"
	DecisionSold    DecisionStatus = "Sold"
	DecisionDonated DecisionStatus = "Donated"
)

// FloorLevel enum
type FloorLevel string

const (
	FloorLower   FloorLevel = "Lower Level"
	FloorMain    FloorLevel = "Main Floor"
	FloorUpper   FloorLevel = "Upper Floor"
	FloorOutdoor FloorLevel = "Outdoor"
	FloorGarage  FloorLevel = "Garage"
)

// Room model
type Room struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	Name          string     `json:"name" db:"name"`
	Floor         FloorLevel `json:"floor" db:"floor"`
	SquareFootage *int       `json:"square_footage,omitempty" db:"square_footage"`
	Description   *string    `json:"description,omitempty" db:"description"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`

	// Computed fields
	ItemCount   int     `json:"item_count,omitempty" db:"item_count"`
	TotalValue  float64 `json:"total_value,omitempty" db:"total_value"`
}

// Item model
type Item struct {
	ID                   uuid.UUID      `json:"id" db:"id"`
	RoomID               uuid.UUID      `json:"room_id" db:"room_id"`
	Name                 string         `json:"name" db:"name"`
	Description          *string        `json:"description,omitempty" db:"description"`
	Category             Category       `json:"category" db:"category"`
	Decision             DecisionStatus `json:"decision" db:"decision"`
	PurchasePrice        *float64       `json:"purchase_price,omitempty" db:"purchase_price"`
	InvoiceRef           *string        `json:"invoice_ref,omitempty" db:"invoice_ref"`
	DesignerInvoicePrice *float64       `json:"designer_invoice_price,omitempty" db:"designer_invoice_price"`
	AskingPrice          *float64       `json:"asking_price,omitempty" db:"asking_price"`
	SoldPrice            *float64       `json:"sold_price,omitempty" db:"sold_price"`
	Quantity             int            `json:"quantity" db:"quantity"`
	IsFixture            bool           `json:"is_fixture" db:"is_fixture"`
	Source               *string        `json:"source,omitempty" db:"source"`
	PlacementNotes       *string        `json:"placement_notes,omitempty" db:"placement_notes"`
	Condition            *string        `json:"condition,omitempty" db:"condition"`
	PurchaseDate         *time.Time     `json:"purchase_date,omitempty" db:"purchase_date"`
	CreatedAt            time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at" db:"updated_at"`

	// Relations
	Room   *Room    `json:"room,omitempty"`
	Images []Image  `json:"images,omitempty"`
	Plant  *Plant   `json:"plant,omitempty"`
}

// Image model
type Image struct {
	ID           uuid.UUID `json:"id" db:"id"`
	ItemID       uuid.UUID `json:"item_id" db:"item_id"`
	URL          string    `json:"url" db:"url"`
	ThumbnailURL *string   `json:"thumbnail_url,omitempty" db:"thumbnail_url"`
	Caption      *string   `json:"caption,omitempty" db:"caption"`
	IsPrimary    bool      `json:"is_primary" db:"is_primary"`
	UploadedAt   time.Time `json:"uploaded_at" db:"uploaded_at"`
}

// Transaction model
type Transaction struct {
	ID              uuid.UUID `json:"id" db:"id"`
	ItemID          uuid.UUID `json:"item_id" db:"item_id"`
	TransactionType string    `json:"transaction_type" db:"transaction_type"`
	Amount          float64   `json:"amount" db:"amount"`
	TransactionDate time.Time `json:"transaction_date" db:"transaction_date"`
	PartyName       *string   `json:"party_name,omitempty" db:"party_name"`
	Notes           *string   `json:"notes,omitempty" db:"notes"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`

	// Relations
	Item *Item `json:"item,omitempty"`
}

// Plant model
type Plant struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	ItemID           uuid.UUID  `json:"item_id" db:"item_id"`
	PlantType        *string    `json:"plant_type,omitempty" db:"plant_type"`
	PlanterType      *string    `json:"planter_type,omitempty" db:"planter_type"`
	IndoorOutdoor    *string    `json:"indoor_outdoor,omitempty" db:"indoor_outdoor"`
	CareInstructions *string    `json:"care_instructions,omitempty" db:"care_instructions"`
	LastMaintenance  *time.Time `json:"last_maintenance,omitempty" db:"last_maintenance"`
	NextMaintenance  *time.Time `json:"next_maintenance,omitempty" db:"next_maintenance"`
}

// Summary models for analytics
type RoomSummary struct {
	ID                 uuid.UUID  `json:"id" db:"id"`
	Name               string     `json:"name" db:"name"`
	Floor              FloorLevel `json:"floor" db:"floor"`
	ItemCount          int        `json:"item_count" db:"item_count"`
	KeepCount          int        `json:"keep_count" db:"keep_count"`
	SellCount          int        `json:"sell_count" db:"sell_count"`
	UnsureCount        int        `json:"unsure_count" db:"unsure_count"`
	TotalPurchaseValue float64    `json:"total_purchase_value" db:"total_purchase_value"`
	TotalAskingValue   float64    `json:"total_asking_value" db:"total_asking_value"`
}

type CategorySummary struct {
	Category           Category `json:"category" db:"category"`
	ItemCount          int      `json:"item_count" db:"item_count"`
	TotalPurchaseValue float64  `json:"total_purchase_value" db:"total_purchase_value"`
	TotalAskingValue   float64  `json:"total_asking_value" db:"total_asking_value"`
	AvgPurchasePrice   float64  `json:"avg_purchase_price" db:"avg_purchase_price"`
	AvgAskingPrice     float64  `json:"avg_asking_price" db:"avg_asking_price"`
}

type BuyerView struct {
	Room                 string   `json:"room" db:"room"`
	Item                 string   `json:"item" db:"item"`
	Category             Category `json:"category" db:"category"`
	Price                float64  `json:"price" db:"price"`
	DesignerInvoicePrice *float64 `json:"designer_invoice_price,omitempty" db:"designer_invoice_price"`
	Notes                *string  `json:"notes,omitempty" db:"notes"`
	InvoiceRef           *string  `json:"invoice_ref,omitempty" db:"invoice_ref"`
	Source               *string  `json:"source,omitempty" db:"source"`
}

// Activity types
type ActivityAction string

const (
	ActivityViewed      ActivityAction = "viewed"
	ActivityUpdated     ActivityAction = "updated"
	ActivityCreated     ActivityAction = "created"
	ActivityDeleted     ActivityAction = "deleted"
	ActivityDecided     ActivityAction = "decided"
	ActivityBulkUpdate  ActivityAction = "bulk_updated"
	ActivityExported    ActivityAction = "exported"
	ActivityImported    ActivityAction = "imported"
)

// Activity model for user-friendly activity tracking
type Activity struct {
	ID          uuid.UUID      `json:"id" db:"id"`
	Action      ActivityAction `json:"action" db:"action"`
	ItemID      *uuid.UUID     `json:"item_id,omitempty" db:"item_id"`
	ItemName    *string        `json:"item_name,omitempty" db:"item_name"`
	RoomName    *string        `json:"room_name,omitempty" db:"room_name"`
	Details     *string        `json:"details,omitempty" db:"details"`
	OldValue    *string        `json:"old_value,omitempty" db:"old_value"`
	NewValue    *string        `json:"new_value,omitempty" db:"new_value"`
	UserID      *string        `json:"user_id,omitempty" db:"user_id"`
	CreatedAt   time.Time      `json:"created_at" db:"created_at"`

	// Relations
	Item *Item `json:"item,omitempty"`
}

// Filter request model
type FilterRequest struct {
	Rooms      []string         `json:"rooms"`
	Categories []Category       `json:"categories"`
	Decisions  []DecisionStatus `json:"decisions"`
	MinPrice   *float64         `json:"min_price"`
	MaxPrice   *float64         `json:"max_price"`
	IsFixture  *bool            `json:"is_fixture"`
	Source     *string          `json:"source"`
	SortBy     string           `json:"sort_by"`
	SortOrder  string           `json:"sort_order"`
	Page       int              `json:"page"`
	Limit      int              `json:"limit"`
}

// Search request model
type SearchRequest struct {
	Query     string   `json:"query"`
	Rooms     []string `json:"rooms"`
	Page      int      `json:"page"`
	Limit     int      `json:"limit"`
}

// Bulk update request
type BulkUpdateRequest struct {
	ItemIDs  []uuid.UUID    `json:"item_ids"`
	Decision *DecisionStatus `json:"decision,omitempty"`
	AskingPrice *float64    `json:"asking_price,omitempty"`
}

// Implement driver.Valuer for custom types
func (c Category) Value() (driver.Value, error) {
	return string(c), nil
}

func (d DecisionStatus) Value() (driver.Value, error) {
	return string(d), nil
}

func (f FloorLevel) Value() (driver.Value, error) {
	return string(f), nil
}

func (a ActivityAction) Value() (driver.Value, error) {
	return string(a), nil
}

// Collaboration types

// InterestLevel enum
type InterestLevel string

const (
	InterestHigh   InterestLevel = "high"
	InterestMedium InterestLevel = "medium"
	InterestLow    InterestLevel = "low"
	InterestNone   InterestLevel = "none"
)

// BundleStatus enum
type BundleStatus string

const (
	BundleDraft     BundleStatus = "draft"
	BundleProposed  BundleStatus = "proposed"
	BundleAccepted  BundleStatus = "accepted"
	BundleRejected  BundleStatus = "rejected"
	BundleWithdrawn BundleStatus = "withdrawn"
)

// UserRole enum
type UserRole string

const (
	RoleOwner UserRole = "owner"
	RoleBuyer UserRole = "buyer"
)

// ItemNote model for collaboration
type ItemNote struct {
	ID        uuid.UUID `json:"id" db:"id"`
	ItemID    uuid.UUID `json:"item_id" db:"item_id"`
	Author    UserRole  `json:"author" db:"author"`
	Note      string    `json:"note" db:"note"`
	IsPrivate bool      `json:"is_private" db:"is_private"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`

	// Relations
	Item *Item `json:"item,omitempty"`
}

// BuyerInterest model for tracking buyer interest in items
type BuyerInterest struct {
	ID            uuid.UUID     `json:"id" db:"id"`
	ItemID        uuid.UUID     `json:"item_id" db:"item_id"`
	InterestLevel InterestLevel `json:"interest_level" db:"interest_level"`
	MaxPrice      *float64      `json:"max_price,omitempty" db:"max_price"`
	Notes         *string       `json:"notes,omitempty" db:"notes"`
	CreatedAt     time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at" db:"updated_at"`

	// Relations
	Item *Item `json:"item,omitempty"`
}

// BundleProposal model for grouped item proposals
type BundleProposal struct {
	ID         uuid.UUID    `json:"id" db:"id"`
	Name       string       `json:"name" db:"name"`
	ProposedBy UserRole     `json:"proposed_by" db:"proposed_by"`
	TotalPrice *float64     `json:"total_price,omitempty" db:"total_price"`
	Status     BundleStatus `json:"status" db:"status"`
	Notes      *string      `json:"notes,omitempty" db:"notes"`
	CreatedAt  time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time    `json:"updated_at" db:"updated_at"`

	// Relations
	Items []Item `json:"items,omitempty"`
}

// BundleItem junction model
type BundleItem struct {
	BundleID uuid.UUID `json:"bundle_id" db:"bundle_id"`
	ItemID   uuid.UUID `json:"item_id" db:"item_id"`

	// Relations
	Bundle *BundleProposal `json:"bundle,omitempty"`
	Item   *Item           `json:"item,omitempty"`
}

// CollaborationOverview model for dashboard view
type CollaborationOverview struct {
	ItemID           uuid.UUID      `json:"item_id" db:"item_id"`
	ItemName         string         `json:"item_name" db:"item_name"`
	RoomName         string         `json:"room_name" db:"room_name"`
	Category         Category       `json:"category" db:"category"`
	Decision         DecisionStatus `json:"decision" db:"decision"`
	AskingPrice      *float64       `json:"asking_price,omitempty" db:"asking_price"`
	InterestLevel    *InterestLevel `json:"interest_level,omitempty" db:"interest_level"`
	BuyerMaxPrice    *float64       `json:"buyer_max_price,omitempty" db:"buyer_max_price"`
	PublicNotes      int            `json:"public_notes" db:"public_notes"`
	PrivateNotes     int            `json:"private_notes" db:"private_notes"`
	InBundles        int            `json:"in_bundles" db:"in_bundles"`
	ItemUpdated      time.Time      `json:"item_updated" db:"item_updated"`
	InterestUpdated  *time.Time     `json:"interest_updated,omitempty" db:"interest_updated"`
}

// Request/Response models for collaboration

// NoteRequest for creating/updating notes
type NoteRequest struct {
	Note      string `json:"note" binding:"required"`
	IsPrivate bool   `json:"is_private"`
}

// InterestRequest for setting buyer interest
type InterestRequest struct {
	InterestLevel InterestLevel `json:"interest_level" binding:"required"`
	MaxPrice      *float64      `json:"max_price,omitempty"`
	Notes         *string       `json:"notes,omitempty"`
}

// BundleRequest for creating bundles
type BundleRequest struct {
	Name       string      `json:"name" binding:"required"`
	ItemIDs    []uuid.UUID `json:"item_ids" binding:"required"`
	TotalPrice *float64    `json:"total_price,omitempty"`
	Notes      *string     `json:"notes,omitempty"`
}

// BundleUpdateRequest for updating bundle status
type BundleUpdateRequest struct {
	Status     *BundleStatus `json:"status,omitempty"`
	TotalPrice *float64      `json:"total_price,omitempty"`
	Notes      *string       `json:"notes,omitempty"`
}

// Implement driver.Valuer for new custom types
func (i InterestLevel) Value() (driver.Value, error) {
	return string(i), nil
}

func (b BundleStatus) Value() (driver.Value, error) {
	return string(b), nil
}

func (u UserRole) Value() (driver.Value, error) {
	return string(u), nil
}
