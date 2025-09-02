package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"candlefish-ai/services/document-service/internal/handlers"
	"candlefish-ai/services/document-service/internal/models"
	"candlefish-ai/services/document-service/internal/repository"
	"candlefish-ai/services/document-service/internal/services"
)

type DocumentServiceTestSuite struct {
	suite.Suite
	db     *gorm.DB
	router *gin.Engine
	server *httptest.Server
}

func (suite *DocumentServiceTestSuite) SetupSuite() {
	// Setup test database
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://test:test@localhost:5432/collaboration_test?sslmode=disable"
	}

	var err error
	suite.db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		suite.T().Fatal("Failed to connect to test database:", err)
	}

	// Auto-migrate test schema
	err = suite.db.AutoMigrate(&models.Document{}, &models.Version{}, &models.Permission{})
	if err != nil {
		suite.T().Fatal("Failed to migrate test schema:", err)
	}

	// Setup Gin router
	gin.SetMode(gin.TestMode)
	suite.router = gin.New()
	
	// Initialize services and handlers
	docRepo := repository.NewDocumentRepository(suite.db)
	docService := services.NewDocumentService(docRepo)
	docHandler := handlers.NewDocumentHandler(docService)

	// Setup routes
	v1 := suite.router.Group("/api/v1")
	{
		v1.GET("/documents", docHandler.GetDocuments)
		v1.GET("/documents/:id", docHandler.GetDocument)
		v1.POST("/documents", docHandler.CreateDocument)
		v1.PUT("/documents/:id", docHandler.UpdateDocument)
		v1.DELETE("/documents/:id", docHandler.DeleteDocument)
		v1.GET("/documents/:id/versions", docHandler.GetDocumentVersions)
		v1.POST("/documents/:id/versions", docHandler.CreateVersion)
	}

	suite.server = httptest.NewServer(suite.router)
}

func (suite *DocumentServiceTestSuite) TearDownSuite() {
	suite.server.Close()
	
	// Clean up test database
	suite.db.Exec("DROP TABLE IF EXISTS documents, versions, permissions CASCADE")
	sqlDB, _ := suite.db.DB()
	sqlDB.Close()
}

func (suite *DocumentServiceTestSuite) SetupTest() {
	// Clean tables before each test
	suite.db.Exec("TRUNCATE documents, versions, permissions RESTART IDENTITY CASCADE")
}

func (suite *DocumentServiceTestSuite) TestCreateDocument() {
	payload := map[string]interface{}{
		"title":       "Test Document",
		"content":     "Initial content",
		"type":        "markdown",
		"owner_id":    "user-123",
		"project_id":  "project-456",
	}

	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", suite.server.URL+"/api/v1/documents", bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")

	client := &http.Client{}
	resp, err := client.Do(req)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusCreated, resp.StatusCode)

	var response map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&response)

	assert.NotNil(suite.T(), response["id"])
	assert.Equal(suite.T(), "Test Document", response["title"])
	assert.Equal(suite.T(), "Initial content", response["content"])
}

func (suite *DocumentServiceTestSuite) TestGetDocument() {
	// Create a test document first
	doc := models.Document{
		Title:     "Test Document",
		Content:   "Test content",
		Type:      "markdown",
		OwnerID:   "user-123",
		ProjectID: "project-456",
		Status:    "active",
	}
	result := suite.db.Create(&doc)
	assert.NoError(suite.T(), result.Error)

	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/v1/documents/%d", suite.server.URL, doc.ID), nil)
	req.Header.Set("Authorization", "Bearer test-token")

	client := &http.Client{}
	resp, err := client.Do(req)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)

	var response map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&response)

	assert.Equal(suite.T(), float64(doc.ID), response["id"])
	assert.Equal(suite.T(), "Test Document", response["title"])
}

func (suite *DocumentServiceTestSuite) TestUpdateDocument() {
	// Create a test document
	doc := models.Document{
		Title:     "Original Title",
		Content:   "Original content",
		Type:      "markdown",
		OwnerID:   "user-123",
		ProjectID: "project-456",
		Status:    "active",
	}
	suite.db.Create(&doc)

	payload := map[string]interface{}{
		"title":   "Updated Title",
		"content": "Updated content",
	}

	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("PUT", fmt.Sprintf("%s/api/v1/documents/%d", suite.server.URL, doc.ID), bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")

	client := &http.Client{}
	resp, err := client.Do(req)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)

	// Verify update in database
	var updatedDoc models.Document
	suite.db.First(&updatedDoc, doc.ID)
	assert.Equal(suite.T(), "Updated Title", updatedDoc.Title)
	assert.Equal(suite.T(), "Updated content", updatedDoc.Content)
}

func (suite *DocumentServiceTestSuite) TestDocumentVersioning() {
	// Create document
	doc := models.Document{
		Title:     "Versioned Document",
		Content:   "Version 1 content",
		Type:      "markdown",
		OwnerID:   "user-123",
		ProjectID: "project-456",
		Status:    "active",
	}
	suite.db.Create(&doc)

	// Create version
	payload := map[string]interface{}{
		"content":     "Version 2 content",
		"comment":     "Updated with new information",
		"created_by":  "user-123",
	}

	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", fmt.Sprintf("%s/api/v1/documents/%d/versions", suite.server.URL, doc.ID), bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")

	client := &http.Client{}
	resp, err := client.Do(req)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusCreated, resp.StatusCode)

	// Get versions
	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/api/v1/documents/%d/versions", suite.server.URL, doc.ID), nil)
	req.Header.Set("Authorization", "Bearer test-token")

	resp, err = client.Do(req)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)

	var versions []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&versions)
	
	assert.Greater(suite.T(), len(versions), 0)
	assert.Equal(suite.T(), "Version 2 content", versions[0]["content"])
}

func (suite *DocumentServiceTestSuite) TestDocumentPermissions() {
	// Create document
	doc := models.Document{
		Title:     "Shared Document",
		Content:   "Shared content",
		Type:      "markdown",
		OwnerID:   "user-123",
		ProjectID: "project-456",
		Status:    "active",
	}
	suite.db.Create(&doc)

	// Add permission
	permission := models.Permission{
		DocumentID: doc.ID,
		UserID:     "user-456",
		Role:       "editor",
		GrantedBy:  "user-123",
	}
	result := suite.db.Create(&permission)
	assert.NoError(suite.T(), result.Error)

	// Test access with different user
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/v1/documents/%d", suite.server.URL, doc.ID), nil)
	req.Header.Set("Authorization", "Bearer test-token-user-456")

	client := &http.Client{}
	resp, err := client.Do(req)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)
}

func (suite *DocumentServiceTestSuite) TestConcurrentUpdates() {
	// Create document
	doc := models.Document{
		Title:     "Concurrent Document",
		Content:   "Initial content",
		Type:      "markdown",
		OwnerID:   "user-123",
		ProjectID: "project-456",
		Status:    "active",
	}
	suite.db.Create(&doc)

	// Simulate concurrent updates
	done := make(chan bool, 2)
	errors := make(chan error, 2)

	updateDocument := func(content string) {
		payload := map[string]interface{}{
			"content": content,
		}

		jsonPayload, _ := json.Marshal(payload)
		req, _ := http.NewRequest("PUT", fmt.Sprintf("%s/api/v1/documents/%d", suite.server.URL, doc.ID), bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer test-token")

		client := &http.Client{}
		resp, err := client.Do(req)

		if err != nil {
			errors <- err
		} else if resp.StatusCode != http.StatusOK {
			errors <- fmt.Errorf("unexpected status code: %d", resp.StatusCode)
		}

		done <- true
	}

	// Start concurrent updates
	go updateDocument("Update 1")
	go updateDocument("Update 2")

	// Wait for both to complete
	for i := 0; i < 2; i++ {
		select {
		case <-done:
			// Success
		case err := <-errors:
			suite.T().Error("Concurrent update failed:", err)
		case <-time.After(5 * time.Second):
			suite.T().Error("Concurrent update timeout")
		}
	}
}

func (suite *DocumentServiceTestSuite) TestSearchDocuments() {
	// Create test documents
	docs := []models.Document{
		{Title: "Go Programming", Content: "Go is awesome", Type: "markdown", OwnerID: "user-123"},
		{Title: "Python Guide", Content: "Python programming tutorial", Type: "markdown", OwnerID: "user-123"},
		{Title: "JavaScript Basics", Content: "Learn JS fundamentals", Type: "markdown", OwnerID: "user-123"},
	}

	for _, doc := range docs {
		suite.db.Create(&doc)
	}

	// Test search
	req, _ := http.NewRequest("GET", suite.server.URL+"/api/v1/documents?q=programming", nil)
	req.Header.Set("Authorization", "Bearer test-token")

	client := &http.Client{}
	resp, err := client.Do(req)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)

	var results map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&results)

	documents := results["documents"].([]interface{})
	assert.Greater(suite.T(), len(documents), 0)
}

func (suite *DocumentServiceTestSuite) TestErrorHandling() {
	// Test 404 for non-existent document
	req, _ := http.NewRequest("GET", suite.server.URL+"/api/v1/documents/99999", nil)
	req.Header.Set("Authorization", "Bearer test-token")

	client := &http.Client{}
	resp, err := client.Do(req)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusNotFound, resp.StatusCode)

	// Test invalid JSON payload
	req, _ = http.NewRequest("POST", suite.server.URL+"/api/v1/documents", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")

	resp, err = client.Do(req)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusBadRequest, resp.StatusCode)
}

func (suite *DocumentServiceTestSuite) TestPerformance() {
	// Create many documents for performance testing
	const numDocs = 1000
	docs := make([]models.Document, numDocs)

	start := time.Now()
	for i := 0; i < numDocs; i++ {
		docs[i] = models.Document{
			Title:     fmt.Sprintf("Performance Test Doc %d", i),
			Content:   fmt.Sprintf("Content for document %d", i),
			Type:      "markdown",
			OwnerID:   "user-123",
			ProjectID: "project-456",
			Status:    "active",
		}
	}

	result := suite.db.CreateInBatches(&docs, 100)
	assert.NoError(suite.T(), result.Error)

	creationTime := time.Since(start)
	assert.Less(suite.T(), creationTime, 5*time.Second, "Bulk creation should complete within 5 seconds")

	// Test bulk retrieval performance
	start = time.Now()
	req, _ := http.NewRequest("GET", suite.server.URL+"/api/v1/documents?limit=1000", nil)
	req.Header.Set("Authorization", "Bearer test-token")

	client := &http.Client{}
	resp, err := client.Do(req)

	retrievalTime := time.Since(start)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)
	assert.Less(suite.T(), retrievalTime, 2*time.Second, "Bulk retrieval should complete within 2 seconds")
}

func TestDocumentServiceSuite(t *testing.T) {
	suite.Run(t, new(DocumentServiceTestSuite))
}