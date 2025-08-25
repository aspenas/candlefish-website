# Photo Batch Capture API Documentation

## Overview

The Photo Batch Capture API provides comprehensive functionality for iPhone photo capture with automatic upload, real-time progress tracking, and organization by room. This system supports offline photo sync, automatic processing, and WebSocket notifications.

## Architecture

- **Database**: PostgreSQL with new tables for photo sessions, uploads, versions, metadata, and progress tracking
- **Storage**: Local file system with multiple resolutions (thumbnail: 150px, web: 800px, full: original)
- **Real-time**: WebSocket connections for live progress updates
- **Processing**: Automatic EXIF extraction, image compression, and thumbnail generation

## API Endpoints

### 1. Photo Session Management

#### Create Photo Session
```http
POST /api/v1/photos/sessions
Content-Type: application/json

{
  "room_id": "uuid", // Optional - specific room
  "name": "Living Room Photo Session",
  "description": "Capturing all furniture items"
}
```

**Response:**
```json
{
  "id": "session-uuid",
  "room_id": "room-uuid",
  "name": "Living Room Photo Session",
  "description": "Capturing all furniture items",
  "status": "active",
  "total_photos": 0,
  "uploaded_photos": 0,
  "processed_photos": 0,
  "created_at": "2024-08-24T10:00:00Z",
  "updated_at": "2024-08-24T10:00:00Z"
}
```

#### Get Photo Session
```http
GET /api/v1/photos/sessions/{session_id}
```

**Response:**
```json
{
  "id": "session-uuid",
  "name": "Living Room Photo Session",
  "status": "active",
  "room": {
    "id": "room-uuid",
    "name": "Living Room",
    "floor": "Main Floor"
  },
  "photos": [
    {
      "id": "photo-uuid",
      "filename": "unique-filename.jpg",
      "item_id": "item-uuid",
      "angle": "front",
      "uploaded_at": "2024-08-24T10:05:00Z",
      "processed_at": "2024-08-24T10:05:30Z"
    }
  ],
  "total_photos": 25,
  "uploaded_photos": 25,
  "processed_photos": 23
}
```

#### Update Photo Session
```http
PUT /api/v1/photos/sessions/{session_id}
Content-Type: application/json

{
  "name": "Updated Session Name", // Optional
  "description": "Updated description", // Optional
  "status": "completed" // Optional: active, paused, completed, cancelled
}
```

### 2. Photo Upload

#### Upload Photos for Item
```http
POST /api/v1/items/{item_id}/photos
Content-Type: multipart/form-data

session_id: "session-uuid" // Optional
angle: "front" // Optional: front, back, left, right, top, detail, contextual, overview
caption: "Front view of sofa" // Optional
is_primary: true // Optional
photos: [file1.jpg, file2.jpg, ...]
```

**Response:**
```json
{
  "results": [
    {
      "filename": "sofa-front.jpg",
      "success": true,
      "photo": {
        "id": "photo-uuid",
        "filename": "unique-filename.jpg",
        "original_name": "sofa-front.jpg",
        "angle": "front",
        "file_size": 2048576,
        "uploaded_at": "2024-08-24T10:05:00Z"
      }
    }
  ],
  "total": 1
}
```

#### Batch Upload Photos
```http
POST /api/v1/photos/batch/{session_id}
Content-Type: multipart/form-data

photos: [file1.jpg, file2.jpg, file3.jpg, ...]
item_ids[0]: "item-uuid-1" // Optional per photo
item_ids[1]: "item-uuid-2"
angles[0]: "front" // Optional per photo
angles[1]: "back"
captions[0]: "Front view" // Optional per photo
captions[1]: "Back view"
is_primary[0]: true // Optional per photo
is_primary[1]: false
```

**Response:**
```json
{
  "session_id": "session-uuid",
  "results": [
    {
      "filename": "IMG_001.jpg",
      "success": true,
      "photo": { /* photo object */ }
    },
    {
      "filename": "IMG_002.jpg",
      "success": false,
      "error": "Invalid file format"
    }
  ],
  "total": 2,
  "successful": 1,
  "failed": 1
}
```

### 3. Progress Tracking

#### Get Room Photo Progress
```http
GET /api/v1/rooms/progress
```

**Response:**
```json
{
  "progress": [
    {
      "room_id": "room-uuid",
      "room_name": "Living Room",
      "floor": "Main Floor",
      "items_total": 45,
      "items_with_photos": 32,
      "photos_total": 125,
      "completion_rate": 71.11,
      "last_photo_at": "2024-08-24T10:30:00Z"
    },
    {
      "room_id": "room-uuid-2",
      "room_name": "Kitchen",
      "floor": "Main Floor",
      "items_total": 28,
      "items_with_photos": 5,
      "photos_total": 12,
      "completion_rate": 17.86,
      "last_photo_at": "2024-08-24T09:15:00Z"
    }
  ],
  "total_rooms": 2
}
```

### 4. Photo Access

#### Serve Photo Files
```http
GET /api/v1/photos/{resolution}/{filename}
```

**Resolutions:**
- `thumbnail` - 150x150px (for grid views)
- `web` - 800px max width/height (for web display)
- `full` - Original size (for download/detailed view)

**Example:**
```http
GET /api/v1/photos/web/unique-filename.jpg
GET /api/v1/photos/thumbnail/unique-filename.jpg
```

## 5. WebSocket Real-time Updates

### Connection
```javascript
const socket = new WebSocket('ws://localhost:8080/ws/photos');
```

### Message Types

#### Photo Uploaded
```json
{
  "type": "photo_uploaded",
  "session_id": "session-uuid",
  "item_id": "item-uuid",
  "data": {
    "photo": {
      "id": "photo-uuid",
      "filename": "unique-filename.jpg",
      "uploaded_at": "2024-08-24T10:05:00Z"
    }
  },
  "timestamp": "2024-08-24T10:05:00Z"
}
```

#### Photo Processed
```json
{
  "type": "photo_processed",
  "data": {
    "photo_id": "photo-uuid",
    "processed_at": "2024-08-24T10:05:30Z"
  },
  "timestamp": "2024-08-24T10:05:30Z"
}
```

#### Session Updated
```json
{
  "type": "session_updated",
  "data": {
    "id": "session-uuid",
    "status": "completed",
    "uploaded_photos": 25,
    "processed_photos": 25
  },
  "timestamp": "2024-08-24T10:30:00Z"
}
```

#### Progress Updated
```json
{
  "type": "progress_updated",
  "room_id": "room-uuid",
  "data": {
    "completion_rate": 75.5,
    "items_with_photos": 34,
    "photos_total": 128
  },
  "timestamp": "2024-08-24T10:05:00Z"
}
```

## Database Schema

### New Tables

1. **photo_sessions** - Track batch capture sessions
2. **photo_uploads** - Individual photo uploads
3. **photo_versions** - Multiple resolutions per photo
4. **photo_metadata** - EXIF and capture details
5. **photo_progress** - Room-by-room progress tracking

### Enhanced Tables

- **item_images** - Added angle, capture_session_id, dimensions, processing info

## Room Structure

The system is pre-configured with rooms for 5470 S Highline Circle:

### Lower Level
- Rec Room, Wine Room, Theater, Exercise Room

### Main Floor  
- Foyer, Living Room, Dining Room, Kitchen, Grand Room, Hearth Room, Office

### Upper Floor
- Primary Bedroom, Primary Bathroom, Guest Bedroom, Kids Room

### Outdoor
- Deck, Patio, Garden, Pool Area, Driveway

### Garage
- Garage

## Usage Examples

### iPhone Photo Capture Workflow

1. **Start Session**
```bash
curl -X POST http://localhost:8080/api/v1/photos/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "living-room-uuid",
    "name": "Living Room Morning Session"
  }'
```

2. **Connect WebSocket** (for real-time updates)
```javascript
const ws = new WebSocket('ws://localhost:8080/ws/photos');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Photo update:', message);
};
```

3. **Batch Upload Photos**
```bash
curl -X POST http://localhost:8080/api/v1/photos/batch/session-uuid \
  -F "photos=@IMG_001.jpg" \
  -F "photos=@IMG_002.jpg" \
  -F "item_ids[0]=sofa-uuid" \
  -F "item_ids[1]=coffee-table-uuid" \
  -F "angles[0]=front" \
  -F "angles[1]=overview"
```

4. **Monitor Progress**
```bash
curl http://localhost:8080/api/v1/rooms/progress
```

5. **Complete Session**
```bash
curl -X PUT http://localhost:8080/api/v1/photos/sessions/session-uuid \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

## Features

### Auto-upload Support
- Queue management for offline photos
- Retry logic for failed uploads
- Batch processing optimization

### Image Processing
- Automatic thumbnail generation (150x150)
- Web-optimized versions (800px max)
- EXIF data extraction and storage
- Auto-orientation correction

### Session Management
- Pause and resume capabilities
- Progress persistence
- Session recovery after interruption

### Real-time Updates
- WebSocket notifications
- Live progress tracking
- Multi-device synchronization

### Quality Settings
- Configurable compression levels
- Multiple resolution support
- Bandwidth-optimized transfers

This API provides a complete photo batch capture solution optimized for iPhone usage with automatic organization by room and comprehensive progress tracking.
