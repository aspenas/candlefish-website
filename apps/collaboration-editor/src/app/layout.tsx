import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ApolloProvider } from '@/components/providers/ApolloProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Candlefish AI - Collaborative Editor',
  description: 'Real-time collaborative document editor with AI-powered suggestions, version control, and CRDT support',
  keywords: ['collaboration', 'editor', 'real-time', 'AI', 'suggestions', 'CRDT', 'documents', 'version control'],
  authors: [{ name: 'Candlefish AI' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Collaboration Editor',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Collaboration Editor" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-16x16.png" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased font-size-medium light`}>
        <ApolloProvider>
          <div id="root" className="min-h-screen">
            {children}
          </div>
          <div id="portal-root" />
        </ApolloProvider>
      </body>
    </html>
  )
}
