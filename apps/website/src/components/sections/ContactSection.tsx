import React from 'react'

const ContactSection: React.FC = () => {
  return (
    <section className="py-20 lg:py-32 bg-gray-100" id="contact">
      <div className="container mx-auto px-6 max-w-screen-xl">
        <div className="text-center mb-16">
          <h2 className="mb-6">Strategic Partnership Opportunities</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Ideal pilot partners have scale requirements, technical complexity,
            performance needs, and an innovation mindset.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="bg-gray-800 p-12 border border-gray-700">
            <h3 className="text-3xl font-light mb-12">Let's Connect</h3>

            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <svg className="w-6 h-6 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <a
                  href="mailto:hello@candlefish.ai"
                  className="text-lg font-medium text-white hover:text-teal-400 transition-colors duration-200"
                >
                  hello@candlefish.ai
                </a>
              </div>

              <div>
                <h4 className="text-base text-gray-400 mb-4 uppercase tracking-wider">Our Locations</h4>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <svg className="w-6 h-6 text-teal-400 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <div>
                      <div className="text-lg font-medium text-white">Portsmouth, NH</div>
                      <div className="text-sm text-gray-400">East Coast Operations</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <svg className="w-6 h-6 text-teal-400 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <div>
                      <div className="text-lg font-medium text-white">Denver, CO</div>
                      <div className="text-sm text-gray-400">Mountain West Hub</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-12 border border-gray-700">
            <h3 className="text-2xl font-light mb-6">Our Process</h3>
            <p className="leading-relaxed text-gray-400">
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
