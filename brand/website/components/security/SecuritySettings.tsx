'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'

const SecuritySettings: React.FC<{ className?: string }> = ({ className }) => {
  const [settings, setSettings] = useState({
    twoFactorAuth: true,
    sessionTimeout: '30',
    ipWhitelist: false,
    auditLogging: true,
    dataRetention: '90'
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
        Security Settings
      </h3>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Two-Factor Authentication
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Require 2FA for dashboard access
            </p>
          </div>
          <button
            onClick={() => toggleSetting('twoFactorAuth')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
              settings.twoFactorAuth ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Session Timeout (minutes)
          </label>
          <select
            value={settings.sessionTimeout}
            onChange={(e) => updateSetting('sessionTimeout', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="240">4 hours</option>
            <option value="480">8 hours</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              IP Whitelist
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Restrict access to whitelisted IP addresses
            </p>
          </div>
          <button
            onClick={() => toggleSetting('ipWhitelist')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
              settings.ipWhitelist ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.ipWhitelist ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Audit Logging
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Log all dashboard activities and changes
            </p>
          </div>
          <button
            onClick={() => toggleSetting('auditLogging')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
              settings.auditLogging ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.auditLogging ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Data Retention (days)
          </label>
          <select
            value={settings.dataRetention}
            onChange={(e) => updateSetting('dataRetention', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">6 months</option>
            <option value="365">1 year</option>
            <option value="730">2 years</option>
          </select>
        </div>

        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
          Save Security Settings
        </button>
      </div>
    </Card>
  )
}

export default SecuritySettings