# Security Dashboard Authentication Guide

## Overview
The Security Dashboard uses JSON Web Tokens (JWT) for authentication, with support for role-based access control.

## Authentication Flow

### 1. JWT Signing Infrastructure
- **Key Management**: Monthly key rotation via GitHub Actions
- **Algorithm**: RS256
- **Current Key ID**: 88672a69-26ae-45db-b73c-93debf7ea87d
- **JWKS Endpoint**: https://paintbox.fly.dev/.well-known/jwks.json

### 2. User Roles
- **Admin** (`ADMIN`): Full access to all endpoints and actions
- **Guest** (`GUEST`): Limited read-only access

### 3. Login Process
```bash
# Login Request
curl -X POST https://api.candlefish.ai/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@candlefish.ai",
    "password": "secure_password"
  }'

# Response
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user123",
    "email": "user@candlefish.ai",
    "role": "admin"
  }
}
```

### 4. API Request with JWT
```bash
# Example API Request
curl -X GET https://api.candlefish.ai/v1/api/dashboard/overview \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 5. Token Validation
- **Expiration**: 24 hours
- **Automatic Refresh**: Request a new token before expiration
- **Verification**: Uses JWKS endpoint for public key validation

### Security Best Practices
- Store tokens securely
- Use HTTPS for all requests
- Implement token refresh mechanism
- Never store tokens in local storage
- Use secure HTTP-only cookies for web applications