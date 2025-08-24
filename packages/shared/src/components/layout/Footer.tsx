import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface FooterProps {
  className?: string
  siteType: 'docs' | 'partners' | 'api'
}

const footerLinks = {
  docs: {
    sections: [
      {
        title: 'Documentation',
        links: [
          { href: '/getting-started', label: 'Getting Started' },
          { href: '/guides', label: 'Guides' },
          { href: '/reference', label: 'API Reference' },
          { href: '/examples', label: 'Examples' },
        ]
      },
      {
        title: 'Resources',
        links: [
          { href: '/changelog', label: 'Changelog' },
          { href: '/roadmap', label: 'Roadmap' },
          { href: '/community', label: 'Community' },
          { href: '/support', label: 'Support' },
        ]
      }
    ]
  },
  partners: {
    sections: [
      {
        title: 'Partners',
        links: [
          { href: '/directory', label: 'Partner Directory' },
          { href: '/network', label: 'Operator Network' },
          { href: '/apply', label: 'Become a Partner' },
          { href: '/resources', label: 'Resources' },
        ]
      },
      {
        title: 'Support',
        links: [
          { href: '/contact', label: 'Contact Us' },
          { href: '/help', label: 'Help Center' },
          { href: '/training', label: 'Training' },
          { href: '/certification', label: 'Certification' },
        ]
      }
    ]
  },
  api: {
    sections: [
      {
        title: 'API',
        links: [
          { href: '/overview', label: 'Overview' },
          { href: '/authentication', label: 'Authentication' },
          { href: '/endpoints', label: 'Endpoints' },
          { href: '/webhooks', label: 'Webhooks' },
        ]
      },
      {
        title: 'Tools',
        links: [
          { href: '/postman', label: 'Postman Collection' },
          { href: '/sdks', label: 'SDKs' },
          { href: '/playground', label: 'API Playground' },
          { href: '/status', label: 'Status' },
        ]
      }
    ]
  }
}

export function Footer({ className, siteType }: FooterProps) {
  const config = footerLinks[siteType]
  
  return (
    <footer className={cn(
      'bg-slate-900 text-white py-16',
      className
    )}>
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Branding */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm" />
              </div>
              <span className="font-bold text-xl text-white">Candlefish AI</span>
            </div>
            <p className="text-slate-300 mb-6 max-w-md leading-relaxed">
              Building systems that outlive their creators through operational craft and thoughtful engineering.
            </p>
            <div className="text-sm text-slate-400">
              © {new Date().getFullYear()} Candlefish AI. All rights reserved.
            </div>
          </div>

          {/* Site-specific links */}
          {config.sections.map((section, index) => (
            <div key={section.title} className="space-y-4">
              <h3 className="font-semibold text-white">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-slate-300 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom border */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="flex space-x-6 text-sm text-slate-400">
              <Link href="https://candlefish.ai/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="https://candlefish.ai/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="https://candlefish.ai/security" className="hover:text-white transition-colors">
                Security
              </Link>
            </div>
            
            <div className="text-sm text-slate-400">
              Made with operational craft
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}