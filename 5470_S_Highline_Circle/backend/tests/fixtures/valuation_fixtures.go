package fixtures

import (
	"time"

	"github.com/google/uuid"
	"github.com/patricksmith/highline-inventory/models"
)

// ValuationBuilder provides a fluent interface for creating test valuations
type ValuationBuilder struct {
	valuation *models.ItemValuation
}

// NewValuationBuilder creates a new valuation builder with default values
func NewValuationBuilder() *ValuationBuilder {
	return &ValuationBuilder{
		valuation: &models.ItemValuation{
			ID:              uuid.New(),
			ItemID:          uuid.New(),
			ValuationMethod: models.ValuationDepreciationModel,
			EstimatedValue:  1000.00,
			ConfidenceScore: floatPtr(0.8),
			ValuerType:      stringPtr("system"),
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
			ExpiresAt:       timePtr(time.Now().Add(30 * 24 * time.Hour)),
		},
	}
}

// WithID sets the valuation ID
func (b *ValuationBuilder) WithID(id uuid.UUID) *ValuationBuilder {
	b.valuation.ID = id
	return b
}

// WithItemID sets the item ID
func (b *ValuationBuilder) WithItemID(itemID uuid.UUID) *ValuationBuilder {
	b.valuation.ItemID = itemID
	return b
}

// WithMethod sets the valuation method
func (b *ValuationBuilder) WithMethod(method models.ValuationMethod) *ValuationBuilder {
	b.valuation.ValuationMethod = method
	return b
}

// WithValue sets the estimated value
func (b *ValuationBuilder) WithValue(value float64) *ValuationBuilder {
	b.valuation.EstimatedValue = value
	return b
}

// WithConfidence sets the confidence score
func (b *ValuationBuilder) WithConfidence(confidence float64) *ValuationBuilder {
	b.valuation.ConfidenceScore = &confidence
	return b
}

// WithDepreciation sets depreciation-related fields
func (b *ValuationBuilder) WithDepreciation(rate float64, ageMonths int, conditionFactor float64) *ValuationBuilder {
	b.valuation.DepreciationRate = &rate
	b.valuation.EstimatedAgeMonths = &ageMonths
	b.valuation.ConditionFactor = &conditionFactor
	return b
}

// WithNotes sets the notes
func (b *ValuationBuilder) WithNotes(notes string) *ValuationBuilder {
	b.valuation.Notes = &notes
	return b
}

// WithExpiration sets the expiration time
func (b *ValuationBuilder) WithExpiration(expiresAt time.Time) *ValuationBuilder {
	b.valuation.ExpiresAt = &expiresAt
	return b
}

// Build returns the constructed valuation
func (b *ValuationBuilder) Build() *models.ItemValuation {
	return b.valuation
}

// MarketComparisonBuilder provides a fluent interface for creating test market comparisons
type MarketComparisonBuilder struct {
	comparison *models.MarketComparison
}

// NewMarketComparisonBuilder creates a new market comparison builder with default values
func NewMarketComparisonBuilder() *MarketComparisonBuilder {
	return &MarketComparisonBuilder{
		comparison: &models.MarketComparison{
			ID:             uuid.New(),
			ItemID:         uuid.New(),
			Source:         models.MarketSourceEbay,
			Title:          "Test Item",
			Price:          floatPtr(500.00),
			SimilarityScore: floatPtr(0.7),
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		},
	}
}

// WithItemID sets the item ID
func (b *MarketComparisonBuilder) WithItemID(itemID uuid.UUID) *MarketComparisonBuilder {
	b.comparison.ItemID = itemID
	return b
}

// WithSource sets the market source
func (b *MarketComparisonBuilder) WithSource(source models.MarketSource) *MarketComparisonBuilder {
	b.comparison.Source = source
	return b
}

// WithTitle sets the title
func (b *MarketComparisonBuilder) WithTitle(title string) *MarketComparisonBuilder {
	b.comparison.Title = title
	return b
}

// WithPrice sets the price
func (b *MarketComparisonBuilder) WithPrice(price float64) *MarketComparisonBuilder {
	b.comparison.Price = &price
	return b
}

// WithCondition sets the condition
func (b *MarketComparisonBuilder) WithCondition(condition string) *MarketComparisonBuilder {
	b.comparison.Condition = &condition
	return b
}

// WithSimilarity sets the similarity score
func (b *MarketComparisonBuilder) WithSimilarity(score float64) *MarketComparisonBuilder {
	b.comparison.SimilarityScore = &score
	return b
}

// WithURL sets the source URL
func (b *MarketComparisonBuilder) WithURL(url string) *MarketComparisonBuilder {
	b.comparison.SourceURL = &url
	return b
}

// WithDescription sets the description
func (b *MarketComparisonBuilder) WithDescription(description string) *MarketComparisonBuilder {
	b.comparison.Description = &description
	return b
}

// WithLocation sets the location
func (b *MarketComparisonBuilder) WithLocation(location string) *MarketComparisonBuilder {
	b.comparison.Location = &location
	return b
}

// WithDates sets listing and sold dates
func (b *MarketComparisonBuilder) WithDates(listingDate, soldDate *time.Time) *MarketComparisonBuilder {
	b.comparison.ListingDate = listingDate
	b.comparison.SoldDate = soldDate
	return b
}

// Build returns the constructed market comparison
func (b *MarketComparisonBuilder) Build() *models.MarketComparison {
	return b.comparison
}

// CurrentValuationBuilder provides a fluent interface for creating test current valuations
type CurrentValuationBuilder struct {
	valuation *models.CurrentValuation
}

// NewCurrentValuationBuilder creates a new current valuation builder with default values
func NewCurrentValuationBuilder() *CurrentValuationBuilder {
	return &CurrentValuationBuilder{
		valuation: &models.CurrentValuation{
			ItemID:         uuid.New(),
			ValuationID:    uuid.New(),
			ValuationMethod: models.ValuationMarketLookup,
			EstimatedValue: 800.00,
			ConfidenceScore: floatPtr(0.85),
			ValuationDate:  time.Now(),
			ItemName:       "Test Item",
			PurchasePrice:  floatPtr(1000.00),
			AskingPrice:    floatPtr(750.00),
			ValueChangePercent: floatPtr(-20.0),
		},
	}
}

// WithItemID sets the item ID
func (b *CurrentValuationBuilder) WithItemID(itemID uuid.UUID) *CurrentValuationBuilder {
	b.valuation.ItemID = itemID
	return b
}

// WithValue sets the estimated value
func (b *CurrentValuationBuilder) WithValue(value float64) *CurrentValuationBuilder {
	b.valuation.EstimatedValue = value
	return b
}

// WithItemName sets the item name
func (b *CurrentValuationBuilder) WithItemName(name string) *CurrentValuationBuilder {
	b.valuation.ItemName = name
	return b
}

// WithPrices sets purchase and asking prices
func (b *CurrentValuationBuilder) WithPrices(purchasePrice, askingPrice float64) *CurrentValuationBuilder {
	b.valuation.PurchasePrice = &purchasePrice
	b.valuation.AskingPrice = &askingPrice
	
	// Calculate value change percent
	changePercent := ((b.valuation.EstimatedValue - purchasePrice) / purchasePrice) * 100
	b.valuation.ValueChangePercent = &changePercent
	
	return b
}

// WithMethod sets the valuation method
func (b *CurrentValuationBuilder) WithMethod(method models.ValuationMethod) *CurrentValuationBuilder {
	b.valuation.ValuationMethod = method
	return b
}

// WithConfidence sets the confidence score
func (b *CurrentValuationBuilder) WithConfidence(confidence float64) *CurrentValuationBuilder {
	b.valuation.ConfidenceScore = &confidence
	return b
}

// Build returns the constructed current valuation
func (b *CurrentValuationBuilder) Build() *models.CurrentValuation {
	return b.valuation
}

// Predefined test valuations for common scenarios

// TestDepreciationValuation returns a depreciation-based valuation
func TestDepreciationValuation(itemID uuid.UUID) *models.ItemValuation {
	return NewValuationBuilder().
		WithItemID(itemID).
		WithMethod(models.ValuationDepreciationModel).
		WithValue(850.00).
		WithConfidence(0.9).
		WithDepreciation(0.15, 12, 0.85).
		WithNotes("12-month depreciation with good condition factor").
		Build()
}

// TestMarketValuation returns a market lookup-based valuation
func TestMarketValuation(itemID uuid.UUID) *models.ItemValuation {
	return NewValuationBuilder().
		WithItemID(itemID).
		WithMethod(models.ValuationMarketLookup).
		WithValue(750.00).
		WithConfidence(0.82).
		WithNotes("Based on 8 market comparisons").
		Build()
}

// TestProfessionalValuation returns a professional appraisal
func TestProfessionalValuation(itemID uuid.UUID) *models.ItemValuation {
	return NewValuationBuilder().
		WithItemID(itemID).
		WithMethod(models.ValuationProfessionalAppraisal).
		WithValue(1200.00).
		WithConfidence(0.95).
		WithNotes("Professional appraisal by certified appraiser").
		Build()
}

// TestExpiredValuation returns an expired valuation
func TestExpiredValuation(itemID uuid.UUID) *models.ItemValuation {
	return NewValuationBuilder().
		WithItemID(itemID).
		WithMethod(models.ValuationDepreciationModel).
		WithValue(600.00).
		WithConfidence(0.7).
		WithExpiration(time.Now().Add(-24 * time.Hour)). // Expired yesterday
		WithNotes("Expired valuation for testing").
		Build()
}

// TestEbayComparisons returns sample eBay market comparisons
func TestEbayComparisons(itemID uuid.UUID) []*models.MarketComparison {
	return []*models.MarketComparison{
		NewMarketComparisonBuilder().
			WithItemID(itemID).
			WithSource(models.MarketSourceEbay).
			WithTitle("Modern Sofa - Excellent Condition").
			WithPrice(1200.00).
			WithCondition("excellent").
			WithSimilarity(0.92).
			WithURL("https://ebay.com/item/123456").
			WithDescription("Beautiful modern sofa in excellent condition").
			WithLocation("Los Angeles, CA").
			Build(),
		NewMarketComparisonBuilder().
			WithItemID(itemID).
			WithSource(models.MarketSourceEbay).
			WithTitle("West Elm Sofa - Good Condition").
			WithPrice(850.00).
			WithCondition("good").
			WithSimilarity(0.88).
			WithURL("https://ebay.com/item/123457").
			WithDescription("West Elm modern sofa, minor wear").
			WithLocation("New York, NY").
			Build(),
		NewMarketComparisonBuilder().
			WithItemID(itemID).
			WithSource(models.MarketSourceEbay).
			WithTitle("Similar Style Sofa").
			WithPrice(600.00).
			WithCondition("fair").
			WithSimilarity(0.75).
			WithURL("https://ebay.com/item/123458").
			WithDescription("Similar style sofa, some wear").
			WithLocation("Chicago, IL").
			Build(),
	}
}

// TestChairishComparisons returns sample Chairish market comparisons
func TestChairishComparisons(itemID uuid.UUID) []*models.MarketComparison {
	return []*models.MarketComparison{
		NewMarketComparisonBuilder().
			WithItemID(itemID).
			WithSource(models.MarketSourceChairish).
			WithTitle("Mid-Century Modern Sofa").
			WithPrice(1500.00).
			WithCondition("excellent").
			WithSimilarity(0.85).
			WithURL("https://chairish.com/product/123456").
			WithDescription("Authentic mid-century modern sofa").
			WithLocation("San Francisco, CA").
			Build(),
		NewMarketComparisonBuilder().
			WithItemID(itemID).
			WithSource(models.MarketSourceChairish).
			WithTitle("Designer Sofa - Vintage").
			WithPrice(1100.00).
			WithCondition("very good").
			WithSimilarity(0.78).
			WithURL("https://chairish.com/product/123457").
			WithDescription("Designer vintage sofa with original fabric").
			WithLocation("Portland, OR").
			Build(),
	}
}

// TestMixedSourceComparisons returns comparisons from multiple sources
func TestMixedSourceComparisons(itemID uuid.UUID) []*models.MarketComparison {
	comparisons := []*models.MarketComparison{}
	comparisons = append(comparisons, TestEbayComparisons(itemID)...)
	comparisons = append(comparisons, TestChairishComparisons(itemID)...)
	
	// Add Facebook Marketplace comparison
	comparisons = append(comparisons, NewMarketComparisonBuilder().
		WithItemID(itemID).
		WithSource(models.MarketSourceFacebookMarketplace).
		WithTitle("Modern Couch for Sale").
		WithPrice(400.00).
		WithCondition("good").
		WithSimilarity(0.65).
		WithDescription("Moving sale - modern couch").
		WithLocation("Austin, TX").
		Build())
	
	return comparisons
}

// TestPriceHistory returns sample price history entries
func TestPriceHistory(itemID uuid.UUID) []*models.PriceHistory {
	now := time.Now()
	
	return []*models.PriceHistory{
		{
			ID:            uuid.New(),
			ItemID:        itemID,
			PriceType:     "purchase",
			Price:         1200.00,
			ChangeReason:  stringPtr("initial_purchase"),
			SourceType:    stringPtr("owner"),
			EffectiveDate: now.Add(-12 * 30 * 24 * time.Hour), // 1 year ago
			CreatedAt:     now.Add(-12 * 30 * 24 * time.Hour),
		},
		{
			ID:            uuid.New(),
			ItemID:        itemID,
			PriceType:     "valuation",
			Price:         1000.00,
			ChangeReason:  stringPtr("depreciation_model"),
			SourceType:    stringPtr("system"),
			EffectiveDate: now.Add(-6 * 30 * 24 * time.Hour), // 6 months ago
			CreatedAt:     now.Add(-6 * 30 * 24 * time.Hour),
		},
		{
			ID:            uuid.New(),
			ItemID:        itemID,
			PriceType:     "asking",
			Price:         900.00,
			ChangeReason:  stringPtr("owner_adjustment"),
			SourceType:    stringPtr("owner"),
			EffectiveDate: now.Add(-3 * 30 * 24 * time.Hour), // 3 months ago
			CreatedAt:     now.Add(-3 * 30 * 24 * time.Hour),
		},
		{
			ID:            uuid.New(),
			ItemID:        itemID,
			PriceType:     "valuation",
			Price:         850.00,
			ChangeReason:  stringPtr("market_lookup"),
			SourceType:    stringPtr("system"),
			EffectiveDate: now.Add(-1 * 24 * time.Hour), // Yesterday
			CreatedAt:     now.Add(-1 * 24 * time.Hour),
		},
	}
}

// TestValuationRequest returns a sample valuation request
func TestValuationRequest(itemID uuid.UUID) *models.ValuationRequest {
	return &models.ValuationRequest{
		ID:                  uuid.New(),
		ItemID:              itemID,
		RequestedBy:         &models.RoleOwner,
		RequestType:         "market_lookup",
		Status:              "pending",
		Priority:            1,
		EstimatedCompletion: timePtr(time.Now().Add(2 * time.Hour)),
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}
}

// TestCompletedValuationRequest returns a completed valuation request
func TestCompletedValuationRequest(itemID uuid.UUID) *models.ValuationRequest {
	results := `{"valuation_id": "12345", "estimated_value": 850.00, "confidence_score": 0.82, "comparisons_found": 8}`
	
	return &models.ValuationRequest{
		ID:          uuid.New(),
		ItemID:      itemID,
		RequestedBy: &models.RoleOwner,
		RequestType: "market_lookup",
		Status:      "completed",
		Priority:    1,
		CompletedAt: timePtr(time.Now().Add(-30 * time.Minute)),
		Results:     &results,
		CreatedAt:   time.Now().Add(-2 * time.Hour),
		UpdatedAt:   time.Now().Add(-30 * time.Minute),
	}
}

// TestRoomValuationSummary returns a sample room valuation summary
func TestRoomValuationSummary(roomID uuid.UUID) *models.RoomValuationSummary {
	return &models.RoomValuationSummary{
		RoomID:              roomID,
		RoomName:            "Living Room",
		Floor:               models.FloorMain,
		ItemsWithValuations: 5,
		TotalPurchaseValue:  floatPtr(3500.00),
		TotalEstimatedValue: floatPtr(2800.00),
		AvgConfidence:       floatPtr(0.83),
		TotalAppreciation:   floatPtr(-700.00),
		AppreciationPercent: floatPtr(-20.0),
	}
}

// Helper functions
func floatPtr(f float64) *float64 {
	return &f
}

func stringPtr(s string) *string {
	return &s
}

func timePtr(t time.Time) *time.Time {
	return &t
}