import React, { useState } from 'react'
import {
  ArrowRight,
  CheckCircle,
  Calendar,
  MessageSquare,
  Rocket,
  Shield,
  Clock,
  TrendingUp
} from 'lucide-react'

interface CTASectionProps {
  className?: string
  variant?: 'primary' | 'secondary' | 'contact'
  title?: string
  subtitle?: string
  primaryAction?: {
    text: string
    onClick?: () => void
  }
  secondaryAction?: {
    text: string
    onClick?: () => void
  }
}

const CTASection: React.FC<CTASectionProps> = ({
  className = '',
  variant = 'primary',
  title,
  subtitle,
  primaryAction,
  secondaryAction
}) => {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Here you would integrate with your API
    console.log('Email submitted:', email)
    setEmail('')
    setIsSubmitting(false)
  }

  const benefits = [
    { icon: Clock, text: '4-week implementation guarantee' },
    { icon: Shield, text: 'Enterprise-grade security' },
    { icon: TrendingUp, text: 'Proven ROI within 6 months' },
    { icon: MessageSquare, text: '24/7 dedicated support' }
  ]

  if (variant === 'contact') {
    return (
      <section className={`py-20 bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden ${className}`}>
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-300 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {title || "Ready to Transform Your Business?"}
            </h2>

            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              {subtitle || "Join 500+ companies already using AI to drive growth and efficiency. Start your transformation today."}
            </p>

            {/* Contact Form */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-8">
              <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your work email"
                  className="flex-1 px-4 py-3 rounded-lg border-0 bg-white/90 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-400"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-accent-500 hover:bg-accent-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
              <p className="text-primary-200 text-sm mt-3">
                No credit card required. 14-day free trial.
              </p>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon
                return (
                  <div key={index} className="flex items-center gap-3 text-primary-100">
                    <Icon className="w-5 h-5 text-accent-300 flex-shrink-0" />
                    <span className="text-sm">{benefit.text}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (variant === 'secondary') {
    return (
      <section className={`professional-cta ${className}`}>
        <div className="professional-cta-container">
          <div className="professional-hero-badge">
            <Rocket className="w-4 h-4" />
            <span>Ready to Get Started?</span>
          </div>

          <h2 className="professional-cta-title">
            {title || "See Why Industry Leaders Choose Candlefish AI"}
          </h2>

          <p className="professional-cta-subtitle">
            {subtitle || "Schedule a personalized demo and discover how AI can transform your business operations."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={primaryAction?.onClick}
              className="professional-btn professional-btn-primary professional-btn-large"
            >
              <Calendar className="w-5 h-5" />
              {primaryAction?.text || 'Schedule Demo'}
            </button>

            <button
              onClick={secondaryAction?.onClick}
              className="professional-btn professional-btn-secondary professional-btn-large"
            >
              {secondaryAction?.text || 'Contact Sales'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>
    )
  }

  // Primary variant (default)
  return (
    <section className={`py-20 bg-gradient-to-r from-primary-500 via-primary-600 to-accent-500 relative overflow-hidden ${className}`}>
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full opacity-20 animate-pulse"
              style={{
                width: Math.random() * 100 + 50,
                height: Math.random() * 100 + 50,
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animationDelay: Math.random() * 2 + 's'
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {title || (
              <>
                Ready to{' '}
                <span className="text-accent-200">10x</span>{' '}
                Your Business Efficiency?
              </>
            )}
          </h2>

          <p className="text-xl text-primary-100 mb-8 max-w-3xl mx-auto">
            {subtitle || "Join the AI revolution. Transform your operations, delight your customers, and drive unprecedented growth with enterprise AI solutions."}
          </p>

          {/* Main CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={primaryAction?.onClick}
              className="group bg-white text-primary-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              {primaryAction?.text || 'Start Free Trial'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={secondaryAction?.onClick}
              className="group bg-primary-700 text-white px-8 py-4 rounded-xl font-semibold text-lg border-2 border-primary-400 hover:bg-primary-800 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              {secondaryAction?.text || 'Book Demo'}
            </button>
          </div>

          {/* Value Props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: CheckCircle,
                title: 'No Risk',
                description: '30-day money-back guarantee'
              },
              {
                icon: Rocket,
                title: 'Fast Setup',
                description: 'Live in 4 weeks or less'
              },
              {
                icon: Shield,
                title: 'Enterprise Ready',
                description: 'SOC 2 compliant & secure'
              }
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-primary-200 text-sm">{item.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default CTASection
