import React from 'react'
import AIAnimation from '../AIAnimation'

const HeroSection: React.FC = () => {
  return (
    <section className="hero-section relative min-h-screen flex items-center overflow-hidden">
      {/* Parallax Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="parallax-layer absolute w-[120%] h-[120%] -left-[10%] -top-[10%]" data-speed="0.5">
          <svg width="100%" height="100%" className="opacity-10">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgb(58, 58, 58)" strokeWidth="1"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-6 max-w-screen-xl relative z-10">
        <div className="text-center pt-20">
          {/* Validation Badge */}
          <div
            className="inline-block bg-teal-400 text-black px-6 py-2 text-sm font-mono tracking-wider uppercase mb-8 opacity-0 transform translate-y-5"
            style={{
              animation: 'fadeInUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards'
            }}
          >
            VALIDATION PHASE
          </div>

          {/* Main Title */}
          <h1
            className="mb-8 max-w-5xl mx-auto opacity-0 transform translate-y-10"
            style={{
              animation: 'fadeInUp 1s cubic-bezier(0.22, 1, 0.36, 1) 0.4s forwards'
            }}
          >
            Illuminating the path to{' '}
            <span className="gradient-text">AI transformation</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-2xl text-gray-400 mb-12 max-w-4xl mx-auto leading-relaxed opacity-0 transform translate-y-10"
            style={{
              animation: 'fadeInUp 1s cubic-bezier(0.22, 1, 0.36, 1) 0.6s forwards'
            }}
          >
            We turn your slowest business processes into your fastest competitive advantages
            through discrete, composable AI modules.
          </p>

          {/* AI Animation */}
          <div
            className="w-full max-w-2xl h-96 mx-auto mb-12 relative opacity-0 transform scale-90"
            style={{
              animation: 'fadeInScale 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.8s forwards'
            }}
          >
            <AIAnimation />
          </div>

          {/* CTA Button */}
          <div className="opacity-0 transform translate-y-5" style={{
            animation: 'fadeInUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 1s forwards'
          }}>
            <a
              href="#contact"
              className="inline-flex items-center gap-4 px-8 py-4 bg-teal-400 text-black font-medium border-2 border-teal-400 transition-all duration-200 hover:bg-transparent hover:text-teal-400 hover:-translate-y-1 hover:shadow-lg hover:shadow-teal-400/30 group relative overflow-hidden"
            >
              <span className="relative z-10">Explore Partnership</span>
              <svg
                className="w-5 h-5 relative z-10 transition-transform duration-200 group-hover:translate-x-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"/>
              </svg>

              {/* Hover effect background */}
              <span className="absolute top-0 left-0 w-0 h-full bg-white transition-all duration-400 ease-out group-hover:w-full -z-0"></span>
            </a>
          </div>
        </div>
      </div>

    </section>
  )
}

export default HeroSection
