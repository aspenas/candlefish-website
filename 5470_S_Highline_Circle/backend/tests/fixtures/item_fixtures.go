package fixtures

import (
	"time"

	"github.com/google/uuid"
	"github.com/patricksmith/highline-inventory/models"
)

// ItemBuilder provides a fluent interface for creating test items
type ItemBuilder struct {
	item *models.Item
}

// NewItemBuilder creates a new item builder with default values
func NewItemBuilder() *ItemBuilder {
	return &ItemBuilder{
		item: &models.Item{
			ID:       uuid.New(),
			RoomID:   uuid.New(),
			Name:     "Test Item",
			Category: models.CategoryFurniture,
			Decision: models.DecisionKeep,
			Quantity: 1,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}
}

// WithID sets the item ID
func (b *ItemBuilder) WithID(id uuid.UUID) *ItemBuilder {
	b.item.ID = id
	return b
}

// WithName sets the item name
func (b *ItemBuilder) WithName(name string) *ItemBuilder {
	b.item.Name = name
	return b
}

// WithCategory sets the item category
func (b *ItemBuilder) WithCategory(category models.Category) *ItemBuilder {
	b.item.Category = category
	return b
}

// WithPurchasePrice sets the purchase price
func (b *ItemBuilder) WithPurchasePrice(price float64) *ItemBuilder {
	b.item.PurchasePrice = &price
	return b
}

// WithPurchaseDate sets the purchase date
func (b *ItemBuilder) WithPurchaseDate(date time.Time) *ItemBuilder {
	b.item.PurchaseDate = &date
	return b
}

// WithCondition sets the condition
func (b *ItemBuilder) WithCondition(condition string) *ItemBuilder {
	b.item.Condition = &condition
	return b
}

// WithSource sets the source/brand
func (b *ItemBuilder) WithSource(source string) *ItemBuilder {
	b.item.Source = &source
	return b
}

// WithAskingPrice sets the asking price
func (b *ItemBuilder) WithAskingPrice(price float64) *ItemBuilder {
	b.item.AskingPrice = &price
	return b
}

// WithDecision sets the decision status
func (b *ItemBuilder) WithDecision(decision models.DecisionStatus) *ItemBuilder {
	b.item.Decision = decision
	return b
}

// WithDescription sets the description
func (b *ItemBuilder) WithDescription(description string) *ItemBuilder {
	b.item.Description = &description
	return b
}

// Build returns the constructed item
func (b *ItemBuilder) Build() *models.Item {
	return b.item
}

// Predefined test items for common scenarios

// TestFurnitureItem returns a typical furniture item for testing
func TestFurnitureItem() *models.Item {
	return NewItemBuilder().
		WithName("Modern Sofa").
		WithCategory(models.CategoryFurniture).
		WithPurchasePrice(1200.00).
		WithPurchaseDate(time.Now().Add(-6 * 30 * 24 * time.Hour)). // 6 months ago
		WithCondition("good").
		WithSource("West Elm").
		WithAskingPrice(1000.00).
		Build()
}

// TestElectronicsItem returns a typical electronics item for testing
func TestElectronicsItem() *models.Item {
	return NewItemBuilder().
		WithName("Smart TV 55 inch").
		WithCategory(models.CategoryElectronics).
		WithPurchasePrice(800.00).
		WithPurchaseDate(time.Now().Add(-2 * 365 * 24 * time.Hour)). // 2 years ago
		WithCondition("excellent").
		WithSource("Samsung").
		WithAskingPrice(500.00).
		Build()
}

// TestArtDecorItem returns a typical art/decor item for testing
func TestArtDecorItem() *models.Item {
	return NewItemBuilder().
		WithName("Abstract Canvas Painting").
		WithCategory(models.CategoryArtDecor).
		WithPurchasePrice(300.00).
		WithPurchaseDate(time.Now().Add(-12 * 30 * 24 * time.Hour)). // 1 year ago
		WithCondition("excellent").
		WithSource("Local Artist").
		WithAskingPrice(250.00).
		Build()
}

// TestLightingItem returns a typical lighting item for testing
func TestLightingItem() *models.Item {
	return NewItemBuilder().
		WithName("Pendant Light Fixture").
		WithCategory(models.CategoryLighting).
		WithPurchasePrice(150.00).
		WithPurchaseDate(time.Now().Add(-8 * 30 * 24 * time.Hour)). // 8 months ago
		WithCondition("very good").
		WithSource("Pottery Barn").
		WithAskingPrice(120.00).
		Build()
}

// TestItemWithoutPurchasePrice returns an item without purchase price for testing error cases
func TestItemWithoutPurchasePrice() *models.Item {
	return NewItemBuilder().
		WithName("Mystery Item").
		WithCategory(models.CategoryOther).
		WithCondition("good").
		Build()
}

// TestExpensiveItem returns a high-value item for testing
func TestExpensiveItem() *models.Item {
	return NewItemBuilder().
		WithName("Designer Dining Table").
		WithCategory(models.CategoryFurniture).
		WithPurchasePrice(5000.00).
		WithPurchaseDate(time.Now().Add(-3 * 30 * 24 * time.Hour)). // 3 months ago
		WithCondition("excellent").
		WithSource("Restoration Hardware").
		WithAskingPrice(4500.00).
		Build()
}

// TestOldItem returns an item that's several years old for depreciation testing
func TestOldItem() *models.Item {
	return NewItemBuilder().
		WithName("Vintage Armchair").
		WithCategory(models.CategoryFurniture).
		WithPurchasePrice(600.00).
		WithPurchaseDate(time.Now().Add(-5 * 365 * 24 * time.Hour)). // 5 years ago
		WithCondition("fair").
		WithSource("Antique Store").
		WithAskingPrice(200.00).
		Build()
}

// TestMultipleItemsForRoom returns a slice of items for testing room-level operations
func TestMultipleItemsForRoom(roomID uuid.UUID) []*models.Item {
	items := []*models.Item{
		NewItemBuilder().
			WithName("Living Room Sofa").
			WithCategory(models.CategoryFurniture).
			WithPurchasePrice(1500.00).
			WithCondition("good").
			WithSource("West Elm").
			Build(),
		NewItemBuilder().
			WithName("Coffee Table").
			WithCategory(models.CategoryFurniture).
			WithPurchasePrice(400.00).
			WithCondition("excellent").
			WithSource("IKEA").
			Build(),
		NewItemBuilder().
			WithName("Table Lamp").
			WithCategory(models.CategoryLighting).
			WithPurchasePrice(80.00).
			WithCondition("good").
			WithSource("Target").
			Build(),
		NewItemBuilder().
			WithName("Wall Art").
			WithCategory(models.CategoryArtDecor).
			WithPurchasePrice(120.00).
			WithCondition("excellent").
			WithSource("Etsy").
			Build(),
	}
	
	// Set the same room ID for all items
	for _, item := range items {
		item.RoomID = roomID
	}
	
	return items
}

// TestItemCategories returns one item from each category for testing
func TestItemCategories() map[models.Category]*models.Item {
	return map[models.Category]*models.Item{
		models.CategoryFurniture: NewItemBuilder().
			WithName("Dining Chair").
			WithCategory(models.CategoryFurniture).
			WithPurchasePrice(200.00).
			WithCondition("good").
			Build(),
		models.CategoryArtDecor: NewItemBuilder().
			WithName("Decorative Vase").
			WithCategory(models.CategoryArtDecor).
			WithPurchasePrice(50.00).
			WithCondition("excellent").
			Build(),
		models.CategoryElectronics: NewItemBuilder().
			WithName("Bluetooth Speaker").
			WithCategory(models.CategoryElectronics).
			WithPurchasePrice(100.00).
			WithCondition("good").
			Build(),
		models.CategoryLighting: NewItemBuilder().
			WithName("Floor Lamp").
			WithCategory(models.CategoryLighting).
			WithPurchasePrice(75.00).
			WithCondition("very good").
			Build(),
		models.CategoryRugCarpet: NewItemBuilder().
			WithName("Area Rug").
			WithCategory(models.CategoryRugCarpet).
			WithPurchasePrice(300.00).
			WithCondition("good").
			Build(),
		models.CategoryPlantIndoor: NewItemBuilder().
			WithName("Fiddle Leaf Fig").
			WithCategory(models.CategoryPlantIndoor).
			WithPurchasePrice(40.00).
			WithCondition("excellent").
			Build(),
		models.CategoryPlanterIndoor: NewItemBuilder().
			WithName("Ceramic Planter").
			WithCategory(models.CategoryPlanterIndoor).
			WithPurchasePrice(25.00).
			WithCondition("good").
			Build(),
		models.CategoryOther: NewItemBuilder().
			WithName("Storage Box").
			WithCategory(models.CategoryOther).
			WithPurchasePrice(15.00).
			WithCondition("good").
			Build(),
	}
}

// TestItemsWithDifferentConditions returns items with various conditions for testing
func TestItemsWithDifferentConditions() map[string]*models.Item {
	baseBuilder := NewItemBuilder().
		WithName("Test Item").
		WithCategory(models.CategoryFurniture).
		WithPurchasePrice(1000.00).
		WithSource("Test Brand")
	
	return map[string]*models.Item{
		"excellent": baseBuilder.WithCondition("excellent").Build(),
		"very_good": baseBuilder.WithCondition("very good").Build(),
		"good":      baseBuilder.WithCondition("good").Build(),
		"fair":      baseBuilder.WithCondition("fair").Build(),
		"poor":      baseBuilder.WithCondition("poor").Build(),
	}
}