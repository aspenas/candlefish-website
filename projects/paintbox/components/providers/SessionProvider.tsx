'use client'

import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'

interface ProvidersProps {
  children: React.ReactNode
  session?: Session | null
}

export function AuthProvider({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session} refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      {children}
    </SessionProvider>
  )
}
