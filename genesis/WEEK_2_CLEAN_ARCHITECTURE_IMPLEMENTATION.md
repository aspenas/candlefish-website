# Week 2 Clean Architecture Implementation Plan
## Based on Phase 1 Results Analysis

### 📊 Current State (After Phase 1 Scripts)
- **Security**: Templates created but NOT applied (CRITICAL)
- **Performance**: Only chart.js removed, bundle still 2.3MB
- **Architecture Score**: 42/100 (CRITICAL)
- **Technical Debt**: God objects and SQL in handlers remain

### 🎯 Week 2 Priority Actions

## Day 8-9: Complete Phase 1 Fixes
**MUST DO IMMEDIATELY:**
```bash
# Run the comprehensive fix script
./APPLY_ALL_FIXES_NOW.sh

# Verify all fixes applied
./clean-architecture-monitor.sh
```

## Day 10-11: Repository Pattern Migration

### 1. Create Repository Layer
```go
// backend/repositories/item_repository.go
package repositories

import (
    "context"
    "database/sql"
    "github.com/patricksmith/highline-inventory/models"
)

type ItemRepository interface {
    FindByID(ctx context.Context, id string) (*models.Item, error)
    FindAll(ctx context.Context, limit, offset int) ([]*models.Item, error)
    Create(ctx context.Context, item *models.Item) error
    Update(ctx context.Context, item *models.Item) error
    Delete(ctx context.Context, id string) error
    Search(ctx context.Context, query string) ([]*models.Item, error)
}

type itemRepository struct {
    *BaseRepository
}

func NewItemRepository(db *sql.DB) ItemRepository {
    return &itemRepository{
        BaseRepository: NewBaseRepository(db),
    }
}

func (r *itemRepository) FindByID(ctx context.Context, id string) (*models.Item, error) {
    query := `
        SELECT id, name, description, category, room_id, quantity, 
               purchase_price, current_value, condition, status, 
               created_at, updated_at
        FROM items 
        WHERE id = $1 AND deleted_at IS NULL
    `
    
    var item models.Item
    err := r.GetDB().QueryRowContext(ctx, query, id).Scan(
        &item.ID, &item.Name, &item.Description, &item.Category,
        &item.RoomID, &item.Quantity, &item.PurchasePrice,
        &item.CurrentValue, &item.Condition, &item.Status,
        &item.CreatedAt, &item.UpdatedAt,
    )
    
    if err == sql.ErrNoRows {
        return nil, ErrNotFound
    }
    
    return &item, err
}
```

### 2. Create Service Layer
```go
// backend/services/item_service.go
package services

import (
    "context"
    "fmt"
    "github.com/patricksmith/highline-inventory/repositories"
    "github.com/patricksmith/highline-inventory/models"
)

type ItemService interface {
    GetItem(ctx context.Context, id string) (*models.ItemDTO, error)
    ListItems(ctx context.Context, filter ItemFilter) (*ItemListResponse, error)
    CreateItem(ctx context.Context, input CreateItemInput) (*models.ItemDTO, error)
    UpdateItem(ctx context.Context, id string, input UpdateItemInput) (*models.ItemDTO, error)
    DeleteItem(ctx context.Context, id string) error
    CalculateValue(ctx context.Context, id string) (*ValuationResult, error)
}

type itemService struct {
    itemRepo      repositories.ItemRepository
    activityRepo  repositories.ActivityRepository
    cache         Cache
}

func NewItemService(
    itemRepo repositories.ItemRepository,
    activityRepo repositories.ActivityRepository,
    cache Cache,
) ItemService {
    return &itemService{
        itemRepo:     itemRepo,
        activityRepo: activityRepo,
        cache:        cache,
    }
}

func (s *itemService) GetItem(ctx context.Context, id string) (*models.ItemDTO, error) {
    // Check cache first
    if cached, ok := s.cache.Get(fmt.Sprintf("item:%s", id)); ok {
        return cached.(*models.ItemDTO), nil
    }
    
    // Fetch from repository
    item, err := s.itemRepo.FindByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("find item: %w", err)
    }
    
    // Transform to DTO
    dto := s.toDTO(item)
    
    // Cache the result
    s.cache.Set(fmt.Sprintf("item:%s", id), dto, 5*time.Minute)
    
    // Log activity
    _ = s.activityRepo.LogActivity(ctx, "item_viewed", id)
    
    return dto, nil
}
```

## Day 12-13: Clean Handler Implementation

### 3. Refactor Handlers to Use Services
```go
// backend/handlers/item_handler.go
package handlers

import (
    "github.com/gofiber/fiber/v2"
    "github.com/patricksmith/highline-inventory/services"
)

type ItemHandler struct {
    itemService services.ItemService
}

func NewItemHandler(itemService services.ItemService) *ItemHandler {
    return &ItemHandler{
        itemService: itemService,
    }
}

func (h *ItemHandler) GetItem(c *fiber.Ctx) error {
    ctx := c.Context()
    id := c.Params("id")
    
    item, err := h.itemService.GetItem(ctx, id)
    if err != nil {
        if errors.Is(err, services.ErrNotFound) {
            return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
                "error": "Item not found",
            })
        }
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch item",
        })
    }
    
    return c.JSON(item)
}

func (h *ItemHandler) CreateItem(c *fiber.Ctx) error {
    var input services.CreateItemInput
    if err := c.BodyParser(&input); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid request body",
        })
    }
    
    // Validate input
    if err := input.Validate(); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": err.Error(),
        })
    }
    
    item, err := h.itemService.CreateItem(c.Context(), input)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to create item",
        })
    }
    
    return c.Status(fiber.StatusCreated).JSON(item)
}
```

## Day 14: Testing & Verification

### 4. Add Integration Tests
```go
// backend/tests/integration/item_test.go
package integration

import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/suite"
)

type ItemTestSuite struct {
    suite.Suite
    db      *sql.DB
    service services.ItemService
}

func (suite *ItemTestSuite) SetupTest() {
    // Setup test database
    suite.db = setupTestDB()
    
    // Create repositories
    itemRepo := repositories.NewItemRepository(suite.db)
    activityRepo := repositories.NewActivityRepository(suite.db)
    
    // Create service
    suite.service = services.NewItemService(itemRepo, activityRepo, cache.New())
}

func (suite *ItemTestSuite) TestCreateItem() {
    input := services.CreateItemInput{
        Name:        "Test Item",
        Description: "Test Description",
        Category:    "Electronics",
        Quantity:    1,
    }
    
    item, err := suite.service.CreateItem(context.Background(), input)
    
    assert.NoError(suite.T(), err)
    assert.NotEmpty(suite.T(), item.ID)
    assert.Equal(suite.T(), "Test Item", item.Name)
}

func TestItemSuite(t *testing.T) {
    suite.Run(t, new(ItemTestSuite))
}
```

### 5. Performance Monitoring Script
```bash
#!/bin/bash
# backend/monitor-performance.sh

echo "📊 Performance Metrics Report"
echo "=============================="

# Check bundle size
BUNDLE_SIZE=$(du -sh ../frontend/dist 2>/dev/null | awk '{print $1}')
echo "Bundle Size: $BUNDLE_SIZE"

# Check memory usage
GO_MEM=$(ps aux | grep highline-inventory | awk '{print $6}')
echo "Backend Memory: ${GO_MEM}KB"

# Count SQL queries in handlers (should be 0)
SQL_IN_HANDLERS=$(grep -r "SELECT\|INSERT\|UPDATE\|DELETE" handlers/*.go | wc -l)
echo "SQL in Handlers: $SQL_IN_HANDLERS (should be 0)"

# Check test coverage
COVERAGE=$(go test -cover ./... | grep coverage | awk '{print $2}')
echo "Test Coverage: $COVERAGE"

# Architecture score
REPO_COUNT=$(find . -name "*repository.go" | wc -l)
SERVICE_COUNT=$(find . -name "*service.go" | wc -l)
echo "Repositories: $REPO_COUNT"
echo "Services: $SERVICE_COUNT"

if [ $SQL_IN_HANDLERS -eq 0 ] && [ $REPO_COUNT -gt 5 ]; then
    echo "✅ Clean Architecture: PASSED"
else
    echo "❌ Clean Architecture: FAILED"
fi
```

## 📋 Week 2 Checklist

### Must Complete:
- [ ] Run APPLY_ALL_FIXES_NOW.sh
- [ ] JWT security fix applied
- [ ] SQL injection protection implemented
- [ ] Memory leak fixes applied
- [ ] Bundle size < 1MB
- [ ] All repositories created
- [ ] All services implemented
- [ ] Handlers refactored
- [ ] 80% test coverage

### Success Metrics:
- Architecture Score: 75/100 → 92/100
- Bundle Size: 2.3MB → <1MB
- Memory Usage: 450MB → 300MB
- SQL in Handlers: Many → 0
- Test Coverage: 20% → 80%

### Commands to Execute:
```bash
# Day 8-9: Apply all fixes
./APPLY_ALL_FIXES_NOW.sh
./clean-architecture-monitor.sh

# Day 10-11: Build and test repository pattern
cd ../5470_S_Highline_Circle/backend
go mod tidy
go build
go test ./repositories/...

# Day 12-13: Test services
go test ./services/...
go test ./handlers/...

# Day 14: Full integration test
go test ./... -cover
cd ../frontend && npm test
npm run build

# Final verification
./monitor-performance.sh
```

## 🚨 Critical Path Items

1. **IMMEDIATE (Today)**: Apply security fixes - system is vulnerable
2. **URGENT (24hrs)**: Reduce bundle size - 2.3MB is unacceptable
3. **HIGH (48hrs)**: Implement repository pattern - remove SQL from handlers
4. **MEDIUM (Week)**: Complete service layer - business logic separation
5. **ONGOING**: Add tests - maintain 80% coverage

## 📈 Expected Outcomes After Week 2

### Technical Improvements:
- **Security**: All vulnerabilities patched
- **Performance**: 60% faster load time
- **Maintainability**: 10x easier to modify
- **Testability**: Full unit test coverage
- **Scalability**: Ready for microservices

### Business Impact:
- **User Experience**: 2-second faster page loads
- **Development Speed**: 50% faster feature delivery
- **Bug Reduction**: 70% fewer production issues
- **Team Confidence**: Clean, testable codebase

---

**Next Step**: Execute `./APPLY_ALL_FIXES_NOW.sh` immediately to apply all security and performance fixes that were only templated in Phase 1.