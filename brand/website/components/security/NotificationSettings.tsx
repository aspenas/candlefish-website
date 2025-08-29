'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'

const NotificationSettings: React.FC<{ className?: string }> = ({ className }) => {
  const [settings, setSettings] = useState({
    emailAlerts: true,
    pushNotifications: true,
    smsAlerts: false,
    criticalOnly: false,
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '08:00'
  })

  const toggleSetting = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
  }

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Notification Settings
      </h3>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Email Alerts
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Receive security alerts via email
            </p>
          </div>
          <button
            onClick={() => toggleSetting('emailAlerts')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
              settings.emailAlerts ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.emailAlerts ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Push Notifications
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Browser push notifications for immediate alerts
            </p>
          </div>
          <button
            onClick={() => toggleSetting('pushNotifications')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
              settings.pushNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.pushNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Critical Alerts Only
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Only receive critical and high severity alerts
            </p>
          </div>
          <button
            onClick={() => toggleSetting('criticalOnly')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
              settings.criticalOnly ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.criticalOnly ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Quiet Hours
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Suppress non-critical notifications during specified hours
            </p>
          </div>
          <button
            onClick={() => toggleSetting('quietHours')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
              settings.quietHours ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.quietHours ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {settings.quietHours && (
          <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={settings.quietStart}
                onChange={(e) => updateSetting('quietStart', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={settings.quietEnd}
                onChange={(e) => updateSetting('quietEnd', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
          Save Notification Settings
        </button>
      </div>
    </Card>
  )
}

export default NotificationSettings