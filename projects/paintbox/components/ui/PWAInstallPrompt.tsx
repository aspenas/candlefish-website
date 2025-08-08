'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { X, Download, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if we're on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if we're already running as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                     (window.navigator as any).standalone ||
                     document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Check if user has previously dismissed the prompt
    const dismissedBefore = localStorage.getItem('pwa-install-dismissed');
    setDismissed(dismissedBefore === 'true');

    // Handle the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Handle successful installation
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstallable(false);
      setShowPrompt(false);
      console.log('PWA installed successfully');

      // Optional: Track installation
      if (typeof gtag !== 'undefined') {
        gtag('event', 'pwa_install', {
          event_category: 'engagement',
          event_label: 'PWA Installation'
        });
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show prompt after a delay if conditions are met
    const timer = setTimeout(() => {
      if (!standalone && !dismissedBefore && (isInstallable || iOS)) {
        setShowPrompt(true);
      }
    }, 10000); // Show after 10 seconds

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, [isInstallable, isStandalone, isIOS]);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
        handleDismiss();
      }

      setInstallPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');

    // Set expiry for dismissal (show again after 30 days)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    localStorage.setItem('pwa-install-dismissed-until', expiryDate.toISOString());
  };

  // Don't show if already installed or user dismissed
  if (isStandalone || dismissed || !showPrompt) {
    return null;
  }

  return (
    <>
      {/* Android/Chrome Install Prompt */}
      {isInstallable && !isIOS && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 animate-slide-up">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900">
                Install Paintbox App
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Get faster access and work offline. Perfect for field use on your tablet.
              </p>

              <div className="flex items-center space-x-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleInstallClick}
                  className="flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>Install</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismiss}
                >
                  Maybe Later
                </Button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Install Instructions */}
      {isIOS && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50 animate-fade-in">
          <div className="bg-white rounded-t-lg w-full max-w-md mx-auto p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Install Paintbox
              </h3>
              <button
                onClick={handleDismiss}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Install Paintbox on your iPad for the best experience:
              </p>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                    1
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      Tap the <strong>Share</strong> button in Safari
                    </p>
                    <div className="mt-1 flex items-center space-x-1 text-blue-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                      </svg>
                      <span className="text-xs">Share icon</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                    2
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      Scroll down and tap <strong>"Add to Home Screen"</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                    3
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      Tap <strong>"Add"</strong> to install the app
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Monitor className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-blue-800">
                      Why install the app?
                    </p>
                    <ul className="text-xs text-blue-700 mt-1 space-y-1">
                      <li>• Works completely offline</li>
                      <li>• Faster loading and better performance</li>
                      <li>• Full-screen experience without browser UI</li>
                      <li>• Easy access from your home screen</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleDismiss}
              >
                I'll do this later
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Hook to detect if PWA is installable
export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                     (window.navigator as any).standalone ||
                     document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('Installation failed:', error);
      return false;
    }
  };

  return {
    isInstallable,
    isStandalone,
    isIOS,
    canInstall: isInstallable || (isIOS && !isStandalone),
    install
  };
}

// PWA Status Component
export function PWAStatus() {
  const { isStandalone, isIOS, isInstallable } = usePWAInstall();

  if (isStandalone) {
    return (
      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
        App Mode
      </div>
    );
  }

  if (isInstallable || isIOS) {
    return (
      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <Download className="w-3 h-3 mr-1" />
        Installable
      </div>
    );
  }

  return (
    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      Web App
    </div>
  );
}
