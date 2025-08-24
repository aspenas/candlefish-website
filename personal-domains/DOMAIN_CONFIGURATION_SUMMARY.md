# Domain Configuration Summary

## Overview
Successfully configured personal/family domains (highline.work and acupcake.shop) separate from Candlefish business domains for proper access control and team isolation.

## Configured Sites

### 1. highline.work (Main Domain)
- **Netlify Site**: personal-highline-work (to be created manually)
- **Purpose**: Family domain homepage
- **Status**: Homepage created with modern gradient design
- **Location**: `~/candlefish-ai/personal-domains/highline-work/index.html`

### 2. inventory.highline.work (Subdomain)
- **Netlify Site ID**: 9ebc8d1d-e31b-4c29-afe4-1905a7503d4a
- **Site Name**: highline-inventory
- **Purpose**: Password-protected inventory management system
- **Status**: Configured and ready for deployment
- **Previous URL**: inventory.candlefish.ai (will redirect)

### 3. acupcake.shop
- **Netlify Site ID**: 7c60e437-c36c-4a63-a24a-b1143eec6321
- **Site Name**: personal-acupcake-shop
- **Purpose**: Personal website
- **Status**: Site created, awaiting DNS configuration

## Required DNS Configuration

### In Google Domains (domains.google.com)

#### For highline.work:
```
Type: A
Name: @
Data: 75.2.60.5
TTL: 3600

Type: CNAME
Name: www
Data: personal-highline-work.netlify.app
TTL: 3600

Type: CNAME
Name: inventory
Data: highline-inventory.netlify.app
TTL: 3600
```

#### For acupcake.shop:
```
Type: A
Name: @
Data: 75.2.60.5
TTL: 3600

Type: CNAME
Name: www
Data: personal-acupcake-shop.netlify.app
TTL: 3600
```

**⚠️ IMPORTANT: Keep all MX records for email functionality!**

## Manual Steps Required

### 1. Create highline.work Site on Netlify
1. Go to https://app.netlify.com
2. Click "Add new site" > "Deploy manually"
3. Drag the folder: `~/candlefish-ai/personal-domains/highline-work/`
4. Rename site to "personal-highline-work"
5. Add custom domain: highline.work

### 2. Configure DNS in Google Domains
1. Login to https://domains.google.com with patrick.smith@gmail.com
2. Update DNS records as specified above
3. Remove old Squarespace records for acupcake.shop

### 3. Set Up Password Protection for Inventory
1. Go to https://app.netlify.com/sites/highline-inventory/settings/identity
2. Enable Netlify Identity
3. Set registration to "Invite only"
4. Add authorized users

### 4. Deploy Inventory Site
```bash
cd ~/candlefish-ai/apps/5470-inventory
npm install
npm run build
netlify deploy --prod --dir=.next --site=9ebc8d1d-e31b-4c29-afe4-1905a7503d4a
```

## Team Access Control

### Business Sites (Candlefish Team Access)
- candlefish.ai (main site)
- staging.candlefish.ai
- ibm.candlefish.ai
- promoteros.candlefish.ai
- claude.candlefish.ai
- dashboard.candlefish.ai
- paintbox.candlefish.ai

### Personal Sites (Your Access Only)
- highline.work
- inventory.highline.work
- acupcake.shop

### Team Member Instructions
When adding Tyler, Aaron, and James:
1. Create a new Netlify team: "Candlefish Business"
2. Move all business sites to this team
3. Invite team members ONLY to the business team
4. Keep personal sites in your personal account

## File Locations

- **Homepage**: `~/candlefish-ai/personal-domains/highline-work/index.html`
- **Setup Scripts**: `~/candlefish-ai/personal-domains/setup-inventory-subdomain.sh`
- **Deploy Script**: `~/candlefish-ai/personal-domains/deploy-inventory.sh`
- **DNS Guide**: `~/candlefish-ai/personal-domains/DNS_MIGRATION_GUIDE.md`

## Verification Commands

```bash
# Check DNS propagation
dig highline.work A +short          # Should return: 75.2.60.5
dig www.highline.work CNAME +short  # Should return: personal-highline-work.netlify.app
dig inventory.highline.work CNAME +short  # Should return: highline-inventory.netlify.app

dig acupcake.shop A +short          # Should return: 75.2.60.5
dig www.acupcake.shop CNAME +short  # Should return: personal-acupcake-shop.netlify.app

# Test HTTPS
curl -I https://highline.work
curl -I https://inventory.highline.work
curl -I https://acupcake.shop

# Check SSL certificates
echo | openssl s_client -connect highline.work:443 -servername highline.work 2>/dev/null | openssl x509 -noout -dates
```

## Status Checklist

- [x] Created personal-acupcake-shop Netlify site
- [x] Created highline.work homepage HTML
- [x] Configured inventory.highline.work subdomain
- [x] Set up redirect from inventory.candlefish.ai
- [x] Created password protection configuration
- [ ] Manual: Create personal-highline-work site on Netlify
- [ ] Manual: Update DNS records in Google Domains
- [ ] Manual: Enable Netlify Identity for password protection
- [ ] Manual: Deploy sites and verify SSL certificates

## Support Resources

- Netlify Dashboard: https://app.netlify.com
- Google Domains: https://domains.google.com
- DNS Checker: https://dnschecker.org
- SSL Test: https://www.ssllabs.com/ssltest/

## Next Actions

1. Complete manual DNS configuration in Google Domains
2. Create the highline.work site on Netlify
3. Set up Netlify Identity for password protection
4. Verify all domains are resolving correctly
5. Test SSL certificates are active

The separation of personal and business domains is now properly configured to ensure team members only have access to Candlefish business sites.
