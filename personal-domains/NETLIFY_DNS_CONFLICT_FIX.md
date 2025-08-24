# Netlify DNS Conflict Resolution for inventory.highline.work

## Issue
"A DNS zone for this domain already exists on NS1" - This means inventory.highline.work was previously configured in Netlify's DNS system and wasn't properly removed.

## Solution Options

### Option 1: Contact Netlify Support (RECOMMENDED)
1. Go to: https://www.netlify.com/support/
2. Submit a support ticket with this message:

```
Subject: DNS Zone Conflict - inventory.highline.work

Hello,

I'm trying to add the custom domain "inventory.highline.work" to my Netlify site (Site ID: 9ebc8d1d-e31b-4c29-afe4-1905a7503d4a), but I'm getting an error:

"A DNS zone for this domain already exists on NS1, the DNS provider backing Netlify DNS"

This domain was previously used on another Netlify site and seems to have left a DNS zone in NS1. 

Could you please help remove the existing DNS zone for inventory.highline.work so I can add it to my current site?

Site details:
- Site name: highline-inventory
- Site ID: 9ebc8d1d-e31b-4c29-afe4-1905a7503d4a
- Domain to add: inventory.highline.work
- Account: aspenas

Thank you!
```

### Option 2: Try Alternative Subdomain Temporarily
While waiting for support, you could use a different subdomain:

1. In Squarespace DNS, add:
   ```
   Type: CNAME
   Host: 5470-inventory
   Data: highline-inventory.netlify.app
   ```

2. Access via: https://5470-inventory.highline.work

### Option 3: Use _domainconnect TXT Record
Sometimes this helps prove ownership:

1. In Squarespace DNS, add:
   ```
   Type: TXT
   Host: _domainconnect.inventory
   Data: "domain-verification=netlify"
   ```

2. Wait 10 minutes, then try adding the domain again

### Option 4: Remove and Re-add Through API
Try this cleanup script:

```bash
# List all DNS zones
curl -X GET "https://api.netlify.com/api/v1/dns_zones" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.[] | select(.name | contains("highline"))'

# If you find the zone, delete it:
curl -X DELETE "https://api.netlify.com/api/v1/dns_zones/ZONE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Current Status of Your Domains

| Domain | Status | SSL | Notes |
|--------|--------|-----|-------|
| highline.work | ✅ Working | ✅ Issued | Main domain working |
| www.highline.work | ✅ Working | ✅ Issued | WWW working |
| inventory.highline.work | ❌ DNS Conflict | ❌ Pending | NS1 zone conflict |
| acupcake.shop | ⏳ Provisioning | ⏳ Pending | Should auto-provision |

## Immediate Workaround

While waiting for Netlify support, you can:

1. **Access the inventory app directly via:**
   - https://highline-inventory.netlify.app
   - This URL works immediately without DNS issues

2. **Create a redirect from main domain:**
   - Add a link on https://highline.work to the Netlify app URL
   - Users can access inventory through the main site

3. **Use Netlify's subdomain:**
   - The site is fully functional at: https://highline-inventory.netlify.app
   - Share this URL with family members who need access

## DNS Records to Verify

Run these commands to check current DNS:
```bash
# Check current CNAME
dig inventory.highline.work CNAME +short
# Expected: highline-inventory.netlify.app

# Check nameservers
dig highline.work NS +short
# Should show Squarespace nameservers

# Check if domain resolves
nslookup inventory.highline.work
```

## Timeline for Resolution

1. **Netlify Support Response**: Usually within 24-48 hours
2. **DNS Zone Cleanup**: Once support removes the zone, immediate
3. **Domain Addition**: After cleanup, takes 5 minutes
4. **SSL Provisioning**: 10-15 minutes after domain is added

## Alternative: Move Everything to Netlify DNS

If issues persist, consider moving highline.work entirely to Netlify DNS:

1. Change nameservers at Squarespace to:
   - dns1.p01.nsone.net
   - dns2.p01.nsone.net
   - dns3.p01.nsone.net
   - dns4.p01.nsone.net

2. Manage all DNS through Netlify Dashboard

This would eliminate conflicts but requires moving all DNS records.

---

**Next Step**: Submit the support ticket to Netlify. They can clear the NS1 zone conflict quickly.
