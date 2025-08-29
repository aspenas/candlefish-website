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
	
	// Use the actual database schema - simplified query first
	query := `
		SELECT 
			id, 
			name, 
			category, 
			decision,
			purchase_price,
			asking_price,
			quantity,
			description,
			source,
			'Unknown' as room_name
		FROM items
		ORDER BY id DESC
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
		var id, quantity int
		var name, category, decision, roomName string
		var description, source *string
		var purchasePrice, askingPrice *float64

		err := rows.Scan(&id, &name, &category, &decision, &purchasePrice, &askingPrice, &quantity, &description, &source, &roomName)
		if err != nil {
			log.Printf("Row scan error: %v", err)
			continue
		}

		item := fiber.Map{
			"id": id,
			"name": name,
			"category": category,
			"decision": decision,
			"purchase_price": purchasePrice,
			"asking_price": askingPrice,
			"quantity": quantity,
			"description": description,
			"source": source,
			"room": roomName,
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
			i.category, 
			i.decision,
			i.purchase_price,
			i.asking_price,
			i.quantity,
			i.description,
			i.source,
			i.condition,
			i.placement_notes,
			COALESCE(r.name, 'Unknown') as room_name
		FROM items i
		LEFT JOIN rooms r ON i.room_id = r.id
		WHERE i.id = ?
	`

	var itemId, quantity int
	var name, category, decision, description, source, condition, placementNotes, roomName string
	var purchasePrice, askingPrice *float64

	err = h.db.QueryRow(query, id).Scan(
		&itemId, &name, &category, &decision, 
		&purchasePrice, &askingPrice, &quantity, 
		&description, &source, &condition, &placementNotes, &roomName,
	)

	if err != nil {
		log.Printf("Get item error: %v", err)
		return c.Status(404).JSON(fiber.Map{"error": "Item not found"})
	}

	item := fiber.Map{
		"id": itemId,
		"name": name,
		"category": category,
		"decision": decision,
		"purchase_price": purchasePrice,
		"asking_price": askingPrice,
		"quantity": quantity,
		"description": description,
		"source": source,
		"condition": condition,
		"placement_notes": placementNotes,
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
			COALESCE(SUM(asking_price), 0) as total_value,
			SUM(CASE WHEN decision = 'Keep' THEN 1 ELSE 0 END) as keep_count,
			SUM(CASE WHEN decision = 'Sell' THEN 1 ELSE 0 END) as sell_count,
			SUM(CASE WHEN decision = 'Unsure' THEN 1 ELSE 0 END) as unsure_count
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