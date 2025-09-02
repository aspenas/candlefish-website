# Google Search Console Domain Verification via Porkbun DNS

## Quick Links
- [Google Search Console](https://search.google.com/search-console/)
- [Porkbun DNS Management](https://porkbun.com/account/domainsSpeedy)
- [Netlify Snippet Injection Docs](https://docs.netlify.com/site-deploys/post-processing/snippet-injection/)

## Step-by-Step Instructions

### 1. Create Domain Property in Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Click **Add property** or the dropdown arrow next to your existing property
3. Select **Domain** (not URL prefix)
4. Enter: `candlefish.ai`
5. Click **Continue**
6. Google will show a TXT verification record that looks like:
   ```
   google-site-verification=abc123xyz...
   ```
7. **Copy this value** (you'll need it for Porkbun)

### 2. Add TXT Record in Porkbun

1. Log in to [Porkbun](https://porkbun.com/)
2. Go to **Account** → **Domain Management**
3. Find `candlefish.ai` and click **DNS**
4. Click **Add Record** and fill in:

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Host** | @ |
| **Answer** | google-site-verification=REPLACE_WITH_GSC_VALUE |
| **TTL** | 300 |
| **Priority** | (leave blank) |

5. Click **Save**

### 3. Verify in Google Search Console

1. Wait 2-5 minutes for DNS propagation
2. Return to Google Search Console
3. Click **Verify**
4. If verification fails, wait a few more minutes and try again

## Verification Record Template

Fill in your actual verification value from Google:

```
Record type: TXT
Host/Name: @
TTL: 300
Value: google-site-verification=REPLACE_WITH_GSC_VALUE
```

## Troubleshooting

- **Verification fails**: DNS can take up to 48 hours to propagate, but usually works within 5-10 minutes
- **Multiple TXT records**: It's safe to have multiple TXT records on the @ host
- **Already verified**: If the domain was previously verified, you may see it immediately in your GSC properties

## Post-Verification

Once verified:
1. Submit your sitemap: `https://candlefish.ai/sitemap.xml`
2. Check Coverage report for any indexing issues
3. Set up performance monitoring
4. Configure email alerts for critical issues