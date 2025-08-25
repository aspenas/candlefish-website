# Deployment Consolidation Plan

## Current State (Broken)
- **candlefish.ai** - Netlify (routing fixed, awaiting deployment)
- **api-candlefish-*.vercel.app** - Vercel preview deployment
- **docs-candlefish-*.vercel.app** - Vercel preview deployment  
- **partners-candlefish-*.vercel.app** - Vercel preview deployment

## Target Architecture (Consolidated)

### Phase 1: Fix & Stabilize (Completed ✅)
- [x] Fixed Netlify routing by removing SPA fallback
- [x] Pushed fix to trigger deployment

### Phase 2: DNS Configuration (Next Steps)

#### Subdomain Mapping
```
candlefish.ai          → Netlify (main brand site)
api.candlefish.ai      → Vercel (API playground)
docs.candlefish.ai     → Vercel (documentation)
partners.candlefish.ai → Vercel (partners portal)
```

#### DNS Records to Add (Porkbun)
```dns
# API Subdomain
api      CNAME  cname.vercel-dns.com  300

# Docs Subdomain  
docs     CNAME  cname.vercel-dns.com  300

# Partners Subdomain
partners CNAME  partners-candlefish.netlify.app  300
```

### Phase 3: Vercel Project Configuration

For each Vercel project, add custom domain:
1. `api.candlefish.ai` → api-site project
2. `docs.candlefish.ai` → docs-site project
3. `partners.candlefish.ai` → partners-site project

### Phase 4: Environment Variables

Update all projects with production URLs:
```env
NEXT_PUBLIC_API_URL=https://api.candlefish.ai
NEXT_PUBLIC_DOCS_URL=https://docs.candlefish.ai
NEXT_PUBLIC_PARTNERS_URL=https://partners.candlefish.ai
NEXT_PUBLIC_MAIN_URL=https://candlefish.ai
```

### Phase 5: Kong API Gateway (Future)

Once stable, deploy Kong to handle:
- API routing and versioning
- Rate limiting
- Authentication
- Monitoring

Kong will sit at `api.candlefish.ai` and proxy to:
- GraphQL Federation Gateway
- REST API endpoints
- WebSocket connections

## Implementation Commands

### 1. Check Netlify Deployment Status
```bash
netlify status
netlify open
```

### 2. Configure Vercel Domains
```bash
cd apps/api-site
vercel domains add api.candlefish.ai

cd ../docs-site  
vercel domains add docs.candlefish.ai

cd ../partners-site
vercel domains add partners.candlefish.ai
```

### 3. Update DNS (via Porkbun API)
```bash
# Get credentials
aws secretsmanager get-secret-value --secret-id "candlefish/porkbun-api-credentials"

# Add CNAME records via API
./scripts/update-dns.sh
```

### 4. Verify SSL Certificates
```bash
# Check each subdomain
for domain in api docs partners; do
  echo "Checking $domain.candlefish.ai"
  curl -I https://$domain.candlefish.ai
done
```

## Success Criteria

- [ ] candlefish.ai serves correct content for all routes
- [ ] api.candlefish.ai accessible with SSL
- [ ] docs.candlefish.ai accessible with SSL
- [ ] partners.candlefish.ai accessible with SSL
- [ ] All environment variables updated
- [ ] No mixed content warnings
- [ ] All API calls use production URLs

## Rollback Plan

If issues occur:
1. Revert DNS changes in Porkbun
2. Remove custom domains from Vercel
3. Restore previous _redirects file if needed
4. Use preview URLs temporarily

## Timeline

- **15 min**: Verify Netlify deployment
- **30 min**: Configure Vercel custom domains
- **15 min**: Update DNS records
- **30 min**: Wait for DNS propagation
- **15 min**: Verify all sites working
- **Total**: ~2 hours

## Next Steps After Consolidation

1. Implement Kong API Gateway
2. Add Linkerd service mesh (later)
3. Centralize monitoring
4. Implement GitOps with Argo CD
