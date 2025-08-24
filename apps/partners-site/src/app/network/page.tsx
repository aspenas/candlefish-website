import { Metadata } from 'next'
import { MobileOperatorNetwork } from '@/components/sections/mobile/MobileOperatorNetwork'

export const metadata: Metadata = {
  title: 'Operator Network',
  description: 'Connect with certified Candlefish operators in your area - real-time availability and instant contact',
}

export default function NetworkPage() {
  return <MobileOperatorNetwork />
}