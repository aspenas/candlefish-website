import React, { useState, useEffect, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Bars3Icon,
  BellIcon,
  WifiIcon,
  SignalIcon,
  BatteryIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import MobileNavigation from './MobileNavigation';
import TouchButton from './TouchButton';
import PWAInstallPrompt, { usePWAInstall } from '../PWAInstallPrompt';
import { usePushNotifications } from '../../services/pushNotifications';
import { useBackgroundSync } from '../../services/backgroundSync';
import clsx from 'clsx';

interface MobileLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showNavigation?: boolean;
  headerTitle?: string;
  headerActions?: ReactNode;
  className?: string;
  fullScreen?: boolean;
  hideOnScroll?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  showHeader = true,
  showNavigation = true,
  headerTitle,
  headerActions,
  className = '',
  fullScreen = false,
  hideOnScroll = false
}) => {
  const [scrollY, setScrollY] = useState(0);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const { canInstall, isInstalled } = usePWAInstall();
  const { isSubscribed, isSupported: notificationsSupported } = usePushNotifications();
  const { pendingCount, isOnline } = useBackgroundSync();

  // Detect device capabilities
  const [deviceCapabilities, setDeviceCapabilities] = useState({
    hasCamera: false,
    hasBattery: false,
    hasVibration: false,
    isFullscreen: false,
    isStandalone: false
  });

  // Update scroll position
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const updateScrollY = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setIsScrollingUp(currentScrollY < lastScrollY || currentScrollY < 10);
      lastScrollY = currentScrollY;
    };

    if (hideOnScroll) {
      window.addEventListener('scroll', updateScrollY, { passive: true });
      return () => window.removeEventListener('scroll', updateScrollY);
    }
  }, [hideOnScroll]);

  // Detect device capabilities
  useEffect(() => {
    const detectCapabilities = async () => {
      const capabilities = {
        hasCamera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
        hasBattery: 'getBattery' in navigator,
        hasVibration: 'vibrate' in navigator,
        isFullscreen: window.matchMedia('(display-mode: fullscreen)').matches,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone === true
      };

      setDeviceCapabilities(capabilities);

      // Get battery info if available
      if (capabilities.hasBattery) {
        try {
          const battery = await (navigator as any).getBattery();
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);

          battery.addEventListener('levelchange', () => {
            setBatteryLevel(Math.round(battery.level * 100));
          });

          battery.addEventListener('chargingchange', () => {
            setIsCharging(battery.charging);
          });
        } catch (error) {
          console.warn('Battery API not available:', error);
        }
      }
    };

    detectCapabilities();
  }, []);

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Show install prompt after delay
  useEffect(() => {
    if (canInstall && !isInstalled) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 30000); // Show after 30 seconds

      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled]);

  // Get page title
  const getPageTitle = () => {
    if (headerTitle) return headerTitle;
    
    const pathToTitle: Record<string, string> = {
      '/': 'Dashboard',
      '/inventory': 'Inventory',
      '/photos/capture': 'Capture',
      '/scanner': 'Scanner',
      '/analytics': 'Analytics',
      '/valuations': 'Valuations',
      '/collaboration': 'Team',
      '/settings': 'Settings'
    };

    return pathToTitle[location.pathname] || 'Inventory';
  };

  // Status bar component for mobile
  const StatusBar = () => {
    if (!deviceCapabilities.isStandalone) return null;

    return (
      <div className="flex items-center justify-between px-4 py-1 bg-black text-white text-xs font-medium">
        <div className="flex items-center space-x-1">
          <ClockIcon className="h-3 w-3" />
          <span>{currentTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          })}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Sync status */}
          {pendingCount > 0 && (
            <div className="flex items-center space-x-1 text-yellow-400">
              <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
              <span>{pendingCount}</span>
            </div>
          )}

          {/* Notification badge */}
          {isSubscribed && notificationsSupported && (
            <BellIcon className="h-3 w-3 text-blue-400" />
          )}

          {/* Network status */}
          {isOnline ? (
            <WifiIcon className="h-3 w-3 text-green-400" />
          ) : (
            <div className="flex items-center space-x-1 text-red-400">
              <div className="w-2 h-2 bg-current rounded-full" />
              <span>Offline</span>
            </div>
          )}

          {/* Signal strength */}
          <SignalIcon className="h-3 w-3" />

          {/* Battery indicator */}
          {batteryLevel !== null && (
            <div className="flex items-center space-x-1">
              <BatteryIcon className={clsx(
                'h-3 w-3',
                batteryLevel > 20 ? 'text-green-400' : 'text-red-400',
                isCharging && 'text-yellow-400'
              )} />
              <span>{batteryLevel}%</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Header component
  const Header = () => {
    if (!showHeader || fullScreen) return null;

    return (
      <header className={clsx(
        'sticky top-0 z-40 bg-white border-b border-gray-200',
        'transition-transform duration-300',
        hideOnScroll && !isScrollingUp && '-translate-y-full'
      )}>
        <div className="flex items-center justify-between px-4 py-3 min-h-[56px]">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {getPageTitle()}
            </h1>
            
            {/* Status indicators */}
            <div className="flex items-center space-x-2">
              {!isOnline && (
                <div className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                  Offline
                </div>
              )}
              
              {pendingCount > 0 && (
                <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  {pendingCount} syncing
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {headerActions}
            
            {/* Install prompt trigger */}
            {canInstall && !isInstalled && (
              <TouchButton
                size="small"
                variant="ghost"
                onClick={() => setShowInstallPrompt(true)}
                ariaLabel="Install app"
              >
                📱
              </TouchButton>
            )}
          </div>
        </div>
      </header>
    );
  };

  return (
    <div className={clsx(
      'min-h-screen bg-gray-50',
      deviceCapabilities.isStandalone && 'pt-6', // Account for status bar
      className
    )}>
      {/* Status bar for standalone mode */}
      <StatusBar />

      {/* Header */}
      <Header />

      {/* Main content */}
      <main className={clsx(
        'relative',
        showNavigation && !fullScreen && 'pb-20', // Account for bottom navigation
        fullScreen ? 'h-screen' : 'min-h-0'
      )}>
        <div className={clsx(
          'w-full',
          !fullScreen && 'container mx-auto px-4 py-4'
        )}>
          {children}
        </div>
      </main>

      {/* Bottom navigation */}
      {showNavigation && !fullScreen && (
        <div className={clsx(
          'transition-transform duration-300',
          hideOnScroll && !isScrollingUp && 'translate-y-full'
        )}>
          <MobileNavigation variant="bottom" />
        </div>
      )}

      {/* PWA install prompt */}
      {showInstallPrompt && !isInstalled && (
        <PWAInstallPrompt
          onDismiss={() => setShowInstallPrompt(false)}
        />
      )}

      {/* Safe area styles for devices with notches */}
      <style jsx>{`
        @supports (padding-top: env(safe-area-inset-top)) {
          .safe-area-pt {
            padding-top: env(safe-area-inset-top);
          }
          .safe-area-pb {
            padding-bottom: env(safe-area-inset-bottom);
          }
          .safe-area-pl {
            padding-left: env(safe-area-inset-left);
          }
          .safe-area-pr {
            padding-right: env(safe-area-inset-right);
          }
        }
      `}</style>
    </div>
  );
};

// Specialized layouts for specific use cases
export const CameraLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <MobileLayout
      fullScreen
      showHeader={false}
      showNavigation={false}
      className="bg-black"
    >
      {children}
    </MobileLayout>
  );
};

export const ScannerLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <MobileLayout
      fullScreen
      showHeader={false}
      showNavigation={false}
      className="bg-black"
    >
      {children}
    </MobileLayout>
  );
};

export const FormLayout: React.FC<{ 
  children: ReactNode; 
  title: string;
  onSave?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  isSaving?: boolean;
}> = ({ 
  children, 
  title, 
  onSave, 
  onCancel,
  saveLabel = 'Save',
  isSaving = false
}) => {
  return (
    <MobileLayout
      headerTitle={title}
      headerActions={
        <div className="flex items-center space-x-2">
          {onCancel && (
            <TouchButton
              size="small"
              variant="ghost"
              onClick={onCancel}
            >
              Cancel
            </TouchButton>
          )}
          {onSave && (
            <TouchButton
              size="small"
              variant="primary"
              onClick={onSave}
              loading={isSaving}
            >
              {saveLabel}
            </TouchButton>
          )}
        </div>
      }
    >
      <div className="max-w-md mx-auto">
        {children}
      </div>
    </MobileLayout>
  );
};

export default MobileLayout;