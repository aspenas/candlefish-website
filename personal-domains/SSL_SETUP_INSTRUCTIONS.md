# SSL Certificate Setup for highline.work and acupcake.shop

## Current Status

### acupcake.shop
- ✅ DNS configured (pointing to Netlify: 75.2.60.5)
- ⏳ SSL certificate provisioning initiated
- Site ID: 7c60e437-c36c-4a63-a24a-b1143eec6321

### inventory.highline.work  
- ❌ DNS not configured (CNAME record needed)
- ❌ SSL certificate pending DNS setup
- Site ID: 9ebc8d1d-e31b-4c29-afe4-1905a7503d4a

## Required Actions

### 1. Configure DNS for inventory.highline.work

Go to your Squarespace DNS settings:
https://account.squarespace.com/domains/managed/highline.work/dns-settings

Add this CNAME record:
```
Type: CNAME
Host: inventory
Data: highline-inventory.netlify.app
TTL: 3600
```

### 2. Wait for DNS Propagation (5-10 minutes)

Verify with:
```bash
dig inventory.highline.work CNAME
```

Expected result:
```
inventory.highline.work. 3600 IN CNAME highline-inventory.netlify.app.
```

### 3. Provision SSL Certificates

Once DNS is configured, SSL certificates should auto-provision within 10-15 minutes.

To manually trigger:

**For inventory.highline.work:**
```bash
# After DNS is set up
netlify api provisionSiteTLSCertificate \
  --data '{"site_id": "9ebc8d1d-e31b-4c29-afe4-1905a7503d4a"}'
```

**For acupcake.shop:**
```bash
# Should auto-provision, but can force with:
curl -X POST "https://api.netlify.com/api/v1/sites/7c60e437-c36c-4a63-a24a-b1143eec6321/ssl" \
  -H "Authorization: Bearer YOUR_NETLIFY_TOKEN"
```

### 4. Verify SSL Certificates

Check certificate status:
```bash
# For inventory.highline.work
curl -I https://inventory.highline.work

# For acupcake.shop  
curl -I https://acupcake.shop
```

## Troubleshooting

### If SSL doesn't provision automatically:

1. **Check DNS is correct:**
   ```bash
   dig inventory.highline.work CNAME +short
   # Should return: highline-inventory.netlify.app
   
   dig acupcake.shop A +short
   # Should return: 75.2.60.5
   ```

2. **Check in Netlify Dashboard:**
   - inventory.highline.work: https://app.netlify.com/sites/highline-inventory/settings/domain
   - acupcake.shop: https://app.netlify.com/sites/personal-acupcake-shop/settings/domain

3. **Manual SSL renewal:**
   - Go to Site Settings > Domain management > HTTPS
   - Click "Verify DNS configuration"
   - Click "Provision certificate"

### Common Issues:

1. **"DNS verification failed"**
   - Ensure DNS records are exactly as specified
   - Wait for full propagation (can take up to 48 hours in rare cases)
   - Check no conflicting A/AAAA records exist

2. **"Certificate provisioning failed"**
   - Check domain is not using Cloudflare proxy (orange cloud should be grey)
   - Ensure no CAA records blocking Let's Encrypt
   - Try removing and re-adding the custom domain in Netlify

3. **Mixed content warnings**
   - Update all internal links to use https://
   - Check for hardcoded http:// references in your code

## Automated Setup Script

Run this script to check status and guide through setup:
```bash
/Users/patricksmith/candlefish-ai/personal-domains/highline-work/scripts/setup-inventory-dns.sh
```

## Expected Timeline

1. DNS propagation: 5-10 minutes (up to 48 hours worst case)
2. SSL auto-provisioning: 10-15 minutes after DNS verification
3. Full HTTPS availability: Within 30 minutes of DNS setup

## Support Resources

- Netlify SSL docs: https://docs.netlify.com/domains-https/https-ssl/
- Squarespace DNS help: https://support.squarespace.com/hc/en-us/articles/360002101888
- Let's Encrypt status: https://letsencrypt.status.io/

## Current SSL Certificate Info

### inventory.highline.work
- Current cert for: inventory.candlefish.ai (wrong domain)
- Expires: 2025-11-21
- Needs: New certificate for inventory.highline.work after DNS setup

### acupcake.shop
- Status: Provisioning in progress
- Provider: Let's Encrypt via Netlify
- Auto-renewal: Enabled

---

Once both DNS records are configured and SSL certificates are provisioned, both sites will be fully operational with HTTPS.
