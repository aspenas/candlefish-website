import '../styles/globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Highline Valuation — Candlefish',
  description: 'Quiet, data-first valuation. No hype.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[var(--cf-warm-white)] text-[var(--cf-charcoal)]">{children}</body>
    </html>
  );
}
