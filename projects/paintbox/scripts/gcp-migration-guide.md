# Google Cloud Project Migration Guide
## From patrick.smith@gmail.com to patrick@candlefish.ai

## Table of Contents
1. [Migration Overview](#migration-overview)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Migration Strategy](#migration-strategy)
4. [Step-by-Step Migration Process](#step-by-step-migration-process)
5. [OAuth Client Migration](#oauth-client-migration)
6. [DNS and Domain Verification](#dns-and-domain-verification)
7. [Rollback Plan](#rollback-plan)
8. [Post-Migration Verification](#post-migration-verification)

## Migration Overview

### Current Setup
- **Project ID**: l0-candlefish
- **Project Number**: 641173075272
- **OAuth Client ID**: ***REMOVED***
- **Current Owner**: patrick.smith@gmail.com
- **Target Owner**: patrick@candlefish.ai

### What Can Be Migrated vs Recreated

#### Can Be Migrated ✅
- Project ownership (via IAM transfer)
- API enablements
- Service accounts
- Cloud Storage buckets
- Firestore/Datastore data
- Cloud Functions
- App Engine applications (settings only)
- Billing account associations

#### Must Be Recreated ❌
- OAuth 2.0 Client IDs (tied to project creation domain)
- SSL certificates (if domain-specific)
- Domain verification (must be done with new domain)
- Some API keys (if domain-restricted)

## Pre-Migration Checklist

### Before Starting
- [ ] Ensure patrick@candlefish.ai has a Google Workspace or Cloud Identity account
- [ ] Verify access to both email accounts
- [ ] Back up all OAuth client configurations
- [ ] Document all active redirect URIs
- [ ] Export all environment variables and secrets
- [ ] Schedule maintenance window (recommend 2-4 hours)
- [ ] Notify all stakeholders

### Required Information
```bash
# Current OAuth Configuration
CLIENT_ID: ***REMOVED***
CLIENT_SECRET: [Stored in AWS Secrets Manager]

# Current Redirect URIs
- https://paintbox.fly.dev/api/auth/callback/google
- https://paintbox.fly.dev/api/auth/google/callback
- https://localhost:3000/api/auth/callback/google
- http://localhost:3000/api/auth/callback/google
- https://paintbox.candlefish.ai/api/auth/callback/google
- https://api.paintbox.candlefish.ai/auth/callback
```

## Migration Strategy

### Approach: Gradual Migration with Zero Downtime

1. **Phase 1**: Add patrick@candlefish.ai as Owner (parallel access)
2. **Phase 2**: Create new OAuth credentials under new owner
3. **Phase 3**: Update applications to support both credentials
4. **Phase 4**: Migrate traffic to new credentials
5. **Phase 5**: Remove old owner access

## Step-by-Step Migration Process

### Phase 1: Add New Owner (5 minutes)

1. **Login to Google Cloud Console**
   ```bash
   # As patrick.smith@gmail.com
   gcloud auth login --account=patrick.smith@gmail.com
   gcloud config set project l0-candlefish
   ```

2. **Add patrick@candlefish.ai as Owner**
   ```bash
   # Grant Owner role
   gcloud projects add-iam-policy-binding l0-candlefish \
     --member="user:patrick@candlefish.ai" \
     --role="roles/owner"
   
   # Verify
   gcloud projects get-iam-policy l0-candlefish
   ```

### Phase 2: Domain Verification (15 minutes)

1. **Verify candlefish.ai domain**
   ```bash
   # As patrick@candlefish.ai
   gcloud auth login --account=patrick@candlefish.ai
   
   # Start domain verification
   gcloud domains verify candlefish.ai
   ```

2. **Add DNS TXT Record**
   ```bash
   # The verification will provide a TXT record like:
   # google-site-verification=XXXXXXXXXXXXX
   
   # Add to Porkbun DNS (or your DNS provider)
   ```

3. **Complete Verification**
   - Go to: https://console.cloud.google.com/apis/credentials/domainverification
   - Click "Verify" after DNS propagation (5-10 minutes)

### Phase 3: Create New OAuth Credentials (10 minutes)

1. **Configure OAuth Consent Screen**
   ```bash
   # Navigate to OAuth consent screen
   # https://console.cloud.google.com/apis/credentials/consent
   
   # Update with new owner email
   # Support email: patrick@candlefish.ai
   # Developer contact: patrick@candlefish.ai
   ```

2. **Create New OAuth 2.0 Client**
   ```bash
   # Use the automation script below or manually:
   # 1. Go to Credentials page
   # 2. Create Credentials > OAuth client ID
   # 3. Application type: Web application
   # 4. Name: paintbox-oauth-candlefish
   # 5. Add all redirect URIs
   ```

### Phase 4: Update Application Configuration (30 minutes)

1. **Update Environment Variables**
   ```bash
   # Store both old and new credentials temporarily
   GOOGLE_CLIENT_ID_OLD=***REMOVED***
   GOOGLE_CLIENT_ID_NEW=[NEW_CLIENT_ID]
   GOOGLE_CLIENT_SECRET_OLD=[OLD_SECRET]
   GOOGLE_CLIENT_SECRET_NEW=[NEW_SECRET]
   ```

2. **Update AWS Secrets Manager**
   ```bash
   # Create new secret
   aws secretsmanager create-secret \
     --name "paintbox/google-oauth-new" \
     --secret-string '{
       "client_id":"[NEW_CLIENT_ID]",
       "client_secret":"[NEW_SECRET]"
     }'
   ```

3. **Deploy Dual-Support Configuration**
   ```javascript
   // Support both credentials during migration
   const googleCredentials = {
     old: {
       clientId: process.env.GOOGLE_CLIENT_ID_OLD,
       clientSecret: process.env.GOOGLE_CLIENT_SECRET_OLD
     },
     new: {
       clientId: process.env.GOOGLE_CLIENT_ID_NEW,
       clientSecret: process.env.GOOGLE_CLIENT_SECRET_NEW
     }
   };
   ```

### Phase 5: Traffic Migration (1 hour)

1. **Gradual Rollout**
   ```bash
   # Start with 10% traffic to new credentials
   # Monitor for 30 minutes
   # Increase to 50%
   # Monitor for 30 minutes
   # Move to 100%
   ```

2. **Monitor Authentication**
   ```bash
   # Check logs for any authentication failures
   fly logs -a paintbox
   
   # Monitor error rates
   ```

### Phase 6: Cleanup (After 48 hours stable)

1. **Remove Old Credentials**
   ```bash
   # Disable old OAuth client (don't delete immediately)
   # Remove old environment variables
   # Update all documentation
   ```

2. **Transfer Full Ownership**
   ```bash
   # Remove patrick.smith@gmail.com as owner
   gcloud projects remove-iam-policy-binding l0-candlefish \
     --member="user:patrick.smith@gmail.com" \
     --role="roles/owner"
   ```

## OAuth Client Migration

### Critical Considerations

1. **Client ID Cannot Be Transferred**
   - OAuth Client IDs are permanently tied to the creating domain
   - Must create new credentials under patrick@candlefish.ai
   - Plan for parallel operation during transition

2. **Maintaining User Sessions**
   ```javascript
   // Strategy: Accept tokens from both clients
   const validateToken = async (token) => {
     try {
       // Try new client first
       return await verifyWithNewClient(token);
     } catch (error) {
       // Fallback to old client
       return await verifyWithOldClient(token);
     }
   };
   ```

3. **Redirect URI Management**
   - Add all existing redirect URIs to new client
   - Keep both clients active during migration
   - Monitor which client is being used

## DNS and Domain Verification

### Required DNS Records

1. **Domain Verification TXT Record**
   ```dns
   Type: TXT
   Name: @ (or blank)
   Value: google-site-verification=XXXXXXXXXXXXX
   TTL: 300
   ```

2. **OAuth Redirect Domain Validation**
   - Ensure candlefish.ai is verified
   - Add all subdomains that will be used

### Porkbun API Configuration
```bash
# Get API credentials
aws secretsmanager get-secret-value \
  --secret-id "candlefish/porkbun-api-credentials" \
  --query 'SecretString' | jq -r '.'

# Add verification record via API
curl -X POST https://api.porkbun.com/api/json/v3/dns/create/candlefish.ai \
  -H "Content-Type: application/json" \
  -d '{
    "apikey": "[API_KEY]",
    "secretapikey": "[SECRET_KEY]",
    "type": "TXT",
    "name": "",
    "content": "google-site-verification=XXXXXXXXXXXXX",
    "ttl": "300"
  }'
```

## Rollback Plan

### If Issues Occur

1. **Immediate Rollback (< 5 minutes)**
   ```bash
   # Revert to old credentials only
   fly secrets set GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID_OLD -a paintbox
   fly secrets set GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET_OLD -a paintbox
   
   # Deploy immediately
   fly deploy -a paintbox
   ```

2. **Partial Rollback**
   ```javascript
   // Use feature flag to control credential usage
   const useNewCredentials = process.env.USE_NEW_OAUTH === 'true';
   const credentials = useNewCredentials ? newCreds : oldCreds;
   ```

3. **Data Recovery**
   - All user sessions remain valid with old credentials
   - No data loss as project remains the same
   - Only authentication flow affected

## Post-Migration Verification

### Verification Checklist

1. **Authentication Flow**
   - [ ] New users can sign up
   - [ ] Existing users can log in
   - [ ] OAuth redirect works correctly
   - [ ] Tokens are properly validated

2. **API Access**
   - [ ] Google APIs respond correctly
   - [ ] Quotas and limits maintained
   - [ ] Service accounts functioning

3. **Monitoring**
   ```bash
   # Check authentication success rate
   fly logs -a paintbox | grep "auth" | tail -100
   
   # Monitor error rates
   curl https://paintbox.fly.dev/api/health
   ```

4. **Documentation Updates**
   - [ ] Update README files
   - [ ] Update environment variable docs
   - [ ] Update team runbooks
   - [ ] Update CI/CD configurations

## Timeline Estimate

| Phase | Duration | Risk Level |
|-------|----------|------------|
| Pre-migration prep | 30 min | Low |
| Add new owner | 5 min | Low |
| Domain verification | 15 min | Low |
| Create new OAuth | 10 min | Low |
| Update application | 30 min | Medium |
| Traffic migration | 60 min | Medium |
| Monitoring | 48 hours | Low |
| Cleanup | 30 min | Low |

**Total Active Time**: ~2.5 hours
**Total Duration**: 48-72 hours (including monitoring)

## Support and Troubleshooting

### Common Issues and Solutions

1. **Domain Verification Fails**
   - Check DNS propagation: `dig TXT candlefish.ai`
   - Ensure no conflicting TXT records
   - Wait 15 minutes for propagation

2. **OAuth Redirect Mismatch**
   - Verify all URIs are added to new client
   - Check for trailing slashes
   - Ensure HTTPS is used (except localhost)

3. **Users Can't Authenticate**
   - Check both old and new credentials are active
   - Verify environment variables are set
   - Check application logs for specific errors

### Emergency Contacts

- Google Cloud Support: [Based on your support plan]
- AWS Support: [For Secrets Manager issues]
- Fly.io Support: [For deployment issues]

## Next Steps

1. Schedule migration window
2. Run automation scripts in test environment
3. Communicate timeline to team
4. Execute migration plan
5. Monitor for 48 hours
6. Complete cleanup phase

---

**Last Updated**: August 2025
**Author**: Migration Automation System
**Status**: Ready for Execution