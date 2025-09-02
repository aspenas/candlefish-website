package events

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/patricksmith/highline-inventory/models"
)

// EventType represents the type of valuation event
type EventType string

const (
	// Valuation events
	EventValuationCreated   EventType = "valuation.created"
	EventValuationUpdated   EventType = "valuation.updated"
	EventValuationExpired   EventType = "valuation.expired"
	
	// Market data events
	EventMarketDataUpdated  EventType = "market_data.updated"
	EventComparisonFound    EventType = "market_comparison.found"
	
	// Price events
	EventPriceChanged       EventType = "price.changed"
	EventPriceTrendDetected EventType = "price_trend.detected"
	
	// Request events
	EventRequestCreated     EventType = "request.created"
	EventRequestCompleted   EventType = "request.completed"
	EventRequestFailed      EventType = "request.failed"
	
	// System events
	EventCacheInvalidated   EventType = "cache.invalidated"
	EventBulkOperationStarted EventType = "bulk_operation.started"
	EventBulkOperationCompleted EventType = "bulk_operation.completed"
)

// Event represents a valuation system event
type Event struct {
	ID        uuid.UUID              `json:"id"`
	Type      EventType              `json:"type"`
	Source    string                 `json:"source"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
	ItemID    *uuid.UUID             `json:"item_id,omitempty"`
	UserID    *string                `json:"user_id,omitempty"`
}

// EventHandler defines the interface for event handlers
type EventHandler interface {
	Handle(ctx context.Context, event Event) error
	EventTypes() []EventType
}

// EventBus manages event publishing and subscription
type EventBus struct {
	handlers map[EventType][]EventHandler
	mutex    sync.RWMutex
	
	// Event channels for different priority levels
	highPriorityEvents chan Event
	normalPriorityEvents chan Event
	lowPriorityEvents chan Event
	
	// WebSocket connections for real-time updates
	wsConnections map[string]chan Event
	wsConnectionsMutex sync.RWMutex
}

// NewEventBus creates a new event bus
func NewEventBus() *EventBus {
	bus := &EventBus{
		handlers:             make(map[EventType][]EventHandler),
		highPriorityEvents:   make(chan Event, 1000),
		normalPriorityEvents: make(chan Event, 5000),
		lowPriorityEvents:    make(chan Event, 10000),
		wsConnections:        make(map[string]chan Event),
	}
	
	// Start event processors
	go bus.processHighPriorityEvents()
	go bus.processNormalPriorityEvents()
	go bus.processLowPriorityEvents()
	
	return bus
}

// Subscribe registers an event handler for specific event types
func (eb *EventBus) Subscribe(handler EventHandler) {
	eb.mutex.Lock()
	defer eb.mutex.Unlock()
	
	for _, eventType := range handler.EventTypes() {
		eb.handlers[eventType] = append(eb.handlers[eventType], handler)
	}
}

// Publish publishes an event to all registered handlers
func (eb *EventBus) Publish(event Event) {
	if event.ID == uuid.Nil {
		event.ID = uuid.New()
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}
	
	// Route to appropriate priority queue
	priority := eb.getEventPriority(event.Type)
	
	select {
	case eb.highPriorityEvents <- event:
		if priority == "high" {
			return
		}
	default:
	}
	
	select {
	case eb.normalPriorityEvents <- event:
		if priority == "normal" {
			return
		}
	default:
	}
	
	select {
	case eb.lowPriorityEvents <- event:
	default:
		log.Printf("Event queue full, dropping event: %s", event.Type)
	}
}

// PublishValuationCreated publishes a valuation created event
func (eb *EventBus) PublishValuationCreated(valuation *models.ItemValuation, source string) {
	event := Event{
		Type:   EventValuationCreated,
		Source: source,
		ItemID: &valuation.ItemID,
		Data: map[string]interface{}{
			"valuation_id":     valuation.ID,
			"item_id":          valuation.ItemID,
			"method":           valuation.ValuationMethod,
			"estimated_value":  valuation.EstimatedValue,
			"confidence_score": valuation.ConfidenceScore,
		},
	}
	eb.Publish(event)
}

// PublishPriceChanged publishes a price change event
func (eb *EventBus) PublishPriceChanged(itemID uuid.UUID, priceType string, oldPrice, newPrice float64, source string) {
	event := Event{
		Type:   EventPriceChanged,
		Source: source,
		ItemID: &itemID,
		Data: map[string]interface{}{
			"item_id":    itemID,
			"price_type": priceType,
			"old_price":  oldPrice,
			"new_price":  newPrice,
			"change":     newPrice - oldPrice,
			"change_percent": func() float64 {
				if oldPrice == 0 {
					return 0
				}
				return ((newPrice - oldPrice) / oldPrice) * 100
			}(),
		},
	}
	eb.Publish(event)
}

// PublishMarketDataUpdated publishes a market data update event
func (eb *EventBus) PublishMarketDataUpdated(itemID uuid.UUID, comparisons []models.MarketComparison, source string) {
	event := Event{
		Type:   EventMarketDataUpdated,
		Source: source,
		ItemID: &itemID,
		Data: map[string]interface{}{
			"item_id":           itemID,
			"comparisons_count": len(comparisons),
			"sources":           eb.extractMarketSources(comparisons),
		},
	}
	eb.Publish(event)
}

// PublishRequestCompleted publishes a request completion event
func (eb *EventBus) PublishRequestCompleted(request *models.ValuationRequest, results interface{}) {
	event := Event{
		Type:   EventRequestCompleted,
		Source: "valuation_service",
		ItemID: &request.ItemID,
		Data: map[string]interface{}{
			"request_id":   request.ID,
			"item_id":      request.ItemID,
			"request_type": request.RequestType,
			"results":      results,
			"duration":     time.Since(request.CreatedAt).Seconds(),
		},
	}
	eb.Publish(event)
}

// SubscribeWebSocket subscribes a WebSocket connection to events
func (eb *EventBus) SubscribeWebSocket(connectionID string) chan Event {
	eb.wsConnectionsMutex.Lock()
	defer eb.wsConnectionsMutex.Unlock()
	
	eventChan := make(chan Event, 100)
	eb.wsConnections[connectionID] = eventChan
	
	return eventChan
}

// UnsubscribeWebSocket removes a WebSocket connection
func (eb *EventBus) UnsubscribeWebSocket(connectionID string) {
	eb.wsConnectionsMutex.Lock()
	defer eb.wsConnectionsMutex.Unlock()
	
	if eventChan, exists := eb.wsConnections[connectionID]; exists {
		close(eventChan)
		delete(eb.wsConnections, connectionID)
	}
}

// Private methods

func (eb *EventBus) processHighPriorityEvents() {
	for event := range eb.highPriorityEvents {
		eb.handleEvent(event)
	}
}

func (eb *EventBus) processNormalPriorityEvents() {
	for event := range eb.normalPriorityEvents {
		eb.handleEvent(event)
	}
}

func (eb *EventBus) processLowPriorityEvents() {
	for event := range eb.lowPriorityEvents {
		eb.handleEvent(event)
	}
}

func (eb *EventBus) handleEvent(event Event) {
	// Send to registered handlers
	eb.mutex.RLock()
	handlers := eb.handlers[event.Type]
	eb.mutex.RUnlock()
	
	for _, handler := range handlers {
		go func(h EventHandler, e Event) {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			
			if err := h.Handle(ctx, e); err != nil {
				log.Printf("Error handling event %s: %v", e.Type, err)
			}
		}(handler, event)
	}
	
	// Send to WebSocket subscribers
	eb.sendToWebSocketSubscribers(event)
}

func (eb *EventBus) sendToWebSocketSubscribers(event Event) {
	eb.wsConnectionsMutex.RLock()
	defer eb.wsConnectionsMutex.RUnlock()
	
	for connectionID, eventChan := range eb.wsConnections {
		select {
		case eventChan <- event:
		default:
			log.Printf("WebSocket event channel full for connection: %s", connectionID)
		}
	}
}

func (eb *EventBus) getEventPriority(eventType EventType) string {
	highPriorityEvents := []EventType{
		EventPriceChanged,
		EventValuationExpired,
		EventRequestFailed,
	}
	
	for _, highPriority := range highPriorityEvents {
		if eventType == highPriority {
			return "high"
		}
	}
	
	return "normal"
}

func (eb *EventBus) extractMarketSources(comparisons []models.MarketComparison) []string {
	sourceMap := make(map[string]bool)
	for _, comp := range comparisons {
		sourceMap[string(comp.Source)] = true
	}
	
	var sources []string
	for source := range sourceMap {
		sources = append(sources, source)
	}
	
	return sources
}

// Specific Event Handlers

// CacheInvalidationHandler handles cache invalidation on valuation events
type CacheInvalidationHandler struct {
	cacheService CacheServiceInterface
}

type CacheServiceInterface interface {
	Invalidate(ctx context.Context, pattern string) error
	Delete(ctx context.Context, key string) error
}

func NewCacheInvalidationHandler(cacheService CacheServiceInterface) *CacheInvalidationHandler {
	return &CacheInvalidationHandler{cacheService: cacheService}
}

func (h *CacheInvalidationHandler) EventTypes() []EventType {
	return []EventType{
		EventValuationCreated,
		EventValuationUpdated,
		EventPriceChanged,
		EventMarketDataUpdated,
	}
}

func (h *CacheInvalidationHandler) Handle(ctx context.Context, event Event) error {
	if event.ItemID == nil {
		return nil
	}
	
	itemID := event.ItemID.String()
	
	// Invalidate item-specific cache entries
	patterns := []string{
		"valuation:current:" + itemID,
		"valuation:item:" + itemID,
		"market:comparisons:" + itemID,
	}
	
	for _, pattern := range patterns {
		if err := h.cacheService.Delete(ctx, pattern); err != nil {
			log.Printf("Failed to invalidate cache for pattern %s: %v", pattern, err)
		}
	}
	
	// Invalidate aggregate cache entries
	aggregatePatterns := []string{
		"valuation:pricing_insights",
		"valuation:room_summary:",
	}
	
	for _, pattern := range aggregatePatterns {
		if err := h.cacheService.Invalidate(ctx, pattern); err != nil {
			log.Printf("Failed to invalidate aggregate cache for pattern %s: %v", pattern, err)
		}
	}
	
	return nil
}

// WebSocketNotificationHandler sends real-time updates to WebSocket clients
type WebSocketNotificationHandler struct {
	eventBus *EventBus
}

func NewWebSocketNotificationHandler(eventBus *EventBus) *WebSocketNotificationHandler {
	return &WebSocketNotificationHandler{eventBus: eventBus}
}

func (h *WebSocketNotificationHandler) EventTypes() []EventType {
	return []EventType{
		EventValuationCreated,
		EventValuationUpdated,
		EventPriceChanged,
		EventMarketDataUpdated,
		EventRequestCompleted,
	}
}

func (h *WebSocketNotificationHandler) Handle(ctx context.Context, event Event) error {
	// This handler is automatically called by the event bus
	// The actual WebSocket sending is handled in sendToWebSocketSubscribers
	return nil
}

// AuditLogHandler logs important events for audit purposes
type AuditLogHandler struct {
	// In production, this would write to a persistent audit log
}

func NewAuditLogHandler() *AuditLogHandler {
	return &AuditLogHandler{}
}

func (h *AuditLogHandler) EventTypes() []EventType {
	return []EventType{
		EventValuationCreated,
		EventValuationUpdated,
		EventPriceChanged,
		EventRequestCreated,
		EventRequestCompleted,
	}
}

func (h *AuditLogHandler) Handle(ctx context.Context, event Event) error {
	// Log the event for audit purposes
	eventJSON, _ := json.Marshal(event)
	log.Printf("AUDIT: %s", string(eventJSON))
	
	// In production, write to persistent storage
	// return h.auditStorage.Store(ctx, event)
	
	return nil
}

// MarketTrendAnalysisHandler analyzes price trends and generates insights
type MarketTrendAnalysisHandler struct {
	valuationService ValuationServiceInterface
}

type ValuationServiceInterface interface {
	AnalyzePriceTrend(ctx context.Context, itemID uuid.UUID) error
	UpdateMarketTrends(ctx context.Context) error
}

func NewMarketTrendAnalysisHandler(valuationService ValuationServiceInterface) *MarketTrendAnalysisHandler {
	return &MarketTrendAnalysisHandler{valuationService: valuationService}
}

func (h *MarketTrendAnalysisHandler) EventTypes() []EventType {
	return []EventType{
		EventPriceChanged,
		EventMarketDataUpdated,
	}
}

func (h *MarketTrendAnalysisHandler) Handle(ctx context.Context, event Event) error {
	if event.ItemID == nil {
		return nil
	}
	
	// Analyze price trends for the specific item
	if err := h.valuationService.AnalyzePriceTrend(ctx, *event.ItemID); err != nil {
		log.Printf("Failed to analyze price trend for item %s: %v", event.ItemID, err)
	}
	
	// Update overall market trends (throttled)
	go func() {
		if err := h.valuationService.UpdateMarketTrends(context.Background()); err != nil {
			log.Printf("Failed to update market trends: %v", err)
		}
	}()
	
	return nil
}