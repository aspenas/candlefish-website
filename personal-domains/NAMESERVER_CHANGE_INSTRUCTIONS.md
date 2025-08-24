# 🚀 IMMEDIATE FIX: Change Nameservers to Netlify DNS

This will solve ALL your SSL and DNS issues in about 30 minutes!

## Step 1: Change Nameservers at Squarespace

### For highline.work:
1. Go to: https://account.squarespace.com/domains/managed/highline.work/dns-settings
2. Click "Advanced Settings" → "Nameservers" 
3. Replace Squarespace nameservers with Netlify's:
```
dns1.p04.nsone.net
dns2.p04.nsone.net
dns3.p04.nsone.net
dns4.p04.nsone.net
```

### For acupcake.shop:
1. Go to: https://account.squarespace.com/domains/managed/acupcake.shop/dns-settings
2. Click "Advanced Settings" → "Nameservers"
3. Replace Squarespace nameservers with Netlify's:
```
dns1.p03.nsone.net
dns2.p03.nsone.net
dns3.p03.nsone.net
dns4.p03.nsone.net
```

## Step 2: Wait for Propagation (5-30 minutes)

Check propagation:
```bash
# Check highline.work
dig highline.work NS +short

# Check acupcake.shop  
dig acupcake.shop NS +short
```

When you see the Netlify nameservers (p03.nsone.net or p04.nsone.net), it's ready!

## Step 3: Netlify Will Auto-Configure Everything!

Once nameservers propagate, Netlify will automatically:
- ✅ Create all necessary DNS records
- ✅ Provision SSL certificates for all domains
- ✅ Fix the inventory.highline.work conflict
- ✅ Set up www subdomains correctly

## What Happens Next:

| Domain | Will Work At | SSL Status |
|--------|--------------|------------|
| highline.work | https://highline.work | Auto-provisions |
| www.highline.work | https://www.highline.work | Auto-provisions |
| inventory.highline.work | https://inventory.highline.work | Auto-provisions |
| acupcake.shop | https://acupcake.shop | Auto-provisions |
| www.acupcake.shop | https://www.acupcake.shop | Auto-provisions |

## Benefits of Netlify DNS:

1. **Automatic SSL** - No more certificate issues
2. **Automatic configuration** - Netlify handles all records
3. **Better performance** - Netlify's global DNS network
4. **No more conflicts** - Everything managed in one place
5. **Free** - No additional DNS costs

## Verify Everything Works:

After 30 minutes, test all your sites:
```bash
# Test all HTTPS URLs
curl -I https://highline.work
curl -I https://www.highline.work
curl -I https://inventory.highline.work
curl -I https://acupcake.shop
curl -I https://www.acupcake.shop
```

## Future Domain Transfer (Optional):

After everything is working, you can optionally transfer domains from Squarespace to Porkbun:
1. This saves money (~$10/year vs $20/year at Squarespace)
2. Gives you full control
3. But it's not urgent - Netlify DNS works regardless of where domain is registered

## Troubleshooting:

If nameservers don't change:
1. Make sure you clicked "Save" in Squarespace
2. Some browsers cache DNS - try incognito mode
3. Use Google's DNS to check: `dig @8.8.8.8 highline.work NS`

---

**ACTION REQUIRED**: Just change the nameservers at Squarespace (Step 1 above) and everything else happens automatically!
