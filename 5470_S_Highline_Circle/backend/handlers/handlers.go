package handlers

import (
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
	"encoding/csv"
	"bytes"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
	"github.com/xuri/excelize/v2"
	"github.com/jung-kurt/gofpdf"
)

type Handler struct {
	db *sqlx.DB
}

func New(db *sqlx.DB) *Handler {
	return &Handler{db: db}
}

// Room handlers
func (h *Handler) GetRooms(c *fiber.Ctx) error {
	if h.db == nil {
		return c.JSON([]fiber.Map{
			{"id": 1, "name": "Living Room", "floor": 1, "room_type": "living", "item_count": 15, "total_value": 45000},
			{"id": 2, "name": "Master Bedroom", "floor": 2, "room_type": "bedroom", "item_count": 12, "total_value": 35000},
		})
	}
	query := `
		SELECT r.id, r.name, r.floor, r.room_type, 
		       COUNT(i.id) as item_count,
		       COALESCE(SUM(i.purchase_price), 0) as total_value
		FROM rooms r
		LEFT JOIN items i ON r.id = i.room_id
		GROUP BY r.id, r.name, r.floor, r.room_type
		ORDER BY r.floor, r.name
	`
	
	rows, err := h.db.Query(query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()
	
	rooms := []fiber.Map{}
	for rows.Next() {
		var room struct {
			ID         string  `db:"id"`
			Name       string  `db:"name"`
			Floor      string  `db:"floor"`
			RoomType   *string `db:"room_type"`
			ItemCount  int     `db:"item_count"`
			TotalValue float64 `db:"total_value"`
		}
		
		err := rows.Scan(&room.ID, &room.Name, &room.Floor, &room.RoomType,
			&room.ItemCount, &room.TotalValue)
		if err != nil {
			continue
		}
		
		rooms = append(rooms, fiber.Map{
			"id":          room.ID,
			"name":        room.Name,
			"floor":       room.Floor,
			"room_type":   room.RoomType,
			"item_count":  room.ItemCount,
			"total_value": room.TotalValue,
		})
	}
	
	return c.JSON(fiber.Map{"rooms": rooms})
}

func (h *Handler) GetRoom(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"room": nil})
}

func (h *Handler) CreateRoom(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) UpdateRoom(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) DeleteRoom(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"success": true})
}

// Item handlers
func (h *Handler) GetItems(c *fiber.Ctx) error {
	if h.db == nil {
		return c.JSON(fiber.Map{
			"items": []fiber.Map{
				{"id": "1", "name": "Leather Sofa", "category": "Furniture", "room": "Living Room", "purchase_price": 3500, "decision": "keep"},
				{"id": "2", "name": "Coffee Table", "category": "Furniture", "room": "Living Room", "purchase_price": 1200, "decision": "sell"},
			},
			"total": 2,
		})
	}
	query := `
		SELECT 
			i.id, i.name, i.category, i.decision,
			i.purchase_price, i.is_fixture, i.source,
			i.invoice_ref, i.designer_invoice_price,
			r.name as room_name, r.floor
		FROM items i
		JOIN rooms r ON i.room_id = r.id
		ORDER BY r.name, i.name
	`
	
	rows, err := h.db.Query(query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()
	
	items := []fiber.Map{}
	for rows.Next() {
		var item struct {
			ID                   string  `db:"id"`
			Name                 string  `db:"name"`
			Category             string  `db:"category"`
			Decision             string  `db:"decision"`
			PurchasePrice        *float64 `db:"purchase_price"`
			IsFixture            bool    `db:"is_fixture"`
			Source               *string `db:"source"`
			InvoiceRef           *string `db:"invoice_ref"`
			DesignerInvoicePrice *float64 `db:"designer_invoice_price"`
			RoomName             string  `db:"room_name"`
			Floor                string  `db:"floor"`
		}
		
		err := rows.Scan(&item.ID, &item.Name, &item.Category, &item.Decision,
			&item.PurchasePrice, &item.IsFixture, &item.Source,
			&item.InvoiceRef, &item.DesignerInvoicePrice,
			&item.RoomName, &item.Floor)
		if err != nil {
			continue
		}
		
		items = append(items, fiber.Map{
			"id":           item.ID,
			"name":         item.Name,
			"category":     item.Category,
			"decision":     item.Decision,
			"price":        item.PurchasePrice,
			"is_fixture":   item.IsFixture,
			"source":       item.Source,
			"invoice_ref":  item.InvoiceRef,
			"room":         item.RoomName,
			"floor":        item.Floor,
		})
	}
	
	return c.JSON(fiber.Map{
		"items": items,
		"total": len(items),
	})
}

func (h *Handler) GetItem(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"item": nil})
}

func (h *Handler) CreateItem(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) UpdateItem(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) DeleteItem(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) BulkUpdateItems(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"success": true})
}

// Search and filter
func (h *Handler) SearchItems(c *fiber.Ctx) error {
	query := c.Query("q", "")
	if query == "" {
		return c.JSON(fiber.Map{
			"items": []fiber.Map{},
			"total": 0,
		})
	}

	if h.db == nil {
		return c.JSON(fiber.Map{
			"items": []fiber.Map{},
			"total": 0,
		})
	}

	// Basic search across multiple fields
	searchQuery := `
		SELECT 
			i.id, i.name, i.category, i.decision,
			i.purchase_price, i.is_fixture, i.source,
			i.invoice_ref, i.designer_invoice_price,
			r.name as room_name, r.floor,
			i.description, i.placement_notes
		FROM items i
		JOIN rooms r ON i.room_id = r.id
		WHERE 
			LOWER(i.name) LIKE LOWER($1) OR
			LOWER(i.category) LIKE LOWER($1) OR
			LOWER(i.description) LIKE LOWER($1) OR
			LOWER(r.name) LIKE LOWER($1) OR
			LOWER(i.source) LIKE LOWER($1)
		ORDER BY r.name, i.name
	`

	rows, err := h.db.Query(searchQuery, "%"+query+"%")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	items := []fiber.Map{}
	for rows.Next() {
		var item struct {
			ID                   string  `db:"id"`
			Name                 string  `db:"name"`
			Category             string  `db:"category"`
			Decision             string  `db:"decision"`
			PurchasePrice        *float64 `db:"purchase_price"`
			IsFixture            bool    `db:"is_fixture"`
			Source               *string `db:"source"`
			InvoiceRef           *string `db:"invoice_ref"`
			DesignerInvoicePrice *float64 `db:"designer_invoice_price"`
			RoomName             string  `db:"room_name"`
			Floor                string  `db:"floor"`
			Description          *string `db:"description"`
			PlacementNotes       *string `db:"placement_notes"`
		}

		err := rows.Scan(&item.ID, &item.Name, &item.Category, &item.Decision,
			&item.PurchasePrice, &item.IsFixture, &item.Source,
			&item.InvoiceRef, &item.DesignerInvoicePrice,
			&item.RoomName, &item.Floor, &item.Description, &item.PlacementNotes)
		if err != nil {
			continue
		}

		items = append(items, fiber.Map{
			"id":           item.ID,
			"name":         item.Name,
			"category":     item.Category,
			"decision":     item.Decision,
			"price":        item.PurchasePrice,
			"is_fixture":   item.IsFixture,
			"source":       item.Source,
			"invoice_ref":  item.InvoiceRef,
			"room":         item.RoomName,
			"floor":        item.Floor,
			"description":  item.Description,
			"placement_notes": item.PlacementNotes,
		})
	}

	return c.JSON(fiber.Map{
		"items": items,
		"total": len(items),
	})
}

func (h *Handler) FilterItems(c *fiber.Ctx) error {
	if h.db == nil {
		return c.JSON(fiber.Map{
			"items": []fiber.Map{},
			"total": 0,
		})
	}

	// Build dynamic filter query
	baseQuery := `
		SELECT 
			i.id, i.name, i.category, i.decision,
			i.purchase_price, i.is_fixture, i.source,
			i.invoice_ref, i.designer_invoice_price,
			r.name as room_name, r.floor
		FROM items i
		JOIN rooms r ON i.room_id = r.id
		WHERE 1=1
	`

	args := []interface{}{}
	argIndex := 0

	// Category filter
	if categories := c.Query("categories"); categories != "" {
		catList := strings.Split(categories, ",")
		if len(catList) > 0 {
			placeholders := []string{}
			for _, cat := range catList {
				if cat != "" {
					argIndex++
					placeholders = append(placeholders, fmt.Sprintf("$%d", argIndex))
					args = append(args, cat)
				}
			}
			if len(placeholders) > 0 {
				baseQuery += fmt.Sprintf(" AND i.category IN (%s)", strings.Join(placeholders, ","))
			}
		}
	}

	// Decision filter
	if decisions := c.Query("decisions"); decisions != "" {
		decList := strings.Split(decisions, ",")
		if len(decList) > 0 {
			placeholders := []string{}
			for _, dec := range decList {
				if dec != "" {
					argIndex++
					placeholders = append(placeholders, fmt.Sprintf("$%d", argIndex))
					args = append(args, dec)
				}
			}
			if len(placeholders) > 0 {
				baseQuery += fmt.Sprintf(" AND i.decision IN (%s)", strings.Join(placeholders, ","))
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
					argIndex++
					placeholders = append(placeholders, fmt.Sprintf("$%d", argIndex))
					args = append(args, room)
				}
			}
			if len(placeholders) > 0 {
				baseQuery += fmt.Sprintf(" AND r.name IN (%s)", strings.Join(placeholders, ","))
			}
		}
	}

	// Price range filters
	if minValue := c.Query("minValue"); minValue != "" {
		if val, err := strconv.ParseFloat(minValue, 64); err == nil {
			argIndex++
			baseQuery += fmt.Sprintf(" AND i.purchase_price >= $%d", argIndex)
			args = append(args, val)
		}
	}

	if maxValue := c.Query("maxValue"); maxValue != "" {
		if val, err := strconv.ParseFloat(maxValue, 64); err == nil {
			argIndex++
			baseQuery += fmt.Sprintf(" AND i.purchase_price <= $%d", argIndex)
			args = append(args, val)
		}
	}

	// Fixture filter
	if fixture := c.Query("isFixture"); fixture != "" {
		if val, err := strconv.ParseBool(fixture); err == nil {
			argIndex++
			baseQuery += fmt.Sprintf(" AND i.is_fixture = $%d", argIndex)
			args = append(args, val)
		}
	}

	baseQuery += " ORDER BY r.name, i.name"

	rows, err := h.db.Query(baseQuery, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	items := []fiber.Map{}
	for rows.Next() {
		var item struct {
			ID                   string  `db:"id"`
			Name                 string  `db:"name"`
			Category             string  `db:"category"`
			Decision             string  `db:"decision"`
			PurchasePrice        *float64 `db:"purchase_price"`
			IsFixture            bool    `db:"is_fixture"`
			Source               *string `db:"source"`
			InvoiceRef           *string `db:"invoice_ref"`
			DesignerInvoicePrice *float64 `db:"designer_invoice_price"`
			RoomName             string  `db:"room_name"`
			Floor                string  `db:"floor"`
		}

		err := rows.Scan(&item.ID, &item.Name, &item.Category, &item.Decision,
			&item.PurchasePrice, &item.IsFixture, &item.Source,
			&item.InvoiceRef, &item.DesignerInvoicePrice,
			&item.RoomName, &item.Floor)
		if err != nil {
			continue
		}

		items = append(items, fiber.Map{
			"id":           item.ID,
			"name":         item.Name,
			"category":     item.Category,
			"decision":     item.Decision,
			"price":        item.PurchasePrice,
			"is_fixture":   item.IsFixture,
			"source":       item.Source,
			"invoice_ref":  item.InvoiceRef,
			"room":         item.RoomName,
			"floor":        item.Floor,
		})
	}

	return c.JSON(fiber.Map{
		"items": items,
		"total": len(items),
	})
}

// Analytics
func (h *Handler) GetSummary(c *fiber.Ctx) error {
	if h.db == nil {
		return c.JSON(fiber.Map{
			"totalItems": 239,
			"totalValue": 374242.59,
			"keepCount": 100,
			"sellCount": 80,
			"unsureCount": 59,
			"donatedCount": 0,
			"soldCount": 0,
			"rooms": 40,
			"categories": []fiber.Map{
				{"name": "Furniture", "count": 120, "value": 200000},
				{"name": "Art", "count": 50, "value": 100000},
				{"name": "Rugs", "count": 30, "value": 50000},
			},
		})
	}
	// Get counts by decision status
	var stats struct {
		TotalItems  int     `db:"total_items"`
		TotalValue  float64 `db:"total_value"`
		SellCount   int     `db:"sell_count"`
		KeepCount   int     `db:"keep_count"`
		UnsureCount int     `db:"unsure_count"`
	}
	
	err := h.db.Get(&stats, `
		SELECT 
			COUNT(*) as total_items,
			COALESCE(SUM(purchase_price), 0) as total_value,
			COUNT(*) FILTER (WHERE decision = 'Sell') as sell_count,
			COUNT(*) FILTER (WHERE decision = 'Keep') as keep_count,
			COUNT(*) FILTER (WHERE decision = 'Unsure') as unsure_count
		FROM items
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	// Get room values
	roomValues := []fiber.Map{}
	rows, err := h.db.Query(`
		SELECT r.name, COALESCE(SUM(i.purchase_price), 0) as value
		FROM rooms r
		LEFT JOIN items i ON r.id = i.room_id
		GROUP BY r.id, r.name
		HAVING SUM(i.purchase_price) > 0
		ORDER BY value DESC
		LIMIT 10
	`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var room struct {
				Name  string  `db:"name"`
				Value float64 `db:"value"`
			}
			if err := rows.Scan(&room.Name, &room.Value); err == nil {
				roomValues = append(roomValues, fiber.Map{
					"room":  room.Name,
					"value": room.Value,
				})
			}
		}
	}
	
	// Get category distribution
	categoryDist := []fiber.Map{}
	rows2, err := h.db.Query(`
		SELECT category, COUNT(*) as count
		FROM items
		GROUP BY category
		ORDER BY count DESC
	`)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var cat struct {
				Category string `db:"category"`
				Count    int    `db:"count"`
			}
			if err := rows2.Scan(&cat.Category, &cat.Count); err == nil {
				categoryDist = append(categoryDist, fiber.Map{
					"category": cat.Category,
					"count":    cat.Count,
				})
			}
		}
	}
	
	return c.JSON(fiber.Map{
		"totalItems":            stats.TotalItems,
		"totalValue":            stats.TotalValue,
		"sellCount":             stats.SellCount,
		"keepCount":             stats.KeepCount,
		"unsureCount":           stats.UnsureCount,
		"roomValues":            roomValues,
		"categoryDistribution": categoryDist,
	})
}

func (h *Handler) GetRoomAnalytics(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"analytics": []interface{}{}})
}

func (h *Handler) GetCategoryAnalytics(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"analytics": []interface{}{}})
}

// Export functions
func (h *Handler) getExportItems(c *fiber.Ctx) ([]map[string]interface{}, error) {
	if h.db == nil {
		return []map[string]interface{}{}, nil
	}

	// Check if specific items are requested
	itemIds := c.Query("items")
	var query string
	var args []interface{}

	if itemIds != "" {
		// Export specific items
		idList := strings.Split(itemIds, ",")
		placeholders := []string{}
		for i, id := range idList {
			if id != "" {
				placeholders = append(placeholders, fmt.Sprintf("$%d", i+1))
				args = append(args, id)
			}
		}
		if len(placeholders) == 0 {
			return []map[string]interface{}{}, nil
		}
		query = fmt.Sprintf(`
			SELECT 
				i.id, i.name, i.category, i.decision,
				i.purchase_price, i.asking_price, i.sold_price,
				i.is_fixture, i.source, i.quantity,
				i.invoice_ref, i.designer_invoice_price,
				i.description, i.condition, i.placement_notes,
				i.purchase_date, i.created_at,
				r.name as room_name, r.floor
			FROM items i
			JOIN rooms r ON i.room_id = r.id
			WHERE i.id IN (%s)
			ORDER BY r.name, i.name
		`, strings.Join(placeholders, ","))
	} else {
		// Export all items
		query = `
			SELECT 
				i.id, i.name, i.category, i.decision,
				i.purchase_price, i.asking_price, i.sold_price,
				i.is_fixture, i.source, i.quantity,
				i.invoice_ref, i.designer_invoice_price,
				i.description, i.condition, i.placement_notes,
				i.purchase_date, i.created_at,
				r.name as room_name, r.floor
			FROM items i
			JOIN rooms r ON i.room_id = r.id
			ORDER BY r.name, i.name
		`
	}

	rows, err := h.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []map[string]interface{}{}
	for rows.Next() {
		var item struct {
			ID                   string     `db:"id"`
			Name                 string     `db:"name"`
			Category             string     `db:"category"`
			Decision             string     `db:"decision"`
			PurchasePrice        *float64   `db:"purchase_price"`
			AskingPrice          *float64   `db:"asking_price"`
			SoldPrice            *float64   `db:"sold_price"`
			IsFixture            bool       `db:"is_fixture"`
			Source               *string    `db:"source"`
			Quantity             int        `db:"quantity"`
			InvoiceRef           *string    `db:"invoice_ref"`
			DesignerInvoicePrice *float64   `db:"designer_invoice_price"`
			Description          *string    `db:"description"`
			Condition            *string    `db:"condition"`
			PlacementNotes       *string    `db:"placement_notes"`
			PurchaseDate         *time.Time `db:"purchase_date"`
			CreatedAt            time.Time  `db:"created_at"`
			RoomName             string     `db:"room_name"`
			Floor                string     `db:"floor"`
		}

		err := rows.Scan(&item.ID, &item.Name, &item.Category, &item.Decision,
			&item.PurchasePrice, &item.AskingPrice, &item.SoldPrice,
			&item.IsFixture, &item.Source, &item.Quantity,
			&item.InvoiceRef, &item.DesignerInvoicePrice,
			&item.Description, &item.Condition, &item.PlacementNotes,
			&item.PurchaseDate, &item.CreatedAt,
			&item.RoomName, &item.Floor)
		if err != nil {
			continue
		}

		items = append(items, map[string]interface{}{
			"id":                     item.ID,
			"name":                   item.Name,
			"category":               item.Category,
			"decision":               item.Decision,
			"purchase_price":         item.PurchasePrice,
			"asking_price":           item.AskingPrice,
			"sold_price":             item.SoldPrice,
			"is_fixture":             item.IsFixture,
			"source":                 item.Source,
			"quantity":               item.Quantity,
			"invoice_ref":            item.InvoiceRef,
			"designer_invoice_price": item.DesignerInvoicePrice,
			"description":            item.Description,
			"condition":              item.Condition,
			"placement_notes":        item.PlacementNotes,
			"purchase_date":          item.PurchaseDate,
			"created_at":             item.CreatedAt,
			"room_name":              item.RoomName,
			"floor":                  item.Floor,
		})
	}

	return items, nil
}

func (h *Handler) ExportExcel(c *fiber.Ctx) error {
	items, err := h.getExportItems(c)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Create a new Excel file
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			fmt.Println(err)
		}
	}()

	// Create headers
	headers := []string{
		"ID", "Name", "Category", "Decision", "Room", "Floor",
		"Purchase Price", "Asking Price", "Sold Price", "Quantity",
		"Is Fixture", "Source", "Invoice Ref", "Designer Price",
		"Description", "Condition", "Placement Notes",
		"Purchase Date", "Created At",
	}

	// Set headers
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue("Sheet1", cell, header)
	}

	// Set data
	for i, item := range items {
		row := i + 2 // Start from row 2 (after headers)
		
		f.SetCellValue("Sheet1", fmt.Sprintf("A%d", row), item["id"])
		f.SetCellValue("Sheet1", fmt.Sprintf("B%d", row), item["name"])
		f.SetCellValue("Sheet1", fmt.Sprintf("C%d", row), item["category"])
		f.SetCellValue("Sheet1", fmt.Sprintf("D%d", row), item["decision"])
		f.SetCellValue("Sheet1", fmt.Sprintf("E%d", row), item["room_name"])
		f.SetCellValue("Sheet1", fmt.Sprintf("F%d", row), item["floor"])
		f.SetCellValue("Sheet1", fmt.Sprintf("G%d", row), item["purchase_price"])
		f.SetCellValue("Sheet1", fmt.Sprintf("H%d", row), item["asking_price"])
		f.SetCellValue("Sheet1", fmt.Sprintf("I%d", row), item["sold_price"])
		f.SetCellValue("Sheet1", fmt.Sprintf("J%d", row), item["quantity"])
		f.SetCellValue("Sheet1", fmt.Sprintf("K%d", row), item["is_fixture"])
		f.SetCellValue("Sheet1", fmt.Sprintf("L%d", row), item["source"])
		f.SetCellValue("Sheet1", fmt.Sprintf("M%d", row), item["invoice_ref"])
		f.SetCellValue("Sheet1", fmt.Sprintf("N%d", row), item["designer_invoice_price"])
		f.SetCellValue("Sheet1", fmt.Sprintf("O%d", row), item["description"])
		f.SetCellValue("Sheet1", fmt.Sprintf("P%d", row), item["condition"])
		f.SetCellValue("Sheet1", fmt.Sprintf("Q%d", row), item["placement_notes"])
		
		if purchaseDate, ok := item["purchase_date"].(*time.Time); ok && purchaseDate != nil {
			f.SetCellValue("Sheet1", fmt.Sprintf("R%d", row), purchaseDate.Format("2006-01-02"))
		}
		
		if createdAt, ok := item["created_at"].(time.Time); ok {
			f.SetCellValue("Sheet1", fmt.Sprintf("S%d", row), createdAt.Format("2006-01-02"))
		}
	}

	// Style the header row
	style, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#E0E0E0"}, Pattern: 1},
	})
	f.SetRowStyle("Sheet1", 1, 1, style)

	// Auto-fit columns
	for i := range headers {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetColWidth("Sheet1", col, col, 15)
	}

	// Generate filename with timestamp
	filename := fmt.Sprintf("inventory_export_%s.xlsx", time.Now().Format("2006-01-02_15-04-05"))

	// Save to buffer
	buffer, err := f.WriteToBuffer()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Set headers for download
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Set("Content-Length", fmt.Sprintf("%d", buffer.Len()))

	return c.Send(buffer.Bytes())
}

func (h *Handler) ExportCSV(c *fiber.Ctx) error {
	items, err := h.getExportItems(c)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Write headers
	headers := []string{
		"ID", "Name", "Category", "Decision", "Room", "Floor",
		"Purchase Price", "Asking Price", "Sold Price", "Quantity",
		"Is Fixture", "Source", "Invoice Ref", "Designer Price",
		"Description", "Condition", "Placement Notes",
		"Purchase Date", "Created At",
	}
	writer.Write(headers)

	// Write data
	for _, item := range items {
		record := []string{
			fmt.Sprintf("%v", item["id"]),
			fmt.Sprintf("%v", item["name"]),
			fmt.Sprintf("%v", item["category"]),
			fmt.Sprintf("%v", item["decision"]),
			fmt.Sprintf("%v", item["room_name"]),
			fmt.Sprintf("%v", item["floor"]),
			fmt.Sprintf("%v", item["purchase_price"]),
			fmt.Sprintf("%v", item["asking_price"]),
			fmt.Sprintf("%v", item["sold_price"]),
			fmt.Sprintf("%v", item["quantity"]),
			fmt.Sprintf("%v", item["is_fixture"]),
			fmt.Sprintf("%v", item["source"]),
			fmt.Sprintf("%v", item["invoice_ref"]),
			fmt.Sprintf("%v", item["designer_invoice_price"]),
			fmt.Sprintf("%v", item["description"]),
			fmt.Sprintf("%v", item["condition"]),
			fmt.Sprintf("%v", item["placement_notes"]),
		}
		
		// Format dates
		if purchaseDate, ok := item["purchase_date"].(*time.Time); ok && purchaseDate != nil {
			record = append(record, purchaseDate.Format("2006-01-02"))
		} else {
			record = append(record, "")
		}
		
		if createdAt, ok := item["created_at"].(time.Time); ok {
			record = append(record, createdAt.Format("2006-01-02"))
		} else {
			record = append(record, "")
		}
		
		writer.Write(record)
	}

	writer.Flush()

	// Generate filename with timestamp
	filename := fmt.Sprintf("inventory_export_%s.csv", time.Now().Format("2006-01-02_15-04-05"))

	// Set headers for download
	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Set("Content-Length", fmt.Sprintf("%d", buf.Len()))

	return c.Send(buf.Bytes())
}

func (h *Handler) ExportPDF(c *fiber.Ctx) error {
	items, err := h.getExportItems(c)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 12)

	// Title
	pdf.Cell(280, 10, "Inventory Export - "+time.Now().Format("January 2, 2006"))
	pdf.Ln(15)

	// Table headers
	pdf.SetFont("Arial", "B", 8)
	headerWidths := []float64{30, 50, 25, 20, 35, 20, 25, 25, 50}
	headers := []string{"Name", "Description", "Category", "Decision", "Room", "Floor", "Price", "Asking", "Source"}

	for i, header := range headers {
		pdf.CellFormat(headerWidths[i], 8, header, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	// Table data
	pdf.SetFont("Arial", "", 7)
	for _, item := range items {
		// Check if we need a new page
		if pdf.GetY() > 180 {
			pdf.AddPage()
			pdf.SetFont("Arial", "B", 8)
			// Repeat headers
			for i, header := range headers {
				pdf.CellFormat(headerWidths[i], 8, header, "1", 0, "C", true, 0, "")
			}
			pdf.Ln(-1)
			pdf.SetFont("Arial", "", 7)
		}

		// Truncate long text for PDF display
		name := fmt.Sprintf("%v", item["name"])
		if len(name) > 25 {
			name = name[:22] + "..."
		}
		
		description := fmt.Sprintf("%v", item["description"])
		if description == "<nil>" {
			description = ""
		}
		if len(description) > 35 {
			description = description[:32] + "..."
		}

		price := ""
		if item["purchase_price"] != nil {
			price = fmt.Sprintf("$%.0f", item["purchase_price"])
		}
		
		askingPrice := ""
		if item["asking_price"] != nil {
			askingPrice = fmt.Sprintf("$%.0f", item["asking_price"])
		}

		row := []string{
			name,
			description,
			fmt.Sprintf("%v", item["category"]),
			fmt.Sprintf("%v", item["decision"]),
			fmt.Sprintf("%v", item["room_name"]),
			fmt.Sprintf("%v", item["floor"]),
			price,
			askingPrice,
			fmt.Sprintf("%v", item["source"]),
		}

		for i, cell := range row {
			if cell == "<nil>" {
				cell = ""
			}
			pdf.CellFormat(headerWidths[i], 8, cell, "1", 0, "L", false, 0, "")
		}
		pdf.Ln(-1)
	}

	// Generate filename with timestamp
	filename := fmt.Sprintf("inventory_export_%s.pdf", time.Now().Format("2006-01-02_15-04-05"))

	// Output to buffer
	var buf bytes.Buffer
	err = pdf.Output(&buf)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Set headers for download
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Set("Content-Length", fmt.Sprintf("%d", buf.Len()))

	return c.Send(buf.Bytes())
}

func (h *Handler) ExportBuyerView(c *fiber.Ctx) error {
	// Get only items marked for sale
	items, err := h.getExportItems(c)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Filter for items with decision = "sell" or "sold"
	buyerItems := []map[string]interface{}{}
	for _, item := range items {
		if decision, ok := item["decision"].(string); ok {
			if decision == "Sell" || decision == "Sold" {
				buyerItems = append(buyerItems, item)
			}
		}
	}

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)

	// Title
	pdf.Cell(190, 15, "Items Available for Purchase")
	pdf.Ln(20)

	pdf.SetFont("Arial", "", 10)
	pdf.Cell(190, 8, "Generated on "+time.Now().Format("January 2, 2006 at 3:04 PM"))
	pdf.Ln(15)

	// Items
	for _, item := range buyerItems {
		// Check if we need a new page
		if pdf.GetY() > 250 {
			pdf.AddPage()
		}

		// Item name
		pdf.SetFont("Arial", "B", 12)
		pdf.Cell(190, 8, fmt.Sprintf("%v", item["name"]))
		pdf.Ln(8)

		// Details
		pdf.SetFont("Arial", "", 10)
		
		// Category and Room
		pdf.Cell(95, 6, fmt.Sprintf("Category: %v", item["category"]))
		pdf.Cell(95, 6, fmt.Sprintf("Room: %v", item["room_name"]))
		pdf.Ln(6)

		// Prices
		if item["asking_price"] != nil {
			pdf.SetFont("Arial", "B", 11)
			pdf.Cell(95, 6, fmt.Sprintf("Asking Price: $%.2f", item["asking_price"]))
		} else if item["purchase_price"] != nil {
			pdf.SetFont("Arial", "", 10)
			pdf.Cell(95, 6, fmt.Sprintf("Original Price: $%.2f", item["purchase_price"]))
		}
		
		if item["decision"] == "Sold" {
			pdf.SetFont("Arial", "I", 10)
			pdf.Cell(95, 6, "Status: SOLD")
		}
		pdf.Ln(8)

		// Description
		if item["description"] != nil && fmt.Sprintf("%v", item["description"]) != "<nil>" {
			pdf.SetFont("Arial", "", 10)
			description := fmt.Sprintf("%v", item["description"])
			if len(description) > 100 {
				description = description[:97] + "..."
			}
			pdf.Cell(190, 6, description)
			pdf.Ln(6)
		}

		// Condition
		if item["condition"] != nil && fmt.Sprintf("%v", item["condition"]) != "<nil>" {
			pdf.SetFont("Arial", "I", 9)
			pdf.Cell(190, 6, fmt.Sprintf("Condition: %v", item["condition"]))
			pdf.Ln(6)
		}

		pdf.Ln(5)
		// Add a line separator
		pdf.Line(10, pdf.GetY(), 200, pdf.GetY())
		pdf.Ln(8)
	}

	// Generate filename with timestamp
	filename := fmt.Sprintf("buyer_catalog_%s.pdf", time.Now().Format("2006-01-02_15-04-05"))

	// Output to buffer
	var buf bytes.Buffer
	err = pdf.Output(&buf)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Set headers for download
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Set("Content-Length", fmt.Sprintf("%d", buf.Len()))

	return c.Send(buf.Bytes())
}

// Import
func (h *Handler) ImportExcel(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) SetupDatabase(c *fiber.Ctx) error {
	// Simple database setup endpoint - calls the Python setup script
	
	// Execute the setup script
	cmd := exec.Command("python3", "/app/scripts/setup-production-db.py")
	cmd.Env = append(os.Environ(), "DATABASE_URL=" + os.Getenv("DATABASE_URL"))
	
	output, err := cmd.CombinedOutput()
	
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": err.Error(),
			"output": string(output),
		})
	}
	
	// Parse output to get statistics
	outputStr := string(output)
	lines := strings.Split(outputStr, "\n")
	
	stats := fiber.Map{
		"success": true,
		"output": outputStr,
	}
	
	// Extract key metrics from output
	for _, line := range lines {
		if strings.Contains(line, "Items:") {
			stats["items"] = strings.TrimSpace(strings.Split(line, ":")[1])
		}
		if strings.Contains(line, "Total Value:") {
			stats["total_value"] = strings.TrimSpace(strings.Split(line, ":")[1])
		}
	}
	
	return c.JSON(stats)
}

// Transactions
func (h *Handler) GetTransactions(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"transactions": []interface{}{}})
}

func (h *Handler) CreateTransaction(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"success": true})
}

// Webhooks
func (h *Handler) HandleNANDAWebhook(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) HandleN8NWebhook(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"success": true})
}