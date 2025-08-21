# Google OAuth Redirect URI Update Guide

## Quick Fix Instructions

### Problem
Your Google OAuth login is showing `Error 400: redirect_uri_mismatch` because the redirect URI being sent by your application doesn't match what's configured in Google Cloud Console.

### Root Cause
- **Application URL:** `https://paintbox.fly.dev`
- **Redirect URI being sent:** `https://paintbox.candlefish.ai/api/auth/callback/google`
- **Should be sending:** `https://paintbox.fly.dev/api/auth/callback/google`

## Step 1: Update Google Cloud Console (5 minutes)

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Make sure you're in the correct project

2. **Find Your OAuth Client**
   - Look for OAuth 2.0 Client ID: `641173075272-vu85i613rarruqsfst59qve7bvvrrd2s.apps.googleusercontent.com`
   - Click on it to edit

3. **Add Authorized Redirect URIs**
   Add ALL of these URIs (copy-paste exactly):
   ```
   https://paintbox.fly.dev/api/auth/callback/google
   https://paintbox.candlefish.ai/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```

4. **Save Changes**
   - Click the "SAVE" button at the bottom
   - Changes take effect immediately

## Step 2: Update Fly.io Environment Variable (2 minutes)

Run this command in your terminal:

```bash
# Update NEXTAUTH_URL to match your deployed URL
fly secrets set NEXTAUTH_URL=https://paintbox.fly.dev --app paintbox

# Verify it was set correctly
fly secrets list --app paintbox | grep NEXTAUTH_URL
```

## Step 3: Redeploy the Application (5 minutes)

```bash
# Trigger a new deployment to apply the environment variable
fly deploy --app paintbox
```

## Step 4: Verify the Fix

After deployment completes (about 3-5 minutes):

1. **Clear your browser cache**
   - Chrome: Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)
   - Select "Cached images and files"
   - Click "Clear data"

2. **Test the login**
   - Go to: https://paintbox.fly.dev/login
   - Click "Sign in with Google"
   - Should now work without the redirect_uri_mismatch error

## Alternative: Use the Automated Script

We've created a script to automate most of these steps:

```bash
cd /Users/patricksmith/candlefish-ai/projects/paintbox
./scripts/fix-oauth-redirect-uri.sh
```

This script will:
- Update Fly.io environment variables
- Check all OAuth settings
- Guide you through the Google Cloud Console updates
- Optionally trigger a redeployment

## Troubleshooting

If you still see the error after following these steps:

1. **Check DNS**
   ```bash
   dig paintbox.fly.dev
   # Should resolve to Fly.io IPs
   ```

2. **Verify environment variable**
   ```bash
   fly ssh console --app paintbox
   echo $NEXTAUTH_URL
   # Should show: https://paintbox.fly.dev
   ```

3. **Check OAuth providers endpoint**
   ```bash
   curl https://paintbox.fly.dev/api/auth/providers | jq .
   # Check that google.callbackUrl shows the correct URL
   ```

4. **Double-check Google Cloud Console**
   - Make sure you saved the changes
   - Verify the URIs are exactly as shown (no trailing slashes)
   - Check you're in the right project

## Security Notes

- The Client ID (`641173075272...`) is safe to be public
- Never share the Client Secret
- Always use HTTPS in production
- The redirect URIs must match exactly (protocol, domain, path)

## Support

If you need help:
1. Check the security audit report: `OAUTH_SECURITY_AUDIT_AND_FIX.md`
2. Review application logs: `fly logs --app paintbox`
3. Verify all secrets are set: `fly secrets list --app paintbox`
