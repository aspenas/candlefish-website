# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CLOS (Consciousness Localhost Orchestration System) is a comprehensive orchestration platform for managing microservices, Docker containers, and autonomous NANDA agents in a local development environment. The system consists of multiple TypeScript/Node.js services, a Go CLI tool, and a React-based web dashboard.

## Architecture

The CLOS ecosystem is built as a multi-service architecture:

- **API Server** (`api-server/`): Express.js backend with JWT authentication, WebSocket support, and PostgreSQL/Redis integration
- **Web Dashboard** (`web-dashboard/`): Next.js 14 frontend with real-time monitoring and service management
- **NANDA Orchestrator** (`nanda/`): Autonomous agent system for intelligent service management and decision-making
- **Go CLI** (`cmd/clos/`): Command-line interface for system control and monitoring

## Development Commands

### Starting the System

```bash
# Start all core services (run from project root)
cd clos

# Start database and cache (prerequisite)
docker-compose up -d postgres redis

# Start API server with authentication
cd api-server
PORT=3501 POSTGRES_HOST=localhost POSTGRES_USER=patricksmith POSTGRES_PASSWORD="" POSTGRES_DB=clos_db REDIS_HOST=localhost REDIS_PASSWORD="" JWT_SECRET=your-secret-key-change-this-in-production npx tsx server-auth.ts

# Start web dashboard
cd web-dashboard
PORT=3500 npm run dev

# Start NANDA orchestrator
cd nanda
POSTGRES_HOST=localhost POSTGRES_USER=patricksmith POSTGRES_PASSWORD="" POSTGRES_DB=clos_db REDIS_HOST=localhost npm run start:orchestrator
```

### Individual Service Commands

#### API Server (`api-server/`)
```bash
npm run dev          # Development mode with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Production mode
npm run lint         # Run ESLint
npm test            # Run Jest tests
```

#### Web Dashboard (`web-dashboard/`)
```bash
npm run dev          # Start Next.js dev server on port 3500
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run Next.js linting
npm run type-check   # TypeScript type checking
```

#### NANDA Orchestrator (`nanda/`)
```bash
npm run start        # Start orchestrator
npm run dev          # Development mode with watch
npm run start:all    # Start all NANDA agents in parallel
npm run start:orchestrator  # Port 5100
npm run start:discovery     # Port 5101
npm run start:optimizer     # Port 5102
npm run start:guardian      # Port 5103
npm run start:healer        # Port 5104
```

### Testing & Quality

```bash
# Run all tests across services
cd api-server && npm test
cd web-dashboard && npm run type-check
cd nanda && npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Lint all TypeScript files
npm run lint
```

## High-Level Architecture & Key Patterns

### Authentication Flow
The system uses JWT-based authentication with httpOnly cookies:
1. User logs in via `/api/auth/login` endpoint
2. Server validates credentials against PostgreSQL
3. Issues access token (15min) and refresh token (7days) 
4. Tokens stored as httpOnly cookies
5. Middleware validates tokens on protected routes
6. Frontend redirects to login on 401 responses

### NANDA Agent System
NANDA (Networked Autonomous Node for Distributed Architecture) agents make autonomous decisions:
- **Orchestrator**: Main decision-maker with 0.75 confidence threshold
- **Discovery**: Service registration and health monitoring
- **Optimizer**: Resource optimization and performance tuning
- **Guardian**: Security and access control
- **Healer**: Auto-recovery and self-healing

Agents communicate via PostgreSQL shared state and Redis pub/sub for real-time coordination.

### Service Registry Pattern
All services register themselves in PostgreSQL with:
- Service metadata (name, port, health URL)
- Runtime status (running, stopped, crashed)
- Health metrics (CPU, memory, response times)
- Dependencies and environment configuration

The registry enables service discovery, health monitoring, and dependency management.

### Real-Time Updates
WebSocket connections provide live updates:
- Service status changes
- Health metrics
- NANDA agent decisions
- System events and logs

Frontend uses Socket.IO client, backend uses Socket.IO server with Redis adapter for scaling.

### Database Schema
PostgreSQL database with key tables:
- `users`: Authentication and authorization
- `services`: Service registry and configuration
- `nanda_agents`: Agent state and capabilities
- `agent_decisions`: Audit log of autonomous decisions
- `health_metrics`: Time-series health data
- `system_logs`: Centralized logging

### Port Allocation Strategy
Organized port ranges prevent conflicts:
- 3000-3099: Frontend applications
- 3100-3199: Dashboard UIs
- 3200-3299: Specialized services (PKB)
- 3500-3599: CLOS web dashboard
- 4000-4999: API services
- 5000-5999: Core infrastructure
- 5100-5199: NANDA agents

## Environment Variables

### Required for All Services
```bash
POSTGRES_HOST=localhost
POSTGRES_USER=patricksmith  # or your PostgreSQL user
POSTGRES_PASSWORD=""         # empty for local dev
POSTGRES_DB=clos_db
REDIS_HOST=localhost
REDIS_PASSWORD=""            # empty for local dev
```

### API Server Specific
```bash
PORT=3501
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### NANDA Orchestrator Specific
```bash
NANDA_PORT=5100
AGENT_TYPE=orchestrator
AUTONOMOUS_MODE=true
DECISION_THRESHOLD=0.75
```

## Common Issues & Solutions

### PostgreSQL Connection Errors
If you see "role does not exist" errors:
```sql
-- Create the database and user
CREATE DATABASE clos_db;
CREATE USER patricksmith;
GRANT ALL PRIVILEGES ON DATABASE clos_db TO patricksmith;
```

### Missing Database Columns
Run the schema migrations:
```bash
psql -U patricksmith -d clos_db -f database/init/01-schema.sql
```

### Next.js Build Errors
Clear cache and rebuild:
```bash
cd web-dashboard
rm -rf .next node_modules/.cache
npm run build
```

### TypeScript Type Errors
If faker types cause issues, add to tsconfig.json:
```json
{
  "compilerOptions": {
    "types": []
  }
}
```

### Port Already in Use
Check and kill processes:
```bash
lsof -i :3500  # Check port usage
kill -9 <PID>  # Kill process
```

## Key Files to Understand

- `api-server/server-auth.ts`: Main API server with JWT authentication
- `api-server/auth/auth.routes.ts`: Authentication endpoints
- `api-server/auth/auth.middleware.ts`: JWT validation middleware
- `web-dashboard/middleware.ts`: Next.js route protection
- `web-dashboard/app/page.tsx`: Main dashboard component
- `web-dashboard/app/nanda/page.tsx`: NANDA monitoring UI
- `nanda/orchestrator.ts`: Core NANDA decision engine
- `nanda/agent-manifest.yaml`: NANDA agent configuration
- `database/init/01-schema.sql`: Complete database schema

## Project Philosophy

1. **Autonomous Operation**: NANDA agents make decisions without human intervention
2. **Self-Healing**: Services automatically recover from failures
3. **Observable**: Comprehensive monitoring and logging throughout
4. **Secure by Default**: JWT authentication, encrypted cookies, role-based access
5. **Developer Experience**: Hot reload, TypeScript, comprehensive error messages
6. **Microservices Ready**: Each component can scale independently