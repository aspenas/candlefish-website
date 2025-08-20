# STOP DOING - Activities to Cease Immediately
*Generated: August 19, 2025*

## Critical: Security Anti-Patterns (STOP IMMEDIATELY)

### 1. ❌ STOP Hardcoding Secrets in Code
**Current Practice**: JWT secrets, API keys, and passwords in source files  
**Impact**: Critical security vulnerability, potential data breach  
**Instead**: Use AWS Secrets Manager or environment variables exclusively  

### 2. ❌ STOP Committing .env Files to Git
**Current Practice**: Multiple .env files with production secrets in repositories  
**Impact**: Exposed credentials in version control  
**Instead**: Use .env.example files and inject secrets at runtime  

### 3. ❌ STOP Using SQLite in Production
**Current Practice**: Paintbox using file-based SQLite database  
**Impact**: No concurrent writes, data loss risk, no backups  
**Instead**: Migrate to PostgreSQL immediately  

### 4. ❌ STOP Disabling Security Features
**Current Practice**: CSP with unsafe-inline, CORS with wildcard origins  
**Impact**: XSS vulnerabilities, CSRF attacks possible  
**Instead**: Implement strict CSP and CORS policies  

## High Priority: Development Anti-Patterns

### 5. ❌ STOP Allocating 32GB for Node.js Builds
**Current Practice**: `--max-old-space-size=32768` in Paintbox  
**Impact**: Cannot deploy to standard infrastructure, excessive costs  
**Instead**: Optimize dependencies and implement code splitting  

### 6. ❌ STOP Installing Unnecessary Dependencies
**Current Practice**: 179 production dependencies in Paintbox  
**Impact**: 1.9GB node_modules, slow builds, security vulnerabilities  
**Instead**: Audit and remove unused packages monthly  

### 7. ❌ STOP Ignoring TypeScript Errors
**Current Practice**: `ignoreBuildErrors: true` in production  
**Impact**: Runtime errors, poor code quality  
**Instead**: Fix all type errors before deployment  

### 8. ❌ STOP Creating Mock-Only Features
**Current Practice**: PromoterOS with no real database  
**Impact**: Cannot deliver actual functionality  
**Instead**: Build with real data layer from start  

## Medium Priority: Process Anti-Patterns

### 9. ❌ STOP Starting New Projects Without Requirements
**Current Practice**: Crown Trophy development without specifications  
**Impact**: Wasted development time, wrong features built  
**Instead**: Document requirements before coding  

### 10. ❌ STOP Deploying Without Monitoring
**Current Practice**: No error tracking or uptime monitoring  
**Impact**: Unknown failures, poor user experience  
**Instead**: Implement Sentry and uptime monitoring before launch  

### 11. ❌ STOP Manual Secret Management
**Current Practice**: 55 individual secrets managed manually  
**Impact**: Time waste, rotation failures, security risks  
**Instead**: Automate with rotation policies  

### 12. ❌ STOP Maintaining Inactive Projects
**Current Practice**: Excel, Jonathon, Fogg projects sitting idle  
**Impact**: Cognitive overhead, maintenance burden  
**Instead**: Archive immediately  

## Low Priority: Optimization Anti-Patterns

### 13. ❌ STOP Running Unused AWS Resources
**Current Practice**: Load balancers and EBS volumes without applications  
**Impact**: $5-10/month unnecessary costs  
**Instead**: Audit and terminate weekly  

### 14. ❌ STOP Using Individual Secrets
**Current Practice**: 55 separate secrets at $0.40 each  
**Impact**: $20/month excess cost  
**Instead**: Consolidate into logical groups  

### 15. ❌ STOP Weak Rate Limiting
**Current Practice**: 5 requests/minute on auth endpoints  
**Impact**: Vulnerable to brute force attacks  
**Instead**: Implement 100 requests/minute with exponential backoff  

## Implementation Timeline

### TODAY (Critical Security)
- Remove all hardcoded secrets from code
- Rotate all exposed credentials
- Fix PromoterOS authentication bypass

### THIS WEEK (Production Blockers)
- Reduce Paintbox memory to <4GB
- Migrate SQLite to PostgreSQL
- Archive inactive projects

### NEXT WEEK (Quality & Process)
- Enable TypeScript strict mode
- Implement monitoring
- Consolidate AWS secrets

## Success Metrics

Track elimination of these practices:
- 0 hardcoded secrets in code (currently 8+)
- 0 .env files in Git (currently 3)
- <4GB memory usage (currently 32GB)
- <50 production dependencies (currently 179)
- <20 AWS secrets (currently 55)
- 0 inactive projects (currently 3)

## Accountability

**Daily Check**: Review commits for hardcoded secrets  
**Weekly Check**: Audit dependencies and AWS resources  
**Monthly Check**: Security scan and cost review  

## The One Rule

If you must choose only one thing to stop:

### 🛑 STOP HARDCODING SECRETS

This single change prevents the most catastrophic failure mode. Everything else can be fixed incrementally, but exposed secrets can destroy the business instantly.

---

*"The definition of insanity is doing the same thing over and over and expecting different results." - Stop these practices today to achieve different outcomes tomorrow.*