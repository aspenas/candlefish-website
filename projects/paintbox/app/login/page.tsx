'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import PaintboxLogo from '@/components/ui/PaintboxLogo'

function LoginContent() {
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
    <>
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
                ${isLoading ? 'animate-pulse' : ''}
              `}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  {/* Google Icon */}
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
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="text-center space-y-2 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              By signing in, you agree to our{' '}
              <a href="#" className="text-purple-600 hover:text-purple-700 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-purple-600 hover:text-purple-700 underline">
                Privacy Policy
              </a>
            </p>
            <p className="text-xs text-gray-400">
              © 2025 KindHome Paint. All rights reserved.
            </p>
          </div>
        </div>

        {/* Features List */}
        <div className="mt-8 grid grid-cols-2 gap-4 text-center">
          <div className="text-sm text-gray-600">
            <div className="mb-2">📊</div>
            <div>Professional Estimates</div>
          </div>
          <div className="text-sm text-gray-600">
            <div className="mb-2">📱</div>
            <div>iPad Optimized</div>
          </div>
          <div className="text-sm text-gray-600">
            <div className="mb-2">🔄</div>
            <div>Offline Support</div>
          </div>
          <div className="text-sm text-gray-600">
            <div className="mb-2">🔗</div>
            <div>CRM Integration</div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </div>
  )
}
