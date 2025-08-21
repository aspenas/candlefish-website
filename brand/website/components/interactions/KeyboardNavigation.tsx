'use client'

import React, { createContext, useContext, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface KeyboardNavigationContextType {
  registerSection: (key: string, element: Element) => void
  unregisterSection: (key: string) => void
  navigateToSection: (key: string) => void
}

const KeyboardNavigationContext = createContext<KeyboardNavigationContextType | null>(null)

const routes = [
  '/',
  '/manifesto',
  '/workshop',
  '/instruments',
  '/queue',
  '/archive'
]

export const KeyboardNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter()
  const pathname = usePathname()
  const sectionsRef = React.useRef<Map<string, Element>>(new Map())

  const navigateToSection = useCallback((key: string) => {
    const element = sectionsRef.current.get(key)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const registerSection = useCallback((key: string, element: Element) => {
    sectionsRef.current.set(key, element)
  }, [])

  const unregisterSection = useCallback((key: string) => {
    sectionsRef.current.delete(key)
  }, [])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't interfere with form inputs
      if (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Number keys: Jump to section
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const section = document.querySelector(`[data-section="${e.key}"]`)
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }

      // Arrow keys: Navigate between routes
      if (e.key === 'ArrowLeft' && e.metaKey) {
        e.preventDefault()
        const currentIndex = routes.indexOf(pathname)
        if (currentIndex > 0) {
          router.push(routes[currentIndex - 1])
        }
      }

      if (e.key === 'ArrowRight' && e.metaKey) {
        e.preventDefault()
        const currentIndex = routes.indexOf(pathname)
        if (currentIndex < routes.length - 1) {
          router.push(routes[currentIndex + 1])
        }
      }

      // Escape: Return to home
      if (e.key === 'Escape') {
        e.preventDefault()
        router.push('/')
      }

      // Slash: Focus search (if implemented)
      if (e.key === '/') {
        e.preventDefault()
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }

      // Question mark: Show keyboard shortcuts
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault()
        showKeyboardShortcuts()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [pathname, router])

  const contextValue: KeyboardNavigationContextType = {
    registerSection,
    unregisterSection,
    navigateToSection
  }

  return (
    <KeyboardNavigationContext.Provider value={contextValue}>
      {children}
      <KeyboardShortcutsModal />
    </KeyboardNavigationContext.Provider>
  )
}

export const useKeyboardNavigation = () => {
  const context = useContext(KeyboardNavigationContext)
  if (!context) {
    throw new Error('useKeyboardNavigation must be used within KeyboardNavigationProvider')
  }
  return context
}

// Keyboard Shortcuts Modal
const KeyboardShortcutsModal: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false)

  useEffect(() => {
    const handleShow = () => setIsOpen(true)
    window.addEventListener('show-keyboard-shortcuts', handleShow)
    return () => window.removeEventListener('show-keyboard-shortcuts', handleShow)
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-ink-primary/20 backdrop-blur-sm z-[100] flex items-center justify-center"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-atelier-canvas border border-ink-primary/20 p-8 max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="type-xl font-display text-ink-primary mb-6">
          Keyboard Navigation
        </h2>

        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="type-sm text-ink-secondary">Jump to section</span>
            <kbd className="type-xs font-mono bg-atelier-structure px-2 py-1">1-9</kbd>
          </div>

          <div className="flex justify-between">
            <span className="type-sm text-ink-secondary">Previous page</span>
            <kbd className="type-xs font-mono bg-atelier-structure px-2 py-1">⌘ + ←</kbd>
          </div>

          <div className="flex justify-between">
            <span className="type-sm text-ink-secondary">Next page</span>
            <kbd className="type-xs font-mono bg-atelier-structure px-2 py-1">⌘ + →</kbd>
          </div>

          <div className="flex justify-between">
            <span className="type-sm text-ink-secondary">Return home</span>
            <kbd className="type-xs font-mono bg-atelier-structure px-2 py-1">ESC</kbd>
          </div>

          <div className="flex justify-between">
            <span className="type-sm text-ink-secondary">Search</span>
            <kbd className="type-xs font-mono bg-atelier-structure px-2 py-1">/</kbd>
          </div>

          <div className="flex justify-between">
            <span className="type-sm text-ink-secondary">Show this help</span>
            <kbd className="type-xs font-mono bg-atelier-structure px-2 py-1">?</kbd>
          </div>
        </div>

        <button
          className="mt-8 w-full btn-primary"
          onClick={() => setIsOpen(false)}
        >
          Close
        </button>
      </div>
    </div>
  )
}

// Helper function to show keyboard shortcuts
function showKeyboardShortcuts() {
  window.dispatchEvent(new Event('show-keyboard-shortcuts'))
}

// Section Component with keyboard navigation support
export const NavigableSection: React.FC<{
  sectionKey: string
  children: React.ReactNode
  className?: string
}> = ({ sectionKey, children, className = '' }) => {
  const ref = React.useRef<HTMLElement>(null)
  const { registerSection, unregisterSection } = useKeyboardNavigation()

  useEffect(() => {
    if (ref.current) {
      registerSection(sectionKey, ref.current)
    }

    return () => {
      unregisterSection(sectionKey)
    }
  }, [sectionKey, registerSection, unregisterSection])

  return (
    <section
      ref={ref}
      data-section={sectionKey}
      className={className}
    >
      {children}
    </section>
  )
}
