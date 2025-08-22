import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap'
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'], 
  variable: '--font-jetbrains-mono',
  display: 'swap'
})

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'], 
  variable: '--font-space-grotesk',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'NANDA | Neural Agent Network & Distributed Architecture',
  description: 'Web interface for managing and monitoring distributed consciousness agents across the NANDA network',
  keywords: ['NANDA', 'neural agents', 'distributed consciousness', 'AI monitoring', 'agent management'],
  authors: [{ name: 'Candlefish AI', url: 'https://candlefish.ai' }],
  creator: 'Candlefish AI',
  publisher: 'Candlefish AI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://nanda.candlefish.ai'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'NANDA | Neural Agent Network & Distributed Architecture',
    description: 'Web interface for managing and monitoring distributed consciousness agents',
    url: 'https://nanda.candlefish.ai',
    siteName: 'NANDA Dashboard',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NANDA | Neural Agent Network & Distributed Architecture',
    description: 'Web interface for managing and monitoring distributed consciousness agents',
    creator: '@candlefish_ai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <meta name="theme-color" content="#3f4dff" />
      </head>
      <body className="font-sans antialiased">
        <div className="matrix-rain"></div>
        <div className="neural-network-bg min-h-screen">
          <div className="quantum-grid min-h-screen">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}