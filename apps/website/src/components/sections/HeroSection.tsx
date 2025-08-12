import React from 'react'
import { ArrowRight, Play, CheckCircle, Users, Zap, Globe } from 'lucide-react'

interface HeroSectionProps {
  className?: string
}

const HeroSection: React.FC<HeroSectionProps> = ({ className = '' }) => {
  const trustBadges = [
    { icon: Users, label: '500+ Companies' },
    { icon: Zap, label: '10x Faster Implementation' },
    { icon: Globe, label: 'Global Scale' }
  ]

  return (
    <section className={`professional-hero ${className}`}>
      <div className="professional-hero-container">
        {/* Trust Badge */}
        <div className="professional-hero-badge">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>Trusted by leading enterprises worldwide</span>
        </div>

        {/* Main Headline */}
        <h1 className="professional-hero-title">
          Transform Your Business with{' '}
          <span className="text-gradient">Enterprise AI</span>
        </h1>

        {/* Subtitle */}
        <p className="professional-hero-subtitle">
          We help enterprises implement AI solutions that deliver measurable results.
          From process automation to intelligent insights – we make AI work for your business.
        </p>

        {/* CTA Buttons */}
        <div className="professional-hero-cta">
          <button className="professional-btn professional-btn-primary professional-btn-large">
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </button>

          <button className="professional-btn professional-btn-secondary professional-btn-large">
            <Play className="w-5 h-5" />
            Watch Demo
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center gap-8 items-center opacity-80 mt-12">
          {trustBadges.map((badge, index) => {
            const Icon = badge.icon
            return (
              <div key={index} className="flex items-center gap-2 text-gray-600">
                <Icon className="w-5 h-5 text-primary-500" />
                <span className="font-medium">{badge.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Hero Stats */}
      <div className="max-w-6xl mx-auto mt-20 px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { stat: '99.9%', label: 'Uptime Guarantee', desc: 'Enterprise-grade reliability' },
            { stat: '10x', label: 'Faster Deployment', desc: 'Compared to traditional methods' },
            { stat: '500+', label: 'Active Clients', desc: 'Across 50+ countries' }
          ].map((item, index) => (
            <div key={index} className="stat-card">
              <div className="stat-number">{item.stat}</div>
              <div className="text-lg font-semibold text-gray-700 mb-1">{item.label}</div>
              <div className="text-sm text-gray-500">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-gray-400 rounded-full mt-2" />
        </div>
      </div>
    </section>
  )
}

export default HeroSection
