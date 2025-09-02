import React, { useState, useEffect, useCallback } from 'react';
import { 
  XMarkIcon, 
  DevicePhoneMobileIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import TouchButton from './mobile/TouchButton';
import { useHapticFeedback } from '../hooks/useMobileGestures';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallPromptProps {
  onDismiss?: () => void;
  className?: string;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  onDismiss,
  className = ''
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installStep, setInstallStep] = useState(0);

  const { impact, notification } = useHapticFeedback();

  // Detect platform and installation status
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandaloneApp = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone;

    setIsIOS(isIOSDevice);
    setIsStandalone(isStandaloneApp);

    // Don't show prompt if already installed
    if (isStandaloneApp) {
      setIsInstalled(true);
      return;
    }

    // Check if user has already dismissed the prompt recently
    const lastDismissed = localStorage.getItem('pwa-install-dismissed');
    if (lastDismissed) {
      const dismissedTime = new Date(lastDismissed).getTime();
      const now = new Date().getTime();
      const dayInMs = 24 * 60 * 60 * 1000;
      
      // Don't show again for 7 days
      if (now - dismissedTime < 7 * dayInMs) {
        return;
      }
    }

    // Show prompt after a delay to not interrupt user immediately
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);
      
      // Show prompt immediately if event is available
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Listen for app installation
  useEffect(() => {
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      notification('success');
      
      // Show success message
      setTimeout(() => {
        alert('App installed successfully! You can now find it on your home screen.');
      }, 1000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [notification]);

  // Handle install prompt
  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    impact('medium');

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        notification('success');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt, impact, notification]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    impact('light');
    onDismiss?.();
  }, [impact, onDismiss]);

  // iOS installation steps
  const iosSteps = [
    {
      icon: <ShareIcon className="h-8 w-8" />,
      title: "Tap the Share button",
      description: "Look for the share icon in your browser's toolbar"
    },
    {
      icon: <ArrowDownTrayIcon className="h-8 w-8" />,
      title: "Add to Home Screen",
      description: "Scroll down and tap 'Add to Home Screen'"
    },
    {
      icon: <CheckCircleIcon className="h-8 w-8" />,
      title: "Tap Add",
      description: "Confirm by tapping 'Add' in the top right"
    }
  ];

  if (!showPrompt || isInstalled || isStandalone) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
        {/* Prompt Card */}
        <div className={`bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md transform transition-transform duration-300 ${className}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <DevicePhoneMobileIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Install App
                </h3>
                <p className="text-sm text-gray-600">
                  Get the full experience
                </p>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            {isIOS ? (
              // iOS Installation Instructions
              <div className="space-y-6">
                <p className="text-gray-600">
                  Install this app on your iPhone for quick access and a native experience.
                </p>

                <div className="space-y-4">
                  {iosSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                        installStep === index ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setInstallStep(index)}
                    >
                      <div className={`flex-shrink-0 p-2 rounded-lg ${
                        installStep === index ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {step.icon}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {step.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-3">
                  <TouchButton
                    variant="secondary"
                    onClick={handleDismiss}
                    fullWidth
                  >
                    Maybe Later
                  </TouchButton>
                  <TouchButton
                    variant="primary"
                    onClick={() => {
                      // Show animation or guidance
                      impact('heavy');
                      setInstallStep(0);
                    }}
                    fullWidth
                  >
                    Got It
                  </TouchButton>
                </div>
              </div>
            ) : (
              // Android/Chrome Installation
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                    <DevicePhoneMobileIcon className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Highline Inventory
                  </h4>
                  <p className="text-gray-600">
                    Install this app for quick access, offline support, and push notifications.
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Works offline</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Fast loading</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Push notifications</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Home screen access</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <TouchButton
                    variant="secondary"
                    onClick={handleDismiss}
                    fullWidth
                  >
                    Not Now
                  </TouchButton>
                  <TouchButton
                    variant="primary"
                    onClick={handleInstall}
                    loading={isInstalling}
                    disabled={!deferredPrompt}
                    fullWidth
                  >
                    {isInstalling ? 'Installing...' : 'Install'}
                  </TouchButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Hook to check PWA installation status
export const usePWAInstall = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandaloneApp = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone;
    setIsInstalled(isStandaloneApp);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return { canInstall, isInstalled };
};

export default PWAInstallPrompt;