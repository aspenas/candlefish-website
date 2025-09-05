'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function UnsubscribePage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'confirming' | 'success' | 'error' | 'invalid'>('confirming')
  const [email, setEmail] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const token = searchParams.get('token')
  const emailParam = searchParams.get('email')

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam)
    }
    
    // If we have a token, automatically process unsubscribe
    if (token) {
      handleTokenUnsubscribe()
    } else if (!emailParam) {
      setStatus('invalid')
    }
  }, [token, emailParam])

  const handleTokenUnsubscribe = async () => {
    try {
      const response = await fetch('/.netlify/functions/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      if (response.ok) {
        const data = await response.json()
        setEmail(data.email || '')
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch (error) {
      setStatus('error')
    }
  }

  const handleManualUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      const response = await fetch('/.netlify/functions/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: manualEmail.toLowerCase().trim() 
        })
      })

      if (response.ok) {
        setEmail(manualEmail)
        setStatus('success')
      } else {
        const data = await response.json()
        if (data.error === 'Email not found') {
          alert('This email address is not subscribed to our newsletter.')
        } else {
          setStatus('error')
        }
      }
    } catch (error) {
      setStatus('error')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-[#F8F8F2] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-8">
            <span className="text-2xl font-display text-[#3FD3C6]">Candlefish</span>
          </Link>
        </div>

        <div className="bg-[#0D1B2A]/50 border border-[#415A77]/30 rounded-lg p-8">
          {status === 'confirming' && token && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3FD3C6] mx-auto mb-4"></div>
              <p>Processing your unsubscribe request...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="text-[#3FD3C6] mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold">You've been unsubscribed</h1>
              <p className="text-[#415A77]">
                {email && (
                  <>
                    <span className="text-[#F8F8F2]">{email}</span> has been removed from our mailing list.
                  </>
                )}
                {!email && 'You have been successfully removed from our mailing list.'}
              </p>
              <p className="text-sm text-[#415A77]">
                We're sorry to see you go. Your insights and engagement have been valuable to us.
              </p>
              
              <div className="pt-4 space-y-3">
                <Link 
                  href="/workshop-notes"
                  className="block w-full px-6 py-3 bg-[#415A77]/20 text-[#F8F8F2] rounded-lg hover:bg-[#415A77]/30 transition-colors"
                >
                  Continue Reading Workshop Notes
                </Link>
                <Link 
                  href="/"
                  className="block w-full px-6 py-3 border border-[#415A77]/30 text-[#F8F8F2] rounded-lg hover:bg-[#415A77]/10 transition-colors"
                >
                  Return to Homepage
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="text-red-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold">Something went wrong</h1>
              <p className="text-[#415A77]">
                We couldn't process your unsubscribe request. Please try again or contact us directly.
              </p>
              
              <div className="pt-4">
                <a 
                  href="mailto:hello@candlefish.ai?subject=Unsubscribe Request"
                  className="inline-block px-6 py-3 bg-[#3FD3C6] text-[#0D1B2A] rounded-lg hover:bg-[#4FE3D6] transition-colors"
                >
                  Contact Support
                </a>
              </div>
            </div>
          )}

          {status === 'invalid' && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-semibold mb-2">Unsubscribe from Newsletter</h1>
                <p className="text-[#415A77]">
                  Enter your email address to unsubscribe from Candlefish workshop notes.
                </p>
              </div>

              <form onSubmit={handleManualUnsubscribe} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={isProcessing}
                    className="w-full px-4 py-3 bg-[#0D1B2A] border border-[#415A77]/30 text-[#F8F8F2] rounded-lg focus:outline-none focus:border-[#3FD3C6] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full px-6 py-3 bg-[#3FD3C6] text-[#0D1B2A] rounded-lg hover:bg-[#4FE3D6] transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Unsubscribe'}
                </button>
              </form>

              <p className="text-xs text-center text-[#415A77]">
                If you're having trouble, please email{' '}
                <a href="mailto:hello@candlefish.ai" className="text-[#3FD3C6] hover:underline">
                  hello@candlefish.ai
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Feedback section */}
        <div className="mt-8 text-center text-sm text-[#415A77]">
          <p>
            Your feedback helps us improve.{' '}
            <a 
              href="mailto:hello@candlefish.ai?subject=Newsletter Feedback"
              className="text-[#3FD3C6] hover:underline"
            >
              Tell us why you're leaving
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}