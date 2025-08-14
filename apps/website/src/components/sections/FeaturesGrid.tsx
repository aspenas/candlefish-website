import React from 'react'
import {
  Brain,
  Zap,
  Shield,
  BarChart3,
  Cpu,
  Globe,
  ArrowRight
} from 'lucide-react'

interface FeatureProps {
  icon: React.ElementType
  title: string
  description: string
  benefits: string[]
}

interface FeaturesGridProps {
  className?: string
}

const Feature: React.FC<FeatureProps> = ({ icon: Icon, title, description, benefits }) => {
  return (
    <div className="professional-feature-card group">
      {/* Icon */}
      <div className="professional-feature-icon">
        <Icon className="w-6 h-6" />
      </div>

      {/* Content */}
      <h3 className="professional-feature-title">
        {title}
      </h3>

      <p className="professional-feature-description">
        {description}
      </p>

      {/* Benefits */}
      <ul className="space-y-2 mb-6">
        {benefits.map((benefit, index) => (
          <li key={index} className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-accent-500 rounded-full mt-2 flex-shrink-0" />
            <span className="text-sm text-gray-600">{benefit}</span>
          </li>
        ))}
      </ul>

      {/* Hover Effect Arrow */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-2 text-primary-600 font-medium">
          <span className="text-sm">Learn more</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  )
}

const FeaturesGrid: React.FC<FeaturesGridProps> = ({ className = '' }) => {
  const features: FeatureProps[] = [
    {
      icon: Brain,
      title: 'Intelligent Automation',
      description: 'Transform complex business processes with AI-powered automation that learns and adapts to your workflows.',
      benefits: [
        'Reduce manual work by 80%',
        'Self-improving algorithms',
        'Seamless integration with existing systems'
      ]
    },
    {
      icon: BarChart3,
      title: 'Predictive Analytics',
      description: 'Unlock actionable insights from your data with advanced machine learning models and real-time analytics.',
      benefits: [
        'Real-time decision making',
        'Custom dashboards and reports',
        'Predictive forecasting capabilities'
      ]
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level security with end-to-end encryption, compliance frameworks, and privacy-by-design architecture.',
      benefits: [
        'SOC 2 Type II certified',
        'GDPR and CCPA compliant',
        'Zero-trust security model'
      ]
    },
    {
      icon: Zap,
      title: 'Rapid Deployment',
      description: 'Get up and running in weeks, not months, with our proven implementation methodology and expert support.',
      benefits: [
        'Average 4-week implementation',
        'Dedicated success manager',
        '24/7 technical support'
      ]
    },
    {
      icon: Cpu,
      title: 'Custom AI Models',
      description: 'Purpose-built AI solutions tailored to your industry, use case, and business objectives.',
      benefits: [
        'Industry-specific training',
        'Continuous model optimization',
        'Custom API development'
      ]
    },
    {
      icon: Globe,
      title: 'Global Scale',
      description: 'Enterprise-grade infrastructure that scales with your business across regions and time zones.',
      benefits: [
        '99.9% uptime SLA',
        'Multi-region deployment',
        'Auto-scaling capabilities'
      ]
    }
  ]

  return (
    <section className={`professional-features ${className}`}>
      <div className="professional-features-container">
        {/* Section Header */}
        <div className="professional-features-header">
          <div className="professional-hero-badge">
            <Zap className="w-4 h-4" />
            <span>Enterprise AI Solutions</span>
          </div>

          <h2 className="professional-features-title">
            Everything you need to{' '}
            <span className="text-gradient">accelerate</span>{' '}
            with AI
          </h2>

          <p className="professional-features-subtitle">
            From intelligent automation to predictive analytics, our comprehensive AI platform
            helps enterprises unlock new levels of efficiency and innovation.
          </p>
        </div>

        {/* Features Grid */}
        <div className="professional-features-grid">
          {features.map((feature, index) => (
            <Feature key={index} {...feature} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <button className="professional-btn professional-btn-primary professional-btn-large">
            Explore All Features
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  )
}

export default FeaturesGrid
