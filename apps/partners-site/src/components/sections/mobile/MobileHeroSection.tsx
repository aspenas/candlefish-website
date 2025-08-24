'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@candlefish-ai/shared'
import { Users, Network, ArrowRight, CheckCircle, Menu, X } from 'lucide-react'
import { usePWA } from '@/components/providers/PWAProvider'

const stats = [
  { number: '500+', label: 'Certified Partners' },
  { number: '1,200+', label: 'Expert Operators' },
  { number: '150+', label: 'Countries' },
  { number: '99.8%', label: 'Success Rate' }
]

const benefits = [
  'Vetted professionals',
  'Real-time tracking', 
  'Performance matching',
  'Global 24/7 coverage'
]

export function MobileHeroSection() {
  const { isOnline, canInstall, installApp } = usePWA()
  const [showQuickActions, setShowQuickActions] = useState(false)

  const handleInstallPrompt = async () => {
    if (canInstall) {
      await installApp()
    }
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-warm-white via-muted-sand/30 to-deep-indigo/10">
      {/* Mobile-first layout - stacked vertically */}
      <div className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-20">
        
        {/* PWA Install Banner (Mobile Only) */}
        {canInstall && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg lg:hidden">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Get the mobile app
                </p>
                <p className="text-xs text-blue-700">
                  Quick access & offline features
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={handleInstallPrompt}
                className="ml-3 text-xs px-3 py-1.5"
              >
                Install
              </Button>
            </div>
          </div>
        )}

        {/* Network Status (Mobile Only) */}
        {!isOnline && (
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg lg:hidden">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <p className="text-xs font-medium text-yellow-800">
                Working offline - Some features limited
              </p>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          {/* Mobile Badge */}
          <div className="inline-flex items-center px-3 py-1.5 bg-deep-indigo/10 text-deep-indigo rounded-full text-xs font-medium mb-4 sm:text-sm sm:px-4 sm:py-2">
            <Network className="w-3 h-3 mr-1.5 sm:w-4 sm:h-4 sm:mr-2" />
            Trusted Partner Network
          </div>

          {/* Mobile-optimized headline - larger touch targets, shorter text */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-charcoal mb-4 leading-tight">
              Connect with
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-deep-indigo to-amber-flame block sm:inline">
                Expert Partners
              </span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed">
              Access certified Candlefish AI partners and operators. Find expertise for your project.
            </p>
          </div>

          {/* Mobile-optimized benefits - 2 column layout, shorter text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-6">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm sm:text-base text-slate-700 font-medium">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Mobile-first CTA buttons - full width on mobile */}
          <div className="flex flex-col gap-3 mb-8 sm:flex-row sm:gap-4">
            <Button size="lg" className="w-full sm:w-auto text-center" asChild>
              <Link href="/directory">
                Browse Partners
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-center" asChild>
              <Link href="/apply">
                <Users className="w-4 h-4 mr-2" />
                Become a Partner
              </Link>
            </Button>
          </div>

          {/* Quick Actions Menu (Mobile) */}
          <div className="mb-8 lg:hidden">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="flex items-center justify-between w-full p-3 bg-white border border-slate-200 rounded-lg shadow-sm"
            >
              <span className="text-sm font-medium text-slate-700">
                Quick Actions for Field Operators
              </span>
              {showQuickActions ? (
                <X className="w-4 h-4 text-slate-400" />
              ) : (
                <Menu className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showQuickActions && (
              <div className="mt-2 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <QuickAction
                  href="/network"
                  icon={<Users className="w-4 h-4" />}
                  title="View Network"
                  description="Available operators"
                />
                <QuickAction
                  href="/guides"
                  icon={<CheckCircle className="w-4 h-4" />}
                  title="Implementation Guides"
                  description="Field documentation"
                />
                <QuickAction
                  href="/stories"
                  icon={<Network className="w-4 h-4" />}
                  title="Success Stories"
                  description="Case studies"
                />
              </div>
            )}
          </div>

          {/* Mobile-optimized stats - 2x2 grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-8 lg:mb-0">
            {stats.map((stat, index) => (
              <div 
                key={stat.label}
                className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg p-3 sm:p-4 text-center"
              >
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-deep-indigo mb-1">
                  {stat.number}
                </div>
                <div className="text-xs sm:text-sm text-slate-600 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Trust indicators - hidden on mobile, simplified on tablet */}
          <div className="hidden sm:block mt-12 pt-8 border-t border-slate-200">
            <p className="text-center text-slate-500 font-medium mb-6 text-sm">
              Trusted worldwide
            </p>
            <div className="flex items-center justify-center space-x-8 opacity-60">
              {/* Simplified placeholder logos for mobile */}
              <div className="h-6 w-16 bg-slate-200 rounded sm:h-8 sm:w-24" />
              <div className="h-6 w-20 bg-slate-200 rounded sm:h-8 sm:w-32" />
              <div className="h-6 w-18 bg-slate-200 rounded sm:h-8 sm:w-28" />
              <div className="hidden md:block h-8 w-36 bg-slate-200 rounded" />
              <div className="hidden lg:block h-8 w-24 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

interface QuickActionProps {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}

function QuickAction({ href, icon, title, description }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="flex items-center p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-slate-100 last:border-b-0"
    >
      <div className="flex-shrink-0 text-blue-600 mr-3">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900">
          {title}
        </h3>
        <p className="text-xs text-gray-500">
          {description}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400 ml-2" />
    </Link>
  )
}