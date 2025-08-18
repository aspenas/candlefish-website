# Dependency Management and Background Services Guide

## Overview

This guide provides comprehensive documentation for the Paintbox application's dependency management system and background services. The system is designed for zero-downtime operations, automatic recovery, and proactive monitoring.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Dependency Management](#dependency-management)
3. [Background Services](#background-services)
4. [Monitoring and Alerting](#monitoring-and-alerting)
5. [Development Environment](#development-environment)
6. [Production Deployment](#production-deployment)
7. [Maintenance Procedures](#maintenance-procedures)
8. [Troubleshooting](#troubleshooting)

## Architecture Overview

The Paintbox application uses a multi-layered approach to dependency management and service orchestration:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │    Staging      │    │   Production    │
│                 │    │                 │    │                 │
│ Docker Compose  │    │   PM2 + Docker  │    │ SystemD + PM2   │
│ Hot Reload      │    │ Auto-restart    │    │ Zero Downtime   │
│ Debug Tools     │    │ Health Checks   │    │ HA + Monitoring │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

- **Dependency Health Checker**: Monitors npm packages for vulnerabilities and outdated versions
- **Service Monitor**: Tracks application and infrastructure service health
- **Alert System**: Multi-channel notification system for critical issues
- **Auto-restart System**: PM2 and SystemD integration for service recovery
- **Background Workers**: Queue processing and maintenance tasks

## Dependency Management

### Automated Dependency Updates

The system uses multiple layers for dependency management:

#### 1. Dependabot Configuration

**File**: `.github/dependabot.yml`

Dependabot automatically creates pull requests for:
- **Daily** updates for main dependencies
- **Weekly** updates for subprojects
- **Security** patches immediately

```yaml
# Example configuration
- package-ecosystem: "npm"
  directory: "/"
  schedule:
    interval: "daily"
    time: "04:00"
  open-pull-requests-limit: 10
```

#### 2. Pre-commit Hooks

**File**: `.husky/pre-commit`

Pre-commit hooks automatically:
- Run `npm audit` for security vulnerabilities
- Check license compliance
- Validate package.json structure
- Generate dependency reports

**Usage**:
```bash
# Hooks run automatically on git commit
git add .
git commit -m "feat: add new feature"

# Manual execution
npm run precommit
```

#### 3. Dependency Health Monitoring

**File**: `scripts/dependency-health-check.sh`

Comprehensive health checking script that:
- Analyzes security vulnerabilities
- Checks for outdated packages
- Validates license compliance
- Calculates dependency health score
- Generates detailed reports

**Usage**:
```bash
# Run health check
./scripts/dependency-health-check.sh check

# View latest report
./scripts/dependency-health-check.sh report

# Cleanup old reports
./scripts/dependency-health-check.sh cleanup
```

**Health Score Calculation**:
- **100**: Perfect health, no issues
- **80-99**: Good health, minor issues
- **60-79**: Moderate health, action recommended
- **40-59**: Poor health, immediate action required
- **0-39**: Critical health, emergency action needed

### Security Scanning

#### GitHub Actions Workflow

**File**: `.github/workflows/dependency-security.yml`

Automated security scanning:
- **Daily** vulnerability scans
- **Auto-fix** for non-breaking vulnerabilities
- **License compliance** verification
- **Dependency graph** updates

#### Manual Security Commands

```bash
# Run security audit
npm audit --audit-level=moderate

# Auto-fix vulnerabilities
npm audit fix

# Check licenses
npm run deps:licenses

# Security-focused test run
npm run test:security
```

### Package Management Best Practices

1. **Lock File Management**:
   - Always commit `package-lock.json`
   - Use `npm ci` in production
   - Regularly update lock files

2. **Version Pinning**:
   - Pin critical dependencies to specific versions
   - Use `~` for patch updates
   - Use `^` for minor updates
   - Avoid using `*` or `latest`

3. **Dependency Categorization**:
   - Production dependencies in `dependencies`
   - Development tools in `devDependencies`
   - Optional dependencies properly marked

## Background Services

### Service Architecture

The application runs multiple background services for different environments:

#### Development Environment

**File**: `docker-compose.development.yml`

Services:
- **paintbox-frontend**: Main Next.js application with hot reload
- **paintbox-websocket**: WebSocket server for real-time features
- **paintbox-worker**: Background job processor
- **postgres**: PostgreSQL database with development optimizations
- **redis**: Redis cache with persistence
- **prometheus**: Metrics collection
- **grafana**: Monitoring dashboards
- **dependency-checker**: Automated dependency monitoring

#### Production Environment

**Files**: `systemd/*.service`

Services managed by SystemD:
- **paintbox-app.service**: Main application via PM2
- **paintbox-redis.service**: Redis server
- **paintbox-postgres.service**: PostgreSQL database
- **paintbox-health-monitor.service**: Health monitoring
- **paintbox-dependency-checker.timer**: Scheduled dependency checks
- **paintbox-log-rotator.timer**: Log rotation

### Process Management

#### PM2 Configuration

**File**: `ecosystem.config.js`

PM2 manages application processes with:
- **Cluster mode** for production scaling
- **Auto-restart** on failure
- **Memory limits** and monitoring
- **Log management** and rotation
- **Health checks** and graceful shutdowns

**Key PM2 Commands**:
```bash
# Start all services
pm2 start ecosystem.config.js --env production

# Monitor services
pm2 monit

# View logs
pm2 logs

# Restart services
pm2 restart all

# Graceful reload
pm2 reload all
```

#### SystemD Integration

**Installation**:
```bash
# Install all SystemD services
sudo ./scripts/install-systemd-services.sh install

# Check service status
sudo systemctl status paintbox.target

# Start services
sudo systemctl start paintbox.target

# Enable auto-start
sudo systemctl enable paintbox.target
```

### Service Dependencies

Services are configured with proper dependency ordering:

```
paintbox-postgres.service
         ↓
paintbox-redis.service
         ↓
paintbox-app.service
         ↓
paintbox-health-monitor.service
```

### Auto-restart Configuration

#### Memory-based Restarts

Services automatically restart based on:
- **Memory usage** exceeding limits
- **CPU usage** patterns
- **Health check** failures
- **Crash detection**

#### Restart Policies

```javascript
// PM2 restart configuration
{
  max_memory_restart: '2G',
  min_uptime: '10s',
  max_restarts: 10,
  restart_delay: 4000
}
```

## Monitoring and Alerting

### Health Check Endpoints

#### Application Health

**Endpoint**: `GET /api/health`

Returns comprehensive health status:
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "checks": {
    "database": { "status": "healthy", "responseTime": 15 },
    "redis": { "status": "healthy", "responseTime": 3 },
    "secrets": { "status": "healthy", "responseTime": 45 }
  }
}
```

#### System Status

**Endpoint**: `GET /api/status`

Returns detailed system metrics:
```json
{
  "metrics": {
    "memory": { "usagePercentage": 65.2 },
    "cpu": { "usage": 12.5 },
    "disk": { "usagePercentage": 45.8 }
  },
  "services": [
    { "name": "paintbox-app", "status": "running" }
  ]
}
```

### Alert System

**File**: `lib/services/alert-service.ts`

Multi-channel alerting with:
- **Slack** integration for team notifications
- **Email** alerts for critical issues
- **PagerDuty** integration for on-call
- **Custom webhooks** for integrations

#### Alert Channels

1. **Slack Integration**:
   ```bash
   export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
   ```

2. **Email Alerts**:
   ```bash
   export ALERT_EMAIL_TO="ops@yourcompany.com"
   export SMTP_HOST="smtp.gmail.com"
   ```

3. **PagerDuty**:
   ```bash
   export PAGERDUTY_INTEGRATION_KEY="your-key"
   ```

#### Alert Rules

Configured rules for automatic alerting:
- **Service Down**: 3 consecutive health check failures
- **Critical Vulnerabilities**: Any critical security issues
- **High Memory**: Memory usage > 90%
- **Poor Dependency Health**: Health score < 70

### Monitoring Scripts

**File**: `scripts/health-monitor.js`

Continuous monitoring with:
- **Service health checks** every 10-30 seconds
- **Automatic alerting** on failures
- **Service restart** attempts
- **Detailed logging** and reporting

**Usage**:
```bash
# Start health monitor
node scripts/health-monitor.js

# Check with PM2
pm2 start ecosystem.config.js
```

### Log Management

**File**: `scripts/log-rotator.js`

Automated log management:
- **Daily rotation** of log files
- **Compression** of old logs
- **Cleanup** based on retention policy
- **Disk usage** monitoring

**Configuration**:
- **Retention**: 30 days default
- **Compression**: After 1 day
- **Max Size**: 100MB per file

## Development Environment

### Quick Start

1. **Setup Development Environment**:
   ```bash
   # Install dependencies
   npm install
   
   # Setup git hooks
   ./scripts/setup-git-hooks.sh
   
   # Start development services
   docker-compose -f docker-compose.development.yml up -d
   ```

2. **Development Tools**:
   ```bash
   # Access dev tools container
   docker-compose exec dev-tools bash
   
   # View logs
   log-viewer app
   
   # Check dependencies
   check-deps
   
   # Connect to database
   db-connect
   ```

### Development Features

- **Hot Reload**: Automatic code reloading
- **Debug Ports**: Node.js debugging enabled
- **Dev Tools Container**: Preconfigured development utilities
- **Log Aggregation**: Centralized logging with Fluent Bit
- **Performance Monitoring**: Integrated metrics collection

### Available Commands

```bash
# Development
npm run dev              # Start development server
npm run dev:websocket    # Start WebSocket server
npm run dev:worker       # Start background worker

# Testing
npm run test            # Run test suite
npm run test:watch      # Watch mode testing
npm run test:coverage   # Coverage report

# Dependency Management
npm run deps:check      # Check dependency health
npm run deps:audit      # Security audit
npm run deps:outdated   # Check for updates
npm run deps:licenses   # License compliance

# Quality
npm run lint           # ESLint checking
npm run type-check     # TypeScript validation
npm run build          # Production build
```

## Production Deployment

### Prerequisites

1. **System Requirements**:
   - Node.js 20+
   - PostgreSQL 16+
   - Redis 7+
   - SystemD (Linux)

2. **Environment Variables**:
   ```bash
   NODE_ENV=production
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   SLACK_WEBHOOK_URL=https://...
   ```

### Deployment Process

1. **Install System Services**:
   ```bash
   sudo ./scripts/install-systemd-services.sh install
   ```

2. **Deploy Application**:
   ```bash
   sudo ./scripts/install-systemd-services.sh deploy
   ```

3. **Verify Deployment**:
   ```bash
   sudo ./scripts/install-systemd-services.sh status
   ```

### Zero-Downtime Deployment

The system supports zero-downtime deployments through:
- **PM2 cluster mode**: Rolling restarts
- **Health checks**: Ensure service availability
- **Database migrations**: Run before deployment
- **Asset optimization**: CDN and caching

### Production Monitoring

1. **SystemD Service Monitoring**:
   ```bash
   sudo systemctl status paintbox.target
   journalctl -u paintbox-app.service -f
   ```

2. **Application Monitoring**:
   ```bash
   pm2 monit
   pm2 logs
   ```

3. **Health Checks**:
   ```bash
   curl http://localhost:3000/api/health
   curl http://localhost:3000/api/status
   ```

## Maintenance Procedures

### Regular Maintenance

#### Daily
- **Automated Tasks**:
  - Dependency security scans
  - Log rotation
  - Health checks
  - Alert notifications

#### Weekly
- **Manual Tasks**:
  - Review dependency updates
  - Check system metrics
  - Validate backup integrity
  - Review security alerts

#### Monthly
- **Maintenance Tasks**:
  - Dependency health report review
  - Performance optimization
  - Security audit review
  - Documentation updates

### Dependency Updates

1. **Review Dependabot PRs**:
   - Check automated pull requests
   - Review breaking changes
   - Test updates in staging

2. **Manual Updates**:
   ```bash
   # Check for updates
   npm outdated
   
   # Update specific package
   npm update package-name
   
   # Major version updates
   npm install package-name@latest
   ```

3. **Security Updates**:
   ```bash
   # Check for vulnerabilities
   npm audit
   
   # Auto-fix issues
   npm audit fix
   
   # Manual fixes
   npm install package-name@secure-version
   ```

### Service Maintenance

1. **Graceful Service Restart**:
   ```bash
   # PM2 zero-downtime restart
   pm2 reload all
   
   # SystemD service restart
   sudo systemctl restart paintbox-app.service
   ```

2. **Database Maintenance**:
   ```bash
   # Database optimization
   psql -d paintbox -c "VACUUM ANALYZE;"
   
   # Index maintenance
   psql -d paintbox -c "REINDEX DATABASE paintbox;"
   ```

3. **Cache Maintenance**:
   ```bash
   # Redis cache cleanup
   redis-cli FLUSHDB
   
   # Selective cleanup
   redis-cli --scan --pattern "expired:*" | xargs redis-cli DEL
   ```

## Troubleshooting

### Common Issues

#### Dependency Issues

**Problem**: npm install fails
```bash
# Solutions
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Check for platform issues
npm config list
```

**Problem**: Security vulnerabilities
```bash
# Check vulnerabilities
npm audit

# Auto-fix
npm audit fix --force

# Manual resolution
npm install package@version
```

#### Service Issues

**Problem**: Service won't start
```bash
# Check service status
sudo systemctl status paintbox-app.service

# View logs
journalctl -u paintbox-app.service -f

# Check dependencies
sudo systemctl list-dependencies paintbox.target
```

**Problem**: High memory usage
```bash
# Check memory usage
pm2 monit

# Restart service
pm2 restart paintbox-app

# Check for memory leaks
node --inspect scripts/memory-profiler.js
```

#### Health Check Failures

**Problem**: Health checks failing
```bash
# Manual health check
curl -v http://localhost:3000/api/health

# Check individual services
pg_isready -h localhost -p 5432
redis-cli ping

# Review logs
tail -f logs/paintbox-app.log
```

### Debug Commands

```bash
# Service debugging
pm2 describe paintbox-app
pm2 env 0

# Database debugging
psql -d paintbox -c "SELECT version();"
psql -d paintbox -c "SELECT count(*) FROM pg_stat_activity;"

# Redis debugging
redis-cli info memory
redis-cli config get maxmemory

# Network debugging
netstat -tlnp | grep :3000
curl -I http://localhost:3000/api/health
```

### Emergency Procedures

#### Service Recovery

1. **Immediate Recovery**:
   ```bash
   # Stop all services
   sudo systemctl stop paintbox.target
   
   # Start core services only
   sudo systemctl start paintbox-postgres.service
   sudo systemctl start paintbox-redis.service
   sudo systemctl start paintbox-app.service
   ```

2. **Database Recovery**:
   ```bash
   # Check database status
   sudo -u postgres pg_isready
   
   # Restart database
   sudo systemctl restart paintbox-postgres.service
   
   # Check for corruption
   sudo -u postgres pg_dump paintbox > backup.sql
   ```

3. **Cache Recovery**:
   ```bash
   # Clear cache
   redis-cli FLUSHALL
   
   # Restart Redis
   sudo systemctl restart paintbox-redis.service
   ```

#### Rollback Procedures

1. **Code Rollback**:
   ```bash
   # Git rollback
   git log --oneline -10
   git checkout previous-working-commit
   
   # Redeploy
   sudo ./scripts/install-systemd-services.sh deploy
   ```

2. **Database Rollback**:
   ```bash
   # Restore from backup
   sudo -u postgres psql paintbox < backup.sql
   
   # Run specific migration rollback
   npm run db:migrate:rollback
   ```

### Contact and Support

For additional support:
- **Documentation**: Check inline code documentation
- **Logs**: Review application and system logs
- **Monitoring**: Check Grafana dashboards
- **Alerts**: Review Slack alerts and email notifications

---

## Quick Reference

### Essential Commands

```bash
# Health checks
curl http://localhost:3000/api/health
./scripts/dependency-health-check.sh

# Service management
pm2 status
sudo systemctl status paintbox.target

# Monitoring
pm2 monit
./scripts/alert-integration.sh monitor

# Maintenance
npm audit
npm outdated
./scripts/log-rotator.js run
```

### Configuration Files

- **Dependencies**: `package.json`, `.github/dependabot.yml`
- **Services**: `ecosystem.config.js`, `systemd/*.service`
- **Development**: `docker-compose.development.yml`
- **Monitoring**: `scripts/health-monitor.js`
- **Alerts**: `lib/services/alert-service.ts`

### Environment Variables

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SLACK_WEBHOOK_URL=https://...
ALERT_EMAIL_TO=ops@company.com
HEALTH_CHECK_INTERVAL=30000
```

---

This guide provides comprehensive coverage of the dependency management and background services system. For specific implementation details, refer to the individual configuration files and scripts mentioned throughout the documentation.
