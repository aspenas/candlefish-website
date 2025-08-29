package handlers

import (
	"net/http"
	
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/patricksmith/highline-inventory/domain/dto"
	"github.com/patricksmith/highline-inventory/services"
)

// ItemHandler handles HTTP requests for items
type ItemHandler struct {
	itemService *services.ItemService
}

// NewItemHandler creates a new item handler
func NewItemHandler(itemService *services.ItemService) *ItemHandler {
	return &ItemHandler{
		itemService: itemService,
	}
}

// GetItems handles GET /api/items
func (h *ItemHandler) GetItems(c *fiber.Ctx) error {
	// Parse query parameters into filters
	filters := dto.ItemFiltersDTO{
		Limit:  c.QueryInt("limit", 50),
		Offset: c.QueryInt("offset", 0),
	}
	
	// Optional filters
	if roomID := c.QueryInt("room_id", 0); roomID > 0 {
		filters.RoomID = &roomID
	}
	
	if category := c.Query("category"); category != "" {
		filters.Category = &category
	}
	
	if status := c.Query("status"); status != "" {
		filters.Status = &status
	}
	
	if minValue := c.QueryFloat("min_value", 0); minValue > 0 {
		filters.MinValue = &minValue
	}
	
	if maxValue := c.QueryFloat("max_value", 0); maxValue > 0 {
		filters.MaxValue = &maxValue
	}
	
	if search := c.Query("search"); search != "" {
		filters.SearchTerm = &search
	}
	
	// Get items from service
	items, err := h.itemService.GetItems(c.Context(), filters)
	if err != nil {
		return h.errorResponse(c, err)
	}
	
	return c.JSON(fiber.Map{
		"success": true,
		"data":    items,
		"count":   len(items),
	})
}

// GetItemByID handles GET /api/items/:id
func (h *ItemHandler) GetItemByID(c *fiber.Ctx) error {
	// Parse ID from URL
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid item ID format",
		})
	}
	
	// Get item from service
	item, err := h.itemService.GetItemByID(c.Context(), id)
	if err != nil {
		return h.errorResponse(c, err)
	}
	
	return c.JSON(fiber.Map{
		"success": true,
		"data":    item,
	})
}

// CreateItem handles POST /api/items
func (h *ItemHandler) CreateItem(c *fiber.Ctx) error {
	// Parse request body
	var input dto.CreateItemDTO
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}
	
	// Create item via service
	item, err := h.itemService.CreateItem(c.Context(), input)
	if err != nil {
		return h.errorResponse(c, err)
	}
	
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    item,
		"message": "Item created successfully",
	})
}

// UpdateItem handles PUT /api/items/:id
func (h *ItemHandler) UpdateItem(c *fiber.Ctx) error {
	// Parse ID from URL
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid item ID format",
		})
	}
	
	// Parse request body
	var input dto.UpdateItemDTO
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}
	
	// Update item via service
	item, err := h.itemService.UpdateItem(c.Context(), id, input)
	if err != nil {
		return h.errorResponse(c, err)
	}
	
	return c.JSON(fiber.Map{
		"success": true,
		"data":    item,
		"message": "Item updated successfully",
	})
}

// DeleteItem handles DELETE /api/items/:id
func (h *ItemHandler) DeleteItem(c *fiber.Ctx) error {
	// Parse ID from URL
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid item ID format",
		})
	}
	
	// Delete item via service
	if err := h.itemService.DeleteItem(c.Context(), id); err != nil {
		return h.errorResponse(c, err)
	}
	
	return c.JSON(fiber.Map{
		"success": true,
		"message": "Item deleted successfully",
	})
}

// SearchItems handles GET /api/items/search
func (h *ItemHandler) SearchItems(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Search query is required",
		})
	}
	
	// Search via service
	items, err := h.itemService.SearchItems(c.Context(), query)
	if err != nil {
		return h.errorResponse(c, err)
	}
	
	return c.JSON(fiber.Map{
		"success": true,
		"data":    items,
		"count":   len(items),
		"query":   query,
	})
}

// GetItemStats handles GET /api/items/stats
func (h *ItemHandler) GetItemStats(c *fiber.Ctx) error {
	stats, err := h.itemService.GetItemStats(c.Context())
	if err != nil {
		return h.errorResponse(c, err)
	}
	
	return c.JSON(fiber.Map{
		"success": true,
		"data":    stats,
	})
}

// BulkUpdateItems handles PUT /api/items/bulk
func (h *ItemHandler) BulkUpdateItems(c *fiber.Ctx) error {
	var updates []dto.BulkUpdateItemDTO
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}
	
	// Process each update
	successCount := 0
	errors := []string{}
	
	for _, update := range updates {
		if _, err := h.itemService.UpdateItem(c.Context(), update.ID, update.UpdateItemDTO); err != nil {
			errors = append(errors, err.Error())
		} else {
			successCount++
		}
	}
	
	if len(errors) > 0 {
		return c.Status(fiber.StatusPartialContent).JSON(fiber.Map{
			"success":       false,
			"message":       "Some items failed to update",
			"successCount":  successCount,
			"failureCount":  len(errors),
			"errors":        errors,
		})
	}
	
	return c.JSON(fiber.Map{
		"success": true,
		"message": "All items updated successfully",
		"count":   successCount,
	})
}

// Helper method for error responses
func (h *ItemHandler) errorResponse(c *fiber.Ctx, err error) error {
	// Check for specific error types
	statusCode := fiber.StatusInternalServerError
	message := "Internal server error"
	
	errStr := err.Error()
	if contains(errStr, "not found") {
		statusCode = fiber.StatusNotFound
		message = "Resource not found"
	} else if contains(errStr, "validation") {
		statusCode = fiber.StatusBadRequest
		message = err.Error()
	} else if contains(errStr, "unauthorized") {
		statusCode = fiber.StatusUnauthorized
		message = "Unauthorized"
	}
	
	return c.Status(statusCode).JSON(fiber.Map{
		"success": false,
		"error":   message,
	})
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && s[:len(substr)] == substr
}