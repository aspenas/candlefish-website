import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Candlefish AI API',
  description: 'API Documentation and Testing Environment',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
