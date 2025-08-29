# 🔐 Security Implementation Guide

## Quick Start - Production Deployment

### Step 1: AWS Secrets Setup
```bash
# Create JWT signing keys
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "candlefish/jwt/private-key" \
  --secret-string file://private.pem \
  --region us-east-1

aws secretsmanager create-secret \
  --name "candlefish/jwt/public-key" \
  --secret-string file://public.pem \
  --region us-east-1

# Create user passwords (bcrypt hashed)
npm install -g bcryptjs-cli
bcryptjs hash "YourSecurePassword" 10

# Store hashed passwords
aws secretsmanager create-secret \
  --name "candlefish/users/tyler@candlefish.ai/password" \
  --secret-string "$2a$10$..." \
  --region us-east-1
```

### Step 2: Environment Configuration
```bash
# Copy secure environment template
cp .env.secure.example .env.local

# Edit .env.local with your values
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://security.candlefish.ai
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=681214184463
```

### Step 3: Install Dependencies
```bash
npm install jsonwebtoken jwks-rsa bcryptjs lru-cache
npm install @aws-sdk/client-secrets-manager
npm install speakeasy qrcode  # For MFA support
```

### Step 4: Update Existing Files

#### Update `middleware.ts`
```typescript
// Replace existing middleware.ts with:
export { middleware, config } from './src/middleware';
```

#### Update `app/layout.tsx`
```typescript
import { SecureAuthProvider } from '@/components/auth/SecureAuthProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SecureAuthProvider>
          {children}
        </SecureAuthProvider>
      </body>
    </html>
  );
}
```

### Step 5: Create API Routes

#### `/app/api/auth/login/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { signToken, setAuthCookies } from '@/lib/auth/jwt-manager';

export async function POST(request: NextRequest) {
  try {
    const { email, password, mfaCode } = await request.json();
    
    // Generate tokens
    const tokens = await signToken(email, password);
    
    // Set httpOnly cookies
    const response = NextResponse.json({
      success: true,
      user: {
        email,
        // ... other user data
      }
    });
    
    // Set secure cookies
    response.cookies.set('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: tokens.expiresIn,
    });
    
    response.cookies.set('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 604800, // 7 days
    });
    
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }
}
```

### Step 6: Test Security Implementation

```bash
# Run security tests
npm run test:security

# Test rate limiting
for i in {1..10}; do
  curl -X POST https://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done

# Check security headers
curl -I https://localhost:3000

# Verify JWT in cookies (not localStorage)
# Open browser DevTools → Application → Cookies
```

### Step 7: Production Deployment

```bash
# Build for production
npm run build

# Set production environment
export NODE_ENV=production

# Start with PM2 for process management
npm install -g pm2
pm2 start npm --name "security-dashboard" -- start
pm2 save
pm2 startup
```

## Security Monitoring Dashboard

### Create `/app/dashboard/security/page.tsx`
```typescript
'use client';

import { useAuth, withAuth } from '@/components/auth/SecureAuthProvider';
import { getRateLimiterStats } from '@/middleware/rate-limiter';

function SecurityDashboard() {
  const { user, checkPermission } = useAuth();
  
  if (!checkPermission('canViewSecurityReports')) {
    return <div>Unauthorized</div>;
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Security Dashboard</h1>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold">Rate Limiter Status</h2>
          {/* Display rate limiter stats */}
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold">Recent Login Attempts</h2>
          {/* Display login attempts */}
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold">Active Sessions</h2>
          {/* Display active sessions */}
        </div>
      </div>
    </div>
  );
}

export default withAuth(SecurityDashboard, 'canViewSecurityReports');
```

## Troubleshooting

### Common Issues

1. **"AWS Secrets Manager access denied"**
   - Ensure IAM role has `secretsmanager:GetSecretValue` permission
   - Check AWS_REGION is set correctly

2. **"JWKS endpoint unreachable"**
   - Verify https://paintbox.fly.dev/.well-known/jwks.json is accessible
   - Check network/firewall settings

3. **"Rate limit triggered too quickly"**
   - Adjust limits in `/src/middleware/rate-limiter.ts`
   - Add IP to whitelist if needed

4. **"Cookies not being set"**
   - Ensure HTTPS in production
   - Check SameSite and Secure flags
   - Verify domain configuration

## Security Checklist

- [ ] All secrets in AWS Secrets Manager
- [ ] HTTPS enabled with valid certificate
- [ ] Rate limiting active
- [ ] Security headers configured
- [ ] JWT with RS256 signing
- [ ] HttpOnly cookies for tokens
- [ ] MFA enabled for admin users
- [ ] Audit logging enabled
- [ ] Monitoring alerts configured
- [ ] Backup encryption enabled

## Support

For security issues: security@candlefish.ai  
For implementation help: patrick@candlefish.ai