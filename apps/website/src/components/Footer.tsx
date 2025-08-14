import React, { useState } from 'react'
import {
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Twitter,
  Linkedin,
  Github,
  Globe,
  CheckCircle
} from 'lucide-react'

interface FooterProps {
  className?: string
}

interface NewsletterFormData {
  email: string
  isSubmitting: boolean
  isSuccess: boolean
}

const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const [newsletter, setNewsletter] = useState<NewsletterFormData>({
    email: '',
    isSubmitting: false,
    isSuccess: false
  })

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewsletter(prev => ({ ...prev, isSubmitting: true }))

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Here you would integrate with your newsletter API
    console.log('Newsletter signup:', newsletter.email)

    setNewsletter({
      email: '',
      isSubmitting: false,
      isSuccess: true
    })

    // Reset success state after 3 seconds
    setTimeout(() => {
      setNewsletter(prev => ({ ...prev, isSuccess: false }))
    }, 3000)
  }

  const footerSections = [
    {
      title: 'Products',
      links: [
        { label: 'AI Automation', href: '/products/automation' },
        { label: 'Predictive Analytics', href: '/products/analytics' },
        { label: 'Custom Models', href: '/products/custom' },
        { label: 'Enterprise Platform', href: '/products/enterprise' }
      ]
    },
    {
      title: 'Solutions',
      links: [
        { label: 'Manufacturing', href: '/solutions/manufacturing' },
        { label: 'Healthcare', href: '/solutions/healthcare' },
        { label: 'Financial Services', href: '/solutions/finance' },
        { label: 'Retail & E-commerce', href: '/solutions/retail' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', href: '/docs' },
        { label: 'Case Studies', href: '/case-studies' },
        { label: 'Blog', href: '/blog' },
        { label: 'Whitepapers', href: '/resources/whitepapers' },
        { label: 'API Reference', href: '/api' }
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Careers', href: '/careers' },
        { label: 'Press', href: '/press' },
        { label: 'Partners', href: '/partners' },
        { label: 'Contact', href: '/contact' }
      ]
    }
  ]

  const socialLinks = [
    { icon: Twitter, href: 'https://twitter.com/candlefishai', label: 'Twitter' },
    { icon: Linkedin, href: 'https://linkedin.com/company/candlefish-ai', label: 'LinkedIn' },
    { icon: Github, href: 'https://github.com/candlefish-ai', label: 'GitHub' }
  ]

  const legalLinks = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'Security', href: '/security' }
  ]

  return (
    <footer className={`professional-footer ${className}`}>
      <div className="professional-footer-container">
        {/* Newsletter Section */}
        <div className="border-b border-gray-800 pb-16 mb-16">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Stay ahead with AI insights
            </h3>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Get the latest updates on AI trends, case studies, and product announcements
              delivered to your inbox.
            </p>

            <form onSubmit={handleNewsletterSubmit} className="professional-form max-w-md mx-auto bg-gray-800 border-gray-700">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  value={newsletter.email}
                  onChange={(e) => setNewsletter(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
                  className="professional-form-input bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  required
                  disabled={newsletter.isSubmitting || newsletter.isSuccess}
                />
                <button
                  type="submit"
                  disabled={newsletter.isSubmitting || newsletter.isSuccess}
                  className="professional-btn professional-btn-primary"
                >
                  {newsletter.isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : newsletter.isSuccess ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Subscribed!
                    </>
                  ) : (
                    <>
                      Subscribe
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="text-gray-500 text-sm mt-4">
              Join 10,000+ professionals. Unsubscribe anytime.
            </p>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="professional-footer-grid">
          {/* Company Info */}
          <div className="lg:col-span-2 professional-footer-section">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <img
                  src="/logo/candlefish-logo.png"
                  alt="Candlefish AI"
                  className="w-6 h-6 object-contain filter invert"
                />
              </div>
              <span className="text-2xl font-bold tracking-tight">
                Candlefish AI
              </span>
            </div>

            <p className="text-gray-400 mb-8 max-w-md leading-relaxed">
              Transforming enterprises through intelligent AI solutions.
              We help businesses unlock the power of artificial intelligence
              to drive growth, efficiency, and innovation.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary-400" />
                <a
                  href="mailto:hello@candlefish.ai"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  hello@candlefish.ai
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary-400" />
                <a
                  href="tel:+1-555-0123"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  +1 (555) 012-3456
                </a>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary-400" />
                <span className="text-gray-300">
                  San Francisco, CA
                </span>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section, index) => (
            <div key={index} className="professional-footer-section">
              <h3>{section.title}</h3>
              <ul className="professional-footer-links">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a href={link.href}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Footer */}
        <div className="professional-footer-bottom">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Copyright */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              <p className="text-gray-400 text-sm">
                © {new Date().getFullYear()} Candlefish AI. All rights reserved.
              </p>

              {/* Legal Links */}
              <div className="flex items-center gap-6">
                {legalLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social, index) => {
                const Icon = social.icon
                return (
                  <a
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 group"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
