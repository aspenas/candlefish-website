# Claude Configuration System - Kubernetes Deployment

Production-ready Kubernetes manifests for deploying the Claude Configuration System to AWS EKS.

## Architecture Overview

The system consists of 5 microservices:
- **Config Service**: Configuration management
- **Gateway Service**: API gateway and request routing
- **Sync Service**: Data synchronization
- **Metrics Service**: Metrics collection and aggregation
- **Auth Service**: Authentication and authorization

## Resource Specifications

- **Memory Limit**: 10MB per pod
- **CPU Limit**: 200m per pod
- **Replicas**: 3 per service (15 pods total minimum)
- **Auto-scaling**: HPA configured for each service
- **Namespace**: `claude-config`

## Prerequisites

1. AWS EKS cluster running
2. kubectl configured with cluster access
3. AWS Load Balancer Controller installed
4. Prometheus Operator (optional, for monitoring)
5. Metrics Server installed (for HPA)

## Quick Deployment

```bash
# Make the deployment script executable
chmod +x 09-deploy-script.sh

# Deploy the system
./09-deploy-script.sh deploy

# Verify deployment
./09-deploy-script.sh verify

# Rollback if needed
./09-deploy-script.sh rollback
```

## Manual Deployment

```bash
# Apply manifests in order
kubectl apply -f 01-namespace-rbac.yaml
kubectl apply -f 02-configmaps-secrets.yaml
kubectl apply -f 03-deployments.yaml
kubectl apply -f 04-services-ingress.yaml
kubectl apply -f 05-hpa-autoscaling.yaml
kubectl apply -f 06-network-policies.yaml
kubectl apply -f 07-pod-disruption-budgets.yaml
kubectl apply -f 08-monitoring.yaml

# Wait for deployments
kubectl rollout status deployment -n claude-config --timeout=5m

# Get ALB URL
kubectl get ingress -n claude-config
```

## Configuration

### Required Secrets

Update these values in `02-configmaps-secrets.yaml`:
- `JWT_SECRET`: Shared JWT secret with Candlefish backend
- `DATABASE_URL`: PostgreSQL connection string (if using)
- `REDIS_URL`: Redis connection string (if using)
- `INTERNAL_API_KEY`: Internal API key for service-to-service auth

### AWS Integration

Update in `04-services-ingress.yaml`:
- Certificate ARN for HTTPS
- Domain name for ingress

### Backend Connection

The system is configured to connect to:
- Candlefish Backend: `http://3.239.245.130:4000`

## Monitoring

### Prometheus Metrics

All services expose metrics at `/metrics` endpoint. ServiceMonitor and PrometheusRule resources are included for automatic scraping.

### Grafana Dashboard

Import the dashboard from `08-monitoring.yaml` ConfigMap.

### Alerts

Configured alerts include:
- High CPU/Memory usage
- Pod restarts
- Service downtime
- High error rates
- High latency

## Security Features

1. **Network Policies**: Strict ingress/egress rules
2. **RBAC**: Minimal permissions for service accounts
3. **Pod Security**: Non-root containers
4. **TLS**: HTTPS via ALB with ACM certificates
5. **Authentication**: JWT-based auth shared with Candlefish

## Auto-scaling

Each service has HPA configured with:
- Min replicas: 3
- Max replicas: 8-15 (varies by service)
- CPU threshold: 60-75%
- Memory threshold: 75-85%

## High Availability

- **Pod Disruption Budgets**: Ensure minimum availability during updates
- **Anti-affinity Rules**: Pods distributed across nodes
- **Rolling Updates**: Zero-downtime deployments
- **Health Checks**: Liveness and readiness probes

## Testing

### Local Testing
```bash
# Port-forward to test locally
kubectl port-forward -n claude-config svc/gateway-service 8080:8080

# Test health endpoint
curl http://localhost:8080/health
```

### Load Testing
```bash
# Apply load to trigger auto-scaling
hey -z 30s -c 10 http://<ALB-URL>/api/config
```

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n claude-config
kubectl describe pod <pod-name> -n claude-config
kubectl logs <pod-name> -n claude-config
```

### Check HPA Status
```bash
kubectl get hpa -n claude-config
kubectl describe hpa <hpa-name> -n claude-config
```

### Check Network Policies
```bash
kubectl get networkpolicy -n claude-config
kubectl describe networkpolicy <policy-name> -n claude-config
```

### Debug Service Connectivity
```bash
# Run debug pod
kubectl run debug --rm -it --image=nicolaka/netshoot -n claude-config -- /bin/bash

# Inside debug pod
curl http://config-service:8080/health
nslookup config-service
```

## Maintenance

### Update Deployments
```bash
# Update image
kubectl set image deployment/config-service config-service=claude-config/config-service:v2 -n claude-config

# Check rollout status
kubectl rollout status deployment/config-service -n claude-config

# Rollback if needed
kubectl rollout undo deployment/config-service -n claude-config
```

### Scale Manually
```bash
kubectl scale deployment/gateway-service --replicas=5 -n claude-config
```

### Update Secrets
```bash
# Create new secret version
kubectl create secret generic claude-config-secrets-v2 --from-literal=JWT_SECRET=new-secret -n claude-config

# Update deployment to use new secret
kubectl edit deployment config-service -n claude-config
```

## Cost Optimization

With the current configuration (10MB memory, 200m CPU):
- **Minimum cost**: 15 pods × 0.2 vCPU × 0.01 GB = 3 vCPU, 0.15 GB
- **Maximum cost** (with HPA): ~55 pods × 0.2 vCPU × 0.01 GB = 11 vCPU, 0.55 GB

Estimated monthly cost on AWS EKS:
- Minimum: ~$20-30/month
- Maximum: ~$75-100/month

## Integration with Candlefish OS

The system integrates with existing Candlefish infrastructure:
1. Shares JWT authentication tokens
2. Connects to backend API at `http://3.239.245.130:4000`
3. Uses same monitoring stack
4. Follows Candlefish naming conventions

## Support

For issues or questions:
1. Check pod logs: `kubectl logs -n claude-config <pod-name>`
2. Review events: `kubectl get events -n claude-config`
3. Check metrics: Access Grafana dashboard
4. Review alerts: Check Prometheus alerts