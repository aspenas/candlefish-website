'use client'

import { useState } from 'react'
import { MapPin, Navigation, Users, Settings, Share2, Clock, AlertTriangle } from 'lucide-react'
import { useLocation } from '@/hooks/useLocation'
import { usePWA } from '@/components/providers/PWAProvider'

export function LocationServices() {
  const { isOnline } = usePWA()
  const [showSettings, setShowSettings] = useState(false)
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null)

  const {
    position,
    error,
    isLoading,
    isWatching,
    preferences,
    nearbyOperators,
    getCurrentPosition,
    startLocationTracking,
    stopLocationTracking,
    requestPermission,
    shareLocationWithOperator,
    savePreferences,
    hasPermission,
    isSupported,
    accuracy,
    coordinates
  } = useLocation()

  const handleEnableLocation = async () => {
    try {
      const granted = await requestPermission()
      if (granted) {
        await savePreferences({ enableTracking: true })
      }
    } catch (error) {
      console.error('Failed to enable location:', error)
    }
  }

  const handleShareLocation = async (operatorId: string) => {
    try {
      await shareLocationWithOperator(operatorId, 'Sharing my location for assistance')
      setSelectedOperator(null)
    } catch (error) {
      console.error('Failed to share location:', error)
    }
  }

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`
    }
    return `${distance.toFixed(1)}km`
  }

  const formatAccuracy = (acc?: number): string => {
    if (!acc) return 'Unknown'
    if (acc < 10) return 'High'
    if (acc < 50) return 'Medium'
    return 'Low'
  }

  const getDirectionIcon = (bearing: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const index = Math.round(bearing / 45) % 8
    return directions[index]
  }

  if (!isSupported) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Location Services Not Supported
        </h3>
        <p className="text-sm text-gray-600">
          Your device does not support location services
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Location Status Card */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className={`w-5 h-5 ${position ? 'text-green-600' : 'text-gray-400'}`} />
              <h3 className="text-lg font-semibold text-gray-900">Location Services</h3>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200"
            >
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">
                  Location Error
                </span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                {error.message || 'Unable to access your location'}
              </p>
            </div>
          )}

          {!hasPermission && !error && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">
                Enable Location Services
              </h4>
              <p className="text-sm text-blue-700 mb-3">
                Share your location to find nearby operators and get better assistance
              </p>
              <button
                onClick={handleEnableLocation}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                Enable Location
              </button>
            </div>
          )}

          {position && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Coordinates:</span>
                <div className="font-mono">
                  {coordinates?.latitude.toFixed(6)}, {coordinates?.longitude.toFixed(6)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Accuracy:</span>
                <div>{formatAccuracy(accuracy)} ({accuracy?.toFixed(0)}m)</div>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${isWatching ? 'bg-green-400' : 'bg-gray-400'}`} />
                  {isWatching ? 'Tracking' : 'Static'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Sync:</span>
                <div>{isOnline ? 'Online' : 'Offline'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <h4 className="font-medium text-gray-900 mb-3">Location Preferences</h4>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Enable location tracking</span>
                <input
                  type="checkbox"
                  checked={preferences.enableTracking}
                  onChange={(e) => savePreferences({ enableTracking: e.target.checked })}
                  className="rounded"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Share with operators</span>
                <input
                  type="checkbox"
                  checked={preferences.shareWithOperators}
                  onChange={(e) => savePreferences({ shareWithOperators: e.target.checked })}
                  className="rounded"
                />
              </label>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Accuracy</label>
                <select
                  value={preferences.accuracy}
                  onChange={(e) => savePreferences({ accuracy: e.target.value as any })}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
                >
                  <option value="low">Low (Battery Saving)</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="high">High (Most Accurate)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nearby Operators */}
      {nearbyOperators.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Nearby Operators ({nearbyOperators.length})
              </h3>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {nearbyOperators.map((operator) => (
              <div key={operator.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{operator.name}</span>
                      <div className={`w-2 h-2 rounded-full ${
                        operator.availability === 'available' ? 'bg-green-400' :
                        operator.availability === 'busy' ? 'bg-yellow-400' : 'bg-gray-400'
                      }`} />
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{formatDistance(operator.distance)}</span>
                      <span>{getDirectionIcon(operator.bearing)}</span>
                      <span className="capitalize">{operator.availability}</span>
                    </div>

                    {operator.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {operator.specialties.slice(0, 2).map((specialty) => (
                          <span
                            key={specialty}
                            className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                          >
                            {specialty}
                          </span>
                        ))}
                        {operator.specialties.length > 2 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            +{operator.specialties.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleShareLocation(operator.id)}
                      disabled={!position || !isOnline}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      <Share2 className="w-3 h-3" />
                      Share Location
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isOnline && (
            <div className="p-3 bg-yellow-50 border-t border-yellow-200">
              <p className="text-xs text-yellow-700">
                Location sharing will sync when you're back online
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      {position && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-600" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={getCurrentPosition}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <Navigation className="w-4 h-4" />
              <span className="text-sm">Update Location</span>
            </button>
            <button
              onClick={() => {
                if (preferences.enableTracking) {
                  stopLocationTracking()
                  savePreferences({ enableTracking: false })
                } else {
                  startLocationTracking()
                  savePreferences({ enableTracking: true })
                }
              }}
              className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              <span className="text-sm">
                {preferences.enableTracking ? 'Stop Tracking' : 'Start Tracking'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}