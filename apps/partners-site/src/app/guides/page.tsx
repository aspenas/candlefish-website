import { Metadata } from 'next'
import { MobileImplementationGuides } from '@/components/sections/mobile/MobileImplementationGuides'

export const metadata: Metadata = {
  title: 'Implementation Guides',
  description: 'Field-ready implementation guides for Candlefish operators - offline access available',
}

export default function GuidesPage() {
  return <MobileImplementationGuides />
}