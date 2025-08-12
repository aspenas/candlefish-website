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
    <section className={`relative min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 overflow-hidden ${className}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-primary-200/40 to-accent-200/40 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-accent-200/40 to-primary-200/40 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2" />
      </div>
      
      <div className="relative z-10 container mx-auto px-6 pt-32 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-2 mb-8 shadow-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700">
              Trusted by leading enterprises worldwide
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Transform Your Business with{' '}
            <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
              Enterprise AI
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            We help enterprises implement AI solutions that deliver measurable results. 
            From process automation to intelligent insights – we make AI work for your business.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button className="group bg-gradient-to-r from-primary-500 to-primary-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-2">
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button className="group bg-white/90 backdrop-blur-sm text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg border border-gray-200 hover:bg-white hover:shadow-lg transition-all duration-300 flex items-center gap-2">
              <Play className="w-5 h-5 text-primary-500" />
              Watch Demo
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-8 items-center opacity-80">
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

        {/* Hero Visual/Stats */}
        <div className="max-w-6xl mx-auto mt-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { stat: '99.9%', label: 'Uptime Guarantee', desc: 'Enterprise-grade reliability' },
              { stat: '10x', label: 'Faster Deployment', desc: 'Compared to traditional methods' },
              { stat: '500+', label: 'Active Clients', desc: 'Across 50+ countries' }
            ].map((item, index) => (
              <div key={index} className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="text-3xl font-bold text-gray-900 mb-2">{item.stat}</div>
                <div className="text-lg font-semibold text-gray-700 mb-1">{item.label}</div>
                <div className="text-sm text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
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