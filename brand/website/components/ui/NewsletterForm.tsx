'use client'

import React, { useState } from 'react'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

interface NewsletterFormProps {
  variant?: 'default' | 'compact' | 'inline'
  theme?: 'dark' | 'light'
  source?: string
}

export const NewsletterForm: React.FC<NewsletterFormProps> = ({
  variant = 'default',
  theme = 'dark',
  source = 'newsletter-form'
}) => {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/.netlify/functions/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          source,
          interests: ['automation', 'operations']
        })
      })

      const data = await response.json()

      if (response.ok) {
        setIsSuccess(true)
        setEmail('')
        setTimeout(() => setIsSuccess(false), 5000)
      } else {
        setError(data.error || 'Failed to subscribe')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getThemeClasses = () => {
    if (theme === 'light') {
      return {
        input: 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-sea-glow',
        button: 'bg-sea-glow text-white hover:bg-sea-glow/90',
        error: 'text-red-600',
        success: 'text-green-600'
      }
    }
    return {
      input: 'bg-[#0D1B2A] border-[#415A77]/30 text-[#F8F8F2] placeholder-[#415A77] focus:border-[#3FD3C6]',
      button: 'bg-[#3FD3C6] text-[#0D1B2A] hover:bg-[#4FE3D6]',
      error: 'text-red-400',
      success: 'text-[#3FD3C6]'
    }
  }

  const classes = getThemeClasses()

  if (isSuccess && variant !== 'inline') {
    return (
      <div className={`text-center p-4 ${classes.success}`}>
        <p className="font-medium">Successfully subscribed!</p>
        <p className="text-sm mt-1 opacity-80">Check your email for confirmation.</p>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          disabled={isSubmitting}
          className={`flex-1 px-4 py-2 border rounded focus:outline-none transition-colors ${classes.input}`}
        />
        <button
          type="submit"
          disabled={isSubmitting || isSuccess}
          className={`px-6 py-2 rounded transition-colors disabled:opacity-50 ${classes.button}`}
        >
          {isSuccess ? 'Subscribed!' : isSubmitting ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
    )
  }

  return (
    <div className={variant === 'compact' ? 'space-y-3' : 'space-y-4'}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            disabled={isSubmitting}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none transition-colors ${classes.input}`}
          />
        </div>

        {error && (
          <p className={`text-sm ${classes.error}`}>{error}</p>
        )}

        {isSuccess && (
          <p className={`text-sm ${classes.success}`}>Successfully subscribed! Check your email.</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full px-6 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center ${classes.button}`}
        >
          {isSubmitting ? (
            'Subscribing...'
          ) : (
            <>
              Subscribe to Newsletter
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {variant === 'default' && (
        <p className={`text-xs text-center ${theme === 'light' ? 'text-gray-500' : 'text-[#415A77]'}`}>
          We respect your privacy. Unsubscribe at any time.
        </p>
      )}
    </div>
  )
}
