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
    <div className="group relative bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 hover:bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
      {/* Icon */}
      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6 text-white" />
      </div>

      {/* Content */}
      <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-primary-600 transition-colors">
        {title}
      </h3>
      
      <p className="text-gray-600 mb-6 leading-relaxed">
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

      {/* Subtle Gradient Border on Hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/20 to-accent-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
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
    <section className={`py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden ${className}`}>
      {/* Background Elements */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-gradient-to-br from-primary-100/40 to-accent-100/40 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-gradient-to-tl from-accent-100/40 to-primary-100/40 rounded-full blur-3xl" />
      
      <div className="relative z-10 container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary-100/50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Enterprise AI Solutions
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
              accelerate
            </span>{' '}
            with AI
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            From intelligent automation to predictive analytics, our comprehensive AI platform 
            helps enterprises unlock new levels of efficiency and innovation.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Feature key={index} {...feature} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <button className="group bg-gradient-to-r from-primary-500 to-primary-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-2 mx-auto">
            Explore All Features
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  )
}

export default FeaturesGrid