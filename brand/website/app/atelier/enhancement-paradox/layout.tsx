import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Paradox of Enhancement | Candlefish Operational Atelier',
  description: 'Workshop Note - When sophistication masquerades as intelligence. A live analysis of framework optimization through operational metrics.',
  openGraph: {
    title: 'The Paradox of Enhancement | Candlefish',
    description: 'The best enhancement is often knowing when not to enhance.',
    type: 'article',
    publishedTime: '2025-09-01T00:00:00.000Z',
    authors: ['Candlefish Operational Atelier'],
  },
};

export default function EnhancementParadoxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}