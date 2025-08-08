import React from 'react'

const CTASection: React.FC = () => {
  return (
    <div className="py-20 lg:py-32 bg-gray-800 border-t border-b border-gray-700 text-center">
      <div className="container mx-auto px-6 max-w-screen-xl">
        <h2 className="text-4xl lg:text-5xl font-light mb-6">
          Ready to transform your business?
        </h2>

        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
          We're selectively partnering with organizations that can benefit from
          and contribute to our modular AI approach.
        </p>

        <a
          href="#contact"
          className="inline-flex items-center gap-4 px-8 py-4 bg-teal-400 text-black font-medium border-2 border-teal-400 transition-all duration-200 hover:bg-transparent hover:text-teal-400 hover:-translate-y-1 hover:shadow-lg hover:shadow-teal-400/30 group relative overflow-hidden"
        >
          <span className="relative z-10">Start a Conversation</span>
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
  )
}

export default CTASection
