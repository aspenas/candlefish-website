import React from 'react'
import { 
  ArrowRight, 
  TrendingUp, 
  Clock, 
  DollarSign,
  Building2,
  Plane,
  ShoppingCart,
  Heart
} from 'lucide-react'

interface CaseStudyProps {
  id: string
  company: string
  industry: string
  logo: React.ElementType
  challenge: string
  solution: string
  results: {
    metric: string
    value: string
    description: string
  }[]
  image: string
  testimonial?: {
    quote: string
    author: string
    role: string
  }
}

interface CaseStudiesSectionProps {
  className?: string
}

const CaseStudyCard: React.FC<{ caseStudy: CaseStudyProps; featured?: boolean }> = ({ 
  caseStudy, 
  featured = false 
}) => {
  const Logo = caseStudy.logo

  return (
    <div className={`group relative bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 ${
      featured ? 'lg:col-span-2' : ''
    }`}>
      {/* Image/Visual */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-accent-500/10" />
        <div className="absolute top-6 left-6 w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
          <Logo className="w-6 h-6 text-gray-700" />
        </div>
        <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-600">
          {caseStudy.industry}
        </div>
      </div>

      <div className="p-6">
        {/* Company */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
            {caseStudy.company}
          </h3>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-5 h-5 text-primary-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Challenge & Solution */}
        <div className="space-y-4 mb-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Challenge</h4>
            <p className="text-gray-600 text-sm leading-relaxed">{caseStudy.challenge}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Solution</h4>
            <p className="text-gray-600 text-sm leading-relaxed">{caseStudy.solution}</p>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {caseStudy.results.slice(0, 2).map((result, index) => (
            <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-600 mb-1">{result.value}</div>
              <div className="text-xs text-gray-600">{result.description}</div>
            </div>
          ))}
        </div>

        {/* Testimonial (if featured) */}
        {featured && caseStudy.testimonial && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-gray-700 text-sm italic mb-2">
              "{caseStudy.testimonial.quote}"
            </p>
            <div className="text-xs text-gray-500">
              <span className="font-medium">{caseStudy.testimonial.author}</span>, {caseStudy.testimonial.role}
            </div>
          </div>
        )}

        {/* CTA */}
        <button className="w-full bg-gray-100 hover:bg-primary-50 text-gray-700 hover:text-primary-700 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 group">
          Read Full Case Study
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}

const CaseStudiesSection: React.FC<CaseStudiesSectionProps> = ({ className = '' }) => {
  const caseStudies: CaseStudyProps[] = [
    {
      id: 'manufacturing',
      company: 'GlobalTech Manufacturing',
      industry: 'Manufacturing',
      logo: Building2,
      challenge: 'Manual quality control processes were causing delays and inconsistent product quality across multiple production lines.',
      solution: 'Implemented computer vision AI for automated quality inspection and predictive maintenance scheduling.',
      results: [
        { metric: 'Quality Improvements', value: '95%', description: 'Defect reduction' },
        { metric: 'Efficiency Gains', value: '60%', description: 'Faster inspection' },
        { metric: 'Cost Savings', value: '$2.3M', description: 'Annual savings' }
      ],
      image: '/case-studies/manufacturing.jpg',
      testimonial: {
        quote: 'Candlefish AI transformed our quality control process. We went from reactive to predictive, saving millions in potential recalls.',
        author: 'Sarah Chen',
        role: 'VP of Operations'
      }
    },
    {
      id: 'logistics',
      company: 'AeroLogistics',
      industry: 'Transportation',
      logo: Plane,
      challenge: 'Complex route optimization and inventory management across global supply chain networks.',
      solution: 'Deployed AI-powered logistics optimization platform with real-time tracking and dynamic route planning.',
      results: [
        { metric: 'Route Efficiency', value: '40%', description: 'Optimization improvement' },
        { metric: 'Delivery Speed', value: '3x', description: 'Faster deliveries' }
      ],
      image: '/case-studies/logistics.jpg'
    },
    {
      id: 'retail',
      company: 'MegaRetail Corp',
      industry: 'E-commerce',
      logo: ShoppingCart,
      challenge: 'Personalization at scale for millions of customers while maintaining inventory efficiency.',
      solution: 'Built recommendation engine and demand forecasting system using machine learning algorithms.',
      results: [
        { metric: 'Revenue Growth', value: '35%', description: 'Increase in sales' },
        { metric: 'Customer Engagement', value: '2.5x', description: 'Higher retention' }
      ],
      image: '/case-studies/retail.jpg'
    },
    {
      id: 'healthcare',
      company: 'MedTech Solutions',
      industry: 'Healthcare',
      logo: Heart,
      challenge: 'Need for faster and more accurate diagnostic support for medical professionals.',
      solution: 'Developed AI-assisted diagnostic tools for medical imaging and patient data analysis.',
      results: [
        { metric: 'Diagnostic Accuracy', value: '98%', description: 'Accuracy rate' },
        { metric: 'Time Savings', value: '70%', description: 'Faster diagnosis' }
      ],
      image: '/case-studies/healthcare.jpg'
    }
  ]

  const featuredCaseStudy = caseStudies[0]
  const regularCaseStudies = caseStudies.slice(1)

  return (
    <section className={`py-20 bg-white relative overflow-hidden ${className}`}>
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-accent-100/50 text-accent-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <TrendingUp className="w-4 h-4" />
            Customer Success Stories
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Real Results from{' '}
            <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
              Real Companies
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            See how leading enterprises are transforming their operations and 
            achieving breakthrough results with our AI solutions.
          </p>
        </div>

        {/* Case Studies Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Featured Case Study */}
          <CaseStudyCard caseStudy={featuredCaseStudy} featured={true} />
          
          {/* Regular Case Studies */}
          {regularCaseStudies.map((caseStudy) => (
            <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
          ))}
        </div>

        {/* Stats Bar */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Building2, stat: '500+', label: 'Enterprise Clients' },
              { icon: TrendingUp, stat: '95%', label: 'Success Rate' },
              { icon: DollarSign, stat: '$50M+', label: 'Client Savings' },
              { icon: Clock, stat: '4 weeks', label: 'Avg. Implementation' }
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{item.stat}</div>
                  <div className="text-sm text-gray-600">{item.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <button className="group bg-gradient-to-r from-primary-500 to-primary-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-2 mx-auto">
            View All Case Studies
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  )
}

export default CaseStudiesSection