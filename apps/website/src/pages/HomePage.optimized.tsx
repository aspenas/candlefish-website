import React, { lazy, Suspense } from 'react'
import OptimizedHeroSection from '../components/sections/OptimizedHeroSection'
import Footer from '../components/Footer'

// Lazy load heavy sections
const ValueProposition = lazy(() =>
  import('../components/sections/OptimizedValueProposition' /* webpackChunkName: "value-prop" */)
)
const WhatWeDo = lazy(() =>
  import('../components/sections/OptimizedWhatWeDo' /* webpackChunkName: "what-we-do" */)
)
const HowItWorks = lazy(() =>
  import('../components/sections/OptimizedHowItWorks' /* webpackChunkName: "how-it-works" */)
)
const PilotProjects = lazy(() =>
  import('../components/sections/PilotProjects' /* webpackChunkName: "pilots" */)
)
const TechnicalExcellence = lazy(() =>
  import('../components/sections/TechnicalExcellence' /* webpackChunkName: "tech" */)
)
const CTASection = lazy(() =>
  import('../components/sections/CTASection' /* webpackChunkName: "cta" */)
)
const ContactSection = lazy(() =>
  import('../components/sections/ContactSection' /* webpackChunkName: "contact" */)
)

// Section loading placeholder
const SectionLoader: React.FC<{ height?: string }> = ({ height = '400px' }) => (
  <div
    className="animate-pulse bg-gray-900/20"
    style={{ height }}
    aria-busy="true"
    aria-label="Loading section"
  />
)

const HomePage: React.FC = () => {
  return (
    <main role="main" aria-label="Home Page">
      {/* Hero is critical - no lazy loading */}
      <OptimizedHeroSection />

      {/* Lazy load remaining sections */}
      <Suspense fallback={<SectionLoader />}>
        <ValueProposition />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <WhatWeDo />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <HowItWorks />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <PilotProjects />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <TechnicalExcellence />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <CTASection />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <ContactSection />
      </Suspense>

      <Footer />
    </main>
  )
}

export default HomePage
