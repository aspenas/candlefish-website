# Content Security Policy (CSP) Requirements for Analytics

If you implement a Content Security Policy in the future, add these directives to allow analytics scripts:

## For Cloudflare Web Analytics
```
script-src 'self' https://static.cloudflareinsights.com;
connect-src 'self' https://cloudflareinsights.com;
```

## For Plausible Analytics
```
script-src 'self' https://plausible.io;
connect-src 'self' https://plausible.io;
```

## Example CSP Header in netlify.toml
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://plausible.io; connect-src 'self' https://cloudflareinsights.com https://plausible.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
```

**Note:** Only add CSP if you need the additional security. It can be complex to maintain.