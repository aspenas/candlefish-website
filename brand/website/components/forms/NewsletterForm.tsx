'use client'

import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { CheckCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

interface NewsletterFormProps {
  variant?: 'default' | 'compact' | 'inline'
  theme?: 'dark' | 'light'
  title?: string
  description?: string
  placeholder?: string
  className?: string
}

export const NewsletterForm: React.FC<NewsletterFormProps> = ({
  variant = 'default',
  theme = 'dark',
  title = "Stay Updated on Operational Insights",
  description = "Get weekly insights on automation, AI implementation, and operational excellence delivered to your inbox.",
  placeholder = "Enter your email address",
  className = ""
}) => {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Email address is required')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          firstName: firstName.trim(),
          source: 'website_newsletter_form',
          interests: ['automation', 'operations']
        }),
      })

      if (response.ok) {
        setIsSubscribed(true)
        setEmail('')
        setFirstName('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to subscribe. Please try again.')
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success state
  if (isSubscribed) {
    return (
      <div className={`text-center ${className}`}>
        <div className="w-12 h-12 bg-[#3FD3C6] rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircleIcon className="w-6 h-6 text-[#0D1B2A]" />
        </div>
        <h3 className="text-xl font-light text-[#F8F8F2] mb-2">
          Welcome to Our Newsletter!
        </h3>
        <p className="text-[#415A77] text-sm">
          You'll receive our first insight within the next week.
        </p>
      </div>
    )
  }

  // Get theme-based classes
  const getThemeClasses = () => {
    if (theme === 'light') {
      return {
        container: 'bg-white border-slate/10',
        title: 'text-slate',
        description: 'text-mist',
        input: 'bg-white border-mist/30 text-slate',
        button: 'bg-sea-glow text-white hover:bg-sea-glow/90',
        text: 'text-slate',
        muted: 'text-mist',
        success: 'bg-sea-glow text-white',
        successIcon: 'text-white'
      }
    }
    return {
      container: 'bg-[#1B263B]/30 border-[#415A77]/30',
      title: 'text-[#F8F8F2]',
      description: 'text-[#415A77]',
      input: 'bg-[#0D1B2A] border-[#415A77]/30 text-[#F8F8F2]',
      button: 'bg-[#3FD3C6] text-[#0D1B2A] hover:bg-[#4FE3D6]',
      text: 'text-[#F8F8F2]',
      muted: 'text-[#415A77]',
      success: 'bg-[#3FD3C6] text-[#0D1B2A]',
      successIcon: 'text-[#0D1B2A]'
    }
  }

  const themeClasses = getThemeClasses()

  // Compact variant (single email input)
  if (variant === 'compact') {
    return (
      <div className={className}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              className={themeClasses.input}
              disabled={isSubmitting}
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !email}
            className={`${themeClasses.button} disabled:opacity-50`}
          >
            {isSubmitting ? 'Subscribing...' : 'Subscribe'}
          </Button>
        </form>
        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
      </div>
    )
  }

  // Inline variant (very minimal)
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <EnvelopeIcon className="w-5 h-5 text-[#3FD3C6] flex-shrink-0" />
        <form onSubmit={handleSubmit} className="flex gap-2 flex-1">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-b border-[#415A77]/30 text-[#F8F8F2] placeholder:text-[#415A77] focus:border-[#3FD3C6] focus:outline-none transition-colors py-1"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !email}
            className="text-[#3FD3C6] hover:text-[#4FE3D6] disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? '...' : '→'}
          </button>
        </form>
        {error && (
          <p className="text-red-400 text-xs">{error}</p>
        )}
      </div>
    )
  }

  // Default variant (full form)
  return (
    <div className={`bg-[#1B263B]/30 border border-[#415A77]/30 rounded-lg p-6 ${className}`}>
      <div className="text-center mb-6">
        <h3 className="text-2xl font-light text-[#F8F8F2] mb-2">
          {title}
        </h3>
        <p className="text-[#415A77] text-sm">
          {description}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name (optional)"
              className="bg-[#0D1B2A] border-[#415A77]/30 text-[#F8F8F2]"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address *"
              className="bg-[#0D1B2A] border-[#415A77]/30 text-[#F8F8F2]"
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !email}
          className="w-full bg-[#3FD3C6] text-[#0D1B2A] hover:bg-[#4FE3D6] disabled:opacity-50"
        >
          {isSubmitting ? 'Subscribing...' : 'Subscribe to Newsletter'}
        </Button>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <p className="text-[#415A77] text-xs text-center">
          We respect your privacy. Unsubscribe at any time.
        </p>
      </form>
    </div>
  )
}