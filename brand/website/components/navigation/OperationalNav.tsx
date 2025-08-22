'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useFocusManagement } from '../../hooks/useAccessibility'

// Real-time capacity check
const getSystemCapacity = () => {
  return {
    available: false,
    nextWindow: 'December 2025',
    queueLength: 7,
    maxQueue: 50
  }
}

const Navigation: React.FC = () => {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const currentCapacity = getSystemCapacity()
  const { trapFocus } = useFocusManagement()
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleEscape)
      if (mobileMenuRef.current) {
        const cleanup = trapFocus(mobileMenuRef.current)
        return () => {
          document.removeEventListener('keydown', handleEscape)
          cleanup?.()
        }
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [mobileMenuOpen, trapFocus])

  return (
    <nav
      id="navigation"
      role="navigation"
      aria-label="Main navigation"
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#0D1B2A]/95 backdrop-blur-sm border-b border-[#1B263B]' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-2xl font-light text-[#F8F8F2] tracking-tight">
            candlefish<span className="text-[#3FD3C6]">.</span>ai
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8" role="menubar">
            <Link
              href="/instruments"
              role="menuitem"
              aria-current={pathname === '/instruments' ? 'page' : undefined}
              className={`text-sm font-light transition-colors focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] rounded-sm px-2 py-1 ${
                pathname === '/instruments' ? 'text-[#3FD3C6]' : 'text-[#E0E1DD] hover:text-[#3FD3C6]'
              }`}
            >
              Instruments
            </Link>
            <Link
              href="/workshop"
              role="menuitem"
              aria-current={pathname === '/workshop' ? 'page' : undefined}
              className={`text-sm font-light transition-colors focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] rounded-sm px-2 py-1 ${
                pathname === '/workshop' ? 'text-[#3FD3C6]' : 'text-[#E0E1DD] hover:text-[#3FD3C6]'
              }`}
            >
              Workshop
            </Link>
            <Link
              href="/maturity-map"
              role="menuitem"
              aria-current={pathname === '/maturity-map' || pathname === '/assessment' ? 'page' : undefined}
              className={`text-sm font-light transition-colors focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] rounded-sm px-2 py-1 ${
                pathname === '/maturity-map' || pathname === '/assessment' ? 'text-[#3FD3C6]' : 'text-[#E0E1DD] hover:text-[#3FD3C6]'
              }`}
            >
              Assessment
            </Link>
            <Link
              href="/manifesto"
              role="menuitem"
              aria-current={pathname === '/manifesto' ? 'page' : undefined}
              className={`text-sm font-light transition-colors focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] rounded-sm px-2 py-1 ${
                pathname === '/manifesto' ? 'text-[#3FD3C6]' : 'text-[#E0E1DD] hover:text-[#3FD3C6]'
              }`}
            >
              Manifesto
            </Link>
            <Link
              href="/workshop-notes"
              role="menuitem"
              aria-current={pathname === '/workshop-notes' ? 'page' : undefined}
              className={`text-sm font-light transition-colors focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] rounded-sm px-2 py-1 ${
                pathname === '/workshop-notes' ? 'text-[#3FD3C6]' : 'text-[#E0E1DD] hover:text-[#3FD3C6]'
              }`}
            >
              Notes
            </Link>
            <Link
              href="/archive"
              role="menuitem"
              aria-current={pathname === '/archive' ? 'page' : undefined}
              className={`text-sm font-light transition-colors focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] rounded-sm px-2 py-1 ${
                pathname === '/archive' ? 'text-[#3FD3C6]' : 'text-[#E0E1DD] hover:text-[#3FD3C6]'
              }`}
            >
              Archive
            </Link>
          </div>

          {/* Status-based CTA */}
          <div className="hidden md:block">
            {currentCapacity.available ? (
              <Link
                href="/consideration"
                className="text-[#0D1B2A] bg-[#3FD3C6] px-6 py-2 text-sm font-light hover:bg-[#4FE3D6] transition-colors"
              >
                Request Consideration
              </Link>
            ) : (
              <span className="text-[#415A77] text-sm font-light">
                At Capacity Until {currentCapacity.nextWindow}
              </span>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            ref={menuButtonRef}
            className="md:hidden text-[#E0E1DD] p-2 focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] rounded"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              {mobileMenuOpen ? (
                <path d="M6 6l12 12M6 18L18 6" strokeWidth="1.5" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" strokeWidth="1.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          id="mobile-menu"
          className="md:hidden bg-[#0D1B2A]/95 backdrop-blur-sm border-t border-[#1B263B]"
          role="menu"
          aria-labelledby="mobile-menu-button"
        >
          <div className="px-6 py-4 space-y-4">
            <Link
              href="/instruments"
              role="menuitem"
              className="block text-[#E0E1DD] hover:text-[#3FD3C6] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] rounded px-2 py-1"
              onClick={() => setMobileMenuOpen(false)}
            >
              Instruments
            </Link>
            <Link
              href="/workshop"
              role="menuitem"
              className="block text-[#E0E1DD] hover:text-[#3FD3C6] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] rounded px-2 py-1"
              onClick={() => setMobileMenuOpen(false)}
            >
              Workshop
            </Link>
            <Link
              href="/maturity-map"
              role="menuitem"
              className="block text-[#E0E1DD] hover:text-[#3FD3C6] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] rounded px-2 py-1"
              onClick={() => setMobileMenuOpen(false)}
            >
              Assessment
            </Link>
            <Link
              href="/manifesto"
              role="menuitem"
              className="block text-[#E0E1DD] hover:text-[#3FD3C6] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] rounded px-2 py-1"
              onClick={() => setMobileMenuOpen(false)}
            >
              Manifesto
            </Link>
            <Link
              href="/workshop-notes"
              role="menuitem"
              className="block text-[#E0E1DD] hover:text-[#3FD3C6] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] rounded px-2 py-1"
              onClick={() => setMobileMenuOpen(false)}
            >
              Notes
            </Link>
            <Link
              href="/archive"
              role="menuitem"
              className="block text-[#E0E1DD] hover:text-[#3FD3C6] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] rounded px-2 py-1"
              onClick={() => setMobileMenuOpen(false)}
            >
              Archive
            </Link>

            <div className="pt-4 border-t border-[#1B263B]">
              {currentCapacity.available ? (
                <Link
                  href="/consideration"
                  className="block text-center text-[#0D1B2A] bg-[#3FD3C6] px-6 py-2 hover:bg-[#4FE3D6] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Request Consideration
                </Link>
              ) : (
                <div className="text-center">
                  <span className="text-[#415A77] text-sm">At Capacity</span>
                  <span className="block text-[#E0E1DD] text-sm mt-1">
                    Next: {currentCapacity.nextWindow}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navigation
