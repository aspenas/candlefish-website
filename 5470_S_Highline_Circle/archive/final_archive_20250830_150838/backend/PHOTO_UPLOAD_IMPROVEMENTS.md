# Photo Upload System Improvements

This document outlines the comprehensive improvements made to the photo upload system for the home inventory application.

## Issues Fixed

### 1. Form Field Name Flexibility ✅

**Problem**: Backend only accepted "photos" field name, causing compatibility issues with different frontend implementations.

**Solution**: Modified both `UploadItemPhoto` and `BatchUploadPhotos` functions to accept both "photos" and "photo" field names.

```go
// Try both 'photos' and 'photo' field names for flexibility
files := form.File["photos"]
if len(files) == 0 {
    files = form.File["photo"]
    if len(files) == 0 {
        log.Printf("[PHOTO_UPLOAD] No photos found in form fields 'photos' or 'photo'")
        return c.Status(400).JSON(fiber.Map{
            "error": "No photo file provided", 
            "details": "Expected 'photos' or 'photo' field in multipart form"
        })
    }
}
```

### 2. Detailed Logging for Debugging ✅

**Problem**: Insufficient logging made it difficult to debug photo upload issues.

**Solution**: Added comprehensive logging throughout the upload process:

- **Upload initiation**: Log item/session IDs and file counts
- **File processing**: Log each file's name, size, and processing status
- **File validation**: Log size/type validation results
- **Database operations**: Log insert operations and success/failure
- **WebSocket broadcasts**: Log broadcast attempts
- **Upload completion**: Log final success/failure counts

Example log output:
```
[PHOTO_UPLOAD] Starting photo upload for item ID: 123e4567-e89b-12d3-a456-426614174000
[PHOTO_UPLOAD] Found 2 files in 'photos' field
[PHOTO_UPLOAD] Processing file 1/2: IMG_001.jpg (size: 2048576 bytes)
[PHOTO_PROCESS] Processing upload: original=IMG_001.jpg, generated=a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6.jpg
[PHOTO_PROCESS] Saving file to: ./uploads/full/a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6.jpg
[PHOTO_PROCESS] File saved successfully
[PHOTO_PROCESS] Inserting photo record into database: a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6
[PHOTO_UPLOAD] Successfully processed IMG_001.jpg (ID: a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6)
[PHOTO_UPLOAD] Broadcasting WebSocket update for photo a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6
```

### 3. Upload Directory Creation ✅

**Problem**: Upload failures when directories didn't exist.

**Solution**: Added automatic directory creation in `processPhotoUpload`:

```go
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
```

### 4. Enhanced CORS Configuration ✅

**Problem**: Generic CORS settings didn't properly support multipart uploads with credentials.

**Solution**: Updated CORS configuration in `main.go` with specific origins and credential support:

```go
app.Use(cors.New(cors.Config{
    AllowOrigins:     "https://inventory.highline.work,http://localhost:3000,https://5470-inventory.netlify.app",
    AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Requested-With",
    AllowMethods:     "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS",
    AllowCredentials: true,
}))
```

### 5. Detailed Error Messages with Proper Status Codes ✅

**Problem**: Generic 500 errors with minimal information.

**Solution**: Implemented specific error codes and detailed error messages:

- **400**: Bad request (missing file, invalid item ID, invalid form)
- **413**: File too large (>50MB)
- **422**: Unsupported file type (non-image files)
- **500**: Server errors with specific details

```go
// File size validation
if file.Size > 50*1024*1024 {
    log.Printf("[PHOTO_UPLOAD] File too large: %s (%d bytes)", file.Filename, file.Size)
    results = append(results, fiber.Map{
        "filename": file.Filename,
        "error":    "File too large (max 50MB)",
        "success":  false,
    })
    continue
}

// File type validation
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
```

### 6. Enhanced WebSocket Broadcasts ✅

**Problem**: Basic WebSocket broadcasts without sufficient context.

**Solution**: Enhanced broadcast messages with comprehensive data:

```go
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
```

## API Response Improvements

### Enhanced Response Format

Responses now include detailed success/failure metrics:

```json
{
  "results": [
    {
      "filename": "IMG_001.jpg",
      "photo": {
        "id": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
        "filename": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6.jpg",
        "original_name": "IMG_001.jpg",
        "file_size": 2048576
      },
      "success": true
    },
    {
      "filename": "document.txt",
      "error": "Unsupported file type (images only)",
      "success": false
    }
  ],
  "total": 2,
  "successful": 1,
  "failed": 1
}
```

## Testing the Improvements

A comprehensive test script has been created at `/backend/test-photo-upload.js` that demonstrates:

1. **Field name flexibility**: Tests both "photo" and "photos" field names
2. **Error handling**: Validates file size and type restrictions
3. **CORS compliance**: Uses proper headers for cross-origin requests
4. **Response validation**: Checks response format and status codes

### Running the Test

```bash
cd /Users/patricksmith/candlefish-ai/5470_S_Highline_Circle/backend
npm install form-data  # If not already installed
node test-photo-upload.js
```

## File Structure

```
/backend/
├── handlers/
│   └── photos.go         # Enhanced photo upload handlers
├── main.go               # Updated CORS configuration
├── test-photo-upload.js  # Test script
└── PHOTO_UPLOAD_IMPROVEMENTS.md  # This documentation
```

## Server Logs Example

With the new logging system, you'll see detailed logs like:

```
[PHOTO_UPLOAD] Starting photo upload for item ID: 123e4567-e89b-12d3-a456-426614174000
[PHOTO_UPLOAD] Found 1 files in 'photo' field
[PHOTO_UPLOAD] Processing file 1/1: test-image.jpg (size: 524288 bytes)
[PHOTO_PROCESS] Processing upload: original=test-image.jpg, generated=d4c3b2a1-6f5e-8h7g-0j9i-m3n4o5p6q7r8.jpg
[PHOTO_PROCESS] Saving file to: ./uploads/full/d4c3b2a1-6f5e-8h7g-0j9i-m3n4o5p6q7r8.jpg
[PHOTO_PROCESS] File saved successfully: ./uploads/full/d4c3b2a1-6f5e-8h7g-0j9i-m3n4o5p6q7r8.jpg
[PHOTO_PROCESS] Inserting photo record into database: d4c3b2a1-6f5e-8h7g-0j9i-m3n4o5p6q7r8
[PHOTO_PROCESS] Photo record inserted successfully: d4c3b2a1-6f5e-8h7g-0j9i-m3n4o5p6q7r8
[PHOTO_UPLOAD] Successfully processed test-image.jpg (ID: d4c3b2a1-6f5e-8h7g-0j9i-m3n4o5p6q7r8)
[PHOTO_UPLOAD] Broadcasting WebSocket update for photo d4c3b2a1-6f5e-8h7g-0j9i-m3n4o5p6q7r8
[PHOTO_UPLOAD] Upload completed for item 123e4567-e89b-12d3-a456-426614174000: 1/1 successful
```

## Deployment

The improved photo upload system is ready for deployment to the production server at `https://5470-inventory.fly.dev`. The changes are backward compatible and include comprehensive error handling and logging for easier troubleshooting.

## Key Benefits

1. **Improved Reliability**: Automatic directory creation and better error handling
2. **Better Debugging**: Comprehensive logging at every stage
3. **Enhanced Compatibility**: Support for multiple field names
4. **Stronger Validation**: File size and type checking
5. **Better User Experience**: Detailed error messages and progress tracking
6. **Real-time Updates**: Enhanced WebSocket broadcasts with rich data
