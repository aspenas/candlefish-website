# Security Implementation Guide - Candlefish.ai

## Overview
This guide provides step-by-step instructions for implementing the security recommendations from the security audit.

## Files Created/Modified

### 1. Security Audit Report
- **File:** `SECURITY_AUDIT_REPORT.md`
- **Purpose:** Complete security audit with findings and recommendations
- **Status:** ✅ Created

### 2. Secure Health Endpoint
- **File:** `app/api/health/route.secure.ts`
- **Purpose:** Secured version of health endpoint without sensitive information
- **Action Required:** Replace `route.ts` with `route.secure.ts` in production

### 3. Enhanced Netlify Configuration
- **File:** `netlify.secure.toml`
- **Purpose:** Production-ready security headers and CSP configuration
- **Action Required:** Replace `netlify.toml` with `netlify.secure.toml` for production

### 4. Secure Consideration Function
- **File:** `netlify/functions/consideration.secure.js`
- **Purpose:** Enhanced security with CORS restrictions and input sanitization
- **Action Required:** Replace `consideration.js` with `consideration.secure.js`

### 5. Security Disclosure File
- **File:** `public/.well-known/security.txt`
- **Purpose:** Standard security contact and disclosure information
- **Status:** ✅ Ready for deployment

### 6. Next.js Security Middleware
- **File:** `middleware.ts`
- **Purpose:** Runtime security headers and API protection
- **Status:** ✅ Ready for deployment

## Implementation Steps

### Step 1: Update Health Endpoint
```bash
# Backup current file
cp app/api/health/route.ts app/api/health/route.backup.ts

# Replace with secure version
cp app/api/health/route.secure.ts app/api/health/route.ts
```

### Step 2: Update Netlify Configuration
```bash
# Backup current configuration
cp netlify.toml netlify.backup.toml

# Use secure configuration
cp netlify.secure.toml netlify.toml
```

### Step 3: Update Consideration Function
```bash
# Backup current function
cp netlify/functions/consideration.js netlify/functions/consideration.backup.js

# Use secure version
cp netlify/functions/consideration.secure.js netlify/functions/consideration.js
```

### Step 4: Set Environment Variables
Add these to your Netlify environment variables:

```env
# CORS Configuration
ALLOWED_ORIGINS=https://candlefish.ai,https://www.candlefish.ai

# Metrics Authentication (generate a secure token)
METRICS_AUTH_TOKEN=your-secure-token-here

# Node Environment
NODE_ENV=production
```

### Step 5: Deploy Security Headers
The middleware.ts file will automatically apply security headers. No additional configuration needed.

### Step 6: Verify Security Implementation

#### Check Security Headers
```bash
curl -I https://candlefish.ai
```

Expected headers:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security: max-age=63072000
- Content-Security-Policy: [secure policy]

#### Check Health Endpoint
```bash
curl https://candlefish.ai/api/health
```

Should return minimal information:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-22T...",
  "version": "1.0.0"
}
```

#### Check Security.txt
```bash
curl https://candlefish.ai/.well-known/security.txt
```

## Security Checklist

### Pre-Deployment
- [ ] Remove all console.log statements with sensitive data
- [ ] Verify no API keys in code
- [ ] Update ALLOWED_ORIGINS in environment
- [ ] Generate METRICS_AUTH_TOKEN
- [ ] Test CSP in staging environment

### Post-Deployment
- [ ] Verify security headers with securityheaders.com
- [ ] Test rate limiting on forms
- [ ] Check health endpoint doesn't expose sensitive data
- [ ] Verify CORS restrictions work
- [ ] Test security.txt accessibility

### Monitoring
- [ ] Set up alerts for 429 responses (rate limiting)
- [ ] Monitor for CSP violations
- [ ] Track failed authentication attempts
- [ ] Review security logs weekly

## Content Security Policy Notes

### Current CSP Configuration
The secure CSP removes `unsafe-inline` and `unsafe-eval` for scripts. This may break:
1. Inline event handlers (onclick, etc.)
2. Inline script tags
3. eval() usage

### Migration Path
1. **Phase 1:** Deploy with current CSP (includes unsafe-inline for styles only)
2. **Phase 2:** Add nonce support for inline scripts
3. **Phase 3:** Move all inline styles to external stylesheets
4. **Phase 4:** Remove all unsafe directives

### Testing CSP
```javascript
// Add to development environment to log CSP violations
if (typeof window !== 'undefined') {
  document.addEventListener('securitypolicyviolation', (e) => {
    console.warn('CSP violation:', {
      blockedURI: e.blockedURI,
      violatedDirective: e.violatedDirective,
      originalPolicy: e.originalPolicy
    });
  });
}
```

## API Security

### Protected Endpoints
The following endpoints require authentication in production:
- `/api/metrics` - Prometheus metrics
- `/api/health/detailed` - Detailed health information

### Authentication Method
Bearer token authentication:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://candlefish.ai/api/metrics
```

### Rate Limiting
Current limits:
- Consideration form: 5 requests/minute per IP
- General API: No current limit (consider adding)

## CORS Configuration

### Current Setup
- Development: All origins allowed
- Production: Only candlefish.ai domains

### Adding New Origins
Update environment variable:
```env
ALLOWED_ORIGINS=https://candlefish.ai,https://www.candlefish.ai,https://new-domain.com
```

## Incident Response

### Security Issue Detected
1. Document the issue
2. Assess severity (Critical/High/Medium/Low)
3. Implement immediate mitigation
4. Contact security@candlefish.ai
5. Plan permanent fix
6. Update this documentation

### Contact Points
- Security Issues: security@candlefish.ai
- General Support: hello@candlefish.ai
- Emergency: [Add emergency contact]

## Regular Security Tasks

### Weekly
- [ ] Review security logs
- [ ] Check for dependency updates
- [ ] Monitor rate limiting effectiveness

### Monthly
- [ ] Security header audit
- [ ] CSP violation review
- [ ] Update security.txt expiry

### Quarterly
- [ ] Full security audit
- [ ] Penetration testing (if applicable)
- [ ] Security training update

## Additional Resources

### Security Testing Tools
- [SecurityHeaders.com](https://securityheaders.com) - Header analysis
- [CSP Evaluator](https://csp-evaluator.withgoogle.com) - CSP validation
- [SSL Labs](https://www.ssllabs.com/ssltest/) - SSL/TLS testing
- [OWASP ZAP](https://www.zaproxy.org) - Security scanning

### References
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [Content Security Policy Guide](https://content-security-policy.com)
- [security.txt Standard](https://securitytxt.org)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-08-22 | Initial security implementation |

---

**Note:** This is a living document. Update it as security measures evolve.
