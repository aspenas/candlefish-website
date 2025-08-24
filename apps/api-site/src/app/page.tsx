import { HeroSection } from '@/components/sections/HeroSection'
import { QuickStart } from '@/components/sections/QuickStart'
import { EndpointShowcase } from '@/components/sections/EndpointShowcase'
import { SDKSection } from '@/components/sections/SDKSection'
import { InteractivePlayground } from '@/components/sections/InteractivePlayground'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <QuickStart />
      <EndpointShowcase />
      <SDKSection />
      <InteractivePlayground />
    </>
  )
}