package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/candlefish-ai/security-dashboard/internal/api"
	"github.com/candlefish-ai/security-dashboard/internal/config"
	"github.com/candlefish-ai/security-dashboard/internal/database"
	"github.com/candlefish-ai/security-dashboard/internal/redis"
	"github.com/candlefish-ai/security-dashboard/internal/services"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	// Initialize database
	db, err := database.Initialize(cfg.Database)
	if err != nil {
		logger.Fatal("Failed to initialize database", zap.Error(err))
	}
	defer db.Close()

	// Initialize Redis
	redisClient := redis.Initialize(cfg.Redis)
	defer redisClient.Close()

	// Initialize services
	securityService := services.NewSecurityService(db, redisClient, logger)
	kongService := services.NewKongMonitoringService(cfg.Kong, logger)
	alertService := services.NewAlertService(db, redisClient, logger)

	// Initialize API router
	router := api.SetupRouter(securityService, kongService, alertService, logger)

	// Configure server
	srv := &http.Server{
		Addr:    ":" + cfg.Server.Port,
		Handler: router,
		// Security headers and timeouts
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		logger.Info("Starting server", zap.String("port", cfg.Server.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("Shutting down server...")

	// Shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited")
}
