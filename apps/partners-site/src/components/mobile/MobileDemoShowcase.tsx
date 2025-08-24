'use client'

import { useState } from 'react'
import { 
  Smartphone, Wifi, WifiOff, Camera, MapPin, Bell, 
  Download, CheckCircle, Users, FileText, Settings,
  ArrowRight, Play, Pause
} from 'lucide-react'
import { FieldDocumentation } from '@/components/field/FieldDocumentation'
import { LocationServices } from '@/components/location/LocationServices'
import { NotificationSettings } from '@/components/notifications/NotificationSettings'
import { usePWA } from '@/components/providers/PWAProvider'

type DemoSection = 'overview' | 'offline' | 'camera' | 'location' | 'notifications' | 'all'

const features = [
  {
    id: 'pwa',
    title: 'Progressive Web App',
    description: 'Install as native app with offline capabilities',
    icon: <Smartphone className="w-8 h-8" />,
    color: 'blue'
  },
  {
    id: 'offline',
    title: 'Offline-First',
    description: 'Work without internet connection',
    icon: <WifiOff className="w-8 h-8" />,
    color: 'green'
  },
  {
    id: 'camera',
    title: 'Field Documentation',
    description: 'Capture and organize work photos',
    icon: <Camera className="w-8 h-8" />,
    color: 'purple'
  },
  {
    id: 'location',
    title: 'Location Services',
    description: 'Find nearby operators and share location',
    icon: <MapPin className="w-8 h-8" />,
    color: 'red'
  },
  {
    id: 'notifications',
    title: 'Push Notifications',
    description: 'Receive important updates instantly',
    icon: <Bell className="w-8 h-8" />,
    color: 'yellow'
  }
]

const useCases = [
  {
    title: 'Field Technician',
    scenario: 'Installing IoT sensors in industrial facility',
    workflow: [
      'Access implementation guides offline',
      'Document installation progress with photos',
      'Share location with supervisor for assistance',
      'Receive emergency notifications during work'
    ]
  },
  {
    title: 'Project Manager',
    scenario: 'Coordinating multiple operator assignments',
    workflow: [
      'View operator network and availability',
      'Assign jobs and track progress',
      'Receive notifications about project updates',
      'Access success stories for client presentations'
    ]
  },
  {
    title: 'Field Supervisor',
    scenario: 'Supporting remote teams',
    workflow: [
      'Monitor operator locations and status',
      'Provide remote assistance through documentation',
      'Receive alerts for emergency situations',
      'Coordinate resources across multiple sites'
    ]
  }
]

export function MobileDemoShowcase() {
  const { isOnline, canInstall, installApp } = usePWA()
  const [activeSection, setActiveSection] = useState<DemoSection>('overview')
  const [isDemoRunning, setIsDemoRunning] = useState(false)

  const handleInstallApp = async () => {
    if (canInstall) {
      await installApp()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-6 max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Candlefish Partners Mobile App
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Field-ready mobile experience built for operators
            </p>
            
            {/* Status indicators */}
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-yellow-400'}`} />
                <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
              </div>
              {canInstall && (
                <button
                  onClick={handleInstallApp}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700"
                >
                  <Download className="w-3 h-3" />
                  Install App
                </button>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'offline', label: 'Offline Demo' },
              { key: 'camera', label: 'Camera' },
              { key: 'location', label: 'Location' },
              { key: 'notifications', label: 'Notifications' },
              { key: 'all', label: 'Full Demo' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key as DemoSection)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-8 max-w-4xl mx-auto">
        {activeSection === 'overview' && <OverviewSection />}
        {activeSection === 'offline' && <OfflineSection />}
        {activeSection === 'camera' && <CameraSection />}
        {activeSection === 'location' && <LocationSection />}
        {activeSection === 'notifications' && <NotificationsSection />}
        {activeSection === 'all' && <FullDemoSection />}
      </div>
    </div>
  )
}

function OverviewSection() {
  return (
    <div className="space-y-8">
      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>

      {/* Use Cases */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Built for Real Field Work
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, index) => (
            <UseCaseCard key={index} useCase={useCase} />
          ))}
        </div>
      </div>

      {/* Mobile-First Benefits */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">
          Why Mobile-First for Candlefish Partners?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <span>Operators work in the field, not at desks</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <span>Internet connectivity can be unreliable</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <span>Documentation needs to be visual and instant</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <span>Location context is crucial for operations</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function OfflineSection() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <WifiOff className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Offline-First Architecture
        </h2>
        <p className="text-gray-600 mb-6">
          Work seamlessly without internet connection
        </p>
      </div>

      {/* Offline Capabilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Available Offline</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm">Implementation guides</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm">Cached operator network</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm">Photo documentation</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm">Location services</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Auto-Sync When Online</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <ArrowRight className="w-5 h-5 text-blue-600" />
              <span className="text-sm">Photo uploads and metadata</span>
            </div>
            <div className="flex items-center gap-3">
              <ArrowRight className="w-5 h-5 text-blue-600" />
              <span className="text-sm">Location sharing requests</span>
            </div>
            <div className="flex items-center gap-3">
              <ArrowRight className="w-5 h-5 text-blue-600" />
              <span className="text-sm">Job status updates</span>
            </div>
            <div className="flex items-center gap-3">
              <ArrowRight className="w-5 h-5 text-blue-600" />
              <span className="text-sm">Notification subscriptions</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 rounded-lg p-6">
        <p className="text-center text-gray-600 text-sm">
          <strong>Try it:</strong> Turn off your internet connection and navigate through the app. 
          Most features will continue working with cached data.
        </p>
      </div>
    </div>
  )
}

function CameraSection() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Camera className="w-12 h-12 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Field Documentation Camera
        </h2>
        <p className="text-gray-600 mb-6">
          Professional photo documentation with metadata
        </p>
      </div>

      <FieldDocumentation 
        jobId="DEMO-12345" 
        operatorId="operator-demo" 
        tags={['demo', 'field-work']} 
      />
    </div>
  )
}

function LocationSection() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <MapPin className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Location Services
        </h2>
        <p className="text-gray-600 mb-6">
          Find operators and share location for assistance
        </p>
      </div>

      <LocationServices />
    </div>
  )
}

function NotificationsSection() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Bell className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Push Notifications
        </h2>
        <p className="text-gray-600 mb-6">
          Stay updated with important partner information
        </p>
      </div>

      <NotificationSettings />
    </div>
  )
}

function FullDemoSection() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Complete Mobile Experience
        </h2>
        <p className="text-gray-600 mb-6">
          All features working together for field operators
        </p>
      </div>

      <CameraSection />
      <LocationSection />
      <NotificationsSection />
    </div>
  )
}

function FeatureCard({ feature }: { feature: any }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg border mb-4 ${colorClasses[feature.color as keyof typeof colorClasses]}`}>
        {feature.icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">
        {feature.title}
      </h3>
      <p className="text-sm text-gray-600">
        {feature.description}
      </p>
    </div>
  )
}

function UseCaseCard({ useCase }: { useCase: any }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="font-semibold text-gray-900 mb-2">
        {useCase.title}
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        {useCase.scenario}
      </p>
      <div className="space-y-2">
        {useCase.workflow.map((step: string, index: number) => (
          <div key={index} className="flex items-start gap-2">
            <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
              {index + 1}
            </div>
            <span className="text-xs text-gray-700">{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}