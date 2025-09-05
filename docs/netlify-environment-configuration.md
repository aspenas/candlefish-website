# Netlify Environment Variable Configuration

This document provides detailed instructions for configuring environment variables in Netlify for the Candlefish web platform.

## Overview

Netlify Functions require secure environment variables for:
- Email service API keys (Resend)
- Database connections
- Third-party service integrations
- Configuration settings

## Environment Variables Required

### Core Email Service
```bash
# Resend Email Service
RESEND_API_KEY=re_your_secure_api_key_here
RESEND_AUDIENCE_ID=your_audience_id_here  # Optional

# Email Configuration
ADMIN_EMAIL=hello@candlefish.ai
NOTIFICATION_EMAIL=hello@candlefish.ai
FROM_EMAIL=noreply@candlefish.ai
```

### Application Configuration
```bash
# Environment
NODE_ENV=production

# CORS Configuration
ALLOWED_ORIGINS=https://candlefish.ai,https://www.candlefish.ai,https://test.candlefish.ai

# API Configuration
NEXT_PUBLIC_API_URL=https://api.candlefish.ai

# Optional: Disable telemetry
NEXT_TELEMETRY_DISABLED=1
```

### Security Configuration
```bash
# Rate limiting (optional - defaults in code)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=5

# Security headers (optional - defaults in code)
X_CONTENT_TYPE_OPTIONS=nosniff
X_FRAME_OPTIONS=DENY
```

## Configuration Methods

### Method 1: Netlify Dashboard (Recommended)

#### Step 1: Access Environment Variables
1. Log into Netlify: https://app.netlify.com
2. Select your site
3. Go to **Site Settings**
4. Click **Environment Variables** in the left sidebar

#### Step 2: Add Variables
1. Click **Add a variable**
2. Enter variable name (e.g., `RESEND_API_KEY`)
3. Enter variable value
4. Select scope:
   - **Production**: Live site
   - **Deploy previews**: Preview builds
   - **Branch deploys**: Specific branches
5. Click **Create variable**

#### Step 3: Bulk Import (Optional)
1. Click **Import from a .env file**
2. Upload your .env file or paste contents
3. Review and select variables to import
4. Click **Import variables**

### Method 2: Netlify CLI

#### Install Netlify CLI
```bash
npm install -g netlify-cli
netlify login
```

#### Set Environment Variables
```bash
# Set single variable
netlify env:set RESEND_API_KEY "re_your_api_key_here"

# Set multiple variables
netlify env:set ADMIN_EMAIL "hello@candlefish.ai"
netlify env:set NODE_ENV "production"

# List all variables
netlify env:list

# Get specific variable
netlify env:get RESEND_API_KEY
```

### Method 3: netlify.toml Configuration

Create or update `netlify.toml` in project root:

```toml
[build]
  command = "npm run build"
  publish = "out"

# Environment variables for all contexts
[build.environment]
  NODE_ENV = "production"
  NEXT_TELEMETRY_DISABLED = "1"

# Production-specific variables
[context.production.environment]
  RESEND_API_KEY = "re_production_key_here"
  ADMIN_EMAIL = "hello@candlefish.ai"

# Preview/staging variables
[context.deploy-preview.environment] 
  RESEND_API_KEY = "re_staging_key_here"
  ADMIN_EMAIL = "staging@candlefish.ai"

# Branch-specific variables
[context.branch-deploy.environment]
  RESEND_API_KEY = "re_development_key_here"
```

## Security Best Practices

### Variable Security
- ✅ Never commit API keys to version control
- ✅ Use different keys for production/staging/development
- ✅ Rotate keys regularly (quarterly minimum)
- ✅ Use minimal required permissions for API keys
- ✅ Monitor API key usage and alerts

### Access Control
- ✅ Limit team member access to sensitive variables
- ✅ Use Netlify's role-based access control
- ✅ Audit variable access regularly
- ✅ Remove unused variables promptly

### Environment Separation
```bash
# Production
RESEND_API_KEY=re_prod_key_with_send_permissions

# Staging  
RESEND_API_KEY=re_staging_key_with_send_permissions

# Development
RESEND_API_KEY=re_dev_key_with_limited_permissions
```

## Variable Scoping

### Context-Based Scoping
- **Production**: Live site (main branch)
- **Deploy Previews**: Pull request previews
- **Branch Deploys**: Specific branch deployments

### Environment-Specific Configuration
```bash
# Production only
RESEND_API_KEY=re_prod_...

# All environments
NODE_ENV=production
ADMIN_EMAIL=hello@candlefish.ai

# Development/Preview only
DEBUG=true
LOG_LEVEL=verbose
```

## Function-Specific Requirements

### Email Functions (9 total)
Required variables:
```bash
RESEND_API_KEY=re_...        # Required for all email functions
ADMIN_EMAIL=hello@...        # Required for notifications  
ALLOWED_ORIGINS=https://...  # Required for CORS
```

Functions affected:
- `newsletter.js` - Newsletter subscriptions
- `contact.js` - Contact form
- `consultation.js` - Consultation requests
- `consideration.js` - Consideration forms
- `consideration_secure.js` - Secure considerations
- `nanda.js` - NANDA assessments
- `workshop.js` - Workshop bookings
- `workshop-note-deploy.js` - Workshop deployments
- `deployment-webhook.js` - Deployment webhooks

### API Functions
Required variables:
```bash
NEXT_PUBLIC_API_URL=https://api.candlefish.ai
NODE_ENV=production
```

## Testing Configuration

### Local Development
Create `.env.local` (gitignored):
```bash
RESEND_API_KEY=re_development_key_here
ADMIN_EMAIL=hello@candlefish.ai
NODE_ENV=development
```

### Preview/Staging Testing
```bash
# Set staging variables in Netlify
netlify env:set --context deploy-preview RESEND_API_KEY "re_staging_key"
netlify env:set --context deploy-preview ADMIN_EMAIL "staging@candlefish.ai"
```

### Production Testing
```bash
# Test production variables (be careful!)
netlify functions:invoke newsletter --payload '{"email":"test@example.com"}'
```

## Validation & Monitoring

### Validation Script
```bash
# Run verification script
node scripts/verify-netlify-env-vars.js

# Check specific variables
netlify env:get RESEND_API_KEY
```

### Monitoring
- Set up Netlify function logs monitoring
- Configure Resend API usage alerts
- Monitor error rates for environment variable issues
- Set up uptime monitoring for critical functions

## Troubleshooting

### Common Issues

#### Variable Not Found
```
Error: RESEND_API_KEY is not defined
```
**Solution**: 
1. Check variable exists in Netlify dashboard
2. Verify correct context/scope
3. Redeploy functions after adding variables

#### Invalid API Key
```
Error: Invalid API key
```
**Solution**:
1. Verify key format (should start with `re_`)
2. Check key permissions in Resend dashboard
3. Ensure key is active and not expired

#### CORS Issues
```
Error: CORS policy blocking request
```
**Solution**:
1. Check `ALLOWED_ORIGINS` variable
2. Verify domain matches exactly
3. Include protocol (https://)

### Debug Commands
```bash
# List all environment variables
netlify env:list

# Check specific variable
netlify env:get VARIABLE_NAME

# Test function locally
netlify dev

# Check build logs
netlify deploy --dry-run
```

## Migration Checklist

- [ ] Audit all hardcoded keys in codebase
- [ ] Generate new secure API keys
- [ ] Configure variables in Netlify dashboard
- [ ] Update all functions to use environment variables
- [ ] Test in preview environment
- [ ] Deploy to production
- [ ] Verify all functions working
- [ ] Deactivate old API keys
- [ ] Document new variable configuration

## Backup & Recovery

### Backup Variables
```bash
# Export all variables to file
netlify env:list > environment-backup.txt

# Or use CLI to save specific variables
netlify env:get RESEND_API_KEY > resend-key-backup.txt
```

### Recovery Process
1. Restore variables in Netlify dashboard
2. Or use CLI: `netlify env:set VARIABLE_NAME "value"`
3. Redeploy site to apply changes
4. Test all functions

## References

- [Netlify Environment Variables Documentation](https://docs.netlify.com/configure-builds/environment-variables/)
- [Netlify CLI Documentation](https://cli.netlify.com/)
- [Resend API Documentation](https://resend.com/docs)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

**Last Updated**: September 5, 2025
**Status**: Ready for implementation