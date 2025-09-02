# CLOS Integration for 5470 S Highline Circle Inventory System

## Overview

The inventory system has been fully integrated with CLOS (Candlefish Localhost Orchestration System) to ensure proper port management and avoid conflicts with other services in the Candlefish ecosystem.

## Port Allocations

CLOS has assigned the following ports from its managed ranges:

| Service | CLOS Port | Previous Port | Port Range | Group |
|---------|-----------|---------------|------------|-------|
| Frontend | **3050** | 3000 | 3000-3099 (Candlefish Frontend) | candlefish-frontend |
| API Backend | **4050** | 8080 | 4000-4999 (API Services) | api |
| Redis Cache | **6350** | - | Support Services | support |

## Quick Start

### Method 1: Using CLOS Integration Script (Recommended)

```bash
# Start with CLOS integration
./clos-integration.sh start

# Other commands
./clos-integration.sh status   # Check status
./clos-integration.sh stop     # Stop services
./clos-integration.sh restart  # Restart services
./clos-integration.sh health   # Health check
```

### Method 2: Using Docker with CLOS

```bash
# Start with Docker Compose
./clos-integration.sh docker

# Or directly via CLOS
cd /Users/patricksmith/candlefish-ai/clos
docker-compose -f deployment/services/highline-inventory.yml up -d
```

### Method 3: Using CLOS-Aware Start Script

```bash
# Start with CLOS ports
./start-inventory-clos.sh
```

## Configuration Files

### 1. CLOS Service Definition
**Location:** `/Users/patricksmith/candlefish-ai/clos/deployment/services/highline-inventory.yml`

This Docker Compose file defines all services with proper CLOS port allocations and network configuration.

### 2. Environment Configuration
**Location:** `/Users/patricksmith/candlefish-ai/5470_S_Highline_Circle/.env.clos`

Contains all CLOS-specific environment variables:
- Port assignments
- Service discovery URLs
- Health check configurations

### 3. Frontend Configuration
**Updated Files:**
- `frontend/vite.config.ts` - Uses CLOS port 3050
- `frontend/nginx.conf` - Configured for port 3050
- `frontend/Dockerfile` - Updated with CLOS ports

### 4. Backend Configuration
**Files:**
- `Dockerfile` - API configured for port 4050
- `.env.clos` - Backend environment settings

## Service Registration

Services are automatically registered with CLOS when started. You can verify registration:

```bash
# Check CLOS dashboard
open http://localhost:3500

# Or via API
curl http://localhost:3500/api/services | jq
```

## Access Points

### With CLOS Integration:
- **Frontend:** http://localhost:3050
- **API:** http://localhost:4050
- **Health Check:** http://localhost:4050/health
- **CLOS Dashboard:** http://localhost:3500

## Benefits of CLOS Integration

1. **No Port Conflicts:** Guaranteed unique ports across all Candlefish services
2. **Service Discovery:** Automatic registration and discovery
3. **Centralized Management:** Monitor all services from CLOS dashboard
4. **Health Monitoring:** Automatic health checks and status updates
5. **Docker Support:** Seamless Docker Compose integration
6. **Network Isolation:** Services run on isolated CLOS network (172.20.3.0/24)

## Troubleshooting

### Port Already in Use

If you see port conflict errors:

```bash
# Stop conflicting services
./clos-integration.sh stop

# Check what's using the ports
lsof -i :3050
lsof -i :4050

# Force stop if needed
kill -9 $(lsof -ti:3050)
kill -9 $(lsof -ti:4050)

# Restart with CLOS
./clos-integration.sh start
```

### CLOS Not Running

If CLOS dashboard is not accessible:

```bash
# Start CLOS
cd /Users/patricksmith/candlefish-ai/clos
./clos dashboard

# Or build if not exists
make build
./clos init
./clos dashboard
```

### Service Not Registering

If services don't appear in CLOS:

```bash
# Manual registration
./clos-integration.sh register

# Check status
./clos-integration.sh status
```

## Docker Commands

### Build Images

```bash
# Build frontend
cd frontend
docker build -t highline-inventory-frontend .

# Build backend
cd ..
docker build -t highline-inventory-api .
```

### Run with Docker Compose

```bash
cd /Users/patricksmith/candlefish-ai/clos
docker-compose -f deployment/services/highline-inventory.yml up -d

# View logs
docker-compose -f deployment/services/highline-inventory.yml logs -f

# Stop services
docker-compose -f deployment/services/highline-inventory.yml down
```

## Integration Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLOS Dashboard                        │
│                  (localhost:3500)                        │
└─────────────────┬───────────────────────────────────────┘
                  │ Service Registration & Monitoring
                  │
┌─────────────────┴───────────────────────────────────────┐
│                    CLOS Network                          │
│                  (172.20.3.0/24)                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐     ┌──────────────────┐        │
│  │  Frontend (3050) │────▶│   API (4050)     │        │
│  │  172.20.3.50     │     │  172.20.3.51     │        │
│  └──────────────────┘     └──────┬───────────┘        │
│                                   │                     │
│                           ┌───────▼───────────┐        │
│                           │  Redis (6350)     │        │
│                           │  172.20.3.52      │        │
│                           └───────────────────┘        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Development Workflow

1. **Start CLOS Dashboard:**
   ```bash
   cd /Users/patricksmith/candlefish-ai/clos
   ./clos dashboard
   ```

2. **Start Inventory System:**
   ```bash
   cd /Users/patricksmith/candlefish-ai/5470_S_Highline_Circle
   ./clos-integration.sh start
   ```

3. **Monitor Services:**
   - Open CLOS Dashboard: http://localhost:3500
   - View inventory frontend: http://localhost:3050
   - Test API: http://localhost:4050/health

4. **Stop Services:**
   ```bash
   ./clos-integration.sh stop
   ```

## Next Steps

1. **Production Deployment:**
   - Use Docker images with CLOS orchestration
   - Enable SSL/TLS termination via Caddy
   - Configure backup services

2. **Monitoring:**
   - Set up Prometheus metrics
   - Configure Grafana dashboards
   - Enable log aggregation

3. **Scaling:**
   - Add load balancing
   - Implement service mesh
   - Enable horizontal scaling

## Support

For issues with CLOS integration, check:
- CLOS logs: `/Users/patricksmith/candlefish-ai/clos/logs/`
- Service logs: `docker logs highline-inventory-[frontend|api|redis]`
- CLOS documentation: `/Users/patricksmith/candlefish-ai/clos/README.md`