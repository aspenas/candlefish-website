#!/bin/bash

# Security Dashboard - Staging Deployment Script
# Deploys the complete security operations platform to staging environment

set -euo pipefail

# Configuration
NAMESPACE="security-dashboard-staging"
CLUSTER_NAME="security-ops-staging"
REGION="us-east-1"
IMAGE_TAG="${IMAGE_TAG:-staging-$(git rev-parse --short HEAD)}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Pre-flight checks
preflight_checks() {
    log_info "Running pre-flight checks..."
    
    # Check required tools
    for tool in kubectl docker helm terraform aws; do
        if ! command -v $tool &> /dev/null; then
            log_error "$tool is not installed"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_warning "Kubernetes cluster not accessible, attempting to configure..."
        configure_kubectl
    fi
    
    log_success "Pre-flight checks passed"
}

# Configure kubectl for staging cluster
configure_kubectl() {
    log_info "Configuring kubectl for staging cluster..."
    
    # Update kubeconfig for EKS
    aws eks update-kubeconfig \
        --region $REGION \
        --name $CLUSTER_NAME \
        --alias staging-security-dashboard
    
    # Verify connection
    kubectl cluster-info
    log_success "kubectl configured successfully"
}

# Create namespace and configure RBAC
setup_namespace() {
    log_info "Setting up namespace and RBAC..."
    
    # Create namespace if not exists
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Label namespace for monitoring
    kubectl label namespace $NAMESPACE \
        environment=staging \
        app=security-dashboard \
        monitoring=enabled \
        --overwrite
    
    # Create service account
    kubectl -n $NAMESPACE create serviceaccount security-dashboard-sa --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "Namespace configured"
}

# Deploy secrets and configmaps
deploy_configs() {
    log_info "Deploying configurations and secrets..."
    
    # Create secrets from AWS Secrets Manager
    log_info "Fetching secrets from AWS Secrets Manager..."
    
    # Database credentials
    DB_SECRET=$(aws secretsmanager get-secret-value --secret-id security-dashboard/staging/db --query SecretString --output text)
    kubectl -n $NAMESPACE create secret generic db-credentials \
        --from-literal=password="$DB_SECRET" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # JWT signing keys
    JWT_SECRET=$(aws secretsmanager get-secret-value --secret-id security-dashboard/staging/jwt --query SecretString --output text)
    kubectl -n $NAMESPACE create secret generic jwt-keys \
        --from-literal=private-key="$JWT_SECRET" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Create ConfigMap for application config
    kubectl -n $NAMESPACE create configmap app-config \
        --from-literal=environment=staging \
        --from-literal=log_level=info \
        --from-literal=graphql_endpoint=https://api-staging.security-dashboard.io/graphql \
        --from-literal=websocket_endpoint=wss://ws-staging.security-dashboard.io \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "Configurations deployed"
}

# Build and push Docker images
build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    # Get ECR repository URL
    ECR_REPO=$(aws ecr describe-repositories --repository-names security-dashboard --query 'repositories[0].repositoryUri' --output text)
    
    # Login to ECR
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REPO
    
    # Build images
    log_info "Building frontend image..."
    docker build -t $ECR_REPO:frontend-$IMAGE_TAG -f Dockerfile.frontend .
    
    log_info "Building backend image..."
    docker build -t $ECR_REPO:backend-$IMAGE_TAG -f deployment/docker/Dockerfile.backend ../../
    
    # Push images
    log_info "Pushing images to ECR..."
    docker push $ECR_REPO:frontend-$IMAGE_TAG
    docker push $ECR_REPO:backend-$IMAGE_TAG
    
    log_success "Images built and pushed successfully"
}

# Deploy databases
deploy_databases() {
    log_info "Deploying database services..."
    
    # Deploy TimescaleDB
    log_info "Deploying TimescaleDB..."
    kubectl apply -f deployment/k8s/security-dashboard/12-timescaledb-deployment.yaml -n $NAMESPACE
    
    # Deploy Neo4j
    log_info "Deploying Neo4j..."
    kubectl apply -f deployment/k8s/security-dashboard/13-neo4j-deployment.yaml -n $NAMESPACE
    
    # Deploy Redis
    log_info "Deploying Redis cache..."
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: $NAMESPACE
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
EOF
    
    # Wait for databases to be ready
    log_info "Waiting for databases to be ready..."
    kubectl -n $NAMESPACE wait --for=condition=ready pod -l app=timescaledb --timeout=300s
    kubectl -n $NAMESPACE wait --for=condition=ready pod -l app=neo4j --timeout=300s
    kubectl -n $NAMESPACE wait --for=condition=ready pod -l app=redis --timeout=300s
    
    log_success "Databases deployed and ready"
}

# Deploy Kafka
deploy_kafka() {
    log_info "Deploying Kafka event streaming..."
    
    kubectl apply -f deployment/k8s/security-dashboard/14-kafka-deployment.yaml -n $NAMESPACE
    
    # Wait for Kafka to be ready
    kubectl -n $NAMESPACE wait --for=condition=ready pod -l app=kafka --timeout=300s
    
    log_success "Kafka deployed successfully"
}

# Deploy application services
deploy_applications() {
    log_info "Deploying application services..."
    
    ECR_REPO=$(aws ecr describe-repositories --repository-names security-dashboard --query 'repositories[0].repositoryUri' --output text)
    
    # Deploy backend GraphQL API
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: graphql-api
  namespace: $NAMESPACE
spec:
  replicas: 3
  selector:
    matchLabels:
      app: graphql-api
  template:
    metadata:
      labels:
        app: graphql-api
    spec:
      serviceAccountName: security-dashboard-sa
      containers:
      - name: api
        image: $ECR_REPO:backend-$IMAGE_TAG
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "staging"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        - name: JWT_PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              name: jwt-keys
              key: private-key
        - name: REDIS_URL
          value: "redis://redis:6379"
        - name: KAFKA_BROKERS
          value: "kafka:9092"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: graphql-api
  namespace: $NAMESPACE
spec:
  selector:
    app: graphql-api
  ports:
  - port: 4000
    targetPort: 4000
EOF
    
    # Deploy frontend
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: $NAMESPACE
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: $ECR_REPO:frontend-$IMAGE_TAG
        ports:
        - containerPort: 3000
        env:
        - name: REACT_APP_API_URL
          value: "https://api-staging.security-dashboard.io"
        - name: REACT_APP_WS_URL
          value: "wss://ws-staging.security-dashboard.io"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: $NAMESPACE
spec:
  selector:
    app: frontend
  ports:
  - port: 3000
    targetPort: 3000
EOF
    
    log_success "Applications deployed"
}

# Deploy monitoring stack
deploy_monitoring() {
    log_info "Deploying monitoring stack..."
    
    # Add Prometheus Helm repo
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    # Deploy Prometheus with custom values
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace $NAMESPACE \
        --values deployment/monitoring/prometheus-values.yaml \
        --set grafana.adminPassword=staging-admin-2024 \
        --wait
    
    # Deploy custom alerts
    kubectl apply -f deployment/monitoring/security-dashboard-alerts.yaml -n $NAMESPACE
    
    log_success "Monitoring stack deployed"
}

# Configure ingress and TLS
configure_ingress() {
    log_info "Configuring ingress with TLS..."
    
    cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: security-dashboard
  namespace: $NAMESPACE
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/websocket-services: "graphql-api"
spec:
  tls:
  - hosts:
    - staging.security-dashboard.io
    - api-staging.security-dashboard.io
    - ws-staging.security-dashboard.io
    secretName: security-dashboard-tls
  rules:
  - host: staging.security-dashboard.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 3000
  - host: api-staging.security-dashboard.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: graphql-api
            port:
              number: 4000
  - host: ws-staging.security-dashboard.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: graphql-api
            port:
              number: 4000
EOF
    
    log_success "Ingress configured with TLS"
}

# Run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Wait for services to be ready
    sleep 30
    
    # Test frontend
    FRONTEND_URL="https://staging.security-dashboard.io"
    if curl -f -s -o /dev/null -w "%{http_code}" $FRONTEND_URL | grep -q "200"; then
        log_success "Frontend is accessible"
    else
        log_error "Frontend is not accessible"
        exit 1
    fi
    
    # Test GraphQL API
    API_URL="https://api-staging.security-dashboard.io/graphql"
    QUERY='{"query":"{ __schema { queryType { name } } }"}'
    if curl -f -s -X POST -H "Content-Type: application/json" -d "$QUERY" $API_URL | grep -q "Query"; then
        log_success "GraphQL API is responding"
    else
        log_error "GraphQL API is not responding"
        exit 1
    fi
    
    # Test WebSocket
    # Note: Requires wscat or similar tool for proper WebSocket testing
    log_info "WebSocket endpoint configured at wss://ws-staging.security-dashboard.io"
    
    log_success "Smoke tests passed"
}

# Generate deployment report
generate_report() {
    log_info "Generating deployment report..."
    
    cat <<EOF > staging-deployment-report.txt
=====================================
Security Dashboard Staging Deployment
=====================================
Date: $(date)
Cluster: $CLUSTER_NAME
Namespace: $NAMESPACE
Image Tag: $IMAGE_TAG

Deployed Components:
-------------------
$(kubectl get deployments -n $NAMESPACE)

Services:
---------
$(kubectl get services -n $NAMESPACE)

Pods Status:
-----------
$(kubectl get pods -n $NAMESPACE)

Access URLs:
-----------
Frontend: https://staging.security-dashboard.io
GraphQL API: https://api-staging.security-dashboard.io
WebSocket: wss://ws-staging.security-dashboard.io
Grafana: https://staging.security-dashboard.io/grafana

Next Steps:
----------
1. Verify all services are running: kubectl get pods -n $NAMESPACE
2. Check application logs: kubectl logs -n $NAMESPACE -l app=graphql-api
3. Access Grafana dashboard for monitoring
4. Run integration tests
5. Configure alerting channels

=====================================
EOF
    
    log_success "Deployment report generated: staging-deployment-report.txt"
}

# Main deployment flow
main() {
    log_info "Starting Security Dashboard staging deployment..."
    
    preflight_checks
    setup_namespace
    deploy_configs
    build_and_push_images
    deploy_databases
    deploy_kafka
    deploy_applications
    deploy_monitoring
    configure_ingress
    run_smoke_tests
    generate_report
    
    log_success "🚀 Security Dashboard successfully deployed to staging!"
    log_info "Access the dashboard at: https://staging.security-dashboard.io"
    log_info "Monitor the deployment: kubectl get pods -n $NAMESPACE --watch"
}

# Run main function
main "$@"