import { Metadata } from 'next'
import { MobileDemoShowcase } from '@/components/mobile/MobileDemoShowcase'

export const metadata: Metadata = {
  title: 'Mobile App Demo',
  description: 'Experience the full mobile capabilities of the Candlefish Partners Portal PWA',
}

export default function MobileDemoPage() {
  return <MobileDemoShowcase />
}