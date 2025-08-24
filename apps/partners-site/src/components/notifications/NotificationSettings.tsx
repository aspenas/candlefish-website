'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Settings, Clock, AlertTriangle, Users, Briefcase, System } from 'lucide-react'
import { pushNotifications, NOTIFICATION_TYPES } from '@/lib/push-notifications'
import { usePWA } from '@/components/providers/PWAProvider'

export function NotificationSettings() {
  const { isOnline } = usePWA()
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [preferences, setPreferences] = useState(pushNotifications.getPreferences())
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showTestOptions, setShowTestOptions] = useState(false)

  useEffect(() => {
    // Check if push notifications are supported
    setIsSupported(pushNotifications.isSupported())
    setPermission(pushNotifications.getPermissionStatus())
    
    // Check if already subscribed
    checkSubscriptionStatus()
  }, [])

  const checkSubscriptionStatus = async () => {
    if (pushNotifications.isSupported() && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setIsSubscribed(!!subscription)
      } catch (error) {
        console.error('Failed to check subscription status:', error)
      }
    }
  }

  const handleEnableNotifications = async () => {
    setIsLoading(true)
    
    try {
      const granted = await pushNotifications.requestPermission()
      
      if (granted) {
        const subscription = await pushNotifications.subscribe()
        if (subscription) {
          setIsSubscribed(true)
          setPermission('granted')
          setPreferences(prev => ({ ...prev, enabled: true }))
        }
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    setIsLoading(true)
    
    try {
      await pushNotifications.unsubscribe()
      setIsSubscribed(false)
      setPreferences(prev => ({ ...prev, enabled: false }))
    } catch (error) {
      console.error('Failed to disable notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updatePreference = async (key: keyof typeof preferences, value: any) => {
    const updated = { ...preferences, [key]: value }
    setPreferences(updated)
    await pushNotifications.updatePreferences({ [key]: value })
  }

  const updateQuietHours = async (field: string, value: any) => {
    const updated = {
      ...preferences,
      quietHours: { ...preferences.quietHours, [field]: value }
    }
    setPreferences(updated)
    await pushNotifications.updatePreferences({ quietHours: updated.quietHours })
  }

  const sendTestNotification = async (type: keyof typeof NOTIFICATION_TYPES) => {
    const notificationType = NOTIFICATION_TYPES[type]
    
    await pushNotifications.showNotification({
      title: notificationType.title,
      body: `This is a test ${type.toLowerCase().replace('_', ' ')} notification`,
      icon: notificationType.icon,
      tag: notificationType.tag,
      requireInteraction: notificationType.requireInteraction,
      actions: notificationType.actions,
      data: { test: true, type }
    })
  }

  if (!isSupported) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center">
          <BellOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Notifications Not Supported
          </h3>
          <p className="text-sm text-gray-600">
            Your browser doesn't support push notifications
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Settings Card */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Push Notifications
            </h3>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Permission Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Notification Status</h4>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isSubscribed ? 'bg-green-400' : 'bg-gray-400'
                }`} />
                {isSubscribed ? 'Active' : 'Disabled'}
                {!isOnline && <span className="text-yellow-600">• Offline</span>}
              </p>
            </div>
            
            {!isSubscribed ? (
              <button
                onClick={handleEnableNotifications}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                Enable Notifications
              </button>
            ) : (
              <button
                onClick={handleDisableNotifications}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
                Disable
              </button>
            )}
          </div>

          {/* Permission Denied Warning */}
          {permission === 'denied' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900 text-sm">
                    Notifications Blocked
                  </h4>
                  <p className="text-sm text-red-700 mt-1">
                    Please enable notifications in your browser settings to receive important updates.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notification Types */}
          {isSubscribed && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Notification Types</h4>
              
              <div className="space-y-3">
                <NotificationToggle
                  icon={<Users className="w-4 h-4" />}
                  title="Operator Updates"
                  description="When operators become available or change status"
                  enabled={preferences.operatorUpdates}
                  onChange={(enabled) => updatePreference('operatorUpdates', enabled)}
                />

                <NotificationToggle
                  icon={<Briefcase className="w-4 h-4" />}
                  title="Job Assignments"
                  description="New job assignments and updates"
                  enabled={preferences.jobAssignments}
                  onChange={(enabled) => updatePreference('jobAssignments', enabled)}
                />

                <NotificationToggle
                  icon={<AlertTriangle className="w-4 h-4" />}
                  title="Emergency Alerts"
                  description="Critical alerts requiring immediate attention"
                  enabled={preferences.emergencyAlerts}
                  onChange={(enabled) => updatePreference('emergencyAlerts', enabled)}
                  important
                />

                <NotificationToggle
                  icon={<Settings className="w-4 h-4" />}
                  title="System Updates"
                  description="App updates and maintenance notifications"
                  enabled={preferences.systemUpdates}
                  onChange={(enabled) => updatePreference('systemUpdates', enabled)}
                />
              </div>
            </div>
          )}

          {/* Quiet Hours */}
          {isSubscribed && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <h4 className="font-medium text-gray-900">Quiet Hours</h4>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.quietHours.enabled}
                    onChange={(e) => updateQuietHours('enabled', e.target.checked)}
                    className="rounded"
                  />
                </label>
              </div>

              {preferences.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">From</label>
                    <input
                      type="time"
                      value={preferences.quietHours.start}
                      onChange={(e) => updateQuietHours('start', e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">To</label>
                    <input
                      type="time"
                      value={preferences.quietHours.end}
                      onChange={(e) => updateQuietHours('end', e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Test Notifications */}
      {isSubscribed && (
        <div className="bg-white rounded-lg shadow-sm border">
          <button
            onClick={() => setShowTestOptions(!showTestOptions)}
            className="w-full p-4 text-left border-b border-gray-200 hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">Test Notifications</span>
              <div className={`transform transition-transform ${showTestOptions ? 'rotate-180' : ''}`}>
                ↓
              </div>
            </div>
          </button>

          {showTestOptions && (
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Test different types of notifications to see how they appear
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => sendTestNotification('OPERATOR_AVAILABLE')}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="font-medium text-sm">Operator Available</div>
                  <div className="text-xs text-gray-600">Status update</div>
                </button>

                <button
                  onClick={() => sendTestNotification('JOB_ASSIGNMENT')}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="font-medium text-sm">Job Assignment</div>
                  <div className="text-xs text-gray-600">New work</div>
                </button>

                <button
                  onClick={() => sendTestNotification('EMERGENCY_ALERT')}
                  className="p-3 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 text-left"
                >
                  <div className="font-medium text-sm text-red-900">Emergency Alert</div>
                  <div className="text-xs text-red-600">Critical</div>
                </button>

                <button
                  onClick={() => sendTestNotification('SYSTEM_UPDATE')}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="font-medium text-sm">System Update</div>
                  <div className="text-xs text-gray-600">Maintenance</div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface NotificationToggleProps {
  icon: React.ReactNode
  title: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  important?: boolean
}

function NotificationToggle({ icon, title, description, enabled, onChange, important }: NotificationToggleProps) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${
      important ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${important ? 'text-red-600' : 'text-gray-600'}`}>
          {icon}
        </div>
        <div>
          <h5 className={`font-medium text-sm ${important ? 'text-red-900' : 'text-gray-900'}`}>
            {title}
            {important && <span className="ml-1 text-red-600">*</span>}
          </h5>
          <p className={`text-xs ${important ? 'text-red-700' : 'text-gray-600'}`}>
            {description}
          </p>
        </div>
      </div>
      
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          className={`rounded ${important ? 'text-red-600 focus:ring-red-500' : ''}`}
          disabled={important && !enabled} // Can't disable emergency alerts
        />
      </label>
    </div>
  )
}