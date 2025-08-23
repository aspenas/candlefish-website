// Payment Webhook Verification - REMEDIATION for secure payment processing
// Implements Stripe webhook signature verification with idempotency

package payments

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/redis/go-redis/v9"
	"github.com/stripe/stripe-go/v75"
	"github.com/stripe/stripe-go/v75/webhook"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

var (
	// Prometheus metrics
	webhookRequests = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "payment_webhook_requests_total",
		Help: "Total number of payment webhook requests",
	}, []string{"provider", "event_type", "status"})

	webhookVerifications = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "payment_webhook_verifications_total",
		Help: "Total number of webhook signature verifications",
	}, []string{"provider", "result"})

	idempotencyHits = promauto.NewCounter(prometheus.CounterOpts{
		Name: "payment_idempotency_hits_total",
		Help: "Total number of idempotent request hits",
	})

	webhookProcessingTime = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "payment_webhook_processing_seconds",
		Help:    "Payment webhook processing time in seconds",
		Buckets: prometheus.DefBuckets,
	}, []string{"provider", "event_type"})
)

// PaymentWebhookHandler handles payment webhooks with verification
type PaymentWebhookHandler struct {
	stripeWebhookSecret string
	db                  *gorm.DB
	redis               *redis.Client
	logger              *zap.Logger
	idempotencyStore    *IdempotencyStore
	eventProcessor      *EventProcessor
	mu                  sync.RWMutex
}

// IdempotencyStore manages idempotent request handling
type IdempotencyStore struct {
	redis  *redis.Client
	db     *gorm.DB
	logger *zap.Logger
}

// EventProcessor processes payment events
type EventProcessor struct {
	db     *gorm.DB
	logger *zap.Logger
}

// WebhookEvent represents a webhook event in the database
type WebhookEvent struct {
	ID              string    `gorm:"primaryKey"`
	Provider        string    `gorm:"index"`
	EventType       string    `gorm:"index"`
	EventID         string    `gorm:"uniqueIndex"`
	IdempotencyKey  string    `gorm:"uniqueIndex"`
	Payload         []byte    `gorm:"type:jsonb"`
	Signature       string
	ProcessedAt     *time.Time
	ProcessingError string
	RetryCount      int
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// PaymentTransaction represents a payment transaction
type PaymentTransaction struct {
	ID             string `gorm:"primaryKey"`
	Provider       string
	ExternalID     string `gorm:"uniqueIndex"`
	IdempotencyKey string `gorm:"uniqueIndex"`
	Amount         int64
	Currency       string
	Status         string
	BookingID      string
	UserID         string
	Metadata       json.RawMessage `gorm:"type:jsonb"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// NewPaymentWebhookHandler creates a new payment webhook handler
func NewPaymentWebhookHandler(db *gorm.DB, redis *redis.Client, logger *zap.Logger) (*PaymentWebhookHandler, error) {
	// Get Stripe webhook secret from environment or AWS Secrets Manager
	webhookSecret := getStripeWebhookSecret()

	handler := &PaymentWebhookHandler{
		stripeWebhookSecret: webhookSecret,
		db:                  db,
		redis:               redis,
		logger:              logger,
		idempotencyStore: &IdempotencyStore{
			redis:  redis,
			db:     db,
			logger: logger,
		},
		eventProcessor: &EventProcessor{
			db:     db,
			logger: logger,
		},
	}

	// Run migrations
	if err := db.AutoMigrate(&WebhookEvent{}, &PaymentTransaction{}); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return handler, nil
}

// HandleStripeWebhook handles Stripe webhook requests with verification
func (h *PaymentWebhookHandler) HandleStripeWebhook() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Start tracing span
		ctx, span := otel.Tracer("payment-webhook").Start(c.Request.Context(), "stripe_webhook")
		defer span.End()

		startTime := time.Now()

		// Read request body
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			h.logger.Error("Failed to read webhook body", zap.Error(err))
			webhookRequests.WithLabelValues("stripe", "unknown", "error").Inc()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
			return
		}

		// Get Stripe signature header
		signature := c.GetHeader("Stripe-Signature")
		if signature == "" {
			h.logger.Error("Missing Stripe signature header")
			webhookVerifications.WithLabelValues("stripe", "missing_signature").Inc()
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing signature"})
			return
		}

		// Verify webhook signature
		event, err := webhook.ConstructEvent(body, signature, h.stripeWebhookSecret)
		if err != nil {
			h.logger.Error("Failed to verify webhook signature",
				zap.Error(err),
				zap.String("signature", signature))
			webhookVerifications.WithLabelValues("stripe", "invalid_signature").Inc()
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signature"})
			return
		}

		webhookVerifications.WithLabelValues("stripe", "valid").Inc()

		span.SetAttributes(
			attribute.String("event_id", event.ID),
			attribute.String("event_type", string(event.Type)),
		)

		// Generate idempotency key
		idempotencyKey := fmt.Sprintf("stripe_%s", event.ID)

		// Check idempotency
		if result, exists := h.idempotencyStore.Get(ctx, idempotencyKey); exists {
			h.logger.Info("Idempotent request detected",
				zap.String("event_id", event.ID),
				zap.String("idempotency_key", idempotencyKey))
			idempotencyHits.Inc()
			c.JSON(http.StatusOK, result)
			return
		}

		// Store webhook event
		webhookEvent := &WebhookEvent{
			ID:             uuid.New().String(),
			Provider:       "stripe",
			EventType:      string(event.Type),
			EventID:        event.ID,
			IdempotencyKey: idempotencyKey,
			Payload:        body,
			Signature:      signature,
			CreatedAt:      time.Now(),
		}

		if err := h.db.Create(webhookEvent).Error; err != nil {
			if strings.Contains(err.Error(), "duplicate") {
				// Event already processed
				h.logger.Info("Duplicate webhook event", zap.String("event_id", event.ID))
				idempotencyHits.Inc()
				c.JSON(http.StatusOK, gin.H{"status": "already_processed"})
				return
			}
			h.logger.Error("Failed to store webhook event", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store event"})
			return
		}

		// Process event based on type
		var response interface{}
		var processErr error

		switch event.Type {
		case "payment_intent.succeeded":
			response, processErr = h.handlePaymentSucceeded(ctx, &event)
		case "payment_intent.payment_failed":
			response, processErr = h.handlePaymentFailed(ctx, &event)
		case "charge.refunded":
			response, processErr = h.handleChargeRefunded(ctx, &event)
		case "customer.subscription.created":
			response, processErr = h.handleSubscriptionCreated(ctx, &event)
		case "customer.subscription.deleted":
			response, processErr = h.handleSubscriptionDeleted(ctx, &event)
		case "invoice.payment_succeeded":
			response, processErr = h.handleInvoicePaymentSucceeded(ctx, &event)
		default:
			h.logger.Info("Unhandled webhook event type",
				zap.String("event_type", string(event.Type)))
			response = gin.H{"status": "unhandled"}
		}

		// Update webhook event processing status
		now := time.Now()
		webhookEvent.ProcessedAt = &now
		if processErr != nil {
			webhookEvent.ProcessingError = processErr.Error()
			h.db.Save(webhookEvent)
			h.logger.Error("Failed to process webhook event",
				zap.Error(processErr),
				zap.String("event_id", event.ID))
			webhookRequests.WithLabelValues("stripe", string(event.Type), "error").Inc()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Processing failed"})
			return
		}

		h.db.Save(webhookEvent)

		// Store idempotency result
		h.idempotencyStore.Set(ctx, idempotencyKey, response, 24*time.Hour)

		// Record metrics
		processingTime := time.Since(startTime)
		webhookProcessingTime.WithLabelValues("stripe", string(event.Type)).Observe(processingTime.Seconds())
		webhookRequests.WithLabelValues("stripe", string(event.Type), "success").Inc()

		c.JSON(http.StatusOK, response)
	}
}

// handlePaymentSucceeded handles successful payment events
func (h *PaymentWebhookHandler) handlePaymentSucceeded(ctx context.Context, event *stripe.Event) (interface{}, error) {
	var paymentIntent stripe.PaymentIntent
	if err := json.Unmarshal(event.Data.Raw, &paymentIntent); err != nil {
		return nil, fmt.Errorf("failed to unmarshal payment intent: %w", err)
	}

	// Extract metadata
	bookingID := paymentIntent.Metadata["booking_id"]
	userID := paymentIntent.Metadata["user_id"]

	// Create transaction record with idempotency
	transaction := &PaymentTransaction{
		ID:             uuid.New().String(),
		Provider:       "stripe",
		ExternalID:     paymentIntent.ID,
		IdempotencyKey: fmt.Sprintf("pi_%s", paymentIntent.ID),
		Amount:         paymentIntent.Amount,
		Currency:       string(paymentIntent.Currency),
		Status:         "succeeded",
		BookingID:      bookingID,
		UserID:         userID,
		Metadata:       nil,
		CreatedAt:      time.Now(),
	}

	// Use transaction to ensure atomicity
	err := h.db.Transaction(func(tx *gorm.DB) error {
		// Create payment transaction
		if err := tx.Create(transaction).Error; err != nil {
			if !strings.Contains(err.Error(), "duplicate") {
				return err
			}
		}

		// Update booking status
		if bookingID != "" {
			if err := tx.Model(&Booking{}).
				Where("id = ?", bookingID).
				Update("payment_status", "paid").Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	h.logger.Info("Payment succeeded",
		zap.String("payment_intent_id", paymentIntent.ID),
		zap.String("booking_id", bookingID),
		zap.Int64("amount", paymentIntent.Amount))

	return gin.H{
		"status":         "processed",
		"transaction_id": transaction.ID,
		"booking_id":     bookingID,
	}, nil
}

// handlePaymentFailed handles failed payment events
func (h *PaymentWebhookHandler) handlePaymentFailed(ctx context.Context, event *stripe.Event) (interface{}, error) {
	var paymentIntent stripe.PaymentIntent
	if err := json.Unmarshal(event.Data.Raw, &paymentIntent); err != nil {
		return nil, fmt.Errorf("failed to unmarshal payment intent: %w", err)
	}

	bookingID := paymentIntent.Metadata["booking_id"]

	// Update booking status
	if bookingID != "" {
		if err := h.db.Model(&Booking{}).
			Where("id = ?", bookingID).
			Update("payment_status", "failed").Error; err != nil {
			return nil, err
		}
	}

	h.logger.Info("Payment failed",
		zap.String("payment_intent_id", paymentIntent.ID),
		zap.String("booking_id", bookingID))

	return gin.H{
		"status":     "processed",
		"booking_id": bookingID,
	}, nil
}

// Other event handlers...
func (h *PaymentWebhookHandler) handleChargeRefunded(ctx context.Context, event *stripe.Event) (interface{}, error) {
	// Implementation for refund handling
	return gin.H{"status": "processed"}, nil
}

func (h *PaymentWebhookHandler) handleSubscriptionCreated(ctx context.Context, event *stripe.Event) (interface{}, error) {
	// Implementation for subscription creation
	return gin.H{"status": "processed"}, nil
}

func (h *PaymentWebhookHandler) handleSubscriptionDeleted(ctx context.Context, event *stripe.Event) (interface{}, error) {
	// Implementation for subscription deletion
	return gin.H{"status": "processed"}, nil
}

func (h *PaymentWebhookHandler) handleInvoicePaymentSucceeded(ctx context.Context, event *stripe.Event) (interface{}, error) {
	// Implementation for invoice payment
	return gin.H{"status": "processed"}, nil
}

// IdempotencyStore methods
func (s *IdempotencyStore) Get(ctx context.Context, key string) (interface{}, bool) {
	// Check Redis first
	val, err := s.redis.Get(ctx, fmt.Sprintf("idempotency:%s", key)).Result()
	if err == nil {
		var result interface{}
		if err := json.Unmarshal([]byte(val), &result); err == nil {
			return result, true
		}
	}

	// Check database
	var event WebhookEvent
	if err := s.db.Where("idempotency_key = ? AND processed_at IS NOT NULL", key).First(&event).Error; err == nil {
		return gin.H{"status": "already_processed", "event_id": event.EventID}, true
	}

	return nil, false
}

func (s *IdempotencyStore) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return s.redis.Set(ctx, fmt.Sprintf("idempotency:%s", key), data, ttl).Err()
}

// Helper functions
func getStripeWebhookSecret() string {
	// Get from AWS Secrets Manager or environment
	// Implementation depends on your setup
	return ""
}

// Placeholder types
type Booking struct {
	ID            string
	PaymentStatus string
}
