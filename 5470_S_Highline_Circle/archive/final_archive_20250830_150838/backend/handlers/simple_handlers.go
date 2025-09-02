package handlers

import (
	"strconv"
	"log"
	"github.com/gofiber/fiber/v2"
)

// Simple handlers that work with the existing database schema
// These match the actual database table structure with integer IDs

// GetSimpleItems returns items using the current database schema
func (h *Handler) GetSimpleItems(c *fiber.Ctx) error {
	if h.db == nil {
		log.Println("Database is nil, returning mock data")
		return c.JSON(fiber.Map{
			"items": []fiber.Map{
				{"id": 1, "name": "Mock Item 1", "category": "Furniture", "room": "Living Room", "purchase_price": 3500, "decision": "Keep"},
				{"id": 2, "name": "Mock Item 2", "category": "Furniture", "room": "Living Room", "purchase_price": 1200, "decision": "Sell"},
			},
			"total": 2,
		})
	}

	// Parse query parameters for pagination
	limit := c.QueryInt("limit", 1000) // Default to 1000 items
	offset := c.QueryInt("offset", 0)
	
	log.Printf("Querying items from database with limit=%d, offset=%d", limit, offset)
	
	// Use the actual SQLite database schema
	query := `
		SELECT 
			i.id, 
			i.name, 
			COALESCE(i.category_id, 0) as category_id, 
			COALESCE(i.status, 'Active') as status,
			COALESCE(i.estimated_value, COALESCE(i.purchase_price, 0)) as purchase_price,
			COALESCE(i.estimated_value, COALESCE(i.purchase_price, 0)) as asking_price,
			i.description,
			COALESCE(r.name, 'Unknown') as room_name,
			i.brand,
			i.valuation_source,
			COALESCE(i.is_verified, 0) as is_verified
		FROM items i
		LEFT JOIN rooms r ON i.room_id = r.id
		ORDER BY i.id DESC
		LIMIT ? OFFSET ?
	`

	rows, err := h.db.Query(query, limit, offset)
	if err != nil {
		log.Printf("Database query error: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Database query failed: " + err.Error()})
	}
	defer rows.Close()

	items := []fiber.Map{}
	for rows.Next() {
		var id, categoryId int
		var name, status, roomName string
		var description, brand, valuationSource *string
		var purchasePrice, askingPrice float64
		var isVerified int

		err := rows.Scan(&id, &name, &categoryId, &status, &purchasePrice, &askingPrice, &description, &roomName, &brand, &valuationSource, &isVerified)
		if err != nil {
			log.Printf("Row scan error: %v", err)
			continue
		}

		// Map category ID to category name
		categoryNames := map[int]string{
			0: "Other",
			1: "Furniture",
			2: "Exercise Equipment",
			3: "Electronics",
			4: "Appliances",
			5: "Artwork",
			6: "Clothing",
			7: "Books",
			8: "Kitchen Items",
			9: "Decorative Items",
			10: "Tools",
			11: "Outdoor Equipment",
			12: "Medical Equipment",
			13: "Collectibles",
			14: "Sports Equipment",
			15: "Personal Items",
			16: "Holiday Decor",
			17: "Miscellaneous",
		}
		category := categoryNames[categoryId]
		if category == "" {
			category = "Other"
		}

		// Map status to decision for frontend compatibility
		decision := "Keep"
		if status == "Sold" || status == "Donated" || status == "Disposed" {
			decision = "Sell"
		} else if status == "Lost" {
			decision = "Unsure"
		}

		// Determine source based on brand and verification
		source := "Johnson Storage & Moving"
		if brand != nil && *brand != "" {
			source = *brand
		} else if isVerified == 1 {
			source = "Designer Inventory"
		} else if valuationSource != nil && *valuationSource == "Invoice" {
			source = "Designer Inventory"
		} else if valuationSource != nil && *valuationSource == "Bloom & Flourish" {
			source = "Bloom & Flourish"
		}

		// Handle valuation source string
		valSource := "Estimate"
		if valuationSource != nil {
			valSource = *valuationSource
		}
		
		// Handle verification status
		verified := isVerified == 1

		item := fiber.Map{
			"id": id,
			"name": name,
			"category": category,
			"decision": decision,
			"purchase_price": purchasePrice,
			"asking_price": askingPrice,
			"quantity": 1, // Default quantity
			"description": description,
			"source": source,
			"room": roomName,
			"value": purchasePrice, // Add value field for frontend compatibility
			"brand": brand,
			"valuation_source": valSource,
			"is_verified": verified,
		}
		items = append(items, item)
	}

	// Get total count of items in database
	var totalCount int
	err = h.db.QueryRow("SELECT COUNT(*) FROM items").Scan(&totalCount)
	if err != nil {
		log.Printf("Error getting total count: %v", err)
		totalCount = len(items)
	}

	log.Printf("Retrieved %d items from database (total: %d)", len(items), totalCount)

	return c.JSON(fiber.Map{
		"items": items,
		"total": totalCount,
	})
}

// GetSimpleRooms returns rooms using the current database schema
func (h *Handler) GetSimpleRooms(c *fiber.Ctx) error {
	if h.db == nil {
		return c.JSON([]fiber.Map{
			{"id": 1, "name": "Living Room", "item_count": 15},
			{"id": 2, "name": "Master Bedroom", "item_count": 12},
		})
	}

	query := `
		SELECT r.id, r.name, r.floor,
		       COUNT(i.id) as item_count,
		       COALESCE(SUM(i.purchase_price), 0) as total_value
		FROM rooms r
		LEFT JOIN items i ON r.id = i.room_id
		GROUP BY r.id, r.name, r.floor
		ORDER BY r.name
	`

	rows, err := h.db.Query(query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	rooms := []fiber.Map{}
	for rows.Next() {
		var id int
		var name, floor string
		var itemCount int
		var totalValue float64

		err := rows.Scan(&id, &name, &floor, &itemCount, &totalValue)
		if err != nil {
			log.Printf("Room scan error: %v", err)
			continue
		}

		room := fiber.Map{
			"id":          id,
			"name":        name,
			"floor":       floor,
			"item_count":  itemCount,
			"total_value": totalValue,
		}
		rooms = append(rooms, room)
	}

	return c.JSON(rooms)
}

// GetSimpleItem returns a single item
func (h *Handler) GetSimpleItem(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid item ID"})
	}

	if h.db == nil {
		return c.JSON(fiber.Map{
			"id": id,
			"name": "Mock Item",
			"category": "Furniture",
			"decision": "Keep",
			"purchase_price": 1000,
		})
	}

	query := `
		SELECT 
			i.id, 
			i.name, 
			COALESCE(c.name, 'Other') as category,
			i.status,
			i.purchase_price,
			COALESCE(i.estimated_value, i.purchase_price) as asking_price,
			i.description,
			i.condition,
			i.location_notes,
			COALESCE(r.name, 'Unknown') as room_name
		FROM items i
		LEFT JOIN rooms r ON i.room_id = r.id
		LEFT JOIN categories c ON i.category_id = c.id
		WHERE i.id = ?
	`

	var itemId int
	var name, category, status, condition, roomName string
	var description, locationNotes *string
	var purchasePrice, askingPrice *float64

	err = h.db.QueryRow(query, id).Scan(
		&itemId, &name, &category, &status, 
		&purchasePrice, &askingPrice, 
		&description, &condition, &locationNotes, &roomName,
	)

	if err != nil {
		log.Printf("Get item error: %v", err)
		return c.Status(404).JSON(fiber.Map{"error": "Item not found"})
	}

	// Map status to decision for frontend compatibility
	decision := "Keep"
	if status == "Sold" || status == "Donated" || status == "Disposed" {
		decision = "Sell"
	} else if status == "Lost" {
		decision = "Unsure"
	}

	item := fiber.Map{
		"id": itemId,
		"name": name,
		"category": category,
		"decision": decision,
		"purchase_price": purchasePrice,
		"asking_price": askingPrice,
		"quantity": 1,
		"description": description,
		"source": "Johnson Storage & Moving",
		"condition": condition,
		"placement_notes": locationNotes,
		"room": roomName,
	}

	return c.JSON(item)
}

// GetSimpleSummary returns summary analytics
func (h *Handler) GetSimpleSummary(c *fiber.Ctx) error {
	if h.db == nil {
		return c.JSON(fiber.Map{
			"total_items": 134,
			"total_value": 125000,
			"keep_count": 45,
			"sell_count": 67,
			"unsure_count": 22,
		})
	}

	query := `
		SELECT 
			COUNT(*) as total_items,
			COALESCE(SUM(COALESCE(estimated_value, purchase_price)), 0) as total_value,
			SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as keep_count,
			SUM(CASE WHEN status IN ('Sold', 'Donated', 'Disposed') THEN 1 ELSE 0 END) as sell_count,
			SUM(CASE WHEN status = 'Lost' THEN 1 ELSE 0 END) as unsure_count
		FROM items
	`

	var totalItems, keepCount, sellCount, unsureCount int
	var totalValue float64

	err := h.db.QueryRow(query).Scan(&totalItems, &totalValue, &keepCount, &sellCount, &unsureCount)
	if err != nil {
		log.Printf("Summary query error: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"total_items": totalItems,
		"total_value": totalValue,
		"keep_count": keepCount,
		"sell_count": sellCount,
		"unsure_count": unsureCount,
	})
}