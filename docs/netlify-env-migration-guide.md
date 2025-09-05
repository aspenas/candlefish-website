# Netlify Environment Variable Migration Guide

This guide provides step-by-step instructions for migrating Netlify functions from hardcoded API keys to secure environment variables.

## Overview

We have identified 9 Netlify functions that require environment variable configuration:

### Functions Requiring Migration:
1. `newsletter.js` - Newsletter subscription handling
2. `contact.js` - Contact form processing  
3. `consultation.js` - Consultation request handling
4. `consideration.js` - Consideration form processing
5. `consideration_secure.js` - Secure consideration handling
6. `nanda.js` - NANDA assessment processing
7. `workshop.js` - Workshop booking handling
8. `workshop-note-deploy.js` - Workshop note deployment
9. `deployment-webhook.js` - Deployment webhook handling

### Security Issue Identified:
- **Hardcoded API Key**: `re_2FVsRwCV_4TbXMBxbL9Dw5BQ5EqSuu1rZ` found in:
  - `/brand/website/.env.local`
  - `/brand/website/netlify/functions/newsletter.js`

## Migration Steps

### Step 1: Update Environment Variable Configuration

#### 1.1 Remove Hardcoded API Keys
The old API key `re_2FVsRwCV_4TbXMBxbL9Dw5BQ5EqSuu1rZ` has been removed from:
- ✅ `newsletter.js` - Fixed to use `process.env.RESEND_API_KEY`
- ✅ `contact.js` - Already using environment variables correctly

#### 1.2 Generate New Resend API Key
1. Log into Resend dashboard: https://resend.com/api-keys
2. Create new API key with appropriate permissions:
   - Name: `Candlefish Production Web Platform`
   - Permissions: `Send emails`, `Manage audiences` (if using)
3. Copy the new API key (starts with `re_`)

### Step 2: Configure Netlify Environment Variables

#### 2.1 Access Netlify Dashboard
1. Go to https://app.netlify.com
2. Navigate to your site settings
3. Go to **Environment Variables** section

#### 2.2 Set Required Environment Variables

Add the following environment variables:

```bash
# Email Service Configuration
RESEND_API_KEY=re_NEW_SECURE_API_KEY_HERE

# Optional: Resend Audience Management
RESEND_AUDIENCE_ID=your_audience_id_here

# Email Addresses
ADMIN_EMAIL=hello@candlefish.ai
NOTIFICATION_EMAIL=hello@candlefish.ai
FROM_EMAIL=noreply@candlefish.ai

# CORS Configuration (optional)
ALLOWED_ORIGINS=https://candlefish.ai,https://www.candlefish.ai,https://test.candlefish.ai

# Environment
NODE_ENV=production
```

#### 2.3 Environment Variable Scopes
Configure variables for appropriate environments:
- **Production**: All variables required
- **Preview**: Same as production for testing
- **Development**: Optional, can use placeholder values

### Step 3: Verify Function Configuration

#### 3.1 Run Verification Script
```bash
# From project root
node scripts/verify-netlify-env-vars.js
```

Expected output for successful configuration:
```
✅ All Netlify functions are properly configured!
✅ Ready for deployment
```

#### 3.2 Manual Verification Checklist

For each function, verify:
- [ ] No hardcoded API keys (search for `re_`, `sk_`, etc.)
- [ ] Uses `process.env.RESEND_API_KEY` 
- [ ] Has proper fallback for missing environment variables
- [ ] Includes error handling for email service failures
- [ ] Uses `process.env.NODE_ENV` for environment checks

### Step 4: Test Deployment

#### 4.1 Deploy to Preview Environment
```bash
# Deploy preview branch
git checkout -b feature/secure-api-keys
git add .
git commit -m "feat: Migrate to secure environment variables for Netlify functions"
git push origin feature/secure-api-keys
```

#### 4.2 Test Functionality
Test each function endpoint:
1. Newsletter subscription: `POST /.netlify/functions/newsletter`
2. Contact form: `POST /.netlify/functions/contact`
3. Other forms as needed

#### 4.3 Monitor Netlify Function Logs
1. Go to Netlify dashboard
2. Navigate to **Functions** tab
3. Monitor real-time logs during testing

### Step 5: Production Deployment

#### 5.1 Pre-deployment Checklist
- [ ] All hardcoded API keys removed
- [ ] New API key generated and configured
- [ ] Environment variables set in Netlify
- [ ] Verification script passes
- [ ] Preview deployment tested successfully
- [ ] Old API key deactivated in Resend

#### 5.2 Deploy to Production
```bash
# Merge to main branch
git checkout main
git merge feature/secure-api-keys
git push origin main
```

#### 5.3 Post-deployment Verification
1. Test all form submissions on production site
2. Verify emails are being sent successfully
3. Check Netlify function logs for errors
4. Monitor error rates in next 24 hours

## Rollback Plan

If issues occur during deployment:

### Immediate Rollback
1. Revert commit in Git: `git revert HEAD`
2. Temporarily reactivate old API key in Resend (if needed)
3. Push rollback: `git push origin main`

### Investigation Steps
1. Check Netlify function logs
2. Verify environment variable configuration
3. Test individual function endpoints
4. Re-run verification script

## Security Best Practices

### API Key Management
- ✅ Use environment variables for all sensitive data
- ✅ Rotate API keys regularly (quarterly recommended)
- ✅ Use minimal required permissions
- ✅ Monitor API key usage
- ✅ Deactivate old keys immediately after migration

### Function Security
- ✅ Implement rate limiting
- ✅ Validate and sanitize all inputs
- ✅ Use CORS headers appropriately
- ✅ Log security events (without sensitive data)
- ✅ Handle errors gracefully

## Troubleshooting

### Common Issues

#### "RESEND_API_KEY is not defined"
**Solution**: Verify environment variable is set in Netlify dashboard

#### "Invalid API key" errors
**Solution**: 
1. Verify API key is correct
2. Check API key permissions in Resend
3. Ensure key is active

#### CORS errors
**Solution**: Check ALLOWED_ORIGINS environment variable

#### Rate limiting issues
**Solution**: Adjust rate limits in function code if needed

### Contact for Support
- Technical issues: hello@candlefish.ai
- Deployment help: Review this guide or check Netlify documentation

## Verification Commands

```bash
# Verify no hardcoded keys remain
grep -r "re_[A-Za-z0-9_]\{25,\}" brand/website/netlify/functions/

# Check environment variable usage
grep -r "process.env.RESEND_API_KEY" brand/website/netlify/functions/

# Run comprehensive verification
node scripts/verify-netlify-env-vars.js
```

## Success Criteria

- [ ] All 9 Netlify functions properly configured
- [ ] No hardcoded API keys in codebase
- [ ] New secure API key generated and configured
- [ ] All forms functional on production site
- [ ] Email delivery working correctly
- [ ] Verification script passes with 0 issues
- [ ] Security audit passes
- [ ] Old API key deactivated

---

**Last Updated**: September 5, 2025
**Migration Status**: Ready for deployment