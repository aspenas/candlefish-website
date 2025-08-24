import { HeroSection } from '@/components/sections/HeroSection'
import { MobileHeroSection } from '@/components/sections/mobile/MobileHeroSection'
import { PartnerDirectory } from '@/components/sections/PartnerDirectory'
import { OperatorNetwork } from '@/components/sections/OperatorNetwork'
import { SuccessStories } from '@/components/sections/SuccessStories'
import { BecomePartnerCTA } from '@/components/sections/BecomePartnerCTA'

export default function HomePage() {
  return (
    <>
      {/* Desktop Hero */}
      <div className="hidden lg:block">
        <HeroSection />
        <PartnerDirectory />
        <OperatorNetwork />
        <SuccessStories />
        <BecomePartnerCTA />
      </div>
      
      {/* Mobile Hero */}
      <div className="lg:hidden">
        <MobileHeroSection />
      </div>
    </>
  )
}