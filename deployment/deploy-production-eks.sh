#!/bin/bash

# Security Dashboard Production AWS EKS Deployment
set -e

echo "🚀 Security Dashboard - Production AWS EKS Deployment"
echo "===================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
CLUSTER_NAME="security-dashboard-prod"
REGION="us-east-1"
NAMESPACE="security-dashboard"

# Check AWS credentials
check_aws() {
    echo "Checking AWS credentials..."
    aws sts get-caller-identity > /dev/null 2>&1 || {
        echo -e "${RED}AWS credentials not configured${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ AWS credentials valid${NC}"
}

# Create EKS cluster (if not exists)
create_cluster() {
    echo "Checking for existing EKS cluster..."
    
    if aws eks describe-cluster --name $CLUSTER_NAME --region $REGION > /dev/null 2>&1; then
        echo -e "${YELLOW}Cluster $CLUSTER_NAME already exists${NC}"
    else
        echo "Creating EKS cluster $CLUSTER_NAME..."
        
        # Use eksctl for simplified cluster creation
        eksctl create cluster \
            --name $CLUSTER_NAME \
            --region $REGION \
            --nodegroup-name standard-workers \
            --node-type t3.large \
            --nodes 3 \
            --nodes-min 2 \
            --nodes-max 5 \
            --managed
            
        echo -e "${GREEN}✓ EKS cluster created${NC}"
    fi
    
    # Update kubeconfig
    aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION
}

# Deploy infrastructure components
deploy_infrastructure() {
    echo "Deploying infrastructure components..."
    
    # Create namespace
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Install metrics server
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    
    # Install ingress controller
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/aws/deploy.yaml
    
    echo -e "${GREEN}✓ Infrastructure deployed${NC}"
}

# Deploy monitoring stack
deploy_monitoring() {
    echo "Deploying monitoring stack..."
    
    # Add Prometheus Helm repo
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    # Install Prometheus and Grafana
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace $NAMESPACE \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
        --set grafana.adminPassword=admin123 \
        --set grafana.service.type=LoadBalancer \
        --wait
    
    echo -e "${GREEN}✓ Monitoring stack deployed${NC}"
}

# Deploy database (RDS)
deploy_database() {
    echo "Setting up RDS database..."
    
    # Check if RDS instance exists
    DB_INSTANCE="security-dashboard-db"
    
    if aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE --region $REGION > /dev/null 2>&1; then
        echo -e "${YELLOW}RDS instance $DB_INSTANCE already exists${NC}"
        
        # Get endpoint
        DB_ENDPOINT=$(aws rds describe-db-instances \
            --db-instance-identifier $DB_INSTANCE \
            --region $REGION \
            --query 'DBInstances[0].Endpoint.Address' \
            --output text)
    else
        echo "Creating RDS PostgreSQL instance..."
        
        aws rds create-db-instance \
            --db-instance-identifier $DB_INSTANCE \
            --db-instance-class db.t3.medium \
            --engine postgres \
            --engine-version 15.4 \
            --master-username secadmin \
            --master-user-password $(openssl rand -base64 32) \
            --allocated-storage 100 \
            --storage-encrypted \
            --backup-retention-period 7 \
            --multi-az \
            --region $REGION
        
        echo "Waiting for RDS instance to be available..."
        aws rds wait db-instance-available \
            --db-instance-identifier $DB_INSTANCE \
            --region $REGION
        
        DB_ENDPOINT=$(aws rds describe-db-instances \
            --db-instance-identifier $DB_INSTANCE \
            --region $REGION \
            --query 'DBInstances[0].Endpoint.Address' \
            --output text)
        
        echo -e "${GREEN}✓ RDS database created: $DB_ENDPOINT${NC}"
    fi
    
    # Store connection string as secret
    kubectl create secret generic database-url \
        --from-literal=url="postgresql://secadmin:password@$DB_ENDPOINT:5432/security_dashboard" \
        --namespace $NAMESPACE \
        --dry-run=client -o yaml | kubectl apply -f -
}

# Deploy Redis (ElastiCache)
deploy_redis() {
    echo "Setting up ElastiCache Redis..."
    
    REDIS_CLUSTER="security-dashboard-redis"
    
    # Check if ElastiCache cluster exists
    if aws elasticache describe-cache-clusters \
        --cache-cluster-id $REDIS_CLUSTER \
        --region $REGION > /dev/null 2>&1; then
        echo -e "${YELLOW}Redis cluster $REDIS_CLUSTER already exists${NC}"
    else
        echo "Creating ElastiCache Redis cluster..."
        
        # Get default VPC subnet group
        SUBNET_GROUP=$(aws elasticache describe-cache-subnet-groups \
            --region $REGION \
            --query 'CacheSubnetGroups[0].CacheSubnetGroupName' \
            --output text)
        
        aws elasticache create-cache-cluster \
            --cache-cluster-id $REDIS_CLUSTER \
            --engine redis \
            --cache-node-type cache.t3.micro \
            --num-cache-nodes 1 \
            --cache-subnet-group-name $SUBNET_GROUP \
            --region $REGION
        
        echo "Waiting for Redis cluster to be available..."
        aws elasticache wait cache-cluster-available \
            --cache-cluster-id $REDIS_CLUSTER \
            --region $REGION
        
        echo -e "${GREEN}✓ Redis cluster created${NC}"
    fi
}

# Deploy application
deploy_application() {
    echo "Deploying Security Dashboard application..."
    
    # Create ConfigMap for application configuration
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: security-dashboard-config
  namespace: $NAMESPACE
data:
  ENVIRONMENT: "production"
  PORT: "4000"
  REDIS_URL: "redis://redis:6379"
  ENABLE_METRICS: "true"
EOF

    # Deploy backend service
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: security-dashboard-backend
  namespace: $NAMESPACE
spec:
  replicas: 3
  selector:
    matchLabels:
      app: security-backend
  template:
    metadata:
      labels:
        app: security-backend
    spec:
      containers:
      - name: backend
        image: security-dashboard-backend:latest
        ports:
        - containerPort: 4000
        envFrom:
        - configMapRef:
            name: security-dashboard-config
        - secretRef:
            name: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
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
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: security-backend-service
  namespace: $NAMESPACE
spec:
  selector:
    app: security-backend
  ports:
  - port: 4000
    targetPort: 4000
  type: ClusterIP
EOF

    # Deploy frontend
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: security-dashboard-frontend
  namespace: $NAMESPACE
spec:
  replicas: 2
  selector:
    matchLabels:
      app: security-frontend
  template:
    metadata:
      labels:
        app: security-frontend
    spec:
      containers:
      - name: frontend
        image: security-dashboard-frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.security.candlefish.ai"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: security-frontend-service
  namespace: $NAMESPACE
spec:
  selector:
    app: security-frontend
  ports:
  - port: 3000
    targetPort: 3000
  type: LoadBalancer
EOF

    echo -e "${GREEN}✓ Application deployed${NC}"
}

# Configure autoscaling
configure_autoscaling() {
    echo "Configuring autoscaling..."
    
    # HPA for backend
    kubectl autoscale deployment security-dashboard-backend \
        --namespace $NAMESPACE \
        --cpu-percent=70 \
        --min=3 \
        --max=10
    
    # HPA for frontend
    kubectl autoscale deployment security-dashboard-frontend \
        --namespace $NAMESPACE \
        --cpu-percent=70 \
        --min=2 \
        --max=5
    
    echo -e "${GREEN}✓ Autoscaling configured${NC}"
}

# Get deployment status
get_status() {
    echo ""
    echo "===================================================="
    echo -e "${GREEN}Security Dashboard Production Deployment Complete!${NC}"
    echo "===================================================="
    echo ""
    echo "Cluster Information:"
    echo "  Cluster Name: $CLUSTER_NAME"
    echo "  Region: $REGION"
    echo "  Namespace: $NAMESPACE"
    echo ""
    echo "Services Status:"
    kubectl get all -n $NAMESPACE
    echo ""
    echo "Access URLs:"
    
    # Get LoadBalancer URLs
    FRONTEND_URL=$(kubectl get svc security-frontend-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    GRAFANA_URL=$(kubectl get svc prometheus-grafana -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    
    echo "  Frontend: http://$FRONTEND_URL:3000"
    echo "  Grafana: http://$GRAFANA_URL"
    echo ""
    echo "Next Steps:"
    echo "  1. Configure DNS to point to the LoadBalancer"
    echo "  2. Set up SSL certificates"
    echo "  3. Configure WAF rules"
    echo "  4. Enable CloudWatch logging"
    echo "  5. Set up backup policies"
}

# Main execution
main() {
    check_aws
    create_cluster
    deploy_infrastructure
    deploy_monitoring
    deploy_database
    deploy_redis
    deploy_application
    configure_autoscaling
    get_status
}

# Run main function
main "$@"