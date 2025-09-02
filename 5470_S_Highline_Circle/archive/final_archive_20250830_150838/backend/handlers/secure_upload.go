package handlers

import (
	"crypto/sha256"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/patricksmith/highline-inventory/models"
)

const (
	// Maximum file size: 10MB
	MaxFileSize = 10 * 1024 * 1024
	
	// Maximum files per upload
	MaxFilesPerUpload = 10
	
	// Upload directories
	QuarantinePath = "./uploads/quarantine/"
	PhotoPath      = "./uploads/photos/"
	ThumbnailPath  = "./uploads/thumbnails/"
)

// Allowed MIME types for upload
var AllowedMimeTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
}

// File upload response
type UploadResponse struct {
	Success  bool     `json:"success"`
	Files    []string `json:"files,omitempty"`
	Errors   []string `json:"errors,omitempty"`
	Total    int      `json:"total"`
	Uploaded int      `json:"uploaded"`
}

// SecureUploadPhoto handles secure photo uploads with validation
func (h *Handler) SecureUploadPhoto(c *fiber.Ctx) error {
	// Get authenticated user from context
	user := c.Locals("user")
	if user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authentication required",
			"code":  "UNAUTHORIZED",
		})
	}

	// Parse multipart form
	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to parse form data",
			"code":  "PARSE_ERROR",
		})
	}

	files := form.File["photos"]
	if len(files) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No files provided",
			"code":  "NO_FILES",
		})
	}

	// Check file count limit
	if len(files) > MaxFilesPerUpload {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Maximum %d files allowed per upload", MaxFilesPerUpload),
			"code":  "TOO_MANY_FILES",
		})
	}

	// Get item ID if provided
	itemID := c.FormValue("item_id")
	if itemID != "" {
		// Validate UUID format
		if _, err := uuid.Parse(itemID); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid item ID",
				"code":  "INVALID_ITEM_ID",
			})
		}
	}

	response := UploadResponse{
		Total:  len(files),
		Files:  []string{},
		Errors: []string{},
	}

	// Process each file
	for _, file := range files {
		if err := h.processUploadedFile(file, itemID); err != nil {
			response.Errors = append(response.Errors, fmt.Sprintf("%s: %s", file.Filename, err.Error()))
			continue
		}
		response.Files = append(response.Files, file.Filename)
		response.Uploaded++
	}

	response.Success = response.Uploaded > 0

	// Log upload activity
	if h.db != nil {
		details := fmt.Sprintf("Uploaded %d photos", response.Uploaded)
		h.logActivity(models.ActivityCreated, nil, nil, nil, &details, nil, nil, nil)
	}

	return c.JSON(response)
}

// processUploadedFile validates and processes a single uploaded file
func (h *Handler) processUploadedFile(file *multipart.FileHeader, itemID string) error {
	// Validate file size
	if file.Size > MaxFileSize {
		return fmt.Errorf("file size exceeds %d MB limit", MaxFileSize/(1024*1024))
	}

	// Open file for reading
	src, err := file.Open()
	if err != nil {
		return fmt.Errorf("failed to open file")
	}
	defer src.Close()

	// Read first 512 bytes for content type detection
	buffer := make([]byte, 512)
	n, err := src.Read(buffer)
	if err != nil && err != io.EOF {
		return fmt.Errorf("failed to read file")
	}

	// Reset file pointer
	src.Seek(0, 0)

	// Detect content type
	contentType := detectContentType(buffer[:n])
	if !isAllowedContentType(contentType) {
		return fmt.Errorf("file type not allowed: %s", contentType)
	}

	// Validate image file
	if err := validateImage(src); err != nil {
		return fmt.Errorf("invalid image file: %v", err)
	}

	// Reset file pointer again
	src.Seek(0, 0)

	// Generate secure filename
	secureFilename := generateSecureFilename(file.Filename)

	// Create directories if they don't exist
	if err := ensureDirectories(); err != nil {
		return fmt.Errorf("failed to create directories: %v", err)
	}

	// Save to quarantine first
	quarantinePath := filepath.Join(QuarantinePath, secureFilename)
	if err := saveFile(src, quarantinePath); err != nil {
		return fmt.Errorf("failed to save file: %v", err)
	}

	// Scan file for malware (implement antivirus scanning here)
	if err := scanFile(quarantinePath); err != nil {
		os.Remove(quarantinePath)
		return fmt.Errorf("file failed security scan: %v", err)
	}

	// Move to final destination
	finalPath := filepath.Join(PhotoPath, secureFilename)
	if err := os.Rename(quarantinePath, finalPath); err != nil {
		os.Remove(quarantinePath)
		return fmt.Errorf("failed to move file: %v", err)
	}

	// Generate thumbnail
	thumbnailPath := filepath.Join(ThumbnailPath, secureFilename)
	if err := generateThumbnail(finalPath, thumbnailPath); err != nil {
		// Log error but don't fail the upload
		fmt.Printf("Failed to generate thumbnail: %v\n", err)
	}

	// Save file metadata to database
	if h.db != nil && itemID != "" {
		if err := h.savePhotoMetadata(itemID, secureFilename, file.Size, contentType); err != nil {
			// Log error but don't fail the upload
			fmt.Printf("Failed to save metadata: %v\n", err)
		}
	}

	return nil
}

// detectContentType detects the MIME type of the file
func detectContentType(buffer []byte) string {
	// Check magic bytes for common image formats
	if len(buffer) < 8 {
		return "application/octet-stream"
	}

	// JPEG
	if buffer[0] == 0xFF && buffer[1] == 0xD8 && buffer[2] == 0xFF {
		return "image/jpeg"
	}

	// PNG
	if buffer[0] == 0x89 && buffer[1] == 0x50 && buffer[2] == 0x4E && buffer[3] == 0x47 {
		return "image/png"
	}

	// GIF
	if buffer[0] == 0x47 && buffer[1] == 0x49 && buffer[2] == 0x46 {
		return "image/gif"
	}

	// WebP
	if len(buffer) >= 12 {
		if string(buffer[0:4]) == "RIFF" && string(buffer[8:12]) == "WEBP" {
			return "image/webp"
		}
	}

	return "application/octet-stream"
}

// isAllowedContentType checks if the content type is allowed
func isAllowedContentType(contentType string) bool {
	_, ok := AllowedMimeTypes[contentType]
	return ok
}

// validateImage validates that the file is a valid image
func validateImage(src io.Reader) error {
	// Decode image to validate it's a real image file
	_, format, err := image.DecodeConfig(src)
	if err != nil {
		return fmt.Errorf("not a valid image: %v", err)
	}

	// Check if format is supported
	supportedFormats := map[string]bool{
		"jpeg": true,
		"png":  true,
		"gif":  true,
	}

	if !supportedFormats[format] {
		return fmt.Errorf("unsupported image format: %s", format)
	}

	return nil
}

// generateSecureFilename generates a secure, unique filename
func generateSecureFilename(originalName string) string {
	// Get file extension
	ext := filepath.Ext(originalName)
	ext = strings.ToLower(ext)

	// Validate extension
	validExtensions := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
	}

	if !validExtensions[ext] {
		ext = ".jpg" // Default to jpg
	}

	// Generate unique identifier
	timestamp := time.Now().Unix()
	randomUUID := uuid.New().String()
	
	// Create hash for additional uniqueness
	hash := sha256.Sum256([]byte(fmt.Sprintf("%s-%d-%s", originalName, timestamp, randomUUID)))
	hashStr := fmt.Sprintf("%x", hash)[:16]

	// Return secure filename
	return fmt.Sprintf("%d_%s%s", timestamp, hashStr, ext)
}

// ensureDirectories creates upload directories if they don't exist
func ensureDirectories() error {
	dirs := []string{QuarantinePath, PhotoPath, ThumbnailPath}
	
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}
	}
	
	return nil
}

// saveFile saves the uploaded file to disk
func saveFile(src io.Reader, destPath string) error {
	dst, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer dst.Close()

	// Set file permissions
	if err := dst.Chmod(0644); err != nil {
		return err
	}

	// Copy file content
	_, err = io.Copy(dst, src)
	return err
}

// scanFile performs antivirus scanning on the uploaded file
func scanFile(filePath string) error {
	// TODO: Implement actual antivirus scanning
	// This could integrate with ClamAV or other antivirus solutions
	// For now, we'll do basic checks

	// Check file size
	info, err := os.Stat(filePath)
	if err != nil {
		return err
	}

	if info.Size() == 0 {
		return fmt.Errorf("empty file")
	}

	// Check for suspicious patterns in file content
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	// Read file content for scanning
	content := make([]byte, 1024)
	_, err = file.Read(content)
	if err != nil && err != io.EOF {
		return err
	}

	// Check for executable signatures
	if containsExecutableSignature(content) {
		return fmt.Errorf("file contains executable code")
	}

	return nil
}

// containsExecutableSignature checks for common executable signatures
func containsExecutableSignature(content []byte) bool {
	// Check for common executable patterns
	signatures := [][]byte{
		[]byte("MZ"),       // DOS/Windows executable
		[]byte("\x7FELF"),  // Linux ELF
		[]byte("#!"),       // Shell script
		[]byte("<?php"),    // PHP script
		[]byte("<script"),  // JavaScript
	}

	for _, sig := range signatures {
		if len(content) >= len(sig) {
			if string(content[:len(sig)]) == string(sig) {
				return true
			}
		}
	}

	return false
}

// generateThumbnail creates a thumbnail for the uploaded image
func generateThumbnail(sourcePath, destPath string) error {
	// TODO: Implement thumbnail generation
	// This would use an image processing library to create smaller versions
	// For now, we'll just copy the file as a placeholder
	
	src, err := os.Open(sourcePath)
	if err != nil {
		return err
	}
	defer src.Close()

	return saveFile(src, destPath)
}

// savePhotoMetadata saves photo information to the database
func (h *Handler) savePhotoMetadata(itemID, filename string, size int64, contentType string) error {
	query := `
		INSERT INTO photo_uploads (item_id, filename, size_bytes, mime_type, uploaded_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	
	_, err := h.db.Exec(query, itemID, filename, size, contentType, time.Now())
	return err
}

// ServeSecurePhoto serves photos with security headers
func (h *Handler) ServeSecurePhoto(c *fiber.Ctx) error {
	filename := c.Params("filename")
	resolution := c.Params("resolution", "full")

	// Validate filename
	if !isValidFilename(filename) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid filename",
			"code":  "INVALID_FILENAME",
		})
	}

	// Determine path based on resolution
	var basePath string
	switch resolution {
	case "thumbnail":
		basePath = ThumbnailPath
	case "full":
		basePath = PhotoPath
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid resolution",
			"code":  "INVALID_RESOLUTION",
		})
	}

	// Construct file path
	filePath := filepath.Join(basePath, filename)

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "File not found",
			"code":  "NOT_FOUND",
		})
	}

	// Set security headers
	c.Set("X-Content-Type-Options", "nosniff")
	c.Set("X-Frame-Options", "DENY")
	c.Set("Content-Security-Policy", "default-src 'none'; img-src 'self'")
	
	// Set cache headers
	c.Set("Cache-Control", "public, max-age=31536000, immutable")
	c.Set("Expires", time.Now().Add(365*24*time.Hour).Format(time.RFC1123))

	// Serve file
	return c.SendFile(filePath)
}

// isValidFilename checks if a filename is valid and safe
func isValidFilename(filename string) bool {
	// Check for path traversal attempts
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		return false
	}

	// Check for null bytes
	if strings.Contains(filename, "\x00") {
		return false
	}

	// Validate format: timestamp_hash.ext
	pattern := `^\d+_[a-f0-9]{16}\.(jpg|jpeg|png|gif|webp)$`
	matched, _ := regexp.MatchString(pattern, filename)

	return matched
}