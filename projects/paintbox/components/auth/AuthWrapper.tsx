'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { OnboardingFlow } from './OnboardingFlow'
import { AppHeader } from '@/components/ui/AppHeader'

interface AuthWrapperProps {
  children: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Public routes that don't need authentication
  const publicRoutes = ['/login', '/', '/api', '/offline', '/estimate', '/demo', '/system-analyzer', '/infrastructure', '/test-animations', '/simple-login']
  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route))

  // Don't show loading for public routes or if not mounted
  if (!mounted) {
    return <>{children}</>
  }

  // Only show loading state for protected routes
  if (status === 'loading' && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
          <span className="text-gray-600 font-medium">Loading...</span>
        </div>
      </div>
    )
  }

  // Show onboarding for first-time users (except on public routes)
  if (session?.user?.isFirstLogin && !isPublicRoute) {
    return <OnboardingFlow />
  }

  // For authenticated routes, show header + content
  if (session && !isPublicRoute) {
    return (
      <>
        <AppHeader />
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </>
    )
  }

  // For public routes, just show content
  return <>{children}</>
}
