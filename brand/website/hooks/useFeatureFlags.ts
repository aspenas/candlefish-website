'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  FeatureFlag, 
  FeatureFlagsState, 
  FeatureFlagOverride, 
  ApiResponse 
} from '../types/animation'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'

interface FeatureFlagConfig {
  userId?: string
  defaultFlags?: Record<string, boolean>
  refreshInterval?: number
}

export const useFeatureFlags = (config: FeatureFlagConfig = {}) => {
  const { 
    userId, 
    defaultFlags = {}, 
    refreshInterval = 5 * 60 * 1000 // 5 minutes
  } = config

  const [state, setState] = useState<FeatureFlagsState>({
    flags: {},
    activeVariants: {},
    loading: true,
    error: null
  })

  // Fetch feature flags for user
  const fetchFlags = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && Object.keys(state.flags).length > 0) {
      return // Don't refetch if we already have flags
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const url = userId 
        ? `${API_BASE}/features/flags/${userId}`
        : `${API_BASE}/features/flags/default`

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<{
        flags: Record<string, FeatureFlag>
        activeVariants: Record<string, string>
      }> = await response.json()

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Failed to fetch feature flags')
      }

      setState({
        flags: result.data.flags,
        activeVariants: result.data.activeVariants,
        loading: false,
        error: null
      })
    } catch (error) {
      console.warn('Failed to fetch feature flags, using defaults:', error)
      
      // Use default flags on error
      const fallbackFlags: Record<string, FeatureFlag> = {}
      const fallbackVariants: Record<string, string> = {}
      
      Object.entries(defaultFlags).forEach(([flagId, enabled]) => {
        fallbackFlags[flagId] = {
          flagId,
          name: flagId,
          description: `Default flag for ${flagId}`,
          enabled,
          variants: [],
          targeting: { userSegments: [], percentage: 100 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })

      setState({
        flags: fallbackFlags,
        activeVariants: fallbackVariants,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }, [userId, defaultFlags, API_BASE, state.flags])

  // Check if a feature flag is enabled
  const isEnabled = useCallback((flagId: string, defaultValue = false): boolean => {
    const flag = state.flags[flagId]
    if (!flag) return defaultValue
    return flag.enabled
  }, [state.flags])

  // Get active variant for a flag
  const getVariant = useCallback((flagId: string, defaultVariant = 'control'): string => {
    return state.activeVariants[flagId] || defaultVariant
  }, [state.activeVariants])

  // Get flag configuration including variant-specific config
  const getFlagConfig = useCallback((flagId: string) => {
    const flag = state.flags[flagId]
    if (!flag) return null

    const activeVariant = state.activeVariants[flagId]
    if (!activeVariant) return flag

    const variant = flag.variants.find(v => v.id === activeVariant)
    return {
      ...flag,
      activeVariant: variant || null
    }
  }, [state.flags, state.activeVariants])

  // Override a feature flag (admin function)
  const overrideFlag = useCallback(async (
    flagId: string, 
    variant: string,
    expiresAt?: string
  ): Promise<boolean> => {
    if (!userId) {
      console.warn('Cannot override flag without userId')
      return false
    }

    try {
      const override: FeatureFlagOverride = {
        flagId,
        userId,
        variant,
        expiresAt
      }

      const response = await fetch(`${API_BASE}/features/flags/${flagId}/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(override),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<{ success: boolean }> = await response.json()

      if (result.success) {
        // Update local state
        setState(prev => ({
          ...prev,
          activeVariants: {
            ...prev.activeVariants,
            [flagId]: variant
          }
        }))
        return true
      }

      return false
    } catch (error) {
      console.error('Failed to override feature flag:', error)
      return false
    }
  }, [userId, API_BASE])

  // Refresh flags
  const refreshFlags = useCallback(() => {
    return fetchFlags(true)
  }, [fetchFlags])

  // Initial fetch
  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  // Auto-refresh flags
  useEffect(() => {
    if (refreshInterval <= 0) return

    const interval = setInterval(() => {
      fetchFlags(true)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval, fetchFlags])

  return {
    ...state,
    isEnabled,
    getVariant,
    getFlagConfig,
    overrideFlag,
    refreshFlags
  }
}