# Squarespace DNS Configuration for Highline Domains

## Access Squarespace DNS Settings

1. **Log into Squarespace**: Go to https://squarespace.com and sign in to your account
2. **Navigate to Domains**: 
   - Click "Settings" in the left sidebar
   - Click "Domains" 
   - Or go directly to: https://account.squarespace.com/domains

## Configuration for highline.work

### Step 1: Remove Existing Records
Before adding new records, remove any conflicting DNS records:

**Records to Remove:**
- Any existing A records pointing to old hosting
- Any CNAME records for @ (root domain)
- Any conflicting A records for inventory subdomain

### Step 2: Add Required DNS Records

#### Root Domain (highline.work)
**Record Type:** A Record
- **Host:** @ (or leave empty for root domain)
- **Points To:** 75.2.60.5
- **TTL:** 300 seconds (5 minutes)

#### Inventory Subdomain (inventory.highline.work)
**Record Type:** CNAME
- **Host:** inventory
- **Points To:** highline-inventory.netlify.app
- **TTL:** 300 seconds (5 minutes)

#### Optional: WWW Subdomain (www.highline.work)
**Record Type:** CNAME
- **Host:** www
- **Points To:** highline-work.netlify.app
- **TTL:** 300 seconds (5 minutes)

## Configuration for acupcake.shop

### Option 1: Redirect to highline.work (Recommended)
**Record Type:** A Record
- **Host:** @ (or leave empty)
- **Points To:** 75.2.60.5
- **TTL:** 300 seconds

Then configure a redirect at the Netlify level.

### Option 2: Direct A Record (if separate site needed)
**Record Type:** A Record
- **Host:** @ (or leave empty)
- **Points To:** 75.2.60.5
- **TTL:** 300 seconds

## Squarespace Interface Navigation

### Finding DNS Settings in Squarespace:
1. **Login** → **Settings** → **Domains**
2. Click on the domain name (e.g., "highline.work")
3. Click **"DNS Settings"** or **"Advanced DNS"**
4. Look for **"DNS Records"** or **"Custom Records"** section

### Adding DNS Records:
1. Click **"Add Record"** or **"+ Add Record"**
2. Select record type (A or CNAME)
3. Fill in the host/name field
4. Fill in the points to/target field
5. Set TTL to 300 seconds
6. Click **"Save"** or **"Add Record"**

### Removing DNS Records:
1. Find the existing record in the list
2. Click the **trash/delete icon** or **"Remove"**
3. Confirm deletion

## Verification Commands

After making changes, verify with these commands:

```bash
# Check root domain A record
dig highline.work A +short
# Should return: 75.2.60.5

# Check inventory subdomain CNAME
dig inventory.highline.work CNAME +short  
# Should return: highline-inventory.netlify.app.

# Check WWW subdomain (if configured)
dig www.highline.work CNAME +short
# Should return: highline-work.netlify.app.

# Test HTTPS connectivity
curl -I https://highline.work
curl -I https://inventory.highline.work
```

## Important Notes

1. **TTL Settings**: Use 300 seconds (5 minutes) for faster propagation during initial setup
2. **DNS Propagation**: Changes may take 5-60 minutes to propagate globally
3. **SSL Certificates**: Netlify will automatically provision SSL certificates once DNS is properly configured
4. **Email Records**: Don't modify MX records - those should remain pointing to Google Workspace

## Troubleshooting

### If SSL doesn't provision after 10 minutes:
1. Verify DNS records are correctly configured
2. Check that there are no conflicting AAAA (IPv6) records
3. Ensure no CAA records are blocking Let's Encrypt
4. Contact Netlify support if issues persist

### If site doesn't load:
1. Verify A record is pointing to 75.2.60.5 exactly
2. Check for typos in CNAME targets
3. Wait additional time for DNS propagation
4. Test with different DNS servers: `dig @8.8.8.8 highline.work A`

## Summary of Required Changes

| Domain | Record Type | Host | Target | TTL |
|--------|-------------|------|--------|-----|
| highline.work | A | @ | 75.2.60.5 | 300 |
| inventory.highline.work | CNAME | inventory | highline-inventory.netlify.app | 300 |
| www.highline.work | CNAME | www | highline-work.netlify.app | 300 |
| acupcake.shop | A | @ | 75.2.60.5 | 300 |
