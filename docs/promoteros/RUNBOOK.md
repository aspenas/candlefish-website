# PromoterOS Runbook

## Quick Start (Local Development)

```bash
# Clone and setup
cd /Users/patricksmith/candlefish-ai
git checkout feat/promoteros-mvp

# Install dependencies
pnpm install

# Setup database
cd services/promoteros-api
cp .env.example .env
# Edit .env with your DATABASE_URL
pnpm db:push
pnpm db:seed

# Start all services
cd ../..
pnpm dev

# Access applications
# Web: http://localhost:3001
# API: http://localhost:4000/trpc
# Worker: http://localhost:4001/healthz
```

## Environment Variables

### Required Secrets (AWS Secrets Manager)

```bash
# Fetch all PromoterOS secrets
aws secretsmanager get-secret-value --secret-id promoteros/production/config

# Required keys:
DATABASE_URL              # PostgreSQL connection string
REDIS_URL                 # Redis connection string
NEXTAUTH_SECRET          # Random 32+ char string
NEXTAUTH_URL             # https://promoteros.candlefish.ai
JWT_SECRET               # Random 32+ char string
AWS_REGION               # us-east-1
AWS_ACCESS_KEY_ID        # For SES email sending
AWS_SECRET_ACCESS_KEY    # For SES email sending
SENTRY_DSN               # Sentry project DSN
GOOGLE_CLIENT_ID         # OAuth credentials
GOOGLE_CLIENT_SECRET     # OAuth credentials
EMAIL_FROM               # noreply@promoteros.com
```

### Local Development (.env files)

#### services/promoteros-api/.env
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/promoteros"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="local-development-secret-change-in-production"
PORT=4000
NODE_ENV=development
```

#### apps/promoteros-web/.env.local
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXTAUTH_SECRET="local-development-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3001"
```

#### services/promoteros-worker/.env
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/promoteros"
REDIS_URL="redis://localhost:6379"
AWS_REGION="us-east-1"
EMAIL_FROM="noreply@promoteros.com"
PORT=4001
```

## Database Management

### Migrations
```bash
cd services/promoteros-api

# Create migration
pnpm prisma migrate dev --name description_of_change

# Apply migrations (production)
pnpm prisma migrate deploy

# Reset database (development only!)
pnpm prisma migrate reset

# Open Prisma Studio
pnpm prisma studio
```

### Seed Data
```bash
# Run seed script
pnpm db:seed

# Creates:
# - Organization: Candlefish Venue Ops
# - Venue: Harbor Room
# - Users: admin@, manager@, staff@candlefish.ai
# - Sample events and requests
```

## Deployment

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Secrets configured in AWS
- [ ] Domain DNS configured

### Deploy to Fly.io
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy services
cd infra/promoteros

# Deploy web app
fly deploy --config fly.toml --app promoteros-web

# Deploy API
fly deploy --config fly.toml --app promoteros-api

# Deploy worker
fly deploy --config fly.toml --app promoteros-worker

# Set secrets
fly secrets set DATABASE_URL="..." --app promoteros-api
fly secrets set REDIS_URL="..." --app promoteros-worker
# ... set all required secrets
```

### Deploy to AWS ECS (Alternative)
```bash
cd infra/promoteros/aws

# Deploy with CDK
npm install
cdk bootstrap
cdk deploy PromoterOSStack

# Or with Terraform
terraform init
terraform plan
terraform apply
```

## Monitoring & Debugging

### Health Checks
```bash
# Check service health
curl https://api.promoteros.com/healthz
curl https://worker.promoteros.com/healthz

# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Check Redis
redis-cli ping
```

### Logs
```bash
# Fly.io logs
fly logs --app promoteros-web
fly logs --app promoteros-api
fly logs --app promoteros-worker

# Local logs
pnpm dev 2>&1 | tee development.log
```

### Common Issues

#### Database Connection Errors
```bash
# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL

# Check SSL requirements
# Add ?sslmode=require for production
```

#### Email Not Sending
```bash
# Check AWS SES configuration
aws ses get-send-quota
aws ses list-verified-email-addresses

# Check worker logs for errors
fly logs --app promoteros-worker | grep ERROR
```

#### Authentication Issues
```bash
# Regenerate NextAuth secret
openssl rand -base64 32

# Clear browser cookies
# Check NEXTAUTH_URL matches actual URL
```

## Backup & Recovery

### Database Backup
```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20250101.sql

# Fly.io automatic backups
fly postgres backups list --app promoteros-db
```

### Disaster Recovery
1. Restore database from backup
2. Redeploy applications
3. Verify secrets configuration
4. Test critical paths
5. Monitor error rates

## Performance Tuning

### Database Indexes
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;

-- Add indexes as needed
CREATE INDEX idx_event_date ON events(date);
CREATE INDEX idx_request_status ON event_requests(status);
```

### Redis Optimization
```bash
# Monitor Redis
redis-cli monitor

# Check memory usage
redis-cli info memory

# Clear old jobs
redis-cli --scan --pattern bull:* | xargs redis-cli del
```

## Security Procedures

### Rotate Secrets
```bash
# Generate new secrets
openssl rand -base64 32

# Update in AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id promoteros/production/config \
  --secret-string '{"JWT_SECRET":"new-secret"}'

# Restart services
fly apps restart promoteros-api
```

### Security Audit
```bash
# Check dependencies
pnpm audit

# Update dependencies
pnpm update --latest

# Scan for vulnerabilities
trivy fs .
```

## Support Contacts

- **On-call**: ops@candlefish.ai
- **Escalation**: patrick@candlefish.ai
- **AWS Support**: Premium support case
- **Fly.io Support**: support@fly.io
