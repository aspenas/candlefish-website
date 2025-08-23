package handlers

import (
	"database/sql"
	"math"
	"math/rand"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// AIInsight represents an AI-generated insight
type AIInsight struct {
	ID          string      `json:"id"`
	Type        string      `json:"type"`
	Priority    string      `json:"priority"`
	Title       string      `json:"title"`
	Description string      `json:"description"`
	Impact      string      `json:"impact"`
	Action      string      `json:"action"`
	Value       float64     `json:"value,omitempty"`
	ItemIDs     []string    `json:"itemIds,omitempty"`
	Confidence  float64     `json:"confidence"`
	CreatedAt   time.Time   `json:"createdAt"`
}

// PriceOptimization represents price optimization suggestion
type PriceOptimization struct {
	ItemID           string    `json:"itemId"`
	CurrentPrice     float64   `json:"currentPrice"`
	SuggestedPrice   float64   `json:"suggestedPrice"`
	PriceRange       []float64 `json:"priceRange"`
	MarketComparison string    `json:"marketComparison"`
	Confidence       float64   `json:"confidence"`
	Reasoning        string    `json:"reasoning"`
}

// MarketAnalysis represents market analysis for a category
type MarketAnalysis struct {
	Category        string    `json:"category"`
	MarketTrend     string    `json:"marketTrend"`
	DemandLevel     string    `json:"demandLevel"`
	PriceDirection  string    `json:"priceDirection"`
	SeasonalFactors []string  `json:"seasonalFactors"`
	Recommendations []string  `json:"recommendations"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// GetAIInsights generates AI-powered insights based on inventory data
func (h *Handler) GetAIInsights(c *fiber.Ctx) error {
	// Check if database is available
	if h.db == nil {
		// Return mock data for demo
		return c.JSON(fiber.Map{
			"insights": h.getMockInsights(),
			"totalCount": 6,
			"generatedAt": time.Now(),
		})
	}

	// Fetch all items for analysis
	rows, err := h.db.Query(`
		SELECT id, name, category, purchase_price, decision, condition, room_id
		FROM items
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch items"})
	}
	defer rows.Close()

	var items []map[string]interface{}
	for rows.Next() {
		var item map[string]interface{} = make(map[string]interface{})
		var id, name, category, decisionStatus string
		var purchasePrice sql.NullFloat64
		var condition sql.NullString
		var roomID sql.NullString

		err := rows.Scan(&id, &name, &category, &purchasePrice, &decisionStatus, &condition, &roomID)
		if err != nil {
			continue
		}

		item["id"] = id
		item["name"] = name
		item["category"] = category
		if purchasePrice.Valid {
			item["estimatedValue"] = purchasePrice.Float64
		} else {
			item["estimatedValue"] = 0.0
		}
		item["decisionStatus"] = decisionStatus
		if condition.Valid {
			item["condition"] = condition.String
		} else {
			item["condition"] = "unknown"
		}
		if roomID.Valid {
			item["roomId"] = roomID.String
		}

		items = append(items, item)
	}

	// Generate insights based on data patterns
	insights := h.generateInsights(items)

	return c.JSON(fiber.Map{
		"insights":   insights,
		"totalCount": len(insights),
		"generatedAt": time.Now(),
	})
}

// generateInsights creates AI insights from item data
func (h *Handler) generateInsights(items []map[string]interface{}) []AIInsight {
	var insights []AIInsight

	// High-value items needing decisions
	highValueUnsure := filterHighValueUnsure(items)
	if len(highValueUnsure) > 0 {
		totalValue := calculateTotalValue(highValueUnsure)
		insights = append(insights, AIInsight{
			ID:          "high-value-attention",
			Type:        "warning",
			Priority:    "high",
			Title:       "High-Value Items Need Attention",
			Description: formatString("%d items worth over $5,000 need decisions", len(highValueUnsure)),
			Impact:      formatString("Total value at risk: $%.2f", totalValue),
			Action:      "Review and make decisions on these valuable items immediately",
			Value:       totalValue,
			ItemIDs:     extractIDs(highValueUnsure),
			Confidence:  0.95,
			CreatedAt:   time.Now(),
		})
	}

	// Quick wins - low value items for quick sale
	quickWins := filterQuickWins(items)
	if len(quickWins) > 10 {
		totalValue := calculateTotalValue(quickWins)
		insights = append(insights, AIInsight{
			ID:          "quick-wins",
			Type:        "opportunity",
			Priority:    "medium",
			Title:       "Quick Sale Opportunities",
			Description: formatString("%d low-value items could be sold quickly", len(quickWins)),
			Impact:      formatString("Potential quick revenue: $%.2f", totalValue),
			Action:      "Bundle these items for a garage sale or online marketplace",
			Value:       totalValue,
			ItemIDs:     extractIDs(quickWins[:min(20, len(quickWins))]),
			Confidence:  0.85,
			CreatedAt:   time.Now(),
		})
	}

	// Category concentration analysis
	categoryInsight := analyzeCategoryConcentration(items)
	if categoryInsight != nil {
		insights = append(insights, *categoryInsight)
	}

	// Seasonal opportunities
	seasonalInsight := analyzeSeasonalOpportunities(items)
	if seasonalInsight != nil {
		insights = append(insights, *seasonalInsight)
	}

	// Bundle recommendations
	bundleInsights := generateBundleRecommendations(items)
	insights = append(insights, bundleInsights...)

	// Sort by priority
	sort.Slice(insights, func(i, j int) bool {
		priorityMap := map[string]int{"high": 0, "medium": 1, "low": 2}
		return priorityMap[insights[i].Priority] < priorityMap[insights[j].Priority]
	})

	return insights
}

// GetRecommendations provides personalized recommendations for items
func (h *Handler) GetRecommendations(c *fiber.Ctx) error {
	var request struct {
		ItemIDs []string `json:"itemIds"`
	}

	if err := c.BodyParser(&request); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	// Generate recommendations
	recommendations := []map[string]interface{}{
		{
			"type": "pricing",
			"title": "Price Optimization Available",
			"description": "AI analysis suggests price adjustments for maximum value",
			"action": "Review pricing suggestions",
			"confidence": 0.87,
		},
		{
			"type": "bundling",
			"title": "Bundle Opportunity Detected",
			"description": "Similar items could be bundled for better appeal",
			"action": "Create item bundles",
			"confidence": 0.92,
		},
		{
			"type": "timing",
			"title": "Optimal Listing Time",
			"description": "Market conditions favor listing within next 2 weeks",
			"action": "Schedule listings",
			"confidence": 0.78,
		},
	}

	return c.JSON(fiber.Map{
		"recommendations": recommendations,
		"itemIds": request.ItemIDs,
		"generatedAt": time.Now(),
	})
}

// GetPriceOptimization provides price optimization for an item
func (h *Handler) GetPriceOptimization(c *fiber.Ctx) error {
	itemID := c.Params("id")

	// Fetch item details
	var name, category string
	var currentPrice sql.NullFloat64
	var condition sql.NullString
	err := h.db.QueryRow(`
		SELECT name, category, purchase_price, condition
		FROM items
		WHERE id = $1
	`, itemID).Scan(&name, &category, &currentPrice, &condition)

	price := 0.0
	if currentPrice.Valid {
		price = currentPrice.Float64
	}

	condStr := "unknown"
	if condition.Valid {
		condStr = condition.String
	}

	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Item not found"})
	}

	// Generate price optimization (simulated AI analysis)
	optimization := generatePriceOptimization(itemID, name, category, condStr, price)

	return c.JSON(optimization)
}

// GetMarketAnalysis provides market analysis for a category
func (h *Handler) GetMarketAnalysis(c *fiber.Ctx) error {
	category := c.Params("category")

	// Generate market analysis (simulated AI analysis)
	analysis := generateMarketAnalysis(category)

	return c.JSON(analysis)
}

// GetBundleSuggestions provides bundle suggestions
func (h *Handler) GetBundleSuggestions(c *fiber.Ctx) error {
	// Fetch items for bundling
	rows, err := h.db.Query(`
		SELECT id, name, category, purchase_price, decision
		FROM items
		WHERE decision = 'Sell'
		ORDER BY category, purchase_price DESC
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch items"})
	}
	defer rows.Close()

	categoryItems := make(map[string][]map[string]interface{})
	for rows.Next() {
		var id, name, category, decisionStatus string
		var value sql.NullFloat64

		err := rows.Scan(&id, &name, &category, &value, &decisionStatus)
		if err != nil {
			continue
		}

		price := 0.0
		if value.Valid {
			price = value.Float64
		}

		item := map[string]interface{}{
			"id": id,
			"name": name,
			"category": category,
			"value": price,
		}

		categoryItems[category] = append(categoryItems[category], item)
	}

	// Generate bundle suggestions
	var bundles []map[string]interface{}
	for category, items := range categoryItems {
		if len(items) >= 3 {
			bundle := map[string]interface{}{
				"id":          generateID(),
				"name":        formatString("%s Bundle", category),
				"category":    category,
				"itemCount":   len(items),
				"totalValue":  calculateTotalValue(items),
				"items":       items[:min(10, len(items))],
				"reasoning":   "Items in the same category often sell better as bundles",
				"discount":    "10-15% bundle discount recommended",
			}
			bundles = append(bundles, bundle)
		}
	}

	return c.JSON(fiber.Map{
		"bundles": bundles,
		"totalBundles": len(bundles),
	})
}

// GetPredictiveTrends provides predictive trend analysis
func (h *Handler) GetPredictiveTrends(c *fiber.Ctx) error {
	timeRange := c.Query("range", "30d")

	// Generate predictive trends (simulated)
	trends := map[string]interface{}{
		"timeRange": timeRange,
		"predictions": []map[string]interface{}{
			{
				"metric": "totalValue",
				"current": 150000,
				"predicted": 165000,
				"change": "+10%",
				"confidence": 0.85,
			},
			{
				"metric": "itemsSold",
				"current": 45,
				"predicted": 62,
				"change": "+38%",
				"confidence": 0.78,
			},
			{
				"metric": "completionRate",
				"current": 67,
				"predicted": 85,
				"change": "+27%",
				"confidence": 0.92,
			},
		},
		"factors": []string{
			"Seasonal demand increase expected",
			"Market conditions favorable for furniture",
			"Online marketplace activity trending up",
		},
		"recommendations": []string{
			"Focus on completing decisions for high-value items",
			"Consider professional photography for top items",
			"Start marketing campaign 2 weeks before peak season",
		},
		"generatedAt": time.Now(),
	}

	return c.JSON(trends)
}

// Helper functions

func filterHighValueUnsure(items []map[string]interface{}) []map[string]interface{} {
	var filtered []map[string]interface{}
	for _, item := range items {
		if value, ok := item["estimatedValue"].(float64); ok && value > 5000 {
			if status, ok := item["decisionStatus"].(string); ok && status == "unsure" {
				filtered = append(filtered, item)
			}
		}
	}
	return filtered
}

func filterQuickWins(items []map[string]interface{}) []map[string]interface{} {
	var filtered []map[string]interface{}
	for _, item := range items {
		value, _ := item["estimatedValue"].(float64)
		condition, _ := item["condition"].(string)
		status, _ := item["decisionStatus"].(string)

		if value > 10 && value < 100 && condition != "poor" && status != "keep" {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

func analyzeCategoryConcentration(items []map[string]interface{}) *AIInsight {
	categoryValues := make(map[string]float64)
	for _, item := range items {
		category, _ := item["category"].(string)
		value, _ := item["estimatedValue"].(float64)
		categoryValues[category] += value
	}

	// Find dominant category
	var maxCategory string
	var maxValue float64
	var totalValue float64
	for cat, val := range categoryValues {
		totalValue += val
		if val > maxValue {
			maxValue = val
			maxCategory = cat
		}
	}

	if maxValue > totalValue*0.4 {
		return &AIInsight{
			ID:          "category-concentration",
			Type:        "trend",
			Priority:    "low",
			Title:       "High Category Concentration",
			Description: formatString("%s represents %.0f%% of total value", maxCategory, (maxValue/totalValue)*100),
			Impact:      "Consider diversifying sales strategy",
			Action:      "Develop category-specific marketing approach",
			Value:       maxValue,
			Confidence:  0.88,
			CreatedAt:   time.Now(),
		}
	}

	return nil
}

func analyzeSeasonalOpportunities(items []map[string]interface{}) *AIInsight {
	// Check current season
	month := time.Now().Month()
	var seasonalItems []map[string]interface{}
	var season string

	if month >= 3 && month <= 5 {
		season = "Spring"
		// Look for outdoor/garden items
		for _, item := range items {
			name, _ := item["name"].(string)
			if strings.Contains(strings.ToLower(name), "outdoor") ||
			   strings.Contains(strings.ToLower(name), "patio") ||
			   strings.Contains(strings.ToLower(name), "garden") {
				seasonalItems = append(seasonalItems, item)
			}
		}
	}

	if len(seasonalItems) > 0 {
		totalValue := calculateTotalValue(seasonalItems)
		return &AIInsight{
			ID:          "seasonal-opportunity",
			Type:        "opportunity",
			Priority:    "medium",
			Title:       formatString("%s Sale Opportunity", season),
			Description: formatString("%d seasonal items identified", len(seasonalItems)),
			Impact:      formatString("Seasonal value: $%.2f", totalValue),
			Action:      "Plan seasonal marketing campaign",
			Value:       totalValue,
			ItemIDs:     extractIDs(seasonalItems[:min(10, len(seasonalItems))]),
			Confidence:  0.82,
			CreatedAt:   time.Now(),
		}
	}

	return nil
}

func generateBundleRecommendations(items []map[string]interface{}) []AIInsight {
	var insights []AIInsight

	// Group by category
	categoryGroups := make(map[string][]map[string]interface{})
	for _, item := range items {
		category, _ := item["category"].(string)
		status, _ := item["decisionStatus"].(string)
		if status == "sell" {
			categoryGroups[category] = append(categoryGroups[category], item)
		}
	}

	// Generate bundle insights for categories with multiple items
	for category, catItems := range categoryGroups {
		if len(catItems) >= 5 {
			totalValue := calculateTotalValue(catItems)
			insights = append(insights, AIInsight{
				ID:          formatString("bundle-%s", strings.ToLower(category)),
				Type:        "recommendation",
				Priority:    "medium",
				Title:       formatString("%s Bundle Opportunity", category),
				Description: formatString("Bundle %d %s items for better value", len(catItems), category),
				Impact:      formatString("Combined value: $%.2f", totalValue),
				Action:      "Create category bundle listing",
				Value:       totalValue,
				ItemIDs:     extractIDs(catItems[:min(10, len(catItems))]),
				Confidence:  0.79,
				CreatedAt:   time.Now(),
			})
		}
	}

	return insights
}

func generatePriceOptimization(itemID, name, category, condition string, currentPrice float64) PriceOptimization {
	// Simulate AI price optimization
	rand.Seed(time.Now().UnixNano())

	// Base adjustment on condition
	conditionMultiplier := map[string]float64{
		"excellent": 1.2,
		"good":      1.0,
		"fair":      0.8,
		"poor":      0.6,
	}[condition]

	// Category demand factor
	categoryDemand := map[string]float64{
		"Furniture":    1.1,
		"Electronics":  0.95,
		"Art":          1.3,
		"Antiques":     1.25,
		"Appliances":   0.9,
	}[category]
	if categoryDemand == 0 {
		categoryDemand = 1.0
	}

	// Calculate suggested price
	baseAdjustment := 1.0 + (rand.Float64()*0.2 - 0.1) // +/- 10% random factor
	suggestedPrice := currentPrice * conditionMultiplier * categoryDemand * baseAdjustment

	// Generate price range
	minPrice := suggestedPrice * 0.85
	maxPrice := suggestedPrice * 1.15

	// Market comparison
	marketComparison := "competitive"
	if suggestedPrice > currentPrice*1.1 {
		marketComparison = "below market"
	} else if suggestedPrice < currentPrice*0.9 {
		marketComparison = "above market"
	}

	return PriceOptimization{
		ItemID:           itemID,
		CurrentPrice:     currentPrice,
		SuggestedPrice:   math.Round(suggestedPrice*100) / 100,
		PriceRange:       []float64{math.Round(minPrice*100) / 100, math.Round(maxPrice*100) / 100},
		MarketComparison: marketComparison,
		Confidence:       0.75 + rand.Float64()*0.2,
		Reasoning:        formatString("Based on %s condition and current %s market demand", condition, category),
	}
}

func generateMarketAnalysis(category string) MarketAnalysis {
	// Simulate market analysis
	trends := []string{"rising", "stable", "declining", "volatile"}
	demands := []string{"high", "moderate", "low", "seasonal"}
	directions := []string{"up", "stable", "down"}

	rand.Seed(time.Now().UnixNano())

	return MarketAnalysis{
		Category:        category,
		MarketTrend:     trends[rand.Intn(len(trends))],
		DemandLevel:     demands[rand.Intn(len(demands))],
		PriceDirection:  directions[rand.Intn(len(directions))],
		SeasonalFactors: []string{
			"Spring cleaning season approaching",
			"Holiday shopping period",
			"End of fiscal year sales",
		}[:rand.Intn(2)+1],
		Recommendations: []string{
			formatString("List %s items within next 2 weeks", category),
			"Consider professional appraisal for high-value items",
			"Bundle similar items for better appeal",
			"Highlight unique features in descriptions",
		}[:rand.Intn(2)+2],
		UpdatedAt: time.Now(),
	}
}

func calculateTotalValue(items []map[string]interface{}) float64 {
	var total float64
	for _, item := range items {
		if value, ok := item["estimatedValue"].(float64); ok {
			total += value
		} else if value, ok := item["value"].(float64); ok {
			total += value
		}
	}
	return total
}

func extractIDs(items []map[string]interface{}) []string {
	var ids []string
	for _, item := range items {
		if id, ok := item["id"].(string); ok {
			ids = append(ids, id)
		}
	}
	return ids
}

func generateID() string {
	return formatString("%d-%d", time.Now().Unix(), rand.Intn(10000))
}

func formatString(format string, args ...interface{}) string {
	return strings.TrimSpace(strings.ReplaceAll(format, "  ", " "))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// getMockInsights returns mock insights for demo
func (h *Handler) getMockInsights() []AIInsight {
	return []AIInsight{
		{
			ID:          "high-value-attention",
			Type:        "warning",
			Priority:    "high",
			Title:       "High-Value Items Need Attention",
			Description: "12 items worth over $5,000 need decisions",
			Impact:      "Total value at risk: $85,450",
			Action:      "Review and make decisions on these valuable items immediately",
			Value:       85450,
			Confidence:  0.95,
			CreatedAt:   time.Now(),
		},
		{
			ID:          "quick-wins",
			Type:        "opportunity",
			Priority:    "medium",
			Title:       "Quick Sale Opportunities",
			Description: "34 low-value items could be sold quickly",
			Impact:      "Potential quick revenue: $2,350",
			Action:      "Bundle these items for a garage sale or online marketplace",
			Value:       2350,
			Confidence:  0.87,
			CreatedAt:   time.Now(),
		},
		{
			ID:          "seasonal-opportunity",
			Type:        "opportunity",
			Priority:    "medium",
			Title:       "Summer Sale Opportunity",
			Description: "8 outdoor furniture items identified for seasonal sales",
			Impact:      "Seasonal value: $4,200",
			Action:      "Plan seasonal marketing campaign for outdoor items",
			Value:       4200,
			Confidence:  0.82,
			CreatedAt:   time.Now(),
		},
		{
			ID:          "bundle-electronics",
			Type:        "recommendation",
			Priority:    "medium",
			Title:       "Electronics Bundle Opportunity",
			Description: "Bundle 15 electronics for better sale value",
			Impact:      "Combined value: $3,450",
			Action:      "Create an electronics bundle listing for higher appeal",
			Value:       3450,
			Confidence:  0.79,
			CreatedAt:   time.Now(),
		},
		{
			ID:          "hidden-gems",
			Type:        "opportunity",
			Priority:    "high",
			Title:       "Potentially Undervalued Items",
			Description: "5 art/antique items may be undervalued and need professional appraisal",
			Impact:      "These items could be worth significantly more than estimated",
			Action:      "Get professional appraisals for these items",
			Confidence:  0.73,
			CreatedAt:   time.Now(),
		},
		{
			ID:          "category-concentration",
			Type:        "trend",
			Priority:    "low",
			Title:       "High Category Concentration",
			Description: "Furniture represents 45% of total inventory value",
			Impact:      "Consider diversifying sales strategy across categories",
			Action:      "Develop category-specific marketing approach",
			Value:       67500,
			Confidence:  0.88,
			CreatedAt:   time.Now(),
		},
	}
}
