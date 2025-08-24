import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ApolloWrapper } from '@/components/providers/ApolloWrapper'
import { PWAProvider } from '@/components/providers/PWAProvider'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { Navigation, Footer } from '@candlefish-ai/shared'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3B82F6' },
    { media: '(prefers-color-scheme: dark)', color: '#1E40AF' }
  ],
  colorScheme: 'light dark',
}

export const metadata: Metadata = {
  title: {
    default: 'Candlefish Partners Portal',
    template: '%s | Candlefish Partners'
  },
  description: 'Mobile-first partner portal for Candlefish operators and field technicians - Building tomorrow\'s AI solutions together',
  keywords: 'candlefish, ai, partners, operators, network, integration, consulting, implementation, mobile, field, technicians, pwa',
  authors: [{ name: 'Candlefish AI' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Candlefish Partners',
    startupImage: [
      '/icons/apple-startup-828x1792.png',
      {
        url: '/icons/apple-startup-1125x2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/icons/apple-startup-1242x2208.png', 
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  openGraph: {
    title: 'Candlefish Partners Portal',
    description: 'Mobile-first partner portal for field operators and technicians',
    siteName: 'Candlefish Partners Portal',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/icons/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Candlefish Partners Portal'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Candlefish Partners Portal',
    description: 'Mobile-first partner portal for field operators',
    images: ['/icons/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Candlefish Partners',
    'application-name': 'Candlefish Partners',
    'msapplication-TileColor': '#3B82F6',
    'msapplication-config': '/browserconfig.xml',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* PWA meta tags */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#3B82F6" />
        
        {/* Microsoft tiles */}
        <meta name="msapplication-TileColor" content="#3B82F6" />
        <meta name="msapplication-TileImage" content="/icons/mstile-144x144.png" />
        
        {/* Preload critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for external domains */}
        <link rel="dns-prefetch" href="//api.candlefish.ai" />
        <link rel="dns-prefetch" href="//cdn.candlefish.ai" />
      </head>
      <body className={inter.className}>
        <PWAProvider>
          <ApolloWrapper>
            {/* Desktop Layout */}
            <div className="hidden lg:block min-h-screen bg-warm-white">
              <Navigation
                siteTitle="Candlefish Partners"
                siteType="partners"
                searchEnabled={true}
              />
              <main className="pt-16">
                {children}
              </main>
              <Footer siteType="partners" />
            </div>
            
            {/* Mobile Layout */}
            <div className="lg:hidden">
              <MobileLayout>
                {children}
              </MobileLayout>
            </div>
          </ApolloWrapper>
        </PWAProvider>
      </body>
    </html>
  )
}