import type { Metadata, Viewport } from "next";
// import { headers } from 'next/headers';
import "./globals.css";
import HeaderControls from "@/components/ui/HeaderControls";
// import { PWAInstallPrompt } from "@/components/ui/PWAInstallPrompt";
// import { Toaster } from "sonner";
import { AuthProvider } from "@/components/providers/SessionProvider";
import { OfflineProvider } from "@/components/providers/OfflineProvider";
// import { AuthWrapper } from "@/components/auth/AuthWrapper";
import { AuthWrapperSimple as AuthWrapper } from "@/components/auth/AuthWrapperSimple";
import { PWASetup } from "@/components/ui/PWASetup";
import { TelemetryWidget } from "@/components/telemetry/TelemetryWidget";
import { PerformanceProvider } from "@/components/providers/PerformanceProvider";

// Use system fonts to avoid network fetch at build time

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NODE_ENV === 'production' ? 'https://paintbox.candlefish.ai' : 'http://localhost:3004'),
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

// Service Worker Registration Component with nonce support - temporarily removed for build issues

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Skip nonce for now to fix build
  const nonce = undefined;

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

      <body className={`antialiased bg-gradient-paintbox`}
      >
        <PerformanceProvider>
          <AuthProvider>
            <OfflineProvider>
              <AuthWrapper>
              <div className="min-h-screen">
              <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-[var(--color-paintbox-border)] shadow-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src="/images/brand-paintbox.png" alt="Paintbox" className="h-8 w-8 sm:h-7 sm:w-7 rounded" />
                    <span className="font-semibold tracking-tight text-base sm:text-sm">Paintbox</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden lg:block text-xs text-[var(--color-paintbox-text-muted)]">
                      Estimator — Kind Home Paint Company
                    </div>
                    <div className="hidden sm:block text-xs text-[var(--color-paintbox-text-muted)] text-right">
                      Professional Estimator
                    </div>
                    <HeaderControls />
                  </div>
                </div>
                <div style={{height:2,background: `linear-gradient(90deg, var(--stripe-red) 0%, var(--stripe-orange) 20%, var(--stripe-yellow) 40%, var(--stripe-green) 60%, var(--stripe-violet) 80%)`}} />
              </header>

              <main className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-8">
                {children}
              </main>

              <footer className="mt-12 border-t border-[var(--color-paintbox-border)]/70">
                <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
                  <div className="text-sm text-[var(--color-paintbox-text-muted)]">© 2025 Paintbox</div>
                  <div className="text-sm text-[var(--color-paintbox-text-muted)]">Made by <span className="font-medium">Candlefish.ai</span></div>
                </div>
              </footer>
              </div>
            </AuthWrapper>
          </OfflineProvider>
        </AuthProvider>

        {/* PWA Install Prompt */}
        {/* <PWAInstallPrompt /> */}

        {/* Global Toast Notifications */}
        {/* <Toaster
          position="top-right"
          expand={true}
          richColors
          closeButton
          duration={4000}
        /> */}

        {/* Service Worker Registration with CSP nonce */}
        <PWASetup nonce={nonce || undefined} />

        {/* Telemetry Widget - Only show in development/staging or for admins */}
        {(process.env.NODE_ENV === 'development' ||
          process.env.APP_ENV === 'staging' ||
          process.env.SHOW_TELEMETRY === 'true') && (
          <TelemetryWidget />
        )}

        {/* Performance monitoring (only in production) */}
        {/* Temporarily disabled for build issues
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
        */}
      </body>
    </html>
  );
}
