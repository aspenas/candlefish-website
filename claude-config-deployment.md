# Claude Configuration Dashboard - Deployment Guide

## Infrastructure Overview

The Claude Configuration Dashboard is designed for cloud-native deployment on AWS with Kubernetes orchestration, supporting high availability, auto-scaling, and zero-downtime deployments.

```mermaid
graph TB
    subgraph "AWS Cloud Infrastructure"
        subgraph "Route 53"
            DNS[DNS Management<br/>claude-config.candlefish.ai<br/>Health Checks]
        end
        
        subgraph "CloudFront CDN"
            CDN[Global CDN<br/>Static Assets<br/>Edge Caching]
        end
        
        subgraph "Application Load Balancer"
            ALB[AWS ALB<br/>SSL Termination<br/>Multi-AZ]
        end
        
        subgraph "EKS Cluster - us-east-1"
            subgraph "Control Plane"
                CP[EKS Control Plane<br/>Managed Service]
            end
            
            subgraph "Node Groups"
                NG1[API Services<br/>t3.large x 3-10<br/>Auto Scaling]
                NG2[Processing Services<br/>c5.xlarge x 2-8<br/>CPU Optimized]
                NG3[WebSocket Services<br/>r5.large x 2-6<br/>Memory Optimized]
            end
        end
        
        subgraph "Data Layer"
            RDS[(RDS PostgreSQL<br/>Multi-AZ<br/>Read Replicas)]
            REDIS[(ElastiCache Redis<br/>Cluster Mode<br/>6 Nodes)]
            S3[(S3 Bucket<br/>Config Backups<br/>Static Assets)]
        end
        
        subgraph "Monitoring"
            CW[CloudWatch<br/>Logs & Metrics]
            PROM[Prometheus<br/>Grafana<br/>AlertManager]
        end
        
        subgraph "Security"
            SECRETS[Secrets Manager<br/>API Keys<br/>Database Creds]
            IAM[IAM Roles<br/>Service Auth<br/>IRSA]
        end
    end

    DNS --> CDN
    CDN --> ALB
    ALB --> NG1
    ALB --> NG2
    ALB --> NG3
    
    NG1 --> RDS
    NG1 --> REDIS
    NG2 --> RDS
    NG3 --> REDIS
    
    NG1 --> S3
    NG2 --> S3
    
    NG1 --> SECRETS
    NG2 --> SECRETS
    NG3 --> SECRETS
    
    NG1 --> CW
    NG2 --> CW
    NG3 --> CW
    
    PROM --> NG1
    PROM --> NG2
    PROM --> NG3
```

## Kubernetes Deployment Manifests

### Namespace and RBAC

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: claude-config
  labels:
    name: claude-config
    istio-injection: enabled
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: claude-config-sa
  namespace: claude-config
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT:role/claude-config-irsa-role
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: claude-config-role
rules:
- apiGroups: [""]
  resources: ["secrets", "configmaps", "services", "endpoints"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: claude-config-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: claude-config-role
subjects:
- kind: ServiceAccount
  name: claude-config-sa
  namespace: claude-config
```

### ConfigMap and Secrets

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: claude-config-env
  namespace: claude-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  API_VERSION: "v2"
  CORS_ORIGINS: "https://claude-config.candlefish.ai,https://app.candlefish.ai"
  RATE_LIMIT_WINDOW_MS: "3600000"
  RATE_LIMIT_MAX_REQUESTS: "1000"
  WEBSOCKET_HEARTBEAT_INTERVAL: "30000"
  REDIS_CLUSTER_MODE: "true"
  DATABASE_POOL_MAX: "20"
  DATABASE_POOL_MIN: "5"
  KAFKA_BROKERS: "kafka-cluster-kafka-bootstrap:9092"
  PROMETHEUS_METRICS_PORT: "9090"
  HEALTH_CHECK_INTERVAL: "30000"
---
apiVersion: v1
kind: Secret
metadata:
  name: claude-config-secrets
  namespace: claude-config
type: Opaque
stringData:
  JWT_SECRET: "${JWT_SECRET}"
  DATABASE_URL: "${DATABASE_URL}"
  REDIS_URL: "${REDIS_URL}"
  AWS_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID}"
  AWS_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY}"
  ANTHROPIC_API_KEY: "${ANTHROPIC_API_KEY}"
  OPENAI_API_KEY: "${OPENAI_API_KEY}"
```

### API Gateway Deployment

```yaml
# api-gateway.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: claude-config-api
  namespace: claude-config
  labels:
    app: claude-config-api
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1
  selector:
    matchLabels:
      app: claude-config-api
  template:
    metadata:
      labels:
        app: claude-config-api
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: claude-config-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      containers:
      - name: api
        image: candlefish/claude-config-api:${IMAGE_TAG}
        ports:
        - containerPort: 8000
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: PORT
          value: "8000"
        envFrom:
        - configMapRef:
            name: claude-config-env
        - secretRef:
            name: claude-config-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "200m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
      terminationGracePeriodSeconds: 30
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - claude-config-api
              topologyKey: kubernetes.io/hostname
---
apiVersion: v1
kind: Service
metadata:
  name: claude-config-api-service
  namespace: claude-config
  labels:
    app: claude-config-api
spec:
  selector:
    app: claude-config-api
  ports:
  - name: http
    port: 80
    targetPort: 8000
    protocol: TCP
  - name: metrics
    port: 9090
    targetPort: 9090
    protocol: TCP
  type: ClusterIP
```

### WebSocket Service Deployment

```yaml
# websocket-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: claude-config-websocket
  namespace: claude-config
  labels:
    app: claude-config-websocket
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero downtime for WebSocket connections
  selector:
    matchLabels:
      app: claude-config-websocket
  template:
    metadata:
      labels:
        app: claude-config-websocket
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      serviceAccountName: claude-config-sa
      containers:
      - name: websocket
        image: candlefish/claude-config-websocket:${IMAGE_TAG}
        ports:
        - containerPort: 8007
          name: websocket
        - containerPort: 9090
          name: metrics
        env:
        - name: PORT
          value: "8007"
        - name: WEBSOCKET_ADAPTER
          value: "redis"
        envFrom:
        - configMapRef:
            name: claude-config-env
        - secretRef:
            name: claude-config-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8007
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8007
          initialDelaySeconds: 5
          periodSeconds: 5
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"] # Graceful shutdown
      terminationGracePeriodSeconds: 45
---
apiVersion: v1
kind: Service
metadata:
  name: claude-config-websocket-service
  namespace: claude-config
  labels:
    app: claude-config-websocket
spec:
  selector:
    app: claude-config-websocket
  ports:
  - name: websocket
    port: 80
    targetPort: 8007
    protocol: TCP
  sessionAffinity: ClientIP  # Sticky sessions for WebSocket
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
```

### Analytics Service Deployment

```yaml
# analytics-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: claude-config-analytics
  namespace: claude-config
  labels:
    app: claude-config-analytics
    version: v1
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: claude-config-analytics
  template:
    metadata:
      labels:
        app: claude-config-analytics
        version: v1
    spec:
      serviceAccountName: claude-config-sa
      containers:
      - name: analytics
        image: candlefish/claude-config-analytics:${IMAGE_TAG}
        ports:
        - containerPort: 8004
          name: http
        env:
        - name: PORT
          value: "8004"
        - name: KAFKA_CONSUMER_GROUP
          value: "analytics-processor"
        envFrom:
        - configMapRef:
            name: claude-config-env
        - secretRef:
            name: claude-config-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "300m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8004
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8004
          initialDelaySeconds: 10
          periodSeconds: 5
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/instance-type
                operator: In
                values:
                - c5.large
                - c5.xlarge
```

### Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: claude-config-api-hpa
  namespace: claude-config
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: claude-config-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: claude-config-websocket-hpa
  namespace: claude-config
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: claude-config-websocket
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Pods
    pods:
      metric:
        name: websocket_connections
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 120
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 600  # Slower scale down for WebSocket
      policies:
      - type: Pods
        value: 1
        periodSeconds: 180
```

### Ingress Configuration

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: claude-config-ingress
  namespace: claude-config
  annotations:
    kubernetes.io/ingress.class: "alb"
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/backend-protocol: HTTP
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID
    alb.ingress.kubernetes.io/load-balancer-name: claude-config-alb
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: '30'
    alb.ingress.kubernetes.io/healthy-threshold-count: '2'
    alb.ingress.kubernetes.io/unhealthy-threshold-count: '3'
spec:
  rules:
  - host: claude-config.candlefish.ai
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: claude-config-api-service
            port:
              number: 80
      - path: /ws
        pathType: Prefix
        backend:
          service:
            name: claude-config-websocket-service
            port:
              number: 80
      - path: /
        pathType: Prefix
        backend:
          service:
            name: claude-config-frontend-service
            port:
              number: 80
  tls:
  - hosts:
    - claude-config.candlefish.ai
```

## Database Setup & Migration

### RDS PostgreSQL Configuration

```yaml
# terraform/rds.tf
resource "aws_db_instance" "claude_config_primary" {
  identifier = "claude-config-primary"
  
  # Engine
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  
  # Storage
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.rds_key.arn
  
  # Database
  db_name  = "claude_config"
  username = "postgres"
  password = var.db_password
  
  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  # Backup
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  # Multi-AZ
  multi_az = true
  
  # Performance Insights
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  # Parameters
  parameter_group_name = aws_db_parameter_group.claude_config.name
  
  # Deletion protection
  deletion_protection = true
  
  tags = {
    Name        = "claude-config-primary"
    Environment = "production"
    Service     = "claude-config"
  }
}

resource "aws_db_instance" "claude_config_read_replica" {
  count = 2
  
  identifier = "claude-config-read-replica-${count.index + 1}"
  
  # Source
  replicate_source_db = aws_db_instance.claude_config_primary.identifier
  
  # Instance
  instance_class = "db.r6g.large"
  
  # Multi-AZ for read replicas
  multi_az = false
  
  # Performance Insights
  performance_insights_enabled = true
  
  tags = {
    Name        = "claude-config-read-replica-${count.index + 1}"
    Environment = "production"
    Service     = "claude-config"
    Type        = "read-replica"
  }
}

resource "aws_db_parameter_group" "claude_config" {
  family = "postgres15"
  name   = "claude-config-params"

  parameter {
    name  = "shared_preload_libraries"
    value = "timescaledb,pg_stat_statements"
  }

  parameter {
    name  = "max_connections"
    value = "500"
  }

  parameter {
    name  = "work_mem"
    value = "32MB"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "256MB"
  }

  parameter {
    name  = "effective_cache_size"
    value = "6GB"
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log slow queries > 1s
  }
}
```

### Database Migration Job

```yaml
# migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: claude-config-migration-${TIMESTAMP}
  namespace: claude-config
  labels:
    app: claude-config-migration
spec:
  ttlSecondsAfterFinished: 86400  # Clean up after 24 hours
  backoffLimit: 3
  template:
    metadata:
      labels:
        app: claude-config-migration
    spec:
      restartPolicy: Never
      serviceAccountName: claude-config-sa
      initContainers:
      - name: wait-for-db
        image: postgres:15
        env:
        - name: PGHOST
          valueFrom:
            secretKeyRef:
              name: claude-config-secrets
              key: DB_HOST
        - name: PGUSER
          valueFrom:
            secretKeyRef:
              name: claude-config-secrets
              key: DB_USER
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: claude-config-secrets
              key: DB_PASSWORD
        command:
        - sh
        - -c
        - |
          until pg_isready -h $PGHOST -U $PGUSER; do
            echo "Waiting for database..."
            sleep 5
          done
          echo "Database is ready!"
      containers:
      - name: migrate
        image: candlefish/claude-config-migrator:${IMAGE_TAG}
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: claude-config-secrets
              key: DATABASE_URL
        - name: MIGRATION_MODE
          value: "up"
        command:
        - /app/migrate
        - --verbose
        - --timeout=300s
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
```

## Redis ElastiCache Setup

```yaml
# terraform/redis.tf
resource "aws_elasticache_subnet_group" "claude_config" {
  name       = "claude-config-cache-subnet"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_parameter_group" "claude_config" {
  name   = "claude-config-redis-params"
  family = "redis7.x"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "60"
  }
}

resource "aws_elasticache_replication_group" "claude_config" {
  replication_group_id       = "claude-config-redis"
  description                = "Redis cluster for Claude Config Dashboard"
  
  # Node configuration
  node_type               = "cache.r7g.large"
  port                    = 6379
  parameter_group_name    = aws_elasticache_parameter_group.claude_config.name
  
  # Cluster configuration
  num_cache_clusters      = 3
  
  # Multi-AZ
  multi_az_enabled       = true
  automatic_failover_enabled = true
  
  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.redis_auth_token
  
  # Network
  subnet_group_name = aws_elasticache_subnet_group.claude_config.name
  security_group_ids = [aws_security_group.redis.id]
  
  # Backup
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  
  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }
  
  tags = {
    Name        = "claude-config-redis"
    Environment = "production"
    Service     = "claude-config"
  }
}
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy Claude Config Dashboard

on:
  push:
    branches: [main]
    paths-ignore: ['docs/**', '*.md']
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  EKS_CLUSTER_NAME: candlefish-production
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com
  IMAGE_TAG: ${{ github.sha }}

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: claude_config_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run typecheck
    
    - name: Run unit tests
      run: npm run test:unit
      env:
        DATABASE_URL: postgresql://postgres:test@localhost:5432/claude_config_test
        REDIS_URL: redis://localhost:6379
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgresql://postgres:test@localhost:5432/claude_config_test
        REDIS_URL: redis://localhost:6379
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  build-and-push:
    name: Build and Push Images
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    
    strategy:
      matrix:
        service: [api, websocket, analytics, frontend]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v2
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Build and push image
      uses: docker/build-push-action@v5
      with:
        context: .
        file: ./docker/Dockerfile.${{ matrix.service }}
        push: true
        tags: |
          ${{ env.ECR_REGISTRY }}/claude-config-${{ matrix.service }}:${{ env.IMAGE_TAG }}
          ${{ env.ECR_REGISTRY }}/claude-config-${{ matrix.service }}:latest
        cache-from: type=gha
        cache-to: type=gha,mode=max
        platforms: linux/amd64,linux/arm64

  deploy:
    name: Deploy to EKS
    runs-on: ubuntu-latest
    needs: [build-and-push]
    environment: production
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Update kubeconfig
      run: |
        aws eks update-kubeconfig --region ${{ env.AWS_REGION }} --name ${{ env.EKS_CLUSTER_NAME }}
    
    - name: Install Helm
      uses: azure/setup-helm@v3
      with:
        version: '3.12.0'
    
    - name: Run database migrations
      run: |
        kubectl apply -f k8s/migration-job.yaml
        kubectl wait --for=condition=complete job/claude-config-migration-$(date +%s) --timeout=600s
    
    - name: Deploy application
      run: |
        helm upgrade --install claude-config ./helm/claude-config \
          --namespace claude-config \
          --create-namespace \
          --set image.tag=${{ env.IMAGE_TAG }} \
          --set ingress.host=claude-config.candlefish.ai \
          --values helm/values/production.yaml \
          --wait --timeout=10m
    
    - name: Verify deployment
      run: |
        kubectl rollout status deployment/claude-config-api -n claude-config --timeout=300s
        kubectl rollout status deployment/claude-config-websocket -n claude-config --timeout=300s
        kubectl rollout status deployment/claude-config-analytics -n claude-config --timeout=300s
    
    - name: Run health checks
      run: |
        kubectl run health-check --image=curlimages/curl:latest --rm -i --restart=Never -- \
          curl -f http://claude-config-api-service.claude-config.svc.cluster.local/health
    
    - name: Notify deployment success
      if: success()
      uses: 8398a7/action-slack@v3
      with:
        status: success
        text: "✅ Claude Config Dashboard deployment successful"
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
    
    - name: Notify deployment failure
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: failure
        text: "❌ Claude Config Dashboard deployment failed"
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Monitoring & Observability

### Prometheus Configuration

```yaml
# monitoring/prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
      external_labels:
        cluster: 'candlefish-production'
        service: 'claude-config'

    rule_files:
      - "/etc/prometheus/rules/*.yml"

    scrape_configs:
    # Kubernetes API server
    - job_name: 'kubernetes-api'
      kubernetes_sd_configs:
      - role: endpoints
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        insecure_skip_verify: true
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: default;kubernetes;https

    # Claude Config services
    - job_name: 'claude-config-api'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names: ['claude-config']
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: claude-config-api
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

    # WebSocket services
    - job_name: 'claude-config-websocket'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names: ['claude-config']
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: claude-config-websocket

    # PostgreSQL
    - job_name: 'postgresql'
      static_configs:
      - targets: ['postgres-exporter:9187']
      scrape_interval: 30s

    # Redis
    - job_name: 'redis'
      static_configs:
      - targets: ['redis-exporter:9121']
      scrape_interval: 30s

    alerting:
      alertmanagers:
      - static_configs:
        - targets: ['alertmanager:9093']

  alerts.yml: |
    groups:
    - name: claude-config-alerts
      rules:
      - alert: HighErrorRate
        expr: |
          (
            rate(http_requests_total{job="claude-config-api",code=~"5.."}[5m]) /
            rate(http_requests_total{job="claude-config-api"}[5m])
          ) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for the last 5 minutes"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="claude-config-api"}[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is {{ $value }}s"

      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_numbackends{datname="claude_config"} > 400
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"
          description: "Database has {{ $value }} active connections"

      - alert: RedisMemoryUsageHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage high"
          description: "Redis memory usage is {{ $value | humanizePercentage }}"

      - alert: PodRestartingTooMuch
        expr: rate(kube_pod_container_status_restarts_total{namespace="claude-config"}[15m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod restarting too much"
          description: "Pod {{ $labels.pod }} is restarting frequently"
```

This comprehensive deployment guide provides everything needed to deploy the Claude Configuration Dashboard to production AWS infrastructure with proper monitoring, security, and scalability considerations.