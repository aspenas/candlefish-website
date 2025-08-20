# Production Hardening Playbook
**Date:** January 19, 2025  
**Scope:** Paintbox & PromoterOS Applications  
**Objective:** Transform development-grade applications into production-ready systems  
**Current Status:** 🔴 **CRITICAL - Not Production Ready**

## Executive Summary

This playbook provides a comprehensive guide to harden the Candlefish portfolio for production deployment. Currently, both applications have critical security vulnerabilities and lack production-grade infrastructure. This playbook addresses 50+ hardening requirements across security, reliability, performance, and compliance domains.

## Pre-Production Checklist

### 🔴 Critical Issues (Must Fix Before Production)
- [ ] Remove all exposed secrets from code
- [ ] Implement proper authentication
- [ ] Fix CORS configuration
- [ ] Enable HTTPS everywhere
- [ ] Add rate limiting
- [ ] Implement security headers
- [ ] Setup error handling
- [ ] Configure logging

### 🟠 High Priority (Fix Within 72 Hours)
- [ ] Database migration to PostgreSQL
- [ ] Memory optimization
- [ ] Dependency updates
- [ ] Backup strategy
- [ ] Monitoring setup
- [ ] CI/CD pipeline security

### 🟡 Medium Priority (Fix Within 1 Week)
- [ ] Load testing
- [ ] Documentation
- [ ] Disaster recovery plan
- [ ] Compliance review

## Section 1: Security Hardening

### 1.1 Secrets Management
```bash
# Step 1: Remove all .env files from repository
git rm -r --cached .env*
echo ".env*" >> .gitignore
git commit -m "Remove exposed secrets"

# Step 2: Setup AWS Secrets Manager
aws secretsmanager create-secret \
  --name paintbox/production \
  --secret-string file://secrets.json

# Step 3: Update application to use Secrets Manager
npm install @aws-sdk/client-secrets-manager
```

```javascript
// lib/secrets.js
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });

export async function getSecrets() {
  const command = new GetSecretValueCommand({
    SecretId: "paintbox/production",
  });
  
  const response = await client.send(command);
  return JSON.parse(response.SecretString);
}
```

### 1.2 Authentication Hardening
```javascript
// middleware/auth.js
import jwt from 'jsonwebtoken';
import { getSecrets } from '../lib/secrets';

export async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const secrets = await getSecrets();
    const decoded = jwt.verify(token, secrets.JWT_SECRET, {
      algorithms: ['RS256'],
      issuer: 'https://paintbox.candlefish.ai',
      audience: 'paintbox-api',
    });
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}
```

### 1.3 Security Headers
```javascript
// middleware/security.js
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.candlefish.ai"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});
```

### 1.4 Input Validation
```javascript
// middleware/validation.js
import { body, validationResult } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';

export const sanitizeInput = (req, res, next) => {
  // Sanitize all string inputs
  Object.keys(req.body).forEach(key => {
    if (typeof req.body[key] === 'string') {
      req.body[key] = DOMPurify.sanitize(req.body[key]);
    }
  });
  next();
};

export const validateUser = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('name').trim().escape(),
];
```

## Section 2: Infrastructure Hardening

### 2.1 Load Balancer Configuration
```yaml
# fly.toml
[services]
  internal_port = 3000
  protocol = "tcp"
  
  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true
  
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
  
  [services.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20
  
  [[services.tcp_checks]]
    interval = "15s"
    timeout = "2s"
    grace_period = "5s"
```

### 2.2 Auto-Scaling Configuration
```yaml
# fly.toml
[metrics]
  port = 9091
  path = "/metrics"

[services.auto_scale]
  min_machines = 2
  max_machines = 10
  
  [[services.auto_scale.metrics]]
    type = "connections"
    threshold = 15
  
  [[services.auto_scale.metrics]]
    type = "response_time"
    threshold = 500
```

### 2.3 Database Connection Pooling
```javascript
// lib/db.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
  process.exit(-1);
});

export default pool;
```

### 2.4 Redis Caching Layer
```javascript
// lib/cache.js
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

export async function cacheMiddleware(req, res, next) {
  const key = `cache:${req.originalUrl}`;
  
  try {
    const cached = await redis.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch (err) {
    console.error('Cache error:', err);
  }
  
  res.sendResponse = res.json;
  res.json = (body) => {
    redis.setex(key, 300, JSON.stringify(body));
    res.sendResponse(body);
  };
  
  next();
}
```

## Section 3: Performance Hardening

### 3.1 Response Compression
```javascript
// middleware/compression.js
import compression from 'compression';

export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between speed and compression
});
```

### 3.2 Static Asset Optimization
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['candlefish.ai'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
          },
          common: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
};
```

### 3.3 CDN Configuration
```nginx
# nginx.conf
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";
}

location /api {
    proxy_pass http://backend;
    proxy_cache_bypass $http_cache_control;
    add_header X-Cache-Status $upstream_cache_status;
}
```

## Section 4: Monitoring & Observability

### 4.1 Application Performance Monitoring
```javascript
// lib/monitoring.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  
  beforeSend(event, hint) {
    // Scrub sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});
```

### 4.2 Custom Metrics
```javascript
// lib/metrics.js
import { StatsD } from 'node-statsd';

const client = new StatsD({
  host: process.env.STATSD_HOST,
  port: 8125,
  prefix: 'paintbox.',
});

export function recordMetric(name, value, type = 'gauge') {
  switch (type) {
    case 'increment':
      client.increment(name, value);
      break;
    case 'timing':
      client.timing(name, value);
      break;
    default:
      client.gauge(name, value);
  }
}

// Usage
recordMetric('api.response_time', responseTime, 'timing');
recordMetric('users.active', activeUsers);
recordMetric('errors.rate', 1, 'increment');
```

### 4.3 Health Checks
```javascript
// pages/api/health.js
export default async function health(req, res) {
  const checks = {
    database: 'unknown',
    redis: 'unknown',
    memory: 'unknown',
  };
  
  // Database check
  try {
    await db.query('SELECT 1');
    checks.database = 'healthy';
  } catch {
    checks.database = 'unhealthy';
  }
  
  // Redis check
  try {
    await redis.ping();
    checks.redis = 'healthy';
  } catch {
    checks.redis = 'unhealthy';
  }
  
  // Memory check
  const used = process.memoryUsage();
  const limit = 512 * 1024 * 1024; // 512MB
  checks.memory = used.heapUsed < limit ? 'healthy' : 'warning';
  
  const isHealthy = Object.values(checks).every(v => v !== 'unhealthy');
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
}
```

## Section 5: Error Handling & Recovery

### 5.1 Global Error Handler
```javascript
// middleware/errorHandler.js
export function errorHandler(err, req, res, next) {
  // Log error
  console.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });
  
  // Send to monitoring
  Sentry.captureException(err);
  
  // Determine status code
  const status = err.status || 500;
  
  // Send response
  res.status(status).json({
    error: {
      message: status === 500 ? 'Internal Server Error' : err.message,
      status,
      timestamp: new Date().toISOString(),
      requestId: req.id,
    },
  });
}
```

### 5.2 Circuit Breaker Pattern
```javascript
// lib/circuitBreaker.js
import CircuitBreaker from 'opossum';

export function createCircuitBreaker(fn, options = {}) {
  const breaker = new CircuitBreaker(fn, {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    ...options,
  });
  
  breaker.on('open', () => {
    console.error('Circuit breaker opened');
    recordMetric('circuit_breaker.open', 1, 'increment');
  });
  
  breaker.on('halfOpen', () => {
    console.log('Circuit breaker half-open');
  });
  
  return breaker;
}
```

## Section 6: Deployment & Release

### 6.1 Blue-Green Deployment Script
```bash
#!/bin/bash
# scripts/deploy-blue-green.sh

set -e

ENV=$1
VERSION=$2

echo "Starting blue-green deployment for $ENV with version $VERSION"

# Deploy to green environment
fly deploy --app paintbox-green --image paintbox:$VERSION

# Run smoke tests
npm run test:smoke -- --env=green

# Switch traffic
fly scale count 2 --app paintbox-green
sleep 30
fly scale count 0 --app paintbox-blue

# Monitor for errors
sleep 300

# Check error rate
ERROR_RATE=$(curl -s https://api.datadog.com/metrics/errors.rate)
if [ "$ERROR_RATE" -gt "0.01" ]; then
  echo "High error rate detected, rolling back"
  fly scale count 2 --app paintbox-blue
  fly scale count 0 --app paintbox-green
  exit 1
fi

echo "Deployment successful"
```

### 6.2 Rollback Procedure
```bash
#!/bin/bash
# scripts/rollback.sh

PREVIOUS_VERSION=$(fly releases --app paintbox | head -2 | tail -1 | awk '{print $1}')

echo "Rolling back to version $PREVIOUS_VERSION"

fly deploy --app paintbox --image paintbox:$PREVIOUS_VERSION

# Verify rollback
sleep 30
curl -f https://paintbox.candlefish.ai/api/health || exit 1

echo "Rollback complete"
```

## Section 7: Business Continuity

### 7.1 Backup Strategy
```bash
#!/bin/bash
# scripts/backup.sh

# Database backup
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Upload to S3
aws s3 cp backup-*.sql.gz s3://candlefish-backups/paintbox/

# Clean old backups (keep 30 days)
find . -name "backup-*.sql.gz" -mtime +30 -delete

# Application state backup
tar -czf state-backup-$(date +%Y%m%d).tar.gz uploads/ cache/
aws s3 cp state-backup-*.tar.gz s3://candlefish-backups/paintbox/state/
```

### 7.2 Disaster Recovery Plan
```yaml
# disaster-recovery.yaml
recovery_objectives:
  rto: 4 hours  # Recovery Time Objective
  rpo: 1 hour   # Recovery Point Objective

procedures:
  database_failure:
    - Failover to read replica
    - Promote replica to primary
    - Update connection strings
    - Verify application connectivity
  
  application_failure:
    - Scale remaining instances
    - Deploy from last known good image
    - Clear cache layers
    - Monitor for stability
  
  complete_outage:
    - Activate DR site
    - Restore from backups
    - Update DNS
    - Notify stakeholders
```

## Section 8: Compliance & Auditing

### 8.1 Audit Logging
```javascript
// lib/audit.js
export function auditLog(action, user, details) {
  const log = {
    timestamp: new Date().toISOString(),
    action,
    user: user?.id || 'anonymous',
    ip: user?.ip,
    details,
    sessionId: user?.sessionId,
  };
  
  // Write to audit log
  fs.appendFileSync('audit.log', JSON.stringify(log) + '\n');
  
  // Send to SIEM
  fetch(process.env.SIEM_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(log),
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### 8.2 Data Privacy Controls
```javascript
// lib/privacy.js
export function anonymizeUser(user) {
  return {
    id: user.id,
    email: user.email.replace(/^(.{2}).*(@.*)$/, '$1***$2'),
    name: user.name.replace(/^(.).*(.)$/, '$1***$2'),
    createdAt: user.createdAt,
  };
}

export async function deleteUserData(userId) {
  // Delete from primary database
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `deleted-${userId}@deleted.com`,
      name: 'Deleted User',
      deleted_at: new Date(),
    },
  });
  
  // Delete from backups after 30 days
  scheduleJob('30 days', async () => {
    await permanentlyDeleteUser(userId);
  });
}
```

## Production Readiness Checklist

### Security ✓
- [ ] All secrets in AWS Secrets Manager
- [ ] JWT with RS256 algorithm
- [ ] Security headers implemented
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] HTTPS enforced
- [ ] SQL injection prevention

### Performance ✓
- [ ] Response compression enabled
- [ ] Static assets optimized
- [ ] CDN configured
- [ ] Database connection pooling
- [ ] Redis caching layer
- [ ] Memory usage < 512MB
- [ ] Response time < 200ms
- [ ] Bundle size < 5MB

### Reliability ✓
- [ ] Health checks implemented
- [ ] Circuit breakers configured
- [ ] Error handling complete
- [ ] Logging configured
- [ ] Monitoring setup
- [ ] Auto-scaling configured
- [ ] Load balancer configured
- [ ] Backup strategy implemented

### Compliance ✓
- [ ] GDPR compliance
- [ ] Audit logging
- [ ] Data retention policies
- [ ] Privacy controls
- [ ] Terms of service
- [ ] Privacy policy
- [ ] Cookie consent
- [ ] Data encryption

## Conclusion

This playbook transforms the Candlefish applications from development prototypes to production-ready systems. Full implementation requires approximately 2 weeks with a dedicated team. Priority should be given to critical security fixes (exposed secrets, authentication) before addressing performance and reliability improvements.

**Estimated Timeline:**
- Week 1: Security hardening (Critical)
- Week 2: Infrastructure & monitoring (High)
- Week 3: Performance & compliance (Medium)

**Success Metrics:**
- Zero critical vulnerabilities
- 99.9% uptime
- < 200ms response time
- < 0.1% error rate

---
*Generated by Production Hardening System v1.0*  
*Priority: P0 - Critical*