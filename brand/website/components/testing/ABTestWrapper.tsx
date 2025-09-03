'use client'

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { ABTestWrapperProps } from '../../types/animation'
import { useFeatureFlags } from '../../hooks/useFeatureFlags'
import { useAnimationAnalytics } from '../../hooks/useAnimationAnalytics'

// A/B Test Context for sharing variant information
interface ABTestContext {
  activeVariant: string | null
  testId: string | null
  trackConversion: (conversionType?: string) => void
}

const ABTestContext = createContext<ABTestContext>({
  activeVariant: null,
  testId: null,
  trackConversion: () => {}
})

export const useABTest = () => useContext(ABTestContext)

export const ABTestWrapper: React.FC<ABTestWrapperProps> = ({
  children,
  testId,
  userId,
  fallback,
  onVariantAssigned
}) => {
  const [assignedVariant, setAssignedVariant] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { isEnabled, getVariant, getFlagConfig, loading: flagsLoading } = useFeatureFlags({ userId })
  const { trackEvent } = useAnimationAnalytics(testId, userId)

  // Generate stable user identifier for consistent variant assignment
  const getUserId = useCallback(() => {
    if (userId) return userId
    
    // Generate or retrieve anonymous user ID from sessionStorage
    let anonymousId = sessionStorage.getItem('ab_test_user_id')
    if (!anonymousId) {
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('ab_test_user_id', anonymousId)
    }
    return anonymousId
  }, [userId])

  // Hash function for consistent variant assignment
  const hashUserId = useCallback((uid: string, testKey: string): number => {
    let hash = 0
    const input = `${uid}_${testKey}`
    
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return Math.abs(hash)
  }, [])

  // Client-side variant assignment (fallback)
  const assignVariantLocally = useCallback((flagConfig: any) => {
    const uid = getUserId()
    const hash = hashUserId(uid, testId)
    
    if (!flagConfig?.variants || flagConfig.variants.length === 0) {
      return 'control'
    }

    // Calculate variant based on weights
    let totalWeight = 0
    const variants = flagConfig.variants.map((variant: any) => {
      totalWeight += variant.weight
      return { ...variant, cumulativeWeight: totalWeight }
    })

    const randomValue = hash % 100
    
    for (const variant of variants) {
      if (randomValue < variant.cumulativeWeight) {
        return variant.id
      }
    }
    
    return 'control'
  }, [getUserId, hashUserId, testId])

  // Assign variant
  const assignVariant = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Check if test is enabled
      if (!isEnabled(testId, false)) {
        setAssignedVariant('control')
        setIsLoading(false)
        return
      }

      // Get variant from feature flags (server-side assignment preferred)
      let variant = getVariant(testId, 'control')
      
      // If no server-side assignment, do client-side assignment
      if (variant === 'control') {
        const flagConfig = getFlagConfig(testId)
        if (flagConfig) {
          variant = assignVariantLocally(flagConfig)
        }
      }

      setAssignedVariant(variant)
      onVariantAssigned?.(variant)

      // Track variant assignment
      trackEvent('view', { 
        timestamp: Date.now() 
      }, variant)

    } catch (err) {
      console.error('A/B test variant assignment failed:', err)
      setError(err instanceof Error ? err.message : 'Variant assignment failed')
      setAssignedVariant('control') // Fallback to control
    } finally {
      setIsLoading(false)
    }
  }, [testId, isEnabled, getVariant, getFlagConfig, assignVariantLocally, onVariantAssigned, trackEvent])

  // Track conversion events
  const trackConversion = useCallback((conversionType = 'default') => {
    if (!assignedVariant) return

    trackEvent('interaction', {
      timestamp: Date.now(),
      conversionType
    }, assignedVariant)
  }, [assignedVariant, trackEvent])

  // Initialize variant assignment
  useEffect(() => {
    if (!flagsLoading) {
      assignVariant()
    }
  }, [flagsLoading, assignVariant])

  // Loading state
  if (isLoading || flagsLoading) {
    return (
      <div className="animate-pulse">
        {fallback || (
          <div className="h-64 bg-[#1B263B]/20 rounded-lg flex items-center justify-center">
            <div className="text-[#415A77] text-sm">Loading experiment...</div>
          </div>
        )}
      </div>
    )
  }

  // Error state
  if (error && !assignedVariant) {
    console.warn(`A/B Test Error (${testId}):`, error)
    return (
      <ABTestContext.Provider value={{
        activeVariant: 'control',
        testId,
        trackConversion
      }}>
        {children}
      </ABTestContext.Provider>
    )
  }

  return (
    <ABTestContext.Provider value={{
      activeVariant: assignedVariant,
      testId,
      trackConversion
    }}>
      <div data-ab-test={testId} data-variant={assignedVariant}>
        {children}
      </div>
    </ABTestContext.Provider>
  )
}

// Higher-order component for easier usage
export const withABTest = (
  testId: string,
  options: {
    userId?: string
    fallback?: React.ReactNode
    onVariantAssigned?: (variant: string) => void
  } = {}
) => {
  return function ABTestHOC<P extends object>(
    Component: React.ComponentType<P & { variant?: string }>
  ): React.FC<P> {
    return function WrappedComponent(props: P) {
      return (
        <ABTestWrapper
          testId={testId}
          userId={options.userId}
          fallback={options.fallback}
          onVariantAssigned={options.onVariantAssigned}
        >
          <ABTestConsumer>
            {({ activeVariant }) => (
              <Component {...props} variant={activeVariant || 'control'} />
            )}
          </ABTestConsumer>
        </ABTestWrapper>
      )
    }
  }
}

// Consumer component for render props pattern
interface ABTestConsumerProps {
  children: (context: ABTestContext) => React.ReactNode
}

export const ABTestConsumer: React.FC<ABTestConsumerProps> = ({ children }) => {
  const context = useContext(ABTestContext)
  return <>{children(context)}</>
}

// Variant component for declarative usage
interface VariantProps {
  name: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const Variant: React.FC<VariantProps> = ({ 
  name, 
  children, 
  fallback 
}) => {
  const { activeVariant } = useABTest()
  
  if (activeVariant === name) {
    return <>{children}</>
  }
  
  if (name === 'control' && !activeVariant) {
    return <>{children}</>
  }
  
  return <>{fallback}</>
}

// Example usage component
export const ABTestExample: React.FC = () => {
  return (
    <ABTestWrapper
      testId="candlefish_animation_speed"
      onVariantAssigned={(variant) => {
        console.log('Assigned variant:', variant)
      }}
    >
      <ABTestConsumer>
        {({ activeVariant, trackConversion }) => (
          <div className="space-y-4">
            <p className="text-[#E0E1DD]">
              Current variant: <span className="text-[#3FD3C6]">{activeVariant}</span>
            </p>
            
            <Variant name="control">
              <div>Control version - normal speed</div>
            </Variant>
            
            <Variant name="fast">
              <div>Fast variant - increased speed</div>
            </Variant>
            
            <Variant name="slow">
              <div>Slow variant - decreased speed</div>
            </Variant>
            
            <button
              onClick={() => trackConversion('click')}
              className="px-4 py-2 bg-[#3FD3C6] text-[#0D1B2A] rounded hover:bg-[#3FD3C6]/90"
            >
              Track Conversion
            </button>
          </div>
        )}
      </ABTestConsumer>
    </ABTestWrapper>
  )
}