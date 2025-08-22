import React, { useEffect } from 'react'
import { Toaster } from './components/ui/toaster'
import { DashboardHome } from './pages/DashboardHome'

function App() {
  useEffect(() => {
    // Enable dark mode by default for the enterprise dashboard look
    document.documentElement.classList.add('dark')
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  return (
    <div className="min-h-screen bg-background dark">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <DashboardHome />
      </main>
      <Toaster />
    </div>
  )
}

export default App
