import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
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
  description: 'Real-time collaborative document editor with CRDT support',
  keywords: ['collaboration', 'editor', 'real-time', 'CRDT', 'documents'],
  authors: [{ name: 'Candlefish AI' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <div id="root" className="min-h-screen">
          {children}
        </div>
        <div id="portal-root" />
      </body>
    </html>
  )
}
