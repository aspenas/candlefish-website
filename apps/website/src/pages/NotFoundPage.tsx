import React from 'react'
import { Link } from 'react-router-dom'

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="container max-w-2xl text-center">
        <h1 className="text-8xl lg:text-9xl font-light text-teal-400 mb-4">
          404
        </h1>

        <div className="text-5xl mb-8 inline-block animate-swim">
          🐟
        </div>

        <h2 className="text-3xl lg:text-4xl font-light mb-4">
          This fish swam away
        </h2>

        <p className="text-xl text-gray-400 mb-8 leading-relaxed max-w-lg mx-auto">
          The page you're looking for doesn't exist. It might have been moved,
          renamed, or perhaps it never existed in the first place.
        </p>

        <Link
          to="/"
          className="inline-flex items-center px-8 py-4 bg-teal-400 text-black font-medium border-2 border-teal-400 hover:bg-transparent hover:text-teal-400 transition-all duration-300 hover:-translate-y-1"
        >
          Return Home
        </Link>
      </div>

    </div>
  )
}

export default NotFoundPage
