import type { Metadata } from 'next'
import './globals.css'
import Navigation from '../components/navigation/OperationalNav'
import Footer from '../components/navigation/OperationalFooter'
import SkipNavigation from '../components/accessibility/SkipNavigation'
import { ToastProvider } from '../components/ui/ToastProvider'

export const metadata: Metadata = {
  title: 'Candlefish — Operational Design Atelier',
  description: 'We architect operational systems for businesses that refuse to accept inefficiency.',
  keywords: 'operational systems, business automation, workflow design, process architecture',
  authors: [{ name: 'Candlefish' }],
  metadataBase: new URL('https://candlefish.ai'),
  openGraph: {
    title: 'Candlefish',
    description: 'Operational systems for impossible problems.',
    url: 'https://candlefish.ai',
    siteName: 'Candlefish',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0D1B2A',
  // iOS-specific viewport optimizations
  minimalUI: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/hero-fish.css" />
        {/* iOS-specific meta tags for better compatibility */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Preconnect to improve performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="ios-optimized">
        <SkipNavigation />
        <Navigation />
        <main id="main-content" className="relative" role="main">
          {children}
        </main>
        <Footer />
        <ToastProvider />
      </body>
    </html>
  )
}
