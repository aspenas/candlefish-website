import React, { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Navigation from '../components/Navigation'
import HeroSection from '../components/sections/HeroSection'
import ValueProposition from '../components/sections/ValueProposition'
import WhatWeDo from '../components/sections/WhatWeDo'
import HowItWorks from '../components/sections/HowItWorks'
import PilotProjects from '../components/sections/PilotProjects'
import TechnicalExcellence from '../components/sections/TechnicalExcellence'
import CTASection from '../components/sections/CTASection'
import ContactSection from '../components/sections/ContactSection'
import Footer from '../components/Footer'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

const HomePage: React.FC = () => {
  useEffect(() => {
    // Initialize GSAP animations after component mounts
    const initializeAnimations = () => {
      // Parallax effect for hero section
      gsap.utils.toArray('.parallax-layer').forEach((layer: Element) => {
        const speed = parseFloat((layer as HTMLElement).dataset.speed || '0.5')

        gsap.to(layer, {
          yPercent: -100 * speed,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero-section",
            start: "top top",
            end: "bottom top",
            scrub: true
          }
        })
      })

      // Animate elements on scroll
      const animateElements = document.querySelectorAll('[data-animate]')
      animateElements.forEach(el => {
        ScrollTrigger.create({
          trigger: el,
          start: "top 80%",
          onEnter: () => el.classList.add('animate')
        })
      })

      // Process steps animation
      const processSteps = document.querySelectorAll('.process-step')
      let currentStep = 0

      const stepInterval = setInterval(() => {
        processSteps.forEach(step => step.classList.remove('active'))
        currentStep = (currentStep + 1) % processSteps.length
        processSteps[currentStep]?.classList.add('active')
      }, 2000)

      return () => {
        clearInterval(stepInterval)
        ScrollTrigger.getAll().forEach((t: ScrollTrigger) => t.kill())
      }
    }

    // Wait for DOM to be fully loaded
    const timer = setTimeout(initializeAnimations, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  // Add structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Candlefish AI LLC",
    "description": "Enterprise AI consulting through discrete, composable modules",
    "url": "https://candlefish.ai",
    "logo": "https://candlefish.ai/logo/candlefish_original.png",
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

  return (
    <>
      {/* Add structured data to head */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="pt-24 lg:pt-0" data-theme="dark">
        <Navigation />
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
