import * as React from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Search, Menu, X, User } from 'lucide-react'

interface NavigationProps {
  siteTitle: string
  siteType: 'docs' | 'partners' | 'api'
  searchEnabled?: boolean
  currentPath?: string
  user?: {
    name: string
    avatar?: string
  }
  onSearch?: (query: string) => void
}

const siteConfigs = {
  docs: {
    links: [
      { href: '/getting-started', label: 'Getting Started' },
      { href: '/guides', label: 'Guides' },
      { href: '/reference', label: 'Reference' },
      { href: '/examples', label: 'Examples' },
    ],
    primaryColor: 'from-amber-400 to-amber-500'
  },
  partners: {
    links: [
      { href: '/directory', label: 'Partner Directory' },
      { href: '/network', label: 'Operator Network' },
      { href: '/resources', label: 'Resources' },
      { href: '/apply', label: 'Become a Partner' },
    ],
    primaryColor: 'from-indigo-500 to-indigo-600'
  },
  api: {
    links: [
      { href: '/overview', label: 'Overview' },
      { href: '/authentication', label: 'Authentication' },
      { href: '/endpoints', label: 'Endpoints' },
      { href: '/examples', label: 'Examples' },
    ],
    primaryColor: 'from-emerald-500 to-emerald-600'
  }
}

export function Navigation({
  siteTitle,
  siteType,
  searchEnabled = true,
  currentPath = '',
  user,
  onSearch
}: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const config = siteConfigs[siteType]
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim())
    }
  }

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200'
          : 'bg-transparent'
      )}
    >
      <div className="container mx-auto px-6">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-3 text-charcoal hover:text-amber-600 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm" />
              </div>
              <span className="font-bold text-lg">{siteTitle}</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {config.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors relative',
                  currentPath.startsWith(link.href)
                    ? 'text-amber-600'
                    : 'text-slate-600 hover:text-charcoal'
                )}
              >
                {link.label}
                {currentPath.startsWith(link.href) && (
                  <div className="absolute -bottom-6 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" />
                )}
              </Link>
            ))}
          </div>

          {/* Search & User */}
          <div className="flex items-center space-x-4">
            {searchEnabled && (
              <form onSubmit={handleSearch} className="hidden sm:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-64 rounded-lg border border-slate-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  />
                </div>
              </form>
            )}
            
            {user ? (
              <div className="flex items-center space-x-2">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                )}
                <span className="text-sm font-medium text-slate-700 hidden sm:inline">
                  {user.name}
                </span>
              </div>
            ) : (
              <Button variant="secondary" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-charcoal transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200">
            <div className="py-4 space-y-4">
              {searchEnabled && (
                <form onSubmit={handleSearch} className="px-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                    />
                  </div>
                </form>
              )}
              
              <div className="space-y-2 px-4">
                {config.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'block py-2 text-sm font-medium transition-colors',
                      currentPath.startsWith(link.href)
                        ? 'text-amber-600'
                        : 'text-slate-600 hover:text-charcoal'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}