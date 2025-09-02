# Plausible Analytics Setup

## Netlify Snippet Injection (Recommended - CDN-level, no code changes)

1. Navigate to **Netlify Dashboard** → Select your project
2. Go to **Site configuration** → **Build & deploy** → **Post processing**
3. Find **Snippet injection** section
4. Click **Add snippet**
5. Select **Insert before </body>**
6. Paste the contents of `docs/analytics/snippets/plausible.html`
7. Click **Save**

**Note:** The snippet injects immediately without requiring a redeploy.

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
        {/* Plausible Analytics */}
        <Script
          defer
          data-domain="candlefish.ai"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
```

## Self-Hosting / Proxy Option

To reduce third-party blocking and improve privacy:

1. **Proxy through Netlify**: Add to `netlify.toml`:
   ```toml
   [[redirects]]
     from = "/js/script.js"
     to = "https://plausible.io/js/script.js"
     status = 200
   ```

2. **Update snippet** to use proxied URL:
   ```html
   <script defer data-domain="candlefish.ai" src="/js/script.js"></script>
   ```

## Account Setup

1. Sign up at [Plausible.io](https://plausible.io/)
2. Add your site: `candlefish.ai`
3. The snippet is pre-configured with your domain
4. No additional token required (domain-based tracking)