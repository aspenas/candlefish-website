# Manual Google OAuth2 Redirect URI Update Guide

## Current Status ✅
- **Test Result**: Redirect URI appears to be configured correctly
- **Client ID**: `[REDACTED_GOOGLE_CLIENT_ID]`
- **Project**: `l0-candlefish`
- **Primary Redirect URI**: `https://paintbox.fly.dev/api/auth/callback/google`

## Test Results from Script
The automated test showed:
- HTTP Status: **302** (successful redirect)
- Google accepted the redirect URI and proceeded with OAuth flow
- No `redirect_uri_mismatch` error detected

## Manual Steps (if needed)

### 1. Access Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select project: **l0-candlefish**
3. Find OAuth 2.0 Client ID: `[REDACTED_GOOGLE_CLIENT_ID]`

### 2. Update Authorized Redirect URIs
Click the edit button (pencil icon) and ensure these URIs are configured:

#### Production URIs (Required)
```
https://paintbox.fly.dev/api/auth/callback/google
```

#### Development/Staging URIs (Optional)
```
http://localhost:3000/api/auth/callback/google
https://paintbox-staging.fly.dev/api/auth/callback/google
https://paintbox.netlify.app/api/auth/callback/google
```

### 3. Save Changes
Click **"Save"** to apply the changes.

## Verification Commands

### Test the OAuth Flow
```bash
# Test the primary redirect URI
curl -I "https://accounts.google.com/o/oauth2/v2/auth?client_id=[REDACTED_CLIENT_ID]&redirect_uri=https%3A%2F%2Fpaintbox.fly.dev%2Fapi%2Fauth%2Fcallback%2Fgoogle&response_type=code&scope=openid%20profile%20email&state=test"

# Expected: HTTP 302 (redirect to Google login)
```

### Test the Application
1. Navigate to: https://paintbox.fly.dev/login
2. Click "Sign in with Google"
3. Should redirect to Google without `redirect_uri_mismatch` error

## Current Google OAuth Configuration

Based on AWS Secrets Manager (`candlefish/google-oauth2-config`):
```json
{
  "web": {
    "client_id": "[REDACTED_GOOGLE_CLIENT_ID]",
    "project_id": "l0-candlefish",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "[REDACTED_GOOGLE_CLIENT_SECRET]"
  }
}
```

## Troubleshooting

### If you still get `redirect_uri_mismatch`:
1. Check exact URI spelling (case-sensitive)
2. Verify protocol (https vs http)
3. Ensure no trailing slashes
4. Wait 5-10 minutes for changes to propagate

### Common Issues:
- **Case sensitivity**: `callback` vs `Callback`
- **Protocol mismatch**: `http` vs `https`
- **Path mismatch**: `/api/auth/callback/google` vs `/auth/callback/google`
- **Domain mismatch**: `paintbox.fly.dev` vs `www.paintbox.fly.dev`

## Alternative Programmatic Update (Advanced)

If you need programmatic updates in the future:

1. **Create Service Account**:
   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
   - Project: `l0-candlefish`
   - Create service account with Cloud Platform Admin role

2. **Store Service Account Key**:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id "candlefish/google-service-account" \
     --secret-string "$(cat service-account-key.json)"
   ```

3. **Use Google Client Libraries**:
   ```javascript
   const { google } = require('googleapis');
   const oauth2 = google.oauth2('v2');
   // ... implementation
   ```

## Next Steps

1. ✅ Test confirmed redirect URI is working
2. ✅ No immediate action required
3. 🔄 Monitor application login flow
4. 📝 Document any issues for future reference

**Status**: OAuth redirect URI configuration appears to be correct and functional.
