package handlers

import (
	"strconv"
	"strings"
	"time"
	
	"github.com/gofiber/fiber/v2"
)

// GetItems returns all items with new database schema
func (h *Handler) GetItemsNew(c *fiber.Ctx) error {
	if h.db == nil {
		return c.JSON(fiber.Map{
			"items": []fiber.Map{
				{"id": "uuid-1", "name": "Leather Sofa", "category": "Furniture", "room": "Living Room", "purchase_price": 3500, "decision": "Keep"},
				{"id": "uuid-2", "name": "Coffee Table", "category": "Furniture", "room": "Living Room", "purchase_price": 1200, "decision": "Sell"},
			},
			"total": 2,
		})
	}

	// Build query with new schema
	query := `
		SELECT
			i.id, i.uuid, i.name, 
			COALESCE(c.name, '') as category,
			i.status,
			i.purchase_price, 
			i.estimated_value, 
			i.brand,
			i.purchase_date, 
			i.created_at,
			COALESCE(r.name, '') as room_name, 
			COALESCE(r.floor, 0) as floor
		FROM items i
		LEFT JOIN rooms r ON i.room_id = r.id
		LEFT JOIN categories c ON i.category_id = c.id
		WHERE i.status = 'Active'
	`

	// Apply filters
	args := []interface{}{}
	
	// Date range filters
	if dateFrom := c.Query("date_from"); dateFrom != "" {
		query += " AND i.purchase_date >= ?"
		args = append(args, dateFrom)
	}

	if dateTo := c.Query("date_to"); dateTo != "" {
		query += " AND i.purchase_date <= ?"
		args = append(args, dateTo)
	}

	// Category filter
	if categories := c.Query("categories"); categories != "" {
		catList := strings.Split(categories, ",")
		if len(catList) > 0 {
			placeholders := []string{}
			for _, cat := range catList {
				if cat != "" {
					placeholders = append(placeholders, "?")
					args = append(args, strings.TrimSpace(cat))
				}
			}
			if len(placeholders) > 0 {
				query += " AND c.name IN (" + strings.Join(placeholders, ",") + ")"
			}
		}
	}

	// Room filter
	if rooms := c.Query("rooms"); rooms != "" {
		roomList := strings.Split(rooms, ",")
		if len(roomList) > 0 {
			placeholders := []string{}
			for _, room := range roomList {
				if room != "" {
					placeholders = append(placeholders, "?")
					args = append(args, strings.TrimSpace(room))
				}
			}
			if len(placeholders) > 0 {
				query += " AND r.name IN (" + strings.Join(placeholders, ",") + ")"
			}
		}
	}

	// Price range filters (use estimated_value as primary price field)
	if minValue := c.Query("minValue"); minValue != "" {
		if val, err := strconv.ParseFloat(minValue, 64); err == nil {
			query += " AND (COALESCE(i.estimated_value, i.purchase_price, 0) >= ?)"
			args = append(args, val)
		}
	}

	if maxValue := c.Query("maxValue"); maxValue != "" {
		if val, err := strconv.ParseFloat(maxValue, 64); err == nil {
			query += " AND (COALESCE(i.estimated_value, i.purchase_price, 0) <= ?)"
			args = append(args, val)
		}
	}

	// Sorting
	sortBy := c.Query("sort_by", "name")
	sortOrder := c.Query("sort_order", "asc")

	// Validate sort column
	allowedSortColumns := map[string]string{
		"name":          "i.name",
		"category":      "c.name",
		"room":          "r.name",
		"price":         "COALESCE(i.estimated_value, i.purchase_price, 0)",
		"purchase_date": "i.purchase_date",
		"created_at":    "i.created_at",
	}

	sortColumn := allowedSortColumns["name"] // default
	if col, ok := allowedSortColumns[sortBy]; ok {
		sortColumn = col
	}

	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "asc"
	}

	query += " ORDER BY " + sortColumn + " " + strings.ToUpper(sortOrder)

	// Add secondary sort for consistency
	if sortBy != "name" {
		query += ", i.name ASC"
	}

	rows, err := h.db.Query(query, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	items := []fiber.Map{}
	for rows.Next() {
		var (
			id             int
			uuid           string
			name           string
			category       string
			status         string
			purchasePrice  *float64
			estimatedValue *float64
			brand          *string
			purchaseDate   *time.Time
			createdAt      time.Time
			roomName       string
			floor          int
		)

		err := rows.Scan(&id, &uuid, &name, &category, &status,
			&purchasePrice, &estimatedValue, &brand,
			&purchaseDate, &createdAt,
			&roomName, &floor)
		if err != nil {
			continue
		}

		// Map status to decision for API compatibility
		decision := "Unsure"
		switch status {
		case "Sold":
			decision = "Sold"
		case "Donated":
			decision = "Donated"
		case "Active":
			decision = "Unsure"
		}

		// Use estimated_value as the primary price since purchase_price is mostly null
		var price *float64
		if estimatedValue != nil {
			price = estimatedValue
		} else if purchasePrice != nil {
			price = purchasePrice
		}

		itemMap := fiber.Map{
			"id":           uuid,
			"name":         name,
			"category":     category,
			"decision":     decision,
			"price":        price,
			"is_fixture":   false,
			"source":       brand,
			"invoice_ref":  nil,
			"room":         roomName,
			"floor":        floor,
			"has_images":   false,
			"image_count":  0,
			"created_at":   createdAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		// Add purchase_date if present
		if purchaseDate != nil {
			itemMap["purchase_date"] = purchaseDate.Format("2006-01-02")
		}

		items = append(items, itemMap)
	}

	return c.JSON(fiber.Map{
		"items": items,
		"total": len(items),
	})
}