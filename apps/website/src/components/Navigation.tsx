import React, { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

interface NavigationProps {
  className?: string
}

const Navigation: React.FC<NavigationProps> = ({ className = '' }) => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navigationItems = [
    { label: 'Products', href: '#products' },
    { label: 'Solutions', href: '#solutions' },
    { label: 'Resources', href: '#resources' },
    { label: 'Company', href: '#company' }
  ]

  return (
    <nav className={`professional-nav ${className}`}>
      <div className="professional-nav-container">
        {/* Logo */}
        <a href="/" className="professional-nav-logo">
          <img
            src="/logo/candlefish-logo.png"
            alt="Candlefish AI"
            className="w-8 h-8 object-contain"
          />
          <span>Candlefish AI</span>
        </a>

        {/* Desktop Navigation */}
        <div className="professional-nav-links hidden md:flex">
          {navigationItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="professional-nav-link"
            >
              {item.label}
            </a>
          ))}
          <button className="professional-btn professional-btn-primary">
            Get Started
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-gray-700" />
          ) : (
            <Menu className="w-6 h-6 text-gray-700" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
        isMobileMenuOpen
          ? 'max-h-96 opacity-100'
          : 'max-h-0 opacity-0'
      }`}>
        <div className="bg-white/95 backdrop-blur-lg border-t border-gray-200/20 px-6 py-4">
          <div className="flex flex-col space-y-4">
            {navigationItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="professional-nav-link py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="pt-4 border-t border-gray-200">
              <button className="professional-btn professional-btn-primary w-full">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
