import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ApolloWrapper } from '@/components/providers/ApolloWrapper'
import { Navigation, Footer } from '@candlefish-ai/shared'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Candlefish AI Documentation',
  description: 'Comprehensive documentation for Candlefish AI platform - Building systems that outlive their creators',
  keywords: 'candlefish, ai, documentation, api, guides, tutorials, operational craft',
  authors: [{ name: 'Candlefish AI' }],
  openGraph: {
    title: 'Candlefish AI Documentation',
    description: 'Comprehensive documentation for Candlefish AI platform',
    siteName: 'Candlefish AI Docs',
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
          <div className="min-h-screen bg-[#0b0f13]">
            <Navigation
              siteTitle="Candlefish Docs"
              siteType="docs"
              searchEnabled={true}
            />
            <main className="pt-16">
              {children}
            </main>
            <Footer siteType="docs" />
          </div>
        </ApolloWrapper>
      </body>
    </html>
  )
}
