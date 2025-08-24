import Link from 'next/link'
import { Button } from '@candlefish-ai/shared'
import { Users, Network, ArrowRight, CheckCircle } from 'lucide-react'

const stats = [
  { number: '500+', label: 'Certified Partners' },
  { number: '1,200+', label: 'Expert Operators' },
  { number: '150+', label: 'Countries' },
  { number: '99.8%', label: 'Success Rate' }
]

const benefits = [
  'Vetted and certified professionals',
  'Real-time availability tracking',
  'Performance-based matching',
  'Global 24/7 coverage'
]

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-warm-white via-muted-sand/30 to-deep-indigo/10 py-20 lg:py-32">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-32 h-32 bg-deep-indigo/20 rounded-full blur-xl" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-amber-flame/20 rounded-full blur-2xl" />
        <div className="absolute bottom-20 left-1/3 w-64 h-64 bg-deep-indigo/10 rounded-full blur-3xl" />
      </div>

      <div className="partners-container relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-deep-indigo/10 text-deep-indigo rounded-full text-sm font-medium">
              <Network className="w-4 h-4 mr-2" />
              Trusted Partner Network
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-charcoal mb-6">
                Connect with
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-deep-indigo to-amber-flame">
                  {' '}Expert Partners
                </span>
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed">
                Access our global network of certified Candlefish AI partners and operators. 
                From implementation to optimization, find the perfect expertise for your project.
              </p>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-slate-700 font-medium">{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Button size="xl" asChild>
                <Link href="/directory">
                  Browse Partners
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link href="/apply">
                  <Users className="w-5 h-5 mr-2" />
                  Become a Partner
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6">
            {stats.map((stat, index) => (
              <div 
                key={stat.label}
                className={`metrics-card ${index === 1 || index === 2 ? 'mt-8' : ''}`}
              >
                <div className="metrics-number">{stat.number}</div>
                <div className="metrics-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-20 pt-16 border-t border-slate-200">
          <p className="text-center text-slate-500 font-medium mb-8">
            Trusted by leading organizations worldwide
          </p>
          <div className="flex items-center justify-center space-x-12 opacity-60">
            {/* Placeholder for client logos */}
            <div className="h-8 w-24 bg-slate-200 rounded" />
            <div className="h-8 w-32 bg-slate-200 rounded" />
            <div className="h-8 w-28 bg-slate-200 rounded" />
            <div className="h-8 w-36 bg-slate-200 rounded" />
            <div className="h-8 w-24 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    </section>
  )
}