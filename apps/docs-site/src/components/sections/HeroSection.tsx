import Link from 'next/link'
import { Button } from '@candlefish-ai/shared'
import { ArrowRight, Search, BookOpen, Code2 } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-warm-white to-muted-sand py-20 lg:py-32">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-32 h-32 bg-amber-flame/10 rounded-full blur-xl" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-deep-indigo/10 rounded-full blur-2xl" />
        <div className="absolute bottom-20 left-1/3 w-24 h-24 bg-amber-flame/20 rounded-full blur-lg" />
      </div>

      <div className="docs-container relative">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-medium mb-8">
            <BookOpen className="w-4 h-4 mr-2" />
            Comprehensive Documentation
          </div>

          {/* Headline */}
          <h1 className="text-5xl lg:text-7xl font-bold text-charcoal mb-8">
            Build with
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
              {' '}Operational Craft
            </span>
          </h1>

          <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Everything you need to integrate with Candlefish AI. From quick starts to advanced guides, 
            learn to build systems that outlive their creators.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button size="xl" asChild>
              <Link href="/getting-started">
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button variant="secondary" size="xl" asChild>
              <Link href="/api">
                <Code2 className="w-5 h-5 mr-2" />
                API Reference
              </Link>
            </Button>
          </div>

          {/* Quick Search */}
          <div className="relative max-w-md mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search documentation..."
              className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <kbd className="inline-flex items-center px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 rounded">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-20 max-w-3xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-charcoal mb-2">150+</div>
            <div className="text-sm text-slate-600">API Endpoints</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-charcoal mb-2">50+</div>
            <div className="text-sm text-slate-600">Code Examples</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-charcoal mb-2">12</div>
            <div className="text-sm text-slate-600">SDKs</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-charcoal mb-2">99.9%</div>
            <div className="text-sm text-slate-600">Uptime</div>
          </div>
        </div>
      </div>
    </section>
  )
}