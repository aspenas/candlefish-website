# Candlefish AI Database Deployment Guide
## PostgreSQL and Redis on Fly.io for Collaboration System

This guide provides complete deployment instructions for the Candlefish AI collaboration system database infrastructure on Fly.io.

## 📋 Prerequisites

### Required Tools
- [Fly CLI](https://fly.io/docs/getting-started/installing-flyctl/) installed and authenticated
- [PostgreSQL client](https://www.postgresql.org/download/) for testing connections
- [Redis CLI](https://redis.io/docs/getting-started/installation/) for testing connections
- OpenSSL for generating secrets

### System Requirements
- Initial scale: 10 concurrent users
- Expected growth: 100+ users within 6 months
- Integration with existing RTPM API, Paintbox, and Brand Portal

## 🗂️ File Structure

```
/Users/patricksmith/candlefish-ai/deployment/fly/
├── postgresql/
│   ├── fly.toml                    # PostgreSQL app configuration
│   ├── schema/
│   │   └── collaboration-schema.sql # Complete database schema
│   └── scripts/
│       └── init-db.sh              # Database initialization
├── redis/
│   ├── fly.toml                    # Redis app configuration
│   └── scripts/
│       └── init-redis.sh           # Redis configuration
├── secrets/
│   └── connection-config.sh        # Connection strings & secrets
└── monitoring/
    ├── backup-config.yml           # Backup configuration
    ├── monitoring-config.yml       # Monitoring setup
    └── setup-monitoring.sh         # Monitoring deployment
```

## 🚀 Deployment Steps

### Step 1: Configure Secrets and Connections

```bash
# Navigate to deployment directory
cd /Users/patricksmith/candlefish-ai/deployment/fly

# Run connection configuration (generates secrets)
./secrets/connection-config.sh
```

This script will:
- Generate secure passwords and secrets
- Configure Fly.io secrets for all applications
- Create backup files with connection strings
- Set up deployment scripts

### Step 2: Deploy PostgreSQL

```bash
# Deploy PostgreSQL with persistent storage
cd postgresql/

# Create the application
flyctl apps create candlefish-postgres --org personal

# Create persistent volume (10GB initial, expandable)
flyctl volumes create postgres_data --app candlefish-postgres --region sjc --size 10

# Deploy PostgreSQL
flyctl deploy

# Check deployment status
flyctl status --app candlefish-postgres
```

### Step 3: Deploy Redis

```bash
# Deploy Redis with persistent storage
cd ../redis/

# Create the application
flyctl apps create candlefish-redis --org personal

# Create persistent volume (2GB initial)
flyctl volumes create redis_data --app candlefish-redis --region sjc --size 2

# Deploy Redis
flyctl deploy

# Check deployment status
flyctl status --app candlefish-redis
```

### Step 4: Initialize Databases

```bash
# Initialize PostgreSQL schema and seed data
cd ../postgresql/
./scripts/init-db.sh

# Initialize Redis configuration
cd ../redis/
./scripts/init-redis.sh
```

### Step 5: Update RTPM API Configuration

The RTPM API needs to be updated with new database connection strings:

```bash
# Update RTPM API secrets (done automatically by connection-config.sh)
flyctl secrets list --app rtmp-api-candlefish

# Restart API to pick up new connections
flyctl apps restart rtmp-api-candlefish
```

## 🔗 Connection Details

### PostgreSQL Connection Information

| Setting | Value |
|---------|--------|
| **Host** | `candlefish-postgres.internal` |
| **Port** | `5432` |
| **Database** | `candlefish_collaboration` |
| **Username** | `candlefish` |
| **SSL Mode** | `require` |
| **Connection Pool** | 20 connections (recommended) |

**Connection String Format:**
```
postgresql://candlefish:{PASSWORD}@candlefish-postgres.internal:5432/candlefish_collaboration?sslmode=require
```

### Redis Connection Information

| Setting | Value |
|---------|--------|
| **Host** | `candlefish-redis.internal` |
| **Port** | `6379` |
| **Database** | `0` (sessions), `1` (cache), `2` (user data) |
| **Max Connections** | 50 (recommended) |
| **Connection Timeout** | 10 seconds |

**Connection String Format:**
```
redis://:{PASSWORD}@candlefish-redis.internal:6379/0
```

## 📊 Database Schema Overview

### Core Tables

| Table | Purpose | Key Features |
|--------|---------|-------------|
| `organizations` | Multi-tenant isolation | Row-level security |
| `users` | User management | Global user registry |
| `documents` | Document storage | CRDT state, search vector |
| `crdt_operations` | Operation log | Conflict resolution |
| `presence_sessions` | Real-time presence | Auto-cleanup |
| `comments` | Comment system | Threading, reactions |
| `document_versions` | Version control | Branching support |

### Integration Tables

| Table | Purpose | Integration |
|--------|---------|------------|
| `paintbox_integrations` | Paintbox sync | Bidirectional estimate sync |
| `brand_portal_integrations` | Brand Portal themes | Dynamic theming |
| `document_metrics` | Analytics | Performance tracking |

### Performance Features

- **Full-text search** using PostgreSQL tsvector
- **Multi-layer indexes** for query optimization
- **Row-level security** for multi-tenant isolation
- **Automated cleanup** procedures for old data
- **Connection pooling** via PgBouncer

## 🔧 Application Integration

### RTPM API Integration

The RTPM API will automatically connect to the databases using these environment variables:

```env
DATABASE_URL=postgresql://candlefish:{PASSWORD}@candlefish-postgres.internal:5432/candlefish_collaboration?sslmode=require
REDIS_URL=redis://:{PASSWORD}@candlefish-redis.internal:6379/0
```

### Python/FastAPI Integration

```python
# Database connection example
import asyncpg
import aioredis
from sqlalchemy.ext.asyncio import create_async_engine

# PostgreSQL connection
engine = create_async_engine(
    "postgresql+asyncpg://candlefish:{password}@candlefish-postgres.internal:5432/candlefish_collaboration",
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=3600
)

# Redis connection
redis = aioredis.from_url(
    "redis://:{password}@candlefish-redis.internal:6379/0",
    max_connections=50,
    socket_timeout=10,
    socket_connect_timeout=10,
    retry_on_timeout=True
)
```

### Node.js Integration

```javascript
// PostgreSQL connection with pg
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Redis connection with ioredis
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  connectTimeout: 10000,
  commandTimeout: 5000,
});
```

## 📈 Monitoring and Maintenance

### Health Checks

Built-in health check endpoints:

- **PostgreSQL**: `SELECT 1` query every 30 seconds
- **Redis**: `PING` command every 15 seconds
- **RTPM API**: `/health` endpoint integration

### Monitoring Setup

```bash
# Deploy monitoring stack (optional but recommended)
cd monitoring/
./setup-monitoring.sh

# Access monitoring dashboards
# Grafana: https://candlefish-grafana.fly.dev
# Prometheus: https://candlefish-prometheus.fly.dev
```

### Backup Configuration

Automated backups are configured for:

- **PostgreSQL**: Daily full backups, WAL archiving every 15 minutes
- **Redis**: Daily RDB snapshots, AOF backup every 6 hours
- **Retention**: 30 days for PostgreSQL, 7 days for Redis
- **Storage**: S3-compatible storage with encryption

### Maintenance Tasks

```bash
# Clean up old data (run weekly)
flyctl ssh console --app candlefish-postgres
psql -d candlefish_collaboration -c "SELECT cleanup_old_data();"

# Clean up Redis data (run daily)
flyctl ssh console --app candlefish-redis
redis-cli EVALSHA $(redis-cli HGET scripts:sha cleanup) 0

# Monitor performance
flyctl logs --app candlefish-postgres
flyctl logs --app candlefish-redis
```

## 🔒 Security Configuration

### Network Security
- Internal networking only (`.internal` domains)
- TLS encryption for all connections
- No public database access

### Authentication
- Strong passwords (32+ characters)
- JWT tokens for API authentication
- Row-level security for multi-tenant isolation

### Data Protection
- Encryption at rest (Fly.io volumes)
- Encryption in transit (TLS)
- Regular security updates
- Audit logging for all operations

## 📊 Performance Tuning

### PostgreSQL Optimization

Current configuration optimized for:
- 100 max connections
- 256MB shared buffers
- 512MB effective cache size
- Connection pooling via PgBouncer

### Redis Optimization

Configuration includes:
- 256MB max memory with LRU eviction
- AOF persistence with fsync every second
- Connection pooling with 50 max connections
- Optimized data structures for collaboration

## 🚨 Troubleshooting

### Common Issues

**Connection Refused**
```bash
# Check app status
flyctl status --app candlefish-postgres
flyctl status --app candlefish-redis

# Check logs
flyctl logs --app candlefish-postgres
flyctl logs --app candlefish-redis
```

**High Memory Usage**
```bash
# PostgreSQL memory check
flyctl ssh console --app candlefish-postgres
htop

# Redis memory check
flyctl ssh console --app candlefish-redis
redis-cli INFO MEMORY
```

**Slow Queries**
```bash
# PostgreSQL slow query analysis
flyctl ssh console --app candlefish-postgres
psql -d candlefish_collaboration -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Recovery Procedures

**Database Recovery**
1. Check backup integrity
2. Stop application traffic
3. Restore from backup
4. Verify data consistency
5. Resume traffic

**Redis Recovery**
1. Check RDB/AOF files
2. Stop Redis instance
3. Restore data files
4. Restart Redis
5. Verify cache warmth

## 📞 Support and Resources

### Documentation Links
- [Fly.io PostgreSQL](https://fly.io/docs/reference/postgres/)
- [Fly.io Redis](https://fly.io/docs/reference/redis/)
- [Collaboration System Architecture](../COLLABORATION_GRAPHQL_SYSTEM.md)

### Support Contacts
- **Primary**: admin@candlefish.ai
- **Operations**: ops@candlefish.ai
- **Development**: dev@candlefish.ai

### Monitoring Channels
- **Slack**: #candlefish-alerts
- **Email**: alerts@candlefish.ai
- **PagerDuty**: Critical alerts only

---

## ✅ Deployment Checklist

- [ ] Install required tools (flyctl, psql, redis-cli)
- [ ] Run connection configuration script
- [ ] Deploy PostgreSQL with persistent volume
- [ ] Deploy Redis with persistent volume  
- [ ] Initialize database schema and seed data
- [ ] Initialize Redis configuration
- [ ] Update RTPM API with new connection strings
- [ ] Test database connections
- [ ] Set up monitoring (optional)
- [ ] Configure automated backups
- [ ] Run performance tests
- [ ] Document connection details for team
- [ ] Set up alerting and notifications

**Estimated deployment time: 30-45 minutes**

For questions or issues, contact the development team or refer to the troubleshooting section above.
