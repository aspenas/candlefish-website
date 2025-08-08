import React from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  children: React.ReactNode
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding and info */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-8 lg:py-12 bg-primary text-primary-foreground relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full bg-gradient-to-br from-transparent via-white/20 to-white/40" />
          <svg
            className="absolute top-0 left-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-md mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <img
              src="/logo/candlefish_highquality.webp"
              alt="Candlefish AI"
              className="h-12 w-auto"
            />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold mb-4">
            Analytics Dashboard
          </h1>

          <p className="text-lg text-primary-foreground/90 mb-8">
            Multi-tenant analytics platform for data visualization and collaboration
          </p>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-primary-foreground/90">
                Real-time data visualization
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-primary-foreground/90">
                Collaborative dashboard builder
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-primary-foreground/90">
                Multi-tenant security
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-primary-foreground/90">
                Advanced analytics & insights
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-8 text-center">
          <p className="text-sm text-primary-foreground/70">
            © 2025 Candlefish AI. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right side - Form content */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-block">
              <img
                src="/logo/candlefish_highquality.webp"
                alt="Candlefish AI"
                className="h-10 w-auto mx-auto"
              />
            </Link>
          </div>

          {/* Form content */}
          {children}

          {/* Help text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Need help? Contact{' '}
              <a
                href="mailto:support@candlefish.ai"
                className="font-medium text-primary hover:text-primary/80 underline"
              >
                support@candlefish.ai
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
