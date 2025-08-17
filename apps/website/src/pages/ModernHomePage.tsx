import React, { useEffect, lazy, Suspense } from 'react'
import ModernNavigation from '../components/ModernNavigation'
import ModernHeroSection from '../components/sections/ModernHeroSection'
import LazySection from '../components/LazySection'

// Lazy load heavy sections for better performance
const ModernFeaturesSection = lazy(() => import('../components/sections/ModernFeaturesSection'))
const SocialProofSection = lazy(() => import('../components/sections/SocialProofSection'))
const EnhancedCTASection = lazy(() => import('../components/sections/EnhancedCTASection'))
const ModernFooter = lazy(() => import('../components/ModernFooter'))

const ModernHomePage: React.FC = () => {
  useEffect(() => {
    // Smooth scroll behavior for anchor links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault()
        const id = target.getAttribute('href')?.slice(1)
        const element = document.getElementById(id || '')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }
    }

    document.addEventListener('click', handleAnchorClick)
    return () => document.removeEventListener('click', handleAnchorClick)
  }, [])

  return (
    <div className="min-h-screen bg-warm-white">
      <ModernNavigation />
      <main>
        <ModernHeroSection />
        <Suspense fallback={<div className="min-h-[400px] bg-muted-sand animate-pulse" />}>
          <LazySection>
            <ModernFeaturesSection />
          </LazySection>
          <LazySection>
            <SocialProofSection />
          </LazySection>
          <LazySection>
            <EnhancedCTASection />
          </LazySection>
        </Suspense>
      </main>
      <Suspense fallback={<div className="min-h-[300px] bg-charcoal animate-pulse" />}>
        <ModernFooter />
      </Suspense>
    </div>
  )
}

export default ModernHomePage
