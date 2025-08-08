import React from 'react'

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-200 py-16 text-center relative overflow-hidden">
      <div className="container mx-auto px-6 max-w-screen-xl relative z-10">
        <p className="text-sm text-gray-400 mb-4">
          © 2025 Candlefish AI LLC. Illuminating the path to AI transformation.
        </p>
        <div className="text-sm">
          <a
            href="/privacy"
            className="text-gray-400 hover:text-white transition-colors duration-200 mr-6"
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            className="text-gray-400 hover:text-white transition-colors duration-200"
          >
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
