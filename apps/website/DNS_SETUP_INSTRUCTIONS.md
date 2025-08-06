# DNS Setup Instructions for api-test.candlefish.ai

## Current Status
✅ Netlify site deployed successfully at: https://candlefish.ai  
✅ All API endpoints working via Netlify Functions  
✅ Test page accessible and functional  

## Next Steps: Custom Subdomain Setup

### Option 1: Porkbun DNS Configuration (Manual)
1. **Login to Porkbun Dashboard**
   - Go to https://porkbun.com/account/dns/candlefish.ai
   - Login with your credentials

2. **Add CNAME Record**
   - Click "Add Record"
   - Type: `CNAME`
   - Name: `api-test`
   - Content: `candlefish.ai` or `candlefish-grotto.netlify.app`
   - TTL: `300` (5 minutes)
   - Click "Add"

### Option 2: Porkbun API (Automated)
If you have Porkbun API credentials:

```bash
export PORKBUN_API_KEY="your_api_key"
export PORKBUN_SECRET_KEY="your_secret_key"
python3 setup-dns.py
```

### Option 3: Netlify Domain Management
1. **Via Netlify Dashboard**
   - Go to https://app.netlify.com/projects/candlefish-grotto
   - Go to "Domain management"
   - Click "Add custom domain"
   - Enter: `api-test.candlefish.ai`
   - Follow the verification steps

## Verification
Once DNS is configured, verify the setup:

```bash
# Check DNS propagation
nslookup api-test.candlefish.ai

# Test the endpoints
curl https://api-test.candlefish.ai/.netlify/functions/health
curl https://api-test.candlefish.ai/.netlify/functions/security-status
```

## SSL Certificate
Netlify will automatically provision an SSL certificate for the custom domain once DNS is configured.

## API Endpoints
Once the subdomain is active, the following endpoints will be available:

- `https://api-test.candlefish.ai/` - Test page (redirects to test-fetch.html)
- `https://api-test.candlefish.ai/.netlify/functions/health` - Health check
- `https://api-test.candlefish.ai/.netlify/functions/security-status` - Security status
- `https://api-test.candlefish.ai/.netlify/functions/security-check` - Security check
- `https://api-test.candlefish.ai/.netlify/functions/performance` - Performance metrics
- `https://api-test.candlefish.ai/.netlify/functions/performance-aggregate` - Aggregated metrics
- `https://api-test.candlefish.ai/.netlify/functions/performance-pages` - Monitored pages
- `https://api-test.candlefish.ai/.netlify/functions/security-health` - Security health check

## Environment Variables Configured
✅ `ENCRYPTION_KEY` - For data encryption  
✅ `AWS_REGION` - Set to us-east-1  
✅ `AWS_ACCESS_KEY_ID` - AWS credentials  
✅ `AWS_SECRET_ACCESS_KEY` - AWS credentials  
✅ `CONTEXT` - Set to production  

## Auto-Deployment
The site is connected to the Git repository and will auto-deploy on pushes to the main branch.

## Monitoring
- Build logs: https://app.netlify.com/projects/candlefish-grotto/deploys
- Function logs: https://app.netlify.com/projects/candlefish-grotto/logs/functions
- Lighthouse scores: Performance: 88, Accessibility: 97, Best Practices: 92, SEO: 100