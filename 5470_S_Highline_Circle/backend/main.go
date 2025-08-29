package main

import (
	"log"
	"os"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/secretsmanager"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/swagger"
	"github.com/gofiber/websocket/v2"
	"github.com/go-redis/redis/v8"
	"github.com/joho/godotenv"
	"github.com/patricksmith/highline-inventory/auth"
	"github.com/patricksmith/highline-inventory/handlers"
	"github.com/patricksmith/highline-inventory/middleware"
	"github.com/patricksmith/highline-inventory/database"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize database (optional)
	db, err := database.Init()
	if err != nil {
		log.Println("Failed to connect to database, using mock data:", err)
		db = nil
	}
	if db != nil {
		defer db.Close()
		log.Println("Connected to database successfully")
		
		// Run auth migrations
		if err := database.RunAuthMigrations(db.DB); err != nil {
			log.Printf("Failed to run auth migrations: %v", err)
		}
	} else {
		log.Println("Using mock data mode")
	}

	// Initialize Redis client (optional)
	var redisClient *redis.Client
	redisURL := os.Getenv("REDIS_URL")
	if redisURL != "" {
		opt, err := redis.ParseURL(redisURL)
		if err == nil {
			redisClient = redis.NewClient(opt)
		}
	}

	// Initialize auth components
	jwtManager, err := auth.NewJWTManager()
	if err != nil {
		log.Fatal("Failed to initialize JWT manager:", err)
	}

	blacklist := auth.NewTokenBlacklist(redisClient)
	csrfSecret := getCSRFSecret()
	csrfManager := auth.NewCSRFManager(csrfSecret)
	rateLimiter := auth.NewRateLimiter(redisClient)

	// Initialize auth handler only if database is available
	var authHandler *handlers.AuthHandler
	if db != nil {
		authHandler = handlers.NewAuthHandler(db.DB, jwtManager, blacklist, csrfManager, rateLimiter)
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName: "Highline Inventory API",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "https://inventory.highline.work,http://localhost:3000,http://localhost:3050,https://5470-inventory.netlify.app",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Requested-With",
		AllowMethods:     "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// Swagger documentation
	app.Get("/swagger/*", swagger.HandlerDefault)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "healthy",
			"service": "highline-inventory",
		})
	})

	// API routes
	api := app.Group("/api/v1")

	// Auth routes (public) - only if auth handler is available
	if authHandler != nil {
		authGroup := api.Group("/auth")
		authGroup.Use(middleware.RateLimitAuth(rateLimiter)) // Apply rate limiting to auth endpoints
		authGroup.Post("/login", authHandler.Login)
		authGroup.Post("/register", authHandler.Register)
		authGroup.Post("/refresh", middleware.RefreshTokenMiddleware(jwtManager, blacklist), authHandler.RefreshToken)
		
		// Protected auth routes
		authGroup.Post("/logout", middleware.JWTAuth(middleware.AuthConfig{
			JWTManager:  jwtManager,
			Blacklist:   blacklist,
			CSRFManager: csrfManager,
			SkipCSRF:    false,
		}), authHandler.Logout)
		
		authGroup.Get("/profile", middleware.JWTAuth(middleware.AuthConfig{
			JWTManager:  jwtManager,
			Blacklist:   blacklist,
			CSRFManager: csrfManager,
			SkipCSRF:    true, // GET request doesn't need CSRF
		}), authHandler.GetProfile)
	}

	// JWKS endpoint for public key (useful for external services)
	api.Get("/.well-known/jwks.json", func(c *fiber.Ctx) error {
		publicKeyPEM, err := jwtManager.GetPublicKeyPEM()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to get public key",
			})
		}
		return c.JSON(fiber.Map{
			"keys": []fiber.Map{{
				"kty": "RSA",
				"use": "sig",
				"alg": "RS256",
				"n":   publicKeyPEM,
			}},
		})
	})

	// Health check for API group
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "healthy",
			"service": "highline-inventory-api",
		})
	})

	// Initialize handlers
	h := handlers.New(db)
	
	// Initialize photo handler
	photoHandler := handlers.NewPhotoHandler(h)
	h.PhotoHandler = photoHandler

	// Apply JWT middleware to all protected routes
	protectedConfig := middleware.AuthConfig{
		JWTManager:  jwtManager,
		Blacklist:   blacklist,
		CSRFManager: csrfManager,
		SkipCSRF:    false,
	}

	// Check if NO_AUTH is set for local development
	noAuth := os.Getenv("NO_AUTH") == "true"

	// Room routes - using simple handlers for existing schema
	if noAuth {
		// No authentication for local development
		api.Get("/rooms", h.GetSimpleRooms)
		api.Get("/rooms/:id", h.GetRoom)
		api.Post("/rooms", h.CreateRoom)
		api.Put("/rooms/:id", h.UpdateRoom)
		api.Delete("/rooms/:id", h.DeleteRoom)
	} else {
		// Protected routes for production
		api.Get("/rooms", middleware.JWTAuth(middleware.AuthConfig{
			JWTManager:  jwtManager,
			Blacklist:   blacklist,
			CSRFManager: csrfManager,
			SkipCSRF:    true, // GET requests don't need CSRF
		}), h.GetSimpleRooms)
		api.Get("/rooms/:id", middleware.JWTAuth(middleware.AuthConfig{
			JWTManager:  jwtManager,
			Blacklist:   blacklist,
			CSRFManager: csrfManager,
			SkipCSRF:    true,
		}), h.GetRoom)
		api.Post("/rooms", middleware.JWTAuth(protectedConfig), h.CreateRoom)
		api.Put("/rooms/:id", middleware.JWTAuth(protectedConfig), h.UpdateRoom)
		api.Delete("/rooms/:id", middleware.JWTAuth(protectedConfig), h.DeleteRoom)
	}
	
	// Item routes - using simple handlers for existing schema
	if noAuth {
		// No authentication for local development
		api.Get("/items", h.GetSimpleItems)
		api.Get("/items/:id", h.GetSimpleItem)
		api.Post("/items", h.CreateItem)
		api.Put("/items/:id", h.UpdateItem)
		api.Delete("/items/:id", h.DeleteItem)
		api.Post("/items/bulk", h.BulkUpdateItems)
		
		// Search and filter
		api.Get("/search", h.SearchItems)
		api.Get("/filter", h.FilterItems)
	} else {
		// Protected routes for production
		api.Get("/items", middleware.JWTAuth(middleware.AuthConfig{
			JWTManager:  jwtManager,
			Blacklist:   blacklist,
			CSRFManager: csrfManager,
			SkipCSRF:    true,
		}), h.GetSimpleItems)
		api.Get("/items/:id", middleware.JWTAuth(middleware.AuthConfig{
			JWTManager:  jwtManager,
			Blacklist:   blacklist,
			CSRFManager: csrfManager,
			SkipCSRF:    true,
		}), h.GetSimpleItem)
		api.Post("/items", middleware.JWTAuth(protectedConfig), h.CreateItem)
		api.Put("/items/:id", middleware.JWTAuth(protectedConfig), h.UpdateItem)
		api.Delete("/items/:id", middleware.JWTAuth(protectedConfig), h.DeleteItem)
		api.Post("/items/bulk", middleware.JWTAuth(protectedConfig), h.BulkUpdateItems)

		// Search and filter (protected)
		api.Get("/search", middleware.JWTAuth(middleware.AuthConfig{
			JWTManager:  jwtManager,
			Blacklist:   blacklist,
			CSRFManager: csrfManager,
			SkipCSRF:    true,
		}), h.SearchItems)
		api.Get("/filter", middleware.JWTAuth(middleware.AuthConfig{
			JWTManager:  jwtManager,
			Blacklist:   blacklist,
			CSRFManager: csrfManager,
			SkipCSRF:    true,
		}), h.FilterItems)
	}

	// Activities
	if noAuth {
		api.Get("/activities", h.GetActivities)
	} else {
		api.Get("/activities", middleware.JWTAuth(middleware.AuthConfig{
			JWTManager:  jwtManager,
			Blacklist:   blacklist,
			CSRFManager: csrfManager,
			SkipCSRF:    true,
		}), h.GetActivities)
	}

	// Analytics - using simple handler for existing schema
	api.Get("/analytics/summary", h.GetSimpleSummary)
	api.Get("/analytics/by-room", h.GetRoomAnalytics)
	api.Get("/analytics/by-category", h.GetCategoryAnalytics)

	// Export routes
	api.Get("/export/excel", h.ExportExcel)
	api.Get("/export/pdf", h.ExportPDF)
	api.Get("/export/csv", h.ExportCSV)

	// AI routes
	api.Get("/ai/insights", h.GetAIInsights)
	api.Post("/ai/recommendations", h.GetRecommendations)
	api.Get("/ai/price-optimization/:id", h.GetPriceOptimization)
	api.Get("/ai/market-analysis/:category", h.GetMarketAnalysis)
	api.Get("/ai/bundle-suggestions", h.GetBundleSuggestions)
	api.Get("/ai/predictive-trends", h.GetPredictiveTrends)
	api.Get("/export/buyer-view", h.ExportBuyerView)

	// Import route
	api.Post("/import/excel", h.ImportExcel)

	// Setup route for initializing database with real data
	api.Post("/admin/setup-database", h.SetupDatabase)

	// Migration route for creating activities table
	api.Post("/admin/migrate", h.RunMigration)

	// Photo migration route
	api.Post("/admin/migrate-photos", h.RunPhotoMigration)

	// Transaction routes
	api.Get("/transactions", h.GetTransactions)
	api.Post("/transactions", h.CreateTransaction)

	// NANDA agent webhook
	api.Post("/webhook/nanda", h.HandleNANDAWebhook)

	// n8n webhook
	api.Post("/webhook/n8n", h.HandleN8NWebhook)

	// Collaboration routes
	// Notes endpoints
	api.Get("/items/:id/notes", h.GetItemNotes)
	api.Post("/items/:id/notes", h.AddItemNote)
	api.Put("/notes/:id", h.UpdateNote)
	api.Delete("/notes/:id", h.DeleteNote)

	// Buyer interest endpoints
	api.Get("/items/:id/interest", h.GetItemInterest)
	api.Put("/items/:id/interest", h.SetItemInterest)
	api.Get("/buyer/interests", h.GetBuyerInterests)

	// Bundle endpoints
	api.Get("/bundles", h.GetBundles)
	api.Post("/bundles", h.CreateBundle)
	api.Put("/bundles/:id", h.UpdateBundle)
	api.Delete("/bundles/:id", h.DeleteBundle)

	// Collaboration overview
	api.Get("/collaboration/overview", h.GetCollaborationOverview)

	// Photo batch capture endpoints
	// WebSocket for real-time updates with upgrade check
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	
	// Main WebSocket endpoint for frontend
	app.Get("/ws", websocket.New(h.PhotoHandler.HandleWebSocket))
	
	// Alternative WebSocket endpoint for photo-specific operations
	app.Get("/ws/photos", websocket.New(h.PhotoHandler.HandleWebSocket))

	// Photo status endpoint
	api.Get("/photos/status", h.PhotoHandler.GetPhotoStatus)
	
	// Photo sessions
	api.Post("/photos/sessions", h.PhotoHandler.CreatePhotoSession)
	api.Get("/photos/sessions/:id", h.PhotoHandler.GetPhotoSession)
	api.Put("/photos/sessions/:id", h.PhotoHandler.UpdatePhotoSession)

	// Photo uploads
	api.Post("/items/:id/photos", h.PhotoHandler.UploadItemPhoto)
	api.Post("/photos/batch/:sessionId", h.PhotoHandler.BatchUploadPhotos)

	// Photo progress and room tracking
	api.Get("/rooms/progress", h.PhotoHandler.GetRoomPhotoProgress)

	// Serve photo files
	api.Get("/photos/:resolution/:filename", h.PhotoHandler.ServePhoto)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(app.Listen(":" + port))
}

// getCSRFSecret loads CSRF secret from AWS Secrets Manager or environment
func getCSRFSecret() string {
	// Try environment first
	if secret := os.Getenv("CSRF_SECRET"); secret != "" {
		return secret
	}

	// Try AWS Secrets Manager in production
	if os.Getenv("AWS_REGION") != "" || os.Getenv("ENV") == "production" {
		sess, err := session.NewSession(&aws.Config{
			Region: aws.String("us-east-1"),
		})
		if err != nil {
			log.Printf("Failed to create AWS session for CSRF secret: %v", err)
			return ""
		}

		svc := secretsmanager.New(sess)
		result, err := svc.GetSecretValue(&secretsmanager.GetSecretValueInput{
			SecretId: aws.String("highline-inventory/csrf-secret"),
		})
		if err != nil {
			log.Printf("Failed to load CSRF secret from AWS: %v", err)
			return ""
		}

		return *result.SecretString
	}

	return ""
}
