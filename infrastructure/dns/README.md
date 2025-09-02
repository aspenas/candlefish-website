# Candlefish AI DNS Infrastructure

Complete production domain configuration for api.candlefish.ai and related subdomains.

## Overview

This infrastructure supports the following domains:
- **api.candlefish.ai** → Main API (port 8000)
- **analytics.candlefish.ai** → Analytics Engine (port 8001)
- **router.candlefish.ai** → Model Router (port 8002)
- **monitor.candlefish.ai** → Error Monitor (port 8003)
- **config.candlefish.ai** → Web Dashboard (port 3000)

## Architecture

```
Internet
    ↓
[Cloudflare CDN/WAF] (optional)
    ↓
[Route53 DNS] → [AWS ALB/NLB]
    ↓
[Nginx Reverse Proxy]
    ↓
[Service Containers]
```

## Directory Structure

```
infrastructure/dns/
├── route53/                    # AWS Route53 DNS configuration
│   ├── candlefish-ai-zone.json
│   └── terraform-dns.tf
├── cloudflare/                 # Cloudflare backup configuration
│   ├── cloudflare-dns.json
│   └── cloudflare-terraform.tf
├── nginx/                      # Nginx reverse proxy configuration
│   ├── nginx.conf
│   ├── candlefish-ai.conf
│   ├── cors-config.conf
│   └── rate-limiting.conf
├── ssl/                        # SSL/TLS certificate management
│   ├── certbot-config.sh
│   ├── ssl-config.conf
│   └── generate-dhparam.sh
├── health/                     # Health check configuration
│   ├── health-checks.conf
│   ├── cloudflare-ips.conf
│   └── health-monitor.py
├── monitoring/                 # Prometheus monitoring
│   ├── prometheus.yml
│   └── alert_rules.yml
├── scripts/                    # Management scripts
│   ├── deploy-dns.sh
│   ├── update-dns-records.sh
│   └── dns-diagnostics.sh
├── docker-compose.yml          # Docker infrastructure
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### 2. Full Deployment

```bash
# Deploy everything
./scripts/deploy-dns.sh full

# Or deploy components individually
./scripts/deploy-dns.sh dns       # Route53 only
./scripts/deploy-dns.sh ssl       # SSL certificates only
./scripts/deploy-dns.sh docker    # Docker services only
```

### 3. Health Check

```bash
# Quick health check
./scripts/dns-diagnostics.sh quick

# Comprehensive diagnostics
./scripts/dns-diagnostics.sh full

# Generate report
./scripts/dns-diagnostics.sh report
```

## Configuration Details

### DNS Configuration

#### Route53 (Primary)
- **File**: `route53/terraform-dns.tf`
- **Features**: 
  - A records for root domain
  - CNAME records for subdomains
  - ACM SSL certificates
  - Health checks

#### Cloudflare (Backup)
- **File**: `cloudflare/cloudflare-terraform.tf`
- **Features**:
  - CDN and WAF protection
  - Rate limiting
  - Page rules for caching
  - DDoS protection

### SSL/TLS Security

#### Let's Encrypt Integration
```bash
# Setup SSL certificates
./ssl/certbot-config.sh setup

# Renew certificates
./ssl/certbot-config.sh renew

# Generate DH parameters
./ssl/generate-dhparam.sh
```

#### Security Features
- TLS 1.2 and 1.3 support
- HSTS headers
- Perfect Forward Secrecy
- OCSP stapling
- Certificate monitoring

### Nginx Reverse Proxy

#### Key Features
- **Load balancing**: Least connection algorithm
- **Rate limiting**: Per IP and per endpoint
- **CORS**: Configurable cross-origin policies
- **Security headers**: XSS, CSRF, clickjacking protection
- **Caching**: Static asset optimization
- **Compression**: Gzip and Brotli

#### Rate Limits
- API endpoints: 10 requests/second
- Authentication: 5 requests/minute
- Upload endpoints: 2 requests/second
- Analytics: 20 requests/minute
- Config dashboard: 30 requests/minute

### Health Monitoring

#### Health Check Endpoints
- `/health` - Basic health status
- `/health/detailed` - Service metrics
- `/ready` - Readiness probe (K8s)
- `/live` - Liveness probe (K8s)

#### Monitoring Stack
- **Prometheus**: Metrics collection
- **Alertmanager**: Alert routing
- **Blackbox Exporter**: HTTP/DNS monitoring
- **Node Exporter**: System metrics

## Management Scripts

### DNS Records Management

```bash
# Update A record
./scripts/update-dns-records.sh update-a api 192.0.2.1

# Update CNAME record  
./scripts/update-dns-records.sh update-cname www example.com

# List all records
./scripts/update-dns-records.sh list

# Verify DNS propagation
./scripts/update-dns-records.sh verify api 192.0.2.1
```

### Diagnostics

```bash
# DNS resolution test
./scripts/dns-diagnostics.sh dns

# SSL certificate check
./scripts/dns-diagnostics.sh ssl

# HTTP connectivity test
./scripts/dns-diagnostics.sh http

# Response time analysis
./scripts/dns-diagnostics.sh timing

# Route53 configuration check
./scripts/dns-diagnostics.sh route53
```

## Docker Services

### Core Services
- **nginx**: Reverse proxy and load balancer
- **certbot**: SSL certificate management
- **api**: Main API service
- **analytics**: Analytics engine
- **router**: AI model router
- **monitor**: Error monitoring
- **config**: Web dashboard

### Supporting Services
- **redis**: Caching and session storage
- **postgres**: Database (optional)
- **health-monitor**: Service monitoring
- **watchtower**: Automatic updates

### Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f nginx

# Restart specific service
docker-compose restart api

# Scale services
docker-compose up -d --scale api=3

# Health check
docker-compose ps
```

## Security Considerations

### Network Security
- Private Docker network (172.20.0.0/16)
- Firewall rules for port restrictions
- Rate limiting and DDoS protection
- IP allowlists for admin endpoints

### SSL/TLS Security
- Strong cipher suites
- HSTS with preloading
- Certificate pinning (optional)
- Regular certificate rotation

### Access Control
- API key authentication
- JWT token validation
- CORS policy enforcement
- Admin interface restrictions

## Monitoring and Alerting

### Prometheus Metrics
- Service availability
- Response times
- Error rates
- SSL certificate expiry
- System resources

### Alert Conditions
- Service downtime (5+ minutes)
- High error rates (>10%)
- SSL certificate expiry (<30 days)
- High response times (>2 seconds)
- Resource exhaustion (CPU >80%, Memory >85%, Disk >85%)

### Notification Channels
- Email alerts
- Slack integration
- PagerDuty escalation
- Discord webhooks

## Backup and Recovery

### DNS Backup
- Route53 configuration in Terraform state
- Cloudflare as secondary DNS provider
- Regular configuration exports

### SSL Certificate Backup
- Automated certificate backup script
- Multiple renewal methods (webroot, DNS challenge)
- Certificate monitoring and alerting

### Service Recovery
- Health check driven restart policies
- Blue-green deployment support
- Rollback mechanisms

## Performance Optimization

### Caching Strategy
- Static asset caching (1 year)
- API response caching (configurable)
- CDN integration (Cloudflare)
- Browser caching policies

### Load Balancing
- Least connection algorithm
- Health check based routing
- Session affinity (if needed)
- Auto-scaling integration

### Compression
- Gzip compression for text content
- Brotli compression (where supported)
- Image optimization
- Minification for static assets

## Troubleshooting

### Common Issues

1. **DNS not resolving**
   ```bash
   # Check DNS propagation
   ./scripts/dns-diagnostics.sh dns
   
   # Verify Route53 records
   ./scripts/dns-diagnostics.sh route53
   ```

2. **SSL certificate issues**
   ```bash
   # Check certificate status
   ./scripts/dns-diagnostics.sh ssl
   
   # Force certificate renewal
   ./ssl/certbot-config.sh force-renew
   ```

3. **Service not responding**
   ```bash
   # Check service health
   ./scripts/dns-diagnostics.sh http
   
   # View service logs
   docker-compose logs service_name
   ```

4. **High response times**
   ```bash
   # Analyze response times
   ./scripts/dns-diagnostics.sh timing
   
   # Check system resources
   docker stats
   ```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=true

# Run diagnostics with verbose output
./scripts/dns-diagnostics.sh full

# Check nginx configuration
docker-compose exec nginx nginx -t
```

## Production Checklist

- [ ] Environment variables configured
- [ ] DNS records propagated
- [ ] SSL certificates valid
- [ ] All services healthy
- [ ] Monitoring configured
- [ ] Alerts tested
- [ ] Backups verified
- [ ] Performance optimized
- [ ] Security hardened
- [ ] Documentation updated

## Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Run diagnostics: `./scripts/dns-diagnostics.sh report`
- Contact: admin@candlefish.ai
- Documentation: Internal wiki or confluence

---

**Last Updated**: $(date)
**Version**: 1.0.0
**Maintainer**: Candlefish AI DevOps Team