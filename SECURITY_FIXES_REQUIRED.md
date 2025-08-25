# Critical Security Fixes Required Before Deployment

## 🚨 IMMEDIATE ACTION REQUIRED

These fixes must be implemented before deploying the GitHub Actions workflows to prevent security vulnerabilities.

## Fix 1: Kong Admin API Security (CRITICAL)

### Issue
Kong admin API is configured to use HTTP instead of HTTPS, exposing admin credentials.

### Current Code (VULNERABLE)
```yaml
# In .github/workflows/kong-deployment.yml
curl -X POST http://$KONG_ADMIN:8001/plugins
```

### Required Fix
```yaml
# Replace ALL instances of http://$KONG_ADMIN:8001 with https://$KONG_ADMIN:8444
- name: Configure Kong plugins
  run: |
    ENV="${{ github.event.inputs.environment || 'staging' }}"
    KONG_ADMIN=$(kubectl get svc -n kong-$ENV kong-kong-admin -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

    # Use HTTPS port 8444 instead of HTTP port 8001
    curl -X POST "https://$KONG_ADMIN:8444/plugins" \
      -H "Kong-Admin-Token: ${{ secrets.KONG_ADMIN_TOKEN }}" \
      -H "Content-Type: application/json" \
      --cert-type PEM \
      --cert ${{ secrets.KONG_ADMIN_CERT }} \
      --key ${{ secrets.KONG_ADMIN_KEY }} \
      -d '{...}'
```

### Helm Configuration Fix
```yaml
# In Kong Helm deployment section
helm upgrade --install kong kong/kong \
  --set admin.enabled=true \
  --set admin.http.enabled=false \           # Disable HTTP admin
  --set admin.tls.enabled=true \             # Enable TLS admin
  --set admin.tls.servicePort=8444 \         # Use secure port
  --set admin.ingress.enabled=false \        # Disable ingress for admin
```

## Fix 2: Add Missing GitHub Secrets

### Required Secrets Configuration
Run these commands in your GitHub repository:

```bash
# Kong Security
gh secret set KONG_ADMIN_TOKEN --body "your-secure-admin-token"
gh secret set KONG_ADMIN_CERT --body "$(cat kong-admin.crt)"
gh secret set KONG_ADMIN_KEY --body "$(cat kong-admin.key)"

# Database
gh secret set POSTGRES_HOST --body "your-db-hostname"
gh secret set POSTGRES_PASSWORD --body "your-secure-db-password"
gh secret set REDIS_HOST --body "your-redis-hostname"

# Monitoring
gh secret set GRAFANA_TOKEN --body "your-grafana-api-token"
gh secret set CODECOV_TOKEN --body "your-codecov-token"

# Security Scanning
gh secret set SEMGREP_APP_TOKEN --body "your-semgrep-token"
gh secret set SNYK_TOKEN --body "your-snyk-token"
gh secret set SONAR_TOKEN --body "your-sonar-token"
```

## Fix 3: Add Configuration Validation

### Add to kong-deployment.yml before deployment:
```yaml
- name: Validate Kong configuration
  run: |
    # Install Kong validation tools
    curl -sL https://github.com/Kong/deck/releases/download/v1.30.0/deck_1.30.0_linux_amd64.tar.gz | tar xz
    sudo mv deck /usr/local/bin/
    
    # Validate configuration syntax
    deck validate --state infrastructure/kong/kong.yml
    
    # Validate required secrets are present
    required_secrets=(
      "KONG_ADMIN_TOKEN"
      "POSTGRES_HOST"
      "POSTGRES_PASSWORD"
      "REDIS_HOST"
    )
    
    for secret in "${required_secrets[@]}"; do
      if [ -z "${!secret}" ]; then
        echo "::error::Required secret $secret is not configured"
        exit 1
      fi
    done
    
    # Test database connectivity
    PGPASSWORD="$POSTGRES_PASSWORD" pg_isready -h "$POSTGRES_HOST" -U kong -d kong_staging || {
      echo "::error::Cannot connect to PostgreSQL database"
      exit 1
    }
    
    # Test Redis connectivity  
    redis-cli -h "$REDIS_HOST" ping || {
      echo "::error::Cannot connect to Redis server"
      exit 1
    }
```

## Fix 4: Secure Workflow Triggers

### Add branch protection and approval requirements:
```yaml
# Add to workflow files
on:
  push:
    branches: [main, staging]
    # Remove 'develop' from auto-deployment
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:
    inputs:
      environment:
        required: true
        type: choice
        options:
          - staging
          - production
      confirm_security_review:
        description: 'Confirm security review completed (yes/no)'
        required: true
        type: choice
        options:
          - 'no'
          - 'yes'

# Add security confirmation check
jobs:
  security-check:
    if: github.event.inputs.confirm_security_review == 'yes' || github.event_name != 'workflow_dispatch'
```

## Fix 5: Add Network Security

### Kong Network Policies
```yaml
# Add to Kong deployment
- name: Apply network policies
  run: |
    cat <<EOF | kubectl apply -f -
    apiVersion: networking.k8s.io/v1
    kind: NetworkPolicy
    metadata:
      name: kong-admin-policy
      namespace: kong-$ENV
    spec:
      podSelector:
        matchLabels:
          app: kong
      policyTypes:
      - Ingress
      ingress:
      - from:
        - namespaceSelector:
            matchLabels:
              name: kube-system
        ports:
        - protocol: TCP
          port: 8444  # Only allow admin on secure port
    EOF
```

## Testing the Fixes

### Security Validation Script
```bash
#!/bin/bash
# scripts/validate-security-fixes.sh

echo "🔍 Validating security fixes..."

# 1. Check Kong admin uses HTTPS
if grep -r "http://.*:8001" .github/workflows/; then
  echo "❌ Found insecure Kong admin HTTP connections"
  exit 1
fi

# 2. Check required secrets are configured
required_secrets=(
  "KONG_ADMIN_TOKEN"
  "POSTGRES_PASSWORD" 
  "REDIS_HOST"
)

for secret in "${required_secrets[@]}"; do
  if ! gh secret list | grep -q "$secret"; then
    echo "❌ Missing required secret: $secret"
    exit 1
  fi
done

# 3. Check workflow has security validation
if ! grep -q "Validate Kong configuration" .github/workflows/kong-deployment.yml; then
  echo "❌ Missing configuration validation step"
  exit 1
fi

echo "✅ All security fixes validated!"
```

## Deployment Checklist

Before deploying, verify:

- [ ] All Kong admin API calls use HTTPS (port 8444)
- [ ] Kong admin HTTP interface is disabled in Helm config
- [ ] All required GitHub secrets are configured
- [ ] Configuration validation steps are added
- [ ] Network policies restrict admin API access
- [ ] Security baseline file is created
- [ ] Branch protection rules are enabled
- [ ] Manual approval required for production deployments

## Emergency Rollback Commands

If security issues are discovered post-deployment:

```bash
# Immediately disable workflows
gh workflow disable unified-ci-cd.yml
gh workflow disable kong-deployment.yml

# Revert Kong to secure defaults
kubectl patch service kong-kong-admin -p '{"spec":{"type":"ClusterIP"}}'

# Rotate compromised credentials
gh secret set KONG_ADMIN_TOKEN --body "$(openssl rand -base64 32)"
```

## Estimated Fix Time: 2-3 hours

These fixes are critical for production deployment security. Do not deploy without implementing all fixes.
