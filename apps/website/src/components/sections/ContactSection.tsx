import React from 'react'

const ContactSection: React.FC = () => {
  return (
    <section className="py-20 lg:py-32" id="contact" style={{backgroundColor: 'var(--bg-secondary)'}}>
      <div className="container mx-auto px-6 max-w-screen-xl">
        <div className="text-center mb-16">
          <h2 className="mb-6 animate-fade-in-up" style={{color: 'var(--text-primary)'}}>Strategic Partnership Opportunities</h2>
          <p className="text-xl max-w-3xl mx-auto animate-fade-in-up delay-200" style={{color: 'var(--text-secondary)'}}>
            Ideal pilot partners have scale requirements, technical complexity,
            performance needs, and an innovation mindset.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="card card-elevated hover-lift animate-fade-in-up delay-300">
            <h3 className="text-3xl font-light mb-12 text-reveal" style={{color: 'var(--text-primary)'}}>Let's Connect</h3>

            <div className="space-y-8">
              <div className="flex items-center gap-4 hover-scale">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color: 'var(--accent-primary)'}}>
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <a
                  href="mailto:hello@candlefish.ai"
                  className="text-lg font-medium transition-colors duration-200 text-reveal"
                  style={{
                    color: 'var(--text-primary)',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--accent-primary)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--text-primary)'}
                >
                  hello@candlefish.ai
                </a>
              </div>

              <div>
                <h4 className="text-base mb-4 text-label" style={{color: 'var(--text-tertiary)'}}>Our Locations</h4>
                <div className="space-y-6">
                  <div className="flex items-start gap-4 hover-lift">
                    <svg className="w-6 h-6 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color: 'var(--accent-primary)'}}>
                      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <div>
                      <div className="text-lg font-medium" style={{color: 'var(--text-primary)'}}>Portsmouth, NH</div>
                      <div className="text-sm text-caption">East Coast Operations</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 hover-lift">
                    <svg className="w-6 h-6 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color: 'var(--accent-primary)'}}>
                      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <div>
                      <div className="text-lg font-medium" style={{color: 'var(--text-primary)'}}>Denver, CO</div>
                      <div className="text-sm text-caption">Mountain West Hub</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card card-elevated hover-lift animate-fade-in-up delay-400">
            <h3 className="text-2xl font-light mb-6 text-reveal" style={{color: 'var(--text-primary)'}}>Our Process</h3>
            <p className="leading-relaxed text-body" style={{color: 'var(--text-secondary)'}}>
              Initial technical discussion → Opportunity assessment → Pilot proposal
              → Implementation partnership. We work with a limited number of partners
              to ensure quality and focus.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ContactSection
