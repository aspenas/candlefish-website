import React from 'react'

const HeroSectionMinimal: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Logo */}
        <div className="mb-8">
          <img
            src="/logo/candlefish-logo.png"
            alt="Candlefish AI"
            className="w-32 h-32 mx-auto mb-8 opacity-90"
            onError={(e) => {
              // Fallback to original logo if new one doesn't exist
              (e.target as HTMLImageElement).src = '/logo/candlefish_original.png'
            }}
          />
        </div>

        {/* Main Title */}
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
          Candlefish AI
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
          Enterprise AI consulting through discrete, composable modules
        </p>

        {/* Subtitle */}
        <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
          We turn your slowest business processes into your fastest competitive advantages
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#contact"
            className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-colors"
          >
            Get Started
          </a>
          <a
            href="#services"
            className="px-8 py-4 border-2 border-gray-600 hover:border-cyan-400 text-white font-semibold rounded-lg transition-colors"
          >
            Learn More
          </a>
        </div>
      </div>
    </section>
  )
}

export default HeroSectionMinimal
