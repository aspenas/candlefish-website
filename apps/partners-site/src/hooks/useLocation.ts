'use client'

import { useState, useEffect, useCallback } from 'react'
import { offlineStorage } from '@/lib/offline-storage'

interface LocationData {
  position: GeolocationPosition | null
  error: GeolocationPositionError | null
  isLoading: boolean
  isWatching: boolean
  lastUpdated: number | null
}

interface LocationPreferences {
  enableTracking: boolean
  shareWithOperators: boolean
  accuracy: 'low' | 'medium' | 'high'
  updateInterval: number // in milliseconds
  maxAge: number // cache time in milliseconds
}

interface NearbyOperator {
  id: string
  name: string
  distance: number
  bearing: number
  location: {
    latitude: number
    longitude: number
  }
  availability: 'available' | 'busy' | 'offline'
  specialties: string[]
}

const DEFAULT_PREFERENCES: LocationPreferences = {
  enableTracking: false,
  shareWithOperators: true,
  accuracy: 'medium',
  updateInterval: 30000, // 30 seconds
  maxAge: 300000, // 5 minutes
}

export function useLocation() {
  const [locationData, setLocationData] = useState<LocationData>({
    position: null,
    error: null,
    isLoading: false,
    isWatching: false,
    lastUpdated: null
  })

  const [preferences, setPreferences] = useState<LocationPreferences>(DEFAULT_PREFERENCES)
  const [nearbyOperators, setNearbyOperators] = useState<NearbyOperator[]>([])
  const [watchId, setWatchId] = useState<number | null>(null)

  // Load preferences from storage on mount
  useEffect(() => {
    loadPreferences()
  }, [])

  // Start/stop location watching based on preferences
  useEffect(() => {
    if (preferences.enableTracking) {
      startLocationTracking()
    } else {
      stopLocationTracking()
    }

    return () => stopLocationTracking()
  }, [preferences.enableTracking, preferences.accuracy, preferences.updateInterval])

  const loadPreferences = async () => {
    try {
      const stored = localStorage.getItem('candlefish-location-preferences')
      if (stored) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) })
      }
    } catch (error) {
      console.error('[Location] Failed to load preferences:', error)
    }
  }

  const savePreferences = useCallback(async (newPreferences: Partial<LocationPreferences>) => {
    const updated = { ...preferences, ...newPreferences }
    setPreferences(updated)
    
    try {
      localStorage.setItem('candlefish-location-preferences', JSON.stringify(updated))
      
      // Save to offline storage for sync
      await offlineStorage.store('location-preferences', {
        id: 'user-preferences',
        ...updated,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('[Location] Failed to save preferences:', error)
    }
  }, [preferences])

  const getLocationOptions = useCallback((): PositionOptions => {
    const accuracyMap = {
      low: { enableHighAccuracy: false, maximumAge: 600000, timeout: 30000 },
      medium: { enableHighAccuracy: true, maximumAge: preferences.maxAge, timeout: 20000 },
      high: { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
    }

    return accuracyMap[preferences.accuracy]
  }, [preferences.accuracy, preferences.maxAge])

  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'))
        return
      }

      setLocationData(prev => ({ ...prev, isLoading: true, error: null }))

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationData(prev => ({
            ...prev,
            position,
            isLoading: false,
            lastUpdated: Date.now()
          }))
          
          // Store location for offline use
          storeLocationData(position)
          
          resolve(position)
        },
        (error) => {
          setLocationData(prev => ({
            ...prev,
            error,
            isLoading: false
          }))
          reject(error)
        },
        getLocationOptions()
      )
    })
  }, [getLocationOptions])

  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation || watchId !== null) return

    setLocationData(prev => ({ ...prev, isWatching: true }))

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setLocationData(prev => ({
          ...prev,
          position,
          error: null,
          lastUpdated: Date.now()
        }))
        
        storeLocationData(position)
        
        // Update nearby operators
        if (preferences.shareWithOperators) {
          updateNearbyOperators(position)
        }
      },
      (error) => {
        setLocationData(prev => ({ ...prev, error }))
        console.error('[Location] Watch position error:', error)
      },
      getLocationOptions()
    )

    setWatchId(id)
  }, [watchId, getLocationOptions, preferences.shareWithOperators])

  const stopLocationTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
    }
    
    setLocationData(prev => ({ ...prev, isWatching: false }))
  }, [watchId])

  const storeLocationData = async (position: GeolocationPosition) => {
    try {
      await offlineStorage.store('location-history', {
        id: `location-${Date.now()}`,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
        heading: position.coords.heading,
        speed: position.coords.speed
      })
    } catch (error) {
      console.error('[Location] Failed to store location:', error)
    }
  }

  const updateNearbyOperators = async (position: GeolocationPosition) => {
    try {
      // Get operators from cache
      const operators = await offlineStorage.getOperators()
      
      const nearby = operators
        .map((operator: any) => {
          if (!operator.location?.coordinates) return null
          
          const distance = calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            operator.location.coordinates[1], // latitude
            operator.location.coordinates[0]  // longitude
          )

          const bearing = calculateBearing(
            position.coords.latitude,
            position.coords.longitude,
            operator.location.coordinates[1],
            operator.location.coordinates[0]
          )

          return {
            id: operator.id,
            name: operator.name,
            distance,
            bearing,
            location: {
              latitude: operator.location.coordinates[1],
              longitude: operator.location.coordinates[0]
            },
            availability: operator.availability || 'offline',
            specialties: operator.specialties || []
          }
        })
        .filter(Boolean)
        .sort((a, b) => a!.distance - b!.distance)
        .slice(0, 10) as NearbyOperator[]

      setNearbyOperators(nearby)
    } catch (error) {
      console.error('[Location] Failed to update nearby operators:', error)
    }
  }

  const requestPermission = async (): Promise<boolean> => {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported')
      }

      // Test permission by getting current position
      await getCurrentPosition()
      return true
    } catch (error) {
      console.error('[Location] Permission request failed:', error)
      return false
    }
  }

  const shareLocationWithOperator = async (operatorId: string, message?: string) => {
    if (!locationData.position) {
      throw new Error('No location data available')
    }

    try {
      const locationShare = {
        id: `location-share-${Date.now()}`,
        operatorId,
        location: {
          latitude: locationData.position.coords.latitude,
          longitude: locationData.position.coords.longitude,
          accuracy: locationData.position.coords.accuracy
        },
        message,
        timestamp: Date.now(),
        expiresAt: Date.now() + (15 * 60 * 1000) // Expires in 15 minutes
      }

      // Store for offline sync
      await offlineStorage.addToQueue({
        id: '',
        operation: 'create',
        type: 'location-share',
        data: locationShare,
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3
      })

      // If online, send immediately
      if (navigator.onLine) {
        await fetch('/api/location/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(locationShare)
        })
      }

      console.log(`[Location] Shared location with operator ${operatorId}`)
    } catch (error) {
      console.error('[Location] Failed to share location:', error)
      throw error
    }
  }

  const getLocationHistory = async (days: number = 7) => {
    try {
      const history = await offlineStorage.getAll('location-history')
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000)
      
      return history
        .filter((item: any) => item.timestamp > cutoff)
        .sort((a: any, b: any) => b.timestamp - a.timestamp)
    } catch (error) {
      console.error('[Location] Failed to get location history:', error)
      return []
    }
  }

  const clearLocationHistory = async () => {
    try {
      await offlineStorage.clear('location-history')
      console.log('[Location] Location history cleared')
    } catch (error) {
      console.error('[Location] Failed to clear location history:', error)
    }
  }

  const getAddressFromCoordinates = async (latitude: number, longitude: number): Promise<string | null> => {
    try {
      // Use a geocoding service (this is a placeholder)
      const response = await fetch(
        `https://api.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      )
      
      if (!response.ok) return null
      
      const data = await response.json()
      return data.display_name || null
    } catch (error) {
      console.error('[Location] Geocoding failed:', error)
      return null
    }
  }

  return {
    // State
    position: locationData.position,
    error: locationData.error,
    isLoading: locationData.isLoading,
    isWatching: locationData.isWatching,
    lastUpdated: locationData.lastUpdated,
    preferences,
    nearbyOperators,

    // Actions
    getCurrentPosition,
    startLocationTracking,
    stopLocationTracking,
    requestPermission,
    shareLocationWithOperator,
    savePreferences,

    // Utilities
    getLocationHistory,
    clearLocationHistory,
    getAddressFromCoordinates,

    // Computed values
    hasPermission: locationData.position !== null || locationData.error?.code !== locationData.error?.PERMISSION_DENIED,
    isSupported: 'geolocation' in navigator,
    accuracy: locationData.position?.coords.accuracy,
    coordinates: locationData.position ? {
      latitude: locationData.position.coords.latitude,
      longitude: locationData.position.coords.longitude
    } : null
  }
}

// Utility functions
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = toRadians(lon2 - lon1)
  const lat1Rad = toRadians(lat1)
  const lat2Rad = toRadians(lat2)
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad)
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)
  
  const bearing = Math.atan2(y, x)
  return (toDegrees(bearing) + 360) % 360
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

function toDegrees(radians: number): number {
  return radians * (180 / Math.PI)
}