# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack inventory management system for 5470 S Highline Circle, featuring real-time collaboration, AI-powered valuation, and comprehensive inventory tracking. The system consists of a Go backend API and React frontend with PWA capabilities.

## Architecture

### Backend (Go/Fiber)
- **Framework**: Fiber v2 with WebSocket support
- **Database**: PostgreSQL (production) with SQLite fallback for local development
- **Caching**: Redis for session management and caching
- **Authentication**: JWT with refresh tokens, CSRF protection, rate limiting
- **File Storage**: Local filesystem with image optimization (thumbnails, web formats)
- **Key Handlers**:
  - `handlers/handlers.go`: Main handler with activity logging
  - `handlers/auth.go`: Authentication endpoints
  - `handlers/photos.go`: Photo upload and batch processing
  - `handlers/ai.go`: AI-powered features
  - `handlers/collaboration.go`: Real-time collaboration

### Frontend (React/Vite)
- **Build Tool**: Vite with PWA plugin
- **State Management**: Zustand + React Query
- **Routing**: React Router v6
- **UI Components**: Tailwind CSS + Headless UI
- **Key Features**:
  - Real-time WebSocket updates
  - Offline support with service workers
  - Photo capture and batch upload
  - Barcode/QR scanning
  - Mobile-responsive with gesture support

## Development Commands

### Backend
```bash
# Run backend locally (port 4050)
cd backend && go run main.go

# Run with specific database
DATABASE_URL="postgres://highline:highline123@localhost:5434/highline_inventory?sslmode=disable" go run main.go

# Run tests
cd backend && go test ./...

# Build for production
cd backend && go build -o main
```

### Frontend
```bash
# Development server (port 3000)
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Type checking
cd frontend && npm run type-check

# Linting
cd frontend && npm run lint
```

### Docker Services
```bash
# Start all services (PostgreSQL, Redis, n8n)
docker-compose up -d

# Stop services
docker-compose down

# Reset everything
docker-compose down -v
```

### Database Operations
```bash
# Import Excel data
python3 scripts/import-excel-data.py

# Run migrations
cd backend && ./migrate.sh

# Apply specific migration
cd backend && ./apply-migration.sh
```

## Environment Variables

### Backend (.env)
```
PORT=4050
DATABASE_URL=postgres://highline:highline123@localhost:5434/highline_inventory?sslmode=disable
REDIS_URL=redis://localhost:6379
JWT_SECRET=<generate-with-openssl>
JWT_REFRESH_SECRET=<generate-with-openssl>
CSRF_SECRET=<generate-with-openssl>
AWS_REGION=us-east-1
```

### Frontend (via Vite)
```
VITE_API_URL=http://localhost:4050/api/v1  # Development
VITE_API_URL=https://5470-inventory.fly.dev/api/v1  # Production
```

## Deployment

### Backend (Fly.io)
```bash
cd backend
fly deploy
fly secrets set JWT_SECRET=<value>
fly secrets set DATABASE_URL=<value>
```

### Frontend (Netlify)
```bash
cd frontend
npm run build
npx netlify deploy --prod --dir=dist
```

## API Structure

- Base URL: `/api/v1`
- Authentication: Bearer token in Authorization header
- Main endpoints:
  - `/auth/*` - Authentication (login, register, refresh, logout)
  - `/items` - Inventory CRUD operations
  - `/photos/*` - Photo upload and management
  - `/activities` - Activity logging and history
  - `/ws` - WebSocket connection for real-time updates
  - `/health` - Health check endpoint

## Testing Approach

### Backend
- Unit tests: `tests/unit/*_test.go`
- Integration tests: `tests/integration/*_test.go`
- Performance tests: `tests/performance/*_test.go`
- Test fixtures in `tests/fixtures/`
- Run single test: `go test -run TestName ./...`

### Frontend
- E2E tests: Puppeteer scripts in frontend root
- Component tests: Using Vitest (when configured)
- Manual testing scripts: `test-*.js` files

## Database Schema

Main tables:
- `items` - Inventory items with full details
- `users` - User accounts
- `activities` - Activity log for all actions
- `photos` - Photo metadata and paths
- `photo_batches` - Batch upload tracking
- `valuations` - Item valuations and market data

## Key Architectural Decisions

1. **Dual Database Support**: System works with PostgreSQL (production) or SQLite (development), with automatic fallback to mock data if no database is available

2. **Photo Processing Pipeline**: 
   - Original images stored in `uploads/full/`
   - Thumbnails generated in `uploads/thumbnails/`
   - Web-optimized versions in `uploads/web/`
   - Batch upload support with progress tracking

3. **Real-time Collaboration**:
   - WebSocket connections for live updates
   - Activity feed with user attribution
   - Optimistic UI updates with rollback on failure

4. **Security Layers**:
   - JWT authentication with refresh tokens
   - CSRF protection for state-changing operations
   - Rate limiting per user/IP
   - Token blacklisting for logout
   - Input validation and sanitization

5. **Performance Optimizations**:
   - Redis caching for frequently accessed data
   - Image lazy loading and virtualization
   - Code splitting and route-based chunks
   - Service worker for offline support

## Common Development Tasks

### Adding a New API Endpoint
1. Define handler method in `backend/handlers/`
2. Add route in `backend/main.go`
3. Update frontend API service in `frontend/src/services/api.ts`
4. Add TypeScript types in `frontend/src/types/index.ts`

### Running a Single Test
```bash
# Backend
go test -v -run TestSpecificFunction ./handlers

# Frontend E2E
node test-specific-feature.js
```

### Debugging Database Issues
```bash
# Check database connection
psql -h localhost -p 5434 -U highline -d highline_inventory

# View recent activities
SELECT * FROM activities ORDER BY created_at DESC LIMIT 10;

# Check photo uploads
SELECT * FROM photos ORDER BY uploaded_at DESC LIMIT 10;
```

## Mobile App Considerations

The system includes a React Native mobile app scaffold in the `mobile/` directory with:
- Shared API client with the web frontend
- Offline queue for syncing when reconnected
- Native camera integration for photo capture
- Location-based security features