# Paintbox - Next Shippable Increment (NSI)
*Generated: August 19, 2025*

## Project Status: 🔴 CRITICAL - Production Blocked

**Revenue Potential**: $500K - $1.5M ARR  
**Time to Revenue**: 14 days (with fixes)  
**Current Blockers**: 32GB memory requirement, SQLite database, security vulnerabilities  

## NSI Definition: Production-Ready MVP

### Success Criteria
✅ Memory usage <4GB  
✅ PostgreSQL database with backups  
✅ All security vulnerabilities patched  
✅ Deployed to Fly.io/Vercel  
✅ First paying customer onboarded  

## Critical Path (14 Days)

### Phase 1: Memory Crisis Resolution (Days 1-3)
**Goal**: Reduce memory from 32GB to <4GB

#### Day 1: Dependency Audit
```bash
# Remove unnecessary packages
npm uninstall jsdom @apollo/client socket.io-client
npm uninstall react-beautiful-dnd react-dnd
npm uninstall @sentry/nextjs  # Re-add after optimization

# Replace heavy packages
npm uninstall exceljs
npm install xlsx  # Lighter alternative
```

#### Day 2: Code Splitting Implementation
```javascript
// next.config.js updates
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@mui/material', '@mui/icons-material']
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        default: false,
        vendors: false,
        framework: {
          name: 'framework',
          chunks: 'all',
          test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
          priority: 40,
          enforce: true
        },
        lib: {
          test(module) {
            return module.size() > 160000 &&
              /node_modules[/\\]/.test(module.identifier())
          },
          name(module) {
            const hash = crypto.createHash('sha1')
            hash.update(module.identifier())
            return hash.digest('hex').substring(0, 8)
          },
          priority: 30,
          minChunks: 1,
          reuseExistingChunk: true
        }
      }
    }
    return config
  }
}
```

#### Day 3: Memory Testing
```bash
# Test with reduced memory
NODE_OPTIONS="--max-old-space-size=2048" npm run build
NODE_OPTIONS="--max-old-space-size=2048" npm run dev

# Profile memory usage
node --inspect scripts/memory-profiler.js
```

### Phase 2: Database Migration (Days 4-6)
**Goal**: Migrate from SQLite to PostgreSQL

#### Day 4: PostgreSQL Setup
```bash
# Install PostgreSQL dependencies
npm install @prisma/adapter-pg pg

# Update schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

# Add connection pooling
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}
```

#### Day 5: Data Migration
```sql
-- Create backup
sqlite3 prisma/dev.db .dump > backup.sql

-- Convert SQLite to PostgreSQL format
python scripts/sqlite-to-postgres.py backup.sql > import.sql

-- Import to PostgreSQL
psql paintbox_production < import.sql
```

#### Day 6: Testing & Optimization
```javascript
// Add connection pooling
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
```

### Phase 3: Security Hardening (Days 7-9)
**Goal**: Fix all P0 vulnerabilities

#### Day 7: Secret Management
```bash
# Move all secrets to AWS Secrets Manager
aws secretsmanager create-secret --name paintbox/production \
  --secret-string '{
    "NEXTAUTH_SECRET": "'"$(openssl rand -base64 32)"'",
    "DATABASE_URL": "postgresql://...",
    "GOOGLE_CLIENT_SECRET": "...",
    "SALESFORCE_CLIENT_SECRET": "..."
  }'

# Update .env.production
NEXTAUTH_SECRET=${AWS_SECRET_NEXTAUTH_SECRET}
DATABASE_URL=${AWS_SECRET_DATABASE_URL}
```

#### Day 8: CSP & Security Headers
```javascript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Strict CSP
  response.headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'sha256-...' https://apis.google.com; " +
    "style-src 'self' 'sha256-...'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.salesforce.com"
  )
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  return response
}
```

#### Day 9: Input Validation
```typescript
// lib/validation.ts
import { z } from 'zod'

export const estimateSchema = z.object({
  squareFootage: z.number().min(1).max(100000),
  coats: z.number().min(1).max(10),
  paintType: z.enum(['interior', 'exterior']),
  laborRate: z.number().min(0).max(1000)
})

// Use in API routes
export async function POST(req: Request) {
  const body = await req.json()
  const validated = estimateSchema.parse(body)
  // Process validated data
}
```

### Phase 4: Production Deployment (Days 10-12)
**Goal**: Deploy to production infrastructure

#### Day 10: Fly.io Setup
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Initialize app
fly launch --name paintbox-production

# Set secrets
fly secrets set NEXTAUTH_SECRET="..." DATABASE_URL="..."

# Deploy
fly deploy --strategy rolling
```

#### Day 11: Monitoring Setup
```javascript
// Install Sentry
npm install @sentry/nextjs

// sentry.client.config.js
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: 'production'
})

// Add error boundaries
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary fallback={<ErrorFallback />}>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

#### Day 12: Performance Testing
```bash
# Load testing
npm install -g autocannon
autocannon -c 100 -d 30 https://paintbox.fly.dev

# Lighthouse audit
npm install -g lighthouse
lighthouse https://paintbox.fly.dev --output html
```

### Phase 5: Customer Onboarding (Days 13-14)
**Goal**: First paying customer live

#### Day 13: Final Testing
- End-to-end testing of paint estimation flow
- Verify all 14,000 formulas working correctly
- Test with real customer data
- Confirm backup and restore procedures

#### Day 14: Go-Live
- Customer training session
- Production monitoring dashboard
- Support documentation
- Payment processing activation

## Deliverables Checklist

### Technical
- [ ] Memory usage <4GB verified
- [ ] PostgreSQL migration complete
- [ ] All secrets in AWS Secrets Manager
- [ ] CSP headers configured
- [ ] Input validation on all forms
- [ ] Sentry error tracking live
- [ ] Automated backups configured

### Business
- [ ] Pricing page live
- [ ] Stripe integration tested
- [ ] Terms of service published
- [ ] Privacy policy updated
- [ ] Customer support channel ready

### Documentation
- [ ] API documentation complete
- [ ] User guide created
- [ ] Admin manual written
- [ ] Deployment runbook updated

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Memory optimization fails | Low | High | Have Vercel Enterprise as backup |
| Database migration issues | Medium | High | Keep SQLite for rollback |
| Customer not ready | Low | Medium | Have backup customer lined up |
| Payment processing delays | Low | Low | Manual invoicing as backup |

## Success Metrics

### Week 1
- Memory reduced to <4GB ✓
- PostgreSQL migration complete ✓
- Security vulnerabilities fixed ✓

### Week 2
- Production deployment live ✓
- First customer onboarded ✓
- $99-299/month subscription active ✓

## Next Increment Preview

After this NSI, the next increment will focus on:
1. Multi-tenant architecture for enterprise customers
2. API for third-party integrations
3. Mobile app development
4. Advanced reporting features
5. AI-powered estimation improvements

## Go/No-Go Decision

**GO Criteria** (All must be met):
- Memory usage verified <4GB
- All P0 security issues resolved
- Database migration tested
- Customer contract signed

**Current Status**: NO-GO (memory and security issues blocking)
**Target GO Date**: Day 10 (after phases 1-3 complete)

---

*This NSI represents the minimum viable product for production launch. Focus on technical debt resolution first, then customer value delivery.*