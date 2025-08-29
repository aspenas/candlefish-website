'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'

const UserPreferences: React.FC<{ className?: string }> = ({ className }) => {
  const [preferences, setPreferences] = useState({
    theme: 'auto',
    language: 'en',
    timezone: 'America/New_York',
    refreshRate: '30',
    dashboardLayout: 'grid'
  })

  const updatePreference = (key: string, value: string) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        User Preferences
      </h3>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Theme
          </label>
          <select
            value={preferences.theme}
            onChange={(e) => updatePreference('theme', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Data Refresh Rate
          </label>
          <select
            value={preferences.refreshRate}
            onChange={(e) => updatePreference('refreshRate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="10">10 seconds</option>
            <option value="30">30 seconds</option>
            <option value="60">1 minute</option>
            <option value="300">5 minutes</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dashboard Layout
          </label>
          <select
            value={preferences.dashboardLayout}
            onChange={(e) => updatePreference('dashboardLayout', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="grid">Grid Layout</option>
            <option value="list">List Layout</option>
            <option value="compact">Compact Layout</option>
          </select>
        </div>

        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
          Save Preferences
        </button>
      </div>
    </Card>
  )
}

export default UserPreferences