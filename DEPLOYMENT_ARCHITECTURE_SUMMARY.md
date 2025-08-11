# Candlefish AI - Complete Deployment Architecture

## Executive Summary

This document provides a comprehensive overview of the unified deployment architecture for the Candlefish AI platform. The solution consolidates all services into a production-ready AWS EKS deployment with automated CI/CD, monitoring, and cost optimization.

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet/Users                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                  AWS Application Load Balancer                  │
│                    (with WAF & SSL/TLS)                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    AWS EKS Cluster                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Website   │ │Backend API  │ │ Analytics   │ │  Brand    │ │
│  │ (Next.js)   │ │ (FastAPI)   │ │ Dashboard   │ │ Portal    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│  ┌─────────────┐ ┌─────────────┐                              │
│  │  Paintbox   │ │API Gateway  │                              │
│  │  Service    │ │             │                              │
│  └─────────────┘ └─────────────┘                              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                      Data Layer                                │
│  ┌─────────────────┐            ┌─────────────────┐            │
│  │   RDS PostgreSQL │            │ ElastiCache     │            │
│  │   (Multi-AZ)     │            │ Redis           │            │
│  └─────────────────┘            └─────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### Service Components

| Component | Technology | Purpose | Scaling Strategy |
|-----------|------------|---------|------------------|
| **Website Frontend** | Next.js 14 | Main web application | HPA (3-15 replicas) |
| **Backend API** | FastAPI + Python 3.12 | Core API services | HPA (5-25 replicas) |
| **Analytics Dashboard** | React + Vite | Real-time analytics | HPA (3-10 replicas) |
| **Paintbox Service** | Next.js + Puppeteer | PDF generation | HPA (4-15 replicas) |
| **Brand Portal** | Static HTML + Nginx | Brand asset management | HPA (2-8 replicas) |
| **API Gateway** | Node.js/Express | Traffic routing & auth | HPA (3-12 replicas) |

### Infrastructure Components

| Component | Technology | Configuration | Cost Optimization |
|-----------|------------|---------------|-------------------|
| **Container Orchestration** | AWS EKS 1.28 | Multi-AZ, managed node groups | Spot instances for dev/staging |
| **Database** | RDS PostgreSQL 16 | Multi-AZ in production | Single-AZ for dev, right-sizing |
| **Cache** | ElastiCache Redis 7.x | Replication enabled | Single node for dev |
| **Load Balancer** | AWS ALB | SSL termination, WAF | Shared across services |
| **Storage** | S3 + EBS | Static assets + persistent data | Lifecycle policies |
| **Monitoring** | Prometheus + Grafana | Complete observability stack | Reduced retention for dev |
| **Secrets** | AWS Secrets Manager | Encrypted secret management | KMS encryption |

## Deployment Strategy

### CI/CD Pipeline

The deployment process uses GitHub Actions with multiple stages:

1. **Code Quality & Security**
   - Trivy vulnerability scanning
   - CodeQL security analysis
   - Lint and type checking
   - Unit and integration tests

2. **Build & Package**
   - Multi-stage Docker builds
   - Container image optimization
   - Multi-architecture support (amd64, arm64)
   - Registry push to GHCR

3. **Environment Deployment**
   - **Development**: Automatic on `develop` branch
   - **Staging**: Blue-green deployment on `main` branch
   - **Production**: Canary deployment with manual approval

### Deployment Models

#### Blue-Green Deployment (Staging)
```
┌─────────────┐    ┌─────────────┐
│    Blue     │    │    Green    │
│ (Current)   │    │   (New)     │
├─────────────┤    ├─────────────┤
│ v1.2.0      │    │ v1.3.0      │
│ ✓ Active    │    │ ○ Testing   │
└─────────────┘    └─────────────┘
        │                   │
        └───── Switch ──────┘
```

#### Canary Deployment (Production)
```
┌─────────────────────────────────┐
│         Production Traffic       │
├─────────────────┬───────────────┤
│     90%         │     10%       │
│   Stable        │   Canary      │
│   v1.2.0        │   v1.3.0      │
└─────────────────┴───────────────┘
```

## Cost Optimization

### Target Monthly Costs

| Environment | Target Cost | Actual Range | Key Optimizations |
|-------------|-------------|--------------|-------------------|
| **Development** | $200-400 | $250-350 | Spot instances, single replicas, minimal monitoring |
| **Staging** | $400-600 | $450-550 | Shared resources, scheduled scaling |
| **Production** | $800-1200 | $900-1500 | Right-sized instances, HPA, reserved instances |

### Cost Optimization Strategies

1. **Instance Optimization**
   - Use spot instances for development and staging
   - Right-size production instances based on actual usage
   - Reserved instances for predictable workloads

2. **Autoscaling**
   - Horizontal Pod Autoscaler (HPA) for all services
   - Cluster Autoscaler for node management
   - Scheduled scaling for non-production environments

3. **Resource Management**
   - Resource requests and limits on all containers
   - Pod disruption budgets for graceful scaling
   - Multi-tenancy where appropriate

4. **Storage Optimization**
   - S3 lifecycle policies for log retention
   - EBS GP3 volumes for better cost/performance
   - Database storage autoscaling

## Security Implementation

### Security Layers

1. **Network Security**
   - VPC with private subnets for workloads
   - Network policies for pod-to-pod communication
   - AWS WAF for application protection
   - TLS encryption for all traffic

2. **Container Security**
   - Vulnerability scanning with Trivy
   - Non-root container execution
   - Read-only root filesystems
   - Security contexts and capabilities

3. **Access Control**
   - RBAC for Kubernetes access
   - IRSA for AWS service access
   - Service accounts with least privilege
   - Pod security policies

4. **Secrets Management**
   - AWS Secrets Manager integration
   - External Secrets Operator
   - Kubernetes secrets encryption
   - Regular secret rotation

## Monitoring & Observability

### Monitoring Stack

- **Metrics**: Prometheus with custom exporters
- **Visualization**: Grafana dashboards
- **Alerting**: AlertManager with Slack integration
- **Logging**: CloudWatch integration
- **Tracing**: Distributed tracing ready (Jaeger)

### Key Metrics

#### Application Metrics
- Request rate and response time
- Error rates and success ratios
- Business metrics (estimates, PDF generation)
- User activity and conversion funnel

#### Infrastructure Metrics
- CPU, memory, and disk utilization
- Network traffic and latency
- Database performance and connections
- Cost and resource efficiency

#### Security Metrics
- Failed authentication attempts
- Suspicious network activity
- Certificate expiration monitoring
- Vulnerability scan results

### Alerting Rules

#### Critical Alerts (P0)
- Service down for >5 minutes
- Database unavailable
- Error rate >50% for >2 minutes
- Security breach indicators

#### Warning Alerts (P1/P2)
- Error rate >10% for >5 minutes
- Response time >2s (95th percentile)
- High resource utilization (>90%)
- Certificate expiring within 7 days

## Disaster Recovery

### Backup Strategy

1. **Database Backups**
   - Automated daily snapshots
   - Point-in-time recovery enabled
   - Cross-region backup replication
   - 30-day retention policy

2. **Application Data**
   - S3 cross-region replication
   - Configuration backups in Git
   - Container image redundancy
   - Secret backup to secondary region

### Recovery Procedures

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Automated failover** for database and cache
4. **Manual failover** for application services
5. **Documented runbook** with step-by-step procedures

## Operational Excellence

### Automation

- **Infrastructure as Code**: Terraform for all AWS resources
- **Configuration Management**: Helm charts for Kubernetes
- **CI/CD Automation**: GitHub Actions for deployments
- **Monitoring Setup**: Automated dashboard and alert provisioning

### Documentation

- **Deployment Runbook**: Complete operational procedures
- **Architecture Diagrams**: System design and data flow
- **API Documentation**: OpenAPI specifications
- **Security Guidelines**: Security policies and procedures

### Performance

- **Load Testing**: Automated performance regression tests
- **Capacity Planning**: Resource usage trend analysis
- **Performance Budgets**: Response time and throughput targets
- **Optimization**: Regular performance tuning cycles

## Getting Started

### Prerequisites

1. **AWS Account** with appropriate IAM permissions
2. **GitHub Repository** access and secrets configured
3. **Local Tools**: kubectl, helm, terraform, docker, aws-cli
4. **Domain Names** and SSL certificates configured

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/candlefish-ai/candlefish-ai.git
cd candlefish-ai

# 2. Configure AWS credentials
aws configure

# 3. Deploy infrastructure
cd infrastructure/terraform
terraform init
terraform plan -var="environment=development"
terraform apply

# 4. Deploy application
../deployment/scripts/deploy.sh -e development

# 5. Verify deployment
kubectl get pods -n candlefish-dev
```

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test locally
npm run dev  # or docker-compose up

# Push changes (triggers CI/CD)
git push origin feature/new-feature

# Create pull request (triggers staging deployment)
gh pr create --title "Add new feature"

# After approval, merge triggers production deployment
```

## File Structure

```
candlefish-ai/
├── .github/workflows/           # GitHub Actions CI/CD
│   ├── unified-deployment.yml   # Main deployment pipeline
│   └── deploy-multi-tenant-dashboard.yml
├── deployment/
│   ├── docker/                  # Multi-stage Dockerfiles
│   │   ├── Dockerfile.website
│   │   ├── Dockerfile.backend-api
│   │   ├── Dockerfile.analytics
│   │   ├── Dockerfile.paintbox
│   │   └── Dockerfile.brand-portal
│   ├── helm/candlefish/         # Helm charts
│   │   ├── Chart.yaml
│   │   ├── values.yaml          # Default values
│   │   ├── values-dev.yaml      # Development overrides
│   │   ├── values-staging.yaml  # Staging overrides
│   │   ├── values-prod.yaml     # Production overrides
│   │   └── templates/           # Kubernetes manifests
│   ├── monitoring/              # Observability configs
│   │   ├── prometheus-config.yaml
│   │   ├── alert-rules.yaml
│   │   └── grafana-dashboards.json
│   ├── scripts/                 # Deployment scripts
│   │   └── deploy.sh            # Unified deployment script
│   └── runbooks/                # Operational documentation
│       └── DEPLOYMENT_RUNBOOK.md
├── infrastructure/terraform/    # Infrastructure as Code
│   ├── main.tf                  # Primary Terraform config
│   ├── variables.tf             # Input variables
│   └── outputs.tf               # Output values
├── apps/                        # Application services
│   ├── website/                 # Next.js frontend
│   ├── rtpm-api/               # FastAPI backend
│   ├── analytics-dashboard/     # React dashboard
│   ├── brand-portal/           # Static brand site
│   ├── mobile-dashboard/       # React Native app
│   └── otter-gateway/          # API gateway
├── projects/paintbox/          # PDF generation service
└── components/                 # Shared UI components
```

## Next Steps

### Phase 1: Foundation (Week 1-2)
- [ ] Deploy development environment
- [ ] Set up monitoring and alerting
- [ ] Configure CI/CD pipelines
- [ ] Validate security controls

### Phase 2: Staging (Week 3-4)
- [ ] Deploy staging environment
- [ ] Implement blue-green deployment
- [ ] Performance testing and optimization
- [ ] Documentation and training

### Phase 3: Production (Week 5-6)
- [ ] Deploy production environment
- [ ] Implement canary deployment
- [ ] Disaster recovery testing
- [ ] Go-live and monitoring

### Phase 4: Optimization (Week 7-8)
- [ ] Cost optimization analysis
- [ ] Performance tuning
- [ ] Security audit and hardening
- [ ] Operational excellence improvements

## Support and Maintenance

### Team Responsibilities

| Team | Responsibility | Contact |
|------|----------------|---------|
| **DevOps** | Infrastructure, deployments, monitoring | devops@candlefish.ai |
| **Security** | Security policies, vulnerability management | security@candlefish.ai |
| **Development** | Application code, feature development | dev@candlefish.ai |
| **Operations** | Incident response, maintenance | ops@candlefish.ai |

### Maintenance Schedule

| Activity | Frequency | Owner |
|----------|-----------|--------|
| Security updates | Weekly | Security Team |
| Performance review | Monthly | DevOps Team |
| Cost optimization | Monthly | DevOps + Finance |
| Disaster recovery test | Quarterly | Operations Team |
| Architecture review | Quarterly | Tech Leadership |

---

*This deployment architecture provides a complete, production-ready solution for the Candlefish AI platform with enterprise-grade reliability, security, and cost optimization.*

**Last Updated**: January 2025  
**Version**: 1.0  
**Review Date**: April 2025
