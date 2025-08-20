# OAuth Security Audit Report & Redirect URI Fix
**Date:** August 20, 2025  
**Auditor:** Security Specialist  
**Application:** Paintbox (paintbox.fly.dev)  
**Severity:** HIGH - Authentication Flow Broken

## Executive Summary

The Google OAuth authentication is failing with a `redirect_uri_mismatch` error due to a configuration mismatch between the deployed application URL and the NextAuth configuration. The application is deployed at `https://paintbox.fly.dev` but NextAuth is configured to use `https://paintbox.candlefish.ai` as the redirect URI.

## Security Vulnerabilities Identified

### 1. Authentication Flow Failure (OWASP A07:2021 - Identification and Authentication Failures)
**Severity:** HIGH  
**Status:** ACTIVE  

#### Issue Details
- **Error:** `Error 400: redirect_uri_mismatch`
- **Root Cause:** NEXTAUTH_URL environment variable mismatch
- **Current Configuration:** 
  - `NEXTAUTH_URL=https://paintbox.candlefish.ai` (in .env.production)
  - Application deployed at: `https://paintbox.fly.dev`
  - OAuth redirect URI being sent: `https://paintbox.candlefish.ai/api/auth/callback/google`
  - Expected by Google: `https://paintbox.fly.dev/api/auth/callback/google`

#### Security Impact
- Users cannot authenticate with Google OAuth
- Complete authentication bypass vulnerability if alternative auth methods are implemented incorrectly
- Potential for session fixation if misconfigured

### 2. Configuration Management Issues (OWASP A05:2021 - Security Misconfiguration)
**Severity:** MEDIUM  

#### Issues Found
1. Inconsistent environment variable management across deployment platforms
2. No validation of OAuth configuration at startup
3. Debug mode exposed in development (line 67, 70 duplicate in route.ts)
4. No rate limiting on authentication endpoints

### 3. Secrets Management (OWASP A02:2021 - Cryptographic Failures)
**Severity:** MEDIUM  

#### Current State
- Google OAuth credentials stored in environment variables
- Fallback to AWS Secrets Manager not fully implemented
- Client ID exposed in frontend (acceptable for OAuth2 public clients)
- No credential rotation mechanism

## Immediate Fix Required

### Step 1: Update Google Cloud Console

Add the correct redirect URIs to your Google OAuth 2.0 Client ID configuration:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your project
3. Click on OAuth 2.0 Client ID: `***REMOVED***`
4. Add these Authorized redirect URIs:
   ```
   https://paintbox.fly.dev/api/auth/callback/google
   https://paintbox.candlefish.ai/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```
5. Save the changes

### Step 2: Update Fly.io Environment Variables

```bash
# Set the correct NEXTAUTH_URL for Fly.io deployment
fly secrets set NEXTAUTH_URL=https://paintbox.fly.dev --app paintbox

# Verify the secret was set
fly secrets list --app paintbox
```

### Step 3: Fix Code Issues

The NextAuth configuration has a duplicate `debug` property (lines 67 and 70). This needs to be fixed:

```typescript
// Remove duplicate debug property at line 70
const handler = NextAuth({
  // ... other config
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  url: process.env.NEXTAUTH_URL || (process.env.NODE_ENV === 'production' ? 'https://paintbox.fly.dev' : 'http://localhost:3000'),
  // Remove this duplicate: debug: process.env.NODE_ENV === 'development',
})
```

## Security Recommendations

### 1. Authentication Security Headers
Add these security headers to all authentication endpoints:

```typescript
// middleware.ts or security-headers.ts
export const authSecurityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; frame-src https://accounts.google.com;",
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}
```

### 2. Rate Limiting Implementation
Implement rate limiting on authentication endpoints:

```typescript
// lib/middleware/auth-rate-limit.ts
export const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
}
```

### 3. OAuth State Parameter Validation
Ensure CSRF protection with state parameter:

```typescript
// Already handled by NextAuth, but verify:
callbacks: {
  async signIn({ account, profile }) {
    // Validate state parameter
    if (!account?.state) {
      console.error('Missing OAuth state parameter')
      return false
    }
    // ... rest of validation
  }
}
```

### 4. Session Security Configuration
Enhance session security:

```typescript
session: {
  strategy: "database",
  maxAge: 24 * 60 * 60, // 24 hours
  updateAge: 60 * 60, // 1 hour
},
cookies: {
  sessionToken: {
    name: `__Secure-next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true
    }
  }
}
```

## Verification Steps

After implementing the fixes:

1. **Test OAuth Flow:**
   ```bash
   # Test the OAuth redirect
   curl -I "https://paintbox.fly.dev/api/auth/signin?callbackUrl=%2F"
   
   # Should return 200 OK instead of 400
   ```

2. **Verify Redirect URI:**
   ```bash
   # Check the actual redirect URI being generated
   curl "https://paintbox.fly.dev/api/auth/providers" | jq '.google.callbackUrl'
   
   # Should return: https://paintbox.fly.dev/api/auth/callback/google
   ```

3. **Security Headers Check:**
   ```bash
   # Verify security headers
   curl -I "https://paintbox.fly.dev/api/auth/session" | grep -E "X-Frame-Options|Strict-Transport-Security"
   ```

## OWASP References

- **A07:2021 – Identification and Authentication Failures:** OAuth misconfiguration falls under this category
- **A05:2021 – Security Misconfiguration:** Environment variable and deployment configuration issues
- **A02:2021 – Cryptographic Failures:** Secrets management and session security
- **A04:2021 – Insecure Design:** Lack of configuration validation at startup

## Compliance Checklist

- [ ] OAuth redirect URIs updated in Google Cloud Console
- [ ] NEXTAUTH_URL environment variable updated on Fly.io
- [ ] Duplicate debug property removed from code
- [ ] Security headers implemented
- [ ] Rate limiting configured
- [ ] Session security enhanced
- [ ] HTTPS enforced on all authentication endpoints
- [ ] Error messages do not leak sensitive information
- [ ] Audit logging enabled for authentication events

## Monitoring Recommendations

1. **Set up alerts for:**
   - Failed authentication attempts > 10 per minute
   - OAuth redirect_uri_mismatch errors
   - Session token validation failures
   - Unusual geographic login patterns

2. **Log and monitor:**
   - All authentication events (success/failure)
   - OAuth provider responses
   - Session creation/destruction
   - Rate limit violations

## Conclusion

The primary issue is a simple configuration mismatch that can be fixed by updating the NEXTAUTH_URL environment variable on Fly.io to match the deployed URL. However, this audit revealed several security improvements that should be implemented to ensure robust authentication security.

**Immediate Action Required:** Update Fly.io secrets and Google Cloud Console redirect URIs as outlined in the fix steps above.

## Automated Fix Script

See `scripts/fix-oauth-redirect-uri.sh` for an automated solution.