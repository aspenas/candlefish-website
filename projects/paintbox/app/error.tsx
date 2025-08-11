'use client'

import React from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900">Paintbox</h1>
        </div>
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          Something went wrong!
        </h2>
        <p className="mb-6 text-gray-600">
          {error.message || 'An unexpected error occurred'}
        </p>
        <p className="mb-8 text-sm text-gray-500">
          {error.digest && `Error ID: ${error.digest}`}
        </p>
        <button
          onClick={reset}
          className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
