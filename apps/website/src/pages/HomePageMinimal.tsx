import React from 'react'
import HeroSectionMinimal from '../components/sections/HeroSectionMinimal'

const HomePageMinimal: React.FC = () => {
  return (
    <div className="min-h-screen bg-black">
      <HeroSectionMinimal />
      
      {/* Services Section */}
      <section id="services" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">What We Do</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900 p-8 rounded-lg">
              <h3 className="text-xl font-semibold text-cyan-400 mb-4">AI Strategy</h3>
              <p className="text-gray-300">Transform your business with strategic AI implementation</p>
            </div>
            <div className="bg-gray-900 p-8 rounded-lg">
              <h3 className="text-xl font-semibold text-cyan-400 mb-4">Process Automation</h3>
              <p className="text-gray-300">Automate repetitive tasks and streamline workflows</p>
            </div>
            <div className="bg-gray-900 p-8 rounded-lg">
              <h3 className="text-xl font-semibold text-cyan-400 mb-4">Custom Solutions</h3>
              <p className="text-gray-300">Tailored AI modules for your specific needs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 bg-gray-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-8">Get in Touch</h2>
          <p className="text-xl text-gray-300 mb-8">
            Ready to transform your business with AI?
          </p>
          <a
            href="mailto:hello@candlefish.ai"
            className="inline-block px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-colors"
          >
            hello@candlefish.ai
          </a>
        </div>
      </section>
    </div>
  )
}

export default HomePageMinimal