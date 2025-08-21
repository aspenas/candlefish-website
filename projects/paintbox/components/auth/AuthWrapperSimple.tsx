'use client'

import { useEffect, useState } from 'react'

interface AuthWrapperSimpleProps {
  children: React.ReactNode
}

export function AuthWrapperSimple({ children }: AuthWrapperSimpleProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Always render children to avoid blocking
  return <>{children}</>
}
