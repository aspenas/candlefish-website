# Netlify Extension Management System - Production Deployment

This directory contains all the production deployment configurations and scripts for the Netlify Extension Management System, a comprehensive platform for managing and orchestrating Netlify sites across the Candlefish infrastructure.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/candlefish-enterprise/candlefish-ai.git
cd candlefish-ai/deployment

# Set up environment
export KUBE_CONFIG_PRODUCTION="/path/to/production/kubeconfig"
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

# Deploy to production
./blue-green/blue-green-deploy.sh \
  --api-image ghcr.io/candlefish-enterprise/netlify-extension-api:v1.0.0 \
  --frontend-image ghcr.io/candlefish-enterprise/netlify-extension-frontend:v1.0.0 \
  --ml-image ghcr.io/candlefish-enterprise/netlify-extension-ml:v1.0.0 \
  --monitor-image ghcr.io/candlefish-enterprise/netlify-extension-monitor:v1.0.0 \
  --config-image ghcr.io/candlefish-enterprise/netlify-extension-config:v1.0.0
```

## 📁 Directory Structure

```
deployment/
├── README.md                     # This file
├── docker/                       # Docker configurations
│   ├── Dockerfile.api            # API service container
│   ├── Dockerfile.frontend       # Frontend dashboard container
│   ├── Dockerfile.ml             # ML recommendation engine
│   ├── Dockerfile.monitor        # Performance monitoring service
│   ├── Dockerfile.config         # Configuration management service
│   └── nginx/                    # Nginx configurations
├── k8s/                          # Kubernetes manifests
│   ├── base/                     # Base Kubernetes resources
│   └── overlays/                 # Environment-specific overlays
│       ├── staging/              # Staging environment
│       └── production/           # Production environment
├── blue-green/                   # Blue-green deployment
│   └── blue-green-deploy.sh      # Blue-green deployment script
├── scripts/                      # Deployment scripts
│   ├── health-check.sh           # Health check script
│   ├── emergency-rollback.sh     # Emergency rollback script
│   └── load-balancer-config.sh   # Load balancer configuration
├── monitoring/                   # Monitoring stack
│   ├── prometheus/               # Prometheus configuration
│   ├── grafana/                  # Grafana dashboards
│   └── alertmanager/             # Alert management
├── autoscaling/                  # Auto-scaling configurations
│   └── keda-scaledobjects.yaml   # KEDA scaling objects
└── docs/                         # Documentation
    ├── DEPLOYMENT_GUIDE.md       # Detailed deployment guide
    ├── RUNBOOK.md                # Operations runbook
    └── TROUBLESHOOTING.md        # Troubleshooting guide
```

## 🏗️ System Architecture

The Netlify Extension Management System consists of five core services:

### 1. API Service (Port 3001)
- **Purpose**: RESTful API for Netlify site management
- **Endpoints**: 6 core endpoints for site operations
- **Scale**: 3-15 replicas (production)
- **Health Check**: `/health`

### 2. Frontend Dashboard (Port 80)
- **Purpose**: React-based management interface
- **Features**: Real-time monitoring, site configuration
- **Scale**: 2-6 replicas (production)
- **Health Check**: `/health`

### 3. ML Recommendation Engine (Port 8001)
- **Purpose**: Performance optimization recommendations
- **Features**: Predictive scaling, resource optimization
- **Scale**: 2-12 replicas (production)
- **Health Check**: `/health`

### 4. Performance Monitor (Port 8002)
- **Purpose**: Real-time performance monitoring
- **Features**: Metrics collection, alerting
- **Scale**: 2-4 replicas (production)
- **Health Check**: `/health`

### 5. Configuration Service (Port 8003)
- **Purpose**: Centralized configuration management
- **Features**: Version control, rollback support
- **Scale**: 2-4 replicas (production)
- **Health Check**: `/health`

## 🔄 Deployment Process

### Automated CI/CD Pipeline

1. **Code Push** → Triggers GitHub Actions workflow
2. **Security Scan** → Trivy security scanning
3. **Test Suite** → Unit, integration, E2E, accessibility, performance tests
4. **Build Images** → Multi-stage Docker builds with security hardening
5. **Deploy Staging** → Automatic deployment to staging environment
6. **Health Checks** → Comprehensive health validation
7. **Deploy Production** → Blue-green deployment with zero downtime
8. **Monitoring** → Continuous monitoring and alerting

### Manual Deployment Commands

```bash
# Deploy to staging
kubectl apply -k k8s/overlays/staging

# Deploy to production (blue-green)
./blue-green/blue-green-deploy.sh --api-image IMAGE --frontend-image IMAGE ...

# Health check
./scripts/health-check.sh production

# Emergency rollback
./scripts/emergency-rollback.sh production --force
```

## 📊 Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Response Time (95th percentile) | < 100ms | < 2s |
| Throughput | 1000 concurrent users | 500 RPS |
| Uptime | 99.9% | 99.5% |
| Recovery Time | < 5 minutes | < 15 minutes |
| Error Rate | < 0.1% | < 1% |

## 🔍 Monitoring & Alerting

### Monitoring Stack
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert routing and notification

### Key Metrics
- CPU and memory utilization
- Request rate and response times
- Error rates and status codes
- Database connection health
- Queue depths and processing times

### Alert Channels
- **Slack**: `#alerts` and `#critical-alerts`
- **Email**: `sre@candlefish.ai`
- **PagerDuty**: For critical production issues

## 🚨 Emergency Procedures

### Incident Response
1. **Detection**: Automated alerts or manual discovery
2. **Assessment**: Severity classification (P1-P4)
3. **Response**: Follow appropriate runbook
4. **Communication**: Update stakeholders
5. **Resolution**: Fix and verify
6. **Post-mortem**: Document lessons learned

### Emergency Contacts
- **On-call Engineer**: Available 24/7
- **Platform Team**: Business hours support
- **Security Team**: Security-related incidents

### Quick Commands
```bash
# Check system health
./scripts/health-check.sh production --external

# Emergency rollback
./scripts/emergency-rollback.sh production --force

# Scale up immediately
kubectl scale deployment netlify-api-production --replicas=10 -n netlify-extension-production

# Check logs
kubectl logs -f deployment/netlify-api-production -n netlify-extension-production
```

## 🔧 Troubleshooting

### Common Issues

#### High Response Times
1. Check CPU/memory utilization
2. Verify database connections
3. Check network latency
4. Scale up if needed

#### Service Unavailable
1. Check pod status: `kubectl get pods -n netlify-extension-production`
2. Check ingress: `kubectl get ingress -n netlify-extension-production`
3. Check service endpoints: `kubectl get endpoints -n netlify-extension-production`

#### Database Connection Issues
1. Check database health
2. Verify connection strings
3. Check connection pool settings
4. Restart affected services if needed

### Log Locations
```bash
# Application logs
kubectl logs -f deployment/netlify-api-production -n netlify-extension-production

# Ingress logs
kubectl logs -f deployment/ingress-nginx-controller -n ingress-nginx

# Monitoring logs
kubectl logs -f deployment/prometheus -n monitoring
```

## 📚 Additional Resources

- [Detailed Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Operations Runbook](docs/RUNBOOK.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [Security Best Practices](../SECURITY.md)
- [Performance Optimization](../performance/PERFORMANCE_OPTIMIZATION_GUIDE.md)

## 🔐 Security

### Security Measures
- Non-root containers with read-only root filesystems
- Network policies for service-to-service communication
- TLS encryption for all external traffic
- Regular security scanning with Trivy
- Secrets management with AWS Secrets Manager

### Compliance
- SOC 2 Type II compliance
- GDPR compliance for EU data
- Regular penetration testing
- Security audit logs

## 🤝 Support

For deployment issues or questions:

1. **Check Documentation**: Review this README and linked guides
2. **Search Issues**: Check GitHub issues for similar problems
3. **Slack**: Post in `#deployment-help` channel
4. **Create Issue**: Open a GitHub issue with detailed information
5. **Emergency**: Contact on-call engineer for production issues

## 📝 Change Log

### v1.0.0 (2025-08-24)
- Initial production deployment configuration
- Blue-green deployment implementation
- Comprehensive monitoring setup
- Auto-scaling with KEDA
- Security hardening

### Future Enhancements
- Multi-region deployment
- Advanced traffic splitting
- Chaos engineering integration
- Enhanced ML-driven auto-scaling
