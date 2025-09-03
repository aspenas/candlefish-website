'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimationConfig, AnimationConfigState, ApiResponse } from '../types/animation'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'

export const useAnimationConfig = (animationId: string) => {
  const [state, setState] = useState<AnimationConfigState>({
    config: null,
    loading: true,
    error: null
  })

  // Cache for configuration data
  const [cache, setCache] = useState<Map<string, { data: AnimationConfig; timestamp: number }>>(
    new Map()
  )

  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  const fetchConfig = useCallback(async (id: string, useCache = true) => {
    // Check cache first
    if (useCache) {
      const cached = cache.get(id)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setState(prev => ({ ...prev, config: cached.data, loading: false, error: null }))
        return cached.data
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch(`${API_BASE}/animation/config/${id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<AnimationConfig> = await response.json()

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Failed to fetch animation configuration')
      }

      // Update cache
      setCache(prev => new Map(prev.set(id, { 
        data: result.data!, 
        timestamp: Date.now() 
      })))

      setState({
        config: result.data,
        loading: false,
        error: null
      })

      return result.data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState({
        config: null,
        loading: false,
        error: errorMessage
      })
      throw error
    }
  }, [cache, CACHE_TTL, API_BASE])

  const updateConfig = useCallback(async (
    id: string, 
    updates: Partial<AnimationConfig>
  ): Promise<AnimationConfig> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch(`${API_BASE}/animation/config/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<AnimationConfig> = await response.json()

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Failed to update animation configuration')
      }

      // Update cache with new data
      setCache(prev => new Map(prev.set(id, { 
        data: result.data!, 
        timestamp: Date.now() 
      })))

      setState({
        config: result.data,
        loading: false,
        error: null
      })

      return result.data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      throw error
    }
  }, [API_BASE])

  const refreshConfig = useCallback(() => {
    if (animationId) {
      return fetchConfig(animationId, false) // Force fresh fetch
    }
  }, [animationId, fetchConfig])

  // Initial fetch
  useEffect(() => {
    if (animationId) {
      fetchConfig(animationId)
    }
  }, [animationId, fetchConfig])

  // Cleanup cache entries older than TTL
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setCache(prev => {
        const updated = new Map()
        for (const [key, value] of prev.entries()) {
          if (now - value.timestamp < CACHE_TTL) {
            updated.set(key, value)
          }
        }
        return updated
      })
    }, CACHE_TTL)

    return () => clearInterval(interval)
  }, [CACHE_TTL])

  return {
    ...state,
    updateConfig: (updates: Partial<AnimationConfig>) => updateConfig(animationId, updates),
    refreshConfig,
    isStale: () => {
      const cached = cache.get(animationId)
      return cached ? Date.now() - cached.timestamp > CACHE_TTL : true
    }
  }
}