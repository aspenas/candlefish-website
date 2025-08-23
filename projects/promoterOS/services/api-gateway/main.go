package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.uber.org/zap"
)

var (
	httpRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	httpRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name: "http_request_duration_seconds",
			Help: "Duration of HTTP requests in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)
)

func init() {
	prometheus.MustRegister(httpRequestsTotal)
	prometheus.MustRegister(httpRequestDuration)
}

type Server struct {
	router *gin.Engine
	logger *zap.Logger
	config *Config
}

type Config struct {
	Port            string
	Environment     string
	LogLevel        string
	RedisHost       string
	RedisAuthToken  string
	DatabaseURL     string
	JWTSecret       string
	AllowedOrigins  []string
}

func NewServer(config *Config, logger *zap.Logger) *Server {
	gin.SetMode(gin.ReleaseMode)
	if config.Environment == "development" {
		gin.SetMode(gin.DebugMode)
	}

	router := gin.New()

	// Middleware
	router.Use(gin.Recovery())
	router.Use(RequestIDMiddleware())
	router.Use(LoggingMiddleware(logger))
	router.Use(PrometheusMiddleware())
	router.Use(otelgin.Middleware("api-gateway"))

	// CORS
	corsConfig := cors.Config{
		AllowOrigins:     config.AllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:          12 * time.Hour,
	}
	router.Use(cors.New(corsConfig))

	return &Server{
		router: router,
		logger: logger,
		config: config,
	}
}

func (s *Server) SetupRoutes() {
	// Health checks
	health := s.router.Group("/health")
	{
		health.GET("/live", s.handleLiveness)
		health.GET("/ready", s.handleReadiness)
	}

	// API v1 routes
	v1 := s.router.Group("/api/v1")
	v1.Use(AuthMiddleware(s.config.JWTSecret))
	{
		// Artists
		v1.GET("/artists", s.handleGetArtists)
		v1.GET("/artists/:id", s.handleGetArtist)
		v1.POST("/artists", s.handleCreateArtist)
		v1.PUT("/artists/:id", s.handleUpdateArtist)

		// Metrics
		v1.GET("/metrics/artists/:id", s.handleGetArtistMetrics)
		v1.POST("/metrics/ingest", s.handleIngestMetrics)

		// Predictions
		v1.POST("/predictions", s.handleCreatePrediction)
		v1.GET("/predictions/:id", s.handleGetPrediction)

		// Bookings
		v1.POST("/bookings", s.handleCreateBooking)
		v1.GET("/bookings/:id", s.handleGetBooking)
		v1.PUT("/bookings/:id", s.handleUpdateBooking)
	}

	// Metrics endpoint
	s.router.GET("/metrics", gin.WrapH(promhttp.Handler()))
}

func (s *Server) handleLiveness(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "alive",
		"time":   time.Now().Unix(),
	})
}

func (s *Server) handleReadiness(c *gin.Context) {
	// Check database connection
	// Check Redis connection
	// Check external dependencies

	c.JSON(http.StatusOK, gin.H{
		"status": "ready",
		"time":   time.Now().Unix(),
	})
}

func (s *Server) handleGetArtists(c *gin.Context) {
	// Implementation
	c.JSON(http.StatusOK, gin.H{
		"artists": []interface{}{},
		"total":   0,
	})
}

func (s *Server) handleGetArtist(c *gin.Context) {
	artistID := c.Param("id")

	c.JSON(http.StatusOK, gin.H{
		"id":   artistID,
		"name": "Sample Artist",
	})
}

func (s *Server) handleCreateArtist(c *gin.Context) {
	var input struct {
		Name        string   `json:"name" binding:"required"`
		PlatformIDs map[string]string `json:"platform_ids"`
		Genres      []string `json:"genres"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":   "new-artist-id",
		"name": input.Name,
	})
}

func (s *Server) handleUpdateArtist(c *gin.Context) {
	artistID := c.Param("id")

	c.JSON(http.StatusOK, gin.H{
		"id":      artistID,
		"updated": true,
	})
}

func (s *Server) handleGetArtistMetrics(c *gin.Context) {
	artistID := c.Param("id")

	c.JSON(http.StatusOK, gin.H{
		"artist_id": artistID,
		"metrics":   []interface{}{},
	})
}

func (s *Server) handleIngestMetrics(c *gin.Context) {
	c.JSON(http.StatusAccepted, gin.H{
		"status": "accepted",
		"job_id": "ingest-job-123",
	})
}

func (s *Server) handleCreatePrediction(c *gin.Context) {
	var input struct {
		ArtistID string `json:"artist_id" binding:"required"`
		VenueID  string `json:"venue_id" binding:"required"`
		Date     string `json:"date" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"prediction_id": "pred-123",
		"demand":        1500,
		"confidence":    0.85,
	})
}

func (s *Server) handleGetPrediction(c *gin.Context) {
	predictionID := c.Param("id")

	c.JSON(http.StatusOK, gin.H{
		"id":         predictionID,
		"demand":     1500,
		"confidence": 0.85,
	})
}

func (s *Server) handleCreateBooking(c *gin.Context) {
	c.JSON(http.StatusCreated, gin.H{
		"booking_id": "booking-123",
		"status":     "pending",
	})
}

func (s *Server) handleGetBooking(c *gin.Context) {
	bookingID := c.Param("id")

	c.JSON(http.StatusOK, gin.H{
		"id":     bookingID,
		"status": "confirmed",
	})
}

func (s *Server) handleUpdateBooking(c *gin.Context) {
	bookingID := c.Param("id")

	c.JSON(http.StatusOK, gin.H{
		"id":      bookingID,
		"updated": true,
	})
}

func (s *Server) Start() error {
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", s.config.Port),
		Handler:      s.router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	s.logger.Info("Server started", zap.String("port", s.config.Port))

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	s.logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		s.logger.Error("Server forced to shutdown", zap.Error(err))
		return err
	}

	s.logger.Info("Server exited")
	return nil
}

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatal("Failed to initialize logger:", err)
	}
	defer logger.Sync()

	// Load configuration
	config := &Config{
		Port:           getEnv("PORT", "8080"),
		Environment:    getEnv("ENV", "development"),
		LogLevel:       getEnv("LOG_LEVEL", "info"),
		RedisHost:      getEnv("REDIS_HOST", "localhost:6379"),
		RedisAuthToken: getEnv("REDIS_AUTH_TOKEN", ""),
		DatabaseURL:    getEnv("DATABASE_URL", ""),
		JWTSecret:      getEnv("JWT_SECRET", ""),
		AllowedOrigins: []string{
			"https://promoteros.candlefish.ai",
			"http://localhost:3000",
		},
	}

	// Create and start server
	server := NewServer(config, logger)
	server.SetupRoutes()

	if err := server.Start(); err != nil {
		logger.Fatal("Server failed", zap.Error(err))
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
