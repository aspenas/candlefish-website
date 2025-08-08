import React, { createContext, useContext } from 'react'
import { useUIStore } from '../stores/ui-store'

interface ThemeContextType {
  theme: 'light' | 'dark' | 'auto'
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  isDark: boolean
  isLight: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { theme, setTheme } = useUIStore()

  // Determine current effective theme
  const getEffectiveTheme = () => {
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  }

  const effectiveTheme = getEffectiveTheme()

  const contextValue: ThemeContextType = {
    theme,
    setTheme,
    isDark: effectiveTheme === 'dark',
    isLight: effectiveTheme === 'light',
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}
