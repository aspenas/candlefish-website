'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import PaintboxLogo from '@/components/ui/PaintboxLogo'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const callbackUrl = searchParams.get('callbackUrl') || '/estimate/new'
  const hasError = searchParams.get('error') === 'true'

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const session = await getSession()
      if (session) {
        router.push(callbackUrl)
      }
    }
    checkAuth()
  }, [callbackUrl, router])

  useEffect(() => {
    if (hasError) {
      setError('Authentication failed. Please try again.')
    }
  }, [hasError])

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setError('')

      const result = await signIn('google', {
        callbackUrl,
        redirect: false,
      })

      if (result?.error) {
        setError('Sign in failed. Please try again.')
      } else if (result?.ok) {
        router.push(callbackUrl)
      }
    } catch (err) {
      console.error('Sign in error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full bg-gradient-to-tr from-purple-400/20 to-pink-400/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Login Card */}
        <div className="paintbox-card p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <PaintboxLogo size="large" showText className="flex flex-col items-center gap-3" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome to KindHome Paint</h1>
              <p className="text-gray-600 mt-2">
                Sign in to access your professional painting estimates
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Sign In Button */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className={`
                w-full flex items-center justify-center gap-3 px-6 py-4
                bg-white border-2 border-gray-200 rounded-lg
                text-gray-700 font-medium text-base
                transition-all duration-200
                hover:border-gray-300 hover:shadow-md
                focus:outline-none focus:ring-4 focus:ring-purple-500/20
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isLoading ? 'cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
              `}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-gray-600" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center leading-relaxed">
              By signing in, you agree to our Terms of Service and Privacy Policy.
              Your data is protected with enterprise-grade security.
            </p>
          </div>

          {/* Features Preview */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-900 text-center">
              What you'll get access to:
            </h3>
            <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Professional painting estimates
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Real-time pricing calculations
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Photo documentation with Company Cam
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Salesforce CRM integration
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-500">
          <p>Having trouble? Contact support at support@kindhomepaint.com</p>
        </div>
      </div>
    </div>
  )
}
