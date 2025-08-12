import React, { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface ThemeToggleProps {
  className?: string
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return (
      <button
        className={`btn-ghost btn-sm inline-flex items-center justify-center w-10 h-10 rounded-lg ${className}`}
        disabled
      >
        <div className="w-5 h-5 bg-gray-300 rounded animate-pulse" />
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        btn-ghost btn-sm inline-flex items-center justify-center w-10 h-10 rounded-lg 
        hover-lift hover-glow transition-all duration-fast ease-out
        focus-ring
        ${className}
      `}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative w-5 h-5 overflow-hidden">
        {/* Sun Icon */}
        <Sun
          className={`
            absolute inset-0 w-5 h-5 text-amber-500 transition-all duration-medium ease-out
            ${theme === 'light' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 rotate-90 scale-75'
            }
          `}
        />
        
        {/* Moon Icon */}
        <Moon
          className={`
            absolute inset-0 w-5 h-5 text-blue-400 transition-all duration-medium ease-out
            ${theme === 'dark' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-75'
            }
          `}
        />
      </div>
    </button>
  )
}

export default ThemeToggle