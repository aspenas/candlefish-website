import React from 'react'
import Navigation from '../components/Navigation'
import HeroSection from '../components/sections/HeroSection'
import FeaturesGrid from '../components/sections/FeaturesGrid'
import CaseStudiesSection from '../components/sections/CaseStudiesSection'
import TestimonialsSection from '../components/sections/TestimonialsSection'
import CTASection from '../components/sections/CTASection'
import Footer from '../components/Footer'
import '../styles/design-system.css'

const HomePage: React.FC = () => {
  return (
    <div className="professional-app">
      <Navigation />
      <main>
        <HeroSection />
        <FeaturesGrid />
        <CaseStudiesSection />
        <TestimonialsSection />
        <CTASection variant="primary" />
      </main>
      <Footer />
    </div>
  )
}

export default HomePage