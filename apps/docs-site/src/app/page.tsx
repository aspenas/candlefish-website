import { HeroSection } from '@/components/sections/HeroSection'
import { QuickStartSection } from '@/components/sections/QuickStartSection'
import { FeaturedGuides } from '@/components/sections/FeaturedGuides'
import { PopularTopics } from '@/components/sections/PopularTopics'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <QuickStartSection />
      <FeaturedGuides />
      <PopularTopics />
    </>
  )
}