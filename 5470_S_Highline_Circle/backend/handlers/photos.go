package handlers

import (
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/disintegration/imaging"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
	"github.com/rwcarlsen/goexif/exif"

	"github.com/patricksmith/highline-inventory/models"
)

// PhotoHandler handles photo upload and batch processing
type PhotoHandler struct {
	*Handler
	uploadDir string
	wsClients map[*websocket.Conn]bool
}

// NewPhotoHandler creates a new photo handler
func NewPhotoHandler(handler *Handler) *PhotoHandler {
	// Defensive check for nil handler
	if handler == nil {
		log.Printf("[PHOTO_HANDLER] Warning: base Handler is nil, creating with nil base")
	}

	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}

	// Ensure upload directory exists
	os.MkdirAll(uploadDir, 0755)
	os.MkdirAll(filepath.Join(uploadDir, "thumbnails"), 0755)
	os.MkdirAll(filepath.Join(uploadDir, "web"), 0755)
	os.MkdirAll(filepath.Join(uploadDir, "full"), 0755)

	return &PhotoHandler{
		Handler:   handler,
		uploadDir: uploadDir,
		wsClients: make(map[*websocket.Conn]bool),
	}
}

// WebSocket upgrade handler
func (ph *PhotoHandler) HandleWebSocket(c *websocket.Conn) {
	ph.wsClients[c] = true
	defer func() {
		delete(ph.wsClients, c)
		c.Close()
	}()

	for {
		var msg models.WebSocketMessage
		if err := c.ReadJSON(&msg); err != nil {
			break
		}
		// Echo back or handle specific commands
		c.WriteJSON(msg)
	}
}

// Broadcast message to all connected WebSocket clients
func (ph *PhotoHandler) broadcastMessage(msg models.WebSocketMessage) {
	// Defensive check for nil wsClients
	if ph.wsClients == nil {
		log.Printf("[WEBSOCKET] Warning: wsClients is nil, skipping broadcast")
		return
	}

	msg.Timestamp = time.Now()
	for client := range ph.wsClients {
		if err := client.WriteJSON(msg); err != nil {
			log.Printf("[WEBSOCKET] Error broadcasting to client: %v", err)
			delete(ph.wsClients, client)
			client.Close()
		}
	}
}

// GetPhotoStatus returns the status of the photo service
func (ph *PhotoHandler) GetPhotoStatus(c *fiber.Ctx) error {
	status := "operational"
	connectedClients := 0
	
	// Check if wsClients is initialized
	if ph.wsClients != nil {
		connectedClients = len(ph.wsClients)
	}
	
	// Check if upload directory exists and is writable
	if _, err := os.Stat(ph.uploadDir); os.IsNotExist(err) {
		status = "degraded"
	}
	
	return c.JSON(fiber.Map{
		"status":            status,
		"upload_dir":        ph.uploadDir,
		"connected_clients": connectedClients,
		"service":           "photo-handler",
		"timestamp":         time.Now().Format(time.RFC3339),
	})
}

// Upload single photo for item
func (ph *PhotoHandler) UploadItemPhoto(c *fiber.Ctx) error {
	itemID := c.Params("id")
	if itemID == "" {
		log.Printf("[PHOTO_UPLOAD] Missing item ID parameter")
		return c.Status(400).JSON(fiber.Map{"error": "Item ID is required", "details": "Item ID parameter is missing from URL"})
	}

	itemUUID, err := uuid.Parse(itemID)
	if err != nil {
		log.Printf("[PHOTO_UPLOAD] Invalid item ID format: %s", itemID)
		return c.Status(400).JSON(fiber.Map{"error": "Invalid item ID", "details": "Item ID must be a valid UUID"})
	}

	log.Printf("[PHOTO_UPLOAD] Starting photo upload for item ID: %s", itemID)

	// Get multipart form
	form, err := c.MultipartForm()
	if err != nil {
		log.Printf("[PHOTO_UPLOAD] Failed to parse multipart form: %v", err)
		return c.Status(400).JSON(fiber.Map{"error": "Failed to parse multipart form", "details": err.Error()})
	}

	// Try both 'photos' and 'photo' field names for flexibility
	files := form.File["photos"]
	if len(files) == 0 {
		files = form.File["photo"]
		if len(files) == 0 {
			log.Printf("[PHOTO_UPLOAD] No photos found in form fields 'photos' or 'photo'")
			return c.Status(400).JSON(fiber.Map{"error": "No photo file provided", "details": "Expected 'photos' or 'photo' field in multipart form"})
		}
		log.Printf("[PHOTO_UPLOAD] Found %d files in 'photo' field", len(files))
	} else {
		log.Printf("[PHOTO_UPLOAD] Found %d files in 'photos' field", len(files))
	}

	// Parse optional parameters
	sessionID := c.FormValue("session_id")
	angle := c.FormValue("angle")
	caption := c.FormValue("caption")
	isPrimary := c.FormValue("is_primary") == "true"

	var sessionUUID *uuid.UUID
	if sessionID != "" {
		parsed, err := uuid.Parse(sessionID)
		if err == nil {
			sessionUUID = &parsed
		}
	}

	var photoAngle *models.PhotoAngle
	if angle != "" {
		pa := models.PhotoAngle(angle)
		photoAngle = &pa
	}

	var results []fiber.Map
	successfulUploads := 0
	for i, file := range files {
		log.Printf("[PHOTO_UPLOAD] Processing file %d/%d: %s (size: %d bytes)", i+1, len(files), file.Filename, file.Size)

		// Check file size (limit to 50MB)
		if file.Size > 50*1024*1024 {
			log.Printf("[PHOTO_UPLOAD] File too large: %s (%d bytes)", file.Filename, file.Size)
			results = append(results, fiber.Map{
				"filename": file.Filename,
				"error":    "File too large (max 50MB)",
				"success":  false,
			})
			continue
		}

		// Check file type
		contentType := file.Header.Get("Content-Type")
		if !strings.HasPrefix(contentType, "image/") {
			log.Printf("[PHOTO_UPLOAD] Invalid file type: %s (%s)", file.Filename, contentType)
			results = append(results, fiber.Map{
				"filename": file.Filename,
				"error":    "Unsupported file type (images only)",
				"success":  false,
			})
			continue
		}

		result, err := ph.processPhotoUpload(file, &itemUUID, sessionUUID, photoAngle, &caption, isPrimary)
		if err != nil {
			log.Printf("[PHOTO_UPLOAD] Failed to process %s: %v", file.Filename, err)
			results = append(results, fiber.Map{
				"filename": file.Filename,
				"error":    err.Error(),
				"success":  false,
			})
		} else {
			log.Printf("[PHOTO_UPLOAD] Successfully processed %s (ID: %s)", file.Filename, result.ID)
			successfulUploads++
			results = append(results, fiber.Map{
				"filename": file.Filename,
				"photo":    result,
				"success":  true,
			})

			// Broadcast WebSocket update with enhanced data
			log.Printf("[PHOTO_UPLOAD] Broadcasting WebSocket update for photo %s", result.ID)
			ph.broadcastMessage(models.WebSocketMessage{
				Type: models.WSPhotoUploaded,
				Data: map[string]interface{}{
					"type": "photoUploaded",
					"item_id": itemUUID,
					"photo":   result,
					"timestamp": time.Now(),
				},
			})
		}
	}

	// Log activity (with defensive check)
	details := fmt.Sprintf("%d/%d photos uploaded successfully for item", successfulUploads, len(files))
	if ph.Handler != nil {
		ph.logItemActivity(models.ActivityAction("photo_uploaded"), itemUUID, &details, nil, nil)
	} else {
		log.Printf("[PHOTO_UPLOAD] Warning: Handler is nil, cannot log activity")
	}

	log.Printf("[PHOTO_UPLOAD] Upload completed for item %s: %d/%d successful", itemID, successfulUploads, len(files))

	return c.JSON(fiber.Map{
		"results": results,
		"total":   len(results),
		"successful": successfulUploads,
		"failed": len(results) - successfulUploads,
	})
}

// Process individual photo upload
func (ph *PhotoHandler) processPhotoUpload(file *multipart.FileHeader, itemID *uuid.UUID, sessionID *uuid.UUID, angle *models.PhotoAngle, caption *string, isPrimary bool) (*models.PhotoUpload, error) {
	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	log.Printf("[PHOTO_PROCESS] Processing upload: original=%s, generated=%s", file.Filename, filename)

	// Ensure upload directories exist
	uploadDirs := []string{
		filepath.Join(ph.uploadDir, "full"),
		filepath.Join(ph.uploadDir, "thumbnails"),
		filepath.Join(ph.uploadDir, "web"),
	}

	for _, dir := range uploadDirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Printf("[PHOTO_PROCESS] Failed to create directory %s: %v", dir, err)
			return nil, fmt.Errorf("failed to prepare upload directory %s: %v", dir, err)
		}
	}

	// Save original file
	fullPath := filepath.Join(ph.uploadDir, "full", filename)
	log.Printf("[PHOTO_PROCESS] Saving file to: %s", fullPath)
	if err := ph.saveFile(file, fullPath); err != nil {
		log.Printf("[PHOTO_PROCESS] Failed to save file %s: %v", fullPath, err)
		return nil, fmt.Errorf("failed to save file: %v", err)
	}

	log.Printf("[PHOTO_PROCESS] File saved successfully: %s", fullPath)

	// Extract image dimensions and EXIF data
	width, height, metadata, err := ph.extractImageInfo(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to extract image info: %v", err)
	}

	// Create database record
	// Handle nil sessionID safely
	var actualSessionID uuid.UUID
	if sessionID != nil {
		actualSessionID = *sessionID
	} else {
		// Generate a default session ID if none provided
		actualSessionID = uuid.New()
		log.Printf("[PHOTO_PROCESS] No session ID provided, generated default: %s", actualSessionID)
	}

	photoUpload := &models.PhotoUpload{
		ID:           uuid.New(),
		SessionID:    actualSessionID,
		ItemID:       itemID,
		Filename:     filename,
		OriginalName: file.Filename,
		MimeType:     file.Header.Get("Content-Type"),
		FileSize:     file.Size,
		Angle:        angle,
		Caption:      caption,
		IsPrimary:    isPrimary,
		UploadedAt:   time.Now(),
	}

	if ph.db != nil {
		log.Printf("[PHOTO_PROCESS] Inserting photo record into database: %s", photoUpload.ID)
		// Insert photo upload record
		query := `
			INSERT INTO photo_uploads (id, session_id, item_id, filename, mime_type, size_bytes, width, height, metadata, uploaded_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`

		// Convert metadata map to JSON
		metadataJSON, _ := json.Marshal(metadata)

		_, err = ph.db.Exec(query, photoUpload.ID, photoUpload.SessionID, photoUpload.ItemID,
			photoUpload.Filename, photoUpload.MimeType, photoUpload.FileSize,
			width, height, metadataJSON, photoUpload.UploadedAt)
		if err != nil {
			log.Printf("[PHOTO_PROCESS] Database insert failed: %v", err)
			return nil, fmt.Errorf("failed to save photo record: %v", err)
		}
		log.Printf("[PHOTO_PROCESS] Photo record inserted successfully: %s", photoUpload.ID)

		// Save metadata if available
		if metadata != nil {
			ph.savePhotoMetadata(photoUpload.ID, metadata)
		}

		// Also add to item_images table for backward compatibility
		if itemID != nil {
			// Use the actual session ID (not the potentially nil sessionID parameter)
			ph.createItemImageRecord(*itemID, photoUpload, &photoUpload.SessionID)
		}
	}

	// Process thumbnails and web versions asynchronously
	go ph.processPhotoVersions(photoUpload, fullPath, width, height)

	return photoUpload, nil
}

// Save file from multipart form
func (ph *PhotoHandler) saveFile(file *multipart.FileHeader, dst string) error {
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, src)
	return err
}

// Extract image dimensions and EXIF data
func (ph *PhotoHandler) extractImageInfo(filePath string) (int, int, map[string]interface{}, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return 0, 0, nil, err
	}
	defer file.Close()

	// Get image dimensions
	img, _, err := image.DecodeConfig(file)
	if err != nil {
		return 0, 0, nil, err
	}

	// Reset file pointer for EXIF reading
	file.Seek(0, 0)

	// Extract EXIF data
	metadata := make(map[string]interface{})
	exifData, err := exif.Decode(file)
	if err == nil {
		// Extract key EXIF fields
		if tag, err := exifData.Get(exif.DateTime); err == nil {
			if takenTime, err := tag.StringVal(); err == nil {
				metadata["taken_at"] = takenTime
			}
		}
		if tag, err := exifData.Get(exif.Make); err == nil {
			if make, err := tag.StringVal(); err == nil {
				metadata["camera_make"] = make
			}
		}
		if tag, err := exifData.Get(exif.Model); err == nil {
			if model, err := tag.StringVal(); err == nil {
				metadata["camera_model"] = model
			}
		}
		if tag, err := exifData.Get(exif.FNumber); err == nil {
			if val, err := tag.StringVal(); err == nil {
				metadata["aperture"] = val
			}
		}
		if tag, err := exifData.Get(exif.ExposureTime); err == nil {
			if val, err := tag.StringVal(); err == nil {
				metadata["shutter_speed"] = val
			}
		}
		if tag, err := exifData.Get(exif.ISOSpeedRatings); err == nil {
			if iso, err := tag.Int(0); err == nil {
				metadata["iso"] = iso
			}
		}
		if tag, err := exifData.Get(exif.Orientation); err == nil {
			if orientation, err := tag.Int(0); err == nil {
				metadata["orientation"] = orientation
			}
		}

		// GPS data
		if lat, lon, err := exifData.LatLong(); err == nil {
			metadata["latitude"] = lat
			metadata["longitude"] = lon
		}
	}

	return img.Width, img.Height, metadata, nil
}

// Save photo metadata to database
func (ph *PhotoHandler) savePhotoMetadata(photoID uuid.UUID, metadata map[string]interface{}) error {
	if ph.db == nil {
		return nil
	}

	query := `
		INSERT INTO photo_metadata (photo_id, exif_data, latitude, longitude, taken_at, camera_model, aperture, shutter_speed, iso, orientation)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	exifJSON, _ := json.Marshal(metadata)

	var latitude, longitude *float64
	var takenAt *time.Time
	var cameraModel, shutterSpeed *string
	var aperture *float64
	var iso, orientation *int

	if lat, ok := metadata["latitude"].(float64); ok {
		latitude = &lat
	}
	if lon, ok := metadata["longitude"].(float64); ok {
		longitude = &lon
	}
	if taken, ok := metadata["taken_at"].(string); ok {
		if t, err := time.Parse("2006:01:02 15:04:05", taken); err == nil {
			takenAt = &t
		}
	}
	if model, ok := metadata["camera_model"].(string); ok {
		cameraModel = &model
	}
	if ap, ok := metadata["aperture"].(float64); ok {
		aperture = &ap
	}
	if ss, ok := metadata["shutter_speed"].(string); ok {
		shutterSpeed = &ss
	}
	if i, ok := metadata["iso"].(int); ok {
		iso = &i
	}
	if o, ok := metadata["orientation"].(int); ok {
		orientation = &o
	}

	_, err := ph.db.Exec(query, photoID, exifJSON, latitude, longitude, takenAt, cameraModel, aperture, shutterSpeed, iso, orientation)
	return err
}

// Create item_images record for backward compatibility
func (ph *PhotoHandler) createItemImageRecord(itemID uuid.UUID, photo *models.PhotoUpload, sessionID *uuid.UUID) error {
	if ph.db == nil {
		return nil
	}

	fullURL := fmt.Sprintf("/api/photos/full/%s", photo.Filename)
	thumbnailURL := fmt.Sprintf("/api/photos/thumbnails/%s", photo.Filename)

	query := `
		INSERT INTO item_images (item_id, url, thumbnail_url, caption, is_primary, angle, capture_session_id, original_filename, file_size)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := ph.db.Exec(query, itemID, fullURL, &thumbnailURL, photo.Caption, photo.IsPrimary, photo.Angle, sessionID, photo.OriginalName, photo.FileSize)
	return err
}

// Process different photo versions (thumbnails, web size)
func (ph *PhotoHandler) processPhotoVersions(photo *models.PhotoUpload, originalPath string, originalWidth, originalHeight int) {
	// Load original image
	src, err := imaging.Open(originalPath)
	if err != nil {
		return
	}

	// Create thumbnail (150x150)
	thumbnail := imaging.Fill(src, 150, 150, imaging.Center, imaging.Lanczos)
	thumbnailPath := filepath.Join(ph.uploadDir, "thumbnails", photo.Filename)
	if err := ph.saveImageVersion(thumbnail, thumbnailPath, photo.Filename); err == nil {
		ph.savePhotoVersion(photo.ID, models.ResolutionThumbnail, thumbnailPath, 150, 150)
	}

	// Create web version (800px max width/height)
	var web image.Image
	if originalWidth > 800 || originalHeight > 800 {
		web = imaging.Fit(src, 800, 800, imaging.Lanczos)
	} else {
		web = src
	}
	webPath := filepath.Join(ph.uploadDir, "web", photo.Filename)
	if err := ph.saveImageVersion(web, webPath, photo.Filename); err == nil {
		webBounds := web.Bounds()
		ph.savePhotoVersion(photo.ID, models.ResolutionWeb, webPath, webBounds.Dx(), webBounds.Dy())
	}

	// Save full version record
	ph.savePhotoVersion(photo.ID, models.ResolutionFull, originalPath, originalWidth, originalHeight)

	// Mark photo as processed
	if ph.db != nil {
		now := time.Now()
		ph.db.Exec("UPDATE photo_uploads SET processed_at = $1 WHERE id = $2", now, photo.ID)

		// Broadcast processing complete
		ph.broadcastMessage(models.WebSocketMessage{
			Type: models.WSPhotoProcessed,
			Data: map[string]interface{}{
				"photo_id": photo.ID,
				"processed_at": now,
			},
		})
	}
}

// Save image version to disk
func (ph *PhotoHandler) saveImageVersion(img image.Image, path, filename string) error {
	out, err := os.Create(path)
	if err != nil {
		return err
	}
	defer out.Close()

	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".jpg", ".jpeg":
		return jpeg.Encode(out, img, &jpeg.Options{Quality: 85})
	case ".png":
		return png.Encode(out, img)
	default:
		return jpeg.Encode(out, img, &jpeg.Options{Quality: 85})
	}
}

// Save photo version record to database
func (ph *PhotoHandler) savePhotoVersion(photoID uuid.UUID, resolution models.PhotoResolution, path string, width, height int) error {
	if ph.db == nil {
		return nil
	}

	// Get file size
	stat, err := os.Stat(path)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("/api/photos/%s/%s", string(resolution), filepath.Base(path))

	query := `
		INSERT INTO photo_versions (photo_id, resolution, url, width, height, file_size)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (photo_id, resolution) DO UPDATE SET
			url = EXCLUDED.url,
			width = EXCLUDED.width,
			height = EXCLUDED.height,
			file_size = EXCLUDED.file_size
	`

	_, err = ph.db.Exec(query, photoID, resolution, url, width, height, stat.Size())
	return err
}

// Batch upload multiple photos
func (ph *PhotoHandler) BatchUploadPhotos(c *fiber.Ctx) error {
	sessionID := c.Params("sessionId")
	if sessionID == "" {
		log.Printf("[BATCH_UPLOAD] Missing session ID parameter")
		return c.Status(400).JSON(fiber.Map{"error": "Session ID is required", "details": "Session ID parameter is missing from URL"})
	}

	sessionUUID, err := uuid.Parse(sessionID)
	if err != nil {
		log.Printf("[BATCH_UPLOAD] Invalid session ID format: %s", sessionID)
		return c.Status(400).JSON(fiber.Map{"error": "Invalid session ID", "details": "Session ID must be a valid UUID"})
	}

	log.Printf("[BATCH_UPLOAD] Starting batch photo upload for session ID: %s", sessionID)

	// Get multipart form
	form, err := c.MultipartForm()
	if err != nil {
		log.Printf("[BATCH_UPLOAD] Failed to parse multipart form: %v", err)
		return c.Status(400).JSON(fiber.Map{"error": "Failed to parse multipart form", "details": err.Error()})
	}

	// Try both 'photos' and 'photo' field names for flexibility
	files := form.File["photos"]
	if len(files) == 0 {
		files = form.File["photo"]
		if len(files) == 0 {
			log.Printf("[BATCH_UPLOAD] No photos found in form fields 'photos' or 'photo'")
			return c.Status(400).JSON(fiber.Map{"error": "No photo file provided", "details": "Expected 'photos' or 'photo' field in multipart form"})
		}
		log.Printf("[BATCH_UPLOAD] Found %d files in 'photo' field", len(files))
	} else {
		log.Printf("[BATCH_UPLOAD] Found %d files in 'photos' field", len(files))
	}

	// Process each photo
	var results []fiber.Map
	successfulUploads := 0
	for i, file := range files {
		log.Printf("[BATCH_UPLOAD] Processing file %d/%d: %s (size: %d bytes)", i+1, len(files), file.Filename, file.Size)

		// Check file size (limit to 50MB)
		if file.Size > 50*1024*1024 {
			log.Printf("[BATCH_UPLOAD] File too large: %s (%d bytes)", file.Filename, file.Size)
			results = append(results, fiber.Map{
				"filename": file.Filename,
				"error":    "File too large (max 50MB)",
				"success":  false,
			})
			continue
		}

		// Check file type
		contentType := file.Header.Get("Content-Type")
		if !strings.HasPrefix(contentType, "image/") {
			log.Printf("[BATCH_UPLOAD] Invalid file type: %s (%s)", file.Filename, contentType)
			results = append(results, fiber.Map{
				"filename": file.Filename,
				"error":    "Unsupported file type (images only)",
				"success":  false,
			})
			continue
		}

		// Parse per-photo metadata from form
		itemIDKey := fmt.Sprintf("item_ids[%d]", i)
		angleKey := fmt.Sprintf("angles[%d]", i)
		captionKey := fmt.Sprintf("captions[%d]", i)
		primaryKey := fmt.Sprintf("is_primary[%d]", i)

		var itemID *uuid.UUID
		if itemIDStr := c.FormValue(itemIDKey); itemIDStr != "" {
			if parsed, err := uuid.Parse(itemIDStr); err == nil {
				itemID = &parsed
			} else {
				log.Printf("[BATCH_UPLOAD] Invalid item ID format for file %s: %s", file.Filename, itemIDStr)
			}
		}

		var angle *models.PhotoAngle
		if angleStr := c.FormValue(angleKey); angleStr != "" {
			pa := models.PhotoAngle(angleStr)
			angle = &pa
		}

		caption := c.FormValue(captionKey)
		if caption == "" {
			caption = ""
		}
		isPrimary := c.FormValue(primaryKey) == "true"

		result, err := ph.processPhotoUpload(file, itemID, &sessionUUID, angle, &caption, isPrimary)
		if err != nil {
			log.Printf("[BATCH_UPLOAD] Failed to process %s: %v", file.Filename, err)
			results = append(results, fiber.Map{
				"filename": file.Filename,
				"error":    err.Error(),
				"success":  false,
			})
		} else {
			log.Printf("[BATCH_UPLOAD] Successfully processed %s (ID: %s)", file.Filename, result.ID)
			successfulUploads++
			results = append(results, fiber.Map{
				"filename": file.Filename,
				"photo":    result,
				"success":  true,
			})

			// Broadcast WebSocket update with enhanced data
			log.Printf("[BATCH_UPLOAD] Broadcasting WebSocket update for photo %s", result.ID)
			ph.broadcastMessage(models.WebSocketMessage{
				Type: models.WSPhotoUploaded,
				Data: map[string]interface{}{
					"type": "photoUploaded",
					"session_id": sessionUUID,
					"photo":      result,
					"timestamp": time.Now(),
				},
			})
		}
	}

	// Log activity (with defensive check)
	details := fmt.Sprintf("Batch uploaded %d/%d photos successfully", successfulUploads, len(files))
	if ph.Handler != nil {
		ph.logActivity(models.ActivityAction("photo_uploaded"), nil, nil, nil, &details, nil, nil, nil)
	} else {
		log.Printf("[BATCH_UPLOAD] Warning: Handler is nil, cannot log activity")
	}

	log.Printf("[BATCH_UPLOAD] Batch upload completed for session %s: %d/%d successful", sessionID, successfulUploads, len(files))

	return c.JSON(fiber.Map{
		"session_id": sessionUUID,
		"results":    results,
		"total":      len(results),
		"successful": successfulUploads,
		"failed":     len(results) - successfulUploads,
	})
}

func countErrors(results []fiber.Map) int {
	count := 0
	for _, result := range results {
		if success, ok := result["success"].(bool); !ok || !success {
			count++
		}
	}
	return count
}

// Create photo session
func (ph *PhotoHandler) CreatePhotoSession(c *fiber.Ctx) error {
	var req models.CreatePhotoSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	session := &models.PhotoSession{
		ID:          uuid.New(),
		RoomID:      req.RoomID,
		Name:        req.Name,
		Description: req.Description,
		Status:      models.SessionActive,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if ph.db != nil {
		query := `
			INSERT INTO photo_sessions (id, room_id, name, description, status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`
		_, err := ph.db.Exec(query, session.ID, session.RoomID, session.Name, session.Description, session.Status, session.CreatedAt, session.UpdatedAt)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create session"})
		}

		// Get room info if available
		if session.RoomID != nil {
			var room models.Room
			err := ph.db.Get(&room, "SELECT * FROM rooms WHERE id = $1", *session.RoomID)
			if err == nil {
				session.Room = &room
			}
		}
	}

	// Log activity (with defensive check)
	details := fmt.Sprintf("Photo session created: %s", session.Name)
	if ph.Handler != nil {
		ph.logActivity(models.ActivityAction("session_created"), nil, nil, nil, &details, nil, nil, nil)
	} else {
		log.Printf("[PHOTO_SESSION] Warning: Handler is nil, cannot log activity")
	}

	// Broadcast WebSocket update
	ph.broadcastMessage(models.WebSocketMessage{
		Type: models.WSSessionUpdated,
		Data: session,
	})

	return c.JSON(session)
}

// Get photo session by ID
func (ph *PhotoHandler) GetPhotoSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	if sessionID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Session ID is required"})
	}

	sessionUUID, err := uuid.Parse(sessionID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid session ID"})
	}

	if ph.db == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Database not available"})
	}

	var session models.PhotoSession
	query := `
		SELECT ps.*, r.name as room_name, r.floor
		FROM photo_sessions ps
		LEFT JOIN rooms r ON ps.room_id = r.id
		WHERE ps.id = $1
	`

	err = ph.db.Get(&session, query, sessionUUID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Session not found"})
	}

	// Get photos for this session
	var photos []models.PhotoUpload
	photoQuery := `
		SELECT pu.*,
		       i.name as item_name,
		       r.name as room_name
		FROM photo_uploads pu
		LEFT JOIN items i ON pu.item_id = i.id
		LEFT JOIN rooms r ON i.room_id = r.id
		WHERE pu.session_id = $1
		ORDER BY pu.uploaded_at DESC
	`
	ph.db.Select(&photos, photoQuery, sessionUUID)
	session.Photos = photos

	return c.JSON(session)
}

// Update photo session
func (ph *PhotoHandler) UpdatePhotoSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	if sessionID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Session ID is required"})
	}

	sessionUUID, err := uuid.Parse(sessionID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid session ID"})
	}

	var req models.UpdatePhotoSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if ph.db == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Database not available"})
	}

	// Build update query dynamically
	setParts := []string{"updated_at = CURRENT_TIMESTAMP"}
	args := []interface{}{sessionUUID}
	argIndex := 2

	if req.Name != nil {
		setParts = append(setParts, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *req.Name)
		argIndex++
	}
	if req.Description != nil {
		setParts = append(setParts, fmt.Sprintf("description = $%d", argIndex))
		args = append(args, *req.Description)
		argIndex++
	}
	if req.Status != nil {
		setParts = append(setParts, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *req.Status)
		argIndex++

		if *req.Status == models.SessionCompleted {
			setParts = append(setParts, fmt.Sprintf("completed_at = $%d", argIndex))
			args = append(args, time.Now())
			argIndex++
		}
	}

	query := fmt.Sprintf(`
		UPDATE photo_sessions
		SET %s
		WHERE id = $1
		RETURNING *
	`, strings.Join(setParts, ", "))

	var session models.PhotoSession
	err = ph.db.Get(&session, query, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update session"})
	}

	// Log activity if completed (with defensive check)
	if req.Status != nil && *req.Status == models.SessionCompleted {
		details := fmt.Sprintf("Photo session completed: %s", session.Name)
		if ph.Handler != nil {
			ph.logActivity(models.ActivityAction("session_completed"), nil, nil, nil, &details, nil, nil, nil)
		} else {
			log.Printf("[PHOTO_SESSION] Warning: Handler is nil, cannot log activity")
		}
	}

	// Broadcast WebSocket update
	ph.broadcastMessage(models.WebSocketMessage{
		Type: models.WSSessionUpdated,
		Data: session,
	})

	return c.JSON(session)
}

// Get room photo progress
func (ph *PhotoHandler) GetRoomPhotoProgress(c *fiber.Ctx) error {
	if ph.db == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Database not available"})
	}

	var progress []models.PhotoProgressSummary
	query := `SELECT * FROM photo_progress_summary ORDER BY floor, room_name`

	err := ph.db.Select(&progress, query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get progress"})
	}

	return c.JSON(fiber.Map{
		"progress": progress,
		"total_rooms": len(progress),
	})
}

// Serve photo files
func (ph *PhotoHandler) ServePhoto(c *fiber.Ctx) error {
	resolution := c.Params("resolution")
	filename := c.Params("filename")

	if !isValidResolution(resolution) {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid resolution"})
	}

	filePath := filepath.Join(ph.uploadDir, resolution, filename)
	return c.SendFile(filePath)
}

func isValidResolution(resolution string) bool {
	validResolutions := []string{"thumbnail", "web", "full"}
	for _, valid := range validResolutions {
		if resolution == valid {
			return true
		}
	}
	return false
}
