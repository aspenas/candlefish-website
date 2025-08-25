package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/swagger"
	"github.com/gofiber/websocket/v2"
	"github.com/joho/godotenv"
	"github.com/patricksmith/highline-inventory/handlers"
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
	} else {
		log.Println("Using mock data mode")
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
		AllowOrigins:     "https://inventory.highline.work,http://localhost:3000,https://5470-inventory.netlify.app",
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

	// Initialize handlers
	h := handlers.New(db)

	// Room routes
	api.Get("/rooms", h.GetRooms)
	api.Get("/rooms/:id", h.GetRoom)
	api.Post("/rooms", h.CreateRoom)
	api.Put("/rooms/:id", h.UpdateRoom)
	api.Delete("/rooms/:id", h.DeleteRoom)

	// Item routes
	api.Get("/items", h.GetItems)
	api.Get("/items/:id", h.GetItem)
	api.Post("/items", h.CreateItem)
	api.Put("/items/:id", h.UpdateItem)
	api.Delete("/items/:id", h.DeleteItem)
	api.Post("/items/bulk", h.BulkUpdateItems)

	// Search and filter
	api.Get("/search", h.SearchItems)
	api.Get("/filter", h.FilterItems)

	// Activities
	api.Get("/activities", h.GetActivities)

	// Analytics
	api.Get("/analytics/summary", h.GetSummary)
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
	app.Get("/ws/photos", websocket.New(h.PhotoHandler.HandleWebSocket))

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
