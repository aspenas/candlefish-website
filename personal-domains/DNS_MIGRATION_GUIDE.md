# Personal Domains DNS Migration Guide

## Overview
Migrating acupcake.shop and highline.work from Squarespace to Netlify while keeping them separate from Candlefish business sites.

## Current Status

### ✅ Completed
1. **acupcake.shop Netlify Site Created**
   - Site Name: personal-acupcake-shop
   - Site ID: 7c60e437-c36c-4a63-a24a-b1143eec6321
   - Netlify URL: personal-acupcake-shop.netlify.app
   - Custom Domain: acupcake.shop (configured)

2. **highline.work Status**
   - Removed from business site (highline-inventory)
   - Needs new personal site creation

### ⚠️ Action Required

## Step 1: Create highline.work Site on Netlify

### Option A: Via Netlify Web Interface (Recommended)
1. Go to https://app.netlify.com
2. Click "Add new site" > "Deploy manually"
3. Drag and drop a folder with an index.html file
4. Once created, rename site to "personal-highline-work"
5. Add custom domain: highline.work
6. Add domain alias: www.highline.work

### Option B: Create placeholder content locally
```bash
# Already created at:
~/candlefish-ai/personal-domains/highline-work/index.html
```

## Step 2: Update DNS Records in Google Domains

### For acupcake.shop
1. Go to https://domains.google.com
2. Click on **acupcake.shop**
3. Click **DNS** in the left menu
4. Delete existing Squarespace records:
   - Delete A record pointing to 198.49.23.144
   - Delete CNAME record pointing to ext-sq.squarespace.com
5. Add new records:
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
6. **KEEP ALL MX RECORDS** (for email)

### For highline.work
1. Go to https://domains.google.com
2. Click on **highline.work**
3. Click **DNS** in the left menu
4. Add records:
   ```
   Type: A
   Name: @
   Data: 75.2.60.5
   TTL: 3600
   
   Type: CNAME
   Name: www
   Data: personal-highline-work.netlify.app
   TTL: 3600
   ```
5. **KEEP ALL MX RECORDS** (for email)

## Step 3: Set Up Team Isolation

### Create Business Team
1. Go to https://app.netlify.com/teams
2. Click "New team"
3. Name: "Candlefish Business"
4. Move these sites to the business team:
   - candlefish-grotto (candlefish.ai)
   - staging-candlefish
   - candlefish-ibm-watsonx-portfolio
   - promoteros
   - claude-resources-candlefish
   - beamish-froyo-ed37ee (dashboard)
   - paintbox-protected

### Keep Personal Sites Separate
Keep these in your personal account:
- personal-acupcake-shop
- personal-highline-work

### Add Team Members
1. Invite Tyler, Aaron, and James to "Candlefish Business" team ONLY
2. They will have access to business sites
3. They will NOT have access to your personal sites

## Step 4: SSL Certificate Provisioning

After DNS changes propagate (5-30 minutes):

### For each domain in Netlify:
1. Go to Site Settings > Domain Management
2. Click "Verify DNS configuration"
3. Click "Provision certificate"
4. Wait for Let's Encrypt to issue certificate

## Step 5: Verification

### Check DNS Propagation
```bash
# Test from multiple DNS servers
dig @8.8.8.8 acupcake.shop A
dig @8.8.8.8 www.acupcake.shop CNAME
dig @8.8.8.8 highline.work A
dig @8.8.8.8 www.highline.work CNAME

# Check SSL certificates
curl -I https://acupcake.shop
curl -I https://highline.work
```

### Verify Email Still Works
Send test emails to your domains to confirm MX records are working.

## Step 6: Update Squarespace (if needed)

If domains are still connected to Squarespace:
1. Log in to Squarespace
2. Go to Settings > Domains
3. Remove/disconnect acupcake.shop and highline.work
4. This prevents any conflicts with DNS

## Troubleshooting

### SSL Certificate Not Provisioning
- Ensure DNS has propagated (can take up to 48 hours)
- Check no CAA records blocking Let's Encrypt
- Verify A record points to 75.2.60.5
- Verify CNAME points to correct Netlify subdomain

### Site Not Loading
- Clear browser cache
- Try incognito/private browsing
- Check DNS propagation status at https://dnschecker.org

### Email Not Working
- Verify MX records weren't deleted
- Check spam folder
- Contact Google Workspace support if needed

## Security Notes

✅ **Personal sites are isolated from business sites**
✅ **Team members cannot access personal domains**
✅ **Each site has its own deployment credentials**
✅ **SSL certificates auto-renew via Let's Encrypt**

## Next Steps

1. Complete DNS changes in Google Domains
2. Create highline.work site on Netlify
3. Set up team structure
4. Verify SSL certificates
5. Test both domains

## Support

- Netlify Support: https://www.netlify.com/support/
- Google Domains Help: https://support.google.com/domains
- DNS Propagation Check: https://dnschecker.org
