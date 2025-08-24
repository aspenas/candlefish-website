'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { pwa, PWAInstallPrompt, NetworkStatus } from '@/lib/pwa'

interface PWAContextType {
  isOnline: boolean
  isInstalled: boolean
  canInstall: boolean
  isUpdateAvailable: boolean
  networkStatus: NetworkStatus
  installApp: () => Promise<boolean>
  updateApp: () => Promise<void>
  subscribeToPush: () => Promise<boolean>
}

const PWAContext = createContext<PWAContextType | undefined>(undefined)

export function usePWA() {
  const context = useContext(PWAContext)
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider')
  }
  return context
}

interface PWAProviderProps {
  children: ReactNode
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({ online: true })

  useEffect(() => {
    // Initialize PWA features
    initializePWA()
    
    // Set up event listeners
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    const handleInstallAvailable = () => setCanInstall(true)
    const handleInstallCompleted = () => {
      setCanInstall(false)
      setIsInstalled(true)
    }
    const handleUpdateAvailable = () => setIsUpdateAvailable(true)
    const handleNetworkChange = (event: CustomEvent) => {
      setNetworkStatus(event.detail)
    }

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('network-online', handleOnline)
    window.addEventListener('network-offline', handleOffline)
    window.addEventListener('pwa-install-available', handleInstallAvailable)
    window.addEventListener('pwa-install-completed', handleInstallCompleted)
    window.addEventListener('pwa-update-available', handleUpdateAvailable)
    window.addEventListener('network-change', handleNetworkChange as EventListener)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('network-online', handleOnline)
      window.removeEventListener('network-offline', handleOffline)
      window.removeEventListener('pwa-install-available', handleInstallAvailable)
      window.removeEventListener('pwa-install-completed', handleInstallCompleted)
      window.removeEventListener('pwa-update-available', handleUpdateAvailable)
      window.removeEventListener('network-change', handleNetworkChange as EventListener)
    }
  }, [])

  const initializePWA = async () => {
    try {
      // Register service worker
      await pwa.registerServiceWorker()
      
      // Request persistent storage for offline data
      await pwa.requestPersistentStorage()
      
      // Check initial states
      setIsOnline(navigator.onLine)
      setIsInstalled(pwa.isInstalled())
      setCanInstall(pwa.canInstall())
      setIsUpdateAvailable(pwa.isUpdateAvailable())
      setNetworkStatus(pwa.getNetworkStatus())

      console.log('[PWA Provider] PWA initialized successfully')
    } catch (error) {
      console.error('[PWA Provider] Failed to initialize PWA:', error)
    }
  }

  const installApp = async (): Promise<boolean> => {
    try {
      const installed = await pwa.showInstallPrompt()
      if (installed) {
        setCanInstall(false)
        setIsInstalled(true)
        
        // Track installation
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'pwa_install_success', {
            event_category: 'engagement',
            event_label: 'PWA Installation Success'
          })
        }
      }
      return installed
    } catch (error) {
      console.error('[PWA Provider] Failed to install app:', error)
      return false
    }
  }

  const updateApp = async (): Promise<void> => {
    try {
      await pwa.updateApp()
      setIsUpdateAvailable(false)
      
      // Track update
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'pwa_update', {
          event_category: 'engagement',
          event_label: 'PWA Update Applied'
        })
      }
    } catch (error) {
      console.error('[PWA Provider] Failed to update app:', error)
      throw error
    }
  }

  const subscribeToPush = async (): Promise<boolean> => {
    try {
      const subscription = await pwa.subscribeToPushNotifications()
      
      if (subscription) {
        // Send subscription to your server
        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          })
        })

        if (response.ok) {
          console.log('[PWA Provider] Push notifications subscribed successfully')
          
          // Track subscription
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'push_subscribe', {
              event_category: 'engagement',
              event_label: 'Push Notifications Subscribed'
            })
          }
          
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error('[PWA Provider] Failed to subscribe to push notifications:', error)
      return false
    }
  }

  const contextValue: PWAContextType = {
    isOnline,
    isInstalled,
    canInstall,
    isUpdateAvailable,
    networkStatus,
    installApp,
    updateApp,
    subscribeToPush,
  }

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      
      {/* PWA UI Components */}
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
      <PWAOfflineBanner />
    </PWAContext.Provider>
  )
}

// Install prompt component
function PWAInstallPrompt() {
  const { canInstall, installApp } = usePWA()
  const [dismissed, setDismissed] = useState(false)

  if (!canInstall || dismissed) {
    return null
  }

  const handleInstall = async () => {
    const installed = await installApp()
    if (!installed) {
      setDismissed(true)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-sm">Install Candlefish Partners</h3>
          <p className="text-xs opacity-90 mt-1">
            Get quick access and work offline
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={handleDismiss}
            className="text-xs px-2 py-1 border border-white/20 rounded hover:bg-white/10"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="text-xs px-2 py-1 bg-white text-blue-600 rounded hover:bg-gray-100"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  )
}

// Update prompt component
function PWAUpdatePrompt() {
  const { isUpdateAvailable, updateApp } = usePWA()
  const [dismissed, setDismissed] = useState(false)

  if (!isUpdateAvailable || dismissed) {
    return null
  }

  const handleUpdate = async () => {
    try {
      await updateApp()
    } catch (error) {
      console.error('Update failed:', error)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  return (
    <div className="fixed top-4 left-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-sm">Update Available</h3>
          <p className="text-xs opacity-90 mt-1">
            New features and improvements ready
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={handleDismiss}
            className="text-xs px-2 py-1 border border-white/20 rounded hover:bg-white/10"
          >
            Later
          </button>
          <button
            onClick={handleUpdate}
            className="text-xs px-2 py-1 bg-white text-green-600 rounded hover:bg-gray-100"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  )
}

// Offline banner component
function PWAOfflineBanner() {
  const { isOnline } = usePWA()
  const [showOfflineBanner, setShowOfflineBanner] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShowOfflineBanner(true)
    } else {
      // Hide banner after a short delay when back online
      const timer = setTimeout(() => {
        setShowOfflineBanner(false)
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [isOnline])

  if (!showOfflineBanner) {
    return null
  }

  return (
    <div className={`fixed top-4 left-4 right-4 p-3 rounded-lg shadow-lg z-50 transition-colors duration-300 ${
      isOnline 
        ? 'bg-green-600 text-white' 
        : 'bg-yellow-600 text-black'
    }`}>
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-300' : 'bg-yellow-300 animate-pulse'
          }`} />
          <span className="text-sm font-medium">
            {isOnline ? 'Back Online' : 'Working Offline'}
          </span>
        </div>
      </div>
    </div>
  )
}