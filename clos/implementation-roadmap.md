# CLOS v2.0 Implementation Roadmap

## Overview

This roadmap outlines the migration from the current CLOS v1.x to the comprehensive v2.0 microservices architecture. The migration will be done in phases to ensure zero-downtime and backward compatibility.

## Phase 1: Foundation (Weeks 1-2)

### Database Migration
- **Objective**: Upgrade existing SQLite schema to v2.0 with enhanced features
- **Duration**: 3 days
- **Risk**: Low (backward compatible)

#### Migration Steps
```bash
# 1. Backup current database
cp ~/.clos/registry.db ~/.clos/registry.db.backup.$(date +%Y%m%d)

# 2. Run migration script
./scripts/migrate-database-v2.sh

# 3. Verify migration
./clos config --verify-db
```

#### Migration Script (migrate-database-v2.sh)
```sql
-- Migration from v1.x to v2.0
PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- Check current version
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add new columns to existing services table
ALTER TABLE services ADD COLUMN container_id TEXT;
ALTER TABLE services ADD COLUMN image TEXT;
ALTER TABLE services ADD COLUMN restart_policy TEXT DEFAULT 'unless-stopped';
ALTER TABLE services ADD COLUMN cpu_limit REAL;
ALTER TABLE services ADD COLUMN memory_limit INTEGER;
ALTER TABLE services ADD COLUMN network_mode TEXT DEFAULT 'bridge';
ALTER TABLE services ADD COLUMN dns_servers TEXT;
ALTER TABLE services ADD COLUMN description TEXT;
ALTER TABLE services ADD COLUMN version TEXT;
ALTER TABLE services ADD COLUMN owner TEXT;
ALTER TABLE services ADD COLUMN health_check_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE services ADD COLUMN health_check_interval INTEGER DEFAULT 30;
ALTER TABLE services ADD COLUMN health_check_timeout INTEGER DEFAULT 10;
ALTER TABLE services ADD COLUMN health_check_retries INTEGER DEFAULT 3;
ALTER TABLE services ADD COLUMN health_check_start_period INTEGER DEFAULT 30;
ALTER TABLE services ADD COLUMN health_expected_status INTEGER DEFAULT 200;
ALTER TABLE services ADD COLUMN last_health_check DATETIME;
ALTER TABLE services ADD COLUMN health_status TEXT DEFAULT 'starting' 
    CHECK (health_status IN ('healthy', 'unhealthy', 'starting'));
ALTER TABLE services ADD COLUMN health_response_time REAL;

-- Create new tables (will be ignored if they exist)
-- ... (Include all CREATE TABLE statements from enhanced-database-schema.sql)

-- Update schema version
INSERT OR REPLACE INTO schema_version (version) VALUES (2000);

COMMIT;

PRAGMA foreign_keys = ON;
```

### Enhanced Configuration System
- **Objective**: Implement new configuration management with environment support
- **Duration**: 2 days

```go
// New configuration structure
type Config struct {
    Version     string          `yaml:"version"`
    Environment string          `yaml:"environment"` // dev, staging, prod
    Database    DatabaseConfig  `yaml:"database"`
    API         APIConfig       `yaml:"api"`
    Security    SecurityConfig  `yaml:"security"`
    Performance PerformanceConfig `yaml:"performance"`
    Monitoring  MonitoringConfig `yaml:"monitoring"`
}

type APIConfig struct {
    Host         string        `yaml:"host"`
    Port         int           `yaml:"port"`
    ReadTimeout  time.Duration `yaml:"read_timeout"`
    WriteTimeout time.Duration `yaml:"write_timeout"`
    CORS         CORSConfig    `yaml:"cors"`
}

type SecurityConfig struct {
    JWT          JWTConfig     `yaml:"jwt"`
    RateLimit    RateLimitConfig `yaml:"rate_limit"`
    TLS          TLSConfig     `yaml:"tls"`
    AuditLog     AuditConfig   `yaml:"audit_log"`
}
```

### Core API Service Development
- **Objective**: Build the main REST API service
- **Duration**: 5 days

```go
// Project structure
clos-api/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── api/
│   │   ├── handlers/
│   │   ├── middleware/
│   │   └── routes.go
│   ├── service/
│   │   ├── service_manager.go
│   │   ├── group_manager.go
│   │   └── port_manager.go
│   ├── repository/
│   │   ├── service_repo.go
│   │   └── metrics_repo.go
│   └── docker/
│       └── client.go
├── pkg/
│   ├── models/
│   ├── errors/
│   └── utils/
└── go.mod
```

#### Key Components Implementation Priority
1. **Service Management APIs** - Day 1-2
2. **Group Management APIs** - Day 3
3. **Port Management APIs** - Day 4
4. **Authentication & Authorization** - Day 5

## Phase 2: Monitoring & Real-time Features (Weeks 3-4)

### WebSocket Service
- **Objective**: Real-time updates for dashboard
- **Duration**: 4 days

```go
// WebSocket service architecture
type WSService struct {
    manager     *WSManager
    eventQueue  chan Event
    subscribers map[string]map[string]*WSClient // eventType -> clientID -> client
}

type Event struct {
    Type      string      `json:"type"`
    ServiceID string      `json:"service_id,omitempty"`
    GroupName string      `json:"group_name,omitempty"`
    Data      interface{} `json:"data"`
    Timestamp time.Time   `json:"timestamp"`
}

// Event types
const (
    EventServiceStatusChanged  = "service.status_changed"
    EventServiceMetricsUpdated = "service.metrics_updated"
    EventPortConflictDetected  = "port.conflict_detected"
    EventGroupOperationCompleted = "group.operation_completed"
    EventSystemResourceAlert   = "system.resource_alert"
)
```

### Monitoring Service
- **Objective**: System and container monitoring
- **Duration**: 4 days

```go
// Monitoring service components
type MonitoringService struct {
    docker          *client.Client
    metricsRepo     MetricsRepository
    alertManager    AlertManager
    collectors      []MetricCollector
    config          MonitoringConfig
}

type MetricCollector interface {
    Collect() ([]Metric, error)
    Name() string
    Interval() time.Duration
}

// Implementations
type DockerMetricsCollector struct{}
type SystemMetricsCollector struct{}
type ServiceHealthCollector struct{}
```

### Dashboard v2.0
- **Objective**: Enhanced React dashboard with real-time features
- **Duration**: 6 days

```typescript
// New dashboard architecture
interface DashboardState {
    services: Service[]
    groups: ServiceGroup[]
    metrics: SystemMetrics
    alerts: Alert[]
    operations: Operation[]
    wsConnected: boolean
}

// Real-time WebSocket integration
class WSClient {
    private ws: WebSocket | null = null
    private reconnectAttempts = 0
    private maxReconnectAttempts = 5
    
    connect(url: string): Promise<void>
    subscribe(eventTypes: string[]): void
    send(message: WSMessage): void
    onEvent(callback: (event: WSEvent) => void): void
}

// Enhanced components
- ServiceGrid with real-time updates
- Interactive system health dashboard  
- Live metrics charts (CPU, memory, network)
- Operation status tracking
- Alert management system
```

## Phase 3: Advanced Features (Weeks 5-6)

### Conflict Resolution Service
- **Objective**: Automated port conflict detection and resolution
- **Duration**: 4 days

```go
type ConflictResolver struct {
    detector    *PortDetector
    strategies  map[string]ResolutionStrategy
    registry    ServiceRegistry
    docker      DockerClient
}

type ResolutionStrategy interface {
    CanResolve(conflict PortConflict) bool
    Resolve(conflict PortConflict) (*ResolutionResult, error)
    RiskLevel() RiskLevel
}

// Resolution strategies
type AutoPortMigrationStrategy struct{}  // Migrate CLOS service to new port
type ProcessTerminationStrategy struct{} // Kill conflicting system process  
type UserPromptStrategy struct{}         // Ask user for decision
```

### Batch Operations & Orchestration
- **Objective**: Efficient group operations with dependency management
- **Duration**: 4 days

```go
type OrchestrationEngine struct {
    scheduler   TaskScheduler
    depGraph    DependencyGraph
    executor    OperationExecutor
    monitor     ProgressMonitor
}

type Operation struct {
    ID          string
    Type        OperationType
    ServiceID   string
    GroupName   string
    Status      OperationStatus
    Dependencies []string
    Progress    int
    Error       error
    StartTime   time.Time
    EndTime     *time.Time
}
```

### Performance Optimization
- **Objective**: Implement caching, connection pooling, and optimization
- **Duration**: 3 days

## Phase 4: Production Readiness (Weeks 7-8)

### Security Implementation
- **Objective**: Complete security features
- **Duration**: 5 days

1. **JWT Authentication** (Day 1)
2. **RBAC Authorization** (Day 2)
3. **Rate Limiting** (Day 3)
4. **Audit Logging** (Day 4)
5. **Security Testing** (Day 5)

### Production Deployment
- **Objective**: Docker containerization and deployment configs
- **Duration**: 4 days

```yaml
# docker-compose.clos-v2.yml
version: '3.8'

services:
  clos-api:
    build: 
      context: ./clos-api
      target: production
    ports:
      - "8081:8081"
    environment:
      - GIN_MODE=release
      - DATABASE_PATH=/data/registry.db
      - REDIS_URL=redis://clos-redis:6379
    volumes:
      - clos_data:/data
    depends_on:
      - clos-redis
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:8081/health"]

  clos-websocket:
    build: 
      context: ./clos-websocket
    ports:
      - "8082:8082"
    depends_on:
      - clos-api
      - clos-redis

  clos-monitor:
    build:
      context: ./clos-monitor
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - clos-api

  clos-dashboard:
    build:
      context: ./web-dashboard
      target: production
    ports:
      - "3500:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8081
      - NEXT_PUBLIC_WS_URL=ws://localhost:8082

  clos-redis:
    image: redis:7-alpine
    volumes:
      - clos_redis:/data
    command: redis-server --appendonly yes

volumes:
  clos_data:
  clos_redis:
```

### Testing & Quality Assurance
- **Objective**: Comprehensive testing suite
- **Duration**: 4 days

```go
// Test structure
tests/
├── unit/
│   ├── service_test.go
│   ├── repository_test.go
│   └── handlers_test.go
├── integration/
│   ├── api_test.go
│   ├── websocket_test.go
│   └── docker_test.go
├── e2e/
│   ├── scenarios/
│   └── test_runner.go
└── performance/
    ├── load_test.go
    └── benchmarks/
```

## Migration Strategy

### Zero-Downtime Migration Plan

#### Step 1: Parallel Deployment
```bash
# Deploy v2.0 alongside v1.x
docker-compose -f docker-compose.clos-v2.yml up -d

# Run both systems in parallel
# v1.x on existing ports
# v2.0 on new ports (8081, 8082, etc.)
```

#### Step 2: Data Migration
```bash
# Export data from v1.x
./clos-v1 export --format json > clos-v1-data.json

# Import into v2.0
./clos-v2 import --file clos-v1-data.json

# Verify data integrity
./clos-v2 verify --compare-with v1
```

#### Step 3: Traffic Switching
```bash
# Gradual traffic switching using reverse proxy
# Update proxy configuration to route to v2.0
# Monitor for 24 hours

# If successful, shutdown v1.x
docker-compose -f docker-compose.clos-v1.yml down
```

### Rollback Plan
```bash
# Emergency rollback procedure
# 1. Switch proxy back to v1.x
# 2. Export any new data from v2.0
# 3. Import critical changes back to v1.x
# 4. Investigate v2.0 issues
```

## Risk Assessment & Mitigation

### High Risk Items
1. **Database Migration** 
   - Risk: Data corruption
   - Mitigation: Complete backup, dry-run testing, rollback scripts

2. **Docker API Integration**
   - Risk: Breaking changes in Docker API
   - Mitigation: Version pinning, compatibility testing

3. **WebSocket Stability**
   - Risk: Connection drops, memory leaks
   - Mitigation: Connection pooling, proper cleanup, monitoring

### Medium Risk Items
1. **Performance Regression**
   - Mitigation: Comprehensive benchmarking, monitoring
   
2. **Security Vulnerabilities**
   - Mitigation: Security audit, penetration testing

3. **Configuration Complexity**
   - Mitigation: Configuration validation, documentation

## Success Criteria

### Performance Targets
- API response time: < 100ms (95th percentile)
- WebSocket message latency: < 50ms
- Database query time: < 10ms average
- Memory usage: < 512MB per service
- CPU usage: < 50% under normal load

### Functional Requirements
- ✅ All v1.x functionality preserved
- ✅ Real-time dashboard updates
- ✅ Automated conflict resolution
- ✅ Group orchestration with dependencies
- ✅ Comprehensive monitoring
- ✅ Security hardening
- ✅ Zero-downtime operations

### Quality Gates
- Unit test coverage: > 85%
- Integration test coverage: > 70%
- Security scan: 0 high-severity issues
- Performance benchmarks: Pass all targets
- Documentation: Complete API docs and user guide

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1 | 2 weeks | Enhanced database, core API service |
| Phase 2 | 2 weeks | WebSocket service, monitoring, dashboard v2.0 |
| Phase 3 | 2 weeks | Conflict resolution, batch operations |
| Phase 4 | 2 weeks | Security, production deployment, testing |
| **Total** | **8 weeks** | **Complete CLOS v2.0 system** |

## Resource Requirements

### Development Team
- 1 Senior Backend Developer (Go)
- 1 Frontend Developer (React/TypeScript)
- 1 DevOps Engineer (Docker, deployment)
- 0.5 QA Engineer (testing)

### Infrastructure
- Development environment: 4-core, 16GB RAM
- Testing environment: 2-core, 8GB RAM  
- Monitoring tools: Prometheus, Grafana
- CI/CD: GitHub Actions

## Post-Implementation

### Monitoring & Maintenance
- Daily health checks
- Weekly performance reviews
- Monthly security audits
- Quarterly dependency updates

### Future Enhancements (v2.1+)
- Kubernetes integration
- Service mesh support
- Multi-host orchestration
- AI-powered optimization
- Plugin system for extensibility

This roadmap provides a structured approach to implementing CLOS v2.0 with minimal risk and maximum value delivery.