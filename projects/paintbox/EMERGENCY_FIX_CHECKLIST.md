# EMERGENCY FIX CHECKLIST - Paintbox Deployment

## ⚡ IMMEDIATE ACTIONS (2-4 hours)

### 1. Fix Connection Limits (5 minutes)
```toml
# fly.emergency.toml
[services.concurrency]
  type = "connections"
  hard_limit = 1000  # From 25
  soft_limit = 900   # From 20

[[vm]]
  memory_mb = 1024  # From 512
```

### 2. Remove Hardcoded PII (15 minutes)
```javascript
// server.simple.js - Remove all value="" attributes with personal data
<input type="text" placeholder="Enter client name">  // Remove value="John Smith"
<input type="tel" placeholder="(555) 123-4567">      // Remove value="(555) 123-4567"
<input type="email" placeholder="client@email.com">  // Remove value="john.smith@email.com"
```

### 3. Add Security Headers (30 minutes)
```javascript
// server.simple.js - Add after line 3
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"]
    }
  }
}));

// Add compression
const compression = require('compression');
app.use(compression());

// Add cache headers
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/login') {
    res.set('Cache-Control', 'public, max-age=3600');
  }
  next();
});
```

### 4. Fix XSS Vulnerabilities (30 minutes)
```javascript
// Replace inline onclick handlers with forms
// Before:
<button onclick="alert('...')">Generate</button>

// After:
<form action="/api/estimate/generate" method="POST">
  <button type="submit">Generate</button>
</form>
```

### 5. Deploy Emergency Fixes
```bash
# Install dependencies
npm install helmet compression

# Rebuild and deploy
docker build -f Dockerfile.emergency -t paintbox-emergency .
fly deploy -c fly.emergency.toml --image paintbox-emergency
```

## 🔧 DAY 1 FIXES (Tomorrow - 8 hours)

### 1. Extract HTML Templates
- Move all HTML from server.simple.js to separate files
- Use EJS or Handlebars for templating
- Separate CSS into external stylesheets

### 2. Implement Basic Authentication
- Use the provided security-implementation.ts
- Add JWT-based sessions
- Implement password hashing with bcrypt

### 3. Add Input Validation
- Install zod for schema validation
- Validate all form inputs
- Sanitize user data with DOMPurify

### 4. Create Service Layer
- Extract business logic from routes
- Add basic calculation service
- Implement error handling

## 🚀 WEEK 1 GOALS

### 1. Restore Excel Engine
- Connect the 14,000+ formula engine
- Implement calculation caching
- Add formula validation

### 2. Enable Integrations
- Restore Salesforce connection
- Enable CompanyCam API
- Implement webhook handlers

### 3. Production Deployment
- Migrate to full Next.js build
- Enable CDN and static assets
- Implement monitoring and logging

## 📊 SUCCESS METRICS

After Emergency Fixes:
- ✅ Support 100+ concurrent users
- ✅ No security vulnerabilities
- ✅ Response time < 100ms
- ✅ Basic authentication working

After Day 1:
- ✅ Proper architecture restored
- ✅ Security hardened
- ✅ 50% functionality restored

After Week 1:
- ✅ Full production ready
- ✅ All integrations working
- ✅ Excel engine operational
- ✅ Support 10,000+ users

## 🚨 DO NOT DEPLOY TO PRODUCTION UNTIL:
1. ✅ All Critical security issues fixed
2. ✅ Authentication implemented
3. ✅ Input validation added
4. ✅ Connection limits increased
5. ✅ Templates extracted from code
