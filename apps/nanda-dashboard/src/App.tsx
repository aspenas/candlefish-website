import React from 'react'
import { Outlet } from '@tanstack/react-router'
import { Toaster } from './components/ui/toaster'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-foreground">
            NANDA Index Dashboard
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Revolutionary AI Agent Discovery Platform
          </p>
        </header>
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}

export default App