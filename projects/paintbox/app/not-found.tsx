import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <h2 className="mb-4 text-4xl font-bold text-[hsl(var(--foreground))]">
          404
        </h2>
        <p className="mb-6 text-xl text-[hsl(var(--muted-foreground))]">
          Page not found
        </p>
        <Link href="/">
          <Button variant="default">
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  )
}