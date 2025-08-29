package services

import (
	"context"
	"fmt"
	"time"
	
	"github.com/google/uuid"
	"github.com/patricksmith/highline-inventory/domain/dto"
	"github.com/patricksmith/highline-inventory/domain/models"
	"github.com/patricksmith/highline-inventory/repositories"
)

// ItemService handles business logic for items
type ItemService struct {
	itemRepo     repositories.ItemRepository
	activityRepo repositories.ActivityRepository
	cache        CacheService
}

// NewItemService creates a new item service
func NewItemService(
	itemRepo repositories.ItemRepository,
	activityRepo repositories.ActivityRepository,
	cache CacheService,
) *ItemService {
	return &ItemService{
		itemRepo:     itemRepo,
		activityRepo: activityRepo,
		cache:        cache,
	}
}

// GetItems retrieves items with filters and transforms to DTOs
func (s *ItemService) GetItems(ctx context.Context, filters dto.ItemFiltersDTO) ([]dto.ItemDTO, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("items:%v", filters)
	if cached, found := s.cache.Get(cacheKey); found {
		if items, ok := cached.([]dto.ItemDTO); ok {
			return items, nil
		}
	}
	
	// Convert DTO filters to repository filters
	repoFilters := repositories.ItemFilters{
		RoomID:     filters.RoomID,
		Category:   filters.Category,
		Status:     filters.Status,
		MinValue:   filters.MinValue,
		MaxValue:   filters.MaxValue,
		SearchTerm: filters.SearchTerm,
		Limit:      filters.Limit,
		Offset:     filters.Offset,
	}
	
	// Fetch from repository
	items, err := s.itemRepo.GetAll(ctx, repoFilters)
	if err != nil {
		return nil, fmt.Errorf("fetching items: %w", err)
	}
	
	// Transform to DTOs
	itemDTOs := s.transformToItemDTOs(items)
	
	// Cache the results
	s.cache.Set(cacheKey, itemDTOs, 5*time.Minute)
	
	return itemDTOs, nil
}

// GetItemByID retrieves a single item by ID
func (s *ItemService) GetItemByID(ctx context.Context, id uuid.UUID) (*dto.ItemDetailDTO, error) {
	// Check cache
	cacheKey := fmt.Sprintf("item:%s", id)
	if cached, found := s.cache.Get(cacheKey); found {
		if item, ok := cached.(*dto.ItemDetailDTO); ok {
			return item, nil
		}
	}
	
	// Fetch from repository
	item, err := s.itemRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("fetching item: %w", err)
	}
	
	// Get recent activities for this item
	activities, err := s.activityRepo.GetByItemID(ctx, id, 10)
	if err != nil {
		// Log error but don't fail the request
		activities = []models.Activity{}
	}
	
	// Transform to detailed DTO
	itemDTO := s.transformToItemDetailDTO(item, activities)
	
	// Cache the result
	s.cache.Set(cacheKey, itemDTO, 5*time.Minute)
	
	return itemDTO, nil
}

// CreateItem creates a new item
func (s *ItemService) CreateItem(ctx context.Context, input dto.CreateItemDTO) (*dto.ItemDTO, error) {
	// Validate input
	if err := s.validateCreateItem(input); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}
	
	// Create model from DTO
	item := &models.Item{
		ID:             uuid.New(),
		Name:           input.Name,
		Description:    input.Description,
		Category:       input.Category,
		Quantity:       input.Quantity,
		PurchasePrice:  input.PurchasePrice,
		CurrentValue:   input.CurrentValue,
		RoomID:         input.RoomID,
		Status:         "Active",
		Barcode:        input.Barcode,
		QRCode:         input.QRCode,
		SerialNumber:   input.SerialNumber,
		ModelNumber:    input.ModelNumber,
		Manufacturer:   input.Manufacturer,
		Notes:          input.Notes,
		Tags:           input.Tags,
		Metadata:       input.Metadata,
	}
	
	// Save to repository
	if err := s.itemRepo.Create(ctx, item); err != nil {
		return nil, fmt.Errorf("creating item: %w", err)
	}
	
	// Log activity
	s.activityRepo.LogActivity(ctx, models.Activity{
		Action:   models.ActivityActionCreate,
		ItemID:   &item.ID,
		ItemName: &item.Name,
		Details:  stringPtr("Item created"),
	})
	
	// Invalidate cache
	s.cache.Delete("items:*")
	
	// Return DTO
	return s.transformToItemDTO(*item), nil
}

// UpdateItem updates an existing item
func (s *ItemService) UpdateItem(ctx context.Context, id uuid.UUID, input dto.UpdateItemDTO) (*dto.ItemDTO, error) {
	// Fetch existing item
	existing, err := s.itemRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("item not found: %w", err)
	}
	
	// Track changes for activity log
	var changes []string
	
	// Apply updates
	if input.Name != nil && *input.Name != existing.Name {
		changes = append(changes, fmt.Sprintf("Name: %s → %s", existing.Name, *input.Name))
		existing.Name = *input.Name
	}
	
	if input.Description != nil && *input.Description != existing.Description {
		changes = append(changes, "Description updated")
		existing.Description = *input.Description
	}
	
	if input.Category != nil && *input.Category != existing.Category {
		changes = append(changes, fmt.Sprintf("Category: %s → %s", existing.Category, *input.Category))
		existing.Category = *input.Category
	}
	
	if input.Quantity != nil && *input.Quantity != existing.Quantity {
		changes = append(changes, fmt.Sprintf("Quantity: %d → %d", existing.Quantity, *input.Quantity))
		existing.Quantity = *input.Quantity
	}
	
	if input.CurrentValue != nil && *input.CurrentValue != existing.CurrentValue {
		changes = append(changes, fmt.Sprintf("Value: $%.2f → $%.2f", existing.CurrentValue, *input.CurrentValue))
		existing.CurrentValue = *input.CurrentValue
	}
	
	if input.RoomID != nil && *input.RoomID != existing.RoomID {
		changes = append(changes, fmt.Sprintf("Room changed"))
		existing.RoomID = *input.RoomID
	}
	
	if input.Status != nil && *input.Status != existing.Status {
		changes = append(changes, fmt.Sprintf("Status: %s → %s", existing.Status, *input.Status))
		existing.Status = *input.Status
	}
	
	// Update other fields...
	if input.Barcode != nil {
		existing.Barcode = input.Barcode
	}
	if input.QRCode != nil {
		existing.QRCode = input.QRCode
	}
	if input.SerialNumber != nil {
		existing.SerialNumber = input.SerialNumber
	}
	if input.ModelNumber != nil {
		existing.ModelNumber = input.ModelNumber
	}
	if input.Manufacturer != nil {
		existing.Manufacturer = input.Manufacturer
	}
	if input.Notes != nil {
		existing.Notes = input.Notes
	}
	if input.Tags != nil {
		existing.Tags = input.Tags
	}
	if input.Metadata != nil {
		existing.Metadata = input.Metadata
	}
	
	// Save updates
	if err := s.itemRepo.Update(ctx, existing); err != nil {
		return nil, fmt.Errorf("updating item: %w", err)
	}
	
	// Log activity if there were changes
	if len(changes) > 0 {
		details := fmt.Sprintf("Updated: %v", changes)
		s.activityRepo.LogActivity(ctx, models.Activity{
			Action:   models.ActivityActionUpdate,
			ItemID:   &id,
			ItemName: &existing.Name,
			Details:  &details,
		})
	}
	
	// Invalidate cache
	s.cache.Delete(fmt.Sprintf("item:%s", id))
	s.cache.Delete("items:*")
	
	// Return updated DTO
	return s.transformToItemDTO(*existing), nil
}

// DeleteItem removes an item
func (s *ItemService) DeleteItem(ctx context.Context, id uuid.UUID) error {
	// Fetch item for activity log
	item, err := s.itemRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("item not found: %w", err)
	}
	
	// Delete from repository
	if err := s.itemRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("deleting item: %w", err)
	}
	
	// Log activity
	details := fmt.Sprintf("Item deleted: %s", item.Name)
	s.activityRepo.LogActivity(ctx, models.Activity{
		Action:   models.ActivityActionDelete,
		ItemID:   &id,
		ItemName: &item.Name,
		Details:  &details,
	})
	
	// Invalidate cache
	s.cache.Delete(fmt.Sprintf("item:%s", id))
	s.cache.Delete("items:*")
	
	return nil
}

// SearchItems performs a search across items
func (s *ItemService) SearchItems(ctx context.Context, query string) ([]dto.ItemDTO, error) {
	if query == "" {
		return []dto.ItemDTO{}, nil
	}
	
	// Check cache
	cacheKey := fmt.Sprintf("search:%s", query)
	if cached, found := s.cache.Get(cacheKey); found {
		if items, ok := cached.([]dto.ItemDTO); ok {
			return items, nil
		}
	}
	
	// Search in repository
	items, err := s.itemRepo.Search(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("searching items: %w", err)
	}
	
	// Transform to DTOs
	itemDTOs := s.transformToItemDTOs(items)
	
	// Cache results
	s.cache.Set(cacheKey, itemDTOs, 2*time.Minute)
	
	return itemDTOs, nil
}

// GetItemStats returns aggregate statistics
func (s *ItemService) GetItemStats(ctx context.Context) (*dto.ItemStatsDTO, error) {
	// Check cache
	cacheKey := "stats:items"
	if cached, found := s.cache.Get(cacheKey); found {
		if stats, ok := cached.(*dto.ItemStatsDTO); ok {
			return stats, nil
		}
	}
	
	// Get stats from repository
	stats, err := s.itemRepo.GetStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("fetching stats: %w", err)
	}
	
	// Transform to DTO
	statsDTO := &dto.ItemStatsDTO{
		TotalCount:     stats.TotalCount,
		TotalValue:     stats.TotalValue,
		AverageValue:   stats.AvgValue,
		CategoryCounts: stats.CategoryCounts,
		RoomCounts:     stats.RoomCounts,
	}
	
	// Cache results
	s.cache.Set(cacheKey, statsDTO, 10*time.Minute)
	
	return statsDTO, nil
}

// Helper functions

func (s *ItemService) validateCreateItem(input dto.CreateItemDTO) error {
	if input.Name == "" {
		return fmt.Errorf("name is required")
	}
	if input.Category == "" {
		return fmt.Errorf("category is required")
	}
	if input.Quantity < 1 {
		return fmt.Errorf("quantity must be at least 1")
	}
	if input.CurrentValue < 0 {
		return fmt.Errorf("current value cannot be negative")
	}
	return nil
}

func (s *ItemService) transformToItemDTO(item models.Item) *dto.ItemDTO {
	return &dto.ItemDTO{
		ID:           item.ID,
		Name:         item.Name,
		Description:  item.Description,
		Category:     item.Category,
		Quantity:     item.Quantity,
		CurrentValue: item.CurrentValue,
		RoomID:       item.RoomID,
		RoomName:     item.RoomName,
		Status:       item.Status,
		Barcode:      item.Barcode,
		QRCode:       item.QRCode,
		UpdatedAt:    item.UpdatedAt,
	}
}

func (s *ItemService) transformToItemDTOs(items []models.Item) []dto.ItemDTO {
	dtos := make([]dto.ItemDTO, len(items))
	for i, item := range items {
		dtos[i] = *s.transformToItemDTO(item)
	}
	return dtos
}

func (s *ItemService) transformToItemDetailDTO(item *models.Item, activities []models.Activity) *dto.ItemDetailDTO {
	activityDTOs := make([]dto.ActivityDTO, len(activities))
	for i, activity := range activities {
		activityDTOs[i] = dto.ActivityDTO{
			ID:        activity.ID,
			Action:    string(activity.Action),
			Details:   activity.Details,
			Timestamp: activity.CreatedAt,
		}
	}
	
	return &dto.ItemDetailDTO{
		ItemDTO: *s.transformToItemDTO(*item),
		PurchasePrice: item.PurchasePrice,
		SerialNumber:  item.SerialNumber,
		ModelNumber:   item.ModelNumber,
		Manufacturer:  item.Manufacturer,
		Notes:         item.Notes,
		Tags:          item.Tags,
		Metadata:      item.Metadata,
		CreatedAt:     item.CreatedAt,
		Activities:    activityDTOs,
	}
}

func stringPtr(s string) *string {
	return &s
}