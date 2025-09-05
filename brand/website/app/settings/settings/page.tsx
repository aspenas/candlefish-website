'use client'

import React, { Suspense } from 'react'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Lazy load settings components
const UserPreferences = React.lazy(() => import('@/components/security/UserPreferences'))
const NotificationSettings = React.lazy(() => import('@/components/security/NotificationSettings'))
const SecuritySettings = React.lazy(() => import('@/components/security/SecuritySettings'))
const IntegrationSettings = React.lazy(() => import('@/components/security/IntegrationSettings'))

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Settings
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage your security dashboard preferences and configurations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* User Preferences */}
          <Suspense fallback={
            <Card className="p-6">
              <LoadingSpinner size="medium" />
            </Card>
          }>
            <UserPreferences />
          </Suspense>

          {/* Notification Settings */}
          <Suspense fallback={
            <Card className="p-6">
              <LoadingSpinner size="medium" />
            </Card>
          }>
            <NotificationSettings />
          </Suspense>

          {/* Security Settings */}
          <Suspense fallback={
            <Card className="p-6">
              <LoadingSpinner size="medium" />
            </Card>
          }>
            <SecuritySettings />
          </Suspense>

          {/* Integration Settings */}
          <Suspense fallback={
            <Card className="p-6">
              <LoadingSpinner size="medium" />
            </Card>
          }>
            <IntegrationSettings />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

// Note: Metadata moved to layout.tsx for client components