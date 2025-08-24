'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Users, BookOpen, Trophy, Menu, X, Settings, Bell } from 'lucide-react'
import { usePWA } from '@/components/providers/PWAProvider'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Network', href: '/network', icon: Users },
  { name: 'Guides', href: '/guides', icon: BookOpen },
  { name: 'Stories', href: '/stories', icon: Trophy }
]

interface MobileLayoutProps {
  children: React.ReactNode
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const pathname = usePathname()
  const { isOnline, canInstall, installApp } = usePWA()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-700" />
              ) : (
                <Menu className="w-5 h-5 text-gray-700" />
              )}
            </button>
            <div className="text-lg font-bold text-gray-900">
              Candlefish Partners
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Network status indicator */}
            <div className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-green-400' : 'bg-yellow-400'
            }`} />
            
            {/* Notifications (when online) */}
            {isOnline && (
              <button className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors">
                <Bell className="w-5 h-5 text-gray-700" />
              </button>
            )}
          </div>
        </div>

        {/* PWA Install Banner */}
        {canInstall && (
          <div className="px-4 pb-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Install for offline access
                </p>
                <p className="text-xs text-blue-700">
                  Work without internet connection
                </p>
              </div>
              <button
                onClick={installApp}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
              >
                Install
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-64 bg-white shadow-xl">
            <MobileMenu />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="sticky bottom-0 bg-white border-t border-gray-200 lg:hidden">
        <div className="grid grid-cols-4 gap-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 px-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 active:bg-gray-100'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={isActive ? 'text-blue-600' : 'text-gray-600'}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function MobileMenu() {
  const pathname = usePathname()
  const { isOnline, isInstalled } = usePWA()

  return (
    <div className="flex flex-col h-full">
      {/* Menu Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Partner Portal
        </h2>
        <p className="text-sm text-gray-600 flex items-center gap-2">
          {isInstalled && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">PWA</span>}
          {isOnline ? 'Online' : 'Offline Mode'}
        </p>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4">
        <nav className="space-y-1 px-4">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Offline-specific links */}
        {!isOnline && (
          <div className="mt-6 px-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Offline Available
            </h3>
            <div className="space-y-1">
              <Link
                href="/guides"
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <BookOpen className="w-4 h-4 text-gray-400" />
                Implementation Guides
              </Link>
              <Link
                href="/stories"
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Trophy className="w-4 h-4 text-gray-400" />
                Success Stories
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Menu Footer */}
      <div className="p-4 border-t border-gray-200">
        <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
          <Settings className="w-4 h-4 text-gray-400" />
          Settings
        </button>
      </div>
    </div>
  )
}