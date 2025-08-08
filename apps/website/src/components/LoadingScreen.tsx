import React from 'react'

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="text-center">
        <picture>
          <source srcSet="/logo/candlefish_original.png" type="image/webp" />
          <img
            src="/logo/candlefish_original.png"
            alt="Candlefish AI Logo"
            className="w-auto h-48 max-w-32 mb-6 mx-auto object-contain animate-pulse"
          />
        </picture>
        <div className="text-sm text-gray-400 font-mono tracking-wider uppercase">
          Illuminating possibilities...
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen
