import type { Metadata, Viewport } from "next";
import { headers } from 'next/headers';
import "./globals.css";
import { PWAInstallPrompt } from "@/components/ui/PWAInstallPrompt";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/providers/SessionProvider";
import { AuthWrapper } from "@/components/auth/AuthWrapper";

// Use system fonts to avoid network fetch at build time

export const metadata: Metadata = {
  title: {
    default: "Paintbox - Professional Painting Estimator",
    template: "%s | Paintbox"
  },
  description: "Professional painting estimation app with offline capabilities, optimized for iPad field use. Create accurate estimates, manage projects, and sync with Salesforce.",
  applicationName: "Paintbox",
  authors: [{ name: "Candlefish.ai" }],
  generator: "Next.js",
  keywords: ["painting", "estimates", "contractor", "iPad", "offline", "PWA", "field service"],
  referrer: "origin-when-cross-origin",
  creator: "Candlefish.ai",
  publisher: "Candlefish.ai",

  // PWA-specific metadata
  manifest: "/manifest.json",

  // Apple-specific metadata for iOS/iPad
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Paintbox",
    startupImage: [
      {
        url: "/icons/icon-512x512.png",
        media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
      }
    ]
  },

  // Icons optimized for various devices
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-167x167.png", sizes: "167x167", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" }
    ],
    shortcut: [
      { url: "/icons/shortcut-new.png", sizes: "192x192" },
      { url: "/icons/shortcut-recent.png", sizes: "192x192" }
    ]
  },

  // Social media metadata
  openGraph: {
    type: "website",
    siteName: "Paintbox",
    title: "Paintbox - Professional Painting Estimator",
    description: "Professional painting estimation app with offline capabilities, optimized for iPad field use.",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Paintbox Logo"
      }
    ]
  },

  twitter: {
    card: "summary",
    title: "Paintbox - Professional Painting Estimator",
    description: "Professional painting estimation app with offline capabilities, optimized for iPad field use.",
    images: ["/icons/icon-512x512.png"]
  },

  // Additional metadata for better PWA support
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Paintbox",
    "msapplication-TileColor": "#2563eb",
    "msapplication-config": "/browserconfig.xml"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1d4ed8" }
  ],
  colorScheme: "light dark",
  viewportFit: "cover"
};

// Service Worker Registration Component with nonce support
function PWASetup({ nonce }: { nonce?: string }) {
  return (
    <script
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator && typeof window !== 'undefined') {
            window.addEventListener('load', function () {
              navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then(function (registration) {
                  // Check for updates
                  registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                      newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                          // New version available
                          if (confirm('A new version is available. Would you like to reload?')) {
                            window.location.reload();
                          }
                        }
                      });
                    }
                  });
                })
                .catch(function () {});
            });
          }

          // Handle install prompt
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            // @ts-ignore
            window.deferredPrompt = e;
          });

          // Track PWA install
          window.addEventListener('appinstalled', function() {
            if (typeof gtag !== 'undefined') {
              // @ts-ignore
              gtag('event', 'pwa_install', { event_category: 'engagement', event_label: 'PWA Installation' });
            }
          });
        `
      }}
    />
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read nonce from header set by middleware for inline scripts
  const nonce = headers().get('x-csp-nonce');

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS prefetch for likely API domains */}
        <link rel="dns-prefetch" href="https://salesforce.com" />
        <link rel="dns-prefetch" href="https://companycam.com" />

        {/* Disable zoom on double-tap for better iPad experience */}
        <meta name="format-detection" content="telephone=no" />

        {/* iPad-specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Paintbox" />

        {/* Microsoft Edge/Windows tiles */}
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />

        {/* Prevent automatic phone number detection */}
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
      </head>

      <body className={`antialiased`}>
        <AuthProvider>
          <AuthWrapper>
            {/* Main App Content */}
            {children}
          </AuthWrapper>
        </AuthProvider>

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />

        {/* Global Toast Notifications */}
        <Toaster
          position="top-right"
          expand={true}
          richColors
          closeButton
          duration={4000}
        />

        {/* Service Worker Registration with CSP nonce */}
        <PWASetup nonce={nonce || undefined} />

        {/* Performance monitoring (only in production) */}
        {process.env.NODE_ENV === 'production' && (
          <script
            nonce={nonce || undefined}
            dangerouslySetInnerHTML={{
              __html: `
                // Performance monitoring
                if ('performance' in window && 'PerformanceObserver' in window) {
                  // Monitor Largest Contentful Paint
                  new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                      if (entry.entryType === 'largest-contentful-paint') {
                        console.log('LCP:', entry.startTime);
                      }
                    }
                  }).observe({ type: 'largest-contentful-paint', buffered: true });

                  // Monitor First Input Delay
                  new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                      if (entry.entryType === 'first-input') {
                        console.log('FID:', entry.processingStart - entry.startTime);
                      }
                    }
                  }).observe({ type: 'first-input', buffered: true });

                  // Monitor Cumulative Layout Shift
                  let cls = 0;
                  new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                      if (!entry.hadRecentInput) {
                        cls += entry.value;
                      }
                    }
                  }).observe({ type: 'layout-shift', buffered: true });

                  // Log final CLS score when page visibility changes
                  document.addEventListener('visibilitychange', () => {
                    if (document.visibilityState === 'hidden') {
                      console.log('CLS:', cls);
                    }
                  });
                }
              `
            }}
          />
        )}
      </body>
    </html>
  );
}
