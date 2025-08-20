import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Candlefish.ai - Practical Automation That Compounds',
  description: 'Modular AI solutions for SMB operations. Measurable results in 2 weeks. No hype, just operational improvement.',
  keywords: 'operational AI, workflow automation, SMB automation, practical AI, modular automation',
  authors: [{ name: 'Candlefish.ai' }],
  openGraph: {
    title: 'Candlefish.ai - Practical Automation That Compounds',
    description: 'Modular AI solutions for SMB operations. Start small, prove value, scale what works.',
    url: 'https://candlefish.ai',
    siteName: 'Candlefish.ai',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-deep-navy`}>
        <nav className="border-b border-mist/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <a href="/" className="flex items-center space-x-2">
                  <span className="text-xl font-medium">candlefish<span className="text-mist">.ai</span></span>
                </a>
              </div>
              <div className="hidden sm:flex sm:items-center sm:space-x-8">
                <a href="/services" className="text-slate hover:text-deep-navy transition">Services</a>
                <a href="/frameworks/maturity-map" className="text-slate hover:text-deep-navy transition">Maturity Map</a>
                <a href="/case-studies" className="text-slate hover:text-deep-navy transition">Case Studies</a>
                <a href="/insights" className="text-slate hover:text-deep-navy transition">Insights</a>
                <a href="/about" className="text-slate hover:text-deep-navy transition">About</a>
                <a href="/contact" className="bg-sea-glow text-white px-4 py-2 rounded-md hover:opacity-90 transition">Get Started</a>
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="bg-slate text-foam mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Candlefish.ai</h3>
                <p className="text-sm text-mist">Practical automation that compounds. No hype, just measurable operational improvement.</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-4">Solutions</h4>
                <ul className="space-y-2 text-sm text-mist">
                  <li><a href="/services" className="hover:text-foam transition">Modular AI</a></li>
                  <li><a href="/frameworks/maturity-map" className="hover:text-foam transition">Maturity Assessment</a></li>
                  <li><a href="/case-studies" className="hover:text-foam transition">Success Stories</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-4">Company</h4>
                <ul className="space-y-2 text-sm text-mist">
                  <li><a href="/about" className="hover:text-foam transition">About Us</a></li>
                  <li><a href="/insights" className="hover:text-foam transition">Insights</a></li>
                  <li><a href="/ethics" className="hover:text-foam transition">Ethics & Transparency</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-4">Connect</h4>
                <ul className="space-y-2 text-sm text-mist">
                  <li><a href="/contact" className="hover:text-foam transition">Contact Us</a></li>
                  <li><a href="https://linkedin.com/company/candlefish-ai" className="hover:text-foam transition">LinkedIn</a></li>
                  <li><a href="mailto:hello@candlefish.ai" className="hover:text-foam transition">hello@candlefish.ai</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-mist/20 text-center text-sm text-mist">
              <p>&copy; 2025 Candlefish.ai. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}