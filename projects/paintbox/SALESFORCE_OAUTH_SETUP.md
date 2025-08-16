# Salesforce OAuth 2.0 Setup Guide

This guide explains how to set up and use the comprehensive Salesforce OAuth 2.0 implementation in the Paintbox application.

## Overview

The Paintbox application now includes a complete OAuth 2.0 flow for Salesforce integration, replacing the previous username/password authentication method. This provides better security, user experience, and compliance with modern authentication standards.

## Features

### ✅ Complete OAuth 2.0 Implementation
- Authorization code flow with PKCE support
- Automatic token refresh
- Secure token storage in AWS Secrets Manager
- Comprehensive error handling and logging
- User-friendly connection management UI

### ✅ Security Features
- CSRF protection with state parameters
- Secure token storage (never exposed to client)
- Automatic token expiration handling
- Token revocation on disconnect
- Comprehensive audit logging

### ✅ User Experience
- One-click connection to Salesforce
- Real-time connection status monitoring
- Automatic reconnection handling
- Clear error messages and troubleshooting

## Prerequisites

### 1. Salesforce Connected App Configuration

You need to configure a Connected App in Salesforce:

1. **Login to Salesforce Setup**
   - Go to Setup → Apps → App Manager
   - Click "New Connected App"

2. **Basic Information**
   - Connected App Name: `Paintbox Integration`
   - API Name: `Paintbox_Integration`
   - Contact Email: Your email address

3. **API (Enable OAuth Settings)**
   - Enable OAuth Settings: ✓
   - Callback URL: `https://your-domain.com/api/auth/salesforce/callback`
   - Selected OAuth Scopes:
     - `Access and manage your data (api)`
     - `Perform requests on your behalf at any time (refresh_token, offline_access)`
     - `Access your basic information (id, profile, email, address, phone)`

4. **Security Settings**
   - IP Relaxation: `Relax IP restrictions`
   - Refresh Token Policy: `Refresh token is valid until revoked`

5. **Save and Note Credentials**
   - Consumer Key (Client ID)
   - Consumer Secret (Client Secret)
   - Instance URL (e.g., https://your-org.my.salesforce.com)

### 2. AWS Secrets Manager Configuration

Store your Salesforce OAuth credentials securely:

```bash
# Update your AWS secrets with OAuth configuration
aws secretsmanager update-secret \
  --secret-id "paintbox/secrets" \
  --secret-string '{
    "salesforce": {
      "clientId": "your_consumer_key",
      "clientSecret": "your_consumer_secret",
      "instanceUrl": "https://your-org.my.salesforce.com",
      "redirectUri": "https://your-domain.com/api/auth/salesforce/callback",
      "apiVersion": "v62.0"
    }
  }'
```

### 3. Environment Configuration

Set up your environment variables:

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://your-domain.com
AWS_REGION=us-east-1
AWS_SECRETS_MANAGER_SECRET_NAME=paintbox/secrets
```

## Usage

### 1. User Connection Flow

Users can connect to Salesforce through the UI:

```typescript
import { SalesforceConnectionManager } from '@/components/ui/SalesforceConnectionManager';

function SettingsPage() {
  return (
    <div>
      <h2>Salesforce Integration</h2>
      <SalesforceConnectionManager 
        onConnectionChange={(isConnected) => {
          console.log('Connection status:', isConnected);
        }}
        showAdvancedInfo={true}
        autoRefresh={true}
      />
    </div>
  );
}
```

### 2. Programmatic Access

Access Salesforce data in your API routes:

```typescript
import { salesforceService } from '@/lib/services/salesforce';

export async function GET() {
  try {
    // The service automatically handles OAuth tokens
    const contacts = await salesforceService.searchContacts('John');
    return NextResponse.json(contacts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}
```

### 3. Connection Status Check

Monitor connection status in components:

```typescript
import { SalesforceConnectionBadge } from '@/components/ui/SalesforceConnectionManager';

function Header() {
  return (
    <header>
      <h1>Paintbox</h1>
      <SalesforceConnectionBadge />
    </header>
  );
}
```

## API Endpoints

### OAuth Management Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/salesforce/authorize` | GET | Initiate OAuth flow |
| `/api/auth/salesforce/callback` | GET | Handle OAuth callback |
| `/api/auth/salesforce/status` | GET | Get connection status |
| `/api/auth/salesforce/refresh` | POST | Manually refresh tokens |
| `/api/auth/salesforce/disconnect` | POST | Disconnect and revoke tokens |
| `/api/auth/salesforce/test` | GET | Test connection |

### Example Usage

```bash
# Check connection status
curl https://your-domain.com/api/auth/salesforce/status

# Initiate connection (redirects to Salesforce)
curl https://your-domain.com/api/auth/salesforce/authorize

# Test connection
curl https://your-domain.com/api/auth/salesforce/test

# Disconnect
curl -X POST https://your-domain.com/api/auth/salesforce/disconnect
```

## Error Handling

The implementation includes comprehensive error handling:

### Error Types

- **OAuthConfigurationError**: Missing or invalid configuration
- **OAuthAuthorizationError**: Authorization failed or denied
- **OAuthTokenError**: Token invalid or expired
- **OAuthStateError**: CSRF protection triggered
- **OAuthNetworkError**: Network connectivity issues
- **OAuthScopeError**: Insufficient permissions

### Error Recovery

The system automatically handles:
- Token expiration (automatic refresh)
- Network timeouts (retry with exponential backoff)
- Configuration validation
- User-friendly error messages

## Logging and Monitoring

### Log Categories

- **OAuth Flow**: Authorization, token exchange, refresh
- **API Requests**: Salesforce API calls and responses
- **Security Events**: State validation, token revocation
- **Performance**: Operation timing and metrics
- **Errors**: Detailed error analysis and patterns

### Monitoring Endpoints

```bash
# Get detailed connection test
curl -X POST https://your-domain.com/api/auth/salesforce/test \
  -H "Content-Type: application/json" \
  -d '{"testType": "full"}'

# Configuration validation
curl -X POST https://your-domain.com/api/auth/salesforce/test \
  -H "Content-Type: application/json" \
  -d '{"testType": "config"}'
```

## Troubleshooting

### Common Issues

1. **"Invalid client configuration"**
   - Verify Consumer Key/Secret in AWS Secrets Manager
   - Check Connected App settings in Salesforce

2. **"Callback URL mismatch"**
   - Ensure callback URL in Salesforce matches your domain
   - Verify NEXT_PUBLIC_API_URL environment variable

3. **"Invalid state parameter"**
   - Check if cookies are enabled
   - Verify session persistence

4. **"Insufficient scope"**
   - Update OAuth scopes in Salesforce Connected App
   - Request additional permissions from Salesforce admin

### Debug Mode

Enable debug logging in development:

```bash
NODE_ENV=development
```

Debug logs include:
- Token information (sanitized)
- API request/response details
- OAuth flow step-by-step tracking
- Performance metrics

### Testing

Run the test suite:

```bash
# Test OAuth functionality
npm run test:oauth

# Test Salesforce integration
npm run test:salesforce

# Full integration test
npm run test:integration
```

## Migration from Username/Password

If you're migrating from the old username/password authentication:

1. **Configure OAuth** as described above
2. **Update secrets** to include OAuth fields
3. **Test connection** using new OAuth flow
4. **Remove legacy credentials** from secrets (optional)

The system maintains backward compatibility and will fall back to username/password if OAuth is not configured.

## Security Considerations

### Token Security
- Tokens are stored encrypted in AWS Secrets Manager
- Never exposed to client-side code
- Automatic rotation on refresh
- Secure revocation on disconnect

### Network Security
- HTTPS required in production
- CSRF protection with state parameters
- Secure cookie handling
- Request validation and sanitization

### Audit Trail
- All OAuth operations are logged
- Security events are tracked
- Error patterns are analyzed
- Performance metrics collected

## Support

### Documentation
- API endpoint documentation in code
- Error code reference in `/lib/errors/oauth-errors.ts`
- Logging utilities in `/lib/logging/oauth-logger.ts`

### Monitoring
- CloudWatch integration for production
- Detailed error reporting
- Performance tracking
- User activity monitoring

### Maintenance
- Automatic token refresh
- Health check endpoints
- Configuration validation
- Error recovery procedures

For additional support, check the application logs or contact the development team.