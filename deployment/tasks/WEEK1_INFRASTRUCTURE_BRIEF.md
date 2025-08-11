# Week 1: Infrastructure Agent Brief
**Timeline**: August 12-16, 2025  
**Priority**: CRITICAL  
**Dependencies**: None (Foundation layer)  

## Mission
Deploy the foundational infrastructure on Fly.io including PostgreSQL database cluster, Redis cache, and monitoring stack. This infrastructure will support all subsequent development.

## Specific Tasks

### 1. PostgreSQL Deployment (Day 1-2)
**Objective**: Deploy production-ready PostgreSQL with TimescaleDB extension

**Steps**:
```bash
# Create PostgreSQL cluster
flyctl postgres create \
  --name candlefish-db \
  --region sjc \
  --initial-cluster-size 1 \
  --vm-size shared-cpu-1x \
  --volume-size 10

# Attach to RTPM API app
flyctl postgres attach candlefish-db --app rtpm-api-candlefish

# Enable TimescaleDB extension
flyctl postgres connect -a candlefish-db
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

**Configuration Required**:
- Enable connection pooling (PgBouncer)
- Set max connections to 100
- Configure automated backups (daily)
- Set up read replica if needed

**Success Criteria**:
- Database accessible from RTPM API
- TimescaleDB extension active
- Backups configured
- Connection string available

### 2. Redis Cache Deployment (Day 2)
**Objective**: Deploy Redis for session management and caching

**Steps**:
```bash
# Create Redis instance
flyctl redis create \
  --name candlefish-cache \
  --region sjc \
  --no-replicas \
  --plan development

# Get connection details
flyctl redis status candlefish-cache
```

**Configuration Required**:
- Set maxmemory policy to allkeys-lru
- Enable persistence (AOF)
- Configure 1GB memory limit
- Set up connection pooling

**Success Criteria**:
- Redis accessible via private network
- Persistence enabled
- Memory limits configured
- Connection string available

### 3. Monitoring Stack (Day 3-4)
**Objective**: Set up Prometheus and Grafana for monitoring

**Create**: `/deployment/fly/monitoring/fly.toml`
```toml
app = "candlefish-monitoring"
primary_region = "sjc"

[build]
  image = "prom/prometheus:latest"

[env]
  PROMETHEUS_CONFIG = "/etc/prometheus/prometheus.yml"

[mounts]
  source = "prometheus_data"
  destination = "/prometheus"

[[services]]
  internal_port = 9090
  protocol = "tcp"
  
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
  
  [[services.ports]]
    port = 80
    handlers = ["http"]
```

**Metrics to Configure**:
- API response times
- Database query performance
- Redis cache hit rates
- Memory and CPU usage
- Request volume

**Success Criteria**:
- Prometheus collecting metrics
- Grafana dashboards created
- Alerts configured
- All services reporting

### 4. Authentication Service Setup (Day 4-5)
**Objective**: Create basic authentication service structure

**Create**: `/deployment/fly/auth-service/`
```
auth-service/
├── Dockerfile
├── fly.toml
├── requirements.txt
└── src/
    ├── main.py
    ├── auth/
    │   ├── jwt.py
    │   ├── models.py
    │   └── routes.py
    └── config.py
```

**Initial Endpoints**:
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- GET /auth/verify

**JWT Configuration**:
```python
# Generate secrets
import secrets
JWT_SECRET = secrets.token_urlsafe(32)
REFRESH_SECRET = secrets.token_urlsafe(32)

# Set in Fly.io
flyctl secrets set JWT_SECRET=$JWT_SECRET -a candlefish-auth
flyctl secrets set REFRESH_SECRET=$REFRESH_SECRET -a candlefish-auth
```

**Success Criteria**:
- Service deployed on Fly.io
- JWT tokens generating correctly
- Basic user registration working
- Token validation functioning

### 5. Networking Configuration (Day 5)
**Objective**: Set up private networking between services

**Configure**:
- Private IPv6 networking between services
- Service discovery via .internal domains
- Firewall rules for security
- Load balancer configuration

**Internal Domains**:
```
candlefish-db.internal:5432        # PostgreSQL
candlefish-cache.internal:6379      # Redis
candlefish-auth.internal:8000       # Auth Service
rtpm-api-candlefish.internal:8000   # RTPM API
```

**Success Criteria**:
- All services communicating privately
- No public database exposure
- Service discovery working
- Network security configured

## Environment Variables

### Required Secrets
```bash
# Database
flyctl secrets set DATABASE_URL="postgres://..." -a rtpm-api-candlefish

# Redis
flyctl secrets set REDIS_URL="redis://..." -a rtpm-api-candlefish

# JWT
flyctl secrets set JWT_SECRET="..." -a candlefish-auth
flyctl secrets set REFRESH_SECRET="..." -a candlefish-auth

# Monitoring
flyctl secrets set GRAFANA_PASSWORD="..." -a candlefish-monitoring
```

## Validation Checklist

### Day 1 Completion
- [ ] PostgreSQL cluster created
- [ ] Database accessible from RTPM API
- [ ] TimescaleDB extension enabled
- [ ] Connection pooling configured

### Day 2 Completion
- [ ] Redis instance created
- [ ] Cache accessible from services
- [ ] Persistence configured
- [ ] Memory policies set

### Day 3 Completion
- [ ] Prometheus deployed
- [ ] Metrics collection working
- [ ] Basic dashboards created
- [ ] Alert rules defined

### Day 4 Completion
- [ ] Auth service structure created
- [ ] JWT implementation complete
- [ ] Basic endpoints working
- [ ] Service deployed to Fly.io

### Day 5 Completion
- [ ] All services networked
- [ ] Security rules applied
- [ ] Service discovery tested
- [ ] Documentation updated

## Handoff Deliverables

### For Backend Agent
- PostgreSQL connection string
- Redis connection string
- Database is ready for schema migrations
- Auth service endpoint URLs

### For Frontend Agent
- API endpoints documented
- Authentication flow documented
- CORS configuration details

### For Testing Agent
- Monitoring dashboard access
- Performance baselines established
- Test database credentials

## Common Issues & Solutions

### PostgreSQL Connection Issues
```bash
# Check status
flyctl postgres list
flyctl status -a candlefish-db

# Restart if needed
flyctl apps restart candlefish-db

# Check logs
flyctl logs -a candlefish-db
```

### Redis Connection Issues
```bash
# Check status
flyctl redis status candlefish-cache

# Get connection string
flyctl redis connect candlefish-cache
```

### Monitoring Issues
```bash
# Check Prometheus targets
curl https://candlefish-monitoring.fly.dev/api/v1/targets

# Verify metrics
curl https://rtpm-api-candlefish.fly.dev/metrics
```

## Resources

### Documentation
- [Fly.io PostgreSQL](https://fly.io/docs/postgres/)
- [Fly.io Redis](https://fly.io/docs/reference/redis/)
- [Fly.io Private Networking](https://fly.io/docs/reference/private-networking/)
- [TimescaleDB Setup](https://docs.timescale.com/)

### Support
- Fly.io Community: https://community.fly.io
- PostgreSQL Issues: Check logs first
- Redis Issues: Verify memory limits
- Network Issues: Check firewall rules

## Success Metrics
- All infrastructure deployed by EOD Friday
- Zero critical issues in production
- All services accessible via private network
- Monitoring showing healthy metrics
- Authentication service operational

---

**Agent Handoff**: Complete all tasks and update `/deployment/handoffs/2025-08-16-infrastructure-handoff.md` with:
- Connection strings for all services
- Any configuration changes made
- Issues encountered and resolutions
- Performance baselines recorded
- Next steps for optimization
