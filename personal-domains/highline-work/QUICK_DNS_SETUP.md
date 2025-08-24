# Quick DNS Setup Guide - Squarespace

## 🎯 What You Need to Do

### 1. Login to Squarespace
- Go to https://account.squarespace.com/domains
- Find your domains: `highline.work` and `acupcake.shop`

### 2. Configure highline.work
Click on **highline.work** → **DNS Settings** → Add these records:

| Type | Host | Target | TTL |
|------|------|--------|-----|
| A | @ | 75.2.60.5 | 300 |
| CNAME | inventory | highline-inventory.netlify.app | 300 |
| CNAME | www | highline-work.netlify.app | 300 |

### 3. Configure acupcake.shop
Click on **acupcake.shop** → **DNS Settings** → Add this record:

| Type | Host | Target | TTL |
|------|------|--------|-----|
| A | @ | 75.2.60.5 | 300 |

### 4. Remove Old Records
Delete any existing A records or CNAME records that conflict with the above.

## ✅ Verification
After 5-10 minutes, run:
```bash
./scripts/verify-dns-config.sh
```

## 🆘 Troubleshooting
- **DNS not working?** Wait 10 more minutes, try again
- **SSL errors?** Netlify needs 5-10 minutes to provision certificates
- **Can't find DNS settings?** Look for "Advanced DNS" or "DNS Records" in domain settings

## 📞 Support
- Squarespace: Contact their domain support
- Netlify: Check https://app.netlify.com/sites/highline-work/settings/domain
