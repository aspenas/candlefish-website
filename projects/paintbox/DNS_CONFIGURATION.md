# DNS Configuration for paintbox.candlefish.ai

## Required DNS Records

Add the following DNS records to your domain provider for candlefish.ai:

### Option 1: A and AAAA Records (Recommended)
```
Type  | Name     | Value
------|----------|------------------------
A     | paintbox | 66.241.125.157
AAAA  | paintbox | 2a09:8280:1::8d:ef17:0
```

### Option 2: CNAME Record (Alternative)
```
Type  | Name     | Value
------|----------|--------------------------------
CNAME | paintbox | knqpz9d.paintbox-app.fly.dev
```

## SSL Certificate Status

SSL certificate has been requested from Let's Encrypt and will be automatically provisioned once DNS records are configured.

## Verification

After adding DNS records, verify the configuration:

```bash
# Check DNS propagation
dig paintbox.candlefish.ai

# Verify SSL certificate
flyctl certs show paintbox.candlefish.ai -a paintbox-app

# List all certificates
flyctl certs list -a paintbox-app
```

## Access URLs

Once configured:
- Production: https://paintbox.candlefish.ai
- Fly.io URL: https://paintbox-app.fly.dev

## DNS Provider Instructions

### For Cloudflare:
1. Log into Cloudflare dashboard
2. Select candlefish.ai domain
3. Go to DNS section
4. Add the A and AAAA records above
5. Set Proxy status to "DNS only" (gray cloud) initially

### For Route 53:
1. Go to AWS Route 53 console
2. Select candlefish.ai hosted zone
3. Create new record set
4. Add A and AAAA records as specified above

### For Other Providers:
Consult your DNS provider's documentation for adding A/AAAA or CNAME records.
