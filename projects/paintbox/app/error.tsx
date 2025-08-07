'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <h2 className="mb-4 text-2xl font-bold text-[hsl(var(--foreground))]">
          Something went wrong!
        </h2>
        <p className="mb-6 text-[hsl(var(--muted-foreground))]">
          {error.message || 'An unexpected error occurred'}
        </p>
        <Button onClick={reset} variant="default">
          Try again
        </Button>
      </div>
    </div>
  )
}