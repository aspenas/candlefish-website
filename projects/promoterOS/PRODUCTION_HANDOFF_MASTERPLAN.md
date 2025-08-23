# PromoterOS Production Handoff Masterplan
**Version**: 1.0.0  
**Date**: January 22, 2025  
**Status**: EXECUTION READY  
**Model**: Claude Opus 4.1  

---

## 1. SOURCE-OF-TRUTH SNAPSHOT

### 1.1 Current State Reality
**ACTUAL STATE (40% Complete)**
- ✅ MVP with mock data endpoints
- ✅ Basic Netlify serverless functions  
- ✅ JWT authentication framework
- ✅ Test harness (partial coverage)
- ✅ Basic frontend UI

**NOT IMPLEMENTED (60% Remaining)**
- ❌ TikTok/Instagram/Spotify scrapers
- ❌ ML prediction engine
- ❌ Redis/Postgres/InfluxDB data layer
- ❌ Real-time WebSocket infrastructure
- ❌ n8n workflow automation
- ❌ Production monitoring/observability
- ❌ Multi-region deployment

### 1.2 Frozen v1.0 Requirements

#### Core Capabilities
1. **Artist Discovery & Analysis**
   - Ingest from TikTok, Instagram, Spotify
   - ML-driven demand prediction (±15% accuracy)
   - Real-time metrics streaming
   - Historical trend analysis

2. **Booking Optimization**
   - Venue capacity matching (1,200-3,500)
   - Dynamic pricing recommendations
   - Risk scoring and portfolio management
   - Automated contract generation

3. **Performance Targets**
   - API Latency: <200ms p99
   - Concurrent Users: 10,000+
   - WebSocket Connections: 1,000+
   - Data Freshness: <5 minutes
   - Availability: 99.9% (43.2min/month downtime)

### 1.3 Acceptance Criteria by Subsystem

| Subsystem | Acceptance Criteria | Validation Method |
|-----------|-------------------|-------------------|
| Scrapers | 95% success rate, <2min lag | Synthetic monitoring |
| ML Engine | ±15% demand accuracy | A/B test vs baseline |
| API Gateway | <200ms p99 latency | Load testing |
| WebSockets | 1k concurrent stable | Chaos engineering |
| Data Layer | <100ms query time | Query profiling |
| n8n Workflows | 99% execution success | Workflow metrics |
| Security | Zero critical vulns | SAST/DAST/Pentest |

---

## 2. WORK BREAKDOWN STRUCTURE

### 2.1 Epic Hierarchy

```
Epic 1: Infrastructure Foundation (Weeks 1-2)
├── Story 1.1: Cloud Account & IaC Setup
│   ├── Task 1.1.1: AWS/GCP account provisioning
│   ├── Task 1.1.2: Terraform state backend
│   ├── Task 1.1.3: Base networking (VPC, subnets)
│   └── Task 1.1.4: IAM roles and policies
├── Story 1.2: Kubernetes Cluster
│   ├── Task 1.2.1: EKS/GKE cluster creation
│   ├── Task 1.2.2: Ingress controller setup
│   ├── Task 1.2.3: Service mesh (Istio)
│   └── Task 1.2.4: Namespace isolation
└── Story 1.3: Observability Stack
    ├── Task 1.3.1: Prometheus + Grafana
    ├── Task 1.3.2: OpenTelemetry collectors
    ├── Task 1.3.3: Log aggregation (ELK/Loki)
    └── Task 1.3.4: Alert manager config

Epic 2: Data Layer (Weeks 2-3)
├── Story 2.1: Database Infrastructure
│   ├── Task 2.1.1: RDS Postgres Multi-AZ
│   ├── Task 2.1.2: Redis cluster (ElastiCache)
│   ├── Task 2.1.3: InfluxDB for timeseries
│   └── Task 2.1.4: pgvector extension
├── Story 2.2: Schema & Migrations
│   ├── Task 2.2.1: Core schema design
│   ├── Task 2.2.2: Migration framework
│   ├── Task 2.2.3: Seed data scripts
│   └── Task 2.2.4: Backup/restore procedures
└── Story 2.3: Data Access Layer
    ├── Task 2.3.1: ORM configuration
    ├── Task 2.3.2: Connection pooling
    ├── Task 2.3.3: Query optimization
    └── Task 2.3.4: Cache strategies

Epic 3: Scraper Suite (Weeks 3-5)
├── Story 3.1: Scraper Framework
│   ├── Task 3.1.1: Playwright cluster setup
│   ├── Task 3.1.2: Proxy rotation service
│   ├── Task 3.1.3: Anti-detection measures
│   └── Task 3.1.4: Rate limit management
├── Story 3.2: Platform Integrations
│   ├── Task 3.2.1: TikTok scraper
│   ├── Task 3.2.2: Instagram scraper
│   ├── Task 3.2.3: Spotify API integration
│   └── Task 3.2.4: Error recovery logic
└── Story 3.3: Data Pipeline
    ├── Task 3.3.1: ETL pipelines
    ├── Task 3.3.2: Data validation
    ├── Task 3.3.3: Deduplication logic
    └── Task 3.3.4: Storage optimization

Epic 4: ML Engine (Weeks 4-6)
├── Story 4.1: Model Development
│   ├── Task 4.1.1: Feature engineering
│   ├── Task 4.1.2: Model training pipeline
│   ├── Task 4.1.3: Hyperparameter tuning
│   └── Task 4.1.4: Model validation
├── Story 4.2: Inference Service
│   ├── Task 4.2.1: Model serving API
│   ├── Task 4.2.2: Batch prediction jobs
│   ├── Task 4.2.3: A/B testing framework
│   └── Task 4.2.4: Model versioning
└── Story 4.3: MLOps Pipeline
    ├── Task 4.3.1: Training automation
    ├── Task 4.3.2: Model registry
    ├── Task 4.3.3: Drift detection
    └── Task 4.3.4: Retraining triggers

Epic 5: Real-time Infrastructure (Weeks 5-7)
├── Story 5.1: WebSocket Service
│   ├── Task 5.1.1: Socket.io cluster
│   ├── Task 5.1.2: Redis pub/sub
│   ├── Task 5.1.3: Connection management
│   └── Task 5.1.4: Heartbeat/reconnect
├── Story 5.2: Event Streaming
│   ├── Task 5.2.1: Kafka/Kinesis setup
│   ├── Task 5.2.2: Event schemas
│   ├── Task 5.2.3: Consumer groups
│   └── Task 5.2.4: Dead letter queues
└── Story 5.3: Scaling & Performance
    ├── Task 5.3.1: Load balancing
    ├── Task 5.3.2: Autoscaling policies
    ├── Task 5.3.3: Circuit breakers
    └── Task 5.3.4: Backpressure handling

Epic 6: n8n Automation (Weeks 6-8)
├── Story 6.1: n8n Infrastructure
│   ├── Task 6.1.1: n8n cluster deployment
│   ├── Task 6.1.2: Workflow storage
│   ├── Task 6.1.3: Credential management
│   └── Task 6.1.4: Execution monitoring
├── Story 6.2: Core Workflows
│   ├── Task 6.2.1: Data ingestion flows
│   ├── Task 6.2.2: Alert workflows
│   ├── Task 6.2.3: Reporting automation
│   └── Task 6.2.4: Maintenance tasks
└── Story 6.3: Integration Points
    ├── Task 6.3.1: API webhooks
    ├── Task 6.3.2: Database triggers
    ├── Task 6.3.3: Event handlers
    └── Task 6.3.4: Error recovery

Epic 7: Security Hardening (Weeks 7-9)
├── Story 7.1: Network Security
│   ├── Task 7.1.1: WAF configuration
│   ├── Task 7.1.2: DDoS protection
│   ├── Task 7.1.3: TLS everywhere
│   └── Task 7.1.4: Network policies
├── Story 7.2: Application Security
│   ├── Task 7.2.1: OWASP Top 10 fixes
│   ├── Task 7.2.2: Input validation
│   ├── Task 7.2.3: Rate limiting
│   └── Task 7.2.4: Session management
└── Story 7.3: Compliance & Audit
    ├── Task 7.3.1: Audit logging
    ├── Task 7.3.2: PII encryption
    ├── Task 7.3.3: GDPR compliance
    └── Task 7.3.4: Security scanning

Epic 8: Testing & Quality (Weeks 8-9)
├── Story 8.1: Test Automation
│   ├── Task 8.1.1: Unit test coverage
│   ├── Task 8.1.2: Integration tests
│   ├── Task 8.1.3: E2E test suite
│   └── Task 8.1.4: Performance tests
├── Story 8.2: CI/CD Pipeline
│   ├── Task 8.2.1: Build automation
│   ├── Task 8.2.2: Test orchestration
│   ├── Task 8.2.3: Deployment pipeline
│   └── Task 8.2.4: Rollback procedures
└── Story 8.3: Quality Gates
    ├── Task 8.3.1: Code coverage gates
    ├── Task 8.3.2: Security gates
    ├── Task 8.3.3: Performance gates
    └── Task 8.3.4: Documentation gates

Epic 9: Production Readiness (Week 10)
├── Story 9.1: Deployment
│   ├── Task 9.1.1: Production deploy
│   ├── Task 9.1.2: DNS cutover
│   ├── Task 9.1.3: CDN configuration
│   └── Task 9.1.4: Health checks
├── Story 9.2: Monitoring
│   ├── Task 9.2.1: Dashboard setup
│   ├── Task 9.2.2: Alert tuning
│   ├── Task 9.2.3: On-call setup
│   └── Task 9.2.4: Runbook creation
└── Story 9.3: Documentation
    ├── Task 9.3.1: API documentation
    ├── Task 9.3.2: Operations guide
    ├── Task 9.3.3: User documentation
    └── Task 9.3.4: Training materials
```

### 2.2 RACI Matrix

| Role | Infrastructure | Data | Scrapers | ML | Real-time | n8n | Security | Testing |
|------|---------------|------|----------|----|-----------|----|----------|---------|
| Tech Lead | A | C | C | C | C | C | R | A |
| DevOps Eng | R | I | C | I | R | R | C | C |
| Backend Eng 1 | C | R | I | I | R | C | C | R |
| Backend Eng 2 | I | C | R | I | C | R | C | R |
| ML Engineer | I | C | C | R | I | I | I | C |
| Frontend Eng | I | I | I | I | C | I | C | R |
| QA Engineer | C | C | C | C | C | C | C | R |

**R**: Responsible, **A**: Accountable, **C**: Consulted, **I**: Informed

### 2.3 Critical Path Analysis

```
Week 1: Infrastructure Foundation (CRITICAL)
Week 2: Data Layer + Infrastructure completion
Week 3: Scrapers + Data Layer completion
Week 4: Scrapers + ML Engine start
Week 5: Scrapers completion + ML + Real-time start
Week 6: ML + Real-time + n8n start
Week 7: Real-time + n8n + Security start
Week 8: n8n + Security + Testing start
Week 9: Security + Testing completion
Week 10: Production deployment + monitoring
```

**Critical Dependencies:**
- Infrastructure → Everything
- Data Layer → Scrapers, ML
- Scrapers → ML training data
- ML → Real-time predictions
- Real-time → n8n event triggers

---

## 3. ARCHITECTURE & INFRASTRUCTURE AS CODE

### 3.1 Cloud Selection: AWS
**Justification:**
- Superior ML services (SageMaker)
- Better scraping infrastructure (Lambda@Edge)
- Mature observability (CloudWatch, X-Ray)
- Cost optimization (Spot instances, Savings Plans)
- Existing team expertise

### 3.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CloudFront CDN                         │
├─────────────────────────────────────────────────────────────┤
│                    Application Load Balancer                │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   API Gateway│  WebSocket   │   ML Serving │   n8n         │
│   (EKS)      │  (EKS)       │   (SageMaker)│   (ECS)       │
├──────────────┴──────────────┴──────────────┴───────────────┤
│                        Data Layer                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ RDS      │  │ Redis    │  │InfluxDB  │  │ S3       │  │
│  │ Postgres │  │ElastiCache│ │TimeStream│  │ Data Lake│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Scraper Infrastructure                   │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ Fargate Scrapers │  │ Proxy Fleet      │               │
│  │ (Playwright)     │  │ (Bright Data)    │               │
│  └──────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Terraform Module Structure

```hcl
# terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   └── prod/
├── modules/
│   ├── networking/
│   │   ├── vpc.tf
│   │   ├── subnets.tf
│   │   ├── security_groups.tf
│   │   └── outputs.tf
│   ├── compute/
│   │   ├── eks.tf
│   │   ├── node_groups.tf
│   │   ├── fargate.tf
│   │   └── autoscaling.tf
│   ├── data/
│   │   ├── rds.tf
│   │   ├── elasticache.tf
│   │   ├── s3.tf
│   │   └── timestream.tf
│   ├── ml/
│   │   ├── sagemaker.tf
│   │   ├── endpoints.tf
│   │   └── training.tf
│   ├── observability/
│   │   ├── cloudwatch.tf
│   │   ├── xray.tf
│   │   └── alerts.tf
│   └── security/
│       ├── kms.tf
│       ├── secrets.tf
│       ├── iam.tf
│       └── waf.tf
└── global/
    ├── state.tf
    └── providers.tf
```

### 3.4 Kubernetes Manifests

```yaml
# k8s/base/
├── namespaces/
│   ├── promoteros-api.yaml
│   ├── promoteros-scrapers.yaml
│   ├── promoteros-realtime.yaml
│   └── promoteros-ml.yaml
├── network-policies/
│   ├── api-ingress.yaml
│   ├── internal-only.yaml
│   └── egress-restrictions.yaml
├── configmaps/
│   ├── app-config.yaml
│   └── feature-flags.yaml
├── secrets/
│   └── sealed-secrets.yaml
├── deployments/
│   ├── api-gateway.yaml
│   ├── websocket-server.yaml
│   ├── scraper-controller.yaml
│   └── ml-inference.yaml
├── services/
│   ├── api-service.yaml
│   ├── websocket-service.yaml
│   └── internal-services.yaml
├── hpa/
│   ├── api-hpa.yaml
│   ├── websocket-hpa.yaml
│   └── scraper-hpa.yaml
└── monitoring/
    ├── service-monitors.yaml
    └── grafana-dashboards.yaml

# k8s/overlays/
├── dev/
│   └── kustomization.yaml
├── staging/
│   └── kustomization.yaml
└── prod/
    ├── kustomization.yaml
    ├── replicas.yaml
    └── resources.yaml
```

### 3.5 Key Infrastructure Configurations

#### EKS Node Groups
```hcl
# modules/compute/node_groups.tf
resource "aws_eks_node_group" "api" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "api-nodes"
  
  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 2
  }
  
  instance_types = ["t3.large"]
  
  labels = {
    workload = "api"
  }
  
  taints {
    key    = "workload"
    value  = "api"
    effect = "NO_SCHEDULE"
  }
}

resource "aws_eks_node_group" "scrapers" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "scraper-nodes"
  
  scaling_config {
    desired_size = 5
    max_size     = 20
    min_size     = 2
  }
  
  instance_types = ["c5.xlarge"]
  capacity_type  = "SPOT"
  
  labels = {
    workload = "scrapers"
  }
}
```

#### RDS Multi-AZ Configuration
```hcl
# modules/data/rds.tf
resource "aws_db_instance" "postgres" {
  identifier     = "promoteros-primary"
  engine         = "postgres"
  engine_version = "15.5"
  instance_class = "db.r6g.xlarge"
  
  allocated_storage     = 100
  storage_encrypted     = true
  storage_type         = "gp3"
  iops                 = 3000
  
  multi_az               = true
  publicly_accessible    = false
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  tags = {
    Environment = var.environment
    Backup      = "critical"
  }
}
```

---

## 4. DATA CONTRACTS & ML SPECIFICATIONS

### 4.1 Database Schema

```sql
-- Core Tables
CREATE TABLE artists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    platform_ids JSONB NOT NULL DEFAULT '{}',
    genres TEXT[],
    location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- ML features
    embedding vector(768),
    
    INDEXES:
    - idx_artists_name_gin ON name gin_trgm_ops
    - idx_artists_embedding ON embedding vector_l2_ops
    - idx_artists_location ON location GIST
);

CREATE TABLE metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID REFERENCES artists(id),
    platform VARCHAR(50) NOT NULL,
    metric_type VARCHAR(100) NOT NULL,
    value NUMERIC NOT NULL,
    metadata JSONB DEFAULT '{}',
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT metrics_time_series UNIQUE (artist_id, platform, metric_type, collected_at)
) PARTITION BY RANGE (collected_at);

CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID REFERENCES artists(id),
    venue_id UUID REFERENCES venues(id),
    model_version VARCHAR(50) NOT NULL,
    
    predicted_demand INTEGER NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    price_recommendation DECIMAL(10,2),
    risk_score DECIMAL(3,2) CHECK (risk_score BETWEEN 0 AND 1),
    
    features JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_predictions_confidence ON confidence_score DESC
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID REFERENCES artists(id),
    venue_id UUID REFERENCES venues(id),
    prediction_id UUID REFERENCES predictions(id),
    
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    scheduled_date DATE NOT NULL,
    capacity INTEGER NOT NULL,
    ticket_price DECIMAL(10,2),
    
    contract_terms JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT booking_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'))
);

-- TimeSeries Tables (InfluxDB)
CREATE TABLE raw_metrics (
    time TIMESTAMPTZ NOT NULL,
    artist_id UUID NOT NULL,
    platform TEXT NOT NULL,
    metric TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    tags JSONB
);

-- Cache Tables (Redis)
-- Keys: artist:{id}:metrics:{platform}
-- Keys: prediction:{venue}:{date}:top
-- Keys: websocket:connections:{user_id}
```

### 4.2 API Contracts

#### Scraper Output Contract
```typescript
interface ScraperResponse {
  platform: 'tiktok' | 'instagram' | 'spotify';
  artist: {
    id: string;
    username: string;
    displayName: string;
    verified: boolean;
    profileUrl: string;
  };
  metrics: {
    followers: number;
    engagement: {
      likes: number;
      comments: number;
      shares: number;
      views?: number;
    };
    content: {
      total: number;
      recent: Array<{
        id: string;
        url: string;
        type: string;
        metrics: {
          views: number;
          likes: number;
          comments: number;
        };
        postedAt: string;
      }>;
    };
    growth: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  metadata: {
    scrapedAt: string;
    scrapeTime: number;
    proxyUsed: string;
    retryCount: number;
  };
}
```

#### ML Prediction API
```typescript
interface PredictionRequest {
  artistId: string;
  venueId: string;
  date: string;
  features?: {
    useHistorical: boolean;
    includeSimilarArtists: boolean;
    seasonalAdjustment: boolean;
  };
}

interface PredictionResponse {
  predictionId: string;
  demand: {
    estimated: number;
    confidence: number;
    range: {
      min: number;
      max: number;
    };
  };
  pricing: {
    recommended: number;
    optimal: number;
    breakeven: number;
  };
  risk: {
    score: number;
    factors: Array<{
      factor: string;
      impact: number;
      mitigation: string;
    }>;
  };
  similarEvents: Array<{
    eventId: string;
    similarity: number;
    outcome: string;
  }>;
  modelMetadata: {
    version: string;
    trainedAt: string;
    features: string[];
  };
}
```

#### WebSocket Events
```typescript
// Client → Server
interface SubscribeEvent {
  type: 'subscribe';
  channels: Array<'metrics' | 'predictions' | 'bookings'>;
  filters?: {
    artistIds?: string[];
    venueIds?: string[];
    platforms?: string[];
  };
}

// Server → Client
interface MetricUpdateEvent {
  type: 'metric_update';
  data: {
    artistId: string;
    platform: string;
    metric: string;
    value: number;
    change: number;
    timestamp: string;
  };
}

interface PredictionUpdateEvent {
  type: 'prediction_update';
  data: {
    predictionId: string;
    artistId: string;
    venueId: string;
    demand: number;
    confidence: number;
  };
}
```

### 4.3 ML Model Specifications

#### Demand Prediction Model
```python
# Feature Engineering Pipeline
FEATURES = {
    'artist_features': [
        'followers_count',
        'engagement_rate',
        'content_frequency',
        'growth_rate_30d',
        'genre_embedding',
        'location_distance'
    ],
    'venue_features': [
        'capacity',
        'historical_fill_rate',
        'location_population',
        'competitor_density'
    ],
    'temporal_features': [
        'day_of_week',
        'month',
        'days_until_event',
        'local_events_count',
        'holiday_flag'
    ],
    'interaction_features': [
        'artist_venue_similarity',
        'genre_venue_match',
        'previous_performance_score'
    ]
}

# Model Architecture
MODEL_CONFIG = {
    'type': 'XGBoost',
    'hyperparameters': {
        'n_estimators': 500,
        'max_depth': 8,
        'learning_rate': 0.05,
        'subsample': 0.8,
        'colsample_bytree': 0.8
    },
    'training': {
        'split_ratio': 0.8,
        'validation_strategy': 'time_series_cv',
        'folds': 5,
        'metrics': ['mae', 'rmse', 'mape']
    },
    'serving': {
        'batch_size': 100,
        'timeout_ms': 500,
        'cache_ttl': 3600
    }
}

# Evaluation Metrics
ACCEPTANCE_CRITERIA = {
    'mape': 15.0,  # ±15% accuracy
    'coverage': 0.95,  # 95% prediction coverage
    'latency_p99': 500,  # 500ms inference
    'drift_threshold': 0.1  # 10% feature drift
}
```

---

## 5. SECURITY & COMPLIANCE

### 5.1 Security Control Mapping

| Control | Implementation | Validation |
|---------|---------------|------------|
| **Network Security** | | |
| Zero Trust Network | Istio service mesh with mTLS | Kiali dashboard |
| WAF | AWS WAF with OWASP rules | WAF metrics |
| DDoS Protection | CloudFlare + AWS Shield | Attack simulations |
| **Application Security** | | |
| Input Validation | Joi schemas + OWASP validators | Fuzzing tests |
| Authentication | JWT with RS256 + refresh tokens | Auth tests |
| Authorization | RBAC with Casbin policies | Policy tests |
| Rate Limiting | Redis-based with sliding window | Load tests |
| **Data Security** | | |
| Encryption at Rest | AES-256 with KMS | Compliance scan |
| Encryption in Transit | TLS 1.3 minimum | SSL Labs scan |
| PII Protection | Field-level encryption | Data audit |
| Secrets Management | AWS Secrets Manager + rotation | Secret scanning |
| **Monitoring** | | |
| Audit Logging | CloudTrail + application logs | Log analysis |
| SIEM | Splunk integration | Alert testing |
| Vulnerability Scanning | Trivy + Snyk + OWASP ZAP | CVE tracking |

### 5.2 Threat Model (STRIDE)

```
┌─────────────────────────────────────────────────────────────┐
│ Threat: Spoofing                                           │
├─────────────────────────────────────────────────────────────┤
│ • Attack: Fake artist profiles                             │
│ • Mitigation: Platform verification + ML anomaly detection │
│ • Risk: Medium                                             │
├─────────────────────────────────────────────────────────────┤
│ Threat: Tampering                                          │
├─────────────────────────────────────────────────────────────┤
│ • Attack: Metric manipulation                              │
│ • Mitigation: Immutable audit logs + checksums            │
│ • Risk: High                                               │
├─────────────────────────────────────────────────────────────┤
│ Threat: Repudiation                                        │
├─────────────────────────────────────────────────────────────┤
│ • Attack: Booking dispute                                  │
│ • Mitigation: Blockchain anchoring + digital signatures    │
│ • Risk: Medium                                             │
├─────────────────────────────────────────────────────────────┤
│ Threat: Information Disclosure                             │
├─────────────────────────────────────────────────────────────┤
│ • Attack: API enumeration                                  │
│ • Mitigation: Rate limiting + field encryption            │
│ • Risk: High                                               │
├─────────────────────────────────────────────────────────────┤
│ Threat: Denial of Service                                  │
├─────────────────────────────────────────────────────────────┤
│ • Attack: Scraper flooding                                 │
│ • Mitigation: Circuit breakers + auto-scaling             │
│ • Risk: High                                               │
├─────────────────────────────────────────────────────────────┤
│ Threat: Elevation of Privilege                             │
├─────────────────────────────────────────────────────────────┤
│ • Attack: JWT manipulation                                 │
│ • Mitigation: Token validation + short expiry             │
│ • Risk: Critical                                           │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Incident Response Playbook

#### P0 - Critical Incident (Data Breach)
```yaml
detection:
  - Alert from SIEM
  - Customer report
  - Anomaly detection

triage: (< 5 minutes)
  - Verify incident
  - Assess scope
  - Activate war room

containment: (< 30 minutes)
  - Isolate affected systems
  - Revoke compromised credentials
  - Enable break-glass access

eradication: (< 2 hours)
  - Patch vulnerabilities
  - Remove malicious code
  - Reset affected accounts

recovery: (< 4 hours)
  - Restore from clean backups
  - Verify system integrity
  - Resume normal operations

lessons_learned: (< 48 hours)
  - Root cause analysis
  - Update playbooks
  - Security improvements
```

---

## 6. TESTING STRATEGY & CI/CD

### 6.1 Test Matrix

| Test Type | Coverage Target | Tools | Frequency |
|-----------|----------------|-------|-----------|
| Unit Tests | 80% | Jest, pytest | Every commit |
| Integration | 70% | Supertest, TestContainers | Every PR |
| Contract | 100% | Pact | Every PR |
| E2E | Critical paths | Playwright | Every deployment |
| Performance | All APIs | K6, Locust | Nightly |
| Security | OWASP Top 10 | ZAP, Burp | Weekly |
| Chaos | Infrastructure | Chaos Monkey | Monthly |

### 6.2 CI/CD Pipeline

```yaml
# .github/workflows/main.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'
          
      - name: Run Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
          
      - name: SAST with Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: auto

  test:
    runs-on: ubuntu-latest
    needs: security-scan
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: true
          
      - name: Check coverage thresholds
        run: |
          coverage=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "Coverage $coverage% is below 80% threshold"
            exit 1
          fi

  build:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to ECR
        run: |
          aws ecr get-login-password --region ${{ env.AWS_REGION }} | \
          docker login --username AWS --password-stdin ${{ env.ECR_REGISTRY }}
      
      - name: Build and push images
        run: |
          # Build images
          docker build -t api -f docker/api.Dockerfile .
          docker build -t scraper -f docker/scraper.Dockerfile .
          docker build -t ml -f docker/ml.Dockerfile .
          
          # Tag images
          docker tag api:latest ${{ env.ECR_REGISTRY }}/promoteros-api:${{ github.sha }}
          docker tag scraper:latest ${{ env.ECR_REGISTRY }}/promoteros-scraper:${{ github.sha }}
          docker tag ml:latest ${{ env.ECR_REGISTRY }}/promoteros-ml:${{ github.sha }}
          
          # Push images
          docker push ${{ env.ECR_REGISTRY }}/promoteros-api:${{ github.sha }}
          docker push ${{ env.ECR_REGISTRY }}/promoteros-scraper:${{ github.sha }}
          docker push ${{ env.ECR_REGISTRY }}/promoteros-ml:${{ github.sha }}

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to staging
        run: |
          # Update kustomization with new image tags
          cd k8s/overlays/staging
          kustomize edit set image \
            api=${{ env.ECR_REGISTRY }}/promoteros-api:${{ github.sha }} \
            scraper=${{ env.ECR_REGISTRY }}/promoteros-scraper:${{ github.sha }} \
            ml=${{ env.ECR_REGISTRY }}/promoteros-ml:${{ github.sha }}
          
          # Apply to cluster
          kubectl apply -k .
          
          # Wait for rollout
          kubectl rollout status deployment/api -n promoteros-staging
          kubectl rollout status deployment/scraper -n promoteros-staging
          kubectl rollout status deployment/ml -n promoteros-staging
      
      - name: Run smoke tests
        run: |
          npm run test:smoke -- --env staging

  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://promoteros.candlefish.ai
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy canary
        run: |
          # Deploy 10% canary
          cd k8s/overlays/prod
          kubectl apply -f canary.yaml
          
          # Monitor metrics for 10 minutes
          npm run monitor:canary -- --duration 600
      
      - name: Full deployment
        run: |
          # Update production images
          cd k8s/overlays/prod
          kustomize edit set image \
            api=${{ env.ECR_REGISTRY }}/promoteros-api:${{ github.sha }} \
            scraper=${{ env.ECR_REGISTRY }}/promoteros-scraper:${{ github.sha }} \
            ml=${{ env.ECR_REGISTRY }}/promoteros-ml:${{ github.sha }}
          
          # Blue-green deployment
          kubectl apply -k .
          kubectl rollout status deployment/api -n promoteros-prod
          
      - name: Run E2E tests
        run: |
          npm run test:e2e -- --env production
      
      - name: Performance tests
        run: |
          npm run test:perf -- --env production --assert-slo
```

### 6.3 Test Examples

#### Unit Test
```javascript
// tests/unit/ml/prediction.test.js
describe('Demand Prediction Model', () => {
  let model;
  
  beforeEach(() => {
    model = new DemandPredictionModel();
  });
  
  test('should predict within 15% accuracy', async () => {
    const features = {
      artistId: 'test-artist',
      followers: 50000,
      engagementRate: 0.05,
      venueCapacity: 2000,
      daysUntilEvent: 30
    };
    
    const prediction = await model.predict(features);
    
    expect(prediction.confidence).toBeGreaterThan(0.8);
    expect(prediction.demand).toBeWithinRange(1700, 2300);
    expect(prediction.mape).toBeLessThan(15);
  });
  
  test('should handle missing features gracefully', async () => {
    const features = {
      artistId: 'test-artist',
      followers: 50000
      // Missing other features
    };
    
    const prediction = await model.predict(features);
    
    expect(prediction.confidence).toBeLessThan(0.5);
    expect(prediction.warnings).toContain('Missing features');
  });
});
```

#### Integration Test
```javascript
// tests/integration/scraper.test.js
describe('TikTok Scraper Integration', () => {
  let scraper;
  let proxyService;
  
  beforeAll(async () => {
    proxyService = await ProxyService.create();
    scraper = new TikTokScraper({ proxyService });
  });
  
  test('should scrape artist profile with retries', async () => {
    const result = await scraper.scrapeProfile('@testartist');
    
    expect(result).toMatchObject({
      platform: 'tiktok',
      artist: {
        username: '@testartist',
        verified: expect.any(Boolean)
      },
      metrics: {
        followers: expect.any(Number),
        engagement: expect.objectContaining({
          likes: expect.any(Number),
          comments: expect.any(Number)
        })
      }
    });
    
    expect(result.metadata.retryCount).toBeLessThanOrEqual(3);
    expect(result.metadata.scrapeTime).toBeLessThan(5000);
  });
});
```

#### E2E Test
```javascript
// tests/e2e/booking-flow.spec.js
import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('should complete booking from search to confirmation', async ({ page }) => {
    // Search for artist
    await page.goto('/');
    await page.fill('[data-testid="artist-search"]', 'Rising Star');
    await page.click('[data-testid="search-button"]');
    
    // View predictions
    await page.waitForSelector('[data-testid="prediction-card"]');
    const predictionCard = page.locator('[data-testid="prediction-card"]').first();
    await expect(predictionCard).toContainText('Demand:');
    await expect(predictionCard).toContainText('Confidence:');
    
    // Initiate booking
    await predictionCard.click();
    await page.click('[data-testid="book-now"]');
    
    // Fill booking details
    await page.fill('[data-testid="venue-select"]', 'The Fillmore');
    await page.fill('[data-testid="date-picker"]', '2025-06-15');
    await page.fill('[data-testid="ticket-price"]', '45');
    
    // Confirm booking
    await page.click('[data-testid="confirm-booking"]');
    
    // Verify confirmation
    await expect(page).toHaveURL(/\/booking\/confirmed/);
    await expect(page.locator('[data-testid="confirmation-message"]'))
      .toContainText('Booking confirmed');
  });
});
```

#### Performance Test
```javascript
// tests/performance/api-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 1000 }, // Stay at 1000
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<200'], // 99% under 200ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
};

export default function () {
  const params = {
    headers: {
      'Authorization': `Bearer ${__ENV.API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
  
  // Test prediction endpoint
  const predictionRes = http.post(
    'https://api.promoteros.com/predictions',
    JSON.stringify({
      artistId: 'test-artist',
      venueId: 'test-venue',
      date: '2025-06-15'
    }),
    params
  );
  
  check(predictionRes, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has prediction data': (r) => JSON.parse(r.body).demand !== undefined,
  });
  
  sleep(1);
}
```

---

## 7. N8N WORKFLOW CATALOG

### 7.1 Repository Structure

```
n8n-workflows/
├── environments/
│   ├── dev/
│   │   ├── credentials.json
│   │   └── variables.json
│   ├── staging/
│   └── prod/
├── workflows/
│   ├── data-ingestion/
│   │   ├── 01-tiktok-scraper.json
│   │   ├── 02-instagram-scraper.json
│   │   ├── 03-spotify-sync.json
│   │   └── 04-data-validation.json
│   ├── ml-pipeline/
│   │   ├── 01-feature-extraction.json
│   │   ├── 02-model-training.json
│   │   ├── 03-batch-prediction.json
│   │   └── 04-model-monitoring.json
│   ├── alerting/
│   │   ├── 01-metric-alerts.json
│   │   ├── 02-error-notifications.json
│   │   ├── 03-sla-monitoring.json
│   │   └── 04-capacity-warnings.json
│   ├── reporting/
│   │   ├── 01-daily-summary.json
│   │   ├── 02-weekly-analytics.json
│   │   ├── 03-revenue-report.json
│   │   └── 04-artist-insights.json
│   └── maintenance/
│       ├── 01-backup-automation.json
│       ├── 02-cleanup-jobs.json
│       ├── 03-health-checks.json
│       └── 04-certificate-renewal.json
├── templates/
│   ├── error-handler.json
│   ├── retry-logic.json
│   └── notification.json
├── scripts/
│   ├── deploy.sh
│   ├── backup.sh
│   └── validate.py
└── docs/
    ├── conventions.md
    ├── troubleshooting.md
    └── runbooks/
```

### 7.2 Core Workflow Patterns

#### Data Ingestion Workflow
```json
{
  "name": "TikTok Data Ingestion",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{ "field": "minutes", "value": 15 }]
        }
      }
    },
    {
      "name": "Get Artist Queue",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT * FROM artist_queue WHERE platform='tiktok' AND status='pending' LIMIT 10"
      }
    },
    {
      "name": "Scrape TikTok",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "={{$env.SCRAPER_API_URL}}/tiktok",
        "body": "={{$json}}",
        "timeout": 30000
      }
    },
    {
      "name": "Validate Data",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Data validation logic\nconst schema = {...};\nreturn items.filter(item => validate(item, schema));"
      }
    },
    {
      "name": "Store Metrics",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "insert",
        "table": "metrics",
        "columns": "artist_id,platform,metric_type,value,collected_at"
      }
    },
    {
      "name": "Error Handler",
      "type": "n8n-nodes-base.errorTrigger",
      "parameters": {
        "errorMessage": "={{$json.error}}",
        "continueOnFail": true
      }
    },
    {
      "name": "Send Alert",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#alerts",
        "text": "Scraping failed: {{$json.error}}"
      }
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [["Get Artist Queue"]]
    },
    "Get Artist Queue": {
      "main": [["Scrape TikTok"]]
    },
    "Scrape TikTok": {
      "main": [["Validate Data"]],
      "error": [["Error Handler"]]
    },
    "Validate Data": {
      "main": [["Store Metrics"]]
    },
    "Error Handler": {
      "main": [["Send Alert"]]
    }
  }
}
```

#### ML Pipeline Workflow
```json
{
  "name": "Daily Model Training",
  "nodes": [
    {
      "name": "Daily Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{ "field": "days", "value": 1, "hour": 2 }]
        }
      }
    },
    {
      "name": "Extract Features",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "={{$env.ML_API_URL}}/features/extract",
        "body": {
          "date_range": "last_30_days",
          "feature_set": "demand_prediction_v2"
        }
      }
    },
    {
      "name": "Train Model",
      "type": "n8n-nodes-base.awsLambda",
      "parameters": {
        "function": "promoteros-ml-training",
        "payload": "={{$json}}"
      }
    },
    {
      "name": "Evaluate Model",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Model evaluation\nconst metrics = calculateMetrics($json);\nif (metrics.mape > 15) throw new Error('Model accuracy below threshold');\nreturn [{json: metrics}];"
      }
    },
    {
      "name": "Deploy Model",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "={{$env.SAGEMAKER_ENDPOINT}}/deploy",
        "body": {
          "model_artifact": "={{$json.model_url}}",
          "endpoint_name": "demand-prediction-prod"
        }
      }
    },
    {
      "name": "Update Registry",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "insert",
        "table": "model_registry",
        "columns": "version,metrics,deployed_at,status"
      }
    }
  ]
}
```

### 7.3 Workflow Conventions

```markdown
# n8n Workflow Conventions

## Naming
- Format: `{priority}-{category}-{action}.json`
- Examples: `01-data-tiktok-ingestion.json`, `02-ml-training-daily.json`

## Error Handling
- All workflows must have error handlers
- Use exponential backoff for retries
- Log all errors to centralized system

## Credentials
- Never hardcode credentials
- Use environment-specific credential sets
- Rotate credentials monthly

## Monitoring
- Add execution time tracking
- Log workflow metrics to InfluxDB
- Set up alerts for failed executions

## Testing
- Test workflows in dev before promotion
- Use mock data for development
- Validate outputs with schemas
```

---

## 8. TIMELINE & RESOURCING

### 8.1 Sprint Plan

| Sprint | Week | Focus | Deliverables | Team |
|--------|------|-------|--------------|------|
| 1 | 1-2 | Foundation | Infrastructure, CI/CD | DevOps + Backend |
| 2 | 2-3 | Data Layer | Database, migrations | Backend + DBA |
| 3 | 3-4 | Scrapers | TikTok, Instagram | Backend + QA |
| 4 | 4-5 | Scrapers + ML | Spotify, ML pipeline | Backend + ML |
| 5 | 5-6 | ML + Real-time | Model training, WebSockets | ML + Backend |
| 6 | 6-7 | Real-time + n8n | Streaming, workflows | Backend + DevOps |
| 7 | 7-8 | n8n + Security | Automation, hardening | DevOps + Security |
| 8 | 8-9 | Testing | E2E, performance | QA + All |
| 9 | 9-10 | Production | Deployment, monitoring | All |
| 10 | 10 | Launch | Go-live, support | All |

### 8.2 Budget Breakdown

```
Total Budget: $176,000

Personnel (70%): $123,200
├── Tech Lead:        $25,000 (10 weeks @ $2,500/week)
├── DevOps Engineer:  $22,000 (10 weeks @ $2,200/week)
├── Backend Eng x2:   $40,000 (10 weeks @ $2,000/week each)
├── ML Engineer:      $18,000 (9 weeks @ $2,000/week)
├── Frontend Eng:     $12,000 (6 weeks @ $2,000/week)
└── QA Engineer:      $6,200  (4 weeks @ $1,550/week)

Infrastructure (20%): $35,200
├── AWS Compute:      $8,000/month x 3 = $24,000
├── Data Transfer:    $2,000/month x 3 = $6,000
├── Proxy Services:   $1,000/month x 3 = $3,000
├── Monitoring:       $400/month x 3 = $1,200
└── Backups:          $300/month x 3 = $900

Tools & Licenses (5%): $8,800
├── GitHub Enterprise: $2,100
├── Snyk:             $1,200
├── DataDog:          $3,000
├── n8n Cloud:        $1,500
└── SSL Certificates: $1,000

Contingency (5%): $8,800
```

### 8.3 Cloud Cost Model

```
Monthly AWS Costs (Production)

Compute:
├── EKS Nodes (6x m5.xlarge):           $1,040
├── Fargate Scrapers (20 tasks):        $800
├── SageMaker Endpoints (2x ml.m5.xl):  $680
└── Lambda (1M invocations):            $200

Storage:
├── RDS Postgres (db.r6g.xlarge):       $750
├── ElastiCache Redis (3 nodes):        $450
├── S3 (1TB + requests):                $250
└── EBS Volumes (2TB):                  $200

Networking:
├── ALB (2x):                           $50
├── NAT Gateway:                        $135
├── CloudFront (10TB):                  $850
└── Data Transfer:                      $500

Monitoring:
├── CloudWatch Logs (500GB):            $250
├── X-Ray Traces:                       $50
└── CloudWatch Metrics:                 $30

Total Monthly: ~$6,235
3-Month Projection: $18,705
```

---

## 9. RISK REGISTER

| Risk | Likelihood | Impact | Score | Mitigation | Owner |
|------|------------|--------|-------|------------|-------|
| **Platform API Changes** | High | High | 9 | Abstraction layer, versioning, monitoring | Backend Lead |
| **ML Model Drift** | Medium | High | 6 | Continuous monitoring, auto-retraining | ML Engineer |
| **DDoS Attack** | Medium | High | 6 | CloudFlare, rate limiting, auto-scaling | DevOps |
| **Data Breach** | Low | Critical | 8 | Encryption, access controls, auditing | Security Lead |
| **Proxy Detection** | High | Medium | 6 | Residential proxies, rotation, fingerprinting | Backend |
| **Cost Overrun** | Medium | Medium | 4 | Budget alerts, reserved instances, monitoring | Tech Lead |
| **Team Attrition** | Low | High | 4 | Documentation, pair programming, backups | Tech Lead |
| **Compliance Violation** | Low | High | 4 | Legal review, data governance, training | Compliance |
| **Service Outage** | Medium | High | 6 | Multi-AZ, DR plan, chaos testing | DevOps |
| **Performance Degradation** | Medium | Medium | 4 | APM, autoscaling, caching | Backend |

**Risk Response Strategies:**
- **Accept**: Risks with score < 4
- **Mitigate**: Risks with score 4-6
- **Urgent Action**: Risks with score > 6

---

## 10. GO-LIVE READINESS CHECKLIST

### 10.1 Pre-Launch (T-7 Days)

- [ ] **Infrastructure**
  - [ ] All services deployed to production
  - [ ] Auto-scaling configured and tested
  - [ ] Backups automated and verified
  - [ ] DR plan tested with failover
  
- [ ] **Security**
  - [ ] Penetration test completed
  - [ ] OWASP scan passing
  - [ ] SSL certificates valid
  - [ ] WAF rules active
  
- [ ] **Data**
  - [ ] Production data migrated
  - [ ] Indexes optimized
  - [ ] Cache warmed
  - [ ] Backup verified

- [ ] **Testing**
  - [ ] E2E tests passing
  - [ ] Performance SLOs met
  - [ ] Load test at 2x capacity
  - [ ] Chaos engineering scenarios

### 10.2 Launch Day (T-0)

```bash
# Launch Runbook

## 06:00 - Pre-flight Checks
- [ ] Verify all health checks green
- [ ] Check monitoring dashboards
- [ ] Confirm on-call rotation
- [ ] Review rollback procedure

## 08:00 - DNS Cutover
- [ ] Update DNS records
- [ ] Monitor propagation
- [ ] Verify SSL certificates
- [ ] Test all endpoints

## 09:00 - Gradual Rollout
- [ ] Enable 10% traffic
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify data flow

## 10:00 - Scale Up
- [ ] Increase to 50% traffic
- [ ] Monitor infrastructure
- [ ] Check scraper success rates
- [ ] Verify ML predictions

## 12:00 - Full Launch
- [ ] Route 100% traffic
- [ ] Announce go-live
- [ ] Monitor all systems
- [ ] Stand by for issues

## 14:00 - Stabilization
- [ ] Review metrics
- [ ] Address any issues
- [ ] Update documentation
- [ ] Team retrospective
```

### 10.3 Post-Launch (T+7 Days)

- [ ] **Operations**
  - [ ] 24/7 monitoring active
  - [ ] Alerts tuned
  - [ ] Runbooks updated
  - [ ] On-call rotation working

- [ ] **Performance**
  - [ ] SLOs consistently met
  - [ ] No critical bugs
  - [ ] User feedback positive
  - [ ] Cost within budget

- [ ] **Documentation**
  - [ ] API docs published
  - [ ] User guides complete
  - [ ] Admin manual ready
  - [ ] Training completed

### 10.4 Success Criteria

```yaml
launch_success_metrics:
  availability: ">99.9% in first 48 hours"
  api_latency: "<200ms p99"
  error_rate: "<1%"
  scraper_success: ">95%"
  ml_accuracy: "MAPE <15%"
  concurrent_users: "Handle 1000+"
  data_freshness: "<5 minutes"
  
business_metrics:
  bookings_created: ">10 in first week"
  active_users: ">100 daily"
  platform_coverage: "3/3 platforms active"
  prediction_usage: ">50% of searches"
```

---

## APPENDICES

### A. Contact Information

| Role | Name | Email | Phone | Escalation |
|------|------|-------|-------|------------|
| Tech Lead | TBD | lead@promoteros.com | TBD | Primary |
| DevOps | TBD | devops@promoteros.com | TBD | Infrastructure |
| Security | TBD | security@promoteros.com | TBD | Incidents |
| On-Call | Rotation | oncall@promoteros.com | TBD | 24/7 |

### B. Critical Dependencies

- AWS Account: 681214184463
- Domain: promoteros.candlefish.ai
- GitHub Repo: candlefish-ai/promoteros
- Monitoring: CloudWatch + Grafana
- Secrets: AWS Secrets Manager

### C. Compliance Requirements

- GDPR: User consent for data processing
- CCPA: California privacy rights
- PCI DSS: Not required (no payment processing)
- SOC 2: Future consideration

### D. Disaster Recovery

- **RPO**: 1 hour (maximum data loss)
- **RTO**: 4 hours (maximum downtime)
- **Backup Strategy**: Automated daily, retained 30 days
- **Failover**: Multi-AZ automatic, multi-region manual

---

**Document Status**: FINAL  
**Next Review**: Post-Launch + 30 days  
**Owner**: PromoterOS Technical Team  
**Approval**: Pending stakeholder sign-off

END OF PRODUCTION HANDOFF MASTERPLAN
