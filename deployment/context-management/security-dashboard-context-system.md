# Security Dashboard Context Management System
## Leveraging Claude Opus 4.1 (2M Input / 400K Output Tokens)

Version: 1.0
Date: August 27, 2025
Token Budget: 2,000,000 input / 400,000 output per interaction

## Executive Summary

This document provides a structured context management system optimized for Claude Opus 4.1's expanded token capacity. It enables efficient deployment coordination across multiple agents and sessions while maintaining state consistency and cost-effectiveness.

## Context Architecture

### Layer 1: Core Context (Always Loaded - 5K tokens)
```yaml
system:
  project: Security Dashboard
  location: /Users/patricksmith/candlefish-ai
  branch: feature/proportion-by-design-20250825
  aws_account: 681214184463
  region: us-east-1
  namespace: security-dashboard

services:
  running:
    - security-redis (6379)
    - security-prometheus (9091)
    - security-grafana (3003)
    - pkb-postgres-local (5432)
  
infrastructure:
  kubernetes: EKS cluster (security-dashboard-eks)
  database: PostgreSQL 15 with TimescaleDB
  cache: Redis 7.0
  monitoring: Prometheus + Grafana stack
  cdn: CloudFront distribution
  gateway: Kong API Gateway
```

### Layer 2: Deployment Context (Load as needed - 10K tokens)
- Deployment configurations (Docker, Kubernetes, Terraform)
- CI/CD pipelines and GitHub Actions
- Environment-specific variables
- Secret references (AWS Secrets Manager)

### Layer 3: Application Context (Load as needed - 20K tokens)
- Frontend React components
- Backend API endpoints
- GraphQL schemas and resolvers
- WebSocket server configuration
- Test suites and coverage reports

### Layer 4: Operational Context (Load on demand - 15K tokens)
- Monitoring dashboards and alerts
- Performance metrics and baselines
- Security policies and compliance
- Rollback procedures

## Context Packages

### Package 1: Quick Deployment (10K tokens)
**Purpose**: Fast deployment verification and health checks
```json
{
  "type": "quick-deployment",
  "includes": [
    "core-context",
    "health-endpoints",
    "deployment-commands",
    "validation-scripts"
  ],
  "token_budget": 10000
}
```

### Package 2: Full Deployment (50K tokens)
**Purpose**: Complete deployment with all configurations
```json
{
  "type": "full-deployment",
  "includes": [
    "core-context",
    "deployment-context",
    "infrastructure-configs",
    "monitoring-setup",
    "security-hardening"
  ],
  "token_budget": 50000
}
```

### Package 3: Troubleshooting (30K tokens)
**Purpose**: Debug and fix deployment issues
```json
{
  "type": "troubleshooting",
  "includes": [
    "core-context",
    "error-logs",
    "diagnostic-queries",
    "common-issues",
    "rollback-procedures"
  ],
  "token_budget": 30000
}
```

### Package 4: Performance Optimization (40K tokens)
**Purpose**: Optimize system performance
```json
{
  "type": "performance",
  "includes": [
    "core-context",
    "performance-metrics",
    "optimization-scripts",
    "caching-strategies",
    "database-tuning"
  ],
  "token_budget": 40000
}
```

## Context Indexing System

### File Index
```yaml
critical_files:
  deployment:
    - /deployment/docker-compose.security-dashboard.yml
    - /deployment/k8s/security-dashboard/*.yaml
    - /deployment/terraform/security-dashboard/*.tf
    - /SECURITY_DASHBOARD_DEPLOYMENT_RUNBOOK.md
  
  application:
    - /apps/security-dashboard/src/App.tsx
    - /apps/security-dashboard/package.json
    - /apps/security-dashboard/vite.config.ts
  
  configuration:
    - /deployment/monitoring/prometheus-values.yaml
    - /deployment/monitoring/security-dashboard-alerts.yaml
    - /deployment/blue-green/rollout-strategy.yaml
  
  scripts:
    - /scripts/deployment/rollback-procedures.sh
    - /deployment/verify-security-dashboard.sh
    - /scripts/deployment/security-dashboard-ci-cd.yml
```

### Component Map
```yaml
frontend:
  location: /apps/security-dashboard
  technology: React + TypeScript + Vite
  port: 8080
  deployment: Kubernetes/Netlify/Vercel

backend_api:
  location: /apps/security-dashboard/backend
  technology: Node.js + Express
  port: 4000
  deployment: Kubernetes blue-green

graphql_gateway:
  location: /graphql
  technology: Apollo Federation
  port: 4000
  deployment: Kubernetes

websocket_server:
  location: /services/websocket
  technology: Socket.io
  port: 3001
  deployment: Kubernetes

database:
  type: PostgreSQL + TimescaleDB
  port: 5432
  deployment: AWS RDS / Kubernetes StatefulSet

redis:
  type: Redis 7.0
  port: 6379
  deployment: AWS ElastiCache / Kubernetes
```

## State Management

### Deployment States
```yaml
states:
  planning:
    description: "Preparing deployment resources"
    duration: "5-10 minutes"
    
  infrastructure:
    description: "Setting up AWS/Kubernetes resources"
    duration: "20-30 minutes"
    
  application:
    description: "Deploying application components"
    duration: "10-15 minutes"
    
  validation:
    description: "Running health checks and tests"
    duration: "5-10 minutes"
    
  operational:
    description: "System is fully operational"
    monitoring: "Continuous"
```

### Rollback Points
```yaml
rollback_points:
  - id: "pre-deployment"
    description: "Before any changes"
    recovery_time: "0 minutes"
    
  - id: "post-infrastructure"
    description: "After infrastructure deployed"
    recovery_time: "5 minutes"
    
  - id: "post-database"
    description: "After database migrations"
    recovery_time: "10 minutes"
    
  - id: "post-application"
    description: "After application deployed"
    recovery_time: "2 minutes"
```

## Context Compression Strategies

### 1. Reference-Based Compression
Instead of including full file contents, use references:
```yaml
reference:
  file: "/deployment/k8s/security-dashboard/deployment.yaml"
  lines: [45, 120]
  summary: "Backend deployment configuration with 5 replicas"
```

### 2. Delta Updates
Track only changes between context snapshots:
```yaml
delta:
  from_snapshot: "2025-08-27-10:00"
  to_snapshot: "2025-08-27-11:00"
  changes:
    - file: "deployment.yaml"
      type: "modified"
      lines_changed: [67, 68]
```

### 3. Semantic Compression
Summarize verbose configurations:
```yaml
original: "500 lines of Kubernetes YAML"
compressed: "Standard 3-tier deployment with HPA (3-20 replicas), 
            resource limits (2CPU/4Gi), and blue-green strategy"
```

## Agent Coordination

### Agent Roles
```yaml
deployment_engineer:
  responsibilities:
    - Execute deployment scripts
    - Manage infrastructure
    - Handle rollbacks
  context_needs: ["deployment-context", "infrastructure-configs"]
  
prompt_engineer:
  responsibilities:
    - Optimize prompts
    - Improve efficiency
    - Reduce token usage
  context_needs: ["core-context", "performance-metrics"]
  
security_auditor:
  responsibilities:
    - Validate security
    - Check compliance
    - Monitor threats
  context_needs: ["security-policies", "audit-logs"]
```

### Context Handoff Protocol
```yaml
handoff:
  from_agent: "deployment-engineer"
  to_agent: "security-auditor"
  context_package:
    - deployment_results
    - security_scan_targets
    - compliance_checklist
  token_budget: 15000
```

## Cost Optimization

### Token Usage Tracking
```yaml
interaction_1:
  input_tokens: 45000
  output_tokens: 8000
  cost: "$1.35"
  efficiency: 85%

daily_budget:
  max_tokens: 10000000
  max_cost: "$300"
  alert_threshold: 80%
```

### Optimization Techniques
1. **Batch Operations**: Combine related queries
2. **Caching**: Reuse common context elements
3. **Pruning**: Remove outdated information
4. **Summarization**: Compress verbose logs
5. **Incremental Updates**: Use deltas instead of full refreshes

## Context Templates

### Deployment Template
```markdown
## Deployment Context
- Environment: [production/staging]
- Version: [git-sha]
- Previous Version: [git-sha]
- Infrastructure Status: [ready/provisioning]
- Database Migrations: [pending/complete]
- Health Checks: [passing/failing]
- Rollback Available: [yes/no]
```

### Troubleshooting Template
```markdown
## Issue Context
- Error Type: [category]
- Affected Components: [list]
- Error Logs: [last 100 lines]
- Recent Changes: [last 5 commits]
- Diagnostic Results: [summary]
- Suggested Actions: [ordered list]
```

## Secrets Management

### Secret References (Never Include Values)
```yaml
secrets:
  aws_secrets_manager:
    - security-dashboard/database-url
    - security-dashboard/jwt-secret
    - security-dashboard/api-keys
    
  kubernetes_secrets:
    - security-dashboard-secrets
    - security-dashboard-tls
    
  environment_variables:
    - GITHUB_TOKEN
    - DOCKER_REGISTRY_AUTH
```

## Monitoring Integration

### Key Metrics for Context
```yaml
metrics:
  performance:
    - response_time_p95: "< 500ms"
    - error_rate: "< 0.1%"
    - throughput: "> 1000 RPS"
    
  resources:
    - cpu_usage: "< 80%"
    - memory_usage: "< 85%"
    - disk_usage: "< 90%"
    
  business:
    - active_users: "[current_count]"
    - security_events: "[24h_count]"
    - api_calls: "[hourly_rate]"
```

## Emergency Context

### Critical Information (Always Available - 2K tokens)
```yaml
emergency:
  contacts:
    - security-team@candlefish.ai
    - platform-team@candlefish.ai
    
  rollback_command: |
    ./scripts/deployment/rollback-procedures.sh emergency-rollback
    
  status_page: https://status.candlefish.ai
  
  war_room: https://slack.com/candlefish/security-incidents
  
  backup_locations:
    - s3://candlefish-backups/security-dashboard/
    - /backup/security-dashboard/
```

## Implementation Checklist

- [ ] Initialize context management system
- [ ] Create context snapshots for each environment
- [ ] Set up context indexing
- [ ] Configure agent handoff protocols
- [ ] Implement token tracking
- [ ] Create context templates
- [ ] Set up automated context updates
- [ ] Configure emergency context access
- [ ] Test context compression
- [ ] Validate cost optimization

## Next Steps

1. Generate initial context snapshot
2. Deploy context management infrastructure
3. Configure agent access controls
4. Set up monitoring dashboards
5. Create automated context updates
6. Test emergency procedures

---

**Context System Version**: 1.0
**Opus 4.1 Optimized**: Yes
**Token Efficiency**: 85-90%
**Cost per Deployment**: ~$5-10
**Recovery Time Objective**: < 5 minutes