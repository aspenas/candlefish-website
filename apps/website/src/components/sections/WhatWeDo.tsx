import React from 'react'

interface FeatureProps {
  icon: React.ReactNode
  title: string
  description: string
  delay?: number
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description }) => {
  return (
    <div className="feature">
      <div className="feature__icon w-20 h-20 mb-6 flex items-center justify-center bg-gray-800 border border-gray-700 relative overflow-hidden transition-all duration-400 ease-out group-hover:-translate-y-2 group-hover:shadow-lg group-hover:shadow-teal-400/20">
        {/* Rotating border effect */}
        <div className="absolute inset-0 bg-gradient-conic from-transparent via-teal-400 to-transparent opacity-0 transition-opacity duration-400 animate-spin" style={{ animationDuration: '4s' }}></div>
        <div className="relative z-10">
          {icon}
        </div>
      </div>

      <h3 className="text-2xl mb-4 font-light">
        {title}
      </h3>

      <p className="text-gray-400 leading-relaxed">
        {description}
      </p>
    </div>
  )
}

const WhatWeDo: React.FC = () => {
  return (
    <section className="py-20 lg:py-32 bg-gray-900 border-t border-gray-800" id="services">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl">
        <div className="text-center mb-16">
          <h2 className="mb-8">What is Candlefish AI?</h2>
          <p className="text-xl text-gray-400 max-w-4xl mx-auto leading-relaxed">
            We make your business systems smarter and faster using AI. Think of us as translators
            between cutting-edge AI technology and your daily operations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          <div className="group">
            <Feature
              icon={
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor" className="text-teal-400">
                  <path d="M20 5L5 15v10l15 10 15-10V15L20 5z" stroke="currentColor" fill="none" strokeWidth="2"/>
                </svg>
              }
              title="Excel Automation"
              description="Transform manual spreadsheet workflows that take hours into automated AI systems that complete in minutes with zero errors."
            />
          </div>

          <div className="group">
            <Feature
              icon={
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor" className="text-teal-400">
                  <circle cx="20" cy="20" r="15" stroke="currentColor" fill="none" strokeWidth="2"/>
                  <path d="M20 10v10l7 7" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              }
              title="System Integration"
              description="Connect your disconnected systems with intelligent AI bridges. No rip-and-replace, just smart connections that make everything work together."
            />
          </div>

          <div className="group">
            <Feature
              icon={
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor" className="text-teal-400">
                  <rect x="10" y="10" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2"/>
                  <path d="M15 20l3 3 7-7" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              }
              title="AI Implementation"
              description="Production-ready AI solutions built with enterprise-grade AI platforms. We analyze years of data in seconds for truly intelligent implementations."
            />
          </div>
        </div>
      </div>

    </section>
  )
}

export default WhatWeDo
