'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import PaintboxLogo from '@/components/ui/PaintboxLogo'
import { UserProfile } from '@/components/auth/UserProfile'
import { Home, Calculator, FileText, Settings, Menu, X } from 'lucide-react'
import { useState } from 'react'

interface AppHeaderProps {
  variant?: 'default' | 'minimal' | 'landing'
  showNavigation?: boolean
  className?: string
}

const navigationItems = [
  { href: '/estimate/new', label: 'New Estimate', icon: Calculator },
  { href: '/estimate', label: 'Estimates', icon: FileText },
  { href: '/admin', label: 'Admin', icon: Settings, adminOnly: true },
]

export function AppHeader({
  variant = 'default',
  showNavigation = true,
  className = ''
}: AppHeaderProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Don't show header on login page
  if (pathname === '/login') return null

  const isActiveRoute = (href: string) => {
    if (href === '/estimate' && pathname.startsWith('/estimate')) return true
    return pathname === href
  }

  return (
    <header className={`
      bg-white border-b border-gray-200 sticky top-0 z-40
      ${className}
    `}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
            <PaintboxLogo size="desktop" />
          </Link>

          {/* Desktop Navigation */}
          {showNavigation && variant !== 'minimal' && (
            <nav className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = isActiveRoute(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                      transition-colors duration-200
                      ${isActive
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          )}

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Quick Actions (visible on larger screens) */}
            {variant === 'default' && (
              <div className="hidden lg:flex items-center space-x-3">
                <Link
                  href="/estimate/new"
                  className="
                    paintbox-btn paintbox-btn-primary text-sm
                    px-4 py-2 h-9
                  "
                >
                  <Calculator className="w-4 h-4" />
                  New Estimate
                </Link>
              </div>
            )}

            {/* User Profile */}
            <UserProfile variant={variant === 'minimal' ? 'minimal' : 'full'} />

            {/* Mobile Menu Button */}
            {showNavigation && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {showNavigation && isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = isActiveRoute(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                    transition-colors duration-200
                    ${isActive
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}

            {/* Mobile Quick Actions */}
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <Link
                href="/estimate/new"
                onClick={() => setIsMobileMenuOpen(false)}
                className="
                  flex items-center justify-center gap-2
                  w-full paintbox-btn paintbox-btn-primary
                "
              >
                <Calculator className="w-4 h-4" />
                New Estimate
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar (for estimate flow) */}
      {pathname.startsWith('/estimate/new') && (
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: getProgressPercentage(pathname) }}
          />
        </div>
      )}
    </header>
  )
}

// Helper function to calculate progress in estimate flow
function getProgressPercentage(pathname: string): string {
  const steps = [
    '/estimate/new',
    '/estimate/new/details',
    '/estimate/new/exterior',
    '/estimate/new/interior',
    '/estimate/new/review'
  ]

  const currentStep = steps.findIndex(step => pathname === step)
  if (currentStep === -1) return '0%'

  return `${((currentStep + 1) / steps.length) * 100}%`
}
