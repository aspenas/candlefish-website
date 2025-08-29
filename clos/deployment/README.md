# CLOS Deployment Infrastructure

Complete containerized deployment solution for the Candlefish AI ecosystem.

## 🏗️ Architecture

```
candlefish-network (172.20.0.0/16)
├── Core Infrastructure (172.20.0.x)
│   ├── PostgreSQL (172.20.0.10:5432)
│   ├── Redis (172.20.0.11:6379)
│   ├── Caddy (172.20.0.12:80/443)
│   ├── RabbitMQ (172.20.0.13:5672)
│   ├── Consul (172.20.0.14:8500)
│   └── Jaeger (172.20.0.15:16686)
├── Security Dashboard (172.20.1.x)
│   ├── Frontend (172.20.1.10:3100)
│   ├── API (172.20.1.11:4100)
│   ├── Database (172.20.1.12:5433)
│   └── Redis (172.20.1.13:6380)
├── PKB (172.20.2.x)
│   ├── UI (172.20.2.10:8501)
│   ├── API (172.20.2.11:8787)
│   ├── Database (172.20.2.12:5434)
│   ├── Redis (172.20.2.13:6379)
│   ├── Elasticsearch (172.20.2.14:9201)
│   └── MinIO (172.20.2.15:9000)
├── Candlefish (172.20.3.x)
│   ├── Web (172.20.3.10:3000)
│   ├── API (172.20.3.11:4000)
│   ├── Database (172.20.3.12:5435)
│   └── Redis (172.20.3.13:6381)
└── Monitoring (172.20.4.x)
    ├── Prometheus (172.20.4.10:9090)
    ├── Grafana (172.20.4.11:3001)
    ├── AlertManager (172.20.4.12:9093)
    └── Loki (172.20.4.15:3100)
```

## 🚀 Quick Start

### 1. Deploy Core Infrastructure

```bash
# Start core services (PostgreSQL, Redis, Caddy, etc.)
./scripts/deploy.sh up core
```

### 2. Deploy Application Services

```bash
# Deploy Security Dashboard
./scripts/deploy.sh up security-dashboard

# Deploy PKB
./scripts/deploy.sh up pkb

# Deploy Candlefish main app
./scripts/deploy.sh up candlefish

# Deploy monitoring stack
./scripts/deploy.sh up monitoring

# Or deploy everything at once
./scripts/deploy.sh up all
```

### 3. Access Applications

- **Security Dashboard**: http://security.local (3100)
- **PKB**: http://pkb.local (8501)  
- **Candlefish**: http://candlefish.local (3000)
- **Grafana**: http://grafana.local (3001)
- **Prometheus**: http://prometheus.local (9090)

## 📁 File Structure

```
deployment/
├── docker-compose.base.yml          # Core infrastructure
├── services/                        # Service-specific compose files
│   ├── security-dashboard.yml
│   ├── pkb.yml
│   ├── candlefish.yml
│   └── monitoring.yml
├── caddy/
│   └── Caddyfile                    # Reverse proxy configuration
├── redis/                           # Redis configurations
│   ├── redis.conf
│   ├── security-dashboard.conf
│   ├── pkb.conf
│   └── candlefish.conf
└── health-checks/                   # Health monitoring scripts
    ├── check-all-services.sh
    ├── monitor-resources.sh
    └── network-connectivity.sh
```

## 🔧 Configuration

### Environment Variables

Create `/etc/default/clos` or copy from generated template:

```bash
# Core passwords
POSTGRES_PASSWORD=secure_password_here
REDIS_PASSWORD=secure_redis_password

# Service-specific passwords
SECURITY_DB_PASSWORD=security_db_password
PKB_DB_PASSWORD=pkb_db_password
CANDLEFISH_DB_PASSWORD=candlefish_db_password

# JWT secrets
JWT_SECRET=your_jwt_secret_here
PKB_JWT_SECRET=pkb_jwt_secret
CANDLEFISH_JWT_SECRET=candlefish_jwt_secret
```

### Service Configuration

Edit `.clos/config.yaml` for:
- Service enable/disable
- Resource limits
- Health check intervals
- Monitoring settings
- Security policies

## 🔍 Monitoring & Health Checks

### Health Monitoring

```bash
# Run comprehensive health checks
./scripts/deploy.sh health

# Monitor resources
./deployment/health-checks/monitor-resources.sh

# Check network connectivity
./deployment/health-checks/network-connectivity.sh
```

### Logs

```bash
# View all logs
./scripts/deploy.sh logs

# View specific service logs
./scripts/deploy.sh logs security-dashboard-api

# Follow logs in real-time
docker-compose -f deployment/docker-compose.base.yml logs -f
```

## 🛠️ Management Commands

```bash
# Service management
./scripts/deploy.sh up [group]           # Start services
./scripts/deploy.sh down [group]         # Stop services
./scripts/deploy.sh restart [group]      # Restart services
./scripts/deploy.sh status               # Show status

# Maintenance
./scripts/deploy.sh build [group]        # Build images
./scripts/deploy.sh pull [group]         # Pull latest images
./scripts/deploy.sh cleanup              # Clean unused resources

# System integration
./scripts/deploy.sh install              # Install systemd service
```

## 🔐 Security Features

- **Network Isolation**: Dedicated Docker network
- **Service Authentication**: Individual database users
- **Encrypted Communication**: TLS/SSL via Caddy
- **Rate Limiting**: Per-service rate limits
- **Health Monitoring**: Comprehensive health checks
- **Resource Limits**: Memory and CPU constraints
- **Security Headers**: HSTS, CSP, XSS protection

## 📈 Production Deployment

### 1. Install as System Service

```bash
# Install CLOS as systemd service
sudo ./scripts/deploy.sh install

# Service will auto-start on boot
sudo systemctl status clos
```

### 2. Configure Production Environment

```bash
# Edit production configuration
sudo vim /etc/default/clos

# Update CLOS configuration
vim .clos/config.yaml

# Set environment to production
export CLOS_ENVIRONMENT=production
```

### 3. Enable Monitoring

```bash
# Start monitoring stack
./scripts/deploy.sh up monitoring

# Access Grafana at http://grafana.local
# Default login: admin/[generated_password]
```

## 🔧 Shell Integration

Add to your `~/.zshrc`:

```bash
# CLOS shell integration
source /path/to/clos/scripts/shell-integration.sh

# Now you can use:
clos_status     # Show project status
cup core        # Start core services
cdown          # Stop all services
chealth        # Run health checks
```

## 🏥 Health Check Endpoints

| Service | Health Check URL |
|---------|------------------|
| Security Dashboard | http://localhost:3100/health |
| Security API | http://localhost:4100/health |
| PKB UI | http://localhost:8501/_stcore/health |
| PKB API | http://localhost:8787/health |
| Candlefish Web | http://localhost:3000/api/health |
| Candlefish API | http://localhost:4000/health |
| Grafana | http://localhost:3001/api/health |
| Prometheus | http://localhost:9090/-/healthy |

## 📊 Service Ports

| Service | Internal Port | External Port |
|---------|---------------|---------------|
| **Core Services** | | |
| PostgreSQL | 5432 | 5432 |
| Redis | 6379 | 6379 |
| Caddy | 80/443 | 80/443 |
| RabbitMQ | 5672/15672 | 5672/15672 |
| **Security Dashboard** | | |
| Frontend | 3100 | 3100 |
| API | 4100 | 4100 |
| Database | 5432 | 5433 |
| Redis | 6379 | 6380 |
| **PKB** | | |
| UI | 8501 | 8501 |
| API | 8787 | 8787 |
| Database | 5432 | 5434 |
| Elasticsearch | 9200 | 9201 |
| MinIO | 9000 | 9000 |
| **Candlefish** | | |
| Web | 3000 | 3000 |
| API | 4000 | 4000 |
| Database | 5432 | 5435 |
| Redis | 6379 | 6381 |
| **Monitoring** | | |
| Grafana | 3000 | 3001 |
| Prometheus | 9090 | 9090 |
| AlertManager | 9093 | 9093 |

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Check for port conflicts
   netstat -tulpn | grep :3000
   ```

2. **Docker network issues**
   ```bash
   # Recreate network
   docker network rm candlefish-network
   docker network create candlefish-network --driver bridge --subnet 172.20.0.0/16
   ```

3. **Service won't start**
   ```bash
   # Check logs
   ./scripts/deploy.sh logs [service_name]
   
   # Check Docker resources
   docker system df
   ./scripts/deploy.sh cleanup
   ```

4. **Health checks failing**
   ```bash
   # Run detailed health check
   ./deployment/health-checks/check-all-services.sh
   ```

### Log Locations

- Application logs: `/var/log/clos-*.log`
- Health check logs: `/var/log/clos-health.log`
- Resource metrics: `/var/log/clos-metrics.json`
- Network metrics: `/var/log/clos-network-metrics.json`

## 📞 Support

For deployment issues, check:
1. Service logs: `./scripts/deploy.sh logs [service]`
2. Health status: `./scripts/deploy.sh health`
3. Resource usage: `./deployment/health-checks/monitor-resources.sh`
4. Network connectivity: `./deployment/health-checks/network-connectivity.sh`