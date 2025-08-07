# PromoterOS Project Configuration

## Project Identity
- **Name**: PromoterOS
- **Type**: AI-Powered Concert Booking Platform
- **Location**: `/Users/patricksmith/candlefish-ai/projects/promoterOS/`
- **Independence**: Completely separate from Tyler Setup

## Infrastructure (Isolated)
- **Netlify Site ID**: `8e7ae58e-9830-414b-923d-42a0a3cf23fb`
- **Netlify URL**: https://steady-cuchufli-1890bc.netlify.app
- **Custom Domain**: https://promoteros.candlefish.ai
- **DNS Provider**: Porkbun
- **DNS Record**: CNAME promoteros → steady-cuchufli-1890bc.netlify.app

## Security Configuration
- **Secrets Storage**: AWS Secrets Manager
- **Secret Name**: `promoteros/production/config`
- **Environment Files**:
  - `.env.secure` - Non-sensitive configuration only
  - `.env.example` - Template for developers
  - `.env` - Never commit (in .gitignore)

## Deployment
- **Script**: `./deploy-promoteros.sh`
- **Command**: `netlify deploy --prod --site 8e7ae58e-9830-414b-923d-42a0a3cf23fb --dir .`
- **No shared resources with Tyler Setup**

## API Endpoints
All endpoints are served via Netlify Functions:
- `/.netlify/functions/artists-evaluate`
- `/.netlify/functions/artists-quick-screen`
- `/.netlify/functions/artists-social-metrics`
- `/.netlify/functions/booking-score`
- `/.netlify/functions/demand-geographic`
- `/.netlify/functions/social-metrics`

## Development Workflow
1. Use `.env.secure` for non-sensitive config
2. Retrieve secrets from AWS Secrets Manager
3. Deploy using PromoterOS-specific script
4. Never reference Tyler Setup infrastructure

## Verification
```bash
# Verify PromoterOS deployment
curl https://steady-cuchufli-1890bc.netlify.app

# Verify custom domain (after DNS propagation)
curl https://promoteros.candlefish.ai

# Check API health
curl https://promoteros.candlefish.ai/api/health
```

## Important Notes
- **NO CROSS-REFERENCES** to Tyler Setup
- **NO SHARED INFRASTRUCTURE** with other projects
- **ALL SECRETS** in AWS Secrets Manager
- **INDEPENDENT DEPLOYMENT** pipeline