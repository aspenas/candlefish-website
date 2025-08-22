'use client';

import Link from 'next/link';
import { Calculator, Menu, X } from 'lucide-react';
import { useState } from 'react';
import EggshellLogo from '@/components/ui/EggshellLogo';

interface NavigationProps {
  className?: string;
  showCTA?: boolean;
}

const Navigation = ({ className = '', showCTA = true }: NavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: '#features', label: 'Features' },
    { href: '#pricing', label: 'Pricing' },
    { href: '/docs', label: 'Documentation' },
    { href: '#contact', label: 'Contact' }
  ];

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-white shadow-sm ${className}`}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <EggshellLogo
                size="desktop"
                showText
                priority
                className="flex items-center space-x-3"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center space-x-4">
            {showCTA && (
              <>
                <Link
                  href="/login"
                  className="font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/estimate/new"
                  className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <Calculator className="w-4 h-4" />
                  Start Estimate
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-slate-700" />
            ) : (
              <Menu className="w-6 h-6 text-slate-700" />
            )}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-4 pt-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-medium py-2 text-slate-600 hover:text-slate-900 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {showCTA && (
                <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
                  <Link
                    href="/login"
                    className="font-medium py-2 text-slate-600 hover:text-slate-900 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/estimate/new"
                    className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                    onClick={() => setIsOpen(false)}
                  >
                    <Calculator className="w-4 h-4" />
                    Start Estimate
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navigation;
