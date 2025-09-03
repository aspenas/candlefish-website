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
  themeColor: '#0D1B2A',
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
      </head>
      <body>
        <SkipNavigation />
        <Navigation />
        <main id="main-content" className="relative" role="main">
          {children}
        </main>
        <Footer />
        <ToastProvider />
        <script src="/src/entries/hero-fish.js" defer />
      </body>
    </html>
  )
}
