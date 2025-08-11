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
        <section className="spine-section"><div className="spine-container"><HeroSection /></div></section>
        <section className="spine-section spine-rule"><div className="spine-container"><ValueProposition /></div></section>
        <section className="spine-section spine-rule" id="services"><div className="spine-container"><WhatWeDo /></div></section>
        <section className="spine-section spine-rule" id="how-it-works"><div className="spine-container"><HowItWorks /></div></section>
        <section className="spine-section spine-rule" id="projects"><div className="spine-container"><PilotProjects /></div></section>
        <section className="spine-section spine-rule"><div className="spine-container"><TechnicalExcellence /></div></section>
        <section className="spine-section spine-rule"><div className="spine-container"><CTASection /></div></section>
        <section className="spine-section spine-rule" id="contact"><div className="spine-container"><ContactSection /></div></section>
        <Footer />
      </div>
    </>
  )
}

export default HomePage
