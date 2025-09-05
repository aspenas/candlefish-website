'use client'

import React, { useState } from 'react'
import { ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline'

interface EnhancedNewsletterFormProps {
  variant?: 'default' | 'compact' | 'inline' | 'modal'
  theme?: 'dark' | 'light'
  source?: string
  showPreferences?: boolean
}

const contentTypes = [
  { id: 'workshop-notes', label: 'Workshop Notes', description: 'Deep operational insights', default: true },
  { id: 'case-studies', label: 'Case Studies', description: 'Real implementation stories', default: false },
  { id: 'insights', label: 'Quick Insights', description: 'Brief operational patterns', default: false },
]

export const EnhancedNewsletterForm: React.FC<EnhancedNewsletterFormProps> = ({
  variant = 'default',
  theme = 'dark',
  source = 'enhanced-newsletter-form',
  showPreferences = true
}) => {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [preferences, setPreferences] = useState<string[]>(['workshop-notes'])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'check-email' | 'error'>('idle')
  const [error, setError] = useState('')

  const handlePreferenceToggle = (typeId: string) => {
    setPreferences(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (preferences.length === 0 && showPreferences) {
      setError('Please select at least one content type')
      return
    }
    
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/.netlify/functions/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          firstName: firstName.trim(),
          source,
          interests: preferences,
          doubleOptIn: true, // Signal that we want double opt-in
        })
      })

      const data = await response.json()

      if (response.ok) {
        // With double opt-in, show different success message
        setStatus('check-email')
        setEmail('')
        setFirstName('')
        
        // Don't auto-hide for check-email status
        if (!showPreferences) {
          setTimeout(() => setStatus('idle'), 10000)
        }
      } else {
        setError(data.error || 'Failed to subscribe')
        setStatus('error')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      setStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getThemeClasses = () => {
    if (theme === 'light') {
      return {
        container: 'bg-white border-gray-200',
        input: 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-sea-glow',
        button: 'bg-sea-glow text-white hover:bg-sea-glow/90',
        error: 'text-red-600',
        success: 'text-green-600',
        checkEmail: 'text-blue-600 bg-blue-50',
        preference: 'border-gray-300 text-gray-700 hover:bg-gray-50',
        preferenceActive: 'border-sea-glow bg-sea-glow/10 text-sea-glow'
      }
    }
    return {
      container: 'bg-[#0D1B2A]/50 border-[#415A77]/30',
      input: 'bg-[#0D1B2A] border-[#415A77]/30 text-[#F8F8F2] placeholder-[#415A77] focus:border-[#3FD3C6]',
      button: 'bg-[#3FD3C6] text-[#0D1B2A] hover:bg-[#4FE3D6]',
      error: 'text-red-400',
      success: 'text-[#3FD3C6]',
      checkEmail: 'text-[#3FD3C6] bg-[#3FD3C6]/10',
      preference: 'border-[#415A77]/30 text-[#F8F8F2] hover:bg-[#415A77]/10',
      preferenceActive: 'border-[#3FD3C6] bg-[#3FD3C6]/10 text-[#3FD3C6]'
    }
  }

  const classes = getThemeClasses()

  // Success state with check email message
  if (status === 'check-email') {
    return (
      <div className={`rounded-lg p-6 text-center ${classes.checkEmail}`}>
        <div className="mb-4">
          <CheckIcon className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Check your email!</h3>
        <p className="text-sm">
          We've sent a confirmation email to <strong>{email || 'your inbox'}</strong>.
        </p>
        <p className="text-sm mt-2">
          Please click the link in the email to complete your subscription.
        </p>
        <p className="text-xs mt-4 opacity-70">
          Didn't receive it? Check your spam folder or{' '}
          <button
            onClick={() => setStatus('idle')}
            className="underline hover:no-underline"
          >
            try again
          </button>
        </p>
      </div>
    )
  }

  // Success state for non-double-opt-in
  if (status === 'success' && variant !== 'inline') {
    return (
      <div className={`text-center p-4 ${classes.success}`}>
        <p className="font-medium">Successfully subscribed!</p>
        <p className="text-sm mt-1 opacity-80">Welcome to Candlefish insights.</p>
      </div>
    )
  }

  // Inline variant (simplified)
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
          disabled={isSubmitting || status === 'success'}
          className={`px-6 py-2 rounded transition-colors disabled:opacity-50 ${classes.button}`}
        >
          {status === 'success' ? 'Subscribed!' : isSubmitting ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
    )
  }

  // Full form with preferences
  return (
    <div className={`rounded-lg border p-6 ${classes.container}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email and Name inputs */}
        <div className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email Address *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none transition-colors ${classes.input}`}
            />
          </div>
          
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium mb-1">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Optional"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none transition-colors ${classes.input}`}
            />
          </div>
        </div>

        {/* Content Preferences */}
        {showPreferences && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Content Preferences
            </label>
            <div className="space-y-2">
              {contentTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handlePreferenceToggle(type.id)}
                  disabled={isSubmitting}
                  className={`w-full text-left px-4 py-3 border rounded-lg transition-colors flex items-center justify-between ${
                    preferences.includes(type.id) ? classes.preferenceActive : classes.preference
                  }`}
                >
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs opacity-70">{type.description}</div>
                  </div>
                  {preferences.includes(type.id) && (
                    <CheckIcon className="h-5 w-5 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className={`text-sm ${classes.error}`}>{error}</p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full px-6 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center ${classes.button}`}
        >
          {isSubmitting ? (
            'Processing...'
          ) : (
            <>
              Subscribe to Workshop Notes
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </>
          )}
        </button>

        {/* Privacy notice */}
        <p className={`text-xs text-center ${theme === 'light' ? 'text-gray-500' : 'text-[#415A77]'}`}>
          You'll receive a confirmation email to verify your subscription.
          <br />
          We respect your privacy. Unsubscribe at any time.
        </p>
      </form>
    </div>
  )
}