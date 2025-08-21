'use client'

interface AuthWrapperSimpleProps {
  children: React.ReactNode
}

export function AuthWrapperSimple({ children }: AuthWrapperSimpleProps) {
  // Removed hydration-causing state and useEffect
  // Simply render children consistently on both server and client
  return <>{children}</>
}
