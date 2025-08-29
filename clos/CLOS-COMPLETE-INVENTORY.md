# CLOS Complete Service Inventory

## System Overview
CLOS now tracks **33 services** across **19 running** and **14 stopped** containers, organized into 9 service groups.

## Port Allocations by Category

### ✅ Running Services (19)

#### Core Infrastructure (5)
- **5432** - PostgreSQL (clos-postgres)
- **6379** - Redis (clos-redis) 
- **80** - Caddy HTTP proxy
- **443** - Caddy HTTPS proxy
- **2019** - Caddy Admin API

#### Monitoring Stack (4)
- **9090** - Prometheus Main
- **9091** - Security Prometheus
- **9092** - Dashboard Prometheus (was missing!)
- **3001** - Grafana Monitoring
- **3003** - Security Grafana

#### Agent Services (5)
- **8087** - Agent Registry
- **8088** - Paintbox Agent
- **8089** - Crown Trophy Agent
- **8090** - Temporal Agent
- **8091** - Clark County Agent

#### Active Frontends (4)
- **3002** - PKB Frontend
- **3004** - Temporal UI
- **3500** - CLOS Dashboard
- **3333** - Agent Dashboard (planned)

#### Other Services (2)
- **7000** - Control Center
- **11434** - Ollama LLM

### 🛑 Stopped Services (14)

#### Application Stack
- **3000** - Candlefish Web
- **3100** - Security Dashboard
- **4000** - Candlefish API
- **4100** - Security API
- **4040** - Workflow API

#### PKB Services
- **8501** - PKB Streamlit
- **8787** - PKB API Service
- **4200** - PKB API

#### AI/ML Services
- **5000** - MLflow Tracking
- **5001** - MLflow Artifacts
- **7768** - Goose AI

#### Temporal Services
- **7233** - Temporal Frontend
- **8233** - Temporal Worker

## Service Groups

1. **Core** (5 services) - Infrastructure essentials
2. **Monitoring** (4 services) - Metrics and dashboards
3. **Agents** (6 services) - Deployment and automation agents
4. **Candlefish** (2 services) - Main application
5. **Security** (3 services) - Security dashboard stack
6. **PKB** (4 services) - Personal Knowledge Base
7. **Temporal** (3 services) - Workflow orchestration
8. **AI** (4 services) - Machine learning and LLMs
9. **Control** (1 service) - System control
10. **Workflow** (1 service) - Workflow API

## Key Discoveries

### Previously Unmapped Services
- **Port 9092** - Dashboard Prometheus (security-dashboard-prometheus)
- **Port 7000** - Control Center (AFS3 fileserver)
- **Port 11434** - Ollama local LLM
- **Port 3004** - Temporal UI
- **Port 3002** - PKB Frontend
- **Port 3001** - Grafana Monitoring

### Port Range Allocation Strategy
```
2000-2999: Infrastructure (Caddy, admin APIs)
3000-3999: Frontend applications
4000-4999: Backend APIs
5000-5999: AI/ML services
5432-5500: PostgreSQL instances
6379-6400: Redis instances
7000-7999: Control and management
8000-8999: Agent services
9000-9999: Monitoring and metrics
11000+: LLM services
```

## Local Domain Mappings
```
security.local      → 3100 (Security Dashboard)
pkb.local          → 8501 (PKB Streamlit)
candlefish.local   → 3000 (Candlefish Web)
grafana.local      → 3001 (Grafana)
prometheus.local   → 9090 (Prometheus)
dashboard.local    → 3500 (CLOS Dashboard)
temporal.local     → 3004 (Temporal UI)
agents.local       → 3333 (Agent Dashboard)
```

## Commands

### Check Status
```bash
/Users/patricksmith/candlefish-ai/clos/clos status
```

### Start Service Groups
```bash
# Security stack
docker-compose -f deployment/services/security-dashboard.yml up -d

# PKB services
docker-compose -f deployment/services/pkb.yml up -d

# Candlefish main
docker-compose -f deployment/services/candlefish.yml up -d

# Monitoring stack
docker-compose -f deployment/services/monitoring.yml up -d
```

### Access Points
- CLOS Dashboard: http://localhost:3500
- Monitoring Script: `/Users/patricksmith/candlefish-ai/clos/scripts/monitor-clos.sh`
- Registry Update: `/Users/patricksmith/candlefish-ai/clos/scripts/update-registry.sh`

## Health Check URLs
Services with health endpoints are monitored automatically:
- ✅ 19 services with health checks configured
- ❓ 3 services without health checks (PostgreSQL, Redis, Control Center)
- 🔴 11 services showing unhealthy (stopped services)

## Next Steps
1. Start stopped services as needed
2. Configure health checks for PostgreSQL and Redis
3. Create service dependency mappings
4. Implement automatic conflict resolution
5. Build API for dashboard integration

The CLOS system now has complete visibility into all localhost services, preventing port conflicts and enabling centralized management of the entire development environment.