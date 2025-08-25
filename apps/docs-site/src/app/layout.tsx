import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Candlefish AI - Operational Craft',
  description: 'World-class infrastructure for AI applications',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
