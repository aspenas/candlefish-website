import React, { useEffect } from 'react'
// import { PublicLayout } from '@candlefish-ai/ui-components'
import HeroSection from '../components/sections/HeroSection'
import ValueProposition from '../components/sections/ValueProposition'
import WhatWeDo from '../components/sections/WhatWeDo'
import HowItWorks from '../components/sections/HowItWorks'
import PilotProjects from '../components/sections/PilotProjects'
import TechnicalExcellence from '../components/sections/TechnicalExcellence'
import CTASection from '../components/sections/CTASection'
import ContactSection from '../components/sections/ContactSection'
import Footer from '../components/Footer'

// Motion: keep disabled by default for a calm, intentional experience
const ENABLE_SCROLL_ANIMATIONS = false

const HomePage: React.FC = () => {
  useEffect(() => {
    if (!ENABLE_SCROLL_ANIMATIONS) return
    // Reserved for subtle, opt-in scroll animations if re-enabled later
  }, [])

  // Add structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Candlefish AI LLC",
    "description": "Enterprise AI consulting through discrete, composable modules",
    "url": "https://candlefish.ai",
    "logo": "/logo/candlefish_original.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "hello@candlefish.ai",
      "contactType": "sales",
      "availableLanguage": "English"
    },
    "address": [
      {
        "@type": "PostalAddress",
        "addressLocality": "Portsmouth",
        "addressRegion": "NH",
        "addressCountry": "USA"
      },
      {
        "@type": "PostalAddress",
        "addressLocality": "Denver",
        "addressRegion": "CO",
        "addressCountry": "USA"
      }
    ],
    "sameAs": [
      "https://linkedin.com/company/candlefish-ai",
      "https://github.com/candlefish-ai"
    ]
  }

  const navigationItems = [
    { label: 'Services', href: '#services' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Projects', href: '#projects' },
    { label: 'Contact', href: '#contact' },
  ]

  return (
    <>
      {/* Add structured data to head */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div data-theme="dark">
        <HeroSection />
        <ValueProposition />
        <WhatWeDo />
        <HowItWorks />
        <PilotProjects />
        <TechnicalExcellence />
        <CTASection />
        <ContactSection />
        <Footer />
      </div>
    </>
  )
}

export default HomePage
