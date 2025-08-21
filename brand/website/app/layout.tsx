import type { Metadata } from 'next'
import './globals.css'
import Navigation from '../components/navigation/OperationalNav'
import Footer from '../components/navigation/OperationalFooter'

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
      <body>
        <Navigation />
        <main className="relative">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
