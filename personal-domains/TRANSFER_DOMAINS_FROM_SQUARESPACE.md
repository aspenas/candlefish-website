# Transfer Domains from Squarespace to Porkbun/Netlify

## Option 1: Transfer to Porkbun (RECOMMENDED) 
**Pros**: Centralized domain management, full control, cheaper renewals
**Cons**: Takes 5-7 days for transfer

### Steps to Transfer to Porkbun:

1. **Prepare at Squarespace:**
   - Go to: https://account.squarespace.com/domains
   - Click on highline.work → Settings → Transfer Domain
   - Unlock the domain
   - Get the authorization/EPP code
   - Repeat for acupcake.shop

2. **Initiate Transfer at Porkbun:**
   - Go to: https://porkbun.com/transfer
   - Enter: highline.work and acupcake.shop
   - Enter the EPP codes from Squarespace
   - Pay transfer fee (includes 1 year renewal, usually ~$10-15 per domain)

3. **After Transfer Completes (5-7 days):**
   - Configure DNS at Porkbun:
   ```
   highline.work:
   A record → 75.2.60.5 (Netlify)
   
   www.highline.work:
   CNAME → highline-work.netlify.app
   
   inventory.highline.work:
   CNAME → highline-inventory.netlify.app
   
   acupcake.shop:
   A record → 75.2.60.5 (Netlify)
   
   www.acupcake.shop:
   CNAME → personal-acupcake-shop.netlify.app
   ```

## Option 2: Use Netlify DNS (FASTEST - Works Today!)
**Pros**: Immediate, automatic SSL, no transfer needed
**Cons**: DNS managed at Netlify instead of centralized

### Steps for Netlify DNS:

1. **Change Nameservers at Squarespace:**
   - Go to: https://account.squarespace.com/domains/managed/highline.work/dns-settings
   - Click "Advanced Settings" or "Nameservers"
   - Change from Squarespace nameservers to Netlify's:
   ```
   dns1.p04.nsone.net
   dns2.p04.nsone.net
   dns3.p04.nsone.net
   dns4.p04.nsone.net
   ```
   - Repeat for acupcake.shop

2. **Set up Netlify DNS:**
   ```bash
   # For highline.work
   netlify dns:zones:create --name highline.work --account-slug aspenas
   
   # For acupcake.shop
   netlify dns:zones:create --name acupcake.shop --account-slug aspenas
   ```

3. **Add DNS records in Netlify Dashboard:**
   - Go to: https://app.netlify.com/teams/aspenas/dns
   - Configure records for each domain

## Option 3: Keep at Squarespace but Use External DNS (Immediate)
**Pros**: No transfer needed, immediate control
**Cons**: Still paying Squarespace for domains

### Steps:
1. **At Squarespace, remove ALL DNS records**
2. **Point nameservers to Porkbun's free DNS:**
   ```
   ns1.porkbun.com
   ns2.porkbun.com
   ns3.porkbun.com
   ns4.porkbun.com
   ```
3. **Configure at Porkbun (even without owning the domain there)**

## Quick Comparison:

| Method | Time to Complete | Cost | Best For |
|--------|-----------------|------|----------|
| Transfer to Porkbun | 5-7 days | ~$30 (includes 2 years) | Long-term management |
| Netlify DNS | 30 minutes | Free | Immediate fix |
| Porkbun DNS (no transfer) | 30 minutes | Free | Quick fix, keep domains at Squarespace |

## My Recommendation:

### Immediate Fix (Do Today):
1. **Switch to Netlify DNS** - Gets everything working in 30 minutes
2. This solves all SSL issues immediately

### Long-term (Start Today, Completes Next Week):
1. **Initiate transfer to Porkbun** 
2. Domains will be with your other domains
3. Cheaper renewals (~$10/year vs Squarespace's $20/year)
4. Full control without Squarespace limitations

## Commands for Netlify DNS Setup:

```bash
# Create DNS zones
netlify dns:zones:create --name highline.work --account-slug aspenas
netlify dns:zones:create --name acupcake.shop --account-slug aspenas

# Or use the API
curl -X POST "https://api.netlify.com/api/v1/dns_zones" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "highline.work", "account_id": "YOUR_ACCOUNT_ID"}'

curl -X POST "https://api.netlify.com/api/v1/dns_zones" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "acupcake.shop", "account_id": "YOUR_ACCOUNT_ID"}'
```

## After Nameserver Change:

DNS will automatically configure:
- SSL certificates will provision automatically
- No more DNS conflicts
- All subdomains will work
- inventory.highline.work will work immediately

## Current Squarespace Nameservers to Replace:

Run these to see current nameservers:
```bash
dig highline.work NS +short
dig acupcake.shop NS +short
```

Currently showing:
- ns1.squarespace.com
- ns2.squarespace.com
- ns3.squarespace.com
- ns4.squarespace.com

These need to change to either Netlify or Porkbun nameservers.

---

**QUICKEST SOLUTION**: Change nameservers to Netlify DNS right now. Takes effect in 5-30 minutes, all SSL issues resolved automatically.
