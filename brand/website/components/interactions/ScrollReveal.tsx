'use client'

import React, { createContext, useContext, useEffect, useRef } from 'react'

interface ScrollRevealContextType {
  observe: (element: Element) => void
  unobserve: (element: Element) => void
}

const ScrollRevealContext = createContext<ScrollRevealContextType | null>(null)

export const ScrollRevealProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const observerRef = useRef<IntersectionObserver | null>(null)
  
  useEffect(() => {
    // Create intersection observer for scroll reveals
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Add revealed class with stagger based on index
            const target = entry.target as HTMLElement
            const delay = parseInt(target.dataset.revealDelay || '0')
            
            setTimeout(() => {
              target.classList.add('revealed')
            }, delay)
            
            // Stop observing once revealed
            observerRef.current?.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    )
    
    // Auto-observe elements with reveal class
    const elements = document.querySelectorAll('.on-scroll-reveal')
    elements.forEach(el => observerRef.current?.observe(el))
    
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])
  
  const contextValue: ScrollRevealContextType = {
    observe: (element: Element) => {
      observerRef.current?.observe(element)
    },
    unobserve: (element: Element) => {
      observerRef.current?.unobserve(element)
    }
  }
  
  return (
    <ScrollRevealContext.Provider value={contextValue}>
      {children}
    </ScrollRevealContext.Provider>
  )
}

export const useScrollReveal = () => {
  const context = useContext(ScrollRevealContext)
  if (!context) {
    throw new Error('useScrollReveal must be used within ScrollRevealProvider')
  }
  return context
}

// Reveal Line Component for staggered text reveals
export const RevealLine: React.FC<{
  children: React.ReactNode
  delay?: number
  className?: string
}> = ({ children, delay = 0, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null)
  const { observe } = useScrollReveal()
  
  useEffect(() => {
    if (ref.current) {
      ref.current.dataset.revealDelay = delay.toString()
      observe(ref.current)
    }
  }, [delay, observe])
  
  return (
    <div 
      ref={ref}
      className={`on-scroll-reveal ${className}`}
    >
      {children}
    </div>
  )
}

// Reveal Block Component for content blocks
export const RevealBlock: React.FC<{
  children: React.ReactNode
  delay?: number
  className?: string
  direction?: 'up' | 'down' | 'left' | 'right'
}> = ({ children, delay = 0, className = '', direction = 'up' }) => {
  const ref = useRef<HTMLDivElement>(null)
  const { observe } = useScrollReveal()
  
  useEffect(() => {
    if (ref.current) {
      ref.current.dataset.revealDelay = delay.toString()
      ref.current.dataset.revealDirection = direction
      observe(ref.current)
    }
  }, [delay, direction, observe])
  
  const getTransformClass = () => {
    switch (direction) {
      case 'down': return 'translate-y-[-20px]'
      case 'left': return 'translate-x-[20px]'
      case 'right': return 'translate-x-[-20px]'
      default: return 'translate-y-[20px]'
    }
  }
  
  return (
    <div 
      ref={ref}
      className={`opacity-0 ${getTransformClass()} transition-all duration-gentle ease-gentle ${className}`}
      style={{
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  )
}