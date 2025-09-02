import '../styles/globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Highline Valuation — Modern Architecture Denver',
  description: 'Meaningful Real Estate | Authentic Design — Quiet, data-first valuation.',
  manifest: '/site.webmanifest',
  icons: { icon: '/brand/mad-favicon.ico' }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[var(--mad-bone)] text-[var(--mad-ink)]">{children}</body>
    </html>
  );
}
