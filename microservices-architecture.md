# Microservices Architecture for Security Dashboard

## Service Architecture Overview

```mermaid
graph TB
    subgraph "API Gateway Layer"
        ALB[Application Load Balancer]
        Kong[Kong Gateway]
        RateLimit[Rate Limiter]
    end
    
    subgraph "Authentication Services"
        AuthService[Auth Service]
        JWTService[JWT Service]
        RBACService[RBAC Service]
    end
    
    subgraph "Core Security Services"
        EventAPI[Event Processing API]
        ThreatAPI[Threat Detection API] 
        IncidentAPI[Incident Response API]
        ComplianceAPI[Compliance API]
        AssetAPI[Asset Management API]
        VulnAPI[Vulnerability API]
    end
    
    subgraph "Processing Services"
        EventProcessor[Event Stream Processor]
        AlertEngine[Alert Engine]
        MLPreprocessor[ML Anomaly Preprocessor]
        NotificationService[Notification Service]
    end
    
    subgraph "Integration Services"
        SIEMConnector[SIEM Connector]
        SOARConnector[SOAR Connector]
        CloudScanner[Cloud Security Scanner]
        ReportGenerator[Report Generator]
    end
    
    subgraph "Data Layer"
        TimescaleDB[(TimescaleDB)]
        RedisCluster[(Redis Cluster)]
        S3[S3 Storage]
    end
    
    subgraph "Real-time Layer"
        WSGateway[WebSocket Gateway]
        EventBus[Event Bus/Message Broker]
    end
    
    subgraph "Monitoring"
        Prometheus[Prometheus]
        Grafana[Grafana]
        AlertManager[AlertManager]
    end

    ALB --> Kong
    Kong --> RateLimit
    Kong --> AuthService
    Kong --> EventAPI
    Kong --> ThreatAPI
    Kong --> IncidentAPI
    Kong --> ComplianceAPI
    Kong --> AssetAPI
    Kong --> VulnAPI
    
    AuthService --> JWTService
    AuthService --> RBACService
    
    EventAPI --> EventProcessor
    ThreatAPI --> AlertEngine
    EventProcessor --> MLPreprocessor
    AlertEngine --> NotificationService
    
    EventProcessor --> EventBus
    AlertEngine --> EventBus
    EventBus --> WSGateway
    EventBus --> SIEMConnector
    EventBus --> SOARConnector
    
    EventAPI --> TimescaleDB
    EventAPI --> RedisCluster
    ThreatAPI --> RedisCluster
    AssetAPI --> TimescaleDB
    
    CloudScanner --> VulnAPI
    ComplianceAPI --> ReportGenerator
    ReportGenerator --> S3
    
    EventProcessor --> Prometheus
    AlertEngine --> Prometheus
    Prometheus --> Grafana
    Prometheus --> AlertManager
```

## Service Definitions

### 1. API Gateway (Kong Gateway)
**Purpose**: Centralized API management, security, and traffic control
**Technologies**: Kong Gateway, Lua plugins
**Port**: 8000 (proxy), 8001 (admin)

**Features**:
- JWT authentication and validation
- Rate limiting (per user, per organization, per IP)
- Request/response transformation
- Security headers injection
- API versioning and routing
- Metrics collection

**Configuration**:
```yaml
# Kong services configuration
services:
  - name: security-dashboard-api
    url: http://event-api:4000
    plugins:
      - name: jwt
      - name: rate-limiting
        config:
          minute: 1000
          policy: redis
          redis_host: redis-cluster
      - name: cors
      - name: prometheus
```

### 2. Authentication Service
**Purpose**: User authentication, JWT management, session handling
**Technologies**: Node.js/Express, bcrypt, jsonwebtoken, redis
**Port**: 3001

**Features**:
- User login/logout with MFA support
- JWT token generation and refresh
- Session management
- Password hashing and validation
- Account lockout after failed attempts
- Role-based permissions

**API Endpoints**:
```typescript
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
POST /auth/change-password
POST /auth/setup-mfa
POST /auth/verify-mfa
```

**Database Schema**:
- Users table with password hashes
- Sessions table with JWT mapping
- MFA secrets table (encrypted)

### 3. Event Processing API
**Purpose**: High-throughput security event ingestion and processing
**Technologies**: Node.js/Fastify, Redis Streams, TimescaleDB
**Port**: 4000

**Features**:
- Bulk event ingestion (up to 1000 events per request)
- Event validation and normalization
- Real-time event streaming via Redis
- Event correlation and grouping
- Historical event querying
- Event resolution workflows

**Performance Optimizations**:
- Connection pooling for database
- Batch inserts for high throughput
- Asynchronous processing with worker queues
- Event deduplication using Redis
- Horizontal scaling with load balancer

**API Endpoints**:
```typescript
POST /v2/events          // Single event
POST /v2/events/bulk     // Bulk events (up to 1000)
GET  /v2/events          // Query events
GET  /v2/events/:id      // Get specific event
PATCH /v2/events/:id     // Update event (resolve, etc.)
GET  /v2/events/stats    // Event statistics
```

### 4. Threat Detection API
**Purpose**: Advanced threat analysis and alerting
**Technologies**: Python/FastAPI, scikit-learn, Redis, TimescaleDB
**Port**: 4001

**Features**:
- Rule-based threat detection
- Anomaly detection using statistical methods
- Pattern matching for known attack signatures
- Machine learning model preparation
- Alert generation and correlation
- False positive feedback learning

**ML Capabilities**:
- Behavioral analysis for user activity
- Network traffic anomaly detection
- Time-series analysis for patterns
- Feature extraction from events
- Model training data preparation

**API Endpoints**:
```python
POST /v2/threat-detection/analyze
GET  /v2/threat-detection/rules
POST /v2/threat-detection/rules
PUT  /v2/threat-detection/rules/:id
GET  /v2/threat-detection/models
POST /v2/threat-detection/train
```

### 5. Incident Response API
**Purpose**: Security incident lifecycle management
**Technologies**: Node.js/Express, PostgreSQL, Redis
**Port**: 4002

**Features**:
- Incident creation and tracking
- Workflow automation
- Assignment and escalation
- Communication templates
- SLA tracking and reporting
- Integration with external ticketing systems

**Workflow Engine**:
- Playbook execution
- Automated response actions
- Approval processes
- Timeline tracking
- Evidence collection

**API Endpoints**:
```typescript
GET  /v2/incidents
POST /v2/incidents
GET  /v2/incidents/:id
PATCH /v2/incidents/:id
POST /v2/incidents/:id/workflow
GET  /v2/incidents/:id/timeline
POST /v2/incidents/:id/evidence
```

### 6. Asset Management API
**Purpose**: Security asset inventory and monitoring
**Technologies**: Node.js/Express, PostgreSQL, Redis
**Port**: 4003

**Features**:
- Asset discovery and registration
- Security configuration tracking
- Vulnerability association
- Compliance mapping
- Health monitoring
- Security scoring

**Integration Points**:
- Cloud provider APIs (AWS, Azure, GCP)
- Kubernetes API for container assets
- Network scanning tools
- Configuration management systems

**API Endpoints**:
```typescript
GET  /v2/assets
POST /v2/assets
GET  /v2/assets/:id
PUT  /v2/assets/:id
GET  /v2/assets/:id/security-posture
GET  /v2/assets/:id/vulnerabilities
POST /v2/assets/:id/scan
```

### 7. Vulnerability Management API  
**Purpose**: Vulnerability tracking and remediation
**Technologies**: Python/FastAPI, PostgreSQL, external APIs
**Port**: 4004

**Features**:
- CVE database integration
- Vulnerability scanning coordination
- Risk assessment and scoring
- Remediation tracking
- Patch management integration
- Report generation

**External Integrations**:
- National Vulnerability Database (NVD)
- GitHub Security Advisory Database
- Snyk vulnerability database
- Commercial vulnerability scanners

**API Endpoints**:
```python
GET  /v2/vulnerabilities
POST /v2/vulnerabilities
GET  /v2/vulnerabilities/:id
PATCH /v2/vulnerabilities/:id
GET  /v2/vulnerabilities/stats
POST /v2/vulnerabilities/scan
```

### 8. Compliance Management API
**Purpose**: Compliance framework management and reporting
**Technologies**: Node.js/Express, PostgreSQL, PDF generation
**Port**: 4005

**Features**:
- Framework and control management
- Assessment workflow
- Evidence collection
- Automated compliance checking
- Report generation (PDF, CSV, JSON)
- Audit trail maintenance

**Supported Frameworks**:
- OWASP ASVS
- PCI-DSS
- SOC 2
- ISO 27001
- GDPR
- Custom frameworks

**API Endpoints**:
```typescript
GET  /v2/compliance/frameworks
GET  /v2/compliance/assessments
POST /v2/compliance/assessments
GET  /v2/compliance/reports/audit-trail
GET  /v2/compliance/reports/dashboard
POST /v2/compliance/reports/generate
```

### 9. Event Stream Processor
**Purpose**: Real-time event processing and correlation
**Technologies**: Node.js, Redis Streams, Bull Queue
**Port**: Internal service (no HTTP interface)

**Processing Pipeline**:
1. Event ingestion from Redis Stream
2. Event validation and enrichment
3. Correlation with existing events
4. ML feature extraction
5. Database persistence
6. Alert evaluation
7. Notification routing

**Worker Processes**:
- **Validation Worker**: Schema validation and sanitization
- **Enrichment Worker**: IP geolocation, asset lookup
- **Correlation Worker**: Event pattern matching
- **ML Worker**: Feature extraction for ML models
- **Persistence Worker**: Database writes with batching

### 10. Alert Engine
**Purpose**: Real-time alerting and notification
**Technologies**: Node.js, Redis, PostgreSQL, notification APIs
**Port**: Internal service

**Features**:
- Real-time rule evaluation
- Alert deduplication
- Escalation management
- Multi-channel notifications
- Alert suppression
- Performance analytics

**Notification Channels**:
- Email (SMTP, SendGrid, AWS SES)
- Slack webhooks
- Microsoft Teams
- SMS (Twilio)
- PagerDuty
- Custom webhooks

### 11. WebSocket Gateway
**Purpose**: Real-time dashboard updates and streaming
**Technologies**: Node.js, Socket.IO, Redis Pub/Sub
**Port**: 3002

**Features**:
- Real-time event streaming
- Dashboard metric updates
- User presence tracking
- Room-based subscriptions
- Authentication integration
- Connection scaling

**Subscription Topics**:
- Organization events
- Asset-specific events
- Alert notifications
- Incident updates
- System health status

### 12. SIEM/SOAR Connector
**Purpose**: External security tool integration
**Technologies**: Node.js, various APIs, message queues
**Port**: 4006

**Supported Integrations**:
- **SIEM**: Splunk, Elastic Security, QRadar, Sentinel
- **SOAR**: Phantom, IBM Resilient, Cortex XSOAR
- **Cloud Security**: AWS Security Hub, Azure Security Center
- **Vulnerability Scanners**: Tenable, Rapid7, Qualys

**Integration Patterns**:
- Event forwarding to SIEM
- Bi-directional synchronization
- Webhook-based real-time updates
- Scheduled bulk exports
- API polling for updates

## Docker Configuration

### 1. Docker Compose for Local Development
```yaml
version: '3.8'

services:
  # Database Services
  timescaledb:
    image: timescale/timescaledb:latest-pg15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: security_dashboard
      POSTGRES_USER: security_dashboard
      POSTGRES_PASSWORD: dev_password
    volumes:
      - timescaledb_data:/var/lib/postgresql/data
      - ./security-dashboard-enhanced-schema.sql:/docker-entrypoint-initdb.d/01-schema.sql

  redis-cluster:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf

  # API Gateway
  kong:
    image: kong:3.4
    ports:
      - "8000:8000"
      - "8001:8001"
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /kong/declarative/kong.yml
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
      KONG_ADMIN_LISTEN: "0.0.0.0:8001"
      KONG_PLUGINS: "bundled,jwt,rate-limiting,cors,prometheus"
    volumes:
      - ./kong.yml:/kong/declarative/kong.yml
    depends_on:
      - auth-service
      - event-api

  # Core Services
  auth-service:
    build:
      context: ./services/auth-service
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://security_dashboard:dev_password@timescaledb:5432/security_dashboard
      REDIS_URL: redis://redis-cluster:6379
      JWT_SECRET: development_jwt_secret
      JWT_EXPIRE: 8h
      REFRESH_TOKEN_EXPIRE: 7d
    depends_on:
      - timescaledb
      - redis-cluster

  event-api:
    build:
      context: ./services/event-api
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://security_dashboard:dev_password@timescaledb:5432/security_dashboard
      REDIS_URL: redis://redis-cluster:6379
      EVENT_STREAM_NAME: events:stream
      BATCH_SIZE: 1000
      RATE_LIMIT_PER_MINUTE: 5000
    depends_on:
      - timescaledb
      - redis-cluster
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  threat-detection-api:
    build:
      context: ./services/threat-detection-api
      dockerfile: Dockerfile
    ports:
      - "4001:4001"
    environment:
      DATABASE_URL: postgresql://security_dashboard:dev_password@timescaledb:5432/security_dashboard
      REDIS_URL: redis://redis-cluster:6379
      ML_MODEL_PATH: /app/models
      THREAT_DETECTION_SENSITIVITY: 0.8
    volumes:
      - ml_models:/app/models
    depends_on:
      - timescaledb
      - redis-cluster

  incident-api:
    build:
      context: ./services/incident-api
      dockerfile: Dockerfile
    ports:
      - "4002:4002"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://security_dashboard:dev_password@timescaledb:5432/security_dashboard
      REDIS_URL: redis://redis-cluster:6379
      NOTIFICATION_SERVICE_URL: http://notification-service:4008
    depends_on:
      - timescaledb
      - redis-cluster

  asset-api:
    build:
      context: ./services/asset-api
      dockerfile: Dockerfile
    ports:
      - "4003:4003"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://security_dashboard:dev_password@timescaledb:5432/security_dashboard
      REDIS_URL: redis://redis-cluster:6379
      CLOUD_SCANNER_ENABLED: true
    depends_on:
      - timescaledb
      - redis-cluster

  vulnerability-api:
    build:
      context: ./services/vulnerability-api
      dockerfile: Dockerfile
    ports:
      - "4004:4004"
    environment:
      DATABASE_URL: postgresql://security_dashboard:dev_password@timescaledb:5432/security_dashboard
      REDIS_URL: redis://redis-cluster:6379
      NVD_API_KEY: ${NVD_API_KEY}
      GITHUB_TOKEN: ${GITHUB_TOKEN}
    depends_on:
      - timescaledb
      - redis-cluster

  compliance-api:
    build:
      context: ./services/compliance-api
      dockerfile: Dockerfile
    ports:
      - "4005:4005"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://security_dashboard:dev_password@timescaledb:5432/security_dashboard
      S3_BUCKET: security-dashboard-reports
      REPORT_RETENTION_DAYS: 365
    depends_on:
      - timescaledb

  # Processing Services
  event-processor:
    build:
      context: ./services/event-processor
      dockerfile: Dockerfile
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://security_dashboard:dev_password@timescaledb:5432/security_dashboard
      REDIS_URL: redis://redis-cluster:6379
      WORKER_CONCURRENCY: 10
      BATCH_SIZE: 100
    depends_on:
      - timescaledb
      - redis-cluster
    deploy:
      replicas: 3

  alert-engine:
    build:
      context: ./services/alert-engine
      dockerfile: Dockerfile
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://security_dashboard:dev_password@timescaledb:5432/security_dashboard
      REDIS_URL: redis://redis-cluster:6379
      NOTIFICATION_SERVICE_URL: http://notification-service:4008
    depends_on:
      - timescaledb
      - redis-cluster
    deploy:
      replicas: 2

  notification-service:
    build:
      context: ./services/notification-service
      dockerfile: Dockerfile
    ports:
      - "4008:4008"
    environment:
      NODE_ENV: development
      REDIS_URL: redis://redis-cluster:6379
      SMTP_HOST: ${SMTP_HOST}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      SLACK_WEBHOOK_URL: ${SLACK_WEBHOOK_URL}
      PAGERDUTY_API_KEY: ${PAGERDUTY_API_KEY}
    depends_on:
      - redis-cluster

  websocket-gateway:
    build:
      context: ./services/websocket-gateway
      dockerfile: Dockerfile
    ports:
      - "3002:3002"
    environment:
      NODE_ENV: development
      REDIS_URL: redis://redis-cluster:6379
      AUTH_SERVICE_URL: http://auth-service:3001
    depends_on:
      - redis-cluster
      - auth-service

  # Integration Services
  siem-connector:
    build:
      context: ./services/siem-connector
      dockerfile: Dockerfile
    ports:
      - "4006:4006"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://security_dashboard:dev_password@timescaledb:5432/security_dashboard
      REDIS_URL: redis://redis-cluster:6379
    depends_on:
      - timescaledb
      - redis-cluster

  # Monitoring Services
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/var/lib/grafana/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources

  # Redis Monitoring
  redis-insight:
    image: redislabs/redisinsight:latest
    ports:
      - "8001:8001"
    volumes:
      - redis_insight_data:/db

volumes:
  timescaledb_data:
  redis_data:
  prometheus_data:
  grafana_data:
  redis_insight_data:
  ml_models:

networks:
  default:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### 2. Production Docker Images

#### Base Image (Dockerfile.base)
```dockerfile
FROM node:18-alpine AS base

# Install security updates and basic tools
RUN apk update && apk upgrade && \
    apk add --no-cache curl jq && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-4000}/health || exit 1

# Default command
CMD ["npm", "start"]
```

#### Event API Service (services/event-api/Dockerfile)
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start application
CMD ["npm", "start"]
```

## Service Communication Patterns

### 1. Synchronous Communication (REST APIs)
- API Gateway routes requests to appropriate services
- Service-to-service calls for real-time data
- Circuit breaker pattern for resilience
- Timeout and retry policies

### 2. Asynchronous Communication (Message Queues)
- Redis Streams for event processing
- Pub/Sub for real-time notifications
- Dead letter queues for failed messages
- Message deduplication and ordering

### 3. Database Per Service Pattern
- Each service owns its data
- No direct database access between services
- Event-driven data synchronization
- CQRS for read/write optimization

## Security Measures

### 1. Container Security
- Non-root users in all containers
- Read-only root filesystems
- Security scanning with Trivy
- Regular base image updates
- Resource limits and quotas

### 2. Network Security
- Service mesh with mutual TLS
- Network policies for pod isolation
- API Gateway with JWT validation
- Rate limiting and DDoS protection

### 3. Secrets Management
- External secrets operator
- AWS Secrets Manager integration
- Encrypted environment variables
- Secret rotation policies

## Monitoring and Observability

### 1. Metrics Collection
- Prometheus metrics from all services
- Business metrics and technical metrics
- Custom dashboards in Grafana
- Alerting rules for SLA violations

### 2. Distributed Tracing
- OpenTelemetry instrumentation
- Jaeger for trace visualization
- Request flow analysis
- Performance bottleneck identification

### 3. Logging
- Structured logging with correlation IDs
- Centralized log aggregation with ELK
- Log-based metrics and alerting
- Audit trail for compliance

This microservices architecture provides a scalable, secure, and maintainable foundation for the security dashboard while maintaining compatibility with the current local deployment setup.