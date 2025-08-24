import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ApolloWrapper } from '@/components/providers/ApolloWrapper'
import { Navigation, Footer } from '@candlefish-ai/shared'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Candlefish AI API Reference',
  description: 'Interactive API documentation and reference for Candlefish AI platform - Build with operational craft',
  keywords: 'candlefish, ai, api, reference, documentation, rest, graphql, endpoints, interactive',
  authors: [{ name: 'Candlefish AI' }],
  openGraph: {
    title: 'Candlefish AI API Reference',
    description: 'Interactive API documentation and reference for Candlefish AI platform',
    siteName: 'Candlefish AI API',
    locale: 'en_US',
    type: 'website',
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        <ApolloWrapper>
          <div className="min-h-screen bg-warm-white">
            <Navigation
              siteTitle="Candlefish API"
              siteType="api"
              searchEnabled={true}
            />
            <main className="pt-16">
              {children}
            </main>
            <Footer siteType="api" />
          </div>
        </ApolloWrapper>
      </body>
    </html>
  )
}