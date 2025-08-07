'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils/cn'
import { useSwipe, useIPad } from '@/lib/hooks/useTouchGestures'
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react'
import { Button } from './Button'

interface NavigationStep {
  id: string
  label: string
  icon?: React.ReactNode
  completed?: boolean
  active?: boolean
}

interface IPadNavigationProps {
  steps: NavigationStep[]
  currentStep: number
  onStepChange: (step: number) => void
  onMenuToggle?: (open: boolean) => void
  className?: string
}

export function IPadNavigation({
  steps,
  currentStep,
  onStepChange,
  onMenuToggle,
  className
}: IPadNavigationProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const isIPad = useIPad()

  // Detect orientation
  useEffect(() => {
    const checkOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight
      setOrientation(isLandscape ? 'landscape' : 'portrait')
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  // Swipe handlers for navigation
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (currentStep < steps.length - 1) {
        onStepChange(currentStep + 1)
      }
    },
    onSwipeRight: () => {
      if (currentStep > 0) {
        onStepChange(currentStep - 1)
      }
    },
    threshold: 50
  })

  // Toggle sidebar
  const toggleSidebar = () => {
    const newState = !sidebarOpen
    setSidebarOpen(newState)
    onMenuToggle?.(newState)
  }

  // Auto-hide sidebar in portrait mode on step change
  useEffect(() => {
    if (orientation === 'portrait' && sidebarOpen) {
      setSidebarOpen(false)
      onMenuToggle?.(false)
    }
  }, [currentStep])

  return (
    <>
      {/* Top Navigation Bar - Always visible */}
      <div
        className={cn(
          'fixed top-0 left-0 right-0 z-40',
          'bg-[hsl(var(--background))] border-b border-[hsl(var(--border))]',
          'h-16 flex items-center px-4',
          className
        )}
      >
        {/* Menu toggle for portrait mode */}
        {orientation === 'portrait' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-3 lg:hidden"
          >
            {sidebarOpen ? <X /> : <Menu />}
          </Button>
        )}

        {/* Current step indicator */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="font-medium text-[hsl(var(--foreground))]">
            {steps[currentStep]?.label}
          </span>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="min-h-[var(--touch-target)] min-w-[var(--touch-target)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onStepChange(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
            className="min-h-[var(--touch-target)] min-w-[var(--touch-target)]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sidebar - Collapsible in portrait, always visible in landscape */}
      <div
        className={cn(
          'fixed top-16 bottom-0 left-0 z-30',
          'bg-[hsl(var(--card))] border-r border-[hsl(var(--border))]',
          'transition-transform duration-300',
          orientation === 'landscape' ? 'w-80' : 'w-72',
          orientation === 'portrait' && !sidebarOpen && '-translate-x-full',
          'lg:translate-x-0' // Always visible on large screens
        )}
      >
        <div className="p-4 space-y-2">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => {
                onStepChange(index)
                if (orientation === 'portrait') {
                  setSidebarOpen(false)
                  onMenuToggle?.(false)
                }
              }}
              className={cn(
                // Base styles
                'w-full flex items-center gap-3 px-4 py-3',
                'rounded-[var(--radius)] transition-all duration-200',
                'text-left touch-manipulation',
                'min-h-[var(--touch-target)]',
                // State styles
                index === currentStep
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                  : 'hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]',
                step.completed && index !== currentStep && 'text-[hsl(var(--success))]',
                // Disabled state
                !step.completed && index > currentStep && 'opacity-50 cursor-not-allowed'
              )}
              disabled={!step.completed && index > currentStep}
            >
              {/* Step number or icon */}
              <div
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8 rounded-full text-sm font-medium',
                  index === currentStep
                    ? 'bg-[hsl(var(--primary-foreground))] text-[hsl(var(--primary))]'
                    : step.completed
                    ? 'bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]'
                    : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                )}
              >
                {step.completed && index !== currentStep ? '✓' : index + 1}
              </div>
              
              {/* Step label */}
              <div className="flex-1">
                <div className="font-medium">{step.label}</div>
                {step.completed && index !== currentStep && (
                  <div className="text-xs opacity-75">Completed</div>
                )}
              </div>
              
              {/* Step icon if provided */}
              {step.icon && <div className="opacity-75">{step.icon}</div>}
            </button>
          ))}
        </div>

        {/* Progress indicator */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
            <div
              className="h-full bg-[hsl(var(--primary))] transition-all duration-300"
              style={{
                width: `${((currentStep + 1) / steps.length) * 100}%`
              }}
            />
          </div>
          <div className="mt-2 text-center text-sm text-[hsl(var(--muted-foreground))]">
            {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
          </div>
        </div>
      </div>

      {/* Overlay for portrait mode when sidebar is open */}
      {orientation === 'portrait' && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => {
            setSidebarOpen(false)
            onMenuToggle?.(false)
          }}
        />
      )}

      {/* Swipe indicator for touch devices */}
      {isIPad && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10"
          {...swipeHandlers}
        >
          <div className="bg-[hsl(var(--card))] rounded-full px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
              <ChevronLeft className="h-4 w-4" />
              <span>Swipe to navigate</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Export a hook for managing navigation state
export function useIPadNavigation(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step)
    }
  }

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      markStepCompleted(currentStep)
      setCurrentStep(currentStep + 1)
    }
  }

  const goPrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const markStepCompleted = (step: number) => {
    setCompletedSteps(prev => new Set(prev).add(step))
  }

  const isStepCompleted = (step: number) => {
    return completedSteps.has(step)
  }

  const canNavigateToStep = (step: number) => {
    // Can navigate to any completed step or the next uncompleted step
    if (step <= currentStep) return true
    if (step === currentStep + 1) return true
    return isStepCompleted(step - 1)
  }

  return {
    currentStep,
    completedSteps: Array.from(completedSteps),
    goToStep,
    goNext,
    goPrevious,
    markStepCompleted,
    isStepCompleted,
    canNavigateToStep,
    progress: ((currentStep + 1) / totalSteps) * 100
  }
}