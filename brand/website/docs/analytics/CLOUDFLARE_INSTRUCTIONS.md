# Cloudflare Web Analytics Setup

## Netlify Snippet Injection (Recommended - CDN-level, no code changes)

1. Navigate to **Netlify Dashboard** → Select your project
2. Go to **Site configuration** → **Build & deploy** → **Post processing**
3. Find **Snippet injection** section
4. Click **Add snippet**
5. Select **Insert before </body>**
6. Paste the contents of `docs/analytics/snippets/cloudflare-web-analytics.html`
7. Replace `REPLACE_WITH_CLOUDFLARE_TOKEN` with your actual Cloudflare token
8. Click **Save**

**Note:** This snippet uses the browser Performance API beacon and injects immediately without requiring a redeploy.

## In-Code Alternative (Framework Integration)

If you prefer to embed the script directly in your Next.js application, add the following to `app/layout.tsx`:

```tsx
// In app/layout.tsx, add this import at the top:
import Script from 'next/script'

// Then in the RootLayout component, add before </body>:
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SkipNavigation />
        <Navigation />
        <main id="main-content" className="relative" role="main">
          {children}
        </main>
        <Footer />
        <ToastProvider />
        {/* Cloudflare Web Analytics */}
        <Script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token":"YOUR_CLOUDFLARE_TOKEN"}'
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
```

## Getting Your Cloudflare Token

1. Sign up for [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/)
2. Add your site: `candlefish.ai`
3. Copy the provided token
4. Replace `REPLACE_WITH_CLOUDFLARE_TOKEN` in the snippet