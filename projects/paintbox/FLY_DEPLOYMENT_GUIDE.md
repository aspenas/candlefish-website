# 🚀 Paintbox Fly.io Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Paintbox application to Fly.io with all production features enabled.

## Prerequisites

1. **Fly.io Account**: Sign up at https://fly.io
2. **Fly CLI**: Install with `curl -L https://fly.io/install.sh | sh`
3. **Environment Variables**: Prepare your secrets and API keys

## Quick Deploy

```bash
# One-command deployment
./scripts/deploy-fly.sh
```

## Step-by-Step Deployment

### 1. Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux/WSL
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Authenticate

```bash
flyctl auth login
```

### 3. Create the App

```bash
# Create new app
flyctl apps create paintbox-app

# Or launch interactively
flyctl launch
```

### 4. Set Up Database

```bash
# Create PostgreSQL database
flyctl postgres create --name paintbox-db

# Attach to app
flyctl postgres attach paintbox-db --app paintbox-app

# The DATABASE_URL will be automatically set
```

### 5. Set Up Redis

```bash
# Using Upstash Redis (recommended for Fly)
flyctl redis create --name paintbox-redis

# Get connection URL
flyctl redis status paintbox-redis
```

### 6. Configure Secrets

```bash
# Set all required secrets
flyctl secrets set \
  JWT_SECRET="$(openssl rand -hex 32)" \
  ENCRYPTION_KEY="$(openssl rand -hex 16)" \
  AWS_ACCESS_KEY_ID="your-aws-key" \
  AWS_SECRET_ACCESS_KEY="your-aws-secret" \
  SALESFORCE_CLIENT_ID="your-sf-client-id" \
  SALESFORCE_CLIENT_SECRET="your-sf-client-secret" \
  SALESFORCE_USERNAME="your-sf-username" \
  SALESFORCE_PASSWORD="your-sf-password" \
  COMPANYCAM_API_KEY="your-companycam-key" \
  SENTRY_DSN="your-sentry-dsn"
```

### 7. Deploy the Application

```bash
# Deploy with production configuration
flyctl deploy -c fly.production.toml

# Or deploy with rolling strategy
flyctl deploy --strategy rolling
```

### 8. Scale the Application

```bash
# Scale to 2 instances
flyctl scale count 2

# Scale by region
flyctl scale count 2 --region dfw
flyctl scale count 1 --region ord
flyctl scale count 1 --region lax

# Scale VM resources
flyctl scale vm shared-cpu-4x --memory 2048
```

### 9. Configure Custom Domain

```bash
# Add custom domain
flyctl certs create paintbox.com

# View DNS instructions
flyctl certs show paintbox.com
```

## Monitoring & Management

### View Logs

```bash
# Stream logs
flyctl logs

# Filter by service
flyctl logs | grep websocket

# Save logs to file
flyctl logs > logs.txt
```

### SSH Access

```bash
# Connect to instance
flyctl ssh console

# Run commands
flyctl ssh console --command "node -v"
```

### View Metrics

```bash
# Open dashboard
flyctl dashboard

# View metrics
flyctl dashboard metrics
```

### Health Checks

```bash
# Check app status
flyctl status

# Check specific services
curl https://paintbox-app.fly.dev/api/health
```

## Environment-Specific Deployments

### Staging

```bash
# Create staging app
flyctl apps create paintbox-staging

# Deploy to staging
flyctl deploy --app paintbox-staging -c fly.staging.toml
```

### Production

```bash
# Deploy to production with checks
flyctl deploy -c fly.production.toml --strategy rolling

# Blue-green deployment
flyctl deploy --strategy bluegreen
```

## CI/CD with GitHub Actions

The project includes GitHub Actions workflow for automatic deployment:

1. **Set GitHub Secret**:
   ```bash
   # Get your Fly API token
   flyctl auth token
   
   # Add to GitHub secrets as FLY_API_TOKEN
   ```

2. **Push to trigger deployment**:
   ```bash
   git push origin main
   ```

## Troubleshooting

### Build Failures

```bash
# Check build logs
flyctl logs --app paintbox-app

# Build locally
docker build -f Dockerfile.fly .
```

### Connection Issues

```bash
# Check app status
flyctl status --app paintbox-app

# Restart app
flyctl restart --app paintbox-app
```

### Database Issues

```bash
# Connect to database
flyctl postgres connect -a paintbox-db

# Run migrations manually
flyctl ssh console -C "npx prisma migrate deploy"
```

### Redis Issues

```bash
# Check Redis status
flyctl redis status paintbox-redis

# Connect to Redis CLI
flyctl redis connect paintbox-redis
```

## Performance Optimization

### Enable Auto-scaling

```bash
# Configure auto-scaling
flyctl autoscale set min=2 max=10 --app paintbox-app
```

### Configure Regions

```bash
# Add regions for global distribution
flyctl regions add ord lax fra
flyctl regions list
```

### Enable HTTP/3

```bash
# Update fly.toml
[[services.ports]]
  port = 443
  handlers = ["tls", "http", "h3"]
```

## Backup & Recovery

### Database Backup

```bash
# Create snapshot
flyctl postgres backup create --app paintbox-db

# List backups
flyctl postgres backup list --app paintbox-db

# Restore from backup
flyctl postgres backup restore <backup-id> --app paintbox-db
```

### Application Rollback

```bash
# List releases
flyctl releases --app paintbox-app

# Rollback to previous version
flyctl deploy --image registry.fly.io/paintbox-app@<version>
```

## Cost Optimization

### Current Pricing (as of 2025)

- **Shared CPU**: $0.0000008/s (~$2/month)
- **2GB RAM**: $0.0000012/s (~$3/month)
- **PostgreSQL**: $0.15/GB/month
- **Redis**: $0.15/GB/month
- **Bandwidth**: $0.02/GB outbound

### Estimated Monthly Cost

- 2x shared-cpu-4x instances: ~$20
- PostgreSQL (10GB): ~$2
- Redis (1GB): ~$0.15
- Bandwidth (100GB): ~$2
- **Total**: ~$25/month

## Security Best Practices

1. **Use Secrets**: Never hardcode sensitive data
2. **Enable HTTPS**: Force HTTPS in fly.toml
3. **IP Allowlisting**: Use Fly firewall rules
4. **Regular Updates**: Keep dependencies updated
5. **Monitor Logs**: Watch for suspicious activity

## Support

- **Fly.io Status**: https://status.fly.io
- **Documentation**: https://fly.io/docs
- **Community**: https://community.fly.io
- **Support**: support@fly.io

## Quick Commands Reference

```bash
# Deploy
flyctl deploy

# Logs
flyctl logs

# Status
flyctl status

# Scale
flyctl scale count 3

# SSH
flyctl ssh console

# Restart
flyctl restart

# Secrets
flyctl secrets list

# Metrics
flyctl dashboard
```

## Next Steps

1. ✅ Deploy the application
2. ✅ Configure custom domain
3. ✅ Set up monitoring alerts
4. ✅ Configure auto-scaling
5. ✅ Implement backup strategy

The Paintbox application is now ready for production deployment on Fly.io! 🎉
