#!/bin/bash

# Photo Batch Capture Migration Setup Script
# Run this script to set up the photo batch capture functionality

echo "🔧 Setting up photo batch capture functionality..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL and try again"
    exit 1
fi

echo "✅ Database URL configured"

# Create upload directories
echo "📁 Creating upload directories..."
mkdir -p uploads/thumbnails
mkdir -p uploads/web
mkdir -p uploads/full

# Set proper permissions
chmod 755 uploads
chmod 755 uploads/thumbnails
chmod 755 uploads/web
chmod 755 uploads/full

echo "✅ Upload directories created"

# Run the photo migration
echo "🗄️ Running photo batch capture migration..."
psql $DATABASE_URL -f migrations/002_add_photo_batch_tables.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

# Update Go dependencies
echo "📦 Updating Go dependencies..."
go mod tidy

if [ $? -eq 0 ]; then
    echo "✅ Dependencies updated"
else
    echo "❌ Failed to update dependencies"
    exit 1
fi

# Build the application
echo "🔨 Building application..."
go build -o main .

if [ $? -eq 0 ]; then
    echo "✅ Application built successfully"
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "🎉 Photo batch capture setup complete!"
echo ""
echo "📋 Summary of new functionality:"
echo "  • Photo session management"
echo "  • Batch photo upload"
echo "  • Real-time WebSocket updates"
echo "  • Automatic image processing (thumbnails, web, full)"
echo "  • EXIF data extraction"
echo "  • Room-by-room progress tracking"
echo "  • Multi-resolution photo serving"
echo ""
echo "📚 API Documentation: PHOTO_BATCH_API.md"
echo ""
echo "🚀 Start the server with: ./main"
echo "📡 WebSocket endpoint: ws://localhost:8080/ws/photos"
echo ""
echo "📱 iPhone photo capture workflow:"
echo "  1. Create session: POST /api/v1/photos/sessions"
echo "  2. Connect WebSocket for real-time updates"
echo "  3. Batch upload: POST /api/v1/photos/batch/{sessionId}"
echo "  4. Monitor progress: GET /api/v1/rooms/progress"
echo "  5. Complete session: PUT /api/v1/photos/sessions/{sessionId}"
echo ""
