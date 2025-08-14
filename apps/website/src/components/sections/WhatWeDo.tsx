import React from 'react'

interface FeatureProps {
  icon: React.ReactNode
  title: string
  description: string
  delay?: number
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description, delay = 0 }) => {
  return (
    <div
      className={`animate-fade-in-up delay-${delay}`}
      style={{
        animationDelay: `${delay}ms`
      }}
    >
      <div className="w-20 h-20 mb-6 flex items-center justify-center card card-elevated hover-lift hover-glow relative overflow-hidden">
        {/* Rotating border effect */}
        <div className="absolute inset-0 bg-gradient-conic from-transparent via-teal-400 to-transparent opacity-0 transition-opacity duration-400 animate-spin animate-glow" style={{ animationDuration: '4s', background: `conic-gradient(from 0deg, transparent, var(--accent-primary), transparent)` }}></div>
        <div className="relative z-10" style={{color: 'var(--accent-primary)'}}>
          {icon}
        </div>
      </div>

      <h3 className="text-2xl mb-4 font-light text-reveal" style={{color: 'var(--text-primary)'}}>
        {title}
      </h3>

      <p className="text-body leading-relaxed" style={{color: 'var(--text-secondary)'}}>
        {description}
      </p>
    </div>
  )
}

const WhatWeDo: React.FC = () => {
  return (
    <section className="py-20 lg:py-32" id="what-we-do" style={{backgroundColor: 'var(--bg-secondary)'}}>
      <div className="container mx-auto px-6 max-w-screen-xl">
        <div className="text-center mb-16">
          <h2 className="mb-8 animate-fade-in-up" style={{color: 'var(--text-primary)'}}>What is Candlefish AI?</h2>
          <p className="text-xl max-w-4xl mx-auto leading-relaxed animate-fade-in-up delay-200" style={{color: 'var(--text-secondary)'}}>
            We make your business systems smarter and faster using AI. Think of us as translators
            between cutting-edge AI technology and your daily operations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          <div className="group">
            <Feature
              icon={
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                  <path d="M20 5L5 15v10l15 10 15-10V15L20 5z" stroke="currentColor" fill="none" strokeWidth="2"/>
                </svg>
              }
              title="Excel Automation"
              description="Transform manual spreadsheet workflows that take hours into automated AI systems that complete in minutes with zero errors."
              delay={100}
            />
          </div>

          <div className="group">
            <Feature
              icon={
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                  <circle cx="20" cy="20" r="15" stroke="currentColor" fill="none" strokeWidth="2"/>
                  <path d="M20 10v10l7 7" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              }
              title="System Integration"
              description="Connect your disconnected systems with intelligent AI bridges. No rip-and-replace, just smart connections that make everything work together."
              delay={200}
            />
          </div>

          <div className="group">
            <Feature
              icon={
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                  <rect x="10" y="10" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2"/>
                  <path d="M15 20l3 3 7-7" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              }
              title="AI Implementation"
              description="Production-ready AI solutions built with enterprise-grade AI platforms. We analyze years of data in seconds for truly intelligent implementations."
              delay={300}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default WhatWeDo
